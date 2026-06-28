"""AI Router (§8). MVP: mapa fixo tipo → provedor.

Futuro: tipo → estratégia → provedor (não implementado).
"""
from __future__ import annotations

from app.ia.provedores.base import ProvedorIA
from app.ia.provedores.gemini import GeminiProvedor
from app.ia.provedores.groq import GroqProvedor

# Mapa fixo: domínio da habilidade → provedor preferencial.
MAPA_PROVEDORES: dict[str, ProvedorIA] = {
    "conteudo": GeminiProvedor(),
    "texto": GroqProvedor(),
}

PADRAO: ProvedorIA = GeminiProvedor()


def resolver_provedor(dominio: str) -> ProvedorIA:
    return MAPA_PROVEDORES.get(dominio, PADRAO)
