"""Camada de observabilidade de IA (Fase 4).

Totalmente desacoplada — habilidades, provedores e dashboard não conhecem
esta camada. O acoplamento se dá apenas em `app/ia/roteador.executar`, que
delega para `gravador.registrar_execucao()`.
"""
from app.ia.telemetria.gravador import (  # noqa: F401
    GravadorTelemetria,
    gravador,
    iniciar_execucao,
    finalizar_execucao,
    registrar_evento,
)
