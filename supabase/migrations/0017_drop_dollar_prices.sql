-- Drop USD price columns from subscription_plans.
-- Stars price (stars_price) is the only pricing mechanism; these columns were never displayed.
-- Sort order is preserved via stars_price (0 for free, ascending for paid tiers).

alter table public.subscription_plans
  drop column price_monthly,
  drop column price_annual;
