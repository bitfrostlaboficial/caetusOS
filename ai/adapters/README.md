# Adapters

Um Adapter é a ponte fina entre uma Capability (`ai/capabilities/`,
`ai/knowledge/`, `ai/workflows/`) e o mecanismo específico de um agente de
IA. Ele nunca contém regra de negócio, contrato, lista de provedores ou
qualquer coisa que já esteja no `CAPABILITY.md` correspondente — só
traduz. A régua exata do que pode e não pode estar num adapter está em
`ai/contracts/capability-vs-adapter.md`.

## Adapters existentes

| Agente / mecanismo | Documentação do padrão | Adapters implementados |
|---|---|---|
| Claude Code | `ai/adapters/claude-code.md` | `.claude/skills/image-generator/` |
| MCP (protocolo) | ver seção "MCP como adapter universal" abaixo | nenhum ainda |
| OpenAI Codex | — | nenhum ainda |
| GPT via API | — | nenhum ainda |
| Gemini CLI / Gemini API | — | nenhum ainda |
| Llama (via API) | — | nenhum ainda |
| Mistral (via API) | — | nenhum ainda |
| Qwen (via API) | — | nenhum ainda |
| OpenClaw | — | nenhum ainda |
| Outro agente via API genérica | — | nenhum ainda |

Ver `ai/architecture/diagramas.md#2-capability-adapters-e-agentes-de-ia`
para a vista gráfica de como uma Capability se relaciona com todos esses
adapters ao mesmo tempo.

## MCP como adapter universal

MCP (Model Context Protocol) não é um agente — é um **protocolo** que
vários agentes diferentes já falam (incluindo o próprio Claude, via Claude
Desktop, e crescentemente outros). Isso muda o cálculo de custo/benefício:
em vez de escrever um adapter por agente, um único **servidor MCP** que
expõe as Capabilities do Caetus OS como tools atende de uma vez qualquer
cliente compatível com MCP, presente ou futuro, sem precisar saber de
antemão quais agentes vão existir.

Quando esse adapter for construído, o padrão esperado é: um processo MCP
que, para cada Capability com um `CAPABILITY.md`, expõe uma tool cujo nome
é o `capability:` do frontmatter, cujo schema de entrada é o "Contrato de
entrada" da Capability, e cuja implementação só invoca o script/mecanismo
documentado em "Como executar" — ou seja, o mesmo papel de tradução fina
que qualquer outro adapter tem, só que servindo N clientes ao mesmo tempo
em vez de um só. Continua valendo a regra de ouro: o servidor MCP não
duplica contrato nem regra de negócio, só aponta/invoca o que já existe em
`ai/`.

## Como escrever um adapter novo

1. **Não copie conteúdo do `CAPABILITY.md`.** Aponte para ele. Se você se
   pegar reescrevendo um contrato de entrada/saída ou uma regra de
   isolamento dentro do adapter, pare — isso já existe na Capability.
2. **Descreva só o mecanismo de descoberta e invocação do agente.** Cada
   agente tem um jeito diferente de saber que uma capability existe
   (arquivo em uma pasta convencionada, um manifesto JSON de tools, um
   registro passado no system prompt) e de executá-la (rodar um script via
   shell, fazer uma function call estruturada, etc.). Isso é o único
   conteúdo que pertence aqui.
3. **Mantenha o slug.** O nome usado pelo agente para se referir à
   capability (campo `name`, id de function, o que for) deve ser
   idêntico ao `id:` do `manifest.yaml` correspondente — é o que permite
   rastrear "este adapter implementa qual Capability" sem ambiguidade.
4. **Atualize `adapters_disponiveis`** no `manifest.yaml` correspondente
   (ver `ai/contracts/manifest-schema.md`), e a tabela acima neste arquivo.
5. **Um adapter pode ser mais fino que um arquivo inteiro.** Para agentes
   que usam function calling estruturado (schemas JSON em vez de arquivos
   Markdown), o "adapter" pode ser só a definição da function/tool que
   aponta pro script da Capability — não é obrigatório que todo adapter
   tenha a forma de um `SKILL.md`.

## Por que isso existe

O Caetus OS pretende ser operado por mais de um agente de IA ao longo do
tempo (Claude Code hoje; Codex, GPT via API, Gemini, Llama, Mistral, Qwen,
OpenClaw, ou qualquer cliente MCP, amanhã). Sem essa separação, cada agente
novo significaria reescrever a
mesma regra de negócio e o mesmo contrato em um formato diferente — e as
cópias divergiriam silenciosamente conforme o sistema crescesse. Com a
separação, adicionar suporte a um agente novo é escrever só a tradução
mecânica; a Capability em si nunca muda.
