-- A business transfer takes the guest threads about that business with it.
--
-- A thread about a hotel or a restaurant (context_kind 'business') is opened
-- with conversations.agent_id = businesses.owner_id, and conversations RLS
-- reads agent_id. respond_to_business_transfer repointed businesses.owner_id
-- but never touched conversations, so after a handover the previous owner
-- kept reading and answering as the business, and the new owner never saw
-- the guests who had already written in.
--
-- On acceptance, the business side of every such thread moves to the new
-- owner, and the previous owner's archive marks on those threads go (they
-- are no longer a participant). The guest side (guest_id, the guest's own
-- archive marks) and the message history are left exactly as they were:
-- messages keep their original sender_id, so earlier replies still show who
-- wrote them.
--
-- The body below is the live definition as read with pg_get_functiondef on
-- 28 September 2026. The only change is the block marked "The guest threads
-- about this business go with it". CREATE OR REPLACE keeps the existing
-- grants (postgres and service_role only).

CREATE OR REPLACE FUNCTION public.respond_to_business_transfer(p_transfer uuid, p_user uuid, p_accept boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_transfer public.business_transfers;
  v_biz      public.businesses;
begin
  if p_transfer is null or p_user is null then
    return jsonb_build_object('accepted', false, 'reason', 'incomplete');
  end if;

  select * into v_transfer
    from public.business_transfers
   where id = p_transfer
   for update;

  if not found then
    return jsonb_build_object('accepted', false, 'reason', 'not_found');
  end if;
  -- Only the person it was offered to may answer it. The service role calls
  -- this on their behalf, so the subject is checked here rather than assumed.
  if v_transfer.to_user_id is distinct from p_user then
    return jsonb_build_object('accepted', false, 'reason', 'not_yours');
  end if;
  if v_transfer.status <> 'PENDING' then
    return jsonb_build_object('accepted', false, 'reason', 'not_open',
                              'status', v_transfer.status);
  end if;
  if v_transfer.expires_at <= now() then
    update public.business_transfers
       set status = 'EXPIRED', responded_at = now()
     where id = p_transfer;
    return jsonb_build_object('accepted', false, 'reason', 'expired');
  end if;

  if coalesce(p_accept, false) is false then
    update public.business_transfers
       set status = 'DECLINED', responded_at = now()
     where id = p_transfer;
    perform private.notify(
      v_transfer.from_user_id, 'system',
      'Your transfer was declined',
      'The person you offered the business to said no. It is still yours, and you can offer it to somebody else.',
      '/host/transfer');
    return jsonb_build_object('accepted', false, 'declined', true, 'reason', 'declined');
  end if;

  select * into v_biz from public.businesses where id = v_transfer.business_id for update;
  if not found then
    update public.business_transfers
       set status = 'EXPIRED', responded_at = now()
     where id = p_transfer;
    return jsonb_build_object('accepted', false, 'reason', 'no_business');
  end if;
  -- Fourteen days is long enough for the owner to have changed, and accepting
  -- an offer from somebody who is no longer the owner would take a business
  -- off a person who never agreed to lose it.
  if v_biz.owner_id is distinct from v_transfer.from_user_id then
    update public.business_transfers
       set status = 'EXPIRED', responded_at = now()
     where id = p_transfer;
    return jsonb_build_object('accepted', false, 'reason', 'no_longer_theirs');
  end if;
  -- And long enough for the RECEIVER to have decided to leave. Checked again,
  -- because the offer check was fourteen days ago.
  if exists (
    select 1 from public.account_deletion_requests r
     where r.user_id = p_user and r.status in ('SCHEDULED', 'PURGING')
  ) then
    return jsonb_build_object('accepted', false, 'reason', 'receiver_leaving');
  end if;

  /*
   * THE HANDOVER. Everything on this row that names the OLD PERSON goes with
   * them, and the header says why for each one. The badge goes out because
   * rule 12 says a verified badge only ever means a human was checked, and the
   * human who was checked has left.
   */
  update public.businesses
     set owner_id             = p_user,
         agent_id             = null,
         representative_name  = null,
         representative_phone = null,
         consents             = '{}'::jsonb,
         hygiene_attested_at  = null,
         licence_attested_at  = null
   where id = v_biz.id;

  -- The guest threads about this business go with it. A business thread is
  -- opened with agent_id = the owner, and conversations RLS reads agent_id,
  -- so leaving it would keep the previous owner inside every guest's thread
  -- and keep the new owner out. Only the business side moves: guest_id, the
  -- guest's archive marks and the messages (with their original sender_id)
  -- are left as they are. The previous owner's archive marks go because they
  -- are no longer in the thread; a mark they hold as the GUEST of a thread is
  -- theirs and stays.
  delete from public.conversation_archives ca
   using public.conversations c
   where ca.conversation_id = c.id
     and c.business_id = v_biz.id
     and c.context_kind = 'business'
     and c.agent_id = v_transfer.from_user_id
     and ca.user_id = v_transfer.from_user_id
     and c.guest_id <> v_transfer.from_user_id;

  update public.conversations
     set agent_id = p_user
   where business_id = v_biz.id
     and context_kind = 'business'
     and agent_id = v_transfer.from_user_id;

  -- The identity rung was a check against the old owner's papers, and the
  -- account purge deletes those papers outright. Back to pending, with the
  -- reason on the row; the sync trigger recomputes the tier and the badge
  -- trigger puts the tick out. Registration, payout and on_site are left
  -- alone: the CAC certificate and the site visit did not change hands.
  insert into public.business_verification_checks (business_id, rung, status, note, reviewer_id)
  values (v_biz.id, 'identity', 'pending',
          'Ownership changed. The identity rung is re-checked against the new owner.', null)
  on conflict (business_id, rung) do update
     set status      = 'pending',
         note        = excluded.note,
         reviewer_id = null,
         decided_at  = now();

  update public.business_transfers
     set status = 'ACCEPTED', responded_at = now()
   where id = p_transfer;

  -- Any other offer of the same business is dead now.
  update public.business_transfers
     set status = 'EXPIRED', responded_at = now()
   where business_id = v_biz.id and status = 'PENDING' and id <> p_transfer;

  perform private.notify(
    v_transfer.from_user_id, 'system',
    'Your business has a new owner',
    v_biz.name || ' now belongs to the person you offered it to. It is no longer on your account.',
    '/host');
  perform private.notify(
    p_user, 'system',
    'You now own a business on Vallo',
    v_biz.name || ' is yours. The verified badge is off until your own identity check passes, and the consents and attestations are yours to make.',
    '/host');

  return jsonb_build_object(
    'accepted', true,
    'transfer_id', p_transfer,
    'business_id', v_biz.id);
end;
$function$;

-- Read-back: the new body is live, the grants are unchanged, and a transfer
-- moves a guest thread end to end. The behaviour probe runs inside a
-- subtransaction that is always rolled back, so it leaves nothing behind.
do $readback$
declare
  v_def   text;
  v_acl   text;
  v_b     uuid;
  v_o     uuid;
  v_g     uuid;
  v_n     uuid;
  v_c     uuid;
  v_c2    uuid;
  v_t     uuid;
  v_r     jsonb;
  v_row   public.conversations;
  v_n_msg int;
begin
  select pg_get_functiondef(p.oid), p.proacl::text into v_def, v_acl
    from pg_proc p where p.oid = 'public.respond_to_business_transfer(uuid,uuid,boolean)'::regprocedure;
  if position('update public.conversations' in v_def) = 0
     or position('delete from public.conversation_archives' in v_def) = 0 then
    raise exception 'B-04 read-back: respond_to_business_transfer does not move guest threads';
  end if;
  if has_function_privilege('anon', 'public.respond_to_business_transfer(uuid,uuid,boolean)', 'execute')
     or has_function_privilege('authenticated', 'public.respond_to_business_transfer(uuid,uuid,boolean)', 'execute') then
    raise exception 'B-04 read-back: respond_to_business_transfer became callable by anon or authenticated (acl %)', v_acl;
  end if;

  -- Behaviour probe, rolled back.
  begin
    select b.id, b.owner_id into v_b, v_o
      from public.businesses b where b.status = 'PUBLISHED' order by b.id limit 1;
    select u.id into v_g from auth.users u
     where u.id <> v_o
       and not exists (select 1 from public.account_deletion_requests r where r.user_id = u.id and r.status in ('SCHEDULED', 'PURGING'))
     order by u.created_at limit 1;
    select u.id into v_n from auth.users u
     where u.id not in (v_o, v_g)
       and not exists (select 1 from public.account_deletion_requests r where r.user_id = u.id and r.status in ('SCHEDULED', 'PURGING'))
     order by u.created_at limit 1;
    if v_b is null or v_g is null or v_n is null then
      raise exception 'probe_fixture_missing';
    end if;

    -- Fixture: a thread opens only on a real (non-example) business.
    update public.businesses set is_demo = false where id = v_b;

    perform set_config('request.jwt.claim.sub', v_g::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_g, 'role', 'authenticated')::text, true);
    insert into public.conversations (guest_id, agent_id, context_kind, business_id)
    values (v_g, v_o, 'business', v_b) returning id into v_c;
    insert into public.messages (conversation_id, sender_id, body) values (v_c, v_g, 'Is there parking?');
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    insert into public.messages (conversation_id, sender_id, body) values (v_c, v_o, 'Yes, behind the building.');
    insert into public.conversation_archives (user_id, conversation_id) values (v_o, v_c), (v_g, v_c);

    -- Control: a listing-style thread between the same two people that is NOT
    -- about this business must not move. Use any existing non-business thread
    -- of the old owner, if there is one.
    select c.id into v_c2 from public.conversations c
     where c.agent_id = v_o and c.context_kind <> 'business' limit 1;

    insert into public.business_transfers (business_id, from_user_id, to_user_id, expires_at)
    values (v_b, v_o, v_n, now() + interval '1 day') returning id into v_t;

    v_r := public.respond_to_business_transfer(v_t, v_n, true);
    if (v_r ->> 'accepted') is distinct from 'true' then
      raise exception 'probe: transfer not accepted: %', v_r;
    end if;

    select * into v_row from public.conversations where id = v_c;
    if v_row.agent_id <> v_n then
      raise exception 'probe: business side did not move (agent_id %)', v_row.agent_id;
    end if;
    if v_row.guest_id <> v_g or v_row.business_id <> v_b or v_row.context_kind <> 'business' then
      raise exception 'probe: guest side or context changed';
    end if;
    select count(*) into v_n_msg from public.messages
     where conversation_id = v_c
       and ((sender_id = v_g and body = 'Is there parking?') or (sender_id = v_o and body = 'Yes, behind the building.'));
    if v_n_msg <> 2 or (select count(*) from public.messages where conversation_id = v_c) <> 2 then
      raise exception 'probe: message history changed (% matching)', v_n_msg;
    end if;
    if exists (select 1 from public.conversation_archives where conversation_id = v_c and user_id = v_o) then
      raise exception 'probe: old owner still holds an archive mark on the thread';
    end if;
    if not exists (select 1 from public.conversation_archives where conversation_id = v_c and user_id = v_g) then
      raise exception 'probe: the guest archive mark was removed';
    end if;
    if v_c2 is not null and (select agent_id from public.conversations where id = v_c2) <> v_o then
      raise exception 'probe: a thread not about this business moved';
    end if;

    raise exception 'probe_passed';
  exception when others then
    if sqlerrm = 'probe_passed' then
      raise notice 'B-04 probe passed (rolled back)';
    else
      raise exception 'B-04 probe failed: %', sqlerrm;
    end if;
  end;
end
$readback$;
