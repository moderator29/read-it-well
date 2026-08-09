-- Two money paths still read a balance and then wrote, in separate round trips.
--
-- transferToUser read availableBalanceMinor and then posted two ledger rows
-- through PostgREST with no transaction and no row lock. Two concurrent
-- transfers both passed the balance check and both posted. withdraw had the
-- same shape: read, then place the hold.
--
-- private.transfer_between_wallets has existed since 20260730011651, does
-- SELECT FOR UPDATE, writes both legs in one statement and handles
-- unique_violation. Nothing has ever called it, because PostgREST cannot see
-- the private schema and nobody gave it a door. That is the whole of this
-- migration for transfers: a pass-through.
--
-- Withdrawal holds had no locking function at all, so one is written here,
-- modelled on private.pay_booking_from_wallet which already does this
-- correctly.
--
-- All of these are service_role only. Money is never moved from a browser.

begin;

/* ------------------------------------------------------- transfer, wrapped */

create or replace function public.transfer_between_wallets(
  sender_user    uuid,
  recipient_user uuid,
  amount         bigint,
  out_reference  text,
  in_reference   text,
  note           text default null
)
returns text
language sql
security definer
set search_path = public
as $$
  select private.transfer_between_wallets(
    sender_user, recipient_user, amount, out_reference, in_reference, note
  );
$$;

comment on function public.transfer_between_wallets(uuid, uuid, bigint, text, text, text) is
  'Pass-through to the private function of the same name so PostgREST can reach it. Returns ok, duplicate, insufficient, same_wallet, bad_amount or no_wallet. The private implementation locks the sender wallet FOR UPDATE and writes both legs in one statement, which is what makes a concurrent pair of transfers impossible to double-spend. Service role only: money never moves from a browser.';

/* --------------------------------------------- withdrawal hold, with a lock */

create or replace function public.hold_wallet_withdrawal(
  owner_user     uuid,
  amount         bigint,
  hold_reference text,
  hold_metadata  jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_wallet uuid;
  settled       bigint;
  held          bigint;
  spendable     bigint;
begin
  if amount is null or amount <= 0 then
    return jsonb_build_object('status', 'bad_amount', 'available_minor', 0, 'wallet_id', null);
  end if;

  -- The lock. Everything after this reads a balance nobody else can move until
  -- this transaction ends, which is the entire point of the function.
  select w.id into target_wallet
  from public.wallets w
  where w.user_id = owner_user
  for update;

  if target_wallet is null then
    return jsonb_build_object('status', 'no_wallet', 'available_minor', 0, 'wallet_id', null);
  end if;

  select coalesce(sum(
           case when e.direction = 'credit' then e.amount_minor else -e.amount_minor end
         ), 0)
    into settled
  from public.wallet_entries e
  where e.wallet_id = target_wallet and e.status = 'COMPLETED';

  -- Pending debits are money already committed to an in-flight withdrawal.
  -- Spendable has to exclude them or the same naira funds two payouts.
  select coalesce(sum(e.amount_minor), 0) into held
  from public.wallet_entries e
  where e.wallet_id = target_wallet
    and e.status = 'PENDING'
    and e.direction = 'debit';

  spendable := settled - held;

  if spendable < amount then
    return jsonb_build_object(
      'status', 'insufficient',
      'available_minor', spendable,
      'wallet_id', target_wallet
    );
  end if;

  begin
    insert into public.wallet_entries
      (wallet_id, kind, direction, amount_minor, reference, status, metadata)
    values
      (target_wallet, 'withdrawal', 'debit', amount, hold_reference, 'PENDING',
       coalesce(hold_metadata, '{}'::jsonb));
  exception when unique_violation then
    -- The reference is the idempotency key. A retry is not a second hold.
    return jsonb_build_object(
      'status', 'duplicate',
      'available_minor', spendable,
      'wallet_id', target_wallet
    );
  end;

  return jsonb_build_object(
    'status', 'ok',
    'available_minor', spendable - amount,
    'wallet_id', target_wallet
  );
end;
$$;

comment on function public.hold_wallet_withdrawal(uuid, bigint, text, jsonb) is
  'Place a PENDING withdrawal debit against a wallet, with the balance read INSIDE a FOR UPDATE lock on the wallet row so two concurrent withdrawals cannot both pass the check. Spendable excludes pending debits, so money already committed to an in-flight payout cannot fund a second one. Idempotent on the reference. Service role only.';

/* ------------------------------------------- a hold whose webhook never came */

create or replace function public.expire_stale_withdrawal_holds(
  older_than_minutes integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  moved text[];
begin
  -- A PENDING hold subtracts from spendable forever, so a transfer whose
  -- webhook never lands quietly freezes the owner's money with nothing on any
  -- screen to explain it. Only PENDING rows move, so a webhook arriving mid
  -- sweep cannot be undone by this.
  with expired as (
    update public.wallet_entries e
    set status = 'FAILED',
        metadata = e.metadata || jsonb_build_object('expired_by', 'sweep')
    where e.kind = 'withdrawal'
      and e.status = 'PENDING'
      and e.created_at < now() - make_interval(mins => greatest(older_than_minutes, 1))
    returning e.reference
  )
  select coalesce(array_agg(reference), '{}') into moved from expired;

  return jsonb_build_object('expired', coalesce(array_length(moved, 1), 0), 'references', moved);
end;
$$;

comment on function public.expire_stale_withdrawal_holds(integer) is
  'Release withdrawal holds whose transfer never resolved, returning the money to spendable. Only PENDING rows move, so this cannot unpick a settled payout. The caller should verify with the processor first where it can: releasing a hold whose transfer actually paid out would hand back money that has already left.';

/* ---------------------------------------------- reads that nothing could see */

create or replace function public.stale_withdrawal_holds(older_than_minutes integer default 30)
returns table (reference text, wallet_id uuid, amount_minor bigint, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select * from private.stale_withdrawal_holds(older_than_minutes);
$$;

create or replace function public.wallets_overdrawn()
returns table (wallet_id uuid, user_id uuid, balance_minor bigint)
language sql
stable
security definer
set search_path = public
as $$
  select * from private.wallets_overdrawn();
$$;

comment on function public.wallets_overdrawn() is
  'Wallets whose derived balance is below zero. A wallet below zero is a ledger that has lost an argument with itself and it must page somebody. The private function has existed since 20260730011651 and nothing has ever called it.';

/* ------------------------------------------------------------------- grants */

revoke all on function public.transfer_between_wallets(uuid, uuid, bigint, text, text, text) from public, anon, authenticated;
revoke all on function public.hold_wallet_withdrawal(uuid, bigint, text, jsonb) from public, anon, authenticated;
revoke all on function public.expire_stale_withdrawal_holds(integer) from public, anon, authenticated;
revoke all on function public.stale_withdrawal_holds(integer) from public, anon, authenticated;
revoke all on function public.wallets_overdrawn() from public, anon, authenticated;

grant execute on function public.transfer_between_wallets(uuid, uuid, bigint, text, text, text) to service_role;
grant execute on function public.hold_wallet_withdrawal(uuid, bigint, text, jsonb) to service_role;
grant execute on function public.expire_stale_withdrawal_holds(integer) to service_role;
grant execute on function public.stale_withdrawal_holds(integer) to service_role;
grant execute on function public.wallets_overdrawn() to service_role;

commit;
