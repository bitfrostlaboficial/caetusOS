"""Fase 4 — telemetria das execuções de IA.

Revision ID: 0003_ia_execucoes
Revises: 0002_ia_health
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0003_ia_execucoes"
down_revision = "0002_ia_health"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ia_execucoes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("empresa_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("provider", sa.String(60), nullable=False),
        sa.Column("modelo", sa.String(120), nullable=True),
        sa.Column("habilidade", sa.String(120), nullable=True),
        sa.Column("pipeline", sa.String(60), nullable=True),
        sa.Column("prompt_hash", sa.String(64), nullable=True),
        sa.Column("prompt", sa.Text(), nullable=True),
        sa.Column("inicio_execucao", sa.DateTime(timezone=True), nullable=False),
        sa.Column("fim_execucao", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duracao_ms", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("erro", sa.Text(), nullable=True),
        sa.Column("input_tokens", sa.Integer(), nullable=True),
        sa.Column("output_tokens", sa.Integer(), nullable=True),
        sa.Column("total_tokens", sa.Integer(), nullable=True),
        sa.Column("custo_estimado", sa.Float(), nullable=True),
        sa.Column("request_id", sa.String(120), nullable=True),
        sa.Column("metadata_json", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_ia_exec_provider", "ia_execucoes", ["provider"])
    op.create_index("ix_ia_exec_status", "ia_execucoes", ["status"])
    op.create_index("ix_ia_exec_empresa", "ia_execucoes", ["empresa_id"])
    op.create_index("ix_ia_exec_modelo", "ia_execucoes", ["modelo"])
    op.create_index("ix_ia_exec_habilidade", "ia_execucoes", ["habilidade"])
    op.create_index("ix_ia_exec_created_at", "ia_execucoes", ["created_at"])

    op.create_table(
        "ia_execucao_eventos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "execucao_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("ia_execucoes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("tipo", sa.String(60), nullable=False),
        sa.Column("mensagem", sa.Text(), nullable=True),
        sa.Column("payload_json", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("ocorrido_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_ia_exec_eventos_execucao", "ia_execucao_eventos", ["execucao_id"])
    op.create_index("ix_ia_exec_eventos_tipo", "ia_execucao_eventos", ["tipo"])


def downgrade() -> None:
    op.drop_table("ia_execucao_eventos")
    op.drop_table("ia_execucoes")
