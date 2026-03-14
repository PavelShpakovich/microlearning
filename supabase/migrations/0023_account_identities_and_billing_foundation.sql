-- Migration: 0023_account_identities_and_billing_foundation
-- Adds canonical account identities for future web/Telegram linking and
-- provider-agnostic payment records for a web-first billing model.

create table if not exists public.account_identities (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  provider         text        not null check (provider in ('supabase', 'telegram', 'webpay')),
  provider_user_id text        not null,
  provider_email   text,
  metadata         jsonb       not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (provider, provider_user_id),
  unique (user_id, provider)
);

alter table public.account_identities enable row level security;

create policy "account_identities: owner read"
  on public.account_identities for select
  using (auth.uid() = user_id);

create index if not exists idx_account_identities_user_id
  on public.account_identities(user_id);

create index if not exists idx_account_identities_provider
  on public.account_identities(provider);

insert into public.account_identities (
  user_id,
  provider,
  provider_user_id,
  provider_email,
  metadata
)
select
  u.id,
  'supabase',
  u.id::text,
  u.email,
  jsonb_build_object('source', 'auth_users_backfill')
from auth.users u
on conflict (provider, provider_user_id) do nothing;

insert into public.account_identities (
  user_id,
  provider,
  provider_user_id,
  metadata
)
select
  p.id,
  'telegram',
  p.telegram_id,
  jsonb_build_object('source', 'profiles_telegram_backfill')
from public.profiles p
where p.telegram_id is not null
on conflict (provider, provider_user_id) do nothing;

alter table public.user_subscriptions
  add column if not exists billing_provider text
    check (billing_provider in ('telegram', 'webpay', 'manual', 'admin')),
  add column if not exists billing_customer_id text,
  add column if not exists billing_subscription_id text;

update public.user_subscriptions
set billing_provider = coalesce(billing_provider, 'telegram'),
    billing_subscription_id = coalesce(billing_subscription_id, telegram_payment_charge_id)
where telegram_payment_charge_id is not null;

create table if not exists public.payment_transactions (
  id                       uuid        primary key default gen_random_uuid(),
  user_id                  uuid        not null references auth.users(id) on delete cascade,
  subscription_id          uuid        references public.user_subscriptions(id) on delete set null,
  plan_id                  text        references public.subscription_plans(id),
  provider                 text        not null check (provider in ('telegram', 'webpay', 'manual', 'admin')),
  external_transaction_id  text        not null,
  external_customer_id     text,
  external_subscription_id text,
  status                   text        not null default 'paid'
                                      check (status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  kind                     text        not null default 'subscription_purchase'
                                      check (kind in ('subscription_purchase', 'subscription_renewal', 'refund', 'manual_adjustment')),
  amount_minor             integer     not null,
  currency                 text        not null,
  period_start             timestamptz,
  period_end               timestamptz,
  raw_payload              jsonb       not null default '{}'::jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (provider, external_transaction_id)
);

alter table public.payment_transactions enable row level security;

create policy "payment_transactions: owner read"
  on public.payment_transactions for select
  using (auth.uid() = user_id);

create index if not exists idx_payment_transactions_user_id
  on public.payment_transactions(user_id);

create index if not exists idx_payment_transactions_provider_status
  on public.payment_transactions(provider, status);

insert into public.payment_transactions (
  user_id,
  plan_id,
  provider,
  external_transaction_id,
  external_subscription_id,
  status,
  kind,
  amount_minor,
  currency,
  period_end,
  raw_payload,
  created_at
)
select
  ph.user_id,
  ph.plan_id,
  'telegram',
  ph.telegram_payment_charge_id,
  ph.telegram_payment_charge_id,
  'paid',
  case
    when ph.is_recurring or ph.is_first_recurring then 'subscription_renewal'
    else 'subscription_purchase'
  end,
  ph.amount,
  ph.currency,
  ph.subscription_expiration_date,
  jsonb_build_object(
    'legacy_payment_history_id', ph.id,
    'is_recurring', ph.is_recurring,
    'is_first_recurring', ph.is_first_recurring
  ),
  ph.created_at
from public.payment_history ph
on conflict (provider, external_transaction_id) do nothing;