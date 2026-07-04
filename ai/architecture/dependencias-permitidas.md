# Dependências Permitidas

Tabela de referência rápida — o quê pode chamar o quê. Linha = quem chama,
coluna = quem é chamado. As regras abaixo valem para a **Capability**,
independentemente de qual agente a esteja executando — dependência é
sempre entre Capabilities, nunca entre adapters.

| Quem chama ↓ / Quem é chamado → | Conhecimento | Capacidade genérica | Negócio | Workflow |
|---|---|---|---|---|
| **Conhecimento** | ❌ nunca | ❌ nunca | ❌ nunca | ❌ nunca |
| **Capacidade genérica** | ❌ nunca | ⚠️ só entre si, como dependência técnica (não de negócio) | ❌ nunca | ❌ nunca |
| **Negócio** | ✅ obrigatório quando a ação depende da empresa | ✅ livre | ❌ nunca | ❌ nunca |
| **Workflow** | ✅ livre | ⚠️ só quando a tarefa é deliberadamente neutra de marca | ✅ livre | ⚠️ só como sub-workflow, sem ciclos (ver nota) |

`✅` permitido e comum. `⚠️` permitido com uma condição específica (ver as
notas abaixo). `❌` proibido — se você se pegar precisando disso, é sinal
de que a Capability está na camada errada.

## Notas sobre os casos `⚠️`

**Capacidade genérica chamando outra capacidade genérica.** É permitido
quando a dependência é puramente técnica e continuaria fazendo sentido em
qualquer projeto — ex. `video-generator` usar `image-generator` para gerar
um frame inicial. Não é permitido usar isso como atalho para meter lógica
de negócio disfarçada de "capacidade" (se `image-generator` precisasse
saber sobre marca para ajudar `video-generator`, o problema não é a
dependência, é que uma das duas parou de ser genérica).

**Workflow chamando capacidade genérica direto.** Só quando a tarefa não
tem nada de marca envolvido — ex. um workflow interno que só precisa gerar
um diagrama técnico sem identidade visual nenhuma. Assim que a marca entra
(cor, tom, logo), o workflow deve passar pela Capability de **Negócio**
correspondente, não pela capacidade genérica direto — senão o branding é
pulado sem ninguém perceber.

**Workflow chamando outro workflow (sub-workflow).** É a única exceção à
regra de "nunca chama algo da mesma camada" — permitida porque, em escala
(múltiplos workflows compostos, campanhas inteiras), reimplementar o mesmo
sub-fluxo em cada workflow que precisa dele é pior do que compor. Duas
condições:
1. **Sem ciclos** — se `campanha-completa` chama `instagram-post`,
   `instagram-post` nunca pode chamar `campanha-completa` de volta, direta
   ou indiretamente.
2. **Só quando o sub-fluxo é realmente reaproveitável como está.** Se dois
   workflows precisam do "mesmo passo" mas com pequenas variações de
   negócio, considere extrair esse passo como uma Capability de
   **Negócio** compartilhada em vez de aninhar workflows — evita a
   arquitetura virar uma árvore de workflows chamando workflows sem
   necessidade real.

## Exemplos de fluxos corretos

```
✅ instagram-post (workflow)
     → company-knowledge (conhecimento)
     → branded-image-generator (negócio)
         → company-knowledge (conhecimento)
         → image-generator (capacidade genérica)

✅ video-generator (capacidade genérica)
     → image-generator (capacidade genérica)   [frame inicial, dependência técnica]

✅ campanha-completa (workflow)
     → instagram-post (workflow)                [sub-workflow, sem ciclo]
     → landing-page-generator (workflow)         [sub-workflow, sem ciclo]

✅ branded-image-generator (negócio)
     → company-knowledge (conhecimento)
     → image-generator (capacidade genérica)
```

## Exemplos de fluxos incorretos

```
❌ image-generator (capacidade genérica) → company-knowledge (conhecimento)
   Por quê: capacidade genérica não pode subir para conhecimento — ela
   deixaria de funcionar fora do Caetus OS (e fora de qualquer agente).

❌ company-knowledge (conhecimento) → image-generator (capacidade genérica)
   Por quê: conhecimento não depende de nada — ele só lê e interpreta.

❌ branded-image-generator (negócio) → instagram-post (workflow)
   Por quê: negócio nunca chama workflow — isso é subir na hierarquia.

❌ sales-objection-handler (negócio) → branded-image-generator (negócio)
   Por quê: negócio não chama outra Capability de negócio. Se as duas
   precisam do mesmo dado, ambas consultam company-knowledge
   independentemente — a duplicação de consulta é aceitável, o
   acoplamento entre duas Capabilities de negócio não é.

❌ instagram-post (workflow) → image-generator (capacidade genérica) direto,
   pulando branded-image-generator, para gerar a imagem de um post real
   Por quê: a tarefa claramente envolve marca — pular a Capability de
   negócio aqui gera uma imagem fora do padrão visual da empresa sem
   ninguém notar.
```
