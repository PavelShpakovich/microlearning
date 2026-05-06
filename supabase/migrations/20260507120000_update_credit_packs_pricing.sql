-- Update credit packs to match the final pricing plan (credit-pricing-plan.md).
-- Original values from 0041 were placeholder amounts.

update public.credit_packs
set
  credits = 5,
  price_minor = 99,
  currency = 'USD',
  name = 'Starter',
  updated_at = now()
where id = 'starter';

update public.credit_packs
set
  credits = 12,
  price_minor = 299,
  currency = 'USD',
  name = 'Standard',
  updated_at = now()
where id = 'standard';

update public.credit_packs
set
  credits = 25,
  price_minor = 599,
  currency = 'USD',
  name = 'Premium',
  updated_at = now()
where id = 'premium';
