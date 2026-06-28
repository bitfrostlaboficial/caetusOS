import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api, type IaHistoricoItem, type IaOverview } from "@/lib/api";
import { classesTom, meta as statusMeta } from "@/lib/ia-status";

const STATUSES = [
  "OK",
  "API_KEY_INVALIDA",
  "ACEITE_TERMOS",
  "BILLING",
  "MODELO_REMOVIDO",
  "MODELO_DEPRECIADO",
  "RATE_LIMIT",
  "SERVICO_INDISPONIVEL",
  "TIMEOUT",
  "DNS_ERROR",
  "SSL_ERROR",
  "SEM_CONEXAO",
  "QUOTA_EXCEDIDA",
  "CONTA_SUSPENSA",
  "AUTH_ERROR",
  "DESCONHECIDO",
];

const PAG = 25;

function formatar(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

export default function InfraestruturaIAHistorico() {
  const [overview, setOverview] = useState<IaOverview | null>(null);
  const [items, setItems] = useState<IaHistoricoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [provider, setProvider] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [desde, setDesde] = useState<string>("");
  const [ate, setAte] = useState<string>("");
  const [busca, setBusca] = useState<string>("");
  const [pagina, setPagina] = useState(0);

  useEffect(() => {
    api.infraIaOverview().then(setOverview).catch(() => {});
  }, []);

  useEffect(() => {
    setCarregando(true);
    api
      .infraIaHistorico({
        provider: provider || undefined,
        status: status || undefined,
        desde: desde ? new Date(desde).toISOString() : undefined,
        ate: ate ? new Date(ate).toISOString() : undefined,
        limite: 500,
      })
      .then((res) => {
        setItems(res);
        setPagina(0);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Falha ao carregar histórico.";
        toast.error("Histórico", { description: msg });
      })
      .finally(() => setCarregando(false));
  }, [provider, status, desde, ate]);

  const filtrados = useMemo(() => {
    if (!busca.trim()) return items;
    const q = busca.toLowerCase();
    return items.filter(
      (i) =>
        i.provider.toLowerCase().includes(q) ||
        i.status_novo.toLowerCase().includes(q) ||
        (i.status_anterior ?? "").toLowerCase().includes(q) ||
        (i.erro ?? "").toLowerCase().includes(q) ||
        (i.modelo ?? "").toLowerCase().includes(q),
    );
  }, [items, busca]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAG));
  const pagSlice = filtrados.slice(pagina * PAG, pagina * PAG + PAG);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
            <Link to="/app/infraestrutura/ia" className="font-mono text-xs">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Voltar
            </Link>
          </Button>
          <h1 className="font-display text-2xl">Histórico de mudanças de status</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Toda alteração de status de qualquer provedor é registrada de forma imutável.
          </p>
        </div>
      </header>

      <Card className="border-border/60 bg-card/60">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_180px_180px_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar texto…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={provider || "__all"} onValueChange={(v) => setProvider(v === "__all" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Provider" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos os providers</SelectItem>
              {overview?.providers.map((p) => (
                <SelectItem key={p.nome} value={p.nome} className="capitalize">{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status || "__all"} onValueChange={(v) => setStatus(v === "__all" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos os status</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="datetime-local" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <Input type="datetime-local" value={ate} onChange={(e) => setAte(e.target.value)} />
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/60">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 bg-background/40">
                <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5">Data</th>
                  <th className="px-4 py-2.5">Provider</th>
                  <th className="px-4 py-2.5">Modelo</th>
                  <th className="px-4 py-2.5">Mudança</th>
                  <th className="px-4 py-2.5">HTTP</th>
                  <th className="px-4 py-2.5">Latência</th>
                  <th className="px-4 py-2.5">Mensagem</th>
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/40">
                      <td colSpan={7} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    </tr>
                  ))
                ) : pagSlice.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  pagSlice.map((h) => {
                    const m = statusMeta(h.status_novo);
                    const c = classesTom(m.tone);
                    const Icon = m.icone;
                    return (
                      <tr key={h.id} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{formatar(h.ocorrido_em)}</td>
                        <td className="px-4 py-2 capitalize">{h.provider}</td>
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{h.modelo ?? "—"}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1.5">
                            {h.status_anterior && (
                              <span className="font-mono text-[10px] text-muted-foreground">{h.status_anterior} →</span>
                            )}
                            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]", c.badge)}>
                              <Icon className="h-3 w-3" /> {m.rotulo}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">{h.codigo_http ?? "—"}</td>
                        <td className="px-4 py-2 font-mono text-xs">{h.latencia_ms != null ? `${h.latencia_ms} ms` : "—"}</td>
                        <td className="px-4 py-2 max-w-[420px] truncate text-xs text-muted-foreground" title={h.erro ?? h.acao_recomendada ?? ""}>
                          {h.erro ?? h.acao_recomendada ?? "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border/60 px-4 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {filtrados.length} registros · página {pagina + 1} / {totalPaginas}
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagina + 1 >= totalPaginas}
                onClick={() => setPagina((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
