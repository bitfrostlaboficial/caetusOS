"""Fonte de contexto: base de conhecimento da empresa.

Só entra no prompt o que é CONHECIMENTO escrito pelo usuário:
- texto (`.md`/`.txt`) — binários (imagens, PDFs...) nunca são decodificados como texto;
- que não seja modelo/guia não preenchido (`.exemplo`, texto-guia padrão, cabeçalho de template);
- que não seja um resultado gerado pelo sistema (posts `post_AAAAMMDD_HHMMSS_*`).
Blocos de exemplo (`CAETUSOS_EXEMPLO_*`) e linhas `[Insira aqui ...]` são removidos.
"""
import re
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dominio.modelos.documento_conhecimento import DocumentoConhecimento
from app.infraestrutura.armazenamento.filesystem import obter_storage

EXTENSOES_TEXTO = {"md", "txt"}

_RESULTADO_GERADO = re.compile(r"^post_\d{8}_\d{6}_")
_BLOCO_EXEMPLO = re.compile(
    r"<!--\s*CAETUSOS_EXEMPLO_START\s*-->.*?<!--\s*CAETUSOS_EXEMPLO_END\s*-->", re.S
)
_CABECALHO_TEMPLATE = re.compile(
    r"<!--\s*CAETUSOS_TEMPLATE_HEADER_START\s*-->.*?<!--\s*CAETUSOS_TEMPLATE_HEADER_END\s*-->", re.S
)
_LINHA_PLACEHOLDER = re.compile(r"^\s*\[Insira[^\]]*\]\s*$", re.M | re.I)


def _extensao(nome: str) -> str:
    return nome.rsplit(".", 1)[-1].lower() if "." in nome else ""


def _texto_do_conhecimento(nome: str, bruto: bytes) -> str | None:
    """Devolve o texto limpo, ou None se o arquivo não deve entrar no contexto."""
    if _extensao(nome) not in EXTENSOES_TEXTO or _RESULTADO_GERADO.match(nome):
        return None
    try:
        texto = bruto.decode("utf-8")
    except UnicodeDecodeError:
        return None
    if "\x00" in texto:
        return None

    from app.servicos.templates_conhecimento import TEMPLATES_CONHECIMENTO

    modelo = TEMPLATES_CONHECIMENTO.get(nome)
    if modelo and texto.strip() == modelo["conteudo_real"].strip():
        return None  # texto-guia criado no registro, ainda não preenchido

    texto = _CABECALHO_TEMPLATE.sub("", texto)
    texto = _BLOCO_EXEMPLO.sub("", texto)
    texto = _LINHA_PLACEHOLDER.sub("", texto).strip()
    return texto or None


def carregar_conhecimento(sessao: Session, empresa_id: uuid.UUID) -> list[dict]:
    storage = obter_storage()
    docs = sessao.scalars(
        select(DocumentoConhecimento)
        .where(DocumentoConhecimento.empresa_id == empresa_id)
        .order_by(DocumentoConhecimento.atualizado_em.desc())
    ).all()
    resultado: list[dict] = []
    for d in docs:
        if not d.is_indexable:
            continue
        try:
            bruto = storage.ler(d.caminho_storage)
        except Exception:
            continue
        texto = _texto_do_conhecimento(d.nome, bruto)
        if texto is None:
            continue
        resultado.append(
            {
                "id": str(d.id),
                "tipo": d.tipo,
                "nome": d.nome,
                "versao": d.versao,
                "conteudo": texto,
            }
        )
    return resultado
