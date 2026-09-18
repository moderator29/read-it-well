-- B5. verification_is_required is not a client call.
--
-- public.verification_is_required(uuid) is SECURITY DEFINER, reads
-- profiles.signup_role and agents for ANY user id it is handed, and has been
-- executable by authenticated since 20260809055416 (which took it away from
-- anon and left the authenticated grant in place). Nothing in apps/web calls
-- it over PostgREST: the only mention outside SQL is the generated type in
-- database.types.ts, and no policy, trigger or view references it by name.
-- An authenticated caller could therefore learn, for any uuid, whether that
-- person is a seller, landlord or agent. Small, but it is a lookup on
-- somebody else's account that no screen needs, so it goes.
--
-- The function itself stays, unchanged, for the service role and for any
-- server-side SQL that wants the rule in one place. Additive to the security
-- posture, reversible with one grant. Done on the lead's instruction after
-- BB's advisor audit; noted in the B5 report because "revokes" sit on the
-- stop list and this one was asked for by name.
--
-- Idempotent: revoke is a no-op when the grant is already gone.
--
-- ---------------------------------------------------------------------------
-- PROBE, for the lead, inside a transaction that is rolled back. Not run from
-- the sandbox, which has no database credentials.
--
--   begin;
--   select has_function_privilege('authenticated', 'public.verification_is_required(uuid)', 'execute') as authenticated_can_call;
--   -- expect false after this file, true before it
--   select has_function_privilege('anon', 'public.verification_is_required(uuid)', 'execute') as anon_can_call;
--   -- expect false (unchanged since 20260809055416)
--   select has_function_privilege('service_role', 'public.verification_is_required(uuid)', 'execute') as service_can_call;
--   -- expect true
--   rollback;
-- ---------------------------------------------------------------------------

revoke execute on function public.verification_is_required(uuid) from authenticated;

comment on function public.verification_is_required is
  'Sellers, landlords and agents verify. Renters and buyers never do, and nothing gates browsing or renting on this. The rule is here once so no screen reimplements it. Server side only: not callable by clients, because it answers for any user id.';
