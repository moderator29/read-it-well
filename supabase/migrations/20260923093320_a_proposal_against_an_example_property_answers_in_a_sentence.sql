-- A PROPOSAL AGAINST AN EXAMPLE PROPERTY ANSWERS IN A SENTENCE.
--
-- `escrows_never_against_a_demo_listing` is the lock and it stays the lock: it
-- RAISES `check_violation`, which is what a lock should do to a caller that
-- had no business being there.
--
-- But the proposal composer sits in a message thread, and EVERY CONVERSATION
-- ON THIS DATABASE TODAY IS ABOUT AN EXAMPLE LISTING. All seven of them. So
-- the first person ever to open the composer would have hit a raised exception
-- inside a server action, which `callMoneyRpc` reports as "That could not be
-- done just now", and the founder's own catalogue would have looked like an
-- outage.
--
-- The door now ASKS before it inserts, and answers `demo_listing`, which the
-- copy layer turns into a sentence naming what is actually true: the property
-- is an example, so nothing can be arranged against it. The trigger is
-- untouched and still refuses anything that gets past this.

create or replace function public.escrow_propose_as(
  p_actor uuid,
  p_conversation uuid,
  p_counterparty uuid,
  p_purpose escrow_purpose,
  p_amount_minor bigint,
  p_actor_pays boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  convo public.conversations;
  payer uuid;
  payee uuid;
  new_id uuid;
  live integer;
  demo boolean;
begin
  if p_actor is null then
    return jsonb_build_object('status', 'signed_out');
  end if;
  if p_conversation is null or p_counterparty is null or p_purpose is null
     or p_actor_pays is null then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if p_actor = p_counterparty then
    return jsonb_build_object('status', 'same_party');
  end if;
  if p_amount_minor is null or p_amount_minor <= 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;
  if not private.escrow_purpose_is_open(p_purpose) then
    return jsonb_build_object('status', 'purpose_not_open', 'purpose', p_purpose);
  end if;

  select * into convo from public.conversations where id = p_conversation;
  if convo.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  /* BOTH NAMED PEOPLE MUST BE THE TWO PEOPLE IN THE THREAD. Not "the actor is
     a member": that would let a member propose an agreement between themselves
     and a stranger who has never spoken to them. */
  if not (
    (convo.guest_id = p_actor and convo.agent_id = p_counterparty)
    or (convo.agent_id = p_actor and convo.guest_id = p_counterparty)
  ) then
    return jsonb_build_object('status', 'not_a_party');
  end if;

  /* ASK THE DEMO QUESTION HERE so the answer is a sentence rather than a
     raised exception reported as an outage. The trigger still refuses. */
  if convo.listing_id is not null then
    select l.is_demo into demo from public.listings l where l.id = convo.listing_id;
    if coalesce(demo, false) then
      return jsonb_build_object('status', 'demo_listing');
    end if;
  end if;

  select count(*) into live
  from public.escrows
  where conversation_id = p_conversation
    and state in ('INITIATED', 'FUNDED', 'HELD', 'RELEASE_REQUESTED', 'DISPUTED');
  if live > 0 then
    return jsonb_build_object('status', 'already_open');
  end if;

  if p_actor_pays then
    payer := p_actor;
    payee := p_counterparty;
  else
    payer := p_counterparty;
    payee := p_actor;
  end if;

  insert into public.escrows
    (payer_id, payee_id, listing_id, purpose, amount_minor, opened_by, conversation_id)
  values
    (payer, payee, convo.listing_id, p_purpose, p_amount_minor, p_actor, p_conversation)
  returning id into new_id;

  perform private.notify(
    p_counterparty, 'wallet', 'A proposal in your conversation',
    'The other person has proposed setting an amount aside. Nothing has been paid and nothing has left either balance.',
    '/escrow/' || new_id::text
  );

  return jsonb_build_object(
    'status', 'ok',
    'escrow_id', new_id,
    'state', 'INITIATED',
    'amount_minor', p_amount_minor
  );
end;
$fn$;

revoke all on function public.escrow_propose_as(uuid, uuid, uuid, escrow_purpose, bigint, boolean) from public;
revoke all on function public.escrow_propose_as(uuid, uuid, uuid, escrow_purpose, bigint, boolean) from anon;
revoke all on function public.escrow_propose_as(uuid, uuid, uuid, escrow_purpose, bigint, boolean) from authenticated;
grant execute on function public.escrow_propose_as(uuid, uuid, uuid, escrow_purpose, bigint, boolean) to service_role;

do $readback$
begin
  if has_function_privilege('anon', 'public.escrow_propose_as(uuid, uuid, uuid, escrow_purpose, bigint, boolean)', 'execute')
     or has_function_privilege('authenticated', 'public.escrow_propose_as(uuid, uuid, uuid, escrow_purpose, bigint, boolean)', 'execute')
     or has_function_privilege('public', 'public.escrow_propose_as(uuid, uuid, uuid, escrow_purpose, bigint, boolean)', 'execute') then
    raise exception 'READ BACK FAILED: the proposal door is reachable by a client role';
  end if;
  if not has_function_privilege('service_role', 'public.escrow_propose_as(uuid, uuid, uuid, escrow_purpose, bigint, boolean)', 'execute') then
    raise exception 'READ BACK FAILED: service_role cannot execute the proposal door';
  end if;
end
$readback$;
