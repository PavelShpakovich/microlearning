alter table public.credit_packs
  drop column if exists price_minor,
  drop column if exists currency;

comment on table public.credit_packs is
  'Catalog of app-managed credit packs. Storefront pricing is controlled by Apple App Store / Google Play, not by backend data.';