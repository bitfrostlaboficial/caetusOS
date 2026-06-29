import type { ResultadoExecucao, EventoExecucao } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

const NIVEL_COR: Record<EventoExecucao["nivel"], string> = {
  info: "bg-muted text-muted-foreground",
  sucesso: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  aviso: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  erro: "bg-destructive/15 text-destructive",
};

function fmtValor(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(3);
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function rotulo(k: string): string {
  return k.replace(/_/g, " ");
}

export function RelatorioExecucao({ resultado }: { resultado: ResultadoExecucao }) {
  const { metricas, eventos, arquivos } = resultado;
  const linhasMetricas: [string, unknown][] = [
    ["Provider", metricas.provedor],
    ["Modelo", metricas.modelo],
    ["Tempo", metricas.latencia_ms != null ? `${(metricas.latencia_ms / 1000).toFixed(1)} s` : null],
    ["Tokens entrada", metricas.tokens_in],
    ["Tokens saída", metricas.tokens_out],
    ["Custo (USD)", metricas.custo],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "") as [string, unknown][];

  const fallbacks = (eventos ?? []).filter((e) => e.tipo === "ia.fallback");

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center gap-2">
        <Badge variant={resultado.sucesso ? "default" : "destructive"}>
          {resultado.sucesso ? "✓ Concluído" : "✕ Falhou"}
        </Badge>
        <code className="text-xs text-muted-foreground">{resultado.execucao_id.slice(0, 8)}</code>
      </div>

      {linhasMetricas.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-md border bg-muted/30 p-3">
          {linhasMetricas.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
              <dd className="font-mono text-xs">{fmtValor(v)}</dd>
            </div>
          ))}
        </dl>
      )}

      {arquivos.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Arquivos criados
          </p>
          <ul className="space-y-1">
            {arquivos.map((a) => (
              <li key={a.id} className="rounded border bg-card px-2 py-1 font-mono text-xs">
                <span className="text-muted-foreground">[{a.categoria}]</span> {a.caminho}
              </li>
            ))}
          </ul>
        </div>
      )}

      {eventos.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Eventos da execução
          </p>
          <ul className="space-y-1.5">
            {eventos.map((ev, i) => (
              <li key={i} className="rounded-md border bg-card p-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{ev.titulo}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${NIVEL_COR[ev.nivel]}`}>
                    {ev.tipo}
                  </span>
                </div>
                {Object.keys(ev.detalhes ?? {}).length > 0 && (
                  <dl className="mt-1 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {Object.entries(ev.detalhes).map(([k, v]) => (
                      <div key={k} className="contents">
                        <dt>{rotulo(k)}</dt>
                        <dd className="font-mono">{fmtValor(v)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {fallbacks.length === 0 && metricas.provedor && (
        <p className="text-xs text-muted-foreground">Nenhum fallback utilizado.</p>
      )}
    </div>
  );
}
