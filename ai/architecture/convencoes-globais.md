# Convenções Globais

Guia de referência para qualquer Capability criada no Caetus OS, hoje ou
daqui a dois anos. Quando uma decisão de estilo não estiver clara em outro
lugar, ela deveria estar aqui. Convenções específicas de contrato JSON
estão em `ai/contracts/convencoes-de-contrato.md`; estas aqui são sobre
nomenclatura, estrutura de diretório, e o ciclo de vida de uma Capability.

## Padrão de nomenclatura

- **Slug** (nome da pasta e campo `id` do `manifest.yaml`): sempre em
  inglês, `kebab-case`, sem prefixo de camada. Ex.: `image-generator`,
  `company-knowledge`, `branded-image-generator`. O `name` do adapter
  Claude Code correspondente usa exatamente o mesmo slug.
- **Conteúdo** (objetivo, corpo do `CAPABILITY.md`, `references/`, e do
  `SKILL.md` do adapter): sempre em português.
- **Convenção por camada:**
  - Conhecimento: nome livre, mas hoje só existe `company-knowledge` — se
    precisar dividir por domínio no futuro, prefixe (`company-knowledge-marketing`).
  - Capacidade genérica: nome da capacidade em si (`image-generator`,
    `pdf-generator`, `web-search`), sem prefixo.
  - Negócio: `branded-<capacidade>` quando aplica identidade visual; nome
    livre nos demais casos, desde que a consulta a `company-knowledge`
    esteja documentada no `CAPABILITY.md`.
  - Workflow: nome da entrega final (`instagram-post`,
    `landing-page-generator`).
- **Campos de contrato JSON**: em português quando o contrato é sobre
  negócio/empresa (Context Contract — ver `ai/contracts/context-contract.md`);
  em inglês quando o contrato é puramente técnico de uma capacidade
  genérica reutilizável em qualquer projeto (ex. `provider`, `model`,
  `images` em `image-generator`). Na dúvida: se o campo só faz sentido
  porque existe uma empresa por trás, é português; se o campo existiria
  igual num projeto sem nenhuma empresa, é inglês.

## Estrutura obrigatória de diretórios

Uma Capability tem duas metades, em dois lugares diferentes do
repositório — nunca no mesmo lugar (ver `ai/contracts/capability-vs-adapter.md`
para o porquê):

```
ai/<capabilities|workflows|knowledge>/<slug>/
├── manifest.yaml           (obrigatório — metadados machine-readable, ver manifest-schema.md)
├── CAPABILITY.md           (obrigatório — narrativa human-readable)
├── references/             (opcional — docs carregadas sob demanda)
├── scripts/                 (opcional — código determinístico)
└── assets/                  (opcional — templates, ícones, fontes)

.claude/skills/<slug>/
└── SKILL.md                (adapter fino do Claude Code — ver ai/adapters/claude-code.md)
```

Toda Capability precisa de `manifest.yaml` **e** `CAPABILITY.md` — os dois
juntos, nunca um sem o outro (ver a divisão de responsabilidade em
`ai/contracts/capability-format.md`). As demais pastas só existem quando
há conteúdo real para colocar nelas — não crie `references/` vazia "para o
futuro". O adapter Claude Code só existe quando alguém realmente for usar
essa Capability a partir do Claude Code — uma Capability pode ficar só
especificada em `ai/`, sem nenhum adapter ainda, sem problema (é inclusive
o estado normal de toda Capability "planejada" — ver `ai/knowledge/company-knowledge/`
como exemplo real: tem manifesto e `CAPABILITY.md`, mas nenhum `scripts/`
nem adapter ainda).

## Quando criar uma Capability nova vs. reaproveitar uma existente

Pergunte nesta ordem:

1. **Já existe uma capacidade genérica que faz isso?** Se sim, reaproveite
   — não crie uma segunda Capability de geração de imagem só porque o caso
   de uso é outro. Capacidades genéricas são deliberadamente amplas.
2. **O que muda é só o conhecimento aplicado (marca, tom, produto), não a
   técnica?** Então é uma nova Capability de **negócio** sobre uma
   capacidade genérica existente, não uma capacidade nova.
3. **O que muda é a técnica em si (um formato de saída novo, uma API
   diferente, uma transformação que nenhuma Capability existente faz)?**
   Aí sim é uma capacidade genérica nova.
4. **A tarefa só faz sentido como a soma de várias Capabilities já
   existentes, entregando algo que o usuário reconhece como uma coisa
   só?** É um **workflow** novo, não uma Capability de negócio — workflows
   orquestram, não implementam lógica de branding ou geração diretamente.

## Quando criar um workflow vs. uma Capability de negócio

Regra prática: se a Capability **produz o artefato final que o usuário
pediu** sozinha (mesmo usando conhecimento da empresa), é negócio. Se ela
**precisa orquestrar duas ou mais Capabilities de negócio/conhecimento
diferentes em sequência** para chegar no resultado, é workflow.
`branded-image-generator` gera uma imagem (um artefato). `instagram-post`
decide que precisa de uma imagem **e** de um texto **e** de metadados de
publicação — três coisas diferentes — então é workflow.

## Como documentar referências

Siga o padrão de progressive disclosure (o mesmo que o `skill-creator` usa
para `SKILL.md`, aplicado aqui a `CAPABILITY.md`):

- `CAPABILITY.md` fica enxuto (ideal: abaixo de 500 linhas) — contém a
  visão geral, quando usar, e pointers claros para onde ir a seguir.
- Cada arquivo em `references/` cobre um assunto coeso (um provedor, um
  contrato, um conjunto de boas práticas) — não misture assuntos não
  relacionados no mesmo arquivo.
- Arquivos de referência com mais de ~300 linhas ganham um sumário no topo.
- Esta própria arquitetura segue a regra: `ARQUITETURA.md` é o
  "CAPABILITY.md" da arquitetura, e os arquivos em `ai/architecture/`,
  `ai/contracts/`, `ai/adapters/` são as referências dela.

## Como versionar uma Capability

O `manifest.yaml` traz o campo `versao:` (ver
`ai/contracts/manifest-schema.md`). Semver simplificado:

- **PATCH** (`1.0.0` → `1.0.1`): correção de bug, ajuste de texto/instrução,
  nenhuma mudança de contrato de entrada/saída.
- **MINOR** (`1.0.0` → `1.1.0`): capacidade nova, parâmetro novo opcional —
  quem já usava a Capability continua funcionando sem mudar nada.
- **MAJOR** (`1.0.0` → `2.0.0`): mudança que quebra o contrato de entrada
  ou saída — quem consumia a versão anterior precisa se ajustar. Toda
  mudança MAJOR atualiza também o `Contrato de entrada`/`Contrato de saída`
  da Capability em `ai/architecture/capability-registry.md`.

A versão vive só no `manifest.yaml` da própria Capability e é espelhada no
Capability Registry — não existe um número de versão único para "a
arquitetura inteira" (esta página tem a própria versão, no topo, mas é
independente).

## Como depreciar uma Capability

1. Marque `status: deprecada` no `manifest.yaml` e na entrada do Capability
   Registry, com uma linha dizendo qual Capability substitui (ou "sem
   substituta — funcionalidade removida").
2. Acrescente, como primeira linha do corpo do `CAPABILITY.md` deprecado
   (logo abaixo do pointer para o manifesto), um aviso: `> **Deprecada.**
   Use `<capability-nova>` no lugar.` — e replique o mesmo aviso em
   qualquer adapter existente (`SKILL.md`), para que nenhum agente
   continue escolhendo essa
   Capability para tarefas novas.
3. Mantenha a pasta por um período de transição (não existe prazo fixo
   hoje — use o bom senso: Capabilities de negócio/workflow que dependem
   dela precisam ter migrado primeiro). Depois disso, mova tanto a pasta
   em `ai/` quanto o(s) adapter(s) para uma subpasta `_deprecated/` em vez
   de apagar — histórico de como algo funcionava é útil para depurar
   automações antigas.
