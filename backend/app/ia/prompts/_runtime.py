"""Ambiente Jinja resiliente — Fase 6.1.

- `ChainableUndefined` permite `a.b.c` sem explodir quando algo é ausente.
- Filtro `tojson` customizado converte Undefined/PydanticUndefined em `null`.
- Helper `normalizar_para_template` sanitiza qualquer estrutura antes do render.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jinja2 import ChainableUndefined, Environment, FileSystemLoader, Undefined, select_autoescape

try:  # pragma: no cover - pydantic é dep direta, mas mantemos defensivo
    from pydantic_core import PydanticUndefinedType  # type: ignore
except Exception:  # noqa: BLE001
    PydanticUndefinedType = ()  # type: ignore[assignment]


def _eh_undefined(valor: Any) -> bool:
    if isinstance(valor, Undefined):
        return True
    if PydanticUndefinedType and isinstance(valor, PydanticUndefinedType):  # type: ignore[arg-type]
        return True
    nome = type(valor).__name__
    return nome in {"UndefinedType", "PydanticUndefinedType", "_Missing"}


def normalizar_para_template(valor: Any) -> Any:
    """Converte recursivamente Undefined/MISSING/PydanticUndefined em None."""
    if _eh_undefined(valor) or valor is None:
        return None
    if isinstance(valor, dict):
        return {k: normalizar_para_template(v) for k, v in valor.items()}
    if isinstance(valor, (list, tuple)):
        return [normalizar_para_template(v) for v in valor]
    return valor


def _tojson_seguro(valor: Any, indent: int | None = None) -> str:
    return json.dumps(normalizar_para_template(valor), ensure_ascii=False, indent=indent, default=str)


def construir_environment(prompts_dir: Path) -> Environment:
    env = Environment(
        loader=FileSystemLoader(prompts_dir),
        autoescape=select_autoescape([]),
        undefined=ChainableUndefined,
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.filters["tojson"] = _tojson_seguro
    return env


def descrever_campos(rotulo: str, valor: Any) -> list[str]:
    """Devolve linhas `rotulo.campo -> tipo` para log de diagnóstico (sem dados)."""
    linhas: list[str] = []
    if isinstance(valor, dict):
        if not valor:
            linhas.append(f"{rotulo} -> {{}} (vazio)")
        for k, v in valor.items():
            tipo = "None" if v is None else type(v).__name__
            linhas.append(f"{rotulo}.{k} -> {tipo}")
    else:
        tipo = "None" if valor is None else type(valor).__name__
        linhas.append(f"{rotulo} -> {tipo}")
    return linhas
