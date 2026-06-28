"""Consultas (leitura) de telemetria — usadas pelos endpoints REST."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.dominio.modelos.ia_execucao import IAExecucao, IAExecucaoEvento


def listar_execucoes(
    sessao: Session,
    *,
    empresa_id: uuid.UUID | None = None,
    provider: str | None = None,
    modelo: str | None = None,
    habilidade: str | None = None,
    status: str | None = None,
    desde: datetime | None = None,
    ate: datetime | None = None,
    busca: str | None = None,
    limite: int = 100,
    offset: int = 0,
) -> list[IAExecucao]:
    stmt = select(IAExecucao)
    cond = []
    if empresa_id:
        cond.append(IAExecucao.empresa_id == empresa_id)
    if provider:
        cond.append(IAExecucao.provider == provider)
    if modelo:
        cond.append(IAExecucao.modelo == modelo)
    if habilidade:
        cond.append(IAExecucao.habilidade == habilidade)
    if status:
        cond.append(IAExecucao.status == status)
    if desde:
        cond.append(IAExecucao.created_at >= desde)
    if ate:
        cond.append(IAExecucao.created_at <= ate)
    if busca:
        like = f"%{busca}%"
        cond.append(
            (IAExecucao.erro.ilike(like))
            | (IAExecucao.habilidade.ilike(like))
            | (IAExecucao.provider.ilike(like))
        )
    if cond:
        stmt = stmt.where(and_(*cond))
    stmt = stmt.order_by(IAExecucao.created_at.desc()).limit(limite).offset(offset)
    return list(sessao.execute(stmt).scalars().all())


def buscar_execucao(sessao: Session, execucao_id: uuid.UUID) -> IAExecucao | None:
    return sessao.get(IAExecucao, execucao_id)


def listar_eventos(sessao: Session, execucao_id: uuid.UUID) -> list[IAExecucaoEvento]:
    stmt = (
        select(IAExecucaoEvento)
        .where(IAExecucaoEvento.execucao_id == execucao_id)
        .order_by(IAExecucaoEvento.ocorrido_em)
    )
    return list(sessao.execute(stmt).scalars().all())


# ───────── Métricas agregadas ─────────
def metricas_globais(sessao: Session) -> dict[str, Any]:
    agora = datetime.now(timezone.utc)
    inicio_dia = agora.replace(hour=0, minute=0, second=0, microsecond=0)

    total_hoje = sessao.execute(
        select(func.count(IAExecucao.id)).where(IAExecucao.created_at >= inicio_dia)
    ).scalar_one()
    sucessos_hoje = sessao.execute(
        select(func.count(IAExecucao.id)).where(
            IAExecucao.created_at >= inicio_dia, IAExecucao.status == "sucesso"
        )
    ).scalar_one()
    falhas_hoje = sessao.execute(
        select(func.count(IAExecucao.id)).where(
            IAExecucao.created_at >= inicio_dia, IAExecucao.status != "sucesso"
        )
    ).scalar_one()
    tempo_medio = sessao.execute(
        select(func.avg(IAExecucao.duracao_ms)).where(IAExecucao.created_at >= inicio_dia)
    ).scalar_one()
    custo_hoje = sessao.execute(
        select(func.coalesce(func.sum(IAExecucao.custo_estimado), 0.0)).where(
            IAExecucao.created_at >= inicio_dia
        )
    ).scalar_one()

    provider_top = sessao.execute(
        select(IAExecucao.provider, func.count(IAExecucao.id).label("c"))
        .where(IAExecucao.created_at >= inicio_dia)
        .group_by(IAExecucao.provider)
        .order_by(func.count(IAExecucao.id).desc())
        .limit(1)
    ).first()
    modelo_top = sessao.execute(
        select(IAExecucao.modelo, func.count(IAExecucao.id).label("c"))
        .where(IAExecucao.created_at >= inicio_dia, IAExecucao.modelo.isnot(None))
        .group_by(IAExecucao.modelo)
        .order_by(func.count(IAExecucao.id).desc())
        .limit(1)
    ).first()
    empresa_top = sessao.execute(
        select(IAExecucao.empresa_id, func.count(IAExecucao.id).label("c"))
        .where(IAExecucao.created_at >= inicio_dia, IAExecucao.empresa_id.isnot(None))
        .group_by(IAExecucao.empresa_id)
        .order_by(func.count(IAExecucao.id).desc())
        .limit(1)
    ).first()

    # Por hora — últimas 24h
    desde_24h = agora - timedelta(hours=24)
    por_hora_rows = sessao.execute(
        select(
            func.date_trunc("hour", IAExecucao.created_at).label("hora"),
            func.count(IAExecucao.id).label("chamadas"),
            func.coalesce(func.avg(IAExecucao.duracao_ms), 0).label("media_ms"),
            func.sum(
                func.cast(IAExecucao.status != "sucesso", func.Integer())
            ).label("erros"),
        )
        .where(IAExecucao.created_at >= desde_24h)
        .group_by("hora")
        .order_by("hora")
    ).all()
    por_hora = [
        {
            "hora": row.hora.isoformat() if row.hora else None,
            "chamadas": int(row.chamadas or 0),
            "media_ms": float(row.media_ms or 0),
            "erros": int(row.erros or 0),
        }
        for row in por_hora_rows
    ]

    return {
        "hoje": {
            "execucoes": int(total_hoje or 0),
            "sucessos": int(sucessos_hoje or 0),
            "falhas": int(falhas_hoje or 0),
            "tempo_medio_ms": float(tempo_medio or 0),
            "custo_estimado_usd": float(custo_hoje or 0),
            "provider_mais_utilizado": provider_top.provider if provider_top else None,
            "modelo_mais_utilizado": modelo_top.modelo if modelo_top else None,
            "empresa_mais_ativa": str(empresa_top.empresa_id) if empresa_top else None,
        },
        "ultimas_24h": por_hora,
    }


def ranking_provedores(sessao: Session) -> list[dict[str, Any]]:
    rows = sessao.execute(
        select(
            IAExecucao.provider,
            func.count(IAExecucao.id).label("execucoes"),
            func.coalesce(func.avg(IAExecucao.duracao_ms), 0).label("media_ms"),
            func.coalesce(func.sum(IAExecucao.total_tokens), 0).label("tokens"),
            func.coalesce(func.sum(IAExecucao.custo_estimado), 0).label("custo"),
            func.sum(
                func.cast(IAExecucao.status == "sucesso", func.Integer())
            ).label("sucessos"),
        ).group_by(IAExecucao.provider)
    ).all()
    out: list[dict[str, Any]] = []
    for r in rows:
        execucoes = int(r.execucoes or 0)
        sucessos = int(r.sucessos or 0)
        out.append({
            "provider": r.provider,
            "execucoes": execucoes,
            "tempo_medio_ms": float(r.media_ms or 0),
            "tokens_total": int(r.tokens or 0),
            "custo_total_usd": float(r.custo or 0),
            "sucessos": sucessos,
            "taxa_sucesso": (sucessos / execucoes) if execucoes else 0.0,
        })
    return out


def metricas_por_modelo(sessao: Session) -> list[dict[str, Any]]:
    rows = sessao.execute(
        select(
            IAExecucao.provider,
            IAExecucao.modelo,
            func.count(IAExecucao.id).label("execucoes"),
            func.coalesce(func.avg(IAExecucao.duracao_ms), 0).label("media_ms"),
            func.sum(func.cast(IAExecucao.status != "sucesso", func.Integer())).label("falhas"),
            func.coalesce(func.sum(IAExecucao.total_tokens), 0).label("tokens"),
            func.coalesce(func.sum(IAExecucao.custo_estimado), 0).label("custo"),
            func.max(IAExecucao.created_at).label("ultima"),
        )
        .where(IAExecucao.modelo.isnot(None))
        .group_by(IAExecucao.provider, IAExecucao.modelo)
        .order_by(func.count(IAExecucao.id).desc())
    ).all()
    return [
        {
            "provider": r.provider,
            "modelo": r.modelo,
            "execucoes": int(r.execucoes or 0),
            "tempo_medio_ms": float(r.media_ms or 0),
            "falhas": int(r.falhas or 0),
            "tokens_total": int(r.tokens or 0),
            "custo_total_usd": float(r.custo or 0),
            "ultima_utilizacao": r.ultima.isoformat() if r.ultima else None,
        }
        for r in rows
    ]
