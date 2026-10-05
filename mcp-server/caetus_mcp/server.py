"""Servidor MCP do Caetus OS (stdio).

Fala com a API REST do Caetus OS usando o token da empresa. Nada de segredo de IA passa por aqui:
as chaves BYOK ficam no cofre do backend e NUNCA são expostas por nenhuma ferramenta.

Variáveis de ambiente:
  CAETUS_API_URL   ex.: http://localhost:8000   (padrão)
  CAETUS_TOKEN     token de acesso (JWT) da empresa — provisório até existirem chaves de API (T-210)
  ou CAETUS_EMAIL + CAETUS_SENHA   (faz login ao iniciar)
"""
from __future__ import annotations

import json
import os
from typing import Any

import httpx
from mcp.server.fastmcp import FastMCP

mcp = FastMCP(
    "caetus-os",
    instructions=(
        "Ferramentas do Caetus OS. Antes de criar conteúdo, leia a marca (ler_marca) e a memória. "
        "Use listar_habilidades para descobrir o que pode executar e executar_habilidade para rodar."
    ),
)

_cliente: httpx.Client | None = None


def _http() -> httpx.Client:
    global _cliente
    if _cliente is None:
        base = os.environ.get("CAETUS_API_URL", "http://localhost:8000").rstrip("/")
        token = os.environ.get("CAETUS_TOKEN")
        c = httpx.Client(base_url=f"{base}/v1", timeout=180)
        if not token:
            email, senha = os.environ.get("CAETUS_EMAIL"), os.environ.get("CAETUS_SENHA")
            if not (email and senha):
                raise RuntimeError("Defina CAETUS_TOKEN (ou CAETUS_EMAIL e CAETUS_SENHA).")
            r = c.post("/auth/login", json={"email": email, "senha": senha})
            r.raise_for_status()
            token = r.json()["access_token"]
        c.headers["Authorization"] = f"Bearer {token}"
        _cliente = c
    return _cliente


def _chamar(metodo: str, caminho: str, **kw: Any) -> Any:
    r = _http().request(metodo, caminho, **kw)
    if r.status_code >= 400:
        try:
            detalhe = r.json()
        except ValueError:
            detalhe = r.text
        raise RuntimeError(f"Caetus OS respondeu {r.status_code}: {json.dumps(detalhe, ensure_ascii=False)[:600]}")
    return r.json() if r.content else None


# ───────── Ferramentas ─────────
@mcp.tool()
def listar_habilidades() -> list[dict]:
    """Lista as habilidades disponíveis (nome, descrição, se usa IA e o esquema de entrada)."""
    return _chamar("GET", "/habilidades")


@mcp.tool()
def executar_habilidade(alvo: str, entrada: dict[str, Any]) -> dict:
    """Executa uma habilidade pelo nome (ex.: 'conteudo.criar_post') com a entrada indicada.

    O resultado é salvo no histórico e na Biblioteca da empresa. Veja o esquema em listar_habilidades.
    """
    return _chamar("POST", "/comandos/executar", json={"alvo": alvo, "entrada": entrada})


@mcp.tool()
def ler_marca() -> dict:
    """Identidade da marca: tom de voz, cores, público, etc."""
    return _chamar("GET", "/identidade")


@mcp.tool()
def listar_memoria() -> list[dict]:
    """Preferências e fatos que a empresa pediu para lembrar."""
    return _chamar("GET", "/memoria")


@mcp.tool()
def salvar_memoria(conteudo: str, tipo: str = "preferencia", peso: int = 1) -> dict:
    """Guarda uma preferência/fato na memória da empresa (ex.: 'Nunca usar emojis')."""
    return _chamar("POST", "/memoria", json={"tipo": tipo, "conteudo": conteudo, "peso": peso})


@mcp.tool()
def listar_conhecimento() -> list[dict]:
    """Documentos da base de conhecimento (id, nome, tipo)."""
    return _chamar("GET", "/conhecimento")


@mcp.tool()
def ler_documento(documento_id: str) -> dict:
    """Conteúdo de texto de um documento da base de conhecimento."""
    return _chamar("GET", f"/conhecimento/{documento_id}/conteudo")


@mcp.tool()
def listar_biblioteca(origem: str | None = None) -> list[dict]:
    """Resultados gerados e arquivos da empresa. `origem`: 'GERADO' ou 'UPLOAD' (opcional)."""
    params = {"origem": origem.upper()} if origem else None
    return _chamar("GET", "/assets", params=params)


@mcp.tool()
def historico(limite: int = 10) -> list[dict]:
    """Últimas execuções (sucesso/erro) da empresa."""
    return _chamar("GET", "/historico", params={"limite": limite})


# ───────── Recursos (leitura) ─────────
@mcp.resource("caetus://marca")
def recurso_marca() -> str:
    """A marca da empresa como JSON — bom para anexar ao contexto do agente."""
    return json.dumps(ler_marca(), ensure_ascii=False, indent=2)


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
