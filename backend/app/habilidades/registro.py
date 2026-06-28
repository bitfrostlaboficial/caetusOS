from __future__ import annotations

from app.dominio.erros import HabilidadeNaoRegistrada
from app.habilidades.base import Habilidade
from app.habilidades.conteudo.criar_post import CriarPost

_REGISTRO: dict[str, Habilidade] = {}


def registrar(habilidade: Habilidade) -> None:
    _REGISTRO[habilidade.nome] = habilidade


def obter(nome: str) -> Habilidade:
    if nome not in _REGISTRO:
        raise HabilidadeNaoRegistrada(f"habilidade '{nome}' não registrada")
    return _REGISTRO[nome]


def listar() -> list[str]:
    return sorted(_REGISTRO.keys())


# Registro explícito (sem autodiscovery, conforme §4).
registrar(CriarPost())
