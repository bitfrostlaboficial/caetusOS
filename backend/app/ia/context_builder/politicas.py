"""Políticas do ContextBuilder (§7).

Histórico:
- no máximo 5 execuções
- limite duro de 10.000 tokens
- nunca carregar histórico completo
- descartar começando pelas mais antigas se exceder
"""

HISTORICO_MAX_EXECUCOES = 5
HISTORICO_MAX_TOKENS = 10_000


def estimar_tokens(texto: str) -> int:
    """Heurística simples: ~4 caracteres por token."""
    return max(1, len(texto) // 4)


def aplicar_limite_historico(itens: list[dict]) -> list[dict]:
    """Recebe itens mais recentes primeiro. Mantém ordem cronológica reversa,
    descarta os mais antigos até caber em HISTORICO_MAX_TOKENS."""
    selecionados: list[dict] = []
    total = 0
    for item in itens[:HISTORICO_MAX_EXECUCOES]:
        custo = estimar_tokens(str(item.get("entrada", "")) + str(item.get("saida", "")))
        if total + custo > HISTORICO_MAX_TOKENS:
            break
        selecionados.append(item)
        total += custo
    return selecionados
