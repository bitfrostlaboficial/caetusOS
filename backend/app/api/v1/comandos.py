"""Endpoint único de execução. POST /v1/comandos/executar (§4 / §11).

Fase 6: nunca retorna 200 mascarando erro. Sempre devolve `request_id`.
"""
from __future__ import annotations

import logging
import traceback
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import obter_db, usuario_atual
from app.configuracao import config
from app.dominio.erros import (
    HabilidadeNaoRegistrada,
    SchemaVersionNaoSuportado,
    TipoComandoNaoRegistrado,
)
from app.dominio.modelos.usuario import Usuario
from app.executor.base import Executor
from app.executor.comando import Comando
from app.executor.tipos import Origem, TipoComando
from app.infraestrutura.observabilidade.contexto import set_contexto
from app.infraestrutura.observabilidade.logger import log_evento

log = logging.getLogger("caetusos.comandos")

router = APIRouter(prefix="/comandos", tags=["comandos"])


class ComandoEntrada(BaseModel):
    schema_version: int = 1
    tipo: TipoComando = TipoComando.SKILL
    alvo: str = Field(..., examples=["conteudo.criar_post"])
    entrada: dict[str, Any] = Field(default_factory=dict)
    projeto_id: uuid.UUID | None = None
    origem: Origem = Origem.WEB


def _serializar_seguro(valor: Any, _caminho: str = "") -> Any:
    """Sanitiza recursivamente o payload de resposta.

    Fase 6.1: emite [SERIALIZACAO] com caminho + tipo + módulo de QUALQUER
    valor não-JSON detectado, antes de cair no fallback. Assim a próxima
    execução revela exatamente qual campo está vindo `Undefined`.
    """
    if valor is None or isinstance(valor, (bool, int, float, str)):
        return valor
    if isinstance(valor, uuid.UUID):
        return str(valor)
    if isinstance(valor, dict):
        return {k: _serializar_seguro(v, f"{_caminho}.{k}") for k, v in valor.items()}
    if isinstance(valor, (list, tuple)):
        return [_serializar_seguro(v, f"{_caminho}[{i}]") for i, v in enumerate(valor)]
    nome = type(valor).__name__
    modulo = type(valor).__module__
    if nome in {"PydanticUndefinedType", "UndefinedType", "_MISSING_TYPE"}:
        log_evento(
            log, logging.WARNING, "SERIALIZACAO",
            "campo não serializável detectado",
            campo=(_caminho or "<root>"), tipo=nome, modulo=modulo,
        )
        return None
    log_evento(
        log, logging.WARNING, "SERIALIZACAO",
        "tipo não-JSON convertido para string",
        campo=(_caminho or "<root>"), tipo=nome, modulo=modulo,
    )
    return str(valor)


@router.post("/executar")
def executar(
    dados: ComandoEntrada,
    request: Request,
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_db),
):
    request_id = getattr(request.state, "request_id", None)
    set_contexto(
        empresa_id=usuario.empresa_id,
        usuario_id=usuario.id,
        missao=dados.alvo,
    )
    log_evento(
        log, logging.INFO, "COMANDO",
        f"recebido alvo={dados.alvo}",
        tipo=dados.tipo.value, origem=dados.origem.value,
        projeto_id=str(dados.projeto_id) if dados.projeto_id else None,
    )

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
        raise HTTPException(status_code=400, detail={"erro": str(exc), "request_id": request_id})
    except (HabilidadeNaoRegistrada, TipoComandoNaoRegistrado) as exc:
        raise HTTPException(status_code=404, detail={"erro": str(exc), "request_id": request_id})
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        tb = traceback.format_exc()
        log_evento(
            log, logging.ERROR, "ERRO",
            f"executor falhou para alvo={dados.alvo}",
            tipo=type(exc).__name__, mensagem=str(exc)[:300],
        )
        log.error("stacktrace:\n%s", tb)
        detalhe: dict[str, Any] = {
            "erro": {"tipo": type(exc).__name__, "mensagem": str(exc)},
            "request_id": request_id,
        }
        if config.debug:
            detalhe["stacktrace"] = tb.splitlines()[-20:]
        raise HTTPException(status_code=500, detail=detalhe)

    corpo = {
        "request_id": request_id,
        "sucesso": resultado.sucesso,
        "execucao_id": str(resultado.execucao_id),
        "dados": resultado.dados,
        "mensagens": resultado.mensagens,
        "arquivos": [
            {"id": str(a.id), "categoria": a.categoria, "caminho": a.caminho_storage}
            for a in resultado.arquivos
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
    corpo = _serializar_seguro(corpo)

    # Regra Fase 6: falha de negócio NUNCA retorna 200.
    if not resultado.sucesso:
        log_evento(
            log, logging.WARNING, "EXECUTOR",
            f"resultado=ERRO alvo={dados.alvo}",
            codigo=corpo.get("erro", {}).get("codigo") if corpo.get("erro") else None,
        )
        raise HTTPException(status_code=422, detail=corpo)

    log_evento(
        log, logging.INFO, "EXECUTOR",
        f"resultado=SUCESSO alvo={dados.alvo}",
        provedor=resultado.metricas.provedor,
        latencia_ms=resultado.metricas.latencia_ms,
    )
    return corpo
