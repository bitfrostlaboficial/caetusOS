"""BYOK — credenciais de provedores de IA por empresa (cifradas).

Revision ID: 0004_provedor_credenciais
Revises: 0003_ia_execucoes
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0004_provedor_credenciais"
down_revision = "0003_ia_execucoes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "provedor_credenciais",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "empresa_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("empresas.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("provedor", sa.String(40), nullable=False),
        sa.Column("campos_cifrados", sa.Text(), nullable=False),
        sa.Column("mascara", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("modelo_preferido", sa.String(160), nullable=True),
        sa.Column("prioridade", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("testada_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status_teste", sa.String(20), nullable=True),
        sa.Column("mensagem_teste", sa.Text(), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("empresa_id", "provedor", name="uq_credencial_empresa_provedor"),
    )
    op.create_index("ix_provedor_credenciais_empresa_id", "provedor_credenciais", ["empresa_id"])


def downgrade() -> None:
    op.drop_index("ix_provedor_credenciais_empresa_id", table_name="provedor_credenciais")
    op.drop_table("provedor_credenciais")
