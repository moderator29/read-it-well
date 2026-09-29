-- CRYPTO agent, 29 September 2026. Crypto payments, part 2: one payment of a
-- charge at a time, and an honest in-flight clock. Audit fixes 3 and 11.
--
-- 3. DOUBLE PAYMENT. `crypto_open_attempt` opened a crypto attempt even while
--    another payment of the same charge was already moving: a second crypto
--    payment on the booking (awaiting payment, confirming, underpaid, overpaid
--    or converting), or a card attempt still genuinely in flight
--    (`private.booking_payment_in_flight`, the Paystack agent's one
--    predicate). Two payments could then both land, and the second becomes a
--    `refund-due` the lister has to return by hand. It now refuses with
--    `in_flight` (the app says so in a sentence, `OPEN_REFUSALS.in_flight`).
--    A `quoted` row is not in flight: nothing can arrive at a quote.
--
-- 11. THE IN-FLIGHT CLOCK. A duplicate delivery, or a repeat of a state that
--    changes nothing, still proves the provider is talking about a payment
--    that is not finished. For a non-final state, those branches now refresh
--    `processor_checked_at` on the linked PENDING transaction, so
--    `payment_attempt_in_flight` keeps counting it and an agreement is not
--    cancelled under a payment the provider is still reporting on.
--
-- Nothing here moves money, touches settlement or weakens RLS. Both functions
-- stay SECURITY DEFINER, service_role only, search_path ''.
set local lock_timeout = '5s';

create or replace function public.crypto_open_attempt(p_payment uuid, p_reserve_code text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  cp    public.crypto_payments%rowtype;
  split jsonb;
  tx_id uuid;
  dest  record;
begin
  if p_reserve_code is null or length(btrim(p_reserve_code)) = 0 then
    return jsonb_build_object('status', 'reserve_not_set_up');
  end if;
  select * into cp from public.crypto_payments where id = p_payment for update;
  if cp.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if cp.state <> 'quoted' then return jsonb_build_object('status', 'not_quoted', 'state', cp.state); end if;
  if cp.quote_expires_at <= now() then return jsonb_build_object('status', 'quote_expired'); end if;
  if cp.transaction_id is not null then return jsonb_build_object('status', 'already_open'); end if;

  -- One payment of a charge at a time. The booking row is locked first so two
  -- attempts opening together are serialised on the same charge.
  perform 1 from public.bookings where id = cp.booking_id for update;
  if exists (select 1 from public.transactions t where t.booking_id = cp.booking_id and t.status = 'SUCCESSFUL') then
    return jsonb_build_object('status', 'already_paid');
  end if;
  if exists (select 1 from public.crypto_payments o
              where o.booking_id = cp.booking_id and o.id <> cp.id
                and o.state in ('awaiting_payment', 'confirming', 'underpaid', 'overpaid', 'converting'))
     or private.booking_payment_in_flight(cp.booking_id) then
    return jsonb_build_object('status', 'in_flight');
  end if;

  split := public.payment_split_for_booking(cp.booking_id);
  if split->>'status' <> 'ok' then return jsonb_build_object('status', split->>'status'); end if;
  if (split->>'amount_minor')::bigint <> cp.amount_minor then
    return jsonb_build_object('status', 'amount_mismatch');
  end if;

  select pa.bank_code, pa.account_number, coalesce(pa.resolved_account_name, pa.account_name) as account_name
    into dest
    from public.payout_accounts pa
    join public.agents a on a.id = pa.agent_id
   where a.user_id = (split->>'payee_user_id')::uuid
     and pa.paystack_subaccount_code = split->>'payee_subaccount_code'
     and pa.resolved_at is not null
     and pa.bank_code is not null
   order by pa.is_default desc, pa.created_at desc
   limit 1;
  if dest.account_number is null then return jsonb_build_object('status', 'payee_not_set_up'); end if;

  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id,
                                   payee_user_id, payee_subaccount_code, reserve_subaccount_code,
                                   lister_share_minor, guarantee_minor, commission_minor, checkout_opened_at)
  values (cp.booking_id, 'yellowcard', cp.reference, cp.amount_minor, 'NGN', 'PENDING',
          (split->>'agreement_id')::uuid, (split->>'payee_user_id')::uuid, split->>'payee_subaccount_code',
          p_reserve_code, (split->>'lister_share_minor')::bigint, (split->>'guarantee_minor')::bigint,
          (split->>'commission_minor')::bigint, now())
  returning id into tx_id;

  update public.crypto_payments
     set transaction_id = tx_id, agreement_id = (split->>'agreement_id')::uuid
   where id = cp.id;

  return jsonb_build_object(
    'status', 'ok', 'transaction_id', tx_id, 'reference', cp.reference, 'amount_minor', cp.amount_minor,
    'agreement_id', split->>'agreement_id', 'payee_user_id', split->>'payee_user_id',
    'lister_share_minor', (split->>'lister_share_minor')::bigint,
    'guarantee_minor', (split->>'guarantee_minor')::bigint,
    'commission_minor', (split->>'commission_minor')::bigint,
    'lister_bank_code', dest.bank_code, 'lister_account_number', dest.account_number,
    'lister_account_name', dest.account_name);
end;
$function$;

revoke all on function public.crypto_open_attempt(uuid, text) from public, anon, authenticated;
grant execute on function public.crypto_open_attempt(uuid, text) to service_role;

create or replace function public.crypto_payment_apply(
  p_reference text,
  p_provider text,
  p_event_id text,
  p_source text,
  p_to_state text,
  p_facts jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  cp      public.crypto_payments%rowtype;
  f       jsonb := coalesce(p_facts, '{}'::jsonb);
  settle  jsonb;
  kyc     record;
  same    boolean;
  v_outcome text;
  v_settled bigint;
  mismatch boolean := false;
begin
  if p_reference is null or p_event_id is null or p_to_state is null then
    return jsonb_build_object('outcome', 'bad_request');
  end if;
  if p_source is null or p_source not in ('webhook', 'reconcile', 'app') then
    return jsonb_build_object('outcome', 'bad_request');
  end if;
  select * into cp from public.crypto_payments where reference = p_reference for update;
  if cp.id is null then return jsonb_build_object('outcome', 'unknown-reference'); end if;
  if cp.provider <> p_provider then return jsonb_build_object('outcome', 'wrong-provider'); end if;

  if exists (select 1 from public.crypto_payment_events e where e.provider = p_provider and e.provider_event_id = p_event_id) then
    -- Fix 11: the provider is still talking about an unfinished payment.
    if cp.transaction_id is not null and cp.state not in ('settled', 'refunded') then
      update public.transactions set processor_checked_at = now()
       where id = cp.transaction_id and status = 'PENDING';
    end if;
    return jsonb_build_object('outcome', 'duplicate', 'state', cp.state);
  end if;

  same := cp.state = p_to_state;
  if same then
    v_outcome := case when cp.state in ('awaiting_payment', 'confirming', 'underpaid', 'overpaid', 'converting')
                      then 'updated' else 'stale' end;
  elsif private.crypto_transition_allowed(cp.state, p_to_state) then
    v_outcome := 'applied';
  else
    v_outcome := 'refused';
  end if;

  if v_outcome = 'applied' and p_to_state = 'settled' then
    v_settled := nullif(f->>'settled_minor', '')::bigint;
    if v_settled is null or v_settled <> cp.amount_minor then
      mismatch := true;
      v_outcome := 'refused';
    end if;
  end if;

  insert into public.crypto_payment_events (crypto_payment_id, provider, provider_event_id, source, from_state, to_state, applied, outcome, facts)
  values (cp.id, p_provider, p_event_id, p_source, cp.state, p_to_state, v_outcome in ('applied', 'updated'), v_outcome, f);

  if mismatch then
    update public.crypto_payments set failure_reason = 'settled_amount_mismatch', last_event_at = now() where id = cp.id;
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high', 'open', 'A crypto settlement did not match the charge',
            format('Crypto payment %s reported %s kobo settled against a charge of %s kobo. Check with the provider before anything else.',
                   p_reference, coalesce(v_settled::text, 'no'), cp.amount_minor),
            'booking', cp.booking_id::text);
    return jsonb_build_object('outcome', 'amount-mismatch', 'state', cp.state);
  end if;

  if v_outcome = 'stale' then
    -- Fix 11, the same for a repeat that changes nothing.
    if cp.transaction_id is not null and cp.state not in ('settled', 'refunded') then
      update public.transactions set processor_checked_at = now()
       where id = cp.transaction_id and status = 'PENDING';
    end if;
    return jsonb_build_object('outcome', v_outcome, 'state', cp.state);
  end if;

  if v_outcome = 'refused' then
    return jsonb_build_object('outcome', v_outcome, 'state', cp.state);
  end if;

  update public.crypto_payments set
    state                  = p_to_state,
    provider_payment_id    = coalesce(provider_payment_id, nullif(f->>'provider_payment_id', '')),
    deposit_address        = coalesce(nullif(f->>'deposit_address', ''), deposit_address),
    deposit_memo           = coalesce(nullif(f->>'deposit_memo', ''), deposit_memo),
    hosted_url             = coalesce(nullif(f->>'hosted_url', ''), hosted_url),
    refund_address         = coalesce(refund_address, nullif(f->>'refund_address', '')),
    tx_hash                = coalesce(nullif(f->>'tx_hash', ''), tx_hash),
    refund_tx_hash         = coalesce(nullif(f->>'refund_tx_hash', ''), refund_tx_hash),
    crypto_received        = coalesce(nullif(f->>'crypto_received', '')::numeric, crypto_received),
    crypto_overpaid        = coalesce(nullif(f->>'crypto_overpaid', '')::numeric, crypto_overpaid),
    crypto_refunded        = coalesce(nullif(f->>'crypto_refunded', '')::numeric, crypto_refunded),
    confirmations          = greatest(coalesce(confirmations, 0), coalesce(nullif(f->>'confirmations', '')::integer, confirmations, 0)),
    confirmations_required = coalesce(nullif(f->>'confirmations_required', '')::integer, confirmations_required),
    quote_expires_at       = coalesce(nullif(f->>'expires_at', '')::timestamptz, quote_expires_at),
    failure_reason         = case when p_to_state in ('failed', 'refunded', 'expired')
                                  then coalesce(nullif(left(f->>'reason', 200), ''), failure_reason) else failure_reason end,
    settled_minor          = case when p_to_state = 'settled' then v_settled else cp.settled_minor end,
    settled_at             = case when p_to_state = 'settled' then coalesce(settled_at, now()) else settled_at end,
    last_event_at          = now()
  where id = cp.id
  returning * into cp;

  if cp.transaction_id is not null then
    if p_to_state in ('awaiting_payment', 'confirming', 'underpaid', 'overpaid', 'converting') then
      update public.transactions set processor_status = 'processing', processor_checked_at = now()
       where id = cp.transaction_id and status = 'PENDING';
    elsif p_to_state = 'expired' then
      update public.transactions set status = 'ABANDONED', processor_status = 'expired', processor_checked_at = now()
       where id = cp.transaction_id and status = 'PENDING';
    elsif p_to_state in ('failed', 'refunded') then
      update public.transactions set status = 'FAILED', processor_status = p_to_state, processor_checked_at = now()
       where id = cp.transaction_id and status in ('PENDING', 'ABANDONED');
    end if;
  end if;

  if p_to_state = 'settled' and not same then
    settle := private.settle_booking_charge(p_reference, cp.amount_minor, 0, null);
    update public.crypto_payments set charge_outcome = settle->>'outcome' where id = cp.id;

    select v.id, v.legal_name, v.method into kyc
      from public.identity_verifications v
     where v.subject_id = cp.payer_id and v.outcome = 'matched'
     order by v.decided_at desc limit 1;

    insert into public.crypto_aml_records (crypto_payment_id, reference, booking_id, agreement_id, payer_id,
      payer_legal_name, payer_kyc_verification_id, payer_kyc_method, payee_user_id, amount_minor, asset, network,
      asset_decimals, crypto_amount, crypto_received, rate_ngn, tx_hash, deposit_address, refund_address, provider,
      provider_reference, charge_outcome, settled_at)
    select cp.id, cp.reference, cp.booking_id, cp.agreement_id, cp.payer_id, kyc.legal_name, kyc.id, kyc.method,
           t.payee_user_id, cp.amount_minor, cp.asset, cp.network, cp.asset_decimals, cp.crypto_amount,
           cp.crypto_received, cp.rate_ngn, cp.tx_hash, cp.deposit_address, cp.refund_address, cp.provider,
           cp.provider_payment_id, settle->>'outcome', cp.settled_at
      from (select 1) one
      left join public.transactions t on t.id = cp.transaction_id
    on conflict (crypto_payment_id) do nothing;

    return jsonb_build_object('outcome', v_outcome, 'state', cp.state, 'charge', settle);
  end if;

  return jsonb_build_object('outcome', v_outcome, 'state', cp.state);
end;
$function$;

revoke all on function public.crypto_payment_apply(text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.crypto_payment_apply(text, text, text, text, text, jsonb) to service_role;

do $$
begin
  if position('in_flight' in pg_get_functiondef('public.crypto_open_attempt(uuid,text)'::regprocedure)) = 0
     or position('private.booking_payment_in_flight' in pg_get_functiondef('public.crypto_open_attempt(uuid,text)'::regprocedure)) = 0 then
    raise exception 'read-back: crypto_open_attempt does not refuse a payment in flight';
  end if;
  if (select count(*) from regexp_matches(pg_get_functiondef('public.crypto_payment_apply(text,text,text,text,text,jsonb)'::regprocedure),
                                          'set processor_checked_at = now\(\)', 'g')) < 2 then
    raise exception 'read-back: crypto_payment_apply does not refresh the in-flight clock on a repeat';
  end if;
  if has_function_privilege('authenticated', 'public.crypto_open_attempt(uuid,text)', 'execute')
     or has_function_privilege('anon', 'public.crypto_open_attempt(uuid,text)', 'execute')
     or has_function_privilege('authenticated', 'public.crypto_payment_apply(text,text,text,text,text,jsonb)', 'execute')
     or has_function_privilege('anon', 'public.crypto_payment_apply(text,text,text,text,text,jsonb)', 'execute') then
    raise exception 'read-back: an API role can call a crypto door';
  end if;
  if not has_function_privilege('service_role', 'public.crypto_open_attempt(uuid,text)', 'execute') then
    raise exception 'read-back: service_role cannot open a crypto attempt';
  end if;
end $$;
