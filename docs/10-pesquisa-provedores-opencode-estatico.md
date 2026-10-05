# 10 — Pesquisa: provedores de IA (BYOK), OpenCode e "sistema estático"

> Pesquisa feita em 05/10/2026 a pedido do dono do projeto. **Fontes:** buscas na web (links ao final). Acesso direto às páginas de documentação foi bloqueado no ambiente, então os números abaixo vêm de **resumos de buscas e de sites de terceiros** — confirmar nas páginas oficiais antes de decidir preço/termos. Itens não verificados estão marcados com ⚠️.

## 1. Provedores que o cliente vai poder usar (BYOK)

Lista informada: **Gemini, Groq, Mistral, OpenRouter, NVIDIA, Cloudflare (Workers AI)**.

> ⚠️ O pedido dizia "Grok". O código já tem **Groq** (inferência rápida de modelos abertos, `console.groq.com`). **Grok** é outra coisa (xAI). Assumi **Groq**; se for também o Grok da xAI, entra pelo mesmo adaptador genérico abaixo.

| Provedor | O que oferece para o Caetus OS | Camada gratuita (segundo as fontes) | Cuidados |
|----------|-------------------------------|-------------------------------------|----------|
| **Google Gemini** | Texto, visão, OCR, contexto longo | Tem camada gratuita com limites (consultar AI Studio) | Já tem adaptador. Dados na camada gratuita podem ser usados para melhoria dos produtos — conferir termos |
| **Groq** | Chat/texto muito rápido (modelos abertos) | Camada gratuita com limites de taxa | Já tem adaptador |
| **Mistral (La Plateforme)** | Chat/texto, modelos próprios | Plano **Experiment** gratuito: ~1B tokens/mês, ~1 req/s por modelo (⚠️ números de sites de terceiros; o limite real aparece no Admin Console) | **Requisições no plano gratuito podem ser usadas para treinar modelos da Mistral** → avisar o cliente na tela de chaves (LGPD/confidencialidade) |
| **OpenRouter** | Porta única para muitos modelos (inclui alguns gratuitos) | Modelos `:free` com limites | Já tem adaptador |
| **NVIDIA NIM (build.nvidia.com)** | 100+ modelos abertos via API **compatível com OpenAI** | ~1.000 créditos ao entrar no Developer Program, **40 req/min**, sem aumento oficial no plano gratuito | Foco em desenvolvimento/prototipagem — ⚠️ checar se uso comercial é permitido nos termos |
| **Cloudflare Workers AI** | Texto **e imagem (FLUX.1 schnell)** | **10.000 "neurons"/dia** grátis (reseta 00:00 UTC); FLUX schnell ≈ US$ 0,0006/imagem (~500 imagens/dia em 1024²); ao estourar, **bloqueia** (sem cobrança surpresa) | Já há suporte do caetusClaude (`image-generator` com Cloudflare) para reaproveitar. Precisa de **Account ID + API Token** (duas credenciais) |

### Conclusão técnica: um adaptador "compatível com OpenAI" resolve quase tudo
Groq, Mistral, OpenRouter, NVIDIA NIM e (⚠️) Gemini e Cloudflare expõem endpoints **no formato OpenAI** (`/v1/chat/completions`). Em vez de um adaptador novo por provedor, o backend deve ter **um `OpenAICompatProvider(base_url, api_key, modelo)`** configurado por dado (tabela de provedores). Adaptadores próprios ficam só onde há diferença real: **Gemini (SDK/visão)**, **Fal/Cloudflare imagem (REST próprio)**, **HuggingFace**. Isso reduz o custo de "juntar vários provedores" e é o que torna o BYOK barato de manter.

### Requisitos do BYOK que a pesquisa reforça
- Credencial **por provedor e por empresa**; Cloudflare precisa de **2 campos** → o modelo de credencial deve ser um **conjunto de campos** (`{api_key, account_id}`), não uma string única.
- **Aviso por provedor** na tela: "este plano pode usar seus dados para treino" (Mistral Experiment), limites de taxa (NVIDIA 40 rpm, Cloudflare 10k neurons/dia), onde criar a chave (link).
- O roteador deve tratar **erro 429/limite diário** como motivo de fallback (já trata `rate_limit`/`quota`), e a UI deve mostrar "limite diário do Cloudflare atingido".
- "Testar chave" ao salvar (chamada mínima) — reaproveita `health_check`.

## 2. OpenCode: dá para colocar no sistema?

**O que é:** agente de programação open source que roda no terminal (CLI/TUI). **Importante:** ele também roda **sem interface**: `opencode serve` abre um **servidor HTTP** (padrão `127.0.0.1:4096`) com **especificação OpenAPI** (`/doc`), **SDK JS/TS** (`@opencode-ai/sdk`), endpoints de **sessões** (criar/listar/enviar prompt), proteção por **senha básica** (`OPENCODE_SERVER_PASSWORD`). Ou seja, **não precisa de terminal interativo** para ser integrado.

**O problema não é a integração, é o custo e o risco de hospedar:**
| Aspecto | Impacto |
|---------|---------|
| É um **agente que lê/edita arquivos e executa comandos de shell** num diretório de trabalho | Para vários clientes exige **isolamento por cliente** (sandbox/container por sessão) — senão um cliente atinge o dado/segredo do outro. |
| Processo **longo e com estado** (sessão, workspace em disco) | Incompatível com máquina que dorme (`auto_stop` do Fly) e com 512 MB; cada sessão consome CPU/RAM e disco. |
| Sem VPS (decisão atual) | Vários usuários simultâneos "consumiriam muita carga" — **sua intuição está correta**. |
| Chamadas de LLM | Ele próprio usaria as chaves do cliente (BYOK) — isso é compatível. |

**Opções, da mais barata à mais cara:**
1. **Não hospedar (recomendado para o MVP):** as automações de **conteúdo/marketing** do Caetus OS não precisam de um agente de código: bastam chamadas diretas ao roteador de IA (mais barato, previsível e seguro).
2. **"Traga seu agente" (conector local):** o cliente roda o OpenCode (ou Claude Code) **na própria máquina**, e o Caetus OS expõe suas ações como **MCP/API** para o agente do cliente. Custo zero de infraestrutura para a plataforma; serve usuários técnicos. (Alinha com o caetusClaude.)
3. **Sandbox gerenciado sob demanda:** serviços de sandbox por uso (a pesquisa mostrou o **E2B** com guia para rodar OpenCode) — paga-se por segundo de uso; só para recursos premium.
4. **Pool de workers em VPS própria:** só quando houver receita; exige orquestração de containers e limites por cliente.

**Veredito:** viável tecnicamente (modo servidor), **inviável como funcionalidade padrão sem VPS/sandbox**. Tratar como **spike futuro** (opção 2 primeiro). Se a ideia for "um agente que faz tarefas em computador/arquivos do cliente", avaliar também o que o **caetusClaude** já entrega antes de duplicar.

## 3. "Sistema estático" — o que isso pode significar e o que cabe

Não ficou claro se a pergunta era (a) hospedar **o site** de forma estática/barata ou (b) rodar **o sistema inteiro sem servidor** (tudo no navegador). Cobrindo as duas:

**(a) Frontend estático — já é assim e é o melhor cenário.** O frontend é uma SPA Vite: o resultado do `npm run build` são arquivos estáticos que podem ficar em hospedagem estática gratuita/barata (ex.: Cloudflare Pages, Netlify, Vercel). **O backend continua precisando de um runtime** (FastAPI + Postgres + storage).

**(b) Tudo no navegador (sem backend)** — um **"modo local/lite"**:
| Funciona | Não funciona / limita |
|----------|----------------------|
| Chaves do cliente no `localStorage`/IndexedDB (BYOK puro), chamadas **direto do navegador** aos provedores; histórico e base de conhecimento em IndexedDB; custo de infra ≈ 0 | **CORS:** nem todo provedor aceita chamadas do navegador (⚠️ a verificar um a um); **chaves expostas** a extensões/XSS; **sem multi-dispositivo/equipe**; **sem agendamento** (nada roda com o navegador fechado); sem publicação em redes (precisa de segredo/servidor); armazenamento limitado do navegador |

**Recomendação:** manter **backend** (é o que permite agendamento, equipe, histórico e segredos cifrados) e **hospedar o frontend estático separado**. Um "modo local" pode ser um **experimento posterior** (demo sem cadastro), não o caminho do SaaS. Para hospedar o backend **sem VPS agora**: manter Fly.io (config existente) com `min_machines_running=1` assim que houver agendamento; Postgres gerenciado gratuito/barato; storage S3-compatível (Cloudflare R2/Backblaze) em vez de volume local (T-205).

## 4. Impacto no roadmap
- **T-116 (novo):** adaptador genérico **OpenAI-compatível** configurável por dado + catálogo com Mistral, NVIDIA NIM, Cloudflare (texto) e Groq/OpenRouter migrados para ele.
- **T-117 (novo):** adaptador **Cloudflare Workers AI imagem** (FLUX schnell) reaproveitando o que o caetusClaude já fez; credencial com `account_id`.
- **T-114 (BYOK)** passa a modelar credenciais como **conjunto de campos** e a exibir **avisos por provedor** (treino de dados, limites).
- **T-118 (spike, depois):** "traga seu agente" — expor ações do Caetus OS via **MCP/API** para agentes locais (OpenCode/Claude Code).
- **T-119 (spike, depois):** modo "local/lite" 100% navegador (CORS, armazenamento) — só se houver demanda.

## Fontes
- [OpenCode — Server (docs)](https://opencode.ai/docs/server/) · [OpenCode — CLI](https://opencode.ai/docs/cli/) · [Opencode Server — Headless API](https://www.opencode.asia/server/) · [OpenCode no E2B](https://e2b.dev/docs/agents/opencode)
- [Cloudflare Workers AI — preços](https://developers.cloudflare.com/workers-ai/platform/pricing/index.md) · [Workers AI free tier (itsfree.dev)](https://itsfree.dev/tools/cloudflare-workers-ai) · [FLUX no Workers AI (brand-kit #62)](https://github.com/rtorcato/brand-kit/issues/62)
- [Mistral — plano Experiment (help)](https://help.mistral.ai/en/articles/450104-how-can-i-try-the-api-for-free-with-the-experiment-plan) · [Mistral free tier (pricepertoken)](https://pricepertoken.com/endpoints/mistral/free)
- [NVIDIA NIM free API 2026 (yangmao.ai)](https://yangmao.ai/en/compute/nvidia-nim/) · [Fórum NVIDIA — limite de RPM](https://forums.developer.nvidia.com/t/request-to-increase-rpm-limit-for-free-nvidia-nim-account/377451)
