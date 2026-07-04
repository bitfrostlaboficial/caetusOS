# Formato do Manifesto (`manifest.yaml`)

Todo Capability do Caetus OS — de qualquer camada — tem, na raiz da sua
pasta (`ai/<capabilities|workflows|knowledge>/<slug>/manifest.yaml`), um
manifesto **obrigatório**. Ele é a fonte oficial de metadados,
**pensada para ser lida por máquinas** (o Registry, ver `ai/registry/`, e
futuramente qualquer outra ferramenta) — não pelo texto corrido do
`CAPABILITY.md`.

## Por que um arquivo separado, e não a frontmatter do `CAPABILITY.md`

Versões anteriores desta arquitetura guardavam camada/versão/status/
dependências na frontmatter YAML do `CAPABILITY.md`. Essa evolução move
essa informação para um arquivo próprio pelos seguintes motivos:

1. **Volume.** O conjunto completo de campos abaixo (entradas, saídas,
   permissões, adapters...) é grande demais para caber numa frontmatter
   sem o `CAPABILITY.md` virar, na prática, "metadados com um pouco de
   prosa embaixo" em vez de documentação legível.
2. **Parsing.** Um `manifest.yaml` isolado é um documento YAML válido por
   si só — qualquer linguagem, em qualquer agente, lê com uma biblioteca
   YAML padrão, sem precisar entender a sintaxe de frontmatter de
   Markdown (delimitadores `---`, onde termina o front matter, etc.).
3. **Separação de responsabilidade.** `manifest.yaml` responde "o quê"
   (estruturado, machine-readable); `CAPABILITY.md` responde "por quê" e
   "como" (prosa, exemplos, contexto). Nenhum dos dois repete o conteúdo
   do outro — ver a régua em `ai/contracts/capability-format.md`.

Isso segue o mesmo princípio já usado em praticamente todo ecossistema de
pacotes/infra (um `package.json`, um `pyproject.toml`, um `Chart.yaml`
separado do README) — metadado de máquina e documentação para humano são
coisas diferentes, cada uma no seu arquivo.

## Campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `manifesto_versao` | string | sim | Versão **deste formato de manifesto** (não da Capability). Hoje `"1.0"`. Existe para o Registry saber como interpretar manifests escritos por versões futuras/antigas do formato. |
| `id` | string | sim | Slug em inglês, `kebab-case`. Idêntico ao nome da pasta. |
| `nome` | string | sim | Nome de exibição, em português. |
| `versao` | string ou `null` | sim | Semver da Capability (`"1.0.0"`). `null` quando `status` é `planejada` e ainda não há implementação versionável. |
| `descricao` | string | sim | **Um resumo curto** (1-2 frases) do que a Capability faz — o suficiente para um catálogo listar centenas delas e alguém reconhecer qual é qual. Não é o lugar para a explicação completa: essa fica no "Objetivo"/"Quando usar" do `CAPABILITY.md`. |
| `camada` | enum | sim | `conhecimento` \| `capacidade-generica` \| `negocio` \| `workflow`. |
| `categoria` | string | sim | Domínio/assunto para descoberta (ex. `imagem`, `video`, `texto`, `conhecimento`, `publicacao`). Recomenda-se alinhar com `CategoriaIA` de `backend/app/ia/categorias.py` quando fizer sentido (`imagem` ~ `IMAGE`, `video` ~ `VIDEO`...) — não é obrigatório que sejam idênticas (são sistemas diferentes, ver `ai/README.md`), mas manter os nomes parecidos evita confusão desnecessária. |
| `entradas` | lista de objetos | sim (pode ser `[]`) | Cada item: `{nome, tipo, obrigatorio, padrao, descricao}`. É o contrato de entrada, estruturado — o `CAPABILITY.md` explica em prosa, este campo é a fonte exata. |
| `saidas` | lista de objetos | sim (pode ser `[]`) | Cada item: `{nome, tipo, descricao}`. Mesma lógica, para o contrato de saída. |
| `contratos` | lista de strings | sim (pode ser `[]`) | Quais contratos compartilhados de `ai/contracts/` esta Capability usa (ex. `context-contract`). Não confundir com `entradas`/`saidas` (o contrato *próprio* desta Capability) — isto é sobre contratos *comuns* que ela consome ou produz. |
| `dependencias` | lista de `id`s | sim (pode ser `[]`) | Outras Capabilities das quais esta depende. Deve respeitar `ai/architecture/dependencias-permitidas.md`. |
| `permissoes` | lista de strings | sim (pode ser `[]`) | Vocabulário recomendado: `rede_externa` (chama API externa), `disco_escrita` (grava arquivo), `disco_leitura` (lê arquivo fora da própria pasta), `execucao_processo` (roda subprocesso/shell), `leitura_conhecimento_empresa` (lê `empresas/**`). **Regra de validação:** `leitura_conhecimento_empresa` só pode aparecer em uma Capability de `camada: conhecimento` — é a aplicação computável da regra de isolamento da arquitetura. O Registry rejeita qualquer manifesto que viole isso. |
| `modelos_compativeis` | lista de strings | sim (pode ser `[]`) | Provedores/modelos de IA que a lógica **interna** da Capability sabe usar (ex. `openai`, `gemini`, `fal`). Vazio quando a Capability não depende de nenhum modelo específico (ex. lógica de leitura/interpretação). **Não confundir com `adapters_disponiveis`** — este campo é sobre modelos que a Capability chama por dentro; `adapters_disponiveis` é sobre quais agentes conseguem invocar a Capability por fora. |
| `adapters_disponiveis` | lista de objetos | sim (pode ser `[]`) | Cada item: `{agente, local, status}`. Espelha (e substitui, como fonte oficial) a antiga tabela "Adaptadores disponíveis" que ficava solta no `CAPABILITY.md`. |
| `custo_estimado` | enum | sim | `gratuito` \| `baixo` \| `medio` \| `alto` \| `variavel` (depende de escolha em tempo de execução, ex. provider) \| `desconhecido` \| `nao_aplicavel` (não chama nenhum provedor pago). |
| `timeout_segundos` | inteiro ou `null` | sim | Tempo máximo esperado antes de quem chamou considerar a operação travada. `null` quando não aplicável (ex. Capability sem chamada de rede). |
| `tags` | lista de strings | sim (pode ser `[]`) | Livre, para busca/descoberta. |
| `autor` | string | sim | Responsável pela Capability. |
| `data_criacao` | string (data ISO `AAAA-MM-DD`) | sim | |
| `status` | enum | sim | `planejada` \| `em-desenvolvimento` \| `implementada` \| `deprecada`. |
| `observacoes` | string ou `null` | não | Qualquer coisa relevante que não caiba nos campos acima (ex. uma limitação conhecida de um provedor). |

## Exemplo completo

Ver `ai/capabilities/image-generator/manifest.yaml` (Capability implementada)
e `ai/knowledge/company-knowledge/manifest.yaml` (Capability ainda só
especificada) como os dois exemplos de referência — um preenchido de
ponta a ponta, outro mostrando como fica um manifesto de algo que ainda
não tem lógica implementada.

## Quem lê este arquivo

- **O Registry** (`ai/registry/`) — escaneia todos os `manifest.yaml` do
  projeto, valida cada um contra este formato, e monta o catálogo. Nunca
  executa a Capability.
- **O Resolver** (`ai/orchestration/resolver/`) — consulta o catálogo do Registry
  (`descricao`, `categoria`, `tags`) para decidir qual Capability/Workflow
  atende a intenção de um usuário.
- **O Execution Planner** (`ai/orchestration/planner/`) — lê `dependencias`
  recursivamente para montar o Execution Plan, e `entradas`/`saidas` para
  decidir como conectar a saída de uma etapa à entrada de outra.
- **O Executor** (`ai/orchestration/executor/`) — antes de rodar uma etapa,
  confere `status` e `entradas` obrigatórias do manifesto correspondente.
- **Cada Adapter** — pode ler o manifesto para confirmar o contrato antes
  de traduzir a chamada para o mecanismo do agente que representa.
