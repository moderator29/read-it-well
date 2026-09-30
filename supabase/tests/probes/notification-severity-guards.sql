-- Migration 20260930140424 (m1 follow-up: severity execute revoke) checked in
-- its read-back that no role other than postgres and service_role may INSERT
-- into notifications, but read that through information_schema.role_table_grants,
-- which lists only grants the OBSERVING role is party to. Applied migrations
-- cannot be edited, so the claim is re-made here with has_table_privilege
-- (which answers for the named role), and runs on every probe run.
--   notifications:          no INSERT for anon or authenticated.
--   notification_severity:  not callable by anon or authenticated; callable by
--                           the roles that insert (postgres, service_role), so
--                           the severity trigger keeps working.
do $$
declare
  sev constant regprocedure := 'public.notification_severity(public.notification_kind, text, text)'::regprocedure;
  bad text := '';
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if has_table_privilege(r, 'public.notifications'::regclass, 'INSERT') then
      bad := bad || format(' [%s holds INSERT on notifications]', r);
    end if;
    if has_function_privilege(r, sev, 'execute') then
      bad := bad || format(' [%s can execute notification_severity]', r);
    end if;
  end loop;
  foreach r in array array['postgres', 'service_role'] loop
    if not has_function_privilege(r, sev, 'execute') then
      bad := bad || format(' [%s lost EXECUTE on notification_severity; the trigger would fail]', r);
    end if;
  end loop;

  if bad <> '' then
    raise exception 'PROBE_FAIL notification-severity-guards:%', bad;
  end if;
  raise exception 'PROBE_OK notification-severity-guards: notifications take no INSERT from the API roles; the severity function answers only the inserting roles';
end;
$$;
