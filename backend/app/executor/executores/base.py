from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from app.executor.comando import Comando
from app.executor.resultado import EventoExecucao, ResultadoExecucao
from abc import ABC, abstractmethod


@dataclass
class Contexto:
    """Pacote pronto que o ContextBuilder entrega à habilidade.

    Habilidades NÃO leem banco nem Storage diretamente (§1 regra 4).

    `eventos`: lista mutável onde a habilidade registra ações realizadas
    (arquivos criados, APIs chamadas, banco atualizado etc.). O Executor
    coleta esses eventos no Resultado final → Relatório de Execução.
    """

    identidade: dict = field(default_factory=dict)
    conhecimento: list[dict] = field(default_factory=list)
    memoria: list[dict] = field(default_factory=list)
    assets: list[dict] = field(default_factory=list)
    historico_recente: list[dict] = field(default_factory=list)
    extras: dict[str, Any] = field(default_factory=dict)
    eventos: list[EventoExecucao] = field(default_factory=list)

    def registrar_evento(
        self,
        tipo: str,
        titulo: str,
        *,
        nivel: str = "info",
        **detalhes: Any,
    ) -> EventoExecucao:
        ev = EventoExecucao(
            tipo=tipo,
            titulo=titulo,
            nivel=nivel,
            detalhes=detalhes,
            ocorrido_em=datetime.now(timezone.utc),
        )
        self.eventos.append(ev)
        return ev


class ExecutorEspecifico(ABC):
    """Implementação por TipoComando (skill, futuro: fluxo, funcionário...)."""

    @abstractmethod
    def executar(self, comando: Comando, contexto: Contexto) -> ResultadoExecucao: ...
