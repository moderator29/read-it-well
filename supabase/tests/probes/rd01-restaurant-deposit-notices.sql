-- RD01-RESTAURANT-DEPOSIT-NOTICES (pending migration rd01): a table deposit
-- that goes back to the card, lands back on it, or is kept by the venue is
-- told once to the guest and once to the venue, in their own words, through
-- private.notify_once; the guest's Bookings switch is honoured; a replay and
-- a move the notice does not cover tell nobody.
--
-- It never writes feature_flags. The deposit rows are laid down with
-- session_replication_role = replica, which skips the d75a gate (the gate
-- asks the switch, and the switch is the founder's), then every status move
-- runs with triggers on, as the outcome trigger, the settle and the refund
-- would make it. Everything is rolled back by the final raise.
do $$
declare
  guest constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  host  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  biz uuid := gen_random_uuid();
  res1 uuid := gen_random_uuid();
  res2 uuid := gen_random_uuid();
  dep1 uuid := gen_random_uuid();
  dep2 uuid := gen_random_uuid();
  at timestamptz := ((now() at time zone 'Africa/Lagos')::date + 3 + time '19:00') at time zone 'Africa/Lagos';
  n int;
  said text;
begin
  if not exists (select 1 from pg_trigger where tgname = 'reservation_deposits_zz_notify'
                   and tgrelid = 'public.reservation_deposits'::regclass) then
    raise exception 'PROBE_FAIL rd01 0: the notice trigger is missing';
  end if;

  -- Fixtures, triggers off for the inserts only.
  set local session_replication_role = replica;
  insert into public.businesses (id, owner_id, kind, name, slug, status, source)
  values (biz, host, 'restaurant', 'Probe RD01 Grill', 'probe-rd01-' || biz, 'PUBLISHED', 'first_party');
  insert into public.reservations (id, business_id, guest_id, party_size, reserved_for, status)
  values (res1, biz, guest, 4, at, 'CONFIRMED'), (res2, biz, guest, 2, at + interval '1 day', 'CONFIRMED');
  insert into public.reservation_deposits (id, reservation_id, guest_id, payee_user_id, provider_ref, amount_minor,
                                           payee_subaccount_code, lister_share_minor, commission_minor, commission_bps,
                                           refund_until, status, paid_at)
  values (dep1, res1, guest, host, 'rm-dep-' || gen_random_uuid(), 2000000, 'ACCT_probe', 1960000, 40000, 200,
          at - interval '24 hours', 'paid', now()),
         (dep2, res2, guest, host, 'rm-dep-' || gen_random_uuid(), 1000000, 'ACCT_probe', 980000, 20000, 200,
          at - interval '24 hours', 'paid', now());
  set local session_replication_role = origin;

  -- 1. paid -> refund_due: both sides told, in their own words.
  update public.reservation_deposits set status = 'refund_due', outcome_reason = 'guest_cancelled_in_time' where id = dep1;
  select count(*) into n from private.notice_keys
   where dedupe_key in ('table_deposit:' || dep1 || ':refund_due:guest', 'table_deposit:' || dep1 || ':refund_due:venue');
  if n <> 2 then raise exception 'PROBE_FAIL rd01 1: refund_due told % of 2', n; end if;
  select x.body into said from public.notifications x
   where x.user_id = guest and x.title = 'Deposit coming back' and x.created_at >= now() order by x.created_at desc limit 1;
  if said is null or said not like 'Probe RD01 Grill: your NGN 20,000.00 deposit%' then
    raise exception 'PROBE_FAIL rd01 1: guest words %', said;
  end if;
  if not exists (select 1 from public.notifications where user_id = host and title = 'Deposit going back'
                   and href = '/host/reservations' and created_at >= now()) then
    raise exception 'PROBE_FAIL rd01 1: the venue was not told';
  end if;
  if not exists (select 1 from public.notifications where user_id = guest and title = 'Deposit coming back'
                   and href = '/pay/deposit/' || res1 and created_at >= now()) then
    raise exception 'PROBE_FAIL rd01 1: the guest notice does not open the deposit page';
  end if;

  -- 2. refund_due -> refunded: told; then the same status again tells nobody.
  update public.reservation_deposits set status = 'refunded', processor_refund_id = 'probe' where id = dep1;
  select count(*) into n from public.notifications
   where user_id in (guest, host) and title = 'Deposit refunded' and created_at >= now();
  if n <> 2 then raise exception 'PROBE_FAIL rd01 2: refunded told % of 2', n; end if;
  update public.reservation_deposits set status = 'refunded' where id = dep1;
  update public.reservation_deposits set status = 'refund_due' where id = dep1;
  update public.reservation_deposits set status = 'refunded' where id = dep1;
  select count(*) into n from public.notifications
   where user_id in (guest, host) and title in ('Deposit refunded', 'Deposit coming back', 'Deposit going back')
     and created_at >= now();
  if n <> 4 then raise exception 'PROBE_FAIL rd01 2: a replay told somebody twice (% rows)', n; end if;

  -- 3. A muted guest: the switch is honoured, the venue is still told, the key is spent.
  update public.profiles set settings = jsonb_set(coalesce(settings, '{}'), '{notifications,bookings}', 'false')
   where id = guest;
  update public.reservation_deposits set status = 'forfeited', outcome_reason = 'no_show' where id = dep2;
  if exists (select 1 from public.notifications where user_id = guest and title = 'Deposit kept' and created_at >= now()) then
    raise exception 'PROBE_FAIL rd01 3: a guest with Bookings off was told';
  end if;
  select x.body into said from public.notifications x
   where x.user_id = host and x.title = 'Deposit kept by you' and x.created_at >= now() limit 1;
  if said is null or said not like 'Nobody came for the table on % deposit is yours.' then
    raise exception 'PROBE_FAIL rd01 3: venue words %', said;
  end if;
  if not exists (select 1 from private.notice_keys where dedupe_key = 'table_deposit:' || dep2 || ':forfeited:guest') then
    raise exception 'PROBE_FAIL rd01 3: the muted guest''s key was not spent';
  end if;

  -- 4. A move the notice does not cover (forfeited -> applied) tells nobody.
  select count(*) into n from public.notifications where user_id in (guest, host) and created_at >= now();
  update public.reservation_deposits set status = 'applied' where id = dep2;
  if (select count(*) from public.notifications where user_id in (guest, host) and created_at >= now()) <> n then
    raise exception 'PROBE_FAIL rd01 4: an applied deposit was announced';
  end if;

  raise exception 'PROBE_OK rd01-restaurant-deposit-notices: refund_due, refunded and forfeited told once to each side; switch honoured; replays silent';
end $$;
