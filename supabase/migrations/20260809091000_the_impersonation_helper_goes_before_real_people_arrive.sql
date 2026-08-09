-- private.probe_as is deleted.
--
-- WHAT IT WAS. Added in 20260804115403_social_hardening_from_audit so that a
-- probe could test a row level security policy. A probe running as the service
-- role bypasses RLS entirely, so it cannot prove a policy works; probe_as sets
-- `request.jwt.claims` to a chosen user id for the rest of the transaction,
-- and the caller follows with `set local role authenticated`. Between those
-- two statements the session IS that person as far as every policy in the
-- database is concerned. It has been used exactly that way in at least four
-- later migrations, always inside a transaction that was rolled back.
--
-- WHY IT GOES NOW. It is an impersonation primitive. Its whole purpose is to
-- make RLS believe a caller is somebody they are not, and it takes any uuid.
-- It is SECURITY DEFINER and its EXECUTE was revoked from public, anon and
-- authenticated when it was created, so the only role that can call it is
-- postgres, which is a superuser and does not need it to read anything.
--
-- That containment is real and it is also the entire argument for deleting it
-- rather than keeping it. A function whose only reachable caller is a
-- superuser buys nothing that the superuser did not already have. What it does
-- buy, the day a grant is written carelessly or a service key leaks into a
-- context that can reach the private schema, is a clean path from "can execute
-- one function" to "can read any user's messages, wallet, bookings and
-- documents under their own identity, with the policies reporting success".
--
-- The timing is the point. The listings table holds zero rows and the bookings
-- table holds zero rows; there is nothing here yet worth impersonating anybody
-- to reach. That will not be true again. A tool that exists only to defeat
-- access control should not be in the database on the day real people are.
--
-- WHAT REPLACES IT. Nothing in the database, deliberately. The technique is
-- still available to whoever needs it: `set_config('request.jwt.claims', ...,
-- true)` inside a rolled-back transaction is two lines a superuser can write
-- at the point of use, in a probe script that is reviewed and thrown away.
-- The difference is that it lives in the script rather than standing
-- permanently in the schema waiting for a grant to go wrong.

begin;

drop function if exists private.probe_as(uuid);

commit;
