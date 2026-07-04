# capabilities/

Especificações de Capabilities de **camada 2 (capacidade genérica)** e
**camada 3 (negócio)** — ambas ficam aqui porque, do ponto de vista de
quem orquestra (um workflow), são igualmente "uma Capability que devolve
um artefato"; a diferença entre as duas é o campo `camada` do frontmatter
de cada `CAPABILITY.md` (ver `ai/contracts/capability-format.md`), não a
localização no disco.

Implementadas hoje: `image-generator/`. As demais listadas em
`ai/architecture/capability-registry.md` ainda são só planejamento.

Regra que vale para toda Capability genérica aqui dentro: nunca lê
`empresas/**`, nunca conhece marca — ver `ai/architecture/ARQUITETURA.md`.
