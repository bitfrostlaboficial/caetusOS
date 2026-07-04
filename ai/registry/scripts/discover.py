#!/usr/bin/env python3
"""Registry do Caetus OS: descobre, valida e cataloga Capabilities.

Escaneia ai/{capabilities,workflows,knowledge}/*/manifest.yaml, valida cada
um contra o formato descrito em ai/contracts/manifest-schema.md, e imprime
um catalogo. NUNCA executa nenhuma Capability - so le e valida metadados.

Depende de PyYAML (ja e dependencia do backend deste projeto, ver
backend/pyproject.toml) - unica excecao ao padrao "so biblioteca padrao"
usado em scripts de Capability, porque nao existe parser YAML na stdlib
do Python.

Uso:
    python ai/registry/scripts/discover.py [--formato json|tabela]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import yaml

# No Windows, stdout usa o code page do console por padrão (não UTF-8), o que
# corrompe acentos quando a saída é redirecionada/lida por outro processo.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

CAMADAS_VALIDAS = {"conhecimento", "capacidade-generica", "negocio", "workflow"}
STATUS_VALIDOS = {"planejada", "em-desenvolvimento", "implementada", "deprecada"}
CUSTOS_VALIDOS = {
    "gratuito", "baixo", "medio", "alto", "variavel", "desconhecido", "nao_aplicavel",
}
CAMPOS_OBRIGATORIOS = [
    "manifesto_versao", "id", "nome", "versao", "descricao", "camada", "categoria",
    "entradas", "saidas", "contratos", "dependencias", "permissoes",
    "modelos_compativeis", "adapters_disponiveis", "custo_estimado",
    "timeout_segundos", "tags", "autor", "data_criacao", "status",
]
PERMISSAO_EXCLUSIVA_CONHECIMENTO = "leitura_conhecimento_empresa"

PASTAS_POR_CAMADA = {
    "capabilities": None,  # pode conter capacidade-generica OU negocio
    "workflows": "workflow",
    "knowledge": "conhecimento",
}


def _raiz_do_repo() -> Path:
    # este arquivo vive em <raiz>/ai/registry/scripts/discover.py
    return Path(__file__).resolve().parents[3]


def _descobrir_manifestos(raiz: Path) -> list[Path]:
    encontrados: list[Path] = []
    for pasta in PASTAS_POR_CAMADA:
        base = raiz / "ai" / pasta
        if not base.is_dir():
            continue
        encontrados.extend(sorted(base.glob("*/manifest.yaml")))
    return encontrados


def _validar_manifesto(caminho: Path, dados: dict[str, Any], pasta_pai: str) -> list[str]:
    erros: list[str] = []

    for campo in CAMPOS_OBRIGATORIOS:
        if campo not in dados:
            erros.append(f"campo obrigatório ausente: '{campo}'")

    if erros:
        return erros  # sem os campos básicos, as checagens abaixo não fazem sentido

    slug_pasta = caminho.parent.name
    if dados["id"] != slug_pasta:
        erros.append(f"id '{dados['id']}' não bate com o nome da pasta '{slug_pasta}'")

    if dados["camada"] not in CAMADAS_VALIDAS:
        erros.append(f"camada inválida: '{dados['camada']}' (válidas: {sorted(CAMADAS_VALIDAS)})")

    camada_esperada = PASTAS_POR_CAMADA.get(pasta_pai)
    if camada_esperada and dados["camada"] != camada_esperada:
        erros.append(
            f"Capability está em ai/{pasta_pai}/ mas declara camada '{dados['camada']}' "
            f"(esperado: '{camada_esperada}')"
        )

    if dados["status"] not in STATUS_VALIDOS:
        erros.append(f"status inválido: '{dados['status']}' (válidos: {sorted(STATUS_VALIDOS)})")

    if dados["custo_estimado"] not in CUSTOS_VALIDOS:
        erros.append(
            f"custo_estimado inválido: '{dados['custo_estimado']}' (válidos: {sorted(CUSTOS_VALIDOS)})"
        )

    permissoes = dados.get("permissoes") or []
    if PERMISSAO_EXCLUSIVA_CONHECIMENTO in permissoes and dados["camada"] != "conhecimento":
        erros.append(
            f"violação de isolamento: permissão '{PERMISSAO_EXCLUSIVA_CONHECIMENTO}' só é "
            f"permitida em Capabilities de camada 'conhecimento' (esta é '{dados['camada']}')"
        )

    return erros


def descobrir_e_validar(raiz: Path) -> dict[str, Any]:
    capabilities: list[dict[str, Any]] = []
    erros: list[dict[str, Any]] = []
    avisos: list[dict[str, Any]] = []

    for caminho in _descobrir_manifestos(raiz):
        pasta_pai = caminho.parent.parent.name  # capabilities | workflows | knowledge
        try:
            dados = yaml.safe_load(caminho.read_text(encoding="utf-8")) or {}
        except yaml.YAMLError as exc:
            erros.append({"arquivo": str(caminho), "erros": [f"YAML inválido: {exc}"]})
            continue

        erros_deste = _validar_manifesto(caminho, dados, pasta_pai)
        if erros_deste:
            erros.append({"arquivo": str(caminho), "erros": erros_deste})
            continue

        capabilities.append(dados)

    ids_conhecidos = {c["id"] for c in capabilities}
    for c in capabilities:
        for dep in c.get("dependencias") or []:
            if dep not in ids_conhecidos:
                avisos.append(
                    {
                        "capability": c["id"],
                        "aviso": f"depende de '{dep}', que ainda não tem manifest.yaml descoberto",
                    }
                )

    return {"capabilities": capabilities, "avisos": avisos, "erros": erros}


def obter_por_id(catalogo: dict[str, Any], capability_id: str) -> dict[str, Any] | None:
    """Localiza uma Capability pelo `id` no catálogo já descoberto.

    É o ponto de entrada que o Executor e o Execution Planner usam para
    "localizar Capabilities através do Registry" (ver
    ai/orchestration/executor/README.md e ai/orchestration/planner/README.md)
    sem precisar reimplementar a leitura/validação de manifestos.
    """
    for capability in catalogo["capabilities"]:
        if capability["id"] == capability_id:
            return capability
    return None


def _imprimir_tabela(catalogo: dict[str, Any]) -> None:
    linhas = catalogo["capabilities"]
    if not linhas:
        print("Nenhuma Capability com manifest.yaml encontrada.")
    else:
        largura_id = max(len(c["id"]) for c in linhas) + 2
        print(f"{'id':<{largura_id}}{'camada':<20}{'status':<18}{'versão'}")
        for c in linhas:
            print(f"{c['id']:<{largura_id}}{c['camada']:<20}{c['status']:<18}{c.get('versao') or '—'}")

    if catalogo["avisos"]:
        print("\nAvisos:")
        for a in catalogo["avisos"]:
            print(f"  - {a['capability']}: {a['aviso']}")

    if catalogo["erros"]:
        print("\nErros:")
        for e in catalogo["erros"]:
            print(f"  - {e['arquivo']}:")
            for msg in e["erros"]:
                print(f"      {msg}")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Registry: descobre e valida Capabilities do Caetus OS.")
    ap.add_argument("--formato", choices=["json", "tabela"], default="json")
    ap.add_argument(
        "--id", default=None,
        help="Devolve só a Capability com este id (uso do Executor/Planner), em vez do catálogo inteiro.",
    )
    args = ap.parse_args(argv)

    catalogo = descobrir_e_validar(_raiz_do_repo())

    if args.id:
        encontrada = obter_por_id(catalogo, args.id)
        if encontrada is None:
            print(json.dumps({"capability": None, "error": f"'{args.id}' não encontrada no catálogo"}, ensure_ascii=False, indent=2))
            return 1
        print(json.dumps({"capability": encontrada, "error": None}, ensure_ascii=False, indent=2))
        return 0

    if args.formato == "tabela":
        _imprimir_tabela(catalogo)
    else:
        print(json.dumps(catalogo, ensure_ascii=False, indent=2))

    return 1 if catalogo["erros"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
