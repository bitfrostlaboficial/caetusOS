from __future__ import annotations

from pathlib import Path

from app.configuracao import config
from app.infraestrutura.armazenamento.base import StorageBackend


class FilesystemStorage(StorageBackend):
    """Backend ativo no MVP. Mesma interface para S3/MinIO/Supabase (esqueletos)."""

    def __init__(self, raiz: str | None = None) -> None:
        self.raiz = Path(raiz or config.storage_root).resolve()
        self.raiz.mkdir(parents=True, exist_ok=True)

    def _caminho_absoluto(self, caminho: str) -> Path:
        # impede path traversal
        destino = (self.raiz / caminho.lstrip("/")).resolve()
        if not str(destino).startswith(str(self.raiz)):
            raise ValueError("caminho fora da raiz de storage")
        return destino

    def salvar(self, caminho: str, conteudo: bytes) -> str:
        destino = self._caminho_absoluto(caminho)
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_bytes(conteudo)
        return caminho

    def ler(self, caminho: str) -> bytes:
        return self._caminho_absoluto(caminho).read_bytes()

    def remover(self, caminho: str) -> None:
        destino = self._caminho_absoluto(caminho)
        if destino.exists():
            destino.unlink()

    def existe(self, caminho: str) -> bool:
        return self._caminho_absoluto(caminho).exists()


def obter_storage() -> StorageBackend:
    backend = config.storage_backend.lower()
    if backend == "filesystem":
        return FilesystemStorage()
    raise NotImplementedError(f"backend de storage '{backend}' não implementado no MVP")
