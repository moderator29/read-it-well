-- Applied 13 October 2026. OP01: the seven Operations panels that said "not readable
-- by an admin yet" get one staff read function each.
--
-- WHY: account_deletion_requests, business_transfers, email_outbox and
-- notifications are closed to every app role by row security (own rows only,
-- or none), cron.job / cron.job_run_details and private.reconciliation_watch
-- are not exposed at all, and a held event has no decision record an admin can
-- read. Each function below is the one door for one panel.
--
-- EVERY FUNCTION
--   * SECURITY DEFINER, set search_path = '', STABLE, create or replace only.
--   * Calls private.staff_can(auth.uid(), <scope>) first, exactly as
--     staff_chargebacks and staff_blocked_terms do. An admin or super admin
--     passes every scope; a staff member needs the scope, the current handbook
--     acknowledged and a proved security key. Anyone else: 'not permitted'
--     (42501). The scope is 'operations' for the desk, 'moderation' for the
--     held events (the scope that already opens the Held lane).
--   * Returns jsonb carrying exactly what its panel shows, newest first, with a
--     row limit. Counts are exact; rows are the newest 25 (jobs: every job).
--   * Returns no secret and no payload: no cron command text, no email payload,
--     no dedupe key, no address, no phone, no notification title or body, no
--     user id of a person who asked to leave (an eight character reference
--     only). Free text that can carry an address or a number (a provider error)
--     is masked and cut to 160 characters.
--   * Reads only. Nothing here writes a row.
--
-- WHAT EACH PANEL GETS
--   staff_ops_account_deletions()   counts by status; the 25 newest that wait
--                                   or failed (SCHEDULED, PURGING, or an error)
--   staff_ops_business_transfers()  counts by status; the 25 newest offers,
--                                   business name and both display names
--   staff_ops_database_jobs()       every pg_cron job with its schedule, last
--                                   run and failures in the last 24 hours
--   staff_ops_reconciliation()      the money watch's last verdict and the last
--                                   five reconciliation runs, plus open alerts
--   staff_ops_notifications(days)   notifications sent per kind and per day
--                                   (counts only, 1 to 90 days)
--   staff_ops_email_outbox()        counts by status; the 25 newest emails that
--                                   are not sent (template, status, attempts)
--   staff_ops_held_events()         events the scan held, and the last 25
--                                   decisions taken on events (AR-10 reads; the
--                                   decision itself is still not written)

-- ---------------------------------------------------------------------------
-- 1. Account deletions
-- ---------------------------------------------------------------------------
create or replace function public.staff_ops_account_deletions()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  by_status jsonb;
  rows_json jsonb;
begin
  if not coalesce(private.staff_can((select auth.uid()), 'operations'), false) then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;

  select coalesce(jsonb_object_agg(s.status, s.n), '{}'::jsonb) into by_status
    from (select status, count(*) as n from public.account_deletion_requests group by status) s;

  select coalesce(jsonb_agg(r order by r.requested_at desc), '[]'::jsonb) into rows_json
    from (
      select left(d.user_id::text, 8) as member_ref,
             d.status,
             d.requested_at,
             d.purge_after,
             d.attempts,
             nullif(left(regexp_replace(regexp_replace(coalesce(d.last_error, ''),
               '[[:alnum:]._%+-]+@[[:alnum:].-]+', '[email]', 'g'),
               '\+?[0-9][0-9 -]{7,}[0-9]', '[number]', 'g'), 160), '') as last_error
        from public.account_deletion_requests d
       where d.status in ('SCHEDULED', 'PURGING') or d.last_error is not null
       order by d.requested_at desc
       limit 25
    ) r;

  return jsonb_build_object('by_status', by_status, 'rows', rows_json);
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Business transfers
-- ---------------------------------------------------------------------------
create or replace function public.staff_ops_business_transfers()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  by_status jsonb;
  rows_json jsonb;
begin
  if not coalesce(private.staff_can((select auth.uid()), 'operations'), false) then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;

  select coalesce(jsonb_object_agg(s.status, s.n), '{}'::jsonb) into by_status
    from (select status, count(*) as n from public.business_transfers group by status) s;

  select coalesce(jsonb_agg(r order by r.offered_at desc), '[]'::jsonb) into rows_json
    from (
      select t.id,
             b.name as business,
             pf.display_name as from_name,
             pt.display_name as to_name,
             t.status,
             t.offered_at,
             t.expires_at,
             t.responded_at
        from public.business_transfers t
        left join public.businesses b on b.id = t.business_id
        left join public.profiles pf on pf.id = t.from_user_id
        left join public.profiles pt on pt.id = t.to_user_id
       order by t.offered_at desc
       limit 25
    ) r;

  return jsonb_build_object('by_status', by_status, 'rows', rows_json);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Database jobs (pg_cron)
-- ---------------------------------------------------------------------------
create or replace function public.staff_ops_database_jobs()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  rows_json jsonb;
begin
  if not coalesce(private.staff_can((select auth.uid()), 'operations'), false) then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;
  if to_regclass('cron.job') is null or to_regclass('cron.job_run_details') is null then
    return jsonb_build_object('available', false, 'jobs', '[]'::jsonb);
  end if;

  /* One pass over the last seven days of runs (the table has no index on the
     job or the time, and the daily purge keeps it small). The command text is
     never selected. */
  execute $q$
    with recent as materialized (
      select r.jobid, r.status, r.start_time, r.end_time, r.return_message
        from cron.job_run_details r
       where r.start_time > now() - interval '7 days'
    ),
    last_run as (
      select distinct on (jobid) jobid, status, start_time, end_time, return_message
        from recent
       order by jobid, start_time desc
    ),
    fails as (
      select jobid, count(*) as n
        from recent
       where status = 'failed' and start_time > now() - interval '24 hours'
       group by jobid
    )
    select coalesce(jsonb_agg(jsonb_build_object(
             'name',          j.jobname,
             'schedule',      j.schedule,
             'active',        j.active,
             'last_status',   l.status,
             'last_start',    l.start_time,
             'last_ms',       case when l.end_time is null then null
                                   else (extract(epoch from (l.end_time - l.start_time)) * 1000)::bigint end,
             'last_message',  case when l.status = 'failed'
                                   then nullif(left(regexp_replace(regexp_replace(coalesce(l.return_message, ''),
                                          '[[:alnum:]._%+-]+@[[:alnum:].-]+', '[email]', 'g'),
                                          '\+?[0-9][0-9 -]{7,}[0-9]', '[number]', 'g'), 160), '')
                                   else null end,
             'failed_24h',    coalesce(f.n, 0)
           ) order by (coalesce(f.n, 0) > 0) desc, j.jobname), '[]'::jsonb)
      from cron.job j
      left join last_run l on l.jobid = j.jobid
      left join fails f on f.jobid = j.jobid
  $q$ into rows_json;

  return jsonb_build_object('available', true, 'jobs', rows_json);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Money reconciliation watch
-- ---------------------------------------------------------------------------
create or replace function public.staff_ops_reconciliation()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  watch jsonb;
  runs jsonb;
  open_alerts integer;
begin
  if not coalesce(private.staff_can((select auth.uid()), 'operations'), false) then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;

  select jsonb_build_object(
           'last_requested_at', w.last_requested_at,
           'last_verdict', w.last_verdict,
           'last_judged_at', w.last_judged_at)
    into watch
    from private.reconciliation_watch w
   where w.only_row;

  select coalesce(jsonb_agg(jsonb_build_object('action', a.action, 'at', a.created_at)
                            order by a.created_at desc), '[]'::jsonb)
    into runs
    from (
      select action, created_at
        from public.audit_log
       where action in ('wallet.reconciliation.run', 'payment.reconciliation.run')
       order by created_at desc
       limit 5
    ) a;

  select count(*)::integer into open_alerts
    from public.risk_alerts a
   where a.status = 'open' and a.title like 'Money reconciliation%';

  return jsonb_build_object('watch', watch, 'runs', runs, 'open_alerts', open_alerts);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Notifications sent (counts only)
-- ---------------------------------------------------------------------------
create or replace function public.staff_ops_notifications(p_days integer default 7)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  days integer := least(greatest(coalesce(p_days, 7), 1), 90);
  lagos_today date;
  since timestamptz;
  kinds jsonb;
  per_day jsonb;
  total bigint;
begin
  if not coalesce(private.staff_can((select auth.uid()), 'operations'), false) then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;

  /* Lagos days (UTC+1, no daylight saving): the window starts at a Lagos midnight. */
  lagos_today := ((now() at time zone 'UTC') + interval '1 hour')::date;
  since := ((lagos_today - (days - 1))::timestamp - interval '1 hour') at time zone 'UTC';

  select count(*) into total from public.notifications n where n.created_at >= since;

  select coalesce(jsonb_agg(k order by k.sent desc, k.kind), '[]'::jsonb) into kinds
    from (
      select n.kind::text as kind,
             count(*) as sent,
             count(n.read_at) as read,
             max(n.created_at) as last_sent_at
        from public.notifications n
       where n.created_at >= since
       group by n.kind
       order by count(*) desc, n.kind::text
       limit 40
    ) k;

  select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'sent', d.sent) order by d.day), '[]'::jsonb)
    into per_day
    from (
      select to_char(g.day, 'YYYY-MM-DD') as day,
             (select count(*) from public.notifications n
               where n.created_at >= ((g.day::timestamp - interval '1 hour') at time zone 'UTC')
                 and n.created_at <  ((g.day::timestamp + interval '23 hours') at time zone 'UTC')) as sent
        from (select (lagos_today - i) as day from generate_series(0, days - 1) as i) g
    ) d;

  return jsonb_build_object('window_days', days, 'total', total, 'by_kind', kinds, 'per_day', per_day);
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Email outbox
-- ---------------------------------------------------------------------------
create or replace function public.staff_ops_email_outbox()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  by_status jsonb;
  rows_json jsonb;
begin
  if not coalesce(private.staff_can((select auth.uid()), 'operations'), false) then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;

  select coalesce(jsonb_object_agg(s.status, s.n), '{}'::jsonb) into by_status
    from (select status, count(*) as n from public.email_outbox group by status) s;

  /* No user id, address, payload or dedupe key leaves this function. */
  select coalesce(jsonb_agg(r order by r.created_at desc), '[]'::jsonb) into rows_json
    from (
      select o.id,
             o.template,
             o.status,
             o.attempts,
             o.created_at,
             o.settled_at,
             nullif(left(regexp_replace(regexp_replace(coalesce(o.last_error, ''),
               '[[:alnum:]._%+-]+@[[:alnum:].-]+', '[email]', 'g'),
               '\+?[0-9][0-9 -]{7,}[0-9]', '[number]', 'g'), 160), '') as last_error
        from public.email_outbox o
       where o.status <> 'SENT'
       order by o.created_at desc
       limit 25
    ) r;

  return jsonb_build_object('by_status', by_status, 'rows', rows_json);
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Held events and the decisions taken on events (AR-10, read side)
-- ---------------------------------------------------------------------------
create or replace function public.staff_ops_held_events()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  held_n integer;
  held_rows jsonb;
  decided jsonb;
begin
  if not coalesce(private.staff_can((select auth.uid()), 'moderation'), false) then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;

  select count(*)::integer into held_n from public.events e where e.status = 'HELD';

  select coalesce(jsonb_agg(h order by h.created_at), '[]'::jsonb) into held_rows
    from (
      select e.id, left(e.title, 120) as title, p.display_name as host_name,
             left(e.hold_reason, 160) as hold_reason, e.created_at, e.starts_at
        from public.events e
        left join public.profiles p on p.id = e.host_id
       where e.status = 'HELD'
       order by e.created_at
       limit 25
    ) h;

  /* A decision is an audit row about an event whose action is a moderation
     release or removal. None are written yet (the event decision is AR-10's
     write side); the panel shows them the day they are. */
  select coalesce(jsonb_agg(d order by d.at desc), '[]'::jsonb) into decided
    from (
      select a.entity_id as event_id,
             left(e.title, 120) as title,
             a.action,
             a.created_at as at,
             pa.display_name as decided_by,
             left(a.metadata ->> 'reason', 160) as reason
        from public.audit_log a
        left join public.events e on e.id::text = a.entity_id
        left join public.profiles pa on pa.id = a.actor_id
       where a.entity_type = 'event'
         and a.action in ('moderation.release', 'moderation.remove')
       order by a.created_at desc
       limit 25
    ) d;

  return jsonb_build_object('held_count', held_n, 'held', held_rows, 'decisions', decided);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: signed-in callers only; the function itself decides who is staff.
-- ---------------------------------------------------------------------------
revoke all on function public.staff_ops_account_deletions() from public, anon;
revoke all on function public.staff_ops_business_transfers() from public, anon;
revoke all on function public.staff_ops_database_jobs() from public, anon;
revoke all on function public.staff_ops_reconciliation() from public, anon;
revoke all on function public.staff_ops_notifications(integer) from public, anon;
revoke all on function public.staff_ops_email_outbox() from public, anon;
revoke all on function public.staff_ops_held_events() from public, anon;
grant execute on function public.staff_ops_account_deletions() to authenticated;
grant execute on function public.staff_ops_business_transfers() to authenticated;
grant execute on function public.staff_ops_database_jobs() to authenticated;
grant execute on function public.staff_ops_reconciliation() to authenticated;
grant execute on function public.staff_ops_notifications(integer) to authenticated;
grant execute on function public.staff_ops_email_outbox() to authenticated;
grant execute on function public.staff_ops_held_events() to authenticated;
