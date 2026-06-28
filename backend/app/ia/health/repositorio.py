"""Repositório de health-checks: estado atual + histórico imutável."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dominio.modelos.ia_health import IAProviderHealth, IAProviderHealthHistory
from app.ia.health.classificador import STATUS_OK, StatusClassificado

log = logging.getLogger(__name__)


def buscar_estado(sessao: Session, *, provider: str, modelo: str | None) -> IAProviderHealth | None:
    stmt = select(IAProviderHealth).where(
        IAProviderHealth.provider == provider,
        IAProviderHealth.modelo == modelo,
    )
    return sessao.execute(stmt).scalar_one_or_none()


def registrar_resultado(
    sessao: Session,
    *,
    provider: str,
    modelo: str | None,
    classificacao: StatusClassificado,
    latencia_ms: int | None,
    erro: str | None,
    detalhes: dict[str, Any] | None = None,
) -> tuple[IAProviderHealth, IAProviderHealthHistory | None]:
    """Persiste o último estado e, se houve mudança, grava histórico."""
    agora = datetime.now(timezone.utc)
    detalhes = detalhes or {}
    estado = buscar_estado(sessao, provider=provider, modelo=modelo)
    status_anterior = estado.status if estado else None
    mudou = status_anterior != classificacao.status

    if estado is None:
        estado = IAProviderHealth(
            provider=provider,
            modelo=modelo,
            status=classificacao.status,
            ultimo_check=agora,
            ultima_resposta=classificacao.descricao,
            codigo_http=classificacao.codigo_http,
            erro=erro,
            acao_recomendada=classificacao.acao_recomendada or None,
            billing_ok=classificacao.billing_ok,
            api_key_ok=classificacao.api_key_ok,
            termos_ok=classificacao.termos_ok,
            modelo_disponivel=classificacao.modelo_disponivel,
            latencia_ms=latencia_ms,
            ultima_alteracao_status=agora,
            detalhes_jsonb=detalhes,
        )
        sessao.add(estado)
    else:
        estado.status = classificacao.status
        estado.ultimo_check = agora
        estado.ultima_resposta = classificacao.descricao
        estado.codigo_http = classificacao.codigo_http
        estado.erro = erro
        estado.acao_recomendada = classificacao.acao_recomendada or None
        estado.billing_ok = classificacao.billing_ok
        estado.api_key_ok = classificacao.api_key_ok
        estado.termos_ok = classificacao.termos_ok
        estado.modelo_disponivel = classificacao.modelo_disponivel
        estado.latencia_ms = latencia_ms
        estado.detalhes_jsonb = detalhes
        if mudou:
            estado.ultima_alteracao_status = agora

    historico: IAProviderHealthHistory | None = None
    if mudou:
        historico = IAProviderHealthHistory(
            provider=provider,
            modelo=modelo,
            status_anterior=status_anterior,
            status_novo=classificacao.status,
            codigo_http=classificacao.codigo_http,
            erro=erro,
            acao_recomendada=classificacao.acao_recomendada or None,
            latencia_ms=latencia_ms,
            detalhes_jsonb=detalhes,
        )
        sessao.add(historico)
        log.info(
            "[IA HEALTH] Mudança de status — provider=%s status=%s→%s",
            provider, status_anterior, classificacao.status,
        )

    sessao.flush()
    return estado, historico


def listar_estado_atual(sessao: Session) -> list[IAProviderHealth]:
    stmt = select(IAProviderHealth).order_by(IAProviderHealth.provider)
    return list(sessao.execute(stmt).scalars().all())


def listar_historico(
    sessao: Session,
    *,
    provider: str | None = None,
    status: str | None = None,
    desde: datetime | None = None,
    ate: datetime | None = None,
    limite: int = 500,
) -> list[IAProviderHealthHistory]:
    stmt = select(IAProviderHealthHistory)
    if provider:
        stmt = stmt.where(IAProviderHealthHistory.provider == provider)
    if status:
        stmt = stmt.where(IAProviderHealthHistory.status_novo == status)
    if desde:
        stmt = stmt.where(IAProviderHealthHistory.ocorrido_em >= desde)
    if ate:
        stmt = stmt.where(IAProviderHealthHistory.ocorrido_em <= ate)
    stmt = stmt.order_by(IAProviderHealthHistory.ocorrido_em.desc()).limit(limite)
    return list(sessao.execute(stmt).scalars().all())
