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
   A hotel room is a stay too (ROOM BOOKINGS 1, off until `room_bookings` is switched on): the agreement names the accommodation, the owner is the hotel's business owner, and a host who is not an agent is paid through their default bank account's Paystack subaccount. See [ROOM_CHECKOUT.md](ROOM_CHECKOUT.md).
3. **Both parties confirm the same version** with `agreement_confirm_as`. An agent confirming for an owner must hold a live mandate for the listing. Any amendment (`agreement_amend_as`) moves the version, and both confirmations lapse.
4. **An admin, or staff holding the `agreements` scope, approves or rejects** with `admin_decide_agreement`. A rejection needs a reason. Nobody decides an agreement they are a party to. The decision is written to `deal_agreement_events` (append-only) and to `audit_log`. Both parties are told in the app and by email: `agreement.approved` and `agreement.rejected`.
5. **Payment opens.** `payment_split_for_booking` returns the split, and the app opens a split attempt (`lib/payments/split-attempt.ts`). Without `PAYSTACK_GUARANTEE_SUBACCOUNT`, or without a lister subaccount, nothing opens.
6. **Settlement.** `settle_booking_charge` records:
   - the transaction;
   - a `ledger_entries` row;
   - a `guarantee_reserve_entries` contribution;
   - the agreement as paid.

   Nothing is credited to any balance. A charge that cannot be applied is refunded to the card, with outcome `refund-due`.

**Payment attempts.** One payer and one charge have one open attempt: a retry resumes the live attempt's Paystack checkout (`lib/payments/attempts.ts`) instead of opening another. An attempt Paystack says was never completed becomes `ABANDONED`, at once when the payer closes the window (the server asks Paystack first) or, through the hourly hold sweep, 45 minutes after it was last opened. A payment counts as in flight, and so blocks cancelling the agreement or releasing the hold, only while it is `PENDING` and either opened in the last 45 minutes or reported by Paystack as still moving (`private.payment_attempt_in_flight`). A charge that completes on an abandoned attempt is still settled, or refunded, by the one settlement path.

**Vallo charges no inspection fee.** The inspection screen, the request sheet, the Terms and the Disclaimer all say so.

## Refunds

A refund goes back to the card or account that paid, through Paystack `/refund` (`lib/payments/refund.ts`). The processor's status is recorded on `booking_refunds.processor_status`.

A refund whose outcome is unknown (a timeout, a 5xx or an unreadable answer) is never recorded as failed. It stays pending, and a critical `refund.outcome_unknown` alert asks a person to check Paystack before trying again.

**The refund clock (V-24, `20260929001248`).** Three stamps on each `booking_refunds` row, which can only move forward: decided (`created_at`), initiated at Paystack (`processor_submitted_at`, written by `record_processor_refund`), and processed (`processor_settled_at`, from Paystack's `refund.processed` webhook through `record_processor_refund_outcome`; see `lib/payments/refund-events.ts`). The promise to the guest is five Nigerian business days (holidays in `ng_public_holidays`) from asking to *initiation*. The guest reads "Paystack started the refund on …", and then "Refunded to your card on …". `admin_refund_clock()` lists every leg that is due within 24 hours or overdue:
- `request`: asked, not decided;
- `unsent`: decided, not sent to Paystack;
- `processor`: sent, not processed;
- `share_unsent` and `share_processor`: the same two legs for a flatmate's share refund;
- `rent_owed`: a rent refund the lister owes.

The function checks the caller's own role, so the app calls it with the operator's session.

## Before payment: the quote and the terms are frozen

- **The move-in quote (V-13, `20260929000327`).** When the lister says yes to an inspection, the move-in figures are copied into `move_in_quotes`. The rent charge is opened from that quote, so a listing edited later cannot change what the tenant was quoted.
- **Cancellation terms (V-20, `20260929000803`).** The policy that prices a refund is copied into `booking_cancellation_terms`, first when the booking is accepted and again when it is paid. A refund is priced from the frozen copy, never from the listing's current policy.

## Tenancy money that never passes through Vallo

**The caution register (V-36/V-47, `20260929002615`).** The caution is paid to the lister as part of the move-in total. Vallo keeps only a record of the debt: `caution_obligations` for what is owed and when it is due, plus deductions, returns and rulings.
- The lister proposes deductions against their own move-out photographs. The tenant accepts or disputes each one. A disputed line is ruled by staff with the `guarantee` scope (`admin_rule_caution_dispute`), who allow from zero up to the proposed amount.
- Either party records a return paid outside Vallo (`record_caution_return`, which is idempotent by key). The other party can contest it (`contest_caution_return`). While contested it counts as *in doubt*, until staff find it received or not received (`admin_rule_caution_return`).
- `private.caution_position` gives the figures: returned, in doubt, deducted, proposed, disputed, guaranteed, outstanding and claimable.
- After the due date, the tenant can escalate what is claimable to the Vallo Guarantee (`escalate_caution_to_guarantee`). That files a normal Guarantee claim with `guarantee_claims.caution_obligation_id`. An approved claim is paid from the reserve, never by Vallo on the lister's behalf.
- Operators rule on the Money desk's Cautions panel (`admin_caution_desk`).

**Flatmates pay their own shares (V-86, `20260929004131`).**
- The lead invites flatmates (`rent_payment_contributors`) to naira shares. The lead's own share is whatever is left.
- Each share is its own card charge against the one booking, opened with the split from `payment_split_for_rent_share` (`lib/tenancy/share-checkout.ts`). It carries `transactions.share_payer_id` and uses the ordinary `rm-book-` reference, so the webhook and the attempt sweep settle it with no extra code.
- `settle_booking_charge` answers `share-settled` until the shares reach the total, and `settled` for the payment that completes it. Uniqueness is one successful whole charge per booking, or one successful share per payer.
- The first paid share locks the split.
- Before the total is complete, the lead can cancel (`rent_split_cancel_as`), or the daily `sweep_rent_splits` job does it on the move-in day. Every paid share then gets a `rent_share_refunds` row and is refunded to the card that paid it. `lib/tenancy/share-refunds.ts` sends these, and the hourly `/api/cron/rent-share-refunds` retries them. `refund.processed` closes each one.
- Each share refund is claimed before it is sent (`claim_rent_share_refund`), so it is sent at most once. If Paystack gives no answer, the row is recorded as `unknown`, which is never re-sent automatically; a person checks Paystack first. A failed refund is retried at most three times (`attempts`). A Paystack refund event closes only its own row: it is matched by refund id, or by the charge reference only when the row has no refund id yet, and the amount must match (migration `20260929013455`).

**Other V-items, with no money movement.**
- Move-in and move-out reports (V-54).
- Receipts anyone can verify, which count as paid in full only when the shares or the whole charge cover the total (V-55).
- Price checks from paid tenancies (V-39).
- The renewal clock and the flat's lineage (V-93/V-38).
- Report withdrawal, saved views and report signals (V-89).

**V-81, the phone lock.** A step-up now guards only where money lands: adding, defaulting or removing a bank or payout account, and removing the lock itself (`lib/security/money-intent.ts`). With no wallet there is nothing to send or withdraw.

**V-56 and V-92 (held agency fee, held stay caution): not built, by decision.** Both would have Vallo hold a customer's money until something is released. The Vallo Guarantee covers the same risks instead.

## The Vallo Guarantee

- **The reserve.** Contributions flow in from every settled charge. The reserve is an append-only ledger (`guarantee_reserve_entries`), and its balance is their sum.
- **Scope.** At launch it covers rentals and stays paid through Vallo, not purchases.
- **Claims.** A claim is filed from the agreement (`guarantee_claim_file_as`) with evidence, in the private `guarantee-evidence` bucket. It must be filed within `money_policy.claim_window_hours` (72) of move-in or check-in.
- **Decisions.** An admin, or staff holding the `guarantee` scope, decides each claim (`admin_decide_guarantee_claim`). The approved amount is capped by what was paid and by the reserve balance, under an advisory lock.
- **Payout.** An approved claim is paid to the claimant's bank account and recorded with `admin_mark_guarantee_claim_paid`.

## Crypto

Crypto is **another way to pay an existing charge** (a stay, a rent charge, an agreement payment), never a place to keep money. It is **off**: hidden everywhere unless all of these hold, checked on every page render and again in every server action (`lib/crypto/gate.ts`):

1. `feature_flags.crypto_payments` is on (fail-closed; created off by `20260929001617`);
2. the provider is configured (key, secret, https base, webhook secret);
3. `YELLOWCARD_DIRECT_SETTLEMENT=confirmed`, `YELLOWCARD_PROVIDER_ACCOUNTS_ARE_BANK_PAYOUTS=confirmed`, Vallo's settlement account id and the reserve's bank account are all set;
4. at least one asset is enabled (`CRYPTO_ENABLED_ASSETS`);
5. the payer has a matched identity check (`identity_verifications.outcome = 'matched'`). Without it the payment screen says so and links to verification; it never shows a button the server would refuse.

**How the money moves.** Paying in crypto is one more attempt on the same charge: a `transactions` row with provider `yellowcard` and reference `rm-yc-<uuid>`, opened by `crypto_open_attempt` through the same `transactions_00_payment_gate` and the same split from `payment_split_for_booking`. The provider (Yellow Card, behind the interface in `lib/crypto/provider.ts`, so another licensed provider can be swapped in) issues **its own** deposit address for this one payment, converts under its own licence, and settles **naira** directly to the three legs the card split pays:

| Leg | Destination |
|---|---|
| The lister's share | The lister's verified payout account (the `payout_accounts` row behind their Paystack subaccount) |
| The Guarantee contribution | A bank payout to the reserve's own bank account (`YELLOWCARD_RESERVE_BANK_CODE`, `_ACCOUNT_NUMBER`, `_ACCOUNT_NAME`), never a balance at the provider |
| Vallo's commission | Vallo's settlement account at the provider (`YELLOWCARD_VALLO_SETTLEMENT_ACCOUNT_ID`), which the founder has confirmed pays out to Vallo's own bank (`YELLOWCARD_PROVIDER_ACCOUNTS_ARE_BANK_PAYOUTS=confirmed`) |

The destinations each payment was sent to are recorded on its `awaiting_payment` event (`crypto_payment_events.facts.settlement_destinations`: the reserve's bank account in full, the lister's by bank code and last four digits, Vallo's by provider account id).

Vallo never receives, holds or forwards crypto, a key, an address of its own, or anybody's naira. An overpayment's difference, and an underpayment not topped up before the quote expires, go back to the payer's refund address, by the provider.

**One payment of a charge at a time.** `crypto_open_attempt` refuses with `in_flight` while another crypto payment of the same charge is moving (awaiting payment, confirming, underpaid, overpaid, converting) or a card attempt on it is in flight (`private.booking_payment_in_flight`), so two payments cannot both land (`20260929012438`). A duplicate or repeated report about an unfinished payment refreshes its attempt's in-flight clock, so an agreement is not cancelled under a payment the provider is still reporting on.

**Only an explicit settled amount settles.** The provider's report must state the naira it settled (`settledAmount`), and it must equal the charge in kobo; the quoted amount is never read as a settlement, and a settled report without the figure is refused as `amount-mismatch` with a critical alert.

**Figures.** Naira is integer kobo. Crypto amounts are exact decimals at the asset's precision (`numeric` in the database, decimal strings in the app, bigint atomic units for maths in `lib/crypto/decimal.ts`). A provider quote is refused if its crypto amount disagrees with its own rate by more than 1% (a unit slip).

**States** (`lib/crypto/state-machine.ts`, twinned with `private.crypto_transition_allowed`): quoted, awaiting payment, confirming (with a confirmations count), underpaid, overpaid, converting, settled, expired, refunded, failed. A report of money moving outranks a clock: late funds on an expired quote still move forward.

**Only the provider's signed report settles a charge.** `/api/yellowcard/webhook` verifies the HMAC over the raw body and hands the report to `public.crypto_payment_apply` (service role only), which in one transaction: records the event once per `(provider, provider_event_id)` (idempotency); refuses an out-of-order transition; refuses a settlement that is not exactly the charge in kobo (and raises an alert); and on settlement calls `private.settle_booking_charge` and writes the AML record. A settled charge that cannot be applied (paid twice, cancelled) raises a critical `crypto.return_needed` alert: the naira is with the lister, so a person arranges its return with the provider. The browser only polls its own row; nothing it sends can mark a charge paid. `/api/cron/crypto-reconcile` (every 15 minutes) reads every moving payment back from the provider and applies it through the same door, and expires quotes nobody accepted. The payer is told in the app and by email at each state, and the settled email is the receipt; `/pay/crypto/[reference]` shows the live status and the receipt.

**For SCUML/AML: `public.crypto_aml_records`.** One append-only, staff-only row per settled crypto payment, written in the settling transaction: the payer (`payer_id`, `payer_legal_name`, `payer_kyc_verification_id`, `payer_kyc_method` from KYC), the payee, `amount_minor` (naira), `asset`, `network`, `crypto_amount`, `crypto_received`, `rate_ngn`, `tx_hash`, the provider's deposit address, the refund address, `provider` and `provider_reference`, and `settled_at`. No foreign keys, so an account deletion never erases it. The threshold and STR observers should read this table (and `crypto_payment_events` for the full history). The crypto attempt is also an ordinary `transactions` row, so any observer on settled transactions sees it with `provider = 'yellowcard'`.

**Founder action items before the flag goes on.**

1. **SEC VASP question.** Under the Investments and Securities Act 2025 and the SEC's rules on digital assets, virtual asset service providers must be registered with the SEC Nigeria. Take legal advice, in writing, on whether Vallo offering this option (with a registered provider doing the conversion and settlement) needs its own SEC registration or falls under the provider's; do not switch crypto on until that is answered.
2. Get Yellow Card's written confirmation that it settles naira directly to each leg, then set `YELLOWCARD_DIRECT_SETTLEMENT=confirmed`.
3. Open Vallo's settlement account at Yellow Card, get written confirmation that it pays out to Vallo's bank account (then set `YELLOWCARD_PROVIDER_ACCOUNTS_ARE_BANK_PAYOUTS=confirmed`), and set the Guarantee reserve's bank account details.
4. Receive the API key, secret and webhook secret; register the webhook URL; check every `CONFIRM ON ONBOARDING` line (including whether the webhook signature carries a timestamp, so replays older than a few minutes can be refused) in `lib/crypto/providers/yellowcard.ts` against the live docs; scan a deposit QR with a phone.
5. Set `CRYPTO_ENABLED_ASSETS`, then `update public.feature_flags set enabled = true where key = 'crypto_payments';`.

## What is retired, and how it is kept retired

| Retired thing | How it is kept retired |
|---|---|
| Custody tables: wallets, wallet_entries, wallet_pots, escrows, escrow_evidence, escrow_rulings, escrow_float_snapshots | Unreachable from every app role on live (`20260925130904`). They were then moved into the `retired_custody` schema with no grants, applied on live as `20260925163708_track_a1_vallo_never_holds_customer_money_custody_retired.sql` (verified against the live catalogue 6 October). |
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
| A refund's clock | `admin_refund_clock()`, or the refund clock on the Money desk |
| How a hotel room is booked and paid | [ROOM_CHECKOUT.md](ROOM_CHECKOUT.md) |
| A caution's position | `private.caution_position(obligation)`; staff rule on it on the Money desk (Cautions) |
| A flatmate's share and its refund | `transactions.share_payer_id`, `rent_share_refunds`, `my_rent_share(contributor)` |
| A crypto payment's state and history | `crypto_payments`, `crypto_payment_events` |
| What SCUML needs about a crypto payment | `crypto_aml_records` |
