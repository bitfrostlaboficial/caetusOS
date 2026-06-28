import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/Brand";
import { auth } from "@/lib/api";

export default function Landing() {
  if (auth.isAuthenticated()) return <Navigate to="/app" replace />;

  return (
    <div className="relative flex min-h-screen flex-col text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid-faint opacity-40" />
      <header className="relative border-b border-border/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Brand showTagline />
          <Link to="/login">
            <Button size="sm">Entrar</Button>
          </Link>
        </div>
      </header>
      <main className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 py-20">
        <span className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] text-primary">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          v0.1 · sprint 0 online
        </span>
        <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
          O sistema operacional dos seus{" "}
          <span className="text-gradient-brand">Funcionários Digitais</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          O <span className="font-mono text-foreground">caetusOS</span> transforma o conhecimento da
          sua empresa em agentes de IA que executam tarefas reais — marketing, comercial e operações
          — sem treinamento, sem complicação.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/login">
            <Button size="lg" className="glow-primary">
              Criar minha empresa
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline">
              Já tenho conta
            </Button>
          </Link>
        </div>
        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            { k: "01", t: "Conhecimento", d: "Suba documentos da empresa em segundos." },
            { k: "02", t: "Execução", d: "Comandos auditáveis via Executor central." },
            { k: "03", t: "Resultado", d: "Conteúdo publicável com identidade da marca." },
          ].map((s) => (
            <div
              key={s.k}
              className="rounded-lg border border-border/60 bg-card/40 p-4 backdrop-blur-sm"
            >
              <span className="font-mono text-xs text-primary">{s.k}</span>
              <h3 className="mt-2 font-display text-base font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
