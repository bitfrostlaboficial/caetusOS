# Arquitetura Congelada — Empresa IA (v6.1 — OFICIAL)

Versão oficial e **definitivamente congelada**. Incorpora os 4 refinamentos da v6 + os 2 ajustes finais de redação. A partir daqui, foco exclusivo na Sprint 0.

**Princípio único:** MVP simples, implementação explícita, abstrações estáveis, evolução incremental.

---

## 1. Regras invioláveis

1. **Executor é o único ponto de entrada** de qualquer execução (Web, API, CLI, Fluxo, Funcionário, Webhook, Automação).
2. **Executor conhece apenas `Comando` e `ResultadoExecucao`** — agnóstico ao alvo. Delega a um `ExecutorEspecifico` registrado por tipo.
3. **Todo retorno é `ResultadoExecucao`**, independente da origem.
4. **Nenhuma habilidade lê banco ou Storage diretamente** — recebe `Contexto` pronto do `ContextBuilder`.
5. **Nenhum `open()` direto** — todo I/O passa por `StorageBackend`.
6. **Autenticação 100% backend Python** (argon2id + JWT + refresh).
7. **`empresa_id` injetado por middleware** em toda request; `projeto_id` opcional (default = projeto raiz).
8. **Projeto raiz criado exclusivamente pelo `EmpresaServico`** na mesma transação. Sem triggers de banco.
9. **Sem recursos proprietários de provedor.** Roda igual em Postgres local, Neon, Fly.io ou VPS.

---

## 2. Portabilidade

> A migração para outra infraestrutura (Hetzner, Contabo, Hostinger, DigitalOcean, AWS, etc.) deverá exigir **apenas alterações de infraestrutura e configuração** — Docker, variáveis de ambiente, volumes, DNS, CI/CD — **preservando integralmente a lógica da aplicação**.

Garantias:
- A aplicação deverá utilizar a **mesma imagem Docker e a mesma configuração base**, com pequenas adaptações de infraestrutura (Docker Compose, `fly.toml` e variáveis de ambiente) conforme o ambiente de execução. Toda a lógica da aplicação deverá permanecer idêntica entre desenvolvimento, Fly.io e VPS própria.
- Postgres sem extensões nem recursos proprietários.
- Storage abstraído via `StorageBackend`.

---

## 3. Stack

| Camada    | Tecnologia                                                  |
| --------- | ----------------------------------------------------------- |
| Frontend  | React + TypeScript (Lovable) — consome a API                |
| Backend   | Python 3.12 + FastAPI                                       |
| Banco     | PostgreSQL (Docker local; Neon ou equivalente em prod)      |
| Storage   | `StorageBackend` → Filesystem (MVP); S3/MinIO/Supabase apenas esqueletos |
| Auth      | Própria — argon2id + JWT + refresh rotativo                 |
| IA        | Gemini + Groq via adapters                                  |
| Deploy    | Docker Compose (dev) → Fly.io **ou** VPS Linux              |

---

## 4. Estrutura de pastas (backend)

```text
backend/app/
├── main.py
├── configuracao/
│
├── api/
│   ├── deps.py
│   └── v1/
│       ├── auth.py
│       ├── empresas.py
│       ├── projetos.py
│       ├── identidade.py
│       ├── conhecimento.py
│       ├── memoria.py
│       ├── assets.py
│       ├── comandos.py               # POST /v1/comandos/executar
│       └── historico.py
│
├── dominio/                          # APENAS entidades de negócio
│   ├── modelos/
│   │   ├── usuario.py
│   │   ├── empresa.py
│   │   ├── projeto.py
│   │   ├── identidade_empresa.py
│   │   ├── documento_conhecimento.py # versao + data_upload
│   │   ├── memoria_item.py
│   │   ├── asset.py                  # inclui campo `origem`
│   │   └── execucao.py
│   └── erros.py
│
├── infraestrutura/
│   ├── banco/
│   │   ├── sessao.py
│   │   ├── migracoes/                # Alembic
│   │   └── repositorios/
│   ├── armazenamento/
│   │   ├── base.py                   # StorageBackend
│   │   ├── filesystem.py             # MVP — única ativa
│   │   ├── s3.py                     # esqueleto
│   │   ├── minio.py                  # esqueleto
│   │   └── supabase_storage.py       # esqueleto
│   └── seguranca/
│       ├── senhas.py                 # argon2id
│       ├── jwt.py
│       ├── refresh.py
│       └── tenant_guard.py
│
├── servicos/
│   ├── auth_servico.py
│   ├── empresa_servico.py            # cria empresa + projeto raiz (mesma tx)
│   ├── projeto_servico.py
│   ├── identidade_servico.py
│   ├── conhecimento_servico.py
│   ├── memoria_servico.py
│   └── asset_servico.py
│
├── ia/
│   ├── provedores/
│   │   ├── base.py
│   │   ├── gemini.py
│   │   └── groq.py
│   ├── roteador.py                   # mapa fixo {tipo → provedor}
│   ├── prompts/                      # Jinja2 versionados ({nome}.v{N}.jinja2)
│   └── context_builder/
│       ├── builder.py                # ContextBuilder.montar(comando)
│       ├── politicas.py              # política de Histórico
│       └── fontes/
│           ├── identidade.py
│           ├── conhecimento_md.py
│           ├── memoria.py
│           ├── assets.py
│           └── historico_recente.py
│
├── executor/                         # NÚCLEO
│   ├── base.py                       # Executor.executar(comando) → ResultadoExecucao
│   ├── comando.py                    # Comando (com schema_version)
│   ├── resultado.py                  # ResultadoExecucao
│   ├── tipos.py                      # TipoComando, Origem
│   ├── pipeline.py
│   └── executores/
│       ├── base.py                   # ExecutorEspecifico
│       └── skill.py                  # ÚNICO no MVP
│
├── habilidades/
│   ├── base.py
│   ├── registro.py
│   └── conteudo/
│       └── criar_post.py             # ÚNICA habilidade ativa
│
├── templates/                        # Reserva de domínio — sem código
│   └── README.md                     # Explica o conceito e o que virá no futuro
│
└── eventos/
    └── publisher.py                  # Publisher + NoOpPublisher
```

**Eliminado do MVP:** `fluxos/`, `funcionarios/`, executores Fluxo/Funcionário/Webhook/Automação.

**Reservado sem código:** `templates/` existe apenas como README documentando o conceito. Nenhuma classe, serviço ou API.

---

## 5. Contratos centrais

### Comando — `executor/comando.py`
```python
@dataclass
class Comando:
    schema_version: int = 1     # versionamento do contrato
    tipo: TipoComando           # SKILL no MVP
    alvo: str                   # ex.: "conteudo.criar_post"
    entrada: dict
    empresa_id: UUID
    projeto_id: UUID | None     # default = projeto raiz
    usuario_id: UUID
    origem: Origem              # WEB | API | CLI | FLUXO | FUNCIONARIO | WEBHOOK | AUTOMACAO
    correlacao_id: UUID
```

O campo `schema_version` faz parte do contrato **desde a versão 1**, preparando a evolução futura da API. Durante a Sprint 0, **apenas `schema_version = 1` será aceito**. O suporte a múltiplas versões será implementado apenas quando houver uma necessidade real de compatibilidade entre versões do contrato.

### ResultadoExecucao — `executor/resultado.py`
```python
@dataclass
class ResultadoExecucao:
    sucesso: bool
    dados: dict | None
    mensagens: list[str]
    arquivos: list[AssetRef]
    metricas: Metricas          # provedor, tokens_in/out, custo, latencia_ms
    erro: ErroExecucao | None
    execucao_id: UUID
```

### Executor
```python
class Executor:
    def __init__(self, registro: dict[TipoComando, ExecutorEspecifico], ...): ...
    def executar(self, comando: Comando) -> ResultadoExecucao:
        # 1. validar (schema_version == 1)
        # 2. resolver ExecutorEspecifico via comando.tipo
        # 3. contexto = ContextBuilder.montar(comando)
        # 4. aplicar políticas
        # 5. resultado = especifico.executar(comando, contexto)
        # 6. persistir execucao (com prompt_template + prompt_version)
        # 7. auditar
        # 8. publisher.publish(...)   ← NoOp no MVP
        # 9. métricas + return
```

---

## 6. Asset (unificado, com origem)

```text
assets(
    id, empresa_id, projeto_id NULL,
    categoria,         -- LOGO | IMAGEM | VIDEO | AUDIO | PDF | FONTE | TEMPLATE | UPLOAD | MOCKUP | ICONE
    origem,            -- UPLOAD | GERADO | IMPORTADO
    escopo,            -- empresa | projeto
    caminho_storage,
    mime, tamanho,
    metadados_jsonb,
    criado_por, criado_em
)
```

---

## 7. Política de Histórico

Em `ia/context_builder/politicas.py` e `fontes/historico_recente.py`:

1. Selecionar execuções por `(empresa_id, projeto_id)`.
2. Ordenar da **mais recente para a mais antiga**.
3. Pegar no máximo as **últimas 5 execuções**.
4. Aplicar limite duro de **10.000 tokens**.
5. Se exceder, **descartar começando pelas mais antigas** até caber.
6. **Nunca** carregar histórico completo.

---

## 8. AI Router — evolução documentada

**MVP (implementado):** mapa fixo `tipo → provedor`.

**Futuro (apenas documentado):** `tipo → estratégia → provedor` (ex.: `conteudo → estrategia_conteudo() → Gemini`). Introduzir apenas quando aparecer necessidade real (custo, fallback, A/B).

---

## 9. Versionamento

### Base de Conhecimento
```text
documentos_conhecimento(
    id, empresa_id, tipo, caminho_storage,
    hash, versao, data_upload, atualizado_em
)
```

### Prompts
- Arquivos em `ia/prompts/` seguem convenção `{nome}.v{N}.jinja2` (ex.: `criar_post.v1.jinja2`).
- Cada execução **registra qual prompt gerou o resultado** (auditoria, comparação, rollback, reprodutibilidade).

### Comando
- Campo `schema_version: int = 1` (ver §5).

---

## 10. Modelo de dados (núcleo)

```text
empresas(id, nome, slug, configuracao_jsonb, criado_em)
projetos(id, empresa_id, nome, slug, eh_raiz, criado_em)
usuarios(id, empresa_id, email, senha_hash, criado_em)
refresh_tokens(id, usuario_id, hash, expira_em, revogado_em)

identidade_empresa(empresa_id PK, cores_jsonb, fontes_jsonb,
                   tom_de_voz, logo_caminho, manual_caminho, atualizado_em)

documentos_conhecimento(id, empresa_id, tipo, caminho_storage,
                        hash, versao, data_upload, atualizado_em)

memoria_itens(id, empresa_id, projeto_id NULL, tipo, conteudo,
              peso, origem, criado_em)

assets(id, empresa_id, projeto_id NULL, categoria, origem, escopo,
       caminho_storage, mime, tamanho, metadados_jsonb,
       criado_por, criado_em)

execucoes(
    id, empresa_id, projeto_id, usuario_id,
    tipo_comando, alvo, origem, correlacao_id,
    schema_version,                 -- versão do contrato Comando
    entrada_jsonb, saida_jsonb,
    provedor, custo, tokens_in, tokens_out, latencia_ms,
    prompt_template,                -- nome do template (ex.: "criar_post")
    prompt_version,                 -- versão (ex.: 1)
    status, erro, criado_em
)
```

---

## 11. Sprint 0 — escopo congelado

**Fluxo do usuário:**
1. Registro / Login
2. Cadastro da empresa → cria empresa + projeto raiz (mesma tx)
3. Upload da Identidade (logo, cores, fontes, tom de voz)
4. Upload da Base de Conhecimento (`.md`) com versão e data
5. CRUD inicial da Memória
6. Upload mínimo de Assets (ex.: logo) com `origem=UPLOAD`
7. Executar `conteudo.criar_post` via `POST /v1/comandos/executar`
8. Ver `ResultadoExecucao` (com `prompt_template` + `prompt_version` no histórico)
9. Ver histórico (últimas 5)

**Entregas técnicas:**
1. FastAPI + Docker Compose + Postgres local
2. Alembic com as 8 tabelas do §10 (execucoes inclui prompt_template, prompt_version, schema_version)
3. Auth própria (argon2id + JWT + refresh + `tenant_guard`)
4. `StorageBackend` + `Filesystem`
5. `ContextBuilder.montar(comando)` com fontes: Identidade, ConhecimentoMD, Memoria, Assets, HistoricoRecente (§7)
6. `Roteador` IA mapa fixo + adapters Gemini e Groq
7. `Executor` + `ExecutorSkill` + `NoOpPublisher` (rejeita `schema_version != 1`)
8. `EmpresaServico.criar_empresa` com projeto raiz na mesma transação
9. Habilidade `conteudo/criar_post` usando `ia/prompts/criar_post.v1.jinja2`; cada execução grava `prompt_template="criar_post"` + `prompt_version=1`
10. `templates/README.md` reservando o domínio (sem código)
11. Frontend Lovable: Login, Empresa, Identidade, Conhecimento, Memória, Assets (mínimo), Criar Post, Resultado, Histórico

**Fora do MVP:** camada Templates ativa, Fluxos, Funcionários Digitais, executores adicionais, autodiscovery, plugins, estratégias no Router, RAG/embeddings, billing, multiusuário completo, eventos tipados, backends adicionais de Storage, suporte a múltiplas versões de `schema_version`.

---

## 12. Roadmap pós-MVP

| Fase | Foco                                                                 |
| ---- | -------------------------------------------------------------------- |
| 1    | +5 habilidades de conteúdo                                           |
| 2    | Ativar camada Templates (quando ≥2 habilidades reutilizarem layout)  |
| 3    | Ativar Fluxos                                                        |
| 4    | Ativar Funcionários Digitais                                         |
| 5    | Estratégias no AI Router                                             |
| 6    | Backends adicionais de Storage                                       |
| 7    | Múltiplos projetos na UI                                             |
| 8    | Consumidores de eventos                                              |
| 9    | RAG (pgvector)                                                       |
| 10   | Webhooks / Automação / Integrações                                   |
| 11   | Multiusuário completo, planos, billing → SaaS                        |

---

## 13. Congelamento OFICIAL

A partir deste ponto:
- **Não** adicionar novas camadas.
- **Não** adicionar novas abstrações.
- **Não** criar estrutura para funcionalidades inexistentes.
- Qualquer nova abstração só surge diante de **necessidade concreta** durante a implementação.

A arquitetura está oficialmente congelada na **v6.1**.

---

## 14. Branch de implementação

O versionamento neste workspace é gerenciado pelo Lovable. **Não posso executar `git checkout -b` diretamente** dentro do sandbox.

- Nome sugerido para a branch de implementação no GitHub: **`feature/sprint-0`**.
- Quando o repositório GitHub estiver conectado, crie essa branch a partir do commit que aprovar este plano.
- Este `.lovable/plan.md` (v6.1) fica como referência arquitetural congelada do projeto.

---

## 15. Decisões finais a confirmar (3 itens)

1. **Hospedagem produção MVP:** Fly.io ou VPS Linux? (preferencial: Fly.io)
2. **Postgres produção:** Neon ou Postgres no próprio host?
3. **Lovable Cloud no frontend:** desabilitado (auth/dados 100% backend Python) — confirmado?

Confirmados estes 3 itens, inicio a Sprint 0 imediatamente após a aprovação deste plano.
