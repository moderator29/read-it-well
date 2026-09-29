-- RECOVERED FROM THE LIVE HISTORY (DB2, 2026-09-28). This migration was applied as
-- version 20260924101149 but never committed. Everything below this header is
-- supabase_migrations.schema_migrations.statements[1] for that version,
-- byte for byte (md5 checked against the live row). Do not edit.

-- A4 PAYOUT GATE: bank withdrawals are closed in the database, not only in words.
--
-- lib/wallet/bank-payouts.ts has said BANK_PAYOUTS_OPEN = false since MON-04,
-- and every sentence a person reads follows it, but nothing refused the money.
-- public.hold_wallet_withdrawal placed the PENDING debit that a Paystack
-- transfer then paid out, to any account number, with the holder's name never
-- matched to the member. The app now refuses in `withdraw`; this refuses in
-- the ledger, so no caller that skips the app (the service role included) can
-- place a withdrawal hold while payouts are closed.
--
-- The switch is a row in a private table: closed by default, a missing row
-- reads as closed, and no API role can read or write it. Opening bank payouts
-- is a migration that sets `is_open`, and it must land together with the
-- account-name match on the payout path (D-02) and the app switch.
--
-- The gate is a BEFORE INSERT trigger on wallet_entries for a new
-- withdrawal debit, which is the only thing a bank payout starts from:
-- public.hold_wallet_withdrawal is the only writer of that row. Settling,
-- failing, expiring or reversing an existing withdrawal is an UPDATE or a
-- refund credit and is untouched, so reconciliation and the stale-hold sweep
-- keep working on the one historical row. Agent earnings are recorded, not
-- paid out, and wallet-to-wallet transfers are other kinds; neither is affected.

create table if not exists private.platform_switches (
  name       text primary key check (name ~ '^[a-z][a-z_]*$'),
  is_open    boolean not null default false,
  changed_at timestamptz not null default now(),
  note       text
);

revoke all on table private.platform_switches from public, anon, authenticated, service_role;

insert into private.platform_switches (name, is_open, note)
values ('bank_payouts', false,
        'Closed until Paystack transfers work and the payout path matches the account name to the member (D-02). Open by migration, together with BANK_PAYOUTS_OPEN.')
on conflict (name) do nothing;

create or replace function private.bank_payouts_open()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select s.is_open from private.platform_switches s where s.name = 'bank_payouts'), false)
$$;

revoke all on function private.bank_payouts_open() from public, anon, authenticated, service_role;

create or replace function private.refuse_withdrawal_while_payouts_closed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind::text = 'withdrawal' and new.direction::text = 'debit'
     and not private.bank_payouts_open() then
    raise exception 'Withdrawal to a bank account is not available yet.'
      using errcode = 'RM051',
            hint = 'Bank payouts are closed (private.platform_switches, bank_payouts).';
  end if;
  return new;
end;
$$;

revoke all on function private.refuse_withdrawal_while_payouts_closed() from public, anon, authenticated, service_role;

drop trigger if exists wallet_entries_00_payouts_closed on public.wallet_entries;
create trigger wallet_entries_00_payouts_closed
  before insert on public.wallet_entries
  for each row execute function private.refuse_withdrawal_while_payouts_closed();