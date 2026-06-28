"""Interface única para qualquer provedor de IA (§8 — arquitetura definitiva).

Todo novo provedor (Anthropic, Mistral, xAI, OpenAI, DeepSeek, ...) deve apenas
implementar esta interface. O roteador e o restante do sistema NÃO conhecem
detalhes específicos de cada IA.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal


@dataclass
class Capabilities:
    chat: bool = False
    vision: bool = False
    ocr: bool = False
    image_generation: bool = False
    embeddings: bool = False
    audio: bool = False

    def to_dict(self) -> dict[str, bool]:
        return {
            "chat": self.chat,
            "vision": self.vision,
            "ocr": self.ocr,
            "image_generation": self.image_generation,
            "embeddings": self.embeddings,
            "audio": self.audio,
        }


StatusSaude = Literal["ok", "warning", "error", "unknown"]


@dataclass
class HealthStatus:
    provider: str
    status: StatusSaude
    message: str
    modelo: str | None = None
    requer_acao: bool = False
    acao: str | None = None
    latencia_ms: int | None = None
    ultima_verificacao: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    detalhes: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "status": self.status,
            "message": self.message,
            "modelo": self.modelo,
            "requer_acao": self.requer_acao,
            "acao": self.acao,
            "latencia_ms": self.latencia_ms,
            "ultima_verificacao": self.ultima_verificacao.isoformat(),
            "detalhes": self.detalhes,
        }


@dataclass
class RespostaIA:
    texto: str
    provedor: str
    modelo: str | None = None
    tokens_in: int = 0
    tokens_out: int = 0
    custo: float = 0.0


class Provider(ABC):
    """Contrato único para todo provedor de IA."""

    nome: str

    @abstractmethod
    def configuracao(self) -> dict[str, Any]:
        """Configuração pública (sem segredos) — modelo ativo, endpoint, etc."""

    @abstractmethod
    def capabilities(self) -> Capabilities: ...

    @abstractmethod
    def listar_modelos(self) -> list[str]: ...

    @abstractmethod
    def executar(
        self,
        prompt: str,
        *,
        modelo: str | None = None,
        max_tokens: int = 1024,
        **kwargs: Any,
    ) -> RespostaIA: ...

    @abstractmethod
    def health_check(self) -> HealthStatus: ...


# Alias de compatibilidade com código antigo.
ProvedorIA = Provider
