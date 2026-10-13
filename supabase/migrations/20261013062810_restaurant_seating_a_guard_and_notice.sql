-- Applied 13 October 2026, part of the restaurant seating migration (founder decision D).
-- Review notes: dependencies and grants were checked against the live database before applying.
set lock_timeout = '5s';

create or replace function private.guard_reservation_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  is_host boolean;
begin
  if coalesce(current_setting('role', true), 'none') not in ('authenticated', 'anon') then
    return new;
  end if;
  /* The seating functions below are security definer: inside them the
     write runs as the function's owner, which already decided who may act. */
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if private.has_role(me, 'admin'::public.app_role) or private.has_role(me, 'super_admin'::public.app_role) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status is distinct from 'PENDING'::public.booking_status then
      raise exception 'reservation_starts_pending: a new reservation waits for the venue'
        using errcode = '42501';
    end if;
    new.responded_at := null;
    new.created_at := now();
    new.conversation_id := null;
    return new;
  end if;

  if new.guest_id is distinct from old.guest_id
     or new.business_id is distinct from old.business_id
     or new.listing_id is distinct from old.listing_id
     or new.party_size is distinct from old.party_size
     or new.reserved_for is distinct from old.reserved_for
     or new.created_at is distinct from old.created_at then
    raise exception 'reservation_fixed: who, where, when and how many do not change; make a new reservation'
      using errcode = '42501';
  end if;
  if new.conversation_id is distinct from old.conversation_id then
    if old.conversation_id is not null
       or not exists (select 1 from public.conversations c
                       where c.id = new.conversation_id and c.reservation_id = old.id) then
      raise exception 'reservation_conversation: a reservation carries its own thread, attached once'
        using errcode = '42501';
    end if;
  end if;

  is_host := old.guest_id is distinct from me
             and ((old.business_id is not null and private.owns_business(old.business_id))
                  or (old.listing_id is not null and exists (
                        select 1 from public.listings l
                         where l.id = old.listing_id and private.listing_agent_is_me(l.agent_id))));

  if is_host then
    if new.note is distinct from old.note then
      raise exception 'reservation_note_is_the_guests: the venue answers in the thread'
        using errcode = '42501';
    end if;
    if new.status is distinct from old.status
       and not ((old.status = 'PENDING' and new.status in ('CONFIRMED', 'CANCELLED'))
                or (old.status = 'CONFIRMED' and new.status = 'CANCELLED')
                or (old.status = 'CONFIRMED' and new.status in ('COMPLETED', 'NO_SHOW')
                    and old.reserved_for <= now())) then
      raise exception 'reservation_transition: the venue cannot move this reservation from % to % now', old.status, new.status
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status
     and not ((old.status = 'PENDING' and new.status = 'CANCELLED')
              or (old.status = 'CONFIRMED' and new.status = 'CANCELLED' and old.reserved_for > now())) then
    raise exception 'reservation_is_the_venues_to_answer: a guest can cancel a request, or a confirmed table that is still ahead'
      using errcode = '42501';
  end if;
  if new.responded_at is distinct from old.responded_at
     and not (new.status = 'CANCELLED' and old.status is distinct from 'CANCELLED') then
    raise exception 'reservation_answer_is_the_venues: only the venue answers a request'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
