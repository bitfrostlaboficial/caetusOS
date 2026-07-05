#!/usr/bin/env node
/**
 * CLI de renderização do layout-engine.
 *
 * Lê uma árvore de composição (JSON), monta a peça com a biblioteca de
 * componentes (components.mjs), gera o HTML/CSS correspondente e exporta um
 * PNG com Playwright. Imprime um único JSON em stdout (contrato descrito em
 * references/output-contract.md). Não lê nada de empresas/ nem decide nada
 * de marca: todo dado visual chega explícito em `composition`.
 *
 * Uso:
 *   node render.mjs --spec composition.json --output-dir ./generated-posts
 *
 * Ver ai/capabilities/layout-engine/CAPABILITY.md, seção "Como executar".
 */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { COMPONENTS } from "./components.mjs";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const FORMATS = JSON.parse(fs.readFileSync(path.join(__dirname, "formats.json"), "utf-8"));

const BASE_CSS = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { -webkit-font-smoothing: antialiased; }
  h1, h2, p, figure, blockquote { margin: 0; }
`;

function parseArgs(argv) {
  const args = { output_dir: "./generated-posts", templates_dir: "./templates", save_as_template: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (key === "save-as-template") {
      args.save_as_template = true;
      continue;
    }
    args[key.replace(/-/g, "_")] = next;
    i++;
  }
  return args;
}

function slugify(text, fallback = "post") {
  if (!text) return fallback;
  return (
    text
      .toString()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || fallback
  );
}

function findHeadlineText(node) {
  if (!node) return null;
  if (node.component === "Headline" && node.props && node.props.text) return node.props.text;
  for (const child of node.children || []) {
    const found = findHeadlineText(child);
    if (found) return found;
  }
  return null;
}

// Constrói recursivamente a árvore React a partir do spec JSON. Falha alto e
// claro se um componente não existir na biblioteca — nunca renderiza "algo
// parecido" silenciosamente. `keyPrefix` garante uma prop `key` estável em
// cada nível (React exige isso em listas de filhos).
function build(node, keyPrefix = "0") {
  if (!node || typeof node !== "object") {
    throw new Error("Nó de composição inválido: esperado um objeto {component, props, children}.");
  }
  const Component = COMPONENTS[node.component];
  if (!Component) {
    const disponiveis = Object.keys(COMPONENTS).join(", ");
    throw new Error(`Componente desconhecido "${node.component}". Disponíveis: ${disponiveis}.`);
  }
  const children = (node.children || []).map((child, i) => build(child, `${keyPrefix}.${i}`));
  const props = { ...(node.props || {}) };
  const element = Component({ ...props, children: children.length ? children : props.children });
  return element === null || element === undefined ? element : React.cloneElement(element, { key: keyPrefix });
}

function resolveDimensions(spec, cli) {
  const format = cli.format || spec.format || "instagram-feed";
  const base = FORMATS[format];
  if (!base && !(spec.width && spec.height)) {
    const disponiveis = Object.keys(FORMATS).join(", ");
    throw new Error(`Formato desconhecido "${format}" e nenhum width/height explícito foi fornecido. Formatos disponíveis: ${disponiveis}.`);
  }
  const width = Number(cli.width || spec.width || (base && base.width));
  const height = Number(cli.height || spec.height || (base && base.height));
  return { format, width, height };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.spec) {
    console.log(JSON.stringify({ png: null, html: null, template: null, composition_resolved: null, error: "Parâmetro obrigatório ausente: --spec <caminho-para-composition.json>" }));
    process.exit(1);
  }

  let spec;
  try {
    spec = JSON.parse(fs.readFileSync(args.spec, "utf-8"));
  } catch (err) {
    console.log(JSON.stringify({ png: null, html: null, template: null, composition_resolved: null, error: `Falha ao ler/parsear --spec: ${err.message}` }));
    process.exit(1);
  }

  let width, height, format;
  try {
    ({ format, width, height } = resolveDimensions(spec, args));
  } catch (err) {
    console.log(JSON.stringify({ png: null, html: null, template: null, composition_resolved: null, error: err.message }));
    process.exit(1);
  }

  const root = spec.root;
  if (!root || root.component !== "Post") {
    console.log(JSON.stringify({ png: null, html: null, template: null, composition_resolved: null, error: 'composition.root precisa ser um componente "Post" (ver references/components.md).' }));
    process.exit(1);
  }

  const styleTokens = spec.style_tokens || {};
  const resolvedRootProps = { ...(root.props || {}), width, height, styleTokens };

  let markup;
  try {
    const tree = COMPONENTS.Post({ ...resolvedRootProps, children: (root.children || []).map((c, i) => build(c, `${i}`)) });
    markup = renderToStaticMarkup(tree);
  } catch (err) {
    console.log(JSON.stringify({ png: null, html: null, template: null, composition_resolved: { ...spec, format, width, height }, error: `Falha ao montar a composição: ${err.message}` }));
    process.exit(1);
  }

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body>${markup}</body></html>`;

  const outputDir = path.resolve(args.output_dir);
  fs.mkdirSync(outputDir, { recursive: true });
  const baseName = args.output_name || `${slugify(findHeadlineText(root))}-${Date.now()}`;
  const htmlPath = path.join(outputDir, `${baseName}.html`);
  const pngPath = path.join(outputDir, `${baseName}.png`);
  fs.writeFileSync(htmlPath, html, "utf-8");

  let renderError = null;
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(url.pathToFileURL(htmlPath).href);
    const el = await page.$('[data-role="post-root"]');
    if (!el) throw new Error('Elemento raiz [data-role="post-root"] não encontrado no HTML renderizado.');
    await el.screenshot({ path: pngPath });
    await browser.close();
  } catch (err) {
    renderError = `Falha ao exportar PNG via Playwright: ${err.message}. O HTML intermediário foi salvo em ${htmlPath} e pode ser inspecionado/renderizado manualmente.`;
  }

  let template = null;
  if (!renderError && args.save_as_template) {
    if (!args.template_slug) {
      renderError = "save_as_template=true requer --template-slug.";
    } else {
      const templatesDir = path.resolve(args.templates_dir);
      const templateDir = path.join(templatesDir, args.template_slug);
      fs.mkdirSync(templateDir, { recursive: true });
      fs.writeFileSync(path.join(templateDir, "template.json"), JSON.stringify({ format, width, height, style_tokens: styleTokens, root }, null, 2));
      fs.writeFileSync(path.join(templateDir, "style.css"), BASE_CSS);
      fs.copyFileSync(pngPath, path.join(templateDir, "preview.png"));
      const metadata = args.metadata
        ? JSON.parse(fs.existsSync(args.metadata) ? fs.readFileSync(args.metadata, "utf-8") : args.metadata)
        : { categoria: null, tipo: null, objetivo: null, texto: null, imagem: null, complexidade: null, tags: [] };
      fs.writeFileSync(path.join(templateDir, "metadata.json"), JSON.stringify(metadata, null, 2));
      const rationale =
        (args.rationale && (fs.existsSync(args.rationale) ? fs.readFileSync(args.rationale, "utf-8") : args.rationale)) ||
        "## Quando utilizar\n\n(preencher)\n\n## Quando evitar\n\n(preencher)\n\n## Estratégia visual\n\n(preencher)\n\n## Hierarquia\n\n(preencher)\n\n## Motivo da composição\n\n(preencher)\n";
      fs.writeFileSync(path.join(templateDir, "rationale.md"), rationale);
      template = { path: templateDir, slug: args.template_slug };
    }
  }

  const result = {
    png: renderError ? null : { path: pngPath, width, height },
    html: { path: htmlPath },
    template,
    composition_resolved: { format, width, height, style_tokens: styleTokens, root },
    error: renderError,
  };
  console.log(JSON.stringify(result));
  process.exit(renderError ? 1 : 0);
}

main().catch((err) => {
  console.log(JSON.stringify({ png: null, html: null, template: null, composition_resolved: null, error: `Erro inesperado: ${err.stack || err.message}` }));
  process.exit(1);
});
