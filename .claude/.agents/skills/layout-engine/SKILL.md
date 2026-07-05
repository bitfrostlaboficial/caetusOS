---
name: layout-engine
description: Monta peças visuais estruturadas (posts para Instagram/LinkedIn/Facebook, banners, slides) a partir de uma árvore de componentes reutilizáveis (Post, Headline, FeatureCard, Timeline, Quote, Statistic...) e exporta um PNG de alta qualidade via Playwright — sem usar IA para desenhar, só para decidir a composição. Use sempre que o usuário pedir para criar, montar ou desenhar um post, banner, slide, card ou peça de marketing/institucional com layout estruturado (título + texto + destaque, cards de feature, linha do tempo, estatística em destaque, citação), mesmo que não mencione "layout engine" ou "componentes" explicitamente — frases como "monta um post sobre X", "cria um banner anunciando Y", "quero um card com essas 3 vantagens" indicam esta skill. Esta skill é genérica e não sabe nada sobre nenhuma empresa: se o pedido envolver aplicar a marca/identidade visual de uma empresa específica (cores da marca, tom de voz, logo real), esta skill sozinha NÃO é suficiente — combine com uma consulta prévia ao conhecimento da empresa para resolver style_tokens antes de chamar esta skill.
---

> **Camada:** capacidade-genérica
> **Versão:** 1.0.0

# Layout Engine (adapter Claude Code)

Este é um **adaptador fino** do Claude Code para a Capability
`layout-engine`. Toda a especificação real — objetivo, regras de
isolamento, catálogo de componentes, formato da árvore de composição,
biblioteca de templates — vive em
**`ai/capabilities/layout-engine/CAPABILITY.md`** e nas referências dela.
Leia esse arquivo antes de usar esta skill; este `SKILL.md` só cobre como
o Claude Code especificamente a invoca. Ver
`ai/contracts/capability-vs-adapter.md` se quiser entender o porquê dessa
separação.

## Como invocar

1. Antes de tudo, monte a árvore `composition` em JSON (formato completo
   em `ai/capabilities/layout-engine/references/components.md`) — decida
   que componentes usar, em que ordem, com que texto. Esta decisão é sua;
   o script só desenha o que você já decidiu.
2. Na primeira execução neste repositório, instale as dependências uma
   vez com a ferramenta Bash:

   ```bash
   cd ai/capabilities/layout-engine/scripts && npm install && npx playwright install chromium
   ```

3. Salve a árvore num arquivo temporário e rode o script com a ferramenta
   Bash:

   ```bash
   node ai/capabilities/layout-engine/scripts/render.mjs \
     --spec /caminho/para/composition.json \
     --output-dir ./generated-posts
   ```

   Argumentos completos, formatos de post disponíveis, e como salvar o
   resultado na biblioteca de templates estão em
   `ai/capabilities/layout-engine/CAPABILITY.md`.
4. Leia o JSON impresso no stdout e siga o contrato de saída documentado
   na Capability — não invente um resultado se `"error"` vier preenchido.
   Se o PNG não puder ser exportado (ex. browser do Playwright ausente),
   o campo `html` ainda aponta para o HTML gerado — você pode abri-lo para
   conferir o layout mesmo sem o PNG.
5. Se o pedido envolver a marca de uma empresa específica, não resolva
   `style_tokens`/logo por conta própria: primeiro obtenha essas
   informações da base de conhecimento da empresa (ver
   `ai/knowledge/company-knowledge/CAPABILITY.md` — Capability ainda
   planejada; até ela existir, peça as cores/fontes/logo explicitamente
   ao usuário) e só então monte a `composition` com esses valores.
