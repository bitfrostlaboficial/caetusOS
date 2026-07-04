# Contrato de entrada e saída

Este é o contrato estável que outras capabilities (`branded-image-generator`,
`carousel-builder`, `instagram-post`, `landing-page-generator`,
`video-generator` quando precisar de um frame inicial, etc.) podem assumir
ao chamar esta capability. Se você alterar `scripts/generate_image.py`, mantenha
este contrato — é o que permite outras capabilities serem construídas em cima
desta sem reimplementar nada.

## Entrada (argumentos do script)

| Argumento | Obrigatório | Padrão | Descrição |
|---|---|---|---|
| `--prompt` | sim | — | Descrição textual completa da imagem. |
| `--provider` | não | `auto` | `auto`, `openai`, `gemini`, `fal`, `stability`, `huggingface`. |
| `--n` | não | `1` | Quantidade de imagens a gerar nesta chamada. |
| `--size` | não | `1024x1024` | `LARGURAxALTURA` em pixels. |
| `--output-dir` | não | `./generated-images` | Pasta onde os arquivos são salvos (criada se não existir). |
| `--output-name` | não | slug do prompt + timestamp | Prefixo do nome de arquivo. |
| `--model` | não | modelo padrão do provedor | Sobrescreve o modelo. |

## Saída (JSON no stdout)

Sempre um único objeto JSON, sempre impresso mesmo em caso de erro:

```json
{
  "provider": "fal",
  "model": "flux/schnell",
  "prompt": "descrição completa usada na geração",
  "images": [
    {"path": "generated-images/banner-produtividade-1730000000-0.png"}
  ],
  "error": null
}
```

Em caso de falha, `"images"` vem vazio e `"error"` traz uma mensagem legível
por humanos (não um stack trace bruto):

```json
{
  "provider": null,
  "model": null,
  "prompt": "descrição completa usada na geração",
  "images": [],
  "error": "Nenhuma chave de API de geração de imagem encontrada. Configure uma das variáveis: OPENAI_API_KEY, GEMINI_API_KEY, FAL_KEY, STABILITY_API_KEY, HUGGINGFACE_API_KEY"
}
```

O código de saída do processo é `0` em sucesso e `1` em qualquer falha —
capabilities que chamam este script por automação (não interativamente) devem
checar o exit code além do campo `"error"`.

## Convenção de arquivos

- Todo arquivo gerado é uma imagem única (`.png`); quando `--n` > 1, os
  arquivos saem numerados com sufixo `-0`, `-1`, `-2`...
- O prefixo do nome nunca inclui informação de empresa/marca — quem chama
  esta capability decide o prefixo via `--output-name` se quiser um nome
  específico (ex. uma capability de workflow pode passar `--output-name
  post-instagram-2026-07-04` para já nomear de forma rastreável).
- Esta capability nunca decide sozinha salvar dentro de `empresas/`. Se uma
  capability de negócio ou workflow quiser guardar o resultado em
  `empresas/<slug>/memoria/imagens/`, ela mesma passa esse caminho via
  `--output-dir` — a capability genérica só sabe que existe uma pasta de
  destino, não o motivo dela existir.

## Como uma capability de negócio deve consumir isto

1. Resolver os parâmetros de marca chamando `company-knowledge` primeiro
   (paleta, tom, diretrizes visuais).
2. Montar o prompt final já incorporando essas informações (ver
   `references/prompting.md`).
3. Chamar `generate_image.py` passando esse prompt pronto e, se fizer
   sentido, um `--output-dir` dentro de `empresas/<slug>/memoria/imagens/`.
4. Ler o JSON de saída e seguir com o caminho do arquivo — nunca reabrir a
   lógica de geração, ela já está resolvida aqui.
