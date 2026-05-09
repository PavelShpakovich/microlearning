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

  -- Some RevenueCat client/server flows can surface different transaction IDs
  -- for the same non-subscription purchase. Reuse an existing purchase row when
  -- the store/provider, product, user, and purchase timestamp already match.
  select id
    into v_purchase_id
    from public.store_purchases
    where user_id = p_user_id
      and provider = p_provider
      and external_product_id = p_external_product_id
      and abs(extract(epoch from (purchased_at - p_purchased_at))) < 1
    order by created_at desc
    limit 1
    for update;

  if not found then
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
  else
    update public.store_purchases
      set raw_payload = coalesce(public.store_purchases.raw_payload, '{}'::jsonb) || coalesce(p_raw_payload, '{}'::jsonb),
          revenuecat_app_user_id = coalesce(p_revenuecat_app_user_id, public.store_purchases.revenuecat_app_user_id),
          updated_at = now()
      where id = v_purchase_id;
  end if;

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

create or replace function public.revoke_store_purchase_atomic(
  p_provider                text,
  p_external_transaction_id text,
  p_raw_payload             jsonb default '{}'::jsonb
)
returns table(
  purchase_id uuid,
  new_balance integer,
  transaction_id uuid,
  already_reversed boolean,
  insufficient_balance boolean,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase_id uuid;
  v_user_id uuid;
  v_status text;
  v_credits_granted integer;
  v_balance integer;
  v_transaction_id uuid;
begin
  select id, user_id, status, credits_granted, credit_transaction_id
    into v_purchase_id, v_user_id, v_status, v_credits_granted, v_transaction_id
    from public.store_purchases
    where provider = p_provider
      and external_transaction_id = p_external_transaction_id
    for update;

  if not found then
    select sp.id, sp.user_id, sp.status, sp.credits_granted, sp.credit_transaction_id
      into v_purchase_id, v_user_id, v_status, v_credits_granted, v_transaction_id
      from public.store_purchase_events spe
      join public.store_purchases sp on sp.id = spe.purchase_id
      where spe.provider = p_provider
        and spe.external_transaction_id = p_external_transaction_id
        and spe.purchase_id is not null
      order by spe.created_at desc
      limit 1
      for update of sp;
  end if;

  if not found then
    raise exception 'store purchase not found for provider % and transaction %', p_provider, p_external_transaction_id;
  end if;

  if v_status in ('revoked', 'refunded', 'revoke_pending') then
    select balance into v_balance
      from public.user_credits
      where user_id = v_user_id;

    return query
      select v_purchase_id, coalesce(v_balance, 0), v_transaction_id, true, v_status = 'revoke_pending', v_status;
    return;
  end if;

  if v_status <> 'credited' then
    update public.store_purchases
      set status = 'revoked',
          raw_payload = coalesce(raw_payload, '{}'::jsonb) || coalesce(p_raw_payload, '{}'::jsonb),
          updated_at = now()
      where id = v_purchase_id;

    select balance into v_balance
      from public.user_credits
      where user_id = v_user_id;

    return query
      select v_purchase_id, coalesce(v_balance, 0), null::uuid, false, false, 'revoked';
    return;
  end if;

  select balance into v_balance
    from public.user_credits
    where user_id = v_user_id
    for update;

  if coalesce(v_balance, 0) < v_credits_granted then
    update public.store_purchases
      set status = 'revoke_pending',
          raw_payload = coalesce(raw_payload, '{}'::jsonb) || coalesce(p_raw_payload, '{}'::jsonb),
          updated_at = now()
      where id = v_purchase_id;

    return query
      select v_purchase_id, coalesce(v_balance, 0), null::uuid, false, true, 'revoke_pending';
    return;
  end if;

  update public.user_credits
    set balance = balance - v_credits_granted,
        updated_at = now()
    where user_id = v_user_id
  returning balance into v_balance;

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
    v_user_id,
    -v_credits_granted,
    v_balance,
    'refund_store_revoke',
    'purchase',
    v_purchase_id,
    format('Store purchase revoked (%s)', p_provider)
  )
  returning id into v_transaction_id;

  update public.store_purchases
    set status = 'revoked',
        raw_payload = coalesce(raw_payload, '{}'::jsonb) || coalesce(p_raw_payload, '{}'::jsonb),
        updated_at = now()
    where id = v_purchase_id;

  return query
    select v_purchase_id, v_balance, v_transaction_id, false, false, 'revoked';
end;
$$;