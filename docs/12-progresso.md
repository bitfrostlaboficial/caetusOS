# 12 — Progresso (registro de implementação)

Atualizado a cada iteração. Branch de trabalho: `claude/focused-hopper-kb9m2r` (contém a `no_lovable` + correções). Suíte: `cd backend && TEST_DATABASE_URL=... pytest` (precisa de Postgres).

| Data | Tarefa | O que mudou | Testes |
|------|--------|-------------|--------|
| 05/10 | merge | `no_lovable` incorporada à branch de trabalho (merge, sem reescrever histórico) | — |
| 05/10 | T-011 | `.gitignore` de Python; 97 `.pyc` removidos do índice | — |
| 05/10 | T-003 + T-040 | **Login corrigido** (removido `session.begin()` redundante). Infra pytest (Postgres, fixtures, `ia_falsa`) | `test_auth.py` (7) |
| 05/10 | T-004 | **Erros de habilidade → 422/404/400/503 corretos**; execução com erro **entra no histórico**; habilidade inexistente resolvida antes do contexto | `test_comandos.py` (6) |
| 05/10 | T-009 | Provedor sem chave **levanta `ProvedorNaoConfigurado`** (stub só com `IA_PERMITIR_STUB`); roteador ignora provedores sem credencial; `criar_post` entrega **texto com aviso** se a imagem falhar (sem PNG placeholder) | `test_provedores.py`, `test_criar_post.py` |
| 05/10 | T-005 + T-006 | **Isolamento**: telemetria/métricas de IA por empresa; operações globais só para `PLATFORM_ADMIN_EMAILS`; `projeto_id` de outra empresa → 404; `GET /auth/me`; Infra/Benchmark ocultos para não-admin; corrigido 500 em `/categorias` | `test_isolamento.py` (17) |
| 05/10 | T-040 + T-010 | **CI** (GitHub Actions: pytest + tsc + eslint + build); `Login.tsx` (hooks) e tipos do explorador de conhecimento corrigidos; **0 erros de lint** | CI |
| 05/10 | T-016 (parcial) | Contexto só recebe **conhecimento real**: sem binários, sem modelos não preenchidos, sem posts gerados; blocos de exemplo removidos | `test_contexto_conhecimento.py` (5) |

| 05/10 | T-114 (núcleo) | **BYOK**: cofre Fernet (`CREDENCIAIS_MASTER_KEY`), tabela `provedor_credenciais` (migração 0004), `CredenciaisServico`, endpoints `GET/PUT/DELETE /v1/provedores`, `POST /v1/provedores/{nome}/testar`; roteador resolve **a chave da empresa** (ou da plataforma se `IA_USAR_CHAVES_DA_PLATAFORMA`); modelo preferido; segredo nunca retorna (só máscara) | `test_byok.py` (17) |
| 05/10 | T-116 + T-117 (texto) | **Adaptador genérico OpenAI-compatível** (`openai_compat.py`) + provedores **Mistral, NVIDIA NIM e Cloudflare Workers AI (texto)**, catálogo/URLs/`.env.example`; Cloudflare com 2 campos (`api_token`, `account_id`). Pendente: imagem FLUX (Cloudflare) | `test_openai_compat.py` (12) |
| 05/10 | T-115 | **Tela "Provedores de IA"** (`/app/provedores`): cartão por provedor (campos, aviso, link p/ criar chave, modelo, salvar/testar/remover/ativar), segredo nunca volta (só máscara), CTA "Conectar provedor" no Criar Post quando não há provedor (503); mensagens de erro da API legíveis. Verificado no navegador (Playwright/Chromium) | screenshot + tsc/eslint/build |
| 05/10 | T-012 | Storage: `is_relative_to` (prefixo irmão não passa), `nome_seguro()` nos uploads, limite `UPLOAD_MAX_BYTES` (413) | `test_storage_uploads.py` (12) |
| 05/10 | T-013 | **Renomeado para Caetus OS**: README/backend README, `pyproject`, compose (DB `caetus`), `fly.toml` (`caetus-os`), chaves do `localStorage` (`caetusos.*`); `plan.md` marcado como histórico | — |

**Total:** 90 testes backend passando. **Pendente da Fase 0:** T-001 (rotacionar chaves — ação do dono), T-002, T-007 (papéis), T-008 (resultados como assets), T-012, T-013 (renomear p/ Caetus OS), T-014, T-015 (merge `no_lovable`→`main`).
**Próximo:** T-101/T-102/T-103 (telas de Identidade, Memória, Assets), T-012, T-013 (renomear), T-015, T-117 (imagem Cloudflare/FLUX), migrar Groq/OpenRouter para o adaptador genérico (opcional).
