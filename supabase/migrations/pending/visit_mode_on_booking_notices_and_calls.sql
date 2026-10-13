-- PENDING DRAFT, 13 October 2026 (track/visit-flow). NOT APPLIED. The lead applies it.
--
-- Schedule a visit writes `inspection_requests.visit_mode` (live since
-- 20261013082713). Four small changes make the mode hold everywhere a visit
-- is touched. Every body below is the LIVE definition read on 13 October 2026
-- with only the lines marked "visit_mode" added; owners, grants and the
-- comment on book_viewing_slot are kept.
--
--   1. book_viewing_slot gains `p_mode` (default 'in_person'), so a video
--      booking writes its mode in the same insert and the lister's "Viewing
--      booked" notice can say so. The three-argument version has to be
--      dropped first: two overloads that both accept three named arguments
--      make every existing call ambiguous. NOTE FOR THE CONNECTOR: this file
--      contains DROP FUNCTION, which freezes the Supabase connector for 60
--      seconds (HANDOFF section 5). Apply it from the SQL editor, or accept
--      the pause. The app works against both versions: it books in person
--      with three arguments, and a video booking falls back to booking then
--      writing the mode when `p_mode` is unknown (PGRST202).
--
--   2. private.notify_inspection_change words the two INSERT notices for a
--      video visit ("Video visit requested", "Video visit booked"). Every
--      other branch is unchanged. The links stay where they were.
--
--   3. private.inspection_columns_belong: the visit mode is the requester's
--      to set, like the request note. Today either party could rewrite it.
--
--   4. public.call_start: a confirmed VIDEO visit opens its own call window.
--      The "no cold calls" rule refuses a call until the callee has written
--      in the thread, so a renter who booked an open video slot could not
--      join it if the lister had never typed a message. Inside the visit's
--      window (10 minutes before the slot until it ends, the same window the
--      screen draws) either party may call the other in that visit's
--      conversation. Everything else in call_start is unchanged.

set lock_timeout = '5s';

-- --------------------------------------------------------------------- 1
drop function if exists public.book_viewing_slot(uuid, timestamptz, text);

create function public.book_viewing_slot(
  p_listing uuid,
  p_slot timestamptz,
  p_note text default null,
  p_mode text default 'in_person'
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  caller uuid := (select auth.uid());
  owner_id uuid;
  chosen record;
  booked uuid;
begin
  if caller is null then
    raise exception 'sign in to book' using errcode = '42501';
  end if;
  if p_note is not null and length(p_note) > 400 then
    raise exception 'keep the note under 400 characters' using errcode = '22023';
  end if;
  -- visit_mode: one of the column's two values, and video only while calls are on.
  if p_mode is null or p_mode not in ('in_person', 'video') then
    raise exception 'unknown visit mode' using errcode = '22023', hint = 'viewing_mode_unknown';
  end if;
  if p_mode = 'video' and not private.call_flag_on('video_calls') then
    raise exception 'video visits are not available' using errcode = 'P0001', hint = 'viewing_video_off';
  end if;

  select a.user_id into owner_id
    from public.listings l join public.agents a on a.id = l.agent_id
   where l.id = p_listing;
  if owner_id is null then
    raise exception 'that slot is not free' using errcode = 'P0001', hint = 'viewing_slot_taken';
  end if;
  if owner_id = caller then
    raise exception 'this is your own home' using errcode = 'P0001', hint = 'viewing_own_home';
  end if;

  perform pg_advisory_xact_lock(hashtext('viewing_slot:' || owner_id::text));

  if exists (
    select 1 from public.inspection_requests ir
     where ir.listing_id = p_listing and ir.requester_id = caller
       and ir.state in ('REQUESTED', 'PROPOSED', 'CONFIRMED')
  ) then
    raise exception 'you already have a viewing for this home' using errcode = 'P0001', hint = 'viewing_already_booked';
  end if;

  select s.slot_at, s.window_id into chosen
    from private.free_viewing_slots(p_listing, 30, caller) s
   where s.slot_at = p_slot;
  if not found then
    raise exception 'that slot is not free' using errcode = 'P0001', hint = 'viewing_slot_taken';
  end if;

  insert into public.inspection_requests (listing_id, requester_id, lister_id, state, requested_at, slot_at, responded_at, window_id, note, visit_mode)
  values (p_listing, caller, owner_id, 'CONFIRMED', chosen.slot_at, chosen.slot_at, now(), chosen.window_id, nullif(btrim(p_note), ''), p_mode)
  returning id into booked;
  return booked;
end;
$fn$;

alter function public.book_viewing_slot(uuid, timestamptz, text, text) owner to postgres;
revoke all on function public.book_viewing_slot(uuid, timestamptz, text, text) from public, anon;
grant execute on function public.book_viewing_slot(uuid, timestamptz, text, text) to authenticated, service_role;

comment on function public.book_viewing_slot(uuid, timestamptz, text, text) is
  'V-94. Books a free slot as a CONFIRMED inspection for the caller, under a per-lister advisory lock taken before the free-slot check. Refuses the lister''s own home (viewing_own_home), a slot that is not free (viewing_slot_taken) and a second open viewing of the same home (viewing_already_booked). p_mode is inspection_requests.visit_mode (in_person or video; video only while video_calls is on).';

-- --------------------------------------------------------------------- 2
create or replace function private.notify_inspection_change()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  property  text;
  asker     text;
  asked_at  text;
  slot_at   text;
  actor     uuid := auth.uid();
  video     boolean := new.visit_mode = 'video';  -- visit_mode
begin
  select l.title into property from public.listings l where l.id = new.listing_id;
  property := coalesce(property, 'the property');

  asked_at := to_char(new.requested_at at time zone 'Africa/Lagos', 'FMDay DD FMMon, HH24:MI') || ' Lagos time';
  slot_at  := to_char(coalesce(new.slot_at, new.requested_at) at time zone 'Africa/Lagos', 'FMDay DD FMMon, HH24:MI') || ' Lagos time';
  asker := coalesce(
    (select p.display_name from public.profiles p where p.id = new.requester_id),
    'Somebody'
  );

  if tg_op = 'INSERT' then
    if new.state = 'CONFIRMED' then
      perform private.notify(
        new.requester_id,
        'listing',
        case when video then 'Video visit booked' else 'Viewing booked' end,
        property || ' on ' || slot_at || '. The lister is expecting you.' ||
          case when video then ' Join the video call from your visit.' else '' end,
        '/inspections'
      );
      perform private.notify(
        new.lister_id,
        'listing',
        case when video then 'Video visit booked' else 'Viewing booked' end,
        asker || ' booked ' || slot_at || ' to see ' || property || '.' ||
          case when video then ' It is a video visit: call them in the conversation at that time.' else '' end,
        '/agent/inspections'
      );
      return new;
    end if;
    perform private.notify(
      new.lister_id,
      'listing',
      case when video then 'Video visit requested' else 'Inspection requested' end,
      asker || case when video then ' wants a video visit of ' else ' wants to see ' end ||
        property || ' on ' || asked_at || '. Confirm, offer another time, or decline.',
      '/agent/inspections'
    );
    return new;
  end if;

  if new.state is distinct from old.state then
    if new.state = 'CONFIRMED' then
      if actor is distinct from new.requester_id then
        perform private.notify(
          new.requester_id,
          'listing',
          'Inspection confirmed',
          property || ' on ' || slot_at || '. The lister is expecting you.',
          '/inspections'
        );
      end if;
      if old.state = 'PROPOSED' and actor is distinct from new.lister_id then
        perform private.notify(
          new.lister_id,
          'listing',
          'Inspection time accepted',
          asker || ' will see ' || property || ' on ' || slot_at || '.',
          '/agent/inspections'
        );
      end if;
    elsif new.state = 'PROPOSED' then
      perform private.notify(
        new.requester_id,
        'listing',
        case when old.state = 'CONFIRMED' then 'Viewing moved' else 'Another time offered' end,
        'The lister of ' || property || ' can do ' || slot_at || ' instead. Accept it, or reply in the thread.',
        '/inspections'
      );
    elsif new.state = 'DECLINED' then
      if old.state = 'CONFIRMED' then
        perform private.notify(
          new.requester_id,
          'listing',
          'Viewing cancelled',
          'The lister cancelled the viewing of ' || property || ' on ' ||
            to_char(old.slot_at at time zone 'Africa/Lagos', 'FMDay DD FMMon, HH24:MI') || ' Lagos time.' ||
            case when new.lister_note is not null and length(btrim(new.lister_note)) > 0
                 then ' ' || left(btrim(new.lister_note), 120) else '' end,
          '/inspections'
        );
      else
        perform private.notify(
          new.requester_id,
          'listing',
          'Inspection declined',
          property || ' is not available to view on ' || asked_at || '.' ||
            case when new.lister_note is not null and length(btrim(new.lister_note)) > 0
                 then ' ' || left(btrim(new.lister_note), 120) else '' end,
          '/inspections'
        );
      end if;
    elsif new.state = 'WITHDRAWN' then
      perform private.notify(
        new.lister_id,
        'listing',
        case when old.state = 'CONFIRMED' then 'Viewing cancelled' else 'Inspection withdrawn' end,
        asker || ' no longer needs to see ' || property || ' on ' || slot_at || '.',
        '/agent/inspections'
      );
    elsif new.state = 'COMPLETED' then
      perform private.notify(
        new.requester_id,
        'listing',
        'Inspection complete',
        'Your visit to ' || property || ' is recorded as done.',
        '/inspections'
      );
      perform private.notify(
        new.lister_id,
        'listing',
        'Inspection complete',
        'The visit to ' || property || ' by ' || asker || ' is recorded as done.',
        '/agent/inspections'
      );
    end if;
  end if;

  return new;
end;
$fn$;

-- --------------------------------------------------------------------- 3
create or replace function private.inspection_columns_belong()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null
     or private.has_role(caller, 'admin'::public.app_role)
     or private.has_role(caller, 'super_admin'::public.app_role) then
    return new;
  end if;

  if new.conversation_id is not null
     and (tg_op = 'INSERT' or new.conversation_id is distinct from old.conversation_id)
     and not exists (
       select 1
         from public.conversations c
        where c.id = new.conversation_id
          and c.guest_id = new.requester_id
          and c.agent_id = new.lister_id
          and c.listing_id = new.listing_id
     ) then
    raise exception 'an inspection belongs only in the conversation between its two parties about its listing'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'INSERT' then
    if new.state = 'REQUESTED'::public.inspection_state
       and (new.slot_at is not null or new.lister_note is not null) then
      raise exception 'a new inspection request carries no agreed time and no lister note'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if new.requested_at is distinct from old.requested_at then
    raise exception 'the time an inspection was asked for does not change'
      using errcode = 'check_violation';
  end if;

  if new.slot_at is distinct from old.slot_at
     and not (
       caller = old.lister_id
       and new.state is distinct from old.state
       and new.state in ('CONFIRMED'::public.inspection_state, 'PROPOSED'::public.inspection_state)
     ) then
    raise exception 'the agreed time of an inspection changes only with the lister''s answer'
      using errcode = 'check_violation';
  end if;

  if new.note is distinct from old.note and caller <> old.requester_id then
    raise exception 'the request note is the requester''s to write'
      using errcode = 'check_violation';
  end if;
  if new.lister_note is distinct from old.lister_note and caller <> old.lister_id then
    raise exception 'the lister note is the lister''s to write'
      using errcode = 'check_violation';
  end if;
  -- visit_mode: how the renter visits is the renter's to say.
  if new.visit_mode is distinct from old.visit_mode and caller <> old.requester_id then
    raise exception 'the visit mode is the requester''s to choose'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$fn$;

-- --------------------------------------------------------------------- 4
create or replace function public.call_start(p_conversation uuid, p_kind text, p_client_key uuid default null::uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  me uuid := (select auth.uid());
  conv record;
  callee uuid;
  c public.calls;
  existing uuid;
begin
  if me is null then
    raise exception 'call:signed_out' using errcode = '42501';
  end if;
  if not private.call_flag_on('video_calls') then
    raise exception 'call:disabled' using errcode = 'P0001';
  end if;
  if p_kind is null or p_kind not in ('AUDIO', 'VIDEO') then
    raise exception 'call:invalid_kind' using errcode = '22023';
  end if;

  -- A replayed tap answers with the call it already started.
  if p_client_key is not null then
    select id into existing from public.calls where initiator_id = me and client_key = p_client_key;
    if existing is not null then
      return private.call_snapshot(existing, me) || jsonb_build_object('replayed', true);
    end if;
  end if;

  select cv.id, cv.guest_id, cv.agent_id, cv.listing_id, cv.business_id into conv
    from public.conversations cv where cv.id = p_conversation;
  if conv.id is null or me not in (conv.guest_id, conv.agent_id) then
    raise exception 'call:not_found' using errcode = 'P0002';
  end if;
  callee := case when conv.guest_id = me then conv.agent_id else conv.guest_id end;
  if callee is null or callee = me then
    raise exception 'call:invalid_conversation' using errcode = '22023';
  end if;
  if private.blocked_between(me, callee) then
    raise exception 'call:blocked' using errcode = '42501';
  end if;
  if private.call_account_barred(me) then
    raise exception 'call:restricted' using errcode = '42501';
  end if;
  if private.call_account_barred(callee) then
    raise exception 'call:unavailable' using errcode = 'P0001';
  end if;

  perform private.call_lock_people(me, callee);

  -- Glare: they are ringing me in this thread right now. Hand that call back,
  -- so the screen offers to answer it instead of starting a second one.
  select c2.id into existing
    from public.calls c2
   where c2.conversation_id = conv.id and c2.initiator_id = callee
     and c2.state = 'RINGING' and c2.ring_expires_at > now()
   order by c2.created_at desc limit 1;
  if existing is not null then
    return private.call_snapshot(existing, me) || jsonb_build_object('glare', true);
  end if;

  -- No cold calls: the person being called has written in this thread,
  -- or (visit_mode) a confirmed video visit in this thread is inside its window:
  -- ten minutes before the slot until the slot ends.
  if not exists (select 1 from public.messages m
                  where m.conversation_id = conv.id and m.sender_id = callee and m.call_id is null)
     and not exists (
       select 1
         from public.inspection_requests ir
         left join public.viewing_windows vw on vw.id = ir.window_id
        where ir.conversation_id = conv.id
          and ir.state = 'CONFIRMED'
          and ir.visit_mode = 'video'
          and ir.slot_at is not null
          and now() >= ir.slot_at - interval '10 minutes'
          and now() <= ir.slot_at + make_interval(mins => coalesce(vw.slot_minutes::int, 60))
     ) then
    raise exception 'call:not_engaged' using errcode = 'P0001';
  end if;

  if private.call_user_busy(me) then
    raise exception 'call:caller_busy' using errcode = 'P0001';
  end if;

  if not private.consume_rate_limit('call:start', me::text, 10, 600)
     or not private.consume_rate_limit('call:start:day', me::text, 60, 86400)
     or not private.consume_rate_limit('call:pair', me::text || '>' || callee::text, 4, 600) then
    raise exception 'call:rate_limited' using errcode = '54000';
  end if;

  insert into public.calls (kind, purpose, initiator_id, conversation_id, listing_id, business_id, client_key)
  values (p_kind, 'CONVERSATION', me, conv.id, conv.listing_id, conv.business_id, p_client_key)
  returning * into c;
  insert into public.call_participants (call_id, user_id, role, state, responded_at)
  values (c.id, me, 'CALLER', 'ACCEPTED', now()),
         (c.id, callee, 'CALLEE', 'INVITED', null);
  insert into public.call_events (call_id, actor_id, source, event, to_state, detail)
  values (c.id, me, 'member', 'call.created', 'CREATED', jsonb_build_object('kind', p_kind));

  c := private.call_ring(c.id, me, 'member');
  return private.call_snapshot(c.id, me);
end;
$fn$;
