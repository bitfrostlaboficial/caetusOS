# Inicia o Claude Code com o perfil "Developer" (caetus/config/developer.yaml).
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$SettingsFile = python "$Root/caetus/scripts/apply_profile.py" developer

claude --settings $SettingsFile @args
exit $LASTEXITCODE
