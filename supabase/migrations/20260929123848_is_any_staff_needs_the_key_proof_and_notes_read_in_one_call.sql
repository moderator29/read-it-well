-- IS_ANY_STAFF NEEDS THE KEY PROOF, AND A DESK READS ITS NOTES IN ONE CALL
-- (29 September 2026).
--
-- 1. private.is_any_staff answered true for a live staff grant without the
--    console's second factor (20260929122514 put the proof in has_role and
--    staff_can, and this helper read staff_grants directly). It gates the
--    internal notes (staff_member_notes, staff_add_member_note), so a scoped
--    staff member's password alone could read and write unscoped notes
--    through the API. It now applies the same rule as staff_can: about the
--    caller themselves, only while their session holds a live proof.
-- 2. public.staff_member_notes_for(subjects) reads the notes on many members
--    at once, under exactly the rules of staff_member_notes, so a desk that
--    lists people (Verification) shows each one's notes without a call per
--    row.

create or replace function private.is_any_staff(p_user uuid)
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select p_user is not null
     and (p_user is distinct from (select auth.uid()) or private.console_step_up_ok())
     and (exists (select 1 from public.user_roles r
                   where r.user_id = p_user and r.role in ('admin'::public.app_role, 'super_admin'::public.app_role))
          or exists (select 1 from public.staff_grants g
                      where g.user_id = p_user and g.revoked_at is null
                        and exists (select 1 from public.staff_handbook_acks a
                                     where a.user_id = p_user and a.version = private.staff_handbook_version())));
$function$;

create or replace function public.staff_member_notes_for(p_subjects uuid[])
returns table (subject_id uuid, id uuid, body text, created_at timestamptz, author_name text, scope text, mine boolean)
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  me uuid := (select auth.uid());
begin
  if not private.is_any_staff(me) or p_subjects is null or cardinality(p_subjects) = 0 then
    return;
  end if;
  if cardinality(p_subjects) > 200 then
    raise exception 'at most 200 people at once' using errcode = '22023';
  end if;
  return query
  select n.subject_id, n.id, n.body, n.created_at,
         coalesce(nullif(btrim(p.display_name), ''), 'A member of staff'),
         n.scope::text, n.author_id = me
    from public.member_notes n
    left join public.profiles p on p.id = n.author_id
   where n.subject_id = any (p_subjects)
     and (n.scope is null or private.staff_can(me, n.scope::text))
   order by n.subject_id, n.created_at desc
   limit 2000;
end;
$function$;

revoke all on function public.staff_member_notes_for(uuid[]) from public, anon;
grant execute on function public.staff_member_notes_for(uuid[]) to authenticated;

-- Read back: with no caller nobody is "any staff" about themselves, and a
-- real admin asked about by the service role still is.
do $$
declare
  a uuid;
begin
  select user_id into a from public.user_roles where role = 'admin' limit 1;
  if a is not null and not private.is_any_staff(a) then
    raise exception 'is_any_staff changed for a caller-less check';
  end if;
  if has_function_privilege('anon', 'public.staff_member_notes_for(uuid[])', 'execute') then
    raise exception 'anon can call staff_member_notes_for';
  end if;
end $$;

notify pgrst, 'reload schema';
