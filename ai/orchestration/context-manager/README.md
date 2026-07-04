# Context Manager

O Context Manager mantém o **estado compartilhado** de uma execução de
ponta a ponta — desde o pedido original do usuário até o resultado final
de cada etapa. Sua existência é o que permite a regra mais importante
desta camada de orquestração:

> **Nenhuma Capability precisa saber quem roda antes ou depois dela.**
> Ela recebe um contexto padronizado (a parte que lhe diz respeito) e
> devolve seu resultado — o Context Manager cuida de levar esse resultado
> para quem precisar dele depois.

## Responsabilidade

Manter o **Execution Context** de uma execução — um objeto por execução
(não por Capability, não global ao sistema) — e oferecer duas operações
mecânicas: **projetar** (dar a uma etapa só a fatia do contexto que a
`entrada` dela pede, resolvendo as referências `{{ ... }}` do Execution
Plan) e **mesclar** (incorporar a saída de uma etapa de volta ao contexto,
disponível para etapas seguintes).

## O que o Context Manager **não** faz

- **Não toma decisões.** Ele não decide se uma etapa deveria rodar, não
  interpreta `condicao`, não decide ordem — isso é do Executor. O Context
  Manager só guarda e entrega dado.
- **Não conhece Capabilities específicas.** Ele nunca sabe o que
  `image-generator` faz — só que a etapa X pediu o campo Y e alguém
  (o Executor, seguindo o plano) perguntou por ele.
- **Não substitui o Context Contract.** Ver seção seguinte.

## Relação com o Context Contract já existente

Esta arquitetura já tinha um **Context Contract**
(`ai/contracts/context-contract.md`) — o formato de dados de negócio
(empresa, branding, tom de voz, campanha) trocado entre Capabilities de
Conhecimento e de Negócio. O Execution Context do Context Manager é um
superconjunto que **compõe** o Context Contract como um dos seus campos,
em vez de redefinir informação de empresa do zero:

```json
{
  "execucao_id": "a1b2c3...uuid",
  "plan_id": "8f14e...uuid",
  "criado_em": "2026-07-04T15:00:00-03:00",
  "entrada_usuario": "cria um post pro instagram sobre o lançamento X",
  "contexto_negocio": { "...Context Contract completo, ai/contracts/context-contract.md..." },
  "resultados": {
    "etapa-1": {
      "status": "sucesso",
      "saida": { "tom_de_voz": {"descricao": "...", "fonte": "..."} },
      "iniciado_em": "2026-07-04T15:00:01-03:00",
      "finalizado_em": "2026-07-04T15:00:03-03:00"
    }
  },
  "arquivos_produzidos": [
    "empresas/caetus_systems/memoria/imagens/post-lancamento-x-0.png"
  ],
  "variaveis": {},
  "historico": [
    {"evento": "etapa_iniciada", "etapa": "etapa-1", "timestamp": "2026-07-04T15:00:01-03:00"},
    {"evento": "etapa_concluida", "etapa": "etapa-1", "timestamp": "2026-07-04T15:00:03-03:00"}
  ],
  "metadados": { "formato_versao": "1.0" }
}
```

| Campo | Cobre |
|---|---|
| `entrada_usuario` | O pedido original em linguagem natural — nunca perdido ao longo da execução. |
| `contexto_negocio` | O Context Contract inteiro (`ai/contracts/context-contract.md`) — informações da empresa, sem redefinir nada que já existe. |
| `resultados` | Resultados intermediários — a saída de cada etapa já concluída, indexada pelo `id` da etapa (é o que a sintaxe `{{ resultados.<id>.<campo> }}` do Execution Plan resolve). |
| `arquivos_produzidos` | Toda referência a arquivo gerado durante a execução (imagens, textos, o que for) — consolidado num só lugar, não espalhado nas saídas de cada etapa. |
| `variaveis` | Espaço livre para dado temporário que não se encaixa em nenhum campo acima. |
| `historico` | Log de eventos da execução (início/fim/erro de cada etapa) — a base para monitoramento futuro (ver `ai/orchestration/executor/README.md`). |
| `metadados` | Versão do formato e qualquer outra informação sobre a execução em si. |

## Projeção e mesclagem (as duas únicas operações)

- **Projetar** (`obter_entrada_da_etapa(execucao, etapa)`): olha
  `etapa.entrada` do Execution Plan, resolve cada referência `{{ ... }}`
  contra o Execution Context atual, e devolve um objeto plano — exatamente
  no formato que o `manifest.yaml` da Capability daquela etapa espera como
  `entradas`. A Capability nunca vê o Execution Context inteiro, só essa
  fatia projetada.
- **Mesclar** (`registrar_resultado(execucao, etapa, saida)`): grava a
  saída de uma etapa em `resultados.<id>`, atualiza `arquivos_produzidos`
  se aplicável, e acrescenta um evento em `historico`. Nunca sobrescreve
  ou remove nada que já estava lá — só acrescenta.

Isso é o que garante o desacoplamento do objetivo 7: uma Capability recebe
só a fatia projetada, nunca o Execution Context bruto — ela literalmente
não tem como saber que existe uma etapa 3 rodando em paralelo, ou o que a
etapa anterior fez além do que foi projetado para ela.

## Arquitetura pensada para escala

- **Um Execution Context por execução, não um estado global.** Múltiplas
  execuções simultâneas (ver `ai/architecture/escalabilidade.md#múltiplos-workflows-executando-simultaneamente`)
  nunca compartilham o mesmo objeto — cada uma tem seu `execucao_id`
  próprio, o que já elimina uma classe inteira de bug de concorrência.
- **Serializável desde o desenho.** O Execution Context é um objeto de
  dados puro (sem referências a código, sem estado que só existe em
  memória de um processo) — isso é o que permite persistência
  (`empresas/<slug>/memoria/execucoes/<execucao_id>/contexto.json`, na
  mesma convenção de `memoria/` já estabelecida) e, por extensão, pausa e
  retomada de execução (ver `ai/orchestration/executor/README.md#execução-paralela-filas-retries-pausa-retomada-cancelamento-monitoramento`).
- **Crescimento limitado.** `resultados` e `historico` crescem com o
  número de etapas do plano (dezenas, não milhares) — não há necessidade
  de um banco de dados dedicado nesta escala; um arquivo JSON por execução
  é suficiente. Se o volume de execuções simultâneas um dia justificar
  outra coisa (um banco real, um cache distribuído), a interface de
  projetar/mesclar não muda — só a implementação por trás dela.

## Fluxo completo

Ver `ai/architecture/diagramas.md` para a vista gráfica de como o Context
Manager se conecta ao Executor durante toda a execução do plano.
