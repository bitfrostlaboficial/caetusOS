import { FolderOpen, ShieldCheck, Sparkles, AlertCircle, FilePlus2, Upload, CheckCircle2, HelpCircle } from "lucide-react";
import { INFORMACOES_PASTAS } from "./folderInfo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface FolderReadmeProps {
  tipo: string;
  arquivos: {
    id: string;
    nome: string;
    status: "ok" | "recente" | "atualizar" | "pendente";
  }[];
  onCriarDeTemplate: (nome: string) => void;
  onEnviarArquivo: (nomeSugerido?: string) => void;
}

export function FolderReadme({
  tipo,
  arquivos,
  onCriarDeTemplate,
  onEnviarArquivo,
}: FolderReadmeProps) {
  const info = INFORMACOES_PASTAS[tipo];

  if (!info) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground bg-muted/5 font-mono">
        Informações da pasta não configuradas ({tipo}).
      </div>
    );
  }

  const reais = arquivos.filter((a) => a.status !== "pendente");
  const pendentes = arquivos.filter((a) => a.status === "pendente");

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 md:p-8 space-y-6 bg-card/20 select-text max-h-[500px]">
      {/* Cabeçalho da Pasta */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-sky-400 shrink-0" />
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Diretório: {info.rotulo}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            {info.descricao}
          </p>
        </div>

        {info.isProtegida && (
          <Badge
            variant="secondary"
            className="rounded px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider bg-primary/10 text-primary border-primary/20 flex items-center gap-1.5 select-none"
            title="Esta pasta faz parte do núcleo operacional do caetusOS"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            🔒 Pasta do Sistema
          </Badge>
        )}
      </div>

      <Separator className="bg-border/40" />

      {/* Grid de Informações da Pasta */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* O que colocar aqui */}
        <div className="rounded-lg border border-border/40 bg-muted/5 p-4 space-y-3">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-foreground font-semibold">
            <HelpCircle className="h-4 w-4 text-sky-400" />
            <span>Utilize esta pasta para:</span>
          </div>
          <ul className="space-y-2 font-mono text-[11px] text-muted-foreground">
            {info.utilidade.map((util, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-sky-400/80 mt-0.5">•</span>
                <span>{util}</span>
              </li>
            ))}
          </ul>

          <div className="pt-2">
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground block mb-1.5">
              Formatos recomendados:
            </span>
            <div className="flex flex-wrap gap-1">
              {info.arquivosRecomendados.map((fmt, i) => (
                <Badge key={i} variant="outline" className="font-mono text-[9px] bg-background">
                  {fmt}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Impacto na Inteligência (IA) */}
        <div className="rounded-lg border border-primary/10 bg-primary/5 p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-primary font-semibold">
              <Sparkles className="h-4 w-4" />
              <span>Impacto na IA do caetusOS:</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {info.impactoIA}
            </p>
          </div>

          <div className="rounded border border-primary/20 bg-primary/10 p-2.5 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span className="font-mono text-[10px] text-muted-foreground leading-normal">
              Os documentos desta pasta serão usados diretamente na tomada de decisão dos Funcionários Digitais para gerar conversas e responder aos clientes.
            </span>
          </div>
        </div>
      </div>

      {/* Estrutura de Arquivos e Templates do Sistema */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-foreground">
            Arquivos Recomendados & Templates do Sistema
          </h3>
          <Button
            size="sm"
            onClick={() => onEnviarArquivo()}
            className="h-8 font-mono text-[10px] uppercase"
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Enviar qualquer arquivo
          </Button>
        </div>

        {/* Lista de sugeridos */}
        <div className="grid gap-2 sm:grid-cols-2">
          {arquivos.map((a) => {
            const isPendente = a.status === "pendente";
            
            return (
              <div
                key={a.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  isPendente
                    ? "border-dashed border-border/60 bg-muted/5 hover:bg-muted/10"
                    : "border-border/40 bg-card/60"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isPendente ? (
                    <AlertCircle className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className={`font-mono text-xs truncate ${isPendente ? "text-muted-foreground/80 font-normal" : "text-foreground font-semibold"}`}>
                      {a.nome}
                    </p>
                    <p className="font-mono text-[9px] text-muted-foreground leading-none mt-0.5">
                      {isPendente ? "Não preenchido" : "Ativo na Base de IA"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 ml-2">
                  {isPendente ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onCriarDeTemplate(a.nome)}
                        className="h-7 px-2 font-mono text-[9px] uppercase text-primary hover:text-primary hover:bg-primary/5 border border-primary/20 hover:border-primary/40 bg-primary/5 shrink-0"
                        title="Escrever agora usando modelo do caetusOS"
                      >
                        <FilePlus2 className="h-3 w-3 mr-1" />
                        Escrever
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEnviarArquivo(a.nome)}
                        className="h-7 w-7 p-0 hover:bg-muted hover:text-foreground text-muted-foreground shrink-0"
                        title="Enviar arquivo pronto do PC"
                      >
                        <Upload className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <span className="font-mono text-[9px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded select-none uppercase tracking-wider font-semibold">
                      Pronto
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Boas Práticas e Ajuda Rápida */}
      <div className="rounded-lg border border-border/40 bg-muted/5 p-4 space-y-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-foreground font-semibold block">
          💡 Dica de Sucesso:
        </span>
        <ul className="space-y-1 font-mono text-[10px] text-muted-foreground leading-normal">
          {info.boasPraticas.map((bp, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-amber-500">•</span>
              <span>{bp}</span>
            </li>
          ))}
          <li className="flex items-start gap-1.5">
            <span className="text-amber-500">•</span>
            <span>Evite arquivos excessivamente longos e genéricos. Prefira documentações precisas e diretas ao ponto.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
