# Empresa IA

> Plataforma de **Funcionários Digitais** baseados em IA para empresas.
> MVP focado em validar rapidamente o ciclo: **Login → Conhecimento → Executar habilidade → Resultado**.

Arquitetura oficial congelada em **v6.1** — referência completa em [`.lovable/plan.md`](./.lovable/plan.md).

---

## 📐 Visão Geral

**Empresa IA** é um sistema multi-tenant onde cada empresa cadastra sua identidade, base de conhecimento e memória, e então executa **Comandos** (ex.: "criar post para Instagram") através de um **Executor** central que orquestra IA, contexto e auditoria.

### Princípios invioláveis

1. **Executor** é o ÚNICO ponto de entrada para qualquer execução.
2. **Toda habilidade** recebe `Contexto` pronto — nunca lê banco/storage direto.
3. **Storage abstrato** via `StorageBackend` — sem `open()` direto.
4. **Auth 100% própria** no FastAPI (argon2id + JWT + refresh rotativo).
5. **Portabilidade total**: mesma imagem Docker em dev, Fly.io ou VPS.
6. **Sem recursos proprietários** de cloud — roda em qualquer Postgres.

---

## 🧱 Stack

| Camada    | Tecnologia                                            |
| --------- | ----------------------------------------------------- |
| Frontend  | React + TypeScript + TanStack Start (Lovable)         |
| Backend   | Python 3.12 + FastAPI                                 |
| Banco     | PostgreSQL 16                                         |
| Storage   | Filesystem (MVP) → S3/MinIO (futuro)                  |
| Auth      | argon2id + JWT + refresh tokens                       |
| IA        | Gemini + Groq (adapters intercambiáveis)              |
| Deploy    | Docker Compose (dev) → Fly.io ou VPS Linux            |

---

## 📁 Estrutura do Repositório

```text
.
├── backend/                  # API Python (FastAPI)
│   ├── app/
│   │   ├── main.py
│   │   ├── api/v1/           # Rotas HTTP
│   │   ├── dominio/          # Entidades de negócio (SQLAlchemy)
│   │   ├── servicos/         # Orquestração de domínio
│   │   ├── executor/         # NÚCLEO — Comando, ResultadoExecucao
│   │   ├── habilidades/      # Skills (ex.: conteudo/criar_post)
│   │   ├── ia/               # Provedores, ContextBuilder, prompts
│   │   ├── infraestrutura/   # Banco, storage, segurança
│   │   ├── eventos/          # NoOpPublisher (reserva)
│   │   └── templates/        # Reserva conceitual (sem código)
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── fly.toml
│   ├── alembic.ini
│   └── pyproject.toml
│
├── src/                      # Frontend (TanStack Start)
│   ├── routes/               # Rotas file-based
│   │   ├── __root.tsx
│   │   ├── index.tsx         # Landing
│   │   ├── login.tsx
│   │   ├── app.tsx           # Layout autenticado
│   │   ├── app.index.tsx     # Dashboard / Criar post
│   │   ├── app.conhecimento.tsx
│   │   └── app.historico.tsx
│   ├── lib/api.ts            # Cliente HTTP
│   └── styles.css
│
└── .lovable/plan.md          # Arquitetura oficial (v6.1)
```

---

## 🚀 Subir em Desenvolvimento

### Pré-requisitos
- Docker + Docker Compose
- Node 20+ / Bun (frontend)
- Chaves de API: [Gemini](https://aistudio.google.com/apikey) e/ou [Groq](https://console.groq.com/keys)

### 1. Backend

```bash
cd backend
cp .env.example .env
# edite .env e coloque GEMINI_API_KEY e/ou GROQ_API_KEY
docker compose up --build
```

- API: <http://localhost:8000>
- Docs OpenAPI: <http://localhost:8000/docs>
- Postgres: `localhost:5432` (user/pass: `empresa_ia`)

Aplicar migrações (primeira vez):

```bash
docker compose exec api alembic upgrade head
```

Criar nova migração após alterar modelos:

```bash
docker compose exec api alembic revision --autogenerate -m "descricao"
docker compose exec api alembic upgrade head
```

### 2. Frontend

```bash
bun install
bun run dev
```

- UI: <http://localhost:8080>
- O frontend já está configurado para apontar para `http://localhost:8000` (variável `VITE_API_URL`).

---

## 🔐 Variáveis de Ambiente

### Backend (`backend/.env`)

| Variável                | Descrição                                          | Default                          |
| ----------------------- | -------------------------------------------------- | -------------------------------- |
| `DATABASE_URL`          | Postgres URL (formato SQLAlchemy)                  | `postgresql+psycopg://...`       |
| `JWT_SECRET`            | Segredo para assinar JWT (TROQUE em produção)      | `dev-secret`                     |
| `JWT_ACCESS_TTL_MIN`    | Tempo de vida do access token (min)                | `30`                             |
| `JWT_REFRESH_TTL_DAYS`  | Tempo de vida do refresh token (dias)              | `14`                             |
| `STORAGE_BACKEND`       | Backend de storage (`filesystem` no MVP)           | `filesystem`                     |
| `STORAGE_ROOT`          | Raiz do filesystem storage                         | `./storage_local`                |
| `GEMINI_API_KEY`        | Chave Google Gemini                                | (vazio)                          |
| `GROQ_API_KEY`          | Chave Groq                                         | (vazio)                          |
| `CORS_ORIGINS`          | Origens permitidas (csv)                           | `localhost:5173,localhost:8080`  |

### Frontend (`.env` na raiz)

| Variável        | Descrição                       | Default                  |
| --------------- | ------------------------------- | ------------------------ |
| `VITE_API_URL`  | URL base da API backend         | `http://localhost:8000`  |

---

## 🎯 Fluxo do MVP (Sprint 0)

1. **Registrar** usuário + empresa em `/login`
2. **Identidade** — cadastrar tom de voz, cores, logo
3. **Conhecimento** — upload de documentos `.md` (sobre produto, público, FAQ…)
4. **Memória** — registrar decisões e preferências persistentes
5. **Executar** `conteudo.criar_post` informando tema, rede e objetivo
6. **Ver resultado** + métricas (provedor, tokens, custo, latência)
7. **Histórico** — últimas 5 execuções com prompt_version registrado

---

## 🧩 Conceitos Centrais

### Comando
Contrato único de entrada do Executor.

```python
Comando(
    schema_version=1,
    tipo=TipoComando.SKILL,
    alvo="conteudo.criar_post",
    entrada={"tema": "...", "rede": "Instagram"},
    empresa_id=..., projeto_id=..., usuario_id=...,
    origem=Origem.WEB,
)
```

### Pipeline de Execução

```text
Origem (Web/API/CLI)
      ↓
   Executor.executar(comando)
      ↓
   ContextBuilder.montar(comando)   ← Identidade + Conhecimento + Memória + Assets + Histórico
      ↓
   ExecutorSkill → Habilidade.executar(comando, contexto)
      ↓
   AI Router → Provedor (Gemini/Groq)
      ↓
   Persistir execucao (prompt_template + prompt_version)
      ↓
   ResultadoExecucao
```

### Habilidades disponíveis no MVP
- `conteudo.criar_post` — gera post para rede social usando `ia/prompts/criar_post.v1.jinja2`

### Política de Histórico
- Máx. **5 execuções** mais recentes
- Limite duro de **10.000 tokens**
- Descarta as mais antigas se exceder

---

## 🗄️ Modelo de Dados (8 tabelas)

`empresas`, `projetos`, `usuarios`, `refresh_tokens`, `identidade_empresa`, `documentos_conhecimento`, `memoria_itens`, `assets`, `execucoes`.

Cada empresa tem um **projeto raiz** criado na mesma transação (`EmpresaServico.criar_empresa`). `empresa_id` é injetado por middleware em toda request autenticada.

---

## 🌐 Principais Endpoints

| Método | Rota                          | Descrição                                |
| ------ | ----------------------------- | ---------------------------------------- |
| POST   | `/v1/auth/registrar`          | Cria usuário + empresa + projeto raiz    |
| POST   | `/v1/auth/login`              | Retorna access + refresh                 |
| POST   | `/v1/auth/refresh`            | Rotaciona refresh token                  |
| GET    | `/v1/empresas/me`             | Dados da empresa do usuário              |
| GET/PUT| `/v1/identidade`              | Identidade da marca                      |
| GET/POST/DELETE | `/v1/conhecimento`    | Documentos `.md`                         |
| GET/POST/DELETE | `/v1/memoria`         | Itens de memória                         |
| GET/POST | `/v1/assets`                | Upload de assets (logo, imagens)         |
| POST   | `/v1/comandos/executar`       | **Executa um Comando** (núcleo)          |
| GET    | `/v1/historico`               | Últimas execuções                        |

Docs interativas completas em `/docs` (Swagger UI).

---

## 🚢 Deploy

### Fly.io (recomendado)

```bash
cd backend
fly launch --no-deploy
fly volumes create storage --size 1 --region gru
fly secrets set \
  DATABASE_URL="postgresql://...neon.tech/..." \
  JWT_SECRET="$(openssl rand -hex 32)" \
  GEMINI_API_KEY="..." \
  GROQ_API_KEY="..." \
  CORS_ORIGINS="https://seu-frontend.lovable.app"
fly deploy
```

Postgres em produção: [Neon](https://neon.tech) (free tier serve para validação).

### VPS Linux (Hetzner/Contabo/etc.)

Mesma imagem Docker. Use `docker-compose.yml` adaptado com Caddy/Traefik na frente para HTTPS.

---

## 🛣️ Roadmap pós-MVP

| Fase | Foco                                              |
| ---- | ------------------------------------------------- |
| 1    | +5 habilidades de conteúdo                        |
| 2    | Camada Templates ativa                            |
| 3    | Fluxos (encadeamento de habilidades)              |
| 4    | Funcionários Digitais (Marketing, Comercial…)     |
| 5    | Estratégias no AI Router (fallback, A/B)          |
| 6    | Storage S3/MinIO                                  |
| 7    | Múltiplos projetos na UI                          |
| 8    | Eventos tipados (consumers)                       |
| 9    | RAG com pgvector                                  |
| 10   | Webhooks / Automação                              |
| 11   | Multiusuário + billing → SaaS                     |

---

## 📚 Documentação Adicional

- **Arquitetura completa:** [`.lovable/plan.md`](./.lovable/plan.md)
- **Backend específico:** [`backend/README.md`](./backend/README.md)
- **Templates (reserva):** [`backend/app/templates/README.md`](./backend/app/templates/README.md)
- **Rotas frontend:** [`src/routes/README.md`](./src/routes/README.md)

---

## 🤝 Como Contribuir

1. Leia `.lovable/plan.md` (a arquitetura está **congelada** na v6.1).
2. Trabalhe em branches a partir de `feature/sprint-0`.
3. Toda nova habilidade vai em `backend/app/habilidades/<categoria>/<nome>.py` e registra prompt em `backend/app/ia/prompts/<nome>.v1.jinja2`.
4. Nenhuma habilidade lê banco ou storage diretamente — recebe `Contexto`.
5. Toda execução passa pelo `Executor`. Sem exceções.

---

## 📄 Licença

Projeto privado — todos os direitos reservados.
