from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import obter_db, usuario_atual
from app.dominio.modelos.usuario import Usuario
from app.servicos.empresa_servico import EmpresaServico

router = APIRouter(prefix="/empresas", tags=["empresas"])


@router.get("/me")
def minha_empresa(
    usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_db)
):
    empresa = EmpresaServico(sessao).projeto_raiz(usuario.empresa_id).empresa
    return {
        "id": str(empresa.id),
        "nome": empresa.nome,
        "slug": empresa.slug,
    }
