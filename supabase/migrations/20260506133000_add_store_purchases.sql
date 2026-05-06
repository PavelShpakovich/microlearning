create table public.store_purchases (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users(id) on delete cascade,
  provider                  text not null check (provider in ('apple', 'google')),
  external_transaction_id   text not null,
  external_product_id       text not null,
  revenuecat_app_user_id    text,
  pack_id                   text not null references public.credit_packs(id),
  credits_granted           integer not null check (credits_granted > 0),
  environment               text not null check (environment in ('sandbox', 'production')),
  status                    text not null check (status in ('received', 'credited', 'refunded', 'revoked')) default 'received',
  purchased_at              timestamptz not null,
  credited_at               timestamptz,
  credit_transaction_id     uuid references public.credit_transactions(id),
  raw_payload               jsonb not null default '{}'::jsonb,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  constraint uq_store_purchases_provider_tx unique (provider, external_transaction_id)
);

create index idx_store_purchases_user_created_at
  on public.store_purchases(user_id, created_at desc);

create index idx_store_purchases_status
  on public.store_purchases(status, created_at desc);

alter table public.store_purchases enable row level security;

create policy "store_purchases: owner read"
  on public.store_purchases for select
  using (auth.uid() = user_id);

comment on table public.store_purchases is
  'Normalized record of store transactions processed through RevenueCat / platform billing.';

create table public.store_purchase_events (
  id                        uuid primary key default gen_random_uuid(),
  purchase_id               uuid references public.store_purchases(id) on delete cascade,
  provider                  text not null check (provider in ('apple', 'google')),
  event_type                text not null,
  external_transaction_id   text,
  raw_payload               jsonb not null default '{}'::jsonb,
  created_at                timestamptz not null default now()
);

create index idx_store_purchase_events_purchase
  on public.store_purchase_events(purchase_id, created_at desc);

create index idx_store_purchase_events_tx
  on public.store_purchase_events(provider, external_transaction_id, created_at desc);

alter table public.store_purchase_events enable row level security;

comment on table public.store_purchase_events is
  'Raw purchase event log for webhook/reconcile debugging and replay-safe support workflows.';

create or replace function public.grant_store_purchase_atomic(
  p_user_id                 uuid,
  p_provider                text,
  p_external_transaction_id text,
  p_external_product_id     text,
  p_pack_id                 text,
  p_credits_granted         integer,
  p_environment             text,
  p_purchased_at            timestamptz,
  p_raw_payload             jsonb default '{}'::jsonb,
  p_revenuecat_app_user_id  text default null
)
returns table(
  purchase_id uuid,
  new_balance integer,
  transaction_id uuid,
  already_credited boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase_id uuid;
  v_status text;
  v_new_balance integer;
  v_transaction_id uuid;
begin
  if p_credits_granted <= 0 then
    raise exception 'credits granted must be positive, got %', p_credits_granted;
  end if;

  insert into public.store_purchases (
    user_id,
    provider,
    external_transaction_id,
    external_product_id,
    revenuecat_app_user_id,
    pack_id,
    credits_granted,
    environment,
    status,
    purchased_at,
    raw_payload
  )
  values (
    p_user_id,
    p_provider,
    p_external_transaction_id,
    p_external_product_id,
    p_revenuecat_app_user_id,
    p_pack_id,
    p_credits_granted,
    p_environment,
    'received',
    p_purchased_at,
    coalesce(p_raw_payload, '{}'::jsonb)
  )
  on conflict (provider, external_transaction_id) do update
    set raw_payload = excluded.raw_payload,
        revenuecat_app_user_id = coalesce(excluded.revenuecat_app_user_id, public.store_purchases.revenuecat_app_user_id),
        updated_at = now()
  returning id into v_purchase_id;

  select status, credit_transaction_id
    into v_status, v_transaction_id
    from public.store_purchases
    where id = v_purchase_id
    for update;

  if v_status <> 'received' then
    if v_transaction_id is not null then
      select balance_after
        into v_new_balance
        from public.credit_transactions
        where id = v_transaction_id;
    else
      select balance
        into v_new_balance
        from public.user_credits
        where user_id = p_user_id;
    end if;

    return query select v_purchase_id, coalesce(v_new_balance, 0), v_transaction_id, true;
    return;
  end if;

  insert into public.user_credits (user_id, balance)
  values (p_user_id, p_credits_granted)
  on conflict (user_id) do update
    set balance = public.user_credits.balance + p_credits_granted,
        updated_at = now()
  returning balance into v_new_balance;

  insert into public.credit_transactions (
    user_id,
    amount,
    balance_after,
    reason,
    reference_type,
    reference_id,
    note
  )
  values (
    p_user_id,
    p_credits_granted,
    v_new_balance,
    'pack_purchase',
    'purchase',
    v_purchase_id,
    format('Store purchase %s (%s)', p_external_product_id, p_provider)
  )
  returning id into v_transaction_id;

  update public.store_purchases
    set status = 'credited',
        credited_at = now(),
        credit_transaction_id = v_transaction_id,
        updated_at = now()
    where id = v_purchase_id;

  return query select v_purchase_id, v_new_balance, v_transaction_id, false;
end;
$$;