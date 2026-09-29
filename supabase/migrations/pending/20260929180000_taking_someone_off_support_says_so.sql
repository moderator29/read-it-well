-- TAKING SOMEBODY OFF SUPPORT SAYS SO (29 September 2026). DRAFT. NOT APPLIED.
--
-- THIS FILE WAITS FOR THE FOUNDER'S WORD, because it adds one function. It
-- rewrites no row that exists, drops nothing, changes no table, policy or
-- existing function, and is safe to run twice. It does not depend on
-- 20260929173000_support_desk_escalations_and_member_context.sql; either can
-- be applied first.
--
-- WHY. The team console's "Take off support" on somebody who also holds other
-- desks used to call `admin_grant_staff` with what was left. That function is
-- written for GIVING access: it tells the person "You have Vallo staff
-- access ... Access given: <what is left>. Read and acknowledge the staff
-- handbook before anything unlocks", and emails them the access-granted
-- message. After losing a desk that reads as if they had been given access,
-- and as if they were locked out until they read the handbook again. Neither
-- is true. It also left their held tickets claimed for up to thirty minutes,
-- and put the reason in a second, separate audit row written by the app.
--
-- WHAT `public.admin_remove_support(p_user, p_reason)` DOES, in one
-- transaction:
--   * refuses anybody but a super admin who has proved the console key
--     (private.has_role on auth.uid(), which carries the proof), and refuses
--     acting on themselves;
--   * removes the support scope and nothing else: every other scope is kept
--     exactly, the position is kept unless it was Support Agent (whose whole
--     bundle is support), and granted_by / granted_at are untouched;
--   * refuses when support is their only scope (`last_scope`): ending access
--     is `admin_revoke_staff`, which the person reads with its reason;
--   * releases the tickets they held (queue_claims, kind 'ticket') at once;
--   * writes ONE audit row, `staff.support_removed`, with the reason and the
--     scopes before and after;
--   * tells them in the app, plainly: support is no longer one of their
--     desks, what they keep, and that nothing else changed. No email: the
--     only staff-access template says access was given.
--
-- The app calls it first and falls back to the old path when it is not
-- installed (apps/web/src/lib/admin/staff-actions.ts, removeFromSupport).
--
-- AFTER APPLYING: move this file up into supabase/migrations/ and record it
-- (`node scripts/check-migrations.mjs --record <file>`).

create or replace function public.admin_remove_support(p_user uuid, p_reason text)
returns jsonb
language plpgsql
volatile security definer
set search_path to ''
as $function$
declare
  actor    uuid := (select auth.uid());
  reason   text := btrim(coalesce(p_reason, ''));
  g        public.staff_grants%rowtype;
  kept     public.staff_scope[];
  new_pos  text;
  released integer := 0;
begin
  if actor is null or not private.has_role(actor, 'super_admin'::public.app_role) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_user is null or p_user = actor then
    return jsonb_build_object('status', 'invalid_target');
  end if;
  if char_length(reason) < 5 or char_length(reason) > 500 then
    return jsonb_build_object('status', 'reason_needed');
  end if;

  select * into g from public.staff_grants where user_id = p_user for update;
  if g.user_id is null or g.revoked_at is not null then
    return jsonb_build_object('status', 'not_staff');
  end if;
  if not ('support'::public.staff_scope = any (g.scopes)) then
    return jsonb_build_object('status', 'not_on_support');
  end if;

  kept := array(select s from unnest(g.scopes) s where s <> 'support'::public.staff_scope order by s);
  if cardinality(kept) = 0 then
    return jsonb_build_object('status', 'last_scope');
  end if;
  new_pos := case when g.position = 'support_agent' then null else g.position end;

  update public.staff_grants
     set scopes = kept, position = new_pos
   where user_id = p_user;

  delete from public.queue_claims where claimed_by = p_user and kind = 'ticket';
  get diagnostics released = row_count;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'staff.support_removed', 'staff_grant', p_user::text,
          jsonb_build_object('reason', reason,
                             'scopes', to_jsonb(kept::text[]),
                             'previous_scopes', to_jsonb(g.scopes::text[]),
                             'position', new_pos,
                             'previous_position', g.position,
                             'tickets_released', released));

  begin
    perform private.notify(p_user, 'system'::public.notification_kind,
      'Support is no longer one of your desks',
      'You keep: ' || private.staff_scope_words(kept)
        || '. Nothing else about your access changed, and there is nothing you need to do.',
      '/admin');
  exception when others then
    -- Telling them never blocks the change; the audit row is the record.
    null;
  end;

  return jsonb_build_object('status', 'ok', 'scopes', to_jsonb(kept::text[]), 'position', new_pos);
end;
$function$;

revoke all on function public.admin_remove_support(uuid, text) from public, anon;
grant execute on function public.admin_remove_support(uuid, text) to authenticated;

do $$
begin
  if public.admin_remove_support(gen_random_uuid(), 'a probe reason') ->> 'status' <> 'forbidden' then
    raise exception 'admin_remove_support must refuse a caller with no identity';
  end if;
  if has_function_privilege('anon', 'public.admin_remove_support(uuid,text)', 'execute') then
    raise exception 'anon can call admin_remove_support';
  end if;
end $$;

notify pgrst, 'reload schema';
