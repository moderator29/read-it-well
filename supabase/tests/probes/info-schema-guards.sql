-- The two "born locked" assertions that read information_schema.role_table_grants
-- (migrations 20260923092729 push_tokens and 20260923093115 known_devices).
-- That view lists only grants the OBSERVING role is party to, so under the
-- migration role it came back empty and both assertions passed by seeing
-- nothing. Applied migrations cannot be edited, so the claims are re-made here
-- with has_table_privilege (which answers for the named role) and by
-- behaviour, and run on every probe run.
--   known_devices: no privilege at all for anon or authenticated.
--   push_tokens:   authenticated may SELECT (its own rows, by policy); nothing else.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  bad text := '';
  r text;
  p text;
  n bigint;
begin
  foreach r in array array['anon', 'authenticated'] loop
    foreach p in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
      if has_table_privilege(r, 'public.known_devices'::regclass, p) then
        bad := bad || format(' [%s holds %s on known_devices]', r, p);
      end if;
      if has_table_privilege(r, 'public.push_tokens'::regclass, p) and not (r = 'authenticated' and p = 'SELECT') then
        bad := bad || format(' [%s holds %s on push_tokens]', r, p);
      end if;
    end loop;
    if has_any_column_privilege(r, 'public.known_devices'::regclass, 'SELECT, INSERT, UPDATE') then
      bad := bad || format(' [%s holds a column privilege on known_devices]', r);
    end if;
  end loop;

  -- CONTROL: the one privilege that must stand. The member reads push_tokens.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);
  begin
    select count(*) into n from public.push_tokens;
  exception when others then
    raise exception 'PROBE_FAIL info-schema-guards: control, member cannot read push_tokens (% %)', sqlstate, sqlerrm;
  end;
  begin
    select count(*) into n from public.known_devices;
    bad := bad || ' [authenticated read known_devices]';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.push_tokens where false;
    bad := bad || ' [authenticated DELETE on push_tokens was not refused]';
  exception when insufficient_privilege then null;
  end;

  reset role;
  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin
    select count(*) into n from public.push_tokens;
    bad := bad || ' [anon read push_tokens]';
  exception when insufficient_privilege then null;
  end;

  if bad <> '' then
    raise exception 'PROBE_FAIL info-schema-guards:%', bad;
  end if;
  raise exception 'PROBE_OK info-schema-guards: known_devices closed to the API roles; push_tokens is SELECT-only for authenticated';
end;
$$;
