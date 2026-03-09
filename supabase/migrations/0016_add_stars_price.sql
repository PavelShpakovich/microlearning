-- Add stars_price column to subscription_plans
-- Stars prices are now stored in DB instead of env vars, allowing price changes without redeployment.

alter table public.subscription_plans
  add column stars_price integer not null default 0;

update public.subscription_plans set stars_price = 0   where id = 'free';
update public.subscription_plans set stars_price = 200 where id = 'basic';
update public.subscription_plans set stars_price = 500 where id = 'pro';
update public.subscription_plans set stars_price = 1000 where id = 'max';
