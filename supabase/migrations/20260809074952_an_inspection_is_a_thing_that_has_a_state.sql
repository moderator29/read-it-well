/*
 * AN INSPECTION IS A THING THAT HAS A STATE.
 *
 * In the Nigerian rental and sale market the inspection IS the transaction.
 * Nobody sends a year's rent for a flat they have not stood in, no agent hands
 * over keys before a viewing, and the whole path this platform documents -
 * message, inspect, then pay - hangs on a step the database could not
 * represent.
 *
 * What existed before this file: `public.inspection_confirmations`, a row
 * saying a named person confirmed, AFTER THE FACT, that they had inspected a
 * property inside a named conversation. That is a receipt, and a good one: the
 * escrow work reads it as a release signal. It is not a REQUEST. It cannot say
 * that somebody asked to view a flat on Saturday morning, that the agent has
 * not answered, that the agent said Sunday instead, or that it happened.
 *
 * So an inspection lived only as sentences inside a chat thread. A lister with
 * nine properties had no list of who wants to see what. A renter who asked
 * three agents on Tuesday had no way to know which of them replied. Both sides
 * were tracking the most important step in the funnel by scrolling.
 *
 * This table is that step, as an object with a state, visible to BOTH parties.
 *
 * ---------------------------------------------------------------------------
 * WHY A NEW TABLE RATHER THAN A COLUMN ON THE CONVERSATION
 * ---------------------------------------------------------------------------
 *
 * A conversation is about a property and may carry many inspections over its
 * life: one that was declined in March, one that happened in April, one being
 * arranged now. Folding the state onto the thread would keep exactly one, and
 * the one it kept would be whichever was written last.
 *
 * It also does not REQUIRE a conversation. A request carries an optional
 * `conversation_id` so the thread and the request can point at each other when
 * both exist, and the request stands on its own when the person asked from the
 * listing page without writing a message first. Requiring a thread would mean
 * an empty conversation is created for every enquiry, which is how an inbox
 * fills with rooms nobody spoke in.
 *
 * ---------------------------------------------------------------------------
 * THE TWO PARTIES ARE BOTH STORED, AND ONE OF THEM IS DERIVABLE
 * ---------------------------------------------------------------------------
 *
 * `lister_id` could be reached at every read by joining listings to agents.
 * It is denormalised here on purpose, for two reasons that are not
 * performance. First, RLS: a policy that has to join two tables to decide
 * whether you may see a row is a policy that is hard to read and easy to get
 * wrong, and this one has to be exactly right in both directions. Second,
 * truth over time: a property can change hands, and the person who was asked
 * for a viewing in March is the person who was asked, not whoever owns the
 * listing today.
 *
 * It is written by a trigger from the listing rather than by the client, so it
 * cannot be forged, and it cannot drift from the listing at the moment of the
 * request.
 */

/* ------------------------------------------------------------------ state */

/*
 * Six states, and the state is what both sides can SEE.
 *
 *   REQUESTED   somebody has asked. The lister has not answered.
 *   CONFIRMED   the lister said yes, and `slot_at` is when.
 *   PROPOSED    the lister offered a different time. The ball is back with
 *               the person who asked, and this is the state that stops a
 *               reschedule reading as a refusal.
 *   DECLINED    the lister said no. `lister_note` says why, when they said.
 *   COMPLETED   it happened. Set by either side after the slot has passed.
 *   WITHDRAWN   the person who asked pulled out.
 *
 * DECLINED, COMPLETED and WITHDRAWN are terminal: a finished inspection is a
 * record, and re-opening one would lose which of them it was. Asking again is
 * a new request, which is correct - it is a new question about a new date.
 */
create type public.inspection_state as enum (
  'REQUESTED',
  'CONFIRMED',
  'PROPOSED',
  'DECLINED',
  'COMPLETED',
  'WITHDRAWN'
);

/* ------------------------------------------------------------------ table */

create table public.inspection_requests (
  id uuid primary key default gen_random_uuid(),

  listing_id uuid not null references public.listings (id) on delete cascade,

  /* Who asked. On delete cascade: an account that leaves takes its own
     enquiries with it, and an inspection request holds no money. */
  requester_id uuid not null references auth.users (id) on delete cascade,

  /* Who was asked. Written by the trigger below from the listing's agent, so
     a client cannot name somebody else as the lister. */
  lister_id uuid not null references auth.users (id) on delete cascade,

  /* The thread this belongs to, when there is one. See the header. */
  conversation_id uuid references public.conversations (id) on delete set null,

  state public.inspection_state not null default 'REQUESTED',

  /*
   * WHEN. Three columns, because they are three different facts.
   *
   * `requested_at` is what the person asked for. `slot_at` is what is actually
   * agreed, written when the lister confirms or when a proposed time is
   * accepted. Keeping the ask means a lister looking at a list of requests can
   * see that somebody wanted Saturday and got Sunday, which is the difference
   * between a record and a rewrite.
   */
  requested_at timestamptz not null,
  slot_at timestamptz,

  /* One line from each side. Neither is required and neither is a chat: the
     thread is where a conversation goes. */
  note text,
  lister_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  /* When the lister first answered, whichever way. Null while REQUESTED. */
  responded_at timestamptz,

  /* A slot only exists once somebody has agreed to one. A CONFIRMED row with
     no time is an appointment nobody can keep. */
  constraint inspection_requests_slot_when_confirmed
    check (state <> 'CONFIRMED' or slot_at is not null),

  /* Nobody inspects their own property. */
  constraint inspection_requests_parties_differ
    check (requester_id <> lister_id)
);

comment on table public.inspection_requests is
  'A request to view a property, with a state both parties can see. Distinct '
  'from inspection_confirmations, which records that a viewing HAPPENED.';

comment on column public.inspection_requests.requested_at is
  'The time the person asked for. Never overwritten by a reschedule.';
comment on column public.inspection_requests.slot_at is
  'The time actually agreed. Set on confirm, or when a proposed time is taken.';

/*
 * Indexes for the two questions this table exists to answer, and they are
 * asked from opposite sides.
 *
 *   "what have I been asked to show"  -> lister, newest first
 *   "what did I ask for"              -> requester, newest first
 *
 * Both carry `state` so the open ones can be found without reading the closed
 * ones, which on a busy agent is most of the table.
 */
create index inspection_requests_lister_idx
  on public.inspection_requests (lister_id, state, created_at desc);

create index inspection_requests_requester_idx
  on public.inspection_requests (requester_id, state, created_at desc);

create index inspection_requests_listing_idx
  on public.inspection_requests (listing_id, created_at desc);

/* The conversation foreign key needs its own covering index, matching the
   convention the rest of this schema follows. */
create index inspection_requests_conversation_idx
  on public.inspection_requests (conversation_id);

create trigger inspection_requests_set_updated_at
  before update on public.inspection_requests
  for each row execute function public.set_updated_at();

/* ---------------------------------------------------------- who was asked */

/*
 * The lister is derived, never supplied.
 *
 * A client sends a listing and a time. This resolves the owner from the
 * listing itself, so `lister_id` is a fact about the property rather than a
 * claim by whoever posted the row. Without it, an insert policy would have to
 * verify the submitted lister against the listing anyway, and a check that can
 * be written as a derivation should be.
 */
create function private.set_inspection_lister()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  select a.user_id into owner_id
  from public.listings l
  join public.agents a on a.id = l.agent_id
  where l.id = new.listing_id;

  if owner_id is null then
    raise exception 'listing % has no owner', new.listing_id
      using errcode = 'foreign_key_violation';
  end if;

  new.lister_id := owner_id;
  return new;
end;
$$;

revoke execute on function private.set_inspection_lister() from public, anon, authenticated;

create trigger inspection_requests_set_lister
  before insert on public.inspection_requests
  for each row execute function private.set_inspection_lister();

/* ------------------------------------------------------- legal transitions */

/*
 * The state machine, enforced in the database rather than described in a
 * comment, and split by WHO is moving it.
 *
 * This is the part that makes the row trustworthy to both sides. A lister may
 * confirm, propose another time or decline. A requester may withdraw, or
 * accept a proposed time, which is the transition that turns PROPOSED into
 * CONFIRMED. Either party may mark a confirmed viewing complete, because
 * either of them might be the one holding the phone afterwards.
 *
 * Anything else raises. In particular a requester cannot confirm their own
 * request, which is the one transition that would let somebody manufacture an
 * appointment the other side never agreed to.
 */
create function private.guard_inspection_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  is_lister boolean;
  is_requester boolean;
begin
  /* The service role and database-internal work carry no JWT. They are
     already trusted; this guard is about the two humans. */
  if caller is null then
    return new;
  end if;

  is_lister := caller = old.lister_id;
  is_requester := caller = old.requester_id;

  if new.state = old.state then
    return new;
  end if;

  if old.state in ('DECLINED', 'COMPLETED', 'WITHDRAWN') then
    raise exception 'inspection % is finished and cannot change', old.id
      using errcode = 'check_violation';
  end if;

  if is_lister and new.state in ('CONFIRMED', 'PROPOSED', 'DECLINED') then
    if new.responded_at is null then
      new.responded_at := now();
    end if;
    return new;
  end if;

  if is_requester and new.state = 'WITHDRAWN' then
    return new;
  end if;

  /* Taking the time the lister offered. Only from PROPOSED, because from
     REQUESTED it would be the requester confirming their own request. */
  if is_requester and new.state = 'CONFIRMED' and old.state = 'PROPOSED' then
    return new;
  end if;

  if (is_lister or is_requester) and new.state = 'COMPLETED'
     and old.state = 'CONFIRMED' then
    return new;
  end if;

  raise exception 'illegal inspection transition % -> %', old.state, new.state
    using errcode = 'check_violation';
end;
$$;

revoke execute on function private.guard_inspection_transition() from public, anon, authenticated;

create trigger inspection_requests_guard_transition
  before update on public.inspection_requests
  for each row execute function private.guard_inspection_transition();

/* --------------------------------------------------------------------- RLS */

alter table public.inspection_requests enable row level security;

/*
 * Both parties see the row. That is the whole feature: a state visible on BOTH
 * sides, rather than an intention living in one person's chat scrollback.
 */
create policy inspection_requests_select_party
  on public.inspection_requests for select
  using (requester_id = (select auth.uid()) or lister_id = (select auth.uid()));

create policy inspection_requests_select_admin
  on public.inspection_requests for select
  using (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));

/*
 * Only the person asking creates one, only against a listing they can see, and
 * never against their own.
 *
 * `status = 'PUBLISHED'` rather than leaning on the listings select policy: a
 * lister can read their own draft, and without this an agent could file a
 * request against a property that is not on the market. The state must be
 * REQUESTED, because an insert that arrives already CONFIRMED would walk
 * straight past the transition guard, which only runs on update.
 */
create policy inspection_requests_insert_requester
  on public.inspection_requests for insert
  with check (
    requester_id = (select auth.uid())
    and state = 'REQUESTED'
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.status = 'PUBLISHED'
    )
    and not private.owns_listing(listing_id)
  );

/*
 * Either party may update, and WHAT they are allowed to change is decided by
 * the transition guard above rather than by this policy.
 *
 * Two rules that live in a policy do belong here: neither party may hand the
 * row to somebody else, and neither may move it to another listing. Those are
 * the only ways to escape the guard while still passing it.
 */
create policy inspection_requests_update_party
  on public.inspection_requests for update
  using (requester_id = (select auth.uid()) or lister_id = (select auth.uid()))
  with check (requester_id = (select auth.uid()) or lister_id = (select auth.uid()));

create policy inspection_requests_admin_all
  on public.inspection_requests for all
  using (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));

/*
 * NOBODY DELETES ONE. There is deliberately no delete policy.
 *
 * A withdrawn request and a deleted one look the same to the person who was
 * asked, and they are not the same: one says somebody changed their mind, the
 * other says nothing at all. WITHDRAWN is the way out, and it leaves a record
 * that the lister can see, which is what stops a pattern of no-shows being
 * invisible.
 */

/* The parties and the property of an inspection do not change. The update
   policy above cannot express this on its own, because it can only see the
   row it is being asked to allow, not the row as it was. */
create function private.freeze_inspection_parties()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.requester_id <> old.requester_id
     or new.lister_id <> old.lister_id
     or new.listing_id <> old.listing_id then
    raise exception 'the parties and the property of an inspection do not change'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke execute on function private.freeze_inspection_parties() from public, anon, authenticated;

create trigger inspection_requests_freeze_parties
  before update on public.inspection_requests
  for each row execute function private.freeze_inspection_parties();
