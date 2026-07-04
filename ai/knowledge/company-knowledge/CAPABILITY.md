# company-knowledge

> **Manifesto:** [`manifest.yaml`](manifest.yaml) — fonte oficial de
> metadados (contrato de entrada/saída estruturado, permissões, status).
> Este documento cobre responsabilidades e regras em prosa.

Esta Capability ainda **não foi implementada**. Este documento existe para
que, quando ela for construída (para qualquer agente de IA — Claude Code,
Codex, Gemini ou outro), a implementação siga um contrato já pensado — e
para que qualquer Capability de negócio escrita *antes* dela existir já
possa documentar corretamente como vai consultá-la.

## Objetivo

Ser a única porta de entrada para `empresas/<slug>/`, devolvendo
conhecimento da empresa já interpretado (nunca arquivo bruto) para
qualquer Capability de negócio ou workflow, através do Context Contract
(`ai/contracts/context-contract.md`).

## Responsabilidades exclusivas

Só `company-knowledge` faz isto — nenhuma outra Capability:

- Ler qualquer arquivo dentro de `empresas/<slug>/**`.
- Decidir qual é a empresa ativa quando isso não vem explícito (ver
  `ai/architecture/escalabilidade.md#múltiplas-empresas`).
- Distinguir `arquivo.md` (fonte real) de `arquivo.md.exemplo` (nunca é
  fonte, só modelo) — convenção já documentada em
  `empresas/*/conhecimento/README.md`.
- Interpretar e resumir o conteúdo — nunca devolver o arquivo `.md` bruto
  inteiro quando uma resposta direta resolve.
- Resolver conflito entre documentos (ex. `redes_sociais.md` e
  `tom_de_voz.md` têm responsabilidades que não deveriam se sobrepor,
  conforme já documentado no README da base de conhecimento — se
  aparecer sobreposição real, `company-knowledge` decide qual prevalece
  e sinaliza a inconsistência em vez de escolher em silêncio).
- Calcular `versao_base_conhecimento` para o Context Contract (ver
  `ai/contracts/context-contract.md`).

## O que ela pode fornecer

Qualquer informação presente em `empresas/<slug>/conhecimento/` —
institucional, produto, serviço, comercial, cliente, marketing, processo,
rh, financeiro, jurídico, geral — sempre:

- Resumida/interpretada para a pergunta feita, não um despejo do arquivo.
- Acompanhada da fonte (`documentos_utilizados`, com o caminho do arquivo)
  — quem recebe a resposta precisa poder verificar de onde veio.
- No formato dos campos do Context Contract quando a pergunta mapear para
  um deles (`branding`, `tom_de_voz`, `publico_alvo`...), ou como texto
  estruturado quando for uma pergunta mais livre (ex. "qual é o processo
  de onboarding de cliente").

## O que ela nunca deve fornecer diretamente

- **Segredos/credenciais.** O README da base de conhecimento já proíbe
  guardar senha, chave de API ou dado bancário em `conhecimento/` — se
  ainda assim aparecer algo assim num arquivo, `company-knowledge` deve
  recusar repassar e sinalizar o problema, nunca repassar "porque estava
  lá".
- **Conteúdo de `memoria/`.** `memoria/` é histórico operacional (posts,
  imagens e campanhas já gerados), não conhecimento de base — são coisas
  conceitualmente diferentes (ver `empresas/<slug>/README.md`). Se uma
  Capability quiser consultar o histórico de execuções passadas, isso é
  uma necessidade diferente (possivelmente uma Capability própria no
  futuro), não algo que `company-knowledge` deve absorver silenciosamente
  só porque também mexe com a pasta da empresa.
- **Nenhuma ação.** `company-knowledge` só lê e interpreta — ela nunca
  gera imagem, nunca publica post, nunca chama uma capacidade genérica.
  Se ela algum dia "fizer" alguma coisa além de responder, deixou de ser
  uma Capability de Conhecimento.

## Como outras Capabilities devem consultá-la

Sempre com uma pergunta de domínio explícita — nunca abrindo o arquivo
sozinha. Uma Capability de negócio que precisa de paleta de cores pergunta
literalmente "qual a paleta de cores da marca da empresa X", não vai
procurar `identidade_visual.md` por conta própria. Isso vale
independentemente de qual agente de IA está executando a Capability
chamadora — nenhum agente tem uma "exceção" para ler `empresas/` direto.

## Contrato de entrada e saída

O schema exato — `empresa`, `campo_solicitado`, `contexto_da_tarefa` na
entrada; o fragmento do Context Contract, `documentos_utilizados`,
`versao_base_conhecimento` e `error` na saída — está em `entradas`/`saidas`
de [`manifest.yaml`](manifest.yaml). Exemplo de entrada:

```json
{"empresa": "caetus_systems", "campo_solicitado": ["tom_de_voz", "identidade_visual"]}
```

Exemplo de saída, com sucesso:

```json
{
  "empresa": {"slug": "caetus_systems", "nome": "Caetus Systems", "idioma": "pt-BR"},
  "tom_de_voz": {"descricao": "resumo interpretado", "fonte": "empresas/caetus_systems/conhecimento/marketing/tom_de_voz.md"},
  "documentos_utilizados": ["empresas/caetus_systems/conhecimento/marketing/tom_de_voz.md"],
  "data_da_consulta": "2026-07-04T14:32:00-03:00",
  "versao_base_conhecimento": "a definir na implementação",
  "error": null
}
```

Segue a mesma convenção de erro do resto da arquitetura
(`ai/contracts/convencoes-de-contrato.md#convenção-para-contratos-json`):
em caso de empresa inexistente, campo sem conteúdo documentado, ou
qualquer outra falha, `error` vem preenchido com uma mensagem clara e os
campos de conteúdo vêm vazios — nunca inventados.

## Como executar

Ainda não definido — depende de como a implementação final ler/interpretar
`empresas/<slug>/conhecimento/` (provavelmente um script de leitura +
sumarização, no mesmo espírito de `ai/capabilities/image-generator/scripts/`).
Qualquer implementação futura deve manter o contrato de entrada/saída
acima independentemente da técnica escolhida.

## Pré-requisito para Capabilities de Negócio

Nenhuma Capability de Negócio deve ser criada antes de `company-knowledge`
existir — é o que a torna, na prática, obrigatória: o primeiro passo
documentado no `CAPABILITY.md` de qualquer Capability de Negócio é
justamente chamar esta Capability.

Adaptadores disponíveis: nenhum ainda — ver `adapters_disponiveis` em
[`manifest.yaml`](manifest.yaml) (fica vazio até a Capability existir de
fato).
