import { Link, Navigate, useNavigate } from "react-router-dom";
import { useState } from "react";
import { api, auth, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Login() {
  if (auth.isAuthenticated()) return <Navigate to="/app" replace />;

  const navigate = useNavigate();
  const [aba, setAba] = useState("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const resp =
        aba === "login"
          ? await api.login(email, senha)
          : await api.registrar(nomeEmpresa, email, senha);
      auth.setTokens(resp.access_token, resp.refresh_token);
      navigate("/app");
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha inesperada");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Empresa IA</CardTitle>
          <CardDescription>Seu Funcionário Digital — versão MVP</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={aba} onValueChange={setAba}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="registrar">Criar empresa</TabsTrigger>
            </TabsList>
            <form className="mt-6 space-y-4" onSubmit={submeter}>
              <TabsContent value="registrar" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nomeEmpresa">Nome da empresa</Label>
                  <Input
                    id="nomeEmpresa"
                    value={nomeEmpresa}
                    onChange={(e) => setNomeEmpresa(e.target.value)}
                    required={aba === "registrar"}
                    placeholder="Acme Ltda"
                  />
                </div>
              </TabsContent>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="voce@empresa.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              {erro && <p className="text-sm text-destructive">{erro}</p>}
              <Button type="submit" className="w-full" disabled={carregando}>
                {carregando ? "Aguarde..." : aba === "login" ? "Entrar" : "Criar empresa"}
              </Button>
            </form>
          </Tabs>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:underline">
              ← Voltar
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
