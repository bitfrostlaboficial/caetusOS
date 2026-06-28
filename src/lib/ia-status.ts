/**
 * Catálogo de status retornados pelo backend (Fase 2 — classificador).
 * O frontend NÃO inventa status nem regras: apenas mapeia o valor para
 * cor/ícone/rótulo de exibição.
 */
import {
  AlertTriangle,
  Ban,
  CircleDashed,
  Clock,
  CloudOff,
  CreditCard,
  FileWarning,
  KeyRound,
  Network,
  ShieldAlert,
  ShieldCheck,
  Signal,
  TriangleAlert,
  WifiOff,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export type StatusTone = "online" | "configurado" | "warning" | "alerta" | "offline" | "neutro";

export type StatusMeta = {
  rotulo: string;
  tone: StatusTone;
  icone: LucideIcon;
};

const MAP: Record<string, StatusMeta> = {
  OK:                      { rotulo: "Operacional",         tone: "online",      icone: ShieldCheck },
  RATE_LIMIT:              { rotulo: "Rate limit",          tone: "warning",     icone: Clock },
  ACEITE_TERMOS:           { rotulo: "Aceitar termos",      tone: "warning",     icone: FileWarning },
  BILLING:                 { rotulo: "Billing pendente",    tone: "warning",     icone: CreditCard },
  MODELO_DEPRECIADO:       { rotulo: "Modelo descontinuado",tone: "warning",     icone: TriangleAlert },
  QUOTA_EXCEDIDA:          { rotulo: "Quota excedida",      tone: "alerta",      icone: AlertTriangle },
  SERVICO_INDISPONIVEL:    { rotulo: "Serviço indisponível",tone: "alerta",      icone: CloudOff },
  TIMEOUT:                 { rotulo: "Timeout",             tone: "offline",     icone: Clock },
  DNS_ERROR:               { rotulo: "Erro DNS",            tone: "offline",     icone: Network },
  SSL_ERROR:               { rotulo: "Erro SSL",            tone: "offline",     icone: ShieldAlert },
  SEM_CONEXAO:             { rotulo: "Sem conexão",         tone: "offline",     icone: WifiOff },
  API_KEY_INVALIDA:        { rotulo: "API Key inválida",    tone: "offline",     icone: KeyRound },
  CONTA_SUSPENSA:          { rotulo: "Conta suspensa",      tone: "offline",     icone: Ban },
  MODELO_REMOVIDO:         { rotulo: "Modelo removido",     tone: "offline",     icone: XCircle },
  AUTH_ERROR:              { rotulo: "Erro de autenticação",tone: "offline",     icone: ShieldAlert },
  DESCONHECIDO:            { rotulo: "Erro desconhecido",   tone: "offline",     icone: AlertTriangle },
};

const NAO_CONFIGURADO: StatusMeta = {
  rotulo: "Não configurado",
  tone: "neutro",
  icone: CircleDashed,
};

export function meta(status: string | null | undefined): StatusMeta {
  if (!status) return NAO_CONFIGURADO;
  return MAP[status] ?? { rotulo: status, tone: "alerta", icone: Signal };
}

/**
 * Classes Tailwind para cada tom (cores específicas de domínio — status de
 * infraestrutura — alinhadas ao guideline visual de painéis tipo Grafana).
 */
export function classesTom(tone: StatusTone): { badge: string; ponto: string; barra: string } {
  switch (tone) {
    case "online":
      return {
        badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        ponto: "bg-emerald-400",
        barra: "bg-emerald-500/60",
      };
    case "configurado":
      return {
        badge: "bg-sky-500/10 text-sky-400 border-sky-500/30",
        ponto: "bg-sky-400",
        barra: "bg-sky-500/60",
      };
    case "warning":
      return {
        badge: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        ponto: "bg-amber-400",
        barra: "bg-amber-500/60",
      };
    case "alerta":
      return {
        badge: "bg-orange-500/10 text-orange-400 border-orange-500/30",
        ponto: "bg-orange-400",
        barra: "bg-orange-500/60",
      };
    case "offline":
      return {
        badge: "bg-rose-500/10 text-rose-400 border-rose-500/30",
        ponto: "bg-rose-400",
        barra: "bg-rose-500/60",
      };
    default:
      return {
        badge: "bg-muted text-muted-foreground border-border",
        ponto: "bg-muted-foreground/60",
        barra: "bg-muted-foreground/40",
      };
  }
}

export const URLS_ROTULOS: Record<string, string> = {
  dashboard_url: "Dashboard",
  documentation_url: "Documentação",
  api_key_url: "API Keys",
  billing_url: "Billing",
  status_page: "Status oficial",
};
