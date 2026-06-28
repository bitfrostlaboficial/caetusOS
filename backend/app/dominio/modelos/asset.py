from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, BigInteger, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infraestrutura.banco.sessao import Base


class Asset(Base):
    """Modelo unificado (§6) — categoria + origem + escopo."""

    __tablename__ = "assets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True
    )
    projeto_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projetos.id", ondelete="CASCADE"), nullable=True, index=True
    )
    categoria: Mapped[str] = mapped_column(String(40), nullable=False)
    # LOGO | IMAGEM | VIDEO | AUDIO | PDF | FONTE | TEMPLATE | UPLOAD | MOCKUP | ICONE
    origem: Mapped[str] = mapped_column(String(20), nullable=False, default="UPLOAD")
    # UPLOAD | GERADO | IMPORTADO
    escopo: Mapped[str] = mapped_column(String(20), nullable=False, default="empresa")
    # empresa | projeto
    caminho_storage: Mapped[str] = mapped_column(String(1024), nullable=False)
    mime: Mapped[str | None] = mapped_column(String(160), nullable=True)
    tamanho: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    metadados_jsonb: Mapped[dict] = mapped_column(JSONB().with_variant(JSON(), "sqlite"), default=dict)
    criado_por: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
