-- O2: a saved search can be named, kept once, watched, and told about.
--
-- ADDITIVE THROUGHOUT. Five columns added, two indexes created, one trigger
-- created (dropped by name first so the file replays, which is the shape b1
-- used). Nothing is dropped, nothing is revoked, no policy is weakened, no
-- existing column changes type or nullability, and no row is written, updated
-- or deleted. `public.saved_searches` held zero rows when this was written.
--
-- WHAT WAS ALREADY THERE, READ OFF THE MIGRATIONS BEFORE WRITING THIS RATHER
-- THAN ASSUMED. `public.saved_searches` arrives in 20260728152458_engagement
-- with (id, user_id, label, query jsonb, alert_enabled, created_at), RLS
-- ENABLED, and ONE policy:
--
--   create policy saved_searches_own on public.saved_searches for all
--     using (auth.uid() = user_id) with check (auth.uid() = user_id);
--
-- That is already the whole owner rule for select, insert, update and delete,
-- so this file adds NO policy and changes none. 20260728202051 added
-- `saved_searches_user_idx (user_id)`. 20260919160100_b5 deletes a leaving
-- account's rows inside the purge. None of that is touched.
--
-- ---------------------------------------------------------------------------
-- ONE. `query_key`, AND WHY UNIQUENESS IS A DATABASE FACT.
--
-- A saved search is a stored address (see `apps/web/src/lib/saved/searches.ts`
-- for the canonical form: the same hunt always produces the same string, with
-- `sort` and `view` dropped because they change the ordering rather than the
-- matches). Saving the same hunt twice should be one row, and "should" in an
-- application is a race between two tabs. The partial unique index makes it a
-- constraint, and the action handles 23505 by returning the row that already
-- exists, because a person who saves a search they already keep has had their
-- intent satisfied.
--
-- It is PARTIAL on `query_key is not null` so a row written before this
-- column existed, or by any path that does not set it, is still legal.
--
-- ---------------------------------------------------------------------------
-- TWO. THE THREE ALERT STAMPS, AND THE ONE THAT MATTERS.
--
--   alert_cursor_at    the watermark. A match is a listing published STRICTLY
--                      after this instant. It is set to now() when a search is
--                      saved and again whenever alerts are switched ON, so
--                      switching the switch on never posts the back catalogue
--                      at somebody, and it is moved forward by the job only
--                      AFTER the notifications for that window are written.
--   alert_checked_at   when the job last looked at this row at all. This is
--                      how a row that is being skipped is told apart from a
--                      row that simply has no matches.
--   alert_notified_at  when this row last produced a notification.
--
-- Without the first one an alert job has no way to say what "new" means, and
-- every run either repeats itself or guesses. It is the whole reason this
-- migration exists.
--
-- ---------------------------------------------------------------------------
-- THREE. `updated_at` AND ITS TRIGGER. A renamed search and a search whose
-- switch was flipped both have to be tellable from a search nobody has
-- touched. `public.set_updated_at()` is the same function eleven other tables
-- use, from 20260728151133.
--
-- ---------------------------------------------------------------------------
-- THE PROBE. One block, run through `apply_migration`, ending in a deliberate
-- `raise exception` so the transaction rolls back: nothing persists, no probe
-- row survives on a live product table and no migration row is recorded. The
-- tool hands the pass message back as its error text.
--
-- IT MUST BE RUN THROUGH `apply_migration` AND NOT THROUGH `execute_sql`.
-- The lead established (ledger 11.1) that the MCP `execute_sql` tool runs as
-- `supabase_read_only_user`, which carries `rolbypassrls = true`, so a
-- cross-user read through that tool comes back full whether or not RLS would
-- have refused it and proves nothing at all. `apply_migration` holds a
-- privileged role, which is what lets the probe below `set local role
-- authenticated` and speak as a real account.
--
-- Assertions 1 to 4 describe this file. Assertions 5 to 9 are the RLS proof,
-- and 5 is the one that MUST come back EMPTY.
--
--   do $probe$
--   declare
--     u_a     uuid;
--     u_b     uuid;
--     s_id    uuid;
--     n       integer;
--     touched timestamptz;
--     born    timestamptz;
--   begin
--     select id into u_a from auth.users order by created_at limit 1;
--     select id into u_b from auth.users where id <> u_a order by created_at limit 1;
--     if u_b is null then
--       raise exception 'PROBE SETUP: this probe needs two auth.users rows';
--     end if;
--
--     -- 1. THE FIVE COLUMNS EXIST, with the nullability this file claims.
--     select count(*) into n
--       from information_schema.columns
--      where table_schema = 'public' and table_name = 'saved_searches'
--        and column_name in ('query_key', 'updated_at', 'alert_cursor_at',
--                            'alert_checked_at', 'alert_notified_at');
--     if n <> 5 then
--       raise exception 'PROBE FAIL 1: expected 5 new columns, found %', n;
--     end if;
--     if not exists (select 1 from information_schema.columns
--                     where table_schema = 'public' and table_name = 'saved_searches'
--                       and column_name = 'updated_at' and is_nullable = 'NO') then
--       raise exception 'PROBE FAIL 1b: updated_at is nullable';
--     end if;
--
--     -- 2. THE TWO INDEXES EXIST.
--     if not exists (select 1 from pg_indexes where schemaname = 'public'
--                     and indexname = 'saved_searches_user_key_uidx') then
--       raise exception 'PROBE FAIL 2a: the unique key index is missing';
--     end if;
--     if not exists (select 1 from pg_indexes where schemaname = 'public'
--                     and indexname = 'saved_searches_alerting_idx') then
--       raise exception 'PROBE FAIL 2b: the alerting index is missing';
--     end if;
--
--     -- 3. THE UPDATED STAMP MOVES ON A WRITE AND NOT BEFORE.
--     insert into public.saved_searches (user_id, label, query, query_key, alert_enabled)
--     values (u_a, 'probe one', '{"v":1,"params":{"q":"probe"}}'::jsonb, 'q=probe', true)
--     returning id, created_at, updated_at into s_id, born, touched;
--     if touched is distinct from born then
--       raise exception 'PROBE FAIL 3a: a fresh row was already stale';
--     end if;
--     perform pg_sleep(0.01);
--     update public.saved_searches set label = 'probe renamed' where id = s_id;
--     select updated_at into touched from public.saved_searches where id = s_id;
--     if touched <= born then
--       raise exception 'PROBE FAIL 3b: updated_at did not move on a rename';
--     end if;
--
--     -- 4. THE SAME KEY TWICE IS REFUSED FOR ONE ACCOUNT AND ALLOWED ACROSS TWO.
--     begin
--       insert into public.saved_searches (user_id, query, query_key)
--       values (u_a, '{}'::jsonb, 'q=probe');
--       raise exception 'PROBE FAIL 4a: the same search saved twice was accepted';
--     exception when unique_violation then null;
--     end;
--     insert into public.saved_searches (user_id, query, query_key)
--     values (u_b, '{}'::jsonb, 'q=probe');
--
--     -- The grants, named before the RLS assertions so that an empty read
--     -- below is read as a POLICY refusing and never as a missing privilege.
--     if not has_table_privilege('authenticated', 'public.saved_searches', 'SELECT')
--        or not has_table_privilege('authenticated', 'public.saved_searches', 'UPDATE')
--        or not has_table_privilege('authenticated', 'public.saved_searches', 'DELETE')
--        or not has_table_privilege('authenticated', 'public.saved_searches', 'INSERT') then
--       raise exception 'PROBE SETUP: authenticated lacks a table grant, so the RLS assertions below would prove nothing';
--     end if;
--     if not (select relrowsecurity from pg_class where oid = 'public.saved_searches'::regclass) then
--       raise exception 'PROBE FAIL: row level security is not enabled on saved_searches';
--     end if;
--
--     -- Become account B. From here on every statement is what a signed-in
--     -- stranger's own client can do.
--     perform set_config('request.jwt.claims',
--                        json_build_object('sub', u_b, 'role', 'authenticated')::text, true);
--     set local role authenticated;
--
--     -- 5. THE CROSS-USER READ, WHICH MUST COME BACK EMPTY.
--     select count(*) into n from public.saved_searches where id = s_id;
--     if n <> 0 then
--       raise exception 'PROBE FAIL 5: account B read account A''s saved search (% rows)', n;
--     end if;
--
--     -- 6. B sees their OWN row, so assertion 5 is RLS and not an empty table.
--     select count(*) into n from public.saved_searches where user_id = u_b;
--     if n <> 1 then
--       raise exception 'PROBE FAIL 6: account B cannot see their own row (% rows)', n;
--     end if;
--
--     -- 7. THE CROSS-USER UPDATE CHANGES NOTHING.
--     update public.saved_searches set label = 'taken' where id = s_id;
--     get diagnostics n = row_count;
--     if n <> 0 then
--       raise exception 'PROBE FAIL 7: account B updated account A''s row (% rows)', n;
--     end if;
--
--     -- 8. THE CROSS-USER DELETE REMOVES NOTHING.
--     delete from public.saved_searches where id = s_id;
--     get diagnostics n = row_count;
--     if n <> 0 then
--       raise exception 'PROBE FAIL 8: account B deleted account A''s row (% rows)', n;
--     end if;
--
--     -- 9. B CANNOT WRITE A ROW IN SOMEBODY ELSE'S NAME.
--     begin
--       insert into public.saved_searches (user_id, query, query_key)
--       values (u_a, '{}'::jsonb, 'q=forged');
--       raise exception 'PROBE FAIL 9: the with check clause allowed a forged owner';
--     exception when insufficient_privilege then null;
--     end;
--
--     reset role;
--     raise exception 'PROBE ALL PASS: 5 columns, 2 indexes, updated_at trigger, per-account uniqueness, and RLS refusing a cross-account read, update, delete and forged insert. Rolled back.';
--   end;
--   $probe$;

alter table public.saved_searches
  add column if not exists query_key        text,
  add column if not exists updated_at       timestamptz not null default now(),
  add column if not exists alert_cursor_at  timestamptz default now(),
  add column if not exists alert_checked_at timestamptz,
  add column if not exists alert_notified_at timestamptz;

comment on column public.saved_searches.query_key is
  'The canonical query string this search is, e.g. q=lekki&type=apartment&beds=2. Unique per account. Built by apps/web/src/lib/saved/searches.ts; sort and view are deliberately not part of it.';
comment on column public.saved_searches.updated_at is
  'Moved by saved_searches_set_updated_at on every write.';
comment on column public.saved_searches.alert_cursor_at is
  'The watermark. A match is a listing published strictly after this instant. Set to now() when the search is saved and whenever its alert is switched on, so switching on never posts the back catalogue.';
comment on column public.saved_searches.alert_checked_at is
  'When the saved-search alert job last judged this row, whether or not it matched.';
comment on column public.saved_searches.alert_notified_at is
  'When this row last produced a notification.';

-- One row per account per canonical search. Partial, so a row with no key
-- (written before this column existed, or by a path that does not set one) is
-- still legal rather than retrospectively illegal.
create unique index if not exists saved_searches_user_key_uidx
  on public.saved_searches (user_id, query_key)
  where query_key is not null;

-- The job reads "alerts on, oldest watermark first". Partial on the flag, so
-- it is answered from the small side of the table.
create index if not exists saved_searches_alerting_idx
  on public.saved_searches (alert_cursor_at)
  where alert_enabled;

-- Dropped by name first so this file replays cleanly. The trigger does not
-- exist before this migration; nothing else in the schema carries this name.
drop trigger if exists saved_searches_set_updated_at on public.saved_searches;
create trigger saved_searches_set_updated_at
  before update on public.saved_searches
  for each row execute function public.set_updated_at();

comment on table public.saved_searches is
  'A user''s saved search: a canonical address from the discovery URL contract, with an optional name and an in-app alert when something new matches it.';
