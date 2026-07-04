# Formato padrão de uma Capability

Uma **Capability** é a unidade atômica de comportamento do Caetus OS,
especificada uma única vez, de forma independente de qual agente de IA vai
executá-la (Claude Code, Codex, Gemini, Llama, Mistral, Qwen, OpenClaw, um
cliente MCP, ou qualquer outro acessado via API). Ela vive em
`ai/<capabilities|workflows|knowledge>/<slug>/` e nenhum dos seus arquivos
menciona um agente específico — quem faz essa ponte é o Adapter (ver
`ai/contracts/capability-vs-adapter.md` e `ai/adapters/`).

## Estrutura de diretório

```
ai/<pasta-da-camada>/<slug>/
├── manifest.yaml       (obrigatório — metadados machine-readable, ver manifest-schema.md)
├── CAPABILITY.md        (obrigatório — narrativa human-readable: objetivo, regras, exemplos)
├── references/           (opcional — docs de apoio carregadas sob demanda)
├── scripts/               (opcional — código determinístico, executável via
│                            shell por qualquer agente com esse acesso)
└── assets/                (opcional — templates, ícones, fontes usados no output)
```

`<pasta-da-camada>` é `knowledge/` para a camada 1, `capabilities/` para as
camadas 2 e 3 (capacidade genérica e negócio — a diferença entre as duas
fica no campo `camada` do manifesto, não na pasta), e `workflows/` para a
camada 4. O porquê dessa divisão está em `ai/architecture/ARQUITETURA.md`.

## Dois arquivos, duas responsabilidades, sem sobreposição

| | `manifest.yaml` | `CAPABILITY.md` |
|---|---|---|
| Para quem | Máquinas (Registry, Resolver, adapters, ferramentas futuras) | Humanos (quem lê/mantém/estende a Capability) |
| Formato | YAML estrito, schema fixo | Markdown livre |
| Conteúdo | O quê: id, versão, contrato estruturado, dependências, permissões, custo, adapters | Por quê e como: objetivo em prosa, regras explicadas, exemplos, boas práticas |
| Campo "resumo" | `descricao` — uma ou duas frases | Seção "Objetivo"/"Quando usar" — o texto completo |
| Contrato de entrada/saída | `entradas`/`saidas` — schema exato, fonte oficial | Prosa explicando o contrato, exemplos de uso — nunca repete a lista de parâmetros linha a linha |

Regra simples para não duplicar: se a informação é uma lista/tabela
estruturada que uma ferramenta precisaria fazer *parsing* para usar
(nome do parâmetro, tipo, se é obrigatório), ela mora no `manifest.yaml`.
Se é uma explicação, um exemplo, ou o raciocínio por trás de uma regra,
mora no `CAPABILITY.md`. Ver `ai/contracts/manifest-schema.md` para o
schema completo do manifesto.

## Seções recomendadas do `CAPABILITY.md`

1. **Objetivo** — o que a Capability entrega, em prosa.
2. **Quando usar** — framing neutro (não é o texto de triggering de nenhum
   agente — isso vive no adapter, ver `ai/contracts/capability-vs-adapter.md`).
3. **Regras** — isolamento, o que a Capability nunca deve fazer.
4. **Contrato de entrada/saída (explicado)** — prosa e exemplos; o schema
   exato vive em `manifest.yaml`.
5. **Como executar** — comando/script agnóstico de agente.
6. **Tratamento de erros**.
7. **Referências** — pointers para `references/`.

Isto é o mesmo espírito de progressive disclosure que o `skill-creator` já
usa para `SKILL.md`: o `CAPABILITY.md` fica enxuto, e cada assunto grande
vai para `references/`; os metadados estruturados vão para `manifest.yaml`.

## Exemplo completo

Ver `ai/capabilities/image-generator/` — é a primeira Capability
implementada seguindo este formato de dois arquivos, com `references/`
para provedores, prompting e o contrato de saída detalhado. Ver também
`ai/knowledge/company-knowledge/` para o caso de uma Capability ainda só
especificada (sem `scripts/`, `status: planejada` no manifesto).
