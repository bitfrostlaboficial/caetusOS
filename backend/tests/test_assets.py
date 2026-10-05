import pytest

from app.habilidades.conteudo import pipeline_post
from app.habilidades.conteudo.pipeline_post import ImagemPost

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 20


def _upload(conta, nome="logo.png", conteudo=PNG, categoria="LOGO", mime="image/png"):
    r = conta.post("/v1/assets", data={"categoria": categoria}, files={"arquivo": (nome, conteudo, mime)})
    assert r.status_code == 200, r.text
    return r.json()


def test_upload_listar_baixar_e_remover(criar_conta):
    conta = criar_conta()
    a = _upload(conta)
    lista = conta.get("/v1/assets").json()
    assert len(lista) == 1 and lista[0]["nome"] == "logo.png" and lista[0]["origem"] == "UPLOAD"
    dl = conta.get(f"/v1/assets/{a['id']}/arquivo")
    assert dl.status_code == 200 and dl.content == PNG
    assert dl.headers["content-type"].startswith("image/png")
    assert "private" in dl.headers.get("cache-control", "")
    assert conta.delete(f"/v1/assets/{a['id']}").status_code == 204
    assert conta.get("/v1/assets").json() == []
    assert conta.get(f"/v1/assets/{a['id']}/arquivo").status_code == 404


def test_asset_de_outra_empresa_nao_baixa_nem_remove(criar_conta):
    a = criar_conta("A", "a@a.com")
    b = criar_conta("B", "b@b.com")
    asset = _upload(a)
    assert b.get(f"/v1/assets/{asset['id']}/arquivo").status_code == 404
    assert b.delete(f"/v1/assets/{asset['id']}").status_code == 404
    assert b.get("/v1/assets").json() == []
    assert a.get(f"/v1/assets/{asset['id']}/arquivo").status_code == 200


def test_filtros_por_origem_e_categoria(criar_conta):
    conta = criar_conta()
    _upload(conta, categoria="LOGO")
    _upload(conta, "foto.png", categoria="IMAGEM")
    assert len(conta.get("/v1/assets", params={"categoria": "LOGO"}).json()) == 1
    assert conta.get("/v1/assets", params={"origem": "GERADO"}).json() == []


def test_download_exige_autenticacao(client):
    import uuid

    assert client.get(f"/v1/assets/{uuid.uuid4()}/arquivo").status_code == 401


# ───────── posts gerados viram assets (não conhecimento) ─────────
@pytest.fixture()
def post_com_imagem(monkeypatch, ia_falsa):
    def _gerar(self, prompt_visual, contexto):
        return ImagemPost(
            conteudo=PNG, mime="image/png", extensao="png", url_origem="https://x/y.png",
            provider="fake-img", modelo="m",
        )

    monkeypatch.setattr(pipeline_post.GeradorImagemPost, "gerar", _gerar)


def test_post_gerado_registra_assets_da_empresa(criar_conta, post_com_imagem):
    conta = criar_conta()
    r = conta.post("/v1/comandos/executar", json={"alvo": "conteudo.criar_post", "entrada": {"tema": "Café"}})
    assert r.status_code == 200, r.text
    arquivos = r.json()["arquivos"]
    assert len(arquivos) == 4  # imagem, legenda, prompt, metadata
    gerados = conta.get("/v1/assets", params={"origem": "GERADO"}).json()
    assert {a["id"] for a in gerados} == {a["id"] for a in arquivos}
    imagem = next(a for a in gerados if a["categoria"] == "IMAGEM")
    assert conta.get(f"/v1/assets/{imagem['id']}/arquivo").content == PNG
    legenda = next(a for a in gerados if a["nome"].endswith("legenda.md"))
    assert b"Legenda de teste" in conta.get(f"/v1/assets/{legenda['id']}/arquivo").content
    # escopo de projeto + caminho por empresa/projeto
    assert all(a["escopo"] == "projeto" and a["projeto_id"] for a in gerados)
    assert all(conta.empresa_id in a["caminho"] for a in gerados)


def test_post_gerado_nao_polui_o_conhecimento(criar_conta, post_com_imagem):
    conta = criar_conta()
    conta.post("/v1/comandos/executar", json={"alvo": "conteudo.criar_post", "entrada": {"tema": "Café"}})
    nomes = [d["nome"] for d in conta.get("/v1/conhecimento").json()]
    assert not any("post_" in n for n in nomes)


def test_post_sem_imagem_registra_so_os_textos(criar_conta, ia_falsa):
    conta = criar_conta()
    r = conta.post("/v1/comandos/executar", json={"alvo": "conteudo.criar_post", "entrada": {"tema": "Café"}})
    assert len(r.json()["arquivos"]) == 3
    assert all(a["categoria"] != "IMAGEM" for a in r.json()["arquivos"])


def test_asset_gerado_fica_atomico_com_a_execucao(criar_conta, ia_falsa, monkeypatch):
    """Se a execução falhar depois de salvar, não sobra asset órfão no banco."""
    from app.habilidades.conteudo import pipeline_post as pp

    original = pp.PublicadorPost.publicar

    def _explode(self, *a, **k):
        raise RuntimeError("falha depois de gerar")

    monkeypatch.setattr(pp.PublicadorPost, "publicar", _explode)
    conta = criar_conta()
    r = conta.post("/v1/comandos/executar", json={"alvo": "conteudo.criar_post", "entrada": {"tema": "Café"}})
    assert r.status_code == 422
    assert conta.get("/v1/assets", params={"origem": "GERADO"}).json() == []
    monkeypatch.setattr(pp.PublicadorPost, "publicar", original)
