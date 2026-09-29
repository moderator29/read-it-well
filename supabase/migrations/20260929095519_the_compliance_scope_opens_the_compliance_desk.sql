-- THE COMPLIANCE SCOPE OPENS THE COMPLIANCE DESK (29 September 2026).
--
-- Every function behind the compliance desk (STR cases, threshold reports,
-- EDD, PEP, risk overrides, sanctions, beneficial ownership) gates through one
-- of four helpers that checked the admin role only. Each helper now also
-- admits a staff member holding the `compliance` scope, through
-- private.staff_can (live grant + current handbook acknowledged). An admin or
-- super admin passes exactly as before. The helpers are used by nothing
-- outside the compliance functions and by no RLS policy (checked at apply).
--
-- The two-person rules (a second person approves a decision) keep working
-- unchanged: they compare people, and a scoped compliance officer is a person.
--
-- STR notifications now reach compliance-scope holders as well as admins,
-- still skipping anybody who is a party to the case (tipping off).

create or replace function private.str_is_staff(p_user uuid)
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select p_user is not null and private.staff_can(p_user, 'compliance');
$function$;

create or replace function private.aml_is_staff()
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select private.staff_can((select auth.uid()), 'compliance');
$function$;

create or replace function private.aml_staff(p_user uuid)
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select p_user is not null and private.staff_can(p_user, 'compliance');
$function$;

create or replace function private.compliance_staff(p_user uuid)
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select p_user is not null and private.staff_can(p_user, 'compliance');
$function$;

-- beneficial_ownership_desk gates on the generic private.is_staff(); only
-- that one call in that one function changes.
do $$
declare
  def text := pg_get_functiondef('public.beneficial_ownership_desk()'::regprocedure);
begin
  if (select count(*) from regexp_matches(def, 'private\.is_staff\(\)', 'g')) <> 1 then
    raise exception 'beneficial_ownership_desk: expected exactly one is_staff gate';
  end if;
  execute replace(def, 'private.is_staff()', 'private.staff_can((select auth.uid()), ''compliance'')');
end $$;

create or replace function private.str_tell_staff(p_title text, p_body text, p_case uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare staff uuid;
begin
  for staff in
    select distinct x.user_id from (
      select ur.user_id from public.user_roles ur
       where ur.role in ('admin'::public.app_role, 'super_admin'::public.app_role)
      union
      select g.user_id from public.staff_grants g
       where g.revoked_at is null and 'compliance' = any (g.scopes::text[])
    ) x
     where not private.str_is_party(p_case, x.user_id)
  loop
    perform private.notify(staff, 'system'::public.notification_kind, p_title, p_body,
                           '/admin/compliance?tab=str&case=' || p_case::text);
  end loop;
end;
$function$;

revoke all on function private.str_is_staff(uuid) from public, anon, authenticated;
revoke all on function private.aml_is_staff() from public, anon, authenticated;
revoke all on function private.aml_staff(uuid) from public, anon, authenticated;
revoke all on function private.compliance_staff(uuid) from public, anon, authenticated;
revoke all on function private.str_tell_staff(text, text, uuid) from public, anon, authenticated;

do $$
begin
  if pg_get_functiondef('public.beneficial_ownership_desk()'::regprocedure) not like '%staff_can((select auth.uid()), ''compliance'')%' then
    raise exception 'beneficial_ownership_desk not rewritten';
  end if;
  if private.str_is_staff(null) or private.aml_staff(null) or private.compliance_staff(null) then
    raise exception 'a null caller must never pass';
  end if;
end $$;
