# Adapter: Claude Code

Este arquivo documenta a **tradução**: como a política de execução do
Caetus OS (`caetus/config/*.yaml`) é convertida para o mecanismo nativo de
permissões do Claude Code. Este adapter não controla o Claude Code
diretamente e não é um sistema de permissões paralelo — ele só gera a
configuração que o próprio Claude Code interpreta através dos seus
mecanismos oficiais.

## Mecanismo oficial usado

Quem decide o que roda ou não é sempre o Claude Code, através do seu
próprio mecanismo nativo de permissões: modo de aprovação (`/config` na
sessão interativa, ou `permissions.defaultMode` no arquivo de settings —
valores `default` / `acceptEdits` / `plan` / `auto` / `dontAsk` /
`bypassPermissions`) e listas `permissions.allow` / `permissions.ask` /
`permissions.deny` com padrões por ferramenta (`Bash(...)`, `Read(...)`,
`Edit(...)`, `WebFetch(...)`). Tudo isso é configurável via arquivo de
settings, que o Claude Code também aceita via a flag `--settings <arquivo>`
— um arquivo de settings adicional carregado só para a sessão invocada,
com precedência sobre `~/.claude/settings.json` e `.claude/settings.json`
(mas não sobre settings geridos/managed).

`caetus/` não inventa nenhum sistema de permissões próprio para o Claude
Code, nem sobrepõe o mecanismo nativo dele. A única coisa que o Caetus OS
adiciona é a camada agnóstica de política (`config/*.yaml`) e a tradução
dela para o formato de settings acima — o mesmo formato que o usuário
poderia escrever à mão, ou ajustar via `/config`.

## Tradução `approval_mode` → `permissions.defaultMode`

| Perfil (`approval_mode`) | Claude Code (`permissions.defaultMode`) |
|---|---|
| `confirm` | `default` |
| `auto_edit` | `acceptEdits` |
| `full_auto` | `bypassPermissions` |

## Tradução das listas

| Perfil | Claude Code |
|---|---|
| `shell.allow[i]` | `permissions.allow += "Bash(<padrão>)"` |
| `shell.ask[i]` | `permissions.ask += "Bash(<padrão>)"` |
| `shell.deny[i]` | `permissions.deny += "Bash(<padrão>)"` |
| `filesystem.deny_write[i]` | `permissions.deny += "Edit(<padrão>)"` |
| `filesystem.deny_read[i]` | `permissions.deny += "Read(<padrão>)"` |
| `network.deny_domains[i]` | `permissions.deny += "WebFetch(domain:<domínio>)"` |

Implementado em `caetus/scripts/apply_profile.py` (`translate_claude_code`).
Os padrões (`git push*`, `.env*`, etc.) já usam a mesma sintaxe de wildcard
que o Claude Code entende, então a tradução é literal — nenhum padrão é
reinterpretado.

## Como o arquivo traduzido é aplicado

`apply_profile.py` escreve o JSON traduzido em
`caetus/.generated/claude-code/<perfil>.json` e os scripts
`scripts/claude-<perfil>.sh` / `.ps1` iniciam a sessão com:

```bash
claude --settings caetus/.generated/claude-code/<perfil>.json
```

Isso é uma aplicação **de sessão**, não permanente: não escreve em
`.claude/settings.json` nem em `.claude/settings.local.json`. Rodar
`claude` diretamente (sem os scripts de perfil) continua usando os
settings normais do projeto/usuário, sem nenhum perfil Caetus aplicado.

## Não fazer

- Não escrever direto em `.claude/settings.local.json` — esse arquivo é do
  usuário, acumula aprovações dadas em sessões anteriores, e não deve ser
  gerido por um script de perfil.
- Não duplicar a lista de padrões (`git push*`, etc.) em nenhum outro
  lugar — a fonte única é `caetus/config/<perfil>.yaml`.
- Não descrever este adapter como algo que "controla" o Claude Code — ele
  só traduz a política do Caetus OS para o formato de settings que o
  próprio Claude Code já sabe interpretar (`/config`, `permissions.*`).
