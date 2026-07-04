# Provedores suportados

O script `scripts/generate_image.py` escolhe o provedor automaticamente
verificando, nesta ordem, qual variável de ambiente de API key está
definida. A primeira que existir vence. Passe `--provider <nome>` para
ignorar essa ordem e forçar um provedor específico.

| Ordem | Provedor (`--provider`) | Variável de ambiente | Modelo padrão |
|---|---|---|---|
| 1 | `openai` | `OPENAI_API_KEY` | `gpt-image-1` |
| 2 | `gemini` | `GEMINI_API_KEY` | `imagen-3.0-generate-002` |
| 3 | `fal` | `FAL_KEY` | `fal-ai/flux/schnell` |
| 4 | `stability` | `STABILITY_API_KEY` | `stable-diffusion-xl-1024-v1-0` |
| 5 | `huggingface` | `HUGGINGFACE_API_KEY` | `black-forest-labs/FLUX.1-schnell` |

A ordem prioriza qualidade/confiabilidade média sobre custo. Se o projeto em
que a capability está rodando já tem preferência por um provedor específico
(este próprio repositório, por exemplo, já usa `fal` e `huggingface` no
backend em `backend/app/ia/`), passe `--provider fal` explicitamente em vez
de confiar na ordem automática.

Sobrescreva o modelo de qualquer provedor com `--model <nome>` — por
exemplo, `--provider fal --model flux/dev` para trocar de `flux/schnell`
(rápido) para `flux/dev` (mais qualidade, mais lento).

## Notas por provedor

### OpenAI (`openai`)

- Endpoint: `POST https://api.openai.com/v1/images/generations`.
- Autenticação: header `Authorization: Bearer $OPENAI_API_KEY`.
- Aceita `size` como `"1024x1024"`, `"1024x1792"`, `"1792x1024"` (varia por
  modelo — consulte a documentação atual da OpenAI se um tamanho for
  rejeitado).
- Resposta traz `data[].url` ou `data[].b64_json` dependendo do modelo; o
  script trata os dois casos.

### Google Gemini / Imagen (`gemini`)

- Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:predict?key=$GEMINI_API_KEY`.
- Corpo: `{"instances": [{"prompt": ...}], "parameters": {"sampleCount": n}}`.
- Resposta traz `predictions[].bytesBase64Encoded`.
- Esta é a mesma chave (`GEMINI_API_KEY`) que o backend deste projeto já usa
  para chat/texto em `backend/app/ia/provedores/gemini.py` — se ela já
  estiver configurada no `.env` para outra finalidade, a geração de imagem
  funciona com a mesma chave, sem configuração adicional.

### fal.ai (`fal`)

- Endpoint: `POST https://fal.run/{model}`, e `{model}` precisa do caminho
  **completo de três segmentos**, ex.: `fal-ai/flux/schnell`,
  `fal-ai/flux/dev`, `fal-ai/fast-sdxl`. Testado ao vivo durante a criação
  desta capability: `flux/schnell` (dois segmentos) responde `404 Application
  'schnell' not found`, enquanto `fal-ai/flux/schnell` responde
  corretamente (`401` de autenticação com uma chave inválida, `200` com uma
  chave válida).
- Autenticação: header `Authorization: Key $FAL_KEY`.
- Corpo aceita `image_size: {width, height}` além de `prompt` e
  `num_images`.
- Resposta traz `images[].url`.
- **Atenção:** `backend/app/ia/provedores/fal.py` e o
  `FAL_MODEL=flux/schnell` de `backend/.env.example` neste repositório usam
  o formato de dois segmentos, que o teste acima indica estar quebrado.
  Isso é código do backend do produto, fora do escopo desta capability — não foi
  alterado aqui —, mas vale reportar/corrigir separadamente já que afeta a
  geração de imagem real do Caetus OS.

### Stability AI (`stability`)

- Endpoint: `POST https://api.stability.ai/v1/generation/{model}/text-to-image`.
- Autenticação: header `Authorization: Bearer $STABILITY_API_KEY`.
- Resposta traz `artifacts[].base64`.

### Hugging Face Inference API (`huggingface`)

- Endpoint: `POST https://api-inference.huggingface.co/models/{model}`.
- Autenticação: header `Authorization: Bearer $HUGGINGFACE_API_KEY`.
- Resposta é o binário da imagem direto (sem JSON envelopando) — o script
  salva a resposta crua no arquivo.
- Mais lento e com fila de espera em modelos gratuitos; bom fallback
  gratuito, não recomendado quando o pedido tem pressa.

## Adicionar um provedor novo

Siga o padrão aditivo: acrescente uma entrada em `PROVIDER_ENV` e
`DEFAULT_MODELS`, escreva uma função `gen_<provedor>(...)` com a mesma
assinatura das existentes, e registre-a em `GENERATORS` no
`scripts/generate_image.py`. Nenhuma outra parte do script precisa mudar —
o mesmo princípio usado no catálogo de provedores do backend deste projeto
(`backend/app/ia/catalogo.py`).
