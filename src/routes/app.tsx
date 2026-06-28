import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/api";

/**
 * Layout autenticado: gating de rotas + casca com navegação.
 * Qualquer rota sob /app exige token. Caso contrário, redireciona para /login.
 */
export const Route = createFileRoute("/app")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !auth.isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const router = useRouter();

  function sair() {
    auth.clear();
    router.navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/app" className="text-lg font-semibold tracking-tight">
            Empresa IA
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/app" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>
              Painel
            </Link>
            <Link to="/app/conhecimento" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>
              Conhecimento
            </Link>
            <Link to="/app/historico" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>
              Histórico
            </Link>
            <Button variant="outline" size="sm" onClick={sair}>
              Sair
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
