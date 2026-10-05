import { useCallback, useEffect, useRef, useState } from "react";
import {
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, type Asset } from "@/lib/api";

const CATEGORIAS_UPLOAD = [
  { valor: "LOGO", rotulo: "Logo" },
  { valor: "IMAGEM", rotulo: "Imagem" },
  { valor: "ICONE", rotulo: "Ícone" },
  { valor: "FONTE", rotulo: "Fonte" },
  { valor: "PDF", rotulo: "PDF" },
  { valor: "TEMPLATE", rotulo: "Modelo" },
];

const erroDe = (e: unknown) => (e instanceof Error ? e.message : "Falha inesperada");

function salvarBlob(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** <img> para um asset protegido por token. */
function ImagemAsset({ asset, className }: { asset: Asset; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let ativo = true;
    let criada: string | null = null;
    api
      .baixarAsset(asset.id)
      .then((b) => {
        if (!ativo) return;
        criada = URL.createObjectURL(b);
        setUrl(criada);
      })
      .catch(() => ativo && setFalhou(true));
    return () => {
      ativo = false;
      if (criada) URL.revokeObjectURL(criada);
    };
  }, [asset.id]);

  if (falhou) return <div className={className}>sem prévia</div>;
  if (!url) return <Skeleton className={className} />;
  return <img src={url} alt={asset.nome} className={className} />;
}

type Post = {
  chave: string;
  tema: string;
  criadoEm: string | null;
  imagem?: Asset;
  legenda?: Asset;
  todos: Asset[];
};

function agruparPosts(assets: Asset[]): Post[] {
  const mapa = new Map<string, Post>();
  for (const a of assets) {
    const chave = String(a.metadados?.post ?? a.id);
    const p = mapa.get(chave) ?? {
      chave,
      tema: String(a.metadados?.tema ?? "Post"),
      criadoEm: a.criado_em,
      todos: [],
    };
    p.todos.push(a);
    if (a.categoria === "IMAGEM") p.imagem = a;
    if (a.nome === "legenda.md") p.legenda = a;
    mapa.set(chave, p);
  }
  return [...mapa.values()].sort((x, y) => (y.criadoEm ?? "").localeCompare(x.criadoEm ?? ""));
}

function CartaoPost({ post, onMudou }: { post: Post; onMudou: () => void }) {
  const [legenda, setLegenda] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState(false);

  useEffect(() => {
    if (!post.legenda) return;
    api
      .baixarAsset(post.legenda.id)
      .then((b) => b.text())
      .then(setLegenda)
      .catch(() => setLegenda(null));
  }, [post.legenda]);

  async function copiar() {
    if (!legenda) return;
    await navigator.clipboard.writeText(legenda);
    toast.success("Legenda copiada");
  }

  async function baixarImagem() {
    if (!post.imagem) return;
    try {
      salvarBlob(await api.baixarAsset(post.imagem.id), post.imagem.nome);
    } catch (e) {
      toast.error(erroDe(e));
    }
  }

  async function excluir() {
    if (!window.confirm("Excluir este post e todos os seus arquivos?")) return;
    setRemovendo(true);
    try {
      await Promise.all(post.todos.map((a) => api.removerAsset(a.id)));
      onMudou();
    } catch (e) {
      toast.error(erroDe(e));
      setRemovendo(false);
    }
  }

  return (
    <Card className="overflow-hidden border-border/60 bg-card/60">
      {post.imagem ? (
        <ImagemAsset
          asset={post.imagem}
          className="aspect-square w-full bg-muted/20 object-cover"
        />
      ) : (
        <div className="flex aspect-[2/1] items-center justify-center bg-muted/10 text-xs text-muted-foreground">
          <ImageIcon className="mr-2 h-4 w-4" /> sem imagem
        </div>
      )}
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-primary/80">
            {post.criadoEm ? new Date(post.criadoEm).toLocaleString("pt-BR") : ""}
          </p>
          <h3 className="mt-0.5 line-clamp-2 font-display text-sm">{post.tema}</h3>
        </div>
        {legenda && (
          <p className="line-clamp-5 whitespace-pre-wrap text-xs text-muted-foreground">
            {legenda}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={copiar} disabled={!legenda}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Legenda
          </Button>
          <Button size="sm" variant="outline" onClick={baixarImagem} disabled={!post.imagem}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Imagem
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Excluir post"
            onClick={excluir}
            disabled={removendo}
            className="ml-auto text-muted-foreground hover:text-destructive"
          >
            {removendo ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Resultados() {
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const carregar = useCallback(() => {
    api
      .listarAssets({ origem: "GERADO" })
      .then(setAssets)
      .catch((e) => toast.error(erroDe(e)));
  }, []);
  useEffect(carregar, [carregar]);

  if (!assets) return <Skeleton className="h-64" />;
  const posts = agruparPosts(assets);
  if (posts.length === 0)
    return (
      <p className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
        Nenhum resultado ainda. Gere um post em <strong>Missões → Criar post</strong> e ele aparece
        aqui.
      </p>
    );
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((p) => (
        <CartaoPost key={p.chave} post={p} onMudou={carregar} />
      ))}
    </div>
  );
}

function tamanhoLegivel(n: number | null): string {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function Arquivos() {
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [categoria, setCategoria] = useState("LOGO");
  const [enviando, setEnviando] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const carregar = useCallback(() => {
    api
      .listarAssets({ origem: "UPLOAD" })
      .then(setAssets)
      .catch((e) => toast.error(erroDe(e)));
  }, []);
  useEffect(carregar, [carregar]);

  async function enviar(f: File | undefined) {
    if (!f) return;
    setEnviando(true);
    try {
      await api.uploadAsset(categoria, f);
      toast.success("Arquivo enviado");
      carregar();
    } catch (e) {
      toast.error(erroDe(e));
    } finally {
      setEnviando(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remover(a: Asset) {
    if (!window.confirm(`Remover “${a.nome}”?`)) return;
    try {
      await api.removerAsset(a.id);
      carregar();
    } catch (e) {
      toast.error(erroDe(e));
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/60">
        <CardContent className="flex flex-wrap items-end gap-3 p-5">
          <div className="space-y-1.5">
            <label htmlFor="asset-cat" className="text-xs font-medium">
              Tipo do arquivo
            </label>
            <select
              id="asset-cat"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="flex h-10 w-44 rounded-md border border-input bg-background px-3 text-sm"
            >
              {CATEGORIAS_UPLOAD.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.rotulo}
                </option>
              ))}
            </select>
          </div>
          <input
            ref={input}
            type="file"
            className="hidden"
            onChange={(e) => enviar(e.target.files?.[0])}
          />
          <Button onClick={() => input.current?.click()} disabled={enviando}>
            {enviando ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-1.5 h-4 w-4" />
            )}
            Enviar arquivo
          </Button>
          <p className="text-xs text-muted-foreground">
            Logos, imagens de referência, fontes, PDFs. Até 20 MB.
          </p>
        </CardContent>
      </Card>

      {!assets && <Skeleton className="h-32" />}
      {assets && assets.length === 0 && (
        <p className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          Nenhum arquivo enviado ainda.
        </p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {assets?.map((a) => (
          <li
            key={a.id}
            className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-muted/20">
              {a.mime?.startsWith("image/") ? (
                <ImagemAsset asset={a} className="h-full w-full object-contain" />
              ) : (
                <FileText className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm" title={a.nome}>
                {a.nome}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {a.categoria} · {tamanhoLegivel(a.tamanho)}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Baixar"
              onClick={async () => salvarBlob(await api.baixarAsset(a.id), a.nome)}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Remover"
              onClick={() => remover(a)}
              className="hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Biblioteca() {
  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary/80">Acervo</p>
        <h1 className="mt-1 font-display text-3xl">Biblioteca</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Tudo o que o sistema gerou para você e os arquivos da sua marca, num só lugar.
        </p>
      </header>
      <Tabs defaultValue="resultados">
        <TabsList>
          <TabsTrigger value="resultados">Resultados gerados</TabsTrigger>
          <TabsTrigger value="arquivos">Meus arquivos</TabsTrigger>
        </TabsList>
        <TabsContent value="resultados" className="mt-4">
          <Resultados />
        </TabsContent>
        <TabsContent value="arquivos" className="mt-4">
          <Arquivos />
        </TabsContent>
      </Tabs>
    </div>
  );
}
