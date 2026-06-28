"""StorageBackend — contrato único de I/O (§1 regra 5)."""
from __future__ import annotations

from abc import ABC, abstractmethod


class StorageBackend(ABC):
    @abstractmethod
    def salvar(self, caminho: str, conteudo: bytes) -> str:
        """Persiste bytes e retorna o caminho canônico (igual ao recebido)."""

    @abstractmethod
    def ler(self, caminho: str) -> bytes: ...

    @abstractmethod
    def remover(self, caminho: str) -> None: ...

    @abstractmethod
    def existe(self, caminho: str) -> bool: ...
