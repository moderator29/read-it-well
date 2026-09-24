-- Revert of m12b's column drop. A production read still selects
-- wallet_pots.balance_minor (GET /rest/v1/wallet_pots?select=...balance_minor
-- returned 400 at 07:09:12 UTC). No pot exists yet, so the column comes back
-- at 0 with no balance lost. The m12b functions stay: none reads the column.
alter table public.wallet_pots add column if not exists balance_minor bigint not null default 0;
notify pgrst, 'reload schema';
