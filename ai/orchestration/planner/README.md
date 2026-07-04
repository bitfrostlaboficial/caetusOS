# Execution Planner

O Execution Planner transforma uma intenção já resolvida pelo **Resolver**
(`ai/orchestration/resolver/`) em um **Execution Plan** (formato completo
em `ai/contracts/execution-plan-schema.md`) — o DAG de etapas que o
**Executor** vai rodar. O Planner **nunca executa nenhuma etapa**; a saída
dele é sempre dado (um plano), nunca um efeito colateral.

```
Resolver decide "instagram-post"  →  Planner monta o plano de etapas para chegar lá
```

## Responsabilidade

Entrada: o `id` de Capability/Workflow escolhido pelo Resolver, mais o
pedido original e contexto disponível. Saída: um Execution Plan completo
— etapas, dependências entre elas, e como a entrada de cada etapa se
conecta à saída de outra (ou ao contexto inicial).

## De onde o plano vem — principalmente do próprio manifesto

Um ponto central desta arquitetura: uma Capability de camada **workflow**
já declara suas dependências no campo `dependencias` do `manifest.yaml`
dela (ver `ai/contracts/manifest-schema.md`). Isso significa que boa parte
do trabalho do Planner é **mecânico**, não é "inventar" um plano do zero:

1. Pega o `id` escolhido pelo Resolver (ex. `instagram-post`).
2. Lê o manifesto dessa Capability via **Registry** (`ai/registry/`).
3. Para cada dependência declarada, lê o manifesto dela também —
   recursivamente — até ter o grafo completo de Capabilities envolvidas.
4. Topologicamente ordena esse grafo (as que não dependem de nada primeiro).
5. Para cada etapa, decide a `entrada` — conectando `saidas` de uma etapa
   às `entradas` de outra que declara depender dela (usando a sintaxe
   `{{ resultados.<id>.<campo> }}` de `execution-plan-schema.md`), ou ao
   contexto inicial quando não há etapa anterior que produza aquele dado.
6. Serializa tudo no formato de `ai/contracts/execution-plan-schema.md`.

Isso significa que, se os manifestos já estão corretos e completos (o que
o Registry valida), grande parte do plano se monta sozinha — o Planner
não precisa "adivinhar" quais Capabilities existem ou o que cada uma
espera, ele só lê o que já está declarado.

## Onde entra julgamento (não é 100% mecânico)

Duas situações que o passo a passo acima não resolve sozinho:

- **Mais de uma Capability candidata para o mesmo papel** (ex. duas
  formas de gerar a imagem, uma mais rápida e outra de mais qualidade) —
  decidir qual usar pode depender do pedido original ("preciso rápido")
  ou de uma preferência default. Esse é um ponto de decisão explícito, não
  escondido dentro da lógica de montagem do grafo.
- **Condições** (o campo `condicao` de uma etapa, ver
  `execution-plan-schema.md`) — quando o plano só deveria incluir uma
  etapa dependendo de um resultado anterior (ex. só gerar carrossel se
  houver mais de uma imagem). Definir essas condições exige entender a
  intenção por trás do pedido, não só o grafo de dependências declaradas.

Esses dois casos provavelmente vão precisar de uma capacidade de
compreensão de texto/raciocínio por trás — a mesma questão em aberto já
registrada para o Resolver (`ai/orchestration/resolver/README.md`). Fica
documentado aqui como fronteira conhecida, não resolvido nesta etapa.

## O que o Planner **não** faz

- **Não executa nada.** Nenhuma etapa, nenhuma chamada de rede, nenhuma
  leitura de `empresas/`.
- **Não conhece implementação de nenhuma Capability específica.** Ele só
  lê o manifesto (contrato) — nunca o `CAPABILITY.md`, nunca o código em
  `scripts/`. Se o manifesto está certo, o Planner nunca precisa saber
  *como* uma Capability faz o que faz.
- **Não decide qual agente de IA vai rodar o plano.** Isso é inteiramente
  um assunto do Adapter, depois que o Executor já estiver processando
  cada etapa.

## Contrato de entrada

```json
{
  "capability_ou_workflow": "instagram-post",
  "pedido_usuario": "cria um post pro instagram sobre o lançamento do produto X",
  "contexto_inicial": { "empresa": {"slug": "caetus_systems"} }
}
```

## Contrato de saída

Um Execution Plan completo, no formato de
`ai/contracts/execution-plan-schema.md` — o Planner nunca devolve um
formato próprio, sempre esse contrato compartilhado com o Executor. Em
caso de não conseguir montar um plano válido (ex. uma dependência
declarada no manifesto não existe no catálogo do Registry), devolve
`{"plano": null, "error": "..."}` em vez de um plano incompleto.

## Fluxo completo

Ver `ai/architecture/diagramas.md` para a vista gráfica de
Usuário → Resolver → Planner → Execution Plan → Executor.
