"""Adaptador genérico para APIs no formato OpenAI (`POST {base}/chat/completions`).

Mistral, NVIDIA NIM, Cloudflare Workers AI (texto) e vários outros falam esse formato —
um provedor novo vira uma subclasse de ~20 linhas (nome, URL base, campos, modelo padrão).
"""
from __future__ import annotations

import time
from typing import Any

import httpx

from app.ia.provedores.base import (
    Capabilities,
    HealthStatus,
    Provider,
    RespostaIA,
    resposta_sem_chave,
)
from app.ia.provedores.gemini import _classificar_erro


class OpenAICompatProvedor(Provider):
    """Subclasses definem `nome`, `variavel_chave`, `_base_url()` e `_modelo_padrao_config()`."""

    variavel_chave: str = "API_KEY"
    timeout_s: int = 120

    def __init__(self, api_key: str | None = None, modelo: str | None = None) -> None:
        self.api_key = api_key if api_key is not None else self._chave_da_plataforma()
        self.modelo_padrao = modelo or self._modelo_padrao_config()

    # ── ganchos das subclasses ──
    def _chave_da_plataforma(self) -> str:
        return ""

    def _modelo_padrao_config(self) -> str:
        return ""

    def _base_url(self) -> str:
        raise NotImplementedError

    def _credenciais_completas(self) -> bool:
        return bool(self.api_key)

    # ── Provider ──
    def configuracao(self) -> dict[str, Any]:
        return {
            "provider": self.nome,
            "modelo": self.modelo_padrao,
            "configurado": self._credenciais_completas(),
            "endpoint": self._base_url() if self._credenciais_completas() else None,
        }

    def capabilities(self) -> Capabilities:
        return Capabilities(chat=True)

    def listar_modelos(self) -> list[str]:
        return [self.modelo_padrao] if self.modelo_padrao else []

    def _chat(self, prompt: str, modelo: str, max_tokens: int, **extra: Any) -> dict[str, Any]:
        r = httpx.post(
            f"{self._base_url()}/chat/completions",
            headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
            json={
                "model": modelo,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": max_tokens,
                **extra,
            },
            timeout=self.timeout_s,
        )
        r.raise_for_status()
        return r.json()

    def executar(
        self,
        prompt: str,
        *,
        modelo: str | None = None,
        max_tokens: int = 1024,
        **kwargs: Any,
    ) -> RespostaIA:
        modelo_final = modelo or self.modelo_padrao
        if not self._credenciais_completas():
            return resposta_sem_chave(self.nome, self.variavel_chave, prompt, modelo_final)
        dados = self._chat(prompt, modelo_final, max_tokens)
        try:
            texto = (dados["choices"][0]["message"]["content"] or "").strip()
        except (KeyError, IndexError, TypeError) as exc:
            raise RuntimeError(f"{self.nome}: resposta inesperada do provedor") from exc
        uso = dados.get("usage") or {}
        return RespostaIA(
            texto=texto,
            provedor=self.nome,
            modelo=dados.get("model") or modelo_final,
            tokens_in=int(uso.get("prompt_tokens") or 0),
            tokens_out=int(uso.get("completion_tokens") or 0),
        )

    def gerar_texto(self, prompt: str, *, max_tokens: int = 1024) -> RespostaIA:
        return self.executar(prompt, max_tokens=max_tokens)

    def health_check(self) -> HealthStatus:
        if not self._credenciais_completas():
            return HealthStatus(
                provider=self.nome, status="error",
                message=f"{self.variavel_chave} não configurada.",
                modelo=self.modelo_padrao, requer_acao=True,
                acao="Cadastrar a chave em Provedores de IA.",
            )
        inicio = time.perf_counter()
        try:
            self._chat("ping", self.modelo_padrao, 1)
            return HealthStatus(
                provider=self.nome, status="ok", message="Provedor operacional.",
                modelo=self.modelo_padrao,
                latencia_ms=int((time.perf_counter() - inicio) * 1000),
            )
        except Exception as exc:  # noqa: BLE001
            return _classificar_erro(self.nome, self.modelo_padrao, str(exc))
