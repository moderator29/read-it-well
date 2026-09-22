-- A PROBE, RUN AND ROLLED BACK. Recorded here because it was applied through
-- the migration API and therefore holds a row in
-- supabase_migrations.schema_migrations. A row in that table with no file on
-- disk is the exact fault HANDOFF 08 finding 1.5 is about, and leaving seven
-- of them behind while writing a status report about honest records would have
-- been its own joke.
--
-- WHAT IT DID. It read back the three remaining probe rows before they were
-- deleted, so the ledger could record what they were rather than what somebody
-- remembered them being. It wrote nothing.
--
-- It is kept as a no-op rather than deleted, so the applied set and the file
-- set match and a restore can rebuild the schema.

do $$ begin
  -- Read only when it ran; deliberately inert now.
  null;
end $$;
