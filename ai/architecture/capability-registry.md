# Capability Registry

Este é o **roadmap oficial** de todas as Capabilities do Caetus OS,
mantido à mão — inclui Capabilities que ainda nem têm pasta criada, o que
o torna mais amplo do que o catálogo automático produzido pelo
**Registry** (`ai/registry/`, que só enxerga Capabilities que já têm um
`manifest.yaml` real). Toda Capability nova ganha uma entrada aqui no
mesmo dia em que é criada — é o que evita a arquitetura virar uma pasta
plana ilegível quando houver dezenas ou centenas delas. Assim que uma
Capability ganha `manifest.yaml`, rode
`python ai/registry/scripts/discover.py --formato tabela` para conferir
que ela também aparece lá, catalogada e validada.

Cada entrada tem sempre os mesmos oito campos. Copie o template abaixo ao
adicionar uma Capability nova:

```markdown
### <slug-da-capability>
- **Camada:** conhecimento | capacidade-genérica | negócio | workflow
- **Objetivo:** uma frase — o que essa Capability entrega, não como.
- **Depende de:** lista de slugs de outras Capabilities (ou "nenhuma").
- **Status:** planejada | em desenvolvimento | implementada | deprecada
- **Versão:** semver (ex. `1.0.0`) — ver
  `ai/architecture/convencoes-globais.md#como-versionar-uma-capability`.
- **Manifesto:** caminho do `manifest.yaml` (contrato de entrada/saída
  exato, permissões, adapters — fonte oficial; não repita aqui).
- **Especificação:** caminho do `CAPABILITY.md`.
```

Enquanto a Capability é só uma ideia (sem pasta/manifesto ainda), o campo
**Manifesto** fica `ainda não existe` — normal para a maioria das entradas
abaixo hoje.

Capabilities **deprecadas** continuam com uma entrada aqui (não se apaga
histórico), com o campo Status = `deprecada` e uma nota de qual Capability
a substitui.

## Camada 1 — Conhecimento

### company-knowledge
- **Camada:** conhecimento
- **Objetivo:** ser a única porta de entrada para `empresas/<slug>/`, devolvendo conhecimento da empresa já interpretado (nunca arquivo bruto) para qualquer Capability de negócio ou workflow.
- **Depende de:** nenhuma.
- **Status:** planejada (estrutura, contrato e manifesto definidos; lógica ainda não implementada)
- **Versão:** — (`null` no manifesto, ainda sem versão implementável)
- **Manifesto:** `ai/knowledge/company-knowledge/manifest.yaml`
- **Especificação:** `ai/knowledge/company-knowledge/CAPABILITY.md`

## Camada 2 — Capacidades genéricas

### image-generator
- **Camada:** capacidade-genérica
- **Objetivo:** gerar imagens a partir de um prompt textual, usando qualquer provedor de geração de imagem disponível, sem conhecer nenhuma empresa.
- **Depende de:** nenhuma.
- **Status:** implementada
- **Versão:** 1.0.0
- **Manifesto:** `ai/capabilities/image-generator/manifest.yaml` (contrato completo, adapters, permissões, custo)
- **Especificação:** `ai/capabilities/image-generator/CAPABILITY.md`

### video-generator
- **Camada:** capacidade-genérica
- **Objetivo:** gerar vídeos a partir de um prompt textual ou de um frame inicial (pode depender de `image-generator` para o frame — ver `ai/architecture/dependencias-permitidas.md`), sem conhecer nenhuma empresa.
- **Depende de:** `image-generator` (opcional, só quando o modo de geração parte de uma imagem).
- **Status:** planejada
- **Versão:** —
- **Manifesto:** ainda não existe.
- **Especificação:** ainda não existe.

## Camada 3 — Negócio

### branded-image-generator
- **Camada:** negócio
- **Objetivo:** gerar imagem seguindo a identidade visual da empresa ativa — consulta `company-knowledge` para paleta/estilo e chama `image-generator` com o prompt já resolvido.
- **Depende de:** `company-knowledge`, `image-generator`.
- **Status:** planejada
- **Versão:** —
- **Manifesto:** ainda não existe.
- **Especificação:** ainda não existe.

## Camada 4 — Workflow

### instagram-post
- **Camada:** workflow
- **Objetivo:** produzir e preparar um post completo para Instagram (texto + imagem, no tom e visual da empresa) a partir de um pedido de alto nível.
- **Depende de:** `company-knowledge`, `branded-image-generator` (e futuramente uma Capability de negócio de texto equivalente).
- **Status:** planejada
- **Versão:** —
- **Manifesto:** ainda não existe.
- **Especificação:** ainda não existe.

### carousel-builder
- **Camada:** workflow
- **Objetivo:** montar um carrossel de imagens (múltiplos slides) prontos para publicação.
- **Depende de:** `company-knowledge`, `branded-image-generator`.
- **Status:** planejada
- **Versão:** —
- **Manifesto:** ainda não existe.
- **Especificação:** ainda não existe.

### landing-page-generator
- **Camada:** workflow
- **Objetivo:** gerar uma landing page completa (copy + imagens) alinhada à marca da empresa.
- **Depende de:** `company-knowledge`, `branded-image-generator`, e uma futura Capability de negócio de copywriting.
- **Status:** planejada
- **Versão:** —
- **Manifesto:** ainda não existe.
- **Especificação:** ainda não existe.

## Quando este registro ficar grande demais

Se este arquivo passar de ~300 linhas (o limiar que o próprio `skill-creator`
usa para referências longas), divida por camada em vez de por ordem
alfabética: `capability-registry-conhecimento.md`,
`capability-registry-capacidades.md`, `capability-registry-negocio.md`,
`capability-registry-workflow.md`. O `ARQUITETURA.md` continua apontando
para este arquivo (ou, nesse ponto, para um pequeno índice que lista os
quatro arquivos divididos).
