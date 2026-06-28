import uuid

from sqlalchemy.orm import Session

from app.dominio.modelos.identidade_empresa import IdentidadeEmpresa


def carregar_identidade(sessao: Session, empresa_id: uuid.UUID) -> dict:
    ident = sessao.get(IdentidadeEmpresa, empresa_id)
    if not ident:
        return {}
    return {
        "cores": ident.cores_jsonb or {},
        "fontes": ident.fontes_jsonb or {},
        "tom_de_voz": ident.tom_de_voz,
        "logo_caminho": ident.logo_caminho,
        "manual_caminho": ident.manual_caminho,
    }
