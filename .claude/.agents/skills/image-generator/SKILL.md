---
name: image-generator
description: Gera imagens a partir de um prompt textual usando qualquer provedor de geração de imagem disponível (OpenAI, Gemini/Imagen, fal.ai, Stability AI, Hugging Face), escolhido automaticamente pelas chaves de API presentes no ambiente. Use sempre que o usuário pedir para criar, gerar, ilustrar ou desenhar uma imagem a partir de uma descrição — banner, thumbnail, ilustração, mockup, imagem de post, arte de capa, foto conceitual etc. — mesmo que não mencione um provedor específico. Esta skill é genérica e não sabe nada sobre nenhuma empresa: se o pedido envolver aplicar a marca/identidade visual de uma empresa específica, esta skill sozinha NÃO é suficiente — ela deve ser usada como base por uma capability de negócio (ex. branded-image-generator) que primeiro consulta company-knowledge e então passa os parâmetros de marca explicitamente para cá.
---

> **Camada:** capacidade-genérica
> **Versão:** 1.0.0

# Image Generator (adapter Claude Code)

Este é um **adaptador fino** do Claude Code para a Capability
`image-generator`. Toda a especificação real — objetivo, regras de
isolamento, contrato de entrada/saída, provedores suportados, boas
práticas de prompt — vive em **`ai/capabilities/image-generator/CAPABILITY.md`**
e nas referências dela. Leia esse arquivo antes de usar esta skill; este
`SKILL.md` só cobre como o Claude Code especificamente a invoca. Ver
`ai/contracts/capability-vs-adapter.md` se quiser entender o porquê dessa
separação.

## Como invocar

1. Se esta sessão do Claude Code já tem uma ferramenta ou MCP nativo de
   geração de imagem disponível, prefira usá-lo — é mais simples e não
   depende de nenhuma chave de API configurada no ambiente. Só recorra ao
   script abaixo quando não houver essa alternativa.
2. Caso contrário, rode o script da Capability com a ferramenta Bash:

   ```bash
   python ai/capabilities/image-generator/scripts/generate_image.py \
     --prompt "descrição completa da imagem" \
     --n 1 \
     --size 1024x1024 \
     --output-dir ./generated-images
   ```

   Argumentos, provedores suportados e o formato de resposta estão em
   `ai/capabilities/image-generator/CAPABILITY.md`.
3. Leia o JSON impresso no stdout e siga o contrato de saída documentado na
   Capability — não invente um resultado se `"error"` vier preenchido.
