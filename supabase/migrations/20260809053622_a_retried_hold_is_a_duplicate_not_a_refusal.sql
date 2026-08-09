-- A retried hold was reported as a refusal, which is the wrong word for it.
--
-- public.escrow_hold checked the escrow state before it touched the ledger, so
-- a caller retrying a hold that had already succeeded got `wrong_state`: the
-- escrow is HELD, and HELD is not a state a hold is legal from. Every word of
-- that is true and the answer is still wrong, because lib/wallet/escrow.ts
-- reads the two differently. `duplicate` means the money is where it should be
-- and this call changed nothing. `wrong_state` means the caller asked for
-- something that cannot happen, which is the kind of thing a flow responds to
-- by opening a second escrow.
--
-- A dropped response on a mobile connection in Lagos is not an exotic case, it
-- is the normal one, and the retry that follows it must be told the truth: this
-- exact leg, keyed on this exact reference, already posted.
--
-- The test is the reference rather than the state, because the reference is
-- what idempotency actually rests on. If a wallet entry with this hold's
-- reference exists, this leg has run, whatever the escrow has done since.

begin;

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

  -- Asked and answered. Checked BEFORE the state, because a hold that posted
  -- and then released is still a hold that posted, and the caller retrying it
  -- needs to hear that rather than a refusal it might respond to by opening a
  -- second escrow.
  if exists (select 1 from public.wallet_entries w where w.reference = hold_reference) then
    return jsonb_build_object('status', 'duplicate', 'state', e.state, 'amount_minor', e.amount_minor);
  end if;

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
    -- The belt to the check above's braces: two retries racing each other.
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

commit;
