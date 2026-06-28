from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import obter_db, usuario_atual
from app.dominio.modelos.usuario import Usuario
from app.servicos.asset_servico import AssetServico

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("")
def listar(usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_db)):
    return [
        {
            "id": str(a.id),
            "categoria": a.categoria,
            "origem": a.origem,
            "escopo": a.escopo,
            "mime": a.mime,
            "tamanho": a.tamanho,
            "caminho": a.caminho_storage,
        }
        for a in AssetServico(sessao).listar(usuario.empresa_id)
    ]


@router.post("")
async def upload(
    categoria: str = Form(...),
    arquivo: UploadFile = File(...),
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
):
    conteudo = await arquivo.read()
    with sessao.begin():
        a = AssetServico(sessao).upload(
            usuario.empresa_id,
            usuario.id,
            categoria=categoria,
            nome_arquivo=arquivo.filename or "arquivo",
            conteudo=conteudo,
            mime=arquivo.content_type,
        )
    return {"id": str(a.id), "categoria": a.categoria, "caminho": a.caminho_storage}
