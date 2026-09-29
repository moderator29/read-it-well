-- The passcode layer: every member's app-lock code, held only as a bcrypt hash.
--
-- A passcode is the "Welcome back" lock on top of a normal session, in the
-- style of a banking app. It never replaces the password or a social sign-in;
-- it decides whether an already signed-in browser may show the app and move
-- money right now. docs/PASSCODE.md is the design.
--
-- WHAT THIS ADDS.
--   public.member_passcodes    one row per member: the bcrypt hash, the length
--                              (6 by default, or 4), the failure counter, the
--                              cooldown and the reset flag. RLS on, no policy,
--                              and no privilege for anon or authenticated: no
--                              member can read a hash, their own included.
--   public.passcode_status()   what the gate needs: unset, set or
--                              reset_required, the length and the cooldown.
--                              Never the hash.
--   public.passcode_set(code, length, current)
--                              first setup needs nothing more than a session;
--                              replacing a code needs the current one or a
--                              fresh sign-in (an `amr` entry in the verified
--                              token inside the last 15 minutes).
--   public.passcode_verify(code)
--                              5 wrong in a row gives a 30 second cooldown,
--                              10 cumulative wrong sets reset_required, after
--                              which only a full sign-in can set a new code.
--
-- Set, change, reset and each lockout write an audit_log row. No code is ever
-- written anywhere but into crypt(), and no function returns the hash.
--
-- The trivial-code rule (one repeated digit, a straight run up or down, the
-- member's birth year when their metadata carries one) is mirrored in
-- apps/web/src/lib/passcode/rules.ts, which refuses the same codes before
-- they are sent.

create table public.member_passcodes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  hash text not null,
  length smallint not null check (length in (4, 6)),
  set_at timestamptz not null default now(),
  failed_count integer not null default 0 check (failed_count >= 0),
  locked_until timestamptz,
  reset_required boolean not null default false,
  updated_at timestamptz not null default now()
);

comment on table public.member_passcodes is
  'The app-lock passcode, bcrypt only. Read and written through the passcode_* definer functions; no member privilege on the table.';

alter table public.member_passcodes enable row level security;

revoke all on table public.member_passcodes from public, anon, authenticated;
grant select, insert, update, delete on table public.member_passcodes to service_role;

-- One repeated digit, a straight run up or down, or the birth year.
create or replace function private.passcode_is_trivial(p_code text, p_birth_year integer default null)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_code is null
      or p_code ~ '^(\d)\1*$'
      or strpos('0123456789', p_code) > 0
      or strpos('9876543210', p_code) > 0
      or (p_birth_year is not null and p_code = p_birth_year::text);
$$;

-- The birth year, when the account's metadata carries one. Nothing on the
-- platform collects it today; this is the hook the rule reads when it does.
create or replace function private.passcode_birth_year(p_uid uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
           when m ->> 'birth_year' ~ '^(19|20)\d\d$' then (m ->> 'birth_year')::integer
           when m ->> 'birthdate' ~ '^(19|20)\d\d-' then left(m ->> 'birthdate', 4)::integer
           when m ->> 'birthday' ~ '^(19|20)\d\d-' then left(m ->> 'birthday', 4)::integer
         end
    from (select coalesce(u.raw_user_meta_data, '{}'::jsonb) as m from auth.users u where u.id = p_uid) x;
$$;

-- Did this session sign in (password, Google, Apple, an emailed code or a
-- recovery link) inside the window? Read from the verified token's `amr`.
create or replace function private.passcode_fresh_proof(p_window_seconds integer)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(bool_or(
           (e ->> 'timestamp')::numeric between extract(epoch from now()) - p_window_seconds
                                            and extract(epoch from now()) + 60), false)
    from jsonb_array_elements(
           case when jsonb_typeof(auth.jwt() -> 'amr') = 'array' then auth.jwt() -> 'amr' else '[]'::jsonb end) e
   where jsonb_typeof(e -> 'timestamp') = 'number';
$$;

create or replace function private.passcode_audit(p_uid uuid, p_action text, p_meta jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (p_uid, p_action, 'member_passcode', p_uid::text, coalesce(p_meta, '{}'::jsonb));
$$;

-- One attempt against the stored code, counted. Shared by verify and by a
-- change that offers the current code, so neither is a way round the count.
create or replace function private.passcode_attempt(p_uid uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.member_passcodes%rowtype;
  v_ok boolean;
  v_failed integer;
begin
  select * into r from public.member_passcodes where user_id = p_uid for update;
  if not found then
    return jsonb_build_object('status', 'unset');
  end if;
  if r.reset_required then
    return jsonb_build_object('status', 'reset_required', 'length', r.length);
  end if;
  if r.locked_until is not null and r.locked_until > now() then
    return jsonb_build_object(
      'status', 'cooldown',
      'length', r.length,
      'failed_count', r.failed_count,
      'retry_after_seconds', greatest(1, ceil(extract(epoch from r.locked_until - now()))::integer));
  end if;

  -- crypt() runs whatever was typed, so a malformed code costs the same time.
  v_ok := extensions.crypt(coalesce(p_code, ''), r.hash) = r.hash
          and coalesce(p_code, '') ~ '^\d+$'
          and length(p_code) = r.length;

  if v_ok then
    update public.member_passcodes
       set failed_count = 0, locked_until = null, updated_at = now()
     where user_id = p_uid;
    return jsonb_build_object('status', 'ok', 'length', r.length);
  end if;

  v_failed := r.failed_count + 1;

  if v_failed >= 10 then
    update public.member_passcodes
       set failed_count = v_failed, locked_until = null, reset_required = true, updated_at = now()
     where user_id = p_uid;
    perform private.passcode_audit(p_uid, 'passcode.lockout', jsonb_build_object('kind', 'sign_out', 'failed_count', v_failed));
    return jsonb_build_object('status', 'reset_required', 'length', r.length, 'failed_count', v_failed);
  end if;

  if v_failed % 5 = 0 then
    update public.member_passcodes
       set failed_count = v_failed, locked_until = now() + interval '30 seconds', updated_at = now()
     where user_id = p_uid;
    perform private.passcode_audit(p_uid, 'passcode.lockout', jsonb_build_object('kind', 'cooldown', 'failed_count', v_failed));
    return jsonb_build_object('status', 'cooldown', 'length', r.length, 'failed_count', v_failed, 'retry_after_seconds', 30);
  end if;

  update public.member_passcodes
     set failed_count = v_failed, updated_at = now()
   where user_id = p_uid;
  return jsonb_build_object('status', 'wrong', 'length', r.length, 'failed_count', v_failed);
end;
$$;

create or replace function public.passcode_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  r public.member_passcodes%rowtype;
begin
  if v_uid is null then
    raise exception 'Sign in to continue.' using errcode = '42501';
  end if;
  select * into r from public.member_passcodes where user_id = v_uid;
  if not found then
    return jsonb_build_object('state', 'unset');
  end if;
  return jsonb_build_object(
    'state', case when r.reset_required then 'reset_required' else 'set' end,
    'length', r.length,
    'failed_count', r.failed_count,
    'locked_until', r.locked_until);
end;
$$;

create or replace function public.passcode_verify(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Sign in to continue.' using errcode = '42501';
  end if;
  return private.passcode_attempt(v_uid, p_code);
end;
$$;

create or replace function public.passcode_set(p_code text, p_length integer, p_current text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  r public.member_passcodes%rowtype;
  v_attempt jsonb;
  v_event text;
begin
  if v_uid is null then
    raise exception 'Sign in to continue.' using errcode = '42501';
  end if;
  if p_length is null or p_length not in (4, 6) or p_code is null or p_code !~ ('^\d{' || p_length || '}$') then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  if private.passcode_is_trivial(p_code, private.passcode_birth_year(v_uid)) then
    return jsonb_build_object('ok', false, 'reason', 'trivial');
  end if;

  select * into r from public.member_passcodes where user_id = v_uid for update;

  if not found then
    insert into public.member_passcodes (user_id, hash, length)
    values (v_uid, extensions.crypt(p_code, extensions.gen_salt('bf', 10)), p_length);
    perform private.passcode_audit(v_uid, 'passcode.set', jsonb_build_object('length', p_length));
    return jsonb_build_object('ok', true, 'event', 'set');
  end if;

  if p_current is not null and not r.reset_required then
    v_attempt := private.passcode_attempt(v_uid, p_current);
    if v_attempt ->> 'status' <> 'ok' then
      return jsonb_build_object('ok', false, 'reason', 'current', 'attempt', v_attempt);
    end if;
    v_event := 'change';
  elsif private.passcode_fresh_proof(900) then
    v_event := 'reset';
  else
    return jsonb_build_object('ok', false, 'reason', 'proof_required');
  end if;

  update public.member_passcodes
     set hash = extensions.crypt(p_code, extensions.gen_salt('bf', 10)),
         length = p_length,
         set_at = now(),
         failed_count = 0,
         locked_until = null,
         reset_required = false,
         updated_at = now()
   where user_id = v_uid;
  perform private.passcode_audit(v_uid, 'passcode.' || v_event,
    jsonb_build_object('length', p_length, 'was_reset_required', r.reset_required));
  return jsonb_build_object('ok', true, 'event', v_event);
end;
$$;

revoke all on function private.passcode_is_trivial(text, integer) from public, anon, authenticated;
revoke all on function private.passcode_birth_year(uuid) from public, anon, authenticated;
revoke all on function private.passcode_fresh_proof(integer) from public, anon, authenticated;
revoke all on function private.passcode_audit(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function private.passcode_attempt(uuid, text) from public, anon, authenticated;

revoke all on function public.passcode_status() from public, anon;
revoke all on function public.passcode_verify(text) from public, anon;
revoke all on function public.passcode_set(text, integer, text) from public, anon;
grant execute on function public.passcode_status() to authenticated, service_role;
grant execute on function public.passcode_verify(text) to authenticated, service_role;
grant execute on function public.passcode_set(text, integer, text) to authenticated, service_role;

-- Read-back of what was granted.
do $readback$
begin
  if has_table_privilege('anon', 'public.member_passcodes', 'select')
     or has_table_privilege('authenticated', 'public.member_passcodes', 'select')
     or has_table_privilege('authenticated', 'public.member_passcodes', 'update') then
    raise exception 'PASSCODE read-back: a client role holds a privilege on member_passcodes';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.member_passcodes'::regclass) then
    raise exception 'PASSCODE read-back: RLS is off on member_passcodes';
  end if;
  if has_function_privilege('anon', 'public.passcode_verify(text)', 'execute')
     or has_function_privilege('anon', 'public.passcode_set(text, integer, text)', 'execute')
     or has_function_privilege('anon', 'public.passcode_status()', 'execute') then
    raise exception 'PASSCODE read-back: anon can execute a passcode function';
  end if;
  if not has_function_privilege('authenticated', 'public.passcode_verify(text)', 'execute') then
    raise exception 'PASSCODE read-back: authenticated cannot verify';
  end if;
  if has_function_privilege('authenticated', 'private.passcode_attempt(uuid, text)', 'execute') then
    raise exception 'PASSCODE read-back: authenticated can call the private attempt directly';
  end if;
end;
$readback$;

-- Behaviour, as the real roles, with fixtures that never survive: the block
-- raises PROBE_OK at its end, which rolls every fixture back.
do $probe$
declare
  v_a uuid := gen_random_uuid();
  v_b uuid := gen_random_uuid();
  v_ans jsonb;
  v_hash text;
  v_state text;
  v_now bigint := extract(epoch from now())::bigint;
  i integer;
begin
  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'passcode-probe-' || n || '@example.invalid', 'x', now(), now(),
           '{"provider":"email","providers":["email"]}', '{"birth_year":"1988"}'
      from (values (v_a, 'a'), (v_b, 'b')) x(u, n);

    -- A, signed in an hour ago: no fresh proof.
    perform set_config('request.jwt.claims', json_build_object('sub', v_a, 'role', 'authenticated',
      'amr', json_build_array(json_build_object('method', 'password', 'timestamp', v_now - 3600)))::text, true);

    -- 1. Nothing set yet.
    if public.passcode_status() ->> 'state' <> 'unset' then raise exception 'PROBE FAILED: status is not unset'; end if;

    -- 2. Trivial and malformed codes are refused, as the member.
    set local role authenticated;
    foreach v_state in array array['111111', '123456', '654321', '345678', '000000'] loop
      v_ans := public.passcode_set(v_state, 6);
      if v_ans ->> 'reason' is distinct from 'trivial' then raise exception 'PROBE FAILED: % was not refused as trivial: %', v_state, v_ans; end if;
    end loop;
    if public.passcode_set('1234', 4) ->> 'reason' is distinct from 'trivial' then raise exception 'PROBE FAILED: 1234 accepted'; end if;
    if public.passcode_set('1988', 4) ->> 'reason' is distinct from 'trivial' then raise exception 'PROBE FAILED: the birth year was accepted'; end if;
    if public.passcode_set('48091', 6) ->> 'reason' is distinct from 'invalid' then raise exception 'PROBE FAILED: five digits accepted for six'; end if;
    if public.passcode_set('48a913', 6) ->> 'reason' is distinct from 'invalid' then raise exception 'PROBE FAILED: a letter accepted'; end if;
    if public.passcode_set('4809', 5) ->> 'reason' is distinct from 'invalid' then raise exception 'PROBE FAILED: length 5 accepted'; end if;

    -- 3. Set and verify work (the control that must succeed).
    v_ans := public.passcode_set('480913', 6);
    if (v_ans ->> 'ok')::boolean is not true or v_ans ->> 'event' <> 'set' then raise exception 'PROBE FAILED: first set: %', v_ans; end if;
    if public.passcode_verify('480913') ->> 'status' <> 'ok' then raise exception 'PROBE FAILED: the right code was refused'; end if;
    v_ans := public.passcode_status();
    if v_ans ->> 'state' <> 'set' or (v_ans ->> 'length')::int <> 6 or v_ans ? 'hash' then raise exception 'PROBE FAILED: status %', v_ans; end if;

    -- 4. The member cannot read the table, their own row included.
    begin
      perform count(*) from public.member_passcodes;
      raise exception 'PROBE FAILED: authenticated read member_passcodes';
    exception when insufficient_privilege then null;
    end;
    reset role;

    select hash into v_hash from public.member_passcodes where user_id = v_a;
    if v_hash is null or v_hash like '%480913%' or v_hash !~ '^\$2[abxy]?\$10\$' then raise exception 'PROBE FAILED: the stored value is not a cost-10 bcrypt hash'; end if;
    if not exists (select 1 from public.audit_log where actor_id = v_a and action = 'passcode.set') then raise exception 'PROBE FAILED: no audit row for set'; end if;

    -- 5. Replacing the code with no current code and no fresh sign-in is refused.
    set local role authenticated;
    if public.passcode_set('730258', 6) ->> 'reason' <> 'proof_required' then raise exception 'PROBE FAILED: a stale session replaced the code'; end if;

    -- 6. Five wrong gives the cooldown; the right code is refused during it.
    for i in 1..4 loop
      v_ans := public.passcode_verify('999990');
      if v_ans ->> 'status' <> 'wrong' then raise exception 'PROBE FAILED: wrong attempt % answered %', i, v_ans; end if;
    end loop;
    v_ans := public.passcode_verify('999990');
    if v_ans ->> 'status' <> 'cooldown' or (v_ans ->> 'retry_after_seconds')::int <> 30 then raise exception 'PROBE FAILED: fifth wrong: %', v_ans; end if;
    if public.passcode_verify('480913') ->> 'status' <> 'cooldown' then raise exception 'PROBE FAILED: the right code passed during the cooldown'; end if;
    reset role;
    if not exists (select 1 from public.audit_log where actor_id = v_a and action = 'passcode.lockout' and metadata ->> 'kind' = 'cooldown') then
      raise exception 'PROBE FAILED: no audit row for the cooldown';
    end if;

    -- 7. After the cooldown, ten cumulative wrong sets reset_required, and then even the right code fails.
    update public.member_passcodes set locked_until = now() - interval '1 second' where user_id = v_a;
    set local role authenticated;
    for i in 6..9 loop
      if public.passcode_verify('999990') ->> 'status' <> 'wrong' then raise exception 'PROBE FAILED: wrong attempt %', i; end if;
    end loop;
    v_ans := public.passcode_verify('999990');
    if v_ans ->> 'status' <> 'reset_required' then raise exception 'PROBE FAILED: tenth wrong: %', v_ans; end if;
    if public.passcode_verify('480913') ->> 'status' <> 'reset_required' then raise exception 'PROBE FAILED: the right code passed after the lockout'; end if;
    if public.passcode_status() ->> 'state' <> 'reset_required' then raise exception 'PROBE FAILED: status after lockout'; end if;
    -- The old code is no way back either.
    if public.passcode_set('730258', 6, '480913') ->> 'reason' <> 'proof_required' then raise exception 'PROBE FAILED: the old code reset a locked-out passcode'; end if;
    reset role;
    if not exists (select 1 from public.audit_log where actor_id = v_a and action = 'passcode.lockout' and metadata ->> 'kind' = 'sign_out') then
      raise exception 'PROBE FAILED: no audit row for the sign-out lockout';
    end if;

    -- 8. A fresh sign-in sets a new code.
    perform set_config('request.jwt.claims', json_build_object('sub', v_a, 'role', 'authenticated',
      'amr', json_build_array(json_build_object('method', 'password', 'timestamp', v_now - 30)))::text, true);
    set local role authenticated;
    v_ans := public.passcode_set('7302', 4);
    if (v_ans ->> 'ok')::boolean is not true or v_ans ->> 'event' <> 'reset' then raise exception 'PROBE FAILED: fresh reset: %', v_ans; end if;
    if public.passcode_verify('7302') ->> 'status' <> 'ok' then raise exception 'PROBE FAILED: the new 4-digit code'; end if;
    if public.passcode_verify('480913') ->> 'status' = 'ok' then raise exception 'PROBE FAILED: the old code still works'; end if;

    -- 9. Change with the current code, on a stale session.
    perform set_config('request.jwt.claims', json_build_object('sub', v_a, 'role', 'authenticated',
      'amr', json_build_array(json_build_object('method', 'password', 'timestamp', v_now - 3600)))::text, true);
    if public.passcode_set('580317', 6, '0000') ->> 'reason' <> 'current' then raise exception 'PROBE FAILED: a wrong current code changed it'; end if;
    v_ans := public.passcode_set('580317', 6, '7302');
    if v_ans ->> 'event' is distinct from 'change' then raise exception 'PROBE FAILED: change with the current code: %', v_ans; end if;
    reset role;
    if not exists (select 1 from public.audit_log where actor_id = v_a and action = 'passcode.change')
       or not exists (select 1 from public.audit_log where actor_id = v_a and action = 'passcode.reset') then
      raise exception 'PROBE FAILED: no audit rows for change and reset';
    end if;
    if exists (select 1 from public.audit_log where actor_id = v_a and metadata::text ~ '(480913|7302|580317)') then
      raise exception 'PROBE FAILED: a code reached the audit log';
    end if;

    -- 10. Another member cannot verify or read A's passcode.
    perform set_config('request.jwt.claims', json_build_object('sub', v_b, 'role', 'authenticated')::text, true);
    set local role authenticated;
    if public.passcode_verify('580317') ->> 'status' <> 'unset' then raise exception 'PROBE FAILED: B verified against A'; end if;
    if public.passcode_status() ->> 'state' <> 'unset' then raise exception 'PROBE FAILED: B saw a status'; end if;
    begin
      perform hash from public.member_passcodes where user_id = v_a;
      raise exception 'PROBE FAILED: B read A''s row';
    exception when insufficient_privilege then null;
    end;
    reset role;
    if (select failed_count from public.member_passcodes where user_id = v_a) <> 0 then raise exception 'PROBE FAILED: B''s attempt counted against A'; end if;

    -- 11. anon is refused outright.
    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    begin
      set local role anon;
      perform public.passcode_verify('580317');
      raise exception 'PROBE FAILED: anon executed passcode_verify';
    exception when insufficient_privilege then null;
    end;
    begin
      set local role anon;
      perform public.passcode_set('580317', 6);
      raise exception 'PROBE FAILED: anon executed passcode_set';
    exception when insufficient_privilege then null;
    end;
    begin
      set local role anon;
      perform count(*) from public.member_passcodes;
      raise exception 'PROBE FAILED: anon read member_passcodes';
    exception when insufficient_privilege then null;
    end;
    reset role;

    raise exception 'PROBE_OK';
  exception when others then
    if sqlerrm <> 'PROBE_OK' then raise; end if;
  end;
  perform set_config('request.jwt.claims', '', true);
  if exists (select 1 from auth.users where id in (v_a, v_b))
     or exists (select 1 from public.member_passcodes where user_id in (v_a, v_b)) then
    raise exception 'PROBE FAILED: residue left behind';
  end if;
end;
$probe$;
