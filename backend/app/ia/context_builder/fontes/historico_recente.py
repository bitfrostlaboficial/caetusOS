import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dominio.modelos.execucao import Execucao
from app.ia.context_builder.politicas import HISTORICO_MAX_EXECUCOES, aplicar_limite_historico


def carregar_historico(
    sessao: Session, empresa_id: uuid.UUID, projeto_id: uuid.UUID | None
) -> list[dict]:
    """Política §7: últimas 5 execuções, máximo 10k tokens, nunca o histórico completo."""
    stmt = (
        select(Execucao)
        .where(Execucao.empresa_id == empresa_id)
        .order_by(Execucao.criado_em.desc())
        .limit(HISTORICO_MAX_EXECUCOES)
    )
    if projeto_id is not None:
        stmt = stmt.where(Execucao.projeto_id == projeto_id)
    itens = [
        {
            "id": str(e.id),
            "alvo": e.alvo,
            "entrada": e.entrada_jsonb,
            "saida": e.saida_jsonb,
            "criado_em": e.criado_em.isoformat() if e.criado_em else None,
        }
        for e in sessao.scalars(stmt).all()
    ]
    return aplicar_limite_historico(itens)
