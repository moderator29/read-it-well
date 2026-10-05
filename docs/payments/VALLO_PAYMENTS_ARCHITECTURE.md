# Vallo payments architecture: Paystack, Payluk, Yellow Card

**Written by Session 1, 5 October 2026.** Architecture and decisions only. No
implementation. Companion to `docs/sessions/SESSION-1-RESPONSE.md` section 4.

---

## 0. Evidence warning: read before trusting anything in section 3

**`docs.payluk.ng` could not be read.** This environment's egress policy refused
every attempt (`https://docs.payluk.ng/llms.txt`, `/introduction`,
`/guides/ai-agent-skill`, plus `payluk.ng`, `api.payluk.ng`, archive and reader
proxies: all 403). Routing around a policy denial is not permitted, so it was not
attempted.

Everything in section 3 was reconstructed from three permitted sources:

1. **npm**, which is allowlisted: `payluk-escrow-inline-checkout@0.3.0` (its
   README and built `dist/`).
2. **Search-index snippets** of a single docs page,
   `/api-reference/disputes/resolve-dispute`, plus Payluk marketing and terms
   pages.
3. **GitHub code-search fragments** of a public repository that vendored
   Payluk's own agent skill (`.agents/skills/payluk-api/`): `SKILL.md`,
   `references/endpoints.md`, `flows.md`, `webhooks.md`,
   `errors-and-statuses.md`, `openapi.json`.

**Source 3 is a third-party copy and may be stale or edited.** Field names are
reproduced verbatim from it, which means they are either exactly right or exactly
wrong, with no middle ground.

**Therefore: no line of Payluk code may be written against this document.**
Session 2's first task on the Payluk track is to read the live documentation in
an environment that can reach it, and to correct this file. Until then section 3
is a hypothesis about an API, not a specification of one.

The open questions for Payluk support are in section 7.

---

## 1. Where money stands today

| Rail | State |
|---|---|
| **Paystack** | The only live rail. About 149 files. Split at the moment of charge, three legs, settled atomically |
| **Yellow Card** | Fully built, behind a provider interface, off behind five independent gates, never run against a real merchant account |
| **Payluk** | Does not exist in the codebase. Zero references |
| **Virtual accounts** | No code, ever. Mentioned in five documents, which should be corrected |
| **Custody** | Retired by ADR-0002 on 25 September 2026, enforced by a schema move, revoked grants, off flags that refuse to turn on, and an event trigger refusing custody-named objects |

### 1.1 The Paystack split, which is the thing to understand first

One charge, three destinations, one transaction:

| Leg | Destination | Size |
|---|---|---|
| The lister's share | The lister's own Paystack subaccount, settling to their bank | The remainder |
| The Guarantee contribution | A separate reserve subaccount | `money_policy.guarantee_bps`, 150 today, range 100 to 200, taken out of the lister's share |
| Vallo's commission | Vallo's account | `fee_rates` commission, zero today |

A check constraint refuses a `transactions` row whose three parts do not sum to
the charge. `ledger_entries` carries the same discipline. Money never stops
moving, so Vallo never holds it, so no CBN custody question arises.

**`PAYSTACK_GUARANTEE_SUBACCOUNT` is unset, so no payment opens at all today.**
That is the single switch between a well-built money layer and a working one.

### 1.2 What is missing architecturally

**There is no fiat provider interface.** Paystack is called directly across
about 149 files. The crypto path, by contrast, has a proper interface
(`lib/crypto/provider.ts`) with a selector and a stub. That asymmetry is the
highest-value refactor in the money layer and it is worth doing even if Payluk
never ships, because it is what makes the fiat rail testable and replaceable.

---

## 2. The constitutional position

ADR-0002, 25 September 2026: **Vallo never holds customer money.** No wallet, no
balance, no escrow, no held payment, no withdrawal.

The stated reason: holding client funds between two parties is regulated by the
Central Bank of Nigeria, and VALLO SPACES LTD's objects clause does not cover
it. Every escrow sentence in the product was "a promise the company could not
lawfully keep".

`THE_AUDIT.md` section 11 item 3 asked for a written legal opinion on exactly
this question on 23 September. **It has not been obtained.** It is the single
largest blocker in this document.

**The rule this file adds:** a provider holding money on Vallo's behalf, for
Vallo's users, is still a custody arrangement. It changes who is licensed and who
is liable. It does not make the question go away, and it must not be treated as a
workaround.

---

## 3. What Payluk appears to be (UNVERIFIED: see section 0)

### 3.1 Product shape

Payluk is **escrow-as-a-service** for Nigerian merchants: a REST API offering
standard escrow, milestone escrow, vault escrow, per-customer wallets, payouts to
banks, disputes, and an inline checkout widget.

Payluk's marketing says escrow funds are "held with CBN-licensed partner banks".
**Payluk therefore appears not to be the licensed institution itself**, which
makes the custody chain Vallo to Payluk to a partner bank. Whose money it is at
each hop is a question for counsel, and Payluk's answer must be in writing.

### 3.2 Three findings that change the architecture

These are the reasons Payluk is not a drop-in anything.

#### Finding A: Payluk cannot perform Vallo's three-way split

One escrow has one seller. Release pays that seller, net of a fee share. The
merchant separately earns a `commission` and an optional `additionalFee`, both
landing in the merchant's own Payluk wallet. No multi-recipient split at release
was found outside a dispute `SPLIT`, which is a dispute outcome, not a payment
structure.

**So Payluk cannot replicate the Paystack split.** Vallo's Guarantee reserve
contribution has no atomic third leg. It would have to arrive in Vallo's merchant
wallet and then be moved to the reserve by a separate transfer, which turns one
atomic transaction into two steps with a reconciliation obligation between them.

**Consequence: Payluk is not a second rail for the existing model. It is a
different product, for a different flow, with custody at its centre.**

#### Finding B: Vallo, not Payluk, would arbitrate every money dispute

`POST /v1/escrow/dispute/resolve/{escrowId}` is a merchant endpoint. The merchant
decides `COMPLETED`, `REFUNDED` or `SPLIT`, and on a split must supply
`sellerAmount` and `buyerAmount` summing exactly to what the escrow still holds.
The skill's own words: Payluk does not arbitrate; the merchant does.

**This means Vallo would become the judge of who keeps a guest's money.** That is
a consumer-protection posture, not a feature. It needs:

- A written dispute policy with an SLA, an escalation path and a forum, none of
  which exists today (`SESSION-1-RESPONSE.md` section 14).
- Two-person rulings. The platform already has this pattern for rulings at or
  above ₦500,000 and it currently fails closed because no second super admin has
  been appointed.
- An append-only record of every ruling with the evidence that supported it. The
  caution-dispute and Guarantee-claim machinery is the right precedent and can be
  reused.
- Counsel's view on whether arbitrating funds held by a third party on Vallo's
  behalf changes Vallo's regulatory character.

#### Finding C: no documented idempotency key, and no failure webhooks

No `Idempotency-Key` header or equivalent was found on `escrow/create`,
`payment/escrow` or `create-intent`. The only stated idempotency is that
re-verifying the same payment `reference` is idempotent.

Separately, **no `*.failed` or `*.reversed` webhook events are documented.** Only
success events were found.

**Consequences:** Vallo must own idempotency at its own boundary, using the
`idempotency_records` table and `withIdempotency` that already exist, keyed on a
Vallo-generated reference. And failure must be discovered by reconciliation
polling, not by waiting for an event, exactly as `/api/cron/crypto-reconcile`
already does for Yellow Card. A money integration that learns about failure only
by asking is workable; one that assumes it will be told is not.

### 3.3 Mechanics, as far as they could be established

**Environments and auth.** Staging `https://staging.api.payluk.ng`, production
`https://api.payluk.ng`, everything under `/v1`. `Authorization: Bearer <secret
key>`, where the prefix selects the environment: `sk_test_` for staging,
`sk_live_` for production. Publishable `pk_live_` keys are browser-only. Some
routes require a merchant super-admin key. Production enforces an IP allowlist if
one is configured; staging never checks.

**The `customer-id` header** names which merchant customer a call acts for. It is
required on wallet, payment, confirm, card and per-customer dispute routes;
forbidden on merchant-wide routes, which reject it outright. Getting this wrong
is a 400-class error in both directions, so the adapter must encode the rule
rather than leave it to call sites.

**Response envelope.** `{ status, message, data }`. Errors put the reason in
`message` and `{}` in `data`. `400` covers validation, wrong state and not found
alike, so the adapter cannot distinguish them by status code and must read
`message`.

**The escrow lifecycle.**

```
AWAITING_PAYMENT  editable, deletable
   │ buyer funds (wallet or card, or hosted widget)
   ▼
OPENED / ONGOING  funds held; delivery window = maxDelivery × deliveryTimeline from paidAt
   ├─ buyer confirms ──────────────► CLOSED / COMPLETED   seller paid net of fee
   ├─ seller claims after window ──► CLOSED / CLAIMED
   └─ buyer disputes ─► DISPUTED ─► seller responds ─► INVESTIGATING
                                      │ merchant resolves
                                      ├─► COMPLETED
                                      ├─► REFUNDED
                                      └─► SPLIT  sellerAmount + buyerAmount
```

**Partial release** exists only through milestones or a dispute `SPLIT`. **No
cancel or refund endpoint for a funded escrow outside a dispute was found**,
which matters a great deal for a stays product: a guest cancelling three weeks
before check-in is a routine event, not a dispute, and there is no documented way
to return their money without opening one. **This is open question 3 and it may
be disqualifying for the booking flow.**

**Fees are collected in every outcome**, including a cancelled vault.

**Webhooks.** One dashboard callback URL per environment. Header
`x-payluk-signature`, hex **HMAC-SHA512 over the raw request body**, keyed with
the environment's secret key. 10 second timeout, up to 3 retries with
exponential backoff, best effort, never rolled back. Envelope `{ event, data }`.
Deduplicate on `data.reference` for payment events and `data.id` plus `event` for
escrow events.

The HMAC-SHA512-over-raw-body shape is **identical to Paystack's**, which Vallo
already implements with `timingSafeEqual` in `lib/payments/paystack.ts`. That
verification code is the template. Note that no timestamp is mentioned, so there
is no replay window, the same weakness already flagged on the Yellow Card webhook.

**Wallets.** Per-customer, with `mainBalance` (spendable) and `escrowBalance`
(locked). The merchant has its own balance receiving `commission` and `delivery`.
Wallet-to-wallet transfer exists. Per-customer permissions `canWithdraw`,
`canBuy`, `canSell`, plus block and unblock.

**Payouts.** Stage an intent with `transactionType: withdrawal` and
`withdrawalDetails`, resolving the account first with `verify-account`, then
`verify` with the reference and an OTP where required. Payluk sets the fee on the
intent, so it must be read back rather than assumed.

**Virtual accounts are deprecated.** `POST /v1/payment/virtual-account` is marked
deprecated and the customer documentation says virtual accounts are no longer
issued. This independently confirms the founder's decision to drop that approach.
The five Vallo documents that still describe it should be corrected.

**No cNGN anywhere.** The brief's instruction not to build on Payluk cNGN is
moot: no cNGN surface was found. The only crypto surface is a BSC withdrawal path
and a master deposit address, which is out of scope and should stay out.

**Fee schedule is not documented at all.** No percentages, no caps, no withdrawal
fee table, no dispute fee. **Nothing can be priced until Payluk supplies this.**

**The agent skill** is a `SKILL.md`-format skill, not an npm package, carrying an
`openapi.json` and two scripts (a request CLI and a webhook signature verifier).
Its ground rules match the mechanics above and it explicitly tells integrators
never to reference virtual accounts.

**The only real npm package** is `payluk-escrow-inline-checkout@0.3.0`, MIT, a
browser widget with a React hook. It creates a session against
`live.payluk.ng` or `staging.live.payluk.ng` and loads a script from
`checkout.payluk.ng`. **A third-party script in the payment path is a CSP
decision**, and Vallo's CSP is nonce-based and strict. Session 2 must decide
whether to use the widget at all or to drive the API directly.

---

## 4. The architecture

### 4.1 The principle

**Vallo is never the custodian and never the ledger of record for customer
funds.** Where a provider holds money, Vallo holds a *mirror*: a reconciled,
non-authoritative copy, labelled as such in the schema, in the code and in the
words on the screen.

### 4.2 The provider interface

Build `PaymentProvider` for fiat, modelled on the crypto interface that already
works. It must express what the existing rail does and what Payluk would do,
without either leaking into shared code:

- Capability declaration, because the providers are not equivalent. Paystack can
  split at payment and cannot hold. Payluk can hold and cannot split. Call sites
  must ask what a provider can do rather than assume.
- Collection, with a Vallo-generated reference that is the idempotency key on
  Vallo's side regardless of what the provider offers.
- Verification by reference, which both providers support and which is the only
  trustworthy way to learn an outcome.
- Signature verification over a raw body.
- Reconciliation: read every moving payment back from the provider on a schedule
  and apply it through the same single door, exactly as
  `/api/cron/crypto-reconcile` does.
- A per-provider kill switch, read on every render and again in every server
  action.

**Paystack moves behind this interface with no behaviour change, and no
migration.** That is the deliverable: identical behaviour, one seam. If the
refactor changes a single money outcome, it has failed.

### 4.3 The ledger

The existing structure stays authoritative for Vallo's own books:
`transactions`, `ledger_entries` with its summing constraint,
`guarantee_reserve_entries` append-only.

A provider-custodied track adds mirror tables, deliberately named so that nobody
can mistake them for Vallo liabilities, and so that the existing event trigger
refusing custody-named objects stays untouched:

| Table | Holds |
|---|---|
| `payluk_customers` | The mapping from a Vallo user to a Payluk customer id |
| `payluk_escrows` | One row per escrow: Vallo reference, Payluk `paymentToken` and `id`, state, status, amounts, the booking it belongs to |
| `payluk_escrow_events` | Append-only, one row per webhook or reconciliation observation, unique on `(event, provider_event_id)` |
| `payluk_balance_mirror` | Last observed `mainBalance` and `escrowBalance`, with the time observed |
| `payluk_payouts` | One row per payout intent and its outcome |

**Three rules on the mirror.** It is never read as truth for a decision that
moves money. It always carries the time it was observed, and the interface shows
that time. A disagreement between mirror and provider raises an alert for a human
rather than being silently corrected.

**Do not name anything `wallet`, `escrow`, `balance` or `custody`.** The guard
exists for a reason and the naming is the documentation.

### 4.4 Flow comparison

```
TODAY (Paystack, no custody)
guest pays ──► Paystack splits atomically ──► lister's bank
                                          ├─► Guarantee reserve
                                          └─► Vallo commission
Vallo holds: nothing. Vallo records: transactions + ledger_entries.

PAYLUK TRACK (custody at the provider)
guest pays ──► Payluk escrow ──► funds held at Payluk's partner bank
                                   │
                        booking confirmed / check-in
                                   ▼
                            release to lister
                                   ├─► Vallo commission to Vallo's Payluk wallet
                                   └─► Guarantee contribution: NO ATOMIC LEG
                                       requires a second transfer, reconciled
Vallo holds: nothing. Vallo records: a mirror. Vallo decides: every dispute.
```

---

## 5. The three tracks

### Track 1: now, no legal dependency, no real money

1. **The `PaymentProvider` interface**, with Paystack behind it, behaviour
   unchanged.
2. **Prove the existing rail.** Set `PAYSTACK_GUARANTEE_SUBACCOUNT`, register the
   webhook, and take one test-mode payment end to end from a real device through
   the Capacitor WebView, including 3-D Secure, which the native audit calls the
   single most likely failure. Until this is done, no new payment work is
   justified.
3. **Referral rewards as booking credit.** A credit applied at checkout against a
   future booking is a discount on Vallo's own revenue. It is not client funds,
   it needs no custodian, it cannot be withdrawn, and it only costs Vallo when
   the referred member actually transacts. It sidesteps the regulated activity
   entirely.
4. **Payluk on staging only.** Test keys, `staging.api.payluk.ng`, Payluk Test
   Bank, no real customer money at any point. This proves the adapter, the
   webhook signature, the dispute path and the reconciler against a real API,
   and it answers most of section 7's questions empirically. **This is the single
   most valuable Payluk work available before the letter exists, and it is
   entirely safe.**
5. **Correct the documents** that still describe virtual accounts.

### Track 2: blocked on the legal opinion

Production Payluk. Real escrow holds. Provider-custodied balances. Cash referral
withdrawal. Release on check-in. Vallo arbitrating live disputes.

**Gated, fail-closed, on the `lib/crypto/gate.ts` pattern:** several independent
conditions, checked on every render and again in every server action, so a
half-configured custody feature cannot appear in the interface. At minimum:
the flag is on; the provider is fully configured; counsel's opinion is recorded;
a second super admin exists so two-person rulings do not fail closed; the dispute
policy page is published; the Terms version has been bumped and re-accepted.

### Track 3: leave alone

Yellow Card. It is correct, it is off behind five gates, and it is waiting on an
SEC VASP opinion. Do not extend it. Do not add assets. Do not build a crypto
balance. The one improvement worth making is the replay window named in the TODO
at `lib/crypto/providers/yellowcard.ts:246`.

---

## 6. What must be true before Track 2

| # | Requirement | Owner |
|---|---|---|
| 1 | Written legal opinion: may Vallo operate provider-custodied balances with Payluk as custodian, without its own CBN licence, and does the objects clause need amending | Founder and counsel |
| 2 | Payluk's licence position in writing: what it is licensed to do, who the regulated entity is, which partner banks hold funds, and whose money it is at each hop | Founder |
| 3 | Counsel's view on Vallo arbitrating disputes over funds held by a third party on its behalf | Counsel |
| 4 | ADR-0003, superseding ADR-0002, written before any production code | Session 1 or 2, on the founder's instruction |
| 5 | `lib/money/copy.ts` rewritten. Every sentence currently says Vallo never holds your money. Under Track 2 the true sentence names Payluk. This is a legal act, not a copy tweak | Session 2, reviewed by counsel |
| 6 | Terms and Privacy version bump with re-acceptance, because the answer to "who holds my money" is changing. Terms §17 already promises notice before significant changes | Founder and Session 2 |
| 7 | A published dispute policy: SLA, escalation, forum, FCCPC reference | Founder and counsel |
| 8 | A second super admin appointed, so two-person rulings stop failing closed | Founder |
| 9 | Payluk's fee schedule in writing, or nothing can be priced | Founder |
| 10 | Section 7 answered, especially question 3 | Founder with Payluk |

---

## 7. Open questions for Payluk

Ordered by how much a wrong answer would hurt. Question 3 is the one that could
disqualify Payluk for bookings outright.

1. **Fee schedule.** Percentages and caps per `whoPays`, the merchant commission
   share, the withdrawal fee table, dispute fees, VAT handling.
2. **Idempotency and rate limits.** Is there an `Idempotency-Key` on
   `escrow/create`, `payment/escrow` and `create-intent`? What are the numeric
   rate limits per key?
3. **Refund or cancel of a funded escrow without a dispute.** A guest cancelling
   a booking weeks ahead is routine. Is there any path to return their money that
   is not a dispute? Is any refund possible after `COMPLETED` or `CLAIMED`? **If
   the answer is no, Payluk escrow cannot carry Vallo's booking flow as designed,
   and this should be established before any further work.**
4. **Auto-release.** Does Payluk release automatically when the delivery window
   elapses, or only when the seller calls `claim-funds`? Does the 24-hour
   post-claim buyer window described in marketing apply to API escrows?
5. **Split at release.** Can one escrow pay several recipients, so that the
   lister's share, Vallo's commission and the Guarantee contribution settle
   atomically? Can Vallo set a per-escrow platform commission?
6. **Payout SLAs and limits.** Bank settlement time, per-transaction and daily
   limits, cut-off times, and how the merchant wallet itself withdraws.
7. **Webhooks.** Are there failure or reversal events? Milestone-level events?
   Is there a replay or resend tool? Do staging webhooks fire? What is the event
   ordering guarantee? Are there source IP ranges? Is the signature over retries
   identical?
8. **Disputes.** SLA, evidence file size and type limits, and whether `SPLIT`
   works on milestone escrows.
9. **Direct bank funding.** Can a buyer fund an escrow by bank transfer without
   first topping up a wallet? What exactly is `checkoutConfig`?
10. **Customer KYC.** Tiers, BVN and NIN requirements, wallet limits per tier,
    foreign customers, the NDPR data processing agreement, and data residency.
11. **Enums.** The values of `settlementType`, whether `CANCELLED` exists, and
    whether `maxDelivery` in minutes is supported for short bookings.
12. **The agent skill.** Official install instructions, version and changelog,
    and confirmation that the vendored copy this document relied on matches the
    live guide.

---

## 8. Session 1's recommendation

**Build Track 1. Design Track 2. Build Track 2 only when the letter exists.**

Track 1 delivers a testable provider seam, a referral programme that pays, a
proven existing rail, and a complete Payluk integration exercised against real
staging infrastructure with no customer money anywhere near it. That is most of
the brief's value, in weeks, with no regulatory exposure and no new liability.

Track 2's additional value over Track 1 is convenience: funds resting in a
balance between transactions, and a hold released at check-in. That convenience
is precisely what the licence covers, and Finding B means it also makes Vallo the
judge of every disputed naira.

**And answer question 3 first.** If a funded Payluk escrow cannot be refunded
outside a dispute, then every ordinary guest cancellation becomes a dispute that
Vallo must rule on. That is not an integration detail. It would make Payluk the
wrong tool for bookings, and it is one email to find out.
