"""Modelos de persistência do monitoramento de provedores de IA (Fase 2)."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infraestrutura.banco.sessao import Base


class IAProviderHealth(Base):
    """Último estado conhecido de cada (provider, modelo)."""

    __tablename__ = "ia_provider_health"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    modelo: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(40), nullable=False, index=True)

    ultimo_check: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ultima_resposta: Mapped[str | None] = mapped_column(Text, nullable=True)

    codigo_http: Mapped[int | None] = mapped_column(Integer, nullable=True)
    erro: Mapped[str | None] = mapped_column(Text, nullable=True)

    acao_recomendada: Mapped[str | None] = mapped_column(Text, nullable=True)

    billing_ok: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    api_key_ok: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    termos_ok: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    modelo_disponivel: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    latencia_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ultima_alteracao_status: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    detalhes_jsonb: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class IAProviderHealthHistory(Base):
    """Histórico imutável: 1 registro por mudança de status."""

    __tablename__ = "ia_provider_health_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    modelo: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status_anterior: Mapped[str | None] = mapped_column(String(40), nullable=True)
    status_novo: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    codigo_http: Mapped[int | None] = mapped_column(Integer, nullable=True)
    erro: Mapped[str | None] = mapped_column(Text, nullable=True)
    acao_recomendada: Mapped[str | None] = mapped_column(Text, nullable=True)
    latencia_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    detalhes_jsonb: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    ocorrido_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
