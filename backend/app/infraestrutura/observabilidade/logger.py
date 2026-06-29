"""Logger estruturado, colorido em DEV e pronto para JSON em PROD.

Formato humano (DEV):
    14:22:01 INFO   🟢 [REQUEST] request_id=ab12 empresa=... rota=POST /v1/...
Formato JSON (PROD):  {"ts":"...","level":"INFO","tag":"REQUEST","msg":"...",...}

Tags padronizadas: REQUEST, COMANDO, ROTEADOR, IA, IA FALLBACK, EXECUTOR, ERRO.
"""
from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any

from app.infraestrutura.observabilidade.contexto import contexto_atual

# ───────── Sanitização ─────────
_CHAVES_SENSIVEIS = {
    "api_key", "apikey", "authorization", "x-api-key", "token",
    "refresh_token", "access_token", "jwt", "secret", "password",
    "cookie", "set-cookie",
}


def _sanitizar(valor: Any) -> Any:
    if isinstance(valor, dict):
        return {
            k: ("***" if k.lower() in _CHAVES_SENSIVEIS else _sanitizar(v))
            for k, v in valor.items()
        }
    if isinstance(valor, (list, tuple)):
        return [_sanitizar(v) for v in valor]
    return valor


# ───────── Cores ANSI ─────────
_RESET = "\033[0m"
_COR_NIVEL = {
    "DEBUG": "\033[36m",     # cyan
    "INFO": "\033[32m",      # green
    "WARNING": "\033[33m",   # yellow
    "ERROR": "\033[31m",     # red
    "CRITICAL": "\033[35m",  # magenta
}
_EMOJI_NIVEL = {
    "DEBUG": "🔵", "INFO": "🟢", "WARNING": "🟡",
    "ERROR": "🔴", "CRITICAL": "🟣",
}
_EMOJI_TAG = {
    "REQUEST": "📥", "COMANDO": "🎯", "ROTEADOR": "🧭",
    "IA": "🤖", "IA FALLBACK": "↪️", "EXECUTOR": "⚙️", "ERRO": "💥",
}


class _FormatterColorido(logging.Formatter):
    def __init__(self, *, usar_cor: bool) -> None:
        super().__init__()
        self.usar_cor = usar_cor

    def format(self, record: logging.LogRecord) -> str:
        ctx = contexto_atual()
        rid = (ctx.get("request_id") or "-")[:8]
        ts = datetime.fromtimestamp(record.created, tz=timezone.utc).strftime("%H:%M:%S")
        nivel = record.levelname
        msg = record.getMessage()

        tag = getattr(record, "tag", None)
        prefixo = f"[{tag}]" if tag else ""
        if tag and self.usar_cor:
            emoji_t = _EMOJI_TAG.get(tag, "")
            prefixo = f"{emoji_t} [{tag}]"

        base = f"{ts} {nivel:<8} req={rid} {prefixo} {msg}"
        if self.usar_cor:
            cor = _COR_NIVEL.get(nivel, "")
            emoji = _EMOJI_NIVEL.get(nivel, "")
            base = f"{cor}{emoji} {base}{_RESET}"

        if record.exc_info:
            base += "\n" + self.formatException(record.exc_info)
        return base


class _FormatterJSON(logging.Formatter):
    """Formato JSON line — pronto para Loki/ELK/Datadog sem refactor."""

    def format(self, record: logging.LogRecord) -> str:
        ctx = contexto_atual()
        payload: dict[str, Any] = {
            "ts": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
            "request_id": ctx.get("request_id"),
            "empresa_id": ctx.get("empresa_id"),
            "usuario_id": ctx.get("usuario_id"),
            "missao": ctx.get("missao"),
        }
        if hasattr(record, "tag"):
            payload["tag"] = record.tag  # type: ignore[attr-defined]
        if hasattr(record, "extra_fields"):
            payload.update(_sanitizar(record.extra_fields))  # type: ignore[attr-defined]
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False, default=str)


def configurar_logging(
    *,
    nivel: str = "INFO",
    json_format: bool = False,
    cor: bool = True,
) -> None:
    """Substitui completamente o logging padrão (uvicorn incluso)."""
    cor_ok = cor and sys.stderr.isatty() and not json_format
    formatter: logging.Formatter = (
        _FormatterJSON() if json_format else _FormatterColorido(usar_cor=cor_ok)
    )

    root = logging.getLogger()
    for h in list(root.handlers):
        root.removeHandler(h)
    handler = logging.StreamHandler(stream=sys.stderr)
    handler.setFormatter(formatter)
    root.addHandler(handler)
    root.setLevel(nivel.upper())

    # Silencia ruído do uvicorn de acesso — temos middleware próprio.
    logging.getLogger("uvicorn.access").handlers = []
    logging.getLogger("uvicorn.access").propagate = False
    for noisy in ("httpx", "httpcore", "urllib3"):
        logging.getLogger(noisy).setLevel(os.environ.get("LOG_LEVEL_HTTPX", "WARNING"))


def log_evento(
    logger: logging.Logger,
    nivel: int,
    tag: str,
    msg: str,
    **extra: Any,
) -> None:
    """Helper canônico — emite `[TAG] msg key=value ...`."""
    if extra:
        kv = " ".join(f"{k}={_sanitizar(v)}" for k, v in extra.items())
        msg = f"{msg} {kv}" if msg else kv
    logger.log(nivel, msg, extra={"tag": tag, "extra_fields": extra})
