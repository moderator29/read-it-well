-- Escrow: the promise this platform makes everywhere and has never kept.
--
-- The email templates say the money is held. The assistant's system prompt says
-- the money is held. A grep for "escrow" across this repository before this file
-- returns comments and nothing else: no table, no state, no function, and no
-- money anywhere but a straight wallet debit from a guest to a host. Every one
-- of those sentences was a promise the database could not keep, and it is the
-- entire reason somebody pays a stranger for a Lagos flat through a website
-- instead of counting cash at the gate.
--
-- THE SHAPE. Two parties, a listing, what the money is FOR, an amount in kobo,
-- and a timestamp for every transition. The timestamps are separate columns
-- rather than a history table because there are eight, each is written exactly
-- once, and "when was this funded" is a question every screen asks and none
-- should answer with a subquery. The history table would also invite a second
-- source of truth for the current state, which is the one thing an escrow must
-- never have.
--
-- THE STATE MACHINE IS IN THE DATABASE, not only in TypeScript. A guard in the
-- application is a guard over the code paths that exist today. The trigger
-- below is a guard over every path there will ever be, including a support
-- engineer at a psql prompt at two in the morning, and escrow is exactly the
-- object where "somebody updated a row by hand" must not be able to turn a
-- REFUNDED hold back into a RELEASED one.
--
-- NOBODY WRITES THIS TABLE FROM A BROWSER. There is no insert, update or delete
-- policy. Every movement goes through a locking SECURITY DEFINER function, in
-- the style of private.pay_booking_from_wallet, which takes SELECT ... FOR
-- UPDATE before it reads a balance. Read a balance and then write it in two
-- round trips and two concurrent releases both see the money.

begin;

/* ------------------------------------------------------------------ types */

/*
 * What the money is for. Four values, four genuinely different promises.
 *
 * A rent deposit is returnable at the end of a tenancy; a first rent is not. A
 * purchase deposit is forfeitable under most Nigerian sale agreements; a
 * purchase balance is completion money. Folding them into one "payment" would
 * leave the release and refund rules nothing to key off, and those rules are
 * the product.
 */
create type public.escrow_purpose as enum (
  'rent_deposit',
  'first_rent',
  'purchase_deposit',
  'purchase_balance'
);

/*
 * Eight states. The legal transitions between them are enumerated in
 * private.escrow_transition_is_legal, not described in a comment, so that the
 * rule and the documentation cannot drift.
 *
 *   INITIATED          agreed, no money has moved
 *   FUNDED             the payer's wallet has been debited
 *   HELD               the platform is holding it and both sides know
 *   RELEASE_REQUESTED  one side has asked for it to be paid out
 *   RELEASED           it reached the payee
 *   REFUNDED           it went back to the payer
 *   DISPUTED           somebody objected; only an admin moves it now
 *   RESOLVED           an admin ruled and the ruling has been carried out
 *
 * RELEASED, REFUNDED and RESOLVED are terminal. Nothing leaves them.
 */
create type public.escrow_state as enum (
  'INITIATED',
  'FUNDED',
  'HELD',
  'RELEASE_REQUESTED',
  'RELEASED',
  'REFUNDED',
  'DISPUTED',
  'RESOLVED'
);

/* ----------------------------------------------------------------- table */

create table public.escrows (
  id uuid primary key default gen_random_uuid(),

  /*
   * The two parties, by auth user rather than by agents row.
   *
   * A seller is an agents row today, but the person who gets refunded is a
   * person and a wallet belongs to a user. Pointing at the user is what lets
   * the money functions find a wallet without joining through agents, and it
   * keeps working the day a private landlord with no agents row uses escrow.
   *
   * ON DELETE RESTRICT, deliberately, and it is the only restrict in this file.
   * Everything else in this schema lets a person leave. Money in flight does
   * not: deleting the account on one side of a live escrow would leave kobo
   * held for nobody. The account deletion path has to settle the escrow first,
   * which is the correct order of operations and not an obstacle.
   */
  payer_id uuid not null references auth.users(id) on delete restrict,
  payee_id uuid not null references auth.users(id) on delete restrict,

  /*
   * What it is against. Nullable because a purchase balance outlives the
   * listing: the property sells, the listing comes down, and losing the escrow
   * at that exact moment would be the worst possible time to lose it.
   */
  listing_id uuid references public.listings(id) on delete set null,
  purpose public.escrow_purpose not null,

  amount_minor bigint not null,
  currency text not null default 'NGN',

  state public.escrow_state not null default 'INITIATED',

  /*
   * Dual confirmation. Neither side alone releases the money.
   *
   * A payer confirming means "I have what I paid for". A payee confirming means
   * "I have handed it over". With both, the money moves and no admin ever sees
   * it, and that has to be the common case or escrow is just a support queue
   * with extra steps.
   */
  payer_confirmed_at timestamptz,
  payee_confirmed_at timestamptz,

  /*
   * The inspection that already existed and did nothing.
   *
   * public.inspection_confirmations has been in this schema since the messaging
   * work: a row saying a named person confirmed they inspected a named listing
   * inside a named conversation. Nothing read it. It was a decoration. Here it
   * becomes a genuine release signal: an inspection confirmed by the PAYER
   * stands in for the payer's own confirmation, because somebody who has walked
   * through the flat and said so has already answered the question the
   * confirmation asks.
   */
  inspection_confirmation_id uuid
    references public.inspection_confirmations(id) on delete set null,

  /* One timestamp per transition, each written exactly once. */
  initiated_at timestamptz not null default now(),
  funded_at timestamptz,
  held_at timestamptz,
  release_requested_at timestamptz,
  released_at timestamptz,
  refunded_at timestamptz,
  disputed_at timestamptz,
  resolved_at timestamptz,

  /* Who asked, so the other side can be told who is waiting on them. */
  release_requested_by uuid references auth.users(id) on delete set null,
  disputed_by uuid references auth.users(id) on delete set null,
  dispute_reason text,

  /* The admin override and its trail. An override with no reason is an override
     nobody can review, so the constraint below makes the pair inseparable. */
  resolved_by uuid references auth.users(id) on delete set null,
  resolution_note text,

  /*
   * The timeout, written at HELD rather than computed on read.
   *
   * An escrow nobody touches must not sit forever: the money has left the
   * payer's spendable balance and has not reached the payee, which is the worst
   * place for it to be. Storing the deadline rather than deriving it means
   * changing the policy later does not silently re-date every hold already in
   * flight, and somebody who was told "21 days" is held to 21 days.
   */
  auto_release_at timestamptz,

  /* The platform's cut, frozen at the moment of release with the rate that
     produced it. Zero today and for as long as the owner leaves it zero. See
     the fee_rates migration for why this is stored rather than recomputed. */
  commission_minor bigint,
  commission_rate_id uuid references public.fee_rates(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint escrows_amount_positive check (amount_minor > 0),
  constraint escrows_currency_naira check (currency = 'NGN'),
  constraint escrows_parties_differ check (payer_id <> payee_id),
  constraint escrows_dispute_has_a_reason
    check (
      disputed_at is null
      or (dispute_reason is not null and char_length(btrim(dispute_reason)) >= 4)
    ),
  constraint escrows_resolution_has_a_note
    check (
      resolved_at is null
      or (
        resolved_by is not null
        and resolution_note is not null
        and char_length(btrim(resolution_note)) >= 4
      )
    ),
  constraint escrows_commission_nonneg
    check (commission_minor is null or (commission_minor >= 0 and commission_minor <= amount_minor))
);

comment on table public.escrows is
  'Money the platform is holding between two people, with an explicit state machine enforced by a trigger rather than by application code. Nobody writes this table from a browser: every movement goes through a locking SECURITY DEFINER function that takes the wallet row FOR UPDATE before it reads a balance.';

comment on column public.escrows.auto_release_at is
  'When the sweeper will release this hold if nobody has acted. Written at HELD rather than derived, so changing the policy does not re-date holds already in flight.';

comment on column public.escrows.inspection_confirmation_id is
  'The inspection that stands in for the payer''s confirmation. public.inspection_confirmations existed and was read by nothing; this is what makes it a real signal.';

/* --------------------------------------------------------------- indexes */

-- The two party reads, which are the only reads a signed-in person makes.
create index escrows_payer_idx on public.escrows (payer_id, created_at desc);
create index escrows_payee_idx on public.escrows (payee_id, created_at desc);
-- The admin console: everything not yet settled, newest first.
create index escrows_state_idx on public.escrows (state, created_at desc);
-- The dispute queue, which is the screen somebody sits at.
create index escrows_disputed_idx on public.escrows (disputed_at desc)
  where state = 'DISPUTED';
-- The sweeper. Partial so it stays tiny however many escrows have settled.
create index escrows_timeout_idx on public.escrows (auto_release_at)
  where state in ('HELD', 'RELEASE_REQUESTED') and auto_release_at is not null;
-- Foreign keys that a screen actually joins on.
create index escrows_listing_idx on public.escrows (listing_id)
  where listing_id is not null;
create index escrows_inspection_idx on public.escrows (inspection_confirmation_id)
  where inspection_confirmation_id is not null;
create index escrows_commission_rate_idx on public.escrows (commission_rate_id)
  where commission_rate_id is not null;

/* --------------------------------------------------- the state machine */

/*
 * Every legal transition, enumerated.
 *
 * Written as a data expression rather than a chain of ifs so that reading the
 * function IS reading the diagram. A transition not on this list does not
 * happen, whoever attempts it and however they connect.
 */
create or replace function private.escrow_transition_is_legal(
  from_state public.escrow_state,
  to_state public.escrow_state
)
returns boolean
language sql
immutable
as $$
  select (from_state, to_state) in (
    -- Funding, and the hold that immediately follows it.
    ('INITIATED', 'FUNDED'),
    ('FUNDED', 'HELD'),
    -- The happy path: somebody asks, or both sides confirm and it goes straight
    -- out. Both are allowed from HELD because dual confirmation does not need
    -- anybody to have formally "requested" anything.
    ('HELD', 'RELEASE_REQUESTED'),
    ('HELD', 'RELEASED'),
    ('RELEASE_REQUESTED', 'RELEASED'),
    -- Going back. A hold can be refunded before anybody has asked for it and
    -- after, because a payee who has read the request and agrees it should not
    -- go to them is the fastest possible resolution.
    ('HELD', 'REFUNDED'),
    ('RELEASE_REQUESTED', 'REFUNDED'),
    -- Objecting. Available from every live state including INITIATED and
    -- FUNDED, because "this should never have been set up" is a real objection
    -- and making somebody wait for HELD to say it is absurd.
    ('INITIATED', 'DISPUTED'),
    ('FUNDED', 'DISPUTED'),
    ('HELD', 'DISPUTED'),
    ('RELEASE_REQUESTED', 'DISPUTED'),
    -- The admin ruling. One state out of a dispute, and the money movement it
    -- carried out is recorded in the resolution note and in the ledger.
    ('DISPUTED', 'RESOLVED')
  );
$$;

comment on function private.escrow_transition_is_legal is
  'The escrow state diagram, as data. RELEASED, REFUNDED and RESOLVED appear only on the right hand side, which is what makes them terminal.';

/*
 * The guard, and the audit entry, on every single update.
 *
 * Two jobs in one trigger because they must not be separable: a transition that
 * happened without an audit row is a transition nobody can account for, and
 * escrow is the one object where every movement has to be accountable.
 *
 * The actor is read from auth.uid() where there is one, and falls back to null
 * for the sweeper, which runs on a schedule with nobody signed in. A null actor
 * on an escrow.auto_released entry is the honest answer: nobody did it, the
 * clock did.
 */
create or replace function private.escrow_guard_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
begin
  if new.state is distinct from old.state then
    if not private.escrow_transition_is_legal(old.state, new.state) then
      raise exception
        'escrow % cannot go from % to %', old.id, old.state, new.state
        using errcode = 'check_violation';
    end if;

    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (
      actor,
      'escrow.' || lower(new.state::text),
      'escrow',
      new.id::text,
      jsonb_build_object(
        'from', old.state,
        'to', new.state,
        'amount_minor', new.amount_minor,
        'purpose', new.purpose,
        'payer_id', new.payer_id,
        'payee_id', new.payee_id,
        'listing_id', new.listing_id,
        'dispute_reason', new.dispute_reason,
        'resolution_note', new.resolution_note,
        'resolved_by', new.resolved_by,
        'commission_minor', new.commission_minor
      )
    );
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger escrows_guard_transition
  before update on public.escrows
  for each row
  execute function private.escrow_guard_transition();

/*
 * The birth of an escrow is a transition too, and it gets its own entry.
 *
 * Without this, an escrow that was created and immediately disputed would have
 * an audit trail that started mid-story.
 */
create or replace function private.escrow_audit_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'escrow.initiated',
    'escrow',
    new.id::text,
    jsonb_build_object(
      'amount_minor', new.amount_minor,
      'purpose', new.purpose,
      'payer_id', new.payer_id,
      'payee_id', new.payee_id,
      'listing_id', new.listing_id
    )
  );
  return null;
end;
$$;

create trigger escrows_audit_insert
  after insert on public.escrows
  for each row
  execute function private.escrow_audit_insert();

/* -------------------------------------------------------------------- RLS */

alter table public.escrows enable row level security;

/*
 * Each party reads their own. Admins read all. NOBODY writes from a browser.
 *
 * The absence of an insert, update and delete policy is the load-bearing part
 * of this block, not an omission. Every movement goes through a SECURITY
 * DEFINER function that locks a wallet first, and a policy that let a party
 * write the row directly would be a way around the lock.
 */
create policy escrows_select_party
  on public.escrows for select
  using (
    (select auth.uid()) = payer_id
    or (select auth.uid()) = payee_id
  );

create policy escrows_select_admin
  on public.escrows for select
  using (
    private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  );

revoke all on table public.escrows from anon, authenticated;
grant select on table public.escrows to authenticated;

commit;
