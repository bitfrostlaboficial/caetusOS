from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import obter_db, usuario_atual
from app.dominio.modelos.execucao import Execucao
from app.dominio.modelos.usuario import Usuario

router = APIRouter(prefix="/historico", tags=["historico"])


@router.get("")
def listar(
    limite: int = Query(20, ge=1, le=100),
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
):
    stmt = (
        select(Execucao)
        .where(Execucao.empresa_id == usuario.empresa_id)
        .order_by(Execucao.criado_em.desc())
        .limit(limite)
    )
    return [
        {
            "id": str(e.id),
            "alvo": e.alvo,
            "origem": e.origem,
            "status": e.status,
            "provedor": e.provedor,
            "tokens_in": e.tokens_in,
            "tokens_out": e.tokens_out,
            "latencia_ms": e.latencia_ms,
            "prompt_template": e.prompt_template,
            "prompt_version": e.prompt_version,
            "schema_version": e.schema_version,
            "entrada": e.entrada_jsonb,
            "saida": e.saida_jsonb,
            "erro": e.erro,
            "criado_em": e.criado_em.isoformat() if e.criado_em else None,
        }
        for e in sessao.scalars(stmt).all()
    ]
