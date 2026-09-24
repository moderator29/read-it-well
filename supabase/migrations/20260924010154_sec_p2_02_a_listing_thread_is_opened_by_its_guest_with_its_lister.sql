-- SEC-P2-02: a member could open a listing thread with any user id (no
-- listing, or a listing somebody else lists) and write into it, skipping every
-- rule startConversation enforces. The context trigger now holds those rules
-- for a request made with a member's token:
--   * a listing thread names a PUBLISHED listing, its counterpart is that
--     listing's lister, and its guest is the caller (a lister does not open a
--     thread in a guest's name);
--   * at most 20 new listing threads per guest in 24 hours, the same number
--     the app's limiter uses (the app's limiter fails open; this does not).
-- Service-role and database-owner writes (no auth.uid()) are unchanged, as are
-- reservation and booking threads and every existing row (INSERT only).
create or replace function private.conversation_context_is_valid()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
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
       or new.booking_id is distinct from old.booking_id then
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
    -- One guest's concurrent inserts count one after another.
    perform pg_advisory_xact_lock(hashtextextended('conversation_new:' || new.guest_id::text, 0));
    select count(*) into opened_today
    from public.conversations c
    where c.guest_id = new.guest_id
      and c.context_kind = 'listing'
      and c.created_at > now() - interval '24 hours';
    if opened_today >= 20 then
      raise exception 'new conversation limit reached: 20 a day'
        using errcode = 'program_limit_exceeded';
    end if;
  end if;
  return new;
end;
$function$;
