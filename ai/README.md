# ai/ — Capabilities do Caetus OS

Esta pasta é a especificação **oficial e única**, independente de agente de
IA, de tudo que o Caetus OS sabe fazer. Claude Code, Codex, Gemini, Llama,
Mistral, Qwen ou qualquer outro agente acessado via API devem consumir a
mesma documentação daqui — nunca uma cópia própria. Comece por
`architecture/ARQUITETURA.md`; este README é só o mapa de onde cada coisa
mora.

## As oito pastas

As seis originais, mais `registry/` (serviço passivo de descoberta) e
`orchestration/` (o núcleo que decide/planeja/executa/mantém estado —
reúne Resolver, Execution Planner, Executor e Context Manager, que juntos
formam um pipeline por requisição, diferente dos serviços passivos
consultados a qualquer momento). Justificativa completa em
`architecture/ARQUITETURA.md`.

| Pasta | O que guarda |
|---|---|
| `capabilities/` | Capabilities de camada 2 (capacidade genérica) e camada 3 (negócio) — a diferença entre as duas é o campo `camada` do manifesto de cada uma, não a localização. |
| `workflows/` | Capabilities de camada 4 — orquestram várias Capabilities para entregar uma tarefa de ponta a ponta. |
| `knowledge/` | Capability(ies) de camada 1 — hoje, `company-knowledge` (estrutura e contrato definidos, lógica ainda não implementada), a única porta de entrada para `empresas/`. |
| `contracts/` | Formatos padronizados que atravessam Capabilities: o formato do manifesto (`manifest.yaml`), o formato do Execution Plan (DAG, JSON), a divisão entre `CAPABILITY.md` e manifesto, a régua Capability-vs-Adapter, o Context Contract, e as convenções de contrato JSON/parâmetro/erro. |
| `architecture/` | A narrativa arquitetural em si: `ARQUITETURA.md` (documento principal), diagramas, o Capability Registry (documental), as convenções globais, a matriz de dependências permitidas, e a seção de escalabilidade. |
| `adapters/` | Como cada agente de IA consome as Capabilities daqui — hoje, só o adapter Claude Code (que continua sendo `.claude/skills/`); Codex/GPT via API/Gemini/Llama/Mistral/Qwen/OpenClaw/MCP ficam documentados como próximos passos. |
| `registry/` | O índice **automático**: escaneia `manifest.yaml` de toda Capability, valida, cataloga. Nunca executa nada. Tem uma implementação real (`registry/scripts/discover.py`), não só documentação. |
| `orchestration/` | O núcleo: `resolver/` (intenção → `id`), `planner/` (`id` → Execution Plan), `executor/` (roda o plano), `context-manager/` (estado compartilhado da execução). Todos documentados; nenhum com lógica de execução implementada ainda. |

## Por onde começar

1. `architecture/ARQUITETURA.md` — as quatro camadas, as regras de
   dependência, o porquê de tudo isso existir.
2. `architecture/diagramas.md` — a vista gráfica de tudo: camadas,
   Capability↔Adapters↔agentes, e o fluxo completo Usuário→Resolver→
   Planner→Executor→Registry→Capability→Adapter→Modelo de IA.
3. `contracts/manifest-schema.md` — o formato do `manifest.yaml`, que todo
   Capability precisa ter.
4. `contracts/execution-plan-schema.md` — o formato do Execution Plan
   (DAG, JSON) que conecta o Planner ao Executor.
5. `contracts/capability-format.md` — como é a pasta que define uma
   Capability (manifesto + `CAPABILITY.md` + `references/` + `scripts/`).
6. `contracts/capability-vs-adapter.md` — a régua "isso vai na Capability
   ou no adapter?", que evita duplicação de documentação conforme o número
   de agentes de IA suportados cresce.
7. `registry/README.md` e `orchestration/README.md` — como o sistema
   descobre (Registry) e decide/planeja/executa (orchestration).
8. `architecture/capability-registry.md` — o roadmap de tudo que existe,
   planejado ou implementado (mais amplo que o que o Registry descobre
   automaticamente — ver `registry/README.md#relação-com-ai-architecture-capability-registrymd`).

## O que **não** é isto

- **Não é `backend/app/ia/`.** Aquela pasta é o roteador de provedores de
  IA do **backend do produto** — código Python que atende requisições reais
  de clientes em produção (ex. quando alguém usa o Caetus OS pela
  interface web e pede pra gerar um post). Esta pasta (`ai/`) é a
  especificação de Capabilities para **agentes de IA que operam ou
  desenvolvem o próprio Caetus OS** (Claude Code hoje). São camadas
  relacionadas — uma Capability aqui poderia, no futuro, optar por chamar
  a API do backend em vez de reimplementar acesso a provedores — mas essa
  é uma decisão de integração ainda em aberto, não resolvida por esta
  reestruturação. Ver a nota em
  `ai/capabilities/image-generator/references/providers.md` para o caso
  concreto (a Capability `image-generator` hoje chama provedores
  diretamente, de forma standalone, para continuar sendo copiável para
  qualquer projeto mesmo sem este backend).
- **Não é `empresas/`.** Os dados reais de cada empresa (conhecimento,
  memória, uploads) continuam vivendo em `empresas/<slug>/`, fora do Git.
  `ai/knowledge/company-knowledge/` documenta *como* acessar isso, nunca
  guarda o conteúdo em si.
- **Não é `.claude/skills/`.** Aquela pasta continua existindo e
  funcionando exatamente como antes — é o adapter Claude Code. A diferença
  é que, a partir de agora, cada `SKILL.md` correspondente a uma
  Capability do Caetus OS é fino e aponta para cá, em vez de conter a
  especificação inteira.
- **Não é `caetus/config/`.** Aquela pasta controla **como** um agente de
  IA opera este repositório (permissões, modo de aprovação — perfis
  "Safe"/"Developer") — não o que ele sabe fazer. Uma Capability aqui nunca
  decide seu próprio nível de permissão; isso é sempre uma decisão de
  sessão, externa a ela. Ver `caetus/README.md`.
