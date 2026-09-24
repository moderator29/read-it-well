-- MON-10 (with DB-06, ESC-18): the API roles hold no write on the money tables.
-- Every write to them goes through the service role or a SECURITY DEFINER
-- function (checked: no SECURITY INVOKER function in public/private writes any
-- of them, and every app write is on the service-role client). RLS becomes the
-- second wall rather than the only one. wallet_pots keeps the authenticated
-- INSERT and UPDATE its pot screens use (lib/wallet/pot-actions.ts), loses
-- DELETE, and anon loses every write on it.
revoke insert, update, delete, truncate on
  public.ledger_entries, public.wallet_entries, public.wallets, public.transactions,
  public.rent_payments, public.booking_refunds
  from anon, authenticated;
revoke insert, update, delete, truncate on public.wallet_pots from anon;
revoke delete, truncate on public.wallet_pots from authenticated;
-- bookings (MON-10 step 3): nothing on the deployed app updates or deletes a
-- booking through a member's or an admin's own client (every status change is
-- the service role or a definer function). INSERT stays with authenticated
-- until reserve() moves to a definer RPC (ESC-02, staged); anon never inserts.
revoke update, delete, truncate on public.bookings from anon, authenticated;
revoke insert on public.bookings from anon;

-- MON-07: spendable is computed in one place. move_into_pot kept its own copy
-- of the arithmetic (settled - pending_out), which the old guard's regex could
-- not see through the table alias.
CREATE OR REPLACE FUNCTION public.move_into_pot(owner_user uuid, pot uuid, amount bigint, move_reference text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  target_wallet uuid;
  spendable     bigint;
  pot_row       public.wallet_pots%rowtype;
begin
  if amount is null or amount <= 0 then
    return jsonb_build_object('status', 'bad_amount', 'available_minor', 0);
  end if;

  select w.id into target_wallet
  from public.wallets w
  where w.user_id = owner_user
  for update;

  if target_wallet is null then
    return jsonb_build_object('status', 'no_wallet', 'available_minor', 0);
  end if;

  select p.* into pot_row
  from public.wallet_pots p
  where p.id = pot and p.user_id = owner_user and p.archived_at is null
  for update;

  if pot_row.id is null then
    return jsonb_build_object('status', 'no_pot', 'available_minor', 0);
  end if;

  spendable := private.wallet_spendable_locked(target_wallet);

  if spendable < amount then
    return jsonb_build_object('status', 'insufficient', 'available_minor', spendable);
  end if;

  begin
    insert into public.wallet_entries
      (wallet_id, kind, direction, amount_minor, reference, status, metadata)
    values
      (target_wallet, 'pot_hold', 'debit', amount, move_reference, 'COMPLETED',
       jsonb_build_object('note', 'Moved into ' || pot_row.name, 'pot_id', pot_row.id));
  exception when unique_violation then
    return jsonb_build_object('status', 'duplicate', 'available_minor', spendable);
  end;

  perform set_config('pots.moving', 'yes', true);
  update public.wallet_pots
     set balance_minor = balance_minor + amount
   where id = pot_row.id;
  perform set_config('pots.moving', '', true);

  return jsonb_build_object('status', 'ok', 'available_minor', spendable - amount);
end;
$function$;
