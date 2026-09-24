-- MON-08, stage B. Apply only after the release that reads
-- public.wallet_pot_balances is deployed, and after any account-deletion
-- blocker reads private.pot_balance_minor (MON-09, Agent 4) rather than the
-- column. Nothing then reads wallet_pots.balance_minor.

drop policy "own pots creatable" on public.wallet_pots;
create policy "own pots creatable" on public.wallet_pots
  for insert to authenticated
  with check (user_id = (select auth.uid()));

CREATE OR REPLACE FUNCTION private.wallet_pots_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'A pot cannot change owner.' using errcode = 'check_violation';
  end if;
  return new;
end;
$function$;

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

  return jsonb_build_object('status', 'ok', 'available_minor', spendable - amount);
end;
$function$;

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

  return jsonb_build_object('status', 'ok', 'pot_minor', in_pot - amount);
end;
$function$;

alter table public.wallet_pots drop column balance_minor;
