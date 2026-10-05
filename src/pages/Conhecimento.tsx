import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Upload,
  Search,
  Check,
  AlertTriangle,
  X,
  ArrowUp,
  Trash2,
  Download,
  Info,
  FileIcon,
  FileText as FileTextIcon,
  Image as ImageIcon,
  FileSpreadsheet as ExcelIcon,
  Code as FileCodeIcon,
  Lock,
  Edit,
  Sparkles,
} from "lucide-react";

import { api, type DocumentoConhecimento } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { FilePreviewer } from "@/components/knowledge/FilePreviewer";
import { InfoSidebar } from "@/components/knowledge/InfoSidebar";
import { TextEditor } from "@/components/knowledge/TextEditor";
import { FolderReadme } from "@/components/knowledge/FolderReadme";
import { WelcomeGuide } from "@/components/knowledge/WelcomeGuide";
import { TEMPLATES_SISTEMA } from "@/components/knowledge/templates";
import { INFORMACOES_PASTAS } from "@/components/knowledge/folderInfo";
import { toast } from "sonner";

/**
 * Catálogo de pastas + arquivos sugeridos. Pastas sempre aparecem na árvore,
 * arquivos pendentes (não existentes) aparecem em cinza com status ❌.
 */
const CATALOGO: { tipo: string; rotulo: string; sugeridos: string[] }[] = [
  {
    tipo: "institucional",
    rotulo: "Institucional",
    sugeridos: ["sobre_empresa.md", "missao.md", "visao.md", "cultura.md", "diferenciais.md"],
  },
  {
    tipo: "produto",
    rotulo: "Produtos",
    sugeridos: ["produto_a.md", "produto_b.md"],
  },
  {
    tipo: "servico",
    rotulo: "Serviços",
    sugeridos: ["consultoria.md"],
  },
  {
    tipo: "marketing",
    rotulo: "Marketing",
    sugeridos: ["tom_de_voz.md", "personas.md", "posicionamento.md"],
  },
  {
    tipo: "comercial",
    rotulo: "Comercial",
    sugeridos: ["objecoes.md", "perguntas_frequentes.md"],
  },
  {
    tipo: "cliente",
    rotulo: "Clientes",
    sugeridos: ["icp.md"],
  },
  {
    tipo: "processo",
    rotulo: "Processos",
    sugeridos: [],
  },
  {
    tipo: "rh",
    rotulo: "RH",
    sugeridos: ["onboarding.md", "cargos.md"],
  },
  {
    tipo: "financeiro",
    rotulo: "Financeiro",
    sugeridos: [],
  },
  {
    tipo: "juridico",
    rotulo: "Jurídico",
    sugeridos: [],
  },
  {
    tipo: "geral",
    rotulo: "Geral",
    sugeridos: [],
  },
];

type Status = "ok" | "recente" | "atualizar" | "pendente";

type Node = {
  kind: "file" | "folder";
  id: string; // id real, "sug:<tipo>:<nome>" ou "folder:<tipo>"
  tipo: string;
  nome: string;
  status?: Status;
  doc?: DocumentoConhecimento;
};

type Pasta = {
  tipo: string;
  rotulo: string;
  arquivos: Node[];
};

function fmtTamanho(bytes?: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDataSimplificada(iso?: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const hoje = new Date();
    const ontem = new Date();
    ontem.setDate(hoje.getDate() - 1);

    if (d.toDateString() === hoje.toDateString()) {
      return "hoje";
    }
    if (d.toDateString() === ontem.toDateString()) {
      return "ontem";
    }
    return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function statusDe(doc: DocumentoConhecimento): Status {
  if (!doc.data_upload) return "ok";
  const idade = Date.now() - new Date(doc.atualizado_em || doc.data_upload).getTime();
  const dia = 24 * 60 * 60 * 1000;
  if (idade < 2 * dia) return "recente";
  if (idade > 60 * dia) return "atualizar";
  return "ok";
}

function IconeStatus({ status }: { status?: Status }) {
  if (!status) return null;
  switch (status) {
    case "ok":
      return <Check className="h-3 w-3 text-emerald-500 shrink-0" />;
    case "recente":
      return <ArrowUp className="h-3 w-3 text-sky-400 shrink-0" />;
    case "atualizar":
      return <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />;
    case "pendente":
      return <X className="h-3 w-3 text-muted-foreground/40 shrink-0" />;
  }
}

function obterInfoExtensao(nome: string) {
  if (nome.endsWith(".exemplo")) {
    return {
      ext: "exemplo",
      categoria: "Template do Sistema",
      icone: FileCodeIcon,
      cor: "text-blue-400 bg-blue-500/10",
    };
  }
  const ext = nome.split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "svg":
      return {
        ext,
        categoria: "Imagem",
        icone: ImageIcon,
        cor: "text-rose-400 bg-rose-500/10",
      };
    case "pdf":
      return {
        ext,
        categoria: "PDF",
        icone: FileTextIcon,
        cor: "text-red-400 bg-red-500/10",
      };
    case "md":
      return {
        ext,
        categoria: "Markdown",
        icone: FileCodeIcon,
        cor: "text-emerald-400 bg-emerald-500/10",
      };
    case "txt":
      return {
        ext,
        categoria: "Texto",
        icone: FileTextIcon,
        cor: "text-sky-400 bg-sky-500/10",
      };
    case "json":
      return {
        ext,
        categoria: "JSON",
        icone: FileCodeIcon,
        cor: "text-amber-400 bg-amber-500/10",
      };
    case "csv":
      return {
        ext,
        categoria: "CSV Tabela",
        icone: ExcelIcon,
        cor: "text-teal-400 bg-teal-500/10",
      };
    case "xlsx":
    case "xls":
      return {
        ext,
        categoria: "Planilha",
        icone: ExcelIcon,
        cor: "text-green-400 bg-green-500/10",
      };
    case "docx":
    case "doc":
      return {
        ext,
        categoria: "Documento",
        icone: FileTextIcon,
        cor: "text-indigo-400 bg-indigo-500/10",
      };
    default:
      return {
        ext,
        categoria: ext ? ext.toUpperCase() : "Outro",
        icone: FileIcon,
        cor: "text-muted-foreground bg-muted-foreground/10",
      };
  }
}

export default function Conhecimento() {
  const [docs, setDocs] = useState<DocumentoConhecimento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [abertas, setAbertas] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CATALOGO.map((c) => [c.tipo, true])),
  );
  const [selecionado, setSelecionado] = useState<Node | null>(null);
  const [editando, setEditando] = useState(false);
  const [conteudo, setConteudo] = useState<string | null>(null);
  const [carregandoConteudo, setCarregandoConteudo] = useState(false);
  const [uploadTipo, setUploadTipo] = useState<string | null>(null);
  const [uploadNomeSugerido, setUploadNomeSugerido] = useState<string | null>(null);
  const [dragSobre, setDragSobre] = useState<string | null>(null);
  const [painelInfoAberto, setPainelInfoAberto] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  async function recarregar() {
    setCarregando(true);
    try {
      setDocs(await api.listarConhecimento());
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    recarregar();
  }, []);

  // Constrói árvore: pasta -> arquivos reais + sugeridos pendentes
  const pastas: Pasta[] = useMemo(() => {
    const porTipo = new Map<string, DocumentoConhecimento[]>();
    for (const d of docs) {
      const arr = porTipo.get(d.tipo) ?? [];
      arr.push(d);
      porTipo.set(d.tipo, arr);
    }
    const tipos = new Set<string>(CATALOGO.map((c) => c.tipo));
    for (const t of porTipo.keys()) tipos.add(t);

    return Array.from(tipos)
      .map<Pasta>((tipo) => {
        const cat = CATALOGO.find((c) => c.tipo === tipo);
        const reais = porTipo.get(tipo) ?? [];
        const nomesReais = new Set(reais.map((d) => d.nome ?? d.caminho.split("/").pop()!));
        const arquivos: Node[] = [];
        for (const d of reais) {
          arquivos.push({
            kind: "file",
            id: d.id,
            tipo,
            nome: d.nome ?? d.caminho.split("/").pop()!,
            status: statusDe(d),
            doc: d,
          });
        }
        for (const sug of cat?.sugeridos ?? []) {
          if (!nomesReais.has(sug)) {
            arquivos.push({
              kind: "file",
              id: `sug:${tipo}:${sug}`,
              tipo,
              nome: sug,
              status: "pendente",
            });
          }
        }
        arquivos.sort((a, b) => {
          if (a.status === "pendente" && b.status !== "pendente") return 1;
          if (b.status === "pendente" && a.status !== "pendente") return -1;
          return a.nome.localeCompare(b.nome);
        });
        return { tipo, rotulo: cat?.rotulo ?? tipo, arquivos };
      })
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo));
  }, [docs]);

  const pastasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return pastas;
    return pastas
      .map((p) => ({
        ...p,
        arquivos: p.arquivos.filter(
          (a) => a.nome.toLowerCase().includes(q) || p.rotulo.toLowerCase().includes(q),
        ),
      }))
      .filter((p) => p.arquivos.length > 0);
  }, [pastas, busca]);

  const metricas = useMemo(() => {
    const arquivos = docs.length;
    const pastasCount = new Set(docs.map((d) => d.tipo)).size;
    const pendentes = pastas.reduce(
      (acc, p) => acc + p.arquivos.filter((a) => a.status === "pendente").length,
      0,
    );
    const hoje = new Date().toDateString();
    const atualizadosHoje = docs.filter(
      (d) => d.atualizado_em && new Date(d.atualizado_em).toDateString() === hoje,
    ).length;
    return { arquivos, pastas: pastasCount, pendentes, atualizadosHoje };
  }, [docs, pastas]);

  async function selecionar(node: Node) {
    setEditando(false);
    setSelecionado(node);
    setConteudo(null);
    if (node.kind === "folder" || !node.doc) return;

    const ext = node.nome.split(".").pop()?.toLowerCase() || "";
    // Se for binário (imagem ou PDF), não tenta ler conteúdo textual
    if (["png", "jpg", "jpeg", "gif", "webp", "svg", "pdf", "docx", "xlsx", "xls", "doc"].includes(ext)) {
      return;
    }

    setCarregandoConteudo(true);
    try {
      const r = await api.lerConhecimento(node.doc.id);
      setConteudo(r.conteudo);
    } catch (e) {
      setConteudo(`Erro ao ler arquivo: ${e instanceof Error ? e.message : "desconhecido"}`);
    } finally {
      setCarregandoConteudo(false);
    }
  }

  function selecionarPasta(tipo: string) {
    setEditando(false);
    const info = INFORMACOES_PASTAS[tipo];
    setSelecionado({
      kind: "folder",
      id: `folder:${tipo}`,
      tipo,
      nome: info?.rotulo ?? tipo,
    });
    setConteudo(null);
  }

  function abrirUpload(tipo: string, nomeSugerido?: string) {
    setUploadTipo(tipo);
    setUploadNomeSugerido(nomeSugerido ?? null);
    inputRef.current?.click();
  }

  async function onArquivoEscolhido(arquivo: File, tipo: string) {
    setErro(null);
    try {
      const novo = await api.uploadConhecimento(tipo, arquivo);
      await recarregar();
      
      const nodeObj: Node = {
        kind: "file",
        id: novo.id,
        tipo: novo.tipo,
        nome: novo.nome ?? arquivo.name,
        status: "recente",
        doc: novo,
      };

      setSelecionado(nodeObj);
      selecionar(nodeObj);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no upload");
    }
  }

  async function excluir(node: Node) {
    if (node.kind === "folder") {
      alert("Esta pasta faz parte da estrutura do caetusOS e não pode ser removida.");
      return;
    }
    if (!node.doc) return;
    if (!confirm(`Excluir ${node.nome}?`)) return;
    try {
      await api.removerConhecimento(node.doc.id);
      if (selecionado?.id === node.id) {
        setSelecionado(null);
        setConteudo(null);
      }
      await recarregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao excluir");
    }
  }

  async function baixar(node: Node) {
    if (node.kind === "folder" || !node.doc) return;
    try {
      const ext = node.nome.split(".").pop()?.toLowerCase() || "";
      let blob: Blob;

      if (["png", "jpg", "jpeg", "gif", "webp", "svg", "pdf", "docx", "xlsx", "xls", "doc"].includes(ext)) {
        blob = await api.obterConhecimentoRaw(node.doc.id);
      } else {
        const txt = conteudo || (await api.lerConhecimento(node.doc.id)).conteudo;
        blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = node.nome;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao baixar arquivo");
    }
  }

  // Acionado para criar um arquivo pendente a partir do modelo sugerido
  function iniciarCriacaoDeTemplate(nomeArquivo: string, tipoPasta: string) {
    const template = TEMPLATES_SISTEMA[nomeArquivo];
    const conteudoInicial = template ? template.conteudo : `# ${nomeArquivo}\n\nPreencha com os dados da empresa.`;
    
    setSelecionado({
      kind: "file",
      id: `sug:${tipoPasta}:${nomeArquivo}`,
      tipo: tipoPasta,
      nome: nomeArquivo,
      status: "pendente",
    });
    setConteudo(conteudoInicial);
    setEditando(true);
  }

  // Callback para salvar a edição do arquivo de texto
  async function salvarEdicao(novoConteudo: string) {
    if (!selecionado) return;
    setErro(null);
    try {
      // Pré-processamento técnico inteligente: removemos seções de template vazias que a IA não deve indexar
      const conteudoFinal = novoConteudo
        .replace(/<!-- CAETUSOS_TEMPLATE_HEADER_START -->[\s\S]*?<!-- CAETUSOS_TEMPLATE_HEADER_END -->/g, "")
        .replace(/<!-- CAETUSOS_EXEMPLO_START -->[\s\S]*?<!-- CAETUSOS_EXEMPLO_END -->/g, "")
        .trim();

      const blob = new Blob([conteudoFinal], { type: "text/markdown;charset=utf-8" });
      const arquivo = new File([blob], selecionado.nome, { type: "text/markdown" });
      
      const novoDoc = await api.uploadConhecimento(selecionado.tipo, arquivo);
      await recarregar();

      const nodeAtualizado: Node = {
        kind: "file",
        id: novoDoc.id,
        tipo: novoDoc.tipo,
        nome: novoDoc.nome ?? selecionado.nome,
        status: "recente",
        doc: novoDoc,
      };

      setSelecionado(nodeAtualizado);
      setConteudo(conteudoFinal);
      setEditando(false);
    } catch (e) {
      throw e;
    }
  }

  function onDrop(e: React.DragEvent, tipo: string) {
    e.preventDefault();
    setDragSobre(null);
    const f = e.dataTransfer.files?.[0];
    if (f) onArquivoEscolhido(f, tipo);
  }

  // Verifica se o arquivo é compatível com edição integrada (.md ou .txt)
  const isEditavel = useMemo(() => {
    if (!selecionado || selecionado.kind !== "file") return false;
    if (selecionado.nome.endsWith(".exemplo") || selecionado.doc?.is_template) return false;
    const ext = selecionado.nome.split(".").pop()?.toLowerCase() || "";
    return ["md", "txt"].includes(ext);
  }, [selecionado]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Conhecimento</h1>
          <p className="text-sm text-muted-foreground">
            Explorador de arquivos e base de conhecimento unificada do caetusOS.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-wider">
          <Metric rotulo="Arquivos" valor={metricas.arquivos} />
          <Metric rotulo="Pastas" valor={metricas.pastas} />
          <Metric rotulo="Pendentes" valor={metricas.pendentes} tom="warn" />
          <Metric rotulo="Hoje" valor={metricas.atualizadosHoje} tom="ok" />
        </div>
      </div>

      {/* Onboarding Guide */}
      <WelcomeGuide />

      {erro && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {erro}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 rounded-md border border-border/60 bg-card/60 p-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar por nome de arquivo ou pasta..."
            className="h-8 pl-7 font-mono text-xs"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => abrirUpload(selecionado?.tipo ?? "geral")}
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Novo arquivo
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && uploadTipo) {
            const final = uploadNomeSugerido
              ? new File([f], uploadNomeSugerido, { type: f.type })
              : f;
            onArquivoEscolhido(final, uploadTipo);
          }
          if (inputRef.current) inputRef.current.value = "";
          setUploadTipo(null);
          setUploadNomeSugerido(null);
        }}
      />

      {/* Workspace */}
      <div className="grid h-[calc(100vh-250px)] min-h-[500px] gap-0 overflow-hidden rounded-lg border border-border/60 bg-card/40 md:grid-cols-[300px_1fr] xl:grid-cols-[300px_1fr_300px]">
        
        {/* Column 1: Explorer */}
        <div className="flex flex-col h-full overflow-hidden border-b border-border/60 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <span>Explorer / Pastas</span>
            <span className="font-semibold">{docs.length} arquivos</span>
          </div>
          <ScrollArea className="flex-1 h-0">
            <div className="p-1.5 space-y-1">
              {carregando ? (
                <div className="px-3 py-4 text-muted-foreground font-mono text-xs animate-pulse">Carregando árvore de diretórios…</div>
              ) : (
                pastasFiltradas.map((p) => (
                  <PastaItem
                    key={p.tipo}
                    pasta={p}
                    aberta={!!abertas[p.tipo]}
                    onToggle={() => setAbertas((s) => ({ ...s, [p.tipo]: !s[p.tipo] }))}
                    selecionadoId={selecionado?.id ?? null}
                    onSelect={selecionar}
                    onSelectFolder={selecionarPasta}
                    onUpload={(nome) => abrirUpload(p.tipo, nome)}
                    onExcluir={excluir}
                    onDrop={onDrop}
                    dragSobre={dragSobre === p.tipo}
                    setDragSobre={setDragSobre}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Column 2: Viewer / Editor */}
        <div className="flex min-w-0 flex-col h-full overflow-hidden">
          {selecionado ? (
            editando ? (
              (() => {
                const docExemplo = docs.find(
                  (d) => d.tipo === selecionado.tipo && d.nome === `${selecionado.nome}.exemplo`
                );
                return (
                  <TextEditor
                    node={selecionado as any}
                    conteudoOriginal={conteudo ?? ""}
                    idExemplo={docExemplo?.id}
                    onSave={salvarEdicao}
                    onCancel={() => setEditando(false)}
                  />
                );
              })()
            ) : selecionado.kind === "folder" ? (
              <FolderReadme
                tipo={selecionado.tipo}
                arquivos={pastas.find((p) => p.tipo === selecionado.tipo)?.arquivos ?? []}
                onCriarDeTemplate={(nome) => iniciarCriacaoDeTemplate(nome, selecionado.tipo)}
                onEnviarArquivo={(nomeSugerido) => abrirUpload(selecionado.tipo, nomeSugerido)}
              />
            ) : (
              <div className="flex flex-col h-full overflow-hidden">
                {/* Toolbar do Viewer */}
                <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5 bg-muted/5">
                  <Breadcrumb>
                    <BreadcrumbList className="font-mono text-[11px] flex-wrap">
                      <BreadcrumbItem className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors" onClick={() => setSelecionado(null)}>
                        Conhecimento
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors" onClick={() => selecionarPasta(selecionado.tipo)}>
                        {CATALOGO.find((c) => c.tipo === selecionado.tipo)?.rotulo ?? selecionado.tipo}
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage className="font-semibold text-foreground truncate max-w-[150px] sm:max-w-xs">{selecionado.nome}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                  
                  <div className="flex items-center gap-1.5">
                    {selecionado.doc && (
                      <>
                        {isEditavel && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditando(true)}
                            title="Editar este arquivo de texto"
                            className="h-8 px-2.5 font-mono text-[10px] uppercase text-primary hover:text-primary hover:bg-primary/5 border border-primary/20 hover:border-primary/40 bg-primary/5"
                          >
                            <Edit className="h-3.5 w-3.5 mr-1" />
                            Editar
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => baixar(selecionado)} title="Baixar arquivo original" className="h-8 w-8 p-0">
                          <Download className="h-4 w-4" />
                        </Button>
                        {!selecionado.nome.endsWith(".exemplo") && !selecionado.doc?.is_template && (
                          <Button size="sm" variant="ghost" onClick={() => excluir(selecionado)} title="Remover da base de conhecimento" className="h-8 w-8 p-0 text-destructive/80 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPainelInfoAberto(!painelInfoAberto)}
                      className={cn("h-8 w-8 p-0", painelInfoAberto && "bg-muted text-primary")}
                      title="Inspecionar metadados e ações IA"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Corpo do Viewer */}
                <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-background/25">
                  {selecionado.doc ? (
                    <FilePreviewer
                      node={selecionado}
                      conteudo={conteudo}
                      carregando={carregandoConteudo}
                      onDownload={() => baixar(selecionado)}
                    />
                  ) : (
                    <ViewerPendente
                      node={selecionado}
                      onEnviar={() => abrirUpload(selecionado.tipo, selecionado.nome)}
                      onCriarTemplate={() => iniciarCriacaoDeTemplate(selecionado.nome, selecionado.tipo)}
                    />
                  )}
                </div>
              </div>
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground bg-muted/5">
              <div className="max-w-md space-y-4">
                <FolderOpen className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-display font-medium text-foreground">Explorador de Conhecimento</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                    Selecione uma pasta na barra esquerda para ler sua finalidade e ver arquivos recomendados, ou clique em um arquivo para visualizar, baixar, editar ou inspecionar metadados.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Column 3: Info Sidebar (Right) */}
        {painelInfoAberto && (
          <div className="hidden xl:block h-full overflow-hidden border-l border-border/60 bg-muted/5">
            <InfoSidebar node={selecionado} />
          </div>
        )}
      </div>

      {/* Legenda de Status */}
      <div className="flex flex-wrap items-center gap-4 px-1 font-mono text-[11px] text-muted-foreground">
        <Legenda icone={<IconeStatus status="ok" />} label="Sincronizado" />
        <Legenda icone={<IconeStatus status="recente" />} label="Recentemente Modificado" />
        <Legenda icone={<IconeStatus status="atualizar" />} label="Recomenda-se Atualizar" />
        <Legenda icone={<IconeStatus status="pendente" />} label="Sugerido / Pendente" />
      </div>
    </div>
  );
}

function Metric({
  rotulo,
  valor,
  tom,
}: {
  rotulo: string;
  valor: number;
  tom?: "ok" | "warn";
}) {
  return (
    <div className="flex items-center gap-2 rounded border border-border/60 bg-card/60 px-2.5 py-1">
      <span className="text-muted-foreground">{rotulo}</span>
      <span
        className={cn(
          "text-foreground font-semibold",
          tom === "warn" && valor > 0 && "text-amber-400",
          tom === "ok" && valor > 0 && "text-emerald-400",
        )}
      >
        {valor}
      </span>
    </div>
  );
}

function Legenda({ icone, label }: { icone: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {icone}
      <span>{label}</span>
    </div>
  );
}

function PastaItem({
  pasta,
  aberta,
  onToggle,
  selecionadoId,
  onSelect,
  onSelectFolder,
  onUpload,
  onExcluir,
  onDrop,
  dragSobre,
  setDragSobre,
}: {
  pasta: Pasta;
  aberta: boolean;
  onToggle: () => void;
  selecionadoId: string | null;
  onSelect: (n: Node) => void;
  onSelectFolder: (tipo: string) => void;
  onUpload: (nomeSugerido?: string) => void;
  onExcluir: (n: Node) => void;
  onDrop: (e: React.DragEvent, tipo: string) => void;
  dragSobre: boolean;
  setDragSobre: (t: string | null) => void;
}) {
  const isSelected = selecionadoId === `folder:${pasta.tipo}`;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragSobre(pasta.tipo);
      }}
      onDragLeave={() => setDragSobre(null)}
      onDrop={(e) => onDrop(e, pasta.tipo)}
      className={cn(
        "rounded-lg overflow-hidden border border-transparent transition-all",
        dragSobre && "bg-primary/5 border-primary/30",
      )}
    >
      <div className="flex items-center justify-between group">
        <button
          onClick={() => {
            onToggle();
            onSelectFolder(pasta.tipo);
          }}
          className={cn(
            "flex-1 flex items-center gap-2 rounded px-2 py-1.5 text-left font-mono text-xs hover:bg-muted/40 transition-colors",
            isSelected && "bg-primary/10 text-primary border border-primary/20",
            !isSelected && aberta && "bg-muted/15 font-semibold text-foreground",
          )}
        >
          {aberta ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
          )}
          {aberta ? (
            <FolderOpen className="h-4 w-4 text-sky-400 shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-sky-400 shrink-0" />
          )}
          <span className="ml-0.5 truncate flex-1">{pasta.rotulo}</span>
          
          <Lock className="h-3 w-3 text-muted-foreground/40 mr-1.5 opacity-0 group-hover:opacity-100 transition-opacity" title="Pasta do sistema protegida" />

          <Badge
            variant="outline"
            className="h-4 rounded px-1.5 font-mono text-[9px] text-muted-foreground bg-muted/30 border-border/40 shrink-0"
          >
            {pasta.arquivos.filter((a) => a.status !== "pendente").length}
          </Badge>
        </button>
      </div>
      
      {aberta && (
        <div className="ml-4 border-l border-border/40 pl-1.5 pr-0.5 py-1 space-y-1">
          {pasta.arquivos.map((a) => {
            const isTemplate = a.nome.endsWith(".exemplo") || a.doc?.is_template;
            const info = obterInfoExtensao(a.nome);
            const IconeExt = info.icone;
            const isFileSelected = selecionadoId === a.id;
            
            return (
              <ContextMenu key={a.id}>
                <ContextMenuTrigger asChild>
                  <button
                    onClick={() => onSelect(a)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/40 transition-all border border-transparent select-none",
                      isFileSelected 
                        ? "bg-muted/80 border-border/40 text-foreground font-semibold" 
                        : "text-muted-foreground hover:text-foreground",
                      a.status === "pendente" && "opacity-60",
                    )}
                  >
                    <div className={cn("p-1 rounded mt-0.5 shrink-0", isTemplate ? "text-blue-400 bg-blue-500/10" : info.cor)}>
                      <IconeExt className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className={cn(
                          "truncate text-[11px] font-mono leading-tight flex items-center gap-1",
                          isFileSelected ? "font-semibold text-foreground" : "text-foreground/85"
                        )} title={a.nome}>
                          {isTemplate && <span className="text-blue-400 shrink-0">📘</span>}
                          <span className="truncate">{a.nome}</span>
                        </span>
                        <IconeStatus status={a.status} />
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-mono leading-none">
                        {isTemplate ? (
                          <span className="text-blue-400 font-semibold bg-blue-500/5 px-1 py-0.5 rounded text-[8px] tracking-tight shrink-0">Template do Sistema</span>
                        ) : (
                          <span>{info.categoria}</span>
                        )}
                        {a.doc && (
                          <>
                            <span>•</span>
                            <span>{fmtTamanho(a.doc.tamanho)}</span>
                            {a.doc.atualizado_em && (
                              <>
                                <span>•</span>
                                <span className="truncate">{fmtDataSimplificada(a.doc.atualizado_em)}</span>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                </ContextMenuTrigger>
                
                <ContextMenuContent className="font-mono text-xs">
                  <ContextMenuItem onClick={() => onSelect(a)}>Abrir</ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => onUpload(a.status === "pendente" ? a.nome : undefined)}
                    disabled={isTemplate}
                    className={cn(isTemplate && "opacity-40")}
                  >
                    {a.status === "pendente" ? "Enviar" : "Atualizar"}
                  </ContextMenuItem>
                  <ContextMenuItem disabled className="opacity-40">Renomear (🔒 Sistema)</ContextMenuItem>
                  <ContextMenuItem disabled className="opacity-40">Mover (🔒 Sistema)</ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => onExcluir(a)}
                    disabled={a.status === "pendente" || isTemplate}
                    className={cn("text-destructive font-semibold", (a.status === "pendente" || isTemplate) && "opacity-40")}
                  >
                    Excluir
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
          
          <button
            onClick={() => onUpload()}
            className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-muted-foreground/70 hover:bg-muted/30 hover:text-foreground transition-colors"
          >
            <Upload className="h-3 w-3 text-muted-foreground/55" />
            <span className="font-mono text-[10px]">enviar arquivo…</span>
          </button>
        </div>
      )}
    </div>
  );
}

function ViewerPendente({
  node,
  onEnviar,
  onCriarTemplate,
}: {
  node: Node;
  onEnviar: () => void;
  onCriarTemplate: () => void;
}) {
  const hasTemplate = node.nome in TEMPLATES_SISTEMA;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center bg-card/5 select-none">
      <X className="h-10 w-10 text-muted-foreground/35 border border-dashed border-muted-foreground/45 rounded-full p-2" />
      <div className="space-y-1">
        <p className="font-mono text-sm text-foreground font-semibold">{node.nome}</p>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed mx-auto">
          Este arquivo é sugerido pelo caetusOS para a base de conhecimento institucional, mas ainda não foi preenchido na sua empresa.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        {hasTemplate && (
          <Button size="sm" onClick={onCriarTemplate} className="h-8 font-mono text-[10px] uppercase font-bold bg-primary text-primary-foreground hover:bg-primary/90">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Escrever do Zero (Modelo)
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={onEnviar} className="h-8 font-mono text-[10px] uppercase">
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Enviar arquivo pronto (.md, .txt)
        </Button>
      </div>
    </div>
  );
}
