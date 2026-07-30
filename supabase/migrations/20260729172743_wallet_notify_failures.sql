-- Wallet fan-out: failures deserve a voice too.
--
-- The original trigger only spoke when an entry reached COMPLETED, so a
-- withdrawal whose bank transfer failed or reversed settled silently: the
-- money quietly reappeared in the balance with no explanation. Now every
-- terminal transition tells the owner what happened in plain language. The
-- release of a failed hold is good news told honestly: the money stays in
-- the wallet.

create or replace function private.notify_wallet_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_user uuid;
  amount_txt text;
begin
  select w.user_id into owner_user from public.wallets w where w.id = new.wallet_id;
  amount_txt := 'NGN ' || to_char((new.amount_minor::numeric) / 100, 'FM999,999,999,990.00');

  if (tg_op = 'INSERT' and new.status = 'COMPLETED')
     or (tg_op = 'UPDATE' and new.status = 'COMPLETED' and old.status is distinct from new.status) then
    if new.direction = 'credit' then
      perform private.notify(owner_user, 'wallet', 'Wallet credited',
        amount_txt || ' has landed in your wallet.', '/wallet');
    else
      perform private.notify(owner_user, 'wallet', 'Wallet debited',
        amount_txt || ' has left your wallet.', '/wallet');
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if new.status = 'FAILED' and new.kind = 'withdrawal' then
      perform private.notify(owner_user, 'wallet', 'Withdrawal could not complete',
        'Your withdrawal of ' || amount_txt || ' did not go through. The money stays in your wallet.',
        '/wallet');
    elsif new.status = 'REVERSED' then
      if new.direction = 'debit' then
        perform private.notify(owner_user, 'wallet', 'Transaction reversed',
          amount_txt || ' has been returned to your wallet.', '/wallet');
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function private.notify_wallet_entry() from public, anon, authenticated;
