-- The ledger's direction rule did not know about escrow, and refused it.
--
-- wallet_entries_direction_chk has been in this schema since the wallet
-- migration and it does exactly the right thing: it names, for every kind of
-- entry, whether that kind is money arriving or money leaving. A deposit is a
-- credit and a withdrawal is a debit, and no code path can get that backwards
-- because the table will not hold the row.
--
-- Adding three enum values did not update it, so the first escrow hold ever
-- attempted failed with a 23514 and the whole transaction rolled back. Found by
-- running the escrow path end to end against this database before believing it
-- worked, which is the only reason this file exists rather than a support
-- ticket in three weeks.
--
-- WHICH DIRECTION EACH ONE IS, and why there is no room for opinion:
--
--   escrow_hold     DEBIT. The kobo leave the payer's spendable balance the
--                   moment the hold exists. That is what "held" has to mean, or
--                   the payer could spend the same money twice and the platform
--                   would be holding a promise rather than a sum.
--   escrow_release  CREDIT. It arrives in the payee's wallet.
--   escrow_refund   CREDIT. It arrives back in the payer's.
--
-- The constraint is dropped and recreated rather than added alongside, because
-- two overlapping direction rules on one table is how you end up with a row
-- that satisfies one and violates the other and nobody can say which is
-- authoritative. There is one rule and this is it.

begin;

alter table public.wallet_entries drop constraint wallet_entries_direction_chk;

alter table public.wallet_entries
  add constraint wallet_entries_direction_chk
  check (
    (
      kind = any (array[
        'deposit'::public.wallet_entry_kind,
        'refund'::public.wallet_entry_kind,
        'transfer_in'::public.wallet_entry_kind,
        'escrow_release'::public.wallet_entry_kind,
        'escrow_refund'::public.wallet_entry_kind
      ])
      and direction = 'credit'::public.wallet_entry_direction
    )
    or (
      kind = any (array[
        'withdrawal'::public.wallet_entry_kind,
        'payment'::public.wallet_entry_kind,
        'transfer_out'::public.wallet_entry_kind,
        'escrow_hold'::public.wallet_entry_kind
      ])
      and direction = 'debit'::public.wallet_entry_direction
    )
  );

comment on constraint wallet_entries_direction_chk on public.wallet_entries is
  'Every entry kind is either money arriving or money leaving, and the table refuses the other one. An escrow hold is a debit because the kobo genuinely leave the payer''s spendable balance; a release and a refund are credits because they land somewhere.';

commit;
