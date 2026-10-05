from __future__ import annotations

import uuid

from slugify import slugify
from sqlalchemy.orm import Session

from app.dominio.modelos.empresa import Empresa
from app.dominio.modelos.projeto import Projeto


class EmpresaServico:
    """§4 / §11: criação de empresa + projeto raiz na MESMA transação. Sem triggers."""

    def __init__(self, sessao: Session) -> None:
        self.sessao = sessao

    def criar_empresa(self, *, nome: str) -> Empresa:
        slug_base = slugify(nome)[:100] or f"empresa-{uuid.uuid4().hex[:8]}"
        slug = slug_base
        sufixo = 1
        while self.sessao.query(Empresa).filter(Empresa.slug == slug).first() is not None:
            sufixo += 1
            slug = f"{slug_base}-{sufixo}"

        empresa = Empresa(nome=nome, slug=slug)
        self.sessao.add(empresa)
        self.sessao.flush()

        projeto_raiz = Projeto(empresa_id=empresa.id, nome="Principal", slug="principal", eh_raiz=True)
        self.sessao.add(projeto_raiz)
        self.sessao.flush()

        # Inicializa a base de conhecimento padrao da empresa
        from app.servicos.conhecimento_servico import ConhecimentoServico
        ConhecimentoServico(self.sessao).inicializar_padrao(empresa.id)

        return empresa

    def projeto_raiz(self, empresa_id: uuid.UUID) -> Projeto:
        raiz = (
            self.sessao.query(Projeto)
            .filter(Projeto.empresa_id == empresa_id, Projeto.eh_raiz.is_(True))
            .first()
        )
        if raiz is None:
            raise RuntimeError("empresa sem projeto raiz")
        return raiz
