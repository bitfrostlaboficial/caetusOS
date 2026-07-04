#!/usr/bin/env python3
"""Traduz um perfil Caetus (caetus/config/<perfil>.yaml) para o formato de
configuracao do agente de IA escolhido.

O perfil e agnostico de agente. Este script contem o unico ponto de
traducao para cada agente suportado (hoje: claude-code). O resultado e
escrito em caetus/.generated/<agente>/<perfil>.json e o caminho e impresso
em stdout, para ser capturado pelos scripts de troca de perfil
(scripts/claude-safe.sh, scripts/claude-dev.sh, etc.).

Nunca escreve em .claude/settings.local.json: aquele arquivo acumula
aprovacoes especificas do usuario ao longo de sessoes e nao deve ser
sobrescrito. A aplicacao do perfil usa a flag oficial `claude --settings
<arquivo>`, que vale so para a sessao invocada.
"""

import argparse
import json
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent.parent
CONFIG_DIR = ROOT / "caetus" / "config"
GENERATED_DIR = ROOT / "caetus" / ".generated"

APPROVAL_MODE_TO_CLAUDE = {
    "confirm": "default",
    "auto_edit": "acceptEdits",
    "full_auto": "bypassPermissions",
}


def load_profile(name: str) -> dict:
    path = CONFIG_DIR / f"{name}.yaml"
    if not path.exists():
        sys.exit(f"Perfil '{name}' nao encontrado em {path}")
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def translate_claude_code(profile: dict) -> dict:
    shell = profile.get("shell", {})
    filesystem = profile.get("filesystem", {})
    network = profile.get("network", {})

    allow = [f"Bash({p})" for p in shell.get("allow", [])]
    ask = [f"Bash({p})" for p in shell.get("ask", [])]
    deny = [f"Bash({p})" for p in shell.get("deny", [])]

    deny += [f"Edit({p})" for p in filesystem.get("deny_write", [])]
    deny += [f"Read({p})" for p in filesystem.get("deny_read", [])]
    deny += [f"WebFetch(domain:{d})" for d in network.get("deny_domains", [])]

    mode = APPROVAL_MODE_TO_CLAUDE.get(profile.get("approval_mode", "confirm"), "default")

    permissions = {"defaultMode": mode}
    if allow:
        permissions["allow"] = allow
    if ask:
        permissions["ask"] = ask
    if deny:
        permissions["deny"] = deny

    return {"permissions": permissions}


AGENT_TRANSLATORS = {
    "claude-code": translate_claude_code,
}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("profile", help="nome do perfil (ex.: safe, developer)")
    parser.add_argument("--agent", default="claude-code", choices=sorted(AGENT_TRANSLATORS))
    args = parser.parse_args()

    profile = load_profile(args.profile)
    translated = AGENT_TRANSLATORS[args.agent](profile)

    out_dir = GENERATED_DIR / args.agent
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{args.profile}.json"
    out_path.write_text(json.dumps(translated, indent=2, ensure_ascii=False), encoding="utf-8")

    profile_label = profile.get("name", args.profile)
    print(f"[caetus] perfil '{profile_label}' aplicado ({args.agent}) -> {out_path}", file=sys.stderr)
    print(str(out_path))


if __name__ == "__main__":
    main()
