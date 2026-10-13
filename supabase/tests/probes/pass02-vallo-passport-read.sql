-- PASS02 (pending migration pass02_vallo_passport_read): the Vallo passport's
-- read model gives a signed-in member only what its owner left on.
--  1. a signed-in member reads another member's passport (the control), and
--     every figure on it is counted from rows: a member with no bookings,
--     payments, reviews or conversations has zeros, no average and no reply
--     band, and the role is renter; nothing is invented
--  2. a line the owner switched off comes back NULL, and the lines left on do not
--  3. a passport that is off returns no row and says no to passport_open
--  4. a block in either direction returns no row
--  5. signed out returns no row; anon cannot call any door; the private
--     assembler is not callable by an API role
--  6. the owner's own read returns every line with the switches
--  7. no function reads a phone, an email, an ID number, a date of birth or an address
-- Everything is rolled back by the final raise.
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  d uuid := gen_random_uuid();
  tag text := substr(md5(random()::text), 1, 8);
  r record; n int; body text;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  select x.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'probe-pass02-' || x.k || '-' || tag || '@example.invalid', '{}', '{}', now(), now()
    from (values (a, 'a'), (b, 'b'), (c, 'c'), (d, 'd')) as x(id, k);
  /* A new account gets its profile rows from a trigger; "if missing" keeps this true either way. */
  insert into public.social_profiles (user_id, handle)
  select x.id, 'pps' || x.k || tag from (values (a, 'a'), (b, 'b'), (c, 'c'), (d, 'd')) as x(id, k)
  on conflict (user_id) do nothing;

  -- 1. The control, and nothing invented.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select * into r from public.passport_read(b);
  if r.subject_id is distinct from b then raise exception 'PROBE_FAIL pass02-vallo-passport-read 1: a signed-in member could not read an open passport'; end if;
  if r.joined_at is null or r.verification is distinct from 'none' then
    raise exception 'PROBE_FAIL pass02-vallo-passport-read 1: the join date or the level is missing';
  end if;
  if r.rentals is distinct from 0 or r.stays is distinct from 0 or r.review_count is distinct from 0
     or r.review_average is not null or r.reply_band is not null then
    raise exception 'PROBE_FAIL pass02-vallo-passport-read 1: a figure was invented for a member with no rows behind it';
  end if;
  if r.roles is distinct from array['renter']::text[] then
    raise exception 'PROBE_FAIL pass02-vallo-passport-read 1: a member with no supply side is not a renter';
  end if;
  if not public.passport_open(b) then raise exception 'PROBE_FAIL pass02-vallo-passport-read 1: passport_open refused an open passport'; end if;

  -- 2. B switches every line off: the row stays, every line is NULL, the name and handle remain.
  reset role;
  insert into public.passport_settings (user_id, enabled, hidden_lines)
  values (b, true, array['photo','role','joined','verification','rentals','stays','reviews','response','languages']);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select * into r from public.passport_read(b);
  if r.subject_id is distinct from b or r.handle is null then
    raise exception 'PROBE_FAIL pass02-vallo-passport-read 2: switching every line off removed the passport itself';
  end if;
  if r.photo is not null or r.roles is not null or r.joined_at is not null or r.verification is not null
     or r.rentals is not null or r.stays is not null or r.review_count is not null or r.review_average is not null
     or r.reply_band is not null or r.pidgin_ok is not null then
    raise exception 'PROBE_FAIL pass02-vallo-passport-read 2: a hidden line left the database';
  end if;
  -- ...and one line left on is still there.
  reset role;
  update public.passport_settings set hidden_lines = array['photo','rentals'] where user_id = b;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select * into r from public.passport_read(b);
  if r.joined_at is null or r.roles is null or r.verification is null then
    raise exception 'PROBE_FAIL pass02-vallo-passport-read 2: a line left on was hidden';
  end if;
  if r.rentals is not null then raise exception 'PROBE_FAIL pass02-vallo-passport-read 2: a hidden count left the database'; end if;

  -- 3. Off: no row, and passport_open says no.
  reset role;
  update public.passport_settings set enabled = false where user_id = b;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.passport_read(b);
  if n <> 0 then raise exception 'PROBE_FAIL pass02-vallo-passport-read 3: a passport that is off was read'; end if;
  if public.passport_open(b) then raise exception 'PROBE_FAIL pass02-vallo-passport-read 3: passport_open said yes to a passport that is off'; end if;

  -- 4. A block in either direction: no row, and no difference from "off".
  reset role;
  insert into public.blocks (user_id, other_id) values (c, a);   -- C blocked A
  insert into public.blocks (user_id, other_id) values (a, d);   -- A blocked D
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.passport_read(c);
  if n <> 0 then raise exception 'PROBE_FAIL pass02-vallo-passport-read 4: a blocked viewer read the passport (they blocked me)'; end if;
  select count(*) into n from public.passport_read(d);
  if n <> 0 then raise exception 'PROBE_FAIL pass02-vallo-passport-read 4: a blocked viewer read the passport (I blocked them)'; end if;
  if public.passport_open(c) or public.passport_open(d) then
    raise exception 'PROBE_FAIL pass02-vallo-passport-read 4: passport_open said yes across a block';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated')::text, true);
  select count(*) into n from public.passport_read(a);
  if n <> 0 then raise exception 'PROBE_FAIL pass02-vallo-passport-read 4: the person I blocked read my passport'; end if;

  -- 5. Signed out, anon and the private assembler.
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated')::text, true);
  select count(*) into n from public.passport_read(c);
  if n <> 0 then raise exception 'PROBE_FAIL pass02-vallo-passport-read 5: a signed-out caller read a passport'; end if;
  if public.passport_open(c) then raise exception 'PROBE_FAIL pass02-vallo-passport-read 5: passport_open said yes to a signed-out caller'; end if;
  select count(*) into n from public.my_passport();
  if n <> 0 then raise exception 'PROBE_FAIL pass02-vallo-passport-read 5: my_passport answered with nobody signed in'; end if;
  reset role;
  if has_function_privilege('anon', 'public.passport_read(uuid)', 'execute')
     or has_function_privilege('anon', 'public.passport_open(uuid)', 'execute')
     or has_function_privilege('anon', 'public.my_passport()', 'execute') then
    raise exception 'PROBE_FAIL pass02-vallo-passport-read 5: anon can call a passport function';
  end if;
  if has_function_privilege('authenticated', 'private.passport_all(uuid)', 'execute')
     or has_function_privilege('anon', 'private.passport_all(uuid)', 'execute') then
    raise exception 'PROBE_FAIL pass02-vallo-passport-read 5: an API role can call the private assembler';
  end if;

  -- 6. The owner's own read: every line (even with the passport off) and the switches.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select * into r from public.my_passport();
  if r.subject_id is distinct from b or r.joined_at is null or r.roles is null or r.verification is null then
    raise exception 'PROBE_FAIL pass02-vallo-passport-read 6: the owner''s read is missing lines';
  end if;
  if r.enabled is distinct from false or r.hidden_lines is distinct from array['photo','rentals']::text[] then
    raise exception 'PROBE_FAIL pass02-vallo-passport-read 6: the owner''s read does not carry the switches';
  end if;
  reset role;

  -- 7. Nothing sensitive is selectable by any function in the read model.
  for body in
    select pg_get_functiondef(p.oid)
      from pg_proc p join pg_namespace s on s.oid = p.pronamespace
     where (s.nspname, p.proname) in (('private', 'passport_all'), ('public', 'passport_read'), ('public', 'passport_open'), ('public', 'my_passport'))
  loop
    if body ~* '(phone|email|date_of_birth|birth|address|nin_number|document_number|identity_documents)' then
      raise exception 'PROBE_FAIL pass02-vallo-passport-read 7: a passport function mentions a sensitive field';
    end if;
  end loop;

  raise exception 'PROBE_OK pass02-vallo-passport-read';
end
$$;
