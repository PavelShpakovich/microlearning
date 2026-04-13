# Clario — AI Astrology Workspace

An AI-powered astrology application built with **Next.js**, **Supabase**, and a structured reading pipeline that can run through **Qwen**, **Ollama**, or mock mode. Users work primarily in the web app, while the **Telegram Mini App** remains a companion surface for quick access.

The canonical rewrite and product documentation now lives in [docs/pivots/ai-astrology-pivot.md](docs/pivots/ai-astrology-pivot.md).

---

## Tech Stack

| Layer           | Tech                                                   |
| --------------- | ------------------------------------------------------ |
| Framework       | Next.js 16, App Router, TypeScript strict              |
| Database + Auth | Supabase (PostgreSQL, RLS, Auth)                       |
| Session         | NextAuth.js (JWT cookie)                               |
| LLM             | Qwen API, Ollama OpenAI-compatible endpoint, mock mode |
| Validation      | Zod                                                    |
| Ingestion       | Birth data intake, chart snapshots, structured prompts |
| i18n            | next-intl (English + Russian)                          |
| Logging         | pino                                                   |
| Tests           | Jest + Testing Library                                 |
| Deploy          | Vercel                                                 |

---

## Quick Start

### 1. Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A Telegram bot (create via [@BotFather](https://t.me/BotFather))
- A Qwen API key or a local Ollama instance

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-strong-random-secret

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
NEXT_PUBLIC_TELEGRAM_BOT_URL=https://t.me/your_bot

# LLM
LLM_PROVIDER=qwen
QWEN_API_KEY=your-qwen-key
QWEN_MODEL=qwen-plus

# Or use Ollama instead
# LLM_PROVIDER=ollama
# OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
# OLLAMA_MODEL=llama3.1
```

> `mock` remains available for deterministic local development and tests.

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
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Telegram remains available as a companion Mini App once the bot is configured.

---

## Documentation

- [docs/pivots/ai-astrology-pivot.md](docs/pivots/ai-astrology-pivot.md) — single source of truth for rewrite status, product direction, backlog, architecture, and launch criteria

---

## How It Works

### Authentication

The app is **web-first with Telegram as companion**.

- Users can sign in on the web with email + password
- `initData` from `window.Telegram.WebApp` is still HMAC-verified on the server (`/api/auth/telegram`)
- Telegram accounts can be linked to existing web accounts from Settings
- NextAuth issues a 30-day JWT cookie scoped to that user

### Core Flow

1. **Open the web app** or launch the Telegram companion Mini App.
2. **Enter birth data** and complete onboarding for a chart profile.
3. **Build a chart snapshot** from structured birth details.
4. **Generate a reading** with the Qwen-based structured interpretation pipeline.
5. **Return to saved charts and readings** from the dashboard.

---

## Available Scripts

```bash
npm run dev           # Start development server
npm run build         # Production build
npm run start         # Start production server

npm run type-check    # TypeScript type check
npm run lint          # ESLint (zero warnings enforced)
npm run lint:fix      # ESLint with auto-fix
npm run format        # Prettier write
npm run format:check  # Prettier check

npm test              # Run Jest test suite
npm run test:watch    # Jest in watch mode
npm run test:coverage # Jest with coverage report
```

---

## LLM Runtime

Set `LLM_PROVIDER` in `.env.local`.

| `LLM_PROVIDER` | Required env var | Notes                                             |
| -------------- | ---------------- | ------------------------------------------------- |
| `qwen`         | `QWEN_API_KEY`   | Default hosted provider                           |
| `ollama`       | `OLLAMA_MODEL`   | Local or self-hosted OpenAI-compatible endpoint   |
| `mock`         | _(none)_         | Deterministic fake readings for tests & local dev |

---

## Domain Model

The active product revolves around:

- chart profiles
- chart snapshots
- positions and aspects
- structured readings
- user preferences
- Telegram-linked access as a companion flow

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
src/
├── app/
│   ├── api/
│   │   ├── admin/            # Admin user management
│   │   ├── auth/             # NextAuth + Telegram HMAC auth
│   │   ├── cron/             # Scheduled jobs
│   │   ├── charts/           # Chart creation and retrieval
│   │   ├── profile/          # Profile updates
│   │   ├── readings/         # Structured reading generation
│   │   ├── telegram/         # Telegram companion bot + webhook
│   │   └── tg/               # Telegram entry surfaces
│   ├── admin/                # Admin panel
│   ├── charts/               # Chart library and detail views
│   ├── dashboard/            # Main astrology workspace
│   ├── onboarding/           # Birth data intake
│   ├── readings/             # Reading library
│   ├── settings/             # User settings
│   ├── tg/                   # Telegram Mini App entry point
│   └── page.tsx              # Landing page
├── components/
├── hooks/
├── i18n/                     # next-intl messages (en, ru)
├── lib/
│   ├── supabase/             # Supabase clients + generated types
│   ├── llm/                  # Qwen-based structured generation
│   ├── astrology/            # Chart domain logic
│   ├── readings/             # Reading prompts and schemas
│   └── env.ts                # Zod environment validation
└── services/                 # Client-side API wrappers

supabase/migrations/          # SQL baseline for the astrology product
```
