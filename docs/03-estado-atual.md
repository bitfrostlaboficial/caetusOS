# 03 — Estado atual: o que existe, o que é parcial, o que falta

Data: 05/10/2026. Convenção: ✅ verificado em execução · 🔎 visto no código · ⚠️ parcial · ❌ quebrado/ausente.

## 1. Resultado dos testes que rodei

Ambiente: Postgres 16 local, Python 3.12, **sem chaves de IA** (provedores em modo *stub*), sem Docker.

| Teste | Resultado |
|-------|-----------|
| `alembic upgrade head` (3 migrações) em banco vazio | ✅ ok |
| API sobe (`uvicorn app.main:app`), `GET /saude` | ✅ ok |
| `POST /auth/registrar` (cria empresa + projeto raiz + usuário + tokens) | ✅ ok (inclusive para a 2ª e 3ª empresas) |
| `POST /auth/login` com o usuário recém-criado | ❌ **500** `InvalidRequestError` |
| `GET /empresas/me` com o token do registro | ✅ ok |
| `PUT/GET /identidade` | ✅ ok |
| `POST /memoria` | ✅ ok |
| `POST /conhecimento` (upload `.md`) | ✅ ok |
| `POST /assets` | ✅ ok |
| `POST /comandos/executar` → `conteudo.criar_post` (com stubs) | ✅ 200, retorna conteúdo genérico + placeholder, arquivos salvos |
| `GET /historico` (empresa que executou) | execução gravada ✅ (a de outra empresa vem vazia ✅) |
| Isolamento: empresa B lê `GET /infraestrutura/ia/executions` | ❌ **vê as execuções de IA da empresa A** |
| Empresa B altera `POST /infraestrutura/ia/modo` | ❌ **permitido** (altera o roteador de todos) |
| Executar sem o campo obrigatório `tema` | ❌ **500** `TypeError ... got multiple values for argument 'tipo'` (esperado: 422) |
| Executar `alvo` inexistente | ❌ **500** (mesmo `TypeError`; esperado: 404) |
| Execução com falha aparece no histórico? | ❌ não |
| Arquivos do post gerado no storage | ⚠️ gravados em `conhecimento/marketing/posts/...` **sem prefixo da empresa** |
| Frontend: `npm ci`, `tsc --noEmit`, `vite build` | ✅ ok |
| Frontend: `eslint` | ❌ 158 problemas (ver doc 2 §3.5) |
| Testes automatizados | ❌ **não existem** |

Não exercitado: refresh de token, health-check real, benchmark, provedores reais (Gemini/Groq/...), geração real de imagem, publicação no Instagram, Docker/Fly, frontend em navegador.

## 2. Matriz do Sprint 0 (plano v6.1, §11) × realidade

| # | Entrega planejada | Estado | Comentário |
|---|-------------------|--------|-----------|
| 1 | FastAPI + Docker Compose + Postgres | ✅/🔎 | API+Postgres ✅; Compose não testado |
| 2 | Alembic (tabelas do §10) | ✅ | + 2 migrações extras de IA |
| 3 | Auth própria (argon2id + JWT + refresh + `tenant_guard`) | ⚠️ | registro ✅; **login ❌**; refresh não testado; `tenant_guard` nunca usado |
| 4 | `StorageBackend` + Filesystem | ✅ | S3/MinIO/Supabase são esqueletos (`NotImplementedError`) |
| 5 | `ContextBuilder` com 5 fontes | ✅ | assets entram só como metadados; conhecimento é concatenado/truncado (sem RAG) |
| 6 | Roteador "mapa fixo" + Gemini/Groq | ✅ ➕ | **muito além do plano** (catálogo, pesos, fallback, 5 provedores) |
| 7 | `Executor` + `ExecutorSkill` + `NoOpPublisher` | ⚠️ | caminho feliz ✅; **caminho de erro ❌** (BUG-02) |
| 8 | `EmpresaServico.criar_empresa` + projeto raiz (mesma tx) | ✅ | |
| 9 | Habilidade `conteudo/criar_post` com prompt versionado | ✅ | evoluiu para pipeline texto+imagem+persistência+publicação |
| 10 | `templates/README.md` | ✅ | |
| 11 | Frontend: Login, Empresa, **Identidade**, Conhecimento, **Memória**, **Assets**, Criar Post, Resultado, Histórico | ⚠️ | **faltam Identidade, Memória e Assets** (a API existe; não há tela nem método no cliente). Sobram telas fora do plano (Command Center, Missões, Infra IA) |

**Leitura honesta:** o Sprint 0 está ~80% feito no backend e ~60% no frontend, mas o que foi construído **depois** (Fases de IA, Command Center) consumiu o esforço
que deveria ter fechado o básico (identidade/memória na UI, login, testes).

## 3. Inventário de capacidades

### 3.1 O que funciona hoje (✅)
- Criar empresa + usuário (registro), projeto raiz automático.
- CRUD de identidade (API), memória (API), conhecimento (API + UI), upload de assets (API).
- Executar a habilidade **criar post** de ponta a ponta no backend, com **Relatório de Execução** (eventos) e métricas.
- Roteamento de IA por missão com fallback; telemetria por chamada; versionamento de prompt registrado em cada execução.
- UI: login/registro, Command Center, catálogo de missões, tela de Criar Post com resultado, conhecimento, histórico, painéis de infraestrutura de IA.

### 3.2 O que é parcial (⚠️)
- **Funcionários Digitais:** só rótulo/mock no frontend. Não há entidade, configuração, nem execução "como funcionário".
- **Missões:** 10 no catálogo, **1 funcional** (`criar-post`). As missões do roteador (`gerar_banner`, `ocr_documento`, `transcrever_audio`, `embeddings_busca`) **não têm habilidade**.
- **Publicação no Instagram:** código existe (Graph API), mas exige `INSTAGRAM_ACCESS_TOKEN`/`INSTAGRAM_ACCOUNT_ID` **globais** (uma conta para toda a plataforma) e **URL pública** da imagem (a imagem vem do provedor de IA ou fica em disco local sem rota pública). Não testado.
- **Base de conhecimento:** só `.md`; `versao` fica sempre 1 (reupload cria outro documento, não nova versão); sem busca/RAG; leitura completa do storage a cada execução; truncagem fixa (5 docs × 800 caracteres no prompt).
- **Identidade:** logo/manual guardam um caminho, mas **não há endpoint para enviá-los** nem uso do logo na geração de imagem.
- **Multi-projeto:** modelo suporta; UI e regras ignoram (só projeto raiz).
- **Health/Infra IA:** funciona como painel, porém **sem controle de acesso** (ver doc 4) e job diário sujeito ao `auto_stop` do Fly.
- **Eventos:** `NoOpPublisher` — ninguém consome.

### 3.3 O que não existe (❌) — para ser SaaS
| Área | Falta |
|------|-------|
| Contas | papéis (owner/admin/membro), convite de usuários, reset de senha, verificação de e-mail, SSO, 2FA |
| Comercial | planos, cobrança (Stripe/Pix/etc.), **cotas e limites de uso por empresa**, medição de custo por empresa, trial |
| IA | **chaves por empresa (BYOK)**, orçamento/limite por empresa, escolha de provedor pela empresa, avaliação de qualidade de saída |
| Automação | **agendamento** de execuções/posts, **fluxos** (encadear habilidades), webhooks, fila/worker em background, aprovação humana antes de publicar |
| Integrações | Instagram por empresa (OAuth), LinkedIn, Facebook, WhatsApp, Google Meu Negócio, e-mail, marketplaces |
| Conteúdo | galeria de resultados (posts gerados não viram `assets`/registros navegáveis), edição de foto, vídeo, planilhas, documentos |
| Arquivos | endpoint de download/preview de assets e resultados; storage S3/R2 com URL pública/assinada |
| Qualidade | **testes**, CI, lint limpo, tipagem estática do backend, monitoramento/alertas, backups, política de retenção/LGPD |
| Docs de produto | onboarding guiado, templates por nicho, documentação do usuário |

## 4. Divergências entre documentação existente e realidade

| Documento diz | Realidade |
|---------------|-----------|
| README: frontend "TanStack Start", rotas em `src/routes/` | SPA Vite + React Router; `src/routes/` não existe |
| README: "Modelo de Dados (8 tabelas)" e lista 9 | Há 8–9 de negócio + tabelas de IA (health, histórico, `ia_execucoes`, eventos) |
| README/plan: roteador "mapa fixo" | Roteador por catálogo/pesos/perfis/fallback |
| README: fluxo do MVP inclui Identidade, Memória, Assets na UI | Sem UI para esses três |
| README: variável `VITE_API_URL` | O código lê `VITE_API_BASE_URL` (`src/lib/api.ts`) |
| `.env.example`: `HF_MODEL`, `OPENROUTER_MODEL` ... | OK, mas faltam as variáveis do Instagram (`INSTAGRAM_*`) e `IA_*` de health/prompt |
| plan §1: "Executor conhece só Comando/Resultado" e "nenhuma habilidade lê banco/storage" | A habilidade `criar_post` **grava no storage diretamente** (`PersistenciaPostConhecimento` usa `obter_storage()`), contrariando o princípio 4 |
