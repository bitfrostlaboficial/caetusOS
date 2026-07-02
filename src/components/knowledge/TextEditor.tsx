import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  Save,
  X,
  RotateCcw,
  Heading,
  Bold,
  Italic,
  List,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  Table,
  Eye,
  EyeOff,
  AlertCircle,
  FileCheck2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TEMPLATES_SISTEMA } from "./templates";
import { toast } from "sonner";

interface TextEditorProps {
  node: {
    kind: "file";
    id: string;
    tipo: string;
    nome: string;
    status: string;
  };
  conteudoOriginal: string;
  onSave: (novoConteudo: string) => Promise<void>;
  onCancel: () => void;
}

export function TextEditor({
  node,
  conteudoOriginal,
  onSave,
  onCancel,
}: TextEditorProps) {
  const [conteudo, setConteudo] = useState(conteudoOriginal);
  const [modoPreview, setModoPreview] = useState<"edit" | "split" | "preview">("split");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setConteudo(conteudoOriginal);
  }, [conteudoOriginal]);

  const hasTemplate = node.nome in TEMPLATES_SISTEMA;
  const isDirty = conteudo !== conteudoOriginal;

  // Barra de ferramentas Markdown - insere sintaxe
  const inserirSintaxe = (tipo: string) => {
    const textarea = document.getElementById("caetus-text-editor") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let replacement = "";
    let cursorOffset = 0;

    switch (tipo) {
      case "h2":
        replacement = `\n## ${selectedText || "Título"}\n`;
        cursorOffset = 4;
        break;
      case "bold":
        replacement = `**${selectedText || "negrito"}**`;
        cursorOffset = 2;
        break;
      case "italic":
        replacement = `*${selectedText || "itálico"}*`;
        cursorOffset = 1;
        break;
      case "list":
        replacement = `\n- ${selectedText || "Item da lista"}\n`;
        cursorOffset = 3;
        break;
      case "link":
        replacement = `[${selectedText || "texto do link"}](https://exemplo.com)`;
        cursorOffset = 1;
        break;
      case "image":
        replacement = `![${selectedText || "legenda da imagem"}](https://exemplo.com/imagem.png)`;
        cursorOffset = 2;
        break;
      case "code":
        replacement = selectedText.includes("\n")
          ? `\n\`\`\`javascript\n${selectedText || "// seu código aqui"}\n\`\`\`\n`
          : `\`${selectedText || "código"}\``;
        cursorOffset = 1;
        break;
      case "table":
        replacement = `\n| Cabeçalho 1 | Cabeçalho 2 |\n| ----------- | ----------- |\n| Conteúdo 1  | Conteúdo 2  |\n`;
        cursorOffset = 2;
        break;
    }

    const novoConteudo = text.substring(0, start) + replacement + text.substring(end);
    setConteudo(novoConteudo);

    // Reposiciona o cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + replacement.length - cursorOffset);
    }, 50);
  };

  const restaurarTemplate = () => {
    if (!hasTemplate) return;
    if (confirm("Deseja restaurar este arquivo para o modelo padrão do caetusOS? Suas alterações atuais serão perdidas.")) {
      setConteudo(TEMPLATES_SISTEMA[node.nome].conteudo);
      toast.info("Modelo original restaurado no editor!");
    }
  };

  const handleSalvar = async () => {
    setIsSaving(true);
    try {
      await onSave(conteudo);
      toast.success("Documento salvo com sucesso!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar documento");
    } finally {
      setIsSaving(false);
    }
  };

  // Detecta se existem blocos de exemplo não modificados
  const contemExemplosFicticios = conteudo.includes("<!-- CAETUSOS_EXEMPLO_START -->") || conteudo.includes("[Insira aqui");

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Barra Superior do Editor */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-muted/20">
        <div className="flex flex-col">
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
            Pasta: sugeridos/conhecimento/{node.tipo}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <h2 className="font-display font-semibold text-sm text-foreground">
              {node.nome}
            </h2>
            {isDirty && (
              <span className="h-2 w-2 rounded-full bg-amber-500" title="Alterações não salvas" />
            )}
          </div>
        </div>

        {/* Controles de Visualização / Modo */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border bg-background p-0.5">
            <Button
              size="sm"
              variant={modoPreview === "edit" ? "secondary" : "ghost"}
              onClick={() => setModoPreview("edit")}
              className="h-7 px-2.5 font-mono text-[10px] uppercase"
            >
              Escrever
            </Button>
            <Button
              size="sm"
              variant={modoPreview === "split" ? "secondary" : "ghost"}
              onClick={() => setModoPreview("split")}
              className="h-7 px-2.5 font-mono text-[10px] uppercase"
            >
              Dividido
            </Button>
            <Button
              size="sm"
              variant={modoPreview === "preview" ? "secondary" : "ghost"}
              onClick={() => setModoPreview("preview")}
              className="h-7 px-2.5 font-mono text-[10px] uppercase"
            >
              Prévia
            </Button>
          </div>

          <div className="h-6 w-px bg-border/60" />

          {hasTemplate && (
            <Button
              size="sm"
              variant="outline"
              onClick={restaurarTemplate}
              className="h-8 font-mono text-[10px] uppercase border-dashed text-muted-foreground hover:text-foreground"
              title="Restaurar para o modelo oficial do sistema"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Restaurar Modelo
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            className="h-8 font-mono text-[10px] uppercase"
          >
            Cancelar
          </Button>

          <Button
            size="sm"
            onClick={handleSalvar}
            disabled={!isDirty || isSaving}
            className="h-8 font-mono text-[10px] uppercase font-bold"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Salvar
          </Button>
        </div>
      </div>

      {/* Caixa Informativa sobre Inteligência e Templates */}
      {contemExemplosFicticios && (
        <div className="mx-4 mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 flex items-start gap-2.5 select-none">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5 font-mono text-[10px] text-amber-500 leading-normal">
            <span className="font-semibold uppercase tracking-wider block">⚠️ Modo Template Inteligente Ativo</span>
            <p className="text-muted-foreground">
              Os textos fictícios marcados como exemplo e instruções do caetusOS servem como orientação e <span className="text-amber-500 font-semibold">não são considerados pela IA</span>. Lembre-se de preencher as seções de colchetes como <code className="bg-amber-500/10 px-1 py-0.5 rounded text-amber-400">[Insira aqui...]</code> para alimentar a IA com dados reais da sua marca!
            </p>
          </div>
        </div>
      )}

      {/* Barra de Ferramentas Markdown */}
      {modoPreview !== "preview" && (
        <div className="flex items-center gap-1 border-b border-border/40 px-4 py-1.5 bg-muted/10">
          <ToolbarButton onClick={() => inserirSintaxe("h2")} icon={<Heading className="h-3.5 w-3.5" />} tooltip="Título (H2)" />
          <ToolbarButton onClick={() => inserirSintaxe("bold")} icon={<Bold className="h-3.5 w-3.5" />} tooltip="Negrito" />
          <ToolbarButton onClick={() => inserirSintaxe("italic")} icon={<Italic className="h-3.5 w-3.5" />} tooltip="Itálico" />
          <div className="h-4 w-px bg-border/40 mx-1" />
          <ToolbarButton onClick={() => inserirSintaxe("list")} icon={<List className="h-3.5 w-3.5" />} tooltip="Lista" />
          <ToolbarButton onClick={() => inserirSintaxe("link")} icon={<LinkIcon className="h-3.5 w-3.5" />} tooltip="Link" />
          <ToolbarButton onClick={() => inserirSintaxe("image")} icon={<ImageIcon className="h-3.5 w-3.5" />} tooltip="Imagem" />
          <div className="h-4 w-px bg-border/40 mx-1" />
          <ToolbarButton onClick={() => inserirSintaxe("code")} icon={<Code className="h-3.5 w-3.5" />} tooltip="Código" />
          <ToolbarButton onClick={() => inserirSintaxe("table")} icon={<Table className="h-3.5 w-3.5" />} tooltip="Tabela" />
        </div>
      )}

      {/* Área de Edição e Preview */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-background/50">
        {/* Lado Esquerdo: Editor */}
        {modoPreview !== "preview" && (
          <div className="flex-1 h-full overflow-hidden flex flex-col p-4 border-r border-border/30">
            <textarea
              id="caetus-text-editor"
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              className="flex-1 w-full bg-transparent font-mono text-xs leading-relaxed text-foreground placeholder-muted-foreground resize-none border-0 focus:outline-none focus:ring-0 select-text outline-none p-2 rounded-lg bg-muted/5 border border-border/10 focus:border-border/30"
              placeholder="# Comece a escrever seu documento..."
              spellCheck="false"
            />
          </div>
        )}

        {/* Lado Direito: Preview */}
        {modoPreview !== "edit" && (
          <div className="flex-1 h-full overflow-y-auto p-8 bg-card/10 select-text max-h-[500px]">
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
                {/* Remove o header de template do preview final para ficar limpo */}
                {conteudo.replace(/<!-- CAETUSOS_TEMPLATE_HEADER_START -->[\s\S]*?<!-- CAETUSOS_TEMPLATE_HEADER_END -->/, "")}
              </ReactMarkdown>
            </article>
          </div>
        )}
      </div>

      {/* Rodapé de Informação Estruturada para Evolução */}
      <div className="border-t border-border/40 bg-muted/10 px-4 py-2 flex items-center justify-between font-mono text-[9px] text-muted-foreground select-none">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-primary" />
          <span>Fase 3: Auto-verificação de coerência via IA integrada habilitada para este documento</span>
        </div>
        <span>caetusOS Editor v1.2</span>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  icon,
  tooltip,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  tooltip: string;
}) {
  return (
    <button
      onClick={onClick}
      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      title={tooltip}
    >
      {icon}
    </button>
  );
}
