-- The migration applied a moment before this one had to carry the new cron
-- bearer as a literal. Supabase records every applied migration's SQL text in
-- `supabase_migrations.schema_migrations`, so that literal was sitting in a
-- plain table readable by anything that can read the schema, which defeats the
-- point of the Vault holding it.
--
-- This replaced the recorded statement text with a note and then FAILED unless
-- the literal was gone from EVERY recorded statement, not merely from the row
-- it meant to edit. The Vault row was untouched and remains the only place the
-- value lives.
--
-- Re-running it is harmless: the update matches nothing once the redaction has
-- happened, and the guard passes.

update supabase_migrations.schema_migrations
   set statements = array[
         '-- REDACTED. This migration rotated vault secret vallo_reconcile_secret '
      || 'on 22 September 2026, after Vercel refused every production build with '
      || 'INVALID_CRON_SECRET because CRON_SECRET carried trailing whitespace. '
      || 'The SQL carried the new bearer as a literal and the literal was removed '
      || 'from this table straight afterwards, because a secret recorded here in '
      || 'plaintext is not in the Vault at all. The value lives in vault.secrets, '
      || 'in Vercel CRON_SECRET and in Vercel RECONCILE_CRON_SECRET, and nowhere '
      || 'else. See docs/BUILD_07_LEDGER.md.'
       ]
 where name = 'the_cron_secret_is_one_value_in_three_places';

do $$
declare v_hits int;
begin
  select count(*) into v_hits
    from supabase_migrations.schema_migrations m, unnest(m.statements) as s
   where s like '%vallo_cron_%';
  if v_hits > 0 then
    raise exception 'the bearer literal still appears in % recorded statement(s)', v_hits;
  end if;
end $$;
