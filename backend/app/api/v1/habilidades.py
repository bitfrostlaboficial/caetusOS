"""Catálogo de habilidades (manifesto) — usado pela UI e pelo servidor MCP."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import usuario_atual
from app.dominio.modelos.usuario import Usuario
from app.habilidades import registro

router = APIRouter(prefix="/habilidades", tags=["habilidades"])


@router.get("")
def listar_habilidades(_: Usuario = Depends(usuario_atual)) -> list[dict]:
    return registro.manifestos()
