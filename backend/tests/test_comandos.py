CRIAR_POST = "conteudo.criar_post"


def _executar(conta, alvo=CRIAR_POST, entrada=None, **extra):
    return conta.post(
        "/v1/comandos/executar", json={"alvo": alvo, "entrada": entrada or {}, **extra}
    )


def test_sucesso_retorna_200_e_grava_historico(criar_conta, ia_falsa):
    conta = criar_conta()
    r = _executar(conta, entrada={"tema": "Dia do café", "rede": "instagram"})
    assert r.status_code == 200, r.text
    corpo = r.json()
    assert corpo["sucesso"] is True and corpo["request_id"]
    hist = conta.get("/v1/historico").json()
    assert len(hist) == 1
    assert hist[0]["status"] == "sucesso"
    assert hist[0]["prompt_template"] == "criar_post" and hist[0]["prompt_version"] == 1


def test_campo_obrigatorio_ausente_retorna_422_e_fica_no_historico(criar_conta):
    conta = criar_conta()
    r = _executar(conta, entrada={})
    assert r.status_code == 422, r.text
    detalhe = r.json()["detail"]
    assert detalhe["sucesso"] is False
    assert detalhe["erro"]["codigo"] == "FaltaCampoObrigatorio"
    assert detalhe["request_id"]
    # a falha precisa aparecer no histórico (antes do fix era revertida pelo rollback)
    hist = conta.get("/v1/historico").json()
    assert len(hist) == 1 and hist[0]["status"] == "erro"
    assert "tema" in hist[0]["erro"]


def test_habilidade_inexistente_retorna_404(criar_conta):
    conta = criar_conta()
    r = _executar(conta, alvo="nao.existe")
    assert r.status_code == 404, r.text
    assert conta.get("/v1/historico").json() == []


def test_schema_version_nao_suportado_retorna_400(criar_conta):
    conta = criar_conta()
    r = _executar(conta, entrada={"tema": "x"}, schema_version=2)
    assert r.status_code == 400, r.text


def test_comando_exige_autenticacao(client):
    r = client.post("/v1/comandos/executar", json={"alvo": CRIAR_POST, "entrada": {"tema": "x"}})
    assert r.status_code == 401


def test_historico_e_isolado_por_empresa(criar_conta, ia_falsa):
    a = criar_conta("A", "a@a.com")
    b = criar_conta("B", "b@b.com")
    assert _executar(a, entrada={"tema": "segredo da A"}).status_code == 200
    assert b.get("/v1/historico").json() == []
    assert len(a.get("/v1/historico").json()) == 1
