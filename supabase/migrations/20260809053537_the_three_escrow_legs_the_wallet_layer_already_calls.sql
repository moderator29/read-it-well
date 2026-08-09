-- The three legs lib/wallet/escrow.ts was written against.
--
-- The lead's module was built to a contract it documented in its own header
-- before these functions existed: three legs, each keyed on a reference derived
-- from the escrow id, each returning a jsonb status that lib/wallet/rpc.ts
-- reads. It falls back to nothing on purpose and reports `unavailable` until
-- they are applied, which is the correct thing to have done and is why nothing
-- was broken in the meantime.
--
-- This file is that contract, implemented on top of the state machine rather
-- than beside it. Every leg goes through the same locked path
-- (private.escrow_settle for the two credits) and the same transition trigger,
-- so an escrow moved by the wallet layer and an escrow moved by a party
-- pressing confirm land in exactly the same states with the same audit entries.
-- Two ways in, one machine.
--
-- WHY THE PARAMETER NAMES MATTER MORE THAN USUAL. PostgREST resolves an RPC by
-- the NAMES of the arguments in the JSON body, not by position. The caller
-- sends escrow_id, payer_user, amount, hold_reference and note, so those are
-- the names, exactly, and renaming one to something tidier would produce a
-- PGRST202 "function not found" at runtime and nothing at compile time.
--
-- WHY THESE TAKE A USER ID AND public.escrow_fund_from_wallet DOES NOT.
-- escrow_fund_from_wallet is called by a signed-in person and reads the payer
-- from auth.uid(), because a function that let a browser name somebody else's
-- wallet would be indefensible. These three are called by the service role from
-- the server after the caller has already been established, so the party is an
-- argument. They are granted to service_role and to nobody else, and the
-- argument is CHECKED against the escrow row rather than trusted: passing the
-- wrong user gets `wrong_state`, not somebody else's money.

begin;

/*
 * The hold. Debits the payer and takes the escrow to HELD.
 *
 * Unlike escrow_fund_from_wallet, this does NOT create the escrow: the row
 * already exists in INITIATED, because the caller built it with whatever
 * purpose, listing and parties the flow knew about. This leg is only the money.
 *
 * NOTE: the body below is superseded in the very next migration,
 * 20260809053622, which moves the duplicate test above the state test. It is
 * left here as it was applied rather than edited in place, because a migration
 * that no longer describes what ran is worse than one that has been corrected
 * in the open.
 */
create or replace function public.escrow_hold(
  escrow_id uuid,
  payer_user uuid,
  amount bigint,
  hold_reference text,
  note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.escrows;
  payer_wallet uuid;
  spendable bigint;
  hold_days integer := 21;
begin
  if escrow_id is null or payer_user is null or hold_reference is null then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if amount is null or amount <= 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;

  select * into e from public.escrows where id = escrow_id for update;
  if e.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- The caller's idea of who is paying has to agree with the row. It is not
  -- trusted, it is checked, so a wrong argument moves nothing.
  if e.payer_id <> payer_user then
    return jsonb_build_object('status', 'wrong_state', 'state', e.state);
  end if;
  if e.state <> 'INITIATED' then
    return jsonb_build_object('status', 'wrong_state', 'state', e.state);
  end if;
  if amount <> e.amount_minor then
    return jsonb_build_object('status', 'wrong_state', 'state', e.state, 'amount_minor', e.amount_minor);
  end if;

  payer_wallet := private.wallet_for_update(e.payer_id);
  if payer_wallet is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  spendable := private.wallet_spendable_locked(payer_wallet);
  if spendable < e.amount_minor then
    return jsonb_build_object(
      'status', 'insufficient',
      'available_minor', spendable,
      'amount_minor', e.amount_minor,
      'state', e.state
    );
  end if;

  begin
    insert into public.wallet_entries
      (wallet_id, kind, direction, amount_minor, reference, status, metadata)
    values
      (payer_wallet, 'escrow_hold', 'debit', e.amount_minor, hold_reference, 'COMPLETED',
       jsonb_build_object(
         'note', coalesce(note, 'Held in escrow by RentMe'),
         'escrow_id', e.id,
         'purpose', e.purpose,
         'payee_id', e.payee_id,
         'listing_id', e.listing_id
       ));
  exception when unique_violation then
    return jsonb_build_object(
      'status', 'duplicate', 'state', e.state, 'amount_minor', e.amount_minor
    );
  end;

  update public.escrows set state = 'FUNDED', funded_at = now() where id = e.id;
  update public.escrows
     set state = 'HELD',
         held_at = now(),
         auto_release_at = now() + make_interval(days => hold_days)
   where id = e.id;

  perform private.notify(
    e.payee_id, 'wallet', 'Money is held for you',
    'A payment is now held in escrow. It reaches your wallet when both sides confirm.',
    '/wallet'
  );

  return jsonb_build_object(
    'status', 'ok', 'state', 'HELD', 'amount_minor', e.amount_minor
  );
end;
$$;

comment on function public.escrow_hold is
  'Debit the payer and take an existing INITIATED escrow to HELD. Service role only. payer_user is checked against the escrow row rather than trusted, and hold_reference is the idempotency key: a repeat answers duplicate and moves nothing.';

/*
 * The release. The amount is NOT an argument, deliberately.
 *
 * It is read from the escrow row inside the lock, so no caller can release more
 * than is held however wrong their arithmetic is. That is the lead's design
 * decision, stated in their module, and it is the right one.
 */
create or replace function public.escrow_release(
  escrow_id uuid,
  beneficiary_user uuid,
  release_reference text,
  note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.escrows;
  outcome jsonb;
begin
  if escrow_id is null or beneficiary_user is null then
    return jsonb_build_object('status', 'bad_request');
  end if;

  select * into e from public.escrows where id = escrow_id for update;
  if e.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if e.payee_id <> beneficiary_user then
    return jsonb_build_object('status', 'wrong_state', 'state', e.state);
  end if;
  if e.state in ('RELEASED', 'REFUNDED', 'RESOLVED') then
    -- Settled once already. Reported as duplicate rather than wrong_state
    -- because that is what a retry of this exact leg is, and the caller logs
    -- the two differently.
    return jsonb_build_object('status', 'duplicate', 'state', e.state, 'amount_minor', e.amount_minor);
  end if;
  if e.state not in ('HELD', 'RELEASE_REQUESTED') then
    return jsonb_build_object('status', 'wrong_state', 'state', e.state);
  end if;

  outcome := private.escrow_settle(
    e.id, 'release', 'RELEASED', null,
    coalesce(note, 'Released by the platform.')
  );
  if outcome ->> 'status' <> 'ok' then
    return outcome;
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'state', 'RELEASED',
    'amount_minor', (outcome ->> 'net_minor')::bigint
  );
end;
$$;

comment on function public.escrow_release is
  'Credit the payee and take a held escrow to RELEASED. The amount is read from the escrow row rather than passed in, so no caller can release more than is held. Service role only.';

create or replace function public.escrow_refund(
  escrow_id uuid,
  payer_user uuid,
  refund_reference text,
  note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.escrows;
  outcome jsonb;
begin
  if escrow_id is null or payer_user is null then
    return jsonb_build_object('status', 'bad_request');
  end if;

  select * into e from public.escrows where id = escrow_id for update;
  if e.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if e.payer_id <> payer_user then
    return jsonb_build_object('status', 'wrong_state', 'state', e.state);
  end if;
  if e.state in ('RELEASED', 'REFUNDED', 'RESOLVED') then
    return jsonb_build_object('status', 'duplicate', 'state', e.state, 'amount_minor', e.amount_minor);
  end if;
  if e.state not in ('HELD', 'RELEASE_REQUESTED') then
    return jsonb_build_object('status', 'wrong_state', 'state', e.state);
  end if;

  outcome := private.escrow_settle(
    e.id, 'refund', 'REFUNDED', null,
    coalesce(note, 'Refunded by the platform.')
  );
  if outcome ->> 'status' <> 'ok' then
    return outcome;
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'state', 'REFUNDED',
    'amount_minor', (outcome ->> 'net_minor')::bigint
  );
end;
$$;

comment on function public.escrow_refund is
  'Credit the payer back and take a held escrow to REFUNDED. No commission is taken on a refund. Service role only.';

/*
 * Opening the row these three legs act on.
 *
 * The wallet layer holds money against an escrow that already exists, so
 * something has to create it, and it must not be a browser insert: there is no
 * insert policy on public.escrows and there is not going to be one.
 */
create or replace function public.escrow_open(
  payer_user uuid,
  payee_user uuid,
  listing uuid,
  purpose public.escrow_purpose,
  amount bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

  insert into public.escrows (payer_id, payee_id, listing_id, purpose, amount_minor)
  values (payer_user, payee_user, listing, purpose, amount)
  returning id into new_id;

  return jsonb_build_object(
    'status', 'ok', 'escrow_id', new_id, 'state', 'INITIATED', 'amount_minor', amount
  );
end;
$$;

comment on function public.escrow_open is
  'Create an escrow in INITIATED with no money moved. Service role only, because public.escrows has no insert policy and will not get one.';

revoke all on function public.escrow_hold(uuid, uuid, bigint, text, text) from public, anon, authenticated;
revoke all on function public.escrow_release(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.escrow_refund(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.escrow_open(uuid, uuid, uuid, public.escrow_purpose, bigint)
  from public, anon, authenticated;

grant execute on function public.escrow_hold(uuid, uuid, bigint, text, text) to service_role;
grant execute on function public.escrow_release(uuid, uuid, text, text) to service_role;
grant execute on function public.escrow_refund(uuid, uuid, text, text) to service_role;
grant execute on function public.escrow_open(uuid, uuid, uuid, public.escrow_purpose, bigint) to service_role;

commit;
