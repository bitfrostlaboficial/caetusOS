# layout-engine

> **Manifesto:** [`manifest.yaml`](manifest.yaml) — fonte oficial de
> metadados (versão, contrato de entrada/saída estruturado, permissões,
> adapters, custo, etc.), pensada para leitura por máquinas. Este
> documento cobre o objetivo, as regras e o "como usar" em prosa — nunca
> repete o que já está no manifesto.

Esta é a especificação **oficial e única** desta capability — vale para
qualquer agente de IA que a execute (Claude Code, Codex, Gemini, Llama,
Mistral, Qwen, OpenClaw, um cliente MCP, ou qualquer outro acessado via
API). Nenhum adaptador (ver `ai/adapters/`) deve repetir o conteúdo
abaixo — só traduzir o mecanismo de invocação para as particularidades do
agente que ele integra. Ver `ai/contracts/capability-vs-adapter.md` para a
linha divisória exata.

## Objetivo

Montar peças visuais (posts para redes sociais, banners, slides) a partir
de uma árvore de **componentes reutilizáveis** (`Post`, `Headline`,
`FeatureCard`, `Timeline`...), escritos em React/HTML/CSS/SVG, e exportar
o resultado como um PNG de alta qualidade via Playwright — sem que nenhum
modelo de IA "desenhe" a peça. A IA que chama esta Capability só decide
**o quê** colocar na peça (que componentes, em que ordem, com que texto);
o **como** desenhar é sempre determinístico, feito por código.

Esta é a engrenagem mecânica por trás do conceito mais amplo de "Visual
Composer" descrito em `ai/architecture/capability-registry.md`: a decisão
de aplicar a marca de uma empresa (cores, tom, logo) não vive aqui — vive
numa futura Capability de negócio (`branded-layout-composer`) que consulta
`company-knowledge` e chama esta Capability com os parâmetros já
resolvidos. Ver "Regra de isolamento" abaixo.

## Quando usar

Sempre que a tarefa pedir para montar uma peça visual estruturada a partir
de conteúdo (texto, estatísticas, passos, citação, features) — post de
Instagram/LinkedIn/Facebook, banner, slide, thumbnail — especialmente
quando a peça deve seguir um layout consistente e repetível, não uma
composição livre desenhada do zero a cada vez. Esta capability sozinha
**não é suficiente** quando o pedido envolve a marca/identidade visual de
uma empresa específica (cores da marca, tom de voz, logo real) — nesse
caso, quem deveria ser chamado é uma capability de negócio (ex.
`branded-layout-composer`, ainda não implementada) que consulta
`company-knowledge` (`ai/knowledge/company-knowledge/`) e então chama esta
capability com `style_tokens` já resolvidos.

Não use esta capability para ilustrações fotorrealistas, metáforas
visuais complexas ou qualquer ativo que só uma IA generativa de imagem
consiga produzir — isso é trabalho do `image-generator`
(`ai/capabilities/image-generator/`), cujo resultado (um arquivo de
imagem) entra aqui como o parâmetro `src` de um componente `Illustration`
ou `Icon`. Ver `references/model-analyst.md` para a régua completa de
"quando código, quando IA".

## Regra de isolamento (por que esta capability existe assim)

Esta é uma capability de **camada genérica**: precisa funcionar igual em
qualquer projeto, para qualquer empresa, copiada e colada sem edição. Por
isso:

- **Nunca lê `empresas/**`** nem qualquer arquivo que identifique uma
  empresa. Se o pedido menciona marca, branding, tom de voz ou qualquer
  coisa específica da empresa, isso não é problema desta capability —
  quem está executando deve sinalizar que o pedido precisa passar por uma
  capability de negócio primeiro.
- Todo dado visual (cores, fontes, logo, texto, imagens) chega **explícito
  em `composition`/`style_tokens`** — nunca adivinhado, nunca hardcoded,
  nunca buscado em outro lugar do projeto.
- Não decide conceito criativo, mensagem ou tom — isso é trabalho de quem
  monta o `composition` antes de chamar esta capability (o "Creative
  Director"/"Design Strategist" do fluxo mais amplo é sempre a IA
  chamadora ou uma Capability de negócio, nunca esta capability).

## Filosofia: código desenha, IA decide

Esta capability é a aplicação concreta da regra "a IA nunca desenha o
post, ela só toma decisões": todo componente em `references/components.md`
é código determinístico — mesma entrada sempre produz a mesma saída
visual. A IA chamadora participa montando a árvore `composition` (que
componentes usar, em que ordem, com que texto/props) e, quando um ativo
precisa ser gerado (uma ilustração, um ícone fora da biblioteca embutida),
decidindo se isso é uma tarefa de código (SVG/CSS, resolvido localmente)
ou de outra capability genérica (`image-generator`, chamada por quem
orquestra, nunca por esta capability). Essa decisão segue a tabela em
`references/model-analyst.md`.

## Contrato de entrada e saída

O schema exato — cada parâmetro, tipo, obrigatoriedade e padrão — é
`entradas`/`saidas` em [`manifest.yaml`](manifest.yaml) (ver
`ai/contracts/manifest-schema.md` para o formato). Em prosa: recebe uma
árvore `composition` (obrigatória) e parâmetros opcionais de formato,
dimensões e saída, e devolve sempre um único objeto JSON — mesmo em caso
de erro:

```json
{"png": {"path": "...", "width": 1080, "height": 1350}, "html": {"path": "..."}, "template": null, "composition_resolved": {"...": "..."}, "error": null}
```

O formato completo da árvore `composition` (o nó raiz `Post`, como
aninhar `children`, `style_tokens`) está em `references/components.md`,
junto com o catálogo comentado de cada componente disponível. O formato
da biblioteca de templates (o que é salvo quando `save_as_template=true`)
está em `references/template-library.md`. A régua de "código vs. IA" para
decidir como produzir um ativo visual está em `references/model-analyst.md`.
O formato completo do JSON de saída, com exemplos de sucesso/erro, está em
`references/output-contract.md`.

## Como executar

Esta capability é distribuída como um script Node.js, pensado para ser
invocado por **qualquer agente com acesso a shell**. Instalação (uma vez
por ambiente):

```bash
cd ai/capabilities/layout-engine/scripts
npm install
npx playwright install chromium
```

Execução:

```bash
node ai/capabilities/layout-engine/scripts/render.mjs \
  --spec caminho/para/composition.json \
  --format instagram-feed \
  --output-dir ./generated-posts
```

Para salvar o resultado na biblioteca de templates ao mesmo tempo:

```bash
node ai/capabilities/layout-engine/scripts/render.mjs \
  --spec caminho/para/composition.json \
  --output-dir ./generated-posts \
  --save-as-template \
  --template-slug institucional-autoridade-01 \
  --templates-dir ai/capabilities/layout-engine/assets/templates
```

`ai/capabilities/layout-engine/assets/example-composition.json` é um
exemplo mínimo e válido de `composition` para testar a instalação.

## Tratamento de erros

Se o script devolver `"error"` preenchido — componente desconhecido na
árvore, formato de post desconhecido, ou falha ao exportar o PNG (ex.
browser do Playwright não instalado) — **não finja que a peça foi
gerada**. A mensagem de erro já indica a causa e, quando o problema é só
na etapa de exportar PNG, o campo `html` ainda aponta para o HTML
intermediário já gerado, útil para depurar o layout sem precisar
reprocessar a árvore inteira. Código de saída `0` = sucesso, `1` = erro
tratado.

## Referências

- `references/components.md` — catálogo comentado de todos os
  componentes (`Post`, `Headline`, `Subtitle`, `Paragraph`,
  `Illustration`, `Icon`, `FeatureCard`, `Timeline`, `Quote`,
  `Statistic`, `Logo`, `Footer`), props aceitas e o formato da árvore
  `composition`.
- `references/model-analyst.md` — tabela de decisão técnica: qual tipo de
  ativo visual deve ser gerado por código (SVG/CSS/React) e qual só uma
  capability de geração de imagem consegue produzir.
- `references/template-library.md` — formato exato da biblioteca de
  templates (`template.json`, `style.css`, `preview.png`, `metadata.json`,
  `rationale.md`) e a convenção de pastas.
- `references/output-contract.md` — formato completo do JSON de saída,
  exemplos de sucesso/erro.

Adaptadores disponíveis: ver `adapters_disponiveis` em
[`manifest.yaml`](manifest.yaml).
