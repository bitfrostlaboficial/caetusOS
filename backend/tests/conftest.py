"""Fixtures de teste — exigem um PostgreSQL (o schema usa JSONB/UUID nativos).

Defina `TEST_DATABASE_URL` (ex.: postgresql+psycopg://user:pass@localhost:5432/caetus_test).
O banco é migrado com Alembic uma vez por sessão e truncado entre testes.
"""
from __future__ import annotations

import os
import tempfile

import pytest

_TEST_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://empresa_ia:empresa_ia@localhost:5432/caetus_test",
)

# Precisa vir ANTES de importar `app` (a configuração é lida na importação).
os.environ["DATABASE_URL"] = _TEST_URL
os.environ["JWT_SECRET"] = "t" * 48
os.environ["STORAGE_ROOT"] = tempfile.mkdtemp(prefix="caetus-test-storage-")
os.environ["IA_HEALTH_SCHEDULER_ENABLED"] = "false"
os.environ["DEBUG"] = "false"
from cryptography.fernet import Fernet  # noqa: E402

os.environ["CREDENCIAIS_MASTER_KEY"] = Fernet.generate_key().decode()
# Garante que testes nunca chamem provedores reais, mesmo com .env local.
for _var in (
    "GEMINI_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY", "HUGGINGFACE_API_KEY",
    "FAL_KEY", "REPLICATE_API_KEY", "INSTAGRAM_ACCESS_TOKEN",
):
    os.environ[_var] = ""

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.infraestrutura.banco.sessao import Base, engine  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _banco_migrado():
    cfg = Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
    cfg.set_main_option(
        "script_location",
        os.path.join(os.path.dirname(__file__), "..", "app", "infraestrutura", "banco", "migracoes"),
    )
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
    command.upgrade(cfg, "head")
    yield


@pytest.fixture(autouse=True)
def _limpar_banco(_banco_migrado):
    yield
    tabelas = ", ".join(f'"{t.name}"' for t in Base.metadata.sorted_tables)
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {tabelas} RESTART IDENTITY CASCADE"))
        conn.execute(text("TRUNCATE ia_execucao_eventos, ia_execucoes CASCADE"))


@pytest.fixture()
def client():
    from app.main import app

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


class Conta:
    """Usuário autenticado de uma empresa de teste."""

    def __init__(self, client: TestClient, dados: dict, email: str, senha: str):
        self.client = client
        self.email = email
        self.senha = senha
        self.empresa_id = dados["empresa_id"]
        self.usuario_id = dados["usuario_id"]
        self.access = dados["access_token"]
        self.refresh = dados["refresh_token"]

    @property
    def headers(self) -> dict:
        return {"Authorization": f"Bearer {self.access}"}

    def get(self, url, **kw):
        return self.client.get(url, headers=self.headers, **kw)

    def post(self, url, **kw):
        return self.client.post(url, headers=self.headers, **kw)

    def put(self, url, **kw):
        return self.client.put(url, headers=self.headers, **kw)

    def delete(self, url, **kw):
        return self.client.delete(url, headers=self.headers, **kw)


@pytest.fixture()
def criar_conta(client):
    def _criar(nome: str = "Empresa Teste", email: str = "dono@teste.com", senha: str = "senha-forte-123"):
        r = client.post(
            "/v1/auth/registrar",
            json={"nome_empresa": nome, "email": email, "senha": senha},
        )
        assert r.status_code == 200, r.text
        return Conta(client, r.json(), email, senha)

    return _criar


@pytest.fixture()
def ia_falsa(monkeypatch):
    """Substitui `executar_missao` do pipeline de post por respostas determinísticas."""
    import json

    from app.habilidades.conteudo import pipeline_post
    from app.ia.provedores.base import RespostaIA

    chamadas: list[str] = []

    def _falso(nome_missao, prompt, **kwargs):
        chamadas.append(nome_missao)
        if nome_missao == "criar_post":
            texto = json.dumps(
                {
                    "titulo": "Dia do café",
                    "legenda": "Legenda de teste",
                    "hashtags": ["#cafe"],
                    "cta": "Compre já",
                    "prompt_visual": {"cenario": "xícara de café"},
                }
            )
            return RespostaIA(texto=texto, provedor="fake", modelo="fake-1", tokens_in=10, tokens_out=20)
        return RespostaIA(texto="sem url", provedor="fake-img", modelo="fake-img-1")

    monkeypatch.setattr(pipeline_post, "executar_missao", _falso)
    return chamadas


@pytest.fixture()
def admin_plataforma(monkeypatch, criar_conta):
    """Conta cujo e-mail está em PLATFORM_ADMIN_EMAILS."""
    from app.configuracao import config

    monkeypatch.setattr(config, "platform_admin_emails", "admin@caetus.com")
    return criar_conta("Caetus", "admin@caetus.com")


@pytest.fixture()
def inserir_exec_ia():
    """Insere uma linha de telemetria de IA para uma empresa (sem chamar provedor)."""
    import uuid
    from datetime import datetime, timezone

    from app.dominio.modelos.ia_execucao import IAExecucao
    from app.infraestrutura.banco.sessao import SessionLocal

    def _inserir(empresa_id: str, provider: str = "groq", status: str = "sucesso") -> str:
        with SessionLocal() as s:
            ex = IAExecucao(
                id=uuid.uuid4(),
                empresa_id=uuid.UUID(empresa_id),
                provider=provider,
                modelo="m1",
                habilidade="criar_post",
                inicio_execucao=datetime.now(timezone.utc),
                status=status,
                metadata_json={},
            )
            s.add(ex)
            s.commit()
            return str(ex.id)

    return _inserir
