# 02 — Arquitetura atual (como o sistema é construído hoje)

> Descreve o **código como está** (05/10/2026), não o plano. Onde o plano v6.1 diverge, está indicado.
> Legenda: ✅ verificado em execução · 🔎 visto no código.

## 1. Visão de alto nível

```text
┌──────────────────────────┐        HTTPS/JSON         ┌──────────────────────────────────────────┐
│ Frontend (SPA)           │  ───────────────────────► │ Backend FastAPI  (backend/app)           │
│ React 19 + Vite 8        │  Bearer JWT (localStorage)│                                          │
│ React Router 7           │                           │  api/v1  →  servicos  →  dominio (SQLA)  │
│ Tailwind 4 + shadcn/ui   │                           │      │                                   │
└──────────────────────────┘                           │      ▼                                   │
                                                       │  executor ─► ContextBuilder ─► habilidade│
                                                       │                    │               │     │
                                                       │                    ▼               ▼     │
                                                       │            (banco, storage)   ia/roteador│
                                                       └───────┬───────────┬───────────────┬──────┘
                                                               │           │               │
                                                      PostgreSQL 16   StorageBackend    Provedores de IA
                                                       (Alembic)      (Filesystem)   Gemini·Groq·OpenRouter
                                                                                      HuggingFace·Fal
```

- **Monorepo simples**: `backend/` (Python) + raiz/`src/` (frontend).
- **Frontend não é TanStack Start**, apesar do README/`package.json`/`.lovable/project.json` dizerem isso: é uma **SPA Vite + React Router** (`src/App.tsx`, `src/main.tsx`). Não existe `src/routes/` (o README aponta para `src/routes/README.md`, que não existe).

## 2. Backend

### 2.1 Stack e dependências 🔎
Python ≥3.12, FastAPI, SQLAlchemy 2, Alembic, psycopg 3, Pydantic v2 + pydantic-settings, argon2-cffi, PyJWT, Jinja2, httpx,
`google-genai`, `groq`, APScheduler, PyYAML, python-slugify. **Sem** pytest/ruff nas dependências (há só `[tool.ruff]` no `pyproject.toml`).

### 2.2 Camadas (`backend/app`)

| Pasta | Papel | Observação |
|-------|-------|-----------|
| `main.py` | Cria o app, CORS, middlewares (`RequestID`, `LoggingHTTP`), registra routers em `/v1`, `GET /saude`, inicia o scheduler de health | ✅ sobe |
| `configuracao/` | `Configuracao` (pydantic-settings, `.env`) + `validar_para_api()` (exige `JWT_SECRET` ≥32 bytes fora de `DEBUG`) | ✅ |
| `api/deps.py` | `obter_db` (commit no sucesso/rollback na exceção), `usuario_atual` (valida JWT) | ✅ |
| `api/v1/*` | Routers HTTP (ver §2.6) | |
| `servicos/` | Orquestração de domínio (auth, empresa, identidade, conhecimento, memória, asset, projeto) | ✅ exceto login (ver doc 4) |
| `dominio/modelos` + `erros.py` | Entidades SQLAlchemy + exceções de domínio | |
| `executor/` | **Núcleo**: `Comando`, `ResultadoExecucao`, `Executor`, `ExecutorSkill` | ✅ caminho feliz |
| `habilidades/` | `Habilidade` (ABC), registro **explícito** (sem autodiscovery), `conteudo/criar_post.py` + `pipeline_post.py` | ✅ |
| `ia/` | Roteador, catálogo, categorias, missões, perfis, provedores, prompts Jinja2, ContextBuilder, health, telemetria, métricas | ✅ parcial |
| `infraestrutura/` | Banco/Alembic, armazenamento, segurança, observabilidade (logs estruturados) | |
| `eventos/` | `Publisher` + `NoOpPublisher` (nenhum consumidor) | reserva |
| `templates/` | Só um README (reserva de domínio) | reserva |

### 2.3 Fluxo de execução de um comando ✅ (caminho feliz) / ❌ (caminho de erro)

`POST /v1/comandos/executar` → `Comando` → `Executor.executar`:

1. valida `schema_version == 1` (senão 400);
2. resolve `ExecutorEspecifico` por `tipo` (hoje só `SKILL`);
3. se não vier `projeto_id`, usa o **projeto raiz** da empresa;
4. **`ContextBuilder.montar`** carrega: identidade, conhecimento (`.md` completos lidos do storage), memória (top 100 por peso), assets (metadados), histórico (≤5 execuções, ≤10k tokens estimados);
5. **`ExecutorSkill`** resolve a habilidade pelo `alvo` e chama `habilidade.executar(entrada, contexto)`;
6. grava a linha em `execucoes` (com `prompt_template`/`prompt_version`) e publica `execucao.concluida` (NoOp);
7. a rota serializa o resultado; **falha de negócio → HTTP 422**, exceção → 500 (nunca 200 com erro).

**Pipeline da habilidade `conteudo.criar_post`** (`habilidades/conteudo/pipeline_post.py`):

```text
EntradaPost(tema, rede, objetivo, descricao_imagem, publicar_automaticamente)
  1. Texto   : render de ia/prompts/criar_post.v1.jinja2 → executar_missao("criar_post")   → JSON {titulo, legenda, hashtags, cta, prompt_visual}
  2. Imagem  : executar_missao("conteudo_imagem_post", prompt_visual)                       → URL da imagem → download (ou PNG 1×1 placeholder)
  3. Ajuste  : (opcional) reescreve a legenda para casar com a imagem
  4. Publicar: se solicitado e rede == instagram → Graph API (precisa URL pública da imagem)
  5. Persistir em storage: conhecimento/marketing/posts/AAAA/MM/post_NNN/{imagem.*, legenda.md, prompt_imagem.md, metadata.json}
  → dict de saída (+ eventos do Relatório de Execução)
```

### 2.4 Roteador de IA (`ia/roteador.py`) 🔎 + ✅ (modo stub)

Evoluiu muito além do plano ("mapa fixo tipo → provedor"):

- **Catálogo** (`catalogo.py`): lista de `EntradaCatalogo(provedor, categoria, especialização, modelo_factory, peso_default, custo, capabilities)`. O **modelo vem do `.env`** (ex.: `GROQ_MODEL`).
- **Categorias** (chat, text, vision, ocr, image, video, audio, embeddings) × **especializações** (chat_fast, image_generation, background_removal, transcription ...).
- **Missões do roteador** (`ia/missoes.py`): `criar_post`, `gerar_banner`, `conteudo_imagem_post`, `ocr_documento`, `transcrever_audio`, `embeddings_busca` — cada uma com preferência (`velocidade|qualidade|custo|precisao`) e `max_tokens`. **Só duas são usadas por uma habilidade hoje.**
- **Seleção**: filtra candidatos do catálogo, soma ajustes por preferência (latência média observada, custo), ordena por peso e **tenta em cascata** (fallback), pulando provedores marcados como indisponíveis no health.
- **Perfis** (`perfis/production.yaml`, `development.yaml`): pesos por `provedor.categoria.especialização`; modo `automatico|manual` com overrides por missão.
- **Telemetria** (`ia/telemetria`): toda chamada grava `ia_execucoes` + `ia_execucao_eventos` em **thread separada**, tolerante a falha; prompt só como SHA-256 (a menos que `IA_STORE_PROMPTS=true`). Custo estimado por tabela interna de preços.
- **Health** (`ia/health`): job diário (APScheduler, 08:00 America/Sao_Paulo) verifica cada provedor, classifica o estado (chave inválida, billing, modelo removido...) e persiste estado + histórico de mudanças.
- **Estado em memória** (perdido a cada restart / não compartilhado entre processos): métricas de latência (`ia/metricas.py`), log de fallbacks (`ia/fallback_log.py`), **modo/overrides alterados pela API** (`ia/perfis`).
- **Sem chave configurada, o provedor devolve um "stub"** (`"[stub gemini sem GEMINI_API_KEY]..."`) **em vez de falhar** — e o pipeline de post trata stub como sucesso, com texto genérico e imagem placeholder (ver doc 4, BUG-05).

Provedores (`ia/provedores/`): `gemini` (google-genai), `groq` (SDK), `openrouter`, `huggingface` (Inference API), `fal` (REST). Replicate só tem variáveis de ambiente (sem adapter).

### 2.5 Modelo de dados

Tabelas de negócio (migração `0001_inicial`, ✅ aplica limpa):

```text
empresas ──< projetos (1 raiz por empresa, criado na mesma transação em EmpresaServico)
   │
   ├──< usuarios ──< refresh_tokens        (UNIQUE empresa_id+email)
   ├──1 identidade_empresa                 (cores_jsonb, fontes_jsonb, tom_de_voz, logo_caminho, manual_caminho)
   ├──< documentos_conhecimento            (tipo, caminho_storage, hash, versao, data_upload)
   ├──< memoria_itens                      (tipo, conteudo, peso, projeto_id opcional)
   ├──< assets                             (categoria, origem, escopo, caminho_storage, mime, tamanho)
   └──< execucoes                          (tipo_comando, alvo, entrada/saida jsonb, provedor, tokens, custo,
                                            latencia, prompt_template, prompt_version, schema_version, status, erro)
```

Tabelas de infraestrutura de IA (migrações `0002_ia_health`, `0003_ia_execucoes`): estado e histórico de health por provedor/modelo; `ia_execucoes` + `ia_execucao_eventos`.
⚠️ `ia_execucoes.empresa_id` **não tem FK** e é anulável (permite telemetria sem tenant).

### 2.6 Endpoints (`/v1`)

| Grupo | Rotas | Escopo por empresa? |
|-------|-------|--------------------|
| auth | `POST /auth/registrar`, `/auth/login` ❌(500), `/auth/refresh` | — |
| empresas/projetos | `GET /empresas/me`, `GET /projetos` | ✅ |
| identidade | `GET/PUT /identidade` | ✅ |
| conhecimento | `GET/POST /conhecimento`, `GET /conhecimento/{id}/conteudo`, `DELETE` | ✅ |
| memória | `GET/POST /memoria`, `DELETE /memoria/{id}` | ✅ |
| assets | `GET/POST /assets` (**sem download/remoção por HTTP**) | ✅ |
| comandos | `POST /comandos/executar` | ✅ (mas `projeto_id` do cliente não é validado) |
| histórico | `GET /historico?limite=` (da empresa) | ✅ |
| ia/providers | `GET /ia/providers`, `/health`, `POST /health/check`, `GET /{nome}` | ❌ global (qualquer usuário) |
| infraestrutura/ia | overview, history, check, **executions**, executions/{id}, metrics, ranking, models, **benchmark**, pricing, catalogo, missoes, metricas, fallbacks, perfis, **modo**, categorias | ❌ **global, sem papel de admin** |

### 2.7 Segurança e autenticação 🔎/✅

- Senhas com **argon2id** ✅; JWT **HS256** (30 min) com `sub` e `empresa_id`; refresh token **opaco**, guardado como SHA-256, **rotativo** (rotaciona a cada uso) 🔎.
- `empresa_id` é lido do usuário no banco a cada request (`usuario_atual`), não do corpo — bom. `tenant_guard.garantir_mesma_empresa` **existe mas nunca é chamado**.
- Não há: papéis (owner/admin/membro), convite de usuários, verificação de e-mail, reset de senha, *rate limiting*, política de senha, 2FA.

### 2.8 Observabilidade 🔎/✅
Logs estruturados com categorias (`[SKILL]`, `[IA]`, `[IA FALLBACK]`, `[COMANDO]`...), `X-Request-ID` em toda resposta (devolvido nos erros), modo JSON para produção, mascaramento de segredos (`seguranca/mascarar.py`).

### 2.9 Infra e deploy 🔎 (Docker não testável no ambiente do levantamento)
- `Dockerfile` (python:3.12-slim; `CMD`: `alembic upgrade head && uvicorn`), `docker-compose.yml` (Postgres 16 + API; **monta `./:/app`** — modo dev, não prod; CORS com IP privado fixo).
- `fly.toml`: app `empresa-ia`, região `gru`, 1 VM shared 512 MB, **`auto_stop_machines = true`, `min_machines_running = 0`**, volume único para storage. Consequências: máquina dorme (o job diário de health e qualquer agendamento futuro **não rodam**); storage em volume = **uma única máquina**.
- **Sem CI/CD** (não há `.github/`), sem testes, sem backup.

## 3. Frontend

### 3.1 Stack 🔎✅
React 19, Vite 8, React Router 7, Tailwind 4, shadcn/ui (46 componentes em `components/ui`), react-hook-form + zod, recharts, sonner, react-markdown. Tema escuro, fontes Sora/Inter/JetBrains Mono. `tsc --noEmit` ✅ passa; `vite build` ✅ passa (um único chunk de ~680 kB / 205 kB gzip).

### 3.2 Rotas (`src/App.tsx`)

| Rota | Tela | Estado |
|------|------|--------|
| `/` | Landing | 🔎 |
| `/login` | Login + criar empresa (abas) | ⚠️ bug de hooks (doc 4, BUG-04) |
| `/app` | **Command Center** (painel: busca/atalhos de missões, métricas de IA, histórico, datas comemorativas BR) | 🔎 |
| `/app/missoes` | Catálogo de missões (10 + "nova") | 🔎 só `criar-post` é real |
| `/app/missoes/criar-post` | **Criar Post** + `ResultadoMissao` / `RelatorioExecucao` / `TimelineExecucao` | 🔎 única missão funcional |
| `/app/missoes/:slug` | Placeholder "em construção" | 🔎 |
| `/app/conhecimento` | Upload/lista/leitura de `.md` | 🔎 |
| `/app/historico` | Últimas execuções | 🔎 |
| `/app/infraestrutura/{ia, ia/historico, execucoes, benchmark, missoes}` | Painéis de saúde dos provedores, execuções de IA, benchmark, missões/roteamento | 🔎 |

### 3.3 Cliente HTTP (`src/lib/api.ts`)
Único ponto que conhece a API. Tokens em `localStorage` (`empresaia.*`), *refresh* automático em 401. **Não existem métodos de cliente para identidade nem memória** (só `listarAssets`/upload de asset, que nenhuma tela usa).

### 3.4 Código morto / mock
- `src/pages/Dashboard.tsx` **não está roteado** (resto de uma versão anterior da home).
- `FUNCIONARIOS_DIGITAIS` em `src/lib/missoes.ts` é **mock visual** (status "online" e modelos fixos, ex.: `gemini-2.0-flash`, que nem é o do `.env`).
- `lib/datas-brasileiras.ts`: calendário de datas comemorativas para sugerir campanhas — **diferencial para marketing BR**.

### 3.5 Qualidade
`eslint`: **158 problemas** (152 erros, 6 warnings); 141 são de formatação (`prettier`, corrigíveis com `--fix`). Os reais: hooks chamados condicionalmente em `Login.tsx`; 3× `any`; 1× escape inútil em regex. Sem testes.
