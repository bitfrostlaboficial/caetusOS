"""Serviço de health-check — opera apenas via interface `Provider`."""
from __future__ import annotations

from app.ia import roteador
from app.ia.provedores.base import HealthStatus


def checar_um(nome: str) -> HealthStatus:
    return roteador.obter(nome).health_check()


def checar_todos() -> list[HealthStatus]:
    return [p.health_check() for p in roteador.listar()]
