import uuid

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.dominio.modelos.memoria_item import MemoriaItem


def carregar_memoria(
    sessao: Session, empresa_id: uuid.UUID, projeto_id: uuid.UUID | None
) -> list[dict]:
    stmt = select(MemoriaItem).where(MemoriaItem.empresa_id == empresa_id)
    if projeto_id is not None:
        stmt = stmt.where(or_(MemoriaItem.projeto_id == projeto_id, MemoriaItem.projeto_id.is_(None)))
    stmt = stmt.order_by(MemoriaItem.peso.desc(), MemoriaItem.criado_em.desc()).limit(100)
    return [
        {"id": str(m.id), "tipo": m.tipo, "conteudo": m.conteudo, "peso": m.peso}
        for m in sessao.scalars(stmt).all()
    ]
