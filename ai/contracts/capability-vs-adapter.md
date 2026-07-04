# Capability vs. Adapter — o que pertence a cada lado

Esta é a régua que decide, sempre que uma informação precisar ser escrita
em algum lugar, se ela vai em `ai/<camada>/<slug>/CAPABILITY.md` (e
`references/`) ou em `.claude/skills/<slug>/SKILL.md` (ou o adaptador
equivalente de outro agente). Errar essa régua é como a duplicação de
documentação volta a acontecer — por isso ela é seu próprio documento, não
uma nota de rodapé.

## Regra geral

> Se a informação continuaria verdadeira mesmo trocando o agente de IA que
> está executando a tarefa, ela pertence à **Capability**. Se a informação
> só faz sentido por causa de como um agente específico funciona, ela
> pertence ao **Adapter**.

## Pertence à Capability (`CAPABILITY.md` + `references/` + `scripts/`)

- Objetivo, regras de isolamento, contrato de entrada/saída.
- Lista de provedores/APIs suportados e como cada um é chamado.
- Lógica de execução real — o script que efetivamente faz o trabalho.
- Boas práticas de uso (ex. como escrever um bom prompt).
- Dependências de outras Capabilities.
- Casos de erro e como uma mensagem de erro deve ser formulada.
- Versão e status.
- A seção "Quando usar" em tom neutro/factual.

Regra prática: **qualquer coisa que precisaria ser verdade também para um
adaptador Codex ou Gemini, se eles existissem hoje.**

## Pertence só ao Adapter (ex. `.claude/skills/<slug>/SKILL.md`)

- O próprio arquivo `SKILL.md` e sua existência em `.claude/skills/` — é
  assim que **o Claude Code especificamente** descobre skills; outro
  agente descobre capabilities de outro jeito (ex. um registro de
  `function calling`/tools, um manifesto MCP, um system prompt com um
  índice de capabilities).
- O campo `description` do frontmatter do `SKILL.md` — é o texto que **o
  mecanismo de triggering do Claude Code** usa para decidir se invoca a
  skill. Pode (e deve) ser uma reformulação mais assertiva/"pushy" do
  "Quando usar" da Capability — isso não é duplicação proibida, é
  tradução para o mecanismo de triggering deste agente específico. Ver
  `references/schemas.md` do `skill-creator` para a razão de ser "pushy".
- Instruções de "antes de mais nada, veja quais ferramentas/MCPs esta
  sessão tem disponíveis" — isso descreve como o **Claude Code** expõe
  ferramentas, não é universal (outro agente pode não ter esse conceito de
  sessão, ou pode expor ferramentas de outra forma).
- O comando exato usado para invocar um script a partir do mecanismo de
  execução do agente (ex. "use a ferramenta Bash do Claude Code para
  rodar..."). O próprio script e seus argumentos são da Capability; *como
  um agente específico dispara esse comando* é do adapter.
- Qualquer conversão de formato entre o que o agente consegue "ver"
  nativamente (arquivos, stdout, uma imagem renderizada inline no chat) e
  o contrato bruto da Capability.
- Metadata de empacotamento específica do Claude Code (`skills-lock.json`,
  a convenção de "instalar" uma skill a partir de um repositório GitHub).

## O teste rápido

Antes de escrever uma frase em qualquer um dos dois arquivos, pergunte:
"se eu apagasse o Claude Code inteiro e só sobrasse o Codex, esta frase
ainda seria verdade, sem editar uma palavra?"

- Sim → `CAPABILITY.md`.
- Não → `SKILL.md` (ou o adapter equivalente).

## Exemplo concreto (`image-generator`)

| Informação | Onde vive | Por quê |
|---|---|---|
| "Nunca leia `empresas/**`" | `CAPABILITY.md` | Verdade para qualquer agente. |
| Endpoint e autenticação da API da fal.ai | `references/providers.md` (dentro da Capability) | Verdade para qualquer agente. |
| "Verifique a lista de ferramentas disponíveis nesta sessão antes de usar o script" | `SKILL.md` | É um comportamento específico de como o Claude Code expõe MCPs/tools numa sessão. |
| O texto `description` que faz o Claude Code invocar a skill ao ouvir "gera um banner" | `SKILL.md` (frontmatter) | É o mecanismo de triggering do Claude Code — outro agente não usa esse campo. |
| O comando `python ai/capabilities/image-generator/scripts/generate_image.py --prompt ...` | `CAPABILITY.md` (seção "Como executar") | Qualquer agente com shell roda o mesmo comando — não é exclusivo do Claude Code. |

## Consequência prática

Sempre que um adapter for escrito ou revisado, ele deve ficar pequeno o
suficiente para caber inteiro numa leitura rápida — se um `SKILL.md`
começar a crescer com parágrafos de regra de negócio ou detalhe de
provedor, isso é sinal de que esse conteúdo vazou do lugar certo e precisa
voltar para o `CAPABILITY.md` correspondente.
