import { useCallback, useEffect, useState } from "react";
import { Brain, Loader2, Palette, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api, type MemoriaItem } from "@/lib/api";

const CORES_PADRAO = ["primaria", "secundaria", "destaque", "fundo", "texto"];
const TIPOS_MEMORIA = [
  { valor: "regra", rotulo: "Regra (sempre seguir)" },
  { valor: "preferencia", rotulo: "Preferência" },
  { valor: "fato", rotulo: "Fato sobre a empresa" },
  { valor: "decisao", rotulo: "Decisão tomada" },
];

function erroDe(e: unknown): string {
  return e instanceof Error ? e.message : "Falha inesperada";
}

function Identidade() {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [tom, setTom] = useState("");
  const [cores, setCores] = useState<Record<string, string>>({});
  const [fontes, setFontes] = useState({ titulo: "", corpo: "" });

  useEffect(() => {
    api
      .obterIdentidade()
      .then((i) => {
        setTom(i.tom_de_voz ?? "");
        setCores(i.cores ?? {});
        setFontes({ titulo: i.fontes?.titulo ?? "", corpo: i.fontes?.corpo ?? "" });
      })
      .catch((e) => toast.error(erroDe(e)))
      .finally(() => setCarregando(false));
  }, []);

  async function salvar() {
    setSalvando(true);
    try {
      const coresLimpas = Object.fromEntries(Object.entries(cores).filter(([, v]) => v.trim()));
      const fontesLimpas = Object.fromEntries(Object.entries(fontes).filter(([, v]) => v.trim()));
      await api.salvarIdentidade({
        tom_de_voz: tom.trim(),
        cores: coresLimpas,
        fontes: fontesLimpas,
      });
      toast.success("Identidade salva", {
        description: "Os próximos conteúdos já usam essas informações.",
      });
    } catch (e) {
      toast.error(erroDe(e));
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <Skeleton className="h-96" />;

  return (
    <Card className="border-border/60 bg-card/60">
      <CardContent className="space-y-6 p-5">
        <div className="space-y-1.5">
          <Label htmlFor="tom">Tom de voz</Label>
          <Textarea
            id="tom"
            rows={4}
            value={tom}
            onChange={(e) => setTom(e.target.value)}
            placeholder="Ex.: descontraído e próximo, sem gírias pesadas; trata o cliente por “você”; evita jargão técnico."
          />
          <p className="text-xs text-muted-foreground">
            Como a sua marca fala. Entra em todo texto gerado pela IA.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Cores da marca</Label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CORES_PADRAO.map((nome) => (
              <div key={nome} className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label={`Cor ${nome}`}
                  value={/^#[0-9a-fA-F]{6}$/.test(cores[nome] ?? "") ? cores[nome] : "#000000"}
                  onChange={(e) => setCores((c) => ({ ...c, [nome]: e.target.value }))}
                  className="h-9 w-10 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
                />
                <div className="min-w-0 flex-1">
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {nome}
                  </span>
                  <Input
                    value={cores[nome] ?? ""}
                    placeholder="#RRGGBB"
                    onChange={(e) => setCores((c) => ({ ...c, [nome]: e.target.value }))}
                    className="h-8"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fonte-titulo">Fonte dos títulos</Label>
            <Input
              id="fonte-titulo"
              value={fontes.titulo}
              placeholder="Ex.: Sora"
              onChange={(e) => setFontes((f) => ({ ...f, titulo: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fonte-corpo">Fonte do texto</Label>
            <Input
              id="fonte-corpo"
              value={fontes.corpo}
              placeholder="Ex.: Inter"
              onChange={(e) => setFontes((f) => ({ ...f, corpo: e.target.value }))}
            />
          </div>
        </div>

        <Button onClick={salvar} disabled={salvando}>
          {salvando && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Salvar identidade
        </Button>
      </CardContent>
    </Card>
  );
}

function Memoria() {
  const [itens, setItens] = useState<MemoriaItem[] | null>(null);
  const [tipo, setTipo] = useState("regra");
  const [conteudo, setConteudo] = useState("");
  const [peso, setPeso] = useState(3);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => {
    api
      .listarMemoria()
      .then(setItens)
      .catch((e) => toast.error(erroDe(e)));
  }, []);
  useEffect(carregar, [carregar]);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!conteudo.trim()) return;
    setSalvando(true);
    try {
      await api.criarMemoria({ tipo, conteudo: conteudo.trim(), peso });
      setConteudo("");
      carregar();
    } catch (err) {
      toast.error(erroDe(err));
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id: string) {
    try {
      await api.removerMemoria(id);
      carregar();
    } catch (err) {
      toast.error(erroDe(err));
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/60">
        <CardContent className="p-5">
          <form
            onSubmit={adicionar}
            className="grid gap-3 md:grid-cols-[180px_1fr_110px_auto] md:items-end"
          >
            <div className="space-y-1.5">
              <Label htmlFor="mem-tipo">Tipo</Label>
              <select
                id="mem-tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {TIPOS_MEMORIA.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.rotulo}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mem-conteudo">O que o sistema deve lembrar</Label>
              <Input
                id="mem-conteudo"
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                placeholder="Ex.: Nunca usar emojis nos posts."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mem-peso">Importância</Label>
              <select
                id="mem-peso"
                value={peso}
                onChange={(e) => setPeso(Number(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value={1}>baixa</option>
                <option value={3}>média</option>
                <option value={5}>alta</option>
              </select>
            </div>
            <Button type="submit" disabled={salvando || !conteudo.trim()}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>

      {!itens && <Skeleton className="h-32" />}
      {itens && itens.length === 0 && (
        <p className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          Nada na memória ainda. Registre regras, preferências e fatos que a IA deve respeitar
          sempre.
        </p>
      )}
      <ul className="space-y-2">
        {itens?.map((m) => (
          <li
            key={m.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-card/40 p-3"
          >
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-wider text-primary/80">
                {TIPOS_MEMORIA.find((t) => t.valor === m.tipo)?.rotulo ?? m.tipo} · importância{" "}
                {m.peso >= 5 ? "alta" : m.peso >= 3 ? "média" : "baixa"}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{m.conteudo}</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Remover"
              onClick={() => remover(m.id)}
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Marca() {
  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary/80">
          Contexto da empresa
        </p>
        <h1 className="mt-1 font-display text-3xl">Marca e memória</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          É isto que faz a IA falar como a sua empresa. Tudo o que você registrar aqui é enviado
          junto com cada pedido.
        </p>
      </header>

      <Tabs defaultValue="identidade">
        <TabsList>
          <TabsTrigger value="identidade" className="gap-1.5">
            <Palette className="h-3.5 w-3.5" /> Identidade
          </TabsTrigger>
          <TabsTrigger value="memoria" className="gap-1.5">
            <Brain className="h-3.5 w-3.5" /> Memória
          </TabsTrigger>
        </TabsList>
        <TabsContent value="identidade" className="mt-4">
          <Identidade />
        </TabsContent>
        <TabsContent value="memoria" className="mt-4">
          <Memoria />
        </TabsContent>
      </Tabs>
    </div>
  );
}
