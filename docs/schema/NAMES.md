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

There are six tables that record money. Each answers one question. None of them is a copy of another.

| Table | Authoritative for | Written by |
|---|---|---|
| `wallet_entries` | **a member's wallet balance.** The append-only wallet ledger: integer kobo, `direction` says which way, and only `COMPLETED` entries count. | the service role and definer functions only |
| `escrows` | **money held between two people** (a rent deposit, a purchase deposit), with its state machine enforced by a trigger. | locking `SECURITY DEFINER` functions only |
| `escrow_float_snapshots` | **the total held in escrow on a day**, booked once a day as a liability. It is a report, never a balance to pay from. | the daily job |
| `platform_revenue` | **commission Vallo collected when an escrow settles.** Not a wallet, and escrowed money itself never appears here. | `escrow_settle`, `escrow_reverse_ruling` |
| `transactions` | **each payment against a booking**, by card or from the wallet. | `settle_booking_charge` (card), `pay_booking_from_wallet` |
| `ledger_entries` | **the split of each settled charge** into platform, agent and processor shares, for bookings and rent. | `settle_booking_charge`, `pay_booking_from_wallet`, `settle_rent_charge_to_lister`, the refund functions |

Where they meet:
- A stay paid by card or from the wallet writes one `transactions` row (the payment) and `ledger_entries` (its split), and moves `wallet_entries` for whoever is credited or debited.
- A rent charge settled to the lister writes `ledger_entries` and `wallet_entries`.
- An escrow that settles moves `wallet_entries` and books the commission in `platform_revenue`.

Which table to read:
- What a member holds: `wallet_entries`.
- What one booking charge came to and how it split: `transactions` and `ledger_entries`.
- What Vallo earned on escrows: `platform_revenue`. Booking fees are the platform share in `ledger_entries`.
- What Vallo is holding for others: `escrows`, or `escrow_float_snapshots` for the daily total.

(Checked against the live function bodies on 24 September 2026.)
