from __future__ import annotations

import logging
import time
from pathlib import Path

from app.executor.executores.base import Contexto
from app.habilidades.base import Habilidade
from app.ia.prompts._runtime import (
    construir_environment,
    descrever_campos,
    normalizar_para_template,
)
from app.ia.roteador import executar_missao
from app.infraestrutura.observabilidade.logger import log_evento

_PROMPTS_DIR = Path(__file__).resolve().parent.parent.parent / "ia" / "prompts"
_jinja = construir_environment(_PROMPTS_DIR)

log = logging.getLogger("caetusos.skill.criar_post")

# Fase 6.1: campos obrigatórios mínimos para chegar ao Provider.
_CAMPOS_OBRIGATORIOS_IDENTIDADE = ("nome",)
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
        # ── 1. Validação de entrada ─────────────────────────────────────────
        log_evento(log, logging.INFO, "SKILL", "validando entrada", fase="validacao")
        for campo in _CAMPOS_OBRIGATORIOS_ENTRADA:
            if not (entrada or {}).get(campo):
                raise FaltaCampoObrigatorio(f"Campo obrigatório ausente: entrada.{campo}")

        # ── 2. Normalização do contexto (sem Undefined) ─────────────────────
        identidade = normalizar_para_template(contexto.identidade) or {}
        conhecimento = normalizar_para_template(contexto.conhecimento) or []
        memoria = normalizar_para_template(contexto.memoria) or []
        historico = normalizar_para_template(contexto.historico_recente) or []
        entrada_n = normalizar_para_template(entrada) or {}

        # ── 3. Diagnóstico DEBUG dos campos (sem expor valores) ─────────────
        if log.isEnabledFor(logging.DEBUG):
            for linha in (
                descrever_campos("identidade", identidade)
                + descrever_campos("entrada", entrada_n)
                + [f"conhecimento -> list({len(conhecimento)})"]
                + [f"memoria -> list({len(memoria)})"]
                + [f"historico_recente -> list({len(historico)})"]
            ):
                log_evento(log, logging.DEBUG, "PROMPT", linha, fase="diagnostico")

        # ── 4. Validação de contexto obrigatório ────────────────────────────
        log_evento(log, logging.INFO, "PROMPT", "validando contexto", fase="validacao_contexto")
        faltando = [c for c in _CAMPOS_OBRIGATORIOS_IDENTIDADE if not identidade.get(c)]
        if faltando:
            raise FaltaCampoObrigatorio(
                "Campo obrigatório ausente: " + ", ".join(f"identidade.{c}" for c in faltando)
            )

        # ── 5. Render do template ───────────────────────────────────────────
        template_nome = f"{self.prompt_template}.v{self.prompt_version}.jinja2"
        log_evento(
            log, logging.INFO, "PROMPT", "renderizando template",
            template=f"{self.prompt_template}.v{self.prompt_version}",
            campos=len(identidade) + len(entrada_n) + 3,
            obrigatorios_ok=True,
        )
        try:
            template = _jinja.get_template(template_nome)
            prompt = template.render(
                identidade=identidade,
                conhecimento=conhecimento,
                memoria=memoria,
                historico_recente=historico,
                entrada=entrada_n,
            )
        except Exception as exc:
            # Não mascarar — log explícito com template + variável quando possível.
            log_evento(
                log, logging.ERROR, "PROMPT", "falha ao renderizar template",
                template=template_nome,
                tipo=type(exc).__name__,
                mensagem=str(exc)[:300],
            )
            raise

        log_evento(
            log, logging.INFO, "PROMPT", "render concluído",
            tamanho_prompt=len(prompt),
            tokens_estimados=max(1, len(prompt) // 4),
        )

        # ── 6. Chamada ao Provider ──────────────────────────────────────────
        log_evento(
            log, logging.INFO, "IA", "enviando para IA",
            missao=self.missao, prompt_chars=len(prompt), max_tokens=1200,
        )
        inicio = time.perf_counter()
        resposta = executar_missao(
            self.missao,
            prompt,
            max_tokens=1200,
            metadata={"habilidade": self.nome},
        )
        latencia_ms = int((time.perf_counter() - inicio) * 1000)
        log_evento(
            log, logging.INFO, "IA", "resposta recebida",
            provedor=resposta.provedor, modelo=resposta.modelo,
            tokens_in=resposta.tokens_in, tokens_out=resposta.tokens_out,
            latencia_ms=latencia_ms, texto_chars=len(resposta.texto or ""),
        )

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
