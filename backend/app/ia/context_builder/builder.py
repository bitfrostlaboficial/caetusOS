from __future__ import annotations

from app.executor.comando import Comando
from app.executor.executores.base import Contexto
from app.ia.context_builder.fontes.assets import carregar_assets
from app.ia.context_builder.fontes.conhecimento_md import carregar_conhecimento
from app.ia.context_builder.fontes.historico_recente import carregar_historico
from app.ia.context_builder.fontes.identidade import carregar_identidade
from app.ia.context_builder.fontes.memoria import carregar_memoria
from sqlalchemy.orm import Session


class ContextBuilder:
    """Monta o Contexto pronto a partir do Comando (§5, §7)."""

    def __init__(self, sessao: Session) -> None:
        self.sessao = sessao

    def montar(self, comando: Comando) -> Contexto:
        return Contexto(
            identidade=carregar_identidade(self.sessao, comando.empresa_id),
            conhecimento=carregar_conhecimento(self.sessao, comando.empresa_id),
            memoria=carregar_memoria(self.sessao, comando.empresa_id, comando.projeto_id),
            assets=carregar_assets(self.sessao, comando.empresa_id, comando.projeto_id),
            historico_recente=carregar_historico(self.sessao, comando.empresa_id, comando.projeto_id),
        )
