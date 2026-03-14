update public.subscription_plans
set price_minor = 0,
    currency = 'BYN',
    is_public = true,
    sort_order = 0
where id = 'free';

update public.subscription_plans
set price_minor = 990,
    currency = 'BYN',
    is_public = true,
    sort_order = 10
where id = 'basic';

update public.subscription_plans
set price_minor = 2490,
    currency = 'BYN',
    is_public = true,
    sort_order = 20
where id = 'pro';

update public.subscription_plans
set price_minor = 4990,
    currency = 'BYN',
    is_public = true,
    sort_order = 30
where id = 'max';

comment on column public.subscription_plans.webpay_product_id is
  'Merchant-side WEBPAY product identifier. Required before enabling paid checkout.';

comment on column public.subscription_plans.webpay_plan_id is
  'Merchant-side WEBPAY plan or tariff identifier. Required before enabling paid checkout.';