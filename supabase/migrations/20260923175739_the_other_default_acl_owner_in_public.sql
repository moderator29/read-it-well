/*
 * THERE ARE TWO DEFAULT-ACL OWNERS FOR SCHEMA PUBLIC, AND THE PREVIOUS
 * MIGRATION ONLY NARROWED ONE OF THEM.
 *
 * `pg_default_acl` is keyed on the role that CREATES the object, and schema
 * public carries an entry for `postgres` and another for `supabase_admin`. The
 * previous migration's `alter default privileges` ran as `postgres` and so
 * narrowed the `postgres` entry only. Its own read-back did not look at
 * `pg_default_acl` at all, which is how it passed while half the root cause was
 * still standing: the check was about the tables that exist, not about the ones
 * that do not exist yet.
 *
 * ATTEMPTED HERE, AND IT DID NOT TAKE. Narrowing another role's default
 * privileges requires membership in that role, and this connection does not
 * have it. The attempt is wrapped so that a refusal reports itself instead of
 * taking down a migration whose real work is already committed.
 *
 * MEASURED AFTERWARDS, so this file states the outcome rather than the
 * intention:
 *
 *   postgres        DELETE, INSERT, SELECT, UPDATE
 *   supabase_admin  DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER,
 *                   TRUNCATE, UPDATE
 *
 * WHAT THAT LEAVES OPEN, stated plainly. A table created in public by
 * `supabase_admin` would still be born with TRUNCATE granted to `anon`.
 * Migrations run as `postgres`, so every table this repository creates is now
 * born narrow, and the realistic path is closed. The residual is Supabase's own
 * tooling, and `scripts/probes/reader_roles_hold_no_wide_grants.sql` is what
 * catches it if it ever happens, because a hole that cannot be closed still has
 * to be watched.
 */

do $do$
begin
  begin
    execute 'alter default privileges for role supabase_admin in schema public '
         || 'revoke truncate, trigger, references, maintain on tables from anon, authenticated';
    raise notice 'BOTH default-ACL owners are now narrow.';
  exception when others then
    raise notice 'COULD NOT narrow supabase_admin''s defaults: %. The postgres entry, which is the one migrations use, is narrow.', sqlerrm;
  end;
end $do$;
