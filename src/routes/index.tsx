import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/api";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && auth.isAuthenticated()) {
      throw redirect({ to: "/app" });
    }
  },
  head: () => ({
    meta: [
      { title: "Empresa IA — Seu Funcionário Digital" },
      { name: "description", content: "Funcionário Digital para empresas: gere conteúdo a partir do conhecimento do seu negócio." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">Empresa IA</span>
          <Link to="/login">
            <Button size="sm">Entrar</Button>
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Seu Funcionário Digital, pronto em minutos.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Suba o conhecimento da sua empresa e execute habilidades de marketing, comercial e operações com
          IA — sem treinamento, sem complicação.
        </p>
        <div className="mt-8 flex gap-3">
          <Link to="/login">
            <Button size="lg">Criar minha empresa</Button>
          </Link>
        </div>
        <p className="mt-12 text-xs text-muted-foreground">
          MVP — Sprint 0 · Validação do ciclo Login → Conhecimento → Executar → Resultado.
        </p>
      </main>
    </div>
  );
}
