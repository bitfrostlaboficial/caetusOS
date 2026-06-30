import { CheckCircle2, AlertTriangle, FileText, Cpu, Clock, Coins } from "lucide-react";
import type { ResultadoExecucao } from "@/lib/api";

/**
 * Resumo em linguagem natural do que aconteceu durante a execução.
 * Constrói linhas tipo "✓ Criou um post para LinkedIn", "✓ Utilizou Groq".
 */
export function ResumoExecucao({ resultado }: { resultado: ResultadoExecucao }) {
  const { metricas, eventos, arquivos, sucesso, erro } = resultado;
  const fallbacks = (eventos ?? []).filter((e) => e.tipo === "ia.fallback");
  const linhas: { icone: typeof CheckCircle2; texto: string; tom: "ok" | "info" | "aviso" }[] = [];

  if (metricas.provedor)
    linhas.push({
      icone: Cpu,
      texto: `Utilizou o provider ${metricas.provedor}${metricas.modelo ? ` · ${metricas.modelo}` : ""}`,
      tom: "info",
    });
  if (metricas.latencia_ms != null)
    linhas.push({
      icone: Clock,
      texto: `Tempo de execução: ${(metricas.latencia_ms / 1000).toFixed(1)} s`,
      tom: "info",
    });
  const tokensTotal = (metricas.tokens_in ?? 0) + (metricas.tokens_out ?? 0);
  if (tokensTotal > 0)
    linhas.push({
      icone: Coins,
      texto: `Tokens utilizados: ${tokensTotal.toLocaleString("pt-BR")}`,
      tom: "info",
    });
  for (const a of arquivos ?? []) {
    const nome = a.caminho.split("/").pop() ?? a.caminho;
    linhas.push({ icone: FileText, texto: `Arquivo gerado: ${nome}`, tom: "ok" });
  }
  if (fallbacks.length > 0)
    linhas.push({
      icone: AlertTriangle,
      texto: `${fallbacks.length} fallback${fallbacks.length > 1 ? "s" : ""} automático${fallbacks.length > 1 ? "s" : ""} utilizado${fallbacks.length > 1 ? "s" : ""}`,
      tom: "aviso",
    });
  else if (sucesso)
    linhas.push({ icone: CheckCircle2, texto: "Nenhum fallback foi necessário", tom: "ok" });

  const titulo = sucesso
    ? "Execução concluída com sucesso"
    : `Falha durante a execução${erro ? `: ${erro.mensagem}` : ""}`;

  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-4">
      <p className={`text-sm font-medium ${sucesso ? "text-emerald-400" : "text-destructive"}`}>
        {titulo}
      </p>
      {linhas.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-sm">
          {linhas.map((l, i) => (
            <li key={i} className="flex items-center gap-2">
              <l.icone
                className={`h-3.5 w-3.5 shrink-0 ${
                  l.tom === "ok"
                    ? "text-emerald-400"
                    : l.tom === "aviso"
                      ? "text-amber-400"
                      : "text-muted-foreground"
                }`}
              />
              <span className="text-muted-foreground">{l.texto}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
