from __future__ import annotations

import logging

from app.executor.executores.base import Contexto
from app.habilidades.base import Habilidade
from app.habilidades.conteudo.pipeline_post import EntradaPost, PipelineCriarPost
from app.infraestrutura.observabilidade.logger import log_evento

log = logging.getLogger("caetusos.skill.criar_post")

_CAMPOS_OBRIGATORIOS_ENTRADA = ("tema",)


class FaltaCampoObrigatorio(ValueError):
    """Erro explícito para campo ausente — não deixa o Jinja explodir."""


class CriarPost(Habilidade):
    nome = "conteudo.criar_post"
    dominio = "conteudo"
    prompt_template = "criar_post"
    prompt_version = 1
    missao = "criar_post"

    def executar(self, entrada: dict, contexto: Contexto) -> dict:
        log_evento(log, logging.INFO, "SKILL", "validando entrada", fase="validacao")
        for campo in _CAMPOS_OBRIGATORIOS_ENTRADA:
            if not (entrada or {}).get(campo):
                raise FaltaCampoObrigatorio(f"Campo obrigatório ausente: entrada.{campo}")

        entrada_pipeline = EntradaPost(
            tema=str(entrada.get("tema") or "").strip(),
            rede=str(
                entrada.get("rede")
                or entrada.get("rede_social")
                or entrada.get("canal")
                or "instagram"
            ).strip().lower(),
            objetivo=str(entrada.get("objetivo") or "engajamento").strip(),
            descricao_imagem=(
                str(entrada.get("descricao_imagem")).strip()
                if entrada.get("descricao_imagem")
                else None
            ),
            publicar_automaticamente=_bool_entrada(
                entrada.get("publicar_automaticamente")
                or entrada.get("publicacao_automatica")
            ),
        )
        log_evento(
            log,
            logging.INFO,
            "PIPELINE",
            "executando pipeline completo",
            rede=entrada_pipeline.rede,
            publicar=entrada_pipeline.publicar_automaticamente,
        )
        return PipelineCriarPost().executar(entrada_pipeline, contexto)


def _bool_entrada(valor: object) -> bool:
    if isinstance(valor, bool):
        return valor
    if isinstance(valor, str):
        return valor.strip().lower() in {"1", "true", "sim", "yes", "on"}
    return bool(valor)
