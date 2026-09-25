# How money moves on Vallo

Founder directive, 25 September 2026 (Track A). This page is the current truth. It supersedes every wallet, escrow and held-payment document, which are kept under `docs/archive/retired-custody/` only as history.

## The rule

**Vallo never holds customer money.** Vallo has:

- no wallet;
- no balance;
- no escrow;
- no held payment;
- no withdrawal.

When somebody pays, Paystack splits the charge in the same transaction:

| Share | Where it goes | How big |
|---|---|---|
| The lister's share | The owner's or agent's own Paystack subaccount, which settles to their bank account | The rest of the charge |
| The Vallo Guarantee contribution | A separate Paystack subaccount for the reserve | `money_policy.guarantee_bps`: 150 today, allowed range 100 to 200 |
| Vallo's commission | Vallo's main account | `fee_rates` commission: zero today |

The three parts always add up exactly to the charge. The `transactions` check refuses a row where they do not. The Guarantee contribution comes out of the lister's share and is never added to the price the renter or guest sees.

Every sentence a person reads about money comes from `apps/web/src/lib/money/copy.ts`: the Terms, the Privacy policy, the Disclaimer, the help centre, the assistant's prompts, the emails and the screens.

## The gate before payment

Payment opens only after an agreement is approved. The database enforces this with the `transactions_00_payment_gate` trigger and `rent_payments_00_needs_approved_agreement`.

1. **Rental.** The renter inspects and submits the inspection report: eight items, each with photographs. The minimum number of photos is `money_policy.min_inspection_photos`. `agreement_open_rent_as` then draws up the agreement from the listing's own figures and the report, including the move-in date and the handover date.
2. **Stay.** The host accepts the booking. A trigger on bookings going from PENDING to CONFIRMED draws up the agreement.
3. **Both parties confirm the same version** with `agreement_confirm_as`. An agent confirming for an owner must hold a live mandate for the listing. Any amendment (`agreement_amend_as`) moves the version, and both confirmations lapse.
4. **An admin, or staff holding the `agreements` scope, approves or rejects** with `admin_decide_agreement`. A rejection needs a reason. Nobody decides an agreement they are a party to. The decision is written to `deal_agreement_events` (append-only) and to `audit_log`. Both parties are told in the app and by email: `agreement.approved` and `agreement.rejected`.
5. **Payment opens.** `payment_split_for_booking` returns the split, and the app opens a split attempt (`lib/payments/split-attempt.ts`). Without `PAYSTACK_GUARANTEE_SUBACCOUNT`, or without a lister subaccount, nothing opens.
6. **Settlement.** `settle_booking_charge` records:
   - the transaction;
   - a `ledger_entries` row;
   - a `guarantee_reserve_entries` contribution;
   - the agreement as paid.

   Nothing is credited to any balance. A charge that cannot be applied is refunded to the card, with outcome `refund-due`.

**Vallo charges no inspection fee.** The inspection screen, the request sheet, the Terms and the Disclaimer all say so.

## Refunds

A refund goes back to the card or account that paid, through Paystack `/refund` (`lib/payments/refund.ts`). The processor's status is recorded on `booking_refunds.processor_status`.

A refund whose outcome is unknown (a timeout, a 5xx or an unreadable answer) is never recorded as failed. It stays pending, and a critical `refund.outcome_unknown` alert asks a person to check Paystack before trying again.

## The Vallo Guarantee

- **The reserve.** Contributions flow in from every settled charge. The reserve is an append-only ledger (`guarantee_reserve_entries`), and its balance is their sum.
- **Scope.** At launch it covers rentals and stays paid through Vallo, not purchases.
- **Claims.** A claim is filed from the agreement (`guarantee_claim_file_as`) with evidence, in the private `guarantee-evidence` bucket. It must be filed within `money_policy.claim_window_hours` (72) of move-in or check-in.
- **Decisions.** An admin, or staff holding the `guarantee` scope, decides each claim (`admin_decide_guarantee_claim`). The approved amount is capped by what was paid and by the reserve balance, under an advisory lock.
- **Payout.** An approved claim is paid to the claimant's bank account and recorded with `admin_mark_guarantee_claim_paid`.

## Crypto

Crypto is accepted only through Yellow Card, only in naira, and only when `YELLOWCARD_DIRECT_SETTLEMENT=confirmed`. Yellow Card must settle the naira legs straight to the lister, the reserve and Vallo.

Vallo never holds a crypto address or a crypto balance. A completed collection settles one booking. One that cannot be applied raises a critical `return_needed` alert.

## What is retired, and how it is kept retired

| Retired thing | How it is kept retired |
|---|---|
| Custody tables: wallets, wallet_entries, wallet_pots, escrows, escrow_evidence, escrow_rulings, escrow_float_snapshots | Unreachable from every app role on live (`20260925130904`). The migration that moves them into a `retired_custody` schema with no grants is in `supabase/migrations/pending/` for the founder to apply. |
| Every custody function | Execute revoked from anon, authenticated and service_role. |
| The rent-to-wallet trigger | Disabled (`20260925130806`). |
| The `wallet`, `held_payments` and `held_payments_payouts` flags | Off (`20260925114741`). The pending migration also makes the flag guard refuse to turn them on, and adds an event trigger that refuses any new custody-named object. |
| The app code | Removed. The tables are not in `database.types.ts`, so no code can name them. The old routes `/wallet`, `/escrow` and `/admin/escrow` redirect to `/agreements` or `/admin/agreements`. |

## Where to look

| Question | Where |
|---|---|
| Can this booking be paid? | `deal_agreements.status = 'approved'` |
| How one charge split | `transactions` and `ledger_entries` |
| The reserve balance | `admin_guarantee_reserve()`, or the Money desk |
| A refund's state | `booking_refunds.processor_status` |
