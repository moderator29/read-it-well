-- Payout account integrity, ahead of the first writer.
--
-- public.payout_accounts has had RLS and a correct owner policy since
-- agents_core and no application code at all, so nothing has ever enforced the
-- two invariants the table implies: an agent should not file the same account
-- twice, and "is_default" should mean exactly one row. Both are cheap now and
-- expensive once real payout rows exist.
--
-- The invariants live in the database rather than in the action, because two
-- taps from one agent can interleave and an action cannot serialise them.

-- The same NUBAN filed twice for one agent is a mistake every time.
alter table public.payout_accounts
  add constraint payout_accounts_agent_number_uq unique (agent_id, account_number);

-- At most one default per agent, enforced rather than assumed.
create unique index payout_accounts_one_default_idx
  on public.payout_accounts (agent_id)
  where is_default;

-- Keep the default single, and make the first account an agent files the
-- default automatically so there is never a payout target of "none" while a
-- row exists.
--
-- No recursion risk: the inner update writes is_default = false, which re-fires
-- this trigger with new.is_default false, so the branch that updates is skipped.
create function private.payout_accounts_single_default()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if not exists (
      select 1 from public.payout_accounts p where p.agent_id = new.agent_id
    ) then
      new.is_default := true;
    end if;
  end if;

  if new.is_default then
    update public.payout_accounts
       set is_default = false
     where agent_id = new.agent_id
       and id <> new.id
       and is_default;
  end if;

  return new;
end;
$$;

revoke execute on function private.payout_accounts_single_default() from public, anon, authenticated;

create trigger payout_accounts_single_default_before_write
  before insert or update on public.payout_accounts
  for each row execute function private.payout_accounts_single_default();

-- Removing the default promotes the most recent survivor, so an agent who
-- deletes the account they were being paid into still has one.
create function private.payout_accounts_promote_default()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_default then
    update public.payout_accounts
       set is_default = true
     where id = (
       select p.id
       from public.payout_accounts p
       where p.agent_id = old.agent_id
       order by p.created_at desc
       limit 1
     );
  end if;
  return old;
end;
$$;

revoke execute on function private.payout_accounts_promote_default() from public, anon, authenticated;

create trigger payout_accounts_promote_default_after_delete
  after delete on public.payout_accounts
  for each row execute function private.payout_accounts_promote_default();
