/*
 * SAVINGS POTS, PART ONE: THE TWO WORDS THE LEDGER NEEDS.
 *
 * A pot is money the owner has set aside inside their own wallet - rent money,
 * house money - so that spending against it takes a deliberate act. It is not a
 * product, it earns nothing, and no part of this platform promises a return.
 * See the second migration for the table and the locking functions.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS ITS OWN MIGRATION AND CONTAINS NOTHING ELSE.
 *
 * `alter type ... add value` cannot be used in the same transaction that adds
 * it. Postgres will accept the ADD, and then reject the first statement that
 * references the new label with "unsafe use of new value of enum type". Every
 * Supabase migration runs in a transaction, so an enum value and the function
 * that writes it must be two files. Putting anything else in here guarantees
 * somebody later adds a third thing and spends an afternoon on that error.
 *
 * ---------------------------------------------------------------------------
 * WHY TWO KINDS RATHER THAN REUSING transfer_out / transfer_in.
 *
 * A transfer means money left for somebody else. Money moved into a pot has
 * not left the wallet at all - it is the same person's money, one step further
 * from being spent - and a statement that calls it a transfer is a statement
 * that lies to the person reading it about where their money went.
 *
 * They are named for the escrow pair they behave like: a hold takes money out
 * of spendable, a release puts it back.
 */

alter type public.wallet_entry_kind add value if not exists 'pot_hold';
alter type public.wallet_entry_kind add value if not exists 'pot_release';
