-- B6 the member money rail (ADR 0003; Part B phases 4 to 10 and 15).
-- A member reads only their own provider account, reported balance, movements
-- and movement history, and none of the webhook log; nothing is writable from
-- the API roles; status moves only through funds_movement_observe, which is
-- idempotent and refuses illegal transitions; nothing is "completed" because
-- Vallo said so; every mirror row carries a reference and an observation time;
-- the movement history is append only; a webhook is recorded once per key; no
-- full account number is stored. Rolls back.
do $$
declare
  a uuid; b uuid;
  ref_a text := 'rm-plw-probe-' || gen_random_uuid()::text;
  ref_b text := 'rm-plw-probe-' || gen_random_uuid()::text;
  mid uuid;
  n int; ok boolean; r text;
begin
  select id into a from auth.users order by created_at limit 1;
  select id into b from auth.users where id <> a order by created_at limit 1;
  if a is null or b is null then raise exception 'PROBE_FAIL b6-member-money-rail: needs two auth users'; end if;

  -- RLS is on everywhere.
  select count(*) into n from pg_class c join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'public' and c.relrowsecurity
     and c.relname in ('financial_provider_accounts', 'member_funds_reported', 'funds_movements',
                       'funds_movement_events', 'provider_webhook_events');
  if n <> 5 then raise exception 'PROBE_FAIL b6-member-money-rail: RLS is not on all five tables (%)', n; end if;

  -- Rows for both members, written as the owner (service_role in production).
  insert into public.financial_provider_accounts (user_id, provider, provider_customer_id, status, provider_status)
  values (a, 'payluk', 'probe-cust-a-' || a, 'ACTIVE', 'active'),
         (b, 'payluk', 'probe-cust-b-' || b, 'ACTIVE', 'active')
  on conflict (user_id, provider) do nothing;
  insert into public.member_funds_reported (user_id, provider, provider_balance_id, available_minor, protected_minor, currency, observed_at)
  values (a, 'payluk', 'probe-bal-a', 100000, 0, 'NGN', now()), (b, 'payluk', 'probe-bal-b', 200000, 0, 'NGN', now())
  on conflict (user_id, provider) do nothing;
  insert into public.funds_movements (user_id, provider, kind, reference, amount_minor, counterparty)
  values (a, 'payluk', 'withdrawal', ref_a, 500000, '{"bank":"Probe Bank","last4":"4821","name":"PROBE A"}'),
         (b, 'payluk', 'withdrawal', ref_b, 700000, '{}');
  select id into mid from public.funds_movements where reference = ref_a;

  -- The ADR 0003 mirror rule: a reference and an observation time on every row.
  if exists (select 1 from public.funds_movements where reference is null or status_observed_at is null)
     or exists (select 1 from public.member_funds_reported where observed_at is null or provider_balance_id is null) then
    raise exception 'PROBE_FAIL b6-member-money-rail: a mirror row lacks a reference or an observation time';
  end if;

  -- Nothing is completed because Vallo said so.
  ok := false;
  begin
    update public.funds_movements set status = 'completed', status_source = 'vallo' where id = mid;
  exception when check_violation then ok := true;
  end;
  if not ok then raise exception 'PROBE_FAIL b6-member-money-rail: Vallo marked a movement completed by itself'; end if;

  -- No full account number.
  ok := false;
  begin
    update public.funds_movements set counterparty = '{"account":"0123456789"}' where id = mid;
  exception when check_violation then ok := true;
  end;
  if not ok then raise exception 'PROBE_FAIL b6-member-money-rail: a full account number was stored'; end if;

  -- The one writer: legal, idempotent, and refusing.
  r := public.funds_movement_observe(ref_a, 'awaiting_confirmation', 'provider_response', 'pending', 'probe-intent', 10000);
  if r <> 'changed' then raise exception 'PROBE_FAIL b6-member-money-rail: staging the intent was %', r; end if;
  r := public.funds_movement_observe(ref_a, 'awaiting_confirmation', 'provider_response', 'pending');
  if r <> 'same' then raise exception 'PROBE_FAIL b6-member-money-rail: a repeated observation was %', r; end if;
  r := public.funds_movement_observe(ref_a, 'processing', 'provider_response', 'pending');
  if r <> 'changed' then raise exception 'PROBE_FAIL b6-member-money-rail: submit was %', r; end if;
  ok := false;
  begin
    perform public.funds_movement_observe(ref_a, 'completed', 'vallo');
  exception when check_violation then ok := true;
  end;
  if not ok then raise exception 'PROBE_FAIL b6-member-money-rail: observe let Vallo complete a movement'; end if;
  r := public.funds_movement_observe(ref_a, 'completed', 'provider_webhook', 'success');
  if r <> 'changed' then raise exception 'PROBE_FAIL b6-member-money-rail: the webhook could not complete it (%)', r; end if;
  r := public.funds_movement_observe(ref_a, 'completed', 'provider_webhook', 'success');
  if r <> 'same' then raise exception 'PROBE_FAIL b6-member-money-rail: a duplicate webhook changed it (%)', r; end if;
  r := public.funds_movement_observe(ref_a, 'failed', 'provider_webhook', 'failed');
  if r <> 'refused' then raise exception 'PROBE_FAIL b6-member-money-rail: completed fell back to failed (%)', r; end if;
  if (select status from public.funds_movements where id = mid) <> 'completed'
     or (select provider_fee_minor from public.funds_movements where id = mid) <> 10000 then
    raise exception 'PROBE_FAIL b6-member-money-rail: the row did not keep the provider''s state and fee';
  end if;
  select count(*) into n from public.funds_movement_events where movement_id = mid;
  if n <> 4 then raise exception 'PROBE_FAIL b6-member-money-rail: expected 4 history rows, found %', n; end if;
  if public.funds_movement_observe('rm-plw-probe-none', 'processing', 'provider_webhook') <> 'not_found' then
    raise exception 'PROBE_FAIL b6-member-money-rail: an unknown reference was not not_found';
  end if;

  -- History is append only, even for the owner.
  ok := false;
  begin
    update public.funds_movement_events set to_status = 'failed' where movement_id = mid;
  exception when others then ok := true;
  end;
  if not ok then raise exception 'PROBE_FAIL b6-member-money-rail: a history row was rewritten'; end if;

  -- One webhook delivery per key.
  insert into public.provider_webhook_events (provider, event_key, event_type, payload, signature_valid)
  values ('payluk', 'probe:' || ref_a || ':payment.withdrawal.success', 'payment.withdrawal.success', '{}', true);
  ok := false;
  begin
    insert into public.provider_webhook_events (provider, event_key, event_type, payload, signature_valid)
    values ('payluk', 'probe:' || ref_a || ':payment.withdrawal.success', 'payment.withdrawal.success', '{}', true);
  exception when unique_violation then ok := true;
  end;
  if not ok then raise exception 'PROBE_FAIL b6-member-money-rail: a webhook was recorded twice'; end if;

  -- As member A.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  if exists (select 1 from public.financial_provider_accounts where user_id <> a)
     or exists (select 1 from public.member_funds_reported where user_id <> a)
     or exists (select 1 from public.funds_movements where user_id <> a)
     or exists (select 1 from public.funds_movement_events e join public.funds_movements m on m.id = e.movement_id where m.user_id <> a) then
    raise exception 'PROBE_FAIL b6-member-money-rail: a member read another member''s money rows';
  end if;
  if not exists (select 1 from public.funds_movements where reference = ref_a)
     or not exists (select 1 from public.financial_provider_accounts where user_id = a) then
    raise exception 'PROBE_FAIL b6-member-money-rail: a member could not read their own rows';
  end if;
  ok := false;
  begin
    perform 1 from public.provider_webhook_events limit 1;
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then raise exception 'PROBE_FAIL b6-member-money-rail: a member could read the webhook log'; end if;

  ok := false;
  begin
    insert into public.financial_provider_accounts (user_id, provider, status) values (a, 'yellowcard', 'ACTIVE');
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then raise exception 'PROBE_FAIL b6-member-money-rail: a member wrote a provider account'; end if;
  ok := false;
  begin
    update public.member_funds_reported set available_minor = 999999999 where user_id = a;
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then raise exception 'PROBE_FAIL b6-member-money-rail: a member rewrote a reported balance'; end if;
  ok := false;
  begin
    insert into public.funds_movements (user_id, provider, kind, reference, amount_minor)
    values (a, 'payluk', 'deposit', 'rm-pld-probe-forged-0001', 100);
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then raise exception 'PROBE_FAIL b6-member-money-rail: a member created a movement'; end if;
  ok := false;
  begin
    perform public.funds_movement_observe(ref_b, 'processing', 'provider_webhook');
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then raise exception 'PROBE_FAIL b6-member-money-rail: a member called the status writer'; end if;
  reset role;

  -- Anonymous reads nothing.
  set local role anon;
  ok := false;
  begin
    perform 1 from public.funds_movements limit 1;
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then raise exception 'PROBE_FAIL b6-member-money-rail: anon could read movements'; end if;
  reset role;

  raise exception 'PROBE_OK b6-member-money-rail';
end $$;
