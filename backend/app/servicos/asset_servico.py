from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dominio.modelos.asset import Asset
from app.infraestrutura.armazenamento.filesystem import obter_storage


class AssetServico:
    def __init__(self, sessao: Session) -> None:
        self.sessao = sessao
        self.storage = obter_storage()

    def listar(self, empresa_id: uuid.UUID, projeto_id: uuid.UUID | None = None) -> list[Asset]:
        stmt = select(Asset).where(Asset.empresa_id == empresa_id)
        if projeto_id is not None:
            stmt = stmt.where(Asset.projeto_id == projeto_id)
        return list(self.sessao.scalars(stmt.order_by(Asset.criado_em.desc())))

    def upload(
        self,
        empresa_id: uuid.UUID,
        usuario_id: uuid.UUID,
        *,
        categoria: str,
        nome_arquivo: str,
        conteudo: bytes,
        mime: str | None,
        projeto_id: uuid.UUID | None = None,
    ) -> Asset:
        caminho = f"empresas/{empresa_id}/assets/{uuid.uuid4().hex}-{nome_arquivo}"
        self.storage.salvar(caminho, conteudo)
        asset = Asset(
            empresa_id=empresa_id,
            projeto_id=projeto_id,
            categoria=categoria,
            origem="UPLOAD",
            escopo="projeto" if projeto_id else "empresa",
            caminho_storage=caminho,
            mime=mime,
            tamanho=len(conteudo),
            criado_por=usuario_id,
        )
        self.sessao.add(asset)
        self.sessao.flush()
        return asset

    def remover(self, empresa_id: uuid.UUID, asset_id: uuid.UUID) -> None:
        asset = self.sessao.get(Asset, asset_id)
        if asset and asset.empresa_id == empresa_id:
            self.storage.remover(asset.caminho_storage)
            self.sessao.delete(asset)
