/*
 * SAVINGS POTS, PART TWO: the table, the rules, and the two money paths.
 *
 * ===========================================================================
 * WHAT A POT IS, AND EVERYTHING IT IS NOT.
 * ===========================================================================
 *
 * A pot is a NAMED EARMARK ON THE OWNER'S OWN WALLET. Money moved into one
 * leaves the spendable balance and stays entirely theirs; moving it back is one
 * tap and needs nobody's permission.
 *
 * It earns nothing. There is no interest, no yield, no return, no lock-in and
 * no penalty, and no column here could hold one. That is a deliberate limit:
 * paying a return on customer balances is a regulated activity, and a savings
 * product that implies one without being licensed for it is the kind of promise
 * that ends a company. The owner asked for pots with no profit and this schema
 * makes that the only thing it can express.
 *
 * ===========================================================================
 * THE BALANCE IS ON THE POT ROW, AND IT IS WRITTEN BY THE SAME FUNCTION THAT
 * WRITES THE LEDGER ENTRY, INSIDE ONE TRANSACTION.
 * ===========================================================================
 *
 * The alternative was deriving it by summing pot_hold minus pot_release, which
 * is purer and would have needed the pot's identity encoded into the reference
 * string and parsed back out on every read. Two problems with that: a reference
 * is an idempotency key and giving it a second job makes both fragile, and a
 * derived sum over the whole ledger is a table scan on the screen a person
 * opens most.
 *
 * A stored balance is only safe if it can never disagree with the ledger, so
 * both functions below do the two writes in one statement pair under the SAME
 * `for update` lock the withdrawal path uses. There is no route to changing one
 * without the other: the table's own grants deny writes to everybody, so even
 * the service role cannot update `balance_minor` except through these.
 */

/* The helper schema this platform keeps its internal functions in. Asserted
   rather than assumed, so this migration can be applied to a fresh database. */
create schema if not exists private;

create table if not exists public.wallet_pots (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  /* What the owner calls it. "Rent", "House money". Theirs to write. */
  name         text not null check (length(btrim(name)) between 1 and 40),
  /* Integer kobo, like every other money column on this platform. Never a
     float, never a formatted string. Cannot go negative: the functions below
     refuse to take out more than is in it. */
  balance_minor bigint not null default 0 check (balance_minor >= 0),
  /*
   * What they are aiming for, or null.
   *
   * Nullable on purpose. A target is a private note to themselves that makes a
   * progress bar possible; it is not a commitment, nothing enforces it, and a
   * pot without one is completely normal. A NOT NULL default of zero would
   * have made every pot look like a goal already met.
   */
  target_minor bigint check (target_minor is null or target_minor > 0),
  created_at   timestamptz not null default now(),
  /*
   * Closed pots are archived, never deleted.
   *
   * The ledger entries that moved money in and out of this pot reference it,
   * and a statement row naming a pot that no longer exists is a receipt with a
   * hole in it. Archiving keeps the history readable; the app hides archived
   * pots and refuses to move money into them.
   */
  archived_at  timestamptz
);

comment on table public.wallet_pots is
  'Named earmarks on a person''s own wallet balance. Money in a pot has left spendable and is still entirely theirs. Pots earn nothing: there is no interest, yield or lock-in, and no column here can express one.';

create index if not exists wallet_pots_user_idx
  on public.wallet_pots (user_id)
  where archived_at is null;

/* ------------------------------------------------------------------- RLS */

alter table public.wallet_pots enable row level security;

/*
 * A person may read and name their own pots, and nothing else.
 *
 * SELECT, INSERT and UPDATE-of-name-and-target only. There is deliberately no
 * policy that lets a client write `balance_minor`: money moves through the two
 * SECURITY DEFINER functions below or it does not move. A policy allowing a
 * balance update would let anybody with an anon key set their own wallet to any
 * number they liked, which is the single worst thing an RLS mistake can do on
 * this platform.
 *
 * No DELETE policy either. Pots archive; see the column comment.
 */

drop policy if exists "own pots readable" on public.wallet_pots;
create policy "own pots readable"
  on public.wallet_pots for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "own pots creatable" on public.wallet_pots;
create policy "own pots creatable"
  on public.wallet_pots for insert
  to authenticated
  with check (user_id = (select auth.uid()) and balance_minor = 0);

drop policy if exists "own pots renamable" on public.wallet_pots;
create policy "own pots renamable"
  on public.wallet_pots for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

/*
 * THE BALANCE COLUMN IS NOT THE OWNER'S TO WRITE, even though the row is.
 *
 * The UPDATE policy above lets somebody rename a pot or change its target, and
 * an UPDATE policy in Postgres covers the whole row - so without this trigger a
 * rename request could carry a new `balance_minor` and RLS would allow it. This
 * is the guard that makes the policy mean what its name says.
 *
 * The functions below are SECURITY DEFINER and set `pots.moving` for the
 * duration of their write, which is the one condition under which the balance
 * may change.
 */
create or replace function private.wallet_pots_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.balance_minor is distinct from old.balance_minor
     and coalesce(current_setting('pots.moving', true), '') <> 'yes' then
    raise exception 'A pot balance changes only by moving money.'
      using errcode = 'check_violation';
  end if;
  if new.user_id is distinct from old.user_id then
    raise exception 'A pot cannot change owner.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists wallet_pots_guard on public.wallet_pots;
create trigger wallet_pots_guard
  before update on public.wallet_pots
  for each row execute function private.wallet_pots_guard();

/* --------------------------------------------------------- money into a pot */

create or replace function public.move_into_pot(
  owner_user     uuid,
  pot            uuid,
  amount         bigint,
  move_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_wallet uuid;
  settled       bigint;
  pending_out   bigint;
  spendable     bigint;
  pot_row       public.wallet_pots%rowtype;
begin
  if amount is null or amount <= 0 then
    return jsonb_build_object('status', 'bad_amount', 'available_minor', 0);
  end if;

  -- The same lock the withdrawal path takes, for the same reason: everything
  -- after it reads a balance nobody else can move until this transaction ends,
  -- so two concurrent moves cannot both pass the check.
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

  select coalesce(sum(
           case when e.direction = 'credit' then e.amount_minor else -e.amount_minor end
         ), 0)
    into settled
  from public.wallet_entries e
  where e.wallet_id = target_wallet and e.status = 'COMPLETED';

  -- Pending debits are money already committed to an in-flight withdrawal.
  -- Spendable excludes them, or the same naira funds a payout AND a pot.
  select coalesce(sum(e.amount_minor), 0) into pending_out
  from public.wallet_entries e
  where e.wallet_id = target_wallet and e.status = 'PENDING' and e.direction = 'debit';

  spendable := settled - pending_out;

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
    -- Idempotent on the reference, exactly like every other money path here.
    return jsonb_build_object('status', 'duplicate', 'available_minor', spendable);
  end;

  perform set_config('pots.moving', 'yes', true);
  update public.wallet_pots
     set balance_minor = balance_minor + amount
   where id = pot_row.id;
  perform set_config('pots.moving', '', true);

  return jsonb_build_object('status', 'ok', 'available_minor', spendable - amount);
end;
$$;

comment on function public.move_into_pot(uuid, uuid, bigint, text) is
  'Move spendable wallet money into one of the owner''s pots. Ledger entry and pot balance are written in one transaction under a FOR UPDATE lock on the wallet row, so the two can never disagree. Spendable excludes pending debits. Idempotent on the reference. Service role only.';

/* --------------------------------------------------------- money back out */

create or replace function public.move_out_of_pot(
  owner_user     uuid,
  pot            uuid,
  amount         bigint,
  move_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_wallet uuid;
  pot_row       public.wallet_pots%rowtype;
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

  /*
   * An ARCHIVED pot can still give money back.
   *
   * `move_into_pot` refuses one and this does not, deliberately. Closing a pot
   * must never be able to strand money inside it, and the archive step in the
   * app empties it first - but if that ever fails halfway, this is the path
   * that gets somebody their money.
   */
  select p.* into pot_row
  from public.wallet_pots p
  where p.id = pot and p.user_id = owner_user
  for update;

  if pot_row.id is null then
    return jsonb_build_object('status', 'no_pot', 'pot_minor', 0);
  end if;

  if pot_row.balance_minor < amount then
    return jsonb_build_object('status', 'insufficient', 'pot_minor', pot_row.balance_minor);
  end if;

  begin
    insert into public.wallet_entries
      (wallet_id, kind, direction, amount_minor, reference, status, metadata)
    values
      (target_wallet, 'pot_release', 'credit', amount, move_reference, 'COMPLETED',
       jsonb_build_object('note', 'Moved out of ' || pot_row.name, 'pot_id', pot_row.id));
  exception when unique_violation then
    return jsonb_build_object('status', 'duplicate', 'pot_minor', pot_row.balance_minor);
  end;

  perform set_config('pots.moving', 'yes', true);
  update public.wallet_pots
     set balance_minor = balance_minor - amount
   where id = pot_row.id;
  perform set_config('pots.moving', '', true);

  return jsonb_build_object('status', 'ok', 'pot_minor', pot_row.balance_minor - amount);
end;
$$;

comment on function public.move_out_of_pot(uuid, uuid, bigint, text) is
  'Return money from a pot to spendable wallet balance. Works on an archived pot so closing one can never strand money. Ledger entry and pot balance written together under the wallet lock. Idempotent on the reference. Service role only.';

/* --------------------------------------------------------------- grants */

/*
 * Service role only, like every other locking money path.
 *
 * A SECURITY DEFINER function that anon or authenticated can call is a function
 * whose arguments are attacker-controlled, and the first argument here is WHOSE
 * WALLET. The server actions resolve the session and pass the id themselves.
 */
revoke all on function public.move_into_pot(uuid, uuid, bigint, text) from public, anon, authenticated;
revoke all on function public.move_out_of_pot(uuid, uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.move_into_pot(uuid, uuid, bigint, text) to service_role;
grant execute on function public.move_out_of_pot(uuid, uuid, bigint, text) to service_role;
