import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.configuracao import config
from app.dominio.modelos.usuario import RefreshToken


def _hash(token_bruto: str) -> str:
    return hashlib.sha256(token_bruto.encode()).hexdigest()


def emitir(sessao: Session, usuario_id: uuid.UUID) -> str:
    token_bruto = secrets.token_urlsafe(48)
    rt = RefreshToken(
        usuario_id=usuario_id,
        hash=_hash(token_bruto),
        expira_em=datetime.now(UTC) + timedelta(days=config.jwt_refresh_ttl_days),
    )
    sessao.add(rt)
    sessao.flush()
    return token_bruto


def rotacionar(sessao: Session, token_bruto: str) -> tuple[uuid.UUID, str]:
    """Valida o refresh atual, revoga-o e emite um novo. Retorna (usuario_id, novo_token)."""
    rt = (
        sessao.query(RefreshToken)
        .filter(RefreshToken.hash == _hash(token_bruto), RefreshToken.revogado_em.is_(None))
        .one_or_none()
    )
    if not rt or rt.expira_em < datetime.now(UTC):
        raise ValueError("refresh_invalido")
    rt.revogado_em = datetime.now(UTC)
    novo = emitir(sessao, rt.usuario_id)
    return rt.usuario_id, novo


def revogar(sessao: Session, token_bruto: str) -> None:
    rt = sessao.query(RefreshToken).filter(RefreshToken.hash == _hash(token_bruto)).one_or_none()
    if rt and rt.revogado_em is None:
        rt.revogado_em = datetime.now(UTC)
