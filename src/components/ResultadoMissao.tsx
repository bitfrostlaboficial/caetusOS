import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Copy,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileType,
  File as FileIcon,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ResultadoExecucao } from "@/lib/api";

/**
 * Componente genérico de exibição de resultados de missões.
 * Detecta automaticamente o tipo de conteúdo (texto, imagem, arquivo,
 * link, múltiplos arquivos) e renderiza a UI apropriada.
 */
export function ResultadoMissao({ resultado }: { resultado: ResultadoExecucao }) {
  if (resultado.erro) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
        <p className="font-medium text-destructive">{resultado.erro.codigo}</p>
        <p className="mt-1 text-destructive/80">{resultado.erro.mensagem}</p>
      </div>
    );
  }

  const blocos = detectarBlocos(resultado);
  if (blocos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        A execução foi concluída, mas não retornou conteúdo exibível.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {blocos.map((b, i) => (
        <BlocoResultado key={i} bloco={b} />
      ))}
    </div>
  );
}

// ───────── Detecção de tipos ─────────

type Bloco =
  | { tipo: "texto"; titulo?: string; texto: string; hashtags?: string[] }
  | { tipo: "imagem"; url: string; nome?: string }
  | { tipo: "arquivo"; nome: string; categoria: string; mime?: string; tamanho?: number; url?: string }
  | { tipo: "link"; url: string; rotulo?: string };

function detectarBlocos(r: ResultadoExecucao): Bloco[] {
  const blocos: Bloco[] = [];
  const d = (r.dados ?? {}) as Record<string, unknown>;

  // Texto principal: corpo / texto / conteudo / mensagem
  const titulo = pickStr(d, ["titulo", "title"]);
  const corpo = pickStr(d, ["corpo", "texto", "conteudo", "content", "body", "mensagem"]);
  const hashtags = Array.isArray(d.hashtags) ? (d.hashtags as string[]) : undefined;
  if (corpo) blocos.push({ tipo: "texto", titulo, texto: corpo, hashtags });

  // URLs de imagem no payload
  const imagemUrl = pickStr(d, ["imagem_url", "image_url", "url_imagem"]);
  if (imagemUrl) blocos.push({ tipo: "imagem", url: imagemUrl });

  // Links genéricos
  const link = pickStr(d, ["url", "link"]);
  if (link && !imagemUrl) blocos.push({ tipo: "link", url: link });

  // Arquivos gerados pela skill
  for (const a of r.arquivos ?? []) {
    const nome = a.caminho.split("/").pop() ?? a.caminho;
    blocos.push({ tipo: "arquivo", nome, categoria: a.categoria });
  }

  return blocos;
}

function pickStr(o: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

// ───────── Renderização por tipo ─────────

function BlocoResultado({ bloco }: { bloco: Bloco }) {
  if (bloco.tipo === "texto") return <BlocoTexto {...bloco} />;
  if (bloco.tipo === "imagem") return <BlocoImagem {...bloco} />;
  if (bloco.tipo === "arquivo") return <BlocoArquivo {...bloco} />;
  return <BlocoLink {...bloco} />;
}

function BlocoTexto({
  titulo,
  texto,
  hashtags,
}: {
  titulo?: string;
  texto: string;
  hashtags?: string[];
}) {
  const [expandido, setExpandido] = useState(false);
  const ehMarkdown = /[#*_`\[\]]/.test(texto);

  const copiar = async () => {
    await navigator.clipboard.writeText(texto);
    toast.success("Conteúdo copiado");
  };
  const baixar = () => {
    const ext = ehMarkdown ? "md" : "txt";
    const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `resultado.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card/60">
      <div className="flex items-center justify-between gap-2 border-b border-border/40 px-4 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {ehMarkdown ? "Texto · Markdown" : "Texto"}
        </p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={copiar} className="h-7 gap-1 px-2 text-xs">
            <Copy className="h-3 w-3" /> Copiar
          </Button>
          <Button variant="ghost" size="sm" onClick={baixar} className="h-7 gap-1 px-2 text-xs">
            <Download className="h-3 w-3" /> Baixar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandido((v) => !v)}
            className="h-7 gap-1 px-2 text-xs"
          >
            {expandido ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            {expandido ? "Recolher" : "Expandir"}
          </Button>
        </div>
      </div>
      <div className="p-4">
        {titulo && <h3 className="mb-2 text-base font-semibold">{titulo}</h3>}
        <div
          className={`prose prose-sm prose-invert max-w-none select-text leading-relaxed ${
            expandido ? "" : "max-h-[28rem] overflow-y-auto"
          }`}
        >
          {ehMarkdown ? (
            <ReactMarkdown>{texto}</ReactMarkdown>
          ) : (
            <p className="whitespace-pre-wrap text-sm">{texto}</p>
          )}
        </div>
        {hashtags && hashtags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {hashtags.map((h) => (
              <Badge key={h} variant="secondary">
                {h}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BlocoImagem({ url, nome }: { url: string; nome?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/60 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Imagem
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-7 gap-1 px-2 text-xs"
          >
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3 w-3" /> Abrir
            </a>
          </Button>
          <Button variant="ghost" size="sm" asChild className="h-7 gap-1 px-2 text-xs">
            <a href={url} download={nome ?? true}>
              <Download className="h-3 w-3" /> Baixar
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(url);
              toast.success("URL copiada");
            }}
            className="h-7 gap-1 px-2 text-xs"
          >
            <Copy className="h-3 w-3" /> URL
          </Button>
        </div>
      </div>
      <img src={url} alt={nome ?? "Resultado"} className="max-h-[32rem] w-auto rounded-md" />
    </div>
  );
}

function BlocoArquivo({
  nome,
  categoria,
  mime,
  tamanho,
  url,
}: {
  nome: string;
  categoria: string;
  mime?: string;
  tamanho?: number;
  url?: string;
}) {
  const Icone = iconePorMime(mime, nome);
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/60 p-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border/40 bg-muted/30 text-muted-foreground">
          <Icone className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{nome}</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {categoria}
            {tamanho ? ` · ${formatarTamanho(tamanho)}` : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {url && (
          <>
            <Button variant="ghost" size="sm" asChild className="h-7 gap-1 px-2 text-xs">
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3 w-3" /> Abrir
              </a>
            </Button>
            <Button variant="ghost" size="sm" asChild className="h-7 gap-1 px-2 text-xs">
              <a href={url} download={nome}>
                <Download className="h-3 w-3" /> Baixar
              </a>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function BlocoLink({ url, rotulo }: { url: string; rotulo?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 p-3 text-sm text-primary hover:bg-card"
    >
      <LinkIcon className="h-4 w-4" />
      <span className="truncate">{rotulo ?? url}</span>
    </a>
  );
}

function iconePorMime(mime: string | undefined, nome: string) {
  const n = nome.toLowerCase();
  if (mime?.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/.test(n)) return FileImage;
  if (/\.pdf$/.test(n) || mime === "application/pdf") return FileType;
  if (/\.(xlsx?|csv)$/.test(n)) return FileSpreadsheet;
  if (/\.(docx?|md|txt)$/.test(n)) return FileText;
  return FileIcon;
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
