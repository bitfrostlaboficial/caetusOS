import { useState, useEffect } from "react";
import { Sparkles, X, BookOpen, Compass, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WelcomeGuide() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const lido = localStorage.getItem("caetusos_knowledge_guide_read");
    if (!lido) {
      setVisivel(true);
    }
  }, []);

  const fechar = () => {
    localStorage.setItem("caetusos_knowledge_guide_read", "true");
    setVisivel(false);
  };

  if (!visivel) return null;

  return (
    <div className="relative rounded-xl border border-primary/20 bg-primary/5 p-5 md:p-6 flex flex-col md:flex-row items-start gap-4 md:gap-6 shadow-sm overflow-hidden select-none animate-in fade-in slide-in-from-top-4 duration-300">
      {/* Detalhe de fundo */}
      <div className="absolute right-0 top-0 h-32 w-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />

      <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
        <Sparkles className="h-5 w-5" />
      </div>

      <div className="flex-1 space-y-3 min-w-0">
        <div className="space-y-1">
          <h2 className="font-display font-semibold text-sm md:text-base text-foreground tracking-tight">
            Seja bem-vindo à Central de Conhecimento do caetusOS
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed max-w-3xl">
            Quanto melhor e mais organizada estiver a base de conhecimento da sua empresa, mais inteligentes, precisas e humanas serão as respostas e automações executadas pelos seus <strong className="text-foreground">Funcionários Digitais</strong>.
          </p>
        </div>

        {/* Guia em passos */}
        <div className="grid gap-4 sm:grid-cols-3 pt-1">
          <Step
            icone={<BookOpen className="h-4 w-4 text-sky-400" />}
            titulo="1. Preencha os Modelos"
            descricao="Abra os arquivos sugeridos nas pastas (como Personas e Tom de Voz) e preencha as seções usando os templates oficiais guias do sistema."
          />
          <Step
            icone={<Compass className="h-4 w-4 text-emerald-400" />}
            titulo="2. Adicione Documentos"
            descricao="Envie fichas de produtos, propostas comerciais, PDFs, planilhas e imagens para as respectivas pastas para encorpar a inteligência de negócios."
          />
          <Step
            icone={<CheckCircle2 className="h-4 w-4 text-indigo-400" />}
            titulo="3. Deixe a IA Trabalhar"
            descricao="Nossos agentes indexam esses documentos automaticamente para realizar vendas, responder clientes e otimizar processos em tempo real."
          />
        </div>

        <div className="flex items-center justify-end pt-2">
          <Button
            size="sm"
            onClick={fechar}
            className="h-8 font-mono text-[10px] uppercase font-bold"
          >
            Começar Agora
          </Button>
        </div>
      </div>

      <button
        onClick={fechar}
        className="absolute top-4 right-4 text-muted-foreground/60 hover:text-foreground hover:bg-muted p-1 rounded-md transition-colors"
        title="Fechar guia de boas-vindas"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function Step({
  icone,
  titulo,
  descricao,
}: {
  icone: React.ReactNode;
  titulo: string;
  descricao: string;
}) {
  return (
    <div className="space-y-1.5 p-3 rounded-lg bg-card/40 border border-border/40">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-foreground font-semibold">
        {icone}
        <span>{titulo}</span>
      </div>
      <p className="font-mono text-[10px] text-muted-foreground leading-normal">
        {descricao}
      </p>
    </div>
  );
}
