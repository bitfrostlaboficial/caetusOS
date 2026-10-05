"""BYOK — guarda/consulta as credenciais de IA de uma empresa (sempre cifradas)."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dominio.erros import EntradaInvalida, NaoEncontrado
from app.dominio.modelos.provedor_credencial import ProvedorCredencial
from app.infraestrutura.seguranca import cofre


class CredenciaisServico:
    def __init__(self, sessao: Session) -> None:
        self.sessao = sessao

    def obter(self, empresa_id: uuid.UUID, provedor: str) -> ProvedorCredencial | None:
        return self.sessao.scalar(
            select(ProvedorCredencial).where(
                ProvedorCredencial.empresa_id == empresa_id, ProvedorCredencial.provedor == provedor
            )
        )

    def listar(self, empresa_id: uuid.UUID) -> dict[str, ProvedorCredencial]:
        rows = self.sessao.scalars(
            select(ProvedorCredencial).where(ProvedorCredencial.empresa_id == empresa_id)
        ).all()
        return {r.provedor: r for r in rows}

    def campos_ativos(self, empresa_id: uuid.UUID, provedor: str) -> dict[str, str] | None:
        """Campos decifrados — SOMENTE para uso interno (nunca expor por API)."""
        cred = self.obter(empresa_id, provedor)
        if cred is None or not cred.ativo:
            return None
        return cofre.decifrar(cred.campos_cifrados)

    def salvar(
        self,
        empresa_id: uuid.UUID,
        provedor_cls: type,
        *,
        campos: dict[str, str],
        modelo_preferido: str | None | object = ...,
        ativo: bool | None = None,
    ) -> ProvedorCredencial:
        """Cria ou atualiza. Campos omitidos preservam o valor guardado; na criação os
        campos obrigatórios precisam vir preenchidos."""
        definidos = {c.nome: c for c in provedor_cls.campos_credencial}
        desconhecidos = set(campos) - set(definidos)
        if desconhecidos:
            raise EntradaInvalida(f"campos desconhecidos: {', '.join(sorted(desconhecidos))}")
        enviados = {k: v.strip() for k, v in campos.items() if isinstance(v, str) and v.strip()}

        cred = self.obter(empresa_id, provedor_cls.nome)
        atuais = cofre.decifrar(cred.campos_cifrados) if cred else {}
        finais = {**atuais, **enviados}
        faltando = [c.rotulo for c in provedor_cls.campos_credencial if c.obrigatorio and not finais.get(c.nome)]
        if faltando:
            raise EntradaInvalida(f"preencha: {', '.join(faltando)}")

        mascara = {
            nome: (cofre.mascarar(valor) if definidos[nome].segredo else valor)
            for nome, valor in finais.items()
        }
        if cred is None:
            cred = ProvedorCredencial(empresa_id=empresa_id, provedor=provedor_cls.nome)
            self.sessao.add(cred)
        cred.campos_cifrados = cofre.cifrar(finais)
        cred.mascara = mascara
        if modelo_preferido is not ...:
            cred.modelo_preferido = (modelo_preferido or None) if isinstance(modelo_preferido, (str, type(None))) else None
        if ativo is not None:
            cred.ativo = ativo
        if enviados:
            # chave nova → o resultado do último teste não vale mais
            cred.testada_em = None
            cred.status_teste = None
            cred.mensagem_teste = None
        self.sessao.flush()
        return cred

    def remover(self, empresa_id: uuid.UUID, provedor: str) -> None:
        cred = self.obter(empresa_id, provedor)
        if cred is None:
            raise NaoEncontrado("credencial não encontrada")
        self.sessao.delete(cred)
        self.sessao.flush()

    def registrar_teste(self, cred: ProvedorCredencial, *, status: str, mensagem: str | None) -> None:
        cred.testada_em = datetime.now(timezone.utc)
        cred.status_teste = status
        cred.mensagem_teste = (mensagem or "")[:500]
        self.sessao.flush()
