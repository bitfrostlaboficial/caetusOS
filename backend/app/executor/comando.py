from __future__ import annotations

import uuid
from dataclasses import dataclass, field

from app.executor.tipos import Origem, TipoComando

SCHEMA_VERSION_ATUAL = 1


@dataclass
class Comando:
    """Contrato único de entrada do Executor (§5)."""

    tipo: TipoComando
    alvo: str
    entrada: dict
    empresa_id: uuid.UUID
    usuario_id: uuid.UUID
    origem: Origem = Origem.WEB
    projeto_id: uuid.UUID | None = None
    correlacao_id: uuid.UUID = field(default_factory=uuid.uuid4)
    schema_version: int = SCHEMA_VERSION_ATUAL
