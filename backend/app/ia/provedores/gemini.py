from __future__ import annotations

import base64
import time
from typing import Any

from app.configuracao import config
from app.ia.provedores.base import resposta_sem_chave, Capabilities, HealthStatus, Provider, RespostaIA


def _eh_modelo_de_imagem(modelo: str | None) -> bool:
    return bool(modelo) and ("image" in modelo or modelo.startswith("imagen"))  # type: ignore[union-attr]


class GeminiProvedor(Provider):
    nome = "gemini"
    rotulo = "Google Gemini"
    url_chave = "https://aistudio.google.com/apikey"
    aviso = (
        "Os limites do Google valem por PROJETO do Google Cloud, não por chave — várias chaves no mesmo "
        "projeto dividem a mesma cota. Imagem costuma exigir chave com cobrança ativa; confira no AI Studio. "
        "Dica: use um projeto separado só para imagens para isolar custo e cota (não crie projetos para "
        "burlar limites: os termos do Google proíbem)."
    )

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
        return Capabilities(chat=True, vision=True, ocr=True, image_generation=True)

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
            return resposta_sem_chave(self.nome, "GEMINI_API_KEY", prompt, modelo_final)
        from google import genai  # type: ignore

        from google.genai import types  # type: ignore

        cliente = genai.Client(api_key=self.api_key)
        if _eh_modelo_de_imagem(modelo_final):
            return self._gerar_imagem(cliente, types, prompt, modelo_final)
        resp = cliente.models.generate_content(
            model=modelo_final,
            contents=prompt,
            config=types.GenerateContentConfig(max_output_tokens=max_tokens),
        )
        uso = getattr(resp, "usage_metadata", None)
        return RespostaIA(
            texto=(resp.text or "").strip(),
            provedor=self.nome,
            modelo=modelo_final,
            tokens_in=int(getattr(uso, "prompt_token_count", 0) or 0),
            tokens_out=int(getattr(uso, "candidates_token_count", 0) or 0),
        )

    def _gerar_imagem(self, cliente: Any, types: Any, prompt: str, modelo: str) -> RespostaIA:
        """Modelos *-image do Gemini devolvem a imagem em `inline_data`; viramos data URI."""
        resp = cliente.models.generate_content(
            model=modelo,
            contents=prompt,
            config=types.GenerateContentConfig(response_modalities=["IMAGE"]),
        )
        for cand in getattr(resp, "candidates", None) or []:
            for parte in getattr(getattr(cand, "content", None), "parts", None) or []:
                dados = getattr(parte, "inline_data", None)
                if dados is not None and getattr(dados, "data", None):
                    bruto = dados.data
                    if isinstance(bruto, str):
                        b64 = bruto
                    else:
                        b64 = base64.b64encode(bruto).decode("ascii")
                    mime = getattr(dados, "mime_type", None) or "image/png"
                    uso = getattr(resp, "usage_metadata", None)
                    return RespostaIA(
                        texto=f"data:{mime};base64,{b64}",
                        provedor=self.nome,
                        modelo=modelo,
                        tokens_in=int(getattr(uso, "prompt_token_count", 0) or 0),
                    )
        raise RuntimeError("gemini: resposta sem imagem (modelo recusou ou não suporta imagem)")

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
