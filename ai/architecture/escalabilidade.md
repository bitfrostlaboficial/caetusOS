# Escalabilidade

Como a arquitetura deve se comportar quando o Caetus OS crescer para além
do cenário de hoje (uma empresa, um agente de IA, um punhado de
Capabilities). Nenhum destes cenários exige mudar as quatro camadas, a
regra de dependência unidirecional, ou a separação entre Capability e
Adapter — a arquitetura foi desenhada para absorver esse crescimento sem
reescrever nada que já funciona.

Nota de terminologia, importante para não confundir duas coisas com nome
parecido: **"agente de IA"** aqui significa o software que executa
Capabilities (Claude Code, Codex, Gemini, Llama, Mistral, Qwen...) — é o
assunto de `ai/adapters/`. **"Funcionário Digital"** é outra coisa: uma
persona/papel de negócio dentro de uma empresa (documentada em
`empresas/<slug>/agentes/`), que decide *quando* e *por quê* uma
Capability é chamada. Um Funcionário Digital pode ser operado por
qualquer agente de IA que tenha os adapters necessários — as duas escalas
são independentes.

## Múltiplos agentes de IA (adapters)

Este é o eixo que motivou o desacoplamento de `.claude/skills` (ver
`ai/architecture/ARQUITETURA.md`). Regras para quando um segundo, terceiro,
quarto agente de IA passar a operar o Caetus OS:

- Toda Capability nova é especificada **uma vez**, em `ai/`, sem mencionar
  nenhum agente. Um agente novo ganha suporte escrevendo só o Adapter dele
  (ver `ai/adapters/README.md`) — nunca duplicando o `CAPABILITY.md`.
- Nem toda Capability precisa ter adapter para todo agente ao mesmo tempo
  — é normal e esperado que `image-generator` tenha adapter Claude Code
  hoje e nenhum outro, por exemplo. O Capability Registry
  (`ai/architecture/capability-registry.md`) rastreia isso por Capability.
- Agentes com mecanismos de invocação muito diferentes (ex. um agente que
  só aceita function calling estruturado, sem shell) ainda conseguem
  consumir Capabilities cujo "Como executar" é um script de linha de
  comando — o adapter desse agente só precisa embrulhar a chamada do
  script numa function/tool. É por isso que "Como executar" no
  `CAPABILITY.md` deve preferir um mecanismo tão universal quanto possível
  (linha de comando), deixando a tradução para formato nativo de cada
  agente inteiramente dentro do adapter dele.

## Múltiplas empresas

Hoje existe `empresas/caetus_systems/` e uma pasta de exemplo. A
arquitetura já assume, desde o Context Contract, que "empresa ativa" é um
dado explícito (`empresa.slug`), não uma suposição. Regras para quando
houver mais empresas reais:

- Nenhuma Capability (de nenhuma camada) hardcoda `caetus_systems` em
  lugar nenhum — nem `company-knowledge`, quando existir. O slug da
  empresa é sempre um parâmetro de entrada.
- Se fizer sentido ter uma "empresa padrão" para poupar digitação em uso
  interativo (só existe uma empresa real hoje), essa resolução de padrão
  vive na camada de orquestração/agente que chama a Capability, nunca
  dentro da Capability em si.
- `company-knowledge` é a única Capability que precisa saber como
  enumerar/validar quais slugs de empresa existem (ex. listar subpastas de
  `empresas/`). Isso é detalhe de implementação dela, não da arquitetura.

## Múltiplos Funcionários Digitais

`empresas/<slug>/agentes/` já existe como pasta reservada para documentar
cada Funcionário Digital (quem é, função, permissões). A relação entre
Funcionários Digitais e Capabilities:

- **Capabilities continuam agnósticas a qual Funcionário Digital as está
  chamando.** Um Funcionário Digital é quem decide *quando* e *por quê*
  uma Capability é chamada — a Capability em si não muda de comportamento
  dependendo de quem a invocou.
- Pense num Funcionário Digital como uma camada **acima** de Workflow, não
  como uma quinta camada de Capability: ele escolhe e sequencia workflows
  (e eventualmente Capabilities de negócio direto), da mesma forma que um
  workflow hoje sequencia Capabilities de negócio.
- Quando `empresas/<slug>/agentes/` for estruturado, o campo natural para
  controlar isso é uma lista de permissões por Funcionário Digital (quais
  Capabilities/camadas cada um pode invocar) — isso é um mecanismo de
  autorização em cima da arquitetura de Capabilities, não uma mudança
  nela.

## Múltiplas bases de conhecimento

Cada empresa já tem sua própria árvore `conhecimento/` isolada. Conforme o
número de empresas cresce:

- O mapa de pastas dentro de `conhecimento/` (institucional, produto,
  comercial...) é compartilhado entre empresas — é a mesma estrutura,
  populada com conteúdo diferente por slug. Isso é o que permite
  `company-knowledge` funcionar igual para qualquer empresa nova, sem
  código novo.
- Se uma empresa específica precisar de uma pasta de conhecimento que as
  outras não têm (um domínio muito particular), ela entra dentro da árvore
  daquela empresa (`empresas/<slug>/conhecimento/<pasta-nova>/`) — não é
  necessário que todas as empresas tenham a mesma estrutura exata, só que
  `company-knowledge` saiba lidar com pastas ausentes sem quebrar.
- Se o conhecimento de uma única empresa ficar grande demais para uma
  Capability só, a divisão continua sendo por **domínio dentro da camada
  de conhecimento** (`company-knowledge-marketing`,
  `company-knowledge-juridico`...), nunca virando Capabilities de negócio
  lendo `empresas/` direto.

## Múltiplos workflows executando simultaneamente

Quando mais de um workflow puder rodar ao mesmo tempo para a mesma empresa
(duas campanhas em paralelo, por exemplo):

- Toda escrita em `empresas/<slug>/memoria/` deve usar um identificador
  único de execução no nome do arquivo/pasta (timestamp + sufixo curto),
  nunca um nome fixo — evita que duas execuções concorrentes pisem uma na
  saída da outra. Isso já é a convenção adotada em
  `ai/capabilities/image-generator/references/output-contract.md` para
  nomes de arquivo; vale para qualquer Capability que escreve em
  `memoria/`.
- O Context Contract de cada execução é salvo junto com o artefato gerado
  (ver `ai/contracts/context-contract.md#persistência-auditoria`) — com
  execuções concorrentes, isso é o que permite reconstruir qual execução
  gerou qual resultado.
- Nenhuma Capability deve depender de estado global em memória
  compartilhado entre chamadas (ex. "a última empresa consultada") — cada
  chamada carrega tudo que precisa (empresa, contexto) explicitamente,
  exatamente pela mesma razão que capacidades genéricas não podem
  adivinhar dados de empresa: previsibilidade sob concorrência.

## Quando o próprio Capability Registry ficar grande

Ver a nota já deixada em
`ai/architecture/capability-registry.md#quando-este-registro-ficar-grande-demais`
— dividir por camada, não por ordem alfabética, quando passar de ~300
linhas.
