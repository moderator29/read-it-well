-- Tell an agent when the account their money would go to changes.
--
-- Adding or removing a payout destination is a security event, not a
-- preference: it is the exact change an attacker with a stolen session would
-- make. It follows the platform's existing shape, a private.notify call from a
-- trigger, so no application path can forget it. Kind 'agent' already exists in
-- notification_kind, so no enum work and no second migration.
--
-- The account number is deliberately reduced to its last four digits in the
-- message. A notification is a surface that can appear on a lock screen.

create function private.notify_payout_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid;
  tail        text;
begin
  select a.user_id into target_user
  from public.agents a
  where a.id = coalesce(new.agent_id, old.agent_id);

  if tg_op = 'INSERT' then
    tail := right(new.account_number, 4);
    perform private.notify(
      target_user,
      'agent',
      'Payout account added',
      new.bank_name || ' account ending ' || tail || ' was added to your earnings. If this was not you, contact support now.',
      '/agent/earnings'
    );
    return new;
  end if;

  tail := right(old.account_number, 4);
  perform private.notify(
    target_user,
    'agent',
    'Payout account removed',
    old.bank_name || ' account ending ' || tail || ' was removed from your earnings. If this was not you, contact support now.',
    '/agent/earnings'
  );
  return old;
end;
$$;

revoke execute on function private.notify_payout_account() from public, anon, authenticated;

create trigger payout_accounts_notify_after_insert
  after insert on public.payout_accounts
  for each row execute function private.notify_payout_account();

create trigger payout_accounts_notify_after_delete
  after delete on public.payout_accounts
  for each row execute function private.notify_payout_account();
