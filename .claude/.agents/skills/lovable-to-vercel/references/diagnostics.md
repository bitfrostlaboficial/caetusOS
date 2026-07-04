# Diagnosing the deployment target

Run these checks before touching anything. Each one is cheap and doesn't require installing dependencies.

## 1. Is this actually a Lovable export?

```bash
cat .lovable/project.json 2>/dev/null
grep -l "LOVABLE:BEGIN" AGENTS.md 2>/dev/null
grep -n "@lovable.dev" package.json 2>/dev/null
```

`.lovable/project.json`'s `template` field tells you which Lovable template this is (e.g. `tanstack_start_ts_current`). That's the one known to default to Cloudflare.

## 2. What does the Vite config actually target?

```bash
cat vite.config.ts
```

Look for an import from `@lovable.dev/vite-tanstack-config`. Read its own comments — the template's config file usually states its defaults directly, something like:

> nitro (build-only using cloudflare as a default target)

If you see that, the build is not Vercel-ready without an override, regardless of what `package.json` lists as dependencies.

## 3. What does the server entry expect?

```bash
find src -iname "server.ts" -o -iname "server.tsx"
cat src/server.ts 2>/dev/null
```

Cloudflare Workers modules export a handler shaped like:

```ts
export default {
  async fetch(request: Request, env: unknown, ctx: unknown) { ... }
};
```

The three-argument `(request, env, ctx)` signature is Cloudflare-specific — `env` carries Worker bindings, `ctx` is the `ExecutionContext`. Vercel's Node/Edge functions don't use this shape. Finding this confirms the server code itself (not just the build config) was written for Cloudflare's runtime.

## 4. What does `.gitignore` assume?

```bash
grep -n "wrangler\|\.dev\.vars\|cloudflare" .gitignore
grep -n "\.vercel" .gitignore
```

A dedicated `# Wrangler / Cloudflare` section with no `.vercel` entry is a strong signal — templates that actually expect Vercel almost always gitignore `.vercel` by convention (created by `vercel link`/`vercel dev`).

## 5. Does it actually need a server at all?

```bash
grep -rn "createServerFn\|loader:\|beforeLoad\|serverOnly\|server: *{ *handlers" src
```

No matches → the project is static content wrapped in SSR machinery for no functional reason. This is the deciding factor for Path B vs Path A in the main SKILL.md — don't skip this check, it's the one that tells you how big the fix needs to be.

## 6. Any env vars the deploy needs to know about?

```bash
grep -rn "process\.env\.\|import\.meta\.env\." src
```

If this comes back empty, there's nothing to configure on Vercel's environment variables screen. If it doesn't, list every variable found and tell the user they'll need to set them in the Vercel project settings — don't let this surface as a runtime error after deploy.
