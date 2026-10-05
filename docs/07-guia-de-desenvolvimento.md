# 07 — Guia de desenvolvimento

Comandos marcados com ✅ foram **executados neste levantamento** (05/10/2026) e funcionaram como descrito.

## 1. Pré-requisitos

- **Python 3.12** (o `pyproject.toml` exige `>=3.12`; com 3.11 o `pip install .` recusa).
- **PostgreSQL 16** (via Docker Compose ou instalado).
- **Node 20+** (usei `npm`; o repositório tem `bun.lock` **e** `package-lock.json` — escolher um gerenciador, ver nota abaixo).
- Chaves de IA (opcional para desenvolver; ver §4): Gemini, Groq, OpenRouter, HuggingFace, Fal.

## 2. Backend

### Opção A — Docker Compose (caminho oficial, **não testado** no levantamento: sem Docker no ambiente)
```bash
cd backend
cp .env.example .env      # preencha chaves; JWT_SECRET >= 32 bytes
docker compose up --build  # API :8000, Postgres :5432 (migrações rodam no CMD do container)
```

### Opção B — Local, sem Docker ✅
```bash
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install .

# Banco (exemplo com um Postgres local qualquer)
export DATABASE_URL=postgresql+psycopg://empresa_ia:empresa_ia@localhost:5432/empresa_ia
export JWT_SECRET="$(python -c 'import secrets;print(secrets.token_hex(32))')"   # >= 32 bytes
export STORAGE_ROOT=./storage_local
export IA_HEALTH_SCHEDULER_ENABLED=false        # evita o job diário em dev

alembic upgrade head                            # ✅ 3 migrações aplicam em banco vazio
uvicorn app.main:app --reload --port 8000       # ✅ GET /saude → {"ok":true,...}
```
Docs interativas: `http://localhost:8000/docs`.

> Sem `GEMINI_API_KEY`/`GROQ_API_KEY`/`FAL_KEY`, os provedores devolvem **stubs** e o sistema "funciona" com conteúdo genérico (ver BUG-03). Para avaliar qualidade real é preciso configurar chaves.

### Smoke test manual (curl) ✅
```bash
B=http://localhost:8000/v1; H='Content-Type: application/json'
curl -s -X POST $B/auth/registrar -H "$H" -d '{"nome_empresa":"Minha Empresa","email":"eu@exemplo.com","senha":"senha12345"}'
# → access_token; use em: -H "Authorization: Bearer <token>"
curl -s -X PUT  $B/identidade -H "$H" -H "Authorization: Bearer $T" -d '{"tom_de_voz":"descontraído","cores":{"primaria":"#ff0000"}}'
curl -s -X POST $B/memoria    -H "$H" -H "Authorization: Bearer $T" -d '{"tipo":"preferencia","conteudo":"Nunca usar emojis","peso":2}'
curl -s -X POST $B/conhecimento -H "Authorization: Bearer $T" -F tipo=produto -F arquivo=@doc.md
curl -s -X POST $B/comandos/executar -H "$H" -H "Authorization: Bearer $T" \
     -d '{"alvo":"conteudo.criar_post","entrada":{"tema":"Dia do café","rede":"instagram"}}'
curl -s $B/historico -H "Authorization: Bearer $T"
```
⚠️ `POST /auth/login` está **quebrado** (BUG-01): use o token devolvido por `/auth/registrar` até a correção (T-003).

### Variáveis de ambiente
Ver `backend/.env.example` (modelos e chaves **sempre** pelo `.env`, nunca no código). Variáveis **não documentadas** no exemplo mas lidas pelo código (`configuracao/__init__.py`): `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_ACCOUNT_ID`, `INSTAGRAM_API_VERSION`, `IA_HEALTH_HOUR`, `IA_HEALTH_MINUTE`, `IA_HEALTH_TIMEZONE`, `IA_HEALTH_SCHEDULER_ENABLED`, `IA_STORE_PROMPTS`, `REPLICATE_*`.

### Migrações
```bash
alembic revision --autogenerate -m "descricao"   # após alterar modelos em dominio/modelos
alembic upgrade head
```
Novos modelos precisam ser **importados** em `app/main.py`/`dominio/modelos/__init__.py` para o autogenerate enxergá-los.

## 3. Frontend ✅

```bash
npm ci                 # ✅ (415 pacotes)
npm run dev            # Vite em :8080 (host aberto)
npx tsc --noEmit       # ✅ passa
npm run build          # ✅ passa (aviso: chunk > 500 kB)
npm run lint           # ❌ 158 problemas hoje (141 auto-corrigíveis com --fix)
```
- URL da API: **`VITE_API_BASE_URL`** (default `http://localhost:8000`) — o README antigo cita `VITE_API_URL` (errado).
- Gerenciador de pacotes: o repo tem **`bun.lock` e `package-lock.json`**; o Lovable usa bun (`bunfig.toml`). Escolha um e remova o outro quando decidir (T-010/T-040).
- Auth no navegador: tokens em `localStorage` (`empresaia.access_token`, `empresaia.refresh_token`).

## 4. Como adicionar uma habilidade (receita)

1. **Prompt versionado:** `backend/app/ia/prompts/<nome>.v1.jinja2` (Jinja2; o ambiente é tolerante a campos ausentes — `ChainableUndefined`). Mudou o prompt? Crie `v2`, não edite `v1` (cada execução registra `prompt_template` + `prompt_version`).
2. **Missão do roteador** (se precisar de um tipo novo de IA): uma linha em `ia/missoes.py` (`categoria`, `especializacao`, `prefere`, `max_tokens`) e, se faltar modelo, uma entrada em `ia/catalogo.py` + chave/modelo no `.env`.
3. **Habilidade:** classe em `habilidades/<dominio>/<nome>.py` herdando `Habilidade` (`nome="dominio.acao"`, `prompt_template`, `prompt_version`), com `executar(entrada, contexto) -> dict`.
   - Use **só** o `Contexto` recebido; registre o que fez com `contexto.registrar_evento("tipo", "título", nivel=..., **detalhes)`. ⚠️ Não passe um detalhe chamado `tipo` (colide com o 1º parâmetro — é exatamente o BUG-02).
   - Chame IA **sempre** por `ia.roteador.executar_missao(...)` passando `empresa_id`/`usuario_id` (telemetria).
   - Devolva métricas em `dict["_metricas"] = {provedor, modelo, tokens_in, tokens_out, custo, latencia_ms}` (o `ExecutorSkill` as extrai).
4. **Registro explícito** em `habilidades/registro.py` (`registrar(MinhaHabilidade())`) — não há autodiscovery.
5. **Frontend:** item em `src/lib/missoes.ts` (`status: "disponivel"`, `rota`) + página em `src/pages/` + rota em `src/App.tsx`.
6. **Testes:** unitário da habilidade com `Contexto` fake e provedor *mockado*; integração via `POST /v1/comandos/executar`.

## 5. Convenções e regras de ouro

- **Português** em nomes de domínio (`empresa`, `projeto`, `habilidade`) e mensagens ao usuário; código de infraestrutura pode ser inglês quando idiomático.
- Princípios do `plan.md` que **seguem valendo**: Executor único; `ResultadoExecucao` único; habilidade sem acesso direto a banco; I/O via `StorageBackend`; `empresa_id` vindo do token; sem recursos proprietários de provedor/cloud.
- **Nunca** versionar `.env` ou chaves. `.env.example` só com valores vazios.
- **AGENTS.md:** não reescrever histórico (sem force-push/rebase/amend de commits publicados) — o Lovable sincroniza a branch conectada; mantenha a branch num estado que builda.
- Falha de negócio **nunca** retorna 200 (regra da Fase 6); sempre devolver `request_id`.
- Telemetria de IA nunca pode quebrar a chamada de IA (o gravador é assíncrono e tolerante).

## 6. Armadilhas conhecidas

| Armadilha | Detalhe |
|-----------|---------|
| Login 500 | BUG-01 — usar o token do registro até corrigir. |
| Erros de skill viram 500 | BUG-02 — não confie no código 4xx por enquanto. |
| "Sucesso" sem chaves de IA | BUG-03 — stubs; confira o campo `provedor`/`metadata` e o texto genérico. |
| Rotas `/infraestrutura/*` | SEC-02/03 — qualquer usuário vê/altera estado global. Não exponha o backend publicamente antes de T-005. |
| Estado em memória do roteador | BUG-06 — mudou o modo/overrides? some no restart. |
| Python 3.11 | `pip install .` recusa; o código usa recursos de 3.11+ mas o projeto declara 3.12. |
| `__pycache__` versionado | DEBT-02 — não commitar `.pyc` novos (`git status` após rodar a API). |
| Frontend ≠ TanStack Start | É Vite + React Router; ignore o que o README antigo diz sobre `src/routes/`. |
