"""AI Router (§8) — desacoplado dos provedores.

Telemetria automática (Fase 4): toda chamada a `executar()` é gravada via
`app.ia.telemetria.gravador`. Provedores e habilidades não conhecem essa camada.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from app.ia.provedores.base import Provider, RespostaIA
from app.ia.provedores.fal import FalProvedor
from app.ia.provedores.gemini import GeminiProvedor
from app.ia.provedores.groq import GroqProvedor
from app.ia.provedores.huggingface import HuggingFaceProvedor
from app.ia.provedores.openrouter import OpenRouterProvedor
from app.ia.telemetria import gravador

log = logging.getLogger(__name__)

# ───────── Registro global ─────────
_REGISTRO: dict[str, Provider] = {}


def registrar(provedor: Provider) -> None:
    _REGISTRO[provedor.nome] = provedor


def obter(nome: str) -> Provider:
    try:
        return _REGISTRO[nome]
    except KeyError as exc:
        raise KeyError(f"Provedor '{nome}' não registrado.") from exc


def listar() -> list[Provider]:
    return list(_REGISTRO.values())


# ───────── Registro padrão (carregado na importação) ─────────
for _p in (
    GeminiProvedor(),
    GroqProvedor(),
    OpenRouterProvedor(),
    HuggingFaceProvedor(),
    FalProvedor(),
):
    registrar(_p)


# ───────── Mapa domínio → provedor (substituível) ─────────
MAPA_DOMINIOS: dict[str, str] = {
    "conteudo": "gemini",
    "texto": "groq",
}

PROVEDOR_PADRAO = "gemini"


def por_dominio(dominio: str) -> Provider:
    nome = MAPA_DOMINIOS.get(dominio, PROVEDOR_PADRAO)
    return obter(nome)


# ───────── Execução genérica (interface pública do roteador) ─────────
def executar(
    *,
    provider: str,
    prompt: str,
    modelo: str | None = None,
    max_tokens: int = 1024,
    habilidade: str | None = None,
    pipeline: str | None = None,
    empresa_id: uuid.UUID | None = None,
    usuario_id: uuid.UUID | None = None,
    metadata: dict[str, Any] | None = None,
    **kwargs: Any,
) -> RespostaIA:
    """Ponto único de entrada. Telemetria automática (Fase 4).

    Habilidades existentes continuam funcionando — os parâmetros novos são
    opcionais. Quem souber, passa empresa_id/usuario_id/habilidade para
    enriquecer a observabilidade.
    """
    prov = obter(provider)
    exec_id = gravador.iniciar(
        provider=provider,
        modelo=modelo or prov.configuracao().get("modelo"),
        prompt=prompt,
        habilidade=habilidade,
        pipeline=pipeline,
        empresa_id=empresa_id,
        usuario_id=usuario_id,
        metadata=metadata,
    )
    gravador.evento(exec_id, "PROVIDER_SELECIONADO", f"provider={provider}")
    gravador.evento(exec_id, "REQUISICAO_ENVIADA")

    try:
        resposta = prov.executar(prompt, modelo=modelo, max_tokens=max_tokens, **kwargs)
        gravador.evento(exec_id, "RESPOSTA_RECEBIDA")
        gravador.finalizar(
            exec_id,
            status="sucesso",
            input_tokens=resposta.tokens_in or None,
            output_tokens=resposta.tokens_out or None,
            modelo_real=resposta.modelo,
        )
        return resposta
    except Exception as exc:
        gravador.evento(exec_id, "ERRO", str(exc)[:500])
        gravador.finalizar(exec_id, status="erro", erro=str(exc)[:1000])
        raise


# ───────── Compat. com código existente ─────────
def resolver_provedor(dominio: str) -> Provider:
    return por_dominio(dominio)
