import uuid

from app.ia.context_builder.fontes.conhecimento_md import carregar_conhecimento
from app.infraestrutura.banco.sessao import SessionLocal


def _conhecimento(empresa_id: str) -> list[dict]:
    with SessionLocal() as s:
        return carregar_conhecimento(s, uuid.UUID(empresa_id))


def _upload(conta, nome: str, conteudo: bytes, tipo: str = "produto"):
    r = conta.post("/v1/conhecimento", data={"tipo": tipo}, files={"arquivo": (nome, conteudo)})
    assert r.status_code == 200, r.text


def test_modelos_nao_preenchidos_nao_entram_no_contexto(criar_conta):
    conta = criar_conta()
    # o registro cria modelos (.md "reais" com texto-guia + .exemplo): nada disso é conhecimento
    assert _conhecimento(conta.empresa_id) == []


def test_documento_do_usuario_entra_no_contexto(criar_conta):
    conta = criar_conta()
    _upload(conta, "produto_x.md", "# Café\nVendemos café especial.".encode())
    docs = _conhecimento(conta.empresa_id)
    assert len(docs) == 1 and "café especial" in docs[0]["conteudo"]


def test_blocos_de_exemplo_sao_removidos(criar_conta):
    conta = criar_conta()
    texto = (
        "# Missão\n<!-- CAETUSOS_EXEMPLO_START -->\n*Exemplo:* texto de exemplo\n"
        "<!-- CAETUSOS_EXEMPLO_END -->\nNossa missão real é servir bem.\n"
    )
    _upload(conta, "missao_custom.md", texto.encode())
    [doc] = _conhecimento(conta.empresa_id)
    assert "texto de exemplo" not in doc["conteudo"]
    assert "missão real" in doc["conteudo"]


def test_binarios_nao_entram_no_contexto(criar_conta):
    conta = criar_conta()
    _upload(conta, "logo.png", b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR", tipo="marca")
    _upload(conta, "tabela.pdf", b"%PDF-1.4 binario", tipo="marca")
    assert _conhecimento(conta.empresa_id) == []


def test_resultados_gerados_nao_viram_conhecimento(criar_conta, ia_falsa):
    conta = criar_conta()
    r = conta.post(
        "/v1/comandos/executar",
        json={"alvo": "conteudo.criar_post", "entrada": {"tema": "Dia do café"}},
    )
    assert r.status_code == 200, r.text
    # o post gerado (legenda/prompt/metadata) foi salvo, mas não deve realimentar o prompt
    assert _conhecimento(conta.empresa_id) == []
