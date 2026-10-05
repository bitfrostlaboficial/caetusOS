def test_identidade_salvar_e_ler(criar_conta):
    conta = criar_conta()
    vazio = conta.get("/v1/identidade").json()
    assert vazio["cores"] == {} and vazio["tom_de_voz"] is None
    r = conta.put(
        "/v1/identidade",
        json={"tom_de_voz": "descontraído", "cores": {"primaria": "#ff0000"}, "fontes": {"titulo": "Sora"}},
    )
    assert r.status_code == 200
    ident = conta.get("/v1/identidade").json()
    assert ident["tom_de_voz"] == "descontraído"
    assert ident["cores"] == {"primaria": "#ff0000"} and ident["fontes"] == {"titulo": "Sora"}
    # atualização parcial preserva o resto
    conta.put("/v1/identidade", json={"tom_de_voz": "formal"})
    ident = conta.get("/v1/identidade").json()
    assert ident["tom_de_voz"] == "formal" and ident["cores"] == {"primaria": "#ff0000"}


def test_identidade_isolada_por_empresa(criar_conta):
    a = criar_conta("A", "a@a.com")
    b = criar_conta("B", "b@b.com")
    a.put("/v1/identidade", json={"tom_de_voz": "segredo da A"})
    assert b.get("/v1/identidade").json()["tom_de_voz"] is None


def test_memoria_crud_e_ordem_por_peso(criar_conta):
    conta = criar_conta()
    conta.post("/v1/memoria", json={"tipo": "regra", "conteudo": "baixa", "peso": 1})
    conta.post("/v1/memoria", json={"tipo": "regra", "conteudo": "alta", "peso": 5})
    itens = conta.get("/v1/memoria").json()
    assert [i["conteudo"] for i in itens] == ["alta", "baixa"]
    assert conta.delete(f"/v1/memoria/{itens[0]['id']}").status_code == 200
    assert [i["conteudo"] for i in conta.get("/v1/memoria").json()] == ["baixa"]


def test_memoria_isolada_e_nao_removivel_por_outra_empresa(criar_conta):
    a = criar_conta("A", "a@a.com")
    b = criar_conta("B", "b@b.com")
    item = a.post("/v1/memoria", json={"tipo": "fato", "conteudo": "da A"}).json()
    assert b.get("/v1/memoria").json() == []
    b.delete(f"/v1/memoria/{item['id']}")
    assert [i["conteudo"] for i in a.get("/v1/memoria").json()] == ["da A"]


def test_memoria_alimenta_o_contexto(criar_conta):
    import uuid

    from app.ia.context_builder.fontes.memoria import carregar_memoria
    from app.infraestrutura.banco.sessao import SessionLocal

    conta = criar_conta()
    conta.post("/v1/memoria", json={"tipo": "preferencia", "conteudo": "Nunca usar emojis", "peso": 2})
    with SessionLocal() as s:
        mem = carregar_memoria(s, uuid.UUID(conta.empresa_id), None)
    assert mem and mem[0]["conteudo"] == "Nunca usar emojis"
