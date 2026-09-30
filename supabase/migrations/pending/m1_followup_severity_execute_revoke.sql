-- M1 FOLLOW-UP (B11): NOBODY OUTSIDE THE DATABASE CALLS THE SEVERITY TABLE.
-- 30 September 2026. Reviewer's non-blocking note on
-- 20260930104610_m1_b11_b13_severity_and_saved_changes.
--
-- HELD IN pending/. Do not apply without review. When applying: apply, rename
-- to `<version>_m1_followup_severity_execute_revoke.sql` in
-- supabase/migrations, and record it
-- (`node scripts/check-migrations.mjs --record <file>`).
--
-- What was live (read from pg_proc on 30 September):
--   public.notification_severity(notification_kind, text, text)
--     EXECUTE to PUBLIC, anon, authenticated, service_role, postgres;
--   private.stamp_notification_severity()   (the trigger function; it lives
--     in `private`, not `public`)  proacl NULL, which means EXECUTE to PUBLIC.
--
-- Neither is a client API. The app mirrors the table in
-- apps/web/src/lib/notify/severity.ts and never calls it over PostgREST (no
-- `rpc("notification_severity")` anywhere in the tree), so exposing it only
-- widens the surface: anon could call it through /rest/v1/rpc.
--
-- WHY THE TRIGGER KEEPS WORKING. Postgres checks EXECUTE on a trigger
-- function when the trigger is CREATED, not when it fires, so the revoke on
-- private.stamp_notification_severity changes nothing at insert time. The
-- trigger body calls public.notification_severity as the INSERTING role, and
-- every insert into public.notifications runs as postgres (the owner) or
-- service_role: only those two hold INSERT on the table, and the three
-- functions that insert (private.notify and its siblings) are SECURITY
-- DEFINER owned by postgres. Both keep EXECUTE below. The read-back proves it.
--
-- Revokes only. Drops nothing, touches no policy, no table, no payment path.
-- Safe to run twice.
--
-- APP PATHS: none change. After this is applied, nothing new goes live.

revoke execute on function public.notification_severity(public.notification_kind, text, text)
  from public, anon, authenticated;
grant execute on function public.notification_severity(public.notification_kind, text, text)
  to service_role;

revoke execute on function private.stamp_notification_severity()
  from public, anon, authenticated;

-- ------------------------------------------------------------- read-back

do $check$
declare
  sev regprocedure := 'public.notification_severity(public.notification_kind, text, text)'::regprocedure;
  stamp regprocedure := 'private.stamp_notification_severity()'::regprocedure;
begin
  if has_function_privilege('anon', sev, 'execute')
     or has_function_privilege('authenticated', sev, 'execute') then
    raise exception 'B11 follow-up: anon or authenticated can still execute public.notification_severity';
  end if;
  if has_function_privilege('anon', stamp, 'execute')
     or has_function_privilege('authenticated', stamp, 'execute') then
    raise exception 'B11 follow-up: anon or authenticated can still execute private.stamp_notification_severity';
  end if;
  -- The roles that insert notifications must still reach the table the trigger reads.
  if not has_function_privilege('service_role', sev, 'execute')
     or not has_function_privilege('postgres', sev, 'execute') then
    raise exception 'B11 follow-up: the inserting roles lost EXECUTE on public.notification_severity; the trigger would fail';
  end if;
  if exists (
    select 1 from information_schema.role_table_grants
     where table_schema = 'public' and table_name = 'notifications'
       and privilege_type = 'INSERT'
       and grantee not in ('postgres', 'service_role')
  ) then
    raise exception 'B11 follow-up: a role other than postgres or service_role can insert notifications; check it keeps EXECUTE before applying';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'notifications_set_severity'
                  and tgrelid = 'public.notifications'::regclass and not tgisinternal) then
    raise exception 'B11 follow-up: the severity trigger is missing';
  end if;
  if public.notification_severity('message'::public.notification_kind, 'New message', '/messages/x') <> 'action' then
    raise exception 'B11 follow-up: the severity table no longer answers';
  end if;
end
$check$;
