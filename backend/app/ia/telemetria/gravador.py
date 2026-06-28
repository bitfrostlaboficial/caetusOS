"""Gravador de telemetria — assíncrono, tolerante a falhas.

Regras (críticas):
- Nunca bloqueia a chamada de IA: persistência roda em ThreadPoolExecutor.
- Banco indisponível => log de erro e segue (a IA continua respondendo).
- Sem armazenar prompt completo por padrão — só SHA256 (LGPD).
"""
from __future__ import annotations

import hashlib
import logging
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from app.configuracao import config
from app.dominio.modelos.ia_execucao import IAExecucao, IAExecucaoEvento
from app.ia.telemetria.custos import estimar as estimar_custo

log = logging.getLogger("ia.telemetria")


# ───────── Sanitização ─────────
_CHAVES_SENSIVEIS = {
    "api_key", "apikey", "authorization", "x-api-key", "token", "refresh_token",
    "access_token", "jwt", "secret", "cookie", "set-cookie", "password",
}


def _sanitizar(metadata: dict[str, Any] | None) -> dict[str, Any]:
    if not metadata:
        return {}
    saida: dict[str, Any] = {}
    for k, v in metadata.items():
        if k.lower() in _CHAVES_SENSIVEIS:
            saida[k] = "***"
        else:
            saida[k] = v
    return saida


def _hash_prompt(prompt: str) -> str:
    return hashlib.sha256(prompt.encode("utf-8")).hexdigest()


# ───────── Estrutura em memória de uma execução em andamento ─────────
@dataclass
class ExecucaoEmAndamento:
    id: uuid.UUID
    provider: str
    modelo: str | None
    prompt: str
    habilidade: str | None
    pipeline: str | None
    empresa_id: uuid.UUID | None
    usuario_id: uuid.UUID | None
    inicio: datetime
    metadata: dict[str, Any] = field(default_factory=dict)
    eventos: list[tuple[str, str | None, dict[str, Any]]] = field(default_factory=list)


# ───────── Gravador (singleton) ─────────
class GravadorTelemetria:
    """Singleton — usado pelo Roteador. Persistência sempre em background."""

    def __init__(self) -> None:
        self._executor = ThreadPoolExecutor(
            max_workers=4, thread_name_prefix="ia-telemetria"
        )
        self._em_andamento: dict[uuid.UUID, ExecucaoEmAndamento] = {}
        self._lock = threading.Lock()

    # API pública ──────────────────────────────────────────────────────
    def iniciar(
        self,
        *,
        provider: str,
        modelo: str | None,
        prompt: str,
        habilidade: str | None = None,
        pipeline: str | None = None,
        empresa_id: uuid.UUID | None = None,
        usuario_id: uuid.UUID | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> uuid.UUID:
        exec_id = uuid.uuid4()
        ex = ExecucaoEmAndamento(
            id=exec_id,
            provider=provider,
            modelo=modelo,
            prompt=prompt,
            habilidade=habilidade,
            pipeline=pipeline,
            empresa_id=empresa_id,
            usuario_id=usuario_id,
            inicio=datetime.now(timezone.utc),
            metadata=_sanitizar(metadata),
        )
        ex.eventos.append(("INICIO", f"provider={provider} modelo={modelo}", {}))
        with self._lock:
            self._em_andamento[exec_id] = ex
        return exec_id

    def evento(
        self,
        execucao_id: uuid.UUID,
        tipo: str,
        mensagem: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> None:
        with self._lock:
            ex = self._em_andamento.get(execucao_id)
        if ex is None:
            return
        ex.eventos.append((tipo, mensagem, _sanitizar(payload)))

    def finalizar(
        self,
        execucao_id: uuid.UUID,
        *,
        status: str,
        erro: str | None = None,
        input_tokens: int | None = None,
        output_tokens: int | None = None,
        request_id: str | None = None,
        modelo_real: str | None = None,
    ) -> None:
        with self._lock:
            ex = self._em_andamento.pop(execucao_id, None)
        if ex is None:
            return

        fim = datetime.now(timezone.utc)
        duracao_ms = int((fim - ex.inicio).total_seconds() * 1000)
        modelo_final = modelo_real or ex.modelo
        total = None
        if input_tokens is not None or output_tokens is not None:
            total = (input_tokens or 0) + (output_tokens or 0)
        custo = estimar_custo(
            ex.provider, modelo_final, tokens_in=input_tokens, tokens_out=output_tokens
        )
        ex.eventos.append(
            ("FINALIZADO", f"status={status}", {"duracao_ms": duracao_ms}),
        )

        log.info(
            "[IA EXECUTION] provider=%s modelo=%s habilidade=%s tempo_ms=%s tokens=%s status=%s",
            ex.provider, modelo_final, ex.habilidade, duracao_ms, total, status,
        )

        # Persistência em background — nunca bloqueia, nunca propaga erro.
        self._executor.submit(
            self._persistir,
            ex, fim, duracao_ms, modelo_final, status, erro,
            input_tokens, output_tokens, total, custo, request_id,
        )

    # Persistência ─────────────────────────────────────────────────────
    @staticmethod
    def _persistir(
        ex: ExecucaoEmAndamento,
        fim: datetime,
        duracao_ms: int,
        modelo_final: str | None,
        status: str,
        erro: str | None,
        input_tokens: int | None,
        output_tokens: int | None,
        total_tokens: int | None,
        custo: float,
        request_id: str | None,
    ) -> None:
        try:
            from app.infraestrutura.banco.sessao import SessionLocal

            with SessionLocal() as sessao:
                with sessao.begin():
                    registro = IAExecucao(
                        id=ex.id,
                        empresa_id=ex.empresa_id,
                        usuario_id=ex.usuario_id,
                        provider=ex.provider,
                        modelo=modelo_final,
                        habilidade=ex.habilidade,
                        pipeline=ex.pipeline,
                        prompt_hash=_hash_prompt(ex.prompt),
                        prompt=ex.prompt if config.ia_store_prompts else None,
                        inicio_execucao=ex.inicio,
                        fim_execucao=fim,
                        duracao_ms=duracao_ms,
                        status=status,
                        erro=erro,
                        input_tokens=input_tokens,
                        output_tokens=output_tokens,
                        total_tokens=total_tokens,
                        custo_estimado=custo,
                        request_id=request_id,
                        metadata_json=ex.metadata or {},
                    )
                    sessao.add(registro)
                    for tipo, mensagem, payload in ex.eventos:
                        sessao.add(
                            IAExecucaoEvento(
                                execucao_id=ex.id,
                                tipo=tipo,
                                mensagem=mensagem,
                                payload_json=payload or {},
                            )
                        )
        except Exception:  # noqa: BLE001 — telemetria nunca derruba IA
            log.exception("Falha ao persistir telemetria de IA (execucao_id=%s)", ex.id)


# Instância global usada pelo Roteador.
gravador = GravadorTelemetria()


# Helpers de conveniência ──────────────────────────────────────────────
def iniciar_execucao(**kwargs: Any) -> uuid.UUID:
    return gravador.iniciar(**kwargs)


def finalizar_execucao(execucao_id: uuid.UUID, **kwargs: Any) -> None:
    gravador.finalizar(execucao_id, **kwargs)


def registrar_evento(
    execucao_id: uuid.UUID,
    tipo: str,
    mensagem: str | None = None,
    payload: dict[str, Any] | None = None,
) -> None:
    gravador.evento(execucao_id, tipo, mensagem, payload)
