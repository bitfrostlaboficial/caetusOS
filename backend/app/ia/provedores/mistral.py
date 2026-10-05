from __future__ import annotations

from app.configuracao import config
from app.ia.provedores.openai_compat import OpenAICompatProvedor


class MistralProvedor(OpenAICompatProvedor):
    nome = "mistral"
    rotulo = "Mistral AI"
    url_chave = "https://console.mistral.ai/api-keys"
    aviso = (
        "O plano gratuito (Experiment) tem limites e, segundo a Mistral, as requisições nele podem ser "
        "usadas para treinar modelos — evite dados sensíveis ou use um plano pago."
    )
    variavel_chave = "MISTRAL_API_KEY"

    def _chave_da_plataforma(self) -> str:
        return config.mistral_api_key

    def _modelo_padrao_config(self) -> str:
        return config.mistral_model

    def _base_url(self) -> str:
        return "https://api.mistral.ai/v1"
