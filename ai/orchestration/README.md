# orchestration/

O núcleo que transforma um pedido do usuário em Capabilities executadas.
Quatro componentes, um pipeline por requisição — diferente de
`ai/registry/`, `ai/contracts/` e `ai/adapters/`, que são serviços
passivos consultados por qualquer coisa a qualquer momento (mais parecidos
com uma biblioteca compartilhada do que com um fluxo que roda do início ao
fim a cada pedido). É por isso que estes quatro moram juntos aqui, em vez
de quatro pastas soltas na raiz de `ai/`.

| Componente | Responsabilidade única | Nunca faz |
|---|---|---|
| `resolver/` | Intenção → `id` de Capability/Workflow | Executar, montar plano |
| `planner/` | `id` escolhido → Execution Plan (DAG de etapas) | Executar etapas |
| `executor/` | Execution Plan → Execution Result (roda o plano) | Conhecer Capability específica, montar plano |
| `context-manager/` | Guardar/projetar/mesclar o estado compartilhado de uma execução | Tomar decisões |

## O pipeline

```
Usuário
  → Resolver         (decide o quê)
  → Planner           (monta o plano de como)
  → Execution Plan     (o DAG, como dado)
  → Executor            (roda o plano)
      ↕ Context Manager  (estado compartilhado durante a execução)
      → Registry          (localiza cada Capability)
      → Capability          (a lógica reutilizável em si)
      → Adapter              (tradução pro agente em uso)
      → Modelo de IA           (quem efetivamente processa/gera)
```

Vista gráfica completa em `ai/architecture/diagramas.md`.

## Por que isso é "o núcleo de um sistema operacional para IA"

Pensando no Caetus OS como um SO: `ai/capabilities/`, `ai/workflows/` e
`ai/knowledge/` são os **programas instalados**; `ai/registry/` é o
**gerenciador de pacotes** (sabe o que existe, valida, cataloga, nunca
roda nada); `ai/contracts/` e `ai/adapters/` são a **ABI/drivers** (como
programas se comunicam com o sistema e com o hardware/agente por baixo).
`ai/orchestration/` é o **kernel**: recebe uma intenção (uma "chamada de
sistema"), decide o quê fazer (`resolver`), monta um plano de execução
(`planner`), escalona e roda (`executor`), e mantém o estado da execução
em andamento (`context-manager`) — sem nunca precisar saber os detalhes
internos de nenhum programa (`Capability`) individual, e sem se importar
qual CPU (agente de IA) está rodando por baixo.

## Regra de desacoplamento (objetivo central desta camada)

Cada componente tem exatamente uma responsabilidade, e nenhum sabe como o
outro faz seu trabalho — só o contrato de entrada/saída entre eles:

- O Planner nunca conhece implementação específica de nenhuma Capability
  — só lê manifestos (contratos).
- O Executor nunca conhece nenhuma Capability específica por nome — só o
  contrato genérico do manifesto que o Registry devolve.
- O Registry nunca executa nada — só descobre, valida, cataloga.
- O Resolver nunca monta planos — só escolhe um `id`.
- O Context Manager nunca toma decisão — só guarda e projeta dado.

Essa separação é o que permite trocar a implementação de qualquer peça
(um Executor mais sofisticado, um Planner que usa um modelo diferente)
sem tocar nas outras — e é também por isso que, entre os quatro, só o
Resolver e o Registry hoje têm alguma implementação real: os contratos
entre eles já são estáveis o suficiente para o resto ser construído em
cima sem redesenhar nada.

## Não implementado nesta etapa (de propósito)

Execução paralela, filas, retries, pausa/retomada, cancelamento e
monitoramento — a arquitetura já reserva onde cada um entra (ver
`ai/orchestration/executor/README.md#execução-paralela-filas-retries-pausa-retomada-cancelamento-monitoramento`),
mas nada disso está implementado. O foco desta etapa é o contrato entre os
quatro componentes, não a execução em si.
