# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # dev server on port 3000
pnpm build        # production build (outputs to .output/)
pnpm preview      # preview production build
pnpm test         # run tests with vitest
```

Run a single test file:
```bash
pnpm vitest run src/path/to/file.test.ts
```

Production server (after build):
```bash
node .output/server/index.mjs
```

## Environment

Requires `OPENAI_API_KEY` (see `.env.example`). In Docker, pass `CODEX_AUTH_JSON` to inject Codex auth credentials at `/root/.codex/auth.json`.

## Architecture

This is a **TanStack Start** (SSR) app using file-based routing, deployed via a **Nitro** server adapter.

**Key layers:**

- `src/routes/` — file-based routes; TanStack Router auto-generates `src/routeTree.gen.ts` from this directory — never edit that file manually.
- `src/routes/__root.tsx` — shell layout (`<html>`, `<head>`, `<body>`); anything rendered here wraps every route.
- `src/router.tsx` — router instantiation; router options (preload strategy, scroll restoration) live here.
- `src/server/` — server functions (`createServerFn`) that run exclusively on the server. Currently `chat.ts` wraps the `@openai/codex-sdk` `Codex` client to execute agent threads.

**Data flow for the chat feature (index route):**

1. `src/routes/index.tsx` — client component holds message state and calls `sendMessage` (a server function).
2. `src/server/chat.ts` — `sendMessage` creates a new Codex thread per request, runs the user message, and returns `finalResponse`.

**Path aliases:**

- `#/*` and `@/*` both resolve to `./src/*`.

**Styling:** Tailwind v4 via `@tailwindcss/vite`. Global base styles are in `src/styles.css`; no config file — Tailwind v4 is configuration-free by default.

**TypeScript:** strict mode with `noUnusedLocals`, `noUnusedParameters`, and `verbatimModuleSyntax` enabled.
