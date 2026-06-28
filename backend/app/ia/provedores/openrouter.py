from __future__ import annotations

import time
from typing import Any

import httpx

from app.configuracao import config
from app.ia.provedores.base import Capabilities, HealthStatus, Provider, RespostaIA
from app.ia.provedores.gemini import _classificar_erro


class OpenRouterProvedor(Provider):
    nome = "openrouter"
    BASE_URL = "https://openrouter.ai/api/v1"

    def __init__(self, api_key: str | None = None, modelo: str | None = None) -> None:
        self.api_key = api_key if api_key is not None else config.openrouter_api_key
        self.modelo_padrao = modelo or config.openrouter_model

    def configuracao(self) -> dict[str, Any]:
        return {
            "provider": self.nome,
            "modelo": self.modelo_padrao,
            "configurado": bool(self.api_key),
            "endpoint": self.BASE_URL,
        }

    def capabilities(self) -> Capabilities:
        return Capabilities(chat=True, vision=True)

    def listar_modelos(self) -> list[str]:
        if not self.api_key:
            return [self.modelo_padrao]
        try:
            r = httpx.get(
                f"{self.BASE_URL}/models",
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=10,
            )
            r.raise_for_status()
            return [m["id"] for m in r.json().get("data", [])][:50]
        except Exception:
            return [self.modelo_padrao]

    def executar(
        self,
        prompt: str,
        *,
        modelo: str | None = None,
        max_tokens: int = 1024,
        **kwargs: Any,
    ) -> RespostaIA:
        modelo_final = modelo or self.modelo_padrao
        if not self.api_key:
            return RespostaIA(
                texto=f"[stub openrouter sem OPENROUTER_API_KEY]\n\n{prompt[:400]}",
                provedor=self.nome, modelo=modelo_final,
            )
        r = httpx.post(
            f"{self.BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={
                "model": modelo_final,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": max_tokens,
            },
            timeout=60,
        )
        r.raise_for_status()
        data = r.json()
        texto = data["choices"][0]["message"]["content"]
        uso = data.get("usage", {}) or {}
        return RespostaIA(
            texto=texto, provedor=self.nome, modelo=modelo_final,
            tokens_in=uso.get("prompt_tokens", 0),
            tokens_out=uso.get("completion_tokens", 0),
        )

    def gerar_texto(self, prompt: str, *, max_tokens: int = 1024) -> RespostaIA:
        return self.executar(prompt, max_tokens=max_tokens)

    def health_check(self) -> HealthStatus:
        if not self.api_key:
            return HealthStatus(
                provider=self.nome, status="error",
                message="OPENROUTER_API_KEY não configurada.",
                modelo=self.modelo_padrao, requer_acao=True,
                acao="Definir OPENROUTER_API_KEY no .env",
            )
        inicio = time.perf_counter()
        try:
            r = httpx.get(
                f"{self.BASE_URL}/auth/key",
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=10,
            )
            r.raise_for_status()
            return HealthStatus(
                provider=self.nome, status="ok", message="Provedor operacional.",
                modelo=self.modelo_padrao,
                latencia_ms=int((time.perf_counter() - inicio) * 1000),
            )
        except Exception as exc:  # noqa: BLE001
            return _classificar_erro(self.nome, self.modelo_padrao, str(exc))
