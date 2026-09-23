-- A QUEUE THAT NEVER FORGETS IS A TABLE THAT ONLY GROWS.
--
-- `public.email_outbox` keeps one row per email this platform owes anybody,
-- for ever, unless something takes the finished ones away. At any real volume
-- that is a table whose PENDING index has to be walked past a decade of SENT
-- rows on every claim, and a rising storage bill for the privilege.
--
-- WHAT IS DELETED, AND WHAT IS NEVER DELETED.
--
--   SENT and DROPPED, after 90 days. Both are finished: one reached somebody
--   and one never could. Ninety days is long enough that a support question
--   about "did you email me in March" can still be answered in April, and
--   short enough that the table stays small.
--
--   FAILED IS NEVER DELETED BY THIS, at any age. A failed row is an email a
--   person was promised and did not get, and the desk alert that names it is
--   the only thing standing between that and silence. Sweeping it away on a
--   schedule would close the alert by deleting the evidence, which is the
--   exact move this whole estate exists to stop. Somebody clears those by
--   hand, having decided what to do about each one.
--
--   PENDING and SENDING are never touched. One is work not yet done and the
--   other is work possibly in flight.

create or replace function private.purge_email_outbox(p_older_than_days integer default 90)
returns bigint
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_deleted bigint;
begin
  delete from public.email_outbox
   where status in ('SENT', 'DROPPED')
     and settled_at < now() - make_interval(days => greatest(7, coalesce(p_older_than_days, 90)));
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function private.purge_email_outbox(integer) from public, anon, authenticated;

/* Beside `vallo_purge_idempotency` and `vallo_purge_rate_limits`, in the quiet
   hour they already share. */
select cron.unschedule('vallo_purge_email_outbox')
 where exists (select 1 from cron.job where jobname = 'vallo_purge_email_outbox');

select cron.schedule('vallo_purge_email_outbox', '25 2 * * *',
                     'select private.purge_email_outbox();');

do $$
declare
  v_open int;
  v_job int;
begin
  select count(*) into v_open
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and p.proname = 'purge_email_outbox'
     and (has_function_privilege('anon', p.oid, 'EXECUTE')
       or has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  if v_open <> 0 then
    raise exception 'rule 21: private.purge_email_outbox is executable by anon or authenticated';
  end if;

  select count(*) into v_job from cron.job
   where jobname = 'vallo_purge_email_outbox' and active;
  if v_job <> 1 then
    raise exception 'the outbox purge is not scheduled (%)', v_job;
  end if;
end
$$;
