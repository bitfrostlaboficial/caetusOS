/**
 * Catálogo de Missões do CaetusOS — frontend-only.
 *
 * Cada missão é uma entrada com metadata + slug de rota. A "tela especializada"
 * é resolvida pela rota; missões sem tela própria caem em `/app/missoes/:slug`
 * (placeholder "em breve") sem quebrar a navegação.
 */

import {
  FileText,
  Image as ImageIcon,
  Mail,
  MessageSquare,
  PenLine,
  Plus,
  Sheet,
  ShoppingBag,
  Star,
  TrendingUp,
  Video,
  type LucideIcon,
} from "lucide-react";

export type StatusMissao = "disponivel" | "em_breve" | "experimental";

export type Missao = {
  slug: string;
  nome: string;
  descricao: string;
  icone: LucideIcon;
  status: StatusMissao;
  /** Rota especializada já existente (se houver). */
  rota?: string;
  /** Funcionário digital responsável. */
  funcionario?: string;
  exemplo?: string;
};

export const MISSOES: Missao[] = [
  {
    slug: "criar-post",
    nome: "Criar post",
    descricao: "Gera posts para LinkedIn, Instagram ou blog a partir do conhecimento da empresa.",
    icone: PenLine,
    status: "disponivel",
    rota: "/app/missoes/criar-post",
    funcionario: "Marketing",
    exemplo: "Anúncio do lançamento do produto",
  },
  {
    slug: "gerar-imagem",
    nome: "Gerar imagem",
    descricao: "Banners, capas e ilustrações sob medida para campanhas.",
    icone: ImageIcon,
    status: "em_breve",
    funcionario: "Designer",
  },
  {
    slug: "gerar-documento",
    nome: "Gerar documento",
    descricao: "Propostas, contratos e PDFs estruturados.",
    icone: FileText,
    status: "em_breve",
    funcionario: "Comercial",
  },
  {
    slug: "analisar-planilha",
    nome: "Analisar planilha",
    descricao: "Lê CSV/XLSX, sintetiza insights e devolve resumo executivo.",
    icone: Sheet,
    status: "em_breve",
    funcionario: "Analista",
  },
  {
    slug: "criar-video",
    nome: "Criar vídeo",
    descricao: "Roteiro + edição automática para redes sociais.",
    icone: Video,
    status: "em_breve",
    funcionario: "Designer",
  },
  {
    slug: "enviar-email",
    nome: "Enviar e-mail",
    descricao: "Compõe e dispara campanhas segmentadas.",
    icone: Mail,
    status: "em_breve",
    funcionario: "Marketing",
  },
  {
    slug: "responder-avaliacoes",
    nome: "Responder avaliações",
    descricao: "Replica reviews do Google, Trustpilot e marketplaces no tom da marca.",
    icone: Star,
    status: "em_breve",
    funcionario: "Atendimento",
  },
  {
    slug: "novo-produto",
    nome: "Criar novo produto",
    descricao: "Ficha completa: título, descrição, atributos, SEO.",
    icone: ShoppingBag,
    status: "em_breve",
    funcionario: "Comercial",
  },
  {
    slug: "publicar-marketplace",
    nome: "Publicar marketplace",
    descricao: "Envia produtos para Mercado Livre, Shopee e afins.",
    icone: TrendingUp,
    status: "em_breve",
    funcionario: "Comercial",
  },
  {
    slug: "gerar-relatorio",
    nome: "Gerar relatório",
    descricao: "Relatórios executivos a partir de dados internos.",
    icone: MessageSquare,
    status: "em_breve",
    funcionario: "Analista",
  },
];

export const MISSAO_NOVA: Missao = {
  slug: "nova",
  nome: "Nova automação",
  descricao: "Crie uma missão personalizada (em breve).",
  icone: Plus,
  status: "em_breve",
};

export function obterMissao(slug: string): Missao | undefined {
  if (slug === MISSAO_NOVA.slug) return MISSAO_NOVA;
  return MISSOES.find((m) => m.slug === slug);
}

export type FuncionarioDigital = {
  nome: string;
  status: "online" | "aguardando" | "offline";
  provider: string;
  modelo: string;
};

/** Resumo dos funcionários digitais (mock visual — não altera infra). */
export const FUNCIONARIOS_DIGITAIS: FuncionarioDigital[] = [
  { nome: "Marketing", status: "online", provider: "Groq", modelo: "llama-3.3-70b" },
  { nome: "Atendimento", status: "online", provider: "Gemini", modelo: "gemini-2.0-flash" },
  { nome: "Designer", status: "aguardando", provider: "Fal", modelo: "flux-schnell" },
  { nome: "OCR", status: "online", provider: "Hugging Face", modelo: "trocr-base" },
];
