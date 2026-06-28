"""CostEstimator — estima custo de uma execução em USD.

Tabela interna em USD por milhão de tokens. Provedor/modelo desconhecido = 0.
Atualizar conforme novos modelos forem cadastrados. Valores intencionalmente
conservadores; quem precisa de precisão fiscal usa fatura do provedor.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TabelaPreco:
    entrada_usd_milhao: float
    saida_usd_milhao: float


# Preços USD por 1.000.000 de tokens (input / output).
# Fonte: páginas oficiais públicas em jun/2026. Provedores gratuitos = 0.
_PRECOS: dict[tuple[str, str], TabelaPreco] = {
    # Gemini
    ("gemini", "gemini-2.5-flash"): TabelaPreco(0.30, 2.50),
    ("gemini", "gemini-2.5-pro"): TabelaPreco(1.25, 10.00),
    ("gemini", "gemini-2.0-flash-exp"): TabelaPreco(0.10, 0.40),
    ("gemini", "gemini-1.5-pro"): TabelaPreco(1.25, 5.00),
    # Groq (cobra por token, valores aproximados)
    ("groq", "llama-3.3-70b-versatile"): TabelaPreco(0.59, 0.79),
    ("groq", "llama-3.1-8b-instant"): TabelaPreco(0.05, 0.08),
    # OpenRouter — depende muito do modelo; deixamos os principais aqui.
    ("openrouter", "deepseek/deepseek-chat-v3"): TabelaPreco(0.27, 1.10),
    # HuggingFace inference API (geração de imagem é por chamada — aproximado 0).
    # Fal.ai idem.
}


def estimar(
    provider: str,
    modelo: str | None,
    *,
    tokens_in: int | None,
    tokens_out: int | None,
) -> float:
    """Retorna custo estimado em USD. Desconhecido / sem tokens => 0.0."""
    if not modelo:
        return 0.0
    tabela = _PRECOS.get((provider, modelo))
    if tabela is None:
        return 0.0
    ti = tokens_in or 0
    to = tokens_out or 0
    return round(
        (ti / 1_000_000) * tabela.entrada_usd_milhao
        + (to / 1_000_000) * tabela.saida_usd_milhao,
        6,
    )


def preco_de(provider: str, modelo: str | None) -> TabelaPreco | None:
    if not modelo:
        return None
    return _PRECOS.get((provider, modelo))
