from __future__ import annotations

import time
from typing import Any

from app.configuracao import config
from app.ia.provedores.base import Capabilities, HealthStatus, Provider, RespostaIA
from app.ia.provedores.gemini import _classificar_erro


class GroqProvedor(Provider):
    nome = "groq"

    def __init__(self, api_key: str | None = None, modelo: str | None = None) -> None:
        self.api_key = api_key if api_key is not None else config.groq_api_key
        self.modelo_padrao = modelo or config.groq_model

    def configuracao(self) -> dict[str, Any]:
        return {
            "provider": self.nome,
            "modelo": self.modelo_padrao,
            "configurado": bool(self.api_key),
            "endpoint": "https://api.groq.com",
        }

    def capabilities(self) -> Capabilities:
        return Capabilities(chat=True)

    def listar_modelos(self) -> list[str]:
        return [
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "mixtral-8x7b-32768",
            "gemma2-9b-it",
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
                texto=f"[stub groq sem GROQ_API_KEY]\n\n{prompt[:400]}",
                provedor=self.nome,
                modelo=modelo_final,
            )
        from groq import Groq  # type: ignore

        cliente = Groq(api_key=self.api_key)
        resp = cliente.chat.completions.create(
            model=modelo_final,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
        )
        texto = resp.choices[0].message.content or ""
        uso = resp.usage
        return RespostaIA(
            texto=texto,
            provedor=self.nome,
            modelo=modelo_final,
            tokens_in=getattr(uso, "prompt_tokens", 0) if uso else 0,
            tokens_out=getattr(uso, "completion_tokens", 0) if uso else 0,
        )

    def gerar_texto(self, prompt: str, *, max_tokens: int = 1024) -> RespostaIA:
        return self.executar(prompt, max_tokens=max_tokens)

    def health_check(self) -> HealthStatus:
        if not self.api_key:
            return HealthStatus(
                provider=self.nome, status="error",
                message="GROQ_API_KEY não configurada.",
                modelo=self.modelo_padrao, requer_acao=True,
                acao="Definir GROQ_API_KEY no .env",
            )
        inicio = time.perf_counter()
        try:
            from groq import Groq  # type: ignore

            cliente = Groq(api_key=self.api_key)
            cliente.chat.completions.create(
                model=self.modelo_padrao,
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=1,
            )
            latencia = int((time.perf_counter() - inicio) * 1000)
            return HealthStatus(
                provider=self.nome, status="ok", message="Provedor operacional.",
                modelo=self.modelo_padrao, latencia_ms=latencia,
            )
        except Exception as exc:  # noqa: BLE001
            return _classificar_erro(self.nome, self.modelo_padrao, str(exc))
