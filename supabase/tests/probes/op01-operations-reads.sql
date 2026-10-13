-- OP01 (pending migration op01_operations_reads.sql): the seven staff reads
-- behind the Operations panels. A member and a signed-out caller are refused
-- every one; a super admin gets the documented shape; nothing that names a
-- person, an address or a secret comes back; the reads change no row. Fixtures
-- are built inside this transaction and rolled back by the final raise.
do $$
declare
  super_id constant uuid := '2255d905-0f31-437e-b719-aa2e4a18e03d'; -- a super admin exempt from the console step-up
  member   uuid;
  other    uuid;
  biz      uuid;
  r        jsonb;
  fn       text;
  n        integer;
  before_n bigint;
  after_n  bigint;
  canary   constant text := 'probe.canary@example.com';
begin
  select u.id into member
    from auth.users u
   where not exists (select 1 from public.user_roles x where x.user_id = u.id and x.role in ('admin', 'super_admin'))
     and not exists (select 1 from public.account_deletion_requests d where d.user_id = u.id)
   limit 1;
  select u.id into other
    from auth.users u
   where u.id <> member
     and not exists (select 1 from public.user_roles x where x.user_id = u.id and x.role in ('admin', 'super_admin'))
   limit 1;
  select b.id into biz from public.businesses b limit 1;
  if member is null or other is null then
    raise exception 'PROBE_FAIL op01-operations-reads 0: no two members to stand in';
  end if;

  -- Fixtures that carry things a read must not leak.
  insert into public.account_deletion_requests (user_id, status, requested_at, purge_after, last_error)
  values (member, 'SCHEDULED', now(), now() + interval '30 days', 'smtp refused ' || canary || ' call +234 803 123 4567');
  insert into public.email_outbox (dedupe_key, template, user_id, payload, status, attempts, last_error)
  values ('op01-probe-' || gen_random_uuid()::text, 'op01_probe', member,
          jsonb_build_object('to', canary), 'FAILED', 2, 'rejected for ' || canary);
  if biz is not null then
    insert into public.business_transfers (business_id, from_user_id, to_user_id, status, note, expires_at)
    values (biz, member, other, 'PENDING', 'note ' || canary, now() + interval '7 days');
  end if;

  select count(*) into before_n from public.email_outbox;

  -- 1. A member and a signed-out caller are refused every read.
  foreach fn in array array[
    'public.staff_ops_account_deletions()', 'public.staff_ops_business_transfers()',
    'public.staff_ops_database_jobs()', 'public.staff_ops_reconciliation()',
    'public.staff_ops_notifications(7)', 'public.staff_ops_email_outbox()',
    'public.staff_ops_held_events()'] loop
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);
    begin
      execute 'select ' || fn;
      raise exception 'PROBE_FAIL op01-operations-reads 1: a member read %', fn;
    exception when insufficient_privilege then
      null;
    end;
    reset role;
    set local role anon;
    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    begin
      execute 'select ' || fn;
      raise exception 'PROBE_FAIL op01-operations-reads 1: a signed-out caller read %', fn;
    exception when insufficient_privilege then
      null;
    end;
    reset role;
  end loop;

  -- 2. A super admin: each read answers in its documented shape.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', super_id, 'role', 'authenticated')::text, true);

  r := public.staff_ops_account_deletions();
  if jsonb_typeof(r -> 'by_status') <> 'object' or jsonb_typeof(r -> 'rows') <> 'array'
     or jsonb_array_length(r -> 'rows') < 1 or jsonb_array_length(r -> 'rows') > 25 then
    raise exception 'PROBE_FAIL op01-operations-reads 2: account deletions shape: %', r;
  end if;
  if r::text like '%' || member::text || '%' or r::text like '%' || canary || '%' or r::text like '%803 123%' then
    raise exception 'PROBE_FAIL op01-operations-reads 2: account deletions leaked a user id, address or number: %', r;
  end if;

  r := public.staff_ops_business_transfers();
  if jsonb_typeof(r -> 'by_status') <> 'object' or jsonb_typeof(r -> 'rows') <> 'array'
     or jsonb_array_length(r -> 'rows') > 25 or (biz is not null and jsonb_array_length(r -> 'rows') < 1) then
    raise exception 'PROBE_FAIL op01-operations-reads 2: business transfers shape: %', r;
  end if;
  if r::text like '%' || canary || '%' or r::text like '%"note"%' then
    raise exception 'PROBE_FAIL op01-operations-reads 2: business transfers leaked the note: %', r;
  end if;

  r := public.staff_ops_database_jobs();
  if (r ->> 'available')::boolean is not true or jsonb_typeof(r -> 'jobs') <> 'array'
     or jsonb_array_length(r -> 'jobs') < 1 then
    raise exception 'PROBE_FAIL op01-operations-reads 2: database jobs shape: %', left(r::text, 300);
  end if;
  if r::text like '%"command"%' or r::text like '%vault%' or r::text like '%decrypted_secret%' then
    raise exception 'PROBE_FAIL op01-operations-reads 2: database jobs leaked a command';
  end if;

  r := public.staff_ops_reconciliation();
  if jsonb_typeof(r -> 'runs') <> 'array' or jsonb_array_length(r -> 'runs') > 5
     or jsonb_typeof(r -> 'open_alerts') <> 'number' or jsonb_typeof(r -> 'watch') <> 'object' then
    raise exception 'PROBE_FAIL op01-operations-reads 2: reconciliation shape: %', r;
  end if;

  r := public.staff_ops_notifications(7);
  if (r ->> 'window_days')::integer <> 7 or jsonb_array_length(r -> 'per_day') <> 7
     or jsonb_typeof(r -> 'by_kind') <> 'array' or (r ->> 'total')::bigint < 0 then
    raise exception 'PROBE_FAIL op01-operations-reads 2: notifications shape: %', left(r::text, 300);
  end if;
  if (public.staff_ops_notifications(500) ->> 'window_days')::integer <> 90
     or (public.staff_ops_notifications(0) ->> 'window_days')::integer <> 1 then
    raise exception 'PROBE_FAIL op01-operations-reads 2: the notification window is not clamped to 1..90';
  end if;
  if r::text like '%"title"%' or r::text like '%"body"%' or r::text like '%"user_id"%' then
    raise exception 'PROBE_FAIL op01-operations-reads 2: notifications returned content or a person';
  end if;

  r := public.staff_ops_email_outbox();
  if jsonb_typeof(r -> 'by_status') <> 'object' or jsonb_typeof(r -> 'rows') <> 'array'
     or jsonb_array_length(r -> 'rows') < 1 or jsonb_array_length(r -> 'rows') > 25 then
    raise exception 'PROBE_FAIL op01-operations-reads 2: email outbox shape: %', r;
  end if;
  if r::text like '%' || canary || '%' or r::text like '%"payload"%' or r::text like '%"user_id"%'
     or r::text like '%dedupe%' or r::text like '%' || member::text || '%' then
    raise exception 'PROBE_FAIL op01-operations-reads 2: email outbox leaked an address, payload or person: %', r;
  end if;
  if r::text not like '%[email]%' then
    raise exception 'PROBE_FAIL op01-operations-reads 2: the provider error was not masked: %', r;
  end if;

  r := public.staff_ops_held_events();
  if jsonb_typeof(r -> 'held') <> 'array' or jsonb_typeof(r -> 'decisions') <> 'array'
     or jsonb_typeof(r -> 'held_count') <> 'number' then
    raise exception 'PROBE_FAIL op01-operations-reads 2: held events shape: %', r;
  end if;
  reset role;

  -- 3. Reads only: the fixtures are all that changed.
  select count(*) into after_n from public.email_outbox;
  if after_n <> before_n then
    raise exception 'PROBE_FAIL op01-operations-reads 3: a read changed the outbox';
  end if;

  -- 4. Every function is security definer with an empty search path, and only
  -- signed-in callers hold execute.
  select count(*) into n
    from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and p.proname in ('staff_ops_account_deletions', 'staff_ops_business_transfers', 'staff_ops_database_jobs',
                       'staff_ops_reconciliation', 'staff_ops_notifications', 'staff_ops_email_outbox',
                       'staff_ops_held_events')
     and p.prosecdef
     and p.proconfig @> array['search_path=""']
     and has_function_privilege('authenticated', p.oid, 'execute')
     and not has_function_privilege('anon', p.oid, 'execute');
  if n <> 7 then
    raise exception 'PROBE_FAIL op01-operations-reads 4: % of 7 functions are definer, pinned and granted correctly', n;
  end if;

  raise exception 'PROBE_OK op01-operations-reads';
end;
$$;
