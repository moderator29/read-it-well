-- Moderation-scoped staff can decide held posts, stories, comments and bios,
-- and the decision actually lands.
--
-- The Held lane was opened to staff holding the moderation scope, but the
-- console wrote the change with the service client, which carries no
-- auth.uid(). The update guards on posts, stories and social_profiles
-- (private.guard_post_update, guard_story_update, guard_social_profile_update)
-- put status, hidden_by and hold_reason back for anybody who is not an admin,
-- so a staff decision was silently undone while the console reported success
-- and wrote an audit row.
--
-- 1. public.moderation_decide(p_target, p_id, p_decision, p_reason) is now the
--    one door for a held-item decision, for admins and staff alike. SECURITY
--    DEFINER, search_path '', gated on private.staff_can(auth.uid(),
--    'moderation') (true for an admin or super admin, and for staff holding
--    the scope with the current handbook acknowledged). It refuses a removal
--    without a reason, changes only a row that is still HELD, writes the
--    moderation.release / moderation.remove audit row in the same
--    transaction, and answers ok, gone, reason_needed, invalid or forbidden.
--    Execute: authenticated only.
-- 2. private.may_moderate() answers the guards' question "may this caller
--    change moderation fields": an admin or super admin as before, OR a
--    caller for whom moderation_decide has set the transaction-local
--    vallo.moderation_actor to their own uid AND who holds the moderation
--    scope. A staff member updating a table directly never sets it (no client
--    can reach set_config through the API), and a member who set it would
--    still fail the scope check, so the guards stay shut to everyone else.
-- 3. Each guard's single admin check is replaced by private.may_moderate().
--    The bodies are the live definitions with that one expression swapped;
--    the block refuses unless it finds exactly one.

create or replace function private.may_moderate()
 returns boolean
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select private.has_role((select auth.uid()), 'admin'::public.app_role)
      or private.has_role((select auth.uid()), 'super_admin'::public.app_role)
      or (
        (select auth.uid()) is not null
        and coalesce(current_setting('vallo.moderation_actor', true), '') = (select auth.uid())::text
        and private.staff_can((select auth.uid()), 'moderation')
      );
$function$;

revoke all on function private.may_moderate() from public, anon, authenticated;

do $$
declare
  sig text;
  def text;
  gate constant text := '\(private\.has_role\(\(select auth\.uid\(\)\), ''admin''\)\s+or private\.has_role\(\(select auth\.uid\(\)\), ''super_admin''\)\)';
begin
  foreach sig in array array[
    'private.guard_post_update()',
    'private.guard_story_update()',
    'private.guard_social_profile_update()'
  ] loop
    def := pg_get_functiondef(sig::regprocedure);
    if (select count(*) from regexp_matches(def, gate, 'g')) <> 1 then
      raise exception 'moderation: % does not have exactly one admin check', sig;
    end if;
    execute regexp_replace(def, gate, 'private.may_moderate()');
  end loop;
end;
$$;

create or replace function public.moderation_decide(p_target text, p_id uuid, p_decision text, p_reason text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  actor  uuid := (select auth.uid());
  reason text := nullif(btrim(coalesce(p_reason, '')), '');
  n      integer := 0;
begin
  if actor is null or not private.staff_can(actor, 'moderation') then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_id is null or p_target not in ('post', 'story', 'comment', 'bio')
     or p_decision not in ('RELEASE', 'REMOVE')
     or (reason is not null and char_length(reason) > 400) then
    return jsonb_build_object('status', 'invalid');
  end if;
  if p_decision = 'REMOVE' and reason is null then
    return jsonb_build_object('status', 'reason_needed');
  end if;

  perform set_config('vallo.moderation_actor', actor::text, true);

  if p_target = 'bio' then
    update public.social_profiles
       set bio_status = case when p_decision = 'RELEASE' then 'LIVE' else 'REMOVED' end::public.social_status,
           bio = case when p_decision = 'REMOVE' then null else bio end
     where user_id = p_id and bio_status = 'HELD'::public.social_status;
  elsif p_target = 'post' then
    update public.posts
       set status = case when p_decision = 'RELEASE' then 'LIVE' else 'REMOVED' end::public.social_status,
           hold_reason = case when p_decision = 'REMOVE' then reason end,
           hidden_by = case when p_decision = 'REMOVE' then actor end
     where id = p_id and status = 'HELD'::public.social_status;
  elsif p_target = 'story' then
    update public.stories
       set status = case when p_decision = 'RELEASE' then 'LIVE' else 'REMOVED' end::public.social_status,
           hold_reason = case when p_decision = 'REMOVE' then reason end,
           hidden_by = case when p_decision = 'REMOVE' then actor end,
           removed_at = case when p_decision = 'REMOVE' then now() else removed_at end
     where id = p_id and status = 'HELD'::public.social_status;
  else
    update public.story_comments
       set status = case when p_decision = 'RELEASE' then 'LIVE' else 'REMOVED' end::public.social_status,
           hold_reason = case when p_decision = 'REMOVE' then reason end
     where id = p_id and status = 'HELD'::public.social_status;
  end if;
  get diagnostics n = row_count;

  perform set_config('vallo.moderation_actor', '', true);

  if n = 0 then
    return jsonb_build_object('status', 'gone');
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor,
          case when p_decision = 'RELEASE' then 'moderation.release' else 'moderation.remove' end,
          p_target, p_id::text,
          jsonb_build_object('decision', p_decision, 'reason', reason));

  return jsonb_build_object('status', 'ok');
end;
$function$;

revoke all on function public.moderation_decide(text, uuid, text, text) from public, anon;
grant execute on function public.moderation_decide(text, uuid, text, text) to authenticated;

-- Read back.
do $$
declare
  sig text;
begin
  foreach sig in array array[
    'private.guard_post_update()',
    'private.guard_story_update()',
    'private.guard_social_profile_update()'
  ] loop
    if position('private.may_moderate()' in pg_get_functiondef(sig::regprocedure)) = 0 then
      raise exception 'moderation: % does not use private.may_moderate()', sig;
    end if;
    if pg_get_functiondef(sig::regprocedure) ~ 'has_role\(\(select auth\.uid\(\)\), ''super_admin''\)' then
      raise exception 'moderation: % still carries the admin-only check', sig;
    end if;
  end loop;
  if not (select p.prosecdef from pg_proc p where p.oid = 'public.moderation_decide(text,uuid,text,text)'::regprocedure) then
    raise exception 'moderation: moderation_decide is not security definer';
  end if;
  if has_function_privilege('anon', 'public.moderation_decide(text,uuid,text,text)', 'execute') then
    raise exception 'moderation: anon can execute moderation_decide';
  end if;
  if not has_function_privilege('authenticated', 'public.moderation_decide(text,uuid,text,text)', 'execute') then
    raise exception 'moderation: authenticated cannot execute moderation_decide';
  end if;
  if has_function_privilege('authenticated', 'private.may_moderate()', 'execute') then
    raise exception 'moderation: authenticated can call private.may_moderate directly';
  end if;
end;
$$;
