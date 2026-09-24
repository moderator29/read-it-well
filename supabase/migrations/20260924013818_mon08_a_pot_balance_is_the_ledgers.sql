-- MON-08, stage A (safe with the deployed code): a pot's balance is what the
-- ledger says, pot_hold minus pot_release for that pot in its owner's wallet.
--
-- wallet_pots.balance_minor was a stored copy written beside each pot entry,
-- and nothing compared the two. This adds the derived balance and makes it the
-- source of truth:
--   1. private.pot_balance_minor(pot): COMPLETED pot_hold debits minus
--      COMPLETED pot_release credits tagged with the pot, in the owner's wallet.
--   2. public.wallet_pot_balances: the member's pots with that derived balance,
--      a security_invoker view, so wallet_pots' own RLS decides which rows a
--      member sees. The release reads this instead of the column.
--   3. move_out_of_pot decides "insufficient" on the derived balance, not the
--      stored one.
-- The column is still written, because the deployed code reads it. Stage B
-- (after the release) drops it.

create or replace function private.pot_balance_minor(p_pot uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(case when e.kind = 'pot_hold' then e.amount_minor else -e.amount_minor end), 0)::bigint
    from public.wallet_pots p
    join public.wallets w on w.user_id = p.user_id
    join public.wallet_entries e on e.wallet_id = w.id
   where p.id = p_pot
     and e.status = 'COMPLETED'
     and e.kind in ('pot_hold', 'pot_release')
     and (e.metadata ->> 'pot_id') = p_pot::text
     -- An API caller learns only its own pots' balances (or any, as staff);
     -- definer callers (the purge, the pot doors) are not API callers.
     and (coalesce(current_setting('role', true), 'none') not in ('authenticated', 'anon')
          or p.user_id = (select auth.uid())
          or private.has_role((select auth.uid()), 'admin'::public.app_role)
          or private.has_role((select auth.uid()), 'super_admin'::public.app_role));
$$;
revoke all on function private.pot_balance_minor(uuid) from public, anon;
-- The view below calls it as the member; the rows it is asked about are
-- already limited to the member's own pots by wallet_pots' RLS.
grant execute on function private.pot_balance_minor(uuid) to authenticated, service_role;

create or replace view public.wallet_pot_balances
with (security_invoker = true)
as
select p.id, p.user_id, p.name, p.target_minor, p.created_at, p.archived_at,
       private.pot_balance_minor(p.id) as balance_minor
  from public.wallet_pots p;
revoke all on public.wallet_pot_balances from public, anon;
grant select on public.wallet_pot_balances to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.move_out_of_pot(owner_user uuid, pot uuid, amount bigint, move_reference text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  target_wallet uuid;
  pot_row       public.wallet_pots%rowtype;
  in_pot        bigint;
begin
  if amount is null or amount <= 0 then
    return jsonb_build_object('status', 'bad_amount', 'pot_minor', 0);
  end if;

  select w.id into target_wallet
  from public.wallets w
  where w.user_id = owner_user
  for update;

  if target_wallet is null then
    return jsonb_build_object('status', 'no_wallet', 'pot_minor', 0);
  end if;

  select p.* into pot_row
  from public.wallet_pots p
  where p.id = pot and p.user_id = owner_user
  for update;

  if pot_row.id is null then
    return jsonb_build_object('status', 'no_pot', 'pot_minor', 0);
  end if;

  -- MON-08. What the ledger holds for this pot, under the wallet lock.
  in_pot := private.pot_balance_minor(pot_row.id);
  if in_pot < amount then
    return jsonb_build_object('status', 'insufficient', 'pot_minor', in_pot);
  end if;

  begin
    insert into public.wallet_entries
      (wallet_id, kind, direction, amount_minor, reference, status, metadata)
    values
      (target_wallet, 'pot_release', 'credit', amount, move_reference, 'COMPLETED',
       jsonb_build_object('note', 'Moved out of ' || pot_row.name, 'pot_id', pot_row.id));
  exception when unique_violation then
    return jsonb_build_object('status', 'duplicate', 'pot_minor', in_pot);
  end;

  -- The stored copy, kept in step until stage B drops it.
  perform set_config('pots.moving', 'yes', true);
  update public.wallet_pots
     set balance_minor = balance_minor - amount
   where id = pot_row.id;
  perform set_config('pots.moving', '', true);

  return jsonb_build_object('status', 'ok', 'pot_minor', in_pot - amount);
end;
$function$;
