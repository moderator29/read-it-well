-- Applied to live as 20260923162023 and recorded here from
-- supabase_migrations.schema_migrations, so the repository carries every
-- migration the database has run. One change for replay: the two accounts'
-- rows, the admin grant and the read-back run only where both accounts
-- exist, so a fresh database (a reset or a branch) gets the table and the
-- predicate and skips what belongs to live.

/*
 * THE TWO QA ACCOUNTS: NAMED IN THE DATABASE, EXCLUDED FROM EVERY COUNT, AND
 * ONE OF THEM MADE AN ADMIN.
 *
 * The founder created both himself on 23 September, confirmed, and signed in.
 * The addresses are `+` routed on one real Gmail inbox he holds, which is why
 * they PROVABLY receive mail. That closes the caveat ledger 49octies raised
 * and could not settle from a container: the addresses first proposed,
 * `qa-member@vallospaces.com` and `qa-admin@vallospaces.com`, were never
 * created and are superseded. These are the only two.
 *
 *   phantomfcalls+qamember@gmail.com  957b3bd2-cce3-425d-bba9-5cd876ca3d62
 *   phantomfcalls+qaadmi@gmail.com    03f3dd52-ea28-4852-9abe-e5b0a67c2a43
 *
 * THE SECOND ONE READS `qaadmi` AND NOT `qaadmin`. That is the address in
 * `auth.users`, copied literally rather than corrected. Under the founder's
 * rule of 23 September an email can never be changed, so it is not a typo that
 * can be tidied later: it is the account's permanent name and every document
 * must spell it that way.
 *
 * WHY A TABLE RATHER THAN A COLUMN ON `profiles`. A boolean on an existing
 * table would be a new NOT NULL column or a nullable one nobody sets, and the
 * standing rule from the `listing_role` defect is that a migration does not
 * add a NOT NULL column without a default and a test that inserts the way the
 * application inserts. A join table avoids that entirely, carries its reason
 * per row, and an account is either listed or it is not.
 */

create table if not exists public.qa_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  label text not null,
  reason text not null,
  added_at timestamptz not null default now()
);

/* BORN LOCKED. `pg_default_acl` hands every new relation in `public` to `anon`
   and `authenticated`, which is how three inspection tables shipped world
   readable earlier today until the read-back caught it. Taken back before a
   policy is written. */
revoke all on public.qa_accounts from public, anon, authenticated;
alter table public.qa_accounts enable row level security;

drop policy if exists qa_accounts_select_admin on public.qa_accounts;
create policy qa_accounts_select_admin on public.qa_accounts
  for select using (
    private.has_role((select auth.uid()), 'admin'::public.app_role)
    or private.has_role((select auth.uid()), 'super_admin'::public.app_role)
  );

grant select on public.qa_accounts to authenticated;
grant all on public.qa_accounts to service_role;

/*
 * THE PREDICATE EVERY COUNT ASKS.
 *
 * It is granted to `authenticated` deliberately, because the admin reads that
 * will call it run as the operator rather than as the service role, and a
 * `private` helper called from a query by that role needs EXECUTE for it. The
 * same exception rule 21 carries for RLS helpers, for the same reason, and it
 * is the one that refused the whole public catalogue for eleven hours when it
 * was forgotten. `anon` gets nothing: a signed out visitor counts nothing.
 */
create or replace function private.is_qa_account(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (select 1 from public.qa_accounts q where q.user_id = p_user);
$function$;

revoke all on function private.is_qa_account(uuid) from public, anon;
grant execute on function private.is_qa_account(uuid) to authenticated, service_role;

/*
 * THE ROWS, THE ADMIN GRANT AND THE READ BACK, where the two accounts exist.
 * Idempotent: run it twice and the second run changes nothing. The `user`
 * role each account already carries is left alone, because `user_roles` is
 * keyed on (user_id, role) and an admin is also a user. The founder asked for
 * the role proved by reading it, not by this migration exiting 0, so the
 * assertions are the proof and they fail the migration if any is untrue.
 */
do $$
declare
  admin_roles text;
  member_roles text;
  listed integer;
  n integer;
begin
  if not exists (select 1 from auth.users where id = '957b3bd2-cce3-425d-bba9-5cd876ca3d62')
     or not exists (select 1 from auth.users where id = '03f3dd52-ea28-4852-9abe-e5b0a67c2a43') then
    raise notice 'QA accounts: not in this database, rows and grant skipped';
    return;
  end if;

  insert into public.qa_accounts (user_id, label, reason) values
    ('957b3bd2-cce3-425d-bba9-5cd876ca3d62', 'QA member',
     'Test account. Also the App Store and Play Store reviewer credential: a reviewer gets THIS one and never the admin.'),
    ('03f3dd52-ea28-4852-9abe-e5b0a67c2a43', 'QA admin',
     'Test account with the admin role. Internal only. Never given to Apple, Google or anybody outside the company.')
  on conflict (user_id) do update
    set label = excluded.label, reason = excluded.reason;

  insert into public.user_roles (user_id, role)
  values ('03f3dd52-ea28-4852-9abe-e5b0a67c2a43', 'admin'::public.app_role)
  on conflict (user_id, role) do nothing;

  select string_agg(role::text, ',' order by role::text) into admin_roles
    from public.user_roles where user_id = '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  select string_agg(role::text, ',' order by role::text) into member_roles
    from public.user_roles where user_id = '957b3bd2-cce3-425d-bba9-5cd876ca3d62';

  if admin_roles is null or position('admin' in admin_roles) = 0 then
    raise exception 'the QA admin does not hold the admin role, it holds %', coalesce(admin_roles, '(none)');
  end if;

  /* THE CONTROL, AND IT IS THE HALF THAT MATTERS. A grant that landed on both
     accounts would satisfy the line above and be a serious mistake: the
     reviewer credential must never be an admin. */
  if member_roles is not null and position('admin' in member_roles) > 0 then
    raise exception 'the QA MEMBER has been made an admin, and that account is the store reviewer credential. Roles: %', member_roles;
  end if;

  if private.has_role('03f3dd52-ea28-4852-9abe-e5b0a67c2a43'::uuid, 'admin'::public.app_role) is not true then
    raise exception 'has_role disagrees with user_roles about the QA admin';
  end if;
  if private.has_role('957b3bd2-cce3-425d-bba9-5cd876ca3d62'::uuid, 'admin'::public.app_role) is not false then
    raise exception 'has_role thinks the QA member is an admin';
  end if;

  select count(*) into listed from public.qa_accounts;
  if listed <> 2 then
    raise exception 'expected exactly two QA accounts, found %', listed;
  end if;

  if not private.is_qa_account('957b3bd2-cce3-425d-bba9-5cd876ca3d62'::uuid)
     or not private.is_qa_account('03f3dd52-ea28-4852-9abe-e5b0a67c2a43'::uuid) then
    raise exception 'is_qa_account does not recognise one of the two';
  end if;
  /* The opposite shape: it must not recognise somebody who is not one. */
  if private.is_qa_account('00000000-0000-4000-8000-000000000000'::uuid) then
    raise exception 'is_qa_account recognises an account that is not a QA account';
  end if;

  if has_table_privilege('anon', 'public.qa_accounts', 'SELECT') then
    raise exception 'qa_accounts is readable by anon';
  end if;

  select count(*) into n from pg_class where oid = 'public.qa_accounts'::regclass and relrowsecurity;
  if n <> 1 then
    raise exception 'row level security is not enabled on qa_accounts';
  end if;
end $$;

comment on table public.qa_accounts is
  'The accounts that are not people. Excluded from every count the way is_demo '
  'excludes example listings. The member one is the App Store and Play Store '
  'reviewer credential; the admin one is internal and is never given out.';
comment on function private.is_qa_account(uuid) is
  'True for a test account. Ask this in any statistic that counts people, the '
  'way a listing count asks not is_demo.';
