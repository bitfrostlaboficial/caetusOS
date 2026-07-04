# Formato do Execution Plan

Um Execution Plan é a saída do **Execution Planner** (`ai/orchestration/planner/`)
e a entrada do **Executor** (`ai/orchestration/executor/`) — o contrato que
conecta os dois. Ele representa um **DAG** (grafo acíclico dirigido): uma
lista de etapas, cada uma referenciando uma Capability por `id` e
declarando de quais outras etapas depende. Formato completo abaixo; schema
formal (JSON Schema) em `ai/contracts/execution-plan.schema.json`.

## Por que DAG, e não uma lista sequencial

Um pedido como "cria um post pro Instagram" naturalmente se decompõe em
etapas com dependências, não numa fila estrita. No exemplo de referência
usado nesta arquitetura — `company-knowledge` → `branded-copy-generator` →
`branded-image-generator` → `carousel-builder` → `instagram-publisher` —
`branded-copy-generator` e `branded-image-generator` só dependem de
`company-knowledge`, não uma da outra: **poderiam rodar em paralelo**. Uma
lista ordenada não consegue representar isso sem inventar uma segunda
notação para "isso pode ser feito ao mesmo tempo"; um DAG representa os
dois casos (sequencial e paralelo) com a mesma estrutura — cada etapa só
declara `depende_de`, e quantas etapas puderem rodar ao mesmo tempo dado
esse grafo é uma decisão do **Executor**, não do formato. Isso é o mesmo
princípio usado por praticamente todo motor de workflow consolidado
(Airflow, Argo Workflows, GitHub Actions, Temporal) — adotado aqui em vez
de inventado, conforme o pedido de basear componentes novos em padrões já
estabelecidos.

## Por que JSON, e não YAML

`manifest.yaml` é YAML porque é escrito por humano e vive para sempre.
O Execution Plan é o oposto: **gerado por código a cada pedido**,
efêmero, consumido por outro componente de software (o Executor), e
frequentemente vai parar em log/auditoria. Para esse perfil, JSON ganha:

- Sintaxe sem ambiguidade de indentação — um bug no Planner que gera JSON
  malformado quebra imediatamente no parser; o mesmo bug gerando YAML mal
  indentado pode silenciosamente produzir uma estrutura diferente da
  pretendida.
- Serialização trivial em qualquer linguagem, sem biblioteca extra (ao
  contrário do YAML, que exigiu adicionar PyYAML ao Registry).
- Encaixa direto em logs, respostas de API, e no `.contexto.json` que já
  é a convenção de auditoria usada em `ai/contracts/context-contract.md`.

Nada impede um humano de escrever um Execution Plan à mão para testar o
Executor — só não é o caso de uso principal.

## Forma do objeto

```json
{
  "formato_versao": "1.0",
  "plan_id": "8f14e...uuid",
  "criado_em": "2026-07-04T15:00:00-03:00",
  "origem": {
    "pedido_usuario": "cria um post pro instagram sobre o lançamento X",
    "resolvido_por": "resolver",
    "capability_ou_workflow": "instagram-post"
  },
  "estrategia_execucao": "paralela-quando-possivel",
  "etapas": [
    {
      "id": "etapa-1",
      "capability": "company-knowledge",
      "depende_de": [],
      "entrada": {
        "empresa": "{{ contexto.empresa.slug }}",
        "campo_solicitado": ["tom_de_voz", "identidade_visual"]
      },
      "condicao": null,
      "tratamento_de_erro": {
        "apos_esgotar_retentativas": "abortar_plano",
        "retentativas_maximas": 0
      }
    },
    {
      "id": "etapa-2",
      "capability": "branded-copy-generator",
      "depende_de": ["etapa-1"],
      "entrada": { "tom_de_voz": "{{ resultados.etapa-1.saida.tom_de_voz }}" },
      "condicao": null,
      "tratamento_de_erro": { "apos_esgotar_retentativas": "abortar_plano", "retentativas_maximas": 1 }
    },
    {
      "id": "etapa-3",
      "capability": "branded-image-generator",
      "depende_de": ["etapa-1"],
      "entrada": { "identidade_visual": "{{ resultados.etapa-1.saida.identidade_visual }}" },
      "condicao": null,
      "tratamento_de_erro": { "apos_esgotar_retentativas": "abortar_plano", "retentativas_maximas": 1 }
    },
    {
      "id": "etapa-4",
      "capability": "carousel-builder",
      "depende_de": ["etapa-2", "etapa-3"],
      "entrada": {
        "texto": "{{ resultados.etapa-2.saida }}",
        "imagem": "{{ resultados.etapa-3.saida }}"
      },
      "condicao": null,
      "tratamento_de_erro": { "apos_esgotar_retentativas": "abortar_plano", "retentativas_maximas": 0 }
    },
    {
      "id": "etapa-5",
      "capability": "instagram-publisher",
      "depende_de": ["etapa-4"],
      "entrada": { "conteudo": "{{ resultados.etapa-4.saida }}" },
      "condicao": null,
      "tratamento_de_erro": { "apos_esgotar_retentativas": "pular_dependentes", "retentativas_maximas": 2 }
    }
  ]
}
```

`branded-copy-generator`, `branded-image-generator`, `carousel-builder` e
`instagram-publisher` são nomes **ilustrativos** deste exemplo — nenhuma
dessas Capabilities existe ainda (ver `ai/architecture/capability-registry.md`).
O exemplo mostra a forma do plano, não um roadmap de implementação.

## Campos

| Campo | Tipo | Descrição |
|---|---|---|
| `formato_versao` | string | Versão deste formato (não do plano em si). |
| `plan_id` | string (UUID) | Identificador único desta instância de plano. |
| `criado_em` | string (ISO 8601) | Quando o Planner gerou o plano. |
| `origem.pedido_usuario` | string | O pedido original em linguagem natural. |
| `origem.resolvido_por` | string | Sempre `"resolver"` hoje — reservado para o caso de um plano ser montado sem passar pelo Resolver (ex. um Funcionário Digital chamando um workflow direto pelo `id`). |
| `origem.capability_ou_workflow` | string | O `id` que o Resolver escolheu, ponto de partida do plano. |
| `estrategia_execucao` | enum | `sequencial` \| `paralela-quando-possivel`. Uma dica para o Executor — mesmo com `sequencial`, o DAG continua sendo o mesmo; a diferença é só se o Executor tem permissão de rodar ramos independentes ao mesmo tempo. |
| `etapas` | lista de objetos | O DAG propriamente dito — ver abaixo. |

### Cada item de `etapas`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string | Identificador único **dentro do plano** (não precisa ser globalmente único, só sem repetição no mesmo plano). |
| `capability` | string | `id` de uma Capability existente no catálogo do Registry. |
| `depende_de` | lista de `id`s de etapas | Quais outras etapas *deste plano* precisam terminar (com sucesso) antes desta começar. Lista vazia = pode começar assim que o plano iniciar. |
| `entrada` | objeto | Os parâmetros a passar para a Capability, no formato do `entradas` do `manifest.yaml` dela. Valores podem ser literais ou referências `{{ ... }}` (ver abaixo). |
| `condicao` | string ou `null` | Expressão opcional — quando presente, a etapa só roda se a condição for satisfeita; caso contrário é pulada (não é erro). A sintaxe exata da expressão fica em aberto para quando o Executor for implementado; o campo já existe no formato para não exigir uma mudança de contrato depois. |
| `tratamento_de_erro.retentativas_maximas` | inteiro | Quantas vezes tentar de novo antes de desistir desta etapa. `0` = não tenta de novo. |
| `tratamento_de_erro.apos_esgotar_retentativas` | enum | `abortar_plano` (para tudo) \| `pular_dependentes` (essa etapa e tudo que dependia dela são marcados como não executados, mas ramos independentes do DAG continuam). |

### Sintaxe de referência (`{{ ... }}`)

Um valor de `entrada` pode referenciar dado já disponível no contexto
compartilhado em vez de um literal, usando `{{ caminho.pontuado }}` — a
mesma ideia usada por GitHub Actions (`${{ steps.x.outputs.y }}`) e Argo
Workflows. Dois prefixos:

- `{{ contexto.<campo> }}` — lê do Execution Context mantido pelo Context
  Manager (`ai/orchestration/context-manager/`), incluindo o Context
  Contract (`contexto.empresa`, `contexto.tom_de_voz`...).
- `{{ resultados.<id-da-etapa>.<campo> }}` — lê a saída de uma etapa
  anterior *deste mesmo plano* (deve ser uma etapa listada em
  `depende_de`, direta ou transitivamente — o Executor valida isso antes
  de rodar).

A **resolução** dessas referências (interpretar a string e buscar o valor
real) é responsabilidade do Executor em tempo de execução — este
documento define só a sintaxe do contrato, não a implementação.

## Contrato de saída (Execution Result)

O que o Executor devolve depois de rodar (ou tentar rodar) um plano:

```json
{
  "plan_id": "8f14e...uuid",
  "execucao_id": "a1b2c3...uuid",
  "status": "sucesso",
  "etapas": [
    {
      "id": "etapa-1",
      "status": "sucesso",
      "tentativas": 1,
      "iniciado_em": "2026-07-04T15:00:01-03:00",
      "finalizado_em": "2026-07-04T15:00:03-03:00",
      "saida_ref": "resultados.etapa-1"
    }
  ],
  "error": null,
  "contexto_final_ref": "onde o Context Manager persistiu o estado final desta execução"
}
```

- `status` do plano inteiro: `sucesso` \| `falha_parcial` (algumas etapas
  puladas por `pular_dependentes`, mas o plano terminou) \| `falha`
  (abortado) \| `cancelado`.
- `status` de cada etapa: `sucesso` \| `erro` \| `pulado` (por condição
  falsa ou por `pular_dependentes` de uma dependência).
- Segue a mesma convenção de erro do resto da arquitetura
  (`ai/contracts/convencoes-de-contrato.md`): campo `error` sempre
  presente, `null` em caso de sucesso.

## Quem lê e escreve este contrato

- **Execution Planner** (`ai/orchestration/planner/`) — produz o Execution
  Plan.
- **Executor** (`ai/orchestration/executor/`) — consome o Execution Plan,
  produz o Execution Result.
- **Context Manager** (`ai/orchestration/context-manager/`) — é onde as
  referências `{{ contexto.* }}` e `{{ resultados.* }}` são efetivamente
  buscadas.
