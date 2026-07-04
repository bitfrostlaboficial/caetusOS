# Convenções de Contrato

Regras específicas para o formato dos contratos (entrada, saída, erro) de
qualquer Capability — agnósticas de qual agente está chamando. As
convenções mais amplas (nomenclatura, diretórios, versionamento) estão em
`ai/architecture/convencoes-globais.md`; estas aqui são só sobre a forma
dos dados trocados.

## Convenção para contratos JSON

- Sempre um objeto no nível raiz — nunca um array ou escalar solto.
- Sempre inclui um campo `error` (string ou `null`) — mesmo quando tudo deu
  certo, o campo existe e vem `null`. Isso evita que quem consome o
  contrato precise checar se a chave existe antes de checar o valor.
- Sucesso e falha usam **a mesma forma** de objeto (mesmos campos, alguns
  vazios em caso de erro) — ver o exemplo em
  `ai/capabilities/image-generator/references/output-contract.md`. Não
  invente uma forma de objeto diferente só para o caminho de erro.
- Nomes de campo em `snake_case`, nunca `camelCase` (consistente com
  `empresa.yaml` e o restante do backend Python deste projeto).
- Campos de negócio (que só existem porque há uma empresa por trás) usam
  nomes em português; campos puramente técnicos de uma capability genérica
  usam nomes em inglês. Ver `ai/architecture/convencoes-globais.md#padrão-de-nomenclatura`
  para o critério completo.

## Convenção para parâmetros

- Scripts de linha de comando usam flags `--kebab-case`.
- Objetos JSON (Context Contract, contratos de Capability) usam
  `snake_case`.
- Todo parâmetro obrigatório é explícito — nenhuma Capability deve
  "adivinhar" um valor lendo outro lugar do projeto por conta própria (essa
  é exatamente a regra de isolamento entre capacidades genéricas e
  conhecimento de empresa).
- Parâmetros opcionais sempre têm um valor padrão documentado no
  `CAPABILITY.md` ou no `references/` correspondente — nunca um padrão
  implícito só existente dentro do código.

## Convenção para retorno

Todo retorno de Capability (JSON impresso, arquivo gerado, ou resposta em
texto quando não há script) deve deixar claro, no mínimo:

- O que foi produzido (caminho de arquivo, ou o conteúdo em si).
- Com que insumos (modelo/provedor usado, documentos de conhecimento
  consultados quando aplicável).
- Se algo não foi possível fazer exatamente como pedido (ex. um parâmetro
  foi ignorado, um fallback foi usado) — isso deve estar visível, não
  escondido dentro de um campo secundário que ninguém vai olhar.

## Convenção para tratamento de erros

- Nunca finja sucesso. Se uma Capability não conseguiu fazer o que foi
  pedido, isso aparece no campo `error`, não numa versão degradada do
  resultado sem aviso.
- Mensagens de erro são para humanos: dizem o que faltou e, quando dá, o
  que fazer a respeito (ex. "configure a variável X"), não um stack trace
  bruto.
- Distinga erro de configuração (chave de API ausente, parâmetro inválido
  — recuperável, o usuário resolve e tenta de novo) de erro inesperado
  (bug, resposta que a Capability não sabia interpretar — vale reportar
  como tal, não disfarçar de erro de configuração).
- Scripts seguem o padrão de código de saída: `0` sucesso, `1` erro tratado
  e comunicado no campo `error`. Um código de saída diferente de `0`/`1`
  (ex. um traceback do Python vazando) é sempre um bug na Capability, não
  um resultado esperado.
