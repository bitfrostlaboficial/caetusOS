from __future__ import annotations

from abc import ABC, abstractmethod

from app.executor.executores.base import Contexto


class Habilidade(ABC):
    """Contrato de toda habilidade. Recebe Contexto pronto (não toca em banco/storage)."""

    nome: str  # ex.: "conteudo.criar_post"
    dominio: str  # ex.: "conteudo" (usado pelo roteador)
    prompt_template: str  # ex.: "criar_post"
    prompt_version: int = 1

    # Manifesto (descoberta por UI/MCP): o que faz e que entrada aceita.
    titulo: str = ""
    descricao: str = ""
    usa_ia: bool = True
    entrada_schema: dict = {"type": "object", "properties": {}}

    def manifesto(self) -> dict:
        return {
            "nome": self.nome,
            "dominio": self.dominio,
            "titulo": self.titulo or self.nome,
            "descricao": self.descricao,
            "usa_ia": self.usa_ia,
            "entrada_schema": self.entrada_schema,
        }

    @abstractmethod
    def executar(self, entrada: dict, contexto: Contexto) -> dict:
        """Retorna um dict serializável (saída crua); o ExecutorSkill embala em ResultadoExecucao."""
