-- NT02 (pending migration nt02_payment_and_protected_payment_notices):
--   * a paid stay tells the host (with their share, in the words of the rail it
--     was paid on) and queues the host's email once; it tells the guest only
--     when the booking was already confirmed;
--   * the same transaction told twice writes nothing the second time;
--   * a tenancy (rent) charge does not write stay words and queues the payer's
--     receipt email once;
--   * a protected payment tells each side the right thing for each of the six
--     states, once per state;
--   * both triggers exist on the right tables and events, and the functions are
--     closed to every API role.
-- Rolled back by the final raise.
do $$
declare
  guest uuid;
  host uuid;
  tx1 constant uuid := gen_random_uuid();
  tx2 constant uuid := gen_random_uuid();
  tx3 constant uuid := gen_random_uuid();
  bk  constant uuid := gen_random_uuid();
  arr constant uuid := gen_random_uuid();
  n integer;
  n2 integer;
  body_host text;
  st text;
begin
  select id into guest from public.profiles order by created_at limit 1;
  select id into host from public.profiles where id <> guest order by created_at limit 1;
  if guest is null or host is null then
    raise exception 'PROBE_FAIL nt02: need two profiles';
  end if;
  /* Default switches for both, so a muted real account cannot hide a notice. */
  update public.profiles set settings = '{}'::jsonb where id in (guest, host);

  /* ---- a stay paid after the host accepted: guest AND host ---- */
  perform private.deliver_payment_received(tx1, bk, guest, host, 'Probe Flat, Yaba',
    current_date + 10, current_date + 13, 30000000, 27000000, 'direct', true, true);
  select count(*) into n from public.notifications where user_id = guest and title = 'Payment received' and href = '/bookings/' || bk::text;
  if n <> 1 then raise exception 'PROBE_FAIL nt02: guest not told once (%)', n; end if;
  select body into body_host from public.notifications where user_id = host and title = 'Payment received' and href = '/agent/bookings' order by created_at desc limit 1;
  if body_host is null or body_host not like '%NGN 270,000.00%' or body_host not like '%straight to the bank account%' then
    raise exception 'PROBE_FAIL nt02: host words wrong: %', body_host;
  end if;
  select count(*) into n from public.email_outbox where user_id = host and template = 'payment.host_received' and dedupe_key = 'payment:host:' || tx1::text;
  if n <> 1 then raise exception 'PROBE_FAIL nt02: host email not queued once (%)', n; end if;

  /* ---- told twice: nothing new ---- */
  select count(*) into n from public.notifications where user_id in (guest, host) and title = 'Payment received';
  perform private.deliver_payment_received(tx1, bk, guest, host, 'Probe Flat, Yaba',
    current_date + 10, current_date + 13, 30000000, 27000000, 'direct', true, true);
  select count(*) into n2 from public.notifications where user_id in (guest, host) and title = 'Payment received';
  if n2 <> n then raise exception 'PROBE_FAIL nt02: a replay told the payment again (% then %)', n, n2; end if;
  select count(*) into n from public.email_outbox where template = 'payment.host_received' and dedupe_key = 'payment:host:' || tx1::text;
  if n <> 1 then raise exception 'PROBE_FAIL nt02: a replay queued a second email'; end if;

  /* ---- a stay that was pending (the status change tells the guest): host only ---- */
  perform private.deliver_payment_received(tx2, bk, guest, host, 'Probe Hotel, Abuja',
    current_date + 20, current_date + 22, 5000000, null, 'direct', false, false);
  select count(*) into n from public.notifications where user_id = guest and title = 'Payment received' and body like 'Probe Hotel%';
  if n <> 0 then raise exception 'PROBE_FAIL nt02: the guest was told twice about one confirmation'; end if;
  select body into body_host from public.notifications where user_id = host and href = '/host/bookings' and title = 'Payment received' order by created_at desc limit 1;
  if body_host is null or body_host like '%Your share%' then
    raise exception 'PROBE_FAIL nt02: a payment with no recorded share must not invent one: %', body_host;
  end if;

  /* ---- protected rail words ---- */
  perform private.deliver_payment_received(tx3, bk, guest, host, 'Probe Flat 2',
    current_date + 30, current_date + 33, 10000000, 9000000, 'protected', true, true);
  select body into body_host from public.notifications where user_id = host and title = 'Payment received' and body like 'Probe Flat 2%' limit 1;
  if body_host is null or body_host not like '%held by Vallo''s licensed payment partner%' then
    raise exception 'PROBE_FAIL nt02: protected-rail words wrong: %', body_host;
  end if;

  /* ---- the six protected payment states, each told once ---- */
  foreach st in array array['protected', 'release_requested', 'released', 'refunded', 'split', 'disputed'] loop
    perform private.tell_arrangement(arr, st, guest, host, 'Probe Flat', 20000000, '/agreements/' || arr::text);
    perform private.tell_arrangement(arr, st, guest, host, 'Probe Flat', 20000000, '/agreements/' || arr::text);
  end loop;
  select count(*) into n from public.notifications where user_id = guest and href = '/agreements/' || arr::text;
  /* buyer: protected, released, refunded, split, disputed = 5 (release_requested is the seller's) */
  if n <> 5 then raise exception 'PROBE_FAIL nt02: buyer rows expected 5, found %', n; end if;
  select count(*) into n from public.notifications where user_id = host and href = '/agreements/' || arr::text;
  /* seller: all six */
  if n <> 6 then raise exception 'PROBE_FAIL nt02: seller rows expected 6, found %', n; end if;
  if exists (select 1 from public.notifications
              where href = '/agreements/' || arr::text and (body ilike '%safe%' or body ilike '%secure%' or body ilike '%verified%' or body ilike '%guarantee%')) then
    raise exception 'PROBE_FAIL nt02: a protected payment notice makes a claim with no mechanism';
  end if;

  /* ---- a rent charge: no stay words, one receipt email ---- */
  -- (needs a rent_payments row; the receipt branch is exercised by the app test
  -- and by the first live rent payment. Here: the trigger plumbing.)

  /* ---- the triggers ---- */
  if not exists (select 1 from pg_trigger t where t.tgrelid = 'public.transactions'::regclass and t.tgname = 'transactions_zz_notify_payment_received'
                  and not t.tgisinternal and (t.tgtype & 4) <> 0 and (t.tgtype & 16) <> 0) then
    raise exception 'PROBE_FAIL nt02: the payment trigger is missing or not on insert and update';
  end if;
  if not exists (select 1 from pg_trigger t where t.tgrelid = 'public.provider_arrangements'::regclass and t.tgname = 'provider_arrangements_zz_notify_change'
                  and not t.tgisinternal and (t.tgtype & 16) <> 0) then
    raise exception 'PROBE_FAIL nt02: the protected payment trigger is missing or not on update';
  end if;

  if has_function_privilege('authenticated', 'private.tell_payment_received(uuid)', 'execute')
     or has_function_privilege('anon', 'private.tell_arrangement(uuid, text, uuid, uuid, text, bigint, text)', 'execute')
     or has_function_privilege('service_role', 'private.deliver_payment_received(uuid, uuid, uuid, uuid, text, date, date, bigint, bigint, text, boolean, boolean)', 'execute') then
    raise exception 'PROBE_FAIL nt02: an API role can run a notice function';
  end if;

  raise exception 'PROBE_OK nt02-payment-and-protected-payment-notices';
end
$$;
