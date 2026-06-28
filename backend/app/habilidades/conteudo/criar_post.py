from __future__ import annotations

import time
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.executor.executores.base import Contexto
from app.habilidades.base import Habilidade
from app.ia.roteador import resolver_provedor

_PROMPTS_DIR = Path(__file__).resolve().parent.parent.parent / "ia" / "prompts"
_jinja = Environment(loader=FileSystemLoader(_PROMPTS_DIR), autoescape=select_autoescape([]))


class CriarPost(Habilidade):
    """Única habilidade ativa no MVP (§4, §11)."""

    nome = "conteudo.criar_post"
    dominio = "conteudo"
    prompt_template = "criar_post"
    prompt_version = 1

    def executar(self, entrada: dict, contexto: Contexto) -> dict:
        if not entrada.get("tema"):
            raise ValueError("campo 'tema' é obrigatório")

        template = _jinja.get_template(f"{self.prompt_template}.v{self.prompt_version}.jinja2")
        prompt = template.render(
            identidade=contexto.identidade,
            conhecimento=contexto.conhecimento,
            memoria=contexto.memoria,
            historico_recente=contexto.historico_recente,
            entrada=entrada,
        )
        provedor = resolver_provedor(self.dominio)
        inicio = time.perf_counter()
        resposta = provedor.executar(prompt, max_tokens=1200)
        latencia_ms = int((time.perf_counter() - inicio) * 1000)
        return {
            "texto": resposta.texto,
            "_metricas": {
                "provedor": resposta.provedor,
                "tokens_in": resposta.tokens_in,
                "tokens_out": resposta.tokens_out,
                "custo": resposta.custo,
                "latencia_ms": latencia_ms,
            },
        }
