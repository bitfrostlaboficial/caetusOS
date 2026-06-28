"""Endpoint único de execução. POST /v1/comandos/executar (§4 / §11)."""
from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import obter_db, usuario_atual
from app.dominio.erros import HabilidadeNaoRegistrada, SchemaVersionNaoSuportado, TipoComandoNaoRegistrado
from app.dominio.modelos.usuario import Usuario
from app.executor.base import Executor
from app.executor.comando import Comando
from app.executor.tipos import Origem, TipoComando

router = APIRouter(prefix="/comandos", tags=["comandos"])


class ComandoEntrada(BaseModel):
    schema_version: int = 1
    tipo: TipoComando = TipoComando.SKILL
    alvo: str = Field(..., examples=["conteudo.criar_post"])
    entrada: dict[str, Any] = Field(default_factory=dict)
    projeto_id: uuid.UUID | None = None
    origem: Origem = Origem.WEB


@router.post("/executar")
def executar(
    dados: ComandoEntrada,
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
):
    comando = Comando(
        schema_version=dados.schema_version,
        tipo=dados.tipo,
        alvo=dados.alvo,
        entrada=dados.entrada,
        empresa_id=usuario.empresa_id,
        usuario_id=usuario.id,
        origem=dados.origem,
        projeto_id=dados.projeto_id,
    )
    try:
        executor = Executor(sessao)
        resultado = executor.executar(comando)
    except SchemaVersionNaoSuportado as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except (HabilidadeNaoRegistrada, TipoComandoNaoRegistrado) as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return {
        "sucesso": resultado.sucesso,
        "execucao_id": str(resultado.execucao_id),
        "dados": resultado.dados,
        "mensagens": resultado.mensagens,
        "arquivos": [
            {"id": str(a.id), "categoria": a.categoria, "caminho": a.caminho_storage} for a in resultado.arquivos
        ],
        "metricas": {
            "provedor": resultado.metricas.provedor,
            "tokens_in": resultado.metricas.tokens_in,
            "tokens_out": resultado.metricas.tokens_out,
            "custo": resultado.metricas.custo,
            "latencia_ms": resultado.metricas.latencia_ms,
        },
        "erro": (
            {"codigo": resultado.erro.codigo, "mensagem": resultado.erro.mensagem}
            if resultado.erro
            else None
        ),
    }
