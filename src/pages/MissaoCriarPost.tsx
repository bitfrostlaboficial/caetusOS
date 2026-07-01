import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ImageIcon,
  PenLine,
  Play,
  Settings2,
  Sparkles,
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
