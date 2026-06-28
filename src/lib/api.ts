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
    const message =
      (data && typeof data === "object" && "detail" in data && String((data as any).detail)) ||
      `HTTP ${res.status}`;
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
  versao: number;
  data_upload: string | null;
  caminho: string;
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
    return apiRequest<{ id: string }>("/v1/conhecimento", { formData: fd });
  },
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
};
