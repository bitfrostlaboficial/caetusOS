# 11 — Ideias: um sistema de automação integrado, visual e fácil (com IA e sem IA)

> Documento de **ideias e proposta de direção** para discussão — nada aqui está implementado. Parte do que o código já tem (Executor, Habilidades, Contexto, Relatório de Execução, roteador de IA) e do pedido do dono: *"automação integrada, visual, fácil de uma pessoa entender, com agentes, IA e sem IA"*.

## 1. A ideia central

> **Tudo é uma "Receita" feita de passos.** Um passo pode usar IA ou não. A pessoa monta (ou escolhe pronta) uma receita, vê o resultado de cada passo e decide quando ela roda: **agora, numa agenda, ou quando algo acontece**.

Isso unifica o que o roadmap já cita separadamente (Habilidades, Fluxos, Funcionários Digitais, agendamento, webhooks):

| Conceito (produto) | O que é | Como aparece no código |
|--------------------|---------|------------------------|
| **Passo** | Uma ação: "gerar texto", "ler planilha", "enviar e-mail", "se... então" | Uma **Habilidade** (já existe o contrato) — com ou sem IA |
| **Receita** (automação/fluxo) | Passos encadeados com entradas/saídas | `TipoComando.FLUXO` no Executor (ponto de extensão já reservado, T-305) |
| **Gatilho** | O que inicia a receita | Manual · Agenda · Webhook/API · Evento (ex.: "chegou arquivo") |
| **Funcionário Digital** | Uma **persona** (nome, função, tom, memória) + um **conjunto de receitas** que ele sabe fazer | Entidade nova (T-404), empacotando receitas + contexto |
| **Resultado/Relatório** | O que aconteceu em cada passo (já existe o *Relatório de Execução*) | `ResultadoExecucao.eventos` (por passo) |

## 2. Catálogo de passos (o que dá para fazer)

### Com IA (usam o roteador + chaves BYOK do cliente)
Gerar/reescrever texto · resumir · traduzir · classificar/etiquetar · extrair dados estruturados de texto/PDF/imagem (OCR) · gerar imagem · remover fundo/upscale · transcrever áudio · responder mensagem/avaliação no tom da marca · gerar variações (A/B) · "agente" que decide qual passo seguir (raciocínio) com limites.

### Sem IA (determinísticos — baratos, rápidos, previsíveis)
| Grupo | Exemplos |
|-------|----------|
| **Dados** | Ler/gravar CSV/XLSX/JSON · filtrar, ordenar, agrupar, somar · juntar planilhas · deduplicar |
| **Texto** | Modelos com variáveis (`{nome}`) · regex · formatar datas/moeda (PT-BR) · montar legenda a partir de campos |
| **Lógica** | Se/senão · repetir para cada item · esperar X · tentar de novo · limite de execuções |
| **Arquivos** | Receber upload · converter · compactar · salvar na galeria · baixar |
| **Comunicação** | Enviar e-mail · webhook de saída · notificação · (depois) WhatsApp/Telegram |
| **Web** | Chamar uma API (HTTP) · ler uma página/RSS |
| **Pessoas** | **Pedir aprovação humana** (revisar/editar antes de seguir) · formulário para o usuário preencher |
| **Calendário** | Datas comemorativas BR (já existe `datas-brasileiras.ts`) · "primeiro dia útil" · agenda |

### Regra de ouro de produto
**Usar IA só onde precisa.** Receita com passos determinísticos onde possível = mais barato (importante com BYOK), mais rápido e mais confiável. A tela deve mostrar um selo **"usa IA" / "sem IA"** em cada passo e **o custo estimado** da receita.

## 3. Experiência: como tornar fácil de entender

1. **Comece pela intenção, não pela ferramenta.** Home = *"O que você quer fazer hoje?"* com **cartões de receitas** ("Criar post com imagem", "Responder avaliações", "Calendário do mês", "Resumir planilha"). Hoje o Command Center já tem a busca e as missões — evoluir para **receitas**.
2. **Três níveis de uso (progressivo):**
   - **Usar:** escolher receita pronta → preencher 2–3 campos → rodar.
   - **Ajustar:** abrir a receita, trocar um passo, mudar o tom/modelo.
   - **Criar:** montar do zero no editor visual (ou **descrever em linguagem natural** e a IA propõe os passos — o usuário revisa).
3. **Editor visual simples (não um diagrama complexo):** lista vertical de **cartões de passo** conectados por linha, com ícone, nome em português, "entra → sai" e selo IA/sem IA. Arrastar para reordenar; "+" para adicionar. Modo "canvas" com ramificações só para quem precisar.
4. **Rodar é transparente:** a linha do tempo mostra cada passo (✔ feito · ⏳ rodando · ⚠ aviso · ✖ erro) com a **saída de cada passo** e o que foi usado (modelo, tokens, custo). *(Isso já existe como Relatório de Execução — reaproveitar.)*
5. **Sempre dá para voltar atrás:** versões da receita, "executar em modo teste" (sem publicar/enviar), aprovação humana antes de ações externas.
6. **Erros em português claro** com a ação sugerida ("a chave da Groq atingiu o limite — usando Gemini; [ver provedores]").
7. **Onboarding de 3 passos:** conectar 1 provedor de IA → cadastrar a marca/conhecimento → rodar a primeira receita.

## 4. Ideias de receitas prontas (sem nicho — ficam em "Galeria")
- **Conteúdo:** post com imagem · carrossel · roteiro de vídeo curto · calendário editorial do mês · reaproveitar um texto em 5 formatos.
- **Atendimento:** responder avaliações · rascunhar resposta a e-mail com a base de conhecimento · FAQ a partir de documentos.
- **Dados/relatórios:** resumo executivo de planilha · limpar e padronizar uma lista · relatório semanal por e-mail.
- **Documentos:** proposta/orçamento a partir de um modelo e dados · ata de reunião a partir de transcrição · extrair campos de PDFs/notas.
- **Operação:** "todo dia 8h, buscar X e me avisar" · alertas quando um valor passa de um limite · rotinas de checagem.
> Todas funcionam como **pacote visual por cima** (a camada de nicho do dono) — o que muda é nome, textos e exemplos, não o motor.

## 5. Onde "agentes" entram (sem virar bagunça)
- **Agente = passo especial** que recebe um objetivo e **escolhe entre um conjunto limitado de ferramentas (passos)** — com orçamento de passos/tokens e **aprovação humana** em ações sensíveis. Evita "agente solto".
- **Funcionário Digital** = agente + persona + memória + receitas permitidas. O usuário "contrata" um funcionário e dá tarefas; ele **usa receitas** (ações previsíveis) e só improvisa dentro dos limites.
- Agentes que operam o computador/código (ex.: OpenCode) ficam **fora do MVP** (ver doc 10 §2).

## 6. Como encaixa na arquitetura atual (sem reescrever)
1. **Passo = Habilidade** (contrato já existe: `executar(entrada, contexto) → dict`). Habilidades sem IA são triviais (não chamam o roteador).
2. **Fluxo = novo `ExecutorEspecifico` (`FLUXO`)** que lê a definição da receita (JSON versionado no banco), resolve a ordem (DAG simples), passa a saída de um passo como entrada do próximo e **reaproveita `Contexto.registrar_evento`** para a linha do tempo.
3. **Gatilhos:** `Origem.WEBHOOK/AUTOMACAO/FLUXO` já existem como enumeração; falta fila/worker (T-301) e agendador (T-302).
4. **Catálogo de passos descobrível:** cada habilidade declara **manifesto** (nome PT-BR, entradas/saídas, "usa IA?", custo estimado) — ideia emprestada do **caetusClaude** (manifest + registry), que o frontend usa para montar o editor.
5. **Segurança:** receitas rodam com o `empresa_id` do dono; passos com efeito externo (e-mail, webhook, publicação) exigem **credencial por empresa** e, por padrão, **aprovação**.

## 7. Roteiro sugerido (pequenos passos, cada um útil sozinho)
| Etapa | Entrega | Valor imediato |
|-------|---------|----------------|
| A | **Manifesto de habilidades** + endpoint `GET /v1/habilidades` (nome, campos, usa IA, custo) | Frontend deixa de ter catálogo "hardcoded" (`missoes.ts`) |
| B | **Mais habilidades sem IA** (CSV/planilha, modelo de texto, regex, HTTP, e-mail) | Receitas baratas e úteis já sem gastar tokens |
| C | **Receita de 2–3 passos** executada pelo `FLUXO` (sem editor, definida em JSON) | Valida o motor |
| D | **Galeria de receitas + tela "Usar"** (preencher campos e rodar; linha do tempo por passo) | Produto compreensível para o usuário final |
| E | **Agenda** (rodar toda segunda 9h) + worker | Automação de verdade |
| F | **Editor visual** (cartões) + "descrever em linguagem natural" | Criar sem código |
| G | **Aprovação humana** + modo teste + versões | Confiança para ações externas |
| H | **Funcionários Digitais** e agentes com limites | Camada de produto "contrate um funcionário" |

## 8. Perguntas para o dono
1. A ideia de **"Receita = passos com selo IA/sem IA"** representa o que você imagina? Prefere outro nome (Fluxo, Automação, Missão, Rotina)?
2. O primeiro caso de uso para provar o motor continua sendo **criar post com imagem** (já existe), ou prefere um **sem IA** (ex.: planilha → relatório)?
3. Editor: **lista vertical de cartões** (simples) é suficiente para começar, ou quer **canvas livre** desde o início?
4. Gatilhos prioritários: **agenda** e **webhook** primeiro?
