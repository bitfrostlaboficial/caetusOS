# 14 — Caetus OS como servidor MCP ("traga seu agente")

> Ideia do dono (05/10/2026): expor o Caetus OS como **MCP**, para que agentes (OpenCode, Claude, até ChatGPT) usem as **habilidades, a marca, a memória e a biblioteca** da empresa. **Minha opinião: é uma ótima ideia e muito barata de fazer bem — e dá um segundo modelo de uso** (ver §1).

## 1. Por que vale a pena

1. **Duas direções, ambas úteis:**
   - **Agente → Caetus (MCP):** o cliente usa o agente que já paga (Claude, ChatGPT, OpenCode...) e o agente chama o Caetus OS para ler a marca, executar habilidades e salvar resultados. **A "IA" é do agente; o custo de IA não é seu.**
   - **Caetus → provedores (BYOK):** o que já existe — o roteador usa as chaves do cliente.
2. **Resolve a dúvida do OpenCode/agentes (doc 10):** não precisamos *rodar* OpenCode no servidor (exigiria VPS/segurança de execução). Quem roda o agente é o cliente; nós só expomos **ferramentas bem desenhadas**.
3. **Diferencial:** o contexto da marca fica num lugar só e **qualquer agente** passa a respeitá-lo — "memória da empresa para qualquer IA".
4. Combina com o doc 11: toda **habilidade** (com ou sem IA) ganha um **manifesto**; as ferramentas MCP são geradas a partir dele.

## 2. O que já foi implementado (esta iteração)

- **Manifesto de habilidades:** cada `Habilidade` agora declara `titulo`, `descricao`, `usa_ia` e `entrada_schema` (JSON Schema); `GET /v1/habilidades` devolve o catálogo (autenticado). `conteudo.criar_post` já tem manifesto.
- **Servidor MCP** em [`mcp-server/`](../mcp-server) (Python, `mcp<2`, stdio), falando com a API REST. Ferramentas: `listar_habilidades`, `executar_habilidade`, `ler_marca`, `listar_memoria`, `salvar_memoria`, `listar_conhecimento`, `ler_documento`, `listar_biblioteca`, `historico`; recurso `caetus://marca`.
- **Testado de ponta a ponta** (cliente MCP real → servidor stdio → API real → Postgres): listar habilidades, salvar memória, executar `criar_post` (resultado entra na Biblioteca), listar a biblioteca. Veja `mcp-server/README.md`.

## 3. Segurança (o que NÃO pode escapar)

| Regra | Como |
|-------|------|
| **Chaves BYOK nunca passam pelo MCP** | Nenhuma ferramenta lê/escreve `provedor_credenciais`; o cofre só é usado dentro do backend. |
| **Escopo mínimo** | Hoje o servidor usa o token (JWT) da empresa — **provisório**. Falta (T-213): **chaves de API pessoais por empresa**, revogáveis, com escopos (`ler`, `executar`, `escrever_memoria`) e expiração. |
| **Isolamento por empresa** | Já garantido pela API (o `empresa_id` vem do token). O MCP não aceita `empresa_id` como parâmetro. |
| **Confirmação em ações destrutivas** | Hoje não há ferramenta de exclusão. Quando houver (apagar asset/memória), exigir parâmetro explícito de confirmação. |
| **Prompt injection** | Conteúdo da base de conhecimento volta ao agente: marcar como "dados, não instruções" nas respostas e limitar tamanho. |
| **Limites** | Rate limit por chave (T-213) — evita um agente em *loop* queimar a cota/IA do cliente. |

## 4. Como o cliente usa (hoje, local)

```bash
pip install ./mcp-server                      # ou: uvx --from ./mcp-server caetus-os-mcp
export CAETUS_API_URL=https://api.seu-dominio CAETUS_TOKEN=<token>
```
Claude Desktop / Claude Code / OpenCode (config MCP, comando `caetus-os-mcp`) — ver `mcp-server/README.md`.

## 5. Roadmap do MCP

| ID | Tarefa | Esforço | Notas |
|----|--------|---------|-------|
| T-213 | **Chaves de API da empresa** (criar/listar/revogar, escopos, expiração, rate limit); MCP passa a usar `CAETUS_API_KEY` | M | Pré-requisito do MCP remoto |
| T-214 | **MCP remoto (HTTP) num Cloudflare Worker**: proxy leve para a API (cabe em 10 ms de CPU); permite conectar clientes que só aceitam MCP remoto (⚠️ ChatGPT/Claude web — disponibilidade e plano variam; verificar) | M | OAuth ou chave no cabeçalho |
| T-218 | Ferramentas geradas **dinamicamente** a partir do manifesto (uma ferramenta por habilidade com o `entrada_schema`) | S | Hoje há uma genérica `executar_habilidade` |
| T-219 | Retornar **imagem** como conteúdo MCP (e não só metadados) e links assinados para a Biblioteca | S | Depende de T-205 (URLs assinadas) |
| T-220 | **Prompts MCP** (receitas prontas: "criar post com a marca", "calendário do mês") e recursos `caetus://conhecimento/{id}` | S | Liga com doc 11 (Receitas) |
