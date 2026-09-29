-- DB-20, found 29 September 2026 by the first database probe run since CI
-- stopped starting jobs on 23 September. Both insert policies applied to
-- PUBLIC (anon included) and call a private helper anon cannot execute
-- (private.booking_is_tenancy, private.support_related_is_mine). PostgreSQL
-- checks EXECUTE when it initialises the policy expression, so an anon
-- insert answered 42501 on the helper instead of an RLS refusal, the shape of
-- the 22 September outage. Each already requires auth.uid() to equal the
-- row's author, which anon can never satisfy, so scoping them to
-- authenticated changes no outcome and removes the anon evaluation entirely.
alter policy reviews_insert_own on public.reviews to authenticated;
alter policy support_tickets_insert_own on public.support_tickets to authenticated;
