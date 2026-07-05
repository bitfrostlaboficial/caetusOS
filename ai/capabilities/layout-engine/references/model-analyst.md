# Model Analyst — código vs. IA por tipo de ativo

Regra geral: **minimize o uso de IA generativa sempre que o código resolver
com qualidade equivalente.** Código é determinístico, grátis, instantâneo
e versionável; IA generativa é variável, tem custo e não é reprodutível.
Esta tabela é a referência técnica (não sabe nada de marca/empresa) usada
por quem monta a árvore `composition` — tipicamente uma Capability de
negócio como a futura `branded-layout-composer` — para decidir, ativo por
ativo, qual caminho seguir antes de chamar `layout-engine`.

| Tipo de ativo | Caminho recomendado | Por quê |
|---|---|---|
| Ícone comum (check, seta, raio, escudo, estrela, chat, gráfico, engrenagem) | Código — `Icon` embutido em `components.mjs` | Já existe, é nítido em qualquer tamanho (SVG vetorial), zero custo. |
| Ícone incomum, fora da biblioteca embutida | Código, se expressável em poucas linhas de SVG (path simples) | Ainda mais barato e consistente que gerar por IA; adicione à biblioteca embutida se for reaproveitável. |
| Ilustração vetorial simples / forma orgânica de fundo | Código — fallback de `Illustration` (blob SVG) ou uma variação nova de `shape` | Suficiente como elemento decorativo; não precisa ser único. |
| Ilustração complexa / metáfora visual específica do conteúdo | `image-generator` (capacidade genérica) | Nenhuma quantidade de SVG à mão substitui uma ilustração conceitual específica — aí sim vale o custo de uma chamada de IA. O resultado (arquivo de imagem) entra como `src` de `Illustration`. |
| Fotografia / mockup realista | `image-generator` | Impossível gerar por código. |
| Gradiente de fundo | CSS — prop `background` do `Post` (ex. `"linear-gradient(135deg, var(--color-primary), var(--color-secondary))"`) | CSS nativo já resolve qualquer gradiente sem nenhum arquivo de imagem. |
| Linhas, divisores, formas geométricas simples | Código — SVG inline (adicionar como novo componente pequeno se for recorrente) | Vetorial, escala perfeitamente, sem serrilhado. |
| Cards, grids, estrutura de layout | Código — componentes React (`FeatureCard`, `Timeline`, etc.) | É exatamente o que `layout-engine` existe para fazer. |
| Logo da empresa | Nunca gerado — sempre um arquivo já existente, passado como `src` de `Logo` | Logo é identidade, não conteúdo gerável; quem fornece o caminho é a Capability de negócio, via `company-knowledge`. |

## Quando a resposta não é óbvia

Pergunte: "se eu tivesse que recriar este ativo em outro post amanhã, com
outro texto, o resultado ainda pareceria certo sem eu tocar em nada?" Se
sim, é candidato a virar um componente/variação de código reutilizável.
Se o ativo é inerentemente único para esta peça específica (uma cena, uma
composição fotográfica, um estilo artístico específico do pedido), é
candidato a IA.

## Papel do "Prompt Engineer"

Uma vez decidido que um ativo precisa de `image-generator`, escrever um
bom prompt (por provedor/modelo) é responsabilidade de quem chama essa
capability — ver `ai/capabilities/image-generator/references/prompting.md`.
`layout-engine` não escreve prompts nem chama `image-generator`
diretamente (ver `ai/architecture/dependencias-permitidas.md`: uma
capacidade genérica só chama outra quando a dependência é puramente
técnica — aqui a decisão de gerar ou não um ativo é de negócio/orquestração,
não técnica, então fica fora desta capability).
