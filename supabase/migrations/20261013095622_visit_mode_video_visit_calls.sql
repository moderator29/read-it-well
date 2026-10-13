set lock_timeout = '5s';

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
