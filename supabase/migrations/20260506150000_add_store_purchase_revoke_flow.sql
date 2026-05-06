alter table public.credit_transactions
  drop constraint if exists credit_transactions_reason_check;

alter table public.credit_transactions
  add constraint credit_transactions_reason_check
    check (reason in (
      'pack_purchase',
      'admin_grant',
      'admin_revoke',
      'reading_debit',
      'compatibility_debit',
      'forecast_pack_debit',
      'chat_pack_debit',
      'refund_llm_failure',
      'refund_admin',
      'welcome_bonus',
      'refund_store_revoke'
    ));

alter table public.store_purchases
  drop constraint if exists store_purchases_status_check;

alter table public.store_purchases
  add constraint store_purchases_status_check
    check (status in ('received', 'credited', 'refunded', 'revoked', 'revoke_pending'));

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