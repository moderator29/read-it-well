-- CBH01 (pending migration cbh01_chargeback_hold_enforced): a lister with a
-- lost chargeback still owed cannot have a Payluk release or a Rewards
-- Balance payout instructed by Vallo; the gate audits the refusal and pauses
-- the release where staff see it; the database refuses a direct release
-- (standard and milestone); finance overrides one subject with a reason,
-- audited, and the release goes; a stranger, a short reason and the
-- staffer's own hold are refused; the gate is the service role's only.
-- Everything is rolled back by the final raise.
do $$
declare
  lister uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  payer uuid;
  staffer uuid;
  sess uuid := gen_random_uuid();
  stay uuid := 'ed000000-0000-4000-8000-000000000003';
  lagos date := (now() at time zone 'Africa/Lagos')::date;
  tg name;
  rate bigint;
  bk uuid;
  ag uuid := gen_random_uuid();
  arr uuid := gen_random_uuid();
  ms uuid := gen_random_uuid();
  rp uuid := gen_random_uuid();
  rp2 uuid := gen_random_uuid();
  rp_ref text := 'vallo-rw-' || replace(gen_random_uuid()::text, '-', '');
  ref text := 'cbh01-probe-' || gen_random_uuid()::text;
  r jsonb;
  cb uuid;
  refused boolean;
  t text;
begin
  -- The booking fixture the chargebacks probes use.
  for tg in select tgname from pg_trigger where tgrelid = 'public.listings'::regclass and tgfoid = 'private.listing_supply_proof_gate'::regproc loop
    execute format('alter table public.listings disable trigger %I', tg);
  end loop;
  update public.listings set is_demo = false where id = stay;
  for tg in select tgname from pg_trigger where tgrelid = 'public.listings'::regclass and tgfoid = 'private.listing_supply_proof_gate'::regproc loop
    execute format('alter table public.listings enable trigger %I', tg);
  end loop;
  select rate_minor into rate from public.listings where id = stay;
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (stay, lister, lagos + 50, lagos + 52, 2, rate, rate * 2, rate * 2, 'PENDING') returning id into bk;
  perform set_config('vallo.recording_unknown_charge', 'on', true);
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, payee_user_id)
  values (bk, 'paystack', ref, 100000, 'NGN', 'SUCCESSFUL', lister);
  perform set_config('vallo.recording_unknown_charge', '', true);

  select u.id into payer from auth.users u where u.id <> lister order by u.created_at desc limit 1;
  select u.id into staffer from auth.users u where u.id not in (lister, payer) order by u.created_at limit 1;
  insert into public.user_roles (user_id, role) values (staffer, 'admin') on conflict do nothing;
  insert into public.console_step_ups (user_id, session_id, expires_at) values (staffer, sess, now() + interval '1 hour');

  -- A held escrow payment and a milestone for the lister, and a Rewards
  -- payout in flight. Fixture rows only: constraints and triggers are
  -- bypassed for these three inserts, then back on for everything tested.
  set local session_replication_role = replica;
  insert into public.deal_agreements (id, kind, renter_id, owner_id, amount_minor, terms, listing_id, booking_id)
  values (ag, 'stay', payer, lister, 200000, '{}'::jsonb, stay, bk);
  insert into public.provider_arrangements (id, agreement_id, provider, kind, reference, provider_arrangement_id, provider_payment_token,
                                            amount_minor, currency, who_pays_fee, buyer_user_id, seller_user_id,
                                            buyer_customer_id, seller_customer_id, status, status_source)
  values (arr, ag, 'payluk', 'milestone', 'vallo-arr-' || replace(arr::text, '-', ''), 'pl-' || arr, 'tok-' || arr,
          200000, 'NGN', 'seller', payer, lister, 'cust-b', 'cust-s', 'protected', 'vallo');
  insert into public.provider_arrangement_milestones (id, arrangement_id, position, title, amount_minor, provider_milestone_id, status)
  values (ms, arr, 1, 'First month', 100000, 'plm-' || ms, 'pending');
  insert into public.rewards_payouts (id, member_id, amount_minor, reference, status, bank_code, account_last4, account_name, recipient_code)
  values (rp, lister, 5000, rp_ref, 'processing', '058', '1234', 'Probe Lister', 'RCP_probe');
  insert into public.rewards_payouts (id, member_id, amount_minor, reference, status, bank_code, account_last4, account_name, recipient_code)
  values (rp2, lister, 5000, rp_ref || 'b', 'under_review', '058', '1234', 'Probe Lister', 'RCP_probe');
  set local session_replication_role = origin;

  -- No hold yet: the gate is clear.
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  r := public.chargeback_release_gate(arr);
  if r->>'status' <> 'clear' then raise exception 'PROBE_FAIL cbh01: clear gate %', r; end if;

  -- The chargeback is lost and owed: the hold applies.
  r := public.chargeback_open(ref, 'paystack', 'dsp-cbh01-' || arr, 40000);
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL cbh01: open %', r; end if;
  cb := (r->>'chargeback_id')::uuid;
  r := public.chargeback_move(cb, 'lost');
  if r->>'status' <> 'ok' or not public.lister_chargeback_hold(lister) then raise exception 'PROBE_FAIL cbh01: lost %', r; end if;

  -- 1. The gate refuses, audits once, and pauses the release where staff see it.
  r := public.chargeback_release_gate(arr);
  if r->>'status' <> 'held' then raise exception 'PROBE_FAIL cbh01: gate not held %', r; end if;
  r := public.chargeback_release_gate(arr);
  if (select count(*) from public.audit_log where action = 'chargeback.hold_refused' and entity_id = arr::text) <> 1 then
    raise exception 'PROBE_FAIL cbh01: refusal not audited exactly once'; end if;
  if (select release_pause_reason from public.provider_arrangements where id = arr) not like 'chargeback_hold:%' then
    raise exception 'PROBE_FAIL cbh01: release not flagged as paused'; end if;

  -- 2. A direct release is refused by the database: milestone and standard.
  refused := false;
  begin
    update public.provider_arrangement_milestones set status = 'release_requested', release_requested_at = now() where id = ms;
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL cbh01: milestone released while held'; end if;
  update public.provider_arrangements set release_paused_at = null, release_pause_reason = null where id = arr;
  refused := false;
  begin
    update public.provider_arrangements set status = 'release_requested', status_source = 'vallo' where id = arr;
  exception when insufficient_privilege then refused := true; t := sqlerrm;
  end;
  if not refused then raise exception 'PROBE_FAIL cbh01: standard release while held'; end if;
  if t not like 'chargeback_hold:%' then raise exception 'PROBE_FAIL cbh01: wrong refusal %', t; end if;
  r := public.chargeback_release_gate(arr);

  -- 3. Rewards: a payout in flight is not sent, nor released from review.
  if public.rewards_payout_claim_send(rp_ref) then raise exception 'PROBE_FAIL cbh01: rewards payout sent while held'; end if;
  if (select status from public.rewards_payouts where id = rp) <> 'processing' then raise exception 'PROBE_FAIL cbh01: payout moved'; end if;
  if not exists (select 1 from public.audit_log where action = 'chargeback.hold_refused' and entity_id = rp::text) then
    raise exception 'PROBE_FAIL cbh01: payout refusal not audited'; end if;
  perform set_config('request.jwt.claims',
    json_build_object('role', 'authenticated', 'sub', staffer, 'session_id', sess)::text, true);
  t := public.admin_rewards_payout_decide(rp2, 'release', 'looks fine to me');
  if t <> 'chargeback_hold' then raise exception 'PROBE_FAIL cbh01: review release while held %', t; end if;

  -- 4. The override: finance only, a reason, not one's own hold.
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', payer)::text, true);
  r := public.admin_chargeback_hold_override('arrangement', arr, 'the payer confirmed and finance agrees');
  if r->>'status' <> 'forbidden' then raise exception 'PROBE_FAIL cbh01: stranger overrode %', r; end if;
  perform set_config('request.jwt.claims',
    json_build_object('role', 'authenticated', 'sub', staffer, 'session_id', sess)::text, true);
  r := public.admin_chargeback_hold_override('arrangement', arr, 'too short');
  if r->>'status' <> 'reason_required' then raise exception 'PROBE_FAIL cbh01: short reason %', r; end if;
  r := public.admin_chargeback_hold_override('arrangement', arr, 'Recovery plan agreed with the lister on the phone today');
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL cbh01: override %', r; end if;
  if not exists (select 1 from public.audit_log where action = 'chargeback.hold_overridden' and entity_id = arr::text and actor_id = staffer) then
    raise exception 'PROBE_FAIL cbh01: override not audited'; end if;
  if (select release_paused_at from public.provider_arrangements where id = arr) is not null then
    raise exception 'PROBE_FAIL cbh01: override left the hold pause'; end if;
  r := public.admin_chargeback_hold_override('arrangement', arr, 'Recovery plan agreed with the lister on the phone today');
  if r->>'status' <> 'already' then raise exception 'PROBE_FAIL cbh01: second override %', r; end if;
  r := public.admin_chargeback_hold_override('rewards_payout', rp, 'Lister repaid by transfer, awaiting the record');
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL cbh01: payout override %', r; end if;
  r := public.admin_chargeback_hold_override('rewards_payout', rp2, 'Lister repaid by transfer, awaiting the record');
  t := public.admin_rewards_payout_decide(rp2, 'release', 'finance override on file');
  if t <> 'processing' then raise exception 'PROBE_FAIL cbh01: overridden review release %', t; end if;

  -- 5. Overridden: the gate is clear for that payment, the release goes.
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  r := public.chargeback_release_gate(arr);
  if r->>'status' <> 'clear' or (r->>'overridden')::boolean is not true then raise exception 'PROBE_FAIL cbh01: overridden gate %', r; end if;
  update public.provider_arrangement_milestones set status = 'release_requested', release_requested_at = now() where id = ms;
  if not public.rewards_payout_claim_send(rp_ref) then raise exception 'PROBE_FAIL cbh01: overridden payout not sent'; end if;

  -- 6. A staffer cannot override their own hold.
  update public.chargebacks set lister_user_id = staffer where id = cb;
  perform set_config('request.jwt.claims',
    json_build_object('role', 'authenticated', 'sub', staffer, 'session_id', sess)::text, true);
  set local session_replication_role = replica;
  update public.provider_arrangements set seller_user_id = staffer where id = arr;
  set local session_replication_role = origin;
  r := public.admin_chargeback_hold_override('arrangement', arr, 'I would like my own money released please');
  if r->>'status' <> 'own_hold' then raise exception 'PROBE_FAIL cbh01: own hold %', r; end if;

  -- 7. Grants.
  if has_function_privilege('authenticated', 'public.chargeback_release_gate(uuid)', 'execute')
     or has_function_privilege('anon', 'public.chargeback_release_gate(uuid)', 'execute')
     or not has_function_privilege('service_role', 'public.chargeback_release_gate(uuid)', 'execute')
     or has_function_privilege('anon', 'public.admin_chargeback_hold_override(text,uuid,text)', 'execute')
     or has_table_privilege('authenticated', 'public.chargeback_hold_overrides', 'select')
     or has_table_privilege('service_role', 'public.chargeback_hold_overrides', 'insert') then
    raise exception 'PROBE_FAIL cbh01: grants';
  end if;

  raise exception 'PROBE_OK cbh01-chargeback-hold-enforced';
end $$;
