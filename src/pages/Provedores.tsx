import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api, type ProvedorIA } from "@/lib/api";
import { cn } from "@/lib/utils";

type Rascunho = { campos: Record<string, string>; modelo: string };

function statusDoProvedor(p: ProvedorIA): { rotulo: string; classe: string } {
  if (!p.configurado)
    return { rotulo: "não conectado", classe: "border-border/60 text-muted-foreground" };
  if (!p.ativo) return { rotulo: "desativado", classe: "border-amber-500/40 text-amber-400" };
  if (p.status_teste === "ok")
    return { rotulo: "conectado ✓", classe: "border-primary/40 text-primary" };
  if (p.status_teste)
    return { rotulo: "chave com problema", classe: "border-destructive/50 text-destructive" };
  return { rotulo: "salvo · não testado", classe: "border-sky-500/40 text-sky-400" };
}

function CartaoProvedor({ provedor, onMudou }: { provedor: ProvedorIA; onMudou: () => void }) {
  const [rascunho, setRascunho] = useState<Rascunho>({
    campos: {},
    modelo: provedor.modelo_preferido ?? "",
  });
  const [ocupado, setOcupado] = useState<"salvar" | "testar" | "remover" | "ativo" | null>(null);
  const status = statusDoProvedor(provedor);

  const mudou = useMemo(
    () =>
      Object.values(rascunho.campos).some((v) => v.trim() !== "") ||
      rascunho.modelo.trim() !== (provedor.modelo_preferido ?? ""),
    [rascunho, provedor.modelo_preferido],
  );

  // Segredo: o servidor nunca devolve o valor, só a máscara. Campo vazio = "manter".
  const faltaObrigatorio = provedor.campos.some(
    (c) => c.obrigatorio && !provedor.mascara[c.nome] && !(rascunho.campos[c.nome] ?? "").trim(),
  );

  async function executar<T>(tipo: NonNullable<typeof ocupado>, fn: () => Promise<T>) {
    setOcupado(tipo);
    try {
      return await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha inesperada");
      return undefined;
    } finally {
      setOcupado(null);
    }
  }

  async function salvar() {
    const campos = Object.fromEntries(
      Object.entries(rascunho.campos).filter(([, v]) => v.trim() !== ""),
    );
    const ok = await executar("salvar", () =>
      api.salvarProvedor(provedor.nome, {
        campos,
        modelo_preferido: rascunho.modelo.trim() || null,
      }),
    );
    if (ok) {
      toast.success(`${provedor.rotulo}: salvo`, {
        description: "Clique em “Testar” para confirmar que a chave funciona.",
      });
      setRascunho({ campos: {}, modelo: ok.modelo_preferido ?? "" });
      onMudou();
    }
  }

  async function testar() {
    const r = await executar("testar", () => api.testarProvedor(provedor.nome));
    if (!r) return;
    if (r.status === "ok") {
      toast.success(`${provedor.rotulo}: chave válida`, {
        description: r.latencia_ms ? `Respondeu em ${r.latencia_ms} ms.` : undefined,
      });
    } else {
      toast.error(`${provedor.rotulo}: ${r.mensagem}`, { description: r.acao ?? undefined });
    }
    onMudou();
  }

  async function remover() {
    if (!window.confirm(`Remover a chave de ${provedor.rotulo}?`)) return;
    const ok = await executar("remover", () => api.removerProvedor(provedor.nome));
    if (ok !== undefined) {
      toast.success(`${provedor.rotulo}: chave removida`);
      setRascunho({ campos: {}, modelo: "" });
      onMudou();
    }
  }

  async function alternarAtivo(ativo: boolean) {
    const ok = await executar("ativo", () =>
      api.salvarProvedor(provedor.nome, { campos: {}, ativo }),
    );
    if (ok) onMudou();
  }

  return (
    <Card
      className={cn(
        "border-border/60 bg-card/60",
        provedor.configurado && provedor.ativo && "border-primary/30",
      )}
    >
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-base">{provedor.rotulo}</h3>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {Object.entries(provedor.capacidades)
                .filter(([, v]) => v)
                .map(([k]) => k.replace("_", " "))
                .join(" · ") || "—"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {provedor.configurado && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                usar
                <Switch
                  checked={provedor.ativo}
                  disabled={ocupado !== null}
                  onCheckedChange={alternarAtivo}
                  aria-label={`Usar ${provedor.rotulo}`}
                />
              </label>
            )}
            <Badge
              variant="outline"
              className={cn("font-mono text-[10px] uppercase tracking-wider", status.classe)}
            >
              {status.rotulo}
            </Badge>
          </div>
        </div>

        {provedor.aviso && (
          <p className="flex gap-2 rounded-md border border-border/50 bg-muted/20 p-2.5 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
            {provedor.aviso}
          </p>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {provedor.campos.map((c) => (
            <div key={c.nome} className="space-y-1.5">
              <Label htmlFor={`${provedor.nome}-${c.nome}`} className="text-xs">
                {c.rotulo}
                {c.obrigatorio && <span className="text-destructive"> *</span>}
              </Label>
              <Input
                id={`${provedor.nome}-${c.nome}`}
                type={c.segredo ? "password" : "text"}
                autoComplete="off"
                spellCheck={false}
                value={rascunho.campos[c.nome] ?? ""}
                placeholder={
                  provedor.mascara[c.nome]
                    ? `${provedor.mascara[c.nome]} (salvo — deixe vazio para manter)`
                    : "Cole aqui"
                }
                onChange={(e) =>
                  setRascunho((r) => ({ ...r, campos: { ...r.campos, [c.nome]: e.target.value } }))
                }
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label htmlFor={`${provedor.nome}-modelo`} className="text-xs">
              Modelo (opcional)
            </Label>
            <Input
              id={`${provedor.nome}-modelo`}
              value={rascunho.modelo}
              placeholder={provedor.modelo_padrao ?? "padrão do sistema"}
              onChange={(e) => setRascunho((r) => ({ ...r, modelo: e.target.value }))}
            />
          </div>
        </div>

        {provedor.status_teste && provedor.status_teste !== "ok" && provedor.mensagem_teste && (
          <p className="flex items-center gap-2 text-xs text-destructive">
            <XCircle className="h-3.5 w-3.5" /> {provedor.mensagem_teste}
          </p>
        )}
        {provedor.status_teste === "ok" && provedor.testada_em && (
          <p className="flex items-center gap-2 text-xs text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" /> Testada em{" "}
            {new Date(provedor.testada_em).toLocaleString("pt-BR")}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={salvar}
            disabled={ocupado !== null || !mudou || faltaObrigatorio}
          >
            {ocupado === "salvar" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Salvar
          </Button>
          {provedor.configurado && (
            <Button
              size="sm"
              variant="outline"
              onClick={testar}
              disabled={ocupado !== null || mudou}
            >
              {ocupado === "testar" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Testar chave
            </Button>
          )}
          {provedor.configurado && (
            <Button
              size="sm"
              variant="ghost"
              onClick={remover}
              disabled={ocupado !== null}
              className="text-muted-foreground"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remover
            </Button>
          )}
          <a
            href={provedor.url_chave}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-primary"
          >
            Criar chave <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Provedores() {
  const [provedores, setProvedores] = useState<ProvedorIA[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(() => {
    api
      .listarProvedores()
      .then((p) => {
        setProvedores(p);
        setErro(null);
      })
      .catch((e) => setErro(e instanceof Error ? e.message : "Falha ao carregar"));
  }, []);

  useEffect(carregar, [carregar]);

  const conectados = provedores?.filter((p) => p.configurado && p.ativo).length ?? 0;
  const ordenados = useMemo(
    () => [...(provedores ?? [])].sort((a, b) => Number(b.configurado) - Number(a.configurado)),
    [provedores],
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary/80">
          Configurações
        </p>
        <h1 className="mt-1 flex items-center gap-2 font-display text-3xl">
          <KeyRound className="h-6 w-6 text-primary" /> Provedores de IA
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Conecte as suas próprias contas de IA. O Caetus OS junta todas e escolhe a melhor para
          cada tarefa, com fallback automático se uma falhar ou atingir o limite. Você paga (ou usa
          o plano gratuito) direto no provedor. Suas chaves ficam <strong>cifradas</strong> e nunca
          são exibidas depois de salvas.
        </p>
      </header>

      {provedores && (
        <div
          className={cn(
            "rounded-lg border p-4 text-sm",
            conectados === 0
              ? "border-amber-500/40 bg-amber-500/5 text-amber-200"
              : "border-primary/30 bg-primary/5 text-primary",
          )}
        >
          {conectados === 0
            ? "Nenhum provedor conectado ainda. Conecte pelo menos um (Gemini e Groq têm plano gratuito) para gerar conteúdo."
            : `${conectados} provedor${conectados > 1 ? "es" : ""} conectado${conectados > 1 ? "s" : ""}. Conectar mais de um aumenta a confiabilidade (fallback).`}
        </div>
      )}

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <div className="grid gap-4">
        {!provedores &&
          !erro &&
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        {ordenados.map((p) => (
          <CartaoProvedor key={p.nome} provedor={p} onMudou={carregar} />
        ))}
      </div>
    </div>
  );
}
