import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MISSAO_NOVA, MISSOES } from "@/lib/missoes";

export default function Missoes() {
  const todas = [...MISSOES, MISSAO_NOVA];

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary/80">
          Catálogo
        </p>
        <h1 className="mt-1 font-display text-3xl">Missões</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Cada missão é uma automação executada por um funcionário digital. Ao
          escolher uma missão, você abre a tela especializada com os campos e o
          contexto certo para aquele tipo de trabalho.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {todas.map((m) => {
          const Icone = m.icone;
          const ativa = m.status === "disponivel";
          const destino = m.rota ?? `/app/missoes/${m.slug}`;
          return (
            <Link key={m.slug} to={destino} className="group">
              <Card
                className={cn(
                  "h-full border-border/60 bg-card/60 transition-all",
                  "group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-[0_8px_30px_-12px_oklch(0.85_0.21_135_/_0.25)]",
                )}
              >
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-center justify-between">
                    <div
                      className={cn(
                        "inline-flex h-10 w-10 items-center justify-center rounded-lg border",
                        ativa
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border/60 bg-muted/30 text-muted-foreground",
                      )}
                    >
                      <Icone className="h-4 w-4" />
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-mono text-[10px] uppercase tracking-wider",
                        ativa
                          ? "border-primary/40 text-primary"
                          : "border-border/60 text-muted-foreground",
                      )}
                    >
                      {ativa ? "● ativa" : "○ em breve"}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="font-display text-base">{m.nome}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {m.descricao}
                    </p>
                  </div>
                  <div className="mt-auto flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span>{m.funcionario ?? "—"}</span>
                    <span className="inline-flex items-center gap-1 transition-colors group-hover:text-primary">
                      Abrir <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
