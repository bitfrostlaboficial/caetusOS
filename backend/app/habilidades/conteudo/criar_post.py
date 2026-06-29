from __future__ import annotations

import logging
import time
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.executor.executores.base import Contexto
from app.habilidades.base import Habilidade
from app.ia.roteador import executar_missao
from app.infraestrutura.observabilidade.logger import log_evento

_PROMPTS_DIR = Path(__file__).resolve().parent.parent.parent / "ia" / "prompts"
_jinja = Environment(loader=FileSystemLoader(_PROMPTS_DIR), autoescape=select_autoescape([]))

log = logging.getLogger("caetusos.skill.criar_post")


class CriarPost(Habilidade):
    """Migrada para Missões (Fase 5.1). Instrumentada na Fase 6.1."""

    nome = "conteudo.criar_post"
    dominio = "conteudo"
    prompt_template = "criar_post"
    prompt_version = 1
    missao = "criar_post"

    def executar(self, entrada: dict, contexto: Contexto) -> dict:
        log_evento(log, logging.INFO, "SKILL", "validando entrada", fase="validacao")
        if not entrada.get("tema"):
            raise ValueError("campo 'tema' é obrigatório")

        log_evento(log, logging.INFO, "SKILL", "montando prompt", fase="prompt",
                   template=f"{self.prompt_template}.v{self.prompt_version}")
        template = _jinja.get_template(f"{self.prompt_template}.v{self.prompt_version}.jinja2")
        prompt = template.render(
            identidade=contexto.identidade,
            conhecimento=contexto.conhecimento,
            memoria=contexto.memoria,
            historico_recente=contexto.historico_recente,
            entrada=entrada,
        )
        log_evento(log, logging.INFO, "SKILL", "prompt pronto",
                   fase="prompt", prompt_chars=len(prompt))

        log_evento(log, logging.INFO, "SKILL", "enviando para IA",
                   fase="ia.chamada", missao=self.missao, max_tokens=1200)
        inicio = time.perf_counter()
        resposta = executar_missao(
            self.missao,
            prompt,
            max_tokens=1200,
            metadata={"habilidade": self.nome},
        )
        latencia_ms = int((time.perf_counter() - inicio) * 1000)
        log_evento(
            log, logging.INFO, "SKILL", "resposta recebida da IA",
            fase="ia.resposta",
            provedor=resposta.provedor, modelo=resposta.modelo,
            tokens_in=resposta.tokens_in, tokens_out=resposta.tokens_out,
            latencia_ms=latencia_ms, texto_chars=len(resposta.texto or ""),
        )

        log_evento(log, logging.INFO, "SKILL", "convertendo resposta", fase="conversao")
        return {
            "texto": resposta.texto,
            "_metricas": {
                "provedor": resposta.provedor,
                "modelo": resposta.modelo,
                "tokens_in": resposta.tokens_in,
                "tokens_out": resposta.tokens_out,
                "custo": resposta.custo,
                "latencia_ms": latencia_ms,
            },
        }
