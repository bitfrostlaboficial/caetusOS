# Empresa IA — Backend (Sprint 0)

Arquitetura **v6.1 congelada**. Veja `.lovable/plan.md` para a referência oficial.

## Stack
- Python 3.12 + FastAPI
- PostgreSQL (Docker em dev; Neon em produção)
- Storage: `StorageBackend` → `Filesystem` (única ativa no MVP)
- Auth própria: argon2id + JWT + refresh rotativo
- IA: Gemini + Groq via adapters

## Princípio de portabilidade (§2)
A aplicação usa a **mesma imagem Docker e a mesma configuração base** em dev,
Fly.io e VPS. Apenas Docker Compose, `fly.toml` e variáveis de ambiente mudam.
Toda a lógica permanece idêntica.

## Subir em desenvolvimento

```bash
cp .env.example .env
docker compose up --build
```

API em `http://localhost:8000`, docs em `/docs`.

## Migrações

```bash
docker compose exec api alembic upgrade head
docker compose exec api alembic revision --autogenerate -m "descricao"
```

## Deploy Fly.io

```bash
fly launch --no-deploy        # primeira vez
fly secrets set DATABASE_URL=... JWT_SECRET=... GEMINI_API_KEY=... GROQ_API_KEY=...
fly deploy
```

## Estrutura

Ver §4 do plano arquitetural. Resumo:

- `app/executor/` — núcleo: `Executor`, `Comando`, `ResultadoExecucao`
- `app/habilidades/conteudo/criar_post.py` — única habilidade ativa no MVP
- `app/ia/context_builder/` — monta `Contexto` para a habilidade
- `app/ia/roteador.py` — mapa fixo `tipo → provedor`
- `app/servicos/` — orquestração de domínio (sem regra de negócio em routers)
- `app/infraestrutura/` — banco, storage, segurança
- `app/templates/README.md` — domínio reservado para o futuro (sem código)
