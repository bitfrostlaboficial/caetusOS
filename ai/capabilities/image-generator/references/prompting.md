# Como escrever um bom prompt de imagem

Esta capability não interpreta nem embeleza o prompt sozinha — ela executa o que
recebe. Quem chama esta capability (você, ou uma capability de negócio/workflow) é
responsável por montar um prompt completo antes de rodar o script.

## Estrutura recomendada

Um prompt de imagem forte normalmente cobre estas partes, nesta ordem:

1. **Sujeito** — o que/quem está na imagem, de forma concreta.
2. **Estilo** — fotografia realista, ilustração vetorial, pintura digital,
   3D render, flat design, etc.
3. **Composição/enquadramento** — plano fechado, plano aberto, vista de
   cima, close-up, regra dos terços.
4. **Iluminação e cor** — luz natural, luz de estúdio, paleta de cores
   específica (se vier de uma capability de negócio, as cores da marca entram
   aqui, já resolvidas em hex ou nome).
5. **Detalhes técnicos** (quando o provedor suporta) — proporção/aspect
   ratio, nível de detalhe, referência de lente/câmera para fotorrealismo.

**Exemplo 1:**
Entrada: "banner para post sobre produtividade"
Prompt final: "Ilustração vetorial flat de uma pessoa organizando tarefas em
um quadro kanban digital, paleta de cores azul e branco, estilo minimalista
corporativo, composição horizontal, espaço vazio à esquerda para texto,
proporção 16:9"

**Exemplo 2:**
Entrada: "foto de produto de um tênis esportivo"
Prompt final: "Fotografia de produto de um tênis de corrida branco e verde
sobre fundo cinza claro, iluminação de estúdio suave, ângulo 3/4, foco
nítido no produto, estilo catálogo e-commerce, proporção 1:1"

## Proporção e tamanho por provedor

Cada provedor recebe tamanho de forma diferente — o script já traduz
`--size` (`LARGURAxALTURA`, ex. `1024x1024`, `1024x1792`) para o formato de
cada API. Ainda assim, mencionar a proporção também no texto do prompt
("proporção 16:9", "formato quadrado", "vertical estilo Stories") ajuda
modelos que usam a proporção como sinal de composição, não só como
parâmetro técnico.

## O que não fazer

- Não invente cores de marca, logotipos ou nomes de produto que não foram
  passados explicitamente — isso é responsabilidade de quem chama esta
  capability (tipicamente uma capability de negócio que já consultou
  `company-knowledge`).
- Não peça texto longo dentro da imagem — a maioria dos modelos de geração
  de imagem ainda erra texto embutido; se o pedido precisa de texto legível
  (ex. um banner com uma frase), prefira gerar a imagem sem texto e
  sobrepor o texto depois com uma ferramenta de edição/composição.
