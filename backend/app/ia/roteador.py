"""AI Router (§8) — desacoplado dos provedores.

Telemetria automática (Fase 4): toda chamada a `executar()` é gravada via
`app.ia.telemetria.gravador`. Provedores e habilidades não conhecem essa camada.

Fase 5.1: adiciona `executar_missao` / `executar_categoria` /
`executar_especializacao` com seleção inteligente por peso + fallback automático
+ métricas. Tudo ADITIVO — `executar(provider=...)` permanece intacto.
"""
from __future__ import annotations

import logging
import time
import uuid
from typing import Any

from app.ia.categorias import (
    ESPECIALIZACAO_DA_CATEGORIA,
    CategoriaIA,
    EspecializacaoIA,
)
from app.ia.provedores.base import Provider, RespostaIA
from app.ia.provedores.fal import FalProvedor
from app.ia.provedores.gemini import GeminiProvedor
from app.ia.provedores.groq import GroqProvedor
from app.ia.provedores.huggingface import HuggingFaceProvedor
from app.ia.provedores.openrouter import OpenRouterProvedor
from app.ia.telemetria import gravador
from app.infraestrutura.observabilidade.logger import log_evento

log = logging.getLogger("caetusos.roteador")

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


# ───────── Mapa domínio → provedor (legado, mantido) ─────────
MAPA_DOMINIOS: dict[str, str] = {
    "conteudo": "gemini",
    "texto": "groq",
}

PROVEDOR_PADRAO = "gemini"


def por_dominio(dominio: str) -> Provider:
    nome = MAPA_DOMINIOS.get(dominio, PROVEDOR_PADRAO)
    return obter(nome)


def resolver_provedor(dominio: str) -> Provider:
    """Compat. com habilidades antigas — preservado."""
    return por_dominio(dominio)


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
    """Ponto único de entrada (legado + atual). Telemetria automática."""
    prov = obter(provider)
    modelo_final = modelo or prov.configuracao().get("modelo")
    exec_id = gravador.iniciar(
        provider=provider, modelo=modelo_final, prompt=prompt,
        habilidade=habilidade, pipeline=pipeline,
        empresa_id=empresa_id, usuario_id=usuario_id, metadata=metadata,
    )
    gravador.evento(exec_id, "PROVIDER_SELECIONADO", f"provider={provider}")
    gravador.evento(exec_id, "REQUISICAO_ENVIADA")

    log_evento(
        log, logging.INFO, "IA",
        f"chamando {provider}",
        modelo=modelo_final, prompt_chars=len(prompt or ""),
        habilidade=habilidade, pipeline=pipeline,
    )

    inicio = time.perf_counter()
    try:
        resposta = prov.executar(prompt, modelo=modelo, max_tokens=max_tokens, **kwargs)
        latencia_ms = int((time.perf_counter() - inicio) * 1000)
        gravador.evento(exec_id, "RESPOSTA_RECEBIDA")
        gravador.finalizar(
            exec_id, status="sucesso",
            input_tokens=resposta.tokens_in or None,
            output_tokens=resposta.tokens_out or None,
            modelo_real=resposta.modelo,
        )
        # Métricas in-memory (Fase 5.1)
        from app.ia import metricas as _metricas
        _metricas.registrar_sucesso(provider, resposta.modelo or modelo_final or "", latencia_ms)
        log_evento(
            log, logging.INFO, "IA",
            f"resposta de {provider} OK",
            modelo=resposta.modelo or modelo_final,
            tokens_in=resposta.tokens_in, tokens_out=resposta.tokens_out,
            latencia_ms=latencia_ms, custo=resposta.custo,
        )
        return resposta
    except Exception as exc:
        latencia_ms = int((time.perf_counter() - inicio) * 1000)
        gravador.evento(exec_id, "ERRO", str(exc)[:500])
        gravador.finalizar(exec_id, status="erro", erro=str(exc)[:1000])
        from app.ia import metricas as _metricas
        msg = str(exc).lower()
        _metricas.registrar_falha(
            provider, modelo_final or "", latencia_ms=latencia_ms,
            timeout="timeout" in msg or "timed out" in msg,
            rate_limit="429" in msg or "rate" in msg,
        )
        log_evento(
            log, logging.ERROR, "IA",
            f"falha em {provider}",
            modelo=modelo_final, latencia_ms=latencia_ms,
            tipo=type(exc).__name__, mensagem=str(exc)[:200],
        )
        raise


# ═══════════════════════════════════════════════════════════════════
# Fase 5.1 — Roteamento inteligente por Missão / Categoria
# ═══════════════════════════════════════════════════════════════════


class NenhumProvedorDisponivel(RuntimeError):
    """Todos os candidatos para a missão falharam ou estão indisponíveis."""


def _motivo_de_erro(exc: Exception) -> str:
    msg = str(exc).lower()
    if "timeout" in msg or "timed out" in msg:
        return "timeout"
    if "429" in msg or "rate limit" in msg or "too many" in msg:
        return "rate_limit"
    if "quota" in msg or "exceeded" in msg:
        return "quota_excedida"
    if "401" in msg or "unauthorized" in msg or "api key" in msg:
        return "api_key_invalida"
    if "billing" in msg or "payment" in msg:
        return "billing"
    if "404" in msg or "not found" in msg:
        return "modelo_indisponivel"
    return "erro_interno"


def _candidatos_para(
    *,
    categoria: CategoriaIA | None,
    especializacao: EspecializacaoIA | None,
    prefere: str = "velocidade",
) -> list[tuple[str, str, dict]]:
    """Retorna [(provider, modelo, info)] ordenados por peso desc.

    Filtra entradas cujo provider não está registrado ou cujo modelo está vazio.
    Aplica bônus/penalidades suaves conforme a preferência.
    """
    # import tardio para evitar ciclo na inicialização
    from app.ia.catalogo import CATALOGO_PADRAO
    from app.ia.metricas import metricas_de

    entradas = CATALOGO_PADRAO()
    cands: list[tuple[int, str, str, dict]] = []
    for e in entradas:
        if categoria and e.categoria != categoria:
            continue
        if especializacao and e.especializacao != especializacao:
            continue
        if e.provider not in _REGISTRO:
            continue
        modelo = e.modelo
        if not modelo:
            continue

        peso = e.peso
        # Ajustes leves por preferência da missão.
        m = metricas_de(e.provider, modelo)
        if prefere == "velocidade" and m and m.get("lat_media_ms"):
            # penaliza 1 ponto a cada 500ms acima de 1s
            extra = max(0, (m["lat_media_ms"] - 1000) // 500)
            peso = max(0, peso - extra)
        elif prefere == "qualidade":
            if e.custo.value == "high":
                peso += 5
            elif e.custo.value == "free":
                peso -= 3
        elif prefere == "custo":
            if e.custo.value == "free":
                peso += 10
            elif e.custo.value == "high":
                peso -= 10
        elif prefere == "precisao":
            if e.custo.value in ("high", "medium"):
                peso += 3

        info = {
            "categoria": e.categoria.value,
            "especializacao": e.especializacao.value,
            "peso_base": e.peso_default,
            "peso_final": peso,
            "custo": e.custo.value,
        }
        cands.append((peso, e.provider, modelo, info))

    cands.sort(key=lambda x: x[0], reverse=True)
    return [(prov, mod, info) for _, prov, mod, info in cands]


def _esta_indisponivel(provider: str, modelo: str | None) -> tuple[bool, str | None]:
    """Consulta o health repositorio (Fase 2) — soft check.

    Não bloqueia: se falhar a consulta, simplesmente tenta o provider.
    """
    try:
        from app.infraestrutura.banco.sessao import SessionLocal
        from app.ia.health import repositorio as health_repo

        with SessionLocal() as s:
            estado = health_repo.buscar_estado(s, provider=provider, modelo=modelo)
            if estado is None:
                return False, None
            if estado.status in {
                "API_KEY_INVALIDA", "CONTA_SUSPENSA", "BILLING",
                "MODELO_REMOVIDO", "ACEITE_TERMOS",
            }:
                return True, estado.status
            return False, None
    except Exception:  # noqa: BLE001
        return False, None


def executar_missao(
    nome_missao: str,
    prompt: str,
    *,
    max_tokens: int | None = None,
    empresa_id: uuid.UUID | None = None,
    usuario_id: uuid.UUID | None = None,
    pipeline: str | None = None,
    metadata: dict[str, Any] | None = None,
    **kwargs: Any,
) -> RespostaIA:
    """Executa uma missão escolhendo automaticamente o melhor provider/modelo.

    - Modo MANUAL: respeita o override do perfil (se houver).
    - Modo AUTOMATICO: ordena candidatos por peso e tenta em cascata.
    - Em qualquer falha, registra fallback e tenta o próximo candidato.
    """
    from app.ia import fallback_log, perfis
    from app.ia.missoes import obter as obter_missao

    missao = obter_missao(nome_missao)
    tokens = max_tokens or missao.max_tokens or 1024

    # ── Modo manual: força um provider específico ─────────────────
    if perfis.modo() == "manual":
        forcado = perfis.override_manual(nome_missao)
        if forcado:
            return executar(
                provider=forcado, prompt=prompt, max_tokens=tokens,
                habilidade=nome_missao, pipeline=pipeline or "missao",
                empresa_id=empresa_id, usuario_id=usuario_id,
                metadata={**(metadata or {}), "missao": nome_missao, "modo": "manual"},
                **kwargs,
            )

    candidatos = _candidatos_para(
        categoria=missao.categoria,
        especializacao=missao.especializacao,
        prefere=missao.prefere,
    )

    # Relax automático: se nenhuma entrada bate na especialização, tenta só pela categoria.
    if not candidatos:
        candidatos = _candidatos_para(categoria=missao.categoria, especializacao=None)

    if not candidatos:
        fallback_log.registrar(
            missao=nome_missao, categoria=missao.categoria.value,
            especializacao=missao.especializacao.value,
            provider_original="-", modelo_original=None,
            provider_utilizado=None, modelo_utilizado=None,
            motivo="sem_modelo_configurado",
            detalhe="Nenhuma entrada do catálogo bate com essa missão.",
        )
        raise NenhumProvedorDisponivel(
            f"Nenhum provider disponível para missão '{nome_missao}'."
        )

    primeiro_prov, primeiro_mod, _ = candidatos[0]
    ultimo_erro: Exception | None = None
    tentativas: list[dict] = []

    for idx, (prov, mod, info) in enumerate(candidatos):
        indisp, status = _esta_indisponivel(prov, mod)
        if indisp:
            fallback_log.registrar(
                missao=nome_missao, categoria=missao.categoria.value,
                especializacao=missao.especializacao.value,
                provider_original=primeiro_prov, modelo_original=primeiro_mod,
                provider_utilizado=None, modelo_utilizado=None,
                motivo="health_indisponivel",
                detalhe=f"{prov}/{mod}: status={status}",
            )
            tentativas.append({"provider": prov, "modelo": mod, "resultado": "skip_health"})
            continue

        try:
            md = {
                **(metadata or {}),
                "missao": nome_missao,
                "categoria": missao.categoria.value,
                "especializacao": missao.especializacao.value,
                "peso_usado": info["peso_final"],
                "tentativa": idx + 1,
                "modo": "automatico",
            }
            resposta = executar(
                provider=prov, prompt=prompt, modelo=mod, max_tokens=tokens,
                habilidade=nome_missao, pipeline=pipeline or "missao",
                empresa_id=empresa_id, usuario_id=usuario_id,
                metadata=md, **kwargs,
            )
            if idx > 0:
                fallback_log.registrar(
                    missao=nome_missao, categoria=missao.categoria.value,
                    especializacao=missao.especializacao.value,
                    provider_original=primeiro_prov, modelo_original=primeiro_mod,
                    provider_utilizado=prov, modelo_utilizado=mod,
                    motivo="erro_interno",
                    detalhe=f"Fallback após {idx} tentativa(s).",
                )
            return resposta
        except Exception as exc:  # noqa: BLE001
            ultimo_erro = exc
            motivo = _motivo_de_erro(exc)
            tentativas.append(
                {"provider": prov, "modelo": mod, "resultado": "erro", "motivo": motivo}
            )
            fallback_log.registrar(
                missao=nome_missao, categoria=missao.categoria.value,
                especializacao=missao.especializacao.value,
                provider_original=prov, modelo_original=mod,
                provider_utilizado=None, modelo_utilizado=None,
                motivo=motivo,  # type: ignore[arg-type]
                detalhe=str(exc)[:300],
            )
            log.warning(
                "[IA ROTEADOR] missao=%s tentativa=%d %s/%s falhou: %s",
                nome_missao, idx + 1, prov, mod, motivo,
            )
            continue

    raise NenhumProvedorDisponivel(
        f"Todos os candidatos falharam para missão '{nome_missao}'. "
        f"Último erro: {ultimo_erro}"
    )


def executar_categoria(
    categoria: CategoriaIA,
    prompt: str,
    *,
    especializacao: EspecializacaoIA | None = None,
    max_tokens: int = 1024,
    **kwargs: Any,
) -> RespostaIA:
    """Atalho quando não há missão definida — escolhe pelo catálogo direto."""
    candidatos = _candidatos_para(categoria=categoria, especializacao=especializacao)
    if not candidatos:
        raise NenhumProvedorDisponivel(
            f"Sem candidatos para categoria={categoria.value} "
            f"especializacao={especializacao.value if especializacao else '-'}."
        )
    ultimo_erro: Exception | None = None
    for prov, mod, _info in candidatos:
        try:
            return executar(
                provider=prov, prompt=prompt, modelo=mod,
                max_tokens=max_tokens, pipeline="categoria", **kwargs,
            )
        except Exception as exc:  # noqa: BLE001
            ultimo_erro = exc
            continue
    raise NenhumProvedorDisponivel(str(ultimo_erro))


def executar_especializacao(
    especializacao: EspecializacaoIA,
    prompt: str,
    *,
    max_tokens: int = 1024,
    **kwargs: Any,
) -> RespostaIA:
    categoria = ESPECIALIZACAO_DA_CATEGORIA.get(especializacao)
    return executar_categoria(
        categoria or CategoriaIA.CHAT, prompt,
        especializacao=especializacao, max_tokens=max_tokens, **kwargs,
    )
