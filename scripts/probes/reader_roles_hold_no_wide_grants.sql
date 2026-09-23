/*
 * NO READER ROLE HOLDS A PRIVILEGE ROW LEVEL SECURITY DOES NOT COVER.
 *
 * Run through `execute_sql`; it reads and asserts, and writes nothing.
 *
 * WHY THIS IS A STANDING CHECK RATHER THAN A ONE-OFF CLEAN-UP. `pg_default_acl`
 * grants `arwdDxtm` on every new relation in public to `anon` and
 * `authenticated`, and schema public has TWO default-ACL owners. The `postgres`
 * entry is narrow as of 20260923175705; `supabase_admin`'s could not be
 * narrowed from a migration connection. So a table created by that role, or a
 * default reset by platform tooling, brings the hole straight back and nothing
 * would say so.
 *
 * THE PRIVILEGE THAT MATTERS MOST IS TRUNCATE. A policy decides which ROWS a
 * statement may touch. TRUNCATE does not touch rows: it empties the relation
 * and no policy is consulted. Ninety five tables held it on 23 September,
 * `wallets`, `ledger_entries`, `transactions` and `user_roles` among them.
 *
 * SELECT, INSERT, UPDATE and DELETE are deliberately NOT asked about. An RLS
 * policy is evaluated as the querying role, so those grants are load-bearing,
 * and a check that flagged them would teach somebody to revoke one. Doing that
 * to `private.owns_listing` took the public catalogue down for eleven and a half
 * hours on 22 September.
 *
 * Expected: zero rows, and the second query's `defaults_note` naming exactly the
 * one entry known not to be narrow.
 */

select c.relname            as table_name,
       a.grantee::regrole   as reader_role,
       a.privilege_type     as privilege_row_level_security_does_not_cover
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace,
       lateral aclexplode(c.relacl) a
 where n.nspname = 'public'
   and c.relkind = 'r'
   and a.grantee in ('anon'::regrole, 'authenticated'::regrole)
   and a.privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES', 'MAINTAIN')
 order by 1, 2, 3;

select d.defaclrole::regrole::text as for_role,
       (select string_agg(distinct a.privilege_type, ',' order by a.privilege_type)
          from aclexplode(d.defaclacl) a
         where a.grantee in ('anon'::regrole, 'authenticated'::regrole)) as reader_defaults,
       case
         when d.defaclrole::regrole::text = 'supabase_admin'
           then 'KNOWN AND UNCLOSEABLE FROM A MIGRATION. Watched, not fixed.'
         else 'MUST read exactly DELETE,INSERT,SELECT,UPDATE'
       end as defaults_note
  from pg_default_acl d
  join pg_namespace n on n.oid = d.defaclnamespace
 where d.defaclobjtype = 'r' and n.nspname = 'public'
 order by 1;
