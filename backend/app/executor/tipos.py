from __future__ import annotations

from enum import StrEnum


class TipoComando(StrEnum):
    SKILL = "SKILL"
    # Reservado para o futuro — não implementado no MVP:
    # FLUXO = "FLUXO"
    # FUNCIONARIO = "FUNCIONARIO"
    # WEBHOOK = "WEBHOOK"
    # AUTOMACAO = "AUTOMACAO"


class Origem(StrEnum):
    WEB = "WEB"
    API = "API"
    CLI = "CLI"
    FLUXO = "FLUXO"
    FUNCIONARIO = "FUNCIONARIO"
    WEBHOOK = "WEBHOOK"
    AUTOMACAO = "AUTOMACAO"
