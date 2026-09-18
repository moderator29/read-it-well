-- The two owner helpers M3 added are called from ORed RLS policies, and an
-- anonymous read that fails the PUBLISHED clause goes on to evaluate the owner
-- clause, which raises 42501 with no EXECUTE rather than filtering the row.
--
-- Same lesson, same fix as 20260730021956_anon_execute_on_rls_helpers: found
-- by the M3 probe, where an anonymous read of accommodation_photos for an
-- accommodation that had just been published raised "permission denied for
-- function owns_accommodation". Each helper is security definer and keyed on
-- auth.uid(), which is null for anon, so each returns false and leaks nothing.

grant execute on function private.owns_business(uuid) to anon;
grant execute on function private.owns_accommodation(uuid) to anon;
