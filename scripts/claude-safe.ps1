# Inicia o Claude Code com o perfil "Safe" (caetus/config/safe.yaml).
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$SettingsFile = python "$Root/caetus/scripts/apply_profile.py" safe

claude --settings $SettingsFile @args
exit $LASTEXITCODE
