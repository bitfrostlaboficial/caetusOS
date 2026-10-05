"""BYOK — a empresa cadastra as próprias chaves de IA.

Segredos NUNCA saem daqui: respostas trazem só máscara (`••••1234`) e metadados.
"""
from __future__ import annotations

import asyncio
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import obter_db, usuario_atual
from app.configuracao import config
from app.dominio.erros import EntradaInvalida, NaoEncontrado
from app.dominio.modelos.provedor_credencial import ProvedorCredencial
from app.dominio.modelos.usuario import Usuario
from app.ia import roteador
from app.infraestrutura.seguranca import cofre
from app.servicos.credenciais_servico import CredenciaisServico

router = APIRouter(prefix="/provedores", tags=["provedores"])


class CredencialEntrada(BaseModel):
    campos: dict[str, str] = Field(default_factory=dict)
    modelo_preferido: str | None = None
    ativo: bool | None = None


def _classe(nome: str):
    try:
        return type(roteador.obter(nome))
    except KeyError:
        raise HTTPException(status_code=404, detail=f"provedor '{nome}' não suportado")


def _serializar(prov, cred: ProvedorCredencial | None) -> dict[str, Any]:
    cls = type(prov)
    cfg = prov.configuracao()
    return {
        "nome": cls.nome,
        "rotulo": cls.rotulo or cls.nome,
        "url_chave": cls.url_chave,
        "aviso": cls.aviso,
        "campos": [
            {"nome": c.nome, "rotulo": c.rotulo, "segredo": c.segredo, "obrigatorio": c.obrigatorio}
            for c in cls.campos_credencial
        ],
        "capacidades": prov.capabilities().to_dict(),
        "modelo_padrao": cfg.get("modelo"),
        "configurado": cred is not None,
        "ativo": bool(cred.ativo) if cred else False,
        "mascara": dict(cred.mascara or {}) if cred else {},
        "modelo_preferido": cred.modelo_preferido if cred else None,
        "testada_em": cred.testada_em.isoformat() if cred and cred.testada_em else None,
        "status_teste": cred.status_teste if cred else None,
        "mensagem_teste": cred.mensagem_teste if cred else None,
        # a plataforma pode cobrir esta empresa com a própria chave? (informativo)
        "plataforma_disponivel": bool(config.ia_usar_chaves_da_plataforma and cfg.get("configurado")),
    }


def _exigir_cofre() -> None:
    try:
        cofre._fernet()  # valida a chave mestra
    except cofre.CofreNaoConfigurado as exc:
        raise HTTPException(status_code=503, detail=f"cofre de credenciais indisponível: {exc}")


@router.get("")
def listar(usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_db)):
    creds = CredenciaisServico(sessao).listar(usuario.empresa_id)
    return [_serializar(p, creds.get(p.nome)) for p in roteador.listar()]


@router.put("/{nome}")
def salvar(
    nome: str,
    dados: CredencialEntrada,
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
):
    cls = _classe(nome)
    _exigir_cofre()
    try:
        extra = {"modelo_preferido": dados.modelo_preferido} if "modelo_preferido" in dados.model_fields_set else {}
        cred = CredenciaisServico(sessao).salvar(
            usuario.empresa_id, cls, campos=dados.campos, ativo=dados.ativo, **extra
        )
    except EntradaInvalida as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return _serializar(roteador.obter(nome), cred)


@router.delete("/{nome}", status_code=204)
def remover(
    nome: str,
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
):
    _classe(nome)
    try:
        CredenciaisServico(sessao).remover(usuario.empresa_id, nome)
    except NaoEncontrado as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return Response(status_code=204)


@router.post("/{nome}/testar")
async def testar(
    nome: str,
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
):
    """Testa a chave da empresa com uma chamada mínima ao provedor."""
    cls = _classe(nome)
    _exigir_cofre()
    servico = CredenciaisServico(sessao)
    cred = servico.obter(usuario.empresa_id, nome)
    if cred is None:
        raise HTTPException(status_code=404, detail="cadastre a chave antes de testar")
    try:
        campos = cofre.decifrar(cred.campos_cifrados)
    except cofre.CredencialIlegivel:
        raise HTTPException(status_code=409, detail="credencial ilegível — cadastre a chave novamente")
    instancia = cls.com_credenciais(campos, modelo=cred.modelo_preferido)
    status = await asyncio.to_thread(instancia.health_check)
    servico.registrar_teste(cred, status="ok" if status.status == "ok" else status.status, mensagem=status.message)
    return {"status": status.status, "mensagem": status.message, "acao": status.acao, "latencia_ms": status.latencia_ms}
