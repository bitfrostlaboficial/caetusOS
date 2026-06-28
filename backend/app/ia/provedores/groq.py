from __future__ import annotations

from app.configuracao import config
from app.ia.provedores.base import ProvedorIA, RespostaIA


class GroqProvedor(ProvedorIA):
    nome = "groq"

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or config.groq_api_key

    def gerar_texto(self, prompt: str, *, max_tokens: int = 1024) -> RespostaIA:
        if not self.api_key:
            texto = f"[stub groq sem GROQ_API_KEY]\n\n{prompt[:400]}"
            return RespostaIA(texto=texto, provedor=self.nome)
        from groq import Groq  # type: ignore

        cliente = Groq(api_key=self.api_key)
        resp = cliente.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
        )
        texto = resp.choices[0].message.content or ""
        uso = resp.usage
        return RespostaIA(
            texto=texto,
            provedor=self.nome,
            tokens_in=getattr(uso, "prompt_tokens", 0) if uso else 0,
            tokens_out=getattr(uso, "completion_tokens", 0) if uso else 0,
        )
