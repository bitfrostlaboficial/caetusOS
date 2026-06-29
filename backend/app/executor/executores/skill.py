from __future__ import annotations

import logging
import time
import traceback
import uuid

from app.executor.comando import Comando
from app.executor.executores.base import Contexto, ExecutorEspecifico
from app.executor.resultado import ErroExecucao, EventoExecucao, Metricas, ResultadoExecucao
from app.habilidades.registro import obter as obter_habilidade
from app.infraestrutura.observabilidade.logger import log_evento

log = logging.getLogger("caetusos.skill")


class ExecutorSkill(ExecutorEspecifico):
    """Único ExecutorEspecifico registrado no MVP (§4, §11).

    Fase 6.1: instrumentação completa do pipeline de execução de skill.
    """

    def executar(self, comando: Comando, contexto: Contexto) -> ResultadoExecucao:
        execucao_id = uuid.uuid4()
        inicio = time.perf_counter()
        fase = "inicio"
        provedor_usado: str | None = None
        modelo_usado: str | None = None
        try:
            fase = "resolver_habilidade"
            log_evento(
                log, logging.INFO, "SKILL",
                f"iniciando skill {comando.alvo}",
                fase=fase, execucao_id=str(execucao_id),
            )
            habilidade = obter_habilidade(comando.alvo)

            fase = "executar_habilidade"
            log_evento(
                log, logging.INFO, "SKILL", "executando habilidade",
                fase=fase, classe=type(habilidade).__name__,
                prompt_template=habilidade.prompt_template,
                prompt_version=habilidade.prompt_version,
            )
            saida = habilidade.executar(comando.entrada, contexto)

            fase = "extrair_metricas"
            metricas_dict = (saida.pop("_metricas", {}) if isinstance(saida, dict) else {}) or {}
            provedor_usado = metricas_dict.get("provedor")
            modelo_usado = metricas_dict.get("modelo")
            duracao_ms = int((time.perf_counter() - inicio) * 1000)
            log_evento(
                log, logging.INFO, "SKILL", "skill concluída",
                fase="concluido", duracao_ms=duracao_ms,
                provedor=provedor_usado, modelo=modelo_usado,
                campos_saida=list(saida.keys()) if isinstance(saida, dict) else None,
            )
            return ResultadoExecucao(
                sucesso=True,
                execucao_id=execucao_id,
                dados=saida,
                mensagens=[],
                metricas=Metricas(
                    provedor=provedor_usado,
                    tokens_in=metricas_dict.get("tokens_in"),
                    tokens_out=metricas_dict.get("tokens_out"),
                    custo=metricas_dict.get("custo"),
                    latencia_ms=metricas_dict.get("latencia_ms"),
                ),
            )
        except Exception as exc:
            duracao_ms = int((time.perf_counter() - inicio) * 1000)
            tb_frames = traceback.extract_tb(exc.__traceback__)
            origem = tb_frames[-1] if tb_frames else None
            log_evento(
                log, logging.ERROR, "ERRO",
                f"skill {comando.alvo} falhou na fase '{fase}'",
                tipo=type(exc).__name__,
                mensagem=str(exc)[:400],
                arquivo=(origem.filename if origem else None),
                funcao=(origem.name if origem else None),
                linha=(origem.lineno if origem else None),
                fase=fase,
                provedor=provedor_usado,
                modelo=modelo_usado,
                duracao_ms=duracao_ms,
            )
            log.error(
                "stacktrace skill %s:\n%s",
                comando.alvo,
                "".join(traceback.format_exception(type(exc), exc, exc.__traceback__)),
            )
            return ResultadoExecucao(
                sucesso=False,
                execucao_id=execucao_id,
                erro=ErroExecucao(codigo=type(exc).__name__, mensagem=str(exc)),
            )
