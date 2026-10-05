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


class ProvedorNaoConfigurado(RuntimeError):
    """O provedor não tem credencial — o roteador deve pular para o próximo candidato."""


def resposta_sem_chave(nome: str, variavel: str, prompt: str, modelo: str | None) -> "RespostaIA":
    """Comportamento de um provedor sem chave.

    Por padrão levanta `ProvedorNaoConfigurado` (nunca finge sucesso). Com
    `IA_PERMITIR_STUB=true` devolve um texto marcado `[stub ...]` para dev local.
    """
    from app.configuracao import config

    if not config.ia_permitir_stub:
        raise ProvedorNaoConfigurado(f"{nome}: {variavel} não configurada")
    return RespostaIA(
        texto=f"[stub {nome} sem {variavel}]\n\n{prompt[:400]}",
        provedor=nome,
        modelo=modelo,
    )


@dataclass
class RespostaIA:
    texto: str
    provedor: str
    modelo: str | None = None
    tokens_in: int = 0
    tokens_out: int = 0
    custo: float = 0.0


@dataclass(frozen=True)
class CampoCredencial:
    """Um campo que o cliente preenche para conectar o provedor (BYOK)."""

    nome: str
    rotulo: str
    segredo: bool = True
    obrigatorio: bool = True


class Provider(ABC):
    """Contrato único para todo provedor de IA."""

    nome: str
    # Metadados exibidos na tela "Provedores de IA" (BYOK).
    rotulo: str = ""
    url_chave: str = ""  # onde o cliente cria a chave
    aviso: str = ""  # limites/termos relevantes do plano gratuito
    campos_credencial: tuple[CampoCredencial, ...] = (CampoCredencial("api_key", "Chave de API"),)

    @classmethod
    def com_credenciais(cls, campos: dict[str, str], modelo: str | None = None) -> "Provider":
        """Instância configurada com as credenciais de UMA empresa (em vez do .env)."""
        return cls(api_key=campos.get("api_key", ""), modelo=modelo)  # type: ignore[call-arg]

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
