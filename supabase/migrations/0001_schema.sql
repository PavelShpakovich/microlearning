-- ============================================================
-- Microlearning — consolidated schema
-- Replaces migrations 0001–0015 for a clean-slate deployment.
-- Apply with: supabase db reset
-- ============================================================

-- ─── Extensions ───────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Profiles ─────────────────────────────────────────────────
create table public.profiles (
  id              uuid        primary key references auth.users(id) on delete cascade,
  telegram_id     text        unique,
  display_name    text,
  streak_count    int         not null default 0,
  last_study_date date,
  ui_language     text        not null default 'en'
                                check (ui_language in ('en', 'ru')),
  is_admin        boolean     not null default false,
  created_at      timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: owner read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: owner update"
  on public.profiles for update
  using (auth.uid() = id);

create index idx_profiles_is_admin     on public.profiles(is_admin);
create index idx_profiles_ui_language  on public.profiles(ui_language);

-- ─── Themes ───────────────────────────────────────────────────
create table public.themes (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references auth.users(id) on delete cascade,
  name                  text        not null check (char_length(name) <= 100),
  description           text        check (char_length(description) <= 500),
  language              text        not null default 'en'
                                      check (language in ('en', 'ru')),
  is_public             boolean     not null default false,
  generation_started_at timestamptz,
  generation_failed_at  timestamptz,
  created_at            timestamptz not null default now()
);

alter table public.themes enable row level security;

create policy "themes: owner all"
  on public.themes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "themes: read public"
  on public.themes for select
  using (is_public = true);

create index idx_themes_user_id  on public.themes(user_id);
create index idx_themes_language on public.themes(language);

-- ─── Data sources ─────────────────────────────────────────────
create table public.data_sources (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  theme_id       uuid        not null references public.themes(id) on delete cascade,
  type           text        not null check (type in ('text', 'pdf', 'docx', 'url', 'youtube')),
  name           text        not null check (char_length(name) <= 200),
  storage_path   text,
  raw_url        text,
  extracted_text text,
  status         text        not null default 'pending'
                               check (status in ('pending', 'processing', 'ready', 'error')),
  created_at     timestamptz not null default now()
);

alter table public.data_sources enable row level security;

create policy "data_sources: owner all"
  on public.data_sources for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_data_sources_user_theme on public.data_sources(user_id, theme_id);

-- ─── Cards ────────────────────────────────────────────────────
create table public.cards (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references auth.users(id) on delete cascade,   -- null = global card
  theme_id   uuid        references public.themes(id) on delete cascade,
  source_id  uuid        references public.data_sources(id) on delete set null,
  title      text        not null check (char_length(title) >= 1),
  body       text        not null check (char_length(body) >= 1),
  topic      text,
  is_public  boolean     not null default false,
  created_at timestamptz not null default now()
);

alter table public.cards enable row level security;

create policy "cards: owner all"
  on public.cards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "cards: read public"
  on public.cards for select
  using (is_public = true);

create policy "cards: read global"
  on public.cards for select
  using (auth.role() = 'authenticated' and user_id is null);

create index idx_cards_user_theme on public.cards(user_id, theme_id);

-- ─── Sessions ─────────────────────────────────────────────────
create table public.sessions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  theme_id   uuid        not null references public.themes(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.sessions enable row level security;

create policy "sessions: owner all"
  on public.sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_sessions_user_theme on public.sessions(user_id, theme_id);

-- ─── Session cards ────────────────────────────────────────────
create table public.session_cards (
  session_id uuid        not null references public.sessions(id) on delete cascade,
  card_id    uuid        not null references public.cards(id) on delete cascade,
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

create index idx_session_cards_session_card on public.session_cards(session_id, card_id);

-- ─── Bookmarked cards ─────────────────────────────────────────
create table public.bookmarked_cards (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  card_id    uuid        not null references public.cards(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, card_id)
);

alter table public.bookmarked_cards enable row level security;

create policy "bookmarked_cards: owner read"
  on public.bookmarked_cards for select
  using (auth.uid() = user_id);

create policy "bookmarked_cards: owner insert"
  on public.bookmarked_cards for insert
  with check (auth.uid() = user_id);

create policy "bookmarked_cards: owner delete"
  on public.bookmarked_cards for delete
  using (auth.uid() = user_id);

create index idx_bookmarked_cards_user_id on public.bookmarked_cards(user_id);
create index idx_bookmarked_cards_card_id on public.bookmarked_cards(card_id);

-- ─── Subscription plans ───────────────────────────────────────
create table public.subscription_plans (
  id                   text        primary key,
  name                 text        not null,
  description          text,
  price_monthly        integer     not null,  -- cents
  price_annual         integer     not null,  -- cents
  cards_per_month      integer     not null,
  max_themes           integer,               -- null = unlimited
  community_themes     boolean     not null default false,
  max_community_themes integer     not null default 0,
  features             jsonb       not null default '{}',
  created_at           timestamptz not null default now()
);

alter table public.subscription_plans enable row level security;

create policy "plans: public read"
  on public.subscription_plans for select
  using (true);

insert into public.subscription_plans
  (id, name, description, price_monthly, price_annual,
   cards_per_month, max_themes, community_themes, max_community_themes, features)
values
  ('free',
   'Free',    'Get started with microlearning',
   0,    0,    50,   5,    false, 0,
   '{"features":["50 cards per month","Up to 5 themes"]}'),

  ('basic',
   'Starter', 'For growing learners',
   499,  4790, 300,  20,   true,  5,
   '{"features":["300 cards per month","Up to 20 themes"]}'),

  ('pro',
   'Pro',     'Powerful learning',
   1299, 12490, 2000, null, true,  10,
   '{"features":["2,000 cards per month","Unlimited themes"]}'),

  ('max',
   'Max',     'For power learners',
   2499, 24490, 5000, null, true,  50,
   '{"features":["5,000 cards per month","Unlimited themes"]}');

-- ─── User subscriptions ───────────────────────────────────────
create table public.user_subscriptions (
  id                   uuid        primary key default gen_random_uuid(),
  user_id              uuid        not null unique references auth.users(id) on delete cascade,
  plan_id              text        not null references public.subscription_plans(id),
  status               text        not null default 'active'
                                     check (status in ('active', 'cancelled', 'expired')),
  current_period_start timestamptz not null default now(),
  current_period_end   timestamptz not null default (now() + interval '30 days'),
  auto_renew           boolean     not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.user_subscriptions enable row level security;

create policy "user_subscriptions: owner read"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

create index idx_user_subscriptions_user_id on public.user_subscriptions(user_id);
create index idx_user_subscriptions_status  on public.user_subscriptions(status);

-- ─── User usage ───────────────────────────────────────────────
create table public.user_usage (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  cards_generated integer     not null default 0,
  cards_limit     integer     not null,
  period_start    timestamptz not null,
  period_end      timestamptz not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, period_start)
);

alter table public.user_usage enable row level security;

create policy "user_usage: owner read"
  on public.user_usage for select
  using (auth.uid() = user_id);

create index idx_user_usage_user_id      on public.user_usage(user_id);
create index idx_user_usage_period_range on public.user_usage(user_id, period_start, period_end);

-- ─── Functions ────────────────────────────────────────────────

-- Atomically increments a user's card usage for the current period,
-- creating the period record if it doesn't exist yet.
create or replace function public.increment_card_usage(p_user_id uuid, p_count int)
returns void
language plpgsql
as $$
declare
  v_rows_updated int;
  v_period_start timestamptz;
  v_period_end   timestamptz;
  v_cards_limit  int;
begin
  update user_usage
  set
    cards_generated = coalesce(cards_generated, 0) + p_count,
    updated_at      = now()
  where user_id     = p_user_id
    and period_start <= now()
    and period_end   >= now();

  get diagnostics v_rows_updated = row_count;

  if v_rows_updated = 0 then
    select current_period_start into v_period_start
    from user_subscriptions
    where user_id = p_user_id;

    v_period_start := coalesce(v_period_start, now());
    v_period_end   := v_period_start + interval '30 days';

    select sp.cards_per_month into v_cards_limit
    from user_subscriptions us
    join subscription_plans sp on us.plan_id = sp.id
    where us.user_id = p_user_id and us.status = 'active';

    v_cards_limit := coalesce(v_cards_limit, 20);

    insert into user_usage (user_id, cards_generated, cards_limit, period_start, period_end)
    values (p_user_id, p_count, v_cards_limit, v_period_start, v_period_end)
    on conflict (user_id, period_start) do update
      set cards_generated = user_usage.cards_generated + excluded.cards_generated,
          updated_at      = now();
  end if;
end;
$$;

-- Returns the active plan for a user.
create or replace function public.get_user_plan(p_user_id uuid)
returns table (plan_id text, cards_per_month integer)
language plpgsql
as $$
begin
  return query
    select sp.id, sp.cards_per_month
    from user_subscriptions us
    join subscription_plans sp on us.plan_id = sp.id
    where us.user_id = p_user_id and us.status = 'active'
    limit 1;
end;
$$;

-- Returns the current usage totals for a user.
create or replace function public.get_user_usage(p_user_id uuid)
returns table (cards_generated integer, cards_limit integer, cards_remaining integer)
language plpgsql
as $$
begin
  return query
    select
      uu.cards_generated,
      uu.cards_limit,
      (uu.cards_limit - uu.cards_generated) as cards_remaining
    from user_usage uu
    where uu.user_id = p_user_id
      and uu.period_start <= now()
      and uu.period_end   >  now()
    limit 1;
end;
$$;
