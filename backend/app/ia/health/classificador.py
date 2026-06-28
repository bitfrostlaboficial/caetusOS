"""Classificador inteligente de erros de provedores de IA (Fase 2).

Mapeia mensagens/códigos HTTP em um `StatusClassificado` que enriquece o
`HealthStatus` retornado pelo Provider, sem precisar mudar a interface dele.

Regras polimórficas — nenhum `if provider == "x"`. As mensagens podem vir em
qualquer idioma, então usamos heurísticas sobre o texto em lowercase.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

# ───────── Status canônicos ─────────
STATUS_OK = "OK"
STATUS_API_KEY_INVALIDA = "API_KEY_INVALIDA"
STATUS_ACEITE_TERMOS = "ACEITE_TERMOS"
STATUS_BILLING = "BILLING"
STATUS_MODELO_REMOVIDO = "MODELO_REMOVIDO"
STATUS_MODELO_DEPRECIADO = "MODELO_DEPRECIADO"
STATUS_RATE_LIMIT = "RATE_LIMIT"
STATUS_SERVICO_INDISPONIVEL = "SERVICO_INDISPONIVEL"
STATUS_TIMEOUT = "TIMEOUT"
STATUS_DNS_ERROR = "DNS_ERROR"
STATUS_SSL_ERROR = "SSL_ERROR"
STATUS_SEM_CONEXAO = "SEM_CONEXAO"
STATUS_QUOTA_EXCEDIDA = "QUOTA_EXCEDIDA"
STATUS_CONTA_SUSPENSA = "CONTA_SUSPENSA"
STATUS_AUTH_ERROR = "AUTH_ERROR"
STATUS_DESCONHECIDO = "DESCONHECIDO"

# Severidade derivada
_SEV_ERROR = "error"
_SEV_WARNING = "warning"
_SEV_OK = "ok"

_RE_HTTP = re.compile(r"\b(\d{3})\b")


@dataclass
class StatusClassificado:
    status: str
    severidade: str  # ok | warning | error
    descricao: str
    acao_recomendada: str
    codigo_http: int | None = None
    requer_acao: bool = True
    api_key_ok: bool = True
    billing_ok: bool = True
    termos_ok: bool = True
    modelo_disponivel: bool = True


def _extrair_http(msg: str) -> int | None:
    m = _RE_HTTP.search(msg)
    if not m:
        return None
    code = int(m.group(1))
    return code if 100 <= code <= 599 else None


def classificar(mensagem: str, *, provider: str = "") -> StatusClassificado:
    """Classifica uma mensagem de erro em um status canônico."""
    msg = (mensagem or "").strip()
    low = msg.lower()
    http = _extrair_http(msg)

    # ───── Erros de rede (antes de HTTP) ─────
    if "timeout" in low or "timed out" in low:
        return StatusClassificado(
            status=STATUS_TIMEOUT, severidade=_SEV_WARNING,
            descricao="Tempo limite excedido ao contactar o provedor.",
            acao_recomendada="Tentar novamente; se persistir, verificar status page.",
            codigo_http=http,
        )
    if "name or service not known" in low or "nodename nor servname" in low or "getaddrinfo" in low:
        return StatusClassificado(
            status=STATUS_DNS_ERROR, severidade=_SEV_ERROR,
            descricao="Falha de resolução DNS.", acao_recomendada="Verificar rede/DNS do servidor.",
            codigo_http=http,
        )
    if "ssl" in low or "certificate" in low:
        return StatusClassificado(
            status=STATUS_SSL_ERROR, severidade=_SEV_ERROR,
            descricao="Erro de certificado SSL.", acao_recomendada="Verificar CA bundle / data/hora do servidor.",
            codigo_http=http,
        )
    if "connection" in low and ("refused" in low or "reset" in low or "aborted" in low):
        return StatusClassificado(
            status=STATUS_SEM_CONEXAO, severidade=_SEV_ERROR,
            descricao="Sem conexão com o provedor.", acao_recomendada="Verificar firewall e disponibilidade do serviço.",
            codigo_http=http,
        )

    # ───── HTTP ─────
    if http == 401 or "unauthorized" in low or ("api key" in low and ("invalid" in low or "missing" in low)):
        return StatusClassificado(
            status=STATUS_API_KEY_INVALIDA, severidade=_SEV_ERROR,
            descricao="API Key inválida ou ausente.",
            acao_recomendada="Gerar nova chave no dashboard do provedor.",
            codigo_http=http or 401, api_key_ok=False,
        )
    if http == 403 or "forbidden" in low or "permission" in low:
        if "terms" in low or "tos" in low or "accept" in low:
            return StatusClassificado(
                status=STATUS_ACEITE_TERMOS, severidade=_SEV_ERROR,
                descricao="É necessário aceitar os termos de uso do provedor.",
                acao_recomendada="Acessar o dashboard do provedor e aceitar os novos termos.",
                codigo_http=http or 403, termos_ok=False,
            )
        if "billing" in low or "payment" in low or "credit" in low or "card" in low:
            return StatusClassificado(
                status=STATUS_BILLING, severidade=_SEV_ERROR,
                descricao="Billing pendente ou desativado.",
                acao_recomendada="Adicionar/atualizar método de pagamento no dashboard.",
                codigo_http=http or 403, billing_ok=False,
            )
        if "suspend" in low or "disabled" in low or "banned" in low:
            return StatusClassificado(
                status=STATUS_CONTA_SUSPENSA, severidade=_SEV_ERROR,
                descricao="Conta suspensa pelo provedor.",
                acao_recomendada="Entrar em contato com o suporte do provedor.",
                codigo_http=http or 403,
            )
        return StatusClassificado(
            status=STATUS_BILLING, severidade=_SEV_WARNING,
            descricao="Acesso negado (provavelmente billing/permissões).",
            acao_recomendada="Verificar billing e permissões no console do provedor.",
            codigo_http=http or 403, billing_ok=False,
        )
    if http == 404 or "not found" in low or "no such model" in low or ("model" in low and "does not exist" in low):
        return StatusClassificado(
            status=STATUS_MODELO_REMOVIDO, severidade=_SEV_ERROR,
            descricao="Modelo não encontrado ou removido pelo provedor.",
            acao_recomendada="Atualizar o modelo padrão no .env.",
            codigo_http=http or 404, modelo_disponivel=False,
        )
    if "deprecat" in low:
        return StatusClassificado(
            status=STATUS_MODELO_DEPRECIADO, severidade=_SEV_WARNING,
            descricao="Modelo marcado como depreciado pelo provedor.",
            acao_recomendada="Migrar para o sucessor recomendado.",
            codigo_http=http, modelo_disponivel=True,
        )
    if http == 429 or "rate limit" in low or "too many" in low:
        return StatusClassificado(
            status=STATUS_RATE_LIMIT, severidade=_SEV_WARNING,
            descricao="Limite de requisições atingido.",
            acao_recomendada="Reduzir frequência ou aumentar o plano.",
            codigo_http=http or 429, requer_acao=False,
        )
    if "quota" in low or "exceeded" in low:
        return StatusClassificado(
            status=STATUS_QUOTA_EXCEDIDA, severidade=_SEV_WARNING,
            descricao="Quota mensal/diária excedida.",
            acao_recomendada="Aguardar reset ou aumentar plano.",
            codigo_http=http,
        )
    if http in (500, 502, 503, 504):
        return StatusClassificado(
            status=STATUS_SERVICO_INDISPONIVEL, severidade=_SEV_WARNING,
            descricao="Serviço do provedor indisponível.",
            acao_recomendada="Aguardar; verificar status page do provedor.",
            codigo_http=http, requer_acao=False,
        )
    if http and 400 <= http < 500:
        return StatusClassificado(
            status=STATUS_AUTH_ERROR, severidade=_SEV_ERROR,
            descricao=f"Erro do cliente ({http}).",
            acao_recomendada="Revisar credenciais e parâmetros enviados ao provedor.",
            codigo_http=http,
        )

    return StatusClassificado(
        status=STATUS_DESCONHECIDO, severidade=_SEV_ERROR,
        descricao=msg[:240] or "Falha desconhecida.",
        acao_recomendada="Investigar logs do provedor.",
        codigo_http=http,
    )


def classificar_ok(latencia_ms: int | None) -> StatusClassificado:
    return StatusClassificado(
        status=STATUS_OK, severidade=_SEV_OK,
        descricao=f"Provedor operacional ({latencia_ms} ms)." if latencia_ms else "Provedor operacional.",
        acao_recomendada="", requer_acao=False,
    )
