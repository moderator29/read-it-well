-- V-33: two ledger kinds for rent that settles to the lister at the moment of
-- charge. Added alone, because a new enum value cannot be used in the same
-- transaction that adds it (the rule in docs/wallet/SAVINGS_POTS.md).
--
--   payment_in         credit  a tenant's move-in payment arriving in the
--                              lister's wallet, written under the same
--                              transaction as the charge
--   payment_in_return  debit   the same money leaving the lister's wallet
--                              again because support refunded the tenant
alter type public.wallet_entry_kind add value if not exists 'payment_in';
alter type public.wallet_entry_kind add value if not exists 'payment_in_return';
