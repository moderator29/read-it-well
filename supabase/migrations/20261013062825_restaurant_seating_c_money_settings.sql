-- Applied 13 October 2026, part of the restaurant seating migration (founder decision D).
-- Review notes: dependencies and grants were checked against the live database before applying.
set lock_timeout = '5s';

-- ============================================================ 1. the numbers
-- One row. The fee per seated guest is the founder's (1,000 naira). The
-- commission on a bill paid through Vallo is left NULL on purpose: until the
-- founder sets it, paying the bill through Vallo says "not available yet".
create table if not exists public.restaurant_money_settings (
  id boolean primary key default true check (id),
  seated_fee_minor bigint not null default 100000 check (seated_fee_minor >= 0),
  bill_commission_bps integer check (bill_commission_bps between 0 and 5000),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.restaurant_money_settings (id) values (true) on conflict (id) do nothing;
alter table public.restaurant_money_settings enable row level security;
create policy restaurant_money_settings_read on public.restaurant_money_settings
  for select to anon, authenticated using (true);
revoke all on public.restaurant_money_settings from anon, authenticated;
grant select on public.restaurant_money_settings to anon, authenticated;
