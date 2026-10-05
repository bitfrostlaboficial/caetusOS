# 06 — Roadmap e backlog de tarefas

Prioridade baseada nos achados de [`04-problemas-e-riscos.md`](./04-problemas-e-riscos.md) e na recomendação de [`05-produto-nichos-e-go-to-market.md`](./05-produto-nichos-e-go-to-market.md).

**Esforço** (estimativa grosseira para uma pessoa familiar com o código): **S** ≤ ½ dia · **M** 1–2 dias · **L** 3–5 dias · **XL** > 1 semana.
**Dependências** entre tarefas na coluna "Dep.". Cada tarefa deve terminar com testes e documentação atualizada (ver "Definição de pronto" no fim).

> **Decisões de 05/10/2026 já aplicadas (doc 8):** nome **Caetus OS**; **sem nicho** por enquanto; **BYOK** (cliente traz as chaves) como modelo inicial; **publicação em redes sociais fica para depois**; branch oficial **`no_lovable`**.
>
> Decisões em aberto que afetam o escopo: ver [`08-decisoes-pendentes.md`](./08-decisoes-pendentes.md) — marcadas como `D-xx` abaixo.

---

## Visão das fases

| Fase | Nome | Objetivo | Critério de saída |
|------|------|----------|-------------------|
| **0** | Estabilizar e proteger | Parar o sangramento: segurança, login, erro, isolamento, rede de segurança | Dá para registrar, logar, executar e falhar corretamente; sem vazamento entre empresas; testes+CI rodando |
| **1** | Ciclo utilizável (sistema funcionando, com BYOK) | Uma pessoa consegue usar o produto de ponta a ponta sem tocar em API/curl | Cadastrar marca (identidade/memória/assets/conhecimento) → gerar post real → ver/baixar resultado → histórico |
| **2** | Piloto fechado / base SaaS | Várias empresas reais, com limites e custo controlado | Convites/papéis, cotas e medição de custo por empresa, storage durável, deploy estável |
| **3** | Automação | Fazer o sistema trabalhar "sozinho" | Agendamento + aprovação + publicação; fluxos simples; fila/worker |
| **4** | Expansão | Mais valor por empresa e novos nichos | Novas habilidades, pacotes de nicho, RAG, funcionários digitais |

---

## Fase 0 — Estabilizar e proteger

| ID | Tarefa | Ref. | Esf. | Dep. |
|----|--------|------|------|------|
| **T-001** | **Rotacionar TODAS as chaves** que estiveram em `backend/.env` no histórico (Groq, Gemini, OpenRouter, HuggingFace, Fal, Replicate) e gerar novo `JWT_SECRET`. Ação manual nos painéis dos provedores. Não reescrever histórico. | SEC-01 | S | — |
| **T-002** | Adicionar *secret scanning* (gitleaks) em pre-commit e CI; garantir `.env*` no `.gitignore` (exceto `.env.example`). | SEC-01 | S | T-040 |
| **T-003** | **Corrigir login** (`AuthServico.login`/`registrar`/`rotacionar_refresh`: tirar `session.begin()` redundante) + teste de integração registrar → login → refresh → token inválido. | BUG-01 | S | T-040 |
| **T-004** | **Corrigir tratador de erro do `ExecutorSkill`** (colisão do kwarg `tipo`), garantir 422 para falha de negócio e 404 para habilidade inexistente; **persistir execuções com erro** no histórico. Testes dos 3 cenários. | BUG-02 | M | T-040 |
| **T-005** | **Fechar o isolamento:** (a) filtrar `/infraestrutura/ia/executions*` e métricas por `empresa_id`; (b) separar rotas de **admin da plataforma** (health, benchmark, modo, catálogo, perfis, fallbacks) atrás de `exigir_admin_plataforma`; (c) rate limit no benchmark. | SEC-02/03 | M | T-007 |
| **T-006** | Validar `projeto_id` do comando contra a empresa (usar `tenant_guard`) e testar com usuário de outra empresa. | SEC-04 | S | T-040 |
| **T-007** | Introduzir **papéis** (`owner/admin/membro`) e flag de operador da plataforma (`is_platform_admin`) — migração + dependência FastAPI. (Definir antes o modelo de usuário: D-04.) | SEC-03/06 | M | D-04 |
| **T-008** | **Storage por tenant**: gravar posts em `empresas/{empresa_id}/projetos/{projeto_id}/...` e registrar cada arquivo gerado como `Asset(origem="GERADO")`. Migrar/limpar o que já existe. | SEC-05 | M | — |
| **T-009** | **Parar de "fingir sucesso" sem chave de IA:** provedor sem chave levanta `ProvedorNaoConfigurado` → o roteador pula; stub só com flag explícita de teste; erro claro ao usuário se nenhum provedor servir. | BUG-03 | M | T-040 |
| **T-010** | Corrigir `Login.tsx` (hooks antes do `return` condicional) e demais erros reais do ESLint (`any`, escape de regex). Rodar `eslint --fix` para os 141 de formatação. | BUG-04, DEBT-03 | S | — |
| **T-011** | Remover os **97 `.pyc` versionados** e adicionar `.gitignore` de Python (`__pycache__/`, `*.pyc`, `.venv/`, `.pytest_cache/`, `storage_local/`). (Remoção de arquivos **não** reescreve histórico.) | DEBT-02 | S | — |
| **T-012** | Endurecer storage: `Path.is_relative_to`, sanitizar `nome_arquivo`, limite de tamanho e tipos permitidos em uploads. | SEC-07/08 | S | — |
| **T-013** | **Renomear para Caetus OS** (D-01) e atualizar README/`plan.md`: nome do produto (README, `pyproject`, `fly.toml`, banco/usuário de dev, `localStorage`, títulos), frontend (Vite+Router), variável `VITE_API_BASE_URL`, tabelas, rotas; apontar para `docs/`. | DEBT-05 | S | D-01 |
| **T-014** | Corrigir `max_tokens` no Gemini e revisar adapters (HF imagem retorna bytes; capacidades inconsistentes; tokens/custo ausentes). Teste de contrato por adapter com `httpx.MockTransport`. | BUG-05 | M | T-040 |
| **T-015** | **Consolidar branches (decidido: `no_lovable` é a oficial):** mergear `no_lovable` em `main` / trocar a branch padrão, apagar branches mortas, atualizar README (que na `no_lovable` ainda cita `ai/` removida). Sem reescrever histórico. | doc 9 | S | D-11 |
| **T-016** | **Separar Conhecimento × Resultados e filtrar o contexto:** posts gerados deixam de ser `DocumentoConhecimento` (vão para `assets`/resultados); `ContextBuilder` só injeta `.md/.txt` marcados como conhecimento e **ignora placeholders/modelos não preenchidos**; seleção por relevância em vez de "5 primeiros × 800 caracteres". | BUG-09/10, DEBT-14 | M | T-008 |
| **T-017** | **Mapear o ecossistema** (CaetusClaude, caetusStudio, caetusVideo, caetusBot-WPP, caetus-monitor...) e decidir fronteiras/reuso (ex.: `layout-engine`, `image-generator`/Cloudflare, manifestos de capacidade). | doc 9 | M | D-11 |
| **T-040** | **Infra de testes + CI**: pytest + fixtures (Postgres via `testcontainers` ou serviço do CI), `httpx`/`TestClient`; Vitest para o frontend; GitHub Actions: `ruff`, `pytest`, `tsc`, `eslint`, `vite build`. | DEBT-01 | M | — |

**Ordem sugerida dentro da Fase 0:** T-001 (hoje, em paralelo a tudo) → T-040 → T-003 → T-004 → T-009 → T-005/T-007/T-006 → T-008 → T-010/T-011/T-012/T-014 → T-013.

---

## Fase 1 — Ciclo utilizável (dogfooding)

| ID | Tarefa | Esf. | Dep. |
|----|--------|------|------|
| **T-101** | **UI de Identidade**: cores, fontes, tom de voz; upload de **logo** e manual (novo endpoint de upload ligado a `identidade_empresa`). Cliente `api.ts` (`obterIdentidade/salvarIdentidade`). | M | T-008 |
| **T-102** | **UI de Memória**: listar/criar/remover itens (tipo, conteúdo, peso). | S | — |
| **T-103** | **UI de Assets**: listar/enviar/remover; preview. Endpoint `GET /assets/{id}/arquivo` (stream com checagem de empresa) e `DELETE`. | M | T-008 |
| **T-104** | **Galeria de resultados**: listar posts gerados (imagem + legenda), reabrir um resultado, **baixar** (imagem/legenda/zip) e **copiar** legenda. Servir imagem gerada pelo nosso storage (não depender da URL temporária do provedor). | L | T-008, T-103 |
| **T-105** | Usar **identidade de verdade** na geração: injetar cores/estilo no prompt visual; (opcional) anexar logo como referência; revisar prompt `criar_post.v1` (hoje usa só 800 chars × 5 docs). Criar `criar_post.v2` mantendo a regra de versionamento. | M | T-101 |
| **T-106** | **Conhecimento melhor**: versionar documento (mesmo `tipo`+nome → nova versão), detectar duplicata por hash, editar `.md` na UI, limite de tamanho; selecionar quais documentos entram na execução. | M | T-012 |
| **T-107** | **Estado de erro na UI**: mostrar falhas no histórico, mensagens de provedor indisponível, "configure sua chave" quando faltar provedor; `ErrorBoundary` global. | M | T-004, T-009 |
| **T-108** | **Command Center honesto**: remover/rotular mocks (`FUNCIONARIOS_DIGITAIS`), remover `Dashboard.tsx`, esconder missões "em breve" do menu principal (ou agrupar em "Roadmap"). | S | — |
| **T-109** | ⏸ **ADIADA (D-06):** **Instagram (primeira versão segura):** fluxo "revisar e publicar" (botão manual) com token por empresa guardado cifrado; imagem servida por URL pública/assinada. Sem publicação automática ainda. (Decidir escopo: D-06.) | L | T-104, T-205 (URL pública da imagem) |
| **T-114** | **BYOK — chaves de IA por empresa (requisito do modelo de negócio, D-05).** (a) tabela `provedor_credenciais(empresa_id, provedor, chave_cifrada, modelo_preferido, ativo, testada_em)` com cifragem simétrica (ex. Fernet; chave-mestra em variável de ambiente, nunca no banco); (b) o roteador/`Provider` passa a receber a credencial **da empresa** (hoje as chaves são globais no `.env` — `GeminiProvedor(api_key=config...)`): construir o provedor por requisição ou injetar a chave na chamada; (c) catálogo filtrado pelos provedores que **a empresa** configurou; sem nenhum → erro claro "cadastre uma chave"; (d) endpoint "testar chave" (reaproveita `health_check`); (e) chaves **nunca** voltam por API (só `••••1234`), nunca em log/telemetria; (f) remover o uso das chaves da plataforma nas rotas da empresa (benchmark/health passam a usar a chave da empresa). | L | T-009, T-005, T-007 |
| **T-115** | **Tela "Provedores de IA"** (Configurações): para cada provedor, passo-a-passo de como criar a conta/chave (links oficiais, indicação de free tier), campo da chave, botão "testar", status (reaproveita o painel de health, agora por empresa), ordem de prioridade e modelo preferido. Onboarding: "conecte pelo menos 1 provedor" antes do 1º post. | M | T-114 |
| **T-110** | **Medição de custo real por execução** (tokens/custos de todos os provedores; custo por imagem do Fal/HF) e exibição por empresa. | M | T-014 |
| **T-111** | **Avaliação de qualidade**: 10–20 prompts de referência para `criar_post`; script que roda contra cada provedor e registra resultado/custo para comparação manual. Base para calibrar pesos do roteador. | M | T-009 |
| **T-112** | Code splitting do frontend (lazy routes), `VITE_API_BASE_URL` documentada, build de produção servido (Cloudflare Pages/Netlify/Fly static). | S | — |
| **T-113** | **Onboarding guiado** (checklist: 1. marca, 2. conhecimento, 3. primeiro post) na primeira entrada. | M | T-101, T-102 |

**Marco 1 (sistema funcionando):** você usa com sua própria marca durante 1–2 semanas e responde: a qualidade serve? qual o custo por post? o que faltou?

---

## Fase 2 — Piloto fechado / base SaaS

| ID | Tarefa | Esf. | Dep. |
|----|--------|------|------|
| **T-201** | Convite de usuários para a empresa + gestão de membros (conforme D-04). | L | T-007 |
| **T-202** | Reset de senha e verificação de e-mail (provedor transacional: Resend/Brevo/SES). Política de senha, *rate limit* e bloqueio de login. | L | T-003 |
| **T-203** | *(só quando houver plano com IA incluída)* **Cotas e limites por empresa** (posts/mês, tokens, custo máx.) com bloqueio e aviso; tabela `uso_empresa`. Com BYOK o cliente paga o próprio provedor — aqui valem só limites de **uso da plataforma** (ex.: nº de execuções/dia contra abuso). | L | T-110 |
| **T-205** | **Storage S3-compatível** (Cloudflare R2/Backblaze/MinIO) implementando `StorageBackend`; URLs assinadas; migração do filesystem. | L | T-008 |
| **T-206** | **Multi-projeto na UI** (selecionar marca/projeto; histórico, memória e assets por projeto). Habilita "agência com várias marcas". | L | T-101 |
| **T-207** | **Deploy estável**: ambiente de staging; Postgres gerenciado (Neon/Supabase/Fly PG); `min_machines_running=1`; migrações automáticas controladas; backups e restore testado; variáveis via secrets. | L | T-040 |
| **T-208** | **Observabilidade**: Sentry (back+front), logs JSON centralizados, alerta de erro 5xx e de provedor fora (reaproveitar health), painel de custo diário. | M | T-207 |
| **T-209** | **Persistir estado de roteamento** (modo/overrides/métricas/fallbacks) no banco; health agendado fora do processo web (ou única instância). | M | T-005 |
| **T-210** | **LGPD/Termos**: política de privacidade, termos, retenção configurável, exportação/exclusão de dados da empresa, opção de não armazenar prompts. | M | — |
| **T-211** | **Cobrança / assinatura** (plano com **IA incluída/créditos** — a parte paga futura; Stripe ou provedor BR com Pix). Fora do lançamento: o início é gratuito com BYOK. | XL | T-203 |
| **T-212** | **Painel de admin da plataforma**: empresas, uso, custo por empresa, saúde dos provedores (move a "Infraestrutura IA" para a área de admin). | L | T-005, T-203 |

**Marco 2 (piloto):** 3–10 empresas do nicho usando por 4 semanas; coletar as métricas definidas no doc 5 §5.

---

## Fase 3 — Automação

| ID | Tarefa | Esf. | Dep. |
|----|--------|------|------|
| **T-301** | **Fila + worker** (ARQ/RQ/Celery + Redis, ou `Postgres LISTEN/NOTIFY`/tabela de jobs): execução assíncrona de comandos; endpoint de status/SSE; frontend com polling. Resolve BUG-07. | XL | T-207 |
| **T-302** | **Agendamento** de execuções (ex.: "post toda segunda às 9h") + calendário editorial. | L | T-301 |
| **T-303** | ⏸ **(depois)** **Aprovação humana** antes de publicar (rascunho → aprovado → publicado) e histórico de aprovações. | M | T-109 |
| **T-304** | ⏸ **(D-06, depois)** **Publicação por empresa via OAuth** (Instagram/Facebook; depois LinkedIn). Inclui App Review da Meta quando necessário. | XL | T-109, T-205 |
| **T-305** | **Fluxos simples** (encadear 2–3 habilidades: ex. `calendario_mensal` → N × `criar_post`) como `TipoComando.FLUXO` no Executor (ativar o ponto de extensão reservado). | XL | T-301 |
| **T-306** | **Webhooks/entrada por API pública** com chave de API por empresa (`Origem.API/WEBHOOK`). | L | T-201 |
| **T-307** | Ativar `Publisher` real (eventos `execucao.concluida` → notificações/e-mail/webhook de saída). | M | T-301 |

---

## Fase 4 — Expansão

| ID | Tarefa | Esf. | Dep. |
|----|--------|------|------|
| **T-401** | Novas habilidades do nicho (ver doc 5 §7): `calendario_mensal`, `responder_avaliacao`, `gerar_banner`, variações A/B, carrossel/roteiro de reels. | L cada | T-105 |
| **T-402** | **Pacotes de nicho** (D-02: só depois do sistema funcionar; deve ser uma camada **principalmente visual/de configuração**): ativar `templates/` como "Pacotes" (habilidades + prompts + conhecimento inicial + textos/onboarding), carregados por dado. | XL | T-401 |
| **T-403** | **RAG** (pgvector + `embeddings_busca` do roteador) para bases de conhecimento maiores. | XL | T-106 |
| **T-404** | **Funcionários Digitais** como entidade (nome, função, habilidades permitidas, tom, provedor preferido, limites) e execução "como funcionário". | XL | T-402 |
| **T-405** | Edição de foto (remoção de fundo, upscale, outpaint) usando especializações já catalogadas. | L | T-205 |
| **T-406** | OCR/transcrição (missões já definidas no roteador) como habilidades. | L | T-205 |
| **T-407** | Estratégias no roteador (A/B, custo×qualidade por empresa, fallback configurável) apoiadas nos dados de T-111/T-110. | L | T-111 |

---

## Primeiras 10 tarefas recomendadas (esta semana)

1. **T-001** Rotacionar chaves (manual, você) — **repositório público: urgente, hoje**.
   **T-015** logo em seguida: decidir/mergear a branch oficial (`no_lovable` × `main`).
2. **T-040** Testes + CI mínimos.
3. **T-003** Corrigir login.
4. **T-004** Corrigir tratador de erro e persistir falhas.
5. **T-009** Não fingir sucesso sem chave de IA.
6. **T-005 + T-007 + T-006** Isolamento por empresa e papel de admin.
7. **T-008** Storage por tenant + assets gerados; **T-016** separar Conhecimento × Resultados.
   **T-114 + T-115** BYOK: é o que deixa o sistema usável por qualquer cliente sem custo para a plataforma.
8. **T-010 + T-011** Lint real do front, `.gitignore` e remoção dos `.pyc`.
9. **T-101 + T-102 + T-103** UIs de identidade, memória e assets.
10. **T-104** Galeria/baixar resultado → **Marco 1: usar com marca real**.

## Definição de pronto (vale para toda tarefa)

- Teste automatizado cobrindo o comportamento (e o bug, quando for correção); CI verde (build + lint + testes).
- Nenhum segredo no diff; `.env.example` atualizado se houver variável nova.
- Migração Alembic quando houver mudança de modelo (e `upgrade head` verificado em banco vazio).
- Documentação em `docs/` e README ajustados quando o comportamento muda.
- Sem reescrever histórico (regra do `AGENTS.md`); commits pequenos e descritivos.
