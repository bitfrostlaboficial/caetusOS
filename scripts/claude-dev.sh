#!/usr/bin/env bash
# Inicia o Claude Code com o perfil "Developer" (caetus/config/developer.yaml).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SETTINGS_FILE="$(python "$ROOT/caetus/scripts/apply_profile.py" developer)"

exec claude --settings "$SETTINGS_FILE" "$@"
