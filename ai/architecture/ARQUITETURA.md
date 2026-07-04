# Arquitetura de Capabilities — Caetus OS

Este documento é o padrão oficial do Caetus OS para especificar e
organizar **Capabilities** — as unidades de comportamento do sistema
(gerar imagem, consultar conhecimento da empresa, montar um post) — de
forma **independente de qual agente de IA as executa**. Vale a partir de
agora para toda Capability nova em `ai/`, e existe para que a estrutura
continue navegável quando houver dezenas ou centenas delas, operadas por
mais de um agente ao mesmo tempo.

> **Versão deste documento:** 5.0.0 — revisão de 2026-07-04. A v1 vivia em
> `.claude/skills/ARQUITETURA.md` e falava só de "skills". A v2 moveu o
> registro/contratos/convenções para uma pasta `references/` ainda dentro
> de `.claude/skills/`. A v3 desacoplou a arquitetura do mecanismo de
> Skills do Claude Code: a especificação oficial de cada Capability passou
> a viver em `ai/`, e `.claude/skills/` passou a conter só adaptadores
> finos. A v4 formalizou o **manifesto machine-readable** (`manifest.yaml`,
> ver `ai/contracts/manifest-schema.md`) como fonte oficial de metadados de
> toda Capability, e introduziu o **Registry** (`ai/registry/`, descoberta
> e validação automática) e o **Resolver** (intenção → `id` de
> Capability/Workflow). Esta v5 constrói o **núcleo de orquestração**
> (`ai/orchestration/`): o **Execution Planner** (`id` escolhido →
> Execution Plan), o formato do **Execution Plan** — um DAG em JSON, ver
> `ai/contracts/execution-plan-schema.md` — o **Executor** (roda o plano)
> e o **Context Manager** (estado compartilhado da execução). O Resolver
> mudou de endereço nesta revisão, de `ai/resolver/` para
> `ai/orchestration/resolver/`, para ficar junto dos outros três
> componentes do mesmo pipeline por requisição (justificativa em
> `ai/orchestration/README.md`). Nenhum princípio das versões anteriores
> (quatro camadas, dependência unidirecional, isolamento entre
> conhecimento e capacidades genéricas) mudou.

## Por que desacoplar de `.claude/skills`

`.claude/skills/` é um mecanismo **do Claude Code**: é onde e como esse
agente especificamente descobre e carrega skills. É um mecanismo ótimo,
mas é só um dos vários pelos quais um agente de IA pode vir a operar o
Caetus OS — o objetivo declarado do projeto inclui Codex, Gemini, Llama,
Mistral, Qwen e qualquer outro agente acessado via API. Se a especificação
de cada capacidade (o que ela faz, seu contrato, suas regras) vivesse
dentro de `.claude/skills/`, dar suporte a um agente novo significaria
reescrever tudo isso em outro formato — e as duas cópias divergiriam
silenciosamente com o tempo.

A solução: a especificação vive **uma única vez**, em `ai/`, escrita para
não mencionar nenhum agente. Cada agente ganha um **Adapter** fino — para
o Claude Code, isso continua sendo um `SKILL.md` em `.claude/skills/`,
porque é assim que o mecanismo automático de Skills do Claude Code
funciona e continuamos querendo esse mecanismo automático funcionando sem
fricção. O adapter nunca contém a especificação — só a referencia. Ver
`ai/contracts/capability-vs-adapter.md` para a régua exata do que vai em
cada lado, e `ai/adapters/claude-code.md` para o padrão concreto do
adapter Claude Code.

Nota de nomenclatura: este `ai/` não é o mesmo que `backend/app/ia/` (o
roteador de provedores de IA do backend do produto, que atende usuários
finais em produção). São duas coisas relacionadas mas distintas — ver
`ai/README.md` para a diferença.

## As quatro camadas

```
                        ┌────────────────────┐
                        │   4. Workflow       │  instagram-post,
                        │  (orquestra tudo)   │  landing-page-generator,
                        └─────────┬───────────┘  carousel-builder...
                                  │ chama
                        ┌─────────▼───────────┐
                        │   3. Negócio         │  branded-image-generator,
                        │ (aplica a empresa    │  sales-objection-handler...
                        │  sobre a capacidade) │
                        └──────┬───────┬───────┘
                     consulta  │       │  usa
                    obrigatório▼       ▼
        ┌───────────────────────┐   ┌───────────────────────────┐
        │  1. Conhecimento       │   │  2. Capacidades genéricas  │
        │  company-knowledge     │   │  image-generator,          │
        │  (única porta de       │   │  video-generator,           │
        │  entrada p/ empresas/) │   │  web-search, seo-auditor... │
        └───────────────────────┘   └───────────────────────────┘
```

A dependência é sempre de cima para baixo. Uma Capability de camada
inferior **nunca** chama uma de camada superior:

- **Workflow** pode chamar Negócio, Conhecimento e Capacidades genéricas.
- **Negócio** pode chamar Conhecimento e Capacidades genéricas, mas nunca
  outra Capability de Negócio nem de Workflow.
- **Capacidades genéricas** não chamam nada das outras três camadas — são a
  base, reaproveitável em qualquer projeto e por qualquer agente.
- **Conhecimento** não depende de nenhuma outra Capability. É só leitura da
  base de conhecimento e devolve informação já interpretada.

A tabela completa de combinações permitidas/proibidas, com exemplos de
fluxo corretos e incorretos, está em
**`ai/architecture/dependencias-permitidas.md`**. Para uma vista gráfica
desta mesma cadeia, mais o diagrama de como uma Capability se relaciona
com múltiplos Adapters e agentes de IA ao mesmo tempo (Claude Code, Codex,
GPT via API, Gemini, Llama, Mistral, Qwen, OpenClaw, MCP), veja
**`ai/architecture/diagramas.md`**.

### 1. Capabilities de conhecimento — `ai/knowledge/`

Respondem só "o que a empresa sabe/é", sem produzir nenhum artefato final.
Hoje a arquitetura prevê **uma única Capability nesta camada:
`company-knowledge`** (especificação completa em
**`ai/knowledge/company-knowledge/CAPABILITY.md`**). Se um dia o volume de
conhecimento justificar dividir por domínio, a divisão continua dentro
desta camada — nunca uma Capability de Negócio lendo `empresas/` por conta
própria.

### 2. Capacidades genéricas e 3. Negócio — `ai/capabilities/`

Camadas 2 e 3 dividem a mesma pasta de topo porque, do ponto de vista de
quem orquestra (um workflow), ambas são "uma Capability que devolve um
artefato" — a diferença é interna, marcada pelo campo `camada` do
manifesto de cada Capability (`manifest.yaml`, ver
`ai/contracts/manifest-schema.md`).

**Capacidades genéricas** fazem uma coisa técnica bem, sem saber nada sobre
nenhuma empresa: gerar imagem, gerar vídeo, gerar texto, pesquisar na web,
auditar SEO, editar arquivo, chamar uma API externa. Regras:

- **Nunca leem `empresas/**`** nem qualquer coisa que identifique uma
  empresa específica. Se uma informação de marca é necessária (cor, tom,
  logo), ela chega como **parâmetro explícito** de quem chamou — a
  Capability genérica não sai procurando essa informação sozinha.
- Devem funcionar se você copiar a pasta para outro projeto qualquer, sem
  editar nada, e executá-la a partir de qualquer agente com acesso a
  shell.
- Nomeiam-se pela capacidade em si (`image-generator`, `video-generator`,
  `pdf-generator`, `web-search`), sem prefixo de camada.

**Capabilities de Negócio** pegam uma capacidade genérica e aplicam
conhecimento da empresa em cima: gerar imagem seguindo o branding,
responder objeção de venda com o playbook da empresa, escrever texto no
tom de voz da marca. Regra que não é opcional:

> **Toda Capability de negócio deve consultar `company-knowledge` antes de
> executar qualquer ação que dependa de identidade, branding, tom de voz,
> produto ou processo da empresa.** Esse passo deve estar escrito de forma
> explícita no `CAPABILITY.md` correspondente, não implícito. A troca de
> informação entre as duas segue sempre o **Context Contract** — ver
> **`ai/contracts/context-contract.md`** —, nunca texto livre.

Convenção de nome: `branded-<capacidade>` quando o que se aplica é
identidade visual (ex.: `branded-image-generator`); nome livre quando o
conhecimento aplicado é de outro domínio, desde que a consulta obrigatória
a `company-knowledge` continue documentada.

### 4. Capabilities de workflow — `ai/workflows/`

Orquestram várias Capabilities (de negócio, de conhecimento, de capacidades
genéricas) para entregar uma tarefa de ponta a ponta que o usuário
reconhece como uma coisa só: "cria um post pro Instagram", "publica esse
artigo", "monta a campanha inteira". Nomeiam-se pela entrega final
(`instagram-post`, `landing-page-generator`, `carousel-builder`).

Regra: um workflow que precisa de algo com marca (imagem, texto, vídeo)
deve chamar a Capability de **Negócio** correspondente, não a capacidade
genérica direto — senão o branding é pulado sem querer. Só chama a
capacidade genérica direto quando a tarefa é deliberadamente neutra de
marca. Um workflow também pode compor outro workflow como sub-fluxo, com
restrições — ver `ai/architecture/dependencias-permitidas.md`.

## Por que `company-knowledge` é obrigatória

Hoje a base de conhecimento da empresa já existe e está bem mapeada em
`empresas/<slug>/conhecimento/` (ver `empresas/caetus_systems/conhecimento/README.md`
para o mapa completo de pastas: institucional, produto, comercial, cliente,
marketing, processo, rh, financeiro, jurídico). Se cada Capability de
negócio for lendo esses arquivos por conta própria, toda mudança na
organização dessa pasta obriga a revisar N Capabilities.

Com `company-knowledge` como porta única, nenhuma Capability de negócio
sabe onde os arquivos estão fisicamente, nem precisa saber — ela pergunta
"qual é o tom de voz da empresa?" e recebe a resposta já resolvida, no
formato do Context Contract. Se amanhã a estrutura de pastas mudar, só
`company-knowledge` muda.

**Status:** esta Capability ainda **não foi implementada**. O contrato
completo dela já está documentado em
**`ai/knowledge/company-knowledge/CAPABILITY.md`**, para que Capabilities
de Negócio futuras já nasçam desenhadas para consultá-la corretamente.
Antes de criar qualquer Capability de Negócio, `company-knowledge` precisa
existir de fato.

## O manifesto machine-readable

Toda Capability tem, obrigatoriamente, um `manifest.yaml` na raiz da sua
pasta — o `CAPABILITY.md` não carrega mais essa informação em frontmatter.
Formato completo, campo a campo, em **`ai/contracts/manifest-schema.md`**;
a divisão de responsabilidade entre os dois arquivos, em
**`ai/contracts/capability-format.md`**. Isso é o que torna a frase final
do objetivo do manifesto possível: descobrir automaticamente todas as
Capabilities existentes lendo só esses arquivos — é literalmente o que o
Registry faz.

## Registry: serviço passivo, pasta própria

`ai/registry/` não é Capability (não tem manifesto próprio, não faz parte
de nenhuma das quatro camadas), não é contrato (é um processo, não uma
especificação passiva), e não é narrativa de arquitetura nem tradução para
um agente específico — é **serviço de infraestrutura do próprio
ecossistema**, o índice de um sistema operacional para agentes de IA. Por
não caber em nenhuma das seis pastas originais, ganhou a sua. Descobre,
valida e cataloga todo `manifest.yaml` do projeto, com implementação real
(`ai/registry/scripts/discover.py`) — não só documentação — porque validar
o formato do manifesto contra Capabilities de verdade é a prova de que o
formato é suficiente, não uma aspiração. **Nunca executa uma Capability.**

## orchestration/: o núcleo que decide, planeja, executa e mantém estado

`ai/orchestration/` reúne quatro componentes que, juntos, formam o
pipeline que roda a cada pedido do usuário — diferente do Registry (uma
biblioteca consultada por qualquer coisa, a qualquer momento), estes
quatro têm uma ordem de execução fixa dentro de uma mesma requisição, o
que justifica agrupá-los numa pasta em vez de espalhá-los soltos na raiz
de `ai/`:

- **Resolver** (`ai/orchestration/resolver/`) — intenção em linguagem
  natural → `id` de Capability/Workflow. Documentado, implementação
  futura.
- **Execution Planner** (`ai/orchestration/planner/`) — `id` escolhido →
  Execution Plan (o DAG de etapas). Documentado, implementação futura.
- **Executor** (`ai/orchestration/executor/`) — roda o Execution Plan,
  localizando cada Capability via Registry e usando o Context Manager para
  ler/escrever estado. Documentado, implementação futura.
- **Context Manager** (`ai/orchestration/context-manager/`) — mantém o
  Execution Context de cada execução (entrada do usuário, Context
  Contract, resultados intermediários, arquivos produzidos, histórico).
  Documentado, implementação futura.

Detalhe completo de cada um, incluindo por que nenhum implementa lógica
real ainda, em `ai/orchestration/README.md`. Nenhum dos quatro executa uma
Capability diretamente — quem faz isso, depois que o Resolver decidiu o
quê, o Planner decidiu como, e o Executor orquestrou a ordem, é sempre um
agente de IA concreto, através do Adapter correspondente.

## Checklist para criar uma Capability nova

1. Decida a camada — critérios detalhados em
   `ai/architecture/convencoes-globais.md#quando-criar-uma-capability-nova-vs-reaproveitar-uma-existente`.
   Regra rápida: "essa Capability funcionaria idêntica em outra empresa,
   executada por outro agente de IA, sem mudar uma linha?" Se sim, é
   capacidade genérica.
2. Verifique se já existe uma capacidade genérica reaproveitável antes de
   escrever lógica técnica nova dentro de uma Capability de negócio ou
   workflow.
3. Crie o `manifest.yaml` seguindo `ai/contracts/manifest-schema.md` e o
   `CAPABILITY.md` seguindo `ai/contracts/capability-format.md` — nenhum
   dos dois menciona um agente específico.
4. Se for Capability de negócio: escreva explicitamente o passo de
   consulta a `company-knowledge`, usando o Context Contract.
5. Crie o adapter Claude Code correspondente (`.claude/skills/<slug>/SKILL.md`)
   seguindo `ai/adapters/claude-code.md` — fino, sem duplicar conteúdo.
6. Adicione a Capability em `ai/architecture/capability-registry.md` (o
   roadmap mantido à mão) — e rode
   `python ai/registry/scripts/discover.py --formato tabela` para
   confirmar que o manifesto novo é descoberto e passa na validação.

## Onde encontrar cada coisa

| Preciso de... | Vá para |
|---|---|
| Diagramas (camadas, Capability↔Adapters↔agentes, fluxo completo Usuário→Resolver→Planner→Executor→Registry→Capability→Adapter→Modelo, DAG do Execution Plan) | `ai/architecture/diagramas.md` |
| O formato do `manifest.yaml`, campo a campo | `ai/contracts/manifest-schema.md` |
| O formato do Execution Plan (DAG, JSON) e do Execution Result | `ai/contracts/execution-plan-schema.md` (schema formal em `execution-plan.schema.json`) |
| Índice de todas as Capabilities, com objetivo/dependências/contratos/status/versão/adapters | `ai/architecture/capability-registry.md` |
| Como descobrir/validar automaticamente as Capabilities existentes | `ai/registry/README.md` |
| Como um pedido em linguagem natural vira um `id` de Capability/Workflow | `ai/orchestration/resolver/README.md` |
| Como um `id` escolhido vira um Execution Plan | `ai/orchestration/planner/README.md` |
| Como um Execution Plan é executado (contrato + algoritmo) | `ai/orchestration/executor/README.md` |
| Como o estado compartilhado de uma execução é mantido | `ai/orchestration/context-manager/README.md` |
| Visão geral do núcleo de orquestração (o pipeline inteiro) | `ai/orchestration/README.md` |
| O formato padrão de uma pasta de Capability (manifesto + `CAPABILITY.md`) | `ai/contracts/capability-format.md` |
| O que pertence à Capability e o que pertence só ao adapter de um agente | `ai/contracts/capability-vs-adapter.md` |
| O formato do objeto que carrega dados de empresa entre Capabilities | `ai/contracts/context-contract.md` |
| Convenções de contrato JSON, parâmetros, retorno e erro | `ai/contracts/convencoes-de-contrato.md` |
| Convenções de nome, diretório, versionamento, depreciação | `ai/architecture/convencoes-globais.md` |
| O que cada camada pode/não pode chamar, com exemplos | `ai/architecture/dependencias-permitidas.md` |
| Como isso escala para múltiplas empresas/agentes de IA/workflows simultâneos | `ai/architecture/escalabilidade.md` |
| O contrato completo (ainda não implementado) de `company-knowledge` | `ai/knowledge/company-knowledge/CAPABILITY.md` |
| Como escrever um adapter para um agente (Claude Code hoje; Codex/Gemini/etc. no futuro) | `ai/adapters/README.md` |

Atualize `ai/architecture/capability-registry.md` sempre que uma
Capability nova for criada, alterada de status, ou depreciada.
