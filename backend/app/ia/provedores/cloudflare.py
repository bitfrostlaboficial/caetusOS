from __future__ import annotations

import base64
from typing import Any

import httpx

from app.configuracao import config
from app.ia.provedores.base import CampoCredencial, Capabilities, RespostaIA, resposta_sem_chave
from app.ia.provedores.openai_compat import OpenAICompatProvedor

# Modelos de imagem do Workers AI usam /ai/run/{modelo} (não o endpoint de chat OpenAI).
_MARCAS_MODELO_IMAGEM = ("flux", "stable-diffusion", "dreamshaper", "lucid-origin", "phoenix")


def _eh_modelo_de_imagem(modelo: str | None) -> bool:
    return bool(modelo) and any(m in modelo.lower() for m in _MARCAS_MODELO_IMAGEM)


class CloudflareProvedor(OpenAICompatProvedor):
    """Cloudflare Workers AI (texto) pelo endpoint compatível com OpenAI.

    Duas credenciais: API Token + Account ID. (Imagem/FLUX é outra especialização — T-117.)
    """

    nome = "cloudflare"
    rotulo = "Cloudflare Workers AI"
    url_chave = "https://dash.cloudflare.com/profile/api-tokens"
    aviso = (
        "Plano gratuito: 10.000 \"neurons\" por dia (reinicia 00:00 UTC); ao estourar, as chamadas "
        "são bloqueadas até o dia seguinte. Crie um token com permissão \"Workers AI\"."
    )
    variavel_chave = "CLOUDFLARE_API_TOKEN"
    campos_credencial = (
        CampoCredencial("api_token", "API Token", segredo=True),
        CampoCredencial("account_id", "Account ID", segredo=False),
    )

    def __init__(
        self,
        api_key: str | None = None,
        modelo: str | None = None,
        account_id: str | None = None,
    ) -> None:
        self.account_id = account_id if account_id is not None else config.cloudflare_account_id
        super().__init__(api_key=api_key, modelo=modelo)

    @classmethod
    def com_credenciais(cls, campos: dict[str, str], modelo: str | None = None) -> "CloudflareProvedor":
        return cls(
            api_key=campos.get("api_token", ""),
            account_id=campos.get("account_id", ""),
            modelo=modelo,
        )

    def _chave_da_plataforma(self) -> str:
        return config.cloudflare_api_token

    def _modelo_padrao_config(self) -> str:
        return config.cloudflare_model

    def _credenciais_completas(self) -> bool:
        return bool(self.api_key and self.account_id)

    def _base_url(self) -> str:
        return f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/ai/v1"

    def capabilities(self) -> Capabilities:
        return Capabilities(chat=True, image_generation=True)

    def executar(
        self,
        prompt: str,
        *,
        modelo: str | None = None,
        max_tokens: int = 1024,
        **kwargs: Any,
    ) -> RespostaIA:
        if not _eh_modelo_de_imagem(modelo):
            return super().executar(prompt, modelo=modelo, max_tokens=max_tokens, **kwargs)
        if not self._credenciais_completas():
            return resposta_sem_chave(self.nome, self.variavel_chave, prompt, modelo)
        r = httpx.post(
            f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/ai/run/{modelo}",
            headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
            json={"prompt": prompt},
            timeout=self.timeout_s,
        )
        r.raise_for_status()
        dados = r.json()
        if not dados.get("success", True):
            erros = "; ".join(str(e.get("message", e)) for e in (dados.get("errors") or [])) or "erro desconhecido"
            raise RuntimeError(f"cloudflare: {erros}")
        b64 = (dados.get("result") or {}).get("image")
        if not b64:
            raise RuntimeError("cloudflare: resposta sem imagem")
        bruto = base64.b64decode(b64)
        mime = "image/jpeg" if bruto[:3] == b"\xff\xd8\xff" else "image/png"
        return RespostaIA(texto=f"data:{mime};base64,{b64}", provedor=self.nome, modelo=modelo)

    def configuracao(self) -> dict[str, Any]:
        cfg = super().configuracao()
        cfg["account_id_configurado"] = bool(self.account_id)
        return cfg
