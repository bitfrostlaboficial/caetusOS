import { Navigate, Route, Routes } from "react-router-dom";
import { auth } from "@/lib/api";
import type { JSX } from "react";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import AppLayout from "./pages/AppLayout";
import Dashboard from "./pages/Dashboard";
import Conhecimento from "./pages/Conhecimento";
import Historico from "./pages/Historico";
import InfraestruturaIA from "./pages/InfraestruturaIA";
import InfraestruturaIAHistorico from "./pages/InfraestruturaIAHistorico";
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
        <Route index element={<Dashboard />} />
        <Route path="conhecimento" element={<Conhecimento />} />
        <Route path="historico" element={<Historico />} />
        <Route path="infraestrutura/ia" element={<InfraestruturaIA />} />
        <Route path="infraestrutura/ia/historico" element={<InfraestruturaIAHistorico />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
