#!/usr/bin/env bash
# Inicia o Claude Code com o perfil "Safe" (caetus/config/safe.yaml).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SETTINGS_FILE="$(python "$ROOT/caetus/scripts/apply_profile.py" safe)"

exec claude --settings "$SETTINGS_FILE" "$@"
