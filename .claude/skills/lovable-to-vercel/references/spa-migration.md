# Path B: TanStack Start → plain Vite SPA

Use this when the diagnostics (see `diagnostics.md`, step 5) found no server-only logic — the project is static/presentational content that doesn't need SSR at all. This is a mechanical file-by-file rewrite; work through it in order.

## Why this is safe to do mechanically

Lovable's TanStack Start routes almost always follow the same shape:

```ts
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/some/path")({
  head: () => ({ meta: [...], links: [...], scripts: [...] }),
  component: SomeComponent,
});

function SomeComponent() { /* ...plain JSX, no loaders... */ }
```

When there's no `loader`, `beforeLoad`, or `Route.useLoaderData()` inside the component, the `Route` wrapper is pure boilerplate around a plain React component plus some `<head>` metadata. Stripping it is a matter of: keep the component, move the metadata, drop the wrapper.

## File-by-file plan

### 1. Create `index.html` at the project root

Vite SPAs need this (TanStack Start doesn't, so it won't exist yet). Pull the **root layout's** `head()` config (usually in `src/routes/__root.tsx`) plus the **home route's** `head()` config into static `<meta>`/`<link>`/`<script type="application/ld+json">` tags. The home page's tags matter most for crawlers/social previews since it's the one URL guaranteed to be requested directly — bake its title, description, OG tags, and any JSON-LD structured data in as static HTML.

End of `<body>`:
```html
<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
```

### 2. Create `src/main.tsx` (replaces `router.tsx` + `routeTree.gen.ts` + the root's `shellComponent`)

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./styles.css"; // or wherever the global stylesheet lives
import { ErrorBoundary } from "./components/ErrorBoundary";
import { NotFound } from "./components/NotFound";
import Home from "./pages/Home";
// ...one import per route

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          {/* ...one <Route> per page, flatten nested layout routes unless they share real UI */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
```

`@tanstack/react-router`'s `<Link to="...">` and `<Outlet />` map directly onto `react-router-dom`'s — the prop API is compatible, so route components rarely need internal changes beyond the import source.

### 3. Create `src/components/NotFound.tsx` and `src/components/ErrorBoundary.tsx`

Port the root route's `notFoundComponent` and `errorComponent` almost verbatim. The error component becomes a class-based React error boundary (`getDerivedStateFromError` / `componentDidCatch`) since there's no server-side error response to normalize anymore — that whole `server.ts` h3-error-swallowing dance goes away entirely with the server.

### 4. Create a `useDocumentHead` hook for per-page SEO (non-home routes)

Without SSR, only `index.html`'s tags are present at initial load. Every other route needs its title/description/canonical/JSON-LD applied on mount instead:

```tsx
import { useEffect } from "react";

export function useDocumentHead({ title, description, canonical, og, jsonLd }: {
  title: string; description?: string; canonical?: string;
  og?: Record<string, string>; jsonLd?: object;
}) {
  useEffect(() => {
    document.title = title;
    // upsert <meta name="description">, <meta property="og:*">, <link rel="canonical">
    // append a <script type="application/ld+json"> and remove it on cleanup
  }, [title, description, canonical, og, jsonLd]);
}
```

Call it at the top of each page component, passing exactly the fields that used to live in that route's `head()` config. Tell the user this is a real (small) SEO trade-off versus true SSR — search engines that execute JS (Googlebot does) will still see it, but it's not present in the raw HTML response.

### 5. Migrate each route file into `src/pages/`

For each `src/routes/*.tsx`:
- Drop the `createFileRoute(...)({ ... })` wrapper entirely.
- Move its `head()` meta/links/scripts into a `useDocumentHead({...})` call at the top of the component (skip this for the page that maps to `/`, since that's already static in `index.html`).
- Change `import { createFileRoute, Link } from "@tanstack/react-router"` to `import { Link } from "react-router-dom"`.
- Export the component as `export default function PageName() { ... }`.
- A layout route that only renders `<Outlet />` with no other UI can usually be flattened away — just list its children directly in `main.tsx`'s `<Routes>` instead of nesting.
- A route that generates a non-HTML response server-side (e.g. `sitemap.xml` via a `server: { handlers: { GET: ... } }` route) should become a **static file in `public/`** if its content is fixed/hand-maintained, which is the common case for a small marketing site.

For big files, don't retype them by hand — write a small script that reads the file, slices out the known line range of the `Route` block (find it once, then remove/insert programmatically), and writes the new page file. It's faster and avoids transcription errors on files with hundreds of lines of JSX.

### 6. Delete the TanStack-only files

```
src/routes/            (whole directory, now replaced by src/pages/ + main.tsx)
src/router.tsx
src/routeTree.gen.ts
src/server.ts
src/start.ts
src/lib/error-capture.ts   (if it exists — SSR-only error recovery, not needed client-side)
src/lib/error-page.ts      (same — server-rendered HTML error page)
```

Keep any generic client-side error-reporting helper (e.g. a `reportLovableError`-style function) — that's still useful from the new `ErrorBoundary`.

### 7. Rewrite `vite.config.ts`

```ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite"; // if the project uses Tailwind v4

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(dirname, "./src") } },
});
```

Match the alias to whatever `tsconfig.json`'s `compilerOptions.paths` already declares (usually `"@/*": ["./src/*"]`) so imports don't need touching.

### 8. Update `package.json`

Remove: `@tanstack/react-router`, `@tanstack/react-start`, `@tanstack/router-plugin`, `@tanstack/react-query` (unless something other than the router actually uses it — check for `useQuery`/`QueryClientProvider` usage beyond the router context), `@lovable.dev/vite-tanstack-config`, `nitro`, `vite-tsconfig-paths` (replaced by the manual alias above).

Add: `react-router-dom`.

Scripts (`dev`/`build`/`preview`) stay the same — they're just `vite` commands either way.

### 9. Add `vercel.json` for client-side routing

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Without this, refreshing the browser on any non-root route 404s, since Vercel otherwise only serves files that exist on disk.

### 10. Clean up leftovers

- `.gitignore`: remove the Cloudflare/Wrangler section (`.wrangler/`, `.dev.vars`) and TanStack build-artifact ignores (`.output`, `.vinxi`, `.tanstack/**`, `.nitro`) that no longer apply; add `.vercel`.
- `bunfig.toml`: drop any `minimumReleaseAgeExcludes` entries that only existed for the now-removed `@lovable.dev/*` packages.
- `eslint.config.js`: drop any TanStack-Start-specific lint rules (e.g. a `no-restricted-imports` rule about the `server-only` package) — they reference a concept (server-only modules) that no longer exists in a client-only SPA.
- `package.json`'s `"name"` field is often a generic template name (e.g. `tanstack_start_ts`) — rename it to something that identifies the actual project.

## After the rewrite

Install dependencies and run the build — see Step 4 in the main `SKILL.md`. A clean `vite build` is the actual proof this worked, not just the file diff looking plausible.
