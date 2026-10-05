# 05 — Produto: geral vs. nichos, e como começar a usar

> **Atualização (05/10/2026):** o dono do projeto decidiu **não escolher nicho agora** — primeiro fazer o sistema funcionar; o nicho virá depois como **camada por cima, principalmente visual**. Modelo inicial: **BYOK** (cada cliente traz suas chaves de IA); assinatura com IA incluída só no futuro; **publicação em redes sociais fica para depois**. Isso equivale ao *núcleo geral* do Caminho C **sem** escolher o pacote de nicho ainda. O restante abaixo permanece como referência para quando chegar a hora do nicho.
>
> Documento original: **recomendação para discussão**. As decisões estão em [`08-decisoes-pendentes.md`](./08-decisoes-pendentes.md).
> Não inclui dados de mercado levantados (não pesquisei concorrentes/preços); apenas raciocínio a partir do que o código já faz.

## 1. A pergunta

*"Deixar o caetusOS pronto para **nichos**, ou **geral**? Como começamos a colocá-lo para funcionar?"*

## 2. Ativos que já existem e que favorecem um caminho

O que o código já tem de **concreto** (e portanto custa menos para virar produto):

| Ativo | Por que importa |
|-------|-----------------|
| Contexto persistente por empresa (identidade + conhecimento + memória + histórico) | É a base de **qualquer** vertical; já está no `ContextBuilder`. |
| Habilidade **criar post** (texto + prompt visual + imagem + persistência + publicação Instagram opcional) | Caso de uso completo, tangível e demonstrável em 1 minuto. |
| Roteador de IA com fallback, custo e telemetria | Permite controlar margem (principal risco de SaaS de IA). |
| Calendário de **datas comemorativas brasileiras** (`datas-brasileiras.ts`) | Já direciona para **marketing de pequenos negócios no Brasil**. |
| Relatório de Execução (eventos, métricas, custo) | Transparência e auditoria — vendável como diferencial B2B. |
| Textos e UI em **PT-BR** | Posicionamento local. |

O que **não** existe e muda o plano conforme o caminho: agendamento, fluxos, integrações OAuth por empresa, planos/cobrança, cotas, galeria de resultados (ver doc 3 §3.3).

## 3. Três caminhos possíveis

### Caminho A — **Plataforma geral** ("sistema operacional" de automações)
- Entrega um motor genérico (habilidades, fluxos, integrações, funcionários) e o cliente monta o que quer.
- ✅ Visão original; maior teto. ❌ **Muito caro e lento até o primeiro cliente**; produto difícil de explicar ("para quê serve?"); concorre com plataformas de automação e com assistentes genéricos que já existem; exige fluxos, integrações e builder visual **antes** de gerar valor.

### Caminho B — **Vertical fechada** (produto específico para um nicho)
- Ex.: "assistente de marketing para [tipo de negócio]". Habilidades, prompts, templates e onboarding feitos sob medida.
- ✅ Valor claro, onboarding simples, comunicação direta, preço defensável. ❌ Teto menor; risco de acoplar o código ao nicho.

### Caminho C — **Núcleo geral + pacote de nicho** (recomendado)
- Mantém a arquitetura (Executor/Habilidades/Contexto/Roteador) **genérica**, mas o **produto de entrada** é um **pacote de nicho**: um conjunto de habilidades + templates de prompt + conhecimento inicial + onboarding.
- O "nicho" vira **dado/configuração** (pacote), não código espalhado — assim o 2º nicho custa pouco.
- Isso já combina com o conceito reservado em `backend/app/templates/` (README) — vale **ativá-lo como "Pacotes"** quando houver a 2ª habilidade que reaproveite o mesmo layout/prompt.

## 4. Recomendação

**Caminho C, começando por um único nicho: conteúdo/marketing para pequenos negócios e agências no Brasil**, porque:

1. É **onde o produto já está mais pronto** (criar post + identidade + datas comemorativas + Instagram).
2. O ciclo de valor é curto e visível: *cadastrar marca → pedir post → receber legenda + imagem coerente com a marca*.
3. Tem **alta repetição** (posts toda semana) → retenção e justificativa para assinatura.
4. Permite validar o risco central (**qualidade com IA gratuita/barata vs. margem**) antes de construir a plataforma toda.
5. Os "funcionários digitais" ganham sentido concreto: **Social Media**, **Designer**, **Atendimento (responder avaliações)** como evolução natural do mesmo contexto de marca.

> **Variação possível de nicho** (a escolher com o dono do projeto): agências/freelancers de social media (cliente = quem atende várias marcas → o modelo `empresa → projeto` já favorece "uma conta, várias marcas"); restaurantes/varejo local; clínicas/estética; e-commerce (ficha de produto/marketplace — missões já listadas no catálogo). O critério de escolha deve ser **acesso real a 5–10 pessoas desse nicho** para testar, não o tamanho teórico do mercado.

Nota técnica a favor das **agências**: o modelo atual já tem `projetos` (hoje só o raiz). Ativar múltiplos projetos na UI seria o equivalente a "múltiplas marcas por conta".

## 4b. Modelo de uso decidido: BYOK primeiro

- **Cada cliente cria suas contas** nos provedores (Gemini, Groq, OpenRouter, HuggingFace, Fal...) e **cadastra as chaves no Caetus OS**; o roteador junta todas e escolhe/faz fallback entre elas. O cliente paga (ou usa o free tier) **diretamente no provedor**; a plataforma não tem custo de IA.
- **Vantagens:** zero risco de custo/abuso de IA para a plataforma; acesso gratuito para começar; transparência (o cliente vê o que gasta); mitiga RISK-01 (dependência de free tier da plataforma).
- **Atritos a tratar:** onboarding (criar várias contas é trabalhoso → tela guiada com passo-a-passo e "testar chave", T-115); segurança das chaves (cifradas, nunca devolvidas, nunca em log — T-114); qualidade varia por provedor/modelo escolhido pelo cliente (mostrar recomendações, T-111).
- **Futuro pago:** plano de assinatura com **IA incluída/créditos** (a plataforma usa as próprias chaves e cobra) — exige cotas e medição de custo por empresa (T-203/T-110/T-211). Por isso o desenho do BYOK deve **já separar** "credencial da empresa" de "credencial da plataforma".
- **Publicação em redes:** adiada. Cada cliente teria de criar um app (ex.: Meta) e conectar; avaliar só depois (D-06).

## 5. "Colocar para funcionar" — plano de uso em 3 degraus

| Degrau | Quem usa | O que precisa existir | Objetivo |
|--------|----------|----------------------|----------|
| **1. Uso próprio / dogfooding** | Você, com sua própria marca ou a de um cliente conhecido | Fase 0 (estabilizar) + Identidade/Memória na UI + chaves reais configuradas + download do resultado | Descobrir se a qualidade dos posts é boa o bastante e quanto custa por post |
| **2. Piloto fechado** | 3–10 pessoas do nicho, sem cobrança (ou cobrança manual) | + login/convite + isolamento garantido + galeria de resultados + limites de uso por empresa + CI/testes + deploy estável | Medir uso real (posts/semana), custo real por empresa, o que pedem a mais |
| **3. SaaS aberto** | Público | + planos/cobrança + BYOK/cotas + e-mail transacional + termos/LGPD + suporte + monitoramento | Escala e receita |

**Métricas para decidir a continuidade** (definir antes do piloto): posts gerados por empresa por semana, % aproveitados sem edição, custo médio por post, retenção semana 4, disposição a pagar (e quanto).

## 6. O que NÃO fazer agora (para proteger o foco)

- Não construir **fluxos visuais/builder** ou **webhooks** antes de ter 1 caso de uso validado.
- Não implementar **RAG/pgvector** antes de haver conhecimento suficiente que não caiba no prompt.
- Não adicionar **mais provedores de IA**: já são 5; o gargalo é qualidade/robustez, não quantidade.
- Não investir em **vídeo/áudio** antes de posts+imagens estarem sólidos.
- Não "completar" o catálogo de 10 missões: manter **1–3 missões excelentes** vale mais que 10 em branco (as "em breve" hoje passam impressão de produto inacabado).

## 7. Esboço de evolução de "habilidades" por nicho (marketing/social)

1. `conteudo.criar_post` (existe) → melhorar: variações A/B, formatos (carrossel, story, reels roteiro), horário sugerido, uso do **logo/cores** na imagem.
2. `conteudo.calendario_mensal` — plano de posts do mês usando datas comemorativas + conhecimento (reaproveita `datas-brasileiras`).
3. `conteudo.responder_avaliacao` — responder avaliações no tom da marca (já listada no catálogo; não exige imagem nem OAuth no início: o usuário cola a avaliação).
4. `imagem.gerar_banner` / `imagem.editar_foto` (missão do roteador já existe: `gerar_banner`; edição exige novas especializações — background removal já está no catálogo).
5. Agendamento + aprovação + publicação (só depois de 1–3 validadas).
