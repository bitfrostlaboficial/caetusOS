import uuid

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.dominio.modelos.asset import Asset


def carregar_assets(
    sessao: Session, empresa_id: uuid.UUID, projeto_id: uuid.UUID | None
) -> list[dict]:
    stmt = select(Asset).where(Asset.empresa_id == empresa_id)
    if projeto_id is not None:
        stmt = stmt.where(or_(Asset.projeto_id == projeto_id, Asset.projeto_id.is_(None)))
    return [
        {
            "id": str(a.id),
            "categoria": a.categoria,
            "origem": a.origem,
            "escopo": a.escopo,
            "caminho_storage": a.caminho_storage,
            "mime": a.mime,
        }
        for a in sessao.scalars(stmt).all()
    ]
