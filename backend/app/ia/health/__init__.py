"""Módulo de health-check dos provedores de IA.

Fase 1: apenas execução on-demand (sem scheduler nem persistência).
Fase 2: APScheduler + tabela `ia_provider_health` + histórico.
"""
from app.ia.health.service import checar_todos, checar_um

__all__ = ["checar_todos", "checar_um"]
