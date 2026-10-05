import mimetypes
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import obter_db, usuario_atual
from app.configuracao import config
from app.dominio.modelos.asset import Asset
from app.dominio.modelos.usuario import Usuario
from app.servicos.asset_servico import AssetServico

router = APIRouter(prefix="/assets", tags=["assets"])


def _nome(a: Asset) -> str:
    base = a.caminho_storage.rsplit("/", 1)[-1]
    # uploads gravam "<uuid hex>-<nome original>"
    if a.origem == "UPLOAD" and "-" in base:
        return base.split("-", 1)[1]
    return base


def _serializar(a: Asset) -> dict:
    return {
        "id": str(a.id),
        "nome": _nome(a),
        "categoria": a.categoria,
        "origem": a.origem,
        "escopo": a.escopo,
        "projeto_id": str(a.projeto_id) if a.projeto_id else None,
        "mime": a.mime,
        "tamanho": a.tamanho,
        "caminho": a.caminho_storage,
        "metadados": a.metadados_jsonb or {},
        "criado_em": a.criado_em.isoformat() if a.criado_em else None,
    }


@router.get("")
def listar(
    origem: str | None = Query(default=None, description="UPLOAD | GERADO | IMPORTADO"),
    categoria: str | None = None,
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
):
    itens = AssetServico(sessao).listar(usuario.empresa_id, origem=origem, categoria=categoria)
    return [_serializar(a) for a in itens]


@router.post("")
async def upload(
    categoria: str = Form(...),
    arquivo: UploadFile = File(...),
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
):
    conteudo = await arquivo.read(config.upload_max_bytes + 1)
    if len(conteudo) > config.upload_max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"arquivo acima do limite de {config.upload_max_bytes // (1024 * 1024) or 1} MB",
        )
    a = AssetServico(sessao).upload(
        usuario.empresa_id,
        usuario.id,
        categoria=categoria,
        nome_arquivo=arquivo.filename or "arquivo",
        conteudo=conteudo,
        mime=arquivo.content_type,
    )
    return {"id": str(a.id), "categoria": a.categoria, "caminho": a.caminho_storage}


@router.get("/{asset_id}/arquivo")
def baixar(
    asset_id: uuid.UUID,
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
):
    """Conteúdo do arquivo. Exige token (o frontend busca como blob), por isso `private`."""
    servico = AssetServico(sessao)
    asset = servico.obter(usuario.empresa_id, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="asset não encontrado")
    try:
        bruto = servico.storage.ler(asset.caminho_storage)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="arquivo ausente no storage")
    tipo = asset.mime or mimetypes.guess_type(_nome(asset))[0] or "application/octet-stream"
    return Response(
        content=bruto,
        media_type=tipo,
        headers={
            "Cache-Control": "private, max-age=300",
            "Content-Disposition": f'inline; filename="{_nome(asset)}"',
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'; sandbox",
        },
    )


@router.delete("/{asset_id}", status_code=204)
def remover(
    asset_id: uuid.UUID,
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
):
    if not AssetServico(sessao).remover(usuario.empresa_id, asset_id):
        raise HTTPException(status_code=404, detail="asset não encontrado")
    return Response(status_code=204)
