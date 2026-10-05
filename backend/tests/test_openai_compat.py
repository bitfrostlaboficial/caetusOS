import uuid

import httpx
import pytest

from app.configuracao import config
from app.ia import roteador
from app.ia.provedores import openai_compat
from app.ia.provedores.base import ProvedorNaoConfigurado
from app.ia.provedores.cloudflare import CloudflareProvedor
from app.ia.provedores.mistral import MistralProvedor
from app.ia.provedores.nvidia import NvidiaProvedor


class _Resp:
    def __init__(self, status=200, corpo=None):
        self.status_code = status
        self._corpo = corpo or {}

    def json(self):
        return self._corpo

    def raise_for_status(self):
        if self.status_code >= 400:
            req = httpx.Request("POST", "https://x")
            raise httpx.HTTPStatusError(
                f"{self.status_code} erro do provedor", request=req, response=httpx.Response(self.status_code, request=req)
            )


def _ok(texto="olá", pin=7, pout=3):
    return _Resp(200, {"choices": [{"message": {"content": texto}}], "usage": {"prompt_tokens": pin, "completion_tokens": pout}})


@pytest.fixture()
def http(monkeypatch):
    chamadas = []
    respostas = [_ok()]

    def _post(url, headers=None, json=None, timeout=None, **kw):
        chamadas.append({"url": url, "headers": headers, "json": json})
        return respostas[0] if len(respostas) == 1 else respostas.pop(0)

    monkeypatch.setattr(openai_compat.httpx, "post", _post)
    return chamadas, respostas


def test_mistral_monta_requisicao_openai_e_le_resposta(http):
    chamadas, _ = http
    r = MistralProvedor(api_key="mk-123").executar("diga oi", max_tokens=50)
    c = chamadas[0]
    assert c["url"] == "https://api.mistral.ai/v1/chat/completions"
    assert c["headers"]["Authorization"] == "Bearer mk-123"
    assert c["json"]["messages"] == [{"role": "user", "content": "diga oi"}]
    assert c["json"]["max_tokens"] == 50 and c["json"]["model"]
    assert (r.texto, r.provedor, r.tokens_in, r.tokens_out) == ("olá", "mistral", 7, 3)


def test_nvidia_usa_endpoint_proprio(http):
    chamadas, _ = http
    NvidiaProvedor(api_key="nvapi-1").executar("oi")
    assert chamadas[0]["url"] == "https://integrate.api.nvidia.com/v1/chat/completions"


def test_cloudflare_usa_account_id_na_url(http):
    chamadas, _ = http
    prov = CloudflareProvedor.com_credenciais({"api_token": "cf-tok", "account_id": "acc123"})
    prov.executar("oi")
    assert chamadas[0]["url"] == "https://api.cloudflare.com/client/v4/accounts/acc123/ai/v1/chat/completions"
    assert chamadas[0]["headers"]["Authorization"] == "Bearer cf-tok"


def test_cloudflare_exige_os_dois_campos():
    assert CloudflareProvedor(api_key="t", account_id="").configuracao()["configurado"] is False
    assert CloudflareProvedor(api_key="", account_id="a").configuracao()["configurado"] is False
    assert CloudflareProvedor(api_key="t", account_id="a").configuracao()["configurado"] is True
    with pytest.raises(ProvedorNaoConfigurado):
        CloudflareProvedor(api_key="t", account_id="").executar("oi")


@pytest.mark.parametrize("cls", [MistralProvedor, NvidiaProvedor])
def test_sem_chave_levanta_erro(cls):
    with pytest.raises(ProvedorNaoConfigurado):
        cls(api_key="").executar("oi")


def test_erro_http_vira_excecao_com_status(http):
    chamadas, respostas = http
    respostas[0] = _Resp(429)
    with pytest.raises(httpx.HTTPStatusError, match="429"):
        MistralProvedor(api_key="k").executar("oi")


def test_resposta_malformada_levanta_erro_claro(http):
    chamadas, respostas = http
    respostas[0] = _Resp(200, {"sem": "choices"})
    with pytest.raises(RuntimeError, match="resposta inesperada"):
        MistralProvedor(api_key="k").executar("oi")


def test_health_check_ok_e_erro(http):
    chamadas, respostas = http
    assert MistralProvedor(api_key="k").health_check().status == "ok"
    respostas[0] = _Resp(401)
    assert MistralProvedor(api_key="k").health_check().status == "error"
    assert MistralProvedor(api_key="").health_check().requer_acao is True


# ───────── integração BYOK ─────────
def test_api_lista_os_novos_provedores_com_seus_campos(criar_conta):
    conta = criar_conta()
    por_nome = {p["nome"]: p for p in conta.get("/v1/provedores").json()}
    assert {"mistral", "nvidia", "cloudflare"} <= set(por_nome)
    assert [c["nome"] for c in por_nome["cloudflare"]["campos"]] == ["api_token", "account_id"]
    assert por_nome["cloudflare"]["campos"][1]["segredo"] is False
    assert "treinar" in por_nome["mistral"]["aviso"].lower()


def test_empresa_com_so_mistral_roda_a_missao(criar_conta, http, monkeypatch):
    chamadas, _ = http
    monkeypatch.setattr(config, "ia_usar_chaves_da_plataforma", False)
    conta = criar_conta()
    r = conta.put("/v1/provedores/mistral", json={"campos": {"api_key": "mk-empresa"}})
    assert r.status_code == 200, r.text
    resp = roteador.executar_missao("criar_post", "oi", empresa_id=uuid.UUID(conta.empresa_id))
    assert resp.provedor == "mistral" and chamadas[0]["headers"]["Authorization"] == "Bearer mk-empresa"


def test_cloudflare_so_com_campos_obrigatorios(criar_conta):
    conta = criar_conta()
    assert conta.put("/v1/provedores/cloudflare", json={"campos": {"api_token": "t"}}).status_code == 422
    ok = conta.put("/v1/provedores/cloudflare", json={"campos": {"api_token": "tok-secreto-9999", "account_id": "acc1"}})
    assert ok.status_code == 200, ok.text
    mascara = ok.json()["mascara"]
    assert mascara["account_id"] == "acc1" and mascara["api_token"].endswith("9999") and "tok-secreto" not in ok.text
