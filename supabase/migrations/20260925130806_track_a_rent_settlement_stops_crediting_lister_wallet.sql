-- Track A, 25 September 2026. The lister's share of a rent charge now settles
-- straight to their Paystack subaccount in the same transaction. The old
-- trigger also credited it to a Vallo wallet (custody), and on a refund it
-- refused unless that wallet could cover the return, which would block a
-- card refund. Disabled, not dropped: reversible, and the full retirement is
-- the pending A.1 migration.
alter table public.ledger_entries disable trigger ledger_entries_settle_rent_to_lister;
