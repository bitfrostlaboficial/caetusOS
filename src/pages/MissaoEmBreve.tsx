import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Construction } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { obterMissao } from "@/lib/missoes";

/**
 * Tela placeholder para missões ainda não implementadas. Mantém a navegação
 * consistente (Command Center → Missão → tela especializada) sem quebrar
 * nenhum fluxo.
 */
export default function MissaoEmBreve() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const missao = obterMissao(slug);

  const Icone = missao?.icone ?? Construction;

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/app")}
        className="-ml-2 h-7 px-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground"
      >
        <ArrowLeft className="mr-1 h-3 w-3" />
        Command Center
      </Button>

      <Card className="border-dashed border-border/60 bg-card/40">
        <CardContent className="flex flex-col items-center gap-5 px-6 py-16 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/5 text-primary">
            <Icone className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary/80">
              Missão {missao ? "em construção" : "não encontrada"}
            </p>
            <h1 className="font-display text-2xl">
              {missao?.nome ?? "Missão desconhecida"}
            </h1>
            {missao && (
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                {missao.descricao}
              </p>
            )}
          </div>
          <p className="max-w-md text-xs text-muted-foreground">
            Esta missão ainda não tem uma tela especializada. A infraestrutura,
            o roteador de IA e o relatório de execução já estão prontos — falta
            apenas a interface dedicada, que chegará em breve.
          </p>
          <div className="flex gap-2">
            <Link to="/app/missoes">
              <Button variant="outline" size="sm">
                Ver todas as missões
              </Button>
            </Link>
            <Link to="/app">
              <Button size="sm">Voltar ao Command Center</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
