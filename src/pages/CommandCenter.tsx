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
  type Identidade,
  type ProvedorIA,
} from "@/lib/api";
import { MISSOES, type Missao } from "@/lib/missoes";

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
  const [provedores, setProvedores] = useState<ProvedorIA[] | null>(null);
  const [identidade, setIdentidade] = useState<Identidade | null>(null);
  const [historico, setHistorico] = useState<Execucao[] | null>(null);
  const [busca, setBusca] = useState("");
  const [focado, setFocado] = useState(false);
  const [agora, setAgora] = useState(() => new Date());

  useEffect(() => {
    api
      .empresaAtual()
      .then(setEmpresa)
      .catch(() => undefined);
    api
      .infraIaMetrics()
      .then(setMetrics)
      .catch(() => setMetrics(null));
    api
      .listarProvedores()
      .then(setProvedores)
      .catch(() => setProvedores([]));
    api
      .obterIdentidade()
      .then(setIdentidade)
      .catch(() => setIdentidade(null));
    api
      .historico(8)
      .then(setHistorico)
      .catch(() => setHistorico([]));
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
    const disponiveis = MISSOES.filter((m) => m.status === "disponivel");
    if (!q) return disponiveis;
    return disponiveis.filter(
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

  const conectados = provedores?.filter((p) => p.configurado && p.ativo) ?? [];
  const marcaPreenchida =
    !!identidade &&
    (!!identidade.tom_de_voz?.trim() || Object.keys(identidade.cores ?? {}).length > 0);
  const passos = [
    {
      feito: conectados.length > 0,
      titulo: "Conecte um provedor de IA",
      detalhe: "Cadastre sua chave (Gemini e Groq têm plano gratuito).",
      rota: "/app/provedores",
    },
    {
      feito: marcaPreenchida,
      titulo: "Conte como é a sua marca",
      detalhe: "Tom de voz e cores — a IA passa a falar como você.",
      rota: "/app/marca",
    },
    {
      feito: (historico ?? []).some((e) => e.status.toLowerCase() === "sucesso"),
      titulo: "Gere o primeiro post",
      detalhe: "Missões → Criar post.",
      rota: "/app/missoes/criar-post",
    },
  ];
  const mostrarPassos = provedores !== null && historico !== null && passos.some((p) => !p.feito);

  return (
    <div className="space-y-12">
      {/* Cabeçalho — empresa em primeiro plano */}
      <section className="flex flex-wrap items-end justify-between gap-6 border-b border-border/40 pb-6">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary/80">
            Centro de Comando
          </p>
          <h1 className="mt-2 truncate font-display text-4xl font-bold leading-tight md:text-5xl">
            {empresa?.nome ?? "—"}
          </h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            operando em{" "}
            <span className="text-foreground/80">
              caetus<span className="text-primary">OS</span>
            </span>
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5 text-right">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl tabular-nums">{horaFormatada}</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              BRT
            </span>
          </div>
          <p className="text-xs capitalize text-muted-foreground">{dataFormatada}</p>
          {dataEspecial ? (
            <Badge variant="outline" className="gap-1.5 border-primary/40 text-primary">
              <CalendarDays className="h-3 w-3" />
              <span className="font-mono text-[10px] uppercase tracking-wider">
                Hoje é {dataEspecial}
              </span>
            </Badge>
          ) : proxima ? (
            <Badge
              variant="outline"
              className="gap-1.5 font-mono text-[10px] uppercase tracking-wider"
            >
              <CalendarDays className="h-3 w-3" />
              {proxima.rotulo} em {proxima.emDias}d
            </Badge>
          ) : null}
        </div>
      </section>

      {mostrarPassos && (
        <section className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-5">
          <h2 className="font-display text-lg">Primeiros passos</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Três passos e o Caetus OS já trabalha com a cara da sua empresa.
          </p>
          <ol className="mt-4 grid gap-3 md:grid-cols-3">
            {passos.map((p, i) => (
              <li key={p.titulo}>
                <Link
                  to={p.rota}
                  className={cn(
                    "flex h-full gap-3 rounded-xl border p-3 transition-colors hover:border-primary/50",
                    p.feito ? "border-primary/30 bg-primary/5" : "border-border/60 bg-card/50",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px]",
                      p.feito
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground",
                    )}
                  >
                    {p.feito ? "✓" : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block text-sm font-medium",
                        p.feito && "text-muted-foreground line-through",
                      )}
                    >
                      {p.titulo}
                    </span>
                    <span className="block text-xs text-muted-foreground">{p.detalhe}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

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
            "relative flex items-start gap-3 rounded-2xl border bg-card/70 p-4 backdrop-blur transition-all md:p-5",
            focado
              ? "border-primary/50 shadow-[0_0_0_1px_oklch(0.85_0.21_135_/_0.35),0_10px_40px_-12px_oklch(0.85_0.21_135_/_0.4)]"
              : "border-border/60",
          )}
        >
          <Sparkles
            className={cn(
              "mt-1 h-5 w-5 shrink-0 transition-colors",
              focado ? "text-primary" : "text-muted-foreground",
            )}
          />
          <textarea
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onFocus={() => setFocado(true)}
            onBlur={() => setFocado(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                executarBusca(e as unknown as FormEvent);
              }
            }}
            rows={2}
            placeholder="Descreva uma missão para um funcionário digital..."
            className="min-h-[3.5rem] flex-1 resize-none bg-transparent text-base leading-relaxed outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!busca.trim()}
            aria-label="Executar missão"
            className={cn(
              "group/btn mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all",
              busca.trim()
                ? "border-primary/50 bg-primary/15 text-primary hover:bg-primary/25 hover:shadow-[0_0_20px_-4px_oklch(0.85_0.21_135_/_0.6)]"
                : "border-border/60 bg-muted/20 text-muted-foreground/60",
            )}
          >
            <SendHorizonal className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
          </button>
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
        </div>
      </section>

      {/* Painel de Status */}
      <section>
        <h2 className="mb-4 font-display text-xl">Status da plataforma</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
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
            label="Provedores"
            valor={provedores === null ? "—" : conectados.length}
            hint="conectados"
            tone={conectados.length > 0 ? "positivo" : "neutro"}
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
                        e.status.toLowerCase() === "sucesso"
                          ? "bg-primary/15 text-primary"
                          : "bg-destructive/15 text-destructive",
                      )}
                    >
                      {e.status.toLowerCase() === "sucesso" ? "✓" : "✕"}
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
              <h3 className="font-display text-base">Provedores de IA</h3>
              <Link
                to="/app/provedores"
                className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary"
              >
                Gerenciar →
              </Link>
            </div>
            {provedores === null ? (
              <Skeleton className="h-20 w-full" />
            ) : conectados.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum provedor conectado.{" "}
                <Link
                  to="/app/provedores"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Conectar agora
                </Link>
              </p>
            ) : (
              <ul className="space-y-3">
                {conectados.map((p) => (
                  <li key={p.nome} className="flex items-start gap-3">
                    <span className="mt-1.5 inline-block h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_oklch(0.85_0.21_135_/_0.6)]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{p.rotulo}</p>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {p.modelo_preferido ?? p.modelo_padrao ?? "modelo padrão"}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {p.status_teste === "ok" ? "testado ✓" : "não testado"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
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
        {hint && <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{hint}</p>}
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
