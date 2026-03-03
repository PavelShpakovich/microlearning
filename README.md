# Microlearning — Flashcard App

A production-ready flashcard app built with **Next.js 15**, **Supabase**, and a unified **LLM adapter** (Groq / OpenAI / Anthropic / Ollama). Users create themes, upload learning materials, and study AI-generated flashcards. Supports Telegram Mini App integration.

---

## Tech Stack

| Layer           | Tech                                                    |
| --------------- | ------------------------------------------------------- |
| Framework       | Next.js 15, App Router, TypeScript strict               |
| Database + Auth | Supabase (PostgreSQL, RLS, Auth)                        |
| LLM             | Groq / OpenAI / Anthropic / Ollama (unified adapter)    |
| Validation      | Zod                                                     |
| Ingestion       | PDF, DOCX, URL scraping, YouTube transcript, plain text |
| Logging         | pino                                                    |
| Tests           | Jest + Testing Library                                  |
| CI              | GitHub Actions                                          |
| Deploy          | Vercel                                                  |

---

## Quick Start

### 1. Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- An API key for at least one LLM provider (or run Ollama locally)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

```env
# Supabase — find these in your project's Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key     # server-only, never expose to client

# LLM provider — choose one: groq | openai | anthropic | ollama | mock
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...

# Optional: Telegram bot token (only needed for Telegram Mini App)
TELEGRAM_BOT_TOKEN=

# App base URL
NEXTAUTH_URL=http://localhost:3000
```

> **`mock` provider** requires no API key — returns deterministic fake cards. Useful for local development and tests.

### 4. Apply the database migration

```bash
# Install Supabase CLI if needed
brew install supabase/tap/supabase

# Push migration to your remote project
supabase db push --db-url "postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"
```

Or paste the contents of [supabase/migrations/0001_initial_schema.sql](supabase/migrations/0001_initial_schema.sql) directly into the Supabase SQL editor.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Application Flow

1. **Register / Log in** — email + password via Supabase Auth.
2. **Create a theme** — e.g. "TypeScript", "Spanish Vocabulary", "History of Rome".
3. **Add data sources** — upload a PDF, paste a URL, enter text, upload a DOCX, or provide a YouTube URL. The server extracts the text automatically.
4. **Generate cards** — cards are generated automatically when you start a study session (or you can trigger generation from the theme page).
5. **Study** — flip through flashcards; the app tracks which cards you've seen today and generates more when your queue runs low (< 5 remaining).

---

## Available Scripts

```bash
npm run dev           # Start development server (http://localhost:3000)
npm run build         # Production build
npm run start         # Start production server (run build first)

npm run type-check    # TypeScript type check (no emit)
npm run lint          # ESLint (zero warnings enforced)
npm run lint:fix      # ESLint with auto-fix
npm run format        # Prettier write
npm run format:check  # Prettier check (used in CI)

npm test              # Run Jest test suite
npm run test:watch    # Jest in watch mode
npm run test:coverage # Jest with coverage report (70% line threshold)
```

---

## LLM Providers

Set `LLM_PROVIDER` in `.env.local` to switch providers. Only the relevant API key is required.

| `LLM_PROVIDER` | Required env var    | Notes                                                   |
| -------------- | ------------------- | ------------------------------------------------------- |
| `groq`         | `GROQ_API_KEY`      | Fast, free tier available                               |
| `openai`       | `OPENAI_API_KEY`    | `OPENAI_MODEL` defaults to `gpt-4o-mini`                |
| `anthropic`    | `ANTHROPIC_API_KEY` | `ANTHROPIC_MODEL` defaults to `claude-3-haiku-20240307` |
| `ollama`       | `OLLAMA_BASE_URL`   | Run `ollama serve` locally; no cloud costs              |
| `mock`         | _(none)_            | Deterministic fake cards; for tests & dev               |

---

## Data Source Types

When adding a source, choose the type that matches your content:

| Type      | Input               | Notes                                 |
| --------- | ------------------- | ------------------------------------- |
| `text`    | Paste raw text      | Simplest option                       |
| `pdf`     | Upload `.pdf` file  | Max 4.5 MB                            |
| `docx`    | Upload `.docx` file | Max 4.5 MB                            |
| `url`     | Enter a URL         | SSRF-protected; strips navigation/ads |
| `youtube` | YouTube video URL   | Fetches auto-generated transcript     |

---

## Admin Card Generator Script

Generate flashcards from the command line without going through the web UI:

```bash
cd generator
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_KEY, LLM_PROVIDER, etc.

node generate_flashcards.js --theme "TypeScript" --count 20
node generate_flashcards.js --theme "TypeScript" --count 20 --dry-run   # preview only
node generate_flashcards.js --theme "TypeScript" --count 20 --confirm   # skip prompt
```

Cards generated by this script have `user_id = null` (global/shared cards).

---

## Telegram Mini App

1. Create a bot with [@BotFather](https://t.me/BotFather) and set `TELEGRAM_BOT_TOKEN`.
2. Set the Mini App URL to your deployed Vercel URL (or use [ngrok](https://ngrok.com) for local dev).
3. Open the mini app inside Telegram — HMAC validation happens automatically on the `/api/auth/telegram` route.

---

## Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set all environment variables from `.env.example` in the Vercel dashboard under **Settings > Environment Variables**.

The [vercel.json](vercel.json) already configures:

- 60s function timeout for `/api/generate/**`
- 30s function timeout for `/api/sources/**`

---

## Project Structure

```
src/
├── app/
│   ├── api/                  # Route handlers
│   │   ├── auth/telegram/    # Telegram HMAC auth
│   │   ├── cards/            # Fetch unseen cards
│   │   ├── generate/cards/   # LLM card generation (rate-limited)
│   │   ├── session/          # Study session management
│   │   ├── sources/          # Data source upload & processing
│   │   └── themes/           # Theme CRUD
│   ├── dashboard/            # Theme list (SSR)
│   ├── login/ register/      # Auth pages
│   ├── study/[themeId]/      # Flashcard study loop
│   └── themes/new/           # Create theme
├── components/               # flashcard.tsx, telegram-provider.tsx
└── lib/
    ├── supabase/             # client / server / admin clients + types
    ├── llm/                  # Unified LLM adapter (5 providers)
    ├── ingestion/            # Extractors: text, pdf, docx, url, youtube
    ├── api/                  # withApiHandler wrapper, requireAuth
    ├── env.ts                # Zod env validation
    ├── errors.ts             # Typed error hierarchy
    ├── constants.ts          # Magic values
    └── logger.ts             # pino structured logger

supabase/migrations/          # SQL schema with RLS policies
generator/                    # CLI script for admin card generation
```
