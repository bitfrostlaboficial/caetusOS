"""Modelos de persistência da telemetria de IA (Fase 4)."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infraestrutura.banco.sessao import Base


class IAExecucao(Base):
    """Cada chamada feita pelo roteador, sucesso ou falha."""

    __tablename__ = "ia_execucoes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    empresa_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    usuario_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    provider: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    modelo: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)

    habilidade: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    pipeline: Mapped[str | None] = mapped_column(String(60), nullable=True)

    prompt_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    prompt: Mapped[str | None] = mapped_column(Text, nullable=True)

    inicio_execucao: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    fim_execucao: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duracao_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    erro: Mapped[str | None] = mapped_column(Text, nullable=True)

    input_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    custo_estimado: Mapped[float | None] = mapped_column(Float, nullable=True)

    request_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class IAExecucaoEvento(Base):
    """Eventos da timeline de uma execução: INICIO, PROVIDER_SELECIONADO, etc."""

    __tablename__ = "ia_execucao_eventos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    execucao_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ia_execucoes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tipo: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    mensagem: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    ocorrido_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
