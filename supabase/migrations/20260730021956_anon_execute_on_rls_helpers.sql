-- Let anonymous visitors evaluate the RLS helpers their reads depend on.
--
-- The hardening pass revoked EXECUTE on every private helper from anon, which
-- read as strictly safer and was in fact a live outage waiting for its trigger.
-- Tables like public.listings carry several permissive policies, and Postgres
-- ORs them: a row that fails `status = 'PUBLISHED'` makes it evaluate the admin
-- policy next, which calls private.has_role. With no EXECUTE, that raises
-- 42501 and the entire query fails rather than the row simply being filtered
-- out.
--
-- The failure mode is what makes this urgent: while every listing is published
-- the planner can satisfy each row on the first policy and nothing looks wrong.
-- The moment one agent saves a draft, every anonymous read of the catalogue
-- starts erroring, which is to say search and listing pages break for everyone
-- who is not signed in, at exactly the point supply starts arriving. Verified
-- against the live database: with a DRAFT row present, an anonymous read of
-- public.listings raised 42501 before this grant and returns only the published
-- row after it.
--
-- Granting these four to anon leaks nothing. Each is security definer and keyed
-- on auth.uid(), which is null for an anonymous caller, so each returns false.
-- The worst an anonymous caller could do is ask whether some uuid it already
-- knows holds a role, which is not information worth an outage.
--
-- private.wallet_balance is deliberately NOT granted. It carries an
-- `or auth.uid() is null` branch so the service role can price any wallet, and
-- for the anon role auth.uid() is also null, so granting it would let an
-- anonymous caller read any wallet balance by id. The wallet_balances view is
-- already restricted to authenticated, and no anonymous read path needs it.

grant execute on function private.has_role(uuid, public.app_role) to anon;
grant execute on function private.owns_listing(uuid) to anon;
grant execute on function private.in_conversation(uuid) to anon;
grant execute on function private.is_booking_host(uuid) to anon;
