# Registry

O Registry é o **índice oficial** do ecossistema de Capabilities do Caetus
OS. Sua única responsabilidade é descobrir, catalogar e validar — ele
**nunca executa nenhuma Capability**. Pense nele como o gerenciador de
pacotes de um sistema operacional: sabe o que está instalado, sabe os
metadados de cada pacote, sabe dizer se um pacote está mal-formado — não
roda o programa dentro do pacote.

## Responsabilidades

1. **Descobrir** — escanear `ai/capabilities/*/manifest.yaml`,
   `ai/workflows/*/manifest.yaml` e `ai/knowledge/*/manifest.yaml`.
2. **Validar** — checar cada manifesto contra o schema em
   `ai/contracts/manifest-schema.md` (campos obrigatórios presentes, enums
   com valores válidos, `id` batendo com o nome da pasta) e contra as
   regras de arquitetura que são computáveis, principalmente:
   - a permissão `leitura_conhecimento_empresa` só pode aparecer em uma
     Capability de `camada: conhecimento` (a aplicação prática da regra de
     isolamento — ver `ai/architecture/ARQUITETURA.md`);
   - toda `dependencia` declarada deveria existir como outro manifesto
     descoberto (aviso, não erro — muitas dependências hoje apontam para
     Capabilities ainda só planejadas, sem pasta própria ainda).
3. **Catalogar** — produzir uma listagem estruturada (id, camada,
   categoria, versão, status, descrição, dependências) que o Resolver
   (`ai/orchestration/resolver/`) e qualquer outra ferramenta futura possam consumir sem
   reimplementar a leitura/validação de manifestos.

## O que o Registry **não** faz

- Não executa scripts de nenhuma Capability.
- Não decide qual Capability usar para uma tarefa (isso é o Resolver).
- Não conhece nenhum agente de IA específico (isso é o Adapter).
- Não guarda estado sobre execuções passadas (isso seria `empresas/<slug>/memoria/`,
  um assunto completamente diferente).

## Implementação de referência

`scripts/discover.py` é uma implementação mínima e real (não um stub) —
prova de que o formato de manifesto é, de fato, suficiente para descoberta
automática, que era o objetivo declarado do manifesto (ver
`ai/contracts/manifest-schema.md`). Uso:

```bash
python ai/registry/scripts/discover.py
```

Imprime um catálogo em JSON no stdout com três chaves: `capabilities`
(lista de manifestos válidos, já normalizados), `avisos` (dependências não
encontradas e outras questões não-bloqueantes) e `erros` (violações do
schema ou da regra de isolamento — quando há qualquer erro, o processo
sai com código `1`). Depende de PyYAML, que já é dependência do backend
deste projeto (`backend/pyproject.toml`).

Use `--formato tabela` para uma visão legível por humano em vez do JSON
bruto — útil para conferir rapidamente o que está catalogado sem precisar
interpretar JSON.

Use `--id <capability-id>` para "localizar uma Capability através do
Registry" (a responsabilidade que `ai/orchestration/executor/README.md` e
`ai/orchestration/planner/README.md` esperam do Registry) sem precisar
reimplementar a leitura/validação de manifestos:

```bash
python ai/registry/scripts/discover.py --id image-generator
```

Devolve `{"capability": {...manifesto...}, "error": null}`, ou
`{"capability": null, "error": "..."}` se o id não existir no catálogo.

## Relação com `ai/architecture/capability-registry.md`

Esse arquivo (o "Capability Registry" documental, mantido à mão) continua
existindo e cobre um escopo mais amplo: inclui Capabilities **planejadas**
que ainda nem têm pasta criada, então o `discover.py` — que só enxerga
manifestos que existem de fato — nunca vai substituí-lo totalmente. A
relação é: `discover.py` é a fonte de verdade para o que **já está
implementado ou estruturado** (tem manifesto); `capability-registry.md` é
o roadmap completo, incluindo o que ainda é só uma ideia registrada. Uma
entrada some do roadmap manual e vira "descoberta automaticamente" no
exato momento em que ganha um `manifest.yaml` real.

## Evolução futura (fora do escopo desta etapa)

Não implementado agora, propositalmente (ver `ai/architecture/convencoes-globais.md`
sobre evitar complexidade que ainda não será usada), mas o desenho já
comporta:

- Um cache do catálogo (`ai/registry/catalogo.json` gerado, não editado à
  mão) para o Resolver não precisar re-escanear o disco a cada consulta.
- Validação de que `dependencias` não forma ciclo entre Capabilities de
  mesma camada (a regra já existe em `dependencias-permitidas.md`; falta
  só o código que a verifica automaticamente).
- Geração automática de `ai/architecture/capability-registry.md` a partir
  do catálogo, quando o número de Capabilities reais justificar parar de
  manter esse arquivo à mão.
