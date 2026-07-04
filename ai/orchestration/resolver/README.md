# Resolver

O Resolver é o componente que transforma a **intenção** de um usuário em
**qual Capability ou Workflow deve ser usado**. Ele é o "despachante" do
sistema operacional: dado um pedido em linguagem natural, decide o quê
rodar — nunca roda nada ele mesmo, e nunca decide *como* rodar (isso é o
Adapter do agente que efetivamente for executar a Capability escolhida).

Esta é uma arquitetura **documentada, não implementada** nesta etapa — de
propósito. Resolver bem é, em si, uma tarefa de compreensão de linguagem;
implementar isso de verdade é a próxima etapa depois que existir catálogo
suficiente (via `ai/registry/`) para valer a pena. O que segue é o
contrato que a implementação futura deve respeitar.

## Responsabilidade

Entrada: um pedido em linguagem natural (mais contexto opcional). Saída:
qual `id` de Capability ou Workflow (do catálogo do Registry) melhor
atende esse pedido — ou a indicação explícita de que nada no catálogo
atende, em vez de forçar uma resposta.

```
"Crie um post para Instagram"        → instagram-post        (workflow)
"Gere uma imagem de um pôr do sol"    → image-generator        (capacidade genérica)
"Criar um vídeo institucional"        → video-generator         (capacidade genérica)
```

## O que o Resolver **não** faz

- **Não executa nada.** Nem a Capability escolhida, nem nenhuma etapa
  intermediária. O resultado do Resolver é um `id` (ou uma lista de
  candidatos), nunca um artefato.
- **Não conhece agente de IA nenhum.** Resolver decide *o quê*; o Adapter
  do agente que estiver rodando decide *como* invocar aquilo. O mesmo
  Resolver serve Claude Code, Codex, ou qualquer outro.
- **Não substitui o julgamento de quem está operando.** Numa ambiguidade
  real (dois candidatos plausíveis), o contrato de saída existe
  justamente para expor isso, não para escolher arbitrariamente.

## De onde vêm os candidatos

O Resolver nunca hardcoda a lista de Capabilities existentes — ele
consulta o catálogo produzido pelo **Registry** (`ai/registry/`) em tempo
de resolução. Os campos do manifesto mais relevantes para o Resolver
comparar contra a intenção do usuário são `descricao`, `categoria`,
`tags` e `camada` (ver `ai/contracts/manifest-schema.md`). Isso significa
que adicionar uma Capability nova ao catálogo (só criar o `manifest.yaml`)
já a torna candidata em qualquer resolução futura, sem precisar tocar no
Resolver.

## Contrato de entrada

```json
{
  "pedido": "cria um post pro instagram sobre o lançamento do produto X",
  "contexto": {
    "empresa": "caetus_systems"
  }
}
```

- `pedido` (string, obrigatório): o texto em linguagem natural.
- `contexto` (objeto, opcional): qualquer coisa que ajude a desambiguar
  (empresa ativa, canal, restrições já conhecidas) — não é o Context
  Contract inteiro, só o suficiente para resolver, não para executar.

## Contrato de saída

```json
{
  "escolhido": "instagram-post",
  "camada": "workflow",
  "confianca": "alta",
  "alternativas": ["carousel-builder"],
  "justificativa": "pedido menciona 'post' e 'instagram' explicitamente; instagram-post é o único workflow cuja descrição cobre esse caso.",
  "error": null
}
```

- `confianca`: `alta` \| `media` \| `baixa` — permite que quem chama o
  Resolver decida se confirma com o usuário antes de prosseguir quando a
  confiança não for alta.
- `alternativas`: outros candidatos plausíveis do catálogo, para o caso de
  quem chama querer oferecer escolha em vez de seguir cegamente o
  primeiro.
- Quando nada no catálogo atende, `escolhido` vem `null` e `error` explica
  o motivo — nunca force uma escolha ruim só para preencher o campo (a
  mesma convenção de erro do resto da arquitetura, ver
  `ai/contracts/convencoes-de-contrato.md`).

## Uma questão em aberto, deliberadamente não resolvida agora

Resolver texto livre em um `id` de catálogo é, na prática, uma tarefa que
provavelmente vai precisar de um modelo de linguagem por trás (comparar
semanticamente o pedido contra `descricao`/`tags`/`categoria` de cada
Capability). Isso é um pouco recursivo — o próprio Resolver pode acabar
sendo, ele mesmo, consumidor de uma Capability de compreensão de texto.
Essa decisão de implementação fica para quando o Resolver for construído
de fato; o contrato acima já é estável o suficiente para não precisar
mudar dependendo de qual abordagem for escolhida (busca por
palavra-chave, embeddings, ou uma chamada a um modelo).

## Fluxo completo (usuário → Resolver → Workflow/Capability → Adapter)

Ver `ai/architecture/diagramas.md` para a vista gráfica desta cadeia
inteira, incluindo onde o Registry e os Adapters entram.
