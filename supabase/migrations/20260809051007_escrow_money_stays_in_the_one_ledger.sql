-- Three new wallet_entry_kind values, alone in this file, on purpose.
--
-- Escrow moves real money and it has to move it through public.wallet_entries,
-- the ledger this platform already has. The alternative is a second table of
-- balances that shadows the first, and a shadow ledger is how a marketplace
-- ends up unable to answer "how much does this person have" with one number.
-- An escrow hold is a debit that has left the payer's spendable balance and not
-- yet reached anybody; a release is the credit that lands on the other side; a
-- refund is the credit that goes back. All three are wallet movements and all
-- three belong in the ledger everything else is in.
--
-- WHY THIS FILE HOLDS NOTHING ELSE. Postgres will not let a transaction use an
-- enum value that the same transaction added, unless it also created the type.
-- Every function, constraint and default that names 'escrow_hold' therefore has
-- to be in a LATER migration than this one. Putting the three values in their
-- own file makes that ordering a fact of the filesystem rather than a rule
-- somebody has to remember.
--
-- AND THEY CAN NEVER BE REMOVED. Postgres has no DROP VALUE. Adding to an enum
-- is a one-way door, which is the reason to add exactly the three that are
-- needed and not a fourth "just in case".

alter type public.wallet_entry_kind add value if not exists 'escrow_hold';
alter type public.wallet_entry_kind add value if not exists 'escrow_release';
alter type public.wallet_entry_kind add value if not exists 'escrow_refund';
