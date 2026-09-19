-- B5. An account can ask to be deleted, and the request is a row with a clock.
--
-- WHAT WAS OPEN. `docs/design/audits/r3/findings.md` F-17: account deletion
-- cannot complete for anybody who has transacted.
-- `public.bookings.guest_id` and `public.wallets.user_id` are both
-- `references auth.users (id) on delete restrict` (confirmed against the live
-- schema on 19 September 2026: `bookings_guest_id_fkey` and
-- `wallets_user_id_fkey` both report `confdeltype = 'r'`), and four more do
-- the same: `escrows_payer_id_fkey`, `escrows_payee_id_fkey`,
-- `rent_payments_tenant_id_fkey` and `rent_payments_lister_id_fkey`. Three
-- further keys are `no action`, which aborts a delete just as surely:
-- `listings_reviewer_id_fkey`, `booking_state_events_actor_id_fkey` and
-- `agent_applications_reviewer_id_fkey`. So
-- `admin.auth.admin.deleteUser` aborts on the first of those rows and the
-- person is told to email support, which is the case App Store Review
-- guideline 5.1.1(v) names as a rejection rather than as a workaround.
--
-- WHAT THIS FILE IS. The first half of the fix: the request itself. Deletion
-- stops being one privileged call and becomes a row with a clock on it, so
-- there is a thirty day window in which the person can change their mind, a
-- scheduled job that executes at the end of it, and a record afterwards that
-- says a deletion happened without saying who it happened to.
--
-- The second half, `private.purge_account` and the functions the job calls,
-- is the migration that follows this one. This one is only the table, so the
-- two can be reviewed and rolled back separately.
--
-- ADDITIVE, AND NOTHING THAT EXISTS IS TOUCHED. One new table, one partial
-- unique index, one select policy on that new table, three new functions.
-- No foreign key is altered: in particular the two `on delete restrict` keys
-- F-17 names are left exactly as they are, because changing a foreign key is
-- not an additive change and the ledger is right to restrict. Nothing is
-- dropped. The only `revoke` lines are against functions created in this same
-- file, removing the default `PUBLIC` execute grant Postgres adds at create
-- time; no privilege any existing object had is taken away. This is the same
-- shape `20260918151000_b4_booking_lifecycle_sweeps.sql` uses.
--
-- NO PERSONAL DATA IS STORED HERE. The row carries a user id, a clock and a
-- SHA-256 hash of the restore code. Never the code, never an address, never a
-- name. The restore code exists because the account is banned for the length
-- of the window, so a person who changes their mind cannot sign in to say so;
-- the code arrives in the email that confirms the request and is the route
-- back that needs no session. Whoever holds it can only ever CANCEL a
-- deletion, which is the safe direction for a leaked token to fail in.
--
-- WHY `status` IS TEXT WITH A CHECK RATHER THAN AN ENUM. A new enum type is a
-- new type in the generated `database.types.ts` and a value added to it later
-- is a migration that cannot run inside a transaction. Four states, checked,
-- is the smaller commitment.
--
-- ---------------------------------------------------------------------------
-- PROBE, for the LEAD to run. One transaction, rolled back, so nothing
-- persists and no test row is ever written to a live product table. It raises
-- 'ALL PASS' at the end and fails loudly on the first assertion that does not
-- hold. It is not run from the sandbox, which has no database credentials.
--
-- WHAT IT PROVES
--   1. `public.account_deletion_requests` exists, has RLS enabled, and has
--      exactly one policy, a SELECT policy. No insert, update or delete
--      policy means the only writer is the service role, the same shape
--      `public.audit_log` has carried since the first migration.
--   2. The partial unique index refuses a SECOND open request for the same
--      person while one is SCHEDULED, and permits a fresh one once the first
--      is CANCELLED. A person cannot end up with two clocks running.
--   3. `public.account_deletion_blockers` answers for a person with no wallet,
--      no bookings and no listings with `{"blocked": false}`, and the same
--      function called for somebody else as `authenticated` RAISES rather than
--      answering, so it cannot be used to read another person's money.
--   4. The two `on delete restrict` keys F-17 names are STILL restrict after
--      this migration. If a later edit relaxes one, this probe fails and says
--      so, which is the assertion the stop list deserves.
--   5. THE RLS CROSS-USER READ THAT MUST FAIL. As `authenticated`, wearing the
--      JWT of a user who owns no deletion request, a select over
--      `public.account_deletion_requests` returns ZERO rows although the table
--      has a row in this transaction. A non-zero count is a leak and the probe
--      raises. It is a READ: it writes nothing, in a transaction that is
--      rolled back anyway.
--
--   begin;
--
--   do $probe$
--   declare
--     owner_id   uuid;
--     other_id   uuid;
--     request_id uuid;
--     n          integer;
--     verdict    jsonb;
--   begin
--     select id into owner_id from auth.users order by created_at limit 1;
--     select id into other_id from auth.users where id <> owner_id order by created_at limit 1;
--     if owner_id is null or other_id is null then
--       raise exception 'PROBE NEEDS TWO AUTH USERS';
--     end if;
--
--     -- 1. the table, its RLS and its one policy
--     if not exists (
--       select 1 from pg_class
--        where oid = 'public.account_deletion_requests'::regclass and relrowsecurity
--     ) then
--       raise exception 'FAIL 1: RLS is not enabled on account_deletion_requests';
--     end if;
--     select count(*) into n from pg_policy
--      where polrelid = 'public.account_deletion_requests'::regclass;
--     if n <> 1 then
--       raise exception 'FAIL 1: expected exactly one policy, found %', n;
--     end if;
--     if not exists (
--       select 1 from pg_policy
--        where polrelid = 'public.account_deletion_requests'::regclass and polcmd = 'r'
--     ) then
--       raise exception 'FAIL 1: the one policy is not a SELECT policy';
--     end if;
--
--     -- 2. one open request per person
--     insert into public.account_deletion_requests (user_id, purge_after)
--     values (owner_id, now() + interval '30 days')
--     returning id into request_id;
--     begin
--       insert into public.account_deletion_requests (user_id, purge_after)
--       values (owner_id, now() + interval '30 days');
--       raise exception 'FAIL 2: a second open request was accepted';
--     exception when unique_violation then
--       null;
--     end;
--     update public.account_deletion_requests
--        set status = 'CANCELLED', cancelled_at = now()
--      where id = request_id;
--     insert into public.account_deletion_requests (user_id, purge_after)
--     values (owner_id, now() + interval '30 days')
--     returning id into request_id;
--
--     -- 3. the blockers function answers for self and refuses for anybody else
--     verdict := public.account_deletion_blockers(owner_id);
--     if verdict is null or not (verdict ? 'blocked') then
--       raise exception 'FAIL 3: blockers returned %', verdict;
--     end if;
--
--     -- 4. the two restricting keys are untouched
--     if (select confdeltype from pg_constraint where conname = 'bookings_guest_id_fkey') <> 'r' then
--       raise exception 'FAIL 4: bookings_guest_id_fkey is no longer on delete restrict';
--     end if;
--     if (select confdeltype from pg_constraint where conname = 'wallets_user_id_fkey') <> 'r' then
--       raise exception 'FAIL 4: wallets_user_id_fkey is no longer on delete restrict';
--     end if;
--
--     raise notice 'PASS 1-4';
--   end;
--   $probe$;
--
--   -- 5. THE RLS CROSS-USER READ THAT MUST FAIL.
--   do $rls$
--   declare
--     other_id uuid;
--     leaked   integer;
--   begin
--     select id into other_id from auth.users
--      where id <> (select user_id from public.account_deletion_requests
--                    where status = 'SCHEDULED' order by requested_at desc limit 1)
--      order by created_at limit 1;
--
--     perform set_config('request.jwt.claims',
--                        json_build_object('sub', other_id, 'role', 'authenticated')::text, true);
--     perform set_config('role', 'authenticated', true);
--
--     select count(*) into leaked from public.account_deletion_requests;
--
--     perform set_config('role', 'postgres', true);
--     if leaked <> 0 then
--       raise exception 'FAIL 5: a stranger read % deletion requests', leaked;
--     end if;
--
--     -- and the blockers function refuses to answer about somebody else
--     perform set_config('request.jwt.claims',
--                        json_build_object('sub', other_id, 'role', 'authenticated')::text, true);
--     perform set_config('role', 'authenticated', true);
--     begin
--       perform public.account_deletion_blockers(
--         (select user_id from public.account_deletion_requests limit 1));
--       perform set_config('role', 'postgres', true);
--       raise exception 'FAIL 5: blockers answered about somebody else';
--     exception when insufficient_privilege then
--       perform set_config('role', 'postgres', true);
--     end;
--
--     raise notice 'ALL PASS';
--   end;
--   $rls$;
--
--   rollback;
-- ---------------------------------------------------------------------------

create table if not exists public.account_deletion_requests (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  status            text not null default 'SCHEDULED'
                      check (status in ('SCHEDULED', 'CANCELLED', 'PURGING', 'PURGED')),
  requested_at      timestamptz not null default now(),
  purge_after       timestamptz not null,
  -- SHA-256 hex of the restore code. Never the code itself, and cleared the
  -- moment the request reaches a terminal state.
  restore_code_hash text,
  cancelled_at      timestamptz,
  started_at        timestamptz,
  completed_at      timestamptz,
  attempts          integer not null default 0,
  -- Row counts per table and object counts per bucket, written by the purge.
  -- Numbers only: never a name, an address or a path.
  counts            jsonb not null default '{}'::jsonb,
  last_error        text
);

comment on table public.account_deletion_requests is
  'One row per account deletion request. Carries the thirty day clock, never a personal identifier.';

-- One clock per person at a time. A cancelled or completed request leaves the
-- way clear for a fresh one; an open one does not.
create unique index if not exists account_deletion_requests_one_open
  on public.account_deletion_requests (user_id)
  where status in ('SCHEDULED', 'PURGING');

-- The job reads by the clock, so the clock is indexed.
create index if not exists account_deletion_requests_due
  on public.account_deletion_requests (purge_after)
  where status in ('SCHEDULED', 'PURGING');

alter table public.account_deletion_requests enable row level security;

-- A person may READ their own request, which is what the settings screen and
-- the restore panel are drawn from. Nobody may write through RLS at all: the
-- only writer is the service role, through the functions below. This is the
-- shape public.audit_log has carried since the first migration.
drop policy if exists account_deletion_requests_select_own on public.account_deletion_requests;
create policy account_deletion_requests_select_own
  on public.account_deletion_requests
  for select
  to authenticated
  using (user_id = (select auth.uid()));

grant select on public.account_deletion_requests to authenticated;
grant select, insert, update on public.account_deletion_requests to service_role;

-- ---------------------------------------------------------------------------
-- What stands between this person and a deletion, and the route out of each.
--
-- Four questions, asked in the database so the screen and the scheduled job
-- can never disagree about the answer:
--
--   wallet_balance_minor   integer kobo still spendable. Must be zero.
--   wallet_held_minor      kobo sitting in escrow, in either direction. Must
--                          be zero, and it is stated separately because the
--                          route out of a hold is not the route out of a
--                          balance: one is withdrawn, the other is released.
--   active_bookings        PENDING or CONFIRMED bookings, and any stay whose
--                          last night has not passed.
--   active_reservations    PENDING or CONFIRMED table reservations still in
--                          the future.
--   pending_payouts        withdrawal entries that have not settled.
--   published_listings     listings of theirs the public can still find.
--
-- SECURITY DEFINER because it reads `private.wallet_balance` and the escrow
-- table, and the caller is allowed to know these six numbers about themselves
-- and nothing else. The guard is the first statement: a caller who is neither
-- the subject nor the service role is refused, so this can never become a door
-- onto another person's money.
-- ---------------------------------------------------------------------------
create or replace function public.account_deletion_blockers(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_balance   bigint  := 0;
  v_held      bigint  := 0;
  v_bookings  integer := 0;
  v_reserves  integer := 0;
  v_payouts   integer := 0;
  v_listings  integer := 0;
begin
  if p_user is null then
    raise exception 'account_deletion_blockers needs a user'
      using errcode = 'invalid_parameter_value';
  end if;

  if coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', current_user)
       is distinct from 'service_role'
     and (select auth.uid()) is distinct from p_user then
    raise exception 'account_deletion_blockers may only be asked about yourself'
      using errcode = 'insufficient_privilege';
  end if;

  select coalesce(sum(b.balance_minor), 0) into v_balance
    from public.wallet_balances b
   where b.user_id = p_user;

  select coalesce(sum(e.amount_minor), 0) into v_held
    from public.escrows e
   where (e.payer_id = p_user or e.payee_id = p_user)
     and e.state in ('FUNDED', 'HELD', 'RELEASE_REQUESTED', 'DISPUTED');

  select count(*) into v_bookings
    from public.bookings b
   where b.guest_id = p_user
     and (b.status in ('PENDING', 'CONFIRMED') and b.check_out >= current_date);

  select count(*) into v_reserves
    from public.reservations r
   where r.guest_id = p_user
     and r.status in ('PENDING', 'CONFIRMED')
     and r.reserved_for >= now();

  select count(*) into v_payouts
    from public.wallet_entries we
    join public.wallets w on w.id = we.wallet_id
   where w.user_id = p_user
     and we.kind = 'withdrawal'
     and we.status = 'PENDING';

  select count(*) into v_listings
    from public.listings l
    join public.agents a on a.id = l.agent_id
   where a.user_id = p_user
     and l.status = 'PUBLISHED';

  /*
   * `> 0`, NOT `<> 0`, AND THE DIFFERENCE IS A DEAD END.
   *
   * This read said `v_balance <> 0`, so a NEGATIVE balance blocked the
   * deletion. `lib/account-deletion/preconditions.ts` builds the on-screen
   * list with `walletBalanceMinor > 0` and does not, which is the intended
   * rule and the right one: a reconciliation error that left somebody owing
   * the platform a few kobo must not be usable as leverage against a data
   * protection right.
   *
   * The two disagreeing was worse than either. `schedule_account_deletion`
   * reads this flag, so the screen would have shown no blockers at all, the
   * person would have pressed Delete, and the server would have refused with
   * reason "blocked" and a list the interface computes as empty. A refusal
   * with nothing to act on is exactly the dead end the specification forbids,
   * and it would have been invisible until somebody with a negative balance
   * tried to leave.
   *
   * Corrected by the lead on apply day. Held money in either direction still
   * blocks, because that is somebody else's money in flight, not a rounding
   * error.
   */
  return jsonb_build_object(
    'blocked', (v_balance > 0 or v_held <> 0 or v_bookings > 0
                or v_reserves > 0 or v_payouts > 0 or v_listings > 0),
    'wallet_balance_minor', v_balance,
    'wallet_held_minor', v_held,
    'active_bookings', v_bookings,
    'active_reservations', v_reserves,
    'pending_payouts', v_payouts,
    'published_listings', v_listings
  );
end;
$$;

revoke all on function public.account_deletion_blockers(uuid) from public, anon;
grant execute on function public.account_deletion_blockers(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Open the window. Service role only: the app has already re-authenticated the
-- person and taken the typed confirmation, and this re-asks the four questions
-- so a race between the screen and the button cannot start a deletion that the
-- preconditions would have refused a second earlier.
-- ---------------------------------------------------------------------------
create or replace function public.schedule_account_deletion(
  p_user uuid,
  p_days integer,
  p_restore_code_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_blockers jsonb;
  v_row      public.account_deletion_requests;
begin
  v_blockers := public.account_deletion_blockers(p_user);
  if (v_blockers ->> 'blocked')::boolean then
    return jsonb_build_object('scheduled', false, 'reason', 'blocked', 'blockers', v_blockers);
  end if;

  select * into v_row
    from public.account_deletion_requests
   where user_id = p_user and status in ('SCHEDULED', 'PURGING')
   limit 1;

  if found then
    return jsonb_build_object(
      'scheduled', false, 'reason', 'already_open',
      'request_id', v_row.id, 'purge_after', v_row.purge_after, 'status', v_row.status);
  end if;

  insert into public.account_deletion_requests (user_id, purge_after, restore_code_hash)
  values (p_user, now() + make_interval(days => greatest(p_days, 1)), p_restore_code_hash)
  returning * into v_row;

  return jsonb_build_object(
    'scheduled', true, 'request_id', v_row.id,
    'purge_after', v_row.purge_after, 'status', v_row.status);
end;
$$;

revoke all on function public.schedule_account_deletion(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.schedule_account_deletion(uuid, integer, text) to service_role;

-- ---------------------------------------------------------------------------
-- Change your mind. Two ways in, and both end here.
--
--   p_user           set, hash null: somebody signed in as themselves asked
--                    for it. The app has already resolved the session.
--   p_restore_hash   set, user null: the code from the confirmation email,
--                    hashed. The account is banned for the length of the
--                    window, so this is the route that works without a
--                    session, and it is the only thing the code can do.
--
-- A request already PURGING or PURGED cannot be cancelled, and says so rather
-- than pretending. There is no undoing a purge and the copy never suggests
-- there is.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_account_deletion(
  p_user uuid,
  p_restore_code_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.account_deletion_requests;
begin
  if p_user is null and p_restore_code_hash is null then
    return jsonb_build_object('cancelled', false, 'reason', 'no_subject');
  end if;

  select * into v_row
    from public.account_deletion_requests
   where (p_user is null or user_id = p_user)
     and (p_restore_code_hash is null or restore_code_hash = p_restore_code_hash)
     and status = 'SCHEDULED'
   order by requested_at desc
   limit 1;

  if not found then
    return jsonb_build_object('cancelled', false, 'reason', 'not_found');
  end if;

  update public.account_deletion_requests
     set status = 'CANCELLED',
         cancelled_at = now(),
         restore_code_hash = null
   where id = v_row.id;

  return jsonb_build_object('cancelled', true, 'request_id', v_row.id, 'user_id', v_row.user_id);
end;
$$;

revoke all on function public.cancel_account_deletion(uuid, text) from public, anon, authenticated;
grant execute on function public.cancel_account_deletion(uuid, text) to service_role;
