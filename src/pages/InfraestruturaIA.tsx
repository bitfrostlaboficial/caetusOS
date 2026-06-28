import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ActivitySquare,
  ArrowRight,
  ExternalLink,
  Gauge,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api, type IaHistoricoItem, type IaOverview, type IaProvider } from "@/lib/api";
import { URLS_ROTULOS, classesTom, meta as statusMeta } from "@/lib/ia-status";

const AUTO_REFRESH_MS = 60_000;

function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
  } catch {
    return iso;
  }
}

function StatusBadge({ status }: { status: string | null }) {
  const m = statusMeta(status);
  const c = classesTom(m.tone);
  const Icon = m.icone;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", c.badge)}>
      <Icon className="h-3.5 w-3.5" />
      {m.rotulo}
    </span>
  );
}

function PontoStatus({ status }: { status: string | null }) {
  const c = classesTom(statusMeta(status).tone);
  return <span className={cn("inline-block h-2 w-2 rounded-full", c.ponto)} />;
}

function CapabilitiesList({ caps }: { caps: Record<string, boolean> }) {
  const rotulo: Record<string, string> = {
    chat: "Chat",
    vision: "Visão",
    ocr: "OCR",
    image_generation: "Imagem",
    embeddings: "Embeddings",
    audio: "Áudio",
  };
  const ativos = Object.entries(caps).filter(([, v]) => v);
  if (!ativos.length) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {ativos.map(([k]) => (
        <Badge key={k} variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
          ✓ {rotulo[k] ?? k}
        </Badge>
      ))}
    </div>
  );
}

function IndicadorOk({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        ok
          ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
          : "border-rose-500/40 bg-rose-500/10 text-rose-400",
      )}
    >
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}

function CardResumo({
  titulo,
  valor,
  hint,
  icon: Icon,
  tom,
}: {
  titulo: string;
  valor: string | number;
  hint?: string;
  icon: typeof Gauge;
  tom?: "online" | "warning" | "offline" | "neutro";
}) {
  const c = classesTom(tom ?? "neutro");
  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{titulo}</p>
          <p className="mt-1 font-display text-2xl">{valor}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("rounded-md border p-2", c.badge)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

function CardProvider({ p }: { p: IaProvider }) {
  const estado = p.estado;
  const status = estado?.status ?? (p.configuracao.configurado ? null : "DESCONHECIDO");
  const meta = statusMeta(p.configuracao.configurado ? estado?.status ?? null : null);
  const tom = classesTom(meta.tone);

  return (
    <Card className={cn("relative overflow-hidden border-border/60 bg-card/60 backdrop-blur-sm")}>
      <div className={cn("absolute inset-x-0 top-0 h-px", tom.barra)} />
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
        <div>
          <CardTitle className="font-display text-lg capitalize flex items-center gap-2">
            <PontoStatus status={status} />
            {p.nome}
          </CardTitle>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{p.configuracao.modelo}</p>
        </div>
        <StatusBadge status={p.configuracao.configurado ? estado?.status ?? null : null} />
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3 font-mono text-xs">
          <div>
            <p className="text-muted-foreground">Latência</p>
            <p className="text-foreground">{estado?.latencia_ms != null ? `${estado.latencia_ms} ms` : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Último check</p>
            <p className="text-foreground">{formatarData(estado?.ultimo_check)}</p>
          </div>
        </div>

        <div>
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Capacidades</p>
          <CapabilitiesList caps={p.capabilities} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <IndicadorOk ok={estado?.api_key_ok ?? p.configuracao.configurado} label="API Key" />
          <IndicadorOk ok={estado?.billing_ok ?? true} label="Billing" />
          <IndicadorOk ok={estado?.modelo_disponivel ?? true} label="Modelo" />
          <IndicadorOk ok={estado?.termos_ok ?? true} label="Termos" />
        </div>

        {estado?.acao_recomendada && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-300/90">
            <span className="font-medium">Ação recomendada: </span>
            {estado.acao_recomendada}
          </div>
        )}

        {estado?.erro && (
          <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-2 font-mono text-[11px] text-rose-300/90">
            {estado.erro}
          </div>
        )}

        <Separator className="bg-border/60" />

        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(URLS_ROTULOS) as [keyof typeof URLS_ROTULOS, string][]).map(([k, label]) => {
            const href = p.urls[k as keyof typeof p.urls];
            if (!href) return null;
            return (
              <a
                key={k}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:text-foreground hover:border-border"
              >
                {label}
                <ExternalLink className="h-3 w-3" />
              </a>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function TimelineMini({ items }: { items: IaHistoricoItem[] }) {
  if (!items.length) {
    return (
      <p className="font-mono text-xs text-muted-foreground">
        Nenhuma mudança de status registrada ainda.
      </p>
    );
  }
  return (
    <ol className="relative space-y-3 border-l border-border/60 pl-4">
      {items.map((h) => {
        const m = statusMeta(h.status_novo);
        const c = classesTom(m.tone);
        const Icon = m.icone;
        return (
          <li key={h.id} className="relative">
            <span
              className={cn(
                "absolute -left-[21px] top-1 inline-flex h-3 w-3 items-center justify-center rounded-full border-2 border-background",
                c.ponto,
              )}
            />
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-mono text-xs text-muted-foreground">
                {formatarData(h.ocorrido_em)}
              </p>
              <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]", c.badge)}>
                <Icon className="h-3 w-3" />
                {m.rotulo}
              </span>
            </div>
            <p className="mt-0.5 text-sm">
              <span className="capitalize">{h.provider}</span>
              {h.status_anterior && (
                <span className="text-muted-foreground"> · {h.status_anterior} → {h.status_novo}</span>
              )}
            </p>
            {h.erro && (
              <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{h.erro}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function notificarMudancas(prev: IaProvider[] | null, prox: IaProvider[]) {
  if (!prev) return;
  const mapaAntigo = new Map(prev.map((p) => [p.nome, p.estado?.status ?? null]));
  for (const p of prox) {
    const novo = p.estado?.status ?? null;
    const antigo = mapaAntigo.get(p.nome) ?? null;
    if (antigo === novo) continue;
    const m = statusMeta(novo);
    const titulo = `${p.nome[0].toUpperCase() + p.nome.slice(1)}: ${m.rotulo}`;
    const desc = p.estado?.acao_recomendada || p.estado?.erro || "Mudança de status detectada.";
    if (m.tone === "online") toast.success(titulo, { description: desc });
    else if (m.tone === "warning" || m.tone === "alerta") toast.warning(titulo, { description: desc });
    else if (m.tone === "offline") toast.error(titulo, { description: desc });
    else toast(titulo, { description: desc });
  }
}

export default function InfraestruturaIA() {
  const [overview, setOverview] = useState<IaOverview | null>(null);
  const [historico, setHistorico] = useState<IaHistoricoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [executando, setExecutando] = useState(false);
  const previo = useRef<IaProvider[] | null>(null);

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    try {
      const [ov, h] = await Promise.all([
        api.infraIaOverview(),
        api.infraIaHistorico({ limite: 20 }),
      ]);
      notificarMudancas(previo.current, ov.providers);
      previo.current = ov.providers;
      setOverview(ov);
      setHistorico(h);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Falha ao carregar dashboard.";
      toast.error("Falha ao carregar infraestrutura", { description: msg });
    } finally {
      if (!silencioso) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    const id = window.setInterval(() => carregar(true), AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [carregar]);

  async function executarCheck() {
    setExecutando(true);
    try {
      await api.infraIaCheckAgora();
      toast.success("Health check executado");
      await carregar(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Falha ao executar health check.";
      toast.error("Health check falhou", { description: msg });
    } finally {
      setExecutando(false);
    }
  }

  const resumo = overview?.resumo;
  const providers = overview?.providers ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Infraestrutura · Provedores de IA
          </p>
          <h1 className="mt-1 font-display text-3xl">Monitoramento dos provedores</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Painel em tempo quase-real. Atualiza automaticamente a cada 60s. Health checks são
            executados pelo backend diariamente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => carregar()} disabled={carregando}>
            <RefreshCw className={cn("mr-2 h-3.5 w-3.5", carregando && "animate-spin")} />
            Atualizar
          </Button>
          <Button size="sm" onClick={executarCheck} disabled={executando}>
            <PlayCircle className={cn("mr-2 h-3.5 w-3.5", executando && "animate-pulse")} />
            {executando ? "Executando…" : "Executar health check"}
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {carregando && !overview ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)
        ) : (
          <>
            <CardResumo titulo="Total" valor={resumo?.total ?? 0} icon={ActivitySquare} tom="neutro" />
            <CardResumo titulo="Online" valor={resumo?.ativos ?? 0} icon={ShieldCheck} tom="online" />
            <CardResumo titulo="Avisos" valor={resumo?.warnings ?? 0} icon={TriangleAlert} tom="warning" />
            <CardResumo titulo="Offline" valor={resumo?.erro ?? 0} icon={XCircle} tom="offline" />
            <CardResumo
              titulo="Última verificação"
              valor={resumo?.ultima_verificacao ? formatarData(resumo.ultima_verificacao).split(" ")[1] ?? "—" : "—"}
              hint={resumo?.ultima_verificacao ? formatarData(resumo.ultima_verificacao).split(" ")[0] : undefined}
              icon={Gauge}
            />
            <CardResumo
              titulo="Próxima execução"
              valor={resumo?.proxima_verificacao ? formatarData(resumo.proxima_verificacao).split(" ")[1] ?? "—" : "—"}
              hint={resumo?.proxima_verificacao ? formatarData(resumo.proxima_verificacao).split(" ")[0] : "—"}
              icon={Sparkles}
            />
          </>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg">Provedores</h2>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {providers.length} registrados
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {carregando && !overview
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[320px] rounded-xl" />
              ))
            : providers.map((p) => <CardProvider key={p.nome} p={p} />)}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg">Mudanças recentes</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/app/infraestrutura/ia/historico" className="font-mono text-xs">
              Ver tudo <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-5">
            {carregando && !overview ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded" />
                ))}
              </div>
            ) : (
              <TimelineMini items={historico} />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
