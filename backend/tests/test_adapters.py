import base64
import types
import uuid

import pytest

from app.configuracao import config
from app.habilidades.conteudo import pipeline_post
from app.habilidades.conteudo.pipeline_post import GeradorImagemPost
from app.ia import roteador
from app.ia.provedores import huggingface
from app.ia.provedores.base import RespostaIA
from app.ia.provedores.gemini import GeminiProvedor
from app.ia.provedores.groq import GroqProvedor
from app.ia.provedores.huggingface import HuggingFaceProvedor

PNG = b"\x89PNG\r\n\x1a\n" + b"\x01" * 16


# ───────── Gemini respeita max_tokens e devolve tokens ─────────
def test_gemini_envia_max_output_tokens_e_le_uso(monkeypatch):
    from google import genai

    capturado = {}

    class _Modelos:
        def generate_content(self, *, model, contents, config=None):
            capturado.update(model=model, contents=contents, config=config)
            return types.SimpleNamespace(
                text=" resposta ",
                usage_metadata=types.SimpleNamespace(prompt_token_count=11, candidates_token_count=22),
            )

    monkeypatch.setattr(genai, "Client", lambda api_key: types.SimpleNamespace(models=_Modelos()))
    r = GeminiProvedor(api_key="k").executar("oi", max_tokens=321)
    assert r.texto == "resposta" and (r.tokens_in, r.tokens_out) == (11, 22)
    assert capturado["config"].max_output_tokens == 321


def test_gemini_sem_metadata_de_uso_nao_quebra(monkeypatch):
    from google import genai

    class _Modelos:
        def generate_content(self, **kw):
            return types.SimpleNamespace(text="ok", usage_metadata=None)

    monkeypatch.setattr(genai, "Client", lambda api_key: types.SimpleNamespace(models=_Modelos()))
    r = GeminiProvedor(api_key="k").executar("oi")
    assert (r.tokens_in, r.tokens_out) == (0, 0)


# ───────── Gemini: imagem via inline_data ─────────
def test_gemini_imagem_vira_data_uri(monkeypatch):
    from google import genai

    capturado = {}

    class _Modelos:
        def generate_content(self, *, model, contents, config=None):
            capturado.update(model=model, config=config)
            parte = types.SimpleNamespace(inline_data=types.SimpleNamespace(data=PNG, mime_type="image/png"))
            return types.SimpleNamespace(
                candidates=[types.SimpleNamespace(content=types.SimpleNamespace(parts=[parte]))],
                usage_metadata=None,
            )

    monkeypatch.setattr(genai, "Client", lambda api_key: types.SimpleNamespace(models=_Modelos()))
    r = GeminiProvedor(api_key="k").executar("um gato", modelo="gemini-2.5-flash-image")
    assert r.texto == "data:image/png;base64," + base64.b64encode(PNG).decode()
    assert list(capturado["config"].response_modalities) == ["IMAGE"]


def test_gemini_imagem_sem_parte_de_imagem_falha_claro(monkeypatch):
    from google import genai

    class _Modelos:
        def generate_content(self, **kw):
            return types.SimpleNamespace(candidates=[], usage_metadata=None)

    monkeypatch.setattr(genai, "Client", lambda api_key: types.SimpleNamespace(models=_Modelos()))
    with pytest.raises(RuntimeError, match="sem imagem"):
        GeminiProvedor(api_key="k").executar("x", modelo="gemini-2.5-flash-image")


def test_gemini_vem_antes_da_cloudflare_para_imagem():
    from app.ia.catalogo import CATALOGO_PADRAO
    from app.ia.categorias import CategoriaIA, EspecializacaoIA

    pesos = {
        e.provider: e.peso
        for e in CATALOGO_PADRAO()
        if e.categoria == CategoriaIA.IMAGE and e.especializacao == EspecializacaoIA.IMAGE_GENERATION
    }
    assert pesos["gemini"] > pesos["fal"] > pesos["huggingface"] > pesos["cloudflare"]


# ───────── Hugging Face: imagem volta como bytes ─────────
class _RespBytes:
    status_code = 200
    headers = {"content-type": "image/png"}
    content = PNG

    def raise_for_status(self):
        pass

    def json(self):
        raise ValueError("não é JSON")


def test_huggingface_imagem_vira_data_uri(monkeypatch):
    monkeypatch.setattr(huggingface.httpx, "post", lambda *a, **k: _RespBytes())
    r = HuggingFaceProvedor(api_key="hf").executar("um gato")
    assert r.texto.startswith("data:image/png;base64,")
    assert base64.b64decode(r.texto.split(",", 1)[1]) == PNG


class _RespJson:
    status_code = 200
    headers = {"content-type": "application/json"}

    def raise_for_status(self):
        pass

    def json(self):
        return [{"generated_text": "texto gerado"}]


def test_huggingface_texto_continua_funcionando(monkeypatch):
    monkeypatch.setattr(huggingface.httpx, "post", lambda *a, **k: _RespJson())
    assert HuggingFaceProvedor(api_key="hf").executar("oi").texto == "texto gerado"


def test_pipeline_aceita_imagem_em_data_uri(monkeypatch):
    uri = "data:image/png;base64," + base64.b64encode(PNG).decode()
    monkeypatch.setattr(
        pipeline_post, "executar_missao", lambda *a, **k: RespostaIA(texto=uri, provedor="huggingface", modelo="m")
    )
    ctx = types.SimpleNamespace(extras={})
    img = GeradorImagemPost().gerar("prompt", ctx)
    assert img.conteudo == PNG and img.mime == "image/png" and img.extensao == "png"
    assert img.url_origem is None  # não há URL pública (impede "publicar" sem imagem hospedada)


# ───────── custo é preenchido pelo roteador ─────────
def test_roteador_preenche_custo_estimado(monkeypatch):
    monkeypatch.setattr(config, "ia_permitir_stub", True)  # deixa o provedor da plataforma disponível

    def _exec(self, prompt, *, modelo=None, max_tokens=1024, **kw):
        return RespostaIA(
            texto="x", provedor="groq", modelo="llama-3.3-70b-versatile",
            tokens_in=1_000_000, tokens_out=1_000_000,
        )

    monkeypatch.setattr(GroqProvedor, "executar", _exec)
    r = roteador.executar(provider="groq", prompt="oi")
    assert r.custo == pytest.approx(0.59 + 0.79)


def test_custo_desconhecido_fica_zero(monkeypatch):
    monkeypatch.setattr(config, "ia_permitir_stub", True)
    monkeypatch.setattr(
        GroqProvedor, "executar",
        lambda self, p, **k: RespostaIA(texto="x", provedor="groq", modelo="modelo-novo", tokens_in=10, tokens_out=10),
    )
    assert roteador.executar(provider="groq", prompt="oi").custo == 0.0
