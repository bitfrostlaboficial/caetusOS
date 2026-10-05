# 01 — Visão e contexto

## 1. O que é o caetusOS

Um **sistema operacional de automação com IA para empresas**, entregue como **SaaS multi-empresa (multi-tenant)**.
Em vez de o usuário abrir várias ferramentas (ChatGPT, editor de imagem, agendador de posts, Notion...), ele
dá uma **missão** ("criar post sobre o Dia dos Pais") e o sistema:

1. carrega o **contexto da empresa** (identidade de marca, base de conhecimento, memória, histórico);
2. escolhe **qual IA usar** (roteador, priorizando gratuitas/baratas, com fallback automático);
3. executa uma **habilidade** (texto + imagem + persistência + publicação);
4. devolve um **resultado auditável** (o que foi feito, com qual modelo, quanto custou, quanto demorou).

### A tese (juntar quatro conceitos que hoje vivem separados)

| Pilar | Na prática dentro do projeto |
|-------|------------------------------|
| **Automação** | Habilidades/missões executáveis (criar post → gerar imagem → salvar → publicar no Instagram). Futuro: fluxos, agendamento, webhooks. |
| **IA com roteador** | `ia/roteador.py`: catálogo de provedores × categorias × especializações com pesos, perfis, fallback e health-check. Foco em juntar IA gratuita. |
| **Base de conhecimento** | Upload de `.md` por empresa + identidade + memória, injetados em todo prompt (sem RAG ainda). |
| **Funcionários Digitais** | Narrativa de produto: cada missão pertence a um "funcionário" (Marketing, Designer, Atendimento...). Hoje é só **rótulo visual** (ver doc 3). |

### Por que é interessante como SaaS

- O usuário não precisa saber qual modelo usar — **a plataforma escolhe e absorve a complexidade**.
- O **contexto persistente da empresa** é o diferencial vs. um chat genérico: toda saída já nasce com tom de voz e conhecimento corretos.
- **Custo controlável**: o roteador pode priorizar provedores gratuitos (Groq, Gemini free tier, HuggingFace) e só escalar para pagos quando necessário.
- **Auditoria** (`prompt_template`, `prompt_version`, provedor, tokens, custo, latência) — importante para B2B.

## 2. Nomes (inconsistência a resolver)

O projeto tem **dois nomes** espalhados:

| Onde | Nome |
|------|------|
| `index.html`, título da API, UI | **caetusOS** |
| `README.md`, `.lovable/plan.md`, `pyproject.toml` (`empresa-ia-backend`), `fly.toml` (`app = "empresa-ia"`), banco/usuário (`empresa_ia`), chaves do `localStorage` (`empresaia.*`) | **Empresa IA** |
| `package.json` (`tanstack_start_ts`) | nome padrão do template Lovable |

→ Decisão pendente: ver [`08-decisoes-pendentes.md`](./08-decisoes-pendentes.md) (D-01). **Nestes documentos usamos "caetusOS".**

## 3. Origem e forma de trabalho

- Projeto criado e evoluído majoritariamente via **Lovable** (gera commits "Changes"); o autor também faz commits manuais.
- **Regra do repositório** (`AGENTS.md`): *não reescrever histórico publicado* (nada de force-push/rebase/amend em commits já enviados) porque o Lovable sincroniza a branch conectada. Isto tem uma consequência importante para o vazamento de chaves — ver doc 4 (SEC-01).
- Linha do tempo (pelo `git log`): **todo o desenvolvimento aconteceu em 4 dias** (28/06 a 01/07/2026: 59 + 57 + 17 + 3 commits): arquitetura v6.1 e Sprint 0 → provedores de IA → Fases 1–6.1 de IA/observabilidade → Command Center, Missões, Relatório de Execução → "Criar Post" refinado. Depois disso, parado. Isso explica o perfil do código: muita coisa construída rápido, **sem testes** e com inconsistências entre as partes.

> **Importante (doc 9):** em 05/07/2026 o autor dividiu o projeto em **caetusClaude** (semi-automático, operado por agentes) e **caetusOS** (este repo, o sistema automatizado que futuramente criará Funcionários Digitais). O restante deste documento trata do caetusOS.

## 4. A arquitetura "congelada" (v6.1) e o que ela significa hoje

O documento [`.lovable/plan.md`](../.lovable/plan.md) congelou a arquitetura com princípios que **continuam válidos e valem a pena manter**:

1. **Executor é o único ponto de entrada** de qualquer execução (Web, API, CLI, Fluxo, Webhook...).
2. **Toda saída é `ResultadoExecucao`**.
3. **Habilidades não leem banco nem storage** — recebem `Contexto` pronto do `ContextBuilder`.
4. **Todo I/O de arquivo passa por `StorageBackend`**.
5. **`empresa_id` sempre vem do token** (isolamento por tenant).
6. **Portabilidade**: mesma imagem Docker em dev, Fly.io ou VPS; sem recursos proprietários de cloud.

> Ressalva: o plano disse "congelado, sem novas camadas", mas o código **já ultrapassou** o plano
> (roteador por catálogo/missões/perfis, health scheduler, telemetria de IA, Command Center). Isso não é um problema por si só,
> mas **o plano não descreve mais o sistema**. A documentação desta pasta passa a ser a descrição de referência;
> o `plan.md` deve ser mantido como **registro histórico + princípios**, e não como descrição do estado atual.
> Além disso, **alguns princípios são violados na prática** (ex.: isolamento por tenant em telemetria e storage — ver doc 4).

## 5. Glossário

| Termo | Significado |
|-------|-------------|
| **Empresa / Tenant** | Cliente do SaaS. Todo dado de negócio pertence a uma `empresa_id`. |
| **Projeto** | Subdivisão de uma empresa. Hoje só existe o **projeto raiz** (criado junto com a empresa). |
| **Comando** | Contrato de entrada do Executor: `tipo`, `alvo`, `entrada`, `empresa_id`, `usuario_id`, `origem`, `schema_version`. |
| **Executor** | Núcleo que valida, monta contexto, delega e persiste a execução. |
| **Habilidade (Skill)** | Unidade executável registrada em `habilidades/registro.py` (ex.: `conteudo.criar_post`). |
| **Contexto** | Pacote pronto entregue à habilidade: identidade, conhecimento, memória, assets, histórico recente + lista de eventos. |
| **ResultadoExecucao** | Contrato de saída: sucesso, dados, métricas, eventos (o "Relatório de Execução"), erro. |
| **Missão** | **Dois sentidos no código** (atenção): (a) no **frontend**, uma "automação" exibida no catálogo (`src/lib/missoes.ts`); (b) no **roteador de IA**, a *intenção* usada para escolher provedor (`ia/missoes.py`: `criar_post`, `conteudo_imagem_post`...). |
| **Provedor** | Adapter de IA (`gemini`, `groq`, `openrouter`, `huggingface`, `fal`). |
| **Catálogo** | Tabela `provedor × categoria × especialização → modelo/peso/custo` (`ia/catalogo.py`). O **modelo vem do `.env`**, nunca fixo no código. |
| **Perfil** | YAML (`ia/perfis/*.yaml`) que reordena pesos e define overrides manuais. |
| **Health** | Verificação periódica da saúde de cada provedor (chave inválida, billing, modelo removido...). |
| **Funcionário Digital** | Conceito de produto (agrupamento de missões por função). Ainda não é entidade no sistema. |
