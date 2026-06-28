"""Esqueleto Supabase Storage — não implementado no MVP."""
from app.infraestrutura.armazenamento.base import StorageBackend


class SupabaseStorage(StorageBackend):
    def salvar(self, caminho: str, conteudo: bytes) -> str:
        raise NotImplementedError

    def ler(self, caminho: str) -> bytes:
        raise NotImplementedError

    def remover(self, caminho: str) -> None:
        raise NotImplementedError

    def existe(self, caminho: str) -> bool:
        raise NotImplementedError
