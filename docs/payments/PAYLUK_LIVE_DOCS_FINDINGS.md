# Payluk findings: Session 1's hypothesis checked against the live docs

Ground truth: the live docs at docs.payluk.ng, read 6 October 2026 by Session 2. Every citation is a page
path with `/` written as `_` (for example `concepts_webhooks.md` is `/concepts/webhooks.md`). "openapi.json" means the operation description or schema in that file. Nothing
here is inferred from the npm package or the vendored skill unless that is stated.

Docs dated as of the latest changelog entry, **2 October 2026** (`changelog.md`).

---

## 1. What Session 1 got wrong

### Wrong

1. **"No `*.failed` or `*.reversed` webhook events are documented. Only success events were found."** (Finding C, 3.2)
   Wrong. Every `payment.*` event "has a `.failed` counterpart that fires when the transaction reaches a terminal failure, for example `payment.withdrawal.failed` ... A `.reversed` counterpart exists for the rarer case of a settled transaction being unwound." Payload `status` is `success`, `failed` or `reversed`. (`concepts_webhooks.md`; added 21 Aug 2026, `changelog.md`: "Failures are reported too".)
   Caveat that survives: there is **no** failure event on the `escrow.*` stream, and webhooks stay best-effort, so reconciliation polling is still required.

2. **Webhook coverage was described as escrow-only plus "success events".**
   Wrong. There are two streams on one callback URL: `escrow.*` (escrow status changes) and `payment.*` (every settled transaction of a merchant customer, plus commission and delivery payouts to the merchant). Transactions on the merchant's own account do **not** fire webhooks except `payment.commission.*` / `payment.delivery.*`. (`concepts_webhooks.md`)

3. **"Fee schedule is not documented at all. No percentages ..."** (3.3)
   Wrong as of 2 Oct 2026. The escrow `fee` on a merchant escrow is "Payluk's **2%** of the escrow amount plus your own commission, if you set one in your merchant settings on the dashboard". Personal (non-merchant) app escrows: 2.5%. `whoPays` (`buyer` / `seller` / `both`) splits it. `additionalFee` carries no Payluk cut. (`concepts_fees-and-settlement.md`, `changelog.md` 2 Oct 2026.)
   What remains undocumented: caps, a withdrawal fee table (the fee is per-intent, provider-dependent, "may include VAT"), any dispute fee. (`api-reference_payments_create-payment-intent.md`)

4. **"No cNGN anywhere ... The only crypto surface is a BSC withdrawal path and a master deposit address."** (3.3)
   Wrong. cNGN is a documented funding rail: customers deposit **cNGN** as **BEP-20 on BSC** to the master wallet (`GET /v1/payment/deposit/wallet`), sending address must be on the crypto whitelist; the hosted Checkout SDK collects cNGN; staging runs on BSC testnet chain `97`, live on chain `56`; there is a whole guide, `guides_testnet-cngn-setup.md`. (openapi.json "Get master wallet address", `concepts_how-it-works.md`, `api-reference_payments_pay-escrow-buy.md`, `changelog.md` 25 Aug 2026.) The founder's instruction not to build on Payluk cNGN is therefore **not moot**; it is a live surface to deliberately stay off.
   Note a docs inconsistency: the changelog calls it `GET /v1/payment/get-master-wallet-address`; openapi.json has `GET /v1/payment/deposit/wallet`. Trust openapi.json, verify on staging.

5. **Lifecycle diagram: "buyer disputes -> DISPUTED -> seller responds -> INVESTIGATING -> merchant resolves".** (3.3)
   Partly wrong. The resolve endpoint does not require `INVESTIGATING`. The documented error cases are only `No dispute found for this escrow` and `Escrow already completed`; the official REFUNDED example response has `logs: [DISPUTED]` and a dispute array containing only the buyer and "customer support" entries, i.e. resolved straight from `DISPUTED` with no seller reply. (`api-reference_disputes_resolve-dispute.md`.) Also the dispute concept page shows `dispute` as an object `{buyer, seller, admin}` while the resolve example shows an array of `{name, message, proofUrl, type, createdAt}`; shape must be read defensively. (`concepts_dispute-resolution.md` vs `api-reference_disputes_resolve-dispute.md`)

6. **Lifecycle: "seller claims after window -> CLOSED / CLAIMED".**
   Imprecise in a way that matters. Claim is allowed only **one day after** the window: window = `maxDelivery` x `deliveryTimeline` counted from `paidAt`, plus one day; before that, `Escrow cannot be claimed yet`. A 6-hour window becomes claimable 30 hours after payment. Changed 2 Oct 2026. (`api-reference_escrow_claim-funds.md` via openapi.json, `changelog.md`.)

7. **Outcome set `COMPLETED`, `REFUNDED`, `SPLIT` was right, but the status enum was incomplete in effect.** `SPLIT` is a terminal escrow `status` *and* a milestone status, with a `split` object `{sellerAmount, buyerAmount, pool, resolvedAt}` and a dedicated `escrow.split` event. There is **no `CANCELLED`** escrow status. Full `EscrowStatus` enum: `PENDING, ONGOING, COMPLETED, REFUNDED, CLAIMED, DISPUTED, INVESTIGATING, SPLIT`. (openapi.json `EscrowStatus`, `essentials_status-reference.md`)

8. **"Partial release exists only through milestones or a dispute SPLIT"** is right, but Session 1 missed that **milestones release strictly in order** (only the earliest pending milestone can be confirmed; `changelog.md` 29 June 2026) and that **each milestone may carry its own `customerId` beneficiary**, whose main balance receives that milestone instead of the seller's (`concepts_milestone-escrows.md`). That is a limited multi-recipient payout: relevant to Finding A (see Q5).

9. **"Some routes require a merchant super-admin key"** understated it. Only Escrow, Milestone Escrow and Categories routes accept any approved business key. **Everything else** needs a super-admin key: customers, wallet, merchant account, confirm and dispute, additional fee, vault, payments, cards, countries, crypto whitelist. A non-super-admin key gets `401 Access denied`. (`authentication.md`)

10. **`customer-id` "required on wallet, payment, confirm, card and per-customer dispute routes; forbidden on merchant-wide routes".** Right but incomplete: it is **optional** on escrow and category routes (omit it to act as your own business account; a non-business merchant then gets `Merchant cannot create escrow for itself via API`). Forbidden list is exactly: list-all-customers-disputes, escrow feeds, resolve dispute, update additional fee, every vault route, and the merchant account routes. (`authentication.md`)

11. **"`400` covers validation, wrong state and not found alike."** Mostly right, but there is a richer code set: `401` (no token, access denied), `403` (unknown/wrong-env key, IP not allowlisted, feature not enabled, staging-only route), `404` (customer-id names no customer), `410` (virtual account), `429` (rate limit), `500` (ineligible account type), `503` (maintenance). (`essentials_errors.md`)

12. **Wallets: "The merchant has its own balance receiving `commission` and `delivery`."** Right, but Session 1 had no endpoint for it. There are two: `GET /v1/merchant/balance` and `GET /v1/merchant/transactions` (super-admin, no `customer-id`). (`api-reference_merchant-account_*.md`, `changelog.md` 24 Aug 2026.)

13. **Payouts: "`verify` with the reference and an OTP where required."** Right. Session 1 omitted that the same intent route also does `deposit` (saved-card charge, or hosted collection: `checkoutConfig` on production, `testAccount` on staging) and `wallet_transfer`. (`api-reference_payments_create-payment-intent.md`)

14. **Publishable key prefix `pk_live_`.** Not in the live docs. The SDK pages say only "publishable key" (`publicKey`). The prefix came from the npm package and is unconfirmed. (`sdk_introduction.md`, `sdk_javascript.md`)

15. **Rate limits treated as unknown (Q2).** Documented: **10 requests per minute per secret key** across all `/v1` routes. This is a hard design constraint Session 1 did not have. (`authentication.md`)

### Right

- Hosts `https://staging.api.payluk.ng` / `https://api.payluk.ng`, all routes under `/v1`; `sk_test_` staging, `sk_live_` production; wrong key on wrong host = `403 Unauthorized Access`. (`introduction.md`, `authentication.md`, openapi.json `servers`)
- IP allowlist on production only, empty list admits all, staging never checks. (`authentication.md`)
- Envelope `{status, message, data}`, errors carry `data: {}`. (`introduction.md`, `essentials_errors.md`)
- Finding B: Payluk does not arbitrate; merchant resolves with `COMPLETED` / `REFUNDED` / `SPLIT`; split amounts must equal exactly what is held. Verbatim: "**Payluk does not resolve disputes between your customers.**" (`concepts_dispute-resolution.md`)
- Finding A in substance: one escrow, one seller; merchant earns `commission` and `delivery` into its own wallet; no arbitrary multi-recipient split at release (see Q5 for the milestone `customerId` nuance).
- Finding C idempotency part: no `Idempotency-Key` header exists anywhere in openapi.json; the only stated idempotency is re-verifying the same `reference` ("Verifying the same `reference` again with Verify payment is idempotent", `api-reference_payments_pay-escrow-buy.md`).
- Webhook signing: `x-payluk-signature`, hex HMAC-SHA512 of raw body, keyed with the environment's secret key; 10 s timeout; up to 3 retries with exponential backoff; best effort, never rolls back; dedupe on `data.reference` / `data.id` + `event`. (`concepts_webhooks.md`)
- No timestamp in the signature. Correction to the detail: the envelope **does** carry a top-level `timestamp` (ISO-8601) but it is not covered by a separate signed header, only by the body HMAC; no replay window is documented.
- Wallet fields `mainBalance`, `escrowBalance`; permissions `canBuy`, `canSell`; block/unblock. (`concepts_merchant-customers.md`)
- Virtual accounts deprecated: now `410 Gone` on every call, since 2 Sept 2026, citing CBN rules. (`api-reference_payments_generate-virtual-account.md`, `changelog.md`)
- Withdrawal fee is set by Payluk on the intent and must be read back. (`api-reference_payments_create-payment-intent.md`)
- Fees collected on a cancelled vault. (`concepts_vault-escrows.md`)
- No refund/cancel endpoint for a funded standard or milestone escrow outside a dispute (see Q3).
- SDK hosts: widget `https://checkout.payluk.ng/escrow-checkout.min.js`, API bases `https://live.payluk.ng` and `https://staging.live.payluk.ng`. (`sdk_reference.md`)
- The skill is real and official: `jerozeek/payluk-api-skill`, MIT. (`guides_ai-agent-skill.md`)

---

## 2. The twelve questions

**1. Fee schedule.** Percentages and caps per `whoPays`, the merchant commission share, the withdrawal fee table, dispute fees, VAT handling.

Partly answered. Merchant escrow fee = Payluk 2% of `amount` + the merchant's own commission set in dashboard merchant settings; read `fee` off the escrow, do not compute it (`concepts_fees-and-settlement.md`). `whoPays`: `buyer` pays all on top, `seller` deducted from payout, `both` halves it (`essentials_status-reference.md`). Buyer pays `amount` + their share of `fee` + `additionalFee` (`api-reference_payments_pay-escrow-buy.md`). Commission is paid to the merchant wallet as a `commission` transaction on completion. Withdrawal fee: set per intent, "depends on the amount and on which provider Payluk currently settles payouts through, and it may include VAT", fixed at intent creation (`api-reference_payments_create-payment-intent.md`). Example values only: `fee: 100` on a ₦10,000 bank withdrawal, `fee: 0` on a crypto one (openapi.json examples). **OPEN:** caps, a withdrawal fee table, whether there is any dispute fee, VAT on the 2%. Close with a written fee schedule from Payluk, and confirm on staging by reading `fee` on intents of several sizes.

**2. Idempotency and rate limits.** Is there an `Idempotency-Key` on `escrow/create`, `payment/escrow` and `create-intent`? What are the numeric rate limits per key?

Rate limit: **10 requests per minute per secret key**, all `/v1` routes, from any source; `429 Too many request`; headers `RateLimit-Policy: 10;w=60` and `RateLimit: limit=10, remaining=N, reset=S`; docs say back off on the headers rather than retry on 429 (`authentication.md`). Idempotency: **no** `Idempotency-Key` on any route (none in openapi.json). `payment/escrow` and `create-intent` take a caller-supplied `reference` ("Your unique reference for this transaction", openapi.json) and re-verifying the same `reference` is idempotent (`api-reference_payments_pay-escrow-buy.md`). `escrow/create` has no caller reference at all. **OPEN:** what happens on a duplicate `reference` (no error message documented). Close by testing on staging: send the same `reference` twice to `create-intent` and to `payment/escrow`. Design implication: Vallo must own idempotency (`withIdempotency`), and for `escrow/create` must look up before retry (e.g. `GET /v1/escrow/feeds?paymentToken=` or `GET /v1/escrow/transactions`) because a timed-out create can have succeeded.

**3. Refund or cancel of a funded escrow without a dispute.** A guest cancelling a booking weeks ahead is routine. Is there any path to return their money that is not a dispute? Is any refund possible after `COMPLETED` or `CLAIMED`? If the answer is no, Payluk escrow cannot carry Vallo's booking flow as designed, and this should be established before any further work.

**Answer: No. Your reading is correct, with the precise details below.**

(a) **No refund or cancel endpoint exists for standard or milestone escrows.** The full path list in openapi.json has exactly one cancel route, `POST /v1/escrow/vault/cancel/{paymentToken}`, and it is vault-only ("Cancels an open vault"). There is no `refund` path anywhere. The lifecycle page lists `REFUNDED` only as "When a merchant resolves a dispute in the buyer's favour" (`concepts_escrow-lifecycle.md`); fees page likewise (`concepts_fees-and-settlement.md`).

(b) **A funded escrow cannot be deleted or edited.** `DELETE /v1/escrow/delete/{paymentToken}`: "Allowed only while `AWAITING_PAYMENT` and only by the seller." `PUT /v1/escrow/edit/{paymentToken}`, `PUT /v1/escrow/milestone/edit/{paymentToken}`, `PUT /v1/escrow/milestone/convert/{paymentToken}` and `PUT /v1/escrow/additional-fee/{paymentToken}`: all `AWAITING_PAYMENT` only. (openapi.json; `concepts_escrow-lifecycle.md`: "This is the only state in which that charge is mutable.")

(c) **The only refund path is dispute then resolve:**
1. `POST /v1/escrow/submit-dispute/{paymentToken}` (`multipart/form-data`: `message`, optional `file`), with `customer-id: <buyerId>`. Escrow must be `OPENED`. "**Only the buyer can open a dispute**"; the seller can only respond after. Each side may submit once. Moves the escrow to `DISPUTED` and notifies the seller. Requires a super-admin key (disputing is on the super-admin list). (openapi.json; `concepts_dispute-resolution.md`; `authentication.md`.) Because the merchant holds the key and sets `customer-id`, **Vallo can open the dispute on the guest's behalf**; nothing in the docs requires the buyer to act personally. Note `concepts_how-it-works.md` and `introduction.md` still say "Either party opens"; the authoritative pages and openapi.json say buyer only.
2. `POST /v1/escrow/dispute/resolve/{escrowId}`, **no** `customer-id`, super-admin key, `multipart/form-data` with `resolution` (required note), `status=REFUNDED`, optional `additionalFeeRefundable`, optional `file`. Escrow must belong to one of your customers.
3. Without a dispute, resolve fails `400 No dispute found for this escrow`; on an already closed escrow, `400 Escrow already completed`. (`api-reference_disputes_resolve-dispute.md`)
4. **Resolve is allowed from `DISPUTED`; Vallo need not wait for the seller.** No documented precondition requires `INVESTIGATING`, and the official `REFUNDED` example shows `logs: [DISPUTED]` with only a buyer entry and the resolver's entry. (`api-reference_disputes_resolve-dispute.md`.) Verify on staging; it is inferred from the example and the absence of an error, not stated in prose.
5. Webhook: `escrow.disputed` then `escrow.refunded` (`concepts_webhooks.md`). Seller is notified when the dispute opens, so every cancellation would notify the host of a "dispute".

(d) **Fee treatment on refund (who bears Payluk's 2%).** The docs **conflict**:
- `api-reference_disputes_resolve-dispute.md` and openapi.json: "**The escrow fee itself is never refunded to either party, on a split any more than on a refund.**"
- `concepts_fees-and-settlement.md`: on SPLIT "The escrow fee is retained in full, as on a refund"; `changelog.md` 14 Aug 2026 says the same.
- But `concepts_dispute-resolution.md` (REFUNDED accordion): "The held amount **plus the buyer's pro-rata fee share** is refunded to the buyer's main balance".
Three sources against one: the weight of the docs is that **the fee is retained**. Combined with "what is still held" for a standard escrow = `amount` minus the seller's share of the fee (`concepts_dispute-resolution.md`), the majority reading gives:
- `whoPays: buyer`: buyer paid `amount + fee`, gets back `amount`. **Buyer bears the full fee.**
- `whoPays: seller`: buyer paid `amount`, held pool is `amount - fee`, buyer gets back `amount - fee`. **Buyer still bears the fee**, though the seller was meant to pay it.
- `whoPays: both`: buyer paid `amount + fee/2`, gets back `amount - fee/2`. **Buyer bears the full fee.**
On every refund the guest loses roughly the full fee (2% plus any merchant commission) unless Vallo makes them whole from its own funds. Whether merchant **commission** is still paid to Vallo on a REFUNDED escrow is not stated (it is stated as "charged once" for COMPLETED and SPLIT only). `additionalFee`: goes back to the buyer if `additionalFeeRefundable` is `true` (default), to the merchant wallet if `false`. **OPEN:** close the contradiction with one staging test per `whoPays` value (read buyer `mainBalance` before and after, read `GET /v1/merchant/transactions` for a `commission` row) and with written confirmation from Payluk.

(e) **Refund after `COMPLETED` or `CLAIMED`: impossible via API.** A dispute can only be raised while `OPENED`; after `CLOSED` (`COMPLETED` / `REFUNDED` / `SPLIT`) "it is terminal and can't be reopened" (`concepts_dispute-resolution.md`); `CLAIMED` is also `CLOSED` (`essentials_status-reference.md`). Any post-release refund would be an ordinary wallet transfer from the seller's or the merchant's money, not an escrow operation.

(f) **Milestone escrows:** same route, only over still-`PENDING` milestones; fails with `All milestones have been released; there are no held funds to dispute` once all are released; resolution marks held milestones `REFUNDED`. (`concepts_milestone-escrows.md`)

**Consequence for Vallo:** every routine guest cancellation of a funded booking must be expressed as a buyer dispute that Vallo opens and resolves itself, costing the guest the escrow fee under the majority reading, notifying the host as a dispute, and consuming at least 2 of the 10 requests/minute. Structurally workable, operationally and reputationally poor. The alternative is to **not fund the escrow until cancellation risk has passed** (create at booking, fund later; an unfunded escrow can be deleted freely), which is a product decision.

**4. Auto-release.** Does Payluk release automatically when the delivery window elapses, or only when the seller calls `claim-funds`? Does the 24-hour post-claim buyer window described in marketing apply to API escrows?

No auto-release is documented for standard escrows: release happens on buyer confirm (`POST /v1/escrow/confirm-payment/{escrowId}`) or on seller claim (`GET /v1/escrow/claim-funds/{paymentToken}`), the latter allowed only once one day has passed after the window. (`concepts_fees-and-settlement.md` "When settlement happens"; openapi.json.) The 24-hour period is **pre-claim**, not post-claim: since 2 Oct 2026 the API matches the app, which "already gave the buyer that day to confirm or open a dispute" (`changelog.md`). Milestone escrows auto-**complete** when the final milestone is confirmed; that is not time-based. **OPEN:** an explicit statement that nothing ever auto-releases. Close by asking Payluk, and on staging leave a `minutes` escrow open for days.

**5. Split at release.** Can one escrow pay several recipients, so that the lister's share, Vallo's commission and the Guarantee contribution settle atomically? Can Vallo set a per-escrow platform commission?

Mostly no. Standard escrow: one seller; the merchant's share (commission) and `additionalFee` go to the merchant wallet in the same step (`concepts_fees-and-settlement.md`). So **two** legs settle together: seller net, and Vallo (commission + delivery). The Guarantee contribution has no third leg; Vallo would have to move it from its own merchant wallet, and there is no documented merchant-wallet transfer endpoint (all payment routes require `customer-id`). Milestone escrows allow a per-milestone `customerId` beneficiary, but milestones release one at a time in order, so it is not atomic (`concepts_milestone-escrows.md`, `changelog.md` 29 June). Commission is a **merchant-level dashboard setting**, not per escrow. The per-escrow lever Vallo controls is `additionalFee` (any amount, standard escrows only, 100% to merchant, no Payluk cut, settable until paid) (`api-reference_escrow_update-additional-fee.md`). **OPEN:** whether commission can vary per escrow; whether a reserve could be modelled as a merchant customer. Ask Payluk.

**6. Payout SLAs and limits.** Bank settlement time, per-transaction and daily limits, cut-off times, and how the merchant wallet itself withdraws.

**OPEN.** None documented. Known: minimum 100 for deposit or transfer intents; fee per intent; the provider "changes without notice"; bank codes must be fetched fresh from `GET /v1/payment/bank-list` and treated as opaque strings (`api-reference_payments_get-bank-list.md`). The merchant ledger shows "any withdrawals you made" (`api-reference_merchant-account_get-merchant-transactions.md`) but there is **no API route for a merchant-wallet withdrawal**; presumably dashboard only. Close with Payluk in writing.

**7. Webhooks.** Are there failure or reversal events? Milestone-level events? Is there a replay or resend tool? Do staging webhooks fire? What is the event ordering guarantee? Are there source IP ranges? Is the signature over retries identical?

- Failure / reversal: **yes**, on `payment.*` (`.failed`, `.reversed`); not on `escrow.*` (`concepts_webhooks.md`).
- Milestone-level events: **none documented**; only `escrow.*` status events; the payload carries `milestones` (`concepts_webhooks.md`).
- Staging: **yes**; separate test callback URL, signed with the test secret; `data.environment` is `live` or `test` (`concepts_webhooks.md`).
- Ordering: **none**; "may arrive out of order under retries. Trust `data.status` / `data.state`" (`concepts_webhooks.md`).
- **OPEN:** replay/resend tool, source IP ranges, whether retries are byte-identical (the HMAC is over the body so a regenerated body would re-sign; `timestamp` is "the time the webhook was generated"). Close by asking Payluk and capturing retries on staging.

**8. Disputes.** SLA, evidence file size and type limits, and whether `SPLIT` works on milestone escrows.

`SPLIT` on milestones: **yes**, over the unconfirmed milestones, which are marked `SPLIT` (`concepts_dispute-resolution.md`). SLA: **none**; Payluk does not arbitrate; there is no timeout documented on a `DISPUTED` escrow. **OPEN:** evidence `file` size/type limits (only "optional evidence `file`"). Test on staging.

**9. Direct bank funding.** Can a buyer fund an escrow by bank transfer without first topping up a wallet? What exactly is `checkoutConfig`?

Via the API route, no: `POST /v1/payment/escrow` takes only `wallet` or `card` (saved card, Nigerian customers only) (`api-reference_payments_pay-escrow-buy.md`). To collect "from a card, bank transfer or cNGN the buyer has not saved, use the hosted Checkout SDK" (`concepts_how-it-works.md`); the SDK "opens an escrow first and settles the payment against it" and can pay several `paymentToken`s in one session (`api-reference_payments_generate-virtual-account.md`, `sdk_javascript.md`). Server-side alternative: deposit intent without `cardId` returns a hosted collection, `checkoutConfig` on production ("for the active gateway's checkout") or `testAccount` on staging, settled with `POST /v1/payment/verify` (`api-reference_payments_create-payment-intent.md`). Its internal shape is not specified. **OPEN:** `checkoutConfig` field-level shape; read it from a production-mode response or ask.

**10. Customer KYC.** Tiers, BVN and NIN requirements, wallet limits per tier, foreign customers, the NDPR data processing agreement, and data residency.

**OPEN** almost entirely. Only: `bvn` is an optional 11-digit field kept on the customer record and no longer changes funding (`api-reference_merchant-customers_create-merchant-customer.md` via openapi.json); `countryId` optional, defaults to the merchant's country; card payments Nigerian-only. Merchant onboarding requires KYC, business account upgrade and email to partners@payluk.ng (`onboarding.md`). Close with Payluk compliance in writing.

**11. Enums.** The values of `settlementType`, whether `CANCELLED` exists, and whether `maxDelivery` in minutes is supported for short bookings.

`settlementType`: `STANDARD`, `MILESTONE`, `VAULT`. **No `CANCELLED`** status. `deliveryTimeline`: `minutes`, `hours`, `days`; `maxDelivery` integer 1 to 365, required. (`essentials_status-reference.md`, openapi.json.) So the longest window is 365 days. Note claim adds one day regardless of unit.

**12. The agent skill.** Official install instructions, version and changelog, and confirmation that the vendored copy this document relied on matches the live guide.

Official: `jerozeek/payluk-api-skill`, MIT. Install `npx skills add jerozeek/payluk-api-skill` (add `-g` for global); Claude Code: `/plugin marketplace add jerozeek/payluk-api-skill` then `/plugin install payluk-api@payluk`; manual: copy `skills/payluk-api`. Ships `openapi.json`, `scripts/payluk-request.mjs`, and a webhook signature script. Released 10 Sept 2026; "Each API change is released as a new version of the skill, noted in the changelog." (`guides_ai-agent-skill.md`, `changelog.md`.) The vendored copy is **stale**: it lacked the 2% fee, the rate limit, failure webhooks, and the one-day claim delay. **OPEN:** version number; do not use the vendored copy, install from source.

---

## 3. Design-critical facts (exact names only)

| Topic | Fact | Source |
|---|---|---|
| Rate limit | 10 requests/minute per secret key, all `/v1` routes; `429 Too many request`; headers `RateLimit-Policy: 10;w=60`, `RateLimit: limit=10, remaining=3, reset=41` | `authentication.md` |
| IP allowlist | Production only; once one address listed, others get `403 Unauthorized IP address`; empty list admits all; staging never checks | `authentication.md` |
| Super-admin scope | Any approved business key: Escrow, Milestone Escrow, Categories routes only. Super-admin: everything else (customers, wallet, merchant account, confirming and disputing, additional fee, vault, payments, cards, countries, crypto whitelist). Else `401 Access denied` | `authentication.md` |
| Hosts | `https://staging.api.payluk.ng`, `https://api.payluk.ng`, routes under `/v1`. SDK: `https://live.payluk.ng`, `https://staging.live.payluk.ng`, widget `https://checkout.payluk.ng/escrow-checkout.min.js` | `introduction.md`, `sdk_reference.md` |
| Key prefixes | `sk_test_` staging, `sk_live_` production; wrong host = `403 Unauthorized Access`. Publishable key: prefix not documented | `authentication.md`, `sdk_introduction.md` |
| Webhook signature | Header `x-payluk-signature`: hex HMAC-SHA512 of raw JSON body, keyed with the environment's secret key. Other headers `Content-Type: application/json`, `User-Agent: Payluk-Webhook/1.0` | `concepts_webhooks.md` |
| Webhook envelope | `event`, `data`, `timestamp` (ISO-8601) | `concepts_webhooks.md` |
| Escrow events | `escrow.created`, `escrow.pending`, `escrow.ongoing`, `escrow.completed`, `escrow.claimed`, `escrow.disputed`, `escrow.investigating`, `escrow.refunded`, `escrow.split` | `concepts_webhooks.md` |
| Payment events | `payment.deposit.success`, `payment.transfer.success`, `payment.withdrawal.success`, `payment.wallet_transfer.success`, `payment.escrow.success`, `payment.commission.success`, `payment.delivery.success`; each with `.failed` and `.reversed` counterparts | `concepts_webhooks.md` |
| Webhook delivery | 10 s timeout; up to 3 retries, exponential backoff; best effort; no ordering; one callback URL per environment (dashboard); new event names may appear: return 2xx for unknown | `concepts_webhooks.md` |
| Replay / idempotency | No `Idempotency-Key`. Dedupe webhooks on `data.reference` (payment) and `data.id` + `event` (escrow). Re-verifying same `reference` is idempotent. No replay window, no resend tool documented | `concepts_webhooks.md`, `api-reference_payments_pay-escrow-buy.md` |
| Fee rate | Payluk 2% of `amount` + merchant commission (dashboard setting); personal app escrows 2.5%; read `fee` from escrow | `concepts_fees-and-settlement.md` |
| `whoPays` | `buyer` (all on top), `seller` (from payout), `both` (halved); milestone escrows must be `buyer`; convert-to-milestone forces `buyer` | `essentials_status-reference.md`, `concepts_milestone-escrows.md`, openapi.json |
| Buyer charge | `amount` + buyer's share of `fee` + `additionalFee`; else `Amount mismatch` | `api-reference_payments_pay-escrow-buy.md` |
| Settlement | Standard: on confirm or successful claim, seller gets amount net of seller fee share to main balance. Milestone: per confirmed milestone, net of pro-rata seller fee; commission finalised at last milestone. Commission (`commission`) and `additionalFee` (`delivery`) credited to merchant wallet at completion. No bank-settlement timing documented | `concepts_fees-and-settlement.md` |
| Amounts | Naira major units, up to 2 decimals; escrow min 1000; intent min 100 (deposit/transfer) | `concepts_fees-and-settlement.md`, openapi.json |
| Virtual accounts | `POST /v1/payment/virtual-account` returns `410 Gone` since 2 Sept 2026 (CBN: inflows must arrive as direct escrow payment). Staging `POST /v1/payment/topup` (1,000 to 100,000, once per customer per day) still exists | `api-reference_payments_generate-virtual-account.md`, `changelog.md` |
| Payment intent | `POST /v1/payment/create-intent` (`amount`, `reference`, `transactionType` in `withdrawal` / `deposit` / `wallet_transfer`; `withdrawalDetails` {`bankCode`, `accountNumber`, `accountName`, `bankName`, `narration`?}, `blockchainDetails` {`toAddress`, `network`}, `depositDetails.cardId`, `walletDetails`) only stages; `POST /v1/payment/verify` (`reference`, optional `otp`) executes. Lowercase values. `customer-id` required | openapi.json |
| Withdrawal fee | `fee` on the returned intent, fixed at creation; customer debited `amount + fee`; may include VAT | `api-reference_payments_create-payment-intent.md` |
| Account resolve | `POST /v1/payment/verify-account`, bank codes from `GET /v1/payment/bank-list` only, never cached | openapi.json |
| Wallet fields | `GET /v1/wallet` (customer) and `GET /v1/merchant/balance` (merchant): `id`, `mainBalance`, `escrowBalance`, `currency`, `createdAt`, `updatedAt` (example `currency: "NG"`; concept page shows `"NGN"`) | openapi.json, `concepts_merchant-customers.md` |
| Merchant ledger | `GET /v1/merchant/transactions`: `page`, `limit` (1 to 100), `type`, `reference`, `fromDate`, `toDate`; any filter returns a flat array | openapi.json |
| Claim timing | `GET /v1/escrow/claim-funds/{paymentToken}` only when `OPENED` and `paidAt` + `maxDelivery` `deliveryTimeline` + one day has passed; else `Escrow cannot be claimed yet`; closes `CLAIMED` | openapi.json, `changelog.md` 2 Oct |
| Delivery window | `maxDelivery` integer 1 to 365 (required), `deliveryTimeline` `minutes` / `hours` / `days` (required), counted from `paidAt` | openapi.json |
| Escrow fields | `id, amount, purpose, description, whoPays, imageUrl, fee, additionalFee, additionalFeeRefundable, paymentToken, paidAt, status, state, channel, isSeller, dispute, category, completedAt, maxDelivery, deliveryTimeline, totalQuantity, settlementType, milestones, participants, winnerId, split, createdAt, updatedAt` (webhook payload also `sellerId`, `buyerId`, `logs`, `approvedClaimBy`, `refundedBy`, `paymentId`, `deliveryDetails`, `environment`, `merchantId`) | openapi.json `Escrow`, `concepts_webhooks.md` |
| Multi-quantity | `totalQuantity` > 1 clones the escrow per buyer; track the clone's `id` | `concepts_multi-quantity-escrows.md` |

---

## 4. Corrections to apply to the architecture doc

**Section 0.** Replace with: "Section 3 was checked line by line against the live docs on 6 October 2026 (`payluk-findings.md`). Remaining unknowns are listed in section 7 as OPEN."

**Section 3 (replacement text)**

> ### 3. What Payluk is (verified against docs.payluk.ng, 6 Oct 2026)
>
> **Product.** Escrow-as-a-service: standard, milestone and vault escrows, per-customer wallets, bank and cNGN (BEP-20 on BSC) rails, disputes the merchant arbitrates, and a hosted Checkout SDK. Custody claim ("CBN-licensed partner banks") is marketing, not docs; still a counsel question.
>
> **Finding A (unchanged in substance).** One escrow pays one seller. Completion settles two legs together: seller net of seller fee share to their main balance, and Vallo's `commission` plus any `additionalFee` (`delivery`) to Vallo's merchant wallet. No third leg; no merchant-wallet transfer API. Commission is a merchant-wide dashboard setting; the per-escrow lever is `additionalFee` (no Payluk cut, settable until paid). Milestone `customerId` beneficiaries exist but release sequentially, not atomically.
>
> **Finding B (confirmed verbatim).** "Payluk does not resolve disputes between your customers." Vallo resolves via `POST /v1/escrow/dispute/resolve/{escrowId}` (`COMPLETED` / `REFUNDED` / `SPLIT`).
>
> **Finding C (revised).** No idempotency key on any route; Vallo owns idempotency and must look up before retrying `escrow/create`. Failure webhooks **do** exist on `payment.*` (`.failed`, `.reversed`), not on `escrow.*`; delivery is best-effort and unordered, so reconciliation polling remains mandatory.
>
> **Finding D (new, disqualifying risk for bookings).** No refund or cancel for a funded standard or milestone escrow outside a dispute; funded escrows cannot be edited or deleted; the only refund is buyer dispute (Vallo can open it with the guest's `customer-id`) then resolve `REFUNDED`. The escrow fee is retained on refund (docs conflict, majority view), so the guest loses ~2%+ on every cancellation unless Vallo absorbs it. Nothing can be refunded after `COMPLETED` / `CLAIMED`.
>
> **Finding E (new).** 10 requests per minute per key, across everything including reconciliation polling. Webhooks must carry the load; polling must be budgeted, and a refund costs at least two calls.
>
> **Mechanics.** Hosts, keys, `customer-id` rules, envelope, lifecycle, fees, webhooks, wallets, payouts: as in `payluk-findings.md` section 3. Lifecycle: `AWAITING_PAYMENT/PENDING` (editable, deletable, `additionalFee` settable) -> `OPENED/ONGOING` (window `maxDelivery` `deliveryTimeline` from `paidAt`) -> `CLOSED` as `COMPLETED` (buyer confirms), `CLAIMED` (seller, window + 1 day), or via `DISPUTED` (buyer only) [-> `INVESTIGATING` if seller replies] -> merchant resolves `COMPLETED` / `REFUNDED` / `SPLIT`. Resolve does not require `INVESTIGATING`. No `CANCELLED`. No auto-release documented.
>
> **Fees.** 2% Payluk + Vallo's commission, split by `whoPays`; withdrawal fee per intent, read back; vault fees kept even on cancel.
>
> **Virtual accounts:** `410 Gone` since 2 Sept 2026. **cNGN exists** (master wallet deposits, Checkout SDK); stay off it by decision, not because it is absent.
>
> **Skill:** official, `jerozeek/payluk-api-skill`; the vendored copy was stale. **npm widget:** hosts confirmed by `sdk_reference.md`; CSP decision still stands; publishable-key prefix unconfirmed.

**Section 3A.6 and 3A.4** (escrow rail): add Finding D and E as constraints. The booking design must either fund escrows only after the free-cancellation window, or accept dispute-shaped cancellations with Vallo absorbing the fee. Budget 10 req/min.

**Section 7.** Mark answered: 2 (rate limit; idempotency no), 3 (no; detail above), 4 (largely), 7 (partly), 8 (SPLIT yes), 11, 12. Keep OPEN: 1 (caps, withdrawal table, VAT, dispute fee), 3 sub-points (fee on refund conflict, commission on refund, resolve from `DISPUTED` to be staging-tested), 5 (per-escrow commission), 6, 7 (resend, IPs, retry bytes), 8 (SLA, file limits), 9 (`checkoutConfig` shape), 10, plus new: duplicate-`reference` behaviour, and the master-wallet path discrepancy.

**Section 8.** "Answer question 3 first" is now answered from the docs: no non-dispute refund. Replace "one email to find out" with "confirm by one staging run per `whoPays` and get the fee-on-refund behaviour in writing."
