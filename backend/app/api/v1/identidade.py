from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import obter_db, usuario_atual
from app.dominio.modelos.usuario import Usuario
from app.servicos.identidade_servico import IdentidadeServico

router = APIRouter(prefix="/identidade", tags=["identidade"])


class IdentidadeEntrada(BaseModel):
    cores: dict | None = None
    fontes: dict | None = None
    tom_de_voz: str | None = None


@router.get("")
def obter(usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_db)):
    ident = IdentidadeServico(sessao).obter(usuario.empresa_id)
    if not ident:
        return {"cores": {}, "fontes": {}, "tom_de_voz": None, "logo_caminho": None, "manual_caminho": None}
    return {
        "cores": ident.cores_jsonb,
        "fontes": ident.fontes_jsonb,
        "tom_de_voz": ident.tom_de_voz,
        "logo_caminho": ident.logo_caminho,
        "manual_caminho": ident.manual_caminho,
    }


@router.put("")
def salvar(
    dados: IdentidadeEntrada,
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
):
    with sessao.begin():
        IdentidadeServico(sessao).salvar(
            usuario.empresa_id,
            cores=dados.cores,
            fontes=dados.fontes,
            tom_de_voz=dados.tom_de_voz,
        )
    return {"ok": True}
