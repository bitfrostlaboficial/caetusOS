"""inicial — 8 tabelas (v6.1)

Revision ID: 0001_inicial
Revises:
Create Date: 2026-06-28
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001_inicial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "empresas",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("nome", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(120), nullable=False, unique=True),
        sa.Column("configuracao_jsonb", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "projetos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("empresa_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("nome", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(120), nullable=False),
        sa.Column("eh_raiz", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("empresa_id", "slug", name="uq_projetos_empresa_slug"),
    )
    op.create_index("ix_projetos_empresa_id", "projetos", ["empresa_id"])

    op.create_table(
        "usuarios",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("empresa_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("senha_hash", sa.String(512), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("empresa_id", "email", name="uq_usuarios_empresa_email"),
    )
    op.create_index("ix_usuarios_empresa_id", "usuarios", ["empresa_id"])
    op.create_index("ix_usuarios_email", "usuarios", ["email"])

    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("hash", sa.String(512), nullable=False),
        sa.Column("expira_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revogado_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_refresh_tokens_hash", "refresh_tokens", ["hash"])
    op.create_index("ix_refresh_tokens_usuario_id", "refresh_tokens", ["usuario_id"])

    op.create_table(
        "identidade_empresa",
        sa.Column("empresa_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("empresas.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("cores_jsonb", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("fontes_jsonb", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("tom_de_voz", sa.String(2000), nullable=True),
        sa.Column("logo_caminho", sa.String(1024), nullable=True),
        sa.Column("manual_caminho", sa.String(1024), nullable=True),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "documentos_conhecimento",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("empresa_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tipo", sa.String(60), nullable=False),
        sa.Column("caminho_storage", sa.String(1024), nullable=False),
        sa.Column("hash", sa.String(128), nullable=False),
        sa.Column("versao", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("data_upload", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_documentos_conhecimento_empresa_id", "documentos_conhecimento", ["empresa_id"])

    op.create_table(
        "memoria_itens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("empresa_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("projeto_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projetos.id", ondelete="CASCADE"), nullable=True),
        sa.Column("tipo", sa.String(60), nullable=False),
        sa.Column("conteudo", sa.Text(), nullable=False),
        sa.Column("peso", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("origem", sa.String(60), nullable=False, server_default="manual"),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_memoria_itens_empresa_id", "memoria_itens", ["empresa_id"])
    op.create_index("ix_memoria_itens_projeto_id", "memoria_itens", ["projeto_id"])

    op.create_table(
        "assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("empresa_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("projeto_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projetos.id", ondelete="CASCADE"), nullable=True),
        sa.Column("categoria", sa.String(40), nullable=False),
        sa.Column("origem", sa.String(20), nullable=False, server_default="UPLOAD"),
        sa.Column("escopo", sa.String(20), nullable=False, server_default="empresa"),
        sa.Column("caminho_storage", sa.String(1024), nullable=False),
        sa.Column("mime", sa.String(160), nullable=True),
        sa.Column("tamanho", sa.BigInteger(), nullable=True),
        sa.Column("metadados_jsonb", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("criado_por", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_assets_empresa_id", "assets", ["empresa_id"])
    op.create_index("ix_assets_projeto_id", "assets", ["projeto_id"])

    op.create_table(
        "execucoes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("empresa_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("projeto_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projetos.id", ondelete="CASCADE"), nullable=False),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("tipo_comando", sa.String(40), nullable=False),
        sa.Column("alvo", sa.String(120), nullable=False),
        sa.Column("origem", sa.String(40), nullable=False),
        sa.Column("correlacao_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("schema_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("entrada_jsonb", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("saida_jsonb", postgresql.JSONB(), nullable=True),
        sa.Column("provedor", sa.String(40), nullable=True),
        sa.Column("custo", sa.Float(), nullable=True),
        sa.Column("tokens_in", sa.Integer(), nullable=True),
        sa.Column("tokens_out", sa.Integer(), nullable=True),
        sa.Column("latencia_ms", sa.Integer(), nullable=True),
        sa.Column("prompt_template", sa.String(120), nullable=True),
        sa.Column("prompt_version", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="sucesso"),
        sa.Column("erro", sa.Text(), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_execucoes_empresa_id", "execucoes", ["empresa_id"])
    op.create_index("ix_execucoes_projeto_id", "execucoes", ["projeto_id"])
    op.create_index("ix_execucoes_criado_em", "execucoes", ["criado_em"])


def downgrade() -> None:
    for tbl in [
        "execucoes",
        "assets",
        "memoria_itens",
        "documentos_conhecimento",
        "identidade_empresa",
        "refresh_tokens",
        "usuarios",
        "projetos",
        "empresas",
    ]:
        op.drop_table(tbl)
