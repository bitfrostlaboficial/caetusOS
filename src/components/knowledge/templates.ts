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
};
