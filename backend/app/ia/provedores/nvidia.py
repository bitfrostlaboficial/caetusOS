from __future__ import annotations

from app.configuracao import config
from app.ia.provedores.openai_compat import OpenAICompatProvedor


class NvidiaProvedor(OpenAICompatProvedor):
    nome = "nvidia"
    rotulo = "NVIDIA NIM"
    url_chave = "https://build.nvidia.com/settings/api-keys"
    aviso = (
        "Chave gratuita do NVIDIA Developer Program: créditos limitados e ~40 requisições/min. "
        "Pensada para desenvolvimento — confira os termos antes de uso comercial."
    )
    variavel_chave = "NVIDIA_API_KEY"

    def _chave_da_plataforma(self) -> str:
        return config.nvidia_api_key

    def _modelo_padrao_config(self) -> str:
        return config.nvidia_model

    def _base_url(self) -> str:
        return "https://integrate.api.nvidia.com/v1"
