-- TRANSCRIBED FROM THE LIVE DATABASE ON 22 SEPTEMBER 2026.
--
-- Applied to `uccixoonmbhrnyczyigt` on 19 September 2026 at 18:19:50 as version
-- 20260919181950, with NO FILE FOR IT IN THIS REPOSITORY.
-- `grep -rl 'first_first_party_venue' --include='*.sql'` over the whole tree
-- returned nothing, which is how `docs/research/UNFINISHED_WORK_AUDIT.md`
-- section 3.1 found it. Reproduced verbatim from
-- `supabase_migrations.schema_migrations.statements`.
--
-- READ WHAT IT ACTUALLY IS BEFORE READING WHAT IT SAYS IT IS. This is not a
-- schema change. It is a PROBE, of exactly the shape this build's rules
-- require, that was COMMITTED INSTEAD OF ROLLED BACK. It sets role to
-- `authenticated`, forges a JWT claim for a guest and then for a host, holds a
-- table, opens a thread, confirms, proves a stranger reads neither the
-- reservation nor the messages, cancels, and then ends with an UPDATE rather
-- than with `raise exception`. Every row it wrote is still in the live product
-- tables: a `businesses` row it demoted to DRAFT on the way out, the one
-- `reservations` row this platform has, a `conversations` row and two
-- `messages` rows.
--
-- That is the stop list's "writing test rows to live product tables", and the
-- reason the rule for a probe is that it MUST end in a deliberate
-- `raise exception 'PROBE ALL PASS ...'`: the rollback is not a formality, it
-- is the only thing standing between a proof and permanent fixture data in a
-- marketplace's own tables.
--
-- IT IS TRANSCRIBED AND NOT CORRECTED. An applied migration is a record of what
-- ran. Rewriting it here to end in a raise would make this repository describe a
-- database that does not exist, and the rows would still be there. What this
-- file does is make the record readable, so the founder can decide whether the
-- venue, the reservation and the thread stay or go. Removing them is a
-- data-losing operation on live product tables and is therefore his call, not a
-- worker's.
--
-- FOR A REBUILD: this file recreates the same rows on an empty database, which
-- is what makes the file set and the applied set equal. It depends on a
-- `super_admin` in `user_roles` and raises loudly if there is not one.

do $proof$
declare
  v_host  uuid;
  v_guest uuid;
  v_biz   uuid;
  v_res   uuid;
  v_conv  uuid;
  v_slot  timestamptz;
  v_local timestamp;
  n integer;
begin
  select r.user_id into v_host from public.user_roles r where r.role::text = 'super_admin' limit 1;
  v_guest := 'e0000000-0000-4000-8000-000000000001'::uuid;
  if v_host is null then raise exception 'no super_admin account to own the venue'; end if;
  if v_host = v_guest then raise exception 'host and guest must differ'; end if;

  insert into public.businesses (
    owner_id, kind, name, slug, description, source, status,
    state_code, city, area, address, latitude, longitude,
    phone, email, is_demo, published_at, host_type,
    representative_name, hygiene_attested_at
  )
  values (
    v_host, 'restaurant', 'Vallo House Kitchen', 'vallo-house-kitchen-abuja',
    'The company''s own kitchen in Abuja, and the first first-party venue on Vallo. It exists so the reservation loop runs against real inventory rather than against an example.',
    'first_party', 'PUBLISHED',
    'FC', 'Abuja', 'Wuse 2', 'Wuse 2, Abuja', 9.0765, 7.3986,
    '+2348000000000', 'hello@vallospaces.com', false, now(), 'restaurant',
    'VALLO SPACES LTD', now()
  )
  on conflict (slug) do update set status = 'PUBLISHED', is_demo = false
  returning id into v_biz;

  v_local := ((now() at time zone 'Africa/Lagos')::date + 1) + time '19:00';
  v_slot  := v_local at time zone 'Africa/Lagos';

  insert into public.service_windows (business_id, weekday, opens, last_seating, closes, covers)
  values (v_biz, extract(dow from v_local)::smallint, '17:00', '21:30', '23:00', 40)
  on conflict do nothing;

  insert into public.restaurant_profiles (business_id, cuisines, price_band, dress_code, parking, power_backup, outdoor)
  values (v_biz, array['Nigerian','Continental'], 2, 'smart_casual', true, true, true)
  on conflict (business_id) do nothing;

  set local role authenticated;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_guest, 'role', 'authenticated')::text, true);

  insert into public.reservations (business_id, guest_id, party_size, reserved_for, note)
  values (v_biz, v_guest, 4, v_slot, 'Four of us, a window table if you have one.')
  returning id into v_res;
  if v_res is null then raise exception 'FAIL 1: the guest could not hold a table'; end if;

  insert into public.conversations (guest_id, agent_id, context_kind, reservation_id)
  values (v_guest, v_host, 'reservation', v_res)
  returning id into v_conv;
  insert into public.messages (conversation_id, sender_id, body)
  values (v_conv, v_guest, 'Hello, we are coming for dinner tomorrow at seven.');
  update public.reservations set conversation_id = v_conv where id = v_res;

  reset role;
  perform set_config('request.jwt.claims', null, true);

  set local role authenticated;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_host, 'role', 'authenticated')::text, true);

  update public.reservations set status = 'CONFIRMED', responded_at = now() where id = v_res;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL 3: the host could not confirm the table'; end if;

  insert into public.messages (conversation_id, sender_id, body)
  values (v_conv, v_host, 'Your table is held for four at seven. See you tomorrow.');

  perform set_config('request.jwt.claims',
    json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  select count(*) into n from public.reservations where id = v_res;
  if n <> 0 then raise exception 'FAIL 4: a stranger read the reservation'; end if;
  select count(*) into n from public.messages where conversation_id = v_conv;
  if n <> 0 then raise exception 'FAIL 4b: a stranger read % messages in the thread', n; end if;

  reset role;
  perform set_config('request.jwt.claims', null, true);

  set local role authenticated;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_guest, 'role', 'authenticated')::text, true);
  update public.reservations set status = 'CANCELLED' where id = v_res;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL 5: the guest could not cancel'; end if;
  reset role;
  perform set_config('request.jwt.claims', null, true);

  update public.businesses set status = 'DRAFT' where id = v_biz;

  raise notice 'venue % reservation % thread %', v_biz, v_res, v_conv;
end
$proof$;
