import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
      "text-muted-foreground hover:text-foreground",
      isActive && "text-foreground font-medium",
    );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/app" className="text-lg font-semibold tracking-tight">
            Empresa IA
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <NavLink to="/app" end className={itemClass}>
              Painel
            </NavLink>
            <NavLink to="/app/conhecimento" className={itemClass}>
              Conhecimento
            </NavLink>
            <NavLink to="/app/historico" className={itemClass}>
              Histórico
            </NavLink>
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
