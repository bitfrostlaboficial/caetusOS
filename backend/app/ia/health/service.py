"""Serviço de health-check (Fase 2).

Mantém compatibilidade com a Fase 1 (`checar_um`, `checar_todos` síncronos) e
adiciona execução paralela com timeout individual + persistência + histórico.

Toda lógica é polimórfica: o serviço só conversa com `Provider.health_check()`.
"""
from __future__ import annotations

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.ia import roteador
from app.ia.health import repositorio
from app.ia.health.classificador import (
    STATUS_OK,
    classificar,
    classificar_ok,
)
from app.ia.provedores.base import HealthStatus, Provider

log = logging.getLogger(__name__)

TIMEOUT_INDIVIDUAL_S = 15.0


# ───────── API SÍNCRONA (compat. Fase 1) ─────────
def checar_um(nome: str) -> HealthStatus:
    return roteador.obter(nome).health_check()


def checar_todos() -> list[HealthStatus]:
    return [p.health_check() for p in roteador.listar()]


# ───────── Execução paralela com timeout individual ─────────
async def _health_com_timeout(provider: Provider, loop: asyncio.AbstractEventLoop, pool: ThreadPoolExecutor) -> HealthStatus:
    try:
        return await asyncio.wait_for(
            loop.run_in_executor(pool, provider.health_check),
            timeout=TIMEOUT_INDIVIDUAL_S,
        )
    except asyncio.TimeoutError:
        return HealthStatus(
            provider=provider.nome, status="error",
            message=f"Timeout após {TIMEOUT_INDIVIDUAL_S:.0f}s.",
            requer_acao=False, acao="Verificar status page do provedor.",
        )
    except Exception as exc:  # noqa: BLE001
        return HealthStatus(
            provider=provider.nome, status="error",
            message=f"Falha inesperada: {str(exc)[:200]}",
            requer_acao=True,
        )


async def executar_e_persistir(sessao: Session) -> list[dict]:
    """Roda health em paralelo, persiste estado, gera histórico em mudanças."""
    provedores = roteador.listar()
    if not provedores:
        return []

    loop = asyncio.get_running_loop()
    resultados: list[HealthStatus]
    with ThreadPoolExecutor(max_workers=max(1, len(provedores))) as pool:
        resultados = await asyncio.gather(
            *(_health_com_timeout(p, loop, pool) for p in provedores)
        )

    serializados: list[dict] = []
    for hs in resultados:
        if hs.status == "ok":
            classif = classificar_ok(hs.latencia_ms)
            erro = None
        else:
            classif = classificar(hs.message, provider=hs.provider)
            erro = hs.message

        try:
            estado, _ = repositorio.registrar_resultado(
                sessao,
                provider=hs.provider,
                modelo=hs.modelo,
                classificacao=classif,
                latencia_ms=hs.latencia_ms,
                erro=erro,
                detalhes=hs.detalhes or {},
            )
            sessao.commit()
        except Exception:  # noqa: BLE001
            sessao.rollback()
            log.exception("Falha ao persistir health do provider=%s", hs.provider)
            estado = None

        log.info(
            "[IA HEALTH] provider=%s modelo=%s status=%s latencia=%sms acao=%s",
            hs.provider, hs.modelo, classif.status, hs.latencia_ms, classif.acao_recomendada or "-",
        )

        serializados.append({
            **hs.to_dict(),
            "status_canonico": classif.status,
            "severidade": classif.severidade,
            "codigo_http": classif.codigo_http,
            "acao_recomendada": classif.acao_recomendada,
            "billing_ok": classif.billing_ok,
            "api_key_ok": classif.api_key_ok,
            "termos_ok": classif.termos_ok,
            "modelo_disponivel": classif.modelo_disponivel,
        })

    return serializados


def ultima_verificacao(sessao: Session) -> datetime | None:
    estados = repositorio.listar_estado_atual(sessao)
    if not estados:
        return None
    return max(e.ultimo_check for e in estados)
