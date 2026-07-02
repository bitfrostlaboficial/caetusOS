import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ImageIcon,
  PenLine,
  Play,
  Settings2,
  Sparkles,
  Copy,
  Download,
  ExternalLink,
  Database,
  Instagram,
  Cpu,
  Coins,
  Clock,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import {
  api,
  type DocumentoConhecimento,
  type ResultadoExecucao,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ResultadoMissao } from "@/components/ResultadoMissao";
import { ResumoExecucao } from "@/components/ResumoExecucao";
import { TimelineExecucao } from "@/components/TimelineExecucao";
import { RelatorioExecucao } from "@/components/RelatorioExecucao";

/**
 * Tela especializada da missão "Criar post".
 *
 * Esta tela serve como padrão visual de "Tela de Missão" para todas as
 * automações futuras do CaetusOS: cabeçalho de missão, blocos de
 * formulário (Resumo da Missão, Conteúdo Visual, Configurações
 * Avançadas) e painel de resultado com estado vazio elegante.
 */

// Sugestões rápidas de tema. Estáticas no MVP; estrutura preparada para
// receber sugestões personalizadas a partir do histórico no futuro.
const SUGESTOES_TEMA: { emoji: string; label: string; tema: string }[] = [
  { emoji: "🚀", label: "Lançamento de produto", tema: "Lançamento de produto" },
  { emoji: "💡", label: "Dica técnica", tema: "Dica técnica" },
  { emoji: "🏢", label: "Post institucional", tema: "Post institucional" },
  { emoji: "🎉", label: "Promoção especial", tema: "Promoção especial" },
  { emoji: "⭐", label: "Caso de sucesso", tema: "Caso de sucesso" },
];

export default function MissaoCriarPost() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conhecimento, setConhecimento] = useState<DocumentoConhecimento[]>([]);
  const [tema, setTema] = useState(searchParams.get("tema") ?? "");
  const [canal, setCanal] = useState("instagram");
  const [objetivo, setObjetivo] = useState("");
  // Campo preparado para futuras missões de geração de imagem. Mantido
  // apenas no estado local — não enviado ao backend nesta fase.
  const [descricaoImagem, setDescricaoImagem] = useState("");
  const [publicacaoAutomatica, setPublicacaoAutomatica] = useState(false);
  const [resultado, setResultado] = useState<ResultadoExecucao | null>(null);
  const [executando, setExecutando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [promptExpandido, setPromptExpandido] = useState(false);

  useEffect(() => {
    api.listarConhecimento().then(setConhecimento).catch(() => undefined);
  }, []);

  async function executar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setExecutando(true);
    const toastId = toast.loading("Executando missão...", {
      description: "A IA está processando sua solicitação.",
    });
    try {
      const r = await api.executarComando("conteudo.criar_post", {
        tema,
        rede: canal,
        objetivo: objetivo || undefined,
        descricao_imagem: descricaoImagem || undefined,
        publicar_automaticamente: publicacaoAutomatica,
      });
      setResultado(r);
      const fallbacks = (r.eventos ?? []).filter((ev) => ev.tipo === "ia.fallback").length;
      if (!r.sucesso) {
        toast.error("Falha durante a execução", {
          id: toastId,
          description: r.erro?.mensagem ?? "Verifique os detalhes abaixo.",
        });
      } else if (fallbacks > 0) {
        toast.warning("Missão concluída com fallback automático", {
          id: toastId,
          description: "Provider alternativo utilizado.",
        });
      } else {
        toast.success("Missão concluída", {
          id: toastId,
          description: "Resultado disponível abaixo.",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha inesperada";
      setErro(msg);
      toast.error("Falha durante a execução", { id: toastId, description: msg });
    } finally {
      setExecutando(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header de missão */}
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/app")}
          className="-ml-2 h-7 px-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground"
        >
          <ArrowLeft className="mr-1 h-3 w-3" />
          Centro de Comando
        </Button>
        <div className="flex items-start gap-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <PenLine className="h-5 w-5" />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary/80">
              Missão · Marketing
            </p>
            <h1 className="mt-1 font-display text-2xl">Criar post</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Crie publicações profissionais para suas redes sociais utilizando
              a inteligência da sua empresa. Para obter resultados melhores,
              mantenha documentos sobre seus produtos, serviços, identidade da
              marca e tom de voz atualizados na aba{" "}
              <Link to="/app/conhecimento" className="text-primary hover:underline">
                Conhecimento
              </Link>
              . Quanto mais contexto sua empresa fornecer, melhores serão as
              respostas da IA.
            </p>
          </div>
        </div>
      </div>

      {conhecimento.length === 0 && (
        <Card className="border-dashed border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center justify-between gap-4 py-3">
            <p className="text-sm text-muted-foreground">
              Sem documentos de conhecimento — o resultado fica genérico.
              Adicione contexto para um post realmente sob medida.
            </p>
            <Link to="/app/conhecimento">
              <Button variant="outline" size="sm">
                Adicionar conhecimento
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <form className="space-y-6" onSubmit={executar}>
        {/* Bloco: Resumo da Missão */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle className="font-display text-base">Resumo da Missão</CardTitle>
            <CardDescription>
              Descreva o que você quer publicar. Quanto mais claro, melhor o
              resultado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="tema">Tema</Label>
              <Input
                id="tema"
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                required
                minLength={3}
                placeholder="Lançamento da nova versão do produto"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGESTOES_TEMA.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setTema(s.tema)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
                  >
                    <span>{s.emoji}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="objetivo">Objetivo (opcional)</Label>
                <Textarea
                  id="objetivo"
                  value={objetivo}
                  onChange={(e) => setObjetivo(e.target.value)}
                  placeholder="Atrair leads qualificados para o time comercial"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="canal">Canal</Label>
                <select
                  id="canal"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={canal}
                  onChange={(e) => setCanal(e.target.value)}
                >
                  <option value="instagram">Instagram</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="facebook">Facebook</option>
                  <option value="x">X</option>
                  <option value="threads">Threads</option>
                  <option value="blog">Blog</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bloco: Conteúdo Visual */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle className="font-display text-base">Conteúdo Visual</CardTitle>
            <CardDescription>
              Opcional. Caso fique vazio, a IA poderá gerar a descrição
              automaticamente quando a missão de geração de imagem estiver
              disponível.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="descricao-imagem" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                Descrição da Imagem
              </Label>
              <Textarea
                id="descricao-imagem"
                value={descricaoImagem}
                onChange={(e) => setDescricaoImagem(e.target.value)}
                placeholder="Descreva a imagem que deverá acompanhar a publicação. Exemplo: um barbeiro atendendo um cliente em um ambiente moderno."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bloco: Configurações Avançadas */}
        <Card className="border-border/60 bg-card/60">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-display text-base">
                    Configurações Avançadas
                  </span>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  opcional
                </span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-5 border-t border-border/60 px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="auto-pub" className="text-sm">
                      Publicar automaticamente nas redes sociais conectadas
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Nesta primeira etapa, a publicação automática executa
                      apenas o pipeline do Instagram.
                    </p>
                  </div>
                  <Switch
                    id="auto-pub"
                    checked={publicacaoAutomatica}
                    onCheckedChange={setPublicacaoAutomatica}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground/70">
                  Mais opções avançadas serão adicionadas em breve.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={executando}
            className="group gap-2 bg-primary text-primary-foreground shadow-[0_0_24px_-6px_hsl(var(--primary)/0.6)] transition-all hover:shadow-[0_0_32px_-4px_hsl(var(--primary)/0.8)]"
          >
            {executando ? (
              <Sparkles className="animate-pulse" />
            ) : (
              <Play className="transition-transform group-hover:translate-x-0.5" />
            )}
            {executando ? "Executando missão..." : "Executar Missão"}
          </Button>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>
      </form>

      {/* Painel de resultado */}
      {resultado ? (
        <>
          {resultado.sucesso && resultado.dados ? (
            (() => {
              const dados = resultado.dados as any;
              return (
                <div className="space-y-6">
                  {/* Card Principal do Post */}
                  <Card className="border-primary/30 bg-card/60 shadow-[0_0_24px_rgba(0,0,0,0.15)] overflow-hidden">
                    <CardHeader className="border-b border-border/40 pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="font-display text-lg flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                            Conteúdo Produzido com Sucesso
                          </CardTitle>
                          <CardDescription>
                            Visualize o resultado do pipeline de marketing abaixo.
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs text-primary bg-primary/5 border-primary/20">
                          {canal.toUpperCase()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="grid md:grid-cols-[1.2fr_1fr] divide-y md:divide-y-0 md:divide-x divide-border/40">
                        
                        {/* Visualização da Imagem / Post */}
                        <div className="p-6 flex flex-col items-center justify-center bg-muted/10 min-h-[400px]">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground self-start mb-4">
                            Preview do Post
                          </p>
                          
                          {/* Simulação de card de Rede Social */}
                          <div className="w-full max-w-sm rounded-xl border border-border/50 bg-background/80 shadow-md overflow-hidden">
                            <div className="flex items-center gap-2.5 p-3 border-b border-border/40">
                              <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-semibold text-primary">
                                OS
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">caetusOS_marketing</p>
                                <p className="text-[9px] text-muted-foreground truncate">{canal === "instagram" ? "Instagram Post" : "Rede Social"}</p>
                              </div>
                              {canal === "instagram" && <Instagram className="h-4 w-4 text-pink-500 shrink-0" />}
                            </div>
                            
                            {/* Imagem do Post */}
                            <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden relative group">
                              {dados.imagem_url ? (
                                <img 
                                  src={dados.imagem_url} 
                                  alt="Post produzido" 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs p-4 text-center">
                                  <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                                  <span>Imagem indisponível</span>
                                </div>
                              )}
                            </div>

                            {/* Ações Rápidas */}
                            <div className="flex items-center justify-between gap-2 p-3 border-t border-border/40">
                              <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                className="h-8 px-2.5 text-xs gap-1.5"
                                onClick={() => {
                                  navigator.clipboard.writeText(dados.legenda || "");
                                  toast.success("Legenda copiada para a área de transferência!");
                                }}
                              >
                                <Copy className="h-3.5 w-3.5" />
                                Copiar Legenda
                              </Button>
                              
                              {dados.imagem_url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  type="button"
                                  className="h-8 px-2.5 text-xs gap-1.5"
                                  asChild
                                >
                                  <a href={dados.imagem_url} target="_blank" rel="noreferrer" download="imagem_post.png">
                                    <Download className="h-3.5 w-3.5" />
                                    Baixar Imagem
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Texto do Post / Legenda */}
                        <div className="p-6 space-y-4">
                          <div>
                            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                              Legenda Gerada
                            </p>
                            <div className="rounded-lg border border-border/50 bg-background/50 p-4 max-h-[250px] overflow-y-auto">
                              <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground select-text">
                                {dados.legenda || dados.texto || "Nenhum texto gerado."}
                              </p>
                            </div>
                          </div>

                          {dados.hashtags && dados.hashtags.length > 0 && (
                            <div>
                              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                                Hashtags Sugeridas
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {dados.hashtags.map((h: string) => (
                                  <Badge key={h} variant="secondary" className="text-xs bg-muted/80 text-foreground hover:bg-muted font-mono select-all">
                                    {h.startsWith("#") ? h : `#${h}`}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {dados.cta && (
                            <div>
                              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                                Chamada para Ação (CTA)
                              </p>
                              <p className="text-xs text-muted-foreground italic select-text">
                                "{dados.cta}"
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Status de Publicação e Persistência */}
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Painel de Persistência */}
                    <Card className="border-border/60 bg-card/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="font-display text-base flex items-center gap-2">
                          <Database className="h-4 w-4 text-emerald-400" />
                          Base de Conhecimento
                        </CardTitle>
                        <CardDescription>O post foi salvo para a empresa.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5 flex items-start gap-2.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-foreground">Salvo com sucesso</p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              Os materiais deste post foram indexados e armazenados permanentemente para futuras referências e reaproveitamento da IA.
                            </p>
                          </div>
                        </div>
                        {dados.caminho_salvo && (
                          <div className="space-y-1">
                            <span className="font-mono text-[10px] uppercase text-muted-foreground">Diretório do Post</span>
                            <div className="rounded border border-border/40 bg-muted/40 px-2 py-1.5 font-mono text-[11px] truncate select-all">
                              {dados.caminho_salvo}
                            </div>
                          </div>
                        )}
                        {dados.arquivos_salvos && (
                          <div className="space-y-1 pt-1">
                            <span className="font-mono text-[10px] uppercase text-muted-foreground">Arquivos criados</span>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-mono bg-background/50 border border-border/30 rounded p-1.5">
                                <span className="text-muted-foreground truncate">legenda.md</span>
                                <Badge variant="outline" className="text-[10px]">Marketing</Badge>
                              </div>
                              <div className="flex items-center justify-between text-xs font-mono bg-background/50 border border-border/30 rounded p-1.5">
                                <span className="text-muted-foreground truncate">post_xxx.png</span>
                                <Badge variant="outline" className="text-[10px]">Marketing</Badge>
                              </div>
                              <div className="flex items-center justify-between text-xs font-mono bg-background/50 border border-border/30 rounded p-1.5">
                                <span className="text-muted-foreground truncate">prompt.txt</span>
                                <Badge variant="outline" className="text-[10px]">Marketing</Badge>
                              </div>
                              <div className="flex items-center justify-between text-xs font-mono bg-background/50 border border-border/30 rounded p-1.5">
                                <span className="text-muted-foreground truncate">metadata.json</span>
                                <Badge variant="outline" className="text-[10px]">Marketing</Badge>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Painel de Publicação */}
                    <Card className="border-border/60 bg-card/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="font-display text-base flex items-center gap-2">
                          <Instagram className="h-4 w-4 text-pink-400" />
                          Status de Publicação
                        </CardTitle>
                        <CardDescription>Distribuição automática nas redes sociais.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {(() => {
                          const pub = dados.publicacao || {};
                          const status = dados.status_publicacao || pub.status;
                          const detalhes = pub.detalhes || {};

                          if (!publicacaoAutomatica) {
                            return (
                              <div className="rounded-lg border border-border/40 bg-muted/20 p-4 text-center">
                                <p className="text-xs font-medium text-foreground">Publicação Automática Desativada</p>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  Este post foi gerado para publicação manual. Copie os materiais acima para postar na sua rede de preferência.
                                </p>
                              </div>
                            );
                          }

                          if (status === "publicado") {
                            const linkReal = dados.links?.[0] || (detalhes.resposta && detalhes.resposta.permalink);
                            return (
                              <div className="space-y-3">
                                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5 flex items-start gap-2.5">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                  <div className="space-y-1">
                                    <p className="text-xs font-semibold text-foreground">Publicado no Instagram</p>
                                    <p className="text-[11px] text-muted-foreground">
                                      O post foi publicado automaticamente no feed da sua conta conectada!
                                    </p>
                                  </div>
                                </div>
                                
                                {detalhes.media_id && (
                                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                    <div className="p-2 rounded bg-background/50 border border-border/30">
                                      <span className="block text-[9px] uppercase text-muted-foreground">Media ID</span>
                                      <span className="text-foreground truncate block">{detalhes.media_id}</span>
                                    </div>
                                    <div className="p-2 rounded bg-background/50 border border-border/30">
                                      <span className="block text-[9px] uppercase text-muted-foreground">Creation ID</span>
                                      <span className="text-foreground truncate block">{detalhes.creation_id}</span>
                                    </div>
                                  </div>
                                )}

                                {linkReal && (
                                  <Button variant="outline" size="sm" type="button" className="w-full h-8 gap-1 text-xs" asChild>
                                    <a href={linkReal} target="_blank" rel="noreferrer">
                                      <ExternalLink className="h-3 w-3" /> Ver Post no Instagram
                                    </a>
                                  </Button>
                                )}
                              </div>
                            );
                          }

                          if (status === "pendente_configuracao") {
                            return (
                              <div className="space-y-2">
                                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5 flex items-start gap-2.5">
                                  <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                                  <div className="space-y-1">
                                    <p className="text-xs font-semibold text-foreground">Configuração Pendente</p>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                      Para publicar de forma automatizada, é necessário configurar as credenciais do Instagram Business no painel de segredos da plataforma:
                                    </p>
                                  </div>
                                </div>
                                <div className="rounded border border-border/40 bg-muted/40 p-2 font-mono text-[9px] text-muted-foreground space-y-1">
                                  <p className="text-amber-400"># Credenciais requeridas:</p>
                                  <p>INSTAGRAM_ACCESS_TOKEN="..."</p>
                                  <p>INSTAGRAM_ACCOUNT_ID="..."</p>
                                </div>
                              </div>
                            );
                          }

                          if (status === "erro") {
                            return (
                              <div className="space-y-2">
                                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3.5 flex items-start gap-2.5">
                                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                                  <div className="space-y-1">
                                    <p className="text-xs font-semibold text-foreground">Falha na Publicação</p>
                                    <p className="text-[11px] text-muted-foreground">
                                      Ocorreu um erro ao tentar enviar o post à API do Instagram:
                                    </p>
                                  </div>
                                </div>
                                <div className="rounded border border-destructive/20 bg-destructive/5 p-2.5 font-mono text-[10px] text-destructive break-all max-h-[100px] overflow-y-auto">
                                  {detalhes.erro || "Erro de rede desconhecido ou falha de token."}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className="rounded-lg border border-border/40 bg-muted/20 p-4 text-center text-xs text-muted-foreground">
                              Status de publicação: <span className="font-mono text-foreground">{status || "indefinido"}</span>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Prompt Visual Utilizado (Expandível) */}
                  <Card className="border-border/60 bg-card/60">
                    <button
                      type="button"
                      onClick={() => setPromptExpandido(!promptExpandido)}
                      className="w-full flex items-center justify-between p-4 text-left font-display text-sm hover:bg-muted/10 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-sky-400" />
                        Prompt Visual Gerado (IA de Imagem)
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                        <span>{promptExpandido ? "Recolher" : "Expandir"}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${promptExpandido ? "rotate-180" : ""}`} />
                      </div>
                    </button>
                    {promptExpandido && (
                      <CardContent className="pt-0 p-4 border-t border-border/40">
                        <div className="rounded bg-muted/40 p-3 text-xs font-mono leading-relaxed select-text whitespace-pre-wrap text-muted-foreground border border-border/30">
                          {dados.prompt_utilizado || "Prompt de imagem não disponível."}
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* Informações Técnicas e Provedores */}
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Provedores Utilizados */}
                    <Card className="border-border/60 bg-card/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="font-display text-base flex items-center gap-2">
                          <Cpu className="h-4 w-4 text-indigo-400" />
                          Provedores Utilizados
                        </CardTitle>
                        <CardDescription>Inteligências artificiais orquestradas no pipeline.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 font-mono text-xs">
                        {dados.providers_utilizados?.texto && (
                          <div className="flex items-center justify-between p-2.5 rounded bg-background/50 border border-border/30">
                            <span className="text-muted-foreground">Geração de Texto</span>
                            <div className="text-right">
                              <span className="block font-semibold text-foreground">{dados.providers_utilizados.texto.provider?.toUpperCase()}</span>
                              <span className="text-[10px] text-muted-foreground">{dados.providers_utilizados.texto.modelo}</span>
                            </div>
                          </div>
                        )}
                        {dados.providers_utilizados?.imagem && (
                          <div className="flex items-center justify-between p-2.5 rounded bg-background/50 border border-border/30">
                            <span className="text-muted-foreground">Geração de Imagem</span>
                            <div className="text-right">
                              <span className="block font-semibold text-foreground">{dados.providers_utilizados.imagem.provider?.toUpperCase()}</span>
                              <span className="text-[10px] text-muted-foreground">{dados.providers_utilizados.imagem.modelo}</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Métricas e Latência */}
                    <Card className="border-border/60 bg-card/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="font-display text-base flex items-center gap-2">
                          <Coins className="h-4 w-4 text-amber-400" />
                          Métricas da Execução
                        </CardTitle>
                        <CardDescription>Custo, tempo e volume de processamento.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 font-mono text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2.5 rounded bg-background/50 border border-border/30">
                            <span className="block text-[9px] uppercase text-muted-foreground">Latência Total</span>
                            <span className="text-foreground font-semibold flex items-center gap-1.5 mt-0.5">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              {dados.tempo_execucao_ms ? `${(dados.tempo_execucao_ms / 1000).toFixed(1)}s` : "N/A"}
                            </span>
                          </div>
                          <div className="p-2.5 rounded bg-background/50 border border-border/30">
                            <span className="block text-[9px] uppercase text-muted-foreground">Custo Estimado</span>
                            <span className="text-emerald-400 font-semibold mt-0.5 block">
                              ${resultado.metricas?.custo != null ? resultado.metricas.custo.toFixed(4) : "0.0000"} USD
                            </span>
                          </div>
                        </div>
                        
                        <div className="p-2.5 rounded bg-background/50 border border-border/30 flex items-center justify-between">
                          <span className="text-muted-foreground">Tokens Utilizados</span>
                          <span className="text-foreground font-semibold">
                            {((resultado.metricas?.tokens_in || 0) + (resultado.metricas?.tokens_out || 0)).toLocaleString("pt-BR")}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                </div>
              );
            })()
          ) : (
            <Card className="border-primary/30 bg-card/60 shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]">
              <CardHeader>
                <CardTitle className="font-display text-base">
                  Resultado da missão
                </CardTitle>
                <CardDescription>Conteúdo produzido pela IA.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResultadoMissao resultado={resultado} />
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Card className="border-border/60 bg-card/60">
              <CardHeader>
                <CardTitle className="font-display text-base">
                  Resumo da execução
                </CardTitle>
                <CardDescription>O que a IA fez nesta missão.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResumoExecucao resultado={resultado} />
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/60">
              <CardHeader>
                <CardTitle className="font-display text-base">
                  Linha do tempo
                </CardTitle>
                <CardDescription>Etapas percorridas pelo pipeline.</CardDescription>
              </CardHeader>
              <CardContent>
                <TimelineExecucao resultado={resultado} />
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/60 bg-card/40">
            <CardHeader>
              <CardTitle className="font-display text-base">
                Relatório técnico
              </CardTitle>
              <CardDescription>
                Detalhes brutos para diagnóstico e auditoria.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RelatorioExecucao resultado={resultado} />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-dashed border-border/60 bg-card/30">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="font-display text-base">Aguardando execução</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Preencha os dados da missão e clique em{" "}
                <span className="text-foreground">Executar Missão</span> para
                visualizar o resultado.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
