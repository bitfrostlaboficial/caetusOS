from __future__ import annotations

import time
from typing import Any

import httpx

from app.configuracao import config
from app.ia.provedores.base import Capabilities, HealthStatus, Provider, RespostaIA
from app.ia.provedores.gemini import _classificar_erro


class FalProvedor(Provider):
    nome = "fal"
    BASE_URL = "https://fal.run"

    def __init__(self, api_key: str | None = None, modelo: str | None = None) -> None:
        self.api_key = api_key if api_key is not None else config.fal_key
        self.modelo_padrao = modelo or config.fal_model

    def configuracao(self) -> dict[str, Any]:
        return {
            "provider": self.nome,
            "modelo": self.modelo_padrao,
            "configurado": bool(self.api_key),
            "endpoint": self.BASE_URL,
        }

    def capabilities(self) -> Capabilities:
        return Capabilities(image_generation=True, audio=True)

    def listar_modelos(self) -> list[str]:
        return [
            "flux/schnell",
            "flux/dev",
            "fal-ai/fast-sdxl",
            "fal-ai/whisper",
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
                texto=f"[stub fal sem FAL_KEY]\n\n{prompt[:400]}",
                provedor=self.nome, modelo=modelo_final,
            )
        r = httpx.post(
            f"{self.BASE_URL}/{modelo_final}",
            headers={"Authorization": f"Key {self.api_key}"},
            json={"prompt": prompt, **kwargs},
            timeout=120,
        )
        r.raise_for_status()
        data = r.json()
        # Fal retorna estruturas variadas (imagem, áudio); serializamos como texto/URL.
        if isinstance(data, dict):
            imgs = data.get("images") or []
            if imgs and isinstance(imgs, list) and isinstance(imgs[0], dict):
                texto = imgs[0].get("url", str(data))
            else:
                texto = str(data)
        else:
            texto = str(data)
        return RespostaIA(texto=texto, provedor=self.nome, modelo=modelo_final)

    def gerar_texto(self, prompt: str, *, max_tokens: int = 1024) -> RespostaIA:
        return self.executar(prompt, max_tokens=max_tokens)

    def health_check(self) -> HealthStatus:
        if not self.api_key:
            return HealthStatus(
                provider=self.nome, status="error",
                message="FAL_KEY não configurada.",
                modelo=self.modelo_padrao, requer_acao=True,
                acao="Definir FAL_KEY no .env",
            )
        inicio = time.perf_counter()
        try:
            # Fal não expõe um endpoint público de "whoami"; usamos HEAD na queue do modelo.
            r = httpx.get(
                f"https://queue.fal.run/{self.modelo_padrao}/health",
                headers={"Authorization": f"Key {self.api_key}"},
                timeout=10,
            )
            if r.status_code in (200, 404, 405):
                # 404/405: endpoint não existe mas a key foi aceita (sem 401/403).
                return HealthStatus(
                    provider=self.nome,
                    status="ok" if r.status_code == 200 else "warning",
                    message=(
                        "Provedor operacional."
                        if r.status_code == 200
                        else "Key aceita; health-check completo não verificável automaticamente."
                    ),
                    modelo=self.modelo_padrao,
                    latencia_ms=int((time.perf_counter() - inicio) * 1000),
                )
            r.raise_for_status()
            return HealthStatus(
                provider=self.nome, status="ok", message="Provedor operacional.",
                modelo=self.modelo_padrao,
                latencia_ms=int((time.perf_counter() - inicio) * 1000),
            )
        except Exception as exc:  # noqa: BLE001
            return _classificar_erro(self.nome, self.modelo_padrao, str(exc))
