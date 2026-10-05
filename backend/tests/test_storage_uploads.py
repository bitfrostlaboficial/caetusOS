import pytest

from app.configuracao import config
from app.infraestrutura.armazenamento.filesystem import FilesystemStorage, nome_seguro


def test_storage_bloqueia_traversal_e_prefixo_irmao(tmp_path):
    raiz = tmp_path / "storage"
    irmao = tmp_path / "storage_x"
    irmao.mkdir()
    st = FilesystemStorage(str(raiz))
    for ruim in ["../x.txt", "a/../../x.txt", "../storage_x/y.txt", "/../storage_x/y.txt"]:
        with pytest.raises(ValueError):
            st.salvar(ruim, b"x")
    assert not (irmao / "y.txt").exists()
    st.salvar("ok/sub/arquivo.txt", b"1")
    assert st.ler("ok/sub/arquivo.txt") == b"1"


@pytest.mark.parametrize(
    "entrada,esperado",
    [
        ("relatorio.md", "relatorio.md"),
        ("../../etc/passwd", "passwd"),
        ("C:\\Users\\x\\foto.png", "foto.png"),
        ("a/b/c.txt", "c.txt"),
        ("", "arquivo"),
        ("..", "arquivo"),
        ("nome\x00com\x1fcontrole.md", "nomecomcontrole.md"),
    ],
)
def test_nome_seguro(entrada, esperado):
    assert nome_seguro(entrada) == esperado


def test_nome_seguro_limita_tamanho():
    assert len(nome_seguro("a" * 500 + ".md")) <= 150
    assert nome_seguro("a" * 500 + ".md").endswith(".md")


def test_upload_conhecimento_com_nome_malicioso_e_sanitizado(criar_conta):
    conta = criar_conta()
    r = conta.post(
        "/v1/conhecimento",
        data={"tipo": "produto"},
        files={"arquivo": ("../../../fora.md", b"# oi")},
    )
    assert r.status_code == 200, r.text
    corpo = r.json()
    assert corpo["nome"] == "fora.md" and ".." not in corpo["caminho"]


def test_upload_acima_do_limite_retorna_413(criar_conta, monkeypatch):
    monkeypatch.setattr(config, "upload_max_bytes", 10)
    conta = criar_conta()
    r = conta.post("/v1/conhecimento", data={"tipo": "x"}, files={"arquivo": ("a.md", b"x" * 11)})
    assert r.status_code == 413
    r = conta.post("/v1/assets", data={"categoria": "LOGO"}, files={"arquivo": ("a.png", b"x" * 11)})
    assert r.status_code == 413
    assert conta.get("/v1/assets").json() == []


def test_upload_dentro_do_limite_funciona(criar_conta, monkeypatch):
    monkeypatch.setattr(config, "upload_max_bytes", 10)
    conta = criar_conta()
    r = conta.post("/v1/assets", data={"categoria": "LOGO"}, files={"arquivo": ("a.png", b"x" * 10)})
    assert r.status_code == 200, r.text
