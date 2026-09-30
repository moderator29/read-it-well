-- C14: A WRITTEN WAY BACK FOR A LOST CONSOLE KEY (30 September 2026).
--
-- WAITS FOR THE LEAD'S REVIEW. Adds one function. Changes no table, policy or
-- existing function; safe to run twice.
--
-- WHY. Every console person proves a platform key (`money_credentials`) every
-- twelve hours (apps/web/src/app/admin/_components/ConsoleStepUp.tsx). The
-- console offers to ENROL a key only to somebody holding none, so a person
-- whose only key was on a lost or broken phone is locked out of the console
-- with no way back, and fixing it was a founder emergency in the SQL editor.
--
-- WHAT `public.admin_clear_console_keys(p_user, p_reason)` DOES, in one
-- transaction:
--   * refuses anybody but a super admin (private.has_role on auth.uid()),
--     refuses acting on themselves (a second super admin does it, which is
--     the point), and refuses without a reason of at least 10 characters;
--   * deletes that person's platform keys and their open console proofs, so
--     the lost phone's key opens nothing and the person's next console visit
--     offers "Set up your key" (the one-time enrolment path that already
--     exists for a person with no key);
--   * writes ONE audit row, `staff.console_keys_cleared`, with the reason and
--     how many keys went. Key material is never copied into the row.
--
-- The staff page's "Clear their keys" control calls it and says plainly when
-- it is not installed (apps/web/src/lib/admin/key-roster-actions.ts). The
-- written procedure is docs/SUPPORT_STAFF.md, "A lost console key".
--
-- AFTER APPLYING: move this file up into supabase/migrations/ and record it
-- (`node scripts/check-migrations.mjs --record <file>`).

create or replace function public.admin_clear_console_keys(p_user uuid, p_reason text)
returns jsonb
language plpgsql
volatile security definer
set search_path to ''
as $function$
declare
  actor   uuid := (select auth.uid());
  reason  text := btrim(coalesce(p_reason, ''));
  removed integer := 0;
begin
  if actor is null or not private.has_role(actor, 'super_admin'::public.app_role) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_user is null or p_user = actor then
    return jsonb_build_object('status', 'invalid_target');
  end if;
  if length(reason) < 10 then
    return jsonb_build_object('status', 'reason_required');
  end if;

  delete from public.money_credentials where user_id = p_user;
  get diagnostics removed = row_count;
  delete from public.console_step_ups where user_id = p_user;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'staff.console_keys_cleared', 'staff_grant', p_user::text,
          jsonb_build_object('reason', left(reason, 500), 'keys_removed', removed));

  return jsonb_build_object('status', 'ok', 'keys_removed', removed);
end;
$function$;

revoke all on function public.admin_clear_console_keys(uuid, text) from public, anon;
grant execute on function public.admin_clear_console_keys(uuid, text) to authenticated;

-- READ-BACK: raise if anything above did not land.
do $check$
begin
  if to_regprocedure('public.admin_clear_console_keys(uuid, text)') is null then
    raise exception 'admin_clear_console_keys missing';
  end if;
  if has_function_privilege('anon', 'public.admin_clear_console_keys(uuid, text)', 'execute') then
    raise exception 'admin_clear_console_keys is callable by anon';
  end if;
  if not (select prosecdef from pg_proc where oid = 'public.admin_clear_console_keys(uuid, text)'::regprocedure) then
    raise exception 'admin_clear_console_keys is not security definer';
  end if;
end;
$check$;
