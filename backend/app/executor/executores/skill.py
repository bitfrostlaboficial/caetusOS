from __future__ import annotations

import uuid

from app.executor.comando import Comando
from app.executor.executores.base import Contexto, ExecutorEspecifico
from app.executor.resultado import ErroExecucao, Metricas, ResultadoExecucao
from app.habilidades.registro import obter as obter_habilidade


class ExecutorSkill(ExecutorEspecifico):
    """Único ExecutorEspecifico registrado no MVP (§4, §11)."""

    def executar(self, comando: Comando, contexto: Contexto) -> ResultadoExecucao:
        execucao_id = uuid.uuid4()
        try:
            habilidade = obter_habilidade(comando.alvo)
            saida = habilidade.executar(comando.entrada, contexto)
            metricas_dict = saida.pop("_metricas", {}) or {}
            return ResultadoExecucao(
                sucesso=True,
                execucao_id=execucao_id,
                dados=saida,
                mensagens=[],
                metricas=Metricas(
                    provedor=metricas_dict.get("provedor"),
                    tokens_in=metricas_dict.get("tokens_in"),
                    tokens_out=metricas_dict.get("tokens_out"),
                    custo=metricas_dict.get("custo"),
                    latencia_ms=metricas_dict.get("latencia_ms"),
                ),
            )
        except Exception as exc:
            return ResultadoExecucao(
                sucesso=False,
                execucao_id=execucao_id,
                erro=ErroExecucao(codigo=type(exc).__name__, mensagem=str(exc)),
            )
