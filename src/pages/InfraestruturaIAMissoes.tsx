import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CircuitBoard,
  History,
  Layers,
  RefreshCw,
  Settings2,
  Sparkles,
  Target,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  api,
  type IaCatalogoEntrada,
  type IaFallback,
  type IaMetricaModelo,
  type IaMissao,
  type IaPerfisInfo,
} from "@/lib/api";

const AUTO_REFRESH_MS = 30_000;

function formatarHora(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
    });
  } catch {
    return iso;
  }
}

function CustoBadge({ custo }: { custo: string }) {
  const tom: Record<string, string> = {
    free: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
    low: "border-sky-500/30 bg-sky-500/5 text-sky-400",
    medium: "border-amber-500/30 bg-amber-500/5 text-amber-400",
    high: "border-rose-500/30 bg-rose-500/5 text-rose-400",
    unknown: "border-border bg-muted/40 text-muted-foreground",
  };
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono text-[10px] uppercase tracking-wider",
        tom[custo] ?? tom.unknown,
      )}
    >
      {custo}
    </Badge>
  );
}

function MotivoBadge({ motivo }: { motivo: IaFallback["motivo"] }) {
  const map: Record<string, string> = {
    timeout: "border-amber-500/30 bg-amber-500/5 text-amber-400",
    rate_limit: "border-amber-500/30 bg-amber-500/5 text-amber-400",
    billing: "border-rose-500/30 bg-rose-500/5 text-rose-400",
    health_indisponivel: "border-rose-500/30 bg-rose-500/5 text-rose-400",
    quota_excedida: "border-amber-500/30 bg-amber-500/5 text-amber-400",
    erro_interno: "border-rose-500/30 bg-rose-500/5 text-rose-400",
    sem_modelo_configurado: "border-border bg-muted/40 text-muted-foreground",
    api_key_invalida: "border-rose-500/30 bg-rose-500/5 text-rose-400",
    modelo_indisponivel: "border-rose-500/30 bg-rose-500/5 text-rose-400",
  };
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono text-[10px] uppercase tracking-wider",
        map[motivo] ?? map.erro_interno,
      )}
    >
      {motivo.replaceAll("_", " ")}
    </Badge>
  );
}

function CardKpi({
  titulo,
  valor,
  hint,
  icon: Icon,
}: {
  titulo: string;
  valor: string | number;
  hint?: string;
  icon: typeof Activity;
}) {
  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {titulo}
          </p>
          <p className="mt-1 font-display text-2xl">{valor}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="rounded-md border border-border/60 bg-muted/30 p-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function InfraestruturaIAMissoes() {
  const [missoes, setMissoes] = useState<IaMissao[]>([]);
  const [catalogo, setCatalogo] = useState<IaCatalogoEntrada[]>([]);
  const [metricas, setMetricas] = useState<IaMetricaModelo[]>([]);
  const [fallbacks, setFallbacks] = useState<IaFallback[]>([]);
  const [perfis, setPerfis] = useState<IaPerfisInfo | null>(null);
  const [providersDisponiveis, setProvidersDisponiveis] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [savingModo, setSavingModo] = useState(false);

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    try {
      const [ms, cat, met, fb, pe, ov] = await Promise.all([
        api.infraIaMissoes(),
        api.infraIaCatalogo(),
        api.infraIaMetricasMemoria(),
        api.infraIaFallbacks(50),
        api.infraIaPerfis(),
        api.infraIaOverview(),
      ]);
      setMissoes(ms);
      setCatalogo(cat);
      setMetricas(met);
      setFallbacks(fb);
      setPerfis(pe);
      setProvidersDisponiveis(ov.providers.map((p) => p.nome));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Falha ao carregar.";
      toast.error("Falha ao carregar missões", { description: msg });
    } finally {
      if (!silencioso) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    const id = window.setInterval(() => carregar(true), AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [carregar]);

  async function alternarModo(checked: boolean) {
    if (!perfis) return;
    const novo = checked ? "manual" : "automatico";
    setSavingModo(true);
    try {
      await api.infraIaDefinirModo(novo, perfis.overrides_manuais);
      toast.success(`Modo alterado para ${novo}`);
      await carregar(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Falha ao alterar modo.";
      toast.error("Falha ao alterar modo", { description: msg });
    } finally {
      setSavingModo(false);
    }
  }

  async function definirOverride(missao: string, provider: string) {
    if (!perfis) return;
    const overrides = { ...perfis.overrides_manuais };
    if (provider === "__auto__") delete overrides[missao];
    else overrides[missao] = provider;
    try {
      await api.infraIaDefinirModo(perfis.modo, overrides);
      toast.success(`Override de ${missao} salvo`);
      await carregar(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Falha ao salvar override.";
      toast.error("Falha ao salvar override", { description: msg });
    }
  }

  const totalProviders = useMemo(
    () => new Set(catalogo.map((c) => c.provider)).size,
    [catalogo],
  );
  const totalEspec = useMemo(
    () => new Set(catalogo.map((c) => c.especializacao)).size,
    [catalogo],
  );
  const totalChamadas = metricas.reduce((a, b) => a + b.chamadas, 0);

  if (carregando && !missoes.length) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Infraestrutura · Missões e Roteamento Inteligente
          </p>
          <h1 className="mt-1 font-display text-3xl">Missões, Catálogo & Métricas</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Cada habilidade pede uma <strong>missão</strong>; o roteador escolhe o melhor
            provider conforme categoria, especialização, peso, health e métricas em tempo
            real. Tudo configurável via <code className="font-mono text-xs">.env</code> e
            perfis YAML — zero hardcode.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => carregar()}>
          <RefreshCw className={cn("mr-2 h-3.5 w-3.5", carregando && "animate-spin")} />
          Atualizar
        </Button>
      </header>

      {/* ── KPIs ───────────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <CardKpi titulo="Missões" valor={missoes.length} icon={Target} />
        <CardKpi titulo="Catálogo" valor={catalogo.length} icon={Layers} hint="entradas" />
        <CardKpi titulo="Providers" valor={totalProviders} icon={CircuitBoard} />
        <CardKpi titulo="Especializações" valor={totalEspec} icon={Sparkles} />
        <CardKpi titulo="Chamadas (mem)" valor={totalChamadas} icon={Activity} />
        <CardKpi
          titulo="Fallbacks"
          valor={fallbacks.length}
          hint="últimos 200 eventos"
          icon={AlertTriangle}
        />
      </section>

      {/* ── Modo Auto/Manual ───────────────────────────────── */}
      <Card className="border-border/60 bg-card/60">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="font-display text-lg">Modo de operação</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "font-mono text-[10px] uppercase tracking-wider",
                perfis?.modo === "automatico"
                  ? "text-emerald-400"
                  : "text-muted-foreground",
              )}
            >
              Automático
            </span>
            <Switch
              checked={perfis?.modo === "manual"}
              onCheckedChange={alternarModo}
              disabled={savingModo || !perfis}
            />
            <span
              className={cn(
                "font-mono text-[10px] uppercase tracking-wider",
                perfis?.modo === "manual" ? "text-amber-400" : "text-muted-foreground",
              )}
            >
              Manual
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-xs text-muted-foreground">
            Perfil ativo: <span className="text-foreground">{perfis?.ativo ?? "—"}</span>
            {" · "}
            Disponíveis:{" "}
            <span className="text-foreground">
              {perfis?.disponiveis.join(", ") || "—"}
            </span>
          </p>
          {perfis?.modo === "manual" && (
            <p className="mt-2 text-xs text-amber-400">
              No modo manual, o roteador segue o provider fixado por missão (abaixo). Sem
              fallback automático.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Missões ────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg">Missões</h2>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {missoes.length} cadastradas
          </p>
        </div>
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Missão</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Especialização</TableHead>
                    <TableHead>Preferencial</TableHead>
                    <TableHead>Reserva</TableHead>
                    <TableHead className="text-right">Peso</TableHead>
                    <TableHead className="text-right">Lat. média</TableHead>
                    <TableHead className="text-right">Fallbacks</TableHead>
                    <TableHead>Override manual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missoes.map((m) => (
                    <TableRow key={m.nome}>
                      <TableCell>
                        <div className="font-medium">{m.nome}</div>
                        <div className="text-xs text-muted-foreground">{m.descricao}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {m.categoria}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {m.especializacao}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {m.preferencial ? (
                          <div className="font-mono text-xs">
                            <div className="capitalize">{m.preferencial.provider}</div>
                            <div className="text-muted-foreground">
                              {m.preferencial.modelo}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {m.reserva ? (
                          <div className="font-mono text-xs">
                            <div className="capitalize">{m.reserva.provider}</div>
                            <div className="text-muted-foreground">{m.reserva.modelo}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {m.preferencial?.peso_final ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {m.metricas?.lat_media_ms
                          ? `${m.metricas.lat_media_ms} ms`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {m.fallbacks_recentes}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={m.override_manual ?? "__auto__"}
                          onValueChange={(v) => definirOverride(m.nome, v)}
                        >
                          <SelectTrigger className="h-8 w-[140px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__auto__">— automático —</SelectItem>
                            {providersDisponiveis.map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Catálogo ───────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg">Catálogo</h2>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {catalogo.length} entradas
          </p>
        </div>
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-0">
            <div className="max-h-[480px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card/95 backdrop-blur">
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Especialização</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead className="text-right">Peso</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Capacidades</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catalogo.map((e, i) => (
                    <TableRow key={`${e.provider}-${e.especializacao}-${i}`}>
                      <TableCell className="font-medium capitalize">
                        {e.provider}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{e.categoria}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {e.especializacao}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {e.modelo}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {e.peso}
                      </TableCell>
                      <TableCell>
                        <CustoBadge custo={e.custo} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(e.capabilities)
                            .filter(([, v]) => v)
                            .map(([k]) => (
                              <Badge
                                key={k}
                                variant="outline"
                                className="font-mono text-[10px] uppercase tracking-wider"
                              >
                                {k}
                              </Badge>
                            ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Métricas in-memory ─────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg">Métricas em memória</h2>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            zeradas no reinício do processo (persistência: Fase 6)
          </p>
        </div>
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-0">
            {metricas.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                Nenhuma chamada registrada ainda. Execute uma habilidade para gerar dados.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead className="text-right">Chamadas</TableHead>
                      <TableHead className="text-right">Sucesso</TableHead>
                      <TableHead className="text-right">Falhas</TableHead>
                      <TableHead className="text-right">Lat. média</TableHead>
                      <TableHead className="text-right">Lat. máx</TableHead>
                      <TableHead className="text-right">Taxa OK</TableHead>
                      <TableHead>Último uso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metricas.map((m, i) => (
                      <TableRow key={i}>
                        <TableCell className="capitalize">{m.provider}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {m.modelo}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {m.chamadas}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-emerald-400">
                          {m.sucessos}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-rose-400">
                          {m.falhas}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {m.lat_media_ms ? `${m.lat_media_ms} ms` : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {m.lat_max_ms ? `${m.lat_max_ms} ms` : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {(m.taxa_sucesso * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {formatarHora(m.ultimo_uso)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Histórico de Fallback ──────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-lg">Histórico de fallback</h2>
        </div>
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-0">
            {fallbacks.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                Nenhum fallback registrado ainda. Quando um provider falhar, a troca
                automática aparecerá aqui.
              </p>
            ) : (
              <div className="max-h-[480px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card/95 backdrop-blur">
                    <TableRow>
                      <TableHead>Quando</TableHead>
                      <TableHead>Missão</TableHead>
                      <TableHead>De</TableHead>
                      <TableHead>Para</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Detalhe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fallbacks.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {formatarHora(f.timestamp)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {f.missao ?? "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          <span className="capitalize">{f.provider_original}</span>
                          {f.modelo_original && (
                            <span className="text-muted-foreground">
                              {" "}
                              · {f.modelo_original}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {f.provider_utilizado ? (
                            <>
                              <span className="capitalize">{f.provider_utilizado}</span>
                              {f.modelo_utilizado && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  · {f.modelo_utilizado}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <MotivoBadge motivo={f.motivo} />
                        </TableCell>
                        <TableCell className="max-w-[320px] truncate font-mono text-[11px] text-muted-foreground">
                          {f.detalhe ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
