"""Middlewares — RequestID + LoggingHTTP. Únicos middlewares HTTP da app.

- Garante `X-Request-ID` em toda resposta.
- Loga `[REQUEST]` com método/rota/status/duração.
- Captura exceções não tratadas, gera resposta 500 segura com `request_id`.
"""
from __future__ import annotations

import logging
import time
import traceback
import uuid

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.infraestrutura.observabilidade.contexto import (
    novo_request_id,
    set_request_id,
)
from app.infraestrutura.observabilidade.logger import log_evento

log = logging.getLogger("caetusos.http")


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        set_request_id(rid)
        request.state.request_id = rid
        try:
            response = await call_next(request)
        finally:
            pass
        response.headers["X-Request-ID"] = rid
        return response


class LoggingHTTPMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, debug: bool = False) -> None:
        super().__init__(app)
        self.debug = debug

    async def dispatch(self, request: Request, call_next):
        # Garante request_id mesmo se chamado antes do outro middleware.
        if not getattr(request.state, "request_id", None):
            request.state.request_id = novo_request_id()
        else:
            set_request_id(request.state.request_id)

        inicio = time.perf_counter()
        ip = request.client.host if request.client else "-"
        try:
            response = await call_next(request)
        except Exception as exc:  # noqa: BLE001
            duracao = int((time.perf_counter() - inicio) * 1000)
            tb = traceback.format_exc()
            log_evento(
                log, logging.ERROR, "ERRO",
                f"exceção não tratada em {request.method} {request.url.path}",
                tipo=type(exc).__name__,
                mensagem=str(exc)[:300],
                duracao_ms=duracao,
            )
            log.error("stacktrace:\n%s", tb)
            corpo = {
                "erro": {
                    "tipo": type(exc).__name__,
                    "mensagem": str(exc) if self.debug else "erro interno",
                },
                "request_id": request.state.request_id,
            }
            if self.debug:
                corpo["stacktrace"] = tb.splitlines()[-15:]
            resp = JSONResponse(status_code=500, content=corpo)
            resp.headers["X-Request-ID"] = request.state.request_id
            return resp

        duracao = int((time.perf_counter() - inicio) * 1000)
        nivel = logging.INFO if response.status_code < 400 else logging.WARNING
        if response.status_code >= 500:
            nivel = logging.ERROR
        log_evento(
            log, nivel, "REQUEST",
            f"{request.method} {request.url.path} {response.status_code}",
            duracao_ms=duracao, ip=ip,
        )
        return response
