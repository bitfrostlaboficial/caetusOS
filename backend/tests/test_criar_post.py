import json

from app.habilidades.conteudo import pipeline_post
from app.ia import roteador
from app.ia.provedores.base import RespostaIA


def _texto_ok():
    return RespostaIA(
        texto=json.dumps(
            {
                "titulo": "Dia do café",
                "legenda": "Legenda de teste",
                "hashtags": ["#cafe"],
                "cta": "Compre já",
                "prompt_visual": {"cenario": "xícara"},
            }
        ),
        provedor="fake",
        modelo="fake-1",
        tokens_in=5,
        tokens_out=7,
    )


def _executar(conta, **entrada):
    return conta.post(
        "/v1/comandos/executar",
        json={"alvo": "conteudo.criar_post", "entrada": {"tema": "Dia do café", **entrada}},
    )


def test_sem_provedor_de_imagem_entrega_texto_com_aviso(criar_conta, monkeypatch):
    def _missao(nome, prompt, **kw):
        if nome == "criar_post":
            return _texto_ok()
        raise roteador.NenhumProvedorDisponivel("sem provedor de imagem")

    monkeypatch.setattr(pipeline_post, "executar_missao", _missao)
    conta = criar_conta()
    r = _executar(conta)
    assert r.status_code == 200, r.text
    corpo = r.json()
    dados = corpo["dados"]
    assert dados["legenda"].startswith("Legenda de teste")
    assert dados["imagem_url"] is None
    assert dados["imagem_gerada"] is None  # nada de PNG placeholder fingindo ser imagem
    aviso = [e for e in corpo["eventos"] if e["tipo"] == "ia.imagem"]
    assert aviso and aviso[0]["nivel"] == "aviso"


def test_resposta_de_imagem_sem_url_nao_vira_placeholder(criar_conta, ia_falsa):
    # ia_falsa devolve "sem url" para a missão de imagem
    conta = criar_conta()
    r = _executar(conta)
    assert r.status_code == 200, r.text
    assert r.json()["dados"]["imagem_gerada"] is None


def test_publicar_sem_imagem_nao_publica(criar_conta, ia_falsa):
    conta = criar_conta()
    r = _executar(conta, publicar_automaticamente=True)
    assert r.status_code == 200, r.text
    assert r.json()["dados"]["status_publicacao"] == "sem_imagem"


def test_post_salvo_na_pasta_da_empresa(criar_conta, ia_falsa):
    conta = criar_conta()
    r = _executar(conta)
    arquivos = r.json()["dados"]["arquivos_salvos"]
    assert conta.empresa_id in arquivos["legenda"]
