import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import {
  Download,
  Eye,
  FileText,
  ImageIcon,
  Loader2,
  Lock,
  ZoomIn,
  X,
  FileCode,
  FileSpreadsheet,
} from "lucide-react";
import { api, type DocumentoConhecimento } from "@/lib/api";
import { JsonViewer } from "./JsonViewer";
import { CsvViewer } from "./CsvViewer";
import { Button } from "@/components/ui/button";

interface FilePreviewerProps {
  node: {
    kind: "file";
    id: string;
    tipo: string;
    nome: string;
    status: string;
    doc?: DocumentoConhecimento;
  };
  conteudo: string | null;
  carregando: boolean;
  onDownload: () => void;
}

export function FilePreviewer({
  node,
  conteudo,
  carregando,
  onDownload,
}: FilePreviewerProps) {
  const [rawBlobUrl, setRawBlobUrl] = useState<string | null>(null);
  const [dimensoes, setDimensoes] = useState<{ width: number; height: number } | null>(null);
  const [carregandoRaw, setCarregandoRaw] = useState(false);
  const [lightboxAberto, setLightboxAberto] = useState(false);

  const extensao = node.nome.split(".").pop()?.toLowerCase() || "";
  const ehImagem = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extensao);
  const ehPdf = extensao === "pdf";
  const ehWord = ["docx", "doc"].includes(extensao);
  const ehExcel = ["xlsx", "xls"].includes(extensao);

  // Carrega o Blob binário para imagens e PDFs
  useEffect(() => {
    let active = true;
    let url: string | null = null;

    if (node.doc && (ehImagem || ehPdf)) {
      setCarregandoRaw(true);
      api
        .obterConhecimentoRaw(node.doc.id)
        .then((blob) => {
          if (!active) return;
          url = URL.createObjectURL(blob);
          setRawBlobUrl(url);

          if (ehImagem) {
            const img = new Image();
            img.onload = () => {
              if (active) {
                setDimensoes({ width: img.naturalWidth, height: img.naturalHeight });
              }
            };
            img.src = url;
          }
        })
        .catch((e) => {
          console.error("Falha ao buscar blob do documento raw:", e);
        })
        .finally(() => {
          if (active) setCarregandoRaw(false);
        });
    } else {
      setRawBlobUrl(null);
      setDimensoes(null);
    }

    return () => {
      active = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [node.id, ehImagem, ehPdf]);

  const isLoading = carregando || carregandoRaw;

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-card/5">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
        <p className="font-mono text-xs text-muted-foreground">Lendo e decodificando arquivo…</p>
      </div>
    );
  }

  // 1. Imagem
  if (ehImagem) {
    return (
      <div className="flex-1 flex flex-col h-full bg-muted/5 p-6 overflow-auto">
        <div className="flex-1 flex items-center justify-center relative min-h-[300px]">
          {rawBlobUrl ? (
            <div className="group relative max-w-full max-h-[400px] rounded-lg overflow-hidden border border-border/60 shadow-lg bg-background/50">
              <img
                src={rawBlobUrl}
                alt={node.nome}
                className="object-contain max-w-full max-h-[380px] cursor-zoom-in transition-transform duration-200 hover:scale-[1.01]"
                onClick={() => setLightboxAberto(true)}
              />
              <button
                onClick={() => setLightboxAberto(true)}
                className="absolute right-3 top-3 rounded-full bg-black/65 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur hover:bg-black/80"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Erro ao renderizar imagem.</div>
          )}
        </div>

        {/* Informações da Imagem */}
        <div className="mt-4 p-3 rounded-lg border border-border/40 bg-card/40 font-mono text-xs flex justify-between items-center">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground uppercase">Dimensões do arquivo</span>
            <span className="font-semibold text-foreground">
              {dimensoes ? `${dimensoes.width} x ${dimensoes.height} px` : "Calculando…"}
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={onDownload} className="h-8 text-xs font-sans">
            <Download className="mr-1.5 h-3.5 w-3.5" /> Baixar Imagem
          </Button>
        </div>

        {/* Lightbox Modal */}
        <AnimatePresence>
          {lightboxAberto && rawBlobUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
              onClick={() => setLightboxAberto(false)}
            >
              <button
                onClick={() => setLightboxAberto(false)}
                className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <motion.img
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                src={rawBlobUrl}
                alt={node.nome}
                className="max-w-full max-h-full object-contain rounded"
                onClick={(e) => e.stopPropagation()}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // 2. PDF
  if (ehPdf) {
    return (
      <div className="flex-1 flex flex-col h-full bg-muted/5 p-4">
        {rawBlobUrl ? (
          <iframe
            src={`${rawBlobUrl}#toolbar=1`}
            title={node.nome}
            className="flex-1 w-full rounded-lg border border-border/60 bg-muted/20"
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center border border-border/40 rounded-lg p-6 bg-card/30">
            <Eye className="h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="font-mono text-sm">{node.nome}</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Preview embutido indisponível no momento.
            </p>
            <Button onClick={onDownload} size="sm">
              <Download className="mr-1.5 h-3.5 w-3.5" /> Baixar PDF
            </Button>
          </div>
        )}
      </div>
    );
  }

  // 3. Markdown (.md)
  if (extensao === "md") {
    return (
      <div className="flex-1 overflow-y-auto bg-card/20 max-h-[550px]">
        <div className="p-8 max-w-3xl mx-auto">
          <article className="markdown-body max-w-none text-sm leading-relaxed text-foreground select-text prose prose-invert">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="mb-4 mt-6 font-display text-2xl font-semibold tracking-tight border-b border-border/40 pb-2 text-foreground">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mb-3 mt-5 font-display text-xl font-medium tracking-tight text-foreground/90">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mb-2 mt-4 font-display text-lg font-medium text-foreground/80">
                    {children}
                  </h3>
                ),
                p: ({ children }) => <p className="my-3 text-muted-foreground leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="my-3 list-disc pl-5 space-y-1 text-muted-foreground">{children}</ul>,
                ol: ({ children }) => <ol className="my-3 list-decimal pl-5 space-y-1 text-muted-foreground">{children}</ol>,
                li: ({ children }) => <li className="my-0.5">{children}</li>,
                code: ({ children }) => (
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-amber-300">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="my-4 overflow-auto rounded-lg bg-muted/80 p-4 text-xs font-mono border border-border/40 leading-normal select-text">
                    {children}
                  </pre>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary pl-4 my-4 text-muted-foreground italic bg-muted/20 py-1.5 pr-3 rounded-r">
                    {children}
                  </blockquote>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    {children}
                  </a>
                ),
                table: ({ children }) => (
                  <div className="my-4 overflow-x-auto border border-border/50 rounded-lg">
                    <table className="min-w-full text-xs text-left divide-y divide-border/60">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-muted/45">{children}</thead>,
                tbody: ({ children }) => <tbody className="divide-y divide-border/30">{children}</tbody>,
                tr: ({ children }) => <tr className="hover:bg-muted/10 transition-colors">{children}</tr>,
                th: ({ children }) => <th className="px-3 py-2 font-semibold text-muted-foreground font-mono">{children}</th>,
                td: ({ children }) => <td className="px-3 py-2 font-mono text-[11px]">{children}</td>,
              }}
            >
              {conteudo ?? ""}
            </ReactMarkdown>
          </article>
        </div>
      </div>
    );
  }

  // 4. TXT (.txt)
  if (extensao === "txt") {
    return (
      <div className="flex-1 overflow-y-auto p-6 max-h-[550px]">
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground select-text bg-muted/20 p-4 rounded-lg border border-border/40 max-w-4xl mx-auto">
          {conteudo}
        </pre>
      </div>
    );
  }

  // 5. JSON (.json)
  if (extensao === "json") {
    return (
      <div className="flex-1 p-6 h-full overflow-hidden">
        <JsonViewer conteudo={conteudo ?? "{}"} />
      </div>
    );
  }

  // 6. CSV (.csv)
  if (extensao === "csv") {
    return (
      <div className="flex-1 p-6 h-full overflow-hidden">
        <CsvViewer conteudo={conteudo ?? ""} nomeArquivo={node.nome} />
      </div>
    );
  }

  // 7. Word ou Excel (DOCX, XLSX)
  if (ehWord || ehExcel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-card/10">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          {ehExcel ? (
            <FileSpreadsheet className="h-10 w-10 text-emerald-400" />
          ) : (
            <FileText className="h-10 w-10 text-indigo-400" />
          )}
        </div>
        <h4 className="font-display font-medium text-sm text-foreground mb-1">
          {node.nome}
        </h4>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed mb-6">
          Os arquivos da Microsoft Office ({extensao.toUpperCase()}) são armazenados com segurança. Para visualizar ou editá-los, faça o download.
        </p>
        <div className="flex items-center gap-2">
          <Button onClick={onDownload} size="sm">
            <Download className="mr-1.5 h-3.5 w-3.5" /> Baixar Planilha
          </Button>
        </div>
      </div>
    );
  }

  // 8. Desconhecido ou outros formatos
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-card/10">
      <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
      <h4 className="font-display font-medium text-sm text-foreground mb-1">
        {node.nome}
      </h4>
      <p className="text-xs text-muted-foreground max-w-xs leading-relaxed mb-6">
        Formato de arquivo binário ou desconhecido ({extensao.toUpperCase() || "SEM EXTENSÃO"}). Faça o download do arquivo para utilizá-lo localmente.
      </p>
      <Button onClick={onDownload} size="sm">
        <Download className="mr-1.5 h-3.5 w-3.5" /> Baixar Arquivo
      </Button>
    </div>
  );
}
