import { useState } from "react";
import { Copy, Check, Braces } from "lucide-react";
import { toast } from "sonner";

interface JsonViewerProps {
  conteudo: string;
}

export function JsonViewer({ conteudo }: JsonViewerProps) {
  const [copiado, setCopiado] = useState(false);

  let parsed: any = null;
  let erroParsing = null;

  try {
    parsed = JSON.parse(conteudo);
  } catch (e) {
    erroParsing = e instanceof Error ? e.message : "Erro ao decodificar JSON";
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(conteudo);
    setCopiado(true);
    toast.success("JSON copiado para a área de transferência!");
    setTimeout(() => setCopiado(false), 2000);
  };

  if (erroParsing) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 font-mono text-xs text-destructive">
        <p className="font-semibold">Erro ao processar JSON:</p>
        <p className="mt-1">{erroParsing}</p>
        <pre className="mt-4 overflow-auto rounded bg-background/50 p-3 text-muted-foreground select-text whitespace-pre">
          {conteudo}
        </pre>
      </div>
    );
  }

  const formatted = JSON.stringify(parsed, null, 2);
  const tokens = formatted.split(/(".*?"\s*:|\btrue\b|\bfalse\b|\bnull\b|\b\d+\b|"[^"]*")/g);

  return (
    <div className="flex flex-col h-full rounded-lg border border-border/50 bg-background/30 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/40 bg-muted/20 px-4 py-2">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <Braces className="h-3.5 w-3.5 text-amber-400" />
          <span>JSON Estruturado</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded bg-muted/60 px-2 py-1 text-[11px] font-mono hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          {copiado ? (
            <>
              <Check className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-500">Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copiar JSON</span>
            </>
          )}
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 select-text font-mono text-xs leading-relaxed max-h-[500px]">
        <code>
          {tokens.map((token, idx) => {
            if (token.endsWith(":")) {
              return (
                <span key={idx} className="text-sky-400 font-medium">
                  {token}
                </span>
              );
            } else if (/^".*"$/.test(token)) {
              return (
                <span key={idx} className="text-emerald-400 break-words">
                  {token}
                </span>
              );
            } else if (/^(true|false)$/.test(token)) {
              return (
                <span key={idx} className="text-amber-400 font-bold">
                  {token}
                </span>
              );
            } else if (token === "null") {
              return (
                <span key={idx} className="text-rose-400 italic">
                  {token}
                </span>
              );
            } else if (/^\d+$/.test(token)) {
              return (
                <span key={idx} className="text-purple-400">
                  {token}
                </span>
              );
            }
            return (
              <span key={idx} className="text-foreground">
                {token}
              </span>
            );
          })}
        </code>
      </div>
    </div>
  );
}
