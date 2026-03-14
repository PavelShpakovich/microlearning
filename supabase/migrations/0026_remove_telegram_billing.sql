delete from public.payment_transactions
where provider = 'telegram';

update public.user_subscriptions
set billing_provider = null,
    billing_subscription_id = null
where billing_provider = 'telegram';

alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_billing_provider_check;

alter table public.user_subscriptions
  add constraint user_subscriptions_billing_provider_check
  check (billing_provider in ('webpay', 'manual', 'admin'));

alter table public.payment_transactions
  drop constraint if exists payment_transactions_provider_check;

alter table public.payment_transactions
  add constraint payment_transactions_provider_check
  check (provider in ('webpay', 'manual', 'admin'));

drop policy if exists "payment_history: owner read" on public.payment_history;
drop table if exists public.payment_history;

alter table public.subscription_plans
  drop column if exists stars_price;

alter table public.user_subscriptions
  drop column if exists telegram_payment_charge_id;