# Documentação do caetusOS

> Levantamento feito em **05/10/2026**, retomando o projeto após ~3 meses parado
> (último commit: 01/07/2026; 137 commits — 136 deles em apenas 4 dias, de 28/06 a 01/07/2026).

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

## Resumo em 10 linhas

- **O que é:** um "sistema operacional" multi-empresa onde cada empresa cadastra identidade de marca,
  base de conhecimento e memória, e executa **habilidades** (hoje: criar post com imagem) por meio de
  um **Executor** central, com um **roteador de IA** que escolhe provedor/modelo (priorizando os gratuitos/baratos) e faz fallback.
- **Maturidade:** protótipo avançado. O ciclo *registrar → conhecimento → executar → resultado* **funciona de ponta a ponta**
  no backend (testado), mas **não está pronto para usuários reais**.
- **Bloqueios imediatos (P0):**
  1. **Chaves de API reais estão no histórico do Git** (Groq, Gemini, OpenRouter, HuggingFace, Fal, Replicate + JWT) — precisam ser **revogadas/rotacionadas**.
  2. **Login quebrado** (`POST /v1/auth/login` → 500) — só o registro funciona.
  3. **Qualquer erro de habilidade vira 500** (bug no tratador de erro) e a execução falha não é gravada.
  4. **Vazamento entre empresas**: telemetria de IA de todas as empresas é visível a qualquer usuário; qualquer usuário altera o modo global do roteador e dispara benchmark com as chaves da plataforma.
- **Planejado vs. feito:** o backend **passou muito do plano congelado v6.1** (roteador por catálogo/missões/pesos, health-check,
  telemetria, Command Center), mas **faltam partes básicas do Sprint 0 no frontend** (Identidade, Memória, Assets) e **não há testes nem CI**.
- **Recomendação:** estabilizar (Fase 0) → fechar o ciclo utilizável (Fase 1) → escolher **um nicho para validar** em cima de um **núcleo geral** (ver doc 5).

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
