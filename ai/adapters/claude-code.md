# Adapter: Claude Code

Como o Claude Code (o mecanismo de Skills usado por este agente ao operar
o repositório) consome as Capabilities definidas em `ai/`.

## Mecanismo de descoberta

O Claude Code descobre skills automaticamente em `.claude/skills/<slug>/SKILL.md`
— isso é fixo pelo próprio Claude Code, o Caetus OS não controla esse
mecanismo. Por isso continuamos mantendo um `SKILL.md` por Capability
implementada, mesmo que o conteúdo real esteja em `ai/`.

## O que vai em cada `SKILL.md`

Um `SKILL.md` de adapter Claude Code tem exatamente estas partes:

1. **Frontmatter** (`name`, `description`) — igual a qualquer skill do
   Claude Code. `name` é sempre idêntico ao `id:` do `manifest.yaml`
   correspondente. `description` é a reformulação "pushy" (ver o guia do
   `skill-creator`) do "Quando usar" da Capability — é o único lugar onde
   uma tradução de conteúdo é esperada, porque o texto serve a um
   mecanismo (triggering) que só o Claude Code tem.
2. **Tag de camada/versão** — espelha `camada`/`versao` do
   `manifest.yaml` (`> **Camada:** ...` / `> **Versão:** ...`), só para
   leitura rápida.
3. **Um parágrafo dizendo que é um adapter fino** e apontando para
   `ai/<camada>/<slug>/CAPABILITY.md` como a especificação real.
4. **Mecânica de invocação específica do Claude Code** — no caso de
   Capabilities distribuídas como script, isso é só "rode com a ferramenta
   Bash: `python ai/<camada>/<slug>/scripts/<script>.py ...`" e, quando
   aplicável, "antes de mais nada, veja se esta sessão já tem uma
   ferramenta/MCP nativa que cobre isso".
5. **Nada mais.** Nenhum contrato, nenhuma regra de negócio, nenhuma lista
   de provedores — isso está no `CAPABILITY.md`.

## Template

```markdown
---
name: <slug>
description: <reformulação pushy do "Quando usar" da Capability>
---

> **Camada:** <camada>
> **Versão:** <versão>

# <Nome>

Este é um adaptador fino do Claude Code para a Capability `<slug>`. A
especificação completa — objetivo, regras, contrato de entrada/saída,
como executar — vive em `ai/<camada>/<slug>/CAPABILITY.md`. Leia esse
arquivo antes de usar esta skill; este `SKILL.md` só cobre os detalhes de
como o Claude Code especificamente a invoca.

## Como invocar

[mecânica específica do Claude Code — qual ferramenta usar, qual comando rodar]
```

## Exemplo real: `image-generator`

`.claude/skills/image-generator/SKILL.md` segue exatamente este template.
Compare com `ai/capabilities/image-generator/CAPABILITY.md` — o `SKILL.md`
não repete nenhum contrato, regra ou lista de provedores; só diz onde
encontrá-los e como o Claude Code roda o script.

## Skills que não são Capabilities do Caetus OS

Nem toda pasta em `.claude/skills/` é um adapter para uma Capability do
Caetus OS. `skill-creator` e `lovable-to-vercel`, por exemplo, são skills
de ferramentas genéricas de desenvolvimento (criar skills, portar projetos
Lovable) — não representam nenhum comportamento do produto Caetus OS e não
têm `CAPABILITY.md` correspondente em `ai/`. Só skills que existem para dar
ao Claude Code uma capacidade do próprio Caetus OS (gerar imagem, consultar
conhecimento da empresa, montar um post) precisam ser adapters finos
apontando para `ai/`.
