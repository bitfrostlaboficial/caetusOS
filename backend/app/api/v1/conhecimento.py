import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Response
from sqlalchemy.orm import Session

from app.api.deps import obter_db, usuario_atual
from app.dominio.modelos.documento_conhecimento import DocumentoConhecimento
from app.dominio.modelos.usuario import Usuario
from app.infraestrutura.armazenamento.filesystem import obter_storage
from app.servicos.conhecimento_servico import ConhecimentoServico

router = APIRouter(prefix="/conhecimento", tags=["conhecimento"])


def _serializar(d: DocumentoConhecimento) -> dict:
    nome = d.caminho_storage.split("/")[-1]
    # remove o prefixo de hash usado em ConhecimentoServico.adicionar
    if "-" in nome:
        nome = nome.split("-", 1)[1]
    tamanho = None
    try:
        storage = obter_storage()
        if storage.existe(d.caminho_storage):
            tamanho = len(storage.ler(d.caminho_storage))
    except Exception:
        tamanho = None
    return {
        "id": str(d.id),
        "tipo": d.tipo,
        "nome": nome,
        "versao": d.versao,
        "data_upload": d.data_upload.isoformat() if d.data_upload else None,
        "atualizado_em": d.atualizado_em.isoformat() if d.atualizado_em else None,
        "caminho": d.caminho_storage,
        "tamanho": tamanho,
    }


@router.get("")
def listar(usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_db)):
    return [_serializar(d) for d in ConhecimentoServico(sessao).listar(usuario.empresa_id)]


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
    return _serializar(doc)


@router.get("/{documento_id}/conteudo")
def conteudo(
    documento_id: uuid.UUID,
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
):
    doc = sessao.get(DocumentoConhecimento, documento_id)
    if not doc or doc.empresa_id != usuario.empresa_id:
        raise HTTPException(status_code=404, detail="documento não encontrado")
    try:
        bruto = obter_storage().ler(doc.caminho_storage)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="arquivo ausente no storage")
    try:
        texto = bruto.decode("utf-8")
    except UnicodeDecodeError:
        texto = bruto.decode("utf-8", errors="replace")
    return {"id": str(doc.id), "conteudo": texto, "tamanho": len(bruto)}


@router.get("/{documento_id}/raw")
def obter_raw(
    documento_id: uuid.UUID,
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
):
    doc = sessao.get(DocumentoConhecimento, documento_id)
    if not doc or doc.empresa_id != usuario.empresa_id:
        raise HTTPException(status_code=404, detail="documento não encontrado")
    try:
        bruto = obter_storage().ler(doc.caminho_storage)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="arquivo ausente no storage")
    
    # Determinar content type com base na extensao do arquivo
    nome_arquivo = doc.caminho_storage.split("/")[-1]
    extensao = nome_arquivo.split(".")[-1].lower() if "." in nome_arquivo else ""
    
    mime_types = {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "gif": "image/gif",
        "webp": "image/webp",
        "svg": "image/svg+xml",
        "pdf": "application/pdf",
        "csv": "text/csv",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "json": "application/json",
        "txt": "text/plain",
        "md": "text/markdown",
    }
    
    media_type = mime_types.get(extensao, "application/octet-stream")
    
    return Response(content=bruto, media_type=media_type)


@router.delete("/{documento_id}", status_code=204)
def remover(
    documento_id: uuid.UUID,
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
):
    ConhecimentoServico(sessao).remover(usuario.empresa_id, documento_id)
    return None
