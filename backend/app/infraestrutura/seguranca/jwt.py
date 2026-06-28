import uuid
from datetime import UTC, datetime, timedelta

import jwt

from app.configuracao import config


def emitir_access_token(usuario_id: uuid.UUID, empresa_id: uuid.UUID) -> str:
    agora = datetime.now(UTC)
    payload = {
        "sub": str(usuario_id),
        "empresa_id": str(empresa_id),
        "iat": int(agora.timestamp()),
        "exp": int((agora + timedelta(minutes=config.jwt_access_ttl_min)).timestamp()),
        "typ": "access",
    }
    return jwt.encode(payload, config.jwt_secret, algorithm="HS256")


def decodificar(token: str) -> dict:
    return jwt.decode(token, config.jwt_secret, algorithms=["HS256"])
