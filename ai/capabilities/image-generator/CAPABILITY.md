# image-generator

> **Manifesto:** [`manifest.yaml`](manifest.yaml) — fonte oficial de
> metadados (versão, contrato de entrada/saída estruturado, permissões,
> adapters, custo, etc.), pensada para leitura por máquinas. Este
> documento cobre o objetivo, as regras e o "como usar" em prosa — nunca
> repete o que já está no manifesto.

Esta é a especificação **oficial e única** desta capability — vale para
qualquer agente de IA que a execute (Claude Code, Codex, Gemini, Llama,
Mistral, Qwen, OpenClaw, um cliente MCP, ou qualquer outro acessado via
API). Nenhum adaptador (ver `ai/adapters/`) deve repetir o conteúdo
abaixo — só traduzir o mecanismo de invocação para as particularidades do
agente que ele integra. Ver `ai/contracts/capability-vs-adapter.md` para a
linha divisória exata.

## Objetivo

Gerar imagens a partir de um prompt textual, chamando a API de um provedor
externo de geração de imagem, salvando os arquivos em disco e devolvendo um
contrato de saída estável (JSON) que qualquer outra capability consegue
consumir sem entender os detalhes de cada provedor.

## Quando usar

Sempre que a tarefa pedir para criar, gerar, ilustrar ou desenhar uma
imagem a partir de uma descrição — banner, thumbnail, ilustração, mockup,
imagem de post, arte de capa, foto conceitual etc. Esta capability sozinha
**não é suficiente** quando o pedido envolve a marca/identidade visual de
uma empresa específica — nesse caso, quem deveria ser chamada é uma
capability de negócio (ex. `branded-image-generator`, ainda não
implementada) que consulta `company-knowledge` (`ai/knowledge/company-knowledge/`)
e então chama esta capability com os parâmetros de marca já resolvidos.

## Regra de isolamento (por que esta capability existe assim)

Esta é uma capability de **camada genérica**: precisa funcionar igual em
qualquer projeto, para qualquer empresa, copiada e colada sem edição. Por
isso:

- **Nunca lê `empresas/**`** nem qualquer arquivo que identifique uma
  empresa. Se o pedido menciona marca, branding, tom de voz ou qualquer
  coisa específica da empresa, isso não é problema desta capability —
  quem está executando deve sinalizar que o pedido precisa passar por uma
  capability de negócio.
- Todo dado visual (cores, estilo, texto a incluir na imagem, logo) chega
  **explícito no prompt ou nos parâmetros** de quem chamou. Nunca adivinhe,
  nunca hardcode, nunca busque em outro lugar do projeto.

## Contrato de entrada e saída

O schema exato — cada parâmetro, tipo, obrigatoriedade e padrão — é
`entradas`/`saidas` em [`manifest.yaml`](manifest.yaml) (ver
`ai/contracts/manifest-schema.md` para o formato). Em prosa: recebe um
`prompt` (obrigatório) e parâmetros opcionais de provedor/tamanho/saída, e
devolve sempre um único objeto JSON — mesmo em caso de erro:

```json
{"provider": "fal", "model": "fal-ai/flux/schnell", "prompt": "...", "images": [{"path": "..."}], "error": null}
```

Detalhes de como cada provedor é escolhido e chamado, em
`references/providers.md`. Como escrever um bom prompt, em
`references/prompting.md`. Forma completa do contrato de saída, exemplos
de sucesso/falha e convenção de nomes de arquivo, em
`references/output-contract.md`.

## Como executar

Esta capability é distribuída como um script de linha de comando sem
dependências externas (só a biblioteca padrão do Python), pensado para ser
invocado por **qualquer agente com acesso a shell**:

```bash
python ai/capabilities/image-generator/scripts/generate_image.py \
  --prompt "descrição completa da imagem" \
  --n 1 \
  --size 1024x1024 \
  --output-dir ./generated-images
```

Se o agente que está executando esta capability já tiver acesso nativo a
uma ferramenta de geração de imagem (uma tool/MCP própria do agente), essa
via costuma ser mais direta — mas o resultado final deve respeitar o mesmo
contrato de saída acima, para que outras capabilities continuem podendo
consumir o resultado sem saber qual caminho foi usado. Use o script como
via universal quando não houver alternativa nativa.

## Tratamento de erros

Se o script devolver `"error"` preenchido (chave de API ausente, rate
limit, resposta inesperada), **não finja que a imagem foi gerada**. A
mensagem de erro já indica o que fazer (tipicamente configurar uma
variável de ambiente) — repasse isso adiante em vez de tentar contornar
silenciosamente. Código de saída `0` = sucesso, `1` = erro tratado.

## Referências

- `references/providers.md` — variável de ambiente, modelo padrão e notas
  específicas de cada provedor suportado.
- `references/prompting.md` — como estruturar um bom prompt de imagem.
- `references/output-contract.md` — formato exato do JSON de saída e
  convenção de nomes/pastas dos arquivos gerados.

Adaptadores disponíveis: ver `adapters_disponiveis` em
[`manifest.yaml`](manifest.yaml).
