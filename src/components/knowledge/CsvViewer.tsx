import { useState, useMemo } from "react";
import { Table as TableIcon, Search, Download, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface CsvViewerProps {
  conteudo: string;
  nomeArquivo: string;
}

export function CsvViewer({ conteudo, nomeArquivo }: CsvViewerProps) {
  const [busca, setBusca] = useState("");
  const [copiado, setCopiado] = useState(false);

  // Parse CSV
  const data = useMemo(() => {
    const lines = conteudo.split(/\r?\n/).filter((line) => line.trim() !== "");
    if (lines.length === 0) return { headers: [], rows: [] };

    // Detect separator (comma or semicolon)
    const firstLine = lines[0];
    const commas = (firstLine.match(/,/g) || []).length;
    const semicolons = (firstLine.match(/;/g) || []).length;
    const separator = semicolons > commas ? ";" : ",";

    const headers = firstLine
      .split(separator)
      .map((h) => h.replace(/^["']|["']$/g, "").trim());

    const rows = lines.slice(1).map((line) => {
      const matches = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === separator && !inQuotes) {
          matches.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      matches.push(current.trim());
      return matches.map((v) => v.replace(/^["']|["']$/g, "").trim());
    });

    return { headers, rows };
  }, [conteudo]);

  // Filtrar linhas
  const rowsFiltradas = useMemo(() => {
    if (!busca.trim()) return data.rows;
    const q = busca.toLowerCase();
    return data.rows.filter((row) =>
      row.some((val) => val.toLowerCase().includes(q))
    );
  }, [data.rows, busca]);

  const handleCopy = () => {
    navigator.clipboard.writeText(conteudo);
    setCopiado(true);
    toast.success("CSV original copiado para a área de transferência!");
    setTimeout(() => setCopiado(false), 2000);
  };

  if (data.headers.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-muted-foreground">
        Planilha vazia ou formato inválido.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full rounded-lg border border-border/50 bg-background/30 overflow-hidden">
      {/* Barra de Filtro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/40 bg-muted/20 px-4 py-2 gap-2">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <TableIcon className="h-3.5 w-3.5 text-teal-400" />
          <span>Tabela Integrada ({rowsFiltradas.length} linhas)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filtrar dados..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-7 w-40 rounded border border-border/40 bg-background/50 pl-7 pr-2 font-sans text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <button
            onClick={handleCopy}
            className="flex h-7 items-center gap-1 rounded bg-muted/60 px-2 text-[11px] font-mono hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            {copiado ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>

      {/* Tabela de Dados */}
      <div className="flex-1 overflow-auto max-h-[500px]">
        <table className="w-full text-xs text-left border-collapse font-sans">
          <thead className="sticky top-0 z-10 border-b border-border bg-muted/90 backdrop-blur shadow-[0_1px_0_rgba(0,0,0,0.05)]">
            <tr>
              {data.headers.map((h, i) => (
                <th
                  key={i}
                  className="px-4 py-2 font-semibold text-muted-foreground font-mono text-[11px] uppercase tracking-wider border-r border-border/20 last:border-0"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {rowsFiltradas.length === 0 ? (
              <tr>
                <td
                  colSpan={data.headers.length}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Nenhum registro encontrado para "{busca}".
                </td>
              </tr>
            ) : (
              rowsFiltradas.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="hover:bg-muted/30 even:bg-muted/10 transition-colors"
                >
                  {data.headers.map((_, colIdx) => (
                    <td
                      key={colIdx}
                      className="px-4 py-1.5 font-mono text-[11px] text-foreground select-text border-r border-border/20 last:border-0 max-w-[200px] truncate"
                      title={row[colIdx]}
                    >
                      {row[colIdx] !== undefined ? row[colIdx] : "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
