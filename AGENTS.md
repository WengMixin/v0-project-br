# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a **Macroeconomic Monitoring Dashboard** (宏观监控面板) built with Next.js 16 (App Router, Turbopack), React 19, shadcn/ui, Tailwind CSS 4, and Supabase Auth. It tracks US treasury yields, DXY, Brent oil, gold, CPI, and Fed policy data. Deployed on Vercel.

### Running the dev server

```bash
pnpm dev
```

The server starts on http://localhost:3000. API routes (`/api/*`) are excluded from auth middleware and work without Supabase credentials.

### Authentication

The middleware at `middleware.ts` → `lib/supabase/middleware.ts` requires Supabase credentials (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) and restricts access to a hardcoded email whitelist. For development without auth, access `/api/*` routes directly — they have fallback data for all external APIs.

### Environment variables

Create `.env.local` in the project root with at minimum:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

All other API keys (FRED, FMP, Tiingo, GoldAPI, Alpha Vantage, DeepSeek, Ollama, Upstash Redis) are optional — routes return fallback/hardcoded data when keys are missing.

### Lint & type-checking

- `pnpm lint` — requires ESLint (not currently in devDependencies; script exists but ESLint is not installed)
- `npx tsc --noEmit` — TypeScript type check; `next.config.mjs` has `ignoreBuildErrors: true` so known type errors don't block builds

### Build

```bash
pnpm build
```

Completes successfully despite TS errors due to `ignoreBuildErrors: true`.

### Key caveats

- The `sharp` package build script is ignored by pnpm (see warning during install) — this is fine for dev, images use `unoptimized: true` in next.config.
- Next.js 16 shows a deprecation warning about "middleware" → "proxy" convention; this is informational only and doesn't affect functionality.
- Node.js 20+ is required (uses nvm at `/home/ubuntu/.nvm`).
