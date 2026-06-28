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


# ═════════ Fase 4 — Observabilidade / Execuções ═════════
import asyncio
import time
import uuid as _uuid

from fastapi import HTTPException
from pydantic import BaseModel, Field

from app.dominio.modelos.ia_execucao import IAExecucao, IAExecucaoEvento
from app.ia.telemetria import repositorio as repo_exec
from app.ia.telemetria.custos import preco_de


def _serializar_execucao(e: IAExecucao) -> dict[str, Any]:
    return {
        "id": str(e.id),
        "empresa_id": str(e.empresa_id) if e.empresa_id else None,
        "usuario_id": str(e.usuario_id) if e.usuario_id else None,
        "provider": e.provider,
        "modelo": e.modelo,
        "habilidade": e.habilidade,
        "pipeline": e.pipeline,
        "prompt_hash": e.prompt_hash,
        "prompt": e.prompt,
        "inicio_execucao": e.inicio_execucao.isoformat() if e.inicio_execucao else None,
        "fim_execucao": e.fim_execucao.isoformat() if e.fim_execucao else None,
        "duracao_ms": e.duracao_ms,
        "status": e.status,
        "erro": e.erro,
        "input_tokens": e.input_tokens,
        "output_tokens": e.output_tokens,
        "total_tokens": e.total_tokens,
        "custo_estimado": e.custo_estimado,
        "request_id": e.request_id,
        "metadata": e.metadata_json or {},
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }


def _serializar_evento(ev: IAExecucaoEvento) -> dict[str, Any]:
    return {
        "id": str(ev.id),
        "tipo": ev.tipo,
        "mensagem": ev.mensagem,
        "payload": ev.payload_json or {},
        "ocorrido_em": ev.ocorrido_em.isoformat() if ev.ocorrido_em else None,
    }


@router.get("/executions")
def listar_execucoes(
    provider: str | None = None,
    modelo: str | None = None,
    habilidade: str | None = None,
    status: str | None = None,
    desde: datetime | None = None,
    ate: datetime | None = None,
    busca: str | None = None,
    limite: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    _: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
) -> list[dict[str, Any]]:
    itens = repo_exec.listar_execucoes(
        sessao,
        provider=provider,
        modelo=modelo,
        habilidade=habilidade,
        status=status,
        desde=desde,
        ate=ate,
        busca=busca,
        limite=limite,
        offset=offset,
    )
    return [_serializar_execucao(e) for e in itens]


@router.get("/executions/{execucao_id}")
def detalhar_execucao(
    execucao_id: _uuid.UUID,
    _: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
) -> dict[str, Any]:
    exec_ = repo_exec.buscar_execucao(sessao, execucao_id)
    if exec_ is None:
        raise HTTPException(status_code=404, detail="execução não encontrada")
    eventos = repo_exec.listar_eventos(sessao, execucao_id)
    return {
        **_serializar_execucao(exec_),
        "eventos": [_serializar_evento(ev) for ev in eventos],
    }


@router.get("/metrics")
def metricas(
    _: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
) -> dict[str, Any]:
    return repo_exec.metricas_globais(sessao)


@router.get("/providers/ranking")
def ranking(
    _: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
) -> dict[str, Any]:
    rank = repo_exec.ranking_provedores(sessao)

    def _safe_min(items, key):
        v = [i for i in items if i["execucoes"] > 0]
        return min(v, key=key)["provider"] if v else None

    def _safe_max(items, key):
        v = [i for i in items if i["execucoes"] > 0]
        return max(v, key=key)["provider"] if v else None

    destaques = {
        "mais_utilizado": _safe_max(rank, lambda r: r["execucoes"]),
        "mais_rapido": _safe_min(rank, lambda r: r["tempo_medio_ms"] or 1e12),
        "mais_barato": _safe_min(rank, lambda r: r["custo_total_usd"] or 1e12),
        "maior_sucesso": _safe_max(rank, lambda r: r["taxa_sucesso"]),
    }
    return {"providers": rank, "destaques": destaques}


@router.get("/models")
def listar_modelos_stats(
    _: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
) -> list[dict[str, Any]]:
    return repo_exec.metricas_por_modelo(sessao)


# ───────── POST /benchmark ─────────
class BenchmarkRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=8000)
    providers: list[str] = Field(..., min_length=1, max_length=10)
    max_tokens: int = Field(default=512, ge=16, le=4096)


@router.post("/benchmark")
async def benchmark(
    req: BenchmarkRequest,
    usuario: Usuario = Depends(usuario_atual),
) -> dict[str, Any]:
    """Executa o mesmo prompt em N provedores em paralelo. Cada execução
    passa pelo roteador, então a telemetria é gravada normalmente.
    """

    def _rodar(nome: str) -> dict[str, Any]:
        inicio = time.perf_counter()
        try:
            prov = roteador.obter(nome)
        except KeyError:
            return {
                "provider": nome, "modelo": None, "sucesso": False,
                "tempo_ms": 0, "tokens_in": None, "tokens_out": None,
                "total_tokens": None, "custo_estimado": 0.0,
                "resposta": None, "erro": "provedor não registrado",
            }
        modelo = prov.configuracao().get("modelo")
        try:
            resp = roteador.executar(
                provider=nome,
                prompt=req.prompt,
                max_tokens=req.max_tokens,
                habilidade="benchmark",
                pipeline="benchmark",
                empresa_id=usuario.empresa_id,
                usuario_id=usuario.id,
                metadata={"origem": "benchmark"},
            )
            tempo_ms = int((time.perf_counter() - inicio) * 1000)
            total = (resp.tokens_in or 0) + (resp.tokens_out or 0)
            from app.ia.telemetria.custos import estimar as _est
            custo = _est(nome, resp.modelo or modelo,
                         tokens_in=resp.tokens_in, tokens_out=resp.tokens_out)
            return {
                "provider": nome,
                "modelo": resp.modelo or modelo,
                "sucesso": True,
                "tempo_ms": tempo_ms,
                "tokens_in": resp.tokens_in or None,
                "tokens_out": resp.tokens_out or None,
                "total_tokens": total or None,
                "custo_estimado": custo,
                "resposta": (resp.texto or "")[:4000],
                "erro": None,
            }
        except Exception as exc:  # noqa: BLE001
            tempo_ms = int((time.perf_counter() - inicio) * 1000)
            return {
                "provider": nome, "modelo": modelo, "sucesso": False,
                "tempo_ms": tempo_ms, "tokens_in": None, "tokens_out": None,
                "total_tokens": None, "custo_estimado": 0.0,
                "resposta": None, "erro": str(exc)[:500],
            }

    # Paraleliza via thread pool (provedores são sync e fazem I/O HTTP).
    resultados = await asyncio.gather(
        *[asyncio.to_thread(_rodar, p) for p in req.providers]
    )

    sucessos = [r for r in resultados if r["sucesso"]]
    ranking_bm = {
        "mais_rapido": min(sucessos, key=lambda r: r["tempo_ms"])["provider"] if sucessos else None,
        "mais_barato": min(sucessos, key=lambda r: r["custo_estimado"])["provider"] if sucessos else None,
        "menos_tokens": min(
            (r for r in sucessos if r["total_tokens"]),
            key=lambda r: r["total_tokens"],
            default={"provider": None},
        )["provider"],
    }
    return {"resultados": list(resultados), "ranking": ranking_bm}


@router.get("/pricing")
def listar_precos(_: Usuario = Depends(usuario_atual)) -> list[dict[str, Any]]:
    """Catálogo público de preços por modelo (USD por milhão de tokens)."""
    out: list[dict[str, Any]] = []
    for p in roteador.listar():
        modelo = p.configuracao().get("modelo")
        preco = preco_de(p.nome, modelo)
        out.append({
            "provider": p.nome,
            "modelo": modelo,
            "entrada_usd_milhao": preco.entrada_usd_milhao if preco else 0.0,
            "saida_usd_milhao": preco.saida_usd_milhao if preco else 0.0,
            "tabelado": preco is not None,
        })
    return out

