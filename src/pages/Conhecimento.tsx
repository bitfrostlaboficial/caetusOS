import { useEffect, useRef, useState } from "react";
import { api, type DocumentoConhecimento } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

export default function Conhecimento() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState("geral");
  const [lista, setLista] = useState<DocumentoConhecimento[] | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function recarregar() {
    try {
      setLista(await api.listarConhecimento());
    } catch {
      setLista([]);
    }
  }

  useEffect(() => {
    recarregar();
  }, []);

  async function onArquivo(file: File) {
    setErro(null);
    setEnviando(true);
    try {
      await api.uploadConhecimento(tipo, file);
      if (inputRef.current) inputRef.current.value = "";
      await recarregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Conhecimento</h1>
        <p className="text-sm text-muted-foreground">
          Documentos Markdown sobre sua empresa, produto e clientes. Usados como contexto pelo
          Funcionário Digital.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Adicionar documento</CardTitle>
          <CardDescription>Aceita .md, .txt e outros formatos textuais.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[200px_1fr_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                <option value="geral">Geral</option>
                <option value="produto">Produto</option>
                <option value="cliente">Cliente</option>
                <option value="processo">Processo</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="arquivo">Arquivo</Label>
              <input
                id="arquivo"
                ref={inputRef}
                type="file"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onArquivo(f);
                }}
              />
            </div>
            <Button disabled={enviando}>{enviando ? "Enviando..." : "Selecionar"}</Button>
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documentos</CardTitle>
          <CardDescription>
            {lista ? `${lista.length} documento(s)` : "Carregando..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!lista || lista.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum documento ainda.</p>
          ) : (
            <ul className="divide-y">
              {lista.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{d.tipo}</Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      {d.caminho.split("/").pop()}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">v{d.versao}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
