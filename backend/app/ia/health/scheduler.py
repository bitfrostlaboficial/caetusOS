"""Scheduler APScheduler — health-check diário dos provedores de IA.

Garante única instância global. Hora configurável via .env
(`IA_HEALTH_HOUR`, `IA_HEALTH_MINUTE`).
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.configuracao import config
from app.ia.health import service

log = logging.getLogger(__name__)

_SCHEDULER: AsyncIOScheduler | None = None
JOB_ID = "ia_health_diario"


async def _tick() -> None:
    from app.infraestrutura.banco.sessao import SessionLocal

    log.info("[IA HEALTH] Tick agendado iniciado.")
    sessao = SessionLocal()
    try:
        await service.executar_e_persistir(sessao)
    finally:
        sessao.close()
    log.info("[IA HEALTH] Tick agendado finalizado.")


def iniciar() -> AsyncIOScheduler:
    """Idempotente: nunca cria duas instâncias."""
    global _SCHEDULER
    if _SCHEDULER is not None and _SCHEDULER.running:
        return _SCHEDULER

    if _SCHEDULER is None:
        _SCHEDULER = AsyncIOScheduler(timezone=config.ia_health_timezone)
        _SCHEDULER.add_job(
            _tick,
            CronTrigger(hour=config.ia_health_hour, minute=config.ia_health_minute),
            id=JOB_ID,
            replace_existing=True,
            misfire_grace_time=300,
            coalesce=True,
            max_instances=1,
        )
    _SCHEDULER.start()
    log.info(
        "[IA HEALTH] Scheduler iniciado — diário às %02d:%02d (%s).",
        config.ia_health_hour, config.ia_health_minute, config.ia_health_timezone,
    )
    return _SCHEDULER


def parar() -> None:
    global _SCHEDULER
    if _SCHEDULER and _SCHEDULER.running:
        _SCHEDULER.shutdown(wait=False)
        log.info("[IA HEALTH] Scheduler encerrado.")


def proxima_execucao() -> datetime | None:
    if _SCHEDULER is None:
        return None
    job = _SCHEDULER.get_job(JOB_ID)
    return job.next_run_time if job else None
