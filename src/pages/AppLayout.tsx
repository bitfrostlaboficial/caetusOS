import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/Brand";
import { useEffect, useState } from "react";
import { api, auth } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function AppLayout() {
  const navigate = useNavigate();
  // Infraestrutura/Benchmark operam sobre as chaves e o estado GLOBAL da plataforma:
  // só aparecem (e só respondem no backend) para operadores da plataforma.
  const [adminPlataforma, setAdminPlataforma] = useState(false);

  useEffect(() => {
    api
      .eu()
      .then((u) => setAdminPlataforma(u.admin_plataforma))
      .catch(() => setAdminPlataforma(false));
  }, []);

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
      <header className="relative border-b border-border/60 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3">
          <Link to="/app" className="flex items-center gap-3">
            <Brand />
            <span className="hidden border-l border-border/50 pl-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground md:inline">
              Sistema operacional para funcionários digitais
            </span>
          </Link>
          <nav className="flex items-center gap-5">
            <NavLink to="/app" end className={itemClass}>
              Painel
            </NavLink>
            <NavLink to="/app/missoes" className={itemClass}>
              Missões
            </NavLink>
            <NavLink to="/app/marca" className={itemClass}>
              Marca
            </NavLink>
            <NavLink to="/app/biblioteca" className={itemClass}>
              Biblioteca
            </NavLink>
            <NavLink to="/app/provedores" className={itemClass}>
              Provedores
            </NavLink>
            <NavLink to="/app/conhecimento" className={itemClass}>
              Conhecimento
            </NavLink>
            <NavLink to="/app/infraestrutura/execucoes" className={itemClass}>
              Execuções
            </NavLink>
            {adminPlataforma && (
              <>
                <NavLink to="/app/infraestrutura/ia" className={itemClass}>
                  Infraestrutura
                </NavLink>
                <NavLink to="/app/infraestrutura/benchmark" className={itemClass}>
                  Benchmark
                </NavLink>
              </>
            )}
            <NavLink to="/app/historico" className={itemClass}>
              Histórico
            </NavLink>
            <Button variant="outline" size="sm" onClick={sair}>
              Sair
            </Button>
          </nav>
        </div>
      </header>
      <main className="relative mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
