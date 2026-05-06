alter table public.credit_packs
  add column apple_product_id text,
  add column google_product_id text;

update public.credit_packs
set
  apple_product_id = 'by.tryclario.credits.starter',
  google_product_id = 'by.tryclario.credits.starter'
where id = 'starter';

update public.credit_packs
set
  apple_product_id = 'by.tryclario.credits.standard',
  google_product_id = 'by.tryclario.credits.standard'
where id = 'standard';

update public.credit_packs
set
  apple_product_id = 'by.tryclario.credits.premium',
  google_product_id = 'by.tryclario.credits.premium'
where id = 'premium';

alter table public.credit_packs
  alter column apple_product_id set not null,
  alter column google_product_id set not null;

comment on column public.credit_packs.apple_product_id is
  'Apple App Store consumable product identifier for this credit pack.';

comment on column public.credit_packs.google_product_id is
  'Google Play one-time product identifier for this credit pack.';