# 15 — Modos de distribuição, hospedagem (Fly.io + Cloudflare) e "conectores"

> Reação do dono ao doc 13 (05/10/2026): rodar o que der em Cloudflare e **o resto no Fly.io (máquina pequena, 256 MB)**; ter **serviços/conectores** (ex.: WhatsApp) que a pessoa liga; **rodar local** na máquina do cliente; expor um **MCP seguro**; avaliar o **OmniRoute**. Este documento organiza tudo isso. Números marcados ⚠️ vêm de fontes secundárias ou de estimativa.

## 1. Três modos de distribuição (mesma base de código)

| Modo | Quem opera | Para quem | Banco | Observações |
|------|-----------|-----------|-------|-------------|
| **A. Nuvem (SaaS multi-empresa)** | Nós | Quem quer abrir o navegador e usar | Postgres (Neon/Fly/VPS) | Exige isolamento, cobrança, papéis, quotas (Fases 2–3). Modelo de negócio principal. |
| **B. Local (a pessoa baixa e roda)** | O cliente | Autônomo/técnico; privacidade; zero custo de infra para nós | Postgres embutido ou SQLite (ver §3) | **BYOK natural** (chaves ficam na máquina). Combina com MCP local e OmniRoute local. |
| **C. Auto-hospedado (VPS do cliente)** | O cliente/agência | Quem quer 24 h online sem nós | Postgres no mesmo servidor | Igual ao A, porém **uma única empresa**. É o mesmo `docker compose`. |

**Decisão de arquitetura (recomendada):** manter **um só código** e tratar B/C como "A com uma empresa". Um interruptor `CAETUS_MODO=local|nuvem` ajusta o que muda: registro/cadastro aberto (off no local), login automático/token em arquivo, bind em `127.0.0.1`, sem cobrança, sem painel de admin da plataforma. **Não** reescrever o domínio.

### Sobre D-04 (modelo de usuário × empresa) — pode esperar
O dono está certo: depende do modelo de negócio. **Nada do que vem agora depende disso** (modo local = 1 empresa; conectores e MCP usam chave de API da empresa). Recomendação: **adiar** D-04 até o primeiro piloto com agência; quando chegar, a tabela `membros(usuario_id, empresa_id, papel)` entra por migração aditiva (não precisa ser decidida antes). Os papéis (T-007) ficam atrás disso.

## 2. Hospedagem: o que vai onde

```
Cloudflare Pages ── frontend estático (grátis)
Cloudflare DNS/proxy/WAF ── frente da API
Cloudflare Worker ── (futuro) MCP remoto / webhooks de entrada / rate limit
Cloudflare R2 (+ Backblaze B2) ── arquivos (imagens, anexos)
Fly.io ── API FastAPI (1 máquina) + conectores (máquinas separadas)
Neon (ou Postgres no Fly) ── banco
```

### 2.1 Fly.io — o que o levantamento mostrou
- **Sem camada gratuita** hoje (a antiga ficou só para contas antigas ⚠️). Preço de referência da `shared-cpu-1x` com **256 MB: ≈ US$ 2,19/mês**; volume persistente US$ 0,15/GB/mês ⚠️ ([Fly — preços](https://fly.io/pricing/), [docs](https://docs.fly.io/about/pricing)). Ou seja, **o primeiro custo fixo é de poucos dólares** — bem abaixo do que eu estimei para VPS no doc 13.
- **Medi o consumo da API aqui** (uvicorn, 1 processo, Postgres local, provedores simulados): **96 MB ociosa → 100 MB após registrar e gerar 3 posts**. Portanto **256 MB é viável para a API sozinha, com 1 worker**. ⚠️ Não medi com os SDKs reais carregados (Gemini etc.), que somam dezenas de MB — deixe **512 MB** (já está no `fly.toml`) enquanto não houver medição real em produção, e só reduza depois (T-217).
- **Não coloque conectores pesados (WhatsApp/Baileys) na mesma máquina da API**: se um cair ou vazar memória, derruba o produto. Cada conector = **máquina própria** (barata) com volume para o estado de sessão.
- Armadilhas já conhecidas (doc 7 / D-07): jobs agendados exigem `min_machines_running ≥ 1`; storage em filesystem local limita a 1 máquina → **R2/S3 (T-205)**; migrações no deploy (já rodam no `CMD`).

### 2.2 Onde Cloudflare Workers ajuda (e onde não)
| Cabe em Workers (grátis, 10 ms CPU) | Não cabe |
|-------------------------------------|----------|
| MCP remoto (proxy para a API) | A API FastAPI inteira (driver `psycopg` não roda; ver doc 13) |
| Receber webhooks (WhatsApp Cloud API, Stripe/Mercado Pago) e repassar à fila/API | Processos longos/stateful (sessão WhatsApp via Baileys: conexão WebSocket persistente) |
| Rate limit, cache, URLs assinadas de arquivos (R2) | Geração pesada de imagem/vídeo |
| Agendamento (Cron Triggers) acionando endpoints | |

## 3. Modo local: como seria

| Opção | Esforço | Prós | Contras |
|-------|---------|------|---------|
| **L1. `docker compose up`** (API + Postgres + front) | Baixo (já existe compose) | Mesmo banco da nuvem, zero divergência | Exige Docker; público técnico |
| **L2. SQLite no modo local** | Médio-alto: hoje o domínio usa JSONB/UUID nativos do Postgres; seria preciso tipos portáveis e testar nos dois bancos | Instala "como app", sem Docker | Dois bancos para manter |
| **L3. Postgres embutido** (binário portátil gerenciado pelo launcher) | Médio | Mesmo banco, sem Docker | Empacotamento por sistema operacional |
| **L4. App desktop** (Electron/Tauri) sobre L2/L3 | Alto | Experiência de "programa" | Só vale com demanda comprovada |

**Recomendação:** começar por **L1** (T-221) — é o que dá para entregar rápido e valida o interesse; decidir L2/L3 depois de ver quem de fato usa local. No local, o **MCP stdio** (`mcp-server/`) já funciona e o cliente pode apontar Claude Code/Codex/OpenCode para ele.

## 4. Conectores ("serviços" que a pessoa liga)

Ideia do dono: o Caetus OS como **distribuidor de serviços úteis prontos** — a pessoa **instala o que precisa** e conecta. Proposta de modelo (detalhes de catálogo no doc 16):

- **Conector** = serviço **separado do núcleo** (processo/máquina própria) que fala com o núcleo por **API + webhook assinado**, autenticado por **chave de API da empresa** (T-213). Exemplos: WhatsApp, Google (Sheets/Drive/Calendar), e-mail, redes sociais.
- **Pacote/Receita** = manifesto (YAML) que declara: habilidades, passos/gatilhos, conectores exigidos, campos de configuração e se usa IA. "Instalar" = ativar o pacote e pedir só as credenciais que faltam. É a evolução do **manifesto de habilidades** (já existe) e das **Receitas** do doc 11.
- **Isolamento:** cada conector só acessa **uma empresa** (a da chave). Credenciais do conector ficam no **cofre** (mesmo Fernet do BYOK).

### WhatsApp: duas rotas, riscos muito diferentes
| | **API oficial (WhatsApp Business Cloud API)** | **Não oficial (Baileys / WhatsApp Web)** |
|---|---|---|
| Conformidade | Dentro dos termos da Meta | **Viola os termos** do WhatsApp |
| Risco | Estável; exige número comercial, aprovação e **templates** para iniciar conversa; tem custo por conversa | Fontes apontam **risco alto de banimento permanente do número** (semanas a meses) ⚠️ ([1](https://www.adviseai.in/blog/whatsapp-automation-ban-risk), [2](https://whatsapp.checkleaked.cc/blog/whatsapp-cloud-api-vs-unofficial)) |
| Infra | **Só webhooks** → cabe num Worker/API, sem processo persistente | Processo Node com WebSocket persistente + volume (leve em RAM, ⚠️) |
| Política de IA | Meta restringiu **chatbots de IA de uso geral** na API oficial a partir de 2026 ⚠️ ([notícia](https://gulfnews.com/technology/no-more-chatgpt-and-perplexity-on-whatsapp-meta-bans-major-ai-chatbots-from-2026-1.500316016)); atendimento de **negócio específico** segue permitido — **verificar o texto atual da política antes de lançar** | — |

**Minha recomendação:** produto padrão usa a **API oficial**; Baileys só como conector **opcional, desligado por padrão, com aviso claro** "uso por sua conta e risco; pode banir seu número" — e **nunca** com o número principal da empresa. Decidir isso é **D-14**. Por LGPD/consentimento, mensagens em massa/frias ficam fora do escopo.

## 5. MCP seguro (resposta ao ponto do dono)

Para IAs externas (Claude Code, Codex, ChatGPT) falarem com o Caetus OS com segurança:
1. **Local:** `mcp-server/` via stdio (já pronto). Escopo = a empresa da chave.
2. **Remoto (HTTP):** endpoint MCP atrás de **chave de API com escopos, expiração e rate limit** (T-213) — implementado no próprio backend ou num **Worker** (T-214). Clientes web (ChatGPT/Claude) normalmente exigem **MCP remoto + OAuth** ⚠️ (verificar no momento da implementação) → entra em T-214.
3. **Regras:** nenhuma ferramenta expõe segredo/BYOK; entrada validada pelo `entrada_schema` do manifesto; log de cada chamada por chave; ferramentas destrutivas exigem confirmação; conteúdo do conhecimento devolvido como **dados** (mitigação de *prompt injection*).

## 6. Resumo de decisões novas

| ID | Decisão | Recomendação |
|----|---------|--------------|
| D-04 | Modelo usuário×empresa | **Adiar**; entra por migração aditiva quando houver piloto com agência |
| D-07 | Hospedagem | **Fly.io** (API 256–512 MB + conectores em máquinas próprias) + Cloudflare (Pages/R2/Worker de borda) + Neon |
| D-13 | Modos de distribuição | Um código, flag `CAETUS_MODO`; começar por **local via docker compose** (L1) |
| D-14 | WhatsApp | **API oficial** como padrão; Baileys só opcional com aviso |
| D-15 | OmniRoute | Provedor opcional (doc 17); não substitui o roteador |
