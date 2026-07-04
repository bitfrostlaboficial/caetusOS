# workflows/

Especificações de Capabilities de **camada 4 (workflow)** — as que
orquestram várias outras Capabilities (de negócio, de conhecimento, de
capacidades genéricas) para entregar uma tarefa de ponta a ponta que o
usuário reconhece como uma coisa só ("cria um post pro Instagram",
"publica esse artigo", "monta a campanha inteira").

Nenhum workflow foi implementado ainda. Os planejados
(`instagram-post`, `carousel-builder`, `landing-page-generator`) estão
listados em `ai/architecture/capability-registry.md`, com suas
dependências previstas.

Regra que vale para todo workflow: se a tarefa envolve marca, ele chama a
Capability de **Negócio** correspondente (`ai/capabilities/`), nunca a
capacidade genérica direto — ver
`ai/architecture/dependencias-permitidas.md`.
