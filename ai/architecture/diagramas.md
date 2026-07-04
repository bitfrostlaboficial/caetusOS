# Diagramas

Vistas complementares da arquitetura. Todas em Mermaid (renderiza no
GitHub, VS Code e na maioria dos visualizadores de Markdown); cada uma tem
uma legenda em texto logo abaixo para quem estiver lendo em um lugar sem
suporte a Mermaid.

## 1. As quatro camadas (dependência unidirecional)

```mermaid
graph TD
    WF["4. Workflow<br/>(instagram-post, carousel-builder...)"]
    NEG["3. Negócio<br/>(branded-image-generator...)"]
    CON["1. Conhecimento<br/>(company-knowledge)"]
    GEN["2. Capacidade genérica<br/>(image-generator, video-generator...)"]

    WF --> NEG
    WF --> CON
    WF --> GEN
    NEG -->|obrigatório quando depende da empresa| CON
    NEG --> GEN
```

Leitura: a seta sempre aponta de "quem chama" para "quem é chamado", e
nunca sobe. Workflow pode chamar as outras três; Negócio pode chamar
Conhecimento e Capacidade genérica, mas nunca Workflow nem outra Negócio;
Capacidade genérica e Conhecimento não chamam nada fora da própria camada
(regras completas em `dependencias-permitidas.md`).

## 2. Capability, Adapters e agentes de IA

```mermaid
graph LR
    subgraph SPEC["ai/capabilities/image-generator/ — especificação única"]
        CAP["CAPABILITY.md<br/>+ references/ + scripts/"]
    end

    subgraph ADAPT["Adapters (tradução por agente/mecanismo)"]
        A_CC[".claude/skills/image-generator/<br/>SKILL.md — Claude Code"]
        A_MCP["adapter MCP<br/>(planejado — servidor único)"]
        A_CODEX["adapter Codex<br/>(planejado)"]
        A_API["adapter GPT via API<br/>(planejado)"]
        A_OUTROS["adapter Llama / Mistral /<br/>Qwen / Gemini / OpenClaw<br/>(planejados)"]
    end

    CAP --> A_CC
    CAP --> A_MCP
    CAP --> A_CODEX
    CAP --> A_API
    CAP --> A_OUTROS

    A_CC --> AG_CC["Claude Code"]
    A_MCP --> AG_MCP1["Claude Desktop"]
    A_MCP --> AG_MCP2["qualquer cliente<br/>compatível com MCP"]
    A_CODEX --> AG_CODEX["OpenAI Codex"]
    A_API --> AG_API["qualquer app que fale<br/>com a API da OpenAI"]
    A_OUTROS --> AG_OUTROS["Llama / Mistral / Qwen /<br/>Gemini / OpenClaw"]
```

Leitura: **uma** especificação (`CAPABILITY.md`), **N** adapters finos, cada
um traduzindo para o mecanismo de um agente (ou protocolo). O adapter MCP é
o caso especial — ele não é "mais um agente", é um protocolo; escrever um
único servidor MCP em cima de uma Capability potencialmente atende
qualquer cliente MCP de uma vez, em vez de um adapter por agente (ver
`ai/adapters/README.md#mcp-como-adapter-universal`). Hoje só o adapter
Claude Code existe de verdade — os demais são o roadmap, não implementação.

## 3. Fluxo de negócio completo (workflow → negócio → conhecimento/capacidade)

```mermaid
graph TD
    U["Pedido do usuário:<br/>'cria um post de lançamento'"] --> WF["instagram-post<br/>(workflow)"]

    WF --> CK["company-knowledge<br/>(conhecimento)"]
    CK --> KB[("empresas/&lt;slug&gt;/conhecimento/")]

    WF --> BIG["branded-image-generator<br/>(negócio)"]
    BIG --> CK
    BIG --> IG["image-generator<br/>(capacidade genérica)"]
    IG --> PROV[["provedor externo<br/>(fal.ai, OpenAI, Gemini...)"]]

    WF --> MEM[("empresas/&lt;slug&gt;/memoria/posts/<br/>+ .contexto.json")]
```

Leitura: o workflow nunca fala com o provedor de imagem nem lê
`empresas/` diretamente — sempre atravessa a Capability de Negócio (que
por sua vez sempre consulta Conhecimento antes de chamar a Capacidade
genérica). O Context Contract (`ai/contracts/context-contract.md`) é o que
viaja em cada seta que sai de `company-knowledge` ou de `branded-image-generator`.
O resultado final e o contrato usado são persistidos em `memoria/` para
auditoria.

## 4. Fluxo completo: Usuário → Resolver → Planner → Plan → Executor → Registry → Capability → Adapter → Modelo de IA

```mermaid
graph TD
    U["Usuário: 'cria um post pro Instagram'"] --> RES["Resolver<br/>(ai/orchestration/resolver/)"]

    REG["Registry<br/>(ai/registry/)"] -.->|catálogo de manifest.yaml| RES
    MAN[("manifest.yaml de cada Capability")] -.->|escaneados por| REG

    RES -->|"decide: instagram-post"| PLN["Execution Planner<br/>(ai/orchestration/planner/)"]
    REG -.->|manifestos + dependências| PLN

    PLN --> PLANO[("Execution Plan<br/>(DAG, JSON)")]

    PLANO --> EXE["Executor<br/>(ai/orchestration/executor/)"]

    CTX["Context Manager<br/>(ai/orchestration/context-manager/)"] <-->|projeta entrada / mescla saída| EXE

    EXE -->|localiza e valida| REG
    EXE --> CAP["Capability<br/>(ex. image-generator)"]
    CAP --> AD["Adapter do agente em uso"]
    AD --> AG["Modelo de IA<br/>(Claude, GPT, Llama, Gemini...)"]
```

Leitura: o Resolver decide *o quê*; o Planner decide *como* (o plano); o
Executor *roda* o plano já pronto, sempre consultando o Registry para
achar/validar cada Capability e o Context Manager para saber o que passar
de entrada e onde guardar o que sai. Nenhum componente pula etapa nem
assume o papel de outro (ver `ai/orchestration/README.md#regra-de-desacoplamento-objetivo-central-desta-camada`).
Só o Adapter sabe qual agente de IA está rodando por baixo — todo o resto
da cadeia é agnóstico disso.

## 5. Por que o Execution Plan é um DAG, não uma lista

```mermaid
graph TD
    E1["etapa-1: company-knowledge"] --> E2["etapa-2: branded-copy-generator"]
    E1 --> E3["etapa-3: branded-image-generator"]
    E2 --> E4["etapa-4: carousel-builder"]
    E3 --> E4
    E4 --> E5["etapa-5: instagram-publisher"]
```

Leitura: `etapa-2` e `etapa-3` só dependem de `etapa-1` — nada as impede
de rodar ao mesmo tempo. Numa lista sequencial isso ficaria invisível (só
daria pra ver "2 vem depois de 1, 3 vem depois de 2"); no DAG, fica
explícito que 2 e 3 são independentes entre si. `branded-copy-generator`,
`branded-image-generator`, `carousel-builder` e `instagram-publisher` são
nomes ilustrativos deste exemplo (ver `ai/contracts/execution-plan-schema.md`)
— nenhuma dessas Capabilities existe ainda.

## Como criar uma Capability nova, em uma linha por etapa

Isto já está descrito em detalhe em `ARQUITETURA.md` e
`convencoes-globais.md`; aqui vai só o roteiro visual:

```mermaid
graph LR
    A["1. Decidir a camada"] --> B["2. Criar manifest.yaml<br/>em ai/&lt;camada&gt;/&lt;slug&gt;/"]
    B --> C["3. Escrever CAPABILITY.md<br/>(narrativa, sem repetir o manifesto)"]
    C --> D["4. Adicionar references/<br/>e scripts/ se precisar"]
    D --> E["5. Criar o adapter Claude Code<br/>em .claude/skills/&lt;slug&gt;/SKILL.md"]
    E --> F["6. Rodar discover.py<br/>e registrar em capability-registry.md"]
```
