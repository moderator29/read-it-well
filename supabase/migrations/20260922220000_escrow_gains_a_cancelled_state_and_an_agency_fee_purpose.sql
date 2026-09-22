/*
 * F-5 and 5.2: the two enum values escrow cannot work without.
 *
 * WHY THIS IS A MIGRATION OF ITS OWN. `alter type ... add value` may run
 * inside a transaction block on Postgres 12 and later, but the new label
 * cannot be USED in that same transaction. `private.escrow_transition_is_legal`
 * is `language sql`, so its body is parsed when it is created and a
 * 'CANCELLED' literal in it would fail against an uncommitted label. Every
 * function that needs these two labels therefore lives in the migration after
 * this one.
 *
 * CANCELLED. Today an escrow opened by `escrow_open` and never funded has
 * nowhere to go. A declined proposal is the ordinary case, not an edge, and
 * the product cannot ship a proposal it is impossible to decline.
 *
 * agency_fee. The verdict in `docs/research/ESCROW_END_TO_END_RESEARCH.md`
 * part 3 is that the agency fee is the transaction escrow is actually for.
 * The three older labels cannot be removed, because Postgres has no
 * `drop value`. They are refused in the opening door instead, by name, and
 * the refusal is the next migration's job.
 */

alter type public.escrow_state add value if not exists 'CANCELLED' after 'RESOLVED';
alter type public.escrow_purpose add value if not exists 'agency_fee' after 'purchase_balance';
