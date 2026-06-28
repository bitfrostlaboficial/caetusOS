from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dominio.modelos.projeto import Projeto


class ProjetoServico:
    def __init__(self, sessao: Session) -> None:
        self.sessao = sessao

    def listar(self, empresa_id: uuid.UUID) -> list[Projeto]:
        return list(
            self.sessao.scalars(select(Projeto).where(Projeto.empresa_id == empresa_id).order_by(Projeto.eh_raiz.desc(), Projeto.criado_em))
        )
