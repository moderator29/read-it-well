-- M10, corrected by its own probe.
--
-- A BEFORE INSERT trigger runs before table constraints. Inserting a
-- reservation thread with no reservation_id therefore reached the party
-- check first, which raised "reservation <NULL> does not exist" as a foreign
-- key violation, when the honest refusal is the shape check's: the row is the
-- wrong shape. Nothing landed either way; the wrong constraint spoke.
--
-- The party check now steps aside when the per-kind id is null and lets
-- conversations_context_shape_chk refuse the row as a check_violation, which
-- is the code every action in lib/messages translates for a person.
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

  if new.context_kind = 'reservation' and new.reservation_id is not null then
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
  end if;

  return new;
end;
$function$;

revoke execute on function private.conversation_context_is_valid() from public, anon, authenticated;
