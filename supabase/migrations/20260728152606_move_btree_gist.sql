-- Move btree_gist out of the public schema.
--
-- The bookings no-overlap exclusion constraint needs btree_gist, but installing
-- an extension into public is flagged by the security advisor. Supabase ships a
-- dedicated extensions schema that is on the default search path, so the
-- extension is relocated there. The exclusion constraint references the operator
-- classes by identity, so it keeps working across the move.

alter extension btree_gist set schema extensions;
