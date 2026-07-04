# Executor

O Executor recebe um **Execution Plan** (`ai/contracts/execution-plan-schema.md`)
e o executa — é o único componente desta arquitetura que efetivamente
dispara Capabilities. Nesta etapa ele existe só como **arquitetura e
contrato**, sem código de execução real (diferente do Registry, que já
tem um script funcional) — o objetivo aqui é deixar o desenho sólido o
bastante para a implementação futura não exigir reabrir nenhum contrato.

## Responsabilidades

1. **Localizar Capabilities através do Registry.** Para cada etapa do
   plano, o Executor não sabe onde uma Capability mora nem como ela
   funciona por conta própria — ele pergunta ao Registry (`ai/registry/`)
   pelo manifesto correspondente ao `capability` daquela etapa.
2. **Validar manifestos antes de rodar.** Antes de disparar uma etapa,
   confere que o manifesto encontrado está com `status` compatível (não
   `deprecada` sem aviso), e que os campos de `entrada` fornecidos pelo
   plano cobrem o que o manifesto marca como obrigatório.
3. **Respeitar dependências.** Uma etapa só começa depois que todas as
   etapas em seu `depende_de` terminaram com sucesso (ou foram puladas de
   um jeito que ainda libera a etapa — ver `condicao`). Isso é uma
   ordenação topológica do DAG, não uma leitura sequencial da lista.
4. **Controlar o contexto compartilhado.** O Executor nunca guarda estado
   ele mesmo — toda leitura/escrita de contexto (entrada do usuário,
   resultados intermediários, arquivos produzidos) passa pelo **Context
   Manager** (`ai/orchestration/context-manager/`). O Executor é quem
   *decide quando* ler/escrever; o Context Manager é quem *sabe como*.
5. **Registrar logs.** Cada etapa iniciada, terminada, pulada ou com erro
   gera um evento de log — a mesma disciplina de auditoria já usada em
   `ai/contracts/context-contract.md#persistência-auditoria`, agora por
   execução inteira, não só por Capability isolada.
6. **Controlar erros.** Aplica `tratamento_de_erro` de cada etapa (ver
   `execution-plan-schema.md`): tenta de novo até `retentativas_maximas`,
   e ao esgotar, ou aborta o plano inteiro ou marca a etapa e seus
   dependentes como não executados, seguindo o resto do DAG que for
   independente.
7. **Interromper ou continuar conforme o plano.** A decisão de parar tudo
   ou seguir em frente depois de uma falha nunca é uma escolha do Executor
   — está sempre escrita no plano (`tratamento_de_erro`), o que o mantém
   previsível e testável sem depender de heurística.

## O que o Executor **não** faz

- **Não conhece nenhuma Capability específica.** Ele só entende o
  contrato genérico de um manifesto (entradas, saídas, permissões) — nunca
  importa lógica de `image-generator` ou de qualquer outra Capability por
  nome. Trocar/adicionar Capabilities nunca exige mudar o Executor.
- **Não decide o plano.** Recebe um Execution Plan pronto do Planner —
  nunca monta, reordena por conta própria, ou adiciona etapas que não
  estavam lá.
- **Não conhece o agente de IA em uso** além de precisar de um Adapter
  disponível para cada Capability que for chamar — a tradução mecânica de
  "como" chamar é do Adapter, não do Executor.

## Algoritmo (arquitetura, não implementação)

```
1. Recebe Execution Plan + Execution Context inicial (via Context Manager)
2. Monta o grafo de dependências a partir de `etapas[].depende_de`
3. Enquanto houver etapa não finalizada:
     a. Identifica etapas "prontas" (todas as dependências já concluídas
        com sucesso, ou liberadas por `condicao`)
     b. Para cada etapa pronta (potencialmente em paralelo — ver seção
        "Execução paralela" abaixo):
          i.   Pede ao Registry o manifesto da Capability da etapa
          ii.  Valida o manifesto (status, entradas obrigatórias)
          iii. Pede ao Context Manager para resolver as referências
               `{{ ... }}` da `entrada` desta etapa
          iv.  Invoca a Capability através do Adapter disponível para o
               agente em execução
          v.   Registra o resultado no Context Manager
          vi.  Em caso de erro: aplica `tratamento_de_erro` da etapa
     c. Se nenhuma etapa pronta e ainda existem etapas pendentes que não
        vão ficar prontas (porque uma dependência falhou e não há
        recuperação), marca como não executadas e segue para as
        independentes
4. Ao esgotar o grafo, monta o Execution Result (ver
   `ai/contracts/execution-plan-schema.md#contrato-de-saída-execution-result`)
   e pede ao Context Manager para persistir o estado final
```

Este pseudocódigo é a especificação do comportamento esperado — a
implementação real (linguagem, biblioteca de execução concorrente,
tratamento de timeouts) fica para quando o Executor for de fato
construído.

## Contrato de entrada

Um Execution Plan (`ai/contracts/execution-plan-schema.md`) + uma
referência ao Execution Context inicial mantido pelo Context Manager.

## Contrato de saída

Um Execution Result (ver `ai/contracts/execution-plan-schema.md#contrato-de-saída-execution-result`).

## Execução paralela, filas, retries, pausa, retomada, cancelamento, monitoramento

Nada disso é implementado nesta etapa — a arquitetura já reserva onde cada
um entra, para que adicionar não exija reabrir o contrato:

- **Execução paralela** — já é uma propriedade do DAG (etapas sem relação
  de dependência entre si são candidatas naturais). O campo
  `estrategia_execucao` do Execution Plan já sinaliza a intenção; falta só
  o Executor de fato disparar essas etapas concorrentemente em vez de uma
  de cada vez.
- **Filas** — o passo "2.b" do algoritmo acima (disparar uma etapa pronta)
  é o ponto de extensão natural para trocar "chamar direto" por "publicar
  numa fila de tarefas e um worker consome" — o contrato de entrada/saída
  de cada etapa não muda, só quem processa a chamada.
- **Retries** — já fazem parte do formato do Execution Plan
  (`tratamento_de_erro.retentativas_maximas`); falta só o Executor
  implementar o laço de repetição.
- **Pausa/retomada** — como todo o estado mutável vive no Context Manager
  (nunca em memória só do Executor), pausar é persistir o Execution
  Context + quais etapas já terminaram, e retomar é recarregar isso e
  continuar o laço do algoritmo a partir daí. Isso só funciona porque o
  Context Manager já foi desenhado para ser serializável (ver
  `ai/orchestration/context-manager/README.md`).
- **Cancelamento** — uma verificação (`foi cancelado?`) no início de cada
  iteração do laço principal, antes de disparar a próxima leva de etapas.
- **Monitoramento** — consome os mesmos logs que a responsabilidade
  "Registrar logs" acima já produz; a peça que falta é só uma camada de
  observabilidade lendo esses eventos, não uma mudança na geração deles.

## Fluxo completo

Ver `ai/architecture/diagramas.md` para a vista gráfica de
Executor ↔ Context Manager → Registry → Capability → Adapter → Modelo de IA.
