import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import obter_db, usuario_atual
from app.dominio.modelos.usuario import Usuario
from app.servicos.memoria_servico import MemoriaServico

router = APIRouter(prefix="/memoria", tags=["memoria"])


class MemoriaEntrada(BaseModel):
    tipo: str
    conteudo: str
    peso: float = 1.0


@router.get("")
def listar(usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_db)):
    return [
        {"id": str(m.id), "tipo": m.tipo, "conteudo": m.conteudo, "peso": m.peso}
        for m in MemoriaServico(sessao).listar(usuario.empresa_id)
    ]


@router.post("")
def criar(
    dados: MemoriaEntrada,
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
):
    m = MemoriaServico(sessao).criar(
        usuario.empresa_id, tipo=dados.tipo, conteudo=dados.conteudo, peso=dados.peso
    )
    return {"id": str(m.id)}


@router.delete("/{item_id}")
def remover(
    item_id: uuid.UUID,
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
):
    MemoriaServico(sessao).remover(usuario.empresa_id, item_id)
    return {"ok": True}
