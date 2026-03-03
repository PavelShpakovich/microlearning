-- ============================================================
-- Microlearning app — initial schema
-- Run this in the Supabase SQL editor or via supabase db push
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Profiles (linked to auth.users) ─────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  telegram_id   text unique,
  display_name  text,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: owner read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: owner update"
  on public.profiles for update
  using (auth.uid() = id);

-- ─── Themes ───────────────────────────────────────────────────
create table if not exists public.themes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) <= 100),
  description text check (char_length(description) <= 500),
  created_at  timestamptz not null default now()
);

alter table public.themes enable row level security;

create policy "themes: owner all"
  on public.themes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_themes_user_id on public.themes(user_id);

-- ─── Data sources ─────────────────────────────────────────────
create table if not exists public.data_sources (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  theme_id        uuid not null references public.themes(id) on delete cascade,
  type            text not null check (type in ('text', 'pdf', 'docx', 'url', 'youtube')),
  name            text not null check (char_length(name) <= 200),
  storage_path    text,
  raw_url         text,
  extracted_text  text,
  status          text not null default 'pending'
                    check (status in ('pending', 'processing', 'ready', 'error')),
  created_at      timestamptz not null default now()
);

alter table public.data_sources enable row level security;

create policy "data_sources: owner all"
  on public.data_sources for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_data_sources_user_theme
  on public.data_sources(user_id, theme_id);

-- ─── Cards (microlearning content) ───────────────────────────
create table if not exists public.cards (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,  -- null = global/admin card
  theme_id   uuid references public.themes(id) on delete cascade,
  source_id  uuid references public.data_sources(id) on delete set null,
  title      text not null check (char_length(title) >= 1),    -- ≤ 10 words headline
  body       text not null check (char_length(body) >= 1),     -- 2–4 sentence explanation
  topic      text,
  created_at timestamptz not null default now()
);

alter table public.cards enable row level security;

-- Owner can manage their own cards
create policy "cards: owner all"
  on public.cards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Every authenticated user can read global cards (user_id IS NULL)
create policy "cards: read global"
  on public.cards for select
  using (auth.role() = 'authenticated' and user_id is null);

create index if not exists idx_cards_user_theme
  on public.cards(user_id, theme_id);

-- ─── Sessions ─────────────────────────────────────────────────
create table if not exists public.sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  theme_id   uuid not null references public.themes(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.sessions enable row level security;

create policy "sessions: owner all"
  on public.sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_sessions_user_theme
  on public.sessions(user_id, theme_id);

-- ─── Session cards (join: which cards seen in which session) ──
create table if not exists public.session_cards (
  session_id uuid not null references public.sessions(id) on delete cascade,
  card_id    uuid not null references public.cards(id) on delete cascade,
  seen_at    timestamptz not null default now(),
  primary key (session_id, card_id)
);

alter table public.session_cards enable row level security;

create policy "session_cards: owner all"
  on public.session_cards for all
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

-- Critical performance index for the "unseen cards" query
create index if not exists idx_session_cards_session_card
  on public.session_cards(session_id, card_id);

-- ─── Storage bucket for source files ─────────────────────────
-- Run separately in Supabase dashboard or storage API:
-- insert into storage.buckets (id, name, public) values ('sources', 'sources', false);
