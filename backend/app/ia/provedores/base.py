from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class RespostaIA:
    texto: str
    provedor: str
    tokens_in: int = 0
    tokens_out: int = 0
    custo: float = 0.0


class ProvedorIA(ABC):
    nome: str

    @abstractmethod
    def gerar_texto(self, prompt: str, *, max_tokens: int = 1024) -> RespostaIA: ...
