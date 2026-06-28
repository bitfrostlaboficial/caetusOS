"""Fase 2 — monitoramento de provedores de IA (health + history).

Revision ID: 0002_ia_health
Revises: 0001_inicial
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0002_ia_health"
down_revision = "0001_inicial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ia_provider_health",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("provider", sa.String(60), nullable=False),
        sa.Column("modelo", sa.String(120), nullable=True),
        sa.Column("status", sa.String(40), nullable=False),
        sa.Column("ultimo_check", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ultima_resposta", sa.Text(), nullable=True),
        sa.Column("codigo_http", sa.Integer(), nullable=True),
        sa.Column("erro", sa.Text(), nullable=True),
        sa.Column("acao_recomendada", sa.Text(), nullable=True),
        sa.Column("billing_ok", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("api_key_ok", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("termos_ok", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("modelo_disponivel", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("latencia_ms", sa.Integer(), nullable=True),
        sa.Column("ultima_alteracao_status", sa.DateTime(timezone=True), nullable=True),
        sa.Column("detalhes_jsonb", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_ia_health_provider", "ia_provider_health", ["provider"])
    op.create_index("ix_ia_health_status", "ia_provider_health", ["status"])
    op.create_unique_constraint(
        "uq_ia_health_provider_modelo", "ia_provider_health", ["provider", "modelo"]
    )

    op.create_table(
        "ia_provider_health_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("provider", sa.String(60), nullable=False),
        sa.Column("modelo", sa.String(120), nullable=True),
        sa.Column("status_anterior", sa.String(40), nullable=True),
        sa.Column("status_novo", sa.String(40), nullable=False),
        sa.Column("codigo_http", sa.Integer(), nullable=True),
        sa.Column("erro", sa.Text(), nullable=True),
        sa.Column("acao_recomendada", sa.Text(), nullable=True),
        sa.Column("latencia_ms", sa.Integer(), nullable=True),
        sa.Column("detalhes_jsonb", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("ocorrido_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_ia_history_provider", "ia_provider_health_history", ["provider"])
    op.create_index("ix_ia_history_status_novo", "ia_provider_health_history", ["status_novo"])
    op.create_index("ix_ia_history_ocorrido_em", "ia_provider_health_history", ["ocorrido_em"])


def downgrade() -> None:
    op.drop_table("ia_provider_health_history")
    op.drop_table("ia_provider_health")
