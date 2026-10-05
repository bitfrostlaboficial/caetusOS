import uuid

import pytest

INFRA = "/v1/infraestrutura/ia"


# ───────── Telemetria de IA é por empresa ─────────
def test_execucoes_de_ia_so_da_propria_empresa(criar_conta, inserir_exec_ia):
    a = criar_conta("A", "a@a.com")
    b = criar_conta("B", "b@b.com")
    id_a = inserir_exec_ia(a.empresa_id)
    inserir_exec_ia(b.empresa_id)

    lista_b = b.get(f"{INFRA}/executions").json()
    assert len(lista_b) == 1
    assert all(x["empresa_id"] == b.empresa_id for x in lista_b)
    # detalhe de execução alheia não pode ser lido
    assert b.get(f"{INFRA}/executions/{id_a}").status_code == 404
    assert a.get(f"{INFRA}/executions/{id_a}").status_code == 200


def test_metricas_de_ia_so_da_propria_empresa(criar_conta, inserir_exec_ia):
    a = criar_conta("A", "a@a.com")
    b = criar_conta("B", "b@b.com")
    for _ in range(3):
        inserir_exec_ia(a.empresa_id, provider="gemini")
    metricas_b = b.get(f"{INFRA}/metrics").json()
    assert metricas_b["hoje"]["execucoes"] == 0
    assert metricas_b["hoje"].get("empresa_mais_ativa") is None
    assert b.get(f"{INFRA}/providers/ranking").json()["providers"] == []
    assert b.get(f"{INFRA}/models").json() == []
    assert a.get(f"{INFRA}/metrics").json()["hoje"]["execucoes"] == 3
    assert a.get(f"{INFRA}/models").json()[0]["execucoes"] == 3


# ───────── Operações de plataforma exigem admin da plataforma ─────────
ADMIN_GET = [INFRA, f"{INFRA}/history", f"{INFRA}/fallbacks", f"{INFRA}/metricas", f"{INFRA}/perfis",
             "/v1/ia/providers", "/v1/ia/providers/health", "/v1/ia/providers/groq"]
ADMIN_POST = [
    (f"{INFRA}/check", None),
    (f"{INFRA}/modo", {"modo": "manual"}),
    (f"{INFRA}/benchmark", {"prompt": "oi", "providers": ["groq"]}),
    ("/v1/ia/providers/health/check", None),
]


@pytest.mark.parametrize("url", ADMIN_GET)
def test_leituras_de_plataforma_negadas_a_usuario_comum(criar_conta, url):
    assert criar_conta().get(url).status_code == 403


@pytest.mark.parametrize("url,corpo", ADMIN_POST)
def test_acoes_de_plataforma_negadas_a_usuario_comum(criar_conta, url, corpo):
    r = criar_conta().post(url, json=corpo) if corpo else criar_conta().post(url)
    assert r.status_code == 403


def test_usuario_comum_nao_altera_o_modo_global(criar_conta):
    from app.ia import perfis

    antes = perfis.modo()
    criar_conta().post(f"{INFRA}/modo", json={"modo": "manual"})
    assert perfis.modo() == antes


def test_admin_da_plataforma_acessa_endpoints_de_plataforma(admin_plataforma):
    assert admin_plataforma.get(INFRA).status_code == 200
    assert admin_plataforma.get("/v1/ia/providers").status_code == 200


def test_catalogos_estaticos_continuam_abertos_a_usuarios(criar_conta):
    conta = criar_conta()
    for url in (f"{INFRA}/catalogo", f"{INFRA}/missoes", f"{INFRA}/categorias"):
        assert conta.get(url).status_code == 200, url


# ───────── projeto_id de outra empresa ─────────
def test_comando_com_projeto_de_outra_empresa_retorna_404(criar_conta, ia_falsa):
    a = criar_conta("A", "a@a.com")
    b = criar_conta("B", "b@b.com")
    projeto_a = a.get("/v1/projetos").json()[0]["id"]
    corpo = {"alvo": "conteudo.criar_post", "entrada": {"tema": "x"}}
    assert b.post("/v1/comandos/executar", json={**corpo, "projeto_id": projeto_a}).status_code == 404
    assert b.post("/v1/comandos/executar", json={**corpo, "projeto_id": str(uuid.uuid4())}).status_code == 404
    # o próprio projeto funciona
    assert a.post("/v1/comandos/executar", json={**corpo, "projeto_id": projeto_a}).status_code == 200


def test_auth_me_informa_se_e_admin_da_plataforma(criar_conta, admin_plataforma):
    comum = criar_conta("Outra", "comum@x.com")
    assert comum.get("/v1/auth/me").json()["admin_plataforma"] is False
    assert admin_plataforma.get("/v1/auth/me").json()["admin_plataforma"] is True
