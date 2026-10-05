# 16 — Catálogo de serviços e automações (existentes e futuros)

> Pedido do dono (05/10/2026): listar **automações que já existem, que podem existir e que são úteis às empresas** — o Caetus OS como **distribuidor de serviços prontos** que a pessoa liga e usa no dia a dia. Este é o **catálogo vivo**: cada linha vira (ou não) uma habilidade/receita/conector. Atualizar sempre que algo for implementado ou descartado.
> **Legenda:** ✅ existe · 🟡 parcial · ⬜ não existe. **IA:** sim/não/opcional. **Cx** = conector necessário (ver doc 15 §4). **Esf.** = esforço (S ≤ 2 dias, M ≤ 1 sem., L ≤ 3 sem., XL > 3 sem.) — estimativas minhas. **Valor** = hipótese a validar com usuários, não dado de mercado.

## 1. Já existe hoje

| # | Serviço | Estado | Notas |
|---|---------|--------|-------|
| S-01 | **Criar post** (legenda + hashtags + imagem, com marca/conhecimento/memória) | ✅ | Resultado vai para a Biblioteca; BYOK; imagem via Gemini/Fal/HF/Cloudflare |
| S-02 | **Marca e memória** (identidade, tom, cores, regras/preferências) | ✅ | Base de todo o resto |
| S-03 | **Base de conhecimento** (documentos da empresa) | ✅ | Hoje entra no prompt (limite de tamanho); sem busca semântica |
| S-04 | **Biblioteca** (resultados gerados + arquivos) | ✅ | Download/remoção |
| S-05 | **Histórico/relatório de execução** (custo, provedor, tempo) | ✅ | Base para quotas |
| S-06 | **Roteador de IA** com fallback, BYOK, 9 provedores | ✅ | Gemini, Groq, OpenRouter, Mistral, NVIDIA, Cloudflare, HF, Fal |
| S-07 | **Servidor MCP local** (agentes usam marca/habilidades/biblioteca) | ✅ | stdio; remoto = T-214 |
| S-08 | Publicar no Instagram | 🟡 | Código existe (token global); **adiado** (D-06) |

## 2. Conteúdo e marketing (núcleo atual)

| # | Serviço | IA | Cx | Esf. | Valor (hip.) | Dependências |
|---|---------|----|----|------|--------------|--------------|
| S-10 | **Calendário mensal de posts** (datas comemorativas + conhecimento) | sim | — | M | Alto (retém: uso recorrente) | `datas-brasileiras.ts` já existe |
| S-11 | **Variações A/B** de legenda/imagem | sim | — | S | Médio | S-01 |
| S-12 | **Carrossel / story / roteiro de Reels** | sim | — | M | Alto | S-01, templates de layout |
| S-13 | **Banner/arte com a marca** (logo, cores, fontes aplicados de verdade) | sim | — | L | Alto | Upload de logo (T-101), `layout-engine` do caetusClaude |
| S-14 | **Responder avaliações** (Google/Instagram) no tom da marca | sim | — (o usuário cola o texto) | S | Alto, fácil | S-02 |
| S-15 | **Reaproveitar conteúdo** (1 texto → post, e-mail, roteiro) | sim | — | S | Médio | — |
| S-16 | **Edição de imagem** (remover fundo, redimensionar p/ redes) | opcional | — | M | Médio | HF `background_removal` já no catálogo |
| S-17 | **Vídeo curto** (roteiro + montagem) | sim | — | XL | Alto, mas caro | Fase 4; ver caetusVideo |
| S-18 | **Publicação/agendamento nas redes** | não | Redes (OAuth por empresa) | XL | Alto | **Depois (D-06)** |

## 3. Atendimento e vendas (os conectores)

| # | Serviço | IA | Cx | Esf. | Valor (hip.) | Notas/risco |
|---|---------|----|----|------|--------------|-------------|
| S-20 | **Atendente no WhatsApp** (responde dúvidas com a base de conhecimento; passa para humano) | sim | WhatsApp | XL | **Muito alto** (dor real de PMEs) | Preferir API oficial; busca no conhecimento (RAG, T-230); política de IA da Meta ⚠️; LGPD |
| S-21 | **Captura de leads → planilha/CRM** (formulário/WhatsApp/e-mail → Google Sheets) | não | Google Sheets | M | Alto | Sem IA = barato e confiável |
| S-22 | **Follow-up automático** (lembrar lead que não respondeu) | opcional | WhatsApp/e-mail | M | Alto | Opt-in obrigatório; sem disparo em massa |
| S-23 | **Triagem e classificação de mensagens** (urgente/venda/suporte) | sim | WhatsApp/e-mail | M | Médio | |
| S-24 | **Orçamento/proposta em PDF** a partir de um pedido | sim | — | M | Alto p/ serviços | Template + dados da empresa |
| S-25 | **Lembrete de cobrança** (vencimento próximo) | não | WhatsApp/e-mail | M | Alto | Texto fixo; sem IA |
| S-26 | **Agendamento** (consultas/serviços; integra agenda) | opcional | Google Calendar | L | Alto (clínicas, estética) | |
| S-27 | **Resposta automática de e-mail** (rascunho para aprovação) | sim | Gmail/IMAP | L | Médio | Sempre com aprovação humana no início |
| S-28 | **Pesquisa de satisfação pós-atendimento** | opcional | WhatsApp | S | Médio | |

## 4. Operações e dados (a "cola" — muitas sem IA)

| # | Serviço | IA | Cx | Esf. | Valor (hip.) |
|---|---------|----|----|------|--------------|
| S-30 | **Agendador** (executar uma habilidade todo dia/semana/mês) | não | — | M | **Muito alto** (base de tudo recorrente) |
| S-31 | **Gatilho por webhook** (algo acontece lá fora → executa receita) | não | — | M | Muito alto |
| S-32 | **Receitas (passos encadeados)** — editor visual simples (lista de passos antes de canvas) | opcional | — | L | Muito alto (doc 11) |
| S-33 | **Resumo semanal da empresa** (posts feitos, custo, pendências) por e-mail/WhatsApp | opcional | e-mail | S | Médio |
| S-34 | **Google Sheets / Drive / Calendar** (ler e gravar) | não | Google (OAuth) | L | Alto |
| S-35 | **Notion / Airtable / Trello** (criar/atualizar itens) | não | respectivo | M cada | Médio |
| S-36 | **RSS/site → post** (monitorar e transformar) | sim | — | M | Médio |
| S-37 | **Backup/exportação** dos dados da empresa | não | R2/B2 | S | Médio (confiança) |
| S-38 | **Importar/transcrever áudio e documentos** (OCR/transcrição) | sim | — | M | Médio; provedores já no catálogo (OCR, transcrição) |
| S-39 | **Webhooks de saída** (avisar sistemas do cliente) | não | — | S | Médio |

## 5. Plataforma (o que viabiliza "distribuir serviços")

| # | Item | Esf. | Notas |
|---|------|------|-------|
| P-01 | **Manifesto de Pacote/Receita** (YAML: habilidades, passos, conectores, campos, usa IA) | M | Evolução do manifesto de habilidades (já feito) |
| P-02 | **"Loja" interna** (lista de pacotes, instalar/desinstalar, pedir só as credenciais faltantes) | M | Começa como lista fixa no repo |
| P-03 | **Chaves de API da empresa** (T-213) | M | Pré-requisito de conectores e MCP remoto |
| P-04 | **Fila + worker** de execução assíncrona (jobs longos, agendados, webhooks) | L | Hoje tudo é síncrono na requisição |
| P-05 | **Quotas e cobrança** (T-203/T-211) | L | Depois do piloto |
| P-06 | **Painel de conexões** (status de cada conector: ok/erro/reconectar) | M | |

## 6. Pacotes iniciais sugeridos (combinações prontas)

| Pacote | Conteúdo | Quando |
|--------|----------|--------|
| **Social Media** | S-01, S-10, S-11, S-12, S-14 (+ S-30 agendador) | **Já quase pronto** (núcleo atual) |
| **Atendimento WhatsApp** | S-20, S-21, S-23, S-25 | Depois do conector oficial |
| **Vendas simples** | S-21, S-22, S-24, S-34 | Depois do Google |
| **Rotina da empresa** | S-30, S-33, S-37 | Logo após o agendador |

## 7. Ordem sugerida (valor × esforço × risco)

1. **Agendador + gatilho por webhook + Receitas simples** (S-30/S-31/S-32) — destrava **tudo** que é recorrente e **não usa IA**, então funciona mesmo sem chaves. Combina com o manifesto (P-01).
2. **Chaves de API da empresa** (P-03) — pré-requisito de conectores e MCP remoto.
3. **Mais conteúdo** (S-10 calendário, S-14 responder avaliações, S-11 variações) — baratos, usam o que já existe.
4. **Conector WhatsApp oficial + atendimento** (S-20) com busca no conhecimento — maior valor percebido, maior esforço/risco; só depois dos itens 1–2.
5. **Google (Sheets/Calendar)** (S-34) e **captura de leads** (S-21).
6. **Publicação nas redes** (S-18) — por último (cada cliente precisa do próprio app da Meta).

> Princípio: **manter o catálogo pequeno e excelente** (o doc 5 já avisava). Cada serviço novo precisa de: manifesto, teste, tela mínima, e uma frase para o cliente "o que isso faz por mim".
