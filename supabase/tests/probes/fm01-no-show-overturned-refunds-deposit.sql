-- FM01-NO-SHOW-OVERTURNED-REFUNDS-DEPOSIT (migration fm01): a table deposit
-- kept for a no-show goes back to the card when Vallo resolves the seating
-- dispute as seated. The deposit moves forfeited -> refund_due with reason
-- 'no_show_overturned' (the row the hourly refund job sends back), one audit
-- row names who decided it, the guest is told "Deposit coming back" and the
-- venue "Deposit going back" once each, a second resolve changes nothing, a
-- deposit kept for a late cancellation is never touched, and a non-staff
-- caller cannot resolve.
--
-- It never writes feature_flags. Fixture rows are laid down with
-- session_replication_role = replica (the d75a gate asks the switch), then
-- every move runs with triggers on. Everything is rolled back by the final raise.
do $$
declare
  guest constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  host  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  staffer uuid;
  biz uuid := gen_random_uuid();
  res1 uuid := gen_random_uuid();
  res2 uuid := gen_random_uuid();
  dep1 uuid := gen_random_uuid();
  dep2 uuid := gen_random_uuid();
  ref1 text := 'rm-dep-' || gen_random_uuid();
  at timestamptz := now() - interval '2 days';
  r jsonb;
  d public.reservation_deposits%rowtype;
  n int;
  said text;
begin
  select u.id into staffer from auth.users u where u.id not in (guest, host) order by u.created_at limit 1;
  insert into public.user_roles (user_id, role) values (staffer, 'admin') on conflict do nothing;
  update public.profiles set settings = jsonb_set(coalesce(settings, '{}'), '{notifications,bookings}', 'true')
   where id in (guest, host);

  set local session_replication_role = replica;
  insert into public.businesses (id, owner_id, kind, name, slug, status, source)
  values (biz, host, 'restaurant', 'Probe FM01 Grill', 'probe-fm01-' || biz, 'PUBLISHED', 'first_party');
  insert into public.reservations (id, business_id, guest_id, party_size, reserved_for, status)
  values (res1, biz, guest, 4, at, 'NO_SHOW'), (res2, biz, guest, 2, at + interval '1 hour', 'NO_SHOW');
  insert into public.reservation_seatings (reservation_id, business_id, check_in_code, outcome, outcome_by, outcome_at,
                                           restaurant_answer, restaurant_answered_at, diner_answer, diner_answered_at, disputed_at)
  values (res1, biz, '424242', 'NO_SHOW', 'restaurant', now(), 'NO_SHOW', now(), 'dined', now(), now()),
         (res2, biz, '434343', 'NO_SHOW', 'restaurant', now(), 'NO_SHOW', now(), 'dined', now(), now());
  insert into public.reservation_deposits (id, reservation_id, guest_id, payee_user_id, provider_ref, amount_minor,
                                           payee_subaccount_code, lister_share_minor, commission_minor, commission_bps,
                                           refund_until, status, paid_at, decided_at, outcome_reason)
  values (dep1, res1, guest, host, ref1, 2000000, 'ACCT_probe', 1960000, 40000, 200,
          at - interval '24 hours', 'forfeited', now() - interval '3 days', now(), 'no_show'),
         (dep2, res2, guest, host, 'rm-dep-' || gen_random_uuid(), 1000000, 'ACCT_probe', 980000, 20000, 200,
          at - interval '24 hours', 'forfeited', now() - interval '3 days', now(), 'guest_cancelled_late');
  set local session_replication_role = origin;

  -- 0. A non-staff caller cannot resolve the dispute.
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', guest)::text, true);
  r := public.reservation_resolve_seating(res1, 'SEATED');
  if r->>'status' <> 'not_staff' then raise exception 'PROBE_FAIL fm01 0: guest resolved %', r; end if;
  if (select status from public.reservation_deposits where id = dep1) <> 'forfeited' then
    raise exception 'PROBE_FAIL fm01 0: deposit moved on a refused resolve'; end if;

  -- 1. Vallo resolves it as seated: the deposit is due back to the card.
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', staffer)::text, true);
  r := public.reservation_resolve_seating(res1, 'SEATED');
  if r->>'status' <> 'resolved' then raise exception 'PROBE_FAIL fm01 1: resolve %', r; end if;
  if (select status from public.reservations where id = res1) <> 'COMPLETED' then
    raise exception 'PROBE_FAIL fm01 1: reservation not seated'; end if;
  select * into d from public.reservation_deposits where id = dep1;
  if d.status <> 'refund_due' or d.outcome_reason <> 'no_show_overturned' or d.processor_refund_id is not null then
    raise exception 'PROBE_FAIL fm01 1: deposit % / %', d.status, d.outcome_reason; end if;
  -- The hourly job's own read finds it.
  if not exists (select 1 from public.reservation_deposits where status = 'refund_due' and provider_ref = ref1) then
    raise exception 'PROBE_FAIL fm01 1: the refund job would not see it'; end if;

  -- 2. Audited once, with who decided it.
  select count(*) into n from public.audit_log
   where action = 'reservation.deposit_refund_due' and entity_id = res1::text
     and metadata->>'reason' = 'no_show_overturned' and actor_id = staffer;
  if n <> 1 then raise exception 'PROBE_FAIL fm01 2: audit rows %', n; end if;

  -- 3. Both sides told, in their own words, once.
  select x.body into said from public.notifications x
   where x.user_id = guest and x.title = 'Deposit coming back' and x.created_at >= now() order by x.created_at desc limit 1;
  if said is null or said not like 'Probe FM01 Grill: the no-show on your table for % was overturned, so your NGN 20,000.00 deposit%' then
    raise exception 'PROBE_FAIL fm01 3: guest words %', said; end if;
  select x.body into said from public.notifications x
   where x.user_id = host and x.title = 'Deposit going back' and x.created_at >= now() order by x.created_at desc limit 1;
  if said is null or said not like 'The no-show on the table for % was overturned%' then
    raise exception 'PROBE_FAIL fm01 3: venue words %', said; end if;

  -- 4. Idempotent: resolving again, or replaying the move, changes nothing.
  r := public.reservation_resolve_seating(res1, 'SEATED');
  update public.reservations set status = 'COMPLETED' where id = res1;
  select count(*) into n from public.audit_log
   where action = 'reservation.deposit_refund_due' and entity_id = res1::text and metadata->>'reason' = 'no_show_overturned';
  if n <> 1 then raise exception 'PROBE_FAIL fm01 4: a replay audited again (%)', n; end if;
  select count(*) into n from public.notifications
   where user_id in (guest, host) and title in ('Deposit coming back', 'Deposit going back') and created_at >= now();
  if n <> 2 then raise exception 'PROBE_FAIL fm01 4: a replay told somebody twice (% rows)', n; end if;

  -- 5. A deposit kept for a late cancellation is never touched.
  r := public.reservation_resolve_seating(res2, 'SEATED');
  if (select status from public.reservation_deposits where id = dep2) <> 'forfeited' then
    raise exception 'PROBE_FAIL fm01 5: a late-cancellation deposit moved'; end if;

  -- 6. The refund lands through the existing road: refunded, told, once.
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  if public.reservation_deposit_refunded(ref1, 'probe-refund') <> 'changed' then
    raise exception 'PROBE_FAIL fm01 6: refund not recorded'; end if;
  if public.reservation_deposit_refunded(ref1, 'probe-refund') <> 'unchanged' then
    raise exception 'PROBE_FAIL fm01 6: refund recorded twice'; end if;

  raise exception 'PROBE_OK fm01-no-show-overturned-refunds-deposit';
end $$;
