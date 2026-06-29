import { Navigate, Route, Routes } from "react-router-dom";
import { auth } from "@/lib/api";
import type { JSX } from "react";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import AppLayout from "./pages/AppLayout";
import CommandCenter from "./pages/CommandCenter";
import Missoes from "./pages/Missoes";
import MissaoCriarPost from "./pages/MissaoCriarPost";
import MissaoEmBreve from "./pages/MissaoEmBreve";
import Conhecimento from "./pages/Conhecimento";
import Historico from "./pages/Historico";
import InfraestruturaIA from "./pages/InfraestruturaIA";
import InfraestruturaIAHistorico from "./pages/InfraestruturaIAHistorico";
import InfraestruturaIAExecucoes from "./pages/InfraestruturaIAExecucoes";
import InfraestruturaIABenchmark from "./pages/InfraestruturaIABenchmark";
import InfraestruturaIAMissoes from "./pages/InfraestruturaIAMissoes";
import NotFound from "./pages/NotFound";

function RequireAuth({ children }: { children: JSX.Element }) {
  if (!auth.isAuthenticated()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<CommandCenter />} />
        <Route path="missoes" element={<Missoes />} />
        <Route path="missoes/criar-post" element={<MissaoCriarPost />} />
        <Route path="missoes/:slug" element={<MissaoEmBreve />} />
        <Route path="conhecimento" element={<Conhecimento />} />
        <Route path="historico" element={<Historico />} />
        <Route path="infraestrutura/ia" element={<InfraestruturaIA />} />
        <Route path="infraestrutura/ia/historico" element={<InfraestruturaIAHistorico />} />
        <Route path="infraestrutura/execucoes" element={<InfraestruturaIAExecucoes />} />
        <Route path="infraestrutura/benchmark" element={<InfraestruturaIABenchmark />} />
        <Route path="infraestrutura/missoes" element={<InfraestruturaIAMissoes />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
