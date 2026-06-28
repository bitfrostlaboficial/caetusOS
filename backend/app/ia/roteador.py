"""AI Router (§8) — desacoplado dos provedores.

O roteador NÃO conhece detalhes de nenhuma IA. Trabalha apenas com a abstração
`Provider`. Adicionar um novo provedor exige somente:
    1. criar um arquivo em `app/ia/provedores/<novo>.py` implementando `Provider`;
    2. registrá-lo aqui em `_REGISTRO_PADRAO`.

Nenhuma outra parte do sistema precisa mudar.
"""
from __future__ import annotations

from app.ia.provedores.base import Provider
from app.ia.provedores.fal import FalProvedor
from app.ia.provedores.gemini import GeminiProvedor
from app.ia.provedores.groq import GroqProvedor
from app.ia.provedores.huggingface import HuggingFaceProvedor
from app.ia.provedores.openrouter import OpenRouterProvedor

# ───────── Registro global ─────────
_REGISTRO: dict[str, Provider] = {}


def registrar(provedor: Provider) -> None:
    _REGISTRO[provedor.nome] = provedor


def obter(nome: str) -> Provider:
    try:
        return _REGISTRO[nome]
    except KeyError as exc:
        raise KeyError(f"Provedor '{nome}' não registrado.") from exc


def listar() -> list[Provider]:
    return list(_REGISTRO.values())


# ───────── Registro padrão (carregado na importação) ─────────
for _p in (
    GeminiProvedor(),
    GroqProvedor(),
    OpenRouterProvedor(),
    HuggingFaceProvedor(),
    FalProvedor(),
):
    registrar(_p)


# ───────── Mapa domínio → provedor (substituível) ─────────
MAPA_DOMINIOS: dict[str, str] = {
    "conteudo": "gemini",
    "texto": "groq",
}

PROVEDOR_PADRAO = "gemini"


def por_dominio(dominio: str) -> Provider:
    nome = MAPA_DOMINIOS.get(dominio, PROVEDOR_PADRAO)
    return obter(nome)


# ───────── Execução genérica (interface pública do roteador) ─────────
def executar(
    *,
    provider: str,
    prompt: str,
    modelo: str | None = None,
    max_tokens: int = 1024,
    **kwargs,
):
    """Ponto único de entrada genérico: o caller só conhece nomes."""
    return obter(provider).executar(prompt, modelo=modelo, max_tokens=max_tokens, **kwargs)


# ───────── Compat. com código existente ─────────
def resolver_provedor(dominio: str) -> Provider:
    return por_dominio(dominio)
