-- Destructive astrology baseline reset.
--
-- This migration intentionally rebuilds the public product schema from scratch
-- for the astrology pivot. Apply it only to a reset local database or to an
-- environment where wiping legacy product data is acceptable.

create extension if not exists "pgcrypto";

drop function if exists public.increment_card_usage(uuid, int) cascade;
drop function if exists public.get_user_plan(uuid) cascade;
drop function if exists public.get_user_usage(uuid) cascade;
drop function if exists public.reset_monthly_usage() cascade;
drop function if exists public.initialize_user_usage() cascade;

drop table if exists public.generation_logs cascade;
drop table if exists public.prompt_templates cascade;
drop table if exists public.usage_counters cascade;
drop table if exists public.forecasts cascade;
drop table if exists public.compatibility_reports cascade;
drop table if exists public.follow_up_messages cascade;
drop table if exists public.follow_up_threads cascade;
drop table if exists public.reading_sections cascade;
drop table if exists public.readings cascade;
drop table if exists public.chart_aspects cascade;
drop table if exists public.chart_positions cascade;
drop table if exists public.chart_snapshots cascade;
drop table if exists public.charts cascade;
drop table if exists public.user_preferences cascade;
drop table if exists public.payment_transactions cascade;
drop table if exists public.email_verification_tokens cascade;
drop table if exists public.telegram_link_tokens cascade;
drop table if exists public.account_identities cascade;
drop table if exists public.user_subscriptions cascade;
drop table if exists public.subscription_plans cascade;
drop table if exists public.payment_history cascade;
drop table if exists public.billing_history cascade;
drop table if exists public.user_usage cascade;
drop table if exists public.card_ratings cascade;
drop table if exists public.bookmarked_cards cascade;
drop table if exists public.session_cards cascade;
drop table if exists public.sessions cascade;
drop table if exists public.cards cascade;
drop table if exists public.data_sources cascade;
drop table if exists public.themes cascade;
drop table if exists public.profiles cascade;

create table public.profiles (
  id                      uuid primary key references auth.users(id) on delete cascade,
  display_name            text,
  is_admin                boolean not null default false,
  locale                  text not null default 'ru' check (locale in ('en', 'ru')),
  timezone                text,
  birth_data_consent_at   timestamptz,
  onboarding_completed_at timestamptz,
  marketing_opt_in        boolean not null default false,
  email_unverified        boolean not null default false,
  pending_email           text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: owner all"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create index idx_profiles_is_admin on public.profiles(is_admin);
create index idx_profiles_locale on public.profiles(locale);

create table public.account_identities (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  provider         text not null check (provider in ('supabase', 'telegram', 'webpay')),
  provider_user_id text not null,
  provider_email   text,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (provider, provider_user_id),
  unique (user_id, provider)
);

alter table public.account_identities enable row level security;

create policy "account_identities: owner read"
  on public.account_identities for select
  using (auth.uid() = user_id);

create index idx_account_identities_user_id
  on public.account_identities(user_id);

create index idx_account_identities_provider
  on public.account_identities(provider);

create table public.telegram_link_tokens (
  token       text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  consumed_at timestamptz
);

alter table public.telegram_link_tokens enable row level security;

create policy "telegram_link_tokens: owner read"
  on public.telegram_link_tokens for select
  using (auth.uid() = user_id);

create index idx_telegram_link_tokens_user_id
  on public.telegram_link_tokens(user_id);

create index idx_telegram_link_tokens_expires_at
  on public.telegram_link_tokens(expires_at);

create table public.email_verification_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  email       text not null,
  token_hash  text not null unique,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  consumed_at timestamptz
);

alter table public.email_verification_tokens enable row level security;

create policy "email_verification_tokens: owner read"
  on public.email_verification_tokens for select
  using (auth.uid() = user_id);

create index idx_email_verification_tokens_user_id
  on public.email_verification_tokens(user_id);

create index idx_email_verification_tokens_expires_at
  on public.email_verification_tokens(expires_at);

create table public.subscription_plans (
  id                        text primary key,
  name                      text not null,
  charts_per_period         integer not null,
  max_saved_charts          integer,
  community_library_enabled boolean not null default false,
  features                  jsonb not null default '{}'::jsonb,
  price_minor               integer,
  currency                  text not null default 'BYN',
  webpay_product_id         text,
  webpay_plan_id            text,
  is_public                 boolean not null default true,
  sort_order                integer not null default 0,
  created_at                timestamptz not null default now()
);

alter table public.subscription_plans enable row level security;

create policy "subscription_plans: public read"
  on public.subscription_plans for select
  using (true);

create index idx_subscription_plans_public_sort
  on public.subscription_plans(is_public, sort_order);

insert into public.subscription_plans (
  id,
  name,
  charts_per_period,
  max_saved_charts,
  community_library_enabled,
  features,
  price_minor,
  currency,
  is_public,
  sort_order
)
values
  (
    'free',
    'Free',
    1,
    1,
    false,
    '{"features":["1 natal overview","1 saved chart","Short follow-up flow"]}'::jsonb,
    0,
    'BYN',
    true,
    0
  ),
  (
    'plus',
    'Plus',
    5,
    5,
    true,
    '{"features":["Up to 5 charts","Expanded natal readings","More follow-up questions"]}'::jsonb,
    1990,
    'BYN',
    true,
    10
  ),
  (
    'pro',
    'Pro',
    25,
    null,
    true,
    '{"features":["Up to 25 charts per period","Compatibility reports","Forecasts and deeper follow-up"]}'::jsonb,
    3990,
    'BYN',
    true,
    20
  );

create table public.user_subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null unique references auth.users(id) on delete cascade,
  plan_id                 text not null references public.subscription_plans(id),
  status                  text not null default 'active'
                            check (status in ('active', 'cancelled', 'expired')),
  current_period_start    timestamptz not null default now(),
  current_period_end      timestamptz not null default (now() + interval '30 days'),
  auto_renew              boolean not null default true,
  billing_provider        text
                            check (billing_provider in ('webpay', 'manual', 'admin')),
  billing_customer_id     text,
  billing_subscription_id text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table public.user_subscriptions enable row level security;

create policy "user_subscriptions: owner read"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

create index idx_user_subscriptions_user_id
  on public.user_subscriptions(user_id);

create index idx_user_subscriptions_status
  on public.user_subscriptions(status);

create table public.payment_transactions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  subscription_id          uuid references public.user_subscriptions(id) on delete set null,
  plan_id                  text references public.subscription_plans(id),
  provider                 text not null check (provider in ('webpay', 'manual', 'admin')),
  external_transaction_id  text not null,
  external_customer_id     text,
  external_subscription_id text,
  status                   text not null default 'paid'
                             check (status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  kind                     text not null default 'subscription_purchase'
                             check (kind in ('subscription_purchase', 'subscription_renewal', 'refund', 'manual_adjustment')),
  amount_minor             integer not null,
  currency                 text not null,
  period_start             timestamptz,
  period_end               timestamptz,
  raw_payload              jsonb not null default '{}'::jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (provider, external_transaction_id)
);

alter table public.payment_transactions enable row level security;

create policy "payment_transactions: owner read"
  on public.payment_transactions for select
  using (auth.uid() = user_id);

create index idx_payment_transactions_user_id
  on public.payment_transactions(user_id);

create index idx_payment_transactions_provider_status
  on public.payment_transactions(provider, status);

create table public.user_preferences (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null unique references auth.users(id) on delete cascade,
  tone_style           text not null default 'balanced'
                         check (tone_style in ('balanced', 'mystical', 'therapeutic', 'analytical')),
  content_focus_love   boolean not null default true,
  content_focus_career boolean not null default true,
  content_focus_growth boolean not null default true,
  allow_spiritual_tone boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

create policy "user_preferences: owner all"
  on public.user_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_user_preferences_user_id
  on public.user_preferences(user_id);

create table public.charts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  label            text not null check (char_length(label) between 1 and 120),
  subject_type     text not null default 'self'
                     check (subject_type in ('self', 'partner', 'child', 'client', 'other')),
  person_name      text not null check (char_length(person_name) between 1 and 120),
  birth_date       date not null,
  birth_time       time,
  birth_time_known boolean not null default true,
  timezone         text,
  city             text not null,
  country          text not null,
  latitude         numeric(9,6),
  longitude        numeric(9,6),
  house_system     text not null default 'placidus'
                     check (house_system in ('placidus', 'whole_sign', 'koch', 'equal')),
  source           text not null default 'manual'
                     check (source in ('manual', 'imported', 'admin')),
  status           text not null default 'pending'
                     check (status in ('pending', 'ready', 'error')),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.charts enable row level security;

create policy "charts: owner all"
  on public.charts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_charts_user_id
  on public.charts(user_id, created_at desc);

create index idx_charts_status
  on public.charts(status);

create table public.chart_snapshots (
  id                   uuid primary key default gen_random_uuid(),
  chart_id             uuid not null references public.charts(id) on delete cascade,
  snapshot_version     integer not null,
  calculation_provider text not null,
  raw_input_json       jsonb not null default '{}'::jsonb,
  computed_chart_json  jsonb not null default '{}'::jsonb,
  warnings_json        jsonb not null default '[]'::jsonb,
  created_at           timestamptz not null default now(),
  unique (chart_id, snapshot_version)
);

alter table public.chart_snapshots enable row level security;

create policy "chart_snapshots: owner read"
  on public.chart_snapshots for select
  using (
    exists (
      select 1 from public.charts c
      where c.id = chart_id and c.user_id = auth.uid()
    )
  );

create index idx_chart_snapshots_chart_id
  on public.chart_snapshots(chart_id, created_at desc);

create table public.chart_positions (
  id                uuid primary key default gen_random_uuid(),
  chart_snapshot_id uuid not null references public.chart_snapshots(id) on delete cascade,
  body_key          text not null,
  sign_key          text not null,
  house_number      integer,
  degree_decimal    numeric(8,4) not null,
  retrograde        boolean not null default false,
  created_at        timestamptz not null default now(),
  unique (chart_snapshot_id, body_key)
);

alter table public.chart_positions enable row level security;

create policy "chart_positions: owner read"
  on public.chart_positions for select
  using (
    exists (
      select 1
      from public.chart_snapshots cs
      join public.charts c on c.id = cs.chart_id
      where cs.id = chart_snapshot_id and c.user_id = auth.uid()
    )
  );

create index idx_chart_positions_snapshot_id
  on public.chart_positions(chart_snapshot_id);

create table public.chart_aspects (
  id                uuid primary key default gen_random_uuid(),
  chart_snapshot_id uuid not null references public.chart_snapshots(id) on delete cascade,
  body_a            text not null,
  body_b            text not null,
  aspect_key        text not null,
  orb_decimal       numeric(8,4) not null,
  applying          boolean,
  created_at        timestamptz not null default now(),
  unique (chart_snapshot_id, body_a, body_b, aspect_key)
);

alter table public.chart_aspects enable row level security;

create policy "chart_aspects: owner read"
  on public.chart_aspects for select
  using (
    exists (
      select 1
      from public.chart_snapshots cs
      join public.charts c on c.id = cs.chart_id
      where cs.id = chart_snapshot_id and c.user_id = auth.uid()
    )
  );

create index idx_chart_aspects_snapshot_id
  on public.chart_aspects(chart_snapshot_id);

create table public.readings (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  chart_id              uuid not null references public.charts(id) on delete cascade,
  chart_snapshot_id     uuid references public.chart_snapshots(id) on delete set null,
  reading_type          text not null
                          check (reading_type in ('natal_overview', 'personality', 'love', 'career', 'strengths', 'transit', 'compatibility')),
  title                 text not null,
  status                text not null default 'pending'
                          check (status in ('pending', 'generating', 'ready', 'error')),
  locale                text not null default 'ru' check (locale in ('en', 'ru')),
  prompt_version        text not null,
  schema_version        text not null,
  model_provider        text,
  model_name            text,
  summary               text,
  rendered_content_json jsonb not null default '{}'::jsonb,
  plain_text_content    text,
  error_message         text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.readings enable row level security;

create policy "readings: owner all"
  on public.readings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_readings_user_id
  on public.readings(user_id, created_at desc);

create index idx_readings_chart_id
  on public.readings(chart_id, created_at desc);

create table public.reading_sections (
  id          uuid primary key default gen_random_uuid(),
  reading_id  uuid not null references public.readings(id) on delete cascade,
  section_key text not null,
  title       text not null,
  content     text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.reading_sections enable row level security;

create policy "reading_sections: owner read"
  on public.reading_sections for select
  using (
    exists (
      select 1 from public.readings r
      where r.id = reading_id and r.user_id = auth.uid()
    )
  );

create index idx_reading_sections_reading_id
  on public.reading_sections(reading_id, sort_order);

create table public.follow_up_threads (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  chart_id   uuid references public.charts(id) on delete cascade,
  reading_id uuid references public.readings(id) on delete cascade,
  title      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.follow_up_threads enable row level security;

create policy "follow_up_threads: owner all"
  on public.follow_up_threads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_follow_up_threads_user_id
  on public.follow_up_threads(user_id, updated_at desc);

create table public.follow_up_messages (
  id             uuid primary key default gen_random_uuid(),
  thread_id      uuid not null references public.follow_up_threads(id) on delete cascade,
  role           text not null check (role in ('user', 'assistant', 'system')),
  content        text not null,
  usage_tokens   integer,
  model_provider text,
  model_name     text,
  created_at     timestamptz not null default now()
);

alter table public.follow_up_messages enable row level security;

create policy "follow_up_messages: owner read"
  on public.follow_up_messages for select
  using (
    exists (
      select 1 from public.follow_up_threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  );

create policy "follow_up_messages: owner insert"
  on public.follow_up_messages for insert
  with check (
    exists (
      select 1 from public.follow_up_threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  );

create index idx_follow_up_messages_thread_id
  on public.follow_up_messages(thread_id, created_at);

create table public.compatibility_reports (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  primary_chart_id      uuid not null references public.charts(id) on delete cascade,
  secondary_chart_id    uuid not null references public.charts(id) on delete cascade,
  status                text not null default 'pending'
                          check (status in ('pending', 'generating', 'ready', 'error')),
  summary               text,
  rendered_content_json jsonb not null default '{}'::jsonb,
  prompt_version        text not null,
  model_provider        text,
  model_name            text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.compatibility_reports enable row level security;

create policy "compatibility_reports: owner all"
  on public.compatibility_reports for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_compatibility_reports_user_id
  on public.compatibility_reports(user_id, created_at desc);

create table public.forecasts (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  chart_id              uuid not null references public.charts(id) on delete cascade,
  forecast_type         text not null check (forecast_type in ('daily', 'weekly', 'monthly', 'custom')),
  target_start_date     date not null,
  target_end_date       date not null,
  transit_snapshot_json jsonb not null default '{}'::jsonb,
  rendered_content_json jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.forecasts enable row level security;

create policy "forecasts: owner all"
  on public.forecasts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_forecasts_user_id
  on public.forecasts(user_id, created_at desc);

create table public.usage_counters (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid not null references auth.users(id) on delete cascade,
  period_start               timestamptz not null,
  period_end                 timestamptz not null,
  charts_created             integer not null default 0,
  readings_generated         integer not null default 0,
  follow_up_messages_used    integer not null default 0,
  compatibility_reports_used integer not null default 0,
  forecasts_generated        integer not null default 0,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  unique (user_id, period_start)
);

alter table public.usage_counters enable row level security;

create policy "usage_counters: owner read"
  on public.usage_counters for select
  using (auth.uid() = user_id);

create index idx_usage_counters_user_id
  on public.usage_counters(user_id, period_start desc);

create table public.prompt_templates (
  id                 uuid primary key default gen_random_uuid(),
  key                text not null,
  version            text not null,
  locale             text not null default 'ru' check (locale in ('en', 'ru')),
  system_prompt      text not null,
  developer_prompt   text,
  output_schema_json jsonb not null default '{}'::jsonb,
  active             boolean not null default false,
  created_at         timestamptz not null default now(),
  unique (key, version, locale)
);

alter table public.prompt_templates enable row level security;

create policy "prompt_templates: auth read"
  on public.prompt_templates for select
  using (auth.role() = 'authenticated');

create table public.generation_logs (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users(id) on delete set null,
  entity_type           text not null,
  entity_id             uuid,
  operation_key         text not null,
  provider              text,
  model                 text,
  request_payload_json  jsonb not null default '{}'::jsonb,
  response_payload_json jsonb not null default '{}'::jsonb,
  latency_ms            integer,
  error_message         text,
  created_at            timestamptz not null default now()
);

alter table public.generation_logs enable row level security;

create policy "generation_logs: admin read"
  on public.generation_logs for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create index idx_generation_logs_entity
  on public.generation_logs(entity_type, entity_id, created_at desc);

comment on table public.charts is
  'Primary astrology entity representing a person or subject with birth data.';

comment on table public.chart_snapshots is
  'Immutable calculated chart snapshots used as deterministic inputs for AI readings.';

comment on table public.readings is
  'Generated astrology reading documents tied to chart snapshots and prompt/model versions.';

comment on table public.usage_counters is
  'Astrology product quota counters replacing legacy card-based usage accounting.';