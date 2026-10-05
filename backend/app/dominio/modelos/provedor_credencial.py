from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infraestrutura.banco.sessao import Base


class ProvedorCredencial(Base):
    """Credenciais de IA de UMA empresa para UM provedor (BYOK).

    `campos_cifrados` guarda o JSON dos campos (ex.: {"api_key": ...}) cifrado pelo cofre.
    `mascara` guarda só as versões mascaradas (seguras para exibir).
    """

    __tablename__ = "provedor_credenciais"
    __table_args__ = (UniqueConstraint("empresa_id", "provedor", name="uq_credencial_empresa_provedor"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provedor: Mapped[str] = mapped_column(String(40), nullable=False)
    campos_cifrados: Mapped[str] = mapped_column(Text, nullable=False)
    mascara: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    modelo_preferido: Mapped[str | None] = mapped_column(String(160), nullable=True)
    prioridade: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    testada_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status_teste: Mapped[str | None] = mapped_column(String(20), nullable=True)
    mensagem_teste: Mapped[str | None] = mapped_column(Text, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
