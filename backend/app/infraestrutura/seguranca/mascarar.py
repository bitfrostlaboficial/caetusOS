"""Helpers para nunca expor segredos em logs/respostas."""
from __future__ import annotations


def mascarar_segredo(valor: str | None, *, visiveis: int = 4) -> str:
    if not valor:
        return ""
    if len(valor) <= visiveis:
        return "*" * len(valor)
    return "*" * (len(valor) - visiveis) + valor[-visiveis:]
