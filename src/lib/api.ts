/**
 * Cliente HTTP da API Empresa IA.
 *
 * Mantém token em localStorage. Único ponto que conhece a URL do backend
 * (definida em `VITE_API_BASE_URL`, default `/api`).
 */

const API_BASE =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE_URL) ||
  "http://localhost:8000";

const ACCESS_KEY = "empresaia.access_token";
const REFRESH_KEY = "empresaia.refresh_token";

export const auth = {
  getAccess: () => (typeof localStorage !== "undefined" ? localStorage.getItem(ACCESS_KEY) : null),
  getRefresh: () => (typeof localStorage !== "undefined" ? localStorage.getItem(REFRESH_KEY) : null),
  setTokens: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
  isAuthenticated: () => typeof localStorage !== "undefined" && !!localStorage.getItem(ACCESS_KEY),
};

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown, message: string) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function refreshToken(): Promise<boolean> {
  const r = auth.getRefresh();
  if (!r) return false;
  const res = await fetch(`${API_BASE}/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: r }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  auth.setTokens(data.access_token, data.refresh_token);
  return true;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  formData?: FormData;
  retry?: boolean;
};

export async function apiRequest<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = auth.getAccess();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (opts.formData) {
    body = opts.formData;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? (body ? "POST" : "GET"),
    headers,
    body,
  });

  if (res.status === 401 && opts.retry !== false && token) {
    const ok = await refreshToken();
    if (ok) return apiRequest<T>(path, { ...opts, retry: false });
    auth.clear();
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const detail =
      data && typeof data === "object" && "detail" in data ? String((data as any).detail) : "";
    const message = detail || `HTTP ${res.status}`;
    throw new ApiError(res.status, data, message);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ───────── Endpoints tipados ─────────

export type Empresa = { id: string; nome: string; slug: string };
export type Projeto = { id: string; nome: string; slug: string; eh_raiz: boolean };
export type DocumentoConhecimento = {
  id: string;
  tipo: string;
  nome?: string;
  versao: number;
  data_upload: string | null;
  atualizado_em?: string | null;
  caminho: string;
  tamanho?: number | null;
};
export type Asset = {
  id: string;
  categoria: string;
  origem: string;
  escopo: string;
  mime: string | null;
  tamanho: number | null;
  caminho: string;
};
export type Execucao = {
  id: string;
  alvo: string;
  origem: string;
  status: string;
  provedor: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  latencia_ms: number | null;
  prompt_template: string | null;
  prompt_version: string | null;
  schema_version: number;
  entrada: Record<string, unknown> | null;
  saida: Record<string, unknown> | null;
  erro: string | null;
  criado_em: string | null;
};
export type ResultadoExecucao = {
  sucesso: boolean;
  execucao_id: string;
  dados: Record<string, unknown>;
  mensagens: string[];
  arquivos: { id: string; categoria: string; caminho: string }[];
  metricas: {
    provedor: string | null;
    tokens_in: number | null;
    tokens_out: number | null;
    custo: number | null;
    latencia_ms: number | null;
  };
  erro: { codigo: string; mensagem: string } | null;
};

export const api = {
  registrar: (nome_empresa: string, email: string, senha: string) =>
    apiRequest<{ access_token: string; refresh_token: string }>("/v1/auth/registrar", {
      body: { nome_empresa, email, senha },
    }),
  login: (email: string, senha: string) =>
    apiRequest<{ access_token: string; refresh_token: string }>("/v1/auth/login", {
      body: { email, senha },
    }),
  empresaAtual: () => apiRequest<Empresa>("/v1/empresas/me"),
  listarProjetos: () => apiRequest<Projeto[]>("/v1/projetos"),
  listarConhecimento: () => apiRequest<DocumentoConhecimento[]>("/v1/conhecimento"),
  uploadConhecimento: (tipo: string, arquivo: File) => {
    const fd = new FormData();
    fd.append("tipo", tipo);
    fd.append("arquivo", arquivo);
    return apiRequest<DocumentoConhecimento>("/v1/conhecimento", { formData: fd });
  },
  lerConhecimento: (id: string) =>
    apiRequest<{ id: string; conteudo: string; tamanho: number }>(
      `/v1/conhecimento/${id}/conteudo`,
    ),
  removerConhecimento: (id: string) =>
    apiRequest<null>(`/v1/conhecimento/${id}`, { method: "DELETE" }),
  listarAssets: () => apiRequest<Asset[]>("/v1/assets"),
  uploadAsset: (categoria: string, arquivo: File) => {
    const fd = new FormData();
    fd.append("categoria", categoria);
    fd.append("arquivo", arquivo);
    return apiRequest<{ id: string }>("/v1/assets", { formData: fd });
  },
  executarComando: (alvo: string, entrada: Record<string, unknown>) =>
    apiRequest<ResultadoExecucao>("/v1/comandos/executar", {
      body: { schema_version: 1, tipo: "SKILL", alvo, entrada, origem: "WEB" },
    }),
  historico: (limite = 20) =>
    apiRequest<Execucao[]>(`/v1/historico?limite=${limite}`),

  // ───────── Infraestrutura — Provedores de IA (Fase 2) ─────────
  infraIaOverview: () => apiRequest<IaOverview>("/v1/infraestrutura/ia"),
  infraIaHistorico: (filtros: IaHistoricoFiltros = {}) => {
    const p = new URLSearchParams();
    if (filtros.provider) p.set("provider", filtros.provider);
    if (filtros.status) p.set("status", filtros.status);
    if (filtros.desde) p.set("desde", filtros.desde);
    if (filtros.ate) p.set("ate", filtros.ate);
    if (filtros.limite) p.set("limite", String(filtros.limite));
    const qs = p.toString();
    return apiRequest<IaHistoricoItem[]>(
      `/v1/infraestrutura/ia/history${qs ? `?${qs}` : ""}`,
    );
  },
  infraIaCheckAgora: () =>
    apiRequest<IaProviderEstado[]>("/v1/infraestrutura/ia/check", { method: "POST" }),

  // ───────── Fase 4 — Observabilidade / Execuções ─────────
  infraIaMetrics: () => apiRequest<IaMetrics>("/v1/infraestrutura/ia/metrics"),
  infraIaRanking: () => apiRequest<IaRanking>("/v1/infraestrutura/ia/providers/ranking"),
  infraIaModels: () => apiRequest<IaModeloStat[]>("/v1/infraestrutura/ia/models"),
  infraIaPricing: () => apiRequest<IaPreco[]>("/v1/infraestrutura/ia/pricing"),
  infraIaExecucoes: (f: IaExecFiltros = {}) => {
    const p = new URLSearchParams();
    if (f.provider) p.set("provider", f.provider);
    if (f.modelo) p.set("modelo", f.modelo);
    if (f.habilidade) p.set("habilidade", f.habilidade);
    if (f.status) p.set("status", f.status);
    if (f.desde) p.set("desde", f.desde);
    if (f.ate) p.set("ate", f.ate);
    if (f.busca) p.set("busca", f.busca);
    if (f.limite) p.set("limite", String(f.limite));
    if (f.offset) p.set("offset", String(f.offset));
    const qs = p.toString();
    return apiRequest<IaExecucao[]>(
      `/v1/infraestrutura/ia/executions${qs ? `?${qs}` : ""}`,
    );
  },
  infraIaExecucao: (id: string) =>
    apiRequest<IaExecucaoDetalhe>(`/v1/infraestrutura/ia/executions/${id}`),
  infraIaBenchmark: (prompt: string, providers: string[], max_tokens = 512) =>
    apiRequest<IaBenchmarkResposta>("/v1/infraestrutura/ia/benchmark", {
      body: { prompt, providers, max_tokens },
    }),
};

// ───────── Tipos — Infraestrutura IA ─────────
export type IaUrls = Partial<{
  documentation_url: string;
  dashboard_url: string;
  api_key_url: string;
  billing_url: string;
  status_page: string;
}>;

export type IaProviderEstado = {
  provider: string;
  modelo: string | null;
  status: string;
  ultimo_check: string | null;
  ultima_resposta: string | null;
  codigo_http: number | null;
  erro: string | null;
  acao_recomendada: string | null;
  billing_ok: boolean;
  api_key_ok: boolean;
  termos_ok: boolean;
  modelo_disponivel: boolean;
  latencia_ms: number | null;
  ultima_alteracao_status: string | null;
};

export type IaProvider = {
  nome: string;
  configuracao: {
    provider: string;
    modelo: string;
    configurado: boolean;
    endpoint: string;
  };
  capabilities: Record<string, boolean>;
  urls: IaUrls;
  estado: IaProviderEstado | null;
};

export type IaResumo = {
  total: number;
  ativos: number;
  erro: number;
  warnings: number;
  ultima_verificacao: string | null;
  proxima_verificacao: string | null;
};

export type IaOverview = {
  providers: IaProvider[];
  resumo: IaResumo;
};

export type IaHistoricoItem = {
  id: string;
  provider: string;
  modelo: string | null;
  status_anterior: string | null;
  status_novo: string;
  codigo_http: number | null;
  erro: string | null;
  acao_recomendada: string | null;
  latencia_ms: number | null;
  ocorrido_em: string | null;
};

export type IaHistoricoFiltros = {
  provider?: string;
  status?: string;
  desde?: string;
  ate?: string;
  limite?: number;
};

