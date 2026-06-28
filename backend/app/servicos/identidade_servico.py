from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.dominio.modelos.identidade_empresa import IdentidadeEmpresa


class IdentidadeServico:
    def __init__(self, sessao: Session) -> None:
        self.sessao = sessao

    def obter(self, empresa_id: uuid.UUID) -> IdentidadeEmpresa | None:
        return self.sessao.get(IdentidadeEmpresa, empresa_id)

    def salvar(
        self,
        empresa_id: uuid.UUID,
        *,
        cores: dict | None = None,
        fontes: dict | None = None,
        tom_de_voz: str | None = None,
        logo_caminho: str | None = None,
        manual_caminho: str | None = None,
    ) -> IdentidadeEmpresa:
        ident = self.sessao.get(IdentidadeEmpresa, empresa_id)
        if ident is None:
            ident = IdentidadeEmpresa(empresa_id=empresa_id)
            self.sessao.add(ident)
        if cores is not None:
            ident.cores_jsonb = cores
        if fontes is not None:
            ident.fontes_jsonb = fontes
        if tom_de_voz is not None:
            ident.tom_de_voz = tom_de_voz
        if logo_caminho is not None:
            ident.logo_caminho = logo_caminho
        if manual_caminho is not None:
            ident.manual_caminho = manual_caminho
        self.sessao.flush()
        return ident
