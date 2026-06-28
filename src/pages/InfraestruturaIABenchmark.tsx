import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type IaBenchmarkResposta, type IaOverview } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Play, Zap, DollarSign, Hash } from "lucide-react";

function fmtMs(v: number | null) {
  if (v == null) return "—";
  return v < 1000 ? `${Math.round(v)} ms` : `${(v / 1000).toFixed(2)} s`;
}
function fmtUsd(v: number) {
  if (v === 0) return "$0";
  return `$${v < 0.01 ? v.toFixed(6) : v.toFixed(4)}`;
}

export default function InfraestruturaIABenchmark() {
  const [providers, setProviders] = useState<string[]>([]);
  const [disponiveis, setDisponiveis] = useState<string[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [prompt, setPrompt] = useState(
    "Em uma frase, explique o conceito de entropia em termodinâmica.",
  );
  const [maxTokens, setMaxTokens] = useState(256);
  const [executando, setExecutando] = useState(false);
  const [resultado, setResultado] = useState<IaBenchmarkResposta | null>(null);

  useEffect(() => {
    void api
      .infraIaOverview()
      .then((o: IaOverview) => {
        const ativos = o.providers.map((p) => p.nome);
        const configurados = o.providers
          .filter((p) => p.configuracao.configurado)
          .map((p) => p.nome);
        setDisponiveis(ativos);
        setProviders(ativos);
        setSelecionados(new Set(configurados));
      })
      .catch(() => {
        const fallback = ["gemini", "groq", "openrouter", "huggingface", "fal"];
        setDisponiveis(fallback);
        setProviders(fallback);
        setSelecionados(new Set());
      });
  }, []);

  function toggle(nome: string) {
    const next = new Set(selecionados);
    if (next.has(nome)) next.delete(nome);
    else next.add(nome);
    setSelecionados(next);
  }

  async function rodar() {
    if (!prompt.trim()) {
      toast.warning("Informe um prompt.");
      return;
    }
    if (selecionados.size === 0) {
      toast.warning("Selecione ao menos um provedor.");
      return;
    }
    setExecutando(true);
    setResultado(null);
    try {
      const r = await api.infraIaBenchmark(prompt, [...selecionados], maxTokens);
      setResultado(r);
      toast.success(
        `Benchmark concluído — ${r.resultados.filter((x) => x.sucesso).length}/${r.resultados.length} sucessos.`,
      );
    } catch (e: any) {
      toast.error(`Falha ao executar benchmark: ${e?.message ?? e}`);
    } finally {
      setExecutando(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Infraestrutura · IA
          </p>
          <h1 className="text-3xl font-semibold text-foreground">Benchmark</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Execute o mesmo prompt em múltiplos provedores e compare tempo, tokens e custo.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/infraestrutura/ia">Provedores</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/infraestrutura/execucoes">Execuções</Link>
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">
            Prompt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="font-mono text-sm"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              max_tokens:
              <input
                type="number"
                min={16}
                max={4096}
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value) || 256)}
                className="w-20 rounded border border-border bg-background px-2 py-1 font-mono text-xs"
              />
            </label>
            <div className="ml-auto flex flex-wrap gap-2">
              {disponiveis.map((p) => (
                <button
                  key={p}
                  onClick={() => toggle(p)}
                  className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-widest transition ${
                    selecionados.has(p)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <Button onClick={() => void rodar()} disabled={executando}>
              <Play className={`mr-2 size-4 ${executando ? "animate-pulse" : ""}`} />
              {executando ? "Executando…" : "Executar benchmark"}
            </Button>
          </div>
          {providers.length === 0 && (
            <p className="text-xs text-muted-foreground">Carregando provedores…</p>
          )}
        </CardContent>
      </Card>

      {executando && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[...selecionados].map((p) => (
            <Skeleton key={p} className="h-48 w-full" />
          ))}
        </div>
      )}

      {resultado && (
        <>
          <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Destaque
              icone={<Zap className="size-4 text-amber-400" />}
              label="Mais rápido"
              valor={resultado.ranking.mais_rapido ?? "—"}
            />
            <Destaque
              icone={<DollarSign className="size-4 text-emerald-400" />}
              label="Mais barato"
              valor={resultado.ranking.mais_barato ?? "—"}
            />
            <Destaque
              icone={<Hash className="size-4 text-primary" />}
              label="Menos tokens"
              valor={resultado.ranking.menos_tokens ?? "—"}
            />
          </section>

          <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {resultado.resultados.map((r) => (
              <Card key={r.provider} className={r.sucesso ? "" : "border-destructive/60"}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span className="font-mono uppercase tracking-widest">{r.provider}</span>
                    <span
                      className={`text-[10px] uppercase tracking-widest ${
                        r.sucesso ? "text-emerald-400" : "text-destructive"
                      }`}
                    >
                      {r.sucesso ? "ok" : "erro"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex flex-wrap gap-4 font-mono text-muted-foreground">
                    <span>{r.modelo ?? "—"}</span>
                    <span>{fmtMs(r.tempo_ms)}</span>
                    <span>
                      {r.total_tokens ?? "—"} tok
                      {r.total_tokens != null && (
                        <> ({r.tokens_in ?? 0}/{r.tokens_out ?? 0})</>
                      )}
                    </span>
                    <span>{fmtUsd(r.custo_estimado)}</span>
                  </div>
                  {r.erro && (
                    <pre className="overflow-auto rounded bg-destructive/10 p-2 text-[11px] text-destructive">
                      {r.erro}
                    </pre>
                  )}
                  {r.resposta && (
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded border border-border/60 bg-background/60 p-3 font-mono text-[11px] text-foreground">
                      {r.resposta}
                    </pre>
                  )}
                </CardContent>
              </Card>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function Destaque({
  icone,
  label,
  valor,
}: {
  icone: React.ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-md border border-border/60 bg-background/40 p-2">{icone}</div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {label}
          </div>
          <div className="font-mono text-base text-foreground">{valor}</div>
        </div>
      </CardContent>
    </Card>
  );
}
