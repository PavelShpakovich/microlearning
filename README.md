# Clario — AI Flashcard App

An AI-powered flashcard app built with **Next.js 15**, **Supabase**, and a unified **LLM adapter**. Users access the app through the **Telegram Mini App** — they create themes, upload learning materials, and study AI-generated flashcards.

---

## Tech Stack

| Layer           | Tech                                                 |
| --------------- | ---------------------------------------------------- |
| Framework       | Next.js 15, App Router, TypeScript strict            |
| Database + Auth | Supabase (PostgreSQL, RLS, Auth)                     |
| Session         | NextAuth.js (JWT cookie)                             |
| LLM             | Groq / OpenAI / Anthropic / Ollama (unified adapter) |
| Validation      | Zod                                                  |
| Ingestion       | PDF, DOCX, URL scraping, plain text                  |
| Payments        | Telegram Stars                                       |
| i18n            | next-intl (English + Russian)                        |
| Logging         | pino                                                 |
| Tests           | Jest + Testing Library                               |
| Deploy          | Vercel                                               |

---

## Quick Start

### 1. Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A Telegram bot (create via [@BotFather](https://t.me/BotFather))
- An API key for at least one LLM provider (or run Ollama locally)

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

# LLM — choose one: groq | openai | anthropic | ollama | mock
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...
```

> **`mock` provider** requires no API key — returns deterministic fake cards. Useful for local development and tests.

### 4. Apply database migrations

```bash
# Install Supabase CLI if needed
brew install supabase/tap/supabase

# Push all migrations to your remote project
supabase db push --db-url "postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"
```

Migrations are in `supabase/migrations/` and must be applied in order.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) or open the mini app inside Telegram.

---

## How It Works

### Authentication

The app is **Telegram-first**. Web login/registration is disabled by default (`WEB_AUTH_ENABLED: false` in `src/lib/feature-flags.ts`).

- Users open the app via the Telegram Mini App
- `initData` from `window.Telegram.WebApp` is HMAC-verified on the server (`/api/auth/telegram`)
- A stub Supabase account is created on first visit (`telegram_{id}@noreply.*`)
- NextAuth issues a 30-day JWT cookie scoped to that user

Web users (legacy) can still log in with email + password and link their Telegram account from Settings.

### Core Flow

1. **Open the Mini App** in Telegram — auto-authenticated via HMAC.
2. **Create a theme** — e.g. "TypeScript", "Spanish Vocabulary".
3. **Add sources** — upload a PDF/DOCX, paste a URL, or enter text.
4. **Study** — flashcards are AI-generated and served in sessions; more are generated on-demand when your queue runs low.

### Subscriptions & Payments

Plans are enforced via Supabase and checked server-side. Payments are processed through **Telegram Stars** (`/api/telegram/` webhook). Plans: Free → Starter → Pro → Max.

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

## LLM Providers

Set `LLM_PROVIDER` in `.env.local`. Only the relevant API key is required.

| `LLM_PROVIDER` | Required env var    | Notes                                                   |
| -------------- | ------------------- | ------------------------------------------------------- |
| `groq`         | `GROQ_API_KEY`      | Fast, free tier available                               |
| `openai`       | `OPENAI_API_KEY`    | `OPENAI_MODEL` defaults to `gpt-4o-mini`                |
| `anthropic`    | `ANTHROPIC_API_KEY` | `ANTHROPIC_MODEL` defaults to `claude-3-haiku-20240307` |
| `ollama`       | `OLLAMA_BASE_URL`   | Run `ollama serve` locally; no cloud costs              |
| `mock`         | _(none)_            | Deterministic fake cards; for tests & dev               |

---

## Data Source Types

| Type   | Input               | Notes                                 |
| ------ | ------------------- | ------------------------------------- |
| `text` | Paste raw text      | Simplest option                       |
| `pdf`  | Upload `.pdf` file  | Max 4.5 MB                            |
| `docx` | Upload `.docx` file | Max 4.5 MB                            |
| `url`  | Enter a URL         | SSRF-protected; strips navigation/ads |

---

## Deployment (Vercel)

```bash
npm i -g vercel
vercel --prod
```

Set all environment variables in the Vercel dashboard under **Settings > Environment Variables**.

`vercel.json` configures:

- 60s function timeout for `/api/generate/**`
- 30s function timeout for `/api/sources/**`

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── admin/            # Admin user management
│   │   ├── auth/             # NextAuth + Telegram HMAC auth
│   │   ├── cards/            # Fetch unseen cards
│   │   ├── cron/             # Scheduled jobs
│   │   ├── generate/         # LLM card generation
│   │   ├── profile/          # Profile updates
│   │   ├── session/          # Study session management
│   │   ├── sources/          # Source upload & ingestion
│   │   ├── telegram/         # Telegram Stars payment webhook
│   │   └── themes/           # Theme CRUD
│   ├── admin/                # Admin panel
│   ├── dashboard/            # Theme list
│   ├── settings/             # User settings & plan
│   ├── study/[themeId]/      # Flashcard study loop
│   ├── tg/                   # Telegram Mini App entry point
│   └── themes/               # Theme creation & management
├── components/
├── hooks/
├── i18n/                     # next-intl messages (en, ru)
├── lib/
│   ├── supabase/             # Supabase clients + generated types
│   ├── llm/                  # Unified LLM adapter
│   ├── ingestion/            # Source text extractors
│   ├── feature-flags.ts      # Code-based feature toggles
│   ├── plan-limits.ts        # Subscription plan definitions
│   └── env.ts                # Zod environment validation
└── services/                 # Client-side API wrappers

supabase/migrations/          # SQL migrations (apply in order)
```
