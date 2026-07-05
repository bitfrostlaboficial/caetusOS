// Biblioteca de componentes do layout-engine.
//
// Cada componente é uma função pura (props) => elemento React, construída
// com React.createElement (sem JSX) para que este arquivo rode em qualquer
// runtime Node com `react`/`react-dom` instalados, sem passo de build. Todo
// dado visual (cor, fonte, texto, imagem) chega explícito via props/style
// tokens — nenhum componente aqui sabe nada sobre nenhuma empresa.
//
// Ver ai/capabilities/layout-engine/references/components.md para o
// catálogo comentado (props aceitas, quando usar cada um).

import React from "react";

const h = React.createElement;

// ---------------------------------------------------------------------------
// Pequeno conjunto de ícones embutidos (SVG puro, sem dependência externa).
// Usado por <Icon name="..."/>. Ver references/model-analyst.md: ícone que
// já existe aqui nunca deveria ser gerado por IA.
// ---------------------------------------------------------------------------
const ICONS = {
  check: "M5 13l4 4L19 7",
  "arrow-right": "M5 12h14M13 5l7 7-7 7",
  bolt: "M13 2L3 14h7l-1 8 11-14h-7l1-6z",
  shield: "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z",
  star: "M12 2l3 6.5 7 1-5 5 1.5 7-6.5-3.5L5.5 21.5 7 14.5l-5-5 7-1z",
  chat: "M4 4h16v12H8l-4 4V4z",
  chart: "M4 20V10M12 20V4M20 20v-7",
  gear: "M12 8a4 4 0 100 8 4 4 0 000-8zM3 12h2m14 0h2M12 3v2m0 14v2m6.4-15.4l-1.4 1.4M6.9 17.1l-1.4 1.4m0-12.9l1.4 1.4m10.1 10.1l1.4 1.4",
};

function svgIcon(pathData, { size = 32, color = "var(--icon, currentColor)" } = {}) {
  return h(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: color,
      strokeWidth: 1.8,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    },
    h("path", { d: pathData })
  );
}

// ---------------------------------------------------------------------------
// Post — componente raiz. Sempre a raiz de `composition.root`. Recebe
// style_tokens + dimensões resolvidas e as expõe como CSS custom properties
// para todos os filhos, via `style` no próprio elemento (herda em cascata).
// ---------------------------------------------------------------------------
export function Post({ width, height, styleTokens = {}, padding = 64, align = "flex-start", background, children }) {
  const colors = styleTokens.colors || {};
  const fonts = styleTokens.fonts || {};
  const vars = {
    "--color-background": colors.background || "#0B1220",
    "--color-surface": colors.surface || "#111827",
    "--color-primary": colors.primary || "#5B8CFF",
    "--color-secondary": colors.secondary || "#22D3A8",
    "--color-text": colors.text || "#F8FAFC",
    "--color-muted": colors.muted || "#94A3B8",
    "--font-heading": fonts.heading || "system-ui, -apple-system, Segoe UI, sans-serif",
    "--font-body": fonts.body || "system-ui, -apple-system, Segoe UI, sans-serif",
    "--radius": `${styleTokens.radius ?? 24}px`,
  };
  const bg = background || `var(--color-background)`;
  return h(
    "div",
    {
      "data-role": "post-root",
      style: {
        ...vars,
        width: `${width}px`,
        height: `${height}px`,
        background: bg,
        color: "var(--color-text)",
        fontFamily: "var(--font-body)",
        padding: `${padding}px`,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: align,
        justifyContent: "center",
        gap: "24px",
        position: "relative",
        overflow: "hidden",
      },
    },
    children
  );
}

export function Headline({ text, align = "left", size = "xl", color = "var(--color-text)" }) {
  const sizes = { sm: 32, md: 44, lg: 56, xl: 68, xxl: 84 };
  return h(
    "h1",
    {
      style: {
        margin: 0,
        fontFamily: "var(--font-heading)",
        fontWeight: 800,
        lineHeight: 1.08,
        letterSpacing: "-0.02em",
        fontSize: `${sizes[size] || sizes.xl}px`,
        color,
        textAlign: align,
        maxWidth: "100%",
      },
    },
    text
  );
}

export function Subtitle({ text, align = "left", color = "var(--color-secondary)" }) {
  return h(
    "h2",
    {
      style: {
        margin: 0,
        fontFamily: "var(--font-heading)",
        fontWeight: 600,
        fontSize: "26px",
        color,
        textAlign: align,
      },
    },
    text
  );
}

export function Paragraph({ text, align = "left", size = "md", color = "var(--color-muted)" }) {
  const sizes = { sm: 18, md: 22, lg: 28 };
  return h(
    "p",
    {
      style: {
        margin: 0,
        fontFamily: "var(--font-body)",
        fontSize: `${sizes[size] || sizes.md}px`,
        lineHeight: 1.45,
        color,
        textAlign: align,
        maxWidth: "44ch",
      },
    },
    text
  );
}

// Illustration — se `src` vier preenchido (produzido pelo Asset Generator /
// image-generator), renderiza a imagem. Sem `src`, cai num placeholder
// vetorial gerado por código (nunca por IA) — ver references/model-analyst.md.
export function Illustration({ src, alt = "", width = 320, height = 320, shape = "blob", position = "right" }) {
  const posStyle =
    position === "right"
      ? { position: "absolute", right: -40, top: "50%", transform: "translateY(-50%)" }
      : position === "left"
        ? { position: "absolute", left: -40, top: "50%", transform: "translateY(-50%)" }
        : {};
  if (src) {
    return h("img", {
      src,
      alt,
      style: { ...posStyle, width: `${width}px`, height: `${height}px`, objectFit: "contain", zIndex: 0 },
    });
  }
  // Fallback 100% código: uma forma orgânica simples usando <path>, sem IA.
  const blobPath =
    "M43.4,-58.3C55.6,-49.6,64,-34.9,68.6,-18.9C73.2,-2.9,74.1,14.5,67.4,28.6C60.7,42.8,46.4,53.7,31,61.4C15.5,69.1,-1.2,73.5,-17.6,70.4C-34,67.3,-50.1,56.6,-59.6,42C-69.1,27.3,-72,8.7,-68.6,-8.1C-65.2,-24.9,-55.6,-40,-42.3,-48.8C-29.1,-57.6,-14.5,-60.1,1.2,-61.7C16.9,-63.4,33.8,-64.4,43.4,-58.3Z";
  return h(
    "svg",
    { viewBox: "-100 -100 200 200", style: { ...posStyle, width: `${width}px`, height: `${height}px`, opacity: 0.9, zIndex: 0 } },
    h("path", { d: blobPath, fill: "var(--color-primary)", opacity: shape === "blob" ? 0.25 : 0.4, transform: "scale(1.3)" }),
    h("path", { d: blobPath, fill: "var(--color-secondary)", opacity: 0.35, transform: "scale(0.9) rotate(35)" })
  );
}

export function Icon({ name, src, size = 32, color }) {
  if (src) return h("img", { src, width: size, height: size, alt: name || "" });
  const path = ICONS[name];
  if (!path) throw new Error(`Icon: nome desconhecido "${name}" e nenhum "src" foi fornecido.`);
  return svgIcon(path, { size, color });
}

export function FeatureCard({ icon, title, description, accent = "var(--color-primary)" }) {
  return h(
    "div",
    {
      style: {
        display: "flex",
        gap: "16px",
        alignItems: "flex-start",
        background: "var(--color-surface)",
        borderRadius: "var(--radius)",
        padding: "24px",
        border: `1px solid rgba(255,255,255,0.08)`,
      },
    },
    icon ? h("div", { style: { color: accent, flexShrink: 0 } }, Icon({ name: icon, size: 28 })) : null,
    h(
      "div",
      null,
      h("div", { style: { fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "20px", marginBottom: "4px" } }, title),
      description ? h("div", { style: { color: "var(--color-muted)", fontSize: "16px", lineHeight: 1.4 } }, description) : null
    )
  );
}

export function Timeline({ steps = [] }) {
  return h(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: "18px" } },
    steps.map((step, i) =>
      h(
        "div",
        { key: i, style: { display: "flex", gap: "16px", alignItems: "flex-start" } },
        h(
          "div",
          {
            style: {
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "var(--color-primary)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "14px",
              flexShrink: 0,
            },
          },
          i + 1
        ),
        h(
          "div",
          null,
          h("div", { style: { fontWeight: 700, fontFamily: "var(--font-heading)", fontSize: "18px" } }, step.label),
          step.description ? h("div", { style: { color: "var(--color-muted)", fontSize: "15px" } }, step.description) : null
        )
      )
    )
  );
}

export function Quote({ text, author }) {
  return h(
    "figure",
    { style: { margin: 0, borderLeft: "4px solid var(--color-primary)", paddingLeft: "20px" } },
    h("blockquote", { style: { margin: 0, fontSize: "24px", fontStyle: "italic", lineHeight: 1.4 } }, `"${text}"`),
    author ? h("figcaption", { style: { marginTop: "12px", color: "var(--color-muted)", fontSize: "16px" } }, `— ${author}`) : null
  );
}

export function Statistic({ value, label, color = "var(--color-primary)" }) {
  return h(
    "div",
    null,
    h("div", { style: { fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "64px", color, lineHeight: 1 } }, value),
    label ? h("div", { style: { color: "var(--color-muted)", fontSize: "18px", marginTop: "6px" } }, label) : null
  );
}

export function Logo({ src, position = "top-left", size = 40 }) {
  if (!src) return null;
  const pos = {
    "top-left": { top: 32, left: 32 },
    "top-right": { top: 32, right: 32 },
    "bottom-left": { bottom: 32, left: 32 },
    "bottom-right": { bottom: 32, right: 32 },
  }[position] || { top: 32, left: 32 };
  return h("img", { src, style: { position: "absolute", ...pos, height: `${size}px`, zIndex: 2 } });
}

export function Footer({ text, align = "left", color = "var(--color-muted)" }) {
  return h(
    "div",
    {
      style: {
        position: "absolute",
        bottom: 32,
        left: align === "left" ? 64 : "auto",
        right: align === "right" ? 64 : "auto",
        width: align === "center" ? "100%" : "auto",
        textAlign: align,
        fontSize: "16px",
        color,
        fontFamily: "var(--font-body)",
      },
    },
    text
  );
}

export const COMPONENTS = {
  Post,
  Headline,
  Subtitle,
  Paragraph,
  Illustration,
  Icon,
  FeatureCard,
  Timeline,
  Quote,
  Statistic,
  Logo,
  Footer,
};
