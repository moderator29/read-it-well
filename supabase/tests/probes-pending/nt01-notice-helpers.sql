-- NT01 (pending migration nt01_notice_helpers): private.notify_once tells an
-- event once. The first call writes one notification through private.notify;
-- the second call with the same key writes nothing; a different key writes
-- again; a null user or an empty key writes nothing; the helper and its key
-- table are closed to every API role. Rolled back by the final raise.
do $$
declare
  u uuid;
  first_call boolean;
  second_call boolean;
  other_key boolean;
  n integer;
begin
  select id into u from public.profiles order by created_at limit 1;
  if u is null then
    raise exception 'PROBE_FAIL nt01-notice-helpers: no profile to notify';
  end if;

  first_call := private.notify_once('probe-nt01:a', u, 'system', 'Probe NT01', 'one', '/notifications');
  second_call := private.notify_once('probe-nt01:a', u, 'system', 'Probe NT01', 'one', '/notifications');
  other_key := private.notify_once('probe-nt01:b', u, 'system', 'Probe NT01', 'two', '/notifications');

  if first_call is not true then
    raise exception 'PROBE_FAIL nt01-notice-helpers: the first call did not notify';
  end if;
  if second_call is not false then
    raise exception 'PROBE_FAIL nt01-notice-helpers: the same key told the event twice';
  end if;
  if other_key is not true then
    raise exception 'PROBE_FAIL nt01-notice-helpers: a different key was swallowed';
  end if;

  select count(*) into n from public.notifications where user_id = u and title = 'Probe NT01';
  if n <> 2 then
    raise exception 'PROBE_FAIL nt01-notice-helpers: expected 2 notification rows, found %', n;
  end if;

  if private.notify_once('probe-nt01:c', null, 'system', 'Probe NT01', 'x', null) is not false
     or private.notify_once('  ', u, 'system', 'Probe NT01', 'x', null) is not false then
    raise exception 'PROBE_FAIL nt01-notice-helpers: a null user or an empty key notified';
  end if;

  if has_function_privilege('anon', 'private.notify_once(text, uuid, public.notification_kind, text, text, text)', 'execute')
     or has_function_privilege('authenticated', 'private.notify_once(text, uuid, public.notification_kind, text, text, text)', 'execute')
     or has_function_privilege('service_role', 'private.notify_once(text, uuid, public.notification_kind, text, text, text)', 'execute') then
    raise exception 'PROBE_FAIL nt01-notice-helpers: an API role can run the helper';
  end if;
  if has_table_privilege('anon', 'private.notice_keys', 'select')
     or has_table_privilege('authenticated', 'private.notice_keys', 'select')
     or has_table_privilege('service_role', 'private.notice_keys', 'select') then
    raise exception 'PROBE_FAIL nt01-notice-helpers: an API role can read the key table';
  end if;

  raise exception 'PROBE_OK nt01-notice-helpers';
end
$$;
