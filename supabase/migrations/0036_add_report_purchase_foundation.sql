create table public.report_products (
  id            text primary key,
  kind          text not null
                  check (kind in ('natal_report', 'compatibility_report', 'forecast_report', 'follow_up_pack')),
  title         text not null,
  description   text,
  active        boolean not null default true,
  price_minor   integer,
  currency      text not null default 'BYN',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.report_products enable row level security;

create policy "report_products: active read"
  on public.report_products for select
  using (active = true);

create table public.report_purchases (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  product_id          text not null references public.report_products(id),
  provider            text not null check (provider in ('manual', 'admin', 'webpay')),
  status              text not null default 'pending'
                        check (status in ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  entity_type         text
                        check (entity_type in ('reading', 'compatibility_report', 'forecast', 'follow_up_pack')),
  entity_id           uuid,
  amount_minor        integer,
  currency            text not null default 'BYN',
  external_order_id   text,
  external_payment_id text,
  metadata_json       jsonb not null default '{}'::jsonb,
  paid_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.report_purchases enable row level security;

create policy "report_purchases: owner read"
  on public.report_purchases for select
  using (auth.uid() = user_id);

create index idx_report_purchases_user_id
  on public.report_purchases(user_id, created_at desc);

create index idx_report_purchases_provider_status
  on public.report_purchases(provider, status, created_at desc);

create table public.report_entitlements (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  purchase_id   uuid references public.report_purchases(id) on delete set null,
  product_id    text not null references public.report_products(id),
  reading_type  text
                  check (reading_type in ('natal_overview', 'personality', 'love', 'career', 'strengths', 'transit', 'compatibility')),
  entity_type   text not null
                  check (entity_type in ('reading', 'compatibility_report', 'forecast', 'follow_up_pack')),
  entity_id     uuid,
  status        text not null default 'active'
                  check (status in ('reserved', 'active', 'consumed', 'refunded', 'expired')),
  expires_at    timestamptz,
  consumed_at   timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.report_entitlements enable row level security;

create policy "report_entitlements: owner read"
  on public.report_entitlements for select
  using (auth.uid() = user_id);

create index idx_report_entitlements_user_status
  on public.report_entitlements(user_id, status, created_at desc);

create index idx_report_entitlements_entity
  on public.report_entitlements(entity_type, entity_id, created_at desc);

insert into public.report_products (
  id,
  kind,
  title,
  description,
  active,
  price_minor,
  currency,
  metadata_json
)
values
  (
    'extended_natal_report',
    'natal_report',
    'Extended Natal Report',
    'A one-off, premium natal reading purchase for deeper multi-section interpretation.',
    true,
    null,
    'BYN',
    '{"readingTypes":["personality","love","career","strengths","transit"]}'::jsonb
  ),
  (
    'compatibility_report_purchase',
    'compatibility_report',
    'Compatibility Report',
    'A one-off compatibility interpretation purchase.',
    true,
    null,
    'BYN',
    '{"entityType":"compatibility_report"}'::jsonb
  ),
  (
    'forecast_report_purchase',
    'forecast_report',
    'Forecast Report',
    'A one-off forecast report purchase.',
    true,
    null,
    'BYN',
    '{"entityType":"forecast"}'::jsonb
  ),
  (
    'follow_up_pack',
    'follow_up_pack',
    'Follow-up Pack',
    'Additional follow-up messages attached to a reading.',
    true,
    null,
    'BYN',
    '{"entityType":"follow_up_pack"}'::jsonb
  )
on conflict (id) do nothing;

comment on table public.report_products is
  'Public catalog of one-off report products. Recurring subscription plans are intentionally not used.';

comment on table public.report_purchases is
  'One-off purchase records for paid astrology reports and follow-up packs.';

comment on table public.report_entitlements is
  'Entitlements unlocked by one-off purchases and later consumed by reports or follow-up packs.';