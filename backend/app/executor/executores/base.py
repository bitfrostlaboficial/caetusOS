from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from app.executor.comando import Comando
from app.executor.resultado import ResultadoExecucao


@dataclass
class Contexto:
    """Pacote pronto que o ContextBuilder entrega à habilidade.

    Habilidades NÃO leem banco nem Storage diretamente (§1 regra 4).
    """

    identidade: dict = field(default_factory=dict)
    conhecimento: list[dict] = field(default_factory=list)
    memoria: list[dict] = field(default_factory=list)
    assets: list[dict] = field(default_factory=list)
    historico_recente: list[dict] = field(default_factory=list)
    extras: dict[str, Any] = field(default_factory=dict)


class ExecutorEspecifico(ABC):
    """Implementação por TipoComando (skill, futuro: fluxo, funcionário...)."""

    @abstractmethod
    def executar(self, comando: Comando, contexto: Contexto) -> ResultadoExecucao: ...
