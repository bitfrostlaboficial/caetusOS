#!/usr/bin/env python3
"""CLI de geração de imagens da skill image-generator.

Escolhe um provedor automaticamente com base em qual variavel de ambiente de
API key esta definida (ver references/providers.md), chama a API, salva as
imagens em disco e imprime um unico JSON em stdout (contrato descrito em
references/output-contract.md).

Nao le nada de `empresas/` nem conhece marca/empresa: todo dado visual deve
vir explicito em --prompt. Usa so a biblioteca padrao do Python (sem
dependencias externas) para funcionar em qualquer projeto sem instalar nada.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Callable

# No Windows, stdout usa o code page do console por padrão (não UTF-8), o que
# corrompe acentos quando a saída é redirecionada/lida por outro processo.
# Força UTF-8 sempre, já que o contrato de saída desta skill é JSON em UTF-8.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

PROVIDER_ENV = {
    "openai": "OPENAI_API_KEY",
    "gemini": "GEMINI_API_KEY",
    "fal": "FAL_KEY",
    "stability": "STABILITY_API_KEY",
    "huggingface": "HUGGINGFACE_API_KEY",
}

# Ordem usada quando --provider=auto (ou omitido). A primeira variavel de
# ambiente presente vence.
AUTO_ORDER = ["openai", "gemini", "fal", "stability", "huggingface"]

DEFAULT_MODELS = {
    "openai": "gpt-image-1",
    "gemini": "imagen-3.0-generate-002",
    "fal": "fal-ai/flux/schnell",
    "stability": "stable-diffusion-xl-1024-v1-0",
    "huggingface": "black-forest-labs/FLUX.1-schnell",
}


class ErroGeracao(RuntimeError):
    """Erro com mensagem já pronta para mostrar ao usuário."""


def _post_json(url: str, headers: dict, payload: dict, timeout: int = 120) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json", **headers}, method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        corpo = exc.read().decode("utf-8", errors="replace")[:500]
        raise ErroGeracao(f"Erro HTTP {exc.code} de {url}: {corpo}") from exc
    except urllib.error.URLError as exc:
        raise ErroGeracao(f"Falha de rede ao chamar {url}: {exc.reason}") from exc


def _save_b64(b64_data: str, path: Path) -> None:
    path.write_bytes(base64.b64decode(b64_data))


def _save_from_url(url: str, path: Path, timeout: int = 60) -> None:
    with urllib.request.urlopen(url, timeout=timeout) as resp:
        path.write_bytes(resp.read())


def pick_provider(requested: str | None) -> str:
    if requested and requested != "auto":
        if requested not in PROVIDER_ENV:
            raise ErroGeracao(f"Provedor desconhecido: {requested}")
        return requested
    for nome in AUTO_ORDER:
        if os.environ.get(PROVIDER_ENV[nome]):
            return nome
    variaveis = ", ".join(PROVIDER_ENV.values())
    raise ErroGeracao(
        "Nenhuma chave de API de geração de imagem encontrada. "
        f"Configure uma das variáveis: {variaveis}"
    )


def _parse_size(size: str) -> tuple[int, int]:
    largura, _, altura = size.partition("x")
    try:
        return int(largura), int(altura or largura)
    except ValueError as exc:
        raise ErroGeracao(f"--size inválido: {size!r} (use o formato LARGURAxALTURA)") from exc


def gen_openai(prompt: str, model: str, n: int, size: str, out_dir: Path, prefix: str) -> list[Path]:
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise ErroGeracao("OPENAI_API_KEY não configurada.")
    resp = _post_json(
        "https://api.openai.com/v1/images/generations",
        {"Authorization": f"Bearer {key}"},
        {"model": model, "prompt": prompt, "n": n, "size": size},
    )
    itens = resp.get("data", [])
    caminhos = []
    for i, item in enumerate(itens):
        path = out_dir / f"{prefix}-{i}.png"
        if "b64_json" in item:
            _save_b64(item["b64_json"], path)
        elif "url" in item:
            _save_from_url(item["url"], path)
        else:
            raise ErroGeracao(f"Resposta inesperada da OpenAI: {item!r}")
        caminhos.append(path)
    return caminhos


def gen_gemini(prompt: str, model: str, n: int, size: str, out_dir: Path, prefix: str) -> list[Path]:
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise ErroGeracao("GEMINI_API_KEY não configurada.")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:predict?key={key}"
    resp = _post_json(url, {}, {"instances": [{"prompt": prompt}], "parameters": {"sampleCount": n}})
    predicoes = resp.get("predictions", [])
    if not predicoes:
        raise ErroGeracao(f"Resposta sem 'predictions' do Gemini: {resp!r}")
    caminhos = []
    for i, pred in enumerate(predicoes):
        b64 = pred.get("bytesBase64Encoded")
        if not b64:
            raise ErroGeracao(f"Predição sem imagem do Gemini: {pred!r}")
        path = out_dir / f"{prefix}-{i}.png"
        _save_b64(b64, path)
        caminhos.append(path)
    return caminhos


def gen_fal(prompt: str, model: str, n: int, size: str, out_dir: Path, prefix: str) -> list[Path]:
    key = os.environ.get("FAL_KEY")
    if not key:
        raise ErroGeracao("FAL_KEY não configurada.")
    largura, altura = _parse_size(size)
    resp = _post_json(
        f"https://fal.run/{model}",
        {"Authorization": f"Key {key}"},
        {"prompt": prompt, "num_images": n, "image_size": {"width": largura, "height": altura}},
    )
    imagens = resp.get("images", [])
    if not imagens:
        raise ErroGeracao(f"Resposta sem 'images' do fal.ai: {resp!r}")
    caminhos = []
    for i, img in enumerate(imagens):
        path = out_dir / f"{prefix}-{i}.png"
        _save_from_url(img["url"], path)
        caminhos.append(path)
    return caminhos


def gen_stability(prompt: str, model: str, n: int, size: str, out_dir: Path, prefix: str) -> list[Path]:
    key = os.environ.get("STABILITY_API_KEY")
    if not key:
        raise ErroGeracao("STABILITY_API_KEY não configurada.")
    largura, altura = _parse_size(size)
    resp = _post_json(
        f"https://api.stability.ai/v1/generation/{model}/text-to-image",
        {"Authorization": f"Bearer {key}", "Accept": "application/json"},
        {"text_prompts": [{"text": prompt}], "samples": n, "width": largura, "height": altura},
    )
    artefatos = resp.get("artifacts", [])
    if not artefatos:
        raise ErroGeracao(f"Resposta sem 'artifacts' da Stability AI: {resp!r}")
    caminhos = []
    for i, artefato in enumerate(artefatos):
        path = out_dir / f"{prefix}-{i}.png"
        _save_b64(artefato["base64"], path)
        caminhos.append(path)
    return caminhos


def gen_huggingface(prompt: str, model: str, n: int, size: str, out_dir: Path, prefix: str) -> list[Path]:
    key = os.environ.get("HUGGINGFACE_API_KEY")
    if not key:
        raise ErroGeracao("HUGGINGFACE_API_KEY não configurada.")
    caminhos = []
    for i in range(n):
        req = urllib.request.Request(
            f"https://api-inference.huggingface.co/models/{model}",
            data=json.dumps({"inputs": prompt}).encode("utf-8"),
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                conteudo = resp.read()
        except urllib.error.HTTPError as exc:
            corpo = exc.read().decode("utf-8", errors="replace")[:500]
            raise ErroGeracao(f"Erro HTTP {exc.code} do Hugging Face: {corpo}") from exc
        path = out_dir / f"{prefix}-{i}.png"
        path.write_bytes(conteudo)
        caminhos.append(path)
    return caminhos


GENERATORS: dict[str, Callable[..., list[Path]]] = {
    "openai": gen_openai,
    "gemini": gen_gemini,
    "fal": gen_fal,
    "stability": gen_stability,
    "huggingface": gen_huggingface,
}


def _slug(texto: str, tamanho_max: int = 40) -> str:
    limpo = "".join(c.lower() if c.isalnum() else "-" for c in texto)
    while "--" in limpo:
        limpo = limpo.replace("--", "-")
    limpo = limpo.strip("-")[:tamanho_max]
    return limpo or "imagem"


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    ap = argparse.ArgumentParser(description="Gera imagens via múltiplos provedores (skill image-generator).")
    ap.add_argument("--prompt", required=True, help="Descrição completa da imagem.")
    ap.add_argument("--provider", default="auto", choices=["auto", *PROVIDER_ENV])
    ap.add_argument("--n", type=int, default=1, help="Quantidade de imagens.")
    ap.add_argument("--size", default="1024x1024", help="LARGURAxALTURA em pixels.")
    ap.add_argument("--output-dir", default="./generated-images")
    ap.add_argument("--output-name", default=None, help="Prefixo do nome do arquivo.")
    ap.add_argument("--model", default=None, help="Sobrescreve o modelo padrão do provedor.")
    return ap.parse_args(argv)


def run(args: argparse.Namespace) -> dict[str, Any]:
    resultado: dict[str, Any] = {
        "provider": None, "model": None, "prompt": args.prompt, "images": [], "error": None,
    }
    provider = pick_provider(None if args.provider == "auto" else args.provider)
    model = args.model or DEFAULT_MODELS[provider]
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    prefix = args.output_name or f"{_slug(args.prompt)}-{int(time.time())}"

    caminhos = GENERATORS[provider](args.prompt, model, args.n, args.size, out_dir, prefix)

    resultado["provider"] = provider
    resultado["model"] = model
    resultado["images"] = [{"path": str(p)} for p in caminhos]
    return resultado


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    try:
        resultado = run(args)
        print(json.dumps(resultado, ensure_ascii=False, indent=2))
        return 0
    except ErroGeracao as exc:
        resultado = {
            "provider": None, "model": None, "prompt": args.prompt, "images": [], "error": str(exc),
        }
        print(json.dumps(resultado, ensure_ascii=False, indent=2))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
