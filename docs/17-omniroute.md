# 17 — OmniRoute: vale integrar?

> Sugestão do dono: usar o **OmniRoute** para trocar de modelo/CLI sem perder progresso e talvez como roteamento de IA dentro do sistema.
> **Fonte:** README do projeto ([diegosouzapw/OmniRoute](https://github.com/diegosouzapw/OmniRoute)) e resenhas — ou seja, **o que o próprio projeto afirma**; **não instalei nem testei**. Números de marketing (359 provedores, 110 ferramentas MCP, economia de tokens) não foram verificados.

## 1. O que é (segundo o README)
- **Gateway de IA open source (MIT)**, instalável por `npm i -g omniroute`, Docker (amd64/arm64) ou app desktop. Sobe em `localhost:20128` com **endpoint OpenAI-compatível** (`/v1/chat/completions`, `/v1/models`, `/v1/responses`…).
- Roteamento com **fallback por camadas** (assinatura → chave de API → barato → grátis), **múltiplas chaves por provedor**, **cotas e uso por chave**, estratégia **"context relay"** (passa o contexto entre alvos em conversas longas), compressão de tokens, **servidor MCP embutido** e protocolo A2A.
- Funciona com Claude Code, Codex, Cursor, OpenCode etc. — ou seja, é pensado para **quem programa com agentes** e quer **não parar quando a cota acaba**.
- **Alertas do próprio projeto:** há provedores marcados "evitar" no catálogo de risco de termos (13); **juntar chaves/contas em pool pode violar os termos dos provedores — responsabilidade do operador**; planos gratuitos mudam (orçamentos "reauditados a cada duas semanas").

## 2. Onde se encaixa no Caetus OS

| Camada | Já temos | OmniRoute faria |
|--------|----------|------------------|
| Escolher provedor/modelo por **tarefa** (catálogo, pesos, perfis, missões) | ✅ roteador próprio | Sobrepõe — mas **não conhece nossas missões/categorias** |
| **BYOK por empresa** (cofre, isolamento, telemetria por empresa, custo estimado) | ✅ | Não é multiempresa; "tokens com escopo" existem, mas sem nosso isolamento/telemetria |
| Fallback entre provedores | ✅ | ✅ (mais maduro, mais provedores) |
| Trocar de IA **no meio de uma sessão de agente** sem perder contexto | ❌ (nosso produto é de comandos pontuais, ainda não de sessões longas) | ✅ é o ponto forte — mas serve ao **agente do usuário** (Claude Code/Codex), não ao nosso backend |

## 3. Recomendação

1. **Não substituir o roteador** (perderíamos catálogo por missão, BYOK isolado por empresa, telemetria e a lógica de custo) **nem** colocar as chaves dos clientes **dentro de um gateway de terceiros** na nuvem.
2. **Integrar como provedor opcional** — barato: um adaptador OpenAI-compatível (já temos `openai_compat.py`) cujo `base_url` aponta para o OmniRoute. Caso de uso real: **modo local (B)**: o usuário já roda o OmniRoute e o Caetus OS passa a usá-lo como "um provedor" que dá acesso a vários modelos (T-227).
   - ⚠️ **SSRF:** deixar o usuário digitar um `base_url` no SaaS permite fazer o servidor chamar endereços internos. Regra: **só em modo local ou por admin da plataforma**, com bloqueio de IPs privados/metadata na nuvem.
3. **Para o "não perder progresso ao trocar IA/CLI":** o OmniRoute resolve do lado do **agente do usuário**. O que o Caetus OS pode fazer do seu lado é **guardar o contexto no lugar certo** (marca, memória, conhecimento, histórico — já existe) e **expor via MCP**: quem troca de agente reconecta ao mesmo MCP e retoma a partir da memória da empresa. Isso é nosso diferencial e não depende do OmniRoute.
4. **Empacotar com o modo local** (docs 15/§3) como "extra opcional recomendado", não como dependência.
5. **Avaliar antes:** licenças das dependências, maturidade (projeto recente e muito ativo ⚠️), segurança (guarda chaves — verificar cifragem e superfície de ataque), comportamento real do `context relay`. Fazer uma **prova de conceito de 1 dia** (T-227) antes de qualquer promessa ao cliente.

## 4. Tarefa
**T-227** — Provedor `omniroute` (OpenAI-compatível, `base_url` configurável, restrito a modo local/admin, com bloqueio SSRF) + guia "usar com OmniRoute" + PoC.
