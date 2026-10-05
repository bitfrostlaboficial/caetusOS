from __future__ import annotations

import re
from pathlib import Path

from app.configuracao import config
from app.infraestrutura.armazenamento.base import StorageBackend


_NOME_MAX = 150


def nome_seguro(nome: str | None) -> str:
    """Nome de arquivo vindo do usuário → seguro para compor um caminho.

    Remove diretórios (`/` e `\\`), caracteres de controle e nomes vazios/`..`; limita o
    tamanho preservando a extensão.
    """
    base = re.split(r"[\\/]", nome or "")[-1]
    base = re.sub(r"[\x00-\x1f\x7f]", "", base).strip().strip(".")
    if not base:
        return "arquivo"
    if len(base) > _NOME_MAX:
        raiz, ponto, ext = base.rpartition(".")
        ext = ext if ponto and len(ext) <= 10 else ""
        base = base[: _NOME_MAX - len(ext) - (1 if ext else 0)] + (f".{ext}" if ext else "")
    return base


class FilesystemStorage(StorageBackend):
    """Backend ativo no MVP. Mesma interface para S3/MinIO/Supabase (esqueletos)."""

    def __init__(self, raiz: str | None = None) -> None:
        self.raiz = Path(raiz or config.storage_root).resolve()
        self.raiz.mkdir(parents=True, exist_ok=True)

    def _caminho_absoluto(self, caminho: str) -> Path:
        # impede path traversal
        destino = (self.raiz / caminho.lstrip("/")).resolve()
        # is_relative_to (e não startswith): "/data/storage_x" NÃO está dentro de "/data/storage".
        if not destino.is_relative_to(self.raiz):
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
