from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import obter_db, usuario_atual
from app.dominio.modelos.usuario import Usuario
from app.servicos.projeto_servico import ProjetoServico

router = APIRouter(prefix="/projetos", tags=["projetos"])


@router.get("")
def listar(usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_db)):
    return [
        {"id": str(p.id), "nome": p.nome, "slug": p.slug, "eh_raiz": p.eh_raiz}
        for p in ProjetoServico(sessao).listar(usuario.empresa_id)
    ]
