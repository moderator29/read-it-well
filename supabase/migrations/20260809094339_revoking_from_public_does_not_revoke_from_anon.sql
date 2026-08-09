-- The previous migration ended with `revoke all on function ... from public`
-- and believed that closed the three session functions to anonymous callers.
-- It did not, and the reason generalises to every function this project will
-- ever add.
--
-- Supabase ships ALTER DEFAULT PRIVILEGES that grant EXECUTE on any new
-- function in `public` to anon, authenticated and service_role BY NAME. A
-- revoke from PUBLIC removes the pseudo-role's grant and leaves all three named
-- ones untouched. Read back from pg_proc.proacl immediately after applying it:
--
--   {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--
-- and `set local role anon; select public.my_sessions();` ran, returning an
-- empty set only because auth.uid() is null for anon. Empty because the data
-- was empty, not because the door was shut, which is the difference between a
-- control and a coincidence.
--
-- THE RULE FOR EVERY FUTURE FUNCTION: revoke from anon by name. `from public`
-- is not the same statement and never has been. This is the same lesson as
-- 20260809082855_a_trigger_function_is_not_an_api_endpoint, arriving from the
-- other direction: there the surface was too wide because nobody revoked, here
-- because the revoke that was written did not reach.

revoke all on function public.my_sessions() from anon;
revoke all on function public.end_session(uuid) from anon;
revoke all on function public.end_other_sessions() from anon;

-- service_role has no business here either. These three exist so a person can
-- act on their OWN sessions through their own token; every one of them reads
-- auth.uid(), which is null on a service-role connection, so a service-role
-- call can only ever be a mistake or an attempt. Leaving it callable would put
-- three more names on the surface that a leaked service key reaches.
revoke all on function public.my_sessions() from service_role;
revoke all on function public.end_session(uuid) from service_role;
revoke all on function public.end_other_sessions() from service_role;
