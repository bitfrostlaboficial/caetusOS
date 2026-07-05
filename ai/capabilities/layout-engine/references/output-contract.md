# Contrato de saída

`render.mjs` sempre imprime **um único objeto JSON em stdout**, mesmo em
caso de erro — nunca texto solto, nunca múltiplas linhas de log misturadas
com o resultado (mensagens de aviso do React, se houver, vão para stderr).

## Sucesso

```json
{
  "png": { "path": "/abs/generated-posts/post-1720000000000.png", "width": 1080, "height": 1350 },
  "html": { "path": "/abs/generated-posts/post-1720000000000.html" },
  "template": null,
  "composition_resolved": { "format": "instagram-feed", "width": 1080, "height": 1350, "style_tokens": { "...": "..." }, "root": { "...": "..." } },
  "error": null
}
```

- `png` — sempre presente em caso de sucesso; `path` é absoluto.
- `html` — sempre presente (sucesso ou falha só no Playwright), útil para
  depuração e para reaproveitar o HTML fora do fluxo desta capability.
- `template` — `null` a menos que `--save-as-template` tenha sido usado
  com sucesso; nesse caso `{path, slug}`.
- `composition_resolved` — a árvore efetivamente usada, com `format`,
  `width`, `height` já resolvidos (útil para auditoria e para reusar como
  base de um novo template).

## Erro

```json
{
  "png": null,
  "html": { "path": "/abs/generated-posts/post-1720000000000.html" },
  "template": null,
  "composition_resolved": { "...": "..." },
  "error": "Falha ao exportar PNG via Playwright: browserType.launch: Executable doesn't exist... Rode `npx playwright install chromium`."
}
```

`html` pode vir preenchido mesmo em erro quando a falha aconteceu depois
da geração do HTML (tipicamente na etapa de screenshot) — use isso para
depurar sem precisar re-montar a árvore. Quando o erro acontece antes
disso (spec inválido, componente desconhecido, formato desconhecido),
`html` também vem `null`.

Erros conhecidos e sua causa:

| Mensagem contém | Causa | O que fazer |
|---|---|---|
| `Parâmetro obrigatório ausente: --spec` | Nenhum `--spec` passado na linha de comando | Passe o caminho do JSON de composição. |
| `Componente desconhecido "X"` | A árvore usa um nome de componente que não existe em `COMPONENTS` | Corrija o nome ou adicione o componente (ver `references/components.md`). |
| `Formato desconhecido "X"` | `format` não está em `scripts/formats.json` e nenhum `width`/`height` explícito foi dado | Use um formato válido ou passe `width`/`height`. |
| `composition.root precisa ser um componente "Post"` | A raiz da árvore não é `Post` | Envolva a composição num nó `{"component": "Post", ...}`. |
| `browserType.launch: Executable doesn't exist` | O browser do Playwright não foi baixado neste ambiente | Rode `npx playwright install chromium` uma vez (requer rede liberada para `cdn.playwright.dev` — pode estar bloqueada em sandboxes de desenvolvimento, ver `manifest.yaml`, campo `observacoes`). |
| `save_as_template=true requer --template-slug` | Pediu para salvar como template sem informar o slug | Passe `--template-slug <nome>`. |

## Código de saída

`0` em sucesso, `1` em qualquer erro tratado (o campo `error` sempre
explica qual). Um agente que consome esta capability nunca deve tratar
código `0` com `"error"` preenchido como sucesso, nem o contrário — os
dois sinais sempre concordam.
