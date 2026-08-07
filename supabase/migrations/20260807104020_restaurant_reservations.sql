-- A table booked at a restaurant this platform actually admitted.
--
-- Deliberately NOT public.bookings. A stay is a date range against a property
-- with per-night availability, a cleaning fee and a settlement split; a table is
-- a party size at a moment. Forcing the second into the first would mean
-- check_in and check_out holding the same day, availability rows for a thing
-- with no nights, and a money path for something that usually costs nothing to
-- reserve. Two tables that each mean one thing beat one that means either.
--
-- Only first-party restaurants can be reserved. Partner venues from Google
-- Places or a hotel feed carry no agent, no verification and no way for us to
-- promise anybody a table, so a reservation against one is refused by trigger
-- rather than by the application remembering to check.
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  guest_id uuid not null references auth.users(id) on delete cascade,

  -- The party, and the moment. Fifty is not a guess about restaurants: it is
  -- the line past which this stops being a reservation and becomes an event
  -- the venue needs to talk to somebody about, which is what the message
  -- button next to this is for.
  party_size integer not null check (party_size > 0 and party_size <= 50),
  reserved_for timestamptz not null,

  -- The same three words a stay uses, on purpose. A host accepting a table and
  -- a host accepting a stay are the same act, and the admin console, the
  -- notification triggers and the agent workspace already read this vocabulary.
  status public.booking_status not null default 'PENDING',

  -- Allergies, a birthday, a wheelchair. Bounded because it is free text a
  -- stranger writes into a host's inbox.
  note text check (note is null or char_length(note) <= 500),

  -- What the venue decided, and when. Null until somebody acts.
  responded_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.reservations is
  'A table booked at a first-party restaurant. A party size at a moment, not a date range: stays live in public.bookings. Partner venues can never be reserved, which is enforced by trigger rather than by the application.';

create index if not exists reservations_listing_time_idx
  on public.reservations (listing_id, reserved_for);
create index if not exists reservations_guest_idx
  on public.reservations (guest_id, reserved_for desc);

-- One party cannot hold two tables at the same restaurant at the same moment.
-- Partial, because a cancelled reservation must not block the guest from
-- booking that slot again, which is exactly what somebody does after cancelling
-- by mistake.
create unique index if not exists reservations_no_double_booking_idx
  on public.reservations (listing_id, guest_id, reserved_for)
  where status <> 'CANCELLED';

/*
 * Two things the application must never be trusted to remember.
 *
 * The listing has to be a restaurant we admitted, and the moment has to be in
 * the future. Both are refused here rather than in a server action, because a
 * server action is one caller among several: the assistant has a tool layer,
 * the admin console writes directly, and a future mobile client will not share
 * this codebase at all. A rule enforced in one caller is a rule that holds
 * until the second caller exists.
 */
create or replace function private.reservation_is_valid()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  kind public.property_type;
  state public.listing_status;
begin
  select property_type, status into kind, state
  from public.listings where id = new.listing_id;

  if kind is null then
    raise exception 'reservation refers to a listing that does not exist';
  end if;

  if kind <> 'restaurant' then
    raise exception 'only a restaurant takes reservations, not a %', kind;
  end if;

  if state <> 'PUBLISHED' then
    raise exception 'that restaurant is not published';
  end if;

  -- Checked only when the moment itself is being set, so that confirming or
  -- cancelling a reservation whose time has since passed still works. A venue
  -- must be able to close off yesterday's list.
  if (tg_op = 'INSERT' or new.reserved_for is distinct from old.reserved_for)
     and new.reserved_for <= now() then
    raise exception 'a table cannot be reserved in the past';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists reservations_validate on public.reservations;
create trigger reservations_validate
  before insert or update on public.reservations
  for each row execute function private.reservation_is_valid();

alter table public.reservations enable row level security;

-- The guest sees their own, always.
drop policy if exists reservations_select_own on public.reservations;
create policy reservations_select_own on public.reservations
  for select to authenticated
  using (guest_id = auth.uid());

-- The agent whose restaurant it is sees the list, which is the whole point of
-- taking reservations.
drop policy if exists reservations_select_host on public.reservations;
create policy reservations_select_host on public.reservations
  for select to authenticated
  using (exists (
    select 1 from public.listings l
    join public.agents a on a.id = l.agent_id
    where l.id = reservations.listing_id and a.user_id = auth.uid()
  ));

-- A guest books for themselves and for nobody else. guest_id is pinned to the
-- caller here, so a forged column cannot put a stranger's name on a table.
drop policy if exists reservations_insert_own on public.reservations;
create policy reservations_insert_own on public.reservations
  for insert to authenticated
  with check (guest_id = auth.uid());

-- A guest may change their own reservation. The trigger still refuses a moment
-- in the past, so this is cancel, or move it later.
drop policy if exists reservations_update_own on public.reservations;
create policy reservations_update_own on public.reservations
  for update to authenticated
  using (guest_id = auth.uid())
  with check (guest_id = auth.uid());

-- The venue accepts or declines. Scoped the same way the read is, so a host can
-- only ever touch a reservation at their own restaurant.
drop policy if exists reservations_update_host on public.reservations;
create policy reservations_update_host on public.reservations
  for update to authenticated
  using (exists (
    select 1 from public.listings l
    join public.agents a on a.id = l.agent_id
    where l.id = reservations.listing_id and a.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.listings l
    join public.agents a on a.id = l.agent_id
    where l.id = reservations.listing_id and a.user_id = auth.uid()
  ));

-- Nobody deletes a reservation. Cancelling is a status, so the record of what
-- was promised and what happened to it survives, which is the same rule the
-- booking state machine follows.
