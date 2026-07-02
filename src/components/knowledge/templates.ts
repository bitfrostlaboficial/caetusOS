export interface Template {
  nome: string;
  conteudo: string;
  descricao: string;
}

export const TEMPLATES_SISTEMA: Record<string, Template> = {
  "sobre_empresa.md": {
    nome: "Sobre a Empresa",
    descricao: "História, visão geral e atuação da empresa no mercado.",
    conteudo: `<!-- CAETUSOS_TEMPLATE_HEADER_START -->
# Guia de Preenchimento: Sobre a Empresa
*Utilize este modelo para descrever a sua empresa. A IA utilizará estas informações para entender quem é a sua marca, o que ela faz e qual a sua história.*
**Instruções:** Substitua os textos de exemplo abaixo pelas informações reais da sua empresa. Os blocos marcados como exemplos serão ignorados pela IA se não forem editados.
<!-- CAETUSOS_TEMPLATE_HEADER_END -->

# Sobre a Empresa

## Nome Oficial e Nome Fantasia
<!-- CAETUSOS_EXEMPLO_START -->
*Exemplo:* caetusOS Soluções Tecnológicas Ltda (caetusOS)
<!-- CAETUSOS_EXEMPLO_END -->
[Insira aqui o nome da sua empresa]

## Setor de Atuação e Nicho
<!-- CAETUSOS_EXEMPLO_START -->
*Exemplo:* Desenvolvimento de software, inteligência artificial e automação de processos para pequenas e médias empresas.
<!-- CAETUSOS_EXEMPLO_END -->
[Insira aqui o seu setor de atuação]

## História e Fundação
<!-- CAETUSOS_EXEMPLO_START -->
*Exemplo:* Fundada em 2024 por especialistas em IA e engenharia de software, a caetusOS nasceu com o propósito de democratizar o acesso a funcionários digitais inteligentes, otimizando fluxos de trabalho que antes demandavam horas de processos manuais.
<!-- CAETUSOS_EXEMPLO_END -->
[Insira aqui a história e fundação da empresa]

## O que Fazemos (Proposta de Valor Principal)
<!-- CAETUSOS_EXEMPLO_START -->
*Exemplo:* Criamos e orquestramos agentes de inteligência artificial personalizados (Funcionários Digitais) que se integram aos canais de comunicação, CRMs e ERPs das empresas, executando tarefas de atendimento, vendas, marketing e suporte técnico de forma autônoma e humanizada.
<!-- CAETUSOS_EXEMPLO_END -->
[Insira aqui o que sua empresa faz]

## Sede e Abrangência de Atendimento
<!-- CAETUSOS_EXEMPLO_START -->
*Exemplo:* Sede em Florianópolis/SC, com atendimento 100% digital e clientes em todo o território nacional e América Latina.
<!-- CAETUSOS_EXEMPLO_END -->
[Insira aqui a localização e área de atendimento]
`,
  },
  "missao.md": {
    nome: "Missão",
    descricao: "A razão de existir da empresa e o impacto que ela quer gerar hoje.",
    conteudo: `<!-- CAETUSOS_TEMPLATE_HEADER_START -->
# Guia de Preenchimento: Missão da Empresa
*A Missão define o propósito atual da organização. É a bússola que guia as decisões diárias e os esforços dos funcionários (físicos e digitais).*
<!-- CAETUSOS_TEMPLATE_HEADER_END -->

# Missão da Empresa

## Declaração de Missão
<!-- CAETUSOS_EXEMPLO_START -->
*Exemplo:* Nossa missão é capacitar empresas de todos os tamanhos a escalarem suas operações através de inteligência artificial prática e acessível, eliminando tarefas repetitivas e liberando o potencial humano para a criatividade e estratégia.
<!-- CAETUSOS_EXEMPLO_END -->
[Insira aqui a declaração de missão da sua empresa]

## Para quem existimos?
<!-- CAETUSOS_EXEMPLO_START -->
*Exemplo:* Existimos para empreendedores, gestores e equipes que se sentem sobrecarregados com processos burocráticos e buscam eficiência operacional sem perder a qualidade no atendimento.
<!-- CAETUSOS_EXEMPLO_END -->
[Insira aqui o público-alvo ou beneficiários principais]

## Como geramos valor?
<!-- CAETUSOS_EXEMPLO_START -->
*Exemplo:* Através da entrega de agentes de IA confiáveis, fáceis de configurar, integrados às ferramentas do dia a dia e que trazem resultados mensuráveis logo nas primeiras semanas de uso.
<!-- CAETUSOS_EXEMPLO_END -->
[Insira aqui como sua empresa gera valor]
`,
  },
  "visao.md": {
    nome: "Visão",
    descricao: "Onde a empresa quer chegar no futuro (metas de longo prazo).",
    conteudo: `<!-- CAETUSOS_TEMPLATE_HEADER_START -->
# Guia de Preenchimento: Visão da Empresa
*A Visão aponta para o futuro. Onde a empresa quer estar daqui a 5 ou 10 anos? Ela inspira crescimento e inovação.*
<!-- CAETUSOS_TEMPLATE_HEADER_END -->

# Visão da Empresa

## Declaração de Visão
<!-- CAETUSOS_EXEMPLO_START -->
*Exemplo:* Ser a plataforma líder em orquestração de Funcionários Digitais na América Latina até 2028, sendo reconhecida pela simplicidade técnica, segurança de dados e excelência na humanização de interações automatizadas.
<!-- CAETUSOS_EXEMPLO_END -->
[Insira aqui a declaração de visão da sua empresa]

## Metas de Longo Prazo (Onde queremos chegar?)
<!-- CAETUSOS_EXEMPLO_START -->
- Alcançar a marca de 10.000 agentes ativos em produção.
- Expandir a operação física/comercial para mais 3 países parceiros.
- Ser eleita uma das 10 melhores startups de IA para se trabalhar no Brasil.
<!-- CAETUSOS_EXEMPLO_END -->
- [Insira meta de longo prazo 1]
- [Insira meta de longo prazo 2]
- [Insira meta de longo prazo 3]
`,
  },
  "cultura.md": {
    nome: "Cultura e Valores",
    descricao: "Os princípios morais e comportamentais que regem a empresa.",
    conteudo: `<!-- CAETUSOS_TEMPLATE_HEADER_START -->
# Guia de Preenchimento: Cultura e Valores
*Os Valores ditam o comportamento interno da equipe e como a marca se posiciona perante parceiros e clientes.*
<!-- CAETUSOS_TEMPLATE_HEADER_END -->

# Cultura e Valores

## Nossos Pilares de Comportamento

### 1. Obsessão pelo Cliente
<!-- CAETUSOS_EXEMPLO_START -->
*Exemplo:* Não criamos tecnologia apenas porque é moderna; criamos porque ela resolve uma dor real do cliente. O sucesso dele é a nossa única métrica de vaidade.
<!-- CAETUSOS_EXEMPLO_END -->
[Insira o Valor 1 e sua descrição]

### 2. Simplicidade é Sofisticação
<!-- CAETUSOS_EXEMPLO_START -->
*Exemplo:* O mundo corporativo já é complexo demais. Buscamos a solução mais simples, direta e elegante para cada desafio técnico ou de processo.
<!-- CAETUSOS_EXEMPLO_END -->
[Insira o Valor 2 e sua descrição]

### 3. Autonomia com Responsabilidade
<!-- CAETUSOS_EXEMPLO_START -->
*Exemplo:* Confiamos nas nossas pessoas e nos nossos agentes. Damos liberdade para propor, testar e errar rápido, contanto que haja aprendizado e ética nas ações.
<!-- CAETUSOS_EXEMPLO_END -->
[Insira o Valor 3 e sua descrição]

### 4. Aprendizado Contínuo
<!-- CAETUSOS_EXEMPLO_START -->
*Exemplo:* Em um mercado que muda diariamente, a curiosidade é nossa maior aliada. Incentivamos o estudo, a leitura e o compartilhamento de novos aprendizados.
<!-- CAETUSOS_EXEMPLO_END -->
[Insira o Valor 4 e sua descrição]
`,
  },
  "diferenciais.md": {
    nome: "Diferenciais Competitivos",
    descricao: "O que torna a sua empresa única e melhor do que a concorrência.",
    conteudo: `<!-- CAETUSOS_TEMPLATE_HEADER_START -->
# Guia de Preenchimento: Diferenciais Competitivos
*Por que o cliente deve escolher você e não o concorrente? Descreva seus diferenciais para que a IA os utilize como argumentos de vendas e copy.*
<!-- CAETUSOS_TEMPLATE_HEADER_END -->

# Diferenciais Competitivos

## O que nos diferencia no mercado?

### 1. Facilidade de Integração (Sem Código)
<!-- CAETUSOS_EXEMPLO_START -->
*Exemplo:* Enquanto outras plataformas exigem desenvolvedores caros e semanas de setup, nossos agentes são ativados em menos de 10 minutos por qualquer profissional através de uma interface visual e amigável.
<!-- CAETUSOS_EXEMPLO_END -->
[Descreva aqui seu diferencial competitivo 1]

### 2. Humanização Avançada da IA
<!-- CAETUSOS_EXEMPLO_START -->
*Exemplo:* Nossos modelos de linguagem são ajustados para evitar respostas engessadas ou robóticas. Eles compreendem gírias locais, contextos complexos e demonstram empatia nas tomadas de decisão.
<!-- CAETUSOS_EXEMPLO_END -->
[Descreva aqui seu diferencial competitivo 2]

### 3. Suporte Dedicado de Elite
<!-- CAETUSOS_EXEMPLO_START -->
*Exemplo:* Não deixamos nossos clientes conversando com robôs de suporte genéricos. Cada conta possui um Gerente de Sucesso dedicado para apoiar na estratégia e melhoria contínua das automações.
<!-- CAETUSOS_EXEMPLO_END -->
[Descreva aqui seu diferencial competitivo 3]
`,
  },
  "personas.md": {
    nome: "Personas",
    descricao: "O perfil detalhado do cliente ideal (ICP/Persona) da empresa.",
    conteudo: `<!-- CAETUSOS_TEMPLATE_HEADER_START -->
# Guia de Preenchimento: Personas da Empresa
*Descreva o seu cliente ideal. Isso ajuda os Funcionários Digitais a criarem textos persuasivos, anúncios precisos e abordagens comerciais adequadas.*
<!-- CAETUSOS_TEMPLATE_HEADER_END -->

# Perfil do Cliente Ideal (Persona)

## Persona Principal: [Insira o Nome da Persona]

### Perfil Demográfico
<!-- CAETUSOS_EXEMPLO_START -->
- **Nome:** Carlos Eduardo (Cadu)
- **Idade:** 38 anos
- **Profissão:** Diretor de Operações em uma PME de Logística (50 funcionários)
- **Formação:** Administração de Empresas ou Engenharia de Produção
- **Renda Média:** R$ 12.000,00 / mês
<!-- CAETUSOS_EXEMPLO_END -->
- **Nome/Perfil:** [Ex: Maria, Diretora Comercial]
- **Idade:** [Ex: 30 a 45 anos]
- **Profissão:** [Ex: Gestora de Marketing]
- **Formação:** [Insira aqui]
- **Renda/Porte da Empresa:** [Insira aqui]

### Dores e Frustrações Diárias
<!-- CAETUSOS_EXEMPLO_START -->
- Perde muito tempo resolvendo problemas operacionais básicos no WhatsApp.
- Dificuldade para treinar e reter colaboradores de nível júnior para o suporte.
- Sente que a empresa não escala porque a equipe está sempre sobrecarregada com tarefas manuais repetitivas.
- Falta de controle de métricas e histórico de atendimento centralizado.
<!-- CAETUSOS_EXEMPLO_END -->
- [Insira a Dor 1]
- [Insira a Dor 2]
- [Insira a Dor 3]

### Desejos e Objetivos Profissionais
<!-- CAETUSOS_EXEMPLO_START -->
- Automatizar 70% das dúvidas frequentes da operação de forma segura.
- Reduzir o tempo de primeira resposta ao cliente para menos de 1 minuto.
- Ter clareza operacional através de relatórios e painéis simples.
- Escalar as vendas sem precisar dobrar a equipe de atendimento de imediato.
<!-- CAETUSOS_EXEMPLO_END -->
- [Insira o Objetivo 1]
- [Insira o Objetivo 2]
- [Insira o Objetivo 3]

### Como nosso produto/serviço resolve a vida dele(a)?
<!-- CAETUSOS_EXEMPLO_START -->
*Exemplo:* O caetusOS entrega Funcionários Digitais pré-treinados no nicho dele, prontos para assumirem o atendimento básico e triagem de leads de forma autônoma 24 horas por dia, liberando sua equipe humana para focar em fechamentos complexos e pós-venda estratégico.
<!-- CAETUSOS_EXEMPLO_END -->
[Descreva a solução para a dor dessa persona]
`,
  },
  "posicionamento.md": {
    nome: "Posicionamento de Marca",
    descricao: "Como a marca se posiciona na mente do consumidor e qual a sua proposta.",
    conteudo: `<!-- CAETUSOS_TEMPLATE_HEADER_START -->
# Guia de Preenchimento: Posicionamento de Marca
*Como sua empresa quer ser percebida pelo mercado? Descreva seu posicionamento estratégico, proposta de valor e manifesto de marca.*
<!-- CAETUSOS_TEMPLATE_HEADER_END -->

# Posicionamento de Marca

## Proposta Única de Valor (PUV)
<!-- CAETUSOS_EXEMPLO_START -->
*Exemplo:* Funcionários Digitais inteligentes que resolvem o seu operacional burocrático em minutos, sem complicação técnica e com foco em resultados reais de negócio.
<!-- CAETUSOS_EXEMPLO_END -->
[Insira aqui a proposta única de valor da sua marca]

## Pilares de Posicionamento
<!-- CAETUSOS_EXEMPLO_START -->
- **Pragmatismo:** Focamos em ferramentas que dão retorno financeiro e de tempo, não em futilidades tecnológicas.
- **Inovação Acessível:** Traduzimos o complexo mundo da inteligência artificial em ações simples de um clique.
- **Parceria Humana:** Acreditamos que a IA serve para potencializar as pessoas, e não para criar barreiras ou distanciamento emocional.
<!-- CAETUSOS_EXEMPLO_END -->
- **Pilar 1:** [Insira descrição]
- **Pilar 2:** [Insira descrição]
- **Pilar 3:** [Insira descrição]

## Manifesto / Frase de Efeito da Marca
<!-- CAETUSOS_EXEMPLO_START -->
*Exemplo:* "A tecnologia deve trabalhar por você, não o contrário. Recupere o controle do seu tempo e foque no que realmente importa para fazer sua empresa crescer."
<!-- CAETUSOS_EXEMPLO_END -->
[Insira aqui o manifesto ou slogan principal da sua marca]
`,
  },
  "tom_de_voz.md": {
    nome: "Tom de Voz",
    descricao: "Diretrizes de comunicação, palavras recomendadas e proibidas.",
    conteudo: `<!-- CAETUSOS_TEMPLATE_HEADER_START -->
# Guia de Preenchimento: Tom de Voz da Marca
*Como a marca fala com as pessoas? Divertida? Séria? Educativa? Descreva o tom de voz para que a IA escreva exatamente como sua equipe escreveria.*
<!-- CAETUSOS_TEMPLATE_HEADER_END -->

# Diretrizes de Tom de Voz

## Características Principais do Nosso Tom

### 1. Claro e Direto
<!-- CAETUSOS_EXEMPLO_START -->
*Explicação:* Evitamos jargões corporativos excessivos, siglas incompreensíveis e termos técnicos sem explicação. Explicamos conceitos complexos usando analogias do dia a dia.
<!-- CAETUSOS_EXEMPLO_END -->
[Insira característica 1 e como aplicar]

### 2. Entusiasta e Otimista (Mas com os pés no chão)
<!-- CAETUSOS_EXEMPLO_START -->
*Explicação:* Falamos de tecnologia com brilho nos olhos e encorajamos o cliente a inovar, mas sempre focando em resultados reais e tangíveis, sem promessas milagrosas.
<!-- CAETUSOS_EXEMPLO_END -->
[Insira característica 2 e como aplicar]

### 3. Profissional e Amigável
<!-- CAETUSOS_EXEMPLO_START -->
*Explicação:* Nos posicionamos como parceiros especialistas de confiança. Somos cordiais, educados e acessíveis, usando um tom de conversa de 'café com um colega de trabalho'.
<!-- CAETUSOS_EXEMPLO_END -->
[Insira característica 3 e como aplicar]

## Palavras e Expressões que Gostamos de Usar
<!-- CAETUSOS_EXEMPLO_START -->
- Eficiência prática
- Tempo livre para o estratégico
- Funcionários Digitais inteligentes
- Sem complicação técnica
- Parceria de crescimento
<!-- CAETUSOS_EXEMPLO_END -->
- [Expressão de preferência 1]
- [Expressão de preferência 2]
- [Expressão de preferência 3]

## Palavras e Expressões que Evitamos a todo custo
<!-- CAETUSOS_EXEMPLO_START -->
- Revolução disruptiva hiper-escalável (muito clichê)
- Framework sinérgico holístico (muito corporativo/vazio)
- Substituir humanos por robôs (vai contra nosso valor de parceria humana)
- Fácil demais, ganhe dinheiro dormindo (soa amador/duvidoso)
<!-- CAETUSOS_EXEMPLO_END -->
- [Termo evitado 1]
- [Termo evitado 2]
- [Termo evitado 3]
`,
  },
  "produto_a.md": {
    nome: "Ficha do Produto Principal",
    descricao: "Preços, características, benefícios e diferenciais do produto principal.",
    conteudo: `<!-- CAETUSOS_TEMPLATE_HEADER_START -->
# Guia de Preenchimento: Ficha de Produto
*Cada produto ou serviço da empresa deve ter uma ficha informativa. A IA usará este material para tirar dúvidas de clientes ou gerar posts de vendas.*
<!-- CAETUSOS_TEMPLATE_HEADER_END -->

# Ficha de Produto: [Nome do Produto / Serviço Principal]

## Descrição Geral
<!-- CAETUSOS_EXEMPLO_START -->
*Exemplo:* O caetusOS Basic é uma licença mensal que dá acesso a até 3 Funcionários Digitais integrados nativamente com WhatsApp e Instagram, ideais para triar novos contatos, responder dúvidas frequentes e agendar reuniões comerciais.
<!-- CAETUSOS_EXEMPLO_END -->
[Insira aqui o resumo do produto/serviço]

## Preço e Planos de Pagamento
<!-- CAETUSOS_EXEMPLO_START -->
- **Mensal:** R$ 497,00 por mês (sem fidelidade)
- **Anual:** R$ 397,00 por mês (cobrado anualmente, economia de 20%)
- **Taxa de Implantação:** Não cobramos taxa de setup.
<!-- CAETUSOS_EXEMPLO_END -->
[Insira aqui as condições comerciais e valores]

## Principais Recursos / Funcionalidades
<!-- CAETUSOS_EXEMPLO_START -->
- **Integração Nativa:** Conecta com WhatsApp Business e Instagram Direct em 2 cliques.
- **Painel de Controle:** Visualização das conversas em tempo real e intervenção humana facilitada.
- **Memória de Longo Prazo:** O agente se lembra do histórico do cliente para um atendimento personalizado.
- **Integração com CRM:** Envia leads qualificados automaticamente para o RD Station ou ActiveCampaign.
<!-- CAETUSOS_EXEMPLO_END -->
- **Recurso 1:** [Breve explicação]
- **Recurso 2:** [Breve explicação]
- **Recurso 3:** [Breve explicação]

## Principais Benefícios (O que o cliente ganha?)
<!-- CAETUSOS_EXEMPLO_START -->
- **Disponibilidade 24/7:** Clientes respondidos em segundos, mesmo de madrugada ou aos finais de semana.
- **Redução de Custos:** Automatiza o trabalho equivalente ao de 2 atendentes de nível básico por uma fração do custo.
- **Aumento de Conversão:** O lead é respondido na hora de maior interesse, aumentando as chances de fechamento em até 4x.
<!-- CAETUSOS_EXEMPLO_END -->
- [Benefício 1]
- [Benefício 2]
- [Benefício 3]
`,
  },
  "perguntas_frequentes.md": {
    nome: "FAQ (Perguntas Frequentes)",
    descricao: "Dúvidas comuns de clientes e as respostas corretas recomendadas.",
    conteudo: `<!-- CAETUSOS_TEMPLATE_HEADER_START -->
# Guia de Preenchimento: FAQ / Dúvidas Frequentes
*Esta lista de perguntas e respostas é o principal material de suporte para a IA. Mantenha as respostas claras, verdadeiras e completas.*
<!-- CAETUSOS_TEMPLATE_HEADER_END -->

# Perguntas Frequentes (FAQ)

### Q1: O sistema funciona em qualquer nicho ou tipo de empresa?
<!-- CAETUSOS_EXEMPLO_START -->
*Resposta:* Sim. Como a plataforma é alimentada pela base de conhecimento que você preenche, os agentes se adaptam perfeitamente a consultórios, e-commerces, agências de marketing, imobiliárias, startups, serviços locais, entre outros.
<!-- CAETUSOS_EXEMPLO_END -->
**Resposta:** [Insira a resposta correta aqui]

### Q2: Preciso ter conhecimentos de programação para configurar?
<!-- CAETUSOS_EXEMPLO_START -->
*Resposta:* Absolutamente não. O caetusOS foi desenhado para ser totalmente visual. Se você sabe enviar um e-mail ou preencher um formulário simples, você consegue criar e colocar seus agentes para rodar sem precisar digitar uma única linha de código.
<!-- CAETUSOS_EXEMPLO_END -->
**Resposta:** [Insira a resposta correta aqui]

### Q3: Posso intervir em uma conversa que o robô está fazendo?
<!-- CAETUSOS_EXEMPLO_START -->
*Resposta:* Sim, a qualquer momento. Através do nosso painel de conversas centralizado, você consegue ler as mensagens em tempo real e assumir a conversa com um único clique. Ao fazer isso, a IA silencia automaticamente para aquela conversa para que o atendimento humano continue fluindo.
<!-- CAETUSOS_EXEMPLO_END -->
**Resposta:** [Insira a resposta correta aqui]

### Q4: Existe fidelidade nos planos contratados?
<!-- CAETUSOS_EXEMPLO_START -->
*Resposta:* Não no plano mensal. Você pode cancelar sua assinatura a qualquer momento através do seu painel administrativo, sem multas ou burocracia. No plano anual, há um contrato de 12 meses com desconto especial, com multa proporcional em caso de cancelamento antecipado.
<!-- CAETUSOS_EXEMPLO_END -->
**Resposta:** [Insira a resposta correta aqui]
`,
  },
  "icp.md": {
    nome: "Perfil de Cliente Ideal (ICP)",
    descricao: "Métricas, faturamento, segmento e características das melhores empresas clientes.",
    conteudo: `<!-- CAETUSOS_TEMPLATE_HEADER_START -->
# Guia de Preenchimento: Perfil de Cliente Ideal (ICP)
*Defina o perfil de empresa com maior probabilidade de comprar, manter-se ativa e obter sucesso com sua solução.*
<!-- CAETUSOS_TEMPLATE_HEADER_END -->

# Perfil de Cliente Ideal (ICP)

## Setor e Nicho de Atuação
<!-- CAETUSOS_EXEMPLO_START -->
*Exemplo:* PMEs nos setores de comércio, imobiliárias, clínicas de saúde/estética, consultorias, advocacia e educação digital.
<!-- CAETUSOS_EXEMPLO_END -->
[Insira os setores-alvo da sua empresa]

## Tamanho e Porte (Funcionários/Faturamento)
<!-- CAETUSOS_EXEMPLO_START -->
- **Equipe:** Entre 5 e 50 colaboradores.
- **Faturamento Anual:** Entre R$ 500 mil e R$ 10 milhões por ano.
- **Decisor:** Proprietário, Diretor Comercial ou Gerente de Operações.
<!-- CAETUSOS_EXEMPLO_END -->
- **Equipe:** [Insira faixa de colaboradores]
- **Faturamento:** [Insira faixa de faturamento]

## Maturidade Tecnológica
<!-- CAETUSOS_EXEMPLO_START -->
*Exemplo:* Utilizam canais digitais de venda (WhatsApp, Instagram), possuem ou buscam ativamente um CRM de vendas (ex. RD Station, HubSpot) e estão abertos à inovação para economizar custos de escala.
<!-- CAETUSOS_EXEMPLO_END -->
[Descreva o nível de tecnologia necessário para seu cliente]
`,
  },
  "objecoes.md": {
    nome: "Quebra de Objeções",
    descricao: "Argumentos comerciais e respostas recomendadas para as dúvidas de vendas.",
    conteudo: `<!-- CAETUSOS_TEMPLATE_HEADER_START -->
# Guia de Preenchimento: Quebra de Objeções
*Quais as barreiras que impedem o cliente de fechar uma compra? Documente os argumentos para a IA contornar essas hesitações de forma profissional.*
<!-- CAETUSOS_TEMPLATE_HEADER_END -->

# Manual de Objeções e Contornos de Vendas

## Objeção 1: Está muito caro / Não tenho orçamento
<!-- CAETUSOS_EXEMPLO_START -->
*Como a IA deve contornar:* Focar no retorno sobre investimento (ROI). Explicar que um único funcionário digital substitui horas de trabalho de triagem manual que geravam perda de leads quentes, custando menos de R$ 17 por dia. Perguntar quanto custa perder 3 ou 4 leads que deixam de ser respondidos rapidamente.
<!-- CAETUSOS_EXEMPLO_END -->
[Insira como contornar esta objeção]

## Objeção 2: Não tenho tempo para configurar / É muito complexo
<!-- CAETUSOS_EXEMPLO_START -->
*Como a IA deve contornar:* Esclarecer que nós entregamos os agentes 100% pré-treinados e prontos para rodar no nicho do cliente. O setup inicial toma menos de 10 minutos e nossa equipe de Sucesso do Cliente apoia em todo o processo se for necessário.
<!-- CAETUSOS_EXEMPLO_END -->
[Insira como contornar esta objeção]

## Objeção 3: Medo da Inteligência Artificial errar ou soar mecânica
<!-- CAETUSOS_EXEMPLO_START -->
*Como a IA deve contornar:* Enfatizar que os agentes são restritos à Base de Conhecimento fornecida (fontes oficiais). Caso surja uma pergunta fora do escopo, eles são programados para transferir graciosamente para um humano e silenciar-se. Além disso, o tom de voz é amigável e personalizado.
<!-- CAETUSOS_EXEMPLO_END -->
[Insira como contornar esta objeção]
`,
  },
  "produto_b.md": {
    nome: "Ficha do Produto Secundário/Premium",
    descricao: "Preços, características e benefícios do produto secundário ou alternativo.",
    conteudo: `<!-- CAETUSOS_TEMPLATE_HEADER_START -->
# Guia de Preenchimento: Ficha do Produto Secundário/Premium
*Descreva seu produto alternativo ou de maior valor (Premium/Upsell) para que a IA saiba como oferecê-lo nas interações.*
<!-- CAETUSOS_TEMPLATE_HEADER_END -->

# Ficha de Produto: [Nome do Produto Premium / Secundário]

## Descrição Geral
<!-- CAETUSOS_EXEMPLO_START -->
*Exemplo:* O caetusOS Enterprise é a nossa solução corporativa personalizada, que oferece agentes integrados diretamente a sistemas internos (ERPs legados, bancos de dados SQL, Slack ou Teams) com fluxos avançados de decisão e segurança máxima de nível militar.
<!-- CAETUSOS_EXEMPLO_END -->
[Insira aqui o resumo do produto premium]

## Preço e Planos de Pagamento
<!-- CAETUSOS_EXEMPLO_START -->
- **Setup Único:** Sob consulta (mínimo de R$ 5.000,00 para mapeamento e criação dos conectores).
- **Mensalidade:** A partir de R$ 1.997,00 por mês (contrato mínimo de 12 meses).
<!-- CAETUSOS_EXEMPLO_END -->
[Insira as condições comerciais]

## Diferenciais da Versão Premium
<!-- CAETUSOS_EXEMPLO_START -->
- Conectores sob medida para APIs privadas.
- SLA de atendimento em até 2 horas.
- Treinamento presencial/remoto da equipe.
<!-- CAETUSOS_EXEMPLO_END -->
- [Diferencial 1]
- [Diferencial 2]
`,
  },
  "cargos.md": {
    nome: "Cargos e Salários",
    descricao: "Organograma, faixas salariais e atribuições por cargo.",
    conteudo: `<!-- CAETUSOS_TEMPLATE_HEADER_START -->
# Guia de Preenchimento: Cargos e Funções
*Organize a estrutura hierárquica e as responsabilidades por departamento para a IA entender quem cuida de cada demanda.*
<!-- CAETUSOS_TEMPLATE_HEADER_END -->

# Estrutura de Cargos, Funções e Responsabilidades

## Departamento de Tecnologia / Produto

### Desenvolvedor de Software Júnior
<!-- CAETUSOS_EXEMPLO_START -->
- **Responsabilidades:** Correção de bugs simples, desenvolvimento de interfaces visuais de baixa complexidade e suporte técnico júnior.
- **Requisitos:** Conhecimento de React, Tailwind CSS e lógica de programação básica.
- **Faixa Salarial:** R$ 3.500,00 a R$ 5.000,00.
<!-- CAETUSOS_EXEMPLO_END -->
- **Responsabilidades:** [Insira responsabilidades]
- **Requisitos:** [Insira requisitos]

### Desenvolvedor de Software Pleno
<!-- CAETUSOS_EXEMPLO_START -->
- **Responsabilidades:** Modelagem de dados, criação de APIs de média a alta complexidade, arquitetura de microsserviços e mentoria júnior.
- **Faixa Salarial:** R$ 6.000,00 a R$ 9.000,00.
<!-- CAETUSOS_EXEMPLO_END -->
- [Insira outro cargo e suas especificações]
`,
  },
  "onboarding.md": {
    nome: "Onboarding de Funcionários",
    descricao: "Manual de boas-vindas e introdução para novos membros da equipe.",
    conteudo: `<!-- CAETUSOS_TEMPLATE_HEADER_START -->
# Guia de Preenchimento: Onboarding de Equipe
*Crie um manual de integração claro para novos contratados saberem como funciona o primeiro dia, as ferramentas e a filosofia de trabalho.*
<!-- CAETUSOS_TEMPLATE_HEADER_END -->

# Manual de Integração e Boas-Vindas

## Boas-vendas!
<!-- CAETUSOS_EXEMPLO_START -->
*Mensagem:* Ficamos extremamente felizes de ter você na caetusOS! Nossa missão é crescer lado a lado de forma transparente e prática.
<!-- CAETUSOS_EXEMPLO_END -->
[Insira sua mensagem de boas-vindas]

## Primeiro Dia e Primeiros Passos
<!-- CAETUSOS_EXEMPLO_START -->
1. **Configuração de Contas:** Peça o convite de acesso para o Google Workspace, Slack e Jira para o gestor de TI.
2. **Reunião de Alinhamento:** Café virtual com o padrinho/madrinha para conhecer a rotina da equipe.
3. **Leitura Mandatória:** Leia os documentos "Sobre a Empresa" e "Cultura e Valores" no caetusOS.
<!-- CAETUSOS_EXEMPLO_END -->
[Descreva o roteiro do primeiro dia]

## Nossas Ferramentas de Trabalho
<!-- CAETUSOS_EXEMPLO_START -->
- **Comunicação:** Slack (mensagens rápidas) e Google Meet (reuniões).
- **Gestão de Projetos:** Jira e Confluence.
- **Base de Conhecimento Interna:** caetusOS.
<!-- CAETUSOS_EXEMPLO_END -->
- [Ferramenta 1]: [Finalidade]
- [Ferramenta 2]: [Finalidade]
`,
  },
  "consultoria.md": {
    nome: "Consultoria e Serviços",
    descricao: "Escopo de entrega, metodologia de serviços e suporte profissional.",
    conteudo: `<!-- CAETUSOS_TEMPLATE_HEADER_START -->
# Guia de Preenchimento: Serviços e Consultorias
*Utilize este espaço para detalhar o escopo, etapas de entrega e cronograma dos seus serviços de consultoria ou projetos.*
<!-- CAETUSOS_TEMPLATE_HEADER_END -->

# Ficha de Serviço: Consultoria e Projetos Personalizados

## Escopo Geral da Consultoria
<!-- CAETUSOS_EXEMPLO_START -->
*Exemplo:* Mapeamento de gargalos e automação de processos de vendas e pós-vendas com agentes de IA. Nosso time de especialistas desenha o fluxo de atendimento ideal para a sua empresa e coloca no ar em até 30 dias.
<!-- CAETUSOS_EXEMPLO_END -->
[Descreva o escopo geral do serviço]

## Etapas da Entrega
<!-- CAETUSOS_EXEMPLO_START -->
1. **Fase 1: Diagnóstico (Semana 1):** Reunião para mapeamento das dores e desenho do fluxo de conversas.
2. **Fase 2: Construção (Semanas 2 e 3):** Desenvolvimento e refinamento dos agentes de IA e integrações.
3. **Fase 3: Implantação e Treinamento (Semana 4):** Homologação, ativação em produção e treinamento das equipes.
<!-- CAETUSOS_EXEMPLO_END -->
[Descreva as etapas ou cronograma de execução]
`,
  },
};
