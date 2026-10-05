"""Cofre de credenciais — cifra/decifra segredos de clientes (chaves de API de IA).

Cifragem simétrica (Fernet = AES-128-CBC + HMAC) com chave mestra em `CREDENCIAIS_MASTER_KEY`.
Regras: nunca logar valores; nunca devolver segredos por API (só máscara).
"""
from __future__ import annotations

import json

from cryptography.fernet import Fernet, InvalidToken

from app.configuracao import config


class CofreNaoConfigurado(RuntimeError):
    """CREDENCIAIS_MASTER_KEY ausente/ inválida — não dá para guardar chaves com segurança."""


class CredencialIlegivel(RuntimeError):
    """Token cifrado não pôde ser decifrado (chave mestra trocada ou dado corrompido)."""


def _fernet() -> Fernet:
    chave = (config.credenciais_master_key or "").strip()
    if not chave:
        raise CofreNaoConfigurado("CREDENCIAIS_MASTER_KEY não configurada")
    try:
        return Fernet(chave.encode())
    except Exception as exc:  # noqa: BLE001
        raise CofreNaoConfigurado("CREDENCIAIS_MASTER_KEY inválida (esperado Fernet key)") from exc


def cifrar(campos: dict[str, str]) -> str:
    return _fernet().encrypt(json.dumps(campos, ensure_ascii=False).encode()).decode()


def decifrar(token: str) -> dict[str, str]:
    try:
        return json.loads(_fernet().decrypt(token.encode()).decode())
    except InvalidToken as exc:
        raise CredencialIlegivel("não foi possível decifrar a credencial") from exc


def mascarar(valor: str, *, visiveis: int = 4) -> str:
    """`gsk_abcdef1234` -> `••••••••1234`. Valores curtos viram só pontos."""
    if len(valor) <= visiveis:
        return "•" * len(valor)
    return "•" * (len(valor) - visiveis) + valor[-visiveis:]
