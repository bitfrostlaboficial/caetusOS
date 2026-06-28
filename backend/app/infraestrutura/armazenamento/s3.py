"""Esqueleto S3 — não implementado no MVP. Mantém a interface estável."""
from app.infraestrutura.armazenamento.base import StorageBackend


class S3Storage(StorageBackend):
    def salvar(self, caminho: str, conteudo: bytes) -> str:
        raise NotImplementedError("S3Storage será implementado em fase posterior")

    def ler(self, caminho: str) -> bytes:
        raise NotImplementedError

    def remover(self, caminho: str) -> None:
        raise NotImplementedError

    def existe(self, caminho: str) -> bool:
        raise NotImplementedError
