"""URLs oficiais por provedor — desacopladas do Provider para preservar a
interface da Fase 1.

Cada Provider é consultado por NOME nesta tabela. Adicionar um novo provedor
exige apenas registrar uma entrada aqui.
"""
from __future__ import annotations

from typing import TypedDict


class ProviderURLs(TypedDict, total=False):
    documentation_url: str
    dashboard_url: str
    api_key_url: str
    billing_url: str
    status_page: str


CATALOGO: dict[str, ProviderURLs] = {
    "gemini": {
        "documentation_url": "https://ai.google.dev/gemini-api/docs",
        "dashboard_url": "https://aistudio.google.com/",
        "api_key_url": "https://aistudio.google.com/app/apikey",
        "billing_url": "https://console.cloud.google.com/billing",
        "status_page": "https://status.cloud.google.com/",
    },
    "groq": {
        "documentation_url": "https://console.groq.com/docs",
        "dashboard_url": "https://console.groq.com/",
        "api_key_url": "https://console.groq.com/keys",
        "billing_url": "https://console.groq.com/settings/billing",
        "status_page": "https://groqstatus.com/",
    },
    "openrouter": {
        "documentation_url": "https://openrouter.ai/docs",
        "dashboard_url": "https://openrouter.ai/",
        "api_key_url": "https://openrouter.ai/keys",
        "billing_url": "https://openrouter.ai/settings/credits",
        "status_page": "https://status.openrouter.ai/",
    },
    "huggingface": {
        "documentation_url": "https://huggingface.co/docs",
        "dashboard_url": "https://huggingface.co/",
        "api_key_url": "https://huggingface.co/settings/tokens",
        "billing_url": "https://huggingface.co/settings/billing",
        "status_page": "https://status.huggingface.co/",
    },
    "fal": {
        "documentation_url": "https://fal.ai/docs",
        "dashboard_url": "https://fal.ai/dashboard",
        "api_key_url": "https://fal.ai/dashboard/keys",
        "billing_url": "https://fal.ai/dashboard/billing",
        "status_page": "https://status.fal.ai/",
    },
}


def urls_de(provider: str) -> ProviderURLs:
    return CATALOGO.get(provider, {})
