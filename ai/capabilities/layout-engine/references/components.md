# Catálogo de componentes

Implementação real em `../scripts/components.mjs`. Este documento é a
referência de props/uso — o código-fonte é a fonte de verdade em caso de
divergência.

## Formato da árvore `composition`

```json
{
  "format": "instagram-feed",
  "width": null,
  "height": null,
  "style_tokens": { "colors": {}, "fonts": {}, "radius": 24 },
  "root": {
    "component": "Post",
    "props": { "padding": 72, "align": "flex-start" },
    "children": [
      { "component": "Headline", "props": { "text": "..." } }
    ]
  }
}
```

- `format` resolve `width`/`height` via `../scripts/formats.json`
  (`instagram-feed` 1080×1350, `instagram-square` 1080×1080,
  `instagram-story` 1080×1920, `linkedin-post` 1200×1200,
  `facebook-post` 1200×630, `twitter-post` 1600×900,
  `youtube-thumbnail` 1280×720). `width`/`height` explícitos sempre
  vencem `format`.
- `style_tokens` nunca é inventado por esta capability — chega explícito
  de quem chamou (uma IA que decidiu uma paleta livre, ou uma Capability
  de negócio que resolveu a paleta da empresa via `company-knowledge`).
  Campos aceitos: `colors.{background,surface,primary,secondary,text,muted}`
  (hex), `fonts.{heading,body}` (nome de família CSS), `radius` (px).
  Qualquer campo omitido cai num padrão neutro — nunca um erro.
- `root` é sempre um nó `Post`. Cada nó é `{component, props, children?}`;
  `children` é uma lista de nós no mesmo formato.

## `Post` (raiz obrigatória)

Container principal. Recebe as dimensões resolvidas e `style_tokens`, e
os expõe como variáveis CSS (`--color-primary`, `--font-heading`, etc.)
para todos os filhos.

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `padding` | number | `64` | Espaçamento interno em px. |
| `align` | `flex-start \| center \| flex-end` | `flex-start` | Alinhamento horizontal dos filhos (flex column). |
| `background` | string (CSS) | `var(--color-background)` | Sobrescreve o fundo (ex. um gradiente CSS — ver `model-analyst.md`). |

## `Headline`

Título principal. `text` (obrigatório), `align` (`left\|center\|right`,
padrão `left`), `size` (`sm\|md\|lg\|xl\|xxl`, padrão `xl`), `color`
(padrão `var(--color-text)`).

## `Subtitle`

Linha de apoio acima/abaixo do headline (ex. nome da empresa, categoria).
`text`, `align`, `color` (padrão `var(--color-secondary)`).

## `Paragraph`

Texto corrido. `text`, `align`, `size` (`sm\|md\|lg`, padrão `md`), `color`
(padrão `var(--color-muted)`). Larguera máxima de 44 caracteres por linha
(`max-width: 44ch`) para manter a leitura confortável.

## `Illustration`

Ilustração ou metáfora visual. `src` (opcional — caminho/URL de uma
imagem já gerada, tipicamente por `image-generator`), `alt`, `width`,
`height` (padrão `320`), `shape` (`blob` por padrão, usado só quando não
há `src`), `position` (`left\|right\|none`). **Sem `src`, cai num
placeholder vetorial gerado por código** (uma forma orgânica simples) —
nunca inventa uma imagem. Ver `model-analyst.md` para quando vale a pena
pedir uma ilustração real via `image-generator` em vez de usar o
fallback.

## `Icon`

Ícone pequeno. `name` (um dos embutidos: `check`, `arrow-right`, `bolt`,
`shield`, `star`, `chat`, `chart`, `gear`) ou `src` (caminho para um
SVG/PNG customizado quando o ícone não está na biblioteca embutida).
`size` (padrão `32`), `color` (padrão `currentColor`). Lança erro claro
se `name` não existir e `src` não for fornecido — nunca renderiza um
ícone genérico "parecido".

## `FeatureCard`

Card de destaque (ícone + título + descrição), usado em grids de
diferenciais/benefícios. `icon` (nome de um ícone embutido), `title`,
`description`, `accent` (cor do ícone, padrão `var(--color-primary)`).

## `Timeline`

Lista numerada de passos. `steps`: lista de `{label, description}`.

## `Quote`

Citação com atribuição. `text`, `author` (opcional).

## `Statistic`

Número em destaque com legenda. `value` (string ou number), `label`,
`color` (padrão `var(--color-primary)`).

## `Logo`

Logo da marca, posicionado absolutamente. `src` (obrigatório para
renderizar algo — sem `src`, o componente não desenha nada, nunca inventa
um logo), `position` (`top-left\|top-right\|bottom-left\|bottom-right`,
padrão `top-left`), `size` (altura em px, padrão `40`).

## `Footer`

Linha inferior (handle de rede social, site, CTA curto). `text`, `align`
(`left\|center\|right`), `color` (padrão `var(--color-muted)`).

## Adicionando um componente novo

Novos componentes entram em `../scripts/components.mjs` e no objeto
`COMPONENTS` exportado de lá — é esse objeto que `render.mjs` consulta
para resolver cada `component` da árvore. Ao adicionar um componente:

1. Escreva-o como função pura `(props) => elemento React`, usando
   `React.createElement` (sem JSX, para não exigir passo de build).
2. Todo valor visual deve vir de props ou das variáveis CSS herdadas do
   `Post` (`var(--color-*)`, `var(--font-*)`) — nunca hardcode uma cor
   específica de marca dentro do componente.
3. Documente aqui: props aceitas, padrão de cada uma, quando usar.
