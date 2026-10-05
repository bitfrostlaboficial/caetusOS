# 08 — Decisões (tomadas e pendentes)

## ✅ Decididas em 05/10/2026 (resposta do dono do projeto)

| ID | Decisão | Consequência |
|----|---------|--------------|
| D-01 | **Nome oficial: Caetus OS.** "Empresa IA" deixa de existir. | T-013 passa a ser **renomear tudo** (README, `plan.md`, `pyproject`, `fly.toml`, nomes de banco/usuário, chaves do `localStorage`, títulos). |
| D-02/D-03 | **Sem nicho por enquanto.** Primeiro fazer o **sistema funcionar**; um nicho vem depois como **camada por cima** (principalmente visual: templates, textos, onboarding). | Prioridade total para o núcleo (Fases 0–1). O "pacote de nicho" (T-402) fica para depois e deve ser só configuração/visual. |
| D-05 | **BYOK (traga sua própria chave) como modelo inicial:** cada cliente cria conta nos provedores (Gemini, Groq, OpenRouter, HuggingFace, Fal...), cadastra as próprias chaves no Caetus OS e usa tudo por conta própria — o sistema **não custa IA para a plataforma**. **Assinatura com créditos/IA incluída** fica para o futuro. | T-204 (BYOK) **sobe para a Fase 1** e vira requisito de lançamento; cotas/cobrança (T-203, T-211) ficam para depois. |
| D-06 | **Publicação em redes sociais só depois.** Cada cliente precisaria criar o próprio app (Meta etc.); é um tema à parte. No início: **gerar → revisar → baixar/copiar**. | T-109, T-303, T-304 saem do caminho crítico (Fase 3+). |
| D-11 (parte) | **Branch oficial: `no_lovable`.** | T-015: tornar `no_lovable` a base (merge em `main`/trocar branch padrão). |
| D-10 (parte) | Repositório **deveria ser privado.** | Ver nota abaixo: a visibilidade é alterada nas configurações do GitHub (não tenho ferramenta para isso); **não resolve as chaves vazadas**. |

> **Visibilidade do repositório:** em *GitHub → `bitfrostlaboficial/caetusOS` → Settings → General → Danger Zone → Change repository visibility → Make private*. Tornar privado **reduz a exposição futura**, mas **não apaga** o que já foi clonado/indexado: as chaves que estiveram no histórico continuam tendo de ser **revogadas** (T-001). Atenção: se o Lovable ou outra integração usa o repositório, confirme que o acesso continua depois da mudança.

## ⏳ Ainda pendentes

Cada decisão mostra **o que muda**, **opções** e **recomendação**. Marque a escolhida (ou me diga) e movemos para o roadmap.

| ID | Decisão | Bloqueia |
|----|---------|----------|
| D-04 | Modelo de usuário/empresa (1 usuário = 1 empresa vs. usuário global com várias) | T-003 (parcial), T-007, T-201 |
| D-12 | Detalhes do BYOK: cifragem das chaves (chave-mestra no servidor), quais provedores no lançamento, se haverá "teste de chave" ao salvar e se o cliente escolhe a ordem/prioridade dos provedores | T-204 |
| D-07 | Hospedagem de produção e Postgres (Fly+Neon vs. VPS) | T-207 |
| D-08 | Gerenciador de pacotes do frontend (bun vs. npm) e ferramenta de teste | T-040 |
| D-09 | Relação com o Lovable (continuar usando para UI? quem aprova mudanças?) | CI, fluxo de branches |
| D-10 | Tornar o repositório privado (ação sua no GitHub) e **rotacionar as chaves** | SEC-01 |
| D-11 | Papel de cada repositório do ecossistema (CaetusClaude, caetusStudio, caetusVideo, caetusBot-WPP, caetus-monitor) e o que reaproveitar | T-017, roadmap |

---

### D-01 · Nome do produto
Hoje: **caetusOS** (UI/API) × **Empresa IA** (README, plano, `pyproject`, Fly, banco, `localStorage`).
- *Opção 1 (recomendada):* **caetusOS** em todo lugar (mudar README, `pyproject`, `fly.toml`, nomes de banco/usuário em dev, chaves do `localStorage`).
- *Opção 2:* manter "Empresa IA" como nome interno e caetusOS como marca — gera confusão contínua.

### D-02 · Geral × nicho
Ver [doc 5](./05-produto-nichos-e-go-to-market.md). **Recomendação:** núcleo geral + **pacote de nicho** como produto de entrada (Caminho C).

### D-03 · Qual nicho primeiro
Candidatos (todos aproveitam o que já existe): (a) **agências/freelancers de social media** (várias marcas por conta); (b) **pequenos negócios locais** (restaurante, varejo, estética); (c) **e-commerce** (fichas/descrições — missões já no catálogo).
**Critério sugerido:** em qual deles você consegue **5–10 pessoas reais** para testar nas próximas semanas.

### D-04 · Modelo de usuário × empresa
Hoje: usuário pertence a **uma** empresa (`usuarios.empresa_id`), `registrar` sempre cria empresa nova, login só por e-mail.
- *Opção 1:* manter "1 usuário = 1 empresa" + convites criam novos usuários **dentro** da empresa; login por e-mail passa a exigir e-mail globalmente único.
- *Opção 2 (recomendada se o nicho for agência):* **usuário global** + tabela `membros(usuario_id, empresa_id, papel)`; o usuário escolhe a empresa/marca ativa. Mais trabalho, mas evita retrabalho quando surgirem convites e multi-marca.

### D-05 · IA: quem paga e quais modelos
- Chaves **da plataforma** (você paga/usa free tier; precisa de cotas e margem) × **BYOK** (cliente traz a chave; menor risco de custo, mais atrito) × **híbrido** (plano inclui X créditos; acima disso BYOK).
- **Atenção:** free tiers costumam ter limite de taxa e termos que podem restringir uso comercial — revisar antes de basear o produto neles (RISK-01).

### D-06 · Publicação em redes sociais
- *Degrau 1 (recomendado agora):* **gerar → revisar → baixar/copiar** (zero risco de plataforma).
- *Degrau 2:* botão "publicar" com aprovação humana, token por empresa.
- *Degrau 3:* agendamento e publicação automática (exige OAuth por empresa e, para Meta, revisão de app).

### D-07 · Hospedagem
O plano deixou "Fly.io ou VPS?" e "Postgres Neon ou no host?" **sem resposta**. Hoje `fly.toml` está configurado (região `gru`, 512 MB, `auto_stop`). Para **piloto**, qualquer opção serve; para jobs agendados é preciso `min_machines_running ≥ 1` (ou worker dedicado). Storage em volume local limita a 1 máquina → migrar para S3/R2 (T-205).

### D-08 · Ferramentas do frontend
Escolher **um** gerenciador (bun ou npm) e adotar **Vitest** (unit) + **Playwright** (fluxos críticos: registrar → login → criar post).

### D-09 · Lovable
O repositório está conectado ao Lovable (`AGENTS.md`). Decidir: Lovable continua gerando UI? Se sim, **toda alteração deve passar por CI** antes de ser aceita (RISK-06) e a branch conectada deve ficar sempre buildável.

### D-10 · Visibilidade do repositório
A listagem da conta mostra `bitfrostlaboficial/caetusOS` como **público**. Logo: chaves do histórico = **comprometidas** (T-001 urgente). Decidir também se o código (prompts, arquitetura, roteador) deve continuar público — tornar o repo privado **não** apaga o que já foi clonado, mas reduz a exposição futura.

### D-11 · Branch oficial e ecossistema
`no_lovable` (05/07) está 10 commits à frente da `main` (01/07). Recomendação: tornar `no_lovable` a base (merge em `main`). Além disso, mapear o papel de `CaetusSystems/CaetusClaude`, `caetusStudio`, `caetusVideo`, `caetusBot-WPP` e `Rick-Caetano/caetus-monitor` para evitar construir de novo o que já existe (ver doc 9 §4).
