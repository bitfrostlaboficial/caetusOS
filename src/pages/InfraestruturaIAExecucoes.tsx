import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, type IaExecucao, type IaMetrics, type IaRanking } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { meta as statusMeta, classesTom } from "@/lib/ia-status";
import { RefreshCw, Activity, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

function fmtMs(v: number | null | undefined) {
  if (v == null) return "—";
  if (v < 1000) return `${Math.round(v)} ms`;
  return `${(v / 1000).toFixed(2)} s`;
}
function fmtUsd(v: number | null | undefined) {
  if (v == null) return "—";
  if (v === 0) return "$0";
  return `$${v < 0.01 ? v.toFixed(6) : v.toFixed(4)}`;
}

export default function InfraestruturaIAExecucoes() {
  const [sp, setSp] = useSearchParams();
  const [metrics, setMetrics] = useState<IaMetrics | null>(null);
  const [ranking, setRanking] = useState<IaRanking | null>(null);
  const [execs, setExecs] = useState<IaExecucao[] | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState(sp.get("busca") ?? "");

  const filtros = {
    provider: sp.get("provider") ?? undefined,
    modelo: sp.get("modelo") ?? undefined,
    habilidade: sp.get("habilidade") ?? undefined,
    status: sp.get("status") ?? undefined,
    busca: sp.get("busca") ?? undefined,
    limite: 100,
  };

  async function carregar() {
    setCarregando(true);
    try {
      const [m, r, e] = await Promise.all([
        api.infraIaMetrics(),
        api.infraIaRanking(),
        api.infraIaExecucoes(filtros),
      ]);
      setMetrics(m);
      setRanking(r);
      setExecs(e);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.toString()]);

  function aplicarBusca(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(sp);
    if (busca) next.set("busca", busca);
    else next.delete("busca");
    setSp(next, { replace: true });
  }

  function filtrar(chave: string, valor?: string | null) {
    const next = new URLSearchParams(sp);
    if (valor) next.set(chave, valor);
    else next.delete(chave);
    setSp(next, { replace: true });
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Infraestrutura · IA
          </p>
          <h1 className="text-3xl font-semibold text-foreground">Execuções</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Telemetria automática de todas as chamadas roteadas para provedores de IA.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/infraestrutura/ia">Provedores</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/infraestrutura/benchmark">Benchmark</Link>
          </Button>
          <Button size="sm" onClick={() => void carregar()} disabled={carregando}>
            <RefreshCw className={`mr-2 size-4 ${carregando ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </header>

      {/* Cards de resumo */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <CardResumo
          icone={<Activity className="size-4" />}
          label="Execuções hoje"
          valor={metrics?.hoje.execucoes ?? 0}
          carregando={carregando}
        />
        <CardResumo
          icone={<TrendingUp className="size-4" />}
          label="Tempo médio"
          valor={fmtMs(metrics?.hoje.tempo_medio_ms)}
          carregando={carregando}
        />
        <CardResumo
          icone={<CheckCircle2 className="size-4 text-emerald-400" />}
          label="Sucessos"
          valor={metrics?.hoje.sucessos ?? 0}
          carregando={carregando}
        />
        <CardResumo
          icone={<AlertTriangle className="size-4 text-amber-400" />}
          label="Falhas"
          valor={metrics?.hoje.falhas ?? 0}
          carregando={carregando}
        />
        <CardResumo
          label="Provider top"
          valor={metrics?.hoje.provider_mais_utilizado ?? "—"}
          carregando={carregando}
        />
        <CardResumo
          label="Custo hoje"
          valor={fmtUsd(metrics?.hoje.custo_estimado_usd)}
          carregando={carregando}
        />
      </section>

      {/* Ranking + gráfico simples */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">
              Chamadas — últimas 24h
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Sparkline data={metrics?.ultimas_24h ?? []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">
              Ranking de provedores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ranking?.providers?.length ? (
              ranking.providers.map((p) => (
                <div
                  key={p.provider}
                  className="flex items-center justify-between rounded-md border border-border/60 bg-card/40 px-3 py-2 text-xs"
                >
                  <button
                    onClick={() => filtrar("provider", p.provider)}
                    className="font-mono uppercase tracking-wider text-primary hover:underline"
                  >
                    {p.provider}
                  </button>
                  <div className="flex gap-4 text-muted-foreground">
                    <span>{p.execucoes} exec</span>
                    <span>{fmtMs(p.tempo_medio_ms)}</span>
                    <span>{(p.taxa_sucesso * 100).toFixed(0)}%</span>
                    <span>{fmtUsd(p.custo_total_usd)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Sem execuções registradas ainda.</p>
            )}
            {ranking?.destaques && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                {(["mais_utilizado", "mais_rapido", "mais_barato", "maior_sucesso"] as const).map(
                  (k) => (
                    <div
                      key={k}
                      className="rounded border border-border/60 bg-background/40 p-2"
                    >
                      <div className="font-mono uppercase tracking-widest text-muted-foreground">
                        {k.replace("_", " ")}
                      </div>
                      <div className="text-sm text-foreground">{ranking.destaques[k] ?? "—"}</div>
                    </div>
                  ),
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Filtros + tabela */}
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">
            Execuções recentes
          </CardTitle>
          <form onSubmit={aplicarBusca} className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Buscar (skill, provider, erro)…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-8 max-w-xs"
            />
            <Button type="submit" size="sm" variant="outline">
              Buscar
            </Button>
            {(["provider", "status", "habilidade", "modelo", "busca"] as const).map((k) =>
              sp.get(k) ? (
                <button
                  key={k}
                  onClick={() => filtrar(k, null)}
                  className="rounded-full border border-border/60 bg-card/60 px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >
                  {k}: {sp.get(k)} ×
                </button>
              ) : null,
            )}
          </form>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-2 py-2">Hora</th>
                  <th className="px-2 py-2">Skill</th>
                  <th className="px-2 py-2">Provider</th>
                  <th className="px-2 py-2">Modelo</th>
                  <th className="px-2 py-2">Tempo</th>
                  <th className="px-2 py-2">Tokens</th>
                  <th className="px-2 py-2">Custo</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {carregando && !execs && (
                  <tr>
                    <td colSpan={8} className="py-6">
                      <Skeleton className="h-24 w-full" />
                    </td>
                  </tr>
                )}
                {execs?.map((e) => {
                  const m = statusMeta(e.status === "sucesso" ? "OK" : "DESCONHECIDO");
                  return (
                    <tr key={e.id} className="hover:bg-card/40">
                      <td className="px-2 py-2 font-mono text-muted-foreground">
                        {e.created_at ? new Date(e.created_at).toLocaleString() : "—"}
                      </td>
                      <td className="px-2 py-2">{e.habilidade ?? "—"}</td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => filtrar("provider", e.provider)}
                          className="font-mono uppercase text-primary hover:underline"
                        >
                          {e.provider}
                        </button>
                      </td>
                      <td className="px-2 py-2 font-mono">{e.modelo ?? "—"}</td>
                      <td className="px-2 py-2">{fmtMs(e.duracao_ms)}</td>
                      <td className="px-2 py-2 font-mono">
                        {e.total_tokens ?? "—"}
                        {e.total_tokens != null && (
                          <span className="text-muted-foreground">
                            {" "}
                            ({e.input_tokens ?? 0}/{e.output_tokens ?? 0})
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 font-mono">{fmtUsd(e.custo_estimado)}</td>
                      <td className="px-2 py-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${classesTom(m.tom)}`}
                        >
                          {e.status}
                        </span>
                        {e.erro && (
                          <span className="ml-2 text-muted-foreground" title={e.erro}>
                            ⚠
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {execs && execs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-2 py-6 text-center text-muted-foreground">
                      Nenhuma execução encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CardResumo({
  label,
  valor,
  icone,
  carregando,
}: {
  label: string;
  valor: number | string;
  icone?: React.ReactNode;
  carregando?: boolean;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>{label}</span>
          {icone}
        </div>
        {carregando ? (
          <Skeleton className="h-6 w-20" />
        ) : (
          <div className="font-mono text-lg text-foreground">{valor}</div>
        )}
      </CardContent>
    </Card>
  );
}

function Sparkline({
  data,
}: {
  data: { hora: string | null; chamadas: number; media_ms: number; erros: number }[];
}) {
  if (!data.length) {
    return <p className="text-xs text-muted-foreground">Sem dados.</p>;
  }
  const max = Math.max(...data.map((d) => d.chamadas), 1);
  return (
    <div className="flex h-32 items-end gap-1">
      {data.map((d, i) => {
        const h = (d.chamadas / max) * 100;
        const err = d.erros > 0;
        return (
          <div
            key={i}
            className="flex-1 rounded-t bg-primary/70 hover:bg-primary"
            style={{
              height: `${Math.max(2, h)}%`,
              background: err ? "rgb(239 68 68 / 0.7)" : undefined,
            }}
            title={`${d.hora ?? ""} — ${d.chamadas} chamadas, média ${Math.round(d.media_ms)}ms, ${d.erros} erros`}
          />
        );
      })}
    </div>
  );
}
