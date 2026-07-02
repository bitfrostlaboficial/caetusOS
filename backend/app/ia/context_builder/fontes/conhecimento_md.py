import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dominio.modelos.documento_conhecimento import DocumentoConhecimento
from app.infraestrutura.armazenamento.filesystem import obter_storage


def carregar_conhecimento(sessao: Session, empresa_id: uuid.UUID) -> list[dict]:
    storage = obter_storage()
    docs = sessao.scalars(
        select(DocumentoConhecimento).where(DocumentoConhecimento.empresa_id == empresa_id)
    ).all()
    resultado: list[dict] = []
    for d in docs:
        if not d.is_indexable:
            continue
        try:
            texto = storage.ler(d.caminho_storage).decode("utf-8", errors="replace")
        except Exception:
            texto = ""
        resultado.append(
            {
                "id": str(d.id),
                "tipo": d.tipo,
                "versao": d.versao,
                "conteudo": texto,
            }
        )
    return resultado
