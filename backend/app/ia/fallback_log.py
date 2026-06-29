"""Histórico de fallback em memória — ring buffer (Fase 5.1).

Sem persistência (Fase 6 cuidará). Mantém os últimos N eventos para exibição
imediata no dashboard de Infraestrutura.
"""
from __future__ import annotations

import threading
import uuid
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal

Motivo = Literal[
    "timeout", "rate_limit", "billing", "health_indisponivel",
    "quota_excedida", "erro_interno", "sem_modelo_configurado",
    "api_key_invalida", "modelo_indisponivel",
]


@dataclass
class EventoFallback:
    id: str
    timestamp: datetime
    missao: str | None
    categoria: str | None
    especializacao: str | None
    provider_original: str
    modelo_original: str | None
    provider_utilizado: str | None
    modelo_utilizado: str | None
    motivo: Motivo
    detalhe: str | None = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat(),
            "missao": self.missao,
            "categoria": self.categoria,
            "especializacao": self.especializacao,
            "provider_original": self.provider_original,
            "modelo_original": self.modelo_original,
            "provider_utilizado": self.provider_utilizado,
            "modelo_utilizado": self.modelo_utilizado,
            "motivo": self.motivo,
            "detalhe": self.detalhe,
        }


_LOCK = threading.Lock()
_BUFFER: deque[EventoFallback] = deque(maxlen=200)


def registrar(
    *,
    missao: str | None,
    categoria: str | None,
    especializacao: str | None,
    provider_original: str,
    modelo_original: str | None,
    provider_utilizado: str | None,
    modelo_utilizado: str | None,
    motivo: Motivo,
    detalhe: str | None = None,
) -> None:
    evento = EventoFallback(
        id=str(uuid.uuid4()),
        timestamp=datetime.now(timezone.utc),
        missao=missao,
        categoria=categoria,
        especializacao=especializacao,
        provider_original=provider_original,
        modelo_original=modelo_original,
        provider_utilizado=provider_utilizado,
        modelo_utilizado=modelo_utilizado,
        motivo=motivo,
        detalhe=(detalhe or "")[:500] or None,
    )
    with _LOCK:
        _BUFFER.append(evento)


def listar(limite: int = 100) -> list[dict]:
    with _LOCK:
        eventos = list(_BUFFER)
    eventos.reverse()  # mais recentes primeiro
    return [e.to_dict() for e in eventos[:limite]]


def contar(provider: str | None = None) -> int:
    with _LOCK:
        if provider is None:
            return len(_BUFFER)
        return sum(1 for e in _BUFFER if e.provider_original == provider)
