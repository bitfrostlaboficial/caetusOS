# Context Contract

Quando uma capability precisa passar informação de negócio para outra (ex.:
um workflow chamando uma capability de negócio, ou uma capability de
negócio chamando `company-knowledge`), essa informação **nunca viaja como
texto livre** ("a empresa é a Caetus, o tom é descontraído..."). Ela viaja
como um objeto JSON com esta forma fixa — o Context Contract. Isso existe
para que quem consome o contexto não precise adivinhar onde, dentro de um
parágrafo, está a paleta de cores ou a restrição da campanha. Como este
contrato é sobre dados de negócio (não sobre mecanismo de nenhum agente de
IA), ele é o mesmo para qualquer adaptador — Claude Code, Codex, Gemini ou
qualquer outro.

Este contrato é sobre **informação de negócio** (empresa, marca, campanha).
Ele é diferente do contrato de entrada/saída técnico de uma capability
genérica como `image-generator` (esse fica documentado dentro da própria
capability, em `ai/capabilities/image-generator/references/output-contract.md`)
— os dois convivem: uma capability de negócio recebe/produz um Context
Contract e, a partir dele, monta os parâmetros técnicos (ex. o `prompt`)
que passa para a capability genérica.

## Forma do objeto

```json
{
  "schema_version": "1.0",
  "empresa": {
    "slug": "caetus_systems",
    "nome": "Caetus Systems",
    "idioma": "pt-BR"
  },
  "branding": {
    "identidade_visual": {
      "descricao": "resumo interpretado, não o arquivo bruto",
      "fonte": "empresas/caetus_systems/conhecimento/marketing/identidade_visual.md"
    },
    "paleta": [
      {"nome": "azul-caetus", "hex": "#123456"}
    ],
    "tipografia": {
      "titulo": "nome da fonte de título, se definida",
      "texto": "nome da fonte de corpo de texto, se definida"
    }
  },
  "tom_de_voz": {
    "descricao": "resumo interpretado",
    "fonte": "empresas/caetus_systems/conhecimento/marketing/tom_de_voz.md"
  },
  "publico_alvo": {
    "descricao": "resumo do ICP/persona relevante para esta tarefa",
    "fonte": "empresas/caetus_systems/conhecimento/cliente/icp.md"
  },
  "campanha": {
    "nome": null,
    "objetivo": null
  },
  "objetivo": "descrição da tarefa atual em uma frase — o que se está tentando produzir agora",
  "restricoes": [
    "ex.: não mencionar o concorrente X",
    "ex.: máximo 2200 caracteres"
  ],
  "documentos_utilizados": [
    "empresas/caetus_systems/conhecimento/marketing/identidade_visual.md",
    "empresas/caetus_systems/conhecimento/marketing/tom_de_voz.md"
  ],
  "data_da_consulta": "2026-07-04T14:32:00-03:00",
  "versao_base_conhecimento": "hash ou timestamp definido por company-knowledge — ver nota abaixo"
}
```

Nenhum campo é obrigatório em todas as situações — uma capability que só
precisa de `tom_de_voz` não precisa preencher `paleta`. Os campos vazios
ficam como `null` ou lista vazia, nunca omitidos silenciosamente (isso
deixa explícito o que **não** foi consultado, o que importa para
auditoria).

## Quem preenche cada parte

O contrato é construído em etapas, por capabilities diferentes, não por uma
única capability de uma vez:

1. **`company-knowledge`** preenche `empresa`, `branding`, `tom_de_voz`,
   `publico_alvo`, `documentos_utilizados`, `data_da_consulta` e
   `versao_base_conhecimento` — tudo que vem da base de conhecimento.
2. **A capability de negócio ou workflow que iniciou a tarefa** preenche
   `campanha`, `objetivo` e `restricoes` — isso é específico da tarefa
   atual, `company-knowledge` não tem como saber disso sozinha.
3. Cada capability que recebe o contrato **repassa adiante o objeto
   inteiro**, só acrescentando o que sabe a mais — nunca remove nem
   reescreve o que já veio preenchido por quem chamou antes.

## `versao_base_conhecimento`

Hoje `empresas/` não é versionado no Git (está no `.gitignore`), então não
existe um número de versão pronto. Quando `company-knowledge` for
implementada, ela é responsável por calcular esse campo — por exemplo, um
hash dos `mtime` (data de modificação) dos arquivos de `conhecimento/` da
empresa consultada, ou um timestamp do arquivo mais recente. O objetivo é
permitir que, olhando dois Context Contracts gerados em momentos
diferentes, dê para saber se a base de conhecimento mudou entre um e
outro. A implementação exata fica a critério de quem construir
`company-knowledge` (ver `ai/knowledge/company-knowledge/CAPABILITY.md`).

## Persistência (auditoria)

Sempre que uma capability de negócio ou workflow gerar um artefato final
(uma imagem, um post, uma página), ela deve salvar o Context Contract
usado como um arquivo `.contexto.json` ao lado do artefato (mesma
convenção de sidecar já usada em
`ai/capabilities/image-generator/references/output-contract.md`). Isso
permite, meses depois, responder "por que essa imagem saiu com essas
cores" olhando o contexto exato que gerou aquele resultado — sem precisar
reconstruir o raciocínio de memória.

## Exemplo de uso encadeado

```
1. instagram-post (workflow) recebe o pedido "cria um post sobre o lançamento X"
2. instagram-post chama company-knowledge com empresa=caetus_systems,
   campo_solicitado=[tom_de_voz, identidade_visual, publico_alvo]
   → recebe um Context Contract parcial
3. instagram-post preenche objetivo="post de lançamento do produto X" e
   campanha={"nome": "lançamento-X", "objetivo": "gerar reconhecimento"}
4. instagram-post chama branded-image-generator passando o Context Contract completo
5. branded-image-generator usa branding.paleta + tom_de_voz para montar o
   prompt e chama image-generator (que não vê o Context Contract inteiro,
   só o prompt e os parâmetros técnicos derivados dele)
6. instagram-post salva o resultado + uma cópia do Context Contract em
   empresas/caetus_systems/memoria/posts/
```
