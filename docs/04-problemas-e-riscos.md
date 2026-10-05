# 04 — Problemas, bugs e riscos

Cada item tem **ID**, **severidade** (P0 = bloqueia qualquer uso real; P1 = bloqueia ser SaaS; P2 = dívida importante; P3 = higiene),
**evidência** e **correção sugerida**. Os IDs são usados no [roadmap](./06-roadmap-e-tarefas.md).

Status da evidência: ✅ reproduzido em execução · 🔎 identificado por leitura de código (não reproduzido).

---

## A. Segurança

### SEC-01 · P0 · Chaves de API reais estão no histórico do Git
- **Evidência ✅:** o arquivo `backend/.env` foi commitado (commits `6fa4a98`, `8aa1661`, `0bc7383`), removido em `b569ec8` (01/07/2026), **commitado de novo com chaves reais em `c2d6cd6` (02/07/2026)** na branch `no_lovable` e removido em `36c7ca5` (04/07/2026). **O repositório `bitfrostlaboficial/caetusOS` é PÚBLICO** (confirmado pela listagem de repositórios da conta). O histórico contém valores **não vazios** de:
  `JWT_SECRET` (2 valores diferentes), `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPEN_ROUTE_API_KEY` (OpenRouter), `HUGGING_FACE_API_KEY`, `FAL_AI_API_KEY`, `REPLICATE_API_KEY`.
  (Os valores **não** são reproduzidos aqui. Recuperá-los: `git log -p -- backend/.env`.)
- **Impacto:** como o repositório é público, **qualquer pessoa** (e robôs que varrem o GitHub por chaves) pode ter obtido as chaves; considere-as **comprometidas desde a data do primeiro commit** (28/06/2026). Risco concreto: uso/abuso das cotas e cobrança em nome do dono, e forja de JWT enquanto o `JWT_SECRET` antigo existir.
- **Correção:**
  1. **Revogar/rotacionar todas as chaves agora** nos painéis de cada provedor e gerar novo `JWT_SECRET` (isso invalida sessões). **Esta é a correção real.**
  2. **Não** reescrever o histórico: `AGENTS.md` proíbe (sincroniza com o Lovable). Reescrever só valeria como higiene *depois* da rotação e exigiria combinar com o Lovable.
  3. Garantir `.env` no `.gitignore` (já foi feito em `cab25cc`), manter só `backend/.env.example` com valores vazios, e adicionar *secret scanning* (`gitleaks` no pre-commit/CI).

### SEC-02 · P0 · Telemetria de IA de **todas** as empresas visível a qualquer usuário (quebra de isolamento)
- **Evidência ✅:** empresa B (recém-criada) chamou `GET /v1/infraestrutura/ia/executions` e recebeu as execuções da empresa A (`empresa_id` da A no payload). Em `api/v1/infraestrutura.py` todos os endpoints usam `_: Usuario = Depends(usuario_atual)` e **ignoram o usuário**; `repo_exec.listar_execucoes` não filtra por empresa. O payload inclui `prompt` (quando `IA_STORE_PROMPTS=true`), `metadata` e `erro` (mensagens de provedor podem conter trechos do prompt).
- **Correção:** separar **rotas de plataforma (admin)** das **rotas de empresa**. Para empresa: filtrar tudo por `usuario.empresa_id`. Para plataforma: exigir papel `platform_admin` (novo). Ver SEC-03.

### SEC-03 · P0/P1 · Não existe conceito de papel/admin; qualquer usuário opera a plataforma
- **Evidência ✅:** empresa B executou `POST /v1/infraestrutura/ia/modo` e mudou o roteador **para todos** (modo `manual`). 🔎 O mesmo vale para `POST /infraestrutura/ia/check` (dispara chamadas reais aos provedores) e `POST /infraestrutura/ia/benchmark` (**gasta cota/dinheiro das chaves da plataforma** com prompt livre, até 10 provedores em paralelo, 4096 tokens cada).
- **Correção:** coluna `papel` em `usuarios` (`owner|admin|membro`) + flag de operador da plataforma (`is_platform_admin`), dependência `exigir_admin_plataforma`. Aplicar a `/infraestrutura/*` e `/ia/providers/*`. Rate limit no benchmark.

### SEC-04 · P1 · `projeto_id` vindo do cliente não é validado
- 🔎 `api/v1/comandos.py` repassa `dados.projeto_id` ao `Comando`; o `Executor` só preenche o projeto raiz quando é `None`. Um usuário poderia informar o `projeto_id` de **outra empresa**: a execução seria gravada com `empresa_id` correto mas `projeto_id` alheio, e `ContextBuilder` filtra memória/assets por esse projeto. O `tenant_guard` foi escrito para isso e **nunca é chamado**.
- **Correção:** validar `projeto.empresa_id == usuario.empresa_id` no Executor (ou no router) e usar `tenant_guard` de fato.

### SEC-05 · P1 · Storage sem prefixo de empresa para arquivos gerados
> **Atualização (doc 9):** na branch `no_lovable` isto está **corrigido em parte** (arquivos em `empresas/{id}/conhecimento/` e registrados no banco), mas gerou BUG-09/BUG-10.

- **Evidência ✅:** o post gerado foi gravado em `conhecimento/marketing/posts/2026/10/post_001/...` (`pipeline_post.py:232`) — **sem `empresas/{empresa_id}/`**, ao contrário de uploads (`empresas/{id}/conhecimento/...`). Duas empresas compartilham a mesma árvore e o contador `post_NNN`; qualquer endpoint futuro de download baseado em caminho vazaria dados entre empresas. Além disso o resultado **não é registrado** em `assets`/`documentos_conhecimento`.
- **Correção:** prefixar por `empresas/{empresa_id}/projetos/{projeto_id}/...` e registrar cada arquivo gerado como `Asset(origem="GERADO")`.

### SEC-06 · P1 · Autenticação incompleta para produção
- 🔎 Sem *rate limit*/bloqueio em login; sem política de senha; sem reset/verificação de e-mail; **login por e-mail sem empresa** (`auth_servico.py:40`) enquanto a unicidade é por `(empresa_id, email)` — e `registrar` **sempre cria uma empresa nova**, então o mesmo e-mail pode existir em N empresas e o login pegaria uma arbitrária (`.first()`); o ramo "e-mail já cadastrado" (`JaExiste`) é inalcançável.
- Tokens em `localStorage` (exposição a XSS) — aceitável no MVP, registrar como dívida.
- **Correção:** definir o modelo de identidade (usuário global com N empresas vs. usuário por empresa) **antes** de implementar convites (ver D-04), e só então corrigir login/registro.

### SEC-07 · P2 · Verificação de *path traversal* frágil
- 🔎 `FilesystemStorage._caminho_absoluto` usa `startswith(str(raiz))`; um diretório irmão com mesmo prefixo (`/data/storage_x`) passaria. Usar `Path.is_relative_to`. Hoje o risco é baixo (nomes vêm de uploads com UUID/hash), mas `nome_arquivo` do usuário entra no caminho — **sanitizar** (`..`, barras).

### SEC-08 · P2 · Uploads sem validação
- 🔎 Sem limite de tamanho, sem checagem de tipo/MIME real, `tipo`/`categoria` livres, `.md` lido inteiro em memória e inteiro a cada execução. Risco de abuso/DoS e de *prompt injection* via documento (conteúdo do conhecimento entra cru no prompt).

### SEC-09 · P2 · Segredos e configuração
- `JWT_SECRET` padrão `"dev-secret"` (a API exige ≥32 bytes fora de `DEBUG`, ok); `docker-compose.yml` com credenciais fixas e IP privado hard-coded em `CORS_ORIGINS`; `ia_execucoes.prompt` guarda prompt em claro se `IA_STORE_PROMPTS=true` (LGPD — documentar).

---

## B. Bugs funcionais

### BUG-01 · P0 · `POST /v1/auth/login` retorna 500 — **ninguém consegue fazer login**
- **Evidência ✅:** registro cria o usuário; login seguinte → `{"erro":{"tipo":"InvalidRequestError"...}}`.
- **Causa 🔎:** `AuthServico.login` consulta (`query(...)`, abre transação implícita) e depois chama `with self.sessao.begin():` — o SQLAlchemy 2 rejeita `begin()` com transação já iniciada. O `registrar` não tem o problema porque não consulta antes. (`obter_db` já faz commit/rollback; o `begin()` explícito é desnecessário.)
- **Correção:** remover o `with self.sessao.begin()` (usar `flush()`), ou abrir `begin()` antes da consulta. Aplicar o mesmo cuidado em `registrar`/`rotacionar_refresh` e **criar teste de integração do fluxo registrar→login→refresh**.

### BUG-02 · P0 · Qualquer falha de habilidade vira HTTP 500 (e a execução falha não é gravada)
- **Evidência ✅:** executar `criar_post` sem `tema`, ou com `alvo` inexistente, → 500 `TypeError: Contexto.registrar_evento() got multiple values for argument 'tipo'`.
- **Causa 🔎:** `executor/executores/skill.py:119` chama `contexto.registrar_evento("skill.falhou", ..., tipo=type(exc).__name__, ...)`, mas o 1º parâmetro posicional de `registrar_evento` também se chama `tipo`. O **tratador de erro quebra dentro do `except`**.
- **Efeitos:** (a) a regra "falha de negócio → 422" nunca ocorre; (b) o erro correto (`FaltaCampoObrigatorio`, 404 de habilidade) é mascarado; (c) o `Executor` não chega a persistir a `Execucao` com `status="erro"`, e, mesmo que o erro fosse tratado, o 422 é lançado como `HTTPException` dentro do endpoint, o que (🔎 inferido, não testado) faz `obter_db` reverter a transação — então **o histórico só mostra sucessos**.
- **Correção:** renomear a chave (`exc_tipo=`) ou o parâmetro; persistir execuções de erro **antes** de levantar a resposta (commit explícito ou resposta 422 sem exceção). Teste de regressão para os 3 cenários (campo ausente, habilidade inexistente, provedor falhando).

### BUG-03 · P1 · Sem chave de IA o sistema "finge" sucesso
- **Evidência ✅:** sem `GEMINI_API_KEY`/`GROQ_API_KEY`/`FAL_KEY`, `criar_post` retornou 200 com legenda genérica ("Uma publicacao para instagram com foco em engajamento...") e imagem **PNG 1×1 placeholder**, salvos como se fossem o resultado. A execução ficou registrada com `provedor=groq` mesmo sendo stub. Cada provedor devolve `"[stub ... sem API_KEY]"` em vez de erro, e o pipeline (`pipeline_post.py:166,457,475`) trata o stub como sucesso.
- **Impacto:** o usuário recebe lixo sem aviso; métricas/custo ficam falsas; mascara chave faltando/expirada.
- **Correção:** provedor sem chave deve **levantar erro tipado** (`ProvedorNaoConfigurado`) para o roteador pular para o próximo; o stub só existe em modo de teste explícito (`IA_MODO_STUB=true`). Se nenhum provedor funcionar → erro claro ao usuário.

### BUG-04 · P1 · `Login.tsx` viola regras de hooks
- 🔎 (apontado pelo ESLint) `if (auth.isAuthenticated()) return <Navigate/>` vem **antes** de `useNavigate/useState` (`Login.tsx:11-19`). Se o componente re-renderiza com o estado de autenticação mudado (ex.: `setTokens` seguido de `setCarregando(false)` em `finally`), o React lança "Rendered fewer hooks than expected". Correção: mover o `return` condicional para depois dos hooks (ou fazer o redirecionamento em um wrapper).

### BUG-05 · P2 · Parâmetros e protocolos de provedores
- 🔎 `GeminiProvedor.executar` **ignora `max_tokens`** (e `temperature` etc.); resposta pode ser cortada/ilimitada e o custo estimado fica sem `tokens_in/out` (o provedor não os devolve → `custo=0`). Conferir se Groq/OpenRouter populam tokens.
- 🔎 `HuggingFaceProvedor.executar` faz `r.json()` numa chamada de geração de imagem; a Inference API devolve **bytes** para modelos de imagem → falharia/fallback. O endpoint `api-inference.huggingface.co` também deve ser revisado (a HF migrou para *Inference Providers*). **Não testado.**
- 🔎 Mapa de capacidades inconsistente (ex.: `HuggingFaceProvedor.capabilities` diz `chat=True` com modelo padrão FLUX; entrada `fal`/`TRANSCRIPTION` usa `config.fal_model` — um modelo de imagem).

### BUG-06 · P2 · Estado de roteamento em memória
- 🔎 `ia/metricas.py`, `ia/fallback_log.py` e o `modo`/`overrides` de `ia/perfis` vivem em memória do processo: somem a cada deploy, divergem entre workers/máquinas e (com SEC-03) qualquer usuário os altera.

### BUG-07 · P2 · Execução síncrona e longa
- 🔎 `POST /comandos/executar` roda texto + imagem + download (timeout até 120 s) dentro da requisição HTTP. Em Fly com 1 VM de 512 MB e `auto_stop`, isso derruba UX e escala mal. Precisa de **fila/worker** + polling/SSE (ver FEAT-30).

### BUG-08 · P3 · Outros
- `historico` (rota) ignora `projeto_id`; `ContextBuilder.carregar_historico` filtra por projeto — comportamentos diferentes.
- Documento de conhecimento: `versao` sempre 1; duplicatas não detectadas pelo `hash`.
- `tipo_comando`/`alvo` sem validação de catálogo; `schema_version` aceito do cliente (só `1` passa, ok).
- `Executor.executar` engole `Exception` ao resolver habilidade para `prompt_template` (`except Exception: pass`).
- Se o prompt Jinja referenciar `entrada.observacoes`, o campo nunca é passado (`criar_post.py` não o repassa).

---

## C. Dívida técnica e higiene do repositório

| ID | Sev. | Item | Evidência |
|----|------|------|-----------|
| DEBT-01 | P1 | **Zero testes automatizados** e **sem CI** (`.github/` inexistente). Todo o desenvolvimento aconteceu em 4 dias sem rede de segurança. | ✅ |
| DEBT-02 | P2 | **97 arquivos `__pycache__/*.pyc` versionados** (Python 3.13); `.gitignore` não cobre Python. | ✅ `git ls-files \| grep -c pyc` |
| DEBT-03 | P2 | **ESLint com 158 problemas** (141 auto-corrigíveis). Sem *pre-commit*. | ✅ |
| DEBT-04 | P2 | Backend sem lint/format/typecheck configurados de fato (`ruff` só como bloco vazio; sem `mypy`/`pyright`). | 🔎 |
| DEBT-05 | P2 | Documentação desatualizada/contraditória (ver doc 3 §4); dois nomes de produto (D-01). | ✅ |
| DEBT-06 | P2 | `Dashboard.tsx` morto; mocks (`FUNCIONARIOS_DIGITAIS`) apresentados como dados reais no Command Center. | 🔎 |
| DEBT-07 | P2 | Frontend sem *code splitting* (1 chunk de 680 kB); sem tratamento global de erro (Error Boundary); sem testes (Vitest/Playwright). | ✅ build |
| DEBT-08 | P2 | Dois mecanismos de telemetria sobrepostos (`execucoes` do Executor × `ia_execucoes` do roteador) sem chave de correlação entre si (o `correlacao_id` do Comando não chega ao roteador). | 🔎 |
| DEBT-09 | P3 | `executor/pipeline.py` vazio (placeholder); `eventos/` sem consumidor; esqueletos S3/MinIO/Supabase. Aceitável, mas documentar. | 🔎 |
| DEBT-10 | P3 | Código com `import` tardio dentro de funções para evitar ciclos (roteador ↔ catálogo ↔ métricas ↔ health), sinal de acoplamento a revisar. | 🔎 |
| DEBT-11 | P3 | `docker-compose.yml` monta `./:/app` (dev) sem variante de produção; `fly.toml` com `min_machines_running=0` incompatível com jobs agendados. | 🔎 |
| DEBT-12 | P3 | Princípio 4 do plano violado: a habilidade grava diretamente no storage. Decidir: ajustar o princípio ("habilidade pode escrever via serviço de `Saída`") ou criar um `SaidaServico` injetado no `Contexto`. | 🔎 |

---

## D. Riscos de produto / negócio

| ID | Risco | Mitigação |
|----|-------|-----------|
| RISK-01 | **Dependência de IA "grátis"**: free tiers mudam, limitam taxa e podem proibir uso comercial/revenda. A promessa central ("juntar IA grátis") pode não ser sustentável. | Camada de custo/limites por empresa, BYOK, ter 1 provedor pago como base, revisar termos de uso de cada free tier. |
| RISK-02 | **Escopo "sistema operacional" muito amplo** (automação + IA + conhecimento + funcionários + fluxos). Risco de seguir construindo plataforma sem cliente. | Escolher **um nicho/caso de uso** para validar (doc 5) e só generalizar depois. |
| RISK-03 | **Publicação em redes sociais** exige apps aprovados (Meta App Review), tokens por empresa e respeito aos termos; automação pode gerar banimento. | Começar com "gerar + revisar + baixar/copiar"; publicação com aprovação humana; OAuth por empresa depois. |
| RISK-04 | **LGPD**: prompts/conteúdos de empresas passam por terceiros (Google, Groq, etc.) e podem ser retidos/treinados dependendo do plano. | Política de privacidade, opção por provedor, retenção configurável, DPA com provedores. |
| RISK-05 | **Qualidade de saída não medida**: sem avaliação, não se sabe se o roteador degrada qualidade ao priorizar gratuito. | Conjunto de prompts de referência + avaliação manual/LLM-judge por missão. |
| RISK-06 | **Operação por uma pessoa + Lovable**: mudanças geradas pelo Lovable podem reintroduzir problemas (sem testes/CI não há como detectar). | CI obrigatória (build + lint + testes) antes de aceitar merges. |
