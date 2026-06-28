import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  ChevronDown,
  ChevronRight,
  FileText,
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

type Node =
  | {
      kind: "file";
      id: string; // id real ou "sug:<tipo>:<nome>"
      tipo: string;
      nome: string;
      status: Status;
      doc?: DocumentoConhecimento;
    }
  | never;

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

function fmtData(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
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

function IconeStatus({ status }: { status: Status }) {
  switch (status) {
    case "ok":
      return <Check className="h-3.5 w-3.5 text-emerald-500" />;
    case "recente":
      return <ArrowUp className="h-3.5 w-3.5 text-sky-400" />;
    case "atualizar":
      return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
    case "pendente":
      return <X className="h-3.5 w-3.5 text-muted-foreground/60" />;
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
  const [conteudo, setConteudo] = useState<string | null>(null);
  const [carregandoConteudo, setCarregandoConteudo] = useState(false);
  const [uploadTipo, setUploadTipo] = useState<string | null>(null);
  const [uploadNomeSugerido, setUploadNomeSugerido] = useState<string | null>(null);
  const [dragSobre, setDragSobre] = useState<string | null>(null);
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
    // garante pastas do catálogo + extras encontrados
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
    setSelecionado(node);
    setConteudo(null);
    if (!node.doc) return;
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
      // seleciona o recém criado
      setSelecionado({
        kind: "file",
        id: novo.id,
        tipo: novo.tipo,
        nome: novo.nome ?? arquivo.name,
        status: "recente",
        doc: novo,
      });
      selecionar({
        kind: "file",
        id: novo.id,
        tipo: novo.tipo,
        nome: novo.nome ?? arquivo.name,
        status: "recente",
        doc: novo,
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no upload");
    }
  }

  async function excluir(node: Node) {
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

  function baixar(node: Node) {
    if (!conteudo || selecionado?.id !== node.id) return;
    const blob = new Blob([conteudo], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = node.nome;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onDrop(e: React.DragEvent, tipo: string) {
    e.preventDefault();
    setDragSobre(null);
    const f = e.dataTransfer.files?.[0];
    if (f) onArquivoEscolhido(f, tipo);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Conhecimento</h1>
          <p className="text-sm text-muted-foreground">
            Explorador do disco de conhecimento da empresa.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-wider">
          <Metric rotulo="Arquivos" valor={metricas.arquivos} />
          <Metric rotulo="Pastas" valor={metricas.pastas} />
          <Metric rotulo="Pendentes" valor={metricas.pendentes} tom="warn" />
          <Metric rotulo="Hoje" valor={metricas.atualizadosHoje} tom="ok" />
        </div>
      </div>

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
            placeholder="Pesquisar arquivos..."
            className="h-8 pl-7 font-mono text-xs"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => abrirUpload(selecionado?.tipo ?? "geral")}
        >
          <Upload className="h-3.5 w-3.5" />
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
            // se houver nome sugerido, renomeia o File preservando o conteúdo
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
      <div className="grid h-[calc(100vh-260px)] min-h-[480px] gap-0 overflow-hidden rounded-lg border border-border/60 bg-card/40 md:grid-cols-[320px_1fr]">
        {/* Explorer */}
        <div className="flex flex-col border-b border-border/60 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between border-b border-border/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <span>Explorer</span>
            <span>{docs.length} arquivos</span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-1 font-mono text-xs">
              {carregando ? (
                <div className="px-3 py-4 text-muted-foreground">Carregando…</div>
              ) : (
                pastasFiltradas.map((p) => (
                  <PastaItem
                    key={p.tipo}
                    pasta={p}
                    aberta={!!abertas[p.tipo]}
                    onToggle={() => setAbertas((s) => ({ ...s, [p.tipo]: !s[p.tipo] }))}
                    selecionadoId={selecionado?.id ?? null}
                    onSelect={selecionar}
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

        {/* Viewer */}
        <div className="flex min-w-0 flex-col">
          {selecionado ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5">
                <Breadcrumb>
                  <BreadcrumbList className="font-mono text-[11px]">
                    <BreadcrumbItem>Empresa</BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>Conhecimento</BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {CATALOGO.find((c) => c.tipo === selecionado.tipo)?.rotulo ??
                        selecionado.tipo}
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{selecionado.nome}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <div className="flex items-center gap-1">
                  {selecionado.doc && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => baixar(selecionado)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => excluir(selecionado)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {selecionado.doc ? (
                <ViewerDocumento
                  node={selecionado}
                  conteudo={conteudo}
                  carregando={carregandoConteudo}
                />
              ) : (
                <ViewerPendente
                  node={selecionado}
                  onEnviar={() => abrirUpload(selecionado.tipo, selecionado.nome)}
                />
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
              Selecione um arquivo no Explorer para visualizar.
            </div>
          )}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 px-1 font-mono text-[11px] text-muted-foreground">
        <Legenda icone={<IconeStatus status="ok" />} label="enviado" />
        <Legenda icone={<IconeStatus status="recente" />} label="recente" />
        <Legenda icone={<IconeStatus status="atualizar" />} label="atualizar" />
        <Legenda icone={<IconeStatus status="pendente" />} label="pendente" />
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
          "text-foreground",
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
  onUpload: (nomeSugerido?: string) => void;
  onExcluir: (n: Node) => void;
  onDrop: (e: React.DragEvent, tipo: string) => void;
  dragSobre: boolean;
  setDragSobre: (t: string | null) => void;
}) {
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragSobre(pasta.tipo);
      }}
      onDragLeave={() => setDragSobre(null)}
      onDrop={(e) => onDrop(e, pasta.tipo)}
      className={cn(
        "rounded",
        dragSobre && "bg-primary/10 outline outline-1 outline-primary/40",
      )}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-1 rounded px-2 py-1 text-left hover:bg-muted/50"
      >
        {aberta ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        )}
        {aberta ? (
          <FolderOpen className="h-3.5 w-3.5 text-sky-400" />
        ) : (
          <Folder className="h-3.5 w-3.5 text-sky-400" />
        )}
        <span className="ml-1 truncate">{pasta.rotulo}</span>
        <Badge
          variant="outline"
          className="ml-auto h-4 rounded px-1 font-mono text-[9px] text-muted-foreground"
        >
          {pasta.arquivos.filter((a) => a.status !== "pendente").length}
        </Badge>
      </button>
      {aberta && (
        <div className="ml-3 border-l border-border/40 pl-1">
          {pasta.arquivos.map((a) => (
            <ContextMenu key={a.id}>
              <ContextMenuTrigger asChild>
                <button
                  onClick={() => onSelect(a)}
                  className={cn(
                    "flex w-full items-center gap-1.5 rounded px-2 py-1 text-left hover:bg-muted/50",
                    selecionadoId === a.id && "bg-muted",
                    a.status === "pendente" && "text-muted-foreground/60",
                  )}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{a.nome}</span>
                  <span className="ml-auto pl-1">
                    <IconeStatus status={a.status} />
                  </span>
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent className="font-mono text-xs">
                <ContextMenuItem onClick={() => onSelect(a)}>Abrir</ContextMenuItem>
                <ContextMenuItem
                  onClick={() => onUpload(a.status === "pendente" ? a.nome : undefined)}
                >
                  {a.status === "pendente" ? "Enviar" : "Atualizar"}
                </ContextMenuItem>
                <ContextMenuItem disabled>Renomear</ContextMenuItem>
                <ContextMenuItem disabled>Mover</ContextMenuItem>
                <ContextMenuItem
                  onClick={() => onExcluir(a)}
                  disabled={a.status === "pendente"}
                  className="text-destructive"
                >
                  Excluir
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
          <button
            onClick={() => onUpload()}
            className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-muted-foreground/70 hover:bg-muted/50 hover:text-foreground"
          >
            <Upload className="h-3 w-3" />
            <span className="text-[11px]">enviar arquivo…</span>
          </button>
        </div>
      )}
    </div>
  );
}

function ViewerDocumento({
  node,
  conteudo,
  carregando,
}: {
  node: Node;
  conteudo: string | null;
  carregando: boolean;
}) {
  const doc = node.doc!;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 border-b border-border/60 px-4 py-3 font-mono text-[11px] sm:grid-cols-4">
        <Meta rotulo="Atualizado" valor={fmtData(doc.atualizado_em || doc.data_upload)} />
        <Meta rotulo="Versão" valor={`v${doc.versao}`} />
        <Meta rotulo="Tamanho" valor={fmtTamanho(doc.tamanho)} />
        <Meta rotulo="Tipo" valor={node.nome.endsWith(".md") ? "Markdown" : "Texto"} />
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="p-6">
          {carregando ? (
            <div className="text-sm text-muted-foreground">Lendo…</div>
          ) : node.nome.endsWith(".md") ? (
            <article className="markdown-body max-w-none text-sm leading-relaxed [&_h1]:mb-3 [&_h1]:mt-4 [&_h1]:font-display [&_h1]:text-xl [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-lg [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:font-display [&_h3]:text-base [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_pre]:my-3 [&_pre]:overflow-auto [&_pre]:rounded [&_pre]:bg-muted/60 [&_pre]:p-3 [&_pre]:text-xs [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground">
              <ReactMarkdown>{conteudo ?? ""}</ReactMarkdown>
            </article>
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
              {conteudo}
            </pre>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ViewerPendente({ node, onEnviar }: { node: Node; onEnviar: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <X className="h-10 w-10 text-muted-foreground/40" />
      <div>
        <p className="font-mono text-sm">{node.nome}</p>
        <p className="text-xs text-muted-foreground">
          Arquivo sugerido ainda não enviado para esta empresa.
        </p>
      </div>
      <Button size="sm" onClick={onEnviar}>
        <Upload className="h-3.5 w-3.5" />
        Enviar arquivo
      </Button>
    </div>
  );
}

function Meta({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{rotulo}</span>
      <span className="truncate text-foreground">{valor}</span>
    </div>
  );
}
