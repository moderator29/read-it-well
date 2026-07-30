-- Money integrity: one atomic transfer, and the checks that prove the ledger.
--
-- The application performed a person-to-person transfer as two sequential
-- inserts with a compensating reversal if the second failed. That handles a
-- thrown error but not a process death between the two writes, which would
-- leave money debited from one wallet and never credited to the other. A
-- transfer is one fact, so it belongs in one transaction. This function is
-- that transaction: it locks the sender's wallet row, prices the spendable
-- balance inside the lock so two concurrent transfers cannot both pass the
-- last naira, and writes both legs or neither.
--
-- Spendable means COMPLETED credits minus COMPLETED debits minus PENDING
-- debits, so money already committed to an in-flight withdrawal cannot be
-- transferred away while the bank settles.
--
-- The reconciliation helpers alongside it exist because a derived-balance
-- design is only as trustworthy as its invariant checks: one lists withdrawal
-- holds that have waited too long for a processor answer, and one lists any
-- wallet whose balance has gone negative, which must never happen and is a
-- bug worth waking someone for.

create function private.transfer_between_wallets(
  sender_user    uuid,
  recipient_user uuid,
  amount         bigint,
  out_reference  text,
  in_reference   text,
  note           text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_wallet    uuid;
  recipient_wallet uuid;
  settled          bigint;
  held             bigint;
begin
  if sender_user = recipient_user then
    return 'same_wallet';
  end if;
  if amount is null or amount <= 0 then
    return 'bad_amount';
  end if;

  -- Lazily ensure both wallets exist, exactly as the wallet migration intends.
  insert into public.wallets (user_id) values (sender_user)
    on conflict (user_id) do nothing;
  insert into public.wallets (user_id) values (recipient_user)
    on conflict (user_id) do nothing;

  -- Lock the sender's wallet for the rest of the transaction. Every other
  -- transfer or withdrawal for this wallet queues behind this line, which is
  -- what makes the balance check below trustworthy.
  select id into sender_wallet from public.wallets
    where user_id = sender_user for update;
  select id into recipient_wallet from public.wallets
    where user_id = recipient_user;

  if sender_wallet is null or recipient_wallet is null then
    return 'no_wallet';
  end if;

  select coalesce(sum(case when direction = 'credit' then amount_minor else -amount_minor end), 0)
    into settled
    from public.wallet_entries
   where wallet_id = sender_wallet and status = 'COMPLETED';

  select coalesce(sum(amount_minor), 0)
    into held
    from public.wallet_entries
   where wallet_id = sender_wallet and status = 'PENDING' and direction = 'debit';

  if (settled - held) < amount then
    return 'insufficient';
  end if;

  -- Both legs, one transaction. A duplicate reference means this exact
  -- transfer already happened, so the whole thing is a no-op rather than a
  -- second movement of money.
  begin
    insert into public.wallet_entries
      (wallet_id, kind, direction, amount_minor, reference, status, metadata)
    values
      (sender_wallet, 'transfer_out', 'debit', amount, out_reference, 'COMPLETED',
       jsonb_build_object('counterparty_user_id', recipient_user, 'message', note)),
      (recipient_wallet, 'transfer_in', 'credit', amount, in_reference, 'COMPLETED',
       jsonb_build_object('counterparty_user_id', sender_user, 'message', note));
  exception when unique_violation then
    return 'duplicate';
  end;

  return 'ok';
end;
$$;

comment on function private.transfer_between_wallets(uuid, uuid, bigint, text, text, text) is
  'Atomic person-to-person wallet transfer. Locks the sender wallet, checks the spendable balance inside the lock, writes both ledger legs or neither.';

revoke execute on function private.transfer_between_wallets(uuid, uuid, bigint, text, text, text)
  from public, anon, authenticated;

-- Withdrawal holds still waiting on a processor answer. The service layer
-- checks each against Paystack and settles it; anything here for hours is an
-- operational problem, not a normal state.
create function private.stale_withdrawal_holds(older_than_minutes integer default 30)
returns table (reference text, wallet_id uuid, amount_minor bigint, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select e.reference, e.wallet_id, e.amount_minor, e.created_at
  from public.wallet_entries e
  where e.kind = 'withdrawal'
    and e.status = 'PENDING'
    and e.created_at < now() - make_interval(mins => older_than_minutes)
  order by e.created_at;
$$;

comment on function private.stale_withdrawal_holds(integer) is
  'Withdrawal holds with no processor outcome yet. Input to the reconciliation job.';

revoke execute on function private.stale_withdrawal_holds(integer) from public, anon, authenticated;

-- The invariant: a wallet balance can never be negative. If this returns a
-- row, a debit was posted that the ledger could not fund and it needs a human.
create function private.wallets_overdrawn()
returns table (wallet_id uuid, user_id uuid, balance_minor bigint)
language sql
security definer
set search_path = public
as $$
  select w.id, w.user_id,
         coalesce(sum(case when e.direction = 'credit' then e.amount_minor else -e.amount_minor end), 0)::bigint as balance_minor
  from public.wallets w
  left join public.wallet_entries e
    on e.wallet_id = w.id and e.status = 'COMPLETED'
  group by w.id, w.user_id
  having coalesce(sum(case when e.direction = 'credit' then e.amount_minor else -e.amount_minor end), 0) < 0;
$$;

comment on function private.wallets_overdrawn() is
  'Wallets whose derived balance is negative. Must always be empty; a row here is a bug.';

revoke execute on function private.wallets_overdrawn() from public, anon, authenticated;

-- Notification retention: read notifications older than the given age are
-- noise. Unread ones are never touched, however old, because an unread
-- notification is still an unanswered message to the user.
create function private.prune_read_notifications(older_than_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from public.notifications
  where read_at is not null
    and read_at < now() - make_interval(days => older_than_days);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

comment on function private.prune_read_notifications(integer) is
  'Deletes notifications the user has already read and that are older than the given age. Never deletes unread rows.';

revoke execute on function private.prune_read_notifications(integer) from public, anon, authenticated;
