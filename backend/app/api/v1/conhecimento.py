from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import obter_db, usuario_atual
from app.dominio.modelos.usuario import Usuario
from app.servicos.conhecimento_servico import ConhecimentoServico

router = APIRouter(prefix="/conhecimento", tags=["conhecimento"])


@router.get("")
def listar(usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_db)):
    return [
        {
            "id": str(d.id),
            "tipo": d.tipo,
            "versao": d.versao,
            "data_upload": d.data_upload.isoformat() if d.data_upload else None,
            "caminho": d.caminho_storage,
        }
        for d in ConhecimentoServico(sessao).listar(usuario.empresa_id)
    ]


@router.post("")
async def upload(
    tipo: str = Form(...),
    arquivo: UploadFile = File(...),
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
):
    conteudo = await arquivo.read()
    doc = ConhecimentoServico(sessao).adicionar(
        usuario.empresa_id,
        tipo=tipo,
        nome_arquivo=arquivo.filename or "documento.md",
        conteudo=conteudo,
    )
    return {"id": str(doc.id), "tipo": doc.tipo, "versao": doc.versao}
