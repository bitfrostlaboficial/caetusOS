# Caetus OS — servidor MCP

Deixa qualquer agente compatível com MCP (Claude Desktop/Code, OpenCode, etc.) usar a **marca, a memória, as habilidades e a biblioteca** da sua empresa no Caetus OS. As chaves de IA (BYOK) **nunca** passam por aqui. Detalhes e roadmap: [`docs/14-mcp.md`](../docs/14-mcp.md).

## Instalar e configurar

```bash
pip install ./mcp-server
export CAETUS_API_URL=http://localhost:8000      # URL da sua API
export CAETUS_TOKEN=<token de acesso>            # provisório; virá como chave de API (T-213)
# alternativa: CAETUS_EMAIL e CAETUS_SENHA (faz login ao iniciar)
caetus-os-mcp                                    # fala MCP via stdio
```

Exemplo de configuração de cliente (formato comum de `mcpServers`):

```json
{ "mcpServers": { "caetus-os": {
    "command": "caetus-os-mcp",
    "env": { "CAETUS_API_URL": "http://localhost:8000", "CAETUS_TOKEN": "..." } } } }
```

## Ferramentas

`listar_habilidades` · `executar_habilidade` · `ler_marca` · `listar_memoria` · `salvar_memoria` · `listar_conhecimento` · `ler_documento` · `listar_biblioteca` · `historico` — e o recurso `caetus://marca`.
