"""Carregamento de Perfis (Fase 5.1).

Um perfil descreve PESOS, OVERRIDES MANUAIS e MODO (auto/manual) sem tocar em
código. O `.env` continua sendo a fonte única de modelos e chaves; o perfil
apenas reordena o catálogo já existente.

Compatibilidade: se o YAML não existir, o sistema funciona normalmente — todos
os pesos caem para o default declarado no `catalogo.py`.
"""
from __future__ import annotations

import logging
import threading
from pathlib import Path
from typing import Any

from app.configuracao import config

log = logging.getLogger("ia.perfis")

_DIR = Path(__file__).resolve().parent
_LOCK = threading.Lock()
_PERFIL_CACHE: dict[str, Any] | None = None


def _carregar_yaml(caminho: Path) -> dict[str, Any]:
    if not caminho.exists():
        return {}
    try:
        import yaml  # type: ignore
    except ImportError:
        log.warning("PyYAML não instalado — perfis ignorados.")
        return {}
    try:
        with caminho.open("r", encoding="utf-8") as fh:
            dados = yaml.safe_load(fh) or {}
        if not isinstance(dados, dict):
            return {}
        return dados
    except Exception:  # noqa: BLE001
        log.exception("Falha ao ler perfil %s — usando defaults.", caminho.name)
        return {}


def carregar() -> dict[str, Any]:
    """Carrega o perfil ativo (cacheado). Estrutura esperada:

        nome: production
        modo: automatico        # ou "manual"
        pesos:                  # chave = "<provider>.<categoria>.<especializacao>"
          groq.chat.chat_fast: 100
        overrides_manuais:      # missão -> provider obrigatório (modo manual)
          criar_post: groq
    """
    global _PERFIL_CACHE
    with _LOCK:
        if _PERFIL_CACHE is not None:
            return _PERFIL_CACHE
        nome = config.ia_profile or "production"
        dados = _carregar_yaml(_DIR / f"{nome}.yaml")
        dados.setdefault("nome", nome)
        dados.setdefault("modo", config.ia_modo or "automatico")
        dados.setdefault("pesos", {})
        dados.setdefault("overrides_manuais", {})
        _PERFIL_CACHE = dados
        log.info(
            "[IA PERFIS] Ativo=%s modo=%s pesos=%d overrides=%d",
            dados["nome"], dados["modo"], len(dados["pesos"]), len(dados["overrides_manuais"]),
        )
        return _PERFIL_CACHE


def recarregar() -> dict[str, Any]:
    global _PERFIL_CACHE
    with _LOCK:
        _PERFIL_CACHE = None
    return carregar()


def perfis_disponiveis() -> list[str]:
    return sorted(p.stem for p in _DIR.glob("*.yaml"))


def peso(provider: str, categoria: str, especializacao: str, default: int) -> int:
    perfil = carregar()
    chave = f"{provider}.{categoria}.{especializacao}"
    valor = perfil.get("pesos", {}).get(chave)
    if isinstance(valor, int):
        return valor
    return default


def modo() -> str:
    return carregar().get("modo", "automatico")


def definir_modo(novo_modo: str) -> None:
    if novo_modo not in ("automatico", "manual"):
        raise ValueError("modo deve ser 'automatico' ou 'manual'")
    with _LOCK:
        if _PERFIL_CACHE is None:
            carregar()
        assert _PERFIL_CACHE is not None
        _PERFIL_CACHE["modo"] = novo_modo


def override_manual(missao: str) -> str | None:
    return carregar().get("overrides_manuais", {}).get(missao)


def definir_overrides_manuais(overrides: dict[str, str]) -> None:
    with _LOCK:
        if _PERFIL_CACHE is None:
            carregar()
        assert _PERFIL_CACHE is not None
        _PERFIL_CACHE["overrides_manuais"] = dict(overrides)
