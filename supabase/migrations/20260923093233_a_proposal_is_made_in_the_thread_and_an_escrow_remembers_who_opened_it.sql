-- A PROPOSAL IS MADE IN THE THREAD, AND AN ESCROW REMEMBERS WHO OPENED IT.
--
-- TWO THINGS, AND THEY ARE THE SAME THING. The thread composer needs a door
-- that opens an agreement WITHOUT moving money, and the audit log needs to
-- know who walked through it. Both are answered by one new column.
--
-- THE DEFECT THIS CLOSES, PROVED BEFORE IT WAS FIXED. `escrow_audit_insert`
-- wrote `actor_id = auth.uid()`. Every escrow write runs as the service role
-- through a server action, where `auth.uid()` is NULL, so EVERY AGREEMENT EVER
-- OPENED WAS AUDITED TO NOBODY. The 22 September work fixed exactly this on
-- the UPDATE trigger, by reading the columns the doors write, and left the
-- INSERT trigger reading a session that is never there. Proved on this
-- database, in a transaction that rolled back: one escrow inserted with no JWT
-- claims, one `escrow.initiated` row, `actor_id` null.
--
-- `opened_by` IS THE COLUMN THE DOOR WRITES, and the trigger reads it the same
-- way the update trigger reads `disputed_by` and `resolved_by`. `auth.uid()`
-- still comes first, because a genuinely signed-in actor is the better answer
-- when there is one.
--
-- `conversation_id` IS WHERE THE PROPOSAL WAS MADE. A thread that cannot find
-- its own proposal has to be told about it by the client, and a client that
-- says which agreement belongs to which thread is a client that can say the
-- wrong one.

alter table public.escrows
  add column if not exists opened_by uuid references auth.users(id) on delete set null;

alter table public.escrows
  add column if not exists conversation_id uuid references public.conversations(id) on delete set null;

create index if not exists escrows_conversation_id_idx
  on public.escrows (conversation_id)
  where conversation_id is not null;

comment on column public.escrows.opened_by is
  'The person who opened this agreement. The audit trigger reads it because auth.uid() is null under the service role, which is how every escrow write arrives.';
comment on column public.escrows.conversation_id is
  'The thread the proposal was made in, when it was made in one.';

-- THE BIRTH ROW NAMES SOMEBODY.
create or replace function private.escrow_audit_insert()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $fn$
declare
  /*
   * auth.uid() FIRST, because a signed-in actor is the best answer. Then the
   * column the opening door writes, because every escrow write runs as the
   * service role through a server action and auth.uid() is null there. Before
   * this line every agreement in the audit log was opened by nobody.
   */
  actor uuid := coalesce(auth.uid(), new.opened_by);
begin
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (
    actor,
    'escrow.initiated',
    'escrow',
    new.id::text,
    jsonb_build_object(
      'amount_minor', new.amount_minor,
      'purpose', new.purpose,
      'payer_id', new.payer_id,
      'payee_id', new.payee_id,
      'listing_id', new.listing_id,
      'conversation_id', new.conversation_id,
      'actor_source', case
        when auth.uid() is not null then 'session'
        when new.opened_by is not null then 'row'
        else 'unknown'
      end
    )
  );
  return null;
end;
$fn$;

revoke all on function private.escrow_audit_insert() from public;
revoke all on function private.escrow_audit_insert() from anon;
revoke all on function private.escrow_audit_insert() from authenticated;

-- THE GENERIC OPENING DOOR NOW NAMES ITS OPENER AND HONOURS THE PURPOSE GATE.
-- It had no purpose gate at all, so it would have opened a `purchase_balance`
-- agreement on request while the funding door beside it refuses one. Nothing
-- in the application calls it; a door that contradicts the gate next to it is
-- still a door.
create or replace function public.escrow_open(
  payer_user uuid,
  payee_user uuid,
  listing uuid,
  purpose escrow_purpose,
  amount bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  new_id uuid;
begin
  if payer_user is null or payee_user is null or purpose is null then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if payer_user = payee_user then
    return jsonb_build_object('status', 'same_party');
  end if;
  if amount is null or amount <= 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;
  if not private.escrow_purpose_is_open(purpose) then
    return jsonb_build_object('status', 'purpose_not_open', 'purpose', purpose);
  end if;

  insert into public.escrows (payer_id, payee_id, listing_id, purpose, amount_minor, opened_by)
  values (payer_user, payee_user, listing, purpose, amount, payer_user)
  returning id into new_id;

  return jsonb_build_object(
    'status', 'ok', 'escrow_id', new_id, 'state', 'INITIATED', 'amount_minor', amount
  );
end;
$fn$;

revoke all on function public.escrow_open(uuid, uuid, uuid, escrow_purpose, bigint) from public;
revoke all on function public.escrow_open(uuid, uuid, uuid, escrow_purpose, bigint) from anon;
revoke all on function public.escrow_open(uuid, uuid, uuid, escrow_purpose, bigint) from authenticated;
grant execute on function public.escrow_open(uuid, uuid, uuid, escrow_purpose, bigint) to service_role;

-- THE FUNDING DOOR NAMES ITS OPENER. Body otherwise unchanged, word for word.
create or replace function public.escrow_fund_from_wallet_as(
  p_actor uuid,
  p_payee uuid,
  p_listing uuid,
  p_purpose escrow_purpose,
  p_amount_minor bigint,
  p_reference text,
  p_hold_days integer default 21
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  payer uuid := p_actor;
  payer_wallet uuid;
  spendable bigint;
  escrow_id uuid;
  hold_days integer := greatest(1, least(coalesce(p_hold_days, 21), 180));
begin
  if payer is null then
    return jsonb_build_object('status', 'signed_out');
  end if;
  if p_payee is null or p_purpose is null then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if p_reference is null or char_length(btrim(p_reference)) = 0 then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if p_payee = payer then
    return jsonb_build_object('status', 'same_party');
  end if;
  if p_amount_minor is null or p_amount_minor <= 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;
  if not private.escrow_purpose_is_open(p_purpose) then
    return jsonb_build_object('status', 'purpose_not_open', 'purpose', p_purpose);
  end if;

  payer_wallet := private.wallet_for_update(payer);
  if payer_wallet is null then
    return jsonb_build_object('status', 'no_wallet');
  end if;

  spendable := private.wallet_spendable_locked(payer_wallet);
  if spendable < p_amount_minor then
    return jsonb_build_object(
      'status', 'insufficient',
      'available_minor', spendable,
      'amount_minor', p_amount_minor
    );
  end if;

  insert into public.escrows (payer_id, payee_id, listing_id, purpose, amount_minor, opened_by)
  values (payer, p_payee, p_listing, p_purpose, p_amount_minor, payer)
  returning id into escrow_id;

  begin
    insert into public.wallet_entries
      (wallet_id, kind, direction, amount_minor, reference, status, metadata)
    values
      (payer_wallet, 'escrow_hold', 'debit', p_amount_minor, btrim(p_reference), 'COMPLETED',
       jsonb_build_object(
         'note', 'Held for a transaction on Vallo',
         'escrow_id', escrow_id,
         'purpose', p_purpose,
         'payee_id', p_payee,
         'listing_id', p_listing
       ));
  exception when unique_violation then
    /*
     * E-8, THE RETRY ASYMMETRY. This door used to raise where escrow_hold
     * answers. Both now answer, in the same word, so a caller retrying after a
     * dropped connection reads one vocabulary and not two.
     */
    return jsonb_build_object('status', 'duplicate', 'reference', btrim(p_reference));
  end;

  update public.escrows
     set state = 'FUNDED', funded_at = now()
   where id = escrow_id;

  update public.escrows
     set state = 'HELD',
         held_at = now(),
         auto_release_at = now() + make_interval(days => hold_days)
   where id = escrow_id;

  perform private.notify(
    p_payee, 'wallet', 'Money is held for you',
    'A payment is now held for you. It reaches your balance when both sides confirm, or on its own on the date shown.',
    '/escrow/' || escrow_id::text
  );

  return jsonb_build_object(
    'status', 'ok',
    'escrow_id', escrow_id,
    'amount_minor', p_amount_minor,
    'state', 'HELD',
    'auto_release_at', now() + make_interval(days => hold_days)
  );
end;
$fn$;

revoke all on function public.escrow_fund_from_wallet_as(uuid, uuid, uuid, escrow_purpose, bigint, text, integer) from public;
revoke all on function public.escrow_fund_from_wallet_as(uuid, uuid, uuid, escrow_purpose, bigint, text, integer) from anon;
revoke all on function public.escrow_fund_from_wallet_as(uuid, uuid, uuid, escrow_purpose, bigint, text, integer) from authenticated;
grant execute on function public.escrow_fund_from_wallet_as(uuid, uuid, uuid, escrow_purpose, bigint, text, integer) to service_role;

-- THE PROPOSAL. A real row in INITIATED and NOT ONE KOBO MOVED.
--
-- THE LISTING IS THE THREAD'S, NOT THE CALLER'S. The conversation already
-- knows what it is about, and a caller who could name a listing could name a
-- property they have no relationship with and have it printed on an agreement.
--
-- ONE OPEN AGREEMENT PER THREAD. Without this, a proposal is something you can
-- send fifty of, which is a way to pressure somebody rather than a way to
-- agree with them. It is build rule 15's concern, expressed where it cannot be
-- argued with.
--
-- SUPERSEDED IN THE VERY NEXT MIGRATION, which adds the example-property
-- answer. The body here is kept exactly as it was applied, because a migration
-- that is edited after the fact is a migration whose history is a guess.
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

-- ACCEPTING A PROPOSAL IS FUNDING IT, AND ONLY THE PAYER CAN.
--
-- THE REFERENCE IS DERIVED HERE AND IS NOT AN ARGUMENT. The agreement already
-- exists, so `references.ts` applies word for word: `rm-esc-<escrow uuid>-hold`
-- is computed from the row, a retry computes the identical string, and the
-- unique index on `wallet_entries.reference` turns the second attempt into a
-- `duplicate` that moves nothing. A caller who could choose the key could
-- replay their own hold or collide with somebody else's.
create or replace function public.escrow_fund_proposal_as(
  p_actor uuid,
  p_escrow uuid,
  p_hold_days integer default 21
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  e public.escrows;
  payer_wallet uuid;
  spendable bigint;
  hold_days integer := greatest(1, least(coalesce(p_hold_days, 21), 180));
  reference text;
begin
  if p_actor is null then
    return jsonb_build_object('status', 'signed_out');
  end if;
  if p_escrow is null then
    return jsonb_build_object('status', 'bad_request');
  end if;

  select * into e from public.escrows where id = p_escrow for update;
  if e.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if p_actor <> e.payer_id then
    /* The payee cannot fund what the payee is owed, and a third party cannot
       reach the row at all. Both answer in one word. */
    return jsonb_build_object('status', 'not_a_party');
  end if;
  if e.state <> 'INITIATED' then
    return jsonb_build_object('status', 'not_fundable', 'state', e.state);
  end if;
  if not private.escrow_purpose_is_open(e.purpose) then
    return jsonb_build_object('status', 'purpose_not_open', 'purpose', e.purpose);
  end if;

  payer_wallet := private.wallet_for_update(e.payer_id);
  if payer_wallet is null then
    return jsonb_build_object('status', 'no_wallet');
  end if;

  spendable := private.wallet_spendable_locked(payer_wallet);
  if spendable < e.amount_minor then
    return jsonb_build_object(
      'status', 'insufficient',
      'available_minor', spendable,
      'amount_minor', e.amount_minor
    );
  end if;

  reference := 'rm-esc-' || e.id::text || '-hold';

  begin
    insert into public.wallet_entries
      (wallet_id, kind, direction, amount_minor, reference, status, metadata)
    values
      (payer_wallet, 'escrow_hold', 'debit', e.amount_minor, reference, 'COMPLETED',
       jsonb_build_object(
         'note', 'Held for a transaction on Vallo',
         'escrow_id', e.id,
         'purpose', e.purpose,
         'payee_id', e.payee_id,
         'listing_id', e.listing_id
       ));
  exception when unique_violation then
    return jsonb_build_object('status', 'duplicate', 'reference', reference);
  end;

  update public.escrows
     set state = 'FUNDED', funded_at = now()
   where id = e.id;

  update public.escrows
     set state = 'HELD',
         held_at = now(),
         auto_release_at = now() + make_interval(days => hold_days)
   where id = e.id;

  perform private.notify(
    e.payee_id, 'wallet', 'Money is held for you',
    'A payment is now held for you. It reaches your balance when both sides confirm, or on its own on the date shown.',
    '/escrow/' || e.id::text
  );

  return jsonb_build_object(
    'status', 'ok',
    'escrow_id', e.id,
    'amount_minor', e.amount_minor,
    'state', 'HELD',
    'auto_release_at', now() + make_interval(days => hold_days)
  );
end;
$fn$;

revoke all on function public.escrow_fund_proposal_as(uuid, uuid, integer) from public;
revoke all on function public.escrow_fund_proposal_as(uuid, uuid, integer) from anon;
revoke all on function public.escrow_fund_proposal_as(uuid, uuid, integer) from authenticated;
grant execute on function public.escrow_fund_proposal_as(uuid, uuid, integer) to service_role;

-- RULE 21, READ BACK INSIDE THE MIGRATION, for every door this file touched.
do $readback$
declare
  sig text;
  sigs text[] := array[
    'public.escrow_open(uuid, uuid, uuid, escrow_purpose, bigint)',
    'public.escrow_fund_from_wallet_as(uuid, uuid, uuid, escrow_purpose, bigint, text, integer)',
    'public.escrow_propose_as(uuid, uuid, uuid, escrow_purpose, bigint, boolean)',
    'public.escrow_fund_proposal_as(uuid, uuid, integer)'
  ];
begin
  foreach sig in array sigs loop
    if has_function_privilege('anon', sig, 'execute') then
      raise exception 'READ BACK FAILED: anon may execute %', sig;
    end if;
    if has_function_privilege('authenticated', sig, 'execute') then
      raise exception 'READ BACK FAILED: authenticated may execute %', sig;
    end if;
    if has_function_privilege('public', sig, 'execute') then
      raise exception 'READ BACK FAILED: public may execute %', sig;
    end if;
    if not has_function_privilege('service_role', sig, 'execute') then
      raise exception 'READ BACK FAILED: service_role cannot execute %, so no server action can reach it', sig;
    end if;
  end loop;

  if has_function_privilege('anon', 'private.escrow_audit_insert()', 'execute')
     or has_function_privilege('authenticated', 'private.escrow_audit_insert()', 'execute') then
    raise exception 'READ BACK FAILED: the audit trigger function is callable by a client';
  end if;

  if not exists (
    select 1 from pg_attribute
    where attrelid = 'public.escrows'::regclass and attname = 'opened_by' and not attisdropped
  ) then
    raise exception 'READ BACK FAILED: escrows.opened_by does not exist';
  end if;
  if not exists (
    select 1 from pg_attribute
    where attrelid = 'public.escrows'::regclass and attname = 'conversation_id' and not attisdropped
  ) then
    raise exception 'READ BACK FAILED: escrows.conversation_id does not exist';
  end if;
end
$readback$;
