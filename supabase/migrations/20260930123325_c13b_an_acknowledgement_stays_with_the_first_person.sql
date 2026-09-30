-- C13b: AN ACKNOWLEDGEMENT STAYS WITH THE FIRST PERSON (30 September 2026).
--
-- Applied 30 September 2026 with the founder's approval. A follow-up to
-- 20260930122539_c13_alert_acknowledged_by_and_skipped_runs.sql.
-- Replaces one trigger function and re-creates its trigger. Adds nothing,
-- drops no data, changes no policy (RLS on public.risk_alerts is untouched:
-- `risk_alerts_admin_all` stays the only policy), and is safe to run twice.
--
-- WHAT CHANGES.
--   1. The guard now fires on a change to `acknowledged_at` as well as to
--      `acknowledged_by`, so the time cannot be edited on its own.
--   2. A change of `acknowledged_by` from one person to ANOTHER is refused for
--      every writer, the service role included. The first person to take an
--      alert keeps it; the database, not the app, is what enforces that.
--   3. Unchanged from C13: a signed-in caller can only take an alert as
--      themselves and cannot clear a name; the time is stamped by the
--      database whenever a name is set. Clearing a name stays possible for
--      the database itself (auth.uid() is null), which is what
--      `on delete set null` does when the account is deleted.
--   4. New: with the name unchanged, a signed-in caller cannot move the time.
--      A service-role write may (break glass), and says so in the audit it
--      writes itself.
--
-- The app needs no change: lib/admin/actions.ts acknowledgeRiskAlert already
-- only writes where `acknowledged_by is null`.
--
-- AFTER APPLYING: move this file up into supabase/migrations/ and record it
-- (`node scripts/check-migrations.mjs --record <file>`).

create or replace function private.risk_alert_acknowledgement_is_the_caller()
returns trigger
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  v_caller uuid := auth.uid();
begin
  -- The name changed.
  if new.acknowledged_by is distinct from old.acknowledged_by then
    if old.acknowledged_by is not null and new.acknowledged_by is not null then
      raise exception 'This alert is already acknowledged by someone else; the first person keeps it.'
        using errcode = '42501';
    end if;
    if v_caller is not null then
      if new.acknowledged_by is not null and new.acknowledged_by <> v_caller then
        raise exception 'An alert can only be acknowledged by the person taking it.'
          using errcode = '42501';
      end if;
      if old.acknowledged_by is not null and new.acknowledged_by is null then
        raise exception 'An acknowledgement stays on the alert; resolve the alert instead.'
          using errcode = '42501';
      end if;
    end if;
    if new.acknowledged_by is not null then
      new.acknowledged_at := now();
    end if;
    return new;
  end if;

  -- The name did not change, the time did.
  if new.acknowledged_at is distinct from old.acknowledged_at and v_caller is not null then
    raise exception 'The acknowledgement time is set by the database.'
      using errcode = '42501';
  end if;
  return new;
end;
$function$;

revoke all on function private.risk_alert_acknowledgement_is_the_caller() from public, anon, authenticated;

drop trigger if exists risk_alerts_acknowledgement_is_the_caller on public.risk_alerts;
create trigger risk_alerts_acknowledgement_is_the_caller
  before update of acknowledged_by, acknowledged_at on public.risk_alerts
  for each row execute function private.risk_alert_acknowledgement_is_the_caller();

-- ---------------------------------------------------------------------------
-- READ-BACK: the trigger watches both columns, RLS did not move, and the rule
-- holds on a real row (a low-severity probe alert, so nothing is paged,
-- deleted again before the end; skipped only when there are not two accounts
-- to use).

do $check$
declare
  v_cols  text[];
  v_a     uuid;
  v_b     uuid;
  v_alert uuid;
  v_at    timestamptz;
  v_refused boolean := false;
begin
  select array_agg(a.attname::text order by a.attname)
    into v_cols
    from pg_trigger t
    join pg_attribute a on a.attrelid = t.tgrelid and a.attnum = any (t.tgattr::int2[])
   where t.tgrelid = 'public.risk_alerts'::regclass
     and t.tgname = 'risk_alerts_acknowledgement_is_the_caller';
  if v_cols is distinct from array['acknowledged_at', 'acknowledged_by'] then
    raise exception 'acknowledgement guard does not watch both columns: %', v_cols;
  end if;

  if not (select relrowsecurity from pg_class where oid = 'public.risk_alerts'::regclass) then
    raise exception 'risk_alerts has RLS off';
  end if;
  if (select count(*) from pg_policy where polrelid = 'public.risk_alerts'::regclass) <> 1
     or not exists (select 1 from pg_policy
                     where polrelid = 'public.risk_alerts'::regclass and polname = 'risk_alerts_admin_all') then
    raise exception 'risk_alerts policies are not the one admin policy';
  end if;

  select id into v_a from auth.users order by created_at limit 1;
  select id into v_b from auth.users where id <> v_a order by created_at limit 1;
  if v_a is not null and v_b is not null then
    insert into public.risk_alerts (severity, status, title, description)
    values ('low', 'open', 'C13b read-back probe', 'Written and deleted by a migration read-back.')
    returning id into v_alert;

    update public.risk_alerts set acknowledged_by = v_a where id = v_alert;
    select acknowledged_at into v_at from public.risk_alerts where id = v_alert;
    if v_at is null then
      raise exception 'acknowledging did not stamp a time';
    end if;

    begin
      update public.risk_alerts set acknowledged_by = v_b where id = v_alert;
    exception when insufficient_privilege then
      v_refused := true;
    end;

    delete from public.risk_alerts where id = v_alert;

    if not v_refused then
      raise exception 'a second person could take an acknowledged alert';
    end if;
  end if;
end;
$check$;
