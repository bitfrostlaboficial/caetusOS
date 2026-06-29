"""Métricas in-memory de desempenho por (provider, modelo) — Fase 5.1.

Thread-safe. Sem persistência nesta fase (Fase 6 cuidará disso). Esses números
alimentam o dashboard e podem, no futuro, ser usados para autoajuste de pesos.
"""
from __future__ import annotations

import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class MetricasModelo:
    provider: str
    modelo: str
    chamadas: int = 0
    sucessos: int = 0
    falhas: int = 0
    timeouts: int = 0
    rate_limits: int = 0
    lat_min_ms: int | None = None
    lat_max_ms: int | None = None
    lat_total_ms: int = 0  # para média simples
    ultimo_uso: datetime | None = None
    ultima_falha: datetime | None = None

    @property
    def lat_media_ms(self) -> int:
        if self.chamadas == 0:
            return 0
        return self.lat_total_ms // self.chamadas

    @property
    def taxa_sucesso(self) -> float:
        return (self.sucessos / self.chamadas) if self.chamadas else 0.0

    def to_dict(self) -> dict:
        return {
            "provider": self.provider,
            "modelo": self.modelo,
            "chamadas": self.chamadas,
            "sucessos": self.sucessos,
            "falhas": self.falhas,
            "timeouts": self.timeouts,
            "rate_limits": self.rate_limits,
            "lat_min_ms": self.lat_min_ms,
            "lat_max_ms": self.lat_max_ms,
            "lat_media_ms": self.lat_media_ms,
            "taxa_sucesso": round(self.taxa_sucesso, 4),
            "ultimo_uso": self.ultimo_uso.isoformat() if self.ultimo_uso else None,
            "ultima_falha": self.ultima_falha.isoformat() if self.ultima_falha else None,
        }


_LOCK = threading.Lock()
_DADOS: dict[tuple[str, str], MetricasModelo] = {}


def _obter(provider: str, modelo: str) -> MetricasModelo:
    chave = (provider, modelo or "")
    if chave not in _DADOS:
        _DADOS[chave] = MetricasModelo(provider=provider, modelo=modelo or "")
    return _DADOS[chave]


def registrar_sucesso(provider: str, modelo: str, latencia_ms: int) -> None:
    agora = datetime.now(timezone.utc)
    with _LOCK:
        m = _obter(provider, modelo)
        m.chamadas += 1
        m.sucessos += 1
        m.lat_total_ms += max(0, int(latencia_ms))
        m.lat_min_ms = latencia_ms if m.lat_min_ms is None else min(m.lat_min_ms, latencia_ms)
        m.lat_max_ms = latencia_ms if m.lat_max_ms is None else max(m.lat_max_ms, latencia_ms)
        m.ultimo_uso = agora


def registrar_falha(
    provider: str, modelo: str, *, latencia_ms: int = 0,
    timeout: bool = False, rate_limit: bool = False,
) -> None:
    agora = datetime.now(timezone.utc)
    with _LOCK:
        m = _obter(provider, modelo)
        m.chamadas += 1
        m.falhas += 1
        if timeout:
            m.timeouts += 1
        if rate_limit:
            m.rate_limits += 1
        if latencia_ms > 0:
            m.lat_total_ms += latencia_ms
        m.ultimo_uso = agora
        m.ultima_falha = agora


def snapshot() -> list[dict]:
    with _LOCK:
        return [m.to_dict() for m in _DADOS.values()]


def metricas_de(provider: str, modelo: str | None) -> dict | None:
    with _LOCK:
        chave = (provider, modelo or "")
        m = _DADOS.get(chave)
        return m.to_dict() if m else None


def resetar() -> None:
    with _LOCK:
        _DADOS.clear()
