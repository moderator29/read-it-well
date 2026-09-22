/*
 * THE FLOAT IS BOOKED AS A LIABILITY. TODAY IT IS BOOKED NOWHERE.
 *
 * `docs/research/ESCROW_END_TO_END_RESEARCH.md` 5.7 states the requirement and
 * the reason. Escrowed money is not this company's money. It is customer funds
 * held, it belongs on the other side of the balance sheet from cash, and it
 * must never touch the revenue line. The codebase already gets the revenue
 * half right: `platform_revenue` is separate, append-only and carries no RLS
 * policy at all. The other half has never existed. The float is derivable only
 * by summing four states in an admin read, which is not a book entry, nobody
 * writes it down, and an accountant has nothing to reconcile against.
 *
 * WHAT THIS ADDS.
 *
 *   `public.escrow_float_snapshots`, one row per day, holding the float at a
 *   point in time with the count of agreements behind it, both derivations of
 *   the number, and their difference. A row is the book entry. The difference
 *   column is what makes it honest: a snapshot that recorded only one number
 *   could be wrong and look right.
 *
 *   `private.escrow_float_components()`, the arithmetic, in one place, so the
 *   snapshot and the hourly check that follows it cannot compute the float two
 *   different ways. That is the same mistake F-9 spent a migration undoing.
 *
 * THE TWO DERIVATIONS, AND WHY THEIR DIFFERENCE IS THE POINT.
 *
 *   From the LEDGER: every `escrow_hold` debit, minus every `escrow_release`
 *   credit, minus every `escrow_refund` credit, minus every commission booked
 *   to `platform_revenue`. The commission subtraction is not decoration: a
 *   release credits the payee the NET, so without it the commission would sit
 *   in the float for ever and the two sides would never meet.
 *
 *   From the ESCROW ROWS: the sum of `amount_minor` over every agreement that
 *   is still holding money.
 *
 *   They must be equal to the kobo. Asserting that is the next migration's
 *   job. Writing both down, every day, is this one's.
 *
 * INTEGER KOBO THROUGHOUT. `bigint`, never a numeric, never a float, and
 * nothing here divides.
 */

-- ---------------------------------------------------------------------------
-- The arithmetic, in one place.
-- ---------------------------------------------------------------------------

create or replace function private.escrow_float_components()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with ledger as (
    select
      coalesce(sum(amount_minor) filter (
        where kind = 'escrow_hold' and direction = 'debit' and status = 'COMPLETED'), 0) as holds_minor,
      coalesce(sum(amount_minor) filter (
        where kind = 'escrow_release' and direction = 'credit' and status = 'COMPLETED'), 0) as released_minor,
      coalesce(sum(amount_minor) filter (
        where kind = 'escrow_refund' and direction = 'credit' and status = 'COMPLETED'), 0) as refunded_minor
    from public.wallet_entries
  ),
  revenue as (
    select coalesce(sum(amount_minor), 0) as commission_minor
    from public.platform_revenue
    where source = 'escrow_commission'
  ),
  /*
   * LIVE MEANS A HOLD POSTED AND NOTHING HAS SETTLED IT. The state alone is
   * not the test, because `INITIATED -> DISPUTED` is a legal transition and an
   * agreement can therefore reach DISPUTED having never taken a single kobo
   * out of anybody's balance. Counting it would put money in the float that
   * the ledger has never seen.
   */
  live as (
    select
      coalesce(sum(e.amount_minor), 0) as live_minor,
      count(*) as live_count
    from public.escrows e
    where e.state in ('FUNDED', 'HELD', 'RELEASE_REQUESTED', 'DISPUTED')
      and exists (
        select 1 from public.wallet_entries w
         where w.kind = 'escrow_hold'
           and w.status = 'COMPLETED'
           and (w.metadata ->> 'escrow_id') = e.id::text
      )
  )
  select jsonb_build_object(
    'currency', 'NGN',
    'holds_minor', l.holds_minor,
    'released_minor', l.released_minor,
    'refunded_minor', l.refunded_minor,
    'commission_minor', r.commission_minor,
    'ledger_float_minor', l.holds_minor - l.released_minor - l.refunded_minor - r.commission_minor,
    'escrow_float_minor', v.live_minor,
    'escrow_count', v.live_count,
    'difference_minor', (l.holds_minor - l.released_minor - l.refunded_minor - r.commission_minor) - v.live_minor
  )
  from ledger l, revenue r, live v;
$$;

comment on function private.escrow_float_components() is
  'The escrow float, derived twice: once from the wallet ledger and once from the escrow rows. Their difference must be zero. Integer kobo.';

-- ---------------------------------------------------------------------------
-- The book entry.
-- ---------------------------------------------------------------------------

create table if not exists public.escrow_float_snapshots (
  id                      uuid primary key default gen_random_uuid(),
  /* One row per day. The date, not the timestamp, is the key, so a job that
     fires twice corrects its own row rather than booking the float twice. */
  as_of                   date not null unique,
  taken_at                timestamptz not null default now(),
  currency                text not null default 'NGN' check (currency = 'NGN'),
  /* THE LIABILITY. Customer funds held by Vallo at this moment. */
  float_minor             bigint not null check (float_minor >= 0),
  escrow_count            integer not null check (escrow_count >= 0),
  /* The same number derived the other way, and the gap between them. */
  ledger_float_minor      bigint not null,
  commission_booked_minor bigint not null check (commission_booked_minor >= 0),
  difference_minor        bigint not null,
  components              jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now()
);

comment on table public.escrow_float_snapshots is
  'Customer funds held in escrow, booked as a liability once a day. Escrowed money is not revenue and never touches the revenue line; this is the other half of that rule, which platform_revenue only ever carried on its own.';
comment on column public.escrow_float_snapshots.float_minor is
  'The liability: integer kobo of customer money Vallo was holding on as_of, derived from the escrow rows.';
comment on column public.escrow_float_snapshots.difference_minor is
  'ledger_float_minor minus float_minor. Anything but zero is an incident, and the hourly check exists to page about it.';

create index if not exists escrow_float_snapshots_as_of_idx
  on public.escrow_float_snapshots (as_of desc);

alter table public.escrow_float_snapshots enable row level security;

/*
 * A liability schedule is an operator's document. Neither party to an escrow
 * has any business reading the platform's aggregate position, so there is no
 * party policy here, only an admin one. Writes come from the scheduled job
 * running as the definer; no role has an insert or update policy at all, which
 * is the same shape `platform_revenue` uses and for the same reason.
 */
drop policy if exists escrow_float_snapshots_select_admin on public.escrow_float_snapshots;
create policy escrow_float_snapshots_select_admin
  on public.escrow_float_snapshots
  for select
  using (
    private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  );

-- ---------------------------------------------------------------------------
-- The job that writes it down.
-- ---------------------------------------------------------------------------

create or replace function private.escrow_float_snapshot_take()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c jsonb := private.escrow_float_components();
  today date := (now() at time zone 'UTC')::date;
begin
  insert into public.escrow_float_snapshots (
    as_of, taken_at, float_minor, escrow_count,
    ledger_float_minor, commission_booked_minor, difference_minor, components
  )
  values (
    today, now(),
    (c ->> 'escrow_float_minor')::bigint,
    (c ->> 'escrow_count')::integer,
    (c ->> 'ledger_float_minor')::bigint,
    (c ->> 'commission_minor')::bigint,
    (c ->> 'difference_minor')::bigint,
    c
  )
  on conflict (as_of) do update
    set taken_at                = excluded.taken_at,
        float_minor             = excluded.float_minor,
        escrow_count            = excluded.escrow_count,
        ledger_float_minor      = excluded.ledger_float_minor,
        commission_booked_minor = excluded.commission_booked_minor,
        difference_minor        = excluded.difference_minor,
        components              = excluded.components;

  /*
   * The sweeper returns a count that nothing reads (5.8). This one does not
   * make that mistake: every pass leaves a row in the audit log, so an
   * operator can see that the books were written and what they said, without
   * needing read access to the table itself.
   */
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (null, 'escrow.float.booked', 'escrow_float_snapshot', today::text, c);

  return c;
end;
$$;

comment on function private.escrow_float_snapshot_take() is
  'Books the escrow float as a liability for today, idempotently, and records the pass in the audit log.';

-- ---------------------------------------------------------------------------
-- RULE 21. Born locked, restated, read back.
-- ---------------------------------------------------------------------------

revoke all on function private.escrow_float_components() from public, anon, authenticated;
revoke all on function private.escrow_float_snapshot_take() from public, anon, authenticated;
revoke all on table public.escrow_float_snapshots from anon;

do $$
declare
  leak text;
begin
  select string_agg(p.oid::regprocedure::text || ' -> ' || r.rolname, ', ')
    into leak
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    cross join (values ('anon'), ('authenticated')) as r(rolname)
   where n.nspname = 'private'
     and p.proname in ('escrow_float_components', 'escrow_float_snapshot_take')
     and has_function_privilege(r.rolname, p.oid, 'EXECUTE');

  if leak is not null then
    raise exception 'RULE 21 VIOLATED: %', leak;
  end if;

  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = 'escrow_float_snapshots' and c.relrowsecurity
  ) then
    raise exception 'escrow_float_snapshots shipped without row level security';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Daily, at a minute nothing else uses.
--
-- The existing seven jobs sit at :00, :10, :15, :17, :20, :30 and :47 past.
-- 03:05 UTC is 04:05 in Lagos, after the nightly badge sweep at 02:20 and the
-- idempotency purge at 02:10, and before anybody is awake to move money.
-- ---------------------------------------------------------------------------

select cron.unschedule('vallo_escrow_book_the_float')
 where exists (select 1 from cron.job where jobname = 'vallo_escrow_book_the_float');

select cron.schedule(
  'vallo_escrow_book_the_float',
  '5 3 * * *',
  $job$ select private.escrow_float_snapshot_take(); $job$
);
