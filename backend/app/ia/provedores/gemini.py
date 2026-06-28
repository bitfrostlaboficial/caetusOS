from __future__ import annotations

from app.configuracao import config
from app.ia.provedores.base import ProvedorIA, RespostaIA


class GeminiProvedor(ProvedorIA):
    nome = "gemini"

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or config.gemini_api_key

    def gerar_texto(self, prompt: str, *, max_tokens: int = 1024) -> RespostaIA:
        if not self.api_key:
            # MVP: degrada para um stub determinístico para o pipeline rodar end-to-end sem chave.
            texto = f"[stub gemini sem GEMINI_API_KEY]\n\n{prompt[:400]}"
            return RespostaIA(texto=texto, provedor=self.nome)
        # Implementação real (lazy import para não exigir a dependência em ambientes sem a chave):
        from google import genai  # type: ignore

        cliente = genai.Client(api_key=self.api_key)
        resp = cliente.models.generate_content(model="gemini-2.0-flash-exp", contents=prompt)
        texto = (resp.text or "").strip()
        return RespostaIA(texto=texto, provedor=self.nome)
