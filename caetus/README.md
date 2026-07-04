# caetus/ — Política de execução do Caetus OS

Esta pasta define a **política de execução do Caetus OS** — o quanto um
agente de IA pode agir sem pedir confirmação (permissões, modo de
aprovação) — de forma independente de qual agente está sendo usado. Não
confundir com [`ai/`](../ai/README.md), que descreve **o que** o Caetus OS
sabe fazer (Capabilities). Um perfil daqui não executa tarefa nenhuma; ele
só declara a política.

**`caetus/` não é um mecanismo de permissões.** Ele não substitui, contorna
nem duplica o sistema nativo de permissões de nenhum agente. Cada agente
(Claude Code, e no futuro outros) continua sendo a única autoridade que de
fato aprova ou bloqueia uma ação. O que `caetus/` faz é declarar a política
uma vez, de forma agnóstica de agente, para que um **adapter** (ver
`adapters/<agente>.md`) traduza essa política para o mecanismo oficial
daquele agente especificamente.

## Por que existe

O Claude Code (e, no futuro, outros agentes) já tem seu próprio mecanismo
oficial de permissões (modos de aprovação via `/config` ou
`permissions.defaultMode`, listas allow/ask/deny por padrão de
comando/arquivo/domínio — veja `ai/adapters/` para o paralelo com
Capabilities). `caetus/` não reimplementa nem substitui isso. O que falta é
um jeito simples de **trocar de perfil com um único comando**, sem duplicar
manualmente a mesma configuração de permissões toda vez que se troca de
perfil ou de agente. É isso que `caetus/` resolve: a política vive em um
lugar só, e o adapter aplica essa política através do mecanismo oficial de
cada agente.

## Estrutura

| Pasta/arquivo | O que é |
|---|---|
| `config/safe.yaml` | Perfil restritivo: pede confirmação para qualquer ação que não seja leitura. |
| `config/developer.yaml` | Perfil permissivo: aprova edições e comandos usuais automaticamente. |
| `scripts/apply_profile.py` | Único ponto de tradução de um perfil (formato agnóstico) para o formato de configuração de um agente específico. |
| `adapters/claude-code.md` | Como o perfil é traduzido e aplicado especificamente para o Claude Code. |
| `.generated/` | Saída do `apply_profile.py` — arquivos de configuração já traduzidos, um por agente/perfil. Gerado a cada troca de perfil, nunca editado à mão, fora do Git. |

## Formato de um perfil (`config/<nome>.yaml`)

```yaml
id: safe
name: Safe
description: "..."
approval_mode: confirm   # confirm | auto_edit | full_auto
shell:
  allow: ["git status", "..."]
  ask: ["npm install*"]
  deny: ["rm -rf*", "git push*"]
filesystem:
  deny_write: [".git/**", ".env*"]
network:
  deny_domains: ["*"]
```

`approval_mode` é o conceito central e agnóstico de agente:

- `confirm` — nada além de leitura roda sem aprovação.
- `auto_edit` — edições de arquivo e comandos rodam sozinhos; ainda assim
  as listas `deny` sempre bloqueiam.
- `full_auto` — nada pede aprovação. Só faz sentido em ambiente isolado
  (container/VM descartável); nenhum perfil atual usa isso por padrão.

As listas `allow`/`ask`/`deny` usam padrões de comando (glob simples, ex.
`git push*`), não a sintaxe de nenhum agente específico — quem traduz isso
para `Bash(git push*)` (Claude Code) ou o equivalente de outro agente é o
adapter, nunca o perfil.

## Como trocar de perfil

```bash
scripts/claude-safe.sh   # ou scripts/claude-safe.ps1 no Windows
scripts/claude-dev.sh    # ou scripts/claude-dev.ps1 no Windows
```

Cada script chama `apply_profile.py`, que gera (ou regenera) o arquivo de
configuração traduzido em `caetus/.generated/<agente>/<perfil>.json`, e
então inicia o agente já apontando para esse arquivo via a flag oficial de
sessão (`claude --settings <arquivo>`, no caso do Claude Code — ver
`adapters/claude-code.md`).

**Isso nunca sobrescreve `.claude/settings.local.json`.** Aquele arquivo
acumula aprovações específicas que o usuário já deu ao Claude Code ao longo
de sessões anteriores (fora do controle do Caetus OS); os scripts de perfil
usam um mecanismo de sessão separado para não apagar esse histórico.

## Suporte a outros agentes

Adicionar um agente novo é: (1) escrever `adapters/<agente>.md` documentando
a tradução, e (2) adicionar uma função de tradução em
`scripts/apply_profile.py` (dicionário `AGENT_TRANSLATORS`). Os arquivos em
`config/` não mudam — são o contrato agnóstico que qualquer agente consome.
