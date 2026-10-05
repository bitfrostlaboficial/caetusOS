# Documentação do caetusOS

> Levantamento feito em **05/10/2026**, retomando o projeto após ~3 meses parado
> (`main`: último commit 01/07/2026; 137 commits — 136 em apenas 4 dias, de 28/06 a 01/07/2026. A branch **`no_lovable`** tem trabalho até **05/07/2026** — ver doc 9).
>
> ⚠️ Os docs 02–08 descrevem a **`main`**. As diferenças da `no_lovable` (verificadas rodando o backend dela) estão no doc 9.

Esta pasta existe para que **qualquer pessoa (ou agente de IA) consiga pegar o projeto e entender:
o que ele é, como está hoje, o que está quebrado e para onde ele precisa ir.**

## Ordem de leitura

| # | Documento | Responde a |
|---|-----------|-----------|
| 1 | [`01-visao-e-contexto.md`](./01-visao-e-contexto.md) | O que é o caetusOS? Qual o problema, a tese e os pilares? Glossário. |
| 2 | [`02-arquitetura-atual.md`](./02-arquitetura-atual.md) | Como o sistema é construído hoje (backend, frontend, fluxo de execução, dados, API, infra). |
| 3 | [`03-estado-atual.md`](./03-estado-atual.md) | O que **existe**, o que é **parcial**, o que **não existe** — contra o plano v6.1 e contra um SaaS. Inclui o que foi **testado de verdade**. |
| 4 | [`04-problemas-e-riscos.md`](./04-problemas-e-riscos.md) | Bugs confirmados, falhas de segurança e dívidas técnicas, com severidade e evidência. |
| 5 | [`05-produto-nichos-e-go-to-market.md`](./05-produto-nichos-e-go-to-market.md) | Produto geral vs. nichos; recomendação de como começar a usar/vender. |
| 6 | [`06-roadmap-e-tarefas.md`](./06-roadmap-e-tarefas.md) | Backlog priorizado (IDs, esforço, dependências) por fase. |
| 7 | [`07-guia-de-desenvolvimento.md`](./07-guia-de-desenvolvimento.md) | Como subir, testar, adicionar uma habilidade, convenções e armadilhas. |
| 8 | [`08-decisoes-pendentes.md`](./08-decisoes-pendentes.md) | Decisões que dependem do dono do projeto antes de seguir. |
| 9 | [`09-branches-e-ecossistema.md`](./09-branches-e-ecossistema.md) | **Leia junto com o doc 3:** a branch mais nova (`no_lovable`), o que ela muda, e a divisão caetusClaude × caetusOS. |
| 10 | [`10-pesquisa-provedores-opencode-estatico.md`](./10-pesquisa-provedores-opencode-estatico.md) | Pesquisa: provedores do BYOK (Gemini, Groq, Mistral, OpenRouter, NVIDIA, Cloudflare), OpenCode e "sistema estático". |
| 11 | [`11-ideias-automacao-visual.md`](./11-ideias-automacao-visual.md) | Ideias: automação visual e fácil (Receitas/Passos, com IA e sem IA), agentes, gatilhos, roteiro. |
| 12 | [`12-progresso.md`](./12-progresso.md) | Registro do que já foi corrigido/implementado no código (atualizado a cada iteração). |
| 13 | [`13-viabilidade-infra-gratuita.md`](./13-viabilidade-infra-gratuita.md) | Cloudflare + Neon + R2/B2: o que cabe de graça, quantos usuários, onde está o 1º custo; ordem dos provedores de imagem. |
| 14 | [`14-mcp.md`](./14-mcp.md) | Caetus OS como servidor MCP ("traga seu agente"): o que existe, segurança, roadmap. |
| 15 | [`15-distribuicao-e-hospedagem.md`](./15-distribuicao-e-hospedagem.md) | Modos (nuvem/local/auto-hospedado), Fly.io + Cloudflare, conectores (WhatsApp), MCP seguro. |
| 16 | [`16-catalogo-de-servicos-e-automacoes.md`](./16-catalogo-de-servicos-e-automacoes.md) | Catálogo vivo de serviços/automações (existentes e futuros) e pacotes. |
| 17 | [`17-omniroute.md`](./17-omniroute.md) | OmniRoute: o que é e como integrar sem perder o BYOK por empresa. |

## Resumo em 10 linhas

- **O que é:** um "sistema operacional" multi-empresa onde cada empresa cadastra identidade de marca,
  base de conhecimento e memória, e executa **habilidades** (hoje: criar post com imagem) por meio de
  um **Executor** central, com um **roteador de IA** que escolhe provedor/modelo (priorizando os gratuitos/baratos) e faz fallback.
- **Maturidade:** protótipo avançado. O ciclo *registrar → conhecimento → executar → resultado* **funciona de ponta a ponta**
  no backend (testado), mas **não está pronto para usuários reais**.
- **Bloqueios imediatos (P0):**
  1. **Chaves de API reais estão no histórico do Git de um repositório PÚBLICO** (Groq, Gemini, OpenRouter, HuggingFace, Fal, Replicate + JWT) — devem ser tratadas como **comprometidas e revogadas/rotacionadas já**.
  2. **Login quebrado** (`POST /v1/auth/login` → 500) — só o registro funciona.
  3. **Qualquer erro de habilidade vira 500** (bug no tratador de erro) e a execução falha não é gravada.
  4. **Vazamento entre empresas**: telemetria de IA de todas as empresas é visível a qualquer usuário; qualquer usuário altera o modo global do roteador e dispara benchmark com as chaves da plataforma.
- **Planejado vs. feito:** o backend **passou muito do plano congelado v6.1** (roteador por catálogo/missões/pesos, health-check,
  telemetria, Command Center), mas **faltam partes básicas do Sprint 0 no frontend** (Identidade, Memória, Assets) e **não há testes nem CI**.
- **Há duas trilhas:** este repo (**caetusOS**, SaaS) e o **caetusClaude** (versão semi-automática com agentes, separada em 05/07/2026 para o repositório `CaetusSystems/CaetusClaude`, não lido). Ver doc 9.
- **Decisões do dono (05/10/2026):** nome **Caetus OS**; **sem nicho por ora** (nicho será uma camada visual depois); **BYOK** — cada cliente cadastra as próprias chaves de IA (assinatura com IA incluída só no futuro); **publicação em redes sociais fica para depois**; branch oficial **`no_lovable`**; repositório deve ficar **privado** (ação no GitHub).
- **Recomendação:** estabilizar (Fase 0) → fechar o ciclo utilizável **com BYOK** (Fase 1) → só então pensar em nicho/publicação/cobrança (ver docs 5, 6 e 8).

## Convenção de status usada nos documentos

- ✅ **Verificado em execução** — rodei e funcionou.
- 🔎 **Visto no código** — li o código, não executei.
- ⚠️ **Parcial / com ressalva**
- ❌ **Quebrado** (confirmado) ou **ausente**

## Como foi feito o levantamento (e seus limites)

Leitura de todo o backend (`backend/app`, ~7,3 mil linhas de Python) e das partes principais do frontend (`src`, ~5,9 mil linhas fora de `components/ui`),
mais **execução real**: Postgres 16 local, `alembic upgrade head`, API FastAPI (Python 3.12) e chamadas HTTP de ponta a ponta;
no frontend `npm ci`, `tsc --noEmit`, `vite build` e `eslint`.

Limites: **sem chaves de IA** (provedores caíram nos *stubs* embutidos, então qualidade de saída real e latência de provedores **não** foram avaliadas);
**Docker indisponível** no ambiente (compose/Dockerfile/Fly **não** foram exercitados); refresh de token, health-check, benchmark e publicação no Instagram **não foram exercitados**;
o frontend **não** foi aberto num navegador (só compilado).
