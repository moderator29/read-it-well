-- DIRECT MESSAGES, STEP 2 (founder, 9 October 2026). A member can message any
-- other member from their profile. One direct chat per pair of people, whoever
-- started it. Read the live bodies of conversation_context_is_valid,
-- notify_message and call_href before writing; each is reproduced whole with
-- only the direct changes made. Applied live 9 October 2026.
set local lock_timeout = '10s';

-- 1. The shape: a direct thread names no listing, reservation, booking or business.
alter table public.conversations drop constraint conversations_context_shape_chk;
alter table public.conversations add constraint conversations_context_shape_chk check (
  (context_kind = 'listing'     and reservation_id is null and booking_id is null and business_id is null)
  or (context_kind = 'reservation' and reservation_id is not null and booking_id is null and listing_id is null and business_id is null)
  or (context_kind = 'booking'     and booking_id is not null and reservation_id is null and listing_id is null and business_id is null)
  or (context_kind = 'business'    and business_id is not null and reservation_id is null and booking_id is null and listing_id is null)
  or (context_kind = 'direct'      and listing_id is null and reservation_id is null and booking_id is null and business_id is null)
);

-- 2. One direct chat per pair, in whichever order the two people are named.
create unique index if not exists conversations_direct_pair_uq
  on public.conversations (least(guest_id, agent_id), greatest(guest_id, agent_id))
  where context_kind = 'direct';

-- 3. Who may open a conversation. Without a branch of its own a direct thread
-- would be unchecked and uncounted, so it gets one, and it counts toward the
-- same twenty-a-day limit as listing and business threads.
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
      and c.context_kind in ('listing', 'business', 'direct')
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
      and c.context_kind in ('listing', 'business', 'direct')
      and c.created_at > now() - interval '24 hours';
    if opened_today >= 20 then
      raise exception 'new conversation limit reached: 20 a day'
        using errcode = 'program_limit_exceeded';
    end if;
  elsif new.context_kind = 'direct' and caller is not null then
    if new.guest_id <> caller or new.guest_id = new.agent_id then
      raise exception 'a direct thread is opened by one member, with another'
        using errcode = 'check_violation';
    end if;
    perform pg_advisory_xact_lock(hashtextextended('conversation_new:' || new.guest_id::text, 0));
    select count(*) into opened_today
    from public.conversations c
    where c.guest_id = new.guest_id
      and c.context_kind in ('listing', 'business', 'direct')
      and c.created_at > now() - interval '24 hours';
    if opened_today >= 20 then
      raise exception 'new conversation limit reached: 20 a day'
        using errcode = 'program_limit_exceeded';
    end if;
  end if;
  return new;
end;
$function$;

-- 4. The notification a message sends. The agent desk is for agents: the other
-- side of a direct chat may be anybody, so it always gets the member inbox link.
create or replace function private.notify_message()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  recipient uuid;
  recipient_is_agent_side boolean;
begin
  if new.call_id is not null then
    update public.conversations
    set last_message_at = new.created_at
    where id = new.conversation_id;
    return new;
  end if;

  select case when c.guest_id = new.sender_id then c.agent_id else c.guest_id end,
         (c.guest_id = new.sender_id and c.context_kind <> 'direct')
  into recipient, recipient_is_agent_side
  from public.conversations c
  where c.id = new.conversation_id;

  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;

  perform private.notify(recipient, 'message', 'New message',
    left(new.body, 120),
    case when coalesce(recipient_is_agent_side, false)
         then '/agent/messages/' || new.conversation_id
         else '/messages/' || new.conversation_id end);

  return new;
end;
$function$;

-- 5. Where a call opens for the person being rung: a direct chat is always the
-- member inbox, never the agent desk.
create or replace function private.call_href(p_call uuid, p_user uuid, p_with_call boolean)
returns text
language sql
stable security definer
set search_path to ''
as $function$
  select case
    when c.purpose = 'ADMIN_REVIEW' then
      '/calls/reviews/' || c.review_id::text || case when p_with_call then '?call=' || c.id::text else '' end
    when cv.id is null then '/messages'
    else case when cv.agent_id = p_user and cv.context_kind <> 'direct' then '/agent/messages/' else '/messages/' end
         || cv.id::text || case when p_with_call then '?call=' || c.id::text else '' end
  end
  from public.calls c
  left join public.conversations cv on cv.id = c.conversation_id
  where c.id = p_call;
$function$;

-- 6. The door the profile's Message button uses: find the direct chat between
-- me and this member, or make it. The other person must have a public profile,
-- and neither may have blocked the other.
create or replace function public.start_direct_conversation(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  me uuid := (select auth.uid());
  cid uuid;
begin
  if me is null then
    raise exception 'direct:signed_out' using errcode = '42501';
  end if;
  if p_other is null or p_other = me then
    raise exception 'direct:invalid' using errcode = '22023';
  end if;
  if not exists (select 1 from public.social_profiles sp where sp.user_id = p_other) then
    raise exception 'direct:not_found' using errcode = 'P0002';
  end if;
  if private.blocked_between(me, p_other) then
    raise exception 'direct:blocked' using errcode = '42501';
  end if;

  select c.id into cid
    from public.conversations c
   where c.context_kind = 'direct'
     and least(c.guest_id, c.agent_id) = least(me, p_other)
     and greatest(c.guest_id, c.agent_id) = greatest(me, p_other);
  if cid is not null then
    return cid;
  end if;

  begin
    insert into public.conversations (guest_id, agent_id, context_kind)
    values (me, p_other, 'direct')
    returning id into cid;
  exception when unique_violation then
    select c.id into cid
      from public.conversations c
     where c.context_kind = 'direct'
       and least(c.guest_id, c.agent_id) = least(me, p_other)
       and greatest(c.guest_id, c.agent_id) = greatest(me, p_other);
  end;
  return cid;
end;
$function$;
revoke all on function public.start_direct_conversation(uuid) from public, anon;
grant execute on function public.start_direct_conversation(uuid) to authenticated;
