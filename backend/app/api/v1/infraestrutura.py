"""Endpoints de infraestrutura — monitoramento dos provedores de IA (Fase 2)."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import obter_db, usuario_atual
from app.dominio.modelos.ia_health import IAProviderHealth, IAProviderHealthHistory
from app.dominio.modelos.usuario import Usuario
from app.ia import roteador
from app.ia.health import repositorio, scheduler, service
from app.ia.health.catalogo_urls import urls_de
from app.ia.provedores.base import Provider

router = APIRouter(prefix="/infraestrutura/ia", tags=["infraestrutura"])


# ───────── Helpers de serialização ─────────
def _serializar_provider(p: Provider, estado: IAProviderHealth | None) -> dict[str, Any]:
    return {
        "nome": p.nome,
        "configuracao": p.configuracao(),
        "capabilities": p.capabilities().to_dict(),
        "urls": urls_de(p.nome),
        "estado": _serializar_estado(estado) if estado else None,
    }


def _serializar_estado(e: IAProviderHealth) -> dict[str, Any]:
    return {
        "provider": e.provider,
        "modelo": e.modelo,
        "status": e.status,
        "ultimo_check": e.ultimo_check.isoformat() if e.ultimo_check else None,
        "ultima_resposta": e.ultima_resposta,
        "codigo_http": e.codigo_http,
        "erro": e.erro,
        "acao_recomendada": e.acao_recomendada,
        "billing_ok": e.billing_ok,
        "api_key_ok": e.api_key_ok,
        "termos_ok": e.termos_ok,
        "modelo_disponivel": e.modelo_disponivel,
        "latencia_ms": e.latencia_ms,
        "ultima_alteracao_status": e.ultima_alteracao_status.isoformat() if e.ultima_alteracao_status else None,
    }


def _serializar_historico(h: IAProviderHealthHistory) -> dict[str, Any]:
    return {
        "id": str(h.id),
        "provider": h.provider,
        "modelo": h.modelo,
        "status_anterior": h.status_anterior,
        "status_novo": h.status_novo,
        "codigo_http": h.codigo_http,
        "erro": h.erro,
        "acao_recomendada": h.acao_recomendada,
        "latencia_ms": h.latencia_ms,
        "ocorrido_em": h.ocorrido_em.isoformat() if h.ocorrido_em else None,
    }


# ───────── GET / — dashboard agregado ─────────
@router.get("")
def overview(
    _: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
) -> dict[str, Any]:
    estados = {e.provider: e for e in repositorio.listar_estado_atual(sessao)}
    providers = [_serializar_provider(p, estados.get(p.nome)) for p in roteador.listar()]

    total = len(providers)
    ativos = sum(1 for p in providers if p["estado"] and p["estado"]["status"] == "OK")
    erros = sum(1 for p in providers if p["estado"] and p["estado"]["status"] not in ("OK",) and
                p["estado"]["status"] in {
                    "API_KEY_INVALIDA", "ACEITE_TERMOS", "BILLING", "MODELO_REMOVIDO",
                    "DNS_ERROR", "SSL_ERROR", "SEM_CONEXAO", "CONTA_SUSPENSA",
                    "AUTH_ERROR", "DESCONHECIDO",
                })
    warnings = sum(1 for p in providers if p["estado"] and p["estado"]["status"] in {
        "RATE_LIMIT", "TIMEOUT", "SERVICO_INDISPONIVEL", "QUOTA_EXCEDIDA", "MODELO_DEPRECIADO",
    })
    ultima = service.ultima_verificacao(sessao)
    proxima = scheduler.proxima_execucao()

    return {
        "providers": providers,
        "resumo": {
            "total": total,
            "ativos": ativos,
            "erro": erros,
            "warnings": warnings,
            "ultima_verificacao": ultima.isoformat() if ultima else None,
            "proxima_verificacao": proxima.isoformat() if proxima else None,
        },
    }


# ───────── GET /history ─────────
@router.get("/history")
def historico(
    provider: str | None = Query(default=None),
    status: str | None = Query(default=None),
    desde: datetime | None = Query(default=None),
    ate: datetime | None = Query(default=None),
    limite: int = Query(default=200, ge=1, le=2000),
    _: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
) -> list[dict[str, Any]]:
    items = repositorio.listar_historico(
        sessao, provider=provider, status=status, desde=desde, ate=ate, limite=limite,
    )
    return [_serializar_historico(h) for h in items]


# ───────── POST /check — executa imediatamente ─────────
@router.post("/check")
async def executar_agora(
    _: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
) -> list[dict[str, Any]]:
    return await service.executar_e_persistir(sessao)
