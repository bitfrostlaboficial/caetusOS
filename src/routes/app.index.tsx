import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, type ResultadoExecucao } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Painel principal: executa a única habilidade do MVP — `conteudo.criar_post`.
 * Fluxo de validação da Sprint 0: Login → (Conhecimento) → Executar → Ver resultado.
 */
export const Route = createFileRoute("/app/")({
  component: PainelPage,
});

function PainelPage() {
  const empresa = useQuery({ queryKey: ["empresa"], queryFn: api.empresaAtual });
  const conhecimento = useQuery({ queryKey: ["conhecimento"], queryFn: api.listarConhecimento });

  const [tema, setTema] = useState("");
  const [canal, setCanal] = useState("linkedin");
  const [objetivo, setObjetivo] = useState("");
  const [resultado, setResultado] = useState<ResultadoExecucao | null>(null);

  const executar = useMutation({
    mutationFn: () =>
      api.executarComando("conteudo.criar_post", {
        tema,
        canal,
        objetivo: objetivo || undefined,
      }),
    onSuccess: (r) => setResultado(r),
  });

  const docsCount = conhecimento.data?.length ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {empresa.data?.nome ?? "Carregando..."}
        </h1>
        <p className="text-sm text-muted-foreground">
          Funcionário Digital pronto para gerar conteúdo a partir do conhecimento da sua empresa.
        </p>
      </div>

      {docsCount === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-between py-4">
            <p className="text-sm text-muted-foreground">
              Nenhum documento de conhecimento ainda. O resultado fica melhor com contexto.
            </p>
            <Link to="/app/conhecimento">
              <Button variant="outline" size="sm">Adicionar conhecimento</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Criar post</CardTitle>
            <CardDescription>Habilidade: <code className="text-xs">conteudo.criar_post</code></CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                executar.mutate();
              }}
            >
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
              <Button type="submit" disabled={executar.isPending}>
                {executar.isPending ? "Gerando..." : "Executar"}
              </Button>
              {executar.isError && (
                <p className="text-sm text-destructive">{(executar.error as Error).message}</p>
              )}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
            <CardDescription>
              {resultado ? (
                <span className="flex items-center gap-2">
                  <Badge variant={resultado.sucesso ? "default" : "destructive"}>
                    {resultado.sucesso ? "Sucesso" : "Erro"}
                  </Badge>
                  {resultado.metricas.provedor && (
                    <span className="text-xs">
                      {resultado.metricas.provedor} · {resultado.metricas.tokens_in ?? 0}→
                      {resultado.metricas.tokens_out ?? 0} tokens ·{" "}
                      {resultado.metricas.latencia_ms ?? 0}ms
                    </span>
                  )}
                </span>
              ) : (
                "Execute uma habilidade para ver a saída"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resultado ? (
              <ResultadoView resultado={resultado} />
            ) : (
              <p className="text-sm text-muted-foreground">Sem execução ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>
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
      {dados.corpo && <p className="whitespace-pre-wrap leading-relaxed">{dados.corpo}</p>}
      {dados.hashtags && dados.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {dados.hashtags.map((h) => (
            <Badge key={h} variant="secondary">{h}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
