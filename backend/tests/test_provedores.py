import pytest

from app.ia import roteador
from app.ia.provedores.base import ProvedorNaoConfigurado
from app.ia.provedores.fal import FalProvedor
from app.ia.provedores.gemini import GeminiProvedor
from app.ia.provedores.groq import GroqProvedor
from app.ia.provedores.huggingface import HuggingFaceProvedor
from app.ia.provedores.openrouter import OpenRouterProvedor

SEM_CHAVE = [
    GeminiProvedor(api_key=""),
    GroqProvedor(api_key=""),
    OpenRouterProvedor(api_key=""),
    HuggingFaceProvedor(api_key=""),
    FalProvedor(api_key=""),
]


@pytest.mark.parametrize("provedor", SEM_CHAVE, ids=lambda p: p.nome)
def test_provedor_sem_chave_levanta_erro_em_vez_de_stub(provedor):
    with pytest.raises(ProvedorNaoConfigurado):
        provedor.executar("olá")


def test_stub_so_com_flag_explicita(monkeypatch):
    from app.configuracao import config

    monkeypatch.setattr(config, "ia_permitir_stub", True)
    resp = GroqProvedor(api_key="").executar("olá")
    assert resp.texto.startswith("[stub groq")


def test_roteador_sem_nenhum_provedor_configurado_levanta_erro_claro():
    with pytest.raises(roteador.NenhumProvedorDisponivel):
        roteador.executar_missao("criar_post", "olá")


def test_comando_sem_provedor_retorna_503_e_nao_gera_conteudo_falso(criar_conta):
    conta = criar_conta()
    r = conta.post(
        "/v1/comandos/executar",
        json={"alvo": "conteudo.criar_post", "entrada": {"tema": "Dia do café"}},
    )
    assert r.status_code == 503, r.text
    detalhe = r.json()["detail"]
    assert detalhe["erro"]["codigo"] == "NenhumProvedorDisponivel"
    hist = conta.get("/v1/historico").json()
    assert hist[0]["status"] == "erro"
