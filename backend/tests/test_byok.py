"""BYOK: cada empresa cadastra as próprias chaves de IA (cifradas) e o roteador as usa."""
import pytest

from app.configuracao import config
from app.infraestrutura.banco.sessao import SessionLocal
from app.infraestrutura.seguranca import cofre
from app.ia import roteador
from app.ia.provedores.base import RespostaIA
from app.ia.provedores.groq import GroqProvedor

SEGREDO_A = "gsk_segredo_da_empresa_A_1234"


def _salvar(conta, provedor="groq", segredo=SEGREDO_A, **extra):
    return conta.put(f"/v1/provedores/{provedor}", json={"campos": {"api_key": segredo}, **extra})


# ───────── cofre ─────────
def test_cofre_cifra_e_decifra():
    token = cofre.cifrar({"api_key": "abc"})
    assert "abc" not in token
    assert cofre.decifrar(token) == {"api_key": "abc"}


def test_cofre_sem_chave_mestra_falha_claramente(monkeypatch):
    monkeypatch.setattr(config, "credenciais_master_key", "")
    with pytest.raises(cofre.CofreNaoConfigurado):
        cofre.cifrar({"api_key": "x"})


def test_mascara():
    assert cofre.mascarar("gsk_abcdef1234") == "•" * 10 + "1234"
    assert cofre.mascarar("ab") == "••"


# ───────── API ─────────
def test_lista_provedores_suportados_sem_configuracao(criar_conta):
    conta = criar_conta()
    r = conta.get("/v1/provedores")
    assert r.status_code == 200
    por_nome = {p["nome"]: p for p in r.json()}
    assert {"gemini", "groq", "openrouter", "huggingface", "fal"} <= set(por_nome)
    assert all(p["configurado"] is False for p in por_nome.values())
    groq = por_nome["groq"]
    assert groq["campos"][0]["nome"] == "api_key" and groq["campos"][0]["segredo"] is True
    assert groq["url_chave"].startswith("https://")


def test_salvar_nao_devolve_o_segredo_e_guarda_cifrado(criar_conta):
    conta = criar_conta()
    r = _salvar(conta)
    assert r.status_code == 200, r.text
    corpo = r.json()
    assert corpo["configurado"] is True and corpo["ativo"] is True
    assert SEGREDO_A not in r.text and corpo["mascara"]["api_key"].endswith("1234")
    assert SEGREDO_A not in conta.get("/v1/provedores").text
    # no banco: cifrado
    from sqlalchemy import text

    with SessionLocal() as s:
        bruto = s.execute(text("select campos_cifrados from provedor_credenciais")).scalar_one()
    assert SEGREDO_A not in bruto


def test_credenciais_sao_isoladas_por_empresa(criar_conta):
    a = criar_conta("A", "a@a.com")
    b = criar_conta("B", "b@b.com")
    _salvar(a)
    por_nome = {p["nome"]: p for p in b.get("/v1/provedores").json()}
    assert por_nome["groq"]["configurado"] is False
    assert b.delete("/v1/provedores/groq").status_code in (204, 404)
    assert {p["nome"]: p for p in a.get("/v1/provedores").json()}["groq"]["configurado"] is True


def test_atualizar_sem_reenviar_o_segredo_preserva_a_chave(criar_conta):
    conta = criar_conta()
    _salvar(conta)
    r = conta.put("/v1/provedores/groq", json={"campos": {}, "modelo_preferido": "llama-x"})
    assert r.status_code == 200, r.text
    assert r.json()["modelo_preferido"] == "llama-x"
    from app.servicos.credenciais_servico import CredenciaisServico

    with SessionLocal() as s:
        campos = CredenciaisServico(s).campos_ativos(__import__("uuid").UUID(conta.empresa_id), "groq")
    assert campos == {"api_key": SEGREDO_A}


def test_validacoes(criar_conta):
    conta = criar_conta()
    assert conta.put("/v1/provedores/inexistente", json={"campos": {"api_key": "x"}}).status_code == 404
    # primeira vez sem a chave obrigatória
    assert conta.put("/v1/provedores/groq", json={"campos": {}}).status_code == 422
    assert conta.put("/v1/provedores/groq", json={"campos": {"api_key": "  "}}).status_code == 422


def test_remover(criar_conta):
    conta = criar_conta()
    _salvar(conta)
    assert conta.delete("/v1/provedores/groq").status_code == 204
    por_nome = {p["nome"]: p for p in conta.get("/v1/provedores").json()}
    assert por_nome["groq"]["configurado"] is False


def test_exige_autenticacao(client):
    assert client.get("/v1/provedores").status_code == 401


def test_testar_chave_usa_a_credencial_da_empresa(criar_conta, monkeypatch):
    from app.ia.provedores.base import HealthStatus

    vistos = []

    def _health(self):
        vistos.append(self.api_key)
        return HealthStatus(provider="groq", status="ok", message="ok", modelo="m")

    monkeypatch.setattr(GroqProvedor, "health_check", _health)
    conta = criar_conta()
    _salvar(conta)
    r = conta.post("/v1/provedores/groq/testar")
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "ok" and vistos == [SEGREDO_A]
    assert {p["nome"]: p for p in conta.get("/v1/provedores").json()}["groq"]["status_teste"] == "ok"


def test_cofre_nao_configurado_retorna_503(criar_conta, monkeypatch):
    conta = criar_conta()
    monkeypatch.setattr(config, "credenciais_master_key", "")
    assert _salvar(conta).status_code == 503


# ───────── roteador usa a chave da empresa ─────────
@pytest.fixture()
def groq_ecoa_a_chave(monkeypatch):
    def _executar(self, prompt, *, modelo=None, max_tokens=1024, **kw):
        return RespostaIA(texto=f"chave={self.api_key}", provedor="groq", modelo=modelo or self.modelo_padrao)

    monkeypatch.setattr(GroqProvedor, "executar", _executar)


def test_roteador_usa_a_chave_da_empresa(criar_conta, groq_ecoa_a_chave):
    import uuid

    a = criar_conta("A", "a@a.com")
    _salvar(a)
    resp = roteador.executar_missao("criar_post", "oi", empresa_id=uuid.UUID(a.empresa_id))
    assert resp.texto == f"chave={SEGREDO_A}"


def test_empresa_sem_chave_nao_usa_chave_alheia(criar_conta, groq_ecoa_a_chave, monkeypatch):
    import uuid

    a = criar_conta("A", "a@a.com")
    b = criar_conta("B", "b@b.com")
    _salvar(a)
    monkeypatch.setattr(config, "ia_usar_chaves_da_plataforma", False)
    with pytest.raises(roteador.NenhumProvedorDisponivel):
        roteador.executar_missao("criar_post", "oi", empresa_id=uuid.UUID(b.empresa_id))


def test_chaves_da_plataforma_so_quando_habilitadas(criar_conta, groq_ecoa_a_chave, monkeypatch):
    import uuid

    b = criar_conta("B", "b@b.com")
    plataforma = roteador.obter("groq")
    monkeypatch.setattr(plataforma, "api_key", "gsk_da_plataforma")
    monkeypatch.setattr(config, "ia_usar_chaves_da_plataforma", False)
    with pytest.raises(roteador.NenhumProvedorDisponivel):
        roteador.executar_missao("criar_post", "oi", empresa_id=uuid.UUID(b.empresa_id))
    monkeypatch.setattr(config, "ia_usar_chaves_da_plataforma", True)
    resp = roteador.executar_missao("criar_post", "oi", empresa_id=uuid.UUID(b.empresa_id))
    assert resp.texto == "chave=gsk_da_plataforma"


def test_credencial_desativada_e_ignorada(criar_conta, groq_ecoa_a_chave, monkeypatch):
    import uuid

    a = criar_conta("A", "a@a.com")
    _salvar(a)
    assert a.put("/v1/provedores/groq", json={"campos": {}, "ativo": False}).status_code == 200
    monkeypatch.setattr(config, "ia_usar_chaves_da_plataforma", False)
    with pytest.raises(roteador.NenhumProvedorDisponivel):
        roteador.executar_missao("criar_post", "oi", empresa_id=uuid.UUID(a.empresa_id))


def test_modelo_preferido_da_empresa(criar_conta, groq_ecoa_a_chave, monkeypatch):
    import uuid

    a = criar_conta("A", "a@a.com")
    _salvar(a, modelo_preferido="llama-3.1-8b-instant")
    resp = roteador.executar_missao("criar_post", "oi", empresa_id=uuid.UUID(a.empresa_id))
    assert resp.modelo == "llama-3.1-8b-instant"
