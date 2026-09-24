-- Two advisor lines, a lookup on anybody's account that no screen needs,
-- and one alert that said two things at once.
--
-- private.escrow_evidence_is_append_only and public.badge_tier ran with the
-- caller's search_path. Neither reads a table (one raises, one maps two
-- booleans to a tier it names by schema), so pinning it changes nothing but
-- the advisor's answer, and it keeps them safe if either ever grows a query.
--
-- One risk alert ("Content: filter, empty") was stamped resolved_at by a
-- one-off migration while its status stayed open, so the desk kept showing a
-- store blocker that did not exist: the filter holds its terms. It is closed,
-- and an open alert can no longer carry a resolution time. The admin desk's
-- two writers already set both together, and reopening clears resolved_at.

alter function private.escrow_evidence_is_append_only() set search_path = '';
alter function public.badge_tier(boolean, boolean) set search_path = '';

-- public.verification_is_required(uuid) answers, for any user id, whether
-- that person signed up to sell, let or act as an agent. No screen, policy,
-- view or function calls it through a client, so a signed-in caller loses
-- it; the service role keeps it. (This was the parked file
-- migrations/pending/20260918150300_b5_verification_is_required_is_not_a_client_call.sql.)
revoke execute on function public.verification_is_required(uuid) from authenticated;
comment on function public.verification_is_required is
  'Sellers, landlords and agents verify. Renters and buyers never do, and nothing gates browsing or renting on this. The rule is here once so no screen reimplements it. Server side only: not callable by clients, because it answers for any user id.';

update public.risk_alerts set status = 'resolved' where status = 'open' and resolved_at is not null;
alter table public.risk_alerts
  add constraint risk_alerts_open_has_no_resolution check (status <> 'open' or resolved_at is null);
