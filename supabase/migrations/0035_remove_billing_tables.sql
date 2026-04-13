-- Remove legacy billing and subscription tables from the astrology product.
--
-- The cloud project has already applied 0034, so this must be an additive
-- migration instead of a rewrite of the existing baseline file.

alter table public.account_identities
  drop constraint if exists account_identities_provider_check;

alter table public.account_identities
  add constraint account_identities_provider_check
  check (provider in ('supabase', 'telegram'));

drop table if exists public.payment_transactions cascade;
drop table if exists public.user_subscriptions cascade;
drop table if exists public.subscription_plans cascade;