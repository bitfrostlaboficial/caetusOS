# Biblioteca de templates

Todo layout renderizado com `--save-as-template` vira uma pasta reaproveitável
dentro de `templates_dir` (padrão `./templates`; a própria Capability guarda
os seus exemplos em `../assets/templates/`). Formato de cada pasta
(`<templates_dir>/<template_slug>/`):

```
<template_slug>/
├── template.json    (a árvore `composition` completa, já resolvida)
├── style.css        (o CSS base usado na renderização)
├── preview.png       (cópia do PNG exportado)
├── metadata.json     (classificação do template)
└── rationale.md       (quando usar / evitar, em prosa)
```

## Por que `template.json` e não `template.tsx`

A especificação original deste conceito imaginava um `template.tsx` por
template — um arquivo React autoral por peça. `layout-engine` guarda a
mesma informação como `template.json` (a árvore `composition` serializada)
em vez disso, por dois motivos:

1. **Nenhum passo de build por template.** Um `.tsx` exigiria compilar
   JSX (Babel/esbuild) toda vez que um template fosse reutilizado ou
   copiado para outro projeto. Um `.json` é lido diretamente por
   `render.mjs`, sem dependência adicional.
2. **É o formato que uma IA já produz naturalmente.** O "Layout Engine"
   desta arquitetura nunca deveria pedir para o modelo escrever código —
   só decidir uma estrutura de dados (que componentes, que texto, que
   ordem). `template.json` é exatamente essa estrutura de dados; um
   `.tsx` reintroduziria "a IA escreve código de layout", o que a
   filosofia do sistema evita deliberadamente.

Um template é reaplicado passando `template.json` como `--spec` para
`render.mjs` (opcionalmente com um `style_tokens` novo, para reusar a
mesma estrutura com outra marca) — o mesmo arquivo funciona tanto como
registro histórico quanto como entrada executável.

## `metadata.json`

```json
{
  "categoria": "instagram",
  "tipo": "institucional",
  "objetivo": "autoridade",
  "texto": "curto",
  "imagem": "pequena",
  "complexidade": "baixa",
  "tags": ["minimalista", "tecnologia", "corporativo"]
}
```

Todos os campos são texto livre (nenhum enum fixo é imposto por esta
capability) — a convenção de valores fica a critério de quem organiza a
biblioteca de templates de um projeto específico. Quando `--metadata` não
é passado, `render.mjs` grava um esqueleto com todos os campos `null`
para preenchimento manual.

## `rationale.md`

Sempre com estas cinco seções (mesmo que uma fique vazia inicialmente):

```markdown
## Quando utilizar

## Quando evitar

## Estratégia visual

## Hierarquia

## Motivo da composição
```

Quando `--rationale` não é passado, `render.mjs` grava este esqueleto com
`(preencher)` em cada seção — preencher é responsabilidade de quem gerou o
template (tipicamente a mesma IA que decidiu a composição, com o contexto
ainda fresco de por que fez essas escolhas).

## Reaproveitando um template

1. Leia `template.json` do template escolhido.
2. Opcionalmente, substitua `style_tokens` (para aplicar outra paleta) e
   os `props.text` dos componentes de texto (para outro conteúdo),
   mantendo a mesma estrutura de `root`/`children`.
3. Chame `render.mjs --spec <o-json-editado>` normalmente.

Isso é o que torna a biblioteca útil como está: nenhuma capability
precisa "entender" um template — é só mais um `composition` válido.
