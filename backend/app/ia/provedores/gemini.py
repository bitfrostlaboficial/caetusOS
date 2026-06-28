from __future__ import annotations

import time
from typing import Any

from app.configuracao import config
from app.ia.provedores.base import Capabilities, HealthStatus, Provider, RespostaIA


class GeminiProvedor(Provider):
    nome = "gemini"

    def __init__(self, api_key: str | None = None, modelo: str | None = None) -> None:
        self.api_key = api_key if api_key is not None else config.gemini_api_key
        self.modelo_padrao = modelo or config.gemini_model

    def configuracao(self) -> dict[str, Any]:
        return {
            "provider": self.nome,
            "modelo": self.modelo_padrao,
            "configurado": bool(self.api_key),
            "endpoint": "https://generativelanguage.googleapis.com",
        }

    def capabilities(self) -> Capabilities:
        return Capabilities(chat=True, vision=True, ocr=True)

    def listar_modelos(self) -> list[str]:
        # MVP: sem chamada remota; lista os mais comuns.
        return [
            "gemini-2.5-flash",
            "gemini-2.5-pro",
            "gemini-2.0-flash-exp",
            "gemini-1.5-pro",
        ]

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
                texto=f"[stub gemini sem GEMINI_API_KEY]\n\n{prompt[:400]}",
                provedor=self.nome,
                modelo=modelo_final,
            )
        from google import genai  # type: ignore

        cliente = genai.Client(api_key=self.api_key)
        resp = cliente.models.generate_content(model=modelo_final, contents=prompt)
        return RespostaIA(texto=(resp.text or "").strip(), provedor=self.nome, modelo=modelo_final)

    # ───────── Compat. com habilidades antigas ─────────
    def gerar_texto(self, prompt: str, *, max_tokens: int = 1024) -> RespostaIA:
        return self.executar(prompt, max_tokens=max_tokens)

    def health_check(self) -> HealthStatus:
        if not self.api_key:
            return HealthStatus(
                provider=self.nome,
                status="error",
                message="GEMINI_API_KEY não configurada.",
                modelo=self.modelo_padrao,
                requer_acao=True,
                acao="Definir GEMINI_API_KEY no .env",
            )
        inicio = time.perf_counter()
        try:
            from google import genai  # type: ignore

            cliente = genai.Client(api_key=self.api_key)
            cliente.models.generate_content(model=self.modelo_padrao, contents="ping")
            latencia = int((time.perf_counter() - inicio) * 1000)
            return HealthStatus(
                provider=self.nome,
                status="ok",
                message="Provedor operacional.",
                modelo=self.modelo_padrao,
                latencia_ms=latencia,
            )
        except Exception as exc:  # noqa: BLE001
            msg = str(exc)
            return _classificar_erro(self.nome, self.modelo_padrao, msg)


def _classificar_erro(provider: str, modelo: str, msg: str) -> HealthStatus:
    low = msg.lower()
    if "401" in msg or "unauthorized" in low or "api key" in low and "invalid" in low:
        return HealthStatus(
            provider=provider, status="error", message="API Key inválida.",
            modelo=modelo, requer_acao=True, acao="Atualizar API Key.",
        )
    if "403" in msg or "permission" in low or "forbidden" in low:
        return HealthStatus(
            provider=provider, status="warning", message="Permissões insuficientes ou billing inativo.",
            modelo=modelo, requer_acao=True, acao="Verificar billing / permissões no console.",
        )
    if "404" in msg or "not found" in low or "model" in low and "not" in low:
        return HealthStatus(
            provider=provider, status="warning", message="Modelo indisponível ou inexistente.",
            modelo=modelo, requer_acao=True, acao="Selecionar outro modelo no .env.",
        )
    if "429" in msg or "rate" in low or "quota" in low:
        return HealthStatus(
            provider=provider, status="warning", message="Limite de uso atingido.",
            modelo=modelo, requer_acao=False,
        )
    return HealthStatus(
        provider=provider, status="error", message=f"Falha ao contactar provedor: {msg[:200]}",
        modelo=modelo, requer_acao=True,
    )
