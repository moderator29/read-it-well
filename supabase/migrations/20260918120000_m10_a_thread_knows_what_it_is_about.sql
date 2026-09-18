-- M10. A thread knows what it is about.
--
-- public.conversations was a two-party thread bound, optionally, to a listing.
-- The two-side platform needs three kinds of thread: the rental thread that
-- exists today, a thread attached to one restaurant reservation ("we are
-- running twenty minutes late"), and a thread attached to one hotel booking.
-- docs/research/TWO_MODE_BACKEND_RESEARCH.md section 3.2 is the argument for
-- doing it as typed context on the one table with per-kind foreign keys, and
-- this file is that section, unchanged.
--
-- ADDITIVE. Every existing row becomes a listing thread by default; every
-- existing writer keeps working because the new columns default. Nothing on
-- public.messages moves, and messages.sender_id stays NOT NULL: system and step
-- events live in booking_state_events and are interleaved at read time
-- (section 3.4), never written as messages.
--
-- The enum belongs to M1 (BE1). It is created here only if M1 has not landed
-- yet, so the two migrations replay in either order.
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'thread_context'
  ) then
    create type public.thread_context as enum ('listing', 'reservation', 'booking');
  end if;
end $$;

-- ON DELETE CASCADE rather than SET NULL, deliberately: a reservation thread
-- with no reservation would violate the shape check below, and neither
-- reservations nor bookings carry a client delete policy, so the only thing
-- that can delete one is a person leaving the platform, at which point their
-- threads go with them anyway (conversations cascade from auth.users).
alter table public.conversations
  add column if not exists context_kind public.thread_context not null default 'listing',
  add column if not exists reservation_id uuid references public.reservations(id) on delete cascade,
  add column if not exists booking_id uuid references public.bookings(id) on delete cascade;

comment on column public.conversations.context_kind is
  'What the thread is about. listing (the default, and every row before M10), reservation, or booking. The per-kind foreign key must be set for that kind and null for the others.';
comment on column public.conversations.reservation_id is
  'The one reservation this thread is attached to, when context_kind is reservation. One thread per reservation.';
comment on column public.conversations.booking_id is
  'The one booking this thread is attached to, when context_kind is booking. One thread per booking.';

-- The honest shape. A reservation or booking thread carries NO listing_id: the
-- listing is reachable through the transaction object, and keeping the column
-- null means the (guest_id, agent_id, listing_id) unique triple keeps governing
-- listing threads alone, exactly as it does today, instead of colliding with
-- the rental thread the same two people may already have about the same place.
alter table public.conversations drop constraint if exists conversations_context_shape_chk;
alter table public.conversations
  add constraint conversations_context_shape_chk check (
    (context_kind = 'listing' and reservation_id is null and booking_id is null)
    or (context_kind = 'reservation' and reservation_id is not null and booking_id is null and listing_id is null)
    or (context_kind = 'booking' and booking_id is not null and reservation_id is null and listing_id is null)
  );

-- One thread per transaction object. Partial, so listing threads pay nothing.
create unique index if not exists conversations_reservation_uq
  on public.conversations (reservation_id)
  where reservation_id is not null;

create unique index if not exists conversations_booking_uq
  on public.conversations (booking_id)
  where booking_id is not null;

-- The reservation or booking must belong to the two parties on the row. The
-- rule lives in the database (the reservation_is_valid posture) so no server
-- action can attach a stranger's booking to a thread, whatever it was told.
--
-- SECURITY DEFINER because the guest inserting the row cannot read
-- public.agents under RLS, and the host's user id is exactly what has to be
-- checked. The function is revoked from every API role: a trigger function is
-- not an API endpoint.
--
-- Host resolution walks listings to agents, which is every reservation and
-- booking that exists today. When M7 adds reservations.business_id, this
-- function gains the businesses.owner_id branch.
create or replace function private.conversation_context_is_valid()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  guest uuid;
  host  uuid;
begin
  if tg_op = 'UPDATE' then
    if new.context_kind <> old.context_kind
       or new.reservation_id is distinct from old.reservation_id
       or new.booking_id is distinct from old.booking_id then
      raise exception 'the context of a thread does not change'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if new.context_kind = 'reservation' then
    select r.guest_id, a.user_id
      into guest, host
    from public.reservations r
    join public.listings l on l.id = r.listing_id
    join public.agents   a on a.id = l.agent_id
    where r.id = new.reservation_id;
    if guest is null then
      raise exception 'reservation % does not exist', new.reservation_id
        using errcode = 'foreign_key_violation';
    end if;
    if new.guest_id <> guest or new.agent_id <> host then
      raise exception 'a reservation thread belongs to the guest and the host of that reservation'
        using errcode = 'check_violation';
    end if;
  elsif new.context_kind = 'booking' then
    select b.guest_id, a.user_id
      into guest, host
    from public.bookings b
    join public.listings l on l.id = b.listing_id
    join public.agents   a on a.id = l.agent_id
    where b.id = new.booking_id;
    if guest is null then
      raise exception 'booking % does not exist', new.booking_id
        using errcode = 'foreign_key_violation';
    end if;
    if new.guest_id <> guest or new.agent_id <> host then
      raise exception 'a booking thread belongs to the guest and the host of that booking'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$function$;

revoke execute on function private.conversation_context_is_valid() from public, anon, authenticated;

drop trigger if exists conversations_context_is_valid on public.conversations;
create trigger conversations_context_is_valid
  before insert or update on public.conversations
  for each row execute function private.conversation_context_is_valid();
