"""ContextVars do request — propagados via asyncio/threads sem acoplamento.

Os logs e a telemetria leem daqui em vez de receber tudo por parâmetro.
"""
from __future__ import annotations

import uuid
from contextvars import ContextVar
from typing import Any

_request_id: ContextVar[str | None] = ContextVar("request_id", default=None)
_empresa_id: ContextVar[str | None] = ContextVar("empresa_id", default=None)
_usuario_id: ContextVar[str | None] = ContextVar("usuario_id", default=None)
_missao: ContextVar[str | None] = ContextVar("missao", default=None)


def get_request_id() -> str | None:
    return _request_id.get()


def set_request_id(valor: str | None) -> None:
    _request_id.set(valor)


def novo_request_id() -> str:
    rid = uuid.uuid4().hex
    _request_id.set(rid)
    return rid


def set_contexto(
    *,
    empresa_id: Any = None,
    usuario_id: Any = None,
    missao: str | None = None,
) -> None:
    if empresa_id is not None:
        _empresa_id.set(str(empresa_id))
    if usuario_id is not None:
        _usuario_id.set(str(usuario_id))
    if missao is not None:
        _missao.set(missao)


def contexto_atual() -> dict[str, str | None]:
    return {
        "request_id": _request_id.get(),
        "empresa_id": _empresa_id.get(),
        "usuario_id": _usuario_id.get(),
        "missao": _missao.get(),
    }
