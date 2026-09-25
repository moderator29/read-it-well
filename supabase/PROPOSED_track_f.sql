-- PROPOSED, NOT APPLIED. Track F: a guest can message a hotel or a restaurant.
--
-- Written by the visual-tracks session for the lead to review and apply as a
-- migration. Nothing here has run against any database.
--
-- WHY A SCHEMA CHANGE IS NEEDED
--
-- A conversation must be about something: `context_kind` is listing,
-- reservation or booking, and `conversations_context_shape_chk` plus
-- `private.conversation_context_is_valid()` enforce it. A business-grade venue
-- (M7: every hotel under /stay/[id], and every restaurant with
-- `venue.isBusiness`) has no `listings` row, so no listing thread can exist
-- for it, and a guest who has not booked has no booking or reservation either.
-- The stay page used to link `/messages/new?listing=<accommodation id>`, which
-- can only fail: that id is not a listing.
--
-- WHAT THIS ADDS
--
-- A fourth context, `business`: one thread per (guest, business), with the
-- business OWNER as the host (`agent_id`, which is the host user id for every
-- context already). It follows the listing branch's rules exactly: opened by
-- the guest, never with themselves, only with a PUBLISHED, non-example
-- business, and it counts against the same 20-a-day new-thread limit.
--
-- The app side is already written against this shape
-- (`apps/web/src/lib/venue-messages/actions.ts`) and degrades to an honest
-- sentence while the column does not exist.
--
-- APPLY AS TWO MIGRATIONS. `alter type ... add value` cannot be used by later
-- statements in the same transaction.

-- ============================================================ migration 1 of 2
alter type public.thread_context add value if not exists 'business';

-- ============================================================ migration 2 of 2
alter table public.conversations
  add column if not exists business_id uuid references public.businesses(id) on delete restrict;

comment on column public.conversations.business_id is
  'The hotel or restaurant this thread is about, when context_kind is business. One thread per guest per business.';

alter table public.conversations drop constraint if exists conversations_context_shape_chk;
alter table public.conversations
  add constraint conversations_context_shape_chk check (
    (context_kind = 'listing' and reservation_id is null and booking_id is null and business_id is null)
    or (context_kind = 'reservation' and reservation_id is not null and booking_id is null and listing_id is null and business_id is null)
    or (context_kind = 'booking' and booking_id is not null and reservation_id is null and listing_id is null and business_id is null)
    or (context_kind = 'business' and business_id is not null and reservation_id is null and booking_id is null and listing_id is null)
  );

create unique index if not exists conversations_business_uq
  on public.conversations (guest_id, business_id)
  where business_id is not null;

-- The live function as read on 25 September 2026, with the business branch
-- added and `business_id` joining the immutable-context list. Nothing else
-- changed.
create or replace function private.conversation_context_is_valid()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  guest uuid;
  host  uuid;
  caller uuid := auth.uid();
  opened_today int;
begin
  if tg_op = 'UPDATE' then
    if new.context_kind <> old.context_kind
       or new.reservation_id is distinct from old.reservation_id
       or new.booking_id is distinct from old.booking_id
       or new.business_id is distinct from old.business_id then
      raise exception 'the context of a thread does not change'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;
  if new.context_kind = 'reservation' and new.reservation_id is not null then
    select r.guest_id, coalesce(a.user_id, b.owner_id)
      into guest, host
    from public.reservations r
    left join public.listings   l on l.id = r.listing_id
    left join public.agents     a on a.id = l.agent_id
    left join public.businesses b on b.id = r.business_id
    where r.id = new.reservation_id;
    if guest is null then
      raise exception 'reservation % does not exist', new.reservation_id
        using errcode = 'foreign_key_violation';
    end if;
    if host is null or new.guest_id <> guest or new.agent_id <> host then
      raise exception 'a reservation thread belongs to the guest and the host of that reservation'
        using errcode = 'check_violation';
    end if;
  elsif new.context_kind = 'booking' and new.booking_id is not null then
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
  elsif new.context_kind = 'business' then
    if caller is null or new.business_id is null or new.guest_id <> caller or new.guest_id = new.agent_id then
      raise exception 'a business thread is opened by its guest, about one business'
        using errcode = 'check_violation';
    end if;
    select b.owner_id into host
    from public.businesses b
    where b.id = new.business_id and b.status = 'PUBLISHED' and b.is_demo is not true;
    if host is null or new.agent_id <> host then
      raise exception 'a business thread is with the owner of that published business'
        using errcode = 'check_violation';
    end if;
    perform pg_advisory_xact_lock(hashtextextended('conversation_new:' || new.guest_id::text, 0));
    select count(*) into opened_today
    from public.conversations c
    where c.guest_id = new.guest_id
      and c.context_kind in ('listing', 'business')
      and c.created_at > now() - interval '24 hours';
    if opened_today >= 20 then
      raise exception 'new conversation limit reached: 20 a day'
        using errcode = 'program_limit_exceeded';
    end if;
  elsif new.context_kind = 'listing' and caller is not null then
    if new.listing_id is null or new.guest_id <> caller or new.guest_id = new.agent_id then
      raise exception 'a listing thread is opened by its guest, about one listing'
        using errcode = 'check_violation';
    end if;
    select a.user_id into host
    from public.listings l
    join public.agents a on a.id = l.agent_id
    where l.id = new.listing_id and l.status = 'PUBLISHED';
    if host is null or new.agent_id <> host then
      raise exception 'a listing thread is with the lister of that published listing'
        using errcode = 'check_violation';
    end if;
    perform pg_advisory_xact_lock(hashtextextended('conversation_new:' || new.guest_id::text, 0));
    select count(*) into opened_today
    from public.conversations c
    where c.guest_id = new.guest_id
      and c.context_kind in ('listing', 'business')
      and c.created_at > now() - interval '24 hours';
    if opened_today >= 20 then
      raise exception 'new conversation limit reached: 20 a day'
        using errcode = 'program_limit_exceeded';
    end if;
  end if;
  return new;
end;
$function$;

revoke execute on function private.conversation_context_is_valid() from public, anon, authenticated;

-- RLS: the existing insert policy (caller is guest or host) and the block
-- policy already cover the new kind; select is unchanged. No new grant.
--
-- FOLLOW-UPS FOR THE MESSAGES TRACK (lead-owned paths):
--  * lib/messages list and thread reads should name the business (join
--    businesses on business_id) where they name the listing today.
--  * the host inbox of a business owner should include context_kind='business'.
--  * regenerate database.types.ts after applying.
