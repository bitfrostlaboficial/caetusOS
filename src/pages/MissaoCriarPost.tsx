import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, PenLine, Sparkles } from "lucide-react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResultadoMissao } from "@/components/ResultadoMissao";
import { ResumoExecucao } from "@/components/ResumoExecucao";
import { TimelineExecucao } from "@/components/TimelineExecucao";
import { RelatorioExecucao } from "@/components/RelatorioExecucao";

/**
 * Tela especializada da missão "Criar post".
 *
 * Reaproveita 100% a lógica do antigo Dashboard. Visual ajustado ao
 * padrão "tela de missão" do Command Center.
 */
export default function MissaoCriarPost() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conhecimento, setConhecimento] = useState<DocumentoConhecimento[]>([]);
  const [tema, setTema] = useState(searchParams.get("tema") ?? "");
  const [canal, setCanal] = useState("linkedin");
  const [objetivo, setObjetivo] = useState("");
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
    try {
      const r = await api.executarComando("conteudo.criar_post", {
        tema,
        canal,
        objetivo: objetivo || undefined,
      });
      setResultado(r);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha inesperada");
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
          Command Center
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
            <p className="mt-1 text-sm text-muted-foreground">
              Gera um post completo a partir do conhecimento da sua empresa.
              Habilidade: <code className="text-xs">conteudo.criar_post</code>
            </p>
          </div>
        </div>
      </div>

      {conhecimento.length === 0 && (
        <Card className="border-dashed border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center justify-between gap-4 py-3">
            <p className="text-sm text-muted-foreground">
              Sem documentos de conhecimento — o resultado fica genérico. Adicione
              contexto para um post realmente sob medida.
            </p>
            <Link to="/app/conhecimento">
              <Button variant="outline" size="sm">
                Adicionar conhecimento
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Formulário */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle className="font-display text-base">Briefing</CardTitle>
            <CardDescription>Preencha os campos abaixo e execute.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={executar}>
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="canal">Canal</Label>
                <select
                  id="canal"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={canal}
                  onChange={(e) => setCanal(e.target.value)}
                >
                  <option value="linkedin">LinkedIn</option>
                  <option value="instagram">Instagram</option>
                  <option value="blog">Blog</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="objetivo">Objetivo (opcional)</Label>
                <Textarea
                  id="objetivo"
                  value={objetivo}
                  onChange={(e) => setObjetivo(e.target.value)}
                  placeholder="Atrair leads qualificados para o time comercial"
                  rows={3}
                />
              </div>
              <Button type="submit" disabled={executando} className="w-full gap-2">
                <Sparkles className={executando ? "animate-pulse" : ""} />
                {executando ? "Executando missão..." : "Executar missão"}
              </Button>
              {erro && <p className="text-sm text-destructive">{erro}</p>}
            </form>
          </CardContent>
        </Card>

        {/* Resultado */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle className="font-display text-base">Resultado</CardTitle>
            <CardDescription>
              {resultado ? "Conteúdo produzido pela IA" : "Aguardando execução"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resultado ? (
              <ResultadoView resultado={resultado} />
            ) : (
              <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-border/60 text-xs text-muted-foreground">
                Preencha o briefing e clique em executar.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {resultado && (
        <Card className="border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle className="font-display text-base">Relatório de execução</CardTitle>
            <CardDescription>
              Tudo que aconteceu no sistema durante essa execução.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RelatorioExecucao resultado={resultado} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ResultadoView({ resultado }: { resultado: ResultadoExecucao }) {
  if (resultado.erro) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
        <p className="font-medium text-destructive">{resultado.erro.codigo}</p>
        <p className="text-destructive/80">{resultado.erro.mensagem}</p>
      </div>
    );
  }
  const dados = resultado.dados as { titulo?: string; corpo?: string; hashtags?: string[] };
  return (
    <div className="space-y-3 text-sm">
      {dados.titulo && <h3 className="text-base font-semibold">{dados.titulo}</h3>}
      {dados.corpo && (
        <p className="whitespace-pre-wrap leading-relaxed">{dados.corpo}</p>
      )}
      {dados.hashtags && dados.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {dados.hashtags.map((h) => (
            <Badge key={h} variant="secondary">
              {h}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
