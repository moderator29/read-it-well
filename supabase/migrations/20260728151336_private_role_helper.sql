-- Move the RLS role helper out of the exposed API schema.
--
-- has_role is only ever needed inside RLS policies, never as a public API. While
-- it lived in public, PostgREST exposed it as an RPC endpoint, so the security
-- advisor rightly flagged that a signed-in user could probe arbitrary role
-- assignments. Moving it to a private schema that PostgREST does not expose
-- removes the endpoint entirely while policy evaluation, which runs as the
-- authenticated role, keeps working through an explicit EXECUTE grant.
--
-- The three admin policies that referenced public.has_role are dropped and
-- recreated against private.has_role, since a policy's expression cannot be
-- altered in place.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

drop policy if exists profiles_select_admin     on public.profiles;
drop policy if exists user_roles_select_admin    on public.user_roles;
drop policy if exists user_roles_admin_manage     on public.user_roles;

drop function if exists public.has_role(uuid, public.app_role);

create function private.has_role(check_user_id uuid, check_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = check_user_id and role = check_role
  );
$$;

revoke execute on function private.has_role(uuid, public.app_role) from public, anon;
grant  execute on function private.has_role(uuid, public.app_role) to authenticated;

create policy profiles_select_admin
  on public.profiles for select
  using (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'));

create policy user_roles_select_admin
  on public.user_roles for select
  using (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'));

create policy user_roles_admin_manage
  on public.user_roles for all
  using (private.has_role(auth.uid(), 'super_admin'))
  with check (private.has_role(auth.uid(), 'super_admin'));
