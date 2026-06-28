import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/Brand";
import { auth } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function AppLayout() {
  const navigate = useNavigate();

  function sair() {
    auth.clear();
    navigate("/login");
  }

  const itemClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "relative font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground",
      isActive && "text-primary",
    );

  return (
    <div className="relative min-h-screen text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-grid-faint opacity-30" />
      <header className="relative border-b border-border/60 bg-background/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/app">
            <Brand />
          </Link>
          <nav className="flex items-center gap-6">
            <NavLink to="/app" end className={itemClass}>
              Painel
            </NavLink>
            <NavLink to="/app/conhecimento" className={itemClass}>
              Conhecimento
            </NavLink>
            <NavLink to="/app/historico" className={itemClass}>
              Histórico
            </NavLink>
            <NavLink to="/app/infraestrutura/ia" className={itemClass}>
              Infraestrutura
            </NavLink>
            <Button variant="outline" size="sm" onClick={sair}>
              Sair
            </Button>
          </nav>
        </div>
      </header>
      <main className="relative mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
