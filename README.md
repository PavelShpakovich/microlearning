# Clario Astrology — Monorepo

Clario Astrology is a `pnpm` monorepo for the Clario Astrology product. It contains a **Next.js web app**, an **Expo/React Native mobile app for iOS and Android**, shared TypeScript packages, and the Supabase schema used by both clients.

Users can create natal charts, generate readings, compare chart compatibility, get daily forecasts, buy credits, and ask follow-up questions in a reading-specific chat.

The most accurate engineering overview currently lives in [docs/system-context.md](docs/system-context.md). Product-direction notes remain in [docs/pivots/ai-astrology-pivot.md](docs/pivots/ai-astrology-pivot.md).

---

## Tech Stack

| Layer           | Tech                                                                        |
| --------------- | --------------------------------------------------------------------------- |
| Web app         | Next.js 16, App Router, React 19, TypeScript strict                         |
| Mobile app      | Expo SDK 51, React Native 0.74, Expo Router                                 |
| Database + Auth | Supabase (PostgreSQL, RLS, Auth)                                            |
| Web session     | NextAuth.js (JWT cookie)                                                    |
| LLM             | Qwen API, mock mode                                                         |
| Validation      | Zod                                                                         |
| Shared packages | `@clario/api-client`, `@clario/i18n`, `@clario/types`, `@clario/validation` |
| i18n            | Shared messages for web and mobile                                          |
| Logging         | pino                                                                        |
| Tests           | Jest + Testing Library                                                      |
| Deploy          | Vercel (web), native iOS/Android builds via Expo/native projects            |

---

## Workspace Apps

| Path          | Purpose                                                                            |
| ------------- | ---------------------------------------------------------------------------------- |
| `apps/web`    | Public landing, auth, dashboard, charts, readings, compatibility, forecasts, admin |
| `apps/mobile` | Native mobile client for iOS and Android                                           |
| `packages/*`  | Shared API client, i18n messages, validation, and types                            |
| `supabase`    | SQL migrations and backend database schema                                         |

---

## Quick Start

### 1. Prerequisites

- Node.js 20+
- `pnpm` 10+
- A [Supabase](https://supabase.com) project
- A Qwen API key

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

Create `.env.local` and fill in:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# NextAuth
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-strong-random-secret

# LLM
LLM_PROVIDER=qwen
QWEN_API_KEY=your-qwen-key
QWEN_MODEL=qwen-plus

# Optional if using a custom compatible endpoint
# QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1

# Support / email
SUPPORT_EMAIL=support@example.com
RESEND_API_KEY=your-resend-key
RESEND_FROM_EMAIL=no-reply@example.com

# Admin / jobs
ADMIN_EMAILS=admin@example.com
CRON_SECRET=replace-with-random-secret

# Maps
NEXT_PUBLIC_YANDEX_MAPS_KEY=your-yandex-maps-key
```

`mock` remains available for deterministic local development and tests.

### 4. Apply database migrations

```bash
# Install Supabase CLI if needed
brew install supabase/tap/supabase

# Reset a local database from the current astrology baseline
supabase db reset

# Or push the current baseline to a clean remote project
supabase db push --db-url "postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"
```

The repository now keeps a single destructive baseline migration for the astrology product in `supabase/migrations/`. It is intended for a reset local database or a clean remote project.

### 5. Run the development server

```bash
pnpm dev:web
```

Open [http://localhost:3000](http://localhost:3000).

To run the mobile app:

```bash
pnpm dev:mobile
```

Useful app-specific commands:

```bash
pnpm --filter @clario/mobile ios
pnpm --filter @clario/mobile android
pnpm --filter @clario/web dev
```

---

## Documentation

- [docs/system-context.md](docs/system-context.md) — current engineering reference for implementation details and feature behavior
- [docs/pivots/ai-astrology-pivot.md](docs/pivots/ai-astrology-pivot.md) — product-direction and rewrite-planning document
- [docs/auth-account-management.md](docs/auth-account-management.md) — current auth, verification, and reset-flow behavior across web and mobile
- [docs/mobile-in-app-purchases-plan.md](docs/mobile-in-app-purchases-plan.md) — implementation plan for App Store / Google Play credit purchases
- [docs/future-improvements.md](docs/future-improvements.md) — tracked technical debt and follow-up improvements

---

## How It Works

### Authentication

- Users sign in on web and mobile with email + password
- Web sessions are handled through NextAuth JWT cookies
- Mobile uses the Supabase session directly
- Email verification and password-reset flows are supported on both platforms
- Protected routes are enforced in middleware and server/API guards

### Core Flow

1. Create an account and sign in.
2. Enter birth data and create a natal chart.
3. The server calculates chart snapshots, positions, and aspects.
4. Generate a structured reading, compatibility report, or daily forecast.
5. Ask follow-up questions in a chat tied to a specific reading.
6. Return to saved charts and generated content from the dashboard.

---

## Available Scripts

```bash
pnpm dev                    # Run repo dev tasks through Turbo
pnpm dev:web                # Start the web app
pnpm dev:mobile             # Start Expo for the mobile app
pnpm build                  # Build all buildable workspace targets
pnpm type-check             # Type-check the workspace
pnpm lint                   # Lint the workspace
pnpm format                 # Prettier write
pnpm format:check           # Prettier check
pnpm test                   # Run workspace tests

pnpm --filter @clario/web test
pnpm --filter @clario/web test:watch
pnpm --filter @clario/web test:coverage
pnpm --filter @clario/mobile type-check
pnpm --filter @clario/mobile lint
```

---

## LLM Runtime

Set `LLM_PROVIDER` in `.env.local`.

| `LLM_PROVIDER` | Required env var | Notes                                         |
| -------------- | ---------------- | --------------------------------------------- |
| `qwen`         | `QWEN_API_KEY`   | Production provider via OpenAI-compatible API |
| `mock`         | _(none)_         | Deterministic fake outputs for tests and dev  |

---

## Main Features

- natal chart creation and recalculation
- structured readings for multiple reading types
- compatibility reports (synastry)
- daily personal forecasts
- follow-up chat tied to a reading
- credits, packs, and purchase history
- calendar and dashboard views
- admin user and analytics surfaces

---

## Deployment (Vercel)

```bash
npm i -g vercel
vercel --prod
```

Set all environment variables in the Vercel dashboard under **Settings > Environment Variables**.

`vercel.json` configures runtime limits for active API surfaces and scheduled cleanup jobs.

---

## Project Structure

```
apps/
├── web/                      # Next.js web application
│   └── src/
│       ├── app/              # Routes, pages, API routes, metadata
│       ├── components/       # Web UI components
│       ├── lib/              # Domain logic, auth, generation, credits
│       └── i18n/             # next-intl wiring
├── mobile/                   # Expo / React Native application
│   └── src/
│       ├── app/              # Expo Router screens
│       ├── components/       # Native UI components
│       └── lib/              # Mobile auth, i18n, notifications, forms
packages/
├── api-client/               # Shared HTTP client for web/mobile
├── i18n/                     # Shared translation messages
├── types/                    # Shared domain types/constants
└── validation/               # Shared Zod validation and helpers
supabase/
└── migrations/               # Database schema and product migrations
```

## Notes

- The source of truth is the current codebase, not older product notes.
- If README and implementation ever disagree, prefer the code and update the README.
- `apps/mobile` is aligned to Expo SDK 55 and its native projects can be regenerated with `npx expo prebuild --no-install --clean`.
