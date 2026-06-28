import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/historico")({
  component: HistoricoPage,
});

function HistoricoPage() {
  const lista = useQuery({ queryKey: ["historico"], queryFn: () => api.historico(30) });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Histórico</h1>
        <p className="text-sm text-muted-foreground">
          Últimas execuções de comandos. Cada linha registra a habilidade, o template de prompt e métricas — auditoria completa.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Execuções recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {!lista.data || lista.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {lista.isLoading ? "Carregando..." : "Nenhuma execução registrada ainda."}
            </p>
          ) : (
            <ul className="divide-y">
              {lista.data.map((e) => (
                <li key={e.id} className="space-y-1 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={e.status === "SUCESSO" ? "default" : "destructive"}>
                      {e.status}
                    </Badge>
                    <span className="font-mono text-xs">{e.alvo}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {e.criado_em ? new Date(e.criado_em).toLocaleString("pt-BR") : ""}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {e.provedor ?? "—"} · {e.tokens_in ?? 0}→{e.tokens_out ?? 0} tokens ·{" "}
                    {e.latencia_ms ?? 0}ms · prompt{" "}
                    <code className="text-[10px]">
                      {e.prompt_template ?? "—"}@{e.prompt_version ?? "—"}
                    </code>
                  </div>
                  {e.erro && <p className="text-xs text-destructive">{e.erro}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
