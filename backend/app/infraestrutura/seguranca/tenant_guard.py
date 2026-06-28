"""Tenant guard — garante que recursos pertencem à empresa do usuário autenticado."""
import uuid

from app.dominio.erros import NaoAutorizado


def garantir_mesma_empresa(esperada: uuid.UUID, recebida: uuid.UUID) -> None:
    if esperada != recebida:
        raise NaoAutorizado("recurso fora da empresa do usuário")
