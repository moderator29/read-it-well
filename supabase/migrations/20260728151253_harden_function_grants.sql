-- Harden SECURITY DEFINER function exposure.
--
-- PostgREST exposes every public-schema function as an RPC endpoint, so a
-- SECURITY DEFINER function is callable by anon and authenticated unless its
-- EXECUTE grant is revoked. The security advisor flags this.
--
-- handle_new_user is a signup trigger and must never be callable by a client,
-- so EXECUTE is revoked from every client role. has_role is called inside RLS
-- policies, which the authenticated role evaluates, so authenticated keeps
-- EXECUTE while anon and the public pseudo-role lose it.

revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant  execute on function public.has_role(uuid, public.app_role) to authenticated;
