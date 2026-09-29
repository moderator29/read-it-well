-- INTERNAL NOTES ABOUT A MEMBER, FOR THE WHOLE TEAM (29 September 2026).
--
-- public.member_notes existed with no screen and admin-only policies, so staff
-- had nowhere to leave a colleague context ("called her on Tuesday, sending
-- ID Friday"): notes went into the audit log or nowhere. Now:
--
--  * A note can be read by any staff member, or restricted to holders of one
--    scope (plus admins). A compliance officer's note restricted to
--    `compliance` is never shown to a support agent: nothing that could tip a
--    person off about a report leaves the compliance desk.
--  * Notes are written and read through two definer functions gated on staff
--    access (a live grant with the handbook acknowledged, or an admin role).
--    The table's own policies stay admin-only.
--  * Notes are append-only: nobody edits or deletes one, so they are a record.
--  * Nobody writes a note about themselves.

alter table public.member_notes add column if not exists scope public.staff_scope;

create or replace function private.is_any_staff(p_user uuid)
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select p_user is not null
     and (private.has_role(p_user, 'admin'::public.app_role)
          or private.has_role(p_user, 'super_admin'::public.app_role)
          or exists (select 1 from public.staff_grants g
                      where g.user_id = p_user and g.revoked_at is null
                        and exists (select 1 from public.staff_handbook_acks a
                                     where a.user_id = p_user and a.version = private.staff_handbook_version())));
$function$;

create or replace function public.staff_member_notes(p_subject uuid)
returns table (id uuid, body text, created_at timestamptz, author_name text, scope text, mine boolean)
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  me uuid := (select auth.uid());
begin
  if not private.is_any_staff(me) or p_subject is null then
    return;
  end if;
  return query
  select n.id, n.body, n.created_at,
         coalesce(nullif(btrim(p.display_name), ''), 'A member of staff'),
         n.scope::text, n.author_id = me
    from public.member_notes n
    left join public.profiles p on p.id = n.author_id
   where n.subject_id = p_subject
     and (n.scope is null or private.staff_can(me, n.scope::text))
   order by n.created_at desc
   limit 200;
end;
$function$;

create or replace function public.staff_add_member_note(p_subject uuid, p_body text, p_scope text default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  me uuid := (select auth.uid());
  body text := btrim(coalesce(p_body, ''));
  sc public.staff_scope;
  note uuid;
begin
  if not private.is_any_staff(me) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_subject is null or not exists (select 1 from auth.users u where u.id = p_subject) then
    return jsonb_build_object('status', 'no_such_member');
  end if;
  if p_subject = me then
    return jsonb_build_object('status', 'own_account');
  end if;
  if char_length(body) < 3 or char_length(body) > 2000 then
    return jsonb_build_object('status', 'length');
  end if;
  if nullif(btrim(coalesce(p_scope, '')), '') is not null then
    begin
      sc := p_scope::public.staff_scope;
    exception when invalid_text_representation then
      return jsonb_build_object('status', 'invalid_scope');
    end;
    -- You can only restrict a note to a scope you hold yourself.
    if not private.staff_can(me, sc::text) then
      return jsonb_build_object('status', 'invalid_scope');
    end if;
  end if;
  insert into public.member_notes (subject_id, author_id, body, scope)
  values (p_subject, me, body, sc)
  returning id into note;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (me, 'member_note.add', 'user', p_subject::text, jsonb_build_object('note_id', note, 'scope', sc));
  return jsonb_build_object('status', 'ok', 'id', note);
end;
$function$;

revoke all on function private.is_any_staff(uuid) from public, anon, authenticated;
revoke all on function public.staff_member_notes(uuid) from public, anon;
revoke all on function public.staff_add_member_note(uuid, text, text) from public, anon;
grant execute on function public.staff_member_notes(uuid) to authenticated;
grant execute on function public.staff_add_member_note(uuid, text, text) to authenticated;

do $$
begin
  if exists (select 1 from public.staff_member_notes(gen_random_uuid())) then
    raise exception 'notes must refuse a caller with no identity';
  end if;
  if public.staff_add_member_note(gen_random_uuid(), 'probe note') ->> 'status' <> 'forbidden' then
    raise exception 'adding a note must refuse a caller with no identity';
  end if;
end $$;

notify pgrst, 'reload schema';
