# 13 — Viabilidade: infraestrutura quase gratuita (Cloudflare + Neon + R2/B2) e quantos usuários cabem

> Pergunta do dono (05/10/2026): dá para rodar o Caetus OS em Cloudflare Workers + Neon + buckets (R2/Backblaze) aproveitando o plano gratuito, e **até onde isso vai** antes de ter custo?
> **Método:** limites dos planos levantados por busca na web em 05/10/2026 (os sites oficiais do Google estavam bloqueados neste ambiente; vários números vêm de blogs que citam a documentação → marcados com ⚠️ "confirmar no painel do provedor"). As contas de capacidade abaixo são **estimativas com premissas explícitas**, não medições.

## 1. Resposta curta

1. **Dá para validar o produto quase de graça** (dezenas de usuários), mas **não com a API em Cloudflare Workers hoje**: o backend é FastAPI + SQLAlchemy + `psycopg`, e Python Workers não suportam `psycopg`/SQLAlchemy assíncrono (só `pg8000` via Hyperdrive) e têm 10 ms de CPU no plano grátis. Portar custaria semanas e traria risco, sem ganho real.
2. **O que cabe de graça e faz sentido:** frontend (Cloudflare Pages), arquivos (R2 e/ou Backblaze B2), banco (Neon), e a **borda/MCP remoto em Workers** (proxy leve, que cabe nos 10 ms).
3. **O primeiro custo real e inevitável é onde a API roda** (uma VPS pequena, ~US$ 5–7/mês ⚠️) — ou, alternativamente, um plano pago do Neon se o banco ficar sempre acordado. Como o modelo é **BYOK**, **a IA não custa nada para a plataforma**; os únicos custos que crescem com o uso são **armazenamento de imagens** e **horas de banco**.
4. **O primeiro limite que você vai bater é armazenamento (imagens), depois horas de computação do Neon — não CPU/concorrência.**

## 2. Limites levantados (05/10/2026)

| Serviço | Limite gratuito | Fonte / observação |
|---------|-----------------|--------------------|
| **Cloudflare Workers** | 100.000 req/dia; **10 ms de CPU** por requisição (espera de `fetch`/DB não conta); 50 subrequests externas e 1.000 a serviços Cloudflare por invocação; bundle 3 MB | [Docs de limites](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/workers/platform/limits.mdx), [changelog](https://developers.cloudflare.com/changelog/2026-02-11-subrequests-limit) |
| **Python Workers** | GA; mesmos limites; **SQLAlchemy assíncrono não suportado**; síncrono só via Hyperdrive com `pg8000` (**`psycopg` não funciona**: precisa de libpq); Hyperdrive grátis: 100k queries/dia | ⚠️ resumos de terceiros: [1](https://creuto.com/cloudflare-python-workers-ga-fastapi-django), [2](https://dmarketertayeeb.com/blog/cloudflare-python-workers-ga-compatibility-guide/) |
| **Neon** | por projeto: **100 CU-horas/mês**, **1 GB** de storage, 5 GB de transferência; escala a zero após 5 min parado; até 2 CU; 100 projetos | [FAQ de limites do Neon](https://neon.com/faqs/free-plan-limits-and-quotas) ⚠️ |
| **Cloudflare R2** | 10 GB, 1 M operações classe A, 10 M classe B por mês; **egress grátis** | [Preços R2](https://developers.cloudflare.com/r2/pricing/) |
| **Backblaze B2** | 10 GB; 1 GB/dia de download grátis; egress **grátis via Cloudflare** (Bandwidth Alliance) | ⚠️ [comparativo](https://speedtesthq.com/compare/cloudflare-r2-vs-backblaze-b2) |
| **Gemini API** | **Cota por projeto Google Cloud, não por chave** (várias chaves no mesmo projeto dividem a cota). **Geração de imagem na API geralmente não tem camada gratuita** (exige cobrança ativa) — limites reais só aparecem no AI Studio | ⚠️ [Fórum Google](https://discuss.ai.google.dev/t/are-the-gemini-api-limits-per-project-account-or-per-key/92758), [guia](https://www.aifreeapi.com/en/posts/gemini-image-generation-free-tier) |

## 3. Quantos usuários cabem (estimativa)

**Premissas (ajustáveis):** usuário ativo = 5 gerações/dia em ~15 dias/mês (≈ 20 posts/mês) e ~60 chamadas de API/dia de navegação; imagem ≈ 500 KB (PNG/JPEG do provedor) ou ≈ 100 KB se convertida para WebP; DB acordado nas horas comerciais.

| Gargalo | Conta | Resultado |
|---------|-------|-----------|
| **Armazenamento de arquivos** | 20 posts/mês × 0,5 MB = **10 MB/usuário/mês**. R2 10 GB → ~1.000 usuário-meses. Com retenção de 6 meses: **~170 usuários** por 10 GB. Com WebP (100 KB): ~850. Com R2 + B2 (20 GB): dobra | **1º limite.** Mitigação: converter p/ WebP, cota por empresa, retenção, 2º bucket |
| **Neon (horas de banco)** | 100 CU-h ÷ 0,25 CU mín. ⚠️ = **~400 h/mês** de banco acordado (~55% do mês). Uso comercial diário de ~14 h × 30 = 420 h → **estoura com uso contínuo** | **2º limite.** Com API sempre ligada fazendo ping/health, o banco nunca dorme. Mitigação: não acordar o banco à toa (health agendado só em horário de uso), ou pagar o plano Launch, ou Postgres na própria VPS |
| **Armazenamento de banco** | 1 GB. Cada execução de IA ≈ 1–2 KB de telemetria → ~500 mil execuções. Imagens **não** vão ao banco | Folgado por meses; precisa de retenção de telemetria (T-110) |
| **Concorrência da API** | Endpoints `def` rodam em *threadpool* (40 threads por processo). IA é espera de rede (não gasta CPU): 1 processo ≈ 40 gerações simultâneas; com post de ~20 s → ~2 gerações/s ≈ **170 mil/dia** | **Não é limite** para a escala desta fase |
| **Workers 100k req/dia** (só se a API fosse lá) | 100.000 ÷ 60 chamadas = **~1.600 usuários ativos/dia** | Largo — mas inviável de usar hoje por causa do driver |

**Leitura honesta:** com a API numa VPS barata + Neon/Postgres + R2 e **WebP + cota de armazenamento por empresa**, o custo fixo fica em **uma VPS** até **algumas centenas de empresas ativas**. Acima disso o custo cresce devagar (banco pago de ~US$ 19/mês no Neon Launch ⚠️ e armazenamento a ~US$ 0,015/GB). Isso é muito menor que a mensalidade de qualquer plano que você cobre. Recomendação: **cobrar desde o início do piloto** (mesmo simbólico) — o objetivo não é "custo zero eterno", é "custo marginal por cliente ≈ centavos".

> ⚠️ **Não recomendado:** espalhar clientes em vários projetos gratuitos (Neon ×100, Gemini ×N) para "multiplicar" cota. Em geral viola os termos de uso desses serviços e quebra de uma hora para outra com cliente pagante dentro. Projetos separados só quando representam fronteira real (cliente, cobrança, ambiente).

## 4. Arquitetura sugerida (mapa)

```
Navegador ──► Cloudflare Pages (frontend estático)       grátis
                │
                ├─► api.caetus…  ──► Cloudflare (DNS/proxy/WAF) ──► VPS pequena: FastAPI  (1º custo)
                │                                                      ├─► Postgres (Neon grátis → VPS/Launch depois)
                │                                                      └─► R2 / Backblaze B2 (arquivos, via S3 API)
                │
Agentes (Claude, ChatGPT, OpenCode) ─► MCP remoto em Cloudflare Worker (proxy leve, cabe no plano grátis) ─► mesma API
```
- **Cloudflare Workers** entram onde brilham: borda, rate limit, proxy do MCP, jobs leves — não rodando o monolito Python.
- **Storage:** implementar o `StorageBackend` S3-compatível (T-205) e escolher R2 (padrão) com B2 como segundo destino/cold storage. URLs assinadas curtas; **nunca** bucket público com dados de cliente.
- **Hospedagem da API (D-07):** compare (a) VPS pequena com Docker (previsível, ~US$ 5–7 ⚠️), (b) Oracle Cloud "Always Free" ARM (grátis, mas disponibilidade/cadastro variam ⚠️), (c) Fly.io (já configurado; sem camada grátis para app sempre ligado ⚠️). Sugestão: **(a)** para começar.
- **Fila de jobs / agendamento** (futuro): Cloudflare Queues/Cron Triggers acionando a API, ou worker na própria VPS.

## 5. Geração de imagem: provedores e ordem (decisão do dono)

O dono avaliou que **Cloudflare (FLUX schnell) é a pior opção de qualidade** — concordo e o roteador foi ajustado (05/10): ordem padrão de imagem **Gemini (110) > Fal (100) > Hugging Face (70) > Cloudflare (40, último recurso gratuito)**. O que cada cliente tem configurado é o que vale (BYOK).

- **Gemini imagem** (`gemini-2.5-flash-image`, configurável em `GEMINI_IMAGE_MODEL`) foi adicionado como adaptador. ⚠️ Não testado contra a API real.
- **Sobre "até 20 projetos no Gemini, um só para imagem":** (1) **não consegui confirmar o número 20** — o Google não publica isso no que pude acessar; (2) a cota é **por projeto**, então **um projeto dedicado a imagens é uma separação legítima** (cota, cobrança e revogação independentes de texto/imagem) — isso está escrito no aviso do cartão do Gemini na tela Provedores; (3) **criar projetos para burlar o limite** tende a violar os termos do Google (não consegui abrir o texto oficial; fontes secundárias dizem isso) — a UI avisa e o produto não deve incentivar; (4) **imagem pela API normalmente exige chave com cobrança ativa** — não prometa "imagem grátis no Gemini" na landing page.

## 6. Próximos passos técnicos (novas tarefas)

| ID | Tarefa | Esforço |
|----|--------|---------|
| T-205 | (já existia) `StorageBackend` S3 (R2/B2), URLs assinadas, migração | L |
| T-215 | **Cota de armazenamento por empresa** + conversão para **WebP** + retenção configurável | M |
| T-216 | **Health agendado só em horário de uso** / `IA_HEALTH_SCHEDULER_ENABLED` consciente do Neon (não manter o banco acordado) | S |
| T-217 | Medir de verdade: script de carga simples + painel de custo/uso por empresa (alimenta T-110/T-203) | M |
| D-07 | Decidir hospedagem da API (VPS × Oracle × Fly) | — |
