def test_registrar_cria_empresa_e_tokens(client):
    r = client.post(
        "/v1/auth/registrar",
        json={"nome_empresa": "Acme", "email": "a@acme.com", "senha": "senha-forte-123"},
    )
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["access_token"] and corpo["refresh_token"] and corpo["empresa_id"]


def test_login_com_credenciais_corretas(client, criar_conta):
    conta = criar_conta()
    r = client.post("/v1/auth/login", json={"email": conta.email, "senha": conta.senha})
    assert r.status_code == 200, r.text
    assert r.json()["empresa_id"] == conta.empresa_id


def test_login_com_senha_errada_retorna_401(client, criar_conta):
    conta = criar_conta()
    r = client.post("/v1/auth/login", json={"email": conta.email, "senha": "errada-errada"})
    assert r.status_code == 401


def test_login_com_email_inexistente_retorna_401(client):
    r = client.post("/v1/auth/login", json={"email": "ninguem@x.com", "senha": "qualquer-senha"})
    assert r.status_code == 401


def test_refresh_rotaciona_e_invalida_o_antigo(client, criar_conta):
    conta = criar_conta()
    r1 = client.post("/v1/auth/refresh", json={"refresh_token": conta.refresh})
    assert r1.status_code == 200, r1.text
    novo = r1.json()["refresh_token"]
    assert novo != conta.refresh
    # o antigo foi revogado
    r2 = client.post("/v1/auth/refresh", json={"refresh_token": conta.refresh})
    assert r2.status_code == 401
    # o novo funciona
    r3 = client.post("/v1/auth/refresh", json={"refresh_token": novo})
    assert r3.status_code == 200


def test_rota_protegida_sem_token_retorna_401(client):
    assert client.get("/v1/empresas/me").status_code == 401


def test_token_adulterado_retorna_401(client, criar_conta):
    conta = criar_conta()
    r = client.get("/v1/empresas/me", headers={"Authorization": f"Bearer {conta.access}x"})
    assert r.status_code == 401
