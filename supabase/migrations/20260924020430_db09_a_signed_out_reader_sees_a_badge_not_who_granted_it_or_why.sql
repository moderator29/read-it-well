-- A signed-out reader learns which badge a person holds, not who granted it,
-- why, or on what evidence, and not which staff account set a fee.
--
-- anon held table-wide SELECT on user_badges (granted_by, revoked_by, reason,
-- evidence: the staff member's id and their notes) and on fee_rates
-- (created_by: a staff member's id). The signed-out profile reads only
-- user_id and badge_code (with the badges join), and nothing signed out reads
-- fee_rates.created_by, so anon keeps exactly the columns a public screen
-- draws.

revoke select on public.user_badges from anon;
grant select (user_id, badge_code, granted_at, revoked_at) on public.user_badges to anon;

revoke select on public.fee_rates from anon;
grant select (id, kind, basis_points, flat_minor, effective_from, note, created_at) on public.fee_rates to anon;
