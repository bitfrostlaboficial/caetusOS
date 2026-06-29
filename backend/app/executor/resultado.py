from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class AssetRef:
    id: uuid.UUID
    categoria: str
    caminho_storage: str
    mime: str | None = None


@dataclass
class Metricas:
    provedor: str | None = None
    modelo: str | None = None
    tokens_in: int | None = None
    tokens_out: int | None = None
    custo: float | None = None
    latencia_ms: int | None = None


@dataclass
class EventoExecucao:
    """Ação observável durante a execução — compõe o Relatório de Execução.

    Cada habilidade pode registrar quantos eventos quiser via
    `contexto.registrar_evento(...)`. O frontend não precisa conhecer a skill:
    basta renderizar a lista.
    """

    tipo: str  # ex.: "ia.resposta", "arquivo.criado", "banco.atualizado", "ia.fallback"
    titulo: str
    detalhes: dict[str, Any] = field(default_factory=dict)
    nivel: str = "info"  # info | sucesso | aviso | erro
    ocorrido_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class ErroExecucao:
    codigo: str
    mensagem: str


@dataclass
class ResultadoExecucao:
    """Contrato único de saída do Executor (§5)."""

    sucesso: bool
    execucao_id: uuid.UUID
    dados: dict | None = None
    mensagens: list[str] = field(default_factory=list)
    arquivos: list[AssetRef] = field(default_factory=list)
    metricas: Metricas = field(default_factory=Metricas)
    eventos: list["EventoExecucao"] = field(default_factory=list)
    erro: ErroExecucao | None = None
