from __future__ import annotations

import uuid
from dataclasses import dataclass, field


@dataclass
class AssetRef:
    id: uuid.UUID
    categoria: str
    caminho_storage: str
    mime: str | None = None


@dataclass
class Metricas:
    provedor: str | None = None
    tokens_in: int | None = None
    tokens_out: int | None = None
    custo: float | None = None
    latencia_ms: int | None = None


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
    erro: ErroExecucao | None = None
