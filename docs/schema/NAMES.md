# Schema names that mislead, and what they actually hold

Some schema names say something other than what the column or table holds. Renaming a live table or column breaks the deployed app and every migration that mentions it, so the names stay and this page states the truth. `lib/db/schema-names-doc.test.ts` checks every claim here against `supabase/migrations` and the generated `database.types.ts`, so this page cannot drift silently.

## Names that say the wrong thing

| Name | What it sounds like | What it is |
|---|---|---|
| `conversations.agent_id` | an `agents.id`, like every other `agent_id` in the schema | **an auth user id** (`auth.users.id`) of the host side of the thread: the lister's user, the host's user, or a business owner. The foreign key is `conversations_agent_id_fkey → auth.users(id)`. Look the agent row up by `agents.user_id`, never by `agents.id`. |
| `agents` (table) | licensed agents only | everyone who lists supply: `agents.role` is `agent` **or `owner`** (a landlord listing their own place). Whether the person is acting as agent or owner on one listing is `listings.listing_role`. |
| `listing_status` (enum) | the status of a listing | the lifecycle status of **five** tables: `listings`, `businesses`, `catalogue_entries`, `accommodations`, `room_types`. A value such as `PUBLISHED` means "live to guests" in each. It does not mean the row is a listing. |
| `booking_status` (enum) | the status of a stay booking | also the status of restaurant **`reservations`**, and the `from_status` / `to_status` of `booking_state_events`. |
| migration file names | an object name you can grep for | a sentence describing the change (for example `…_a_column_called_price_per_night_that_held_annual_rent.sql`). Grep the SQL inside the file for an object, not the file name. |

## The money tables: which one is authoritative for what

Twelve tables carry an amount of money in a `*_minor` column. Most record one step of one flow. Only the first two answer "what does somebody have".

| Table | Authoritative for | Written by |
|---|---|---|
| `wallet_entries` | **a member's wallet balance, and each pot's balance.** The append-only ledger: integer kobo, `direction` says which way, only `COMPLETED` entries count. A pot's balance is `private.pot_balance_minor(pot)`, summed from these entries. | `pay_booking_from_wallet`, `settle_booking_charge`, `settle_rent_charge_to_lister`, `refund_booking_payment`, `refund_and_cancel_booking`, `hold_wallet_withdrawal`, `transfer_between_wallets`, `move_into_pot`, `move_out_of_pot`, the escrow functions |
| `escrows` | **money held between two people**, with its state machine enforced by a trigger. | the escrow functions only |
| `wallet_pots` | the pots a member made (name, target). **Its `balance_minor` column is not the balance**; it is being retired, and the balance is read from `wallet_entries` as above. | the app creates pots (`lib/wallet/pot-actions.ts`) |
| `transactions` | **each payment attempt against a booking**, by card or from the wallet, and whether it succeeded. | the app inserts a card attempt as PENDING (`lib/bookings/checkout.ts`) and marks it FAILED (`lib/bookings/settlement.ts`); `settle_booking_charge` and `pay_booking_from_wallet` record success |
| `ledger_entries` | **the split of each settled charge** into platform, agent and processor shares. | `settle_booking_charge`, `pay_booking_from_wallet`, `refund_booking_payment`, `refund_and_cancel_booking` |
| `booking_refunds` | refunds against a booking. | `refund_booking_payment`, `refund_and_cancel_booking` |
| `rent_payments` | a move-in charge and its parts (rent, caution, fees). | `open_rent_charge` |
| `rent_refunds_owed` | what a lister owes back on a refunded rent charge. | `settle_rent_charge_to_lister`, `rent_refund_shortfall` |
| `escrow_rulings` | an admin's ruling on a disputed escrow. | `escrow_admin_resolve`, `escrow_reverse_ruling` |
| `escrow_float_snapshots` | **the total held in escrow on a day**, booked as a liability. A report, never a balance. | `escrow_float_snapshot_take` |
| `platform_revenue` | **commission Vallo collected when an escrow settles.** | `escrow_settle` |
| `escrow_evidence` | the evidence filed in a dispute (it carries a disputed amount, not a movement). | `escrow_file_evidence_as` |

How a rent payment settles, the way round it actually happens:
1. `open_rent_charge` opens a one-night booking for the move-in total and a `rent_payments` row.
2. The booking is paid like any stay (card or wallet), which writes `transactions` and a `ledger_entries` row.
3. The AFTER INSERT trigger `ledger_entries_settle_rent_to_lister` runs `settle_rent_charge_to_lister`, which credits the lister in `wallet_entries`.

Which table to read:
- What a member holds, in the wallet or in a pot: `wallet_entries`.
- What one booking charge came to and how it split: `transactions` and `ledger_entries`.
- What Vallo earned: the platform share in `ledger_entries`, plus `platform_revenue` for escrows.
- What Vallo is holding for others: `escrows`, or `escrow_float_snapshots` for the daily total.

(Checked against the live function bodies and triggers on 24 September 2026, and by `lib/db/schema-names-doc.test.ts` against the migrations.)
