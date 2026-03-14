alter table public.subscription_plans
  add column if not exists price_minor integer,
  add column if not exists currency text not null default 'BYN',
  add column if not exists webpay_product_id text,
  add column if not exists webpay_plan_id text,
  add column if not exists is_public boolean not null default true,
  add column if not exists sort_order integer not null default 0;

update public.subscription_plans
set price_minor = case id
  when 'free' then 0
  when 'basic' then null
  when 'pro' then null
  when 'max' then null
  else price_minor
end
where price_minor is null;

update public.subscription_plans
set sort_order = case id
  when 'free' then 0
  when 'basic' then 10
  when 'pro' then 20
  when 'max' then 30
  else sort_order
end;