-- Migration: 0019_subscription_renewals
-- Adds infrastructure for Telegram Stars recurring subscriptions:
--   1. telegram_payment_charge_id on user_subscriptions (first charge ID for editUserStarSubscription)
--   2. payment_history table for audit trail and idempotency

-- ── 1. Add charge ID column to user_subscriptions ──────────────────────
alter table public.user_subscriptions
  add column if not exists telegram_payment_charge_id text;

-- ── 2. Payment history table ───────────────────────────────────────────
create table if not exists public.payment_history (
  id                          uuid        primary key default gen_random_uuid(),
  user_id                     uuid        not null references auth.users(id) on delete cascade,
  telegram_payment_charge_id  text        not null unique,
  plan_id                     text        not null references public.subscription_plans(id),
  amount                      integer     not null,
  currency                    text        not null default 'XTR',
  is_first_recurring          boolean     not null default false,
  is_recurring                boolean     not null default false,
  subscription_expiration_date timestamptz,
  created_at                  timestamptz not null default now()
);

alter table public.payment_history enable row level security;

create policy "payment_history: owner read"
  on public.payment_history for select
  using (auth.uid() = user_id);

create index idx_payment_history_user_id
  on public.payment_history(user_id);
