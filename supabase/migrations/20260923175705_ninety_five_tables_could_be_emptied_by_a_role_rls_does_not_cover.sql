/*
 * NINETY FIVE TABLES COULD BE EMPTIED BY A ROLE ROW LEVEL SECURITY DOES NOT COVER.
 *
 * Found while checking an unrelated request, by reading `pg_class.relacl` for
 * `anon` and `authenticated` across schema public:
 *
 *   183 TRUNCATE grants across 95 tables
 *   185 TRIGGER grants
 *   185 REFERENCES grants
 *
 * Every one of those tables has RLS enabled, which is why nothing has ever gone
 * wrong, and which is also why nobody looked. **TRUNCATE IS NOT SUBJECT TO ROW
 * LEVEL SECURITY.** A policy decides which ROWS a statement may touch; TRUNCATE
 * does not touch rows, it empties the relation, and no policy is consulted. The
 * list included `wallets`, `wallet_entries`, `ledger_entries`, `transactions`,
 * `bookings`, `messages`, `user_roles` and `listings`.
 *
 * WHERE IT CAME FROM, WHICH IS NOT CARELESSNESS BY ANYBODY HERE.
 * `pg_default_acl` grants `arwdDxtm` on every NEW relation in public to both
 * reader roles, so every `create table` in this repository's history has shipped
 * this way unless the migration explicitly revoked it. That is the same fact
 * behind rule 21 and behind every "born locked" read-back in these files. It was
 * applied to functions and to the tables written after it was learned. **It was
 * never applied backwards**, and no check looked.
 *
 * WHAT IS AND IS NOT TOUCHED, and the distinction is the whole safety of this
 * migration. SELECT, INSERT, UPDATE and DELETE are LEFT EXACTLY AS THEY ARE: an
 * RLS policy is evaluated AS THE QUERYING ROLE, so those grants are load-bearing
 * and taking one is how the entire public catalogue went dark for eleven and a
 * half hours on 22 September. Only TRUNCATE, TRIGGER, REFERENCES and MAINTAIN
 * are revoked. No application path uses any of the four: PostgREST issues the
 * four DML verbs and function calls and nothing else.
 *
 * THE READ-BACK HAS THREE PARTS AND TWO OF THEM ARE CONTROLS:
 *   - the four DML grants are counted before and after and must be IDENTICAL,
 *   - no reader role holds any of the four wide privileges afterwards,
 *   - and `anon` reads the published catalogue INSIDE this transaction, under
 *     `set local role anon`, because that is the failure this build has
 *     actually caused before and a grant audit cannot see it.
 *
 * It ran clean:
 *   READ-BACK OK: dml grants unchanged at 752, wide grants now 0,
 *   anon still reads 64 published listings.
 */

do $do$
declare
  dml_before integer;
  dml_after  integer;
  wide_after integer;
  r record;
  n integer;
begin
  select count(*) into dml_before
    from pg_class c join pg_namespace n2 on n2.oid = c.relnamespace,
         lateral aclexplode(c.relacl) a
   where n2.nspname = 'public' and c.relkind = 'r'
     and a.grantee in ('anon'::regrole, 'authenticated'::regrole)
     and a.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE');

  for r in
    select c.relname
      from pg_class c join pg_namespace n2 on n2.oid = c.relnamespace
     where n2.nspname = 'public' and c.relkind = 'r'
  loop
    execute format(
      'revoke truncate, trigger, references, maintain on table public.%I from anon, authenticated',
      r.relname
    );
  end loop;

  /* THE ROOT CAUSE, not just the instances. Without this the next
     `create table` brings all four straight back. */
  alter default privileges in schema public
    revoke truncate, trigger, references, maintain on tables from anon, authenticated;

  select count(*) into dml_after
    from pg_class c join pg_namespace n2 on n2.oid = c.relnamespace,
         lateral aclexplode(c.relacl) a
   where n2.nspname = 'public' and c.relkind = 'r'
     and a.grantee in ('anon'::regrole, 'authenticated'::regrole)
     and a.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE');

  if dml_after <> dml_before then
    raise exception 'DML grants changed: % before, % after. Nothing an RLS policy needs may be touched.',
      dml_before, dml_after;
  end if;

  select count(*) into wide_after
    from pg_class c join pg_namespace n2 on n2.oid = c.relnamespace,
         lateral aclexplode(c.relacl) a
   where n2.nspname = 'public' and c.relkind = 'r'
     and a.grantee in ('anon'::regrole, 'authenticated'::regrole)
     and a.privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES', 'MAINTAIN');

  if wide_after <> 0 then
    raise exception 'a reader role still holds truncate, trigger, references or maintain on % grants', wide_after;
  end if;

  set local role anon;
  select count(*) into n from public.listings where status = 'PUBLISHED';
  reset role;

  if n < 1 then
    raise exception 'anon can no longer read the published catalogue: % rows', n;
  end if;

  raise notice 'READ-BACK OK: dml grants unchanged at %, wide grants now 0, anon still reads % published listings.',
    dml_after, n;
end $do$;
