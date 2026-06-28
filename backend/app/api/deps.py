from __future__ import annotations

import uuid

import jwt as pyjwt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.dominio.modelos.usuario import Usuario
from app.infraestrutura.banco.sessao import obter_sessao
from app.infraestrutura.seguranca import jwt as jwt_helper


def obter_db() -> Session:
    yield from obter_sessao()


def usuario_atual(
    authorization: str | None = Header(default=None),
    sessao: Session = Depends(obter_db),
) -> Usuario:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token ausente")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt_helper.decodificar(token)
    except pyjwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"token inválido: {exc}")
    usuario_id = uuid.UUID(payload["sub"])
    usuario = sessao.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="usuário não encontrado")
    return usuario
