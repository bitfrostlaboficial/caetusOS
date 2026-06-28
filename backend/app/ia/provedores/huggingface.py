from __future__ import annotations

import time
from typing import Any

import httpx

from app.configuracao import config
from app.ia.provedores.base import Capabilities, HealthStatus, Provider, RespostaIA
from app.ia.provedores.gemini import _classificar_erro


class HuggingFaceProvedor(Provider):
    nome = "huggingface"
    BASE_URL = "https://api-inference.huggingface.co"

    def __init__(self, api_key: str | None = None, modelo: str | None = None) -> None:
        self.api_key = api_key if api_key is not None else config.huggingface_api_key
        self.modelo_padrao = modelo or config.hf_model

    def configuracao(self) -> dict[str, Any]:
        return {
            "provider": self.nome,
            "modelo": self.modelo_padrao,
            "configurado": bool(self.api_key),
            "endpoint": self.BASE_URL,
        }

    def capabilities(self) -> Capabilities:
        # FLUX.1 → geração de imagem; usuário pode trocar para um chat model.
        return Capabilities(chat=True, image_generation=True, embeddings=True)

    def listar_modelos(self) -> list[str]:
        return [
            "black-forest-labs/FLUX.1-schnell",
            "meta-llama/Llama-3.3-70B-Instruct",
            "mistralai/Mistral-7B-Instruct-v0.3",
            "sentence-transformers/all-MiniLM-L6-v2",
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
                texto=f"[stub huggingface sem HUGGINGFACE_API_KEY]\n\n{prompt[:400]}",
                provedor=self.nome, modelo=modelo_final,
            )
        r = httpx.post(
            f"{self.BASE_URL}/models/{modelo_final}",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={"inputs": prompt, "parameters": {"max_new_tokens": max_tokens}},
            timeout=120,
        )
        r.raise_for_status()
        data = r.json()
        if isinstance(data, list) and data and isinstance(data[0], dict):
            texto = data[0].get("generated_text", str(data))
        else:
            texto = str(data)
        return RespostaIA(texto=texto, provedor=self.nome, modelo=modelo_final)

    def gerar_texto(self, prompt: str, *, max_tokens: int = 1024) -> RespostaIA:
        return self.executar(prompt, max_tokens=max_tokens)

    def health_check(self) -> HealthStatus:
        if not self.api_key:
            return HealthStatus(
                provider=self.nome, status="error",
                message="HUGGINGFACE_API_KEY não configurada.",
                modelo=self.modelo_padrao, requer_acao=True,
                acao="Definir HUGGINGFACE_API_KEY no .env",
            )
        inicio = time.perf_counter()
        try:
            r = httpx.get(
                "https://huggingface.co/api/whoami-v2",
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=10,
            )
            r.raise_for_status()
            return HealthStatus(
                provider=self.nome, status="ok", message="Token válido.",
                modelo=self.modelo_padrao,
                latencia_ms=int((time.perf_counter() - inicio) * 1000),
            )
        except Exception as exc:  # noqa: BLE001
            return _classificar_erro(self.nome, self.modelo_padrao, str(exc))
