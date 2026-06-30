import { Check, X, Loader2, Circle } from "lucide-react";
import type { ResultadoExecucao, EventoExecucao } from "@/lib/api";

type Etapa = {
  chave: string;
  rotulo: string;
  /** tipos de evento que marcam essa etapa como concluída */
  marcadores: string[];
};

const ETAPAS: Etapa[] = [
  { chave: "comando", rotulo: "Recebendo comando", marcadores: ["comando.recebido", "skill.iniciada"] },
  { chave: "prompt", rotulo: "Montando prompt", marcadores: ["prompt.renderizado", "contexto.montado"] },
  { chave: "ia", rotulo: "Executando IA", marcadores: ["ia.resposta", "ia.fallback"] },
  { chave: "resposta", rotulo: "Processando resposta", marcadores: ["resposta.processada", "skill.concluida"] },
  { chave: "arquivos", rotulo: "Gerando arquivos", marcadores: ["arquivo.criado"] },
  { chave: "concluido", rotulo: "Concluído", marcadores: ["skill.concluida"] },
];

/**
 * Timeline visual da execução. Marca etapas como concluídas com base nos
 * eventos retornados; em falha, destaca a última etapa atingida em vermelho.
 */
export function TimelineExecucao({ resultado }: { resultado: ResultadoExecucao }) {
  const tipos = new Set((resultado.eventos ?? []).map((e: EventoExecucao) => e.tipo));
  const arquivosOk = (resultado.arquivos ?? []).length > 0;

  const estados = ETAPAS.map((e) => {
    if (e.chave === "arquivos" && arquivosOk) return "ok";
    if (e.chave === "concluido") return resultado.sucesso ? "ok" : "erro";
    return e.marcadores.some((m) => tipos.has(m)) ? "ok" : "pendente";
  });

  // marca a primeira etapa pendente após falha como ponto de erro
  if (!resultado.sucesso) {
    const primeiraPendente = estados.findIndex((s) => s === "pendente");
    if (primeiraPendente >= 0) estados[primeiraPendente] = "erro";
  }

  return (
    <ol className="space-y-2">
      {ETAPAS.map((e, i) => {
        const s = estados[i];
        const Icone = s === "ok" ? Check : s === "erro" ? X : Circle;
        const cor =
          s === "ok"
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
            : s === "erro"
              ? "border-destructive/50 bg-destructive/10 text-destructive"
              : "border-border/40 bg-muted/20 text-muted-foreground";
        const ativo = s === "erro" && i > 0;
        return (
          <li key={e.chave} className="flex items-center gap-3">
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${cor}`}
            >
              {ativo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icone className="h-3 w-3" />}
            </span>
            <span
              className={`text-sm ${
                s === "ok"
                  ? "text-foreground"
                  : s === "erro"
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}
            >
              {e.rotulo}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
