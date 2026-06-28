"""Módulo de monitoramento dos provedores de IA.

Fase 1: execução on-demand via `checar_um` / `checar_todos`.
Fase 2: execução paralela + persistência + histórico + scheduler diário.
"""
from app.ia.health.service import (
    checar_todos,
    checar_um,
    executar_e_persistir,
    ultima_verificacao,
)

__all__ = ["checar_todos", "checar_um", "executar_e_persistir", "ultima_verificacao"]
