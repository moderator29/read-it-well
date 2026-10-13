# Vallo feature register

**From Session 1, 5 October 2026.** The complete inventory, extracted line by line
from the founder's Master Prompt (61 sections), First Definitive Follow-Up Addendum
(86 sections), Second Follow-Up Addendum (39 sections), Third Follow-Up Addendum
(20 sections) and the Payments + Payluk Master Implementation Prompt (75 sections).
**1,547 discrete requirements were extracted.** This register is the consolidated
product view of them.

It replaces `NEW-FEATURES.md`, which was too compressed to be useful: the referral
engine alone is 8 statuses, 10 anti-farming signals, 10 user metrics and 12 admin
metrics, and that file had it as one line.

**Status key.** **NEW** does not exist. **UPGRADE** exists and must be reworked.
**COMPLETE** exists and must be finished. **KEEP** exists and is correct, listed
only where a session would otherwise rebuild it. **DEFER** deliberately later.

**Owner key.** S2 backend, money, trust. S3 experience. S4 QA, release, docs.
F founder.

**The breadth rule, from Third Addendum section 5 and 6:** the prompts are a
strategic direction, not a feature checklist. Every route, dashboard, workspace,
navigation item, flow, modal, form, settings area, profile, listing workflow, admin
page, mobile page, web page, auth state, onboarding state, empty state, error
state, loading state, success state, detail page, management page, document area,
payment flow and notification surface is inspected and classified
**KEEP → UPGRADE → REWORK → COMPLETE → REPLACE → DEFER**. Nothing escapes because
it was not named.

---

# A. THE SPACE MODEL AND TRUST

| # | Item | Status | Owner | Detail |
|---|---|---|---|---|
| A1 | **Space as the core object** | UPGRADE | S2 S3 | The spec makes Space the central entity across 15 categories: homes, apartments, land, property, hotels, motels, short-lets, restaurants, offices, retail, event spaces, warehouses, local businesses, services, other physical spaces. The code's central entity is `listings` with a 10-value `property_type`. **This is a model and vocabulary change across 200 pages, 4 locales and a terminology test.** See the conflict register, C-3 |
| A2 | **Space ID / Space Passport** | UPGRADE | S2 S3 | Persistent identifier, format `VSP-ABJ-000184`. `renter_passports` and `passport_shares` already exist as V-100 and are the foundation. **Caution: an identifier encoding city plus sequence leaks how few members there are.** Either accept that or make it opaque |
| A3 | **Space Passport contents, 19 items** | NEW | S2 S3 | location, space type, photographs, floor plans, amenities, ownership and authority evidence, documents, inspection history, condition, maintenance, previous listings, price history, availability, utilities, neighbourhood information, reviews, transaction history, verification history |
| A4 | **Passport visibility tiers** | NEW | S2 | What is public, what needs permission, what is private |
| A5 | **Passport survives ownership and tenancy change** | NEW | S2 | The passport belongs to the space, not the lister |
| A6 | **Trust Engine, 14 components** | UPGRADE | S2 S3 | identity verification, property verification, document verification, location verification, inspection, duplicate detection, fraud and risk signals, ownership and authority evidence, verification expiry, last verified, listing history, price history, suspicious behaviour, "Why trust this space?" |
| A7 | **"Why trust this space?" surface** | NEW | S3 | A named explanatory screen. The product's strongest argument, currently implicit |
| A8 | **"Last verified" and "What was verified?"** | UPGRADE | S3 | Timestamps already render as dates rather than ticks, which is correct and must be kept |
| A9 | **Verification expiry** | NEW | S2 | Verification decays. Nothing currently expires |
| A10 | **Duplicate space detection** | NEW | S2 | Photo hashing exists as a backfill job; duplicate detection as a product control does not |
| A11 | **Fraud Radar** | NEW | S2 S3 | Named system. Risk signals, clusters, suspicious behaviour |
| A12 | **No absolute-guarantee rule** | KEEP | S2 S3 | "Never make verification sound like an absolute guarantee." Already the product's rule |
| A13 | **vNIN identity provider** | COMPLETE | S2 F | Production default is `unconfigured`; only a stub exists. Aggregator choice is the founder's |
| A14 | **Phone verification** | COMPLETE | S2 F | Built, behind `PHONE_SIGNIN_ENABLED`, off. **Blocks the referral engine: see D4** |
| A15 | **BVN resolution and match** | NEW | S2 F | Named in the founder's own earlier research. Not built |
| A16 | **Blocked terms list** | NEW | S2 | Ships empty. Apple 1.2 and Google UGC exposure |
| A17 | **Sanctions list loaded** | NEW | F | Every screening records `no_list`, never `clear` |
| A18 | **Listing lifecycle, explicit** | UPGRADE | S2 | The spec names a lifecycle; the code has an 8-value `listing_status`. Reconcile |
| A19 | **Ownership and authority evidence** | UPGRADE | S2 | `listing_mandates` and SCUML item 17 exist. Extend to the passport |
| A20 | **Reviews and reputation** | UPGRADE | S2 S3 | Exists with withheld weight for shared identities. Hotel stays still cannot be reviewed |
| A21 | **Moderation and abuse** | UPGRADE | S2 | Exists. Needs the word list and a mobile-usable queue |
| A22 | **The 12-stage space lifecycle as product spine** | NEW | S3 | Discover, Understand, Verify, Compare, Visit, Decide, Pay, Contract, Move or Stay, Manage, Maintain, Review or Reuse. Nothing currently expresses this as a journey |

# B. UNDERSTAND: cost, location, intelligence

| # | Item | Status | Owner | Detail |
|---|---|---|---|---|
| B1 | **True Cost Engine** | UPGRADE | S2 S3 | 10 components: rent, deposit, agency fees, legal fees, service charge, utilities, recurring charges, booking fees, move-in expenses, other known costs. The listing model already carries most as indexed columns with `total_move_in_cost_minor` first class. **This is the strongest existing moat; finish it rather than rebuild** |
| B2 | **Tax lines in true cost** | NEW | S2 F | Stamp duty on tenancy, withholding tax on rent to corporate landlords, VAT on service fees. **Absent from code and from the spec.** Blind spot B-05 |
| B3 | **No late-stage cost reveals** | KEEP | S3 | Already the rule: the card leads with move-in total, rent secondary |
| B4 | **Location Intelligence** | NEW | S2 S3 | Neighbourhood context, amenities, commute. PostGIS and `listings_in_bounds` exist and nothing calls them |
| B5 | **Commute Intelligence** | NEW | S2 S3 | Named feature |
| B6 | **Utility Intelligence** | NEW | S2 S3 | Named feature. Power band, backup hours, water, prepaid meter already stored as structured columns, which is the hard part done |
| B7 | **Area following** | NEW | S2 S3 | Follow an area and receive its activity |
| B8 | **Market Intelligence** | NEW | S2 S3 | Rent trends, price trends, demand, supply, neighbourhood comparisons, popular searches, emerging areas, development activity, investment insights. **Rule: do not present weak data as authoritative** |
| B9 | **Price Check** | COMPLETE | S2 | Built, with its own event table, returning nothing because all 64 listings are demo |
| B10 | **Development Tracker** | DEFER | S2 S3 | Named WOW feature |
| B11 | **Rent vs Buy** | NEW | S3 | Named WOW feature. No calculator exists |
| B12 | **Investor Simulator** | NEW | S3 | Named WOW feature. Yield and payback. Nothing exists |
| B13 | **Affordability calculator** | NEW | S3 | Not in the spec and needed by the buy side and Diaspora. Blind spot B-22 |
| B14 | **Move-in cost calculator** | KEEP | S3 | Exists as a public tool |
| B15 | **Compare spaces** | UPGRADE | S3 | Saved-listing comparison exists. The spec wants it as a premium capability |
| B16 | **Space Intelligence report** | NEW | S2 S3 | Deep per-space report. A premium product |
| B17 | **Space Planner, Furnish This Space, AI Space Tour** | DEFER | S3 | Named WOW features. High cost, unproven value, and they do not strengthen the moat |
| B18 | **Space Intelligence Map** | DEFER | S3 | Named WOW feature |

# C. DISCOVER: search, feed, social

| # | Item | Status | Owner | Detail |
|---|---|---|---|---|
| C1 | **Discover / Feed as a daily-use layer** | UPGRADE | S2 S3 | The strategic centre of the spec: people need housing once every few years, so Vallo needs a reason to open daily. "The living feed of the physical world." The social layer exists behind a kill switch and is the foundation |
| C2 | **Feed naming decision** | NEW | S3 | Feed, or Discover, or both. The code calls it Around, which `PRODUCT.md` mandates |
| C3 | **21 feed content types** | NEW | S2 S3 | new spaces, verified spaces, price drops, newly available, hotels, short-lets, restaurants, businesses, events, neighbourhoods, market insights, development news, local discoveries, professional insights, space stories, useful comparisons, trending spaces, popular areas, new businesses, open houses, community discussions |
| C4 | **Ranking and personalisation** | NEW | S2 | The published organic ranking formula exists for search. The feed needs its own, equally published |
| C5 | **15 social mechanics** | UPGRADE | S2 S3 | follows, saves, likes, comments, sharing, collections, area following, category following, space watching, alerts, recommendations, trending, personalised feed, community discussion, professional content. Most exist |
| C6 | **Collections** | NEW | S2 S3 | Named feature. Saved items exist; curated collections do not |
| C7 | **Space Watch** | NEW | S2 S3 | Watch a space for price, availability, verification and photo changes. Saved-search alerts exist as the nearest thing |
| C8 | **Search as core infrastructure** | UPGRADE | S2 | Postgres FTS plus trigram. The spec treats search as infrastructure, not a page |
| C9 | **Feed, discovery and search must connect** | NEW | S2 S3 | One intent model across all three |
| C10 | **Personalisation** | COMPLETE | S2 S3 | Interests are collected and then ignored by `/home`; only `/search` reads them |
| C11 | **No filler social content** | KEEP | S3 | "Every social mechanic should connect to physical-world utility" |
| C12 | **Daily retention loop** | NEW | S3 | The spec's named loop, end to end |
| C13 | **Professional and business participation in the feed** | NEW | S2 S3 | Businesses and professionals post |
| C14 | **Moderation and spam control for the feed** | UPGRADE | S2 | Exists partially. The word list is empty |
| C15 | **Restaurants and reservations** | KEEP | S2 S3 | A whole market the spec never mentions. Blind spot B-19 |

# D. REFERRALS AND GROWTH

The spec's most detailed growth system. Attribution exists; everything below is new.

| # | Item | Status | Owner | Detail |
|---|---|---|---|---|
| D1 | **Referral engine** | NEW | S2 | `referral_codes`, the `/join/<code>` door and `admin_referral_counts` exist. Economics do not |
| D2 | **Economics evaluation** | NEW | S1 F | ₦76 per qualified referral and ₦80 minimum withdrawal, both explicitly not final. Session 1's answer is in the economics note below |
| D3 | **9-step qualification flow** | NEW | S2 | signup → email verification → **phone verification** → onboarding activity → anti-abuse checks → qualification → reward pending → review window → available → withdrawal → payout |
| D4 | **Phone verification dependency** | NEW | F | **The engine cannot qualify anybody until an SMS provider is bought and `PHONE_SIGNIN_ENABLED` is on.** Nothing in the spec connects these. Blind spot B-15 |
| D5 | **8 reward statuses** | NEW | S2 | Pending, Qualified, Approved, Available, Processing, Paid, Reversed, Under Review |
| D6 | **Reward ledger** | NEW | S2 | Append-only, consistent with the financial ledger |
| D7 | **10 anti-farming signals** | NEW | S2 | verified phone, device relationship, account relationships, referral graph, referral velocity, behaviour, activation, payout account relationships, suspicious patterns, repeated network relationships |
| D8 | **IP and device are signals, never blockers** | NEW | S2 | Families, offices, universities and apartments share networks. Hold for review rather than ban |
| D9 | **User referral dashboard, 10 surfaces** | NEW | S3 | total referrals, qualified, pending, available balance, paid amount, referral link and code, sharing options, referral activity, payout history, reward status |
| D10 | **Admin referral dashboard, 12 surfaces** | NEW | S2 S3 | totals, qualified, pending, under review, rejected, paid, reversed, fraud alerts, **relationship graphs**, **suspicious clusters**, payout history, campaign performance |
| D11 | **Campaign system** | NEW | S2 S3 | Named in the deliverables. Campaign performance per campaign |
| D12 | **Framing prohibitions** | KEEP | S3 | No investment-scheme presentation, no MLM or downline, no passive-income framing |
| D13 | **Reversal on refund or chargeback** | NEW | S2 | `Reversed` has no rule behind it. Blind spot B-18 |
| D14 | **Withdrawal of referral earnings** | NEW | S2 S3 | Depends on the wallet, section E |

**Session 1's economics answer.** ₦76 against an ₦80 floor means one referral can
never be withdrawn, which will be read as a trick. A bank payout of ₦80 can cost
more in provider fees than the reward is worth, so cash payout at that size is
loss-making per transaction. The recommendation: express the reward in **basis
points of Vallo's take, in a table with effective dates**, never a hard-coded naira
figure, so a reward can never exceed revenue; qualify on the referred member's
**first paid booking**, released **after the Guarantee or escrow window closes**, so
Vallo never pays out on a booking that is refunded; **one reward per verified
identity, not per account**; a monthly ceiling per referrer; and **booking credit as
the launch instrument**, with cash withdrawal switched on once the wallet is live
and the anti-farming signals have been observed against real traffic. Credit has no
payout fee, cannot be farmed for cash, and only costs Vallo when the referred
member actually transacts.

# E. MONEY: the two-rail financial system

The founder's 5 October decision: **escrow through Payluk for rent, shortlet,
apartment, land and sale; direct Paystack split for hotels and restaurants.** The
principle the code encodes is the accountability of the counterparty. Full
architecture in `docs/payments/VALLO_PAYMENTS_ARCHITECTURE.md`.

## E1. Provider and account layer

| # | Item | Status | Owner | Detail |
|---|---|---|---|---|
| E1.1 | **Thin provider abstraction** | NEW | S2 | Does not exist for fiat: Paystack is called directly across ~149 files. "Do not scatter Payluk calls throughout the application." Capability declaration at its centre, because Paystack splits and cannot hold while Payluk holds and cannot split |
| E1.2 | **`financial_provider_accounts`** | NEW | S2 | `id`, `user_id`, `provider`, `provider_customer_id`, `status`, `currency`, `created_at`, `updated_at`, `metadata`. **Vallo users and Payluk customers are never the same entity** |
| E1.3 | **Payment rail router** | NEW | S2 | Policy table with effective dates, never a condition in code. `transactions.rail` written at open, never altered. Fails closed |
| E1.4 | **Financial onboarding flow** | NEW | S2 S3 | Explains why information is required, what Payluk does, what Vallo does, what is being verified, whether the account is ready, what actions remain. **Must not feel like an ugly fintech form** |
| E1.5 | **7 onboarding states** | NEW | S2 | `NOT_STARTED`, `PENDING`, `VERIFICATION_REQUIRED`, `ACTIVE`, `RESTRICTED`, `SUSPENDED`, `FAILED` |
| E1.6 | **No duplicate customer records** | NEW | S2 | Explicit rule |
| E1.7 | **Secrets never in the database, never in the browser** | NEW | S2 | Explicit rule |

## E2. Wallet, deposit, withdrawal, transfer

| # | Item | Status | Owner | Detail |
|---|---|---|---|---|
| E2.1 | **Wallet / Money screen** | NEW | S3 | States **Available, In Escrow, Pending, Processing**, mapped from provider `mainBalance` and `escrowBalance`. Actions: Add Money, Withdraw, Send, Transactions. A Protected Transactions section. **Must not confuse available funds with protected escrow** |
| E2.2 | **No invented balance** | NEW | S2 S3 | "Do not invent a fake wallet balance." All financial state server-authoritative. Frontend calculations are never the source of truth |
| E2.3 | **Deposit via payment intent** | NEW | S2 | Deposit → payment intent → provider processing → verification → webhook → transaction update → ledger event → updated balance. **Never successful because the frontend says so** |
| E2.4 | **Deposit record, 10 fields** | NEW | S2 | internal transaction id, provider reference, amount, currency, fee, status, timestamps, provider metadata, event history, receipt relationship |
| E2.5 | **Withdrawal flow, 13 steps** | NEW | S2 S3 | Available balance → Withdraw → select bank → enter account number → verify account → show verified name → enter amount → show provider fee → show net → confirm → intent → provider execution → webhook → completed |
| E2.6 | **Withdrawal screen, 8 disclosures** | NEW | S3 | withdrawal amount, provider fee, VAT if applicable, total debited, expected received amount, destination account, status, reference |
| E2.7 | **Never hard-code provider fees** | NEW | S2 | Read the fee the provider returns on the intent |
| E2.8 | **Bank list and account verification** | NEW | S2 S3 | Handle invalid account, unavailable bank, timeout, provider error, mismatch, verification unavailable, retry, rate limiting. **Never silently proceed when verification fails** |
| E2.9 | **`bank_accounts`** | UPGRADE | S2 | Exists for payout accounts. Extend for wallet withdrawal |
| E2.10 | **`withdrawals`** | NEW | S2 | Table |
| E2.11 | **Failed and returned payouts** | NEW | S2 S3 | Dormant account, name mismatch, bank downtime. Not in the spec. Blind spot B-07 |
| E2.12 | **Wallet-to-wallet transfer** | NEW | S2 S3 | Send → recipient → amount → fee → confirmation → transfer → verification → webhook → receipt |
| E2.13 | **`wallet_transfers`** | NEW | S2 | Table |
| E2.14 | **Transfer protections, 7** | NEW | S2 | accidental duplicate, double submission, replay, unauthorised transfer, insufficient funds, invalid recipient, transfer to blocked account. Irreversible actions require confirmation |
| E2.15 | **Transfers must be AML-observed** | NEW | S2 | The live threshold and structuring observers watch charges and refunds, not balance movements. **A transfer between users is exactly what they exist to see.** Blind spot B-11 |
| E2.16 | **Wallet KYC tiers and limits** | NEW | S2 F | Not in the spec. Without tiers this is an unlimited unverified wallet. Blind spot B-13 |
| E2.17 | **Crypto withdrawal stays hidden** | KEEP | S2 | "Do not expose crypto withdrawals unless Vallo's product and legal design explicitly enables them" |

## E3. Escrow and the conditions engine

| # | Item | Status | Owner | Detail |
|---|---|---|---|---|
| E3.1 | **Escrow as the protected rail** | NEW | S2 | "Vallo owns the workflow. Payluk owns the escrow execution." Exactly the mirror architecture |
| E3.2 | **Vallo's 12-state transaction machine** | NEW | S2 | `DRAFT` → `AGREED` → `AWAITING_PAYMENT` → `PAYMENT_PROCESSING` → `PROTECTED` → `FULFILLMENT` → `INSPECTION` → `CONDITIONS_PENDING` → `READY_FOR_RELEASE` → `RELEASE_REQUESTED` → `RELEASED` → `COMPLETED` |
| E3.3 | **`provider_status` is a separate field** | NEW | S2 | **Vallo business state must never be overwritten by provider status.** Payluk may say `OPENED` while Vallo says `READY_FOR_RELEASE`. This is the single most important schema rule in the financial layer |
| E3.4 | **`escrow_transactions`** | NEW | S2 | Table |
| E3.5 | **Vallo Conditions Engine** | NEW | S2 S3 | `escrow_conditions`: `id`, `transaction_id`, `type`, `description`, `required`, `status`, `evidence_id`, `satisfied_at`, `satisfied_by`. **This is how release is gated on reality rather than a clock** |
| E3.6 | **Conditions view** | NEW | S3 | Shows condition type, description, whether required, status, evidence, who satisfied it and when |
| E3.7 | **Milestone escrow for sale** | NEW | S2 S3 | `escrow_milestones`: `milestone_id`, `sequence`, `amount`, `description`, `condition`, `status`, `evidence`, `confirmed_at`, `released_at`. Amounts must sum to the total. **Milestone logic must never live only in frontend state** |
| E3.8 | **Inspection joined to money** | UPGRADE | S2 S3 | Move-in inspection, evidence captured, tenant confirms, release follows. The inspection system exists with photographed reports. **Inspection results must not be stored as meaningless attachments** |
| E3.9 | **Escrow UI and explainer** | NEW | S3 | You pay → money protected → condition completed → you confirm → funds released. Shows real status. **Must not make escrow look complicated** |
| E3.10 | **The agreement gate stays in front of escrow** | KEEP | S2 | Both parties confirm, an admin approves, then payment opens. Escrow holds what the gate permitted |
| E3.11 | **One protection per rail** | NEW | S2 F | Escrow is protected by the hold; direct is protected by the Vallo Guarantee. The Guarantee is live and absent from the spec. Blind spot B-08 |

## E4. Disputes, refunds, fees, receipts

| # | Item | Status | Owner | Detail |
|---|---|---|---|---|
| E4.1 | **Dispute state machine** | NEW | S2 | `DISPUTE_OPEN` → `UNDER_REVIEW` → `EVIDENCE_REQUESTED` → `EVIDENCE_SUBMITTED` → `RESOLUTION_PENDING` → `RESOLVED`, with outcomes `REFUNDED`, `PARTIALLY_SETTLED`, `RELEASED` |
| E4.2 | **`disputes`** | NEW | S2 | reason, description, opened_by, transaction, agreement, space, evidence, inspection, messages, provider_dispute_id, resolution, resolution_notes, financial_outcome, timestamps, audit events |
| E4.3 | **Vallo arbitrates, so Vallo needs the apparatus** | NEW | S2 S3 F | Payluk does not arbitrate; the merchant does. Needs two-person rulings, append-only records, nobody ruling their own case, and a **published dispute policy with an SLA and escalation**, which does not exist |
| E4.4 | **Second super admin** | NEW | F | Two-person rulings fail closed today because there is only one |
| E4.5 | **Refunds** | UPGRADE | S2 | `refunds` table. The three-stamp refund clock and five-business-day promise already exist and must be kept. **Never create a fake refund locally** |
| E4.6 | **Cancellation without a dispute** | NEW | S2 F | Open question to Payluk. If a funded escrow cannot be refunded outside a dispute, every ordinary cancellation becomes a ruling |
| E4.7 | **Card chargebacks** | NEW | S2 | Not in the spec, not in the code. A chargeback reverses money already released. Blind spot B-06 |
| E4.8 | **Fees shown, never buried** | NEW | S3 | Provider fee, VAT, net. "Do not bury fees" |
| E4.9 | **`receipts`** | NEW | S2 S3 | A real downloadable document with a share action |
| E4.10 | **Never fabricate a hash** | NEW | S2 S3 | For fiat, a provider reference is not a blockchain hash. Show blockchain information only if the provider returns it |

## E5. Ledger, integrity, operations

| # | Item | Status | Owner | Detail |
|---|---|---|---|---|
| E5.1 | **`financial_ledger_entries`, append-only** | NEW | S2 | `id`, `transaction_id`, `provider`, `provider_reference`, `event_type`, `amount`, `currency`, `direction`, `status`, `metadata`, `created_at`. **"Do not use `user.balance += amount` as the financial architecture"** |
| E5.2 | **14 ledger event types** | NEW | S2 | DEPOSIT_INITIATED, DEPOSIT_CONFIRMED, WITHDRAWAL_INITIATED, WITHDRAWAL_COMPLETED, TRANSFER_INITIATED, TRANSFER_COMPLETED, ESCROW_CREATED, ESCROW_FUNDED, ESCROW_RELEASED, REFUND_INITIATED, REFUND_COMPLETED, FEE_CHARGED, DISPUTE_OPENED, DISPUTE_RESOLVED |
| E5.3 | **Corrections are new events** | NEW | S2 | Ledger events are never silently edited |
| E5.4 | **The 19 financial tables** | NEW | S2 | `financial_provider_accounts`, `financial_transactions`, `payment_intents`, `payments`, `payment_events`, `escrow_transactions`, `escrow_conditions`, `escrow_milestones`, `withdrawals`, `wallet_transfers`, `disputes`, `refunds`, `settlements`, `receipts`, `financial_ledger_entries`, `provider_webhooks`, `reconciliation_records`, `bank_accounts`, `financial_audit_events`. **Inspect the existing schema first and do not duplicate existing entities** |
| E5.5 | **`provider_webhooks`** | NEW | S2 | `provider`, `event_id`, `event_type`, `payload`, `signature`, `received_at`, `processed_at`, `processing_status`, `retry_count`, `error`. Raw body persisted |
| E5.6 | **Webhook verification** | NEW | S2 | Signature over the raw body, constant-time. Payluk is HMAC-SHA512 hex, the same shape as the existing Paystack verifier. **Never process the same financial event twice** |
| E5.7 | **Idempotency owned by Vallo** | NEW | S2 | Payluk documents none. `idempotency_records` and `withIdempotency` exist and are the mechanism |
| E5.8 | **Three-way reconciliation** | NEW | S2 | Vallo records against provider state against money actually landed. `reconciliation_records` |
| E5.9 | **Timeout is `UNKNOWN`, never failure** | NEW | S2 | Check provider state before any retry. **Never retry a money-moving request blindly** |
| E5.10 | **Provider failure handling** | NEW | S2 S3 | Degrade honestly. Never hide a financial failure |
| E5.11 | **`financial_audit_events`** | NEW | S2 | Append-only |
| E5.12 | **Payment history with filters** | NEW | S3 | Types: deposits, withdrawals, transfers, escrow, refunds, fees. Filters: date, status, type, amount, space, counterparty, agreement. **Never blindly expose raw provider responses** |
| E5.13 | **Yellow Card as a USDC rail on a transaction** | KEEP | S2 | Tied to a specific transaction, never a crypto wallet screen. **Do not merge Yellow Card into Payluk code.** Already built, off behind five gates |
| E5.14 | **cNGN forbidden** | KEEP | S2 | Not exposed to users, no Vallo cNGN wallet, not the launch architecture. Payluk appears to offer no cNGN anyway |
| E5.15 | **Do not hard-code Nigeria** | NEW | S2 | Multi-currency and expansion readiness without over-engineering |
| E5.16 | **Live money machinery to keep** | KEEP | S2 | Caution register, flatmate rent splitting, refund clock, frozen move-in quotes, frozen cancellation terms, one-open-attempt discipline. **All absent from the spec**, so a session reading only the spec would break them. Blind spot B-09 |

## E6. Admin financial control plane

| # | Item | Status | Owner | Detail |
|---|---|---|---|---|
| E6.1 | **Admin Transactions** | NEW | S2 S3 | |
| E6.2 | **Admin Escrow** | NEW | S2 S3 | |
| E6.3 | **Admin Withdrawals** | NEW | S2 S3 | Buckets: pending, completed, failed, suspicious |
| E6.4 | **Admin Transfers** | NEW | S2 S3 | |
| E6.5 | **Admin Disputes** | NEW | S2 S3 | |
| E6.6 | **Admin Reconciliation** | NEW | S2 S3 | |
| E6.7 | **Admin Provider health** | NEW | S2 S3 | Payluk API, webhook health, Paystack, Yellow Card |
| E6.8 | **Admin Audit logs** | UPGRADE | S2 S3 | `audit_log` exists and is append-only |
| E6.9 | **Admin financial metrics** | NEW | S2 S3 | |
| E6.10 | **Granular admin permissions** | UPGRADE | S2 | Nine staff scopes exist. "Do not make every admin a super admin" |
| E6.11 | **7 financial notification types** | NEW | S2 S3 | Each linking to its transaction |

# F. MONETISATION AND ENTITLEMENTS

| # | Item | Status | Owner | Detail |
|---|---|---|---|---|
| F1 | **Entitlement system** | NEW | S2 | Feature keys from `listing_boost` through `business_pro`. Build now, exercise at zero |
| F2 | **Promotion tiers: Boost, Spotlight, Featured, Prime** | NEW | S2 S3 | **Directly conflicts with a live check constraint forcing `listings.featured = false` and a ranking test asserting no paid input. See the conflict register, C-4** |
| F3 | **Per-tier attributes, 7** | NEW | S2 S3 | duration, placement, expected exposure, audience, analytics, pricing, limitations |
| F4 | **Measurable promotion, 10 metrics** | NEW | S2 S3 | impressions, views, unique viewers, saves, shares, inquiries, contacts, viewings, bookings, transactions. Organic versus promoted where statistically valid. **Never manufacture numbers, never imply guaranteed leads** |
| F5 | **Agent Pro** | NEW | S2 S3 | CRM, leads, clients, portfolio, analytics, follow-ups, verification profile, team |
| F6 | **Owner Pro** | NEW | S2 S3 | Properties, tenants, rent, expenses, maintenance, inspections, documents, occupancy, performance |
| F7 | **Hospitality Pro** | NEW | S2 S3 | Reservations, calendar, occupancy, revenue, housekeeping, staff, maintenance, expenses, analytics. The host workspace is the foundation |
| F8 | **Business Pro** | NEW | S2 S3 | Profile, products and services, bookings, promotions, customers, analytics, reservations, offers |
| F9 | **Vallo Plus** | DEFER | S2 S3 | Consumer subscription |
| F10 | **Concierge** | DEFER | S2 S3 | Human-assisted discovery |
| F11 | **Paid inspection** | UPGRADE | S2 S3 | Permitted: a real person goes to a real property. The badge depends on the outcome, never the payment |
| F12 | **Commission engine** | KEEP | S2 | `fee_rates` with effective dates, set to zero, with a 30-day notice promise |
| F13 | **No monetising basic discovery** | KEEP | S3 | "Discovery should remain accessible" |
| F14 | **Tier naming rule** | NEW | S3 | Not Gold, Silver, Platinum. Tiers communicate what you get |

# G. OPERATE: workspaces and command centres

| # | Item | Status | Owner | Detail |
|---|---|---|---|---|
| G1 | **Six distinct workspaces** | UPGRADE | S3 | User, Owner, Agent, Hotel, Business, Admin. "Do not make one generic dashboard for everyone." Host and agent workspaces exist with 38 pages between them |
| G2 | **Owner and Landlord Command Centre** | NEW | S2 S3 | Properties, tenants, rent, expenses, maintenance, inspections, documents, occupancy, performance |
| G3 | **Tenant Command Centre** | NEW | S2 S3 | The other side: my tenancy, my rent, my documents, my maintenance requests |
| G4 | **Hospitality Operating System** | UPGRADE | S2 S3 | Host workspace exists: calendar, decide, reservations, rooms, reviews, earnings. Extend to housekeeping and staff |
| G5 | **Business Spaces** | NEW | S2 S3 | A business profile with products, services, bookings, offers |
| G6 | **Maintenance** | NEW | S2 S3 | Issue through to resolution, written into the space's history |
| G7 | **Services Marketplace** | DEFER | S2 S3 | 18 categories: movers, cleaners, electricians, plumbers, AC technicians, painters, carpenters, interior designers, architects, surveyors, lawyers, inspectors, security, internet, solar, generator services, furniture, other. Completed services attach to the Space Passport |
| G8 | **Professional Network** | DEFER | S2 S3 | |
| G9 | **Team and organisation permissions** | COMPLETE | S2 | Firm workspaces exist but `admit_firm_member` refuses the role today. Blind spot B-23 |
| G10 | **Document Vault** | NEW | S2 S3 | Agreements, receipts, inspection reports, verification documents, transaction records, property documents. **Permissions explicit; never expose a legal document through an accidental route** |
| G11 | **Agreements** | KEEP | S2 S3 | Live, with versions, both-party confirmation, admin approval and an append-only event log |
| G12 | **Inspections** | KEEP | S2 S3 | Live, with eight photographed items |
| G13 | **Diaspora Mode** | DEFER | S2 S3 | UK, US, Canada, Spain. Remote verification, trusted professionals, evidence, protected transactions, remote inspections, documentation |
| G14 | **Support and staff scopes** | KEEP | S2 | Nine scopes, a support desk, a handbook a test reads. Absent from the spec |
| G15 | **Account recovery** | UPGRADE | S2 F | A member who loses their email loses their account, and with a wallet they lose money too. Blind spot B-24 |

# H. ADMIN AS THE INTERNAL OPERATING SYSTEM

"The admin panel is not a secondary dashboard. It is Vallo's internal operating
system." 38 desks exist.

| # | Item | Status | Owner | Detail |
|---|---|---|---|---|
| H1 | **Coverage audit against the strategy** | NEW | S2 S3 | "Do not assume that because a database table exists, the admin has a usable control surface for it" |
| H2 | **Eight required area groups** | UPGRADE | S2 S3 | users, businesses, workspaces, listings, spaces; verification, identity checks, property evidence; reports, fraud, risk; referrals, rewards, payouts, transactions; disputes, agreements, inspections, documents; support, reviews, moderation; promotions, subscriptions, entitlements; analytics, system health, feature flags, audit logs, configuration, operational metrics |
| H3 | **Admin mobile rebuilt as first class** | UPGRADE | S3 | Navigation, tables, cards, filters, search, detail pages, actions, approvals, verification, reports, fraud review, financial views, audit logs, charts, responsive layouts, touch targets, sticky actions, bottom sheets, mobile-safe modals, scrolling, keyboard, safe areas. **"Do not simply shrink desktop tables onto a phone"** |
| H4 | **Dual approval on sensitive actions** | UPGRADE | S2 | Exists for rulings at or above ₦500,000 and fails closed for want of a second super admin |
| H5 | **Feature flags and kill switches** | KEEP | S2 | Live, with a guard refusing to re-enable retired custody |
| H6 | **System health** | NEW | S2 S3 | |
| H7 | **Audit logging everywhere** | KEEP | S2 | Every privileged action already writes an append-only row |

# I. EXPERIENCE: the platform-wide upgrade

Spec: `docs/design/VISUAL_NORTH_STAR_2026-10-05.md`. The founder's four locked
decisions are in its section 1.

| # | Item | Status | Owner | Detail |
|---|---|---|---|---|
| I1 | **Container system, four tiers** | NEW | S3 | Plate, Card, Island, Sheet. One edge treatment each |
| I2 | **Button system** | NEW | S3 | **"Do not make every button a pill."** Eight roles, each with a shape that means something. North star 5A |
| I3 | **Oversized live figures** | NEW | S3 | The signature. Tabular, count up on arrival, odometer on change |
| I4 | **Sliding-pill segmented control** | NEW | S3 | |
| I5 | **Primary morphs into a tick** | NEW | S3 | |
| I6 | **Motion system, 24 moments** | UPGRADE | S3 | Product-wide: onboarding, startup, Get Started, navigation, page transitions, search, filters, map, cards, feed, Space Passport, verification, booking, payments, agreements, inspections, dashboards, notifications, success, loading, empty, error recovery. Premium, fast, purposeful, accessible, performant. **Not a gaming interface** |
| I7 | **Startup experience** | UPGRADE | S2 S3 | Logo entrance, light movement, icon animation, refined timing, transition in, auth restoration, deep-link restoration, loading state. **Root-cause the delay; `/open` still makes an unbounded auth call. Never a timer: "the animation must never conceal a broken initialisation architecture"** |
| I8 | **Vector logo mark** | NEW | S3 | PNG only today, so a scaling, rotating mark will be soft. Prerequisite for I7 |
| I9 | **Theme leads by surface** | NEW | S3 | Night for brand and discovery, Paper for money and documents. Light mode as a real design system. No theme flashing |
| I10 | **Icons: matte clay plus line chrome** | NEW | S3 | Gloss banned. Resolves a three-way contradiction across four documents |
| I11 | **Capsule dock and side nav, both upgraded** | UPGRADE | S3 | Both kept, per the founder |
| I12 | **Navigation audit** | NEW | S3 S4 | Back, close, breadcrumb, browser back, mobile back, Android back, iOS navigation, modal dismissal, nested pages, deep links, notification routing, post-action return. **"Do not mechanically add a back button everywhere"** |
| I13 | **Onboarding wiring** | COMPLETE | S2 S3 | Cold-start sign-up never returns to the questions, and `/home` ignores the answers |
| I14 | **Designed empty, loading, error, success states** | UPGRADE | S3 | Every important flow. **No "Something went wrong."** |
| I15 | **Financial loading copy, verbatim** | NEW | S3 | "Preparing secure payment...", "Verifying payment...", "Confirming with Payluk...", "Protecting your funds...", "Confirming withdrawal...", "Waiting for bank confirmation..." **No fake progress, no timers pretending completion** |
| I16 | **Status never by colour alone** | NEW | S3 | success, pending, failed, protected, disputed. The palette is one hue, so this is structural |
| I17 | **Money values must not animate misleadingly** | NEW | S3 | Never imply money moved when it did not |
| I18 | **Payment confirmation screen** | NEW | S3 | "You're about to pay", the space, what for, the amount, the protection and provider, the agreement reference, "You'll be protected until the required conditions are satisfied.", Confirm. **No important financial information in tiny text** |
| I19 | **Transaction list and detail** | NEW | S3 | Detail shows Overview, Amount, Status, Parties, Space, Agreement, Payment, Escrow, Conditions, Inspection, Fees, Provider, Reference, Receipt, Timeline |
| I20 | **Receipt UI and document** | NEW | S3 | Worth screenshotting as proof of payment |
| I21 | **Landing page as part of the product** | UPGRADE | S3 | Hero, typography, hierarchy, motion, storytelling, cards, scroll interactions, feature demonstrations, the Space OS narrative across Trust, Discover, Intelligence, Transactions, Operations, ecosystem, use cases, audiences, legitimate social proof, CTA flows, mobile. Editorial information moments, dynamic cards, product previews, layered motion, intelligent scroll, interactive space examples, animated maps, Space Passport demonstrations. **Restraint: a serious venture-backed product, not an over-designed template** |
| I22 | **Docs, legal, landing, app and admin as one product** | NEW | S3 S4 | Shared brand, typography, terminology, tokens, tone, navigation principles, visual quality, responsive behaviour |
| I23 | **Deep links, six destinations** | UPGRADE | S2 S3 | transaction, escrow, receipt, withdrawal, dispute, wallet. **Never lose the destination** |
| I24 | **Offline and poor network** | UPGRADE | S3 | Including inside a payment flow |
| I25 | **Mobile as a real app** | UPGRADE | S3 | Safe areas, keyboard, bottom sheets, gestures, back navigation, deep links, push, touch targets, WebView, offline, image loading, memory, native transitions. **"Do not merely shrink desktop"** |
| I26 | **Accessibility** | UPGRADE | S3 S4 | Contrast, focus, keyboard, screen readers, reduced motion, semantic structure, touch targets, readable text, non-colour communication |
| I27 | **Performance, 11 protections** | UPGRADE | S3 S4 | Initial load, route transitions, feed scrolling, maps, images, mobile memory, animation, WebView, large datasets, bundle size, unnecessary rerenders. **The feed especially must be architected for scale** |
| I28 | **No second design system** | KEEP | S3 | The financial UI uses the existing one |
| I29 | **Financial UI must not look like a banking clone** | NEW | S3 | Avoid excessive glass, giant rounded containers everywhere, gaming dashboards, crypto-exchange aesthetics, clutter, meaningless animation, unnecessary gradients, fake security graphics |

# J. DATA, EVENTS, OBSERVABILITY, RELIABILITY

| # | Item | Status | Owner | Detail |
|---|---|---|---|---|
| J1 | **Staging database** | NEW | S2 F | **There is only one Supabase project and it is production.** Escrow, wallets, transfers and disputes cannot be developed safely against it. Blind spot B-01 |
| J2 | **Event architecture** | NEW | S2 | One first-party event layer, on the listing funnel's privacy rules |
| J3 | **Space Analytics** | NEW | S2 S3 | 11 metrics across every space category: impressions, views, unique viewers, engaged views, saves, shares, inquiries, contacts, viewing requests, booking starts, bookings, conversion. Ranges 7D, 30D, 90D, All Time. Private to the lister unless deliberately public |
| J4 | **Listing Intelligence and Listing Health** | NEW | S2 S3 | A score with explanations: missing floor plan, incomplete amenities, no inspection, weak photography, stale availability, incomplete verification. Plus recommendations: improve photos, adjust price, complete verification, add floor plan, improve description, update availability |
| J5 | **Host analytics** | NEW | S2 S3 | Hotel hosts have none at all |
| J6 | **Conversion funnel** | UPGRADE | S2 S3 | The per-listing funnel exists as V-73 with HMAC-salted dedupe and a five-lister comparison floor. That privacy care is the template |
| J7 | **Data visualisation system** | NEW | S3 | **No chart system, primitives or colour rules exist**, and the palette is one hue so a colour per series is unavailable. Four intelligence features are charts. Blind spot B-26 |
| J8 | **Map design system** | NEW | S3 | Pins, clusters, selected, hovered, heat, bounds, empty viewport, and the listing with no pin. Blind spot B-27 |
| J9 | **Print and PDF design** | NEW | S3 | Receipts, statements and agreements get printed and taken to banks. Blind spot B-28 |
| J10 | **Error reporting and a pager** | NEW | S4 F | Nobody is paged today |
| J11 | **Observability** | NEW | S2 S4 | |
| J12 | **Backup and disaster recovery** | NEW | F | Supabase Free has no restorable backup of a money ledger |
| J13 | **Dependency failure handling** | NEW | S2 | What happens when Payluk, Paystack, Supabase or the identity provider is down |
| J14 | **Media pipeline** | UPGRADE | S2 S3 | Resize, EXIF strip and photo hashing exist. Needs bucket size limits, which no bucket has, and video with a server-enforced cap |
| J15 | **Notifications as a system** | UPGRADE | S2 S3 | 40 events and a lifecycle set exist; push has never reached a device |
| J16 | **Search and SEO** | UPGRADE | S2 S3 | No listing is indexed by decision |
| J17 | **Content and CMS control** | DEFER | S2 | |
| J18 | **Feature flags and releases** | KEEP | S2 | |
| J19 | **Status page** | DEFER | S4 | With money in escrow, an outage needs somewhere that says so |

# K. SECURITY, PRIVACY, LEGAL

| # | Item | Status | Owner | Detail |
|---|---|---|---|---|
| K1 | **14 security requirements** | KEEP mostly | S2 | auth, permissions, workspace isolation, RLS, server authorisation, webhook verification, idempotency, rate limiting, replay protection, fraud, sensitive data, financial events, audit trails, admin actions. Most are already strong |
| K2 | **Never trust the frontend** | KEEP | S2 | Never trust client-supplied amount, user_id, seller_id, provider_customer_id, transaction_id, status or fee |
| K3 | **Secrets never logged, never committed, never in the browser** | KEEP | S2 | A guard test already refuses committed secrets |
| K4 | **Secret rotation plan** | NEW | S2 F | No lifecycle exists, and a known Firebase key is still un-rotated. Blind spot B-03 |
| K5 | **Privacy and data governance** | KEEP | S2 | Retention schedule, subject access, export, purge all exist and are absent from the spec |
| K6 | **AML and SCUML control set** | UPGRADE | S2 | Eight obligations live and probed, and entirely absent from the spec. **Wallets and transfers change all of them.** Blind spot B-11 |
| K7 | **No regulated-status claims** | KEEP | S2 S3 | Never claim Vallo is a bank, an escrow institution or CBN-licensed. Never claim a provider's regulatory status without documentation |
| K8 | **Legal content and flows** | NEW | S4 F | Terms, privacy, cookie consent, payment terms, booking terms, listing terms, **referral and rewards terms**, verification disclaimers, UGC rules, services marketplace terms, cancellation and refund language, dispute language, agreements. **Identify what needs a lawyer rather than pretending engineering gave legal advice** |
| K9 | **ADR-0003** | NEW | S2 | The escrow decision reverses ADR-0002 and must be written before switch-on |
| K10 | **NDPC registration and a DPO** | NEW | F | The registration number is null and the founder is the DPO |

# L. RELEASE

| # | Item | Status | Owner | Detail |
|---|---|---|---|---|
| L1 | **One real payment proven on a device** | NEW | S4 F | Through the WebView, including 3-D Secure, with the webhook landing. **The money layer has never carried one naira** |
| L2 | **Android release lane** | NEW | S4 F | Keystore, Play App Signing, real `assetlinks.json` SHA-256 values, real Firebase key, signed AAB workflow |
| L3 | **Device test matrix executed** | NEW | S4 | Every row reads NOT RUN |
| L4 | **Test matrix, 21 dimensions** | NEW | S4 | web, iOS, Android, light, dark, mobile, tablet, desktop, poor network, auth, referral, analytics, payments, listings, verification, workspaces, admin, notifications, deep links, startup |
| L5 | **Store submission, both platforms** | NEW | S4 F | |
| L6 | **Push proven to a device** | NEW | S4 F | |
| L7 | **Production readiness checklist** | NEW | S4 | Each item READY, NOT READY or BLOCKED |
| L8 | **Documentation completely updated** | NEW | S4 | Product, user, workspace, feature, developer, API, payment, verification, referral, trust, admin, onboarding, support and release docs. Remove outdated descriptions and contradictory terminology |
| L9 | **`COMPANY.md` reconstruction** | NEW | S4 F | 21 live docs link to deleted handoff files, one of which was the only record of the company's obligations |

---

# The conflict register

Five places where the spec and the code are in direct opposition. A session will
pick one at random unless these are settled.

| # | Conflict | Resolution |
|---|---|---|
| **C-1** | Spec section 40: "Do not make every button a pill." The north star originally read the references as pills everywhere | **Spec wins.** North star 5A now defines eight button roles. Pills are reserved for chips, segments and circles, so a pill means selectable |
| **C-2** | Spec slogan **"FIND YOUR SPACE. WITHOUT THE RUNAROUND."** The code ships "Real Estate reimagined!", with a note in `en.ts` saying that line is retired pending a founder ruling | **Spec wins**, and it is that ruling. It generalises property to space, which Space OS requires |
| **C-3** | Spec core object is **Space**. `PRODUCT.md` section 7 mandates **Listing**, enforced by `workspace-terms.test.ts` | **Spec wins, staged.** Space becomes the user-facing noun and the conceptual model; `listings` stays the table name. Rename the vocabulary, the i18n keys and the terminology test together, in one change, not drifting across sessions |
| **C-4** | Spec wants **Boost, Spotlight, Featured, Prime**. Migration V-06 has a check constraint forcing `listings.featured = false`, and `ranking.test.ts` asserts no `featured\|boost\|sponsor\|paid\|premium\|subscription` input in ranking | **Both, properly separated.** Promoted slots become separate, clearly labelled inventory. **The organic ranking formula stays untouched and published.** You sell visibility, never rank, so a paid listing can occupy a marked slot but can never reorder honest results. Revisiting V-06 needs a deliberate ADR, not a quiet constraint drop |
| **C-5** | Spec says escrow is the protection. The live **Vallo Guarantee** reserve is absent from the spec | **One protection per rail.** Escrow is protected by the hold; direct settlement keeps the Guarantee. Payments architecture section 3A.4 |

---

# What the register says about sequencing

Three things gate more downstream work than any feature:

1. **A staging database (J1).** Nineteen financial tables, eleven state machines and
   real customer money cannot be developed against the only Supabase project, which
   is production.
2. **An SMS provider (D4).** The referral engine's own qualification flow requires
   phone verification, which is built and switched off. Until that flag is on, the
   engine cannot qualify a single referral.
3. **One proven payment (L1).** The money layer has never carried a naira, and
   3-D Secure inside the WebView is the most likely failure in the whole
   application.

None of the three is a feature, and all three are cheap next to what waits behind
them.
