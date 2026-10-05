from __future__ import annotations

from typing import Any

from app.configuracao import config
from app.ia.provedores.base import CampoCredencial
from app.ia.provedores.openai_compat import OpenAICompatProvedor


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

    def configuracao(self) -> dict[str, Any]:
        cfg = super().configuracao()
        cfg["account_id_configurado"] = bool(self.account_id)
        return cfg
