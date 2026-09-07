<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Finora — Base44 dev setup

Finora is a Next.js 16 (App Router, Turbopack) personal-finance dashboard backed by
**Supabase** (managed Postgres + Auth). It runs as a single Next.js process; there
is no separate backend service. Auth uses `@supabase/ssr` cookie sessions via the
middleware in `src/proxy.ts`.

## Running here

- `docker compose -f docker-compose.base44.yml up -d` starts the dev server
  (`npx next dev -p 3000 -H 0.0.0.0`) on host port 3000, bind-mounted from the
  repo root. Edits hot-reload via Turbopack.
- Dependencies install at container start (`npm install`); `node_modules` and
  `.next` live in anonymous volumes so the bind mount doesn't clobber them.

## Secrets (external — Supabase)

The app connects to a **remote** Supabase project; it does not run a local
Postgres/Supabase stack. Required env vars (delivered via `/run/base44/app.env`):

- `NEXT_PUBLIC_SUPABASE_URL` — required at boot (client + middleware use it).
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — anon key, required at boot.
- `SUPABASE_SERVICE_ROLE_KEY` — only needed for the "Try Demo Dashboard" seed
  and the recurring-transaction cron; `createAdminClient()` returns null without it.
- `CRON_SECRET` — authenticates `POST /api/recurring/generate` only.

`.env.base44-defaults` holds placeholder values so the app boots and renders the
landing/login pages before real credentials arrive; `/run/base44/app.env` overrides
them (it is listed last in `env_file`).

## Preview origin

`next.config.ts` sets `allowedDevOrigins` from `BASE44_PUBLIC_HOST_SUFFIX` (bare
hostname, no scheme — Next matches on hostname). Without it, `_next/static`
chunks and HMR are blocked cross-origin and the page renders without JS.

## Database / migrations

SQL migrations live in `supabase/migrations/`. They must be applied to the
remote Supabase project (via the Supabase dashboard or CLI) — they are NOT run by
the compose setup. The demo account (`demo@finora.app`) is seeded on first use of
the "Try Demo Dashboard" button and needs the service role key.

## Verify it works

- `curl -sf -H "Host: <preview-host>" http://localhost:3000/` returns the landing
  page HTML (contains "Finora").
- A `_next/static/chunks/*.js` request returns 200 through the same host.
- `/login` renders the login form; "Try Demo Dashboard" seeds + signs in a demo
  user (requires `SUPABASE_SERVICE_ROLE_KEY`).
