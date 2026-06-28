from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infraestrutura.banco.sessao import Base


class IdentidadeEmpresa(Base):
    __tablename__ = "identidade_empresa"

    empresa_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("empresas.id", ondelete="CASCADE"), primary_key=True
    )
    cores_jsonb: Mapped[dict] = mapped_column(JSONB().with_variant(JSON(), "sqlite"), default=dict)
    fontes_jsonb: Mapped[dict] = mapped_column(JSONB().with_variant(JSON(), "sqlite"), default=dict)
    tom_de_voz: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    logo_caminho: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    manual_caminho: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
