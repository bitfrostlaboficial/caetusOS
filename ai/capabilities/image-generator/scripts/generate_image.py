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
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Callable

# No Windows, stdout usa o code page do console por padrão (não UTF-8), o que
# corrompe acentos quando a saída é redirecionada/lida por outro processo.
# Força UTF-8 sempre, já que o contrato de saída desta skill é JSON em UTF-8.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Cada provedor mapeia para uma LISTA de nomes de variavel de ambiente
# aceitos -- o "nome canonico/generico" primeiro, seguido de aliases usados
# por convencoes de projeto diferentes (ex.: o backend.env deste proprio
# repositorio usa HUGGING_FACE_API_KEY e FAL_AI_API_KEY em vez dos nomes
# genericos). A primeira variavel presente na lista, em ordem, vence --
# ver _find_key.
PROVIDER_ENV = {
    "openai": ["OPENAI_API_KEY"],
    "gemini": ["GEMINI_API_KEY"],
    "fal": ["FAL_KEY", "FAL_AI_API_KEY"],
    "stability": ["STABILITY_API_KEY"],
    "huggingface": ["HUGGINGFACE_API_KEY", "HUGGING_FACE_API_KEY"],
    "pollinations": ["POLLINATIONS_API_KEY"],
    # CLAUDEFALRE_API_KEY (sic) e o nome que ja existe no backend/.env deste
    # projeto -- aceito como alias para nao exigir rename manual.
    "cloudflare": ["CLOUDFLARE_API_TOKEN", "CLAUDEFALRE_API_KEY"],
}

# Ordem usada quando --provider=auto (ou omitido). Se IMAGE_PROVIDER_PRIORITY
# estiver definida no ambiente (lista separada por virgula, ex.
# "cloudflare" ou "cloudflare,gemini"), ela substitui a ordem padrao abaixo
# -- nomes que nao existem em PROVIDER_ENV sao ignorados. Sem essa variavel,
# usa a ordem padrao: a primeira variavel de ambiente presente vence.
# Pollinations fica por ultimo entre os padroes por ser o fallback gratuito
# sem chave obrigatoria (ver gen_pollinations).
_AUTO_ORDER_PADRAO = ["openai", "gemini", "fal", "stability", "huggingface", "pollinations", "cloudflare"]
_prioridade_env = [
    nome.strip() for nome in os.environ.get("IMAGE_PROVIDER_PRIORITY", "").split(",") if nome.strip()
]
AUTO_ORDER = [nome for nome in _prioridade_env if nome in PROVIDER_ENV] or _AUTO_ORDER_PADRAO

DEFAULT_MODELS = {
    "openai": "gpt-image-1",
    # Nano Banana (Gemini 2.5 Flash Image) -- geracao de imagem nativa do
    # Gemini via generateContent. Nao confundir com Imagen (API :predict
    # separada, nao suportada por este provider). Para a geracao mais nova
    # ("Nano Banana 2"), sobrescreva com --model gemini-3.1-flash-image.
    "gemini": "gemini-2.5-flash-image",
    "fal": "fal-ai/flux/schnell",
    "stability": "stable-diffusion-xl-1024-v1-0",
    "huggingface": "black-forest-labs/FLUX.1-schnell",
    "pollinations": "flux",
    # flux-1-schnell: modelo gratuito mais simples/rapido do catalogo
    # Workers AI, corpo JSON comum (ver gen_cloudflare para os outros 3
    # modelos free documentados em references/cloudflare-models.json).
    "cloudflare": "@cf/black-forest-labs/flux-1-schnell",
}

# Variavel de ambiente opcional que sobrescreve o modelo padrao de um
# provedor sem precisar passar --model toda vez (usada so quando --model
# nao e informado). Hoje so faz sentido para provedores onde o projeto ja
# tem uma variavel dedicada para o modelo de IMAGEM (GEMINI_MODEL, por
# exemplo, e ignorada de proposito aqui porque e usada para texto/chat).
MODEL_ENV_OVERRIDE = {
    "huggingface": "HF_IMAGE_MODEL",
    "fal": "FAL_IMAGE_MODEL",
    "cloudflare": "CLOUDFLARE_IMAGE_MODEL",
}


def _find_key(nomes: list[str]) -> str | None:
    """Devolve o valor da primeira variavel de ambiente presente na lista."""
    for nome in nomes:
        valor = os.environ.get(nome)
        if valor:
            return valor
    return None


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


def _post_multipart(url: str, headers: dict, campos: dict, timeout: int = 120) -> dict:
    """POST multipart/form-data usando so a biblioteca padrao (sem `requests`).

    Necessario porque a familia flux-2 da Cloudflare Workers AI exige esse
    formato em vez de JSON puro (ver gen_cloudflare).
    """
    boundary = f"----caetusOS{int(time.time() * 1000)}"
    partes = []
    for nome, valor in campos.items():
        partes.append(f"--{boundary}\r\n")
        partes.append(f'Content-Disposition: form-data; name="{nome}"\r\n\r\n')
        partes.append(f"{valor}\r\n")
    partes.append(f"--{boundary}--\r\n")
    data = "".join(partes).encode("utf-8")
    req = urllib.request.Request(
        url, data=data, method="POST",
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}", **headers},
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
        if _find_key(PROVIDER_ENV[nome]):
            return nome
    variaveis = ", ".join(" / ".join(nomes) for nomes in PROVIDER_ENV.values())
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
    key = _find_key(PROVIDER_ENV["openai"])
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
    """Nano Banana (familia de modelos de imagem nativa do Gemini).

    Chama `generateContent` -- o mesmo mecanismo usado por qualquer modelo
    Gemini de texto/multimodal -- e NÃO o endpoint `:predict` do Imagen (API
    de outro produto, com corpo e resposta incompatíveis; se um dia for
    preciso suportar Imagen de verdade, isso deve ser um provider separado,
    não reaproveitar este). "Nano Banana" cobre hoje três modelos:
    `gemini-2.5-flash-image` (Nano Banana, o default aqui),
    `gemini-3.1-flash-image` (Nano Banana 2) e `gemini-3-pro-image` (Nano
    Banana Pro) -- troque com --model conforme a necessidade.

    Usa a mesma GEMINI_API_KEY já configurada no projeto para chat/texto;
    nenhuma chave nova é necessária. `size` é ignorado: este endpoint não
    aceita largura/altura explícitas como o Imagen aceitava.
    """
    key = _find_key(PROVIDER_ENV["gemini"])
    if not key:
        raise ErroGeracao("GEMINI_API_KEY não configurada.")
    url = f"https://generativelanguage.googleapis.com/v1/models/{model}:generateContent"
    headers = {"x-goog-api-key": key}
    caminhos = []
    for i in range(n):
        resp = _post_json(url, headers, {"contents": [{"parts": [{"text": prompt}]}]})
        candidatos = resp.get("candidates", [])
        if not candidatos:
            raise ErroGeracao(f"Resposta sem 'candidates' do Gemini (Nano Banana): {resp!r}")
        partes = candidatos[0].get("content", {}).get("parts", [])
        b64 = next((p["inlineData"]["data"] for p in partes if "inlineData" in p), None)
        if not b64:
            texto = next((p.get("text") for p in partes if "text" in p), None)
            detalhe = f" Resposta em texto do modelo: {texto!r}" if texto else f" Resposta crua: {resp!r}"
            raise ErroGeracao(
                "Gemini (Nano Banana) não devolveu imagem (sem 'inlineData' -- "
                "possível bloqueio de segurança ou prompt recusado)." + detalhe
            )
        path = out_dir / f"{prefix}-{i}.png"
        _save_b64(b64, path)
        caminhos.append(path)
    return caminhos


def gen_fal(prompt: str, model: str, n: int, size: str, out_dir: Path, prefix: str) -> list[Path]:
    key = _find_key(PROVIDER_ENV["fal"])
    if not key:
        raise ErroGeracao("FAL_KEY (ou FAL_AI_API_KEY) não configurada.")
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
    key = _find_key(PROVIDER_ENV["stability"])
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
    """Hugging Face Inference Providers (antigo "Inference API (serverless)").

    O endpoint antigo `api-inference.huggingface.co/models/{model}` foi
    substituído pelo roteador unificado `router.huggingface.co` -- chamar o
    domínio antigo hoje tende a falhar ou cair em infraestrutura
    descontinuada. Usamos aqui o provider `hf-inference` explícito (a
    camada "HF Inference" da Hugging Face, ligada à mesma conta/token),
    caminho documentado em
    https://huggingface.co/docs/inference-providers/en/providers/hf-inference.

    Duas pegadinhas reais que não dá pra resolver só no código, vale saber
    antes de depender disso em produção:
    1. Modelos "gated" como black-forest-labs/FLUX.1-schnell exigem aceitar
       a licença em huggingface.co/<modelo> logado com a conta dona do
       token -- sem isso, a API responde 403 mesmo com token válido.
    2. Desde meados de 2025 o provider `hf-inference` prioriza inferência em
       CPU (embeddings, classificação, LLMs pequenos); modelos pesados de
       imagem como FLUX costumam ser servidos por provedores terceiros
       (fal, Replicate, Nscale etc.) via esse mesmo roteador, e aí o uso é
       cobrado dos créditos da conta Hugging Face, não é gratuito
       incondicional. Se este provider devolver erro citando billing/
       créditos, é isso -- o fallback gratuito de verdade deste script é
       `pollinations`.
    """
    key = _find_key(PROVIDER_ENV["huggingface"])
    if not key:
        raise ErroGeracao("HUGGINGFACE_API_KEY (ou HUGGING_FACE_API_KEY) não configurada.")
    caminhos = []
    for i in range(n):
        req = urllib.request.Request(
            f"https://router.huggingface.co/hf-inference/models/{model}",
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
        except urllib.error.URLError as exc:
            raise ErroGeracao(f"Falha de rede ao chamar Hugging Face: {exc.reason}") from exc
        path = out_dir / f"{prefix}-{i}.png"
        path.write_bytes(conteudo)
        caminhos.append(path)
    return caminhos


def gen_pollinations(prompt: str, model: str, n: int, size: str, out_dir: Path, prefix: str) -> list[Path]:
    """Pollinations.ai -- gratuito, sem cadastro nem chave obrigatórios.

    POLLINATIONS_API_KEY é opcional: se presente, vai como Bearer token e
    aumenta o rate limit / tira a marca d'água (ver auth.pollinations.ai);
    se ausente, a chamada ainda funciona no nível anônimo (~1 req/15s).
    Endpoint devolve o binário da imagem direto, sem envelope JSON -- mesmo
    padrão usado em gen_huggingface.
    """
    largura, altura = _parse_size(size)
    key = _find_key(PROVIDER_ENV["pollinations"])
    headers = {"Authorization": f"Bearer {key}"} if key else {}
    caminhos = []
    for i in range(n):
        query = urllib.parse.urlencode({
            "width": largura,
            "height": altura,
            "model": model,
            "nologo": "true",
            "seed": int(time.time()) + i,
        })
        url = f"https://image.pollinations.ai/prompt/{urllib.parse.quote(prompt)}?{query}"
        req = urllib.request.Request(url, headers=headers, method="GET")
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                conteudo = resp.read()
        except urllib.error.HTTPError as exc:
            corpo = exc.read().decode("utf-8", errors="replace")[:500]
            raise ErroGeracao(f"Erro HTTP {exc.code} do Pollinations: {corpo}") from exc
        except urllib.error.URLError as exc:
            raise ErroGeracao(f"Falha de rede ao chamar Pollinations: {exc.reason}") from exc
        path = out_dir / f"{prefix}-{i}.png"
        path.write_bytes(conteudo)
        caminhos.append(path)
    return caminhos


def gen_cloudflare(prompt: str, model: str, n: int, size: str, out_dir: Path, prefix: str) -> list[Path]:
    """Cloudflare Workers AI -- modelos Flux (Black Forest Labs), dentro da
    cota gratuita diaria da conta. Modelos free suportados e observacoes em
    references/cloudflare-models.json.

    Precisa de DUAS variaveis (nao e so uma "chave" como os outros
    provedores): CLOUDFLARE_API_TOKEN (Bearer, com permissao Workers AI -
    Read/Edit) e CLOUDFLARE_ACCOUNT_ID (vai na URL, obrigatoria mas nao e
    secreta). CLOUDFLARE_IMAGE_MODEL sobrescreve o modelo padrao (ver
    MODEL_ENV_OVERRIDE).

    flux-1-schnell (default) aceita corpo JSON simples; a familia flux-2
    (dev/klein-4b/klein-9b) exige multipart/form-data -- o formato certo e
    escolhido automaticamente a partir do nome do modelo.
    """
    token = _find_key(PROVIDER_ENV["cloudflare"])
    if not token:
        raise ErroGeracao("CLOUDFLARE_API_TOKEN não configurada.")
    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
    if not account_id:
        raise ErroGeracao("CLOUDFLARE_ACCOUNT_ID não configurada.")
    largura, altura = _parse_size(size)
    url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}"
    usa_multipart = "flux-2" in model
    caminhos = []
    for i in range(n):
        if usa_multipart:
            resp = _post_multipart(
                url, {"Authorization": f"Bearer {token}"},
                {"prompt": prompt, "width": largura, "height": altura},
            )
        else:
            resp = _post_json(url, {"Authorization": f"Bearer {token}"}, {"prompt": prompt})
        if not resp.get("success", False):
            raise ErroGeracao(f"Cloudflare Workers AI retornou erro: {resp.get('errors', resp)!r}")
        b64 = resp.get("result", {}).get("image")
        if not b64:
            raise ErroGeracao(f"Resposta sem 'result.image' da Cloudflare Workers AI: {resp!r}")
        path = out_dir / f"{prefix}-{i}.png"
        _save_b64(b64, path)
        caminhos.append(path)
    return caminhos


GENERATORS: dict[str, Callable[..., list[Path]]] = {
    "openai": gen_openai,
    "gemini": gen_gemini,
    "fal": gen_fal,
    "stability": gen_stability,
    "huggingface": gen_huggingface,
    "pollinations": gen_pollinations,
    "cloudflare": gen_cloudflare,
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
    model = args.model or os.environ.get(MODEL_ENV_OVERRIDE.get(provider, ""), "") or DEFAULT_MODELS[provider]
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
