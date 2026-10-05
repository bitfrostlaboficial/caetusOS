from __future__ import annotations

import hashlib
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dominio.modelos.documento_conhecimento import DocumentoConhecimento
from app.infraestrutura.armazenamento.filesystem import obter_storage


class ConhecimentoServico:
    def __init__(self, sessao: Session) -> None:
        self.sessao = sessao
        self.storage = obter_storage()

    def listar(self, empresa_id: uuid.UUID) -> list[DocumentoConhecimento]:
        return list(
            self.sessao.scalars(
                select(DocumentoConhecimento).where(DocumentoConhecimento.empresa_id == empresa_id)
            )
        )

    def adicionar(self, empresa_id: uuid.UUID, *, tipo: str, nome_arquivo: str, conteudo: bytes) -> DocumentoConhecimento:
        h = hashlib.sha256(conteudo).hexdigest()
        caminho = f"empresas/{empresa_id}/conhecimento/{h}-{nome_arquivo}"
        self.storage.salvar(caminho, conteudo)
        doc = DocumentoConhecimento(
            empresa_id=empresa_id,
            tipo=tipo,
            caminho_storage=caminho,
            hash=h,
            versao=1,
        )
        self.sessao.add(doc)
        self.sessao.flush()
        return doc

    def inicializar_padrao(self, empresa_id: uuid.UUID) -> None:
        from app.servicos.templates_conhecimento import TEMPLATES_CONHECIMENTO
        for nome_base, info in TEMPLATES_CONHECIMENTO.items():
            # 1. Cria o arquivo real (.md)
            conteudo_real = info["conteudo_real"].encode("utf-8")
            self.adicionar(
                empresa_id,
                tipo=info["tipo"],
                nome_arquivo=nome_base,
                conteudo=conteudo_real
            )
            # 2. Cria o arquivo de exemplo (.md.exemplo)
            conteudo_exemplo = info["conteudo_exemplo"].encode("utf-8")
            self.adicionar(
                empresa_id,
                tipo=info["tipo"],
                nome_arquivo=f"{nome_base}.exemplo",
                conteudo=conteudo_exemplo
            )

    def remover(self, empresa_id: uuid.UUID, documento_id: uuid.UUID) -> None:
        doc = self.sessao.get(DocumentoConhecimento, documento_id)
        if doc and doc.empresa_id == empresa_id:
            self.storage.remover(doc.caminho_storage)
            self.sessao.delete(doc)
