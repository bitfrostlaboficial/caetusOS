export interface FolderDetail {
  tipo: string;
  rotulo: string;
  descricao: string;
  utilidade: string[];
  arquivosRecomendados: string[];
  impactoIA: string;
  boasPraticas: string[];
  isProtegida: boolean;
}

export const INFORMACOES_PASTAS: Record<string, FolderDetail> = {
  institucional: {
    tipo: "institucional",
    rotulo: "Institucional",
    descricao: "Guarda a essência da empresa, seus valores fundamentais, cultura e objetivos de longo prazo.",
    utilidade: [
      "Sobre a empresa, história e fundadores",
      "Declarações de Missão, Visão e Valores",
      "Cultura organizacional e código de conduta",
      "Diferenciais estratégicos frente ao mercado"
    ],
    arquivosRecomendados: ["PDF", "Markdown (.md)", "Documentos (.docx)"],
    impactoIA: "Essencial para alinhar o posicionamento da IA. Garante que os Funcionários Digitais compreendam a missão e ajam de acordo com a cultura oficial da empresa em todos os canais.",
    boasPraticas: [
      "Mantenha o histórico atualizado de fundação e expansão.",
      "Escreva de forma inspiradora e fiel aos valores praticados no dia a dia."
    ],
    isProtegida: true,
  },
  produto: {
    tipo: "produto",
    rotulo: "Produtos",
    descricao: "Contém a documentação técnica, catálogos e manuais dos produtos físicos ou digitais.",
    utilidade: [
      "Fichas técnicas e manuais de uso",
      "Catálogos de produtos e listas de especificações",
      "Tabelas de compatibilidade e pré-requisitos",
      "Roteiros de lançamento e updates de versão"
    ],
    arquivosRecomendados: ["PDF", "Excel (.xlsx)", "Markdown (.md)"],
    impactoIA: "Permite que os agentes resolvam dúvidas técnicas complexas de clientes sobre produtos, realizem suporte de primeiro nível e recomendem o modelo correto de acordo com a necessidade.",
    boasPraticas: [
      "Separe cada linha de produto ou produto principal em um arquivo dedicado.",
      "Inclua dimensões, pesos, materiais, prazos de entrega e garantias estruturadas."
    ],
    isProtegida: true,
  },
  servico: {
    tipo: "servico",
    rotulo: "Serviços",
    descricao: "Espaço dedicado para descrever as modalidades de serviços prestados e escopo de atuação.",
    utilidade: [
      "Escopo de consultorias, assessorias e mentorias",
      "Contratos de prestação de serviços padrão",
      "Descritivo de etapas de entrega e cronogramas",
      "Metodologia de trabalho e frameworks utilizados"
    ],
    arquivosRecomendados: ["PDF", "Documentos (.docx)", "Markdown (.md)"],
    impactoIA: "Orienta os Funcionários Digitais a apresentarem propostas comerciais alinhadas e explicarem as etapas exatas de como os serviços da empresa são entregues e cobrados.",
    boasPraticas: [
      "Descreva detalhadamente o que está INCLUSO e o que está EXCLUSO em cada modalidade de serviço."
    ],
    isProtegida: true,
  },
  marketing: {
    tipo: "marketing",
    rotulo: "Marketing",
    descricao: "Armazena a identidade, guias de design, tom de voz e estratégias de captação de clientes.",
    utilidade: [
      "Guia de Tom de Voz da marca",
      "Posicionamento de marca e concorrentes",
      "Identidade visual, paleta de cores e logotipos",
      "Campanhas sazonais e roteiros de anúncios"
    ],
    arquivosRecomendados: ["Markdown (.md)", "Imagens (.png, .jpg)", "PDF"],
    impactoIA: "Utilizado pela IA para redigir posts de blog, copy de anúncios, e-mails de vendas e responder redes sociais no tom exato da sua marca, evitando respostas robóticas ou desalinhadas.",
    boasPraticas: [
      "Defina de forma clara as palavras que a marca 'adora usar' e as que são 'proibidas'.",
      "Insira exemplos práticos de copy que funcionaram bem no passado."
    ],
    isProtegida: true,
  },
  comercial: {
    tipo: "comercial",
    rotulo: "Comercial",
    descricao: "Processos comerciais, estratégias de vendas, objeções e tabelas oficiais de preços.",
    utilidade: [
      "Tabelas de preços e condições de pagamento",
      "Roteiro de quebra de objeções frequentes",
      "Playbook de vendas e qualificação de leads (BANT/Spin Selling)",
      "Propostas comerciais e scripts de abordagem"
    ],
    arquivosRecomendados: ["PDF", "Excel (.xlsx)", "Markdown (.md)"],
    impactoIA: "Alimenta os agentes de pré-vendas (SDR) e vendas do WhatsApp. Com isso, eles conseguem negociar, quebrar objeções de preço e guiar o cliente até a conversão sem errar as políticas comerciais.",
    boasPraticas: [
      "Atualize imediatamente sempre que houver reajuste de preços.",
      "Insira as principais razões pelas quais leads desistem da compra e como contorná-las."
    ],
    isProtegida: true,
  },
  cliente: {
    tipo: "cliente",
    rotulo: "Clientes",
    descricao: "Contém dados de comportamento, Ideal Customer Profile (ICP), personas e inteligência de mercado.",
    utilidade: [
      "Perfil do Cliente Ideal (ICP)",
      "Fichas de Personas da marca",
      "Análises de feedback de clientes",
      "Histórico de satisfação e pesquisas de mercado"
    ],
    arquivosRecomendados: ["Markdown (.md)", "PDF", "Excel (.xlsx)"],
    impactoIA: "Ajuda a IA a personalizar a argumentação para as reais dores e desejos dos seus clientes, gerando conexões mais profundas e atendimentos extremamente humanizados.",
    boasPraticas: [
      "Baseie as personas em dados reais de clientes atuais, não apenas em suposições.",
      "Revise anualmente com base nas novas frentes de mercado abertas."
    ],
    isProtegida: true,
  },
  processo: {
    tipo: "processo",
    rotulo: "Processos",
    descricao: "Procedimentos Operacionais Padrão (POPs) e rotinas organizacionais.",
    utilidade: [
      "Procedimentos Operacionais Padrão (POP)",
      "Fluxogramas de tomada de decisão interna",
      "Guias de resolução de crises ou problemas operacionais",
      "Políticas de trocas, devoluções e estornos"
    ],
    arquivosRecomendados: ["PDF", "Markdown (.md)", "Documentos (.docx)"],
    impactoIA: "Ensina a IA a triar problemas de suporte técnico, encaminhar incidentes corretamente e seguir os passos operacionais oficiais determinados pela diretoria.",
    boasPraticas: [
      "Escreva em formato de passo a passo numerado (1, 2, 3...) para facilitar a leitura da IA.",
      "Mantenha cada processo em um arquivo curto e específico."
    ],
    isProtegida: true,
  },
  rh: {
    tipo: "rh",
    rotulo: "RH",
    descricao: "Processos de onboarding, cargos e salários, cultura corporativa aplicada e manuais do colaborador.",
    utilidade: [
      "Manual do Colaborador e cultura",
      "Instruções de onboarding para novos contratados",
      "Tabelas de benefícios e políticas internas",
      "Descrição de cargos, funções e responsabilidades"
    ],
    arquivosRecomendados: ["PDF", "Markdown (.md)", "Documentos (.docx)"],
    impactoIA: "Utilizado para tirar dúvidas internas de novos funcionários, automatizar o onboarding corporativo e garantir que responsabilidades estejam claras em toda a organização.",
    boasPraticas: [
      "Inclua um FAQ específico para colaboradores (ex: 'como solicitar férias', 'quais os benefícios')."
    ],
    isProtegida: true,
  },
  financeiro: {
    tipo: "financeiro",
    rotulo: "Financeiro",
    descricao: "Instruções de faturamento, políticas de reembolso e guias tributários da empresa.",
    utilidade: [
      "Políticas de reembolso corporativo",
      "Guias de faturamento e emissão de notas fiscais",
      "Cronograma de contas a pagar/receber operacional",
      "Dados bancários e chaves Pix oficiais de cobrança"
    ],
    arquivosRecomendados: ["PDF", "Excel (.xlsx)", "Markdown (.md)"],
    impactoIA: "Orienta o faturamento e os assistentes administrativos a passarem dados corretos para pagamentos, explicarem regras de cancelamento financeiro e gerenciarem reembolsos operacionais.",
    boasPraticas: [
      "NUNCA coloque senhas bancárias ou tokens API reais nesta pasta. Use apenas políticas e guias organizacionais.",
      "Mantenha as chaves Pix e dados de contas para faturamento bem estruturados e fáceis de ler."
    ],
    isProtegida: true,
  },
  juridico: {
    tipo: "juridico",
    rotulo: "Jurídico",
    descricao: "Termos de uso, políticas de privacidade, contratos padrão e regulamentações do negócio.",
    utilidade: [
      "Políticas de Privacidade (LGPD) e Termos de Uso",
      "Minutas padrão de contratos de fornecedores/clientes",
      "Regulamentações e licenças específicas do setor de atuação",
      "Políticas de compliance e acordos de confidencialidade (NDA)"
    ],
    arquivosRecomendados: ["PDF", "Documentos (.docx)", "Markdown (.md)"],
    impactoIA: "Garante que todas as interações e respostas geradas pelos Funcionários Digitais sigam de perto a LGPD e as limitações legais recomendadas pelo departamento jurídico da sua empresa.",
    boasPraticas: [
      "Garanta que a Política de Privacidade descreva como os dados coletados pelos robôs de atendimento são tratados."
    ],
    isProtegida: true,
  },
  geral: {
    tipo: "geral",
    rotulo: "Geral",
    descricao: "Documentações gerais, anotações rápidas e informações que não se encaixam nas pastas estruturadas.",
    utilidade: [
      "Anotações de reuniões de alinhamento",
      "Documentos temporários ou rascunhos de projetos",
      "Listas de contatos úteis e links de ferramentas internas",
      "Manuais genéricos ou informações diversas"
    ],
    arquivosRecomendados: ["Qualquer tipo compatível"],
    impactoIA: "Fornece um repositório genérico de informações que servem como inteligência auxiliar complementar para os agentes da empresa.",
    boasPraticas: [
      "Periodicamente, organize os arquivos desta pasta movendo-os para pastas mais adequadas e específicas."
    ],
    isProtegida: true, // Protegida contra exclusão pois é estrutural do sistema caetusOS
  }
};
