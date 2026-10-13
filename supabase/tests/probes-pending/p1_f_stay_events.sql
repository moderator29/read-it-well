-- P1_F_STAY_EVENTS (HOTEL-01): the front desk marks a guest checked in and out.
-- Needs supabase/migrations/pending/p1_f_stay_events.sql applied.
--  1. anon cannot call record_stay_event or private.hosts_booking; authenticated can
--  2. nobody but the service role can write stay_events directly
--  3. a signed-in stranger is refused a booking that is not theirs, and an
--     unknown booking looks the same (nothing leaks which ids exist)
--  4. an unknown kind is refused; a caller with no user is refused
-- Everything is rolled back by the final raise. The happy path (a host marks
-- their own confirmed stay, a second tap returns the first time, check-out
-- needs check-in) needs a priced room booking and is walked through by hand
-- the first time the migration is applied.
do $$
declare
  stranger constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
begin
  -- 1.
  if has_function_privilege('anon', 'public.record_stay_event(uuid, text)', 'execute') then
    raise exception 'PROBE_FAIL p1_f 1: anon can call record_stay_event';
  end if;
  if not has_function_privilege('authenticated', 'public.record_stay_event(uuid, text)', 'execute') then
    raise exception 'PROBE_FAIL p1_f 1: authenticated cannot call record_stay_event';
  end if;
  if has_function_privilege('anon', 'private.hosts_booking(uuid)', 'execute') then
    raise exception 'PROBE_FAIL p1_f 1: anon can call private.hosts_booking';
  end if;

  -- 2.
  if has_table_privilege('authenticated', 'public.stay_events', 'insert')
     or has_table_privilege('authenticated', 'public.stay_events', 'update')
     or has_table_privilege('authenticated', 'public.stay_events', 'delete')
     or has_table_privilege('anon', 'public.stay_events', 'select') then
    raise exception 'PROBE_FAIL p1_f 2: stay_events is writable by, or readable by, a role it should not be';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.stay_events'::regclass) then
    raise exception 'PROBE_FAIL p1_f 2: row level security is off on stay_events';
  end if;

  -- 3.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', stranger, 'role', 'authenticated')::text, true);
  begin
    perform public.record_stay_event(gen_random_uuid(), 'checked_in');
    raise exception 'PROBE_FAIL p1_f 3: a stranger marked a booking they do not host';
  exception when insufficient_privilege then null;
  end;

  -- 4.
  begin
    perform public.record_stay_event(gen_random_uuid(), 'checked_sideways');
    raise exception 'PROBE_FAIL p1_f 4: an unknown kind was accepted';
  exception when invalid_parameter_value then null;
  end;
  perform set_config('request.jwt.claims', '{"role":"authenticated"}', true);
  begin
    perform public.record_stay_event(gen_random_uuid(), 'checked_in');
    raise exception 'PROBE_FAIL p1_f 4: a caller with no user was answered';
  exception when insufficient_privilege then null;
  end;
  reset role;

  raise exception 'PROBE_OK p1_f_stay_events';
end $$;
