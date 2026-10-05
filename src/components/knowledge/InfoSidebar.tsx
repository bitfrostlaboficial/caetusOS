import { useState, useMemo } from "react";
import {
  FileText,
  Clock,
  Database,
  Hash,
  Cpu,
  Bookmark,
  Sparkles,
  History,
  FileCheck2,
  Calendar,
  AlertCircle,
  Copy,
  Check,
  Compass,
} from "lucide-react";
import { type DocumentoConhecimento } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface InfoSidebarProps {
  node: {
    kind: "file";
    id: string;
    tipo: string;
    nome: string;
    status: string;
    doc?: DocumentoConhecimento;
  } | null;
}

function fmtTamanho(bytes?: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtData(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function InfoSidebar({ node }: InfoSidebarProps) {
  const [activeTab, setActiveTab] = useState<"props" | "ai" | "versions">("props");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (val: string, fieldName: string) => {
    navigator.clipboard.writeText(val);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copiado!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const parsedDetails = useMemo(() => {
    if (!node) return null;

    const nome = node.nome;
    const caminho = node.doc?.caminho || `sugerido/conhecimento/${nome}`;
    const tipo = nome.split(".").pop()?.toUpperCase() || "Desconhecido";
    const tamanhoStr = node.doc ? fmtTamanho(node.doc.tamanho) : "Pendente";
    const criadoEm = node.doc ? fmtData(node.doc.data_upload) : "Pendente";
    const alteradoEm = node.doc ? fmtData(node.doc.atualizado_em || node.doc.data_upload) : "Pendente";

    // Categoria com rótulo amigável
    const categorias: Record<string, string> = {
      institucional: "Institucional",
      produto: "Produtos",
      servico: "Serviços",
      marketing: "Marketing",
      comercial: "Comercial",
      cliente: "Clientes",
      processo: "Processos",
      rh: "RH",
      financeiro: "Financeiro",
      juridico: "Jurídico",
      geral: "Geral",
    };
    const categoria = categorias[node.tipo] || node.tipo;

    // Detectar Missão e Origem
    let missao = "Nenhuma";
    let origem = "Upload Manual";
    let hash = "—";

    // Se o caminho contiver hashes de marketing
    if (caminho.includes("conhecimento/marketing/posts/") || nome.includes("post_")) {
      missao = "Criar Post de Marketing (conteudo.criar_post)";
      origem = "caetusOS Pipeline (IA)";
    }

    // Extrair Hash do caminho_storage se for no formato "{hash}-nome"
    const parteNome = caminho.split("/").pop() || "";
    if (parteNome.includes("-")) {
      const possivelHash = parteNome.split("-")[0];
      if (possivelHash.length >= 8) {
        hash = possivelHash;
      }
    }

    return {
      nome,
      caminho,
      tipo,
      tamanhoStr,
      criadoEm,
      alteradoEm,
      categoria,
      missao,
      origem,
      hash,
    };
  }, [node]);

  if (!node) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center border-l border-border/40 bg-card/10">
        <FileText className="h-8 w-8 text-muted-foreground/30 mb-2" />
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Nenhum arquivo
        </p>
        <p className="text-[10px] text-muted-foreground/60 max-w-[180px] mt-1">
          Selecione um arquivo para inspecionar seus metadados.
        </p>
      </div>
    );
  }

  const d = parsedDetails!;

  return (
    <div className="flex h-full flex-col border-l border-border/60 bg-card/30 min-w-[280px] max-w-[340px] overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/40 p-4">
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          <Database className="h-3.5 w-3.5 text-primary" />
          <span>Inspecionar Arquivo</span>
        </div>
        <h3 className="font-display text-sm font-semibold text-foreground truncate select-text" title={node.nome}>
          {node.nome}
        </h3>
        {node.status === "pendente" ? (
          <Badge variant="destructive" className="mt-1.5 h-4 text-[9px] font-mono font-semibold uppercase">
            Pendente
          </Badge>
        ) : (
          <Badge variant="outline" className="mt-1.5 h-4 text-[9px] font-mono text-emerald-400 bg-emerald-500/5 border-emerald-500/20 uppercase">
            Sincronizado v{node.doc?.versao || 1}
          </Badge>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/40 bg-muted/10">
        <button
          onClick={() => setActiveTab("props")}
          className={`flex-1 py-2 font-mono text-[10px] uppercase tracking-wider text-center border-b-2 transition-colors ${
            activeTab === "props"
              ? "border-primary text-foreground font-semibold bg-background/30"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Metadados
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`flex-1 py-2 font-mono text-[10px] uppercase tracking-wider text-center border-b-2 transition-colors ${
            activeTab === "ai"
              ? "border-primary text-foreground font-semibold bg-background/30"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Ações IA
        </button>
        <button
          onClick={() => setActiveTab("versions")}
          className={`flex-1 py-2 font-mono text-[10px] uppercase tracking-wider text-center border-b-2 transition-colors ${
            activeTab === "versions"
              ? "border-primary text-foreground font-semibold bg-background/30"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Histórico
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === "props" && (
          <div className="space-y-4 font-mono text-[11px]">
            {/* Caminho completo */}
            <div className="space-y-1">
              <span className="text-[9px] text-muted-foreground uppercase flex items-center gap-1">
                <Compass className="h-3 w-3" /> Caminho Completo
              </span>
              <div className="flex items-center gap-1 rounded bg-muted/40 p-1.5 border border-border/30">
                <span className="truncate flex-1 text-foreground select-text" title={d.caminho}>
                  {d.caminho}
                </span>
                <button
                  onClick={() => handleCopy(d.caminho, "Caminho")}
                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                >
                  {copiedField === "Caminho" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>

            {/* Grid Detalhes */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 rounded bg-muted/10 p-2 border border-border/20">
                <span className="text-[9px] text-muted-foreground uppercase block">Extensão</span>
                <span className="font-semibold text-foreground">{d.tipo}</span>
              </div>
              <div className="space-y-1 rounded bg-muted/10 p-2 border border-border/20">
                <span className="text-[9px] text-muted-foreground uppercase block">Tamanho</span>
                <span className="font-semibold text-foreground">{d.tamanhoStr}</span>
              </div>
            </div>

            {/* Categoria */}
            <div className="space-y-1 rounded bg-muted/10 p-2 border border-border/20">
              <span className="text-[9px] text-muted-foreground uppercase flex items-center gap-1">
                <Bookmark className="h-3 w-3" /> Categoria
              </span>
              <span className="font-semibold text-foreground">{d.categoria}</span>
            </div>

            {/* Datas */}
            <div className="space-y-2 rounded bg-muted/10 p-2 border border-border/20">
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-muted-foreground uppercase flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Criado em
                </span>
                <span className="text-foreground">{d.criadoEm}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/20 pt-1.5 mt-1.5">
                <span className="text-[9px] text-muted-foreground uppercase flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Alterado em
                </span>
                <span className="text-foreground">{d.alteradoEm}</span>
              </div>
            </div>

            {/* Origem */}
            <div className="space-y-1 rounded bg-muted/10 p-2 border border-border/20">
              <span className="text-[9px] text-muted-foreground uppercase flex items-center gap-1">
                <Cpu className="h-3 w-3" /> Origem / Método
              </span>
              <span className="font-semibold text-foreground text-xs">{d.origem}</span>
            </div>

            {/* Missao relacionada */}
            <div className="space-y-1 rounded bg-muted/10 p-2 border border-border/20">
              <span className="text-[9px] text-muted-foreground uppercase flex items-center gap-1">
                <FileCheck2 className="h-3 w-3" /> Missão Relacionada
              </span>
              <span className="font-medium text-foreground leading-relaxed block text-[10px]">
                {d.missao}
              </span>
            </div>

            {/* Hash */}
            <div className="space-y-1">
              <span className="text-[9px] text-muted-foreground uppercase flex items-center gap-1">
                <Hash className="h-3 w-3" /> Hash SHA-256 (Identidade)
              </span>
              <div className="flex items-center gap-1 rounded bg-muted/40 p-1.5 border border-border/30">
                <span className="truncate flex-1 text-foreground font-mono select-text" title={d.hash}>
                  {d.hash}
                </span>
                {d.hash !== "—" && (
                  <button
                    onClick={() => handleCopy(d.hash, "Hash")}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                  >
                    {copiedField === "Hash" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "ai" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1 font-mono text-[11px]">
                <p className="font-semibold text-foreground">Ações de IA Preparadas</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  As ações de IA e cruzamento de dados com a base de conhecimento estão mapeadas.
                </p>
              </div>
            </div>

            {/* Sumarização */}
            <div className="rounded-md border border-border/50 bg-muted/10 p-3 space-y-2 opacity-60">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[11px] font-semibold text-foreground">Perguntar à IA</span>
                <Badge variant="outline" className="text-[8px] font-mono tracking-wider h-4">Fase 3</Badge>
              </div>
              <textarea
                disabled
                placeholder="Ex: Qual o tom de voz descrito neste documento?"
                className="w-full h-16 rounded border border-border/40 bg-background/50 p-2 font-mono text-[10px] resize-none focus:outline-none"
              />
              <button disabled className="w-full py-1.5 rounded bg-primary/20 text-primary-foreground font-mono text-[10px] uppercase font-semibold">
                Analisar com IA
              </button>
            </div>

            {/* Sumário rápido */}
            <div className="rounded-md border border-border/50 bg-muted/10 p-3 space-y-1.5 opacity-60">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[11px] font-semibold text-foreground">Gerar Resumo</span>
                <Badge variant="outline" className="text-[8px] font-mono tracking-wider h-4">Fase 3</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
                Gera um resumo executivo dos tópicos, intenções e pontos de melhoria deste documento.
              </p>
            </div>
          </div>
        )}

        {activeTab === "versions" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/10 p-3 flex items-start gap-2.5">
              <History className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="space-y-1 font-mono text-[11px]">
                <p className="font-semibold text-foreground">Versionamento Automatizado</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Arquitetura de dados pronta para comparar alterações e restaurar versões anteriores.
                </p>
              </div>
            </div>

            {/* Histórico Simulado */}
            <div className="space-y-3 font-mono text-[11px]">
              <div className="relative pl-4 border-l border-border/60 space-y-4 py-1">
                <div className="relative">
                  <div className="absolute -left-[20.5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-foreground">Versão Atual (v{node.doc?.versao || 1})</span>
                    <span className="text-[9px] text-muted-foreground">{d.alteradoEm}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Disponível para uso na IA do caetusOS.</p>
                </div>

                {node.doc && node.doc.versao > 1 && (
                  <div className="relative opacity-60">
                    <div className="absolute -left-[20.5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-muted bg-background" />
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-muted-foreground">v1 (Versão Inicial)</span>
                      <span className="text-[9px] text-muted-foreground">{d.criadoEm}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">Versão de criação do documento.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
