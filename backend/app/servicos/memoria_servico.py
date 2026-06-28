from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dominio.modelos.memoria_item import MemoriaItem


class MemoriaServico:
    def __init__(self, sessao: Session) -> None:
        self.sessao = sessao

    def listar(self, empresa_id: uuid.UUID, projeto_id: uuid.UUID | None = None) -> list[MemoriaItem]:
        stmt = select(MemoriaItem).where(MemoriaItem.empresa_id == empresa_id)
        if projeto_id is not None:
            stmt = stmt.where(MemoriaItem.projeto_id == projeto_id)
        stmt = stmt.order_by(MemoriaItem.peso.desc(), MemoriaItem.criado_em.desc())
        return list(self.sessao.scalars(stmt))

    def criar(
        self,
        empresa_id: uuid.UUID,
        *,
        tipo: str,
        conteudo: str,
        peso: float = 1.0,
        origem: str = "manual",
        projeto_id: uuid.UUID | None = None,
    ) -> MemoriaItem:
        item = MemoriaItem(
            empresa_id=empresa_id,
            projeto_id=projeto_id,
            tipo=tipo,
            conteudo=conteudo,
            peso=peso,
            origem=origem,
        )
        self.sessao.add(item)
        self.sessao.flush()
        return item

    def remover(self, empresa_id: uuid.UUID, item_id: uuid.UUID) -> None:
        item = self.sessao.get(MemoriaItem, item_id)
        if item and item.empresa_id == empresa_id:
            self.sessao.delete(item)
