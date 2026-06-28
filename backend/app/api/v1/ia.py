"""Endpoints de gestão dos provedores de IA (Fase 1)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import usuario_atual
from app.dominio.modelos.usuario import Usuario
from app.ia import roteador
from app.ia.health import checar_todos, checar_um

router = APIRouter(prefix="/ia/providers", tags=["ia"])


def _serializar(p) -> dict:
    return {
        "nome": p.nome,
        "configuracao": p.configuracao(),
        "capabilities": p.capabilities().to_dict(),
        "modelos": p.listar_modelos(),
    }


@router.get("")
def listar(_: Usuario = Depends(usuario_atual)) -> list[dict]:
    return [_serializar(p) for p in roteador.listar()]


@router.get("/health")
def health(_: Usuario = Depends(usuario_atual)) -> list[dict]:
    return [s.to_dict() for s in checar_todos()]


@router.post("/health/check")
def health_check_manual(_: Usuario = Depends(usuario_atual)) -> list[dict]:
    return [s.to_dict() for s in checar_todos()]


@router.get("/{nome}")
def detalhar(nome: str, _: Usuario = Depends(usuario_atual)) -> dict:
    try:
        p = roteador.obter(nome)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return {**_serializar(p), "health": p.health_check().to_dict()}
