# 09 — Branches, ecossistema de repositórios e a divisão "caetusClaude × caetusOS"

> Este documento foi acrescentado **depois** dos demais, ao descobrir que o trabalho mais recente **não está na `main`**.
> Tudo o que está nos docs 02–08 foi levantado sobre a **`main`** (commit `b569ec8`, 01/07/2026). Aqui estão as diferenças da branch mais nova e o contexto maior.

## 1. Branches do repositório `bitfrostlaboficial/caetusOS` (**público**)

| Branch | Último commit | Conteúdo |
|--------|---------------|----------|
| `main` | 01/07/2026 | Base usada nos docs 02–08. |
| **`no_lovable`** | **05/07/2026** (10 commits à frente da `main`) | **O trabalho mais recente.** Editor/explorador de Base de Conhecimento, templates de conhecimento por empresa, post salvo por tenant, "Criar Post" refinado — e, no meio do caminho, a criação (e depois a **remoção**) da pasta `ai/` (caetusClaude). Nome sugere desconexão do Lovable. |
| `flyio-new-files` | 28/06/2026 | 3 arquivos gerados por `fly launch` (`.dockerignore`, `Dockerfile`, `fly.toml`). Já incorporado na prática à `main`. |
| `claude/focused-hopper-kb9m2r` | — | Branch desta sessão (docs). |

⚠️ **Decisão necessária (D-11):** qual branch é a "verdade"? Recomendo **mergear `no_lovable` em `main`** (ou renomear) antes de qualquer trabalho novo — hoje quem clonar `main` pega uma versão 4 dias mais antiga e sem o editor de conhecimento. Este documento não fez esse merge.

## 2. O que a `no_lovable` muda (verificado rodando o backend dessa branch)

Executei a API da `no_lovable` com Postgres local (mesmo método do doc 3):

| Item | Resultado na `no_lovable` |
|------|---------------------------|
| Registro cria **32 documentos** de conhecimento (16 modelos "reais" + 16 `.exemplo`) | ✅ (novo: `ConhecimentoServico.inicializar_padrao`, `templates_conhecimento.py`, 682 linhas) |
| Post gerado é gravado em `empresas/{empresa_id}/conhecimento/...` e **registrado** como 4 documentos (`tipo="marketing"`: legenda, imagem, prompt, metadata) | ✅ — **corrige parcialmente SEC-05** (prefixo por empresa + registro no banco) |
| Novo endpoint `GET /conhecimento/{id}/raw` (stream binário com checagem de empresa) | 🔎 |
| Frontend: explorador de arquivos, editor de texto, visualizadores CSV/JSON/imagem, guia de pastas (`src/components/knowledge/*`, +~2.6k linhas) e `MissaoCriarPost` ampliada (Instagram, X, Threads...; passo-a-passo de publicação) | 🔎 (só leitura; não abri no navegador) |
| `POST /auth/login` | ❌ **continua 500** (BUG-01 não corrigido) |
| Falha de habilidade (ex.: sem `tema`) | ❌ **continua 500** com o mesmo `TypeError` (BUG-02) |
| Empresa B lê execuções de IA da empresa A em `/infraestrutura/ia/executions` | ❌ **continua** (SEC-02/03) |
| Edição de arquivo na UI | ⚠️ "editar" = **novo upload** (cria outro documento; o antigo permanece) — versionamento continua em aberto (T-106) |

### Novos problemas introduzidos/expostos pela `no_lovable`

| ID | Sev. | Problema | Evidência |
|----|------|----------|-----------|
| **BUG-09** | P1 | **Conteúdo binário e lixo entram no prompt:** os arquivos gerados (PNG, JSON, prompt) são registrados como conhecimento e o `ContextBuilder` lê **todos** os documentos "indexáveis" (só exclui `.exemplo`); decodifica o PNG como texto (`errors="replace"`) e o envia para a IA. | ✅ `carregar_conhecimento` retornou o PNG (`'�PNG\r\n...'`) no contexto |
| **BUG-10** | P1 | **Modelos placeholder tratados como conhecimento real:** os 16 arquivos "reais" criados no registro contêm texto-guia ("Use este espaço para descrever a sua empresa...") e entram no prompt como se fossem fatos da empresa — e, como o prompt usa só os 5 primeiros × 800 caracteres, **ocupam o lugar do conteúdo verdadeiro**. | ✅ conteúdo lido do contexto |
| **DEBT-13** | P2 | Registro (`/auth/registrar`) agora grava ~32 arquivos no storage dentro da requisição (e se o `begin()` do login for corrigido, atenção à transação); sem limpeza se falhar. Registro lento e com efeito colateral em disco. | 🔎 |
| **DEBT-14** | P2 | Posts gerados poluem a Base de Conhecimento (mesma tabela/pasta de documentos que o usuário escreve); falta separar **Conhecimento** (entrada) de **Resultados/Assets** (saída) — T-008/T-104. | 🔎 |
| **DEBT-15** | P3 | `pipeline_post.persistir` abre **outra sessão de banco** (`SessionLocal`) dentro da habilidade (viola o princípio "habilidade não toca no banco" e quebra a atomicidade com a `Execucao`); erros são só logados. | 🔎 |
| **DEBT-16** | P3 | README da `no_lovable` ainda descreve a pasta `ai/` que **já foi removida** da própria branch (commit `d2ed100`). | ✅ |

## 3. A divisão em dois projetos (commit `d2ed100`, 05/07/2026)

A mensagem do último commit resume a decisão do autor:

> *"separados projetos para evitar confusão, agora o projeto é dividido em 2 etapas: **caetusClaude** semi-automático, que servirá de base para o **caetusOS**, futuro sistema automatizado que criará funcionários digitais."*

Ou seja:

| Projeto | O que é | Onde está |
|---------|---------|-----------|
| **caetusClaude** | Versão **semi-automática**: um agente de IA (Claude Code, depois Codex/Gemini/etc.) opera a empresa usando **Capabilities** documentadas e scripts. Serve de **laboratório/base** para descobrir o que o caetusOS deve automatizar. | Foi construída em `ai/` + `.claude/skills/` nesta repo (28/06–05/07) e **removida** no último commit. Existe o repositório separado **`CaetusSystems/CaetusClaude`** (privado; último push 17/07/2026) — **não está no escopo desta sessão, não foi lido**. |
| **caetusOS** | O **SaaS/sistema automatizado** (este repositório): backend FastAPI + frontend + roteador de IA, que no futuro **cria Funcionários Digitais**. | Este repositório. |

### O que foi construído em `ai/` antes de ser separado (visível só pelo histórico: ex. `git show c7e4d4c:ai/README.md`)
- **"Architecture Freeze v1.0"** (`ai/architecture/ARQUITETURA.md`, 04/07/2026): arquitetura em **4 camadas** — (1) **Conhecimento** (`company-knowledge`, única porta de entrada para `empresas/`), (2) **Capacidades genéricas** (image-generator, video-generator, web-search...), (3) **Negócio** (aplica a marca sobre a capacidade: `branded-image-generator`), (4) **Workflows** (orquestram: `instagram-post`, `landing-page-generator`...). Dependência só de cima para baixo.
- **Manifesto `manifest.yaml`** por Capability, **Registry** (descoberta automática; `discover.py` era a única parte com código real), e especificações (sem código) de **Resolver → Planner → Executor → Context Manager** com um **Execution Plan em DAG**.
- Capabilities com código: **`image-generator`** (com 1º provedor funcional — **Cloudflare Workers AI**, FLUX schnell; variáveis `CLOUDFLARE_*` e `IMAGE_PROVIDER_PRIORITY` já estão no `.env.example` da `no_lovable`) e **`layout-engine`** ("canva interno da IA": renderiza layouts a partir de componentes/templates, scripts Node).
- Perfis de permissão de agente ("Safe"/"Developer") e adaptadores por agente.
- Dados reais de empresa fora do Git (`empresas/<slug>/`).

### Relação com o backend do caetusOS (pontos de integração a decidir)
- O `ExecutorSkill` + `Habilidade` do backend **é o equivalente de produção** do "Executor + Capability" do caetusClaude; a camada 1 (`company-knowledge`) corresponde ao `ContextBuilder`; "Capacidades genéricas" correspondem aos **provedores/missões do roteador** (`ia/`).
- O `ai/README.md` já registrava a dúvida em aberto: *uma Capability poderia chamar a API do backend em vez de reimplementar provedores* — **não foi resolvida**.
- Oportunidades de reaproveitamento (a validar lendo o CaetusClaude): `layout-engine` como habilidade de imagem com marca (T-401/T-405); modelo de **manifesto** para declarar habilidades do backend de forma descobrível; **Workflows** ↔ Fluxos do roadmap (T-305).

## 4. Outros repositórios da conta (somente nomes, via listagem; **não lidos**)

`CaetusSystems/CaetusClaude`, `caetusStudio`, `caetusVideo`, `caetusBlob`, `caetusBot-WPP`, `Cateus_sytems_Page` (público) e `Rick-Caetano/caetus-monitor` (último push hoje). Sugerem que o **ecossistema Caetus** é maior que este repositório. Para um plano coerente, convém mapear o papel de cada um (D-11) antes de priorizar o roadmap — por exemplo, `caetusBot-WPP` e `caetusVideo` podem já cobrir WhatsApp e vídeo (itens que o roadmap deste repo lista como futuros).

## 5. Impacto no roadmap

Novas tarefas (adicionadas ao doc 6): **T-015** (consolidar branches), **T-016** (separar Conhecimento × Resultados e filtrar o que entra no prompt — corrige BUG-09/10), **T-017** (mapear ecossistema e decidir fronteiras).
