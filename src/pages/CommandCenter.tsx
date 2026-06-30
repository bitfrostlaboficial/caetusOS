import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CircuitBoard,
  Clock,
  Cpu,
  Layers,
  Plus,
  SendHorizonal,
  Sparkles,
  Wifi,
  Zap,
} from "lucide-react";

import { dataEspecialDeHoje, proximaDataEspecial } from "@/lib/datas-brasileiras";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  api,
  type Empresa,
  type Execucao,
  type IaMetrics,
  type IaOverview,
} from "@/lib/api";
import {
  FUNCIONARIOS_DIGITAIS,
  MISSAO_NOVA,
  MISSOES,
  type Missao,
} from "@/lib/missoes";

const EXEMPLOS = [
  "Criar campanha de Dia dos Pais",
  "Gerar banner para Instagram",
  "Responder avaliações do Google",
  "Criar proposta comercial",
  "Editar planilha de vendas",
  "Criar apresentação em PDF",
];

function tempoRelativo(iso: string | null): string {
  if (!iso) return "—";
  const delta = (Date.now() - new Date(iso).getTime()) / 1000;
  if (delta < 60) return `há ${Math.round(delta)}s`;
  if (delta < 3600) return `há ${Math.round(delta / 60)} min`;
  if (delta < 86400) return `há ${Math.round(delta / 3600)}h`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function CommandCenter() {
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [metrics, setMetrics] = useState<IaMetrics | null>(null);
  const [overview, setOverview] = useState<IaOverview | null>(null);
  const [historico, setHistorico] = useState<Execucao[] | null>(null);
  const [busca, setBusca] = useState("");
  const [focado, setFocado] = useState(false);
  const [agora, setAgora] = useState(() => new Date());

  useEffect(() => {
    api.empresaAtual().then(setEmpresa).catch(() => undefined);
    api.infraIaMetrics().then(setMetrics).catch(() => setMetrics(null));
    api.infraIaOverview().then(setOverview).catch(() => setOverview(null));
    api.historico(8).then(setHistorico).catch(() => setHistorico([]));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const dataEspecial = useMemo(() => dataEspecialDeHoje(agora), [agora]);
  const proxima = useMemo(() => proximaDataEspecial(agora), [agora]);
  const dataFormatada = useMemo(
    () =>
      agora.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    [agora],
  );
  const horaFormatada = useMemo(
    () => agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    [agora],
  );

  const missoesFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return MISSOES;
    return MISSOES.filter(
      (m) =>
        m.nome.toLowerCase().includes(q) ||
        m.descricao.toLowerCase().includes(q) ||
        m.funcionario?.toLowerCase().includes(q),
    );
  }, [busca]);

  function executarBusca(e: FormEvent) {
    e.preventDefault();
    // Atalho: a primeira missão disponível recebe o tema digitado.
    const alvo = missoesFiltradas.find((m) => m.status === "disponivel" && m.rota);
    if (alvo) {
      navigate(`${alvo.rota}?tema=${encodeURIComponent(busca)}`);
    }
  }

  const providersOnline = overview?.resumo.ativos ?? 0;
  const providersTotal = overview?.resumo.total ?? 0;

  return (
    <div className="space-y-12">
      {/* Header de boas-vindas */}
      <section className="flex flex-wrap items-end justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary/80">
            Command Center
          </p>
          <h1 className="mt-2 font-display text-3xl">
            <span className="text-foreground">caetus</span>
            <span className="text-primary">OS</span>
            <span className="ml-3 text-muted-foreground/70">
              {empresa?.nome ?? "—"}
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Operating System for AI Employees · {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 font-mono text-[10px] uppercase tracking-wider">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          Sistema operacional
        </Badge>
      </section>

      {/* Hero — barra de comando */}
      <section className="relative">
        <div
          className={cn(
            "pointer-events-none absolute inset-x-8 -inset-y-4 rounded-3xl blur-2xl transition-opacity duration-500",
            focado ? "opacity-100" : "opacity-0",
            "bg-[radial-gradient(closest-side,oklch(0.85_0.21_135_/_0.20),transparent)]",
          )}
        />
        <form
          onSubmit={executarBusca}
          className={cn(
            "relative flex items-center gap-3 rounded-2xl border bg-card/70 px-5 py-4 backdrop-blur transition-all",
            focado
              ? "border-primary/50 shadow-[0_0_0_1px_oklch(0.85_0.21_135_/_0.35),0_10px_40px_-12px_oklch(0.85_0.21_135_/_0.4)]"
              : "border-border/60",
          )}
        >
          <Sparkles className={cn("h-5 w-5 shrink-0 transition-colors", focado ? "text-primary" : "text-muted-foreground")} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onFocus={() => setFocado(true)}
            onBlur={() => setFocado(false)}
            placeholder="O que você deseja que um funcionário digital faça hoje?"
            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded border border-border/60 bg-background/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline">
            ⏎
          </kbd>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {EXEMPLOS.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setBusca(ex)}
              className="rounded-full border border-border/50 bg-card/40 px-3 py-1 font-mono text-[11px] text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
            >
              {ex}
            </button>
          ))}
        </div>
      </section>

      {/* Missões */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <h2 className="font-display text-xl">Missões</h2>
            <p className="text-xs text-muted-foreground">
              Cada missão é uma automação pronta executada por um funcionário digital.
            </p>
          </div>
          <Link
            to="/app/missoes"
            className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
          >
            Ver todas <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {missoesFiltradas.map((m) => (
            <CardMissao key={m.slug} missao={m} />
          ))}
          <CardMissao missao={MISSAO_NOVA} destacar />
        </div>
      </section>

      {/* Painel de Status */}
      <section>
        <h2 className="mb-4 font-display text-xl">Status da plataforma</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          <Kpi
            icone={Cpu}
            label="Funcionários"
            valor={FUNCIONARIOS_DIGITAIS.length}
            hint="digitais ativos"
          />
          <Kpi
            icone={Zap}
            label="Hoje"
            valor={metrics?.hoje.execucoes ?? <Skeleton className="h-6 w-12" />}
            hint="execuções"
          />
          <Kpi
            icone={Activity}
            label="Sucessos"
            valor={metrics?.hoje.sucessos ?? "—"}
            hint={metrics ? `${metrics.hoje.falhas} falhas` : undefined}
            tone="positivo"
          />
          <Kpi
            icone={Clock}
            label="Tempo médio"
            valor={metrics ? `${(metrics.hoje.tempo_medio_ms / 1000).toFixed(1)}s` : "—"}
          />
          <Kpi
            icone={Wifi}
            label="Providers"
            valor={`${providersOnline}/${providersTotal}`}
            hint="online"
            tone={providersOnline === providersTotal && providersTotal > 0 ? "positivo" : "neutro"}
          />
          <Kpi
            icone={Layers}
            label="Fallbacks"
            valor={overview?.resumo.warnings ?? 0}
            hint="hoje"
          />
          <Kpi
            icone={CircuitBoard}
            label="Custo"
            valor={metrics ? `$${metrics.hoje.custo_estimado_usd.toFixed(3)}` : "—"}
            hint="USD/dia"
          />
        </div>
      </section>

      {/* Duas colunas: Atividade Recente + Funcionários Digitais */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 bg-card/60 lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="font-display text-base">Atividade recente</h3>
              <Link
                to="/app/historico"
                className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary"
              >
                Histórico completo →
              </Link>
            </div>
            {historico === null ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded" />
                ))}
              </div>
            ) : historico.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma execução ainda. Inicie uma missão acima.
              </p>
            ) : (
              <ol className="space-y-0 divide-y divide-border/40">
                {historico.map((e) => (
                  <li
                    key={e.id}
                    className="group flex items-center gap-3 py-3 transition-colors hover:bg-primary/[0.03]"
                  >
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px]",
                        e.status === "SUCESSO"
                          ? "bg-primary/15 text-primary"
                          : "bg-destructive/15 text-destructive",
                      )}
                    >
                      {e.status === "SUCESSO" ? "✓" : "✕"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        <span className="font-medium">{e.alvo}</span>
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {e.provedor ?? "—"} · {e.latencia_ms ?? 0}ms
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {tempoRelativo(e.criado_em)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="font-display text-base">Funcionários digitais</h3>
              <Link
                to="/app/infraestrutura/ia"
                className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary"
              >
                Infra →
              </Link>
            </div>
            <ul className="space-y-3">
              {FUNCIONARIOS_DIGITAIS.map((f) => (
                <li key={f.nome} className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-1.5 inline-block h-2 w-2 rounded-full",
                      f.status === "online" && "bg-primary shadow-[0_0_8px_oklch(0.85_0.21_135_/_0.6)]",
                      f.status === "aguardando" && "bg-amber-400",
                      f.status === "offline" && "bg-muted-foreground/40",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{f.nome}</p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {f.provider} · {f.modelo}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {f.status}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// ───────── subcomponentes ─────────

function Kpi({
  icone: Icone,
  label,
  valor,
  hint,
  tone = "neutro",
}: {
  icone: typeof Cpu;
  label: string;
  valor: React.ReactNode;
  hint?: string;
  tone?: "neutro" | "positivo";
}) {
  return (
    <Card className="border-border/60 bg-card/50 transition-all hover:border-primary/30 hover:bg-card/80">
      <CardContent className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <Icone
            className={cn(
              "h-3.5 w-3.5",
              tone === "positivo" ? "text-primary" : "text-muted-foreground/60",
            )}
          />
        </div>
        <p className="font-display text-xl leading-tight">{valor}</p>
        {hint && (
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
}

function CardMissao({ missao, destacar = false }: { missao: Missao; destacar?: boolean }) {
  const Icone = missao.icone;
  const disponivel = missao.status === "disponivel";
  const destino = missao.rota ?? `/app/missoes/${missao.slug}`;

  return (
    <Link
      to={destino}
      className={cn(
        "group relative flex flex-col gap-3 overflow-hidden rounded-xl border bg-card/50 p-4 transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card/80 hover:shadow-[0_8px_30px_-12px_oklch(0.85_0.21_135_/_0.25)]",
        destacar
          ? "border-dashed border-border/70 bg-transparent hover:border-primary/60"
          : "border-border/60",
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-all",
            disponivel
              ? "border-primary/30 bg-primary/10 text-primary group-hover:bg-primary/20"
              : "border-border/60 bg-muted/30 text-muted-foreground",
          )}
        >
          <Icone className="h-4 w-4" />
        </div>
        <Badge
          variant="outline"
          className={cn(
            "font-mono text-[9px] uppercase tracking-wider",
            disponivel
              ? "border-primary/40 text-primary"
              : "border-border/60 text-muted-foreground",
          )}
        >
          {disponivel ? "● ativa" : "○ em breve"}
        </Badge>
      </div>

      <div className="space-y-1">
        <h3 className="font-display text-sm">{missao.nome}</h3>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {missao.descricao}
        </p>
      </div>

      {missao.funcionario && (
        <p className="mt-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
          {missao.funcionario}
        </p>
      )}

      {destacar && (
        <Plus className="absolute right-3 top-3 h-5 w-5 text-muted-foreground/40 transition-colors group-hover:text-primary" />
      )}
    </Link>
  );
}
