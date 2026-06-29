import uuid

from sqlalchemy.orm import Session

from app.dominio.modelos.empresa import Empresa
from app.dominio.modelos.identidade_empresa import IdentidadeEmpresa


def _identidade_default() -> dict:
    return {
        "nome": None,
        "cores": {},
        "fontes": {},
        "tom_de_voz": None,
        "logo_caminho": None,
        "manual_caminho": None,
    }


def carregar_identidade(sessao: Session, empresa_id: uuid.UUID) -> dict:
    """Sempre retorna um dict completo com todas as chaves esperadas pelo template.

    Política Fase 6.1: nenhum campo opcional pode chegar como `Undefined` ao Jinja.
    """
    base = _identidade_default()
    empresa = sessao.get(Empresa, empresa_id)
    if empresa is not None:
        base["nome"] = empresa.nome

    ident = sessao.get(IdentidadeEmpresa, empresa_id)
    if ident is not None:
        base.update(
            {
                "cores": ident.cores_jsonb or {},
                "fontes": ident.fontes_jsonb or {},
                "tom_de_voz": ident.tom_de_voz,
                "logo_caminho": ident.logo_caminho,
                "manual_caminho": ident.manual_caminho,
            }
        )
    return base
