# SESSION 2 EXECUTION PROMPT: backend, money, trust, data

**From Session 1, 5 October 2026.** Paste this entire file as your opening brief.
You are a production engineering session on a seven-month-old platform that serves
real users. Nothing here is greenfield.

---

## 0. READ THESE FIRST, IN THIS ORDER

1. **`docs/sessions/DIRECTIVES-2026-10-05.md`**: the founder's current rulings.
   **They supersede every earlier spec, plan and audit they touch.** D5 governs how
   you are allowed to touch the database. Read it before anything else.
2. **`docs/sessions/FEATURE-REGISTER.md`**: 1,547 requirements extracted from the
   founder's prompts. **Sections A, B, D, E, F, J, K are yours.**
3. **`docs/payments/VALLO_PAYMENTS_ARCHITECTURE.md`**: in full. Section 0 is an
   evidence warning you must act on. Section 3A is the two-rail decision.
4. **`docs/sessions/BLIND-SPOTS.md`**: 39 gaps the spec misses. B-05, B-06, B-07,
   B-09, B-11, B-13, B-16 to B-18, B-24 are yours.
5. `docs/PRODUCT.md`, `docs/MONEY_ARCHITECTURE.md`, `docs/COMPLIANCE_SCUML.md`,
   `docs/adr/0002-vallo-never-holds-customer-money.md`, `docs/ENVIRONMENT.md`.
6. The conflict register at the end of the feature register. Five conflicts are
   already resolved there. Implement the resolutions; do not reopen them.

---

## 1. CONTEXT: what Vallo is solving

Vallo is the operating system for physical spaces, beginning in Nigeria. A person
should be able to discover, understand, verify, transact for, occupy, manage and
maintain a space without the runaround. The company is VALLO SPACES LTD.

The product's whole argument is that **everything on it was put there by a real
person who applied, was verified and was approved**, and that the real cost is shown
before the decision. That is why the verified badge can mean anything, and it is why
money correctness and trust separation are not features but foundations.

## 2. CURRENT STATE: what already exists

Measured, not assumed. **Do not rebuild any of it.**

- 200 product pages, 55 route handlers, 38 admin desks, 9 staff scopes.
- 579 migrations, 284 tables, 246 with RLS, 494 policies, 416 triggers, ~1,044
  functions. pg_cron inside Postgres, not Vercel cron.
- 5,773 unit tests across ~690 files, 95 Playwright specs, CI with typecheck, lint,
  audit, build, accessibility and database probes.
- **Money that works and must be preserved:** Paystack split at the moment of
  charge with a three-part summing constraint; the agreement gate; frozen move-in
  quotes and frozen cancellation terms; a three-stamp refund clock measured against
  Nigerian public holidays; the caution register; flatmate rent splitting; one open
  payment attempt per payer per charge with an abandoned sweep; the Vallo Guarantee
  reserve as an append-only ledger. **None of this is in the founder's spec**, so
  you would not know to keep it if you read only the spec. Blind spot B-09.
- **Compliance that works:** eight SCUML obligations live and probed, two-person
  decisions, tipping-off protection, threshold and structuring observers, sanctions
  screening, beneficial-ownership mandates. Also absent from the spec. B-11.
- **Security that works:** service-role key throws in a browser,
  `resolveSession()` uses `getUser()` across 110 call sites, Postgres-backed rate
  limiting at 77 call sites, WebAuthn step-up on anything that moves where money
  lands, a grant-state audit enforced by tests.
- **What is genuinely absent:** any fiat provider abstraction. Paystack is called
  directly across about 149 files, while the crypto path has a proper interface.

**The platform cannot take a payment today** because
`PAYSTACK_GUARANTEE_SUBACCOUNT` is unset. There are no approved agents and no
published listings; the 64 listings in the database are all `is_demo = true`.

## 3. OBJECTIVE

Turn Vallo's money layer into production financial infrastructure in which **Vallo
orchestrates the business workflow and regulated providers handle the financial
rails**, build the growth and trust systems the founder's spec defines, and leave
the database ready for the experience session.

You are not building a payments product beside Vallo. You are upgrading Vallo.

## 4. THE OPERATING RULES

### 4.1 You work autonomously

Routine access is authorised: GitHub, Vercel, Supabase, the repository, the
deployment environment, configuration. **Never ask whether you may inspect the
repository, Supabase, Vercel or GitHub, whether you may run tests, whether you may
investigate an implementation, whether you may fix an obvious issue, or whether you
should do something the approved strategy already requires.** Use the access.

For implementation, investigation, testing, refactoring, auditing, documentation and
debugging: **do the work.**

Limits: never expose or print a secret, never rotate or delete a credential, never
destroy production data, never perform an irreversible destructive action.

### 4.2 The escalation ladder replaces asking

1. Investigate the repository. 2. Inspect related implementation. 3. Inspect the
database, schema and configuration. 4. Search existing documentation. 5. Check
dependencies. 6. Check previous response files. 7. Decide whether the answer follows
from the established strategy. 8. Make the safest production-quality decision.

Only a genuinely blocking decision escalates, and it escalates **into your response
file** while you continue on everything it does not block.

### 4.3 Model routing: do not waste the founder's money

| Weight | Route to | Work |
|---|---|---|
| **Mechanical, specified, high volume** | cheapest capable model | Codemods, renames, import rewrites, test-selector repair, doc link fixes, inventory and classification passes, CSV and fixture generation, mechanical type errors |
| **Ordinary implementation against a clear spec** | mid model | Server actions, queries, components, a migration whose shape is already decided, admin desk wiring |
| **Architecture and risk** | strongest model | Provider abstraction, state machines, the ledger, RLS and grants, webhook and idempotency design, the rail router, disputes, anything irreversible, every second-pass review |

**Money, authentication, RLS and migrations are never routed to the cheapest model**,
regardless of volume. A cheap rename that touches a policy is not a cheap rename.

### 4.4 Database discipline, because there is no staging (D5)

The founder has ruled: one database, production, with founder testing before public
launch, and **"you audit twice."** That ruling is binding and so is its price:

1. **Two-pass review.** Every migration and every money-path change is reviewed
   adversarially by a different agent than wrote it, whose job is to break it. Both
   passes recorded in the response file.
2. **No destructive migrations.** Additive only. No dropped column or table, no
   deleted row, no truncation, no lossy type change. A column that must go stops
   being read first and is dropped in a later change.
3. **A read-back block in every migration** that fails it if RLS, grants,
   constraints or triggers did not land. The SCUML migrations are the pattern.
4. **A probe in every migration** that creates fixtures, asserts behaviour and rolls
   back, leaving nothing behind.
5. **Idempotent.** Safe to run twice.
6. **Supabase branches for verification where available.** Create, verify, merge,
   drop.
7. **Money-path tests read the live policy shape, never a mock.** Five of the nine
   incidents in this repository's history would recur today with every test green.


### The cross-session contract (D19)

**`docs/sessions/CROSS-SESSION-CONTRACT.md` is binding. Read it before you start.**
The founder's concern is two sessions building the same thing, which causes conflict.

The test that resolves almost every case: **does the thing decide what is true, or
present what is true?** Deciding is Session 2. Presenting is Session 3. Proving is
Session 4.

If you find yourself about to build something another session owns, **stop and write a
numbered request into your response file** instead: what you need, its exact shape,
what consumes it, and whether it blocks you. Then carry on with something else. Nobody
waits idly.

### Connective work, and your authority to propose (D20)

You are not an order-taker. As you build, find and build the things that **connect new
features to old ones**, make a flow whole, or add the tool that makes a named feature
actually work. Three conditions: it connects or completes rather than starting an
unrelated area; it is inside your boundary under the contract; and it is recorded in
your response file with what it connects and why.


### Repository and environment hygiene (D26)

Professionalism, in the founder's words. Scratch files, experiments and one-off scripts
live in the scratchpad and are **never committed**. Commits are focused with messages
that say why, not what. Generated files are not hand-edited. The working tree is clean
when you finish, lint and typecheck are green before any push, and nothing is left
half-applied. **A session that leaves a mess for the next session has not finished.**

### Use the current tooling, including mods (D27)

Work as an engineer with modern tooling, not a plain editor. **Mods**, Claude Code's
plugin system, are for checks that should be automatic rather than remembered: a hook
running lint and typecheck before a commit, a status line showing audit progress, a
pane for a checklist. **Session 4 owns the shared mods** so three sessions do not each
build their own, and records what it created so the others enable them.

Also: skills where one exists for the job, and **the `dataviz` skill is loaded before
the first line of chart code**; subagents for parallel independent work under declared
ownership; worktrees where a change is broad; background execution for long builds and
test runs.

### 4.5 The breadth mandate

The prompts are a strategic direction, not a checklist. Upgrade whatever the audit
shows is incomplete, outdated, inconsistent, broken or below production standard.
**Do not leave something untouched because it was not named.** Classify what you
touch as **KEEP, UPGRADE, REWORK, COMPLETE, REPLACE or DEFER** and record it.

### 4.6 Verify, never assume

Never assume a previous session did what it said. Check the code.

### 4.7 The default decision ladder

**KEEP, IMPROVE, HARDEN, REFACTOR, EXTEND. Not REBUILD.** Replacement needs a
nine-part justification: what exists, what is wrong, why it matters, what changes,
what stays untouched, dependencies, migration strategy, risk, acceptance criteria.

---

## 5. AGENT OWNERSHIP

Four agents. **Declare ownership before any parallel work. Two agents never hold the
same file.** A cross-domain need is documented, coordinated with the owner, and
ownership transferred explicitly. Never silently modify another agent's area.

| Agent | Owns | Files |
|---|---|---|
| **A1 Financial core** | Provider abstraction, rail router, the financial schema, ledger, webhooks, idempotency, reconciliation, the Space model migration | `lib/payments/provider*`, `lib/payments/router*`, `lib/ledger/*`, `app/api/*/webhook/*`, `lib/security/idempotency.ts`, new migrations for the financial and Space schema |
| **A2 Escrow and disputes** | Escrow lifecycle, conditions engine, milestones, disputes, refunds, chargebacks | `lib/escrow/*`, `lib/conditions/*`, `lib/disputes/*`, `lib/payments/refund*`, their migrations |
| **A3 Money movement and tax** | Wallet, deposit, withdrawal, transfer, bank verification, payouts, fees, tax | `lib/wallet/*`, `lib/payouts/*`, `lib/tax/*`, `lib/payments/bank*`, their migrations |
| **A4 Growth and trust** | Referral engine, entitlements, promotion, identity and phone gate, blocked terms, passport, events and analytics | `lib/referral/*`, `lib/entitlements/*`, `lib/promotion/*`, `lib/identity/*`, `lib/trust/*`, `lib/events/*`, their migrations |

**Shared files with one designated owner:** `database.types.ts` (A1 regenerates,
others request), `lib/money/copy.ts` (A1, and see 7.14), `supabase/migrations/`
(each agent writes its own, A1 owns ordering).

---

## 6. DEPENDENCIES

| Needs | Before |
|---|---|
| Payluk live documentation read | Any Payluk code (7.2) |
| Provider abstraction (7.3) | Payluk adapter, rail router |
| Financial schema (7.4) | Everything in E |
| Ledger (7.5) | Any money movement |
| `PAYSTACK_GUARANTEE_SUBACCOUNT` from the founder | Any payment opening at all |
| Termii keys from the founder | Phone gate switch-on, so referral qualification |
| Counsel on tax rates | Tax rates. **The mechanism is built regardless** |
| ADR-0003 | Escrow switch-on |
| ADR superseding V-06 | Promotion constraint lift |

---

## 7. IMPLEMENTATION REQUIREMENTS

### 7.1 First, three small things that unblock others

**`/open` deadline.** `apps/web/src/app/open/route.ts` is the real native entry path
and calls `resolveSession()` with no deadline. This is the splash-hang class fixed in
`home-or-landing/route.ts` at `f82f2148f` and never applied here. Copy that fix
exactly: a timeout constant, `guessSignedIn()` from the auth cookie, a race. Add the
mirror test. **Session 3's startup animation waits on this.**

**`blocked_terms`.** Ships empty, which is an Apple 1.2 and Google UGC exposure on a
platform already carrying posts, stories, messages and reviews. Turn
`docs/safety/BLOCKED_TERMS_PROPOSAL.md` into a migration: each term with its
category and action, hold-for-review as the default, a hard refusal needing a
recorded reason, and an admin surface to add and retire terms with an audit row.

**Supply unblocking.** `MORE_INFO_REQUIRED` has no forward path, which has blocked
the founder's own application VL-AGT-10016 since 22 September: give the applicant a
way to answer and resubmit and staff a way to see it. Then re-verify the listing
insert path against current `main` with a live probe and add that probe to the
`db-probes` CI job so it cannot regress silently.

### 7.2 Payluk: read the real documentation first

`docs.payluk.ng` was unreachable from Session 1's environment, so section 3 of the
payments architecture was reconstructed from npm, search snippets and a third-party
copy of Payluk's agent skill. **It is a hypothesis. No Payluk code may be written
against it.**

Read `docs.payluk.ng`, `/llms.txt`, `/introduction`, `/api-reference`,
`/guides/ai-agent-skill` and `/guides/payluk-test-bank`. **Correct the architecture
file and say in your response what Session 1 got wrong.** Then answer the twelve
questions in its section 7 from the live docs.

**Question 3 outranks the rest: can a funded escrow be refunded without opening a
dispute?** A guest cancelling three weeks early is routine, and the product already
freezes cancellation terms and must honour them automatically. If the answer is no,
every ordinary cancellation becomes a ruling Vallo makes, and that changes the design.
Establish it before building the cancellation path.

**Never invent an endpoint, a request field, a response field or an endpoint name.**
Never assume an endpoint exists because an older pattern used it. Never blindly copy
generated code from provider tooling.

### 7.3 The provider abstraction

A thin fiat `PaymentProvider` interface, modelled on the crypto interface that works.
**Capability declaration at its centre**, because the providers are not equivalent:
Paystack splits at payment and cannot hold, Payluk holds and cannot split. Call sites
ask rather than assume.

It expresses: capability declaration; collection with a Vallo-generated reference
that is the idempotency key regardless of what the provider offers; verification by
reference; signature verification over a raw body; reconciliation; a per-provider
kill switch read on every render and again in every server action.

**Move Paystack behind it with no behaviour change and no migration.** The
deliverable is identical outcomes with one seam. If any money outcome changes, the
refactor failed. Prove it with the existing payment tests untouched plus a contract
test. **Do not scatter provider calls through the application. Do not implement a
method a provider does not support. Do not force one provider to do everything. Do
not destroy existing Paystack functionality.**

### 7.4 The rail router

The founder's two-rail decision: **escrow for rent, shortlet, apartment, land and
sale; direct Paystack split for hotels and restaurants.** The principle the code
encodes is the accountability of the counterparty, so an individual lister routes to
escrow and a registered business routes to direct settlement, which is what resolves
the ambiguous `apartment` type.

A **policy table with effective dates, never a condition in code**, per architecture
3A.3. `transactions.rail` written at open and never altered: a rail is a historical
fact like the frozen quote. **Fails closed**: if it cannot resolve, no payment opens,
because one fallback holds money that should not be held and the other releases money
that should have been held.

### 7.5 The financial schema and the ledger

Nineteen tables, in the feature register E5.4 with their columns. **Inspect the
existing schema first and do not duplicate existing entities**: `bank_accounts`,
`payout_accounts`, `transactions`, `ledger_entries` and `idempotency_records` already
exist and several of the nineteen are extensions rather than new tables.

**`financial_ledger_entries` is append-only.** `id`, `transaction_id`, `provider`,
`provider_reference`, `event_type`, `amount`, `currency`, `direction`, `status`,
`metadata`, `created_at`. Fourteen event types in E5.2. **Corrections are additional
events, never edits.** **`user.balance += amount` is not an architecture.**

**`financial_provider_accounts`** maps a Vallo user to a provider customer.
**A Vallo user and a Payluk customer are never the same entity.** No duplicate
customer records. Provider secrets never in the database and never in the browser.

### 7.6 Escrow, and the conditions engine

Vallo's own twelve-state machine, E3.2: `DRAFT`, `AGREED`, `AWAITING_PAYMENT`,
`PAYMENT_PROCESSING`, `PROTECTED`, `FULFILLMENT`, `INSPECTION`, `CONDITIONS_PENDING`,
`READY_FOR_RELEASE`, `RELEASE_REQUESTED`, `RELEASED`, `COMPLETED`.

**`provider_status` is a separate column and Vallo's business state is never
overwritten by it.** Payluk may say `OPENED` while Vallo says `READY_FOR_RELEASE`.
This is the single most important schema rule in the financial layer.

**The Conditions Engine** is how release is gated on reality rather than a clock.
`escrow_conditions`: `id`, `transaction_id`, `type`, `description`, `required`,
`status`, `evidence_id`, `satisfied_at`, `satisfied_by`. Release requires every
required condition satisfied, and the tenant or guest confirming arrival or move-in
is one of them. If Payluk can auto-release on a delivery window, set that window long
enough to be a backstop rather than the normal path.

**Milestone escrow for sale**, mapped to a real Nigerian transaction: deposit, title
and documents verified, completion. Amounts must sum to the total. **Milestone logic
never lives only in frontend state.**

**The agreement gate stays in front of escrow.** Both parties confirm, an admin
approves, then payment opens. Escrow holds what the gate permitted. Inspection joins
to money: the existing photographed eight-item report becomes condition evidence, not
a meaningless attachment.

### 7.7 Disputes

Because Payluk does not arbitrate and the merchant does, **Vallo rules on who keeps a
guest's money.** State machine and table in E4.1 and E4.2.

Reuse rather than reinvent: two-person rulings on the existing threshold pattern,
append-only records, nobody ruling a case they are party to using the existing
`conflicted` answer, and `audit_log` on every action. A `SPLIT` outcome's two amounts
must sum exactly to what the escrow still holds, checked before the provider call.

**Flag in your response that two-person rulings currently fail closed** because only
one super admin exists.

### 7.8 Refunds, cancellations, chargebacks

Keep the three-stamp refund clock and the five-business-day promise. **Never create a
fake refund locally.** A refund whose outcome is unknown stays pending with a critical
alert; it is never recorded as failed.

**Chargebacks are new and are not disputes** (B-06). A chargeback is the card network
reversing money Vallo already released to a lister. Build: a chargeback state, the
inbound path from Paystack, a recovery process against the lister, a liability
account for the exposure, and a rule on whether a lister with an open chargeback can
be paid.

### 7.9 Wallet, deposit, withdrawal, transfer

Per E2. **Four balance states** mapped from provider balances: Available, In Escrow,
Pending, Processing. **Never invent a balance. All financial state is
server-authoritative and a frontend calculation is never the source of truth.**

Deposit through the payment-intent flow, with the ten-field record in E2.4. **Never
mark a deposit successful because the frontend said so.** Never use the deprecated
virtual-account endpoint and never build a fake Vallo bank account to compensate for
its absence.

Withdrawal: the thirteen-step flow, the eight disclosures, **the fee read back from
the provider and never hard-coded**. Bank list and account verification first, handling
invalid account, unavailable bank, timeout, provider error, mismatch, verification
unavailable, retry and rate limiting, and **never silently proceeding when
verification fails**. Plus failed and returned payouts (B-07), which the spec does not
cover: dormant accounts, name mismatches, bank downtime, and a reconciliation of money
sent against money landed.

Transfers with the seven protections in E2.14, and confirmation on anything
irreversible.

**Wallet KYC tiers and limits** (B-13), absent from the spec: without them this is an
unlimited unverified wallet.

**And the one nobody connected:** the live threshold and structuring observers watch
charges and refunds, not balance movements. **A transfer between two users is exactly
what they exist to see.** Extend the AML observers to deposits, withdrawals and
transfers, or the compliance layer silently stops covering the product (B-11).

### 7.10 Tax (D4)

Build the mechanism; counsel confirms the rates. Stamp duty on tenancy agreements,
withholding tax on rent to corporate landlords, VAT on service fees, capital-gains
considerations on sale. **A schedule table with effective dates, never rates in
code**, and every transaction records which schedule taxed it. The True Cost Engine
gains the line. **Where a rate is unconfirmed the line is absent and the gap is named
in your response, never guessed.**

### 7.11 Webhooks, idempotency, reconciliation

Signature over the raw body, constant-time compare. Payluk is HMAC-SHA512 hex, the
same shape as the existing Paystack verifier, which is the template. Persist the raw
payload in `provider_webhooks`. **Never process the same financial event twice.** Add
a replay window even where none is documented, and say so in a comment.

**Reconciliation is the source of truth, not the webhook**, because no failure events
appear to exist. Three-way: Vallo's record against provider state against money
landed. A scheduled reconciler on the `crypto-reconcile` pattern, applying everything
through one door.

**A timeout is `UNKNOWN`, never a failure.** Check provider state before any retry.
**Never retry a money-moving request blindly.** Never hide a financial failure.

### 7.12 The referral engine

The attribution half exists and is correct. Everything in D of the register is new.

Nine-step qualification, eight statuses, an append-only reward ledger, ten
anti-farming signals, IP and device as **signals and never blockers** because
families, offices, universities and apartments share networks, hold-for-review rather
than banning, a campaign system, and reversal on refund or chargeback, which the spec
leaves undefined.

**The economics**, per Session 1's evaluation and the founder's instruction not to
implement the proposed numbers blindly: express the reward in **basis points of
Vallo's take, in a table with effective dates**, never a hard-coded naira figure, so
a reward can never exceed revenue. Qualify on the referred member's **first paid
booking**, released **after the protection window closes**, so Vallo never pays on a
booking later refunded. **One reward per verified identity, not per account**, using
the existing `identity_denylist`. A monthly ceiling per referrer. **Booking credit as
the launch instrument**, with cash withdrawal behind a flag that the wallet and the
observed anti-farming signals open. Note that ₦76 against an ₦80 floor means one
referral can never be withdrawn and that an ₦80 bank payout can cost more than the
reward is worth.

**Framing is a hard constraint:** no investment-scheme presentation, no MLM or
downline, no passive-income language.

### 7.13 Entitlements and paid promotion (D3)

Entitlements as infrastructure: a plan table with effective dates, feature keys from
`listing_boost` through `business_pro`, a check every gated feature calls, and a
default plan granting everything currently free. Build now, exercise at zero.

**Paid promotion is now a directive, not a conflict.** Boost, Spotlight, Featured and
Prime with the seven per-tier attributes and the ten promotion metrics. The
guardrails come from the founder's own spec: **promoted placement is separate,
clearly labelled inventory; the organic ranking formula stays untouched and
published and `ranking.test.ts` keeps asserting no paid input reaches it; never imply
guaranteed leads; never manufacture numbers; tier names say what you get; the badge
is never for sale.**

Write the ADR superseding V-06 and lift the `featured = false` constraint **in the
same change that lands the labelled-slot architecture**, so there is never a window
in which paid placement can touch organic rank.

### 7.14 Money copy is a legal act

`lib/money/copy.ts` is the single source of every money sentence. Under two rails the
true sentence differs per rail, and on the escrow rail it names Payluk as the
custodian. **Draft the per-rail sentences and flag them for the founder and counsel.
Do not ship new money wording on your own**, and write **ADR-0003** superseding
ADR-0002 before the escrow rail is switched on.

### 7.15 Identity, trust, passport

The phone gate (D6): Termii is built; build phone verification as a **reusable gate**
so an existing email account can confirm a phone from settings and the referral
engine can require it. `confirmed_phones` and `/settings/phone` exist.

vNIN: write the aggregator comparison for the founder (sandbox availability,
documented pass rates, pricing shape, NDPR posture, data residency) and recommend
one. **Do not integrate a live provider until the founder chooses and supplies
credentials.** Make the interface ready and prove it against the stub.

Space Passport: extend `renter_passports` and `passport_shares`; do not build a
second system. Add the space-side passport, the nineteen content items, and the
visibility tiers. **Caution: an identifier encoding city and sequence leaks how few
members exist**, so either accept that or make it opaque.

### 7.15a Standing streaks (D17)

Not habit bait. A streak counts a **real-world behaviour with a counterparty**, never
an app-open, because somebody looks for a home once every few years. North star 15.1
has the six and the rules.

Build the counting, the pause rule and an append-only streak ledger: on-time rent for a
tenant, reply time, dispute-free months, listing freshness, inspection follow-through,
and months at full Listing Health. **A streak pauses rather than breaks when a person
simply does not need the product**, and the pause is a recorded state, not an absence.
Breaking keeps the history. Nothing is purchasable. Streaks feed badges, the Space
Passport and the trust tier, never a leaderboard.

**The on-time rent streak is the most valuable thing in your queue.** It becomes a
portable rent-payment history in a market where tenants have no credit record, and it
is the strongest organic growth loop the platform has, because a tenant shares it with
a prospective landlord.

### 7.15b Passcode default (D18)

`DEFAULT_PASSCODE_LENGTH` in `apps/web/src/lib/passcode/rules.ts` moves from 6 to 4.
`PASSCODE_LENGTHS` keeps both. Six stays a visible one-tap alternative at setup, and
the existing trivial-code refusals apply to both lengths. Check the tests and the
copy that name the length.

### 7.15c The notification backbone and SMS (D22)

Notifications become a first-class system on four channels: in app, push, email and
**SMS**. North star section 16 is the specification.

**SMS is a routing change, not a new integration.** The Termii transport behind
`OtpTransport` already delivers authentication codes, WhatsApp first with the DND route
so MTN and Airtel do-not-disturb numbers still receive them. Carry notification SMS on
the same transport.

**SMS costs money per message and interrupts at any hour, so it is rationed to three
cases and nothing else:** money that moved or failed to move, a deadline with
consequences, and security. **Never social, never marketing, never anything that can
wait** until the person next opens the app. Non-security SMS is switchable off by the
member and the preference is honoured everywhere.

**Build the channel policy as a table, not as scattered logic.** Every event declares
its channels in one place, so preferences, quiet hours, deduplication and cost control
apply once. Security events ignore preferences, and settings says so plainly.

**The event coverage in section 16.2 is a floor, not a ceiling.** It spans money,
trust, supply, bookings, tenancy, social, the agent, landlord, hotel, shortlet and firm
relations the founder named, account and security, and staff. **Add what you find in
your own area and record it.** The existing 40 events and the lifecycle set are the
starting point, not the destination.

**Every event carries a preview payload that is actionable without opening**: the
subject, the consequence, the figure where there is money, and the object it concerns.
"You have a new notification" is a defect. Session 3 builds the full view; you make
sure the data for it exists.

### 7.15d Demo content is gated out, not relabelled (D24)

The founder wants demo labelling gone. **The resolution is to remove the content from
production reads, not the label from the content.** This repository once shipped 23
invented places, 22 marked verified, on addresses that do not exist, which is why
`demo` is a banned word with a test behind it. Stripping a label off demo content
recreates that incident exactly.

So: `is_demo` rows are **gated out of every production read path** so no member ever
meets one, which means no label is needed. They stay reachable in the admin examples
surface and the development harness, where context makes their status obvious. Add a
probe that fails if a demo row can reach a member-facing query. When real supply
arrives the rows are deleted.

**Beta is different and is permitted.** It describes something that is live and works
and is still settling, unlike `demo` or `coming soon`, which describe something absent.
Add a feature-maturity flag so a Beta chip is data rather than hard-coded. **Never on
anything touching money, trust or verification:** a person deciding whether to send
rent does not want to read that the payment flow is in beta.

### 7.16 Events, analytics, the Space model

One first-party event layer on the listing funnel's privacy rules: HMAC-salted
deduplication, service-role-only recording, rate caps, and comparison only against an
aggregate of at least five other parties so no single party's numbers can be
inferred. Then the query layers for Space Analytics, Listing Intelligence, Listing
Health and host analytics, which do not exist at all today.

The Space model (D8): Space becomes the user-facing noun across fifteen categories.
`listings` stays the table name. Provide the model, the enums and the query layer;
Session 3 renames the vocabulary and the i18n keys in one deliberate change together
with the terminology test.

**Do not install a third-party analytics SDK.** The privacy policy and the store
privacy answers do not describe one yet.

### 7.17 The admin financial control plane

Query and action layers for nine desks: Transactions, Escrow, Withdrawals with
pending, completed, failed and suspicious buckets, Transfers, Disputes,
Reconciliation, Provider health across Payluk, Paystack and Yellow Card, Audit logs,
and financial metrics. Plus the seven financial notification types, each linking to
its transaction. **Do not assume a usable control surface exists because a table
does.** Session 3 draws them; you make them real. **Do not make every admin a super
admin.**

### 7.18 Housekeeping that is yours

Yellow Card's replay window at `lib/crypto/providers/yellowcard.ts:246`, and nothing
else about crypto: it is correct, off behind five gates, and **must not be merged
into Payluk code**. Remove the four dead `revalidatePath("/wallet")` calls. Correct
`MONEY_ARCHITECTURE.md`, which says the custody retirement is pending when it is
applied. Correct the five documents describing virtual accounts as a plan. Provide
the personalised `/home` query, because interests are collected and then ignored.

---

## 8. SECURITY REQUIREMENTS

Never trust the frontend for authorisation. **Never trust a client-supplied `amount`,
`user_id`, `seller_id`, `provider_customer_id`, `transaction_id`, `status` or
`fee`.** Every webhook verifies its signature, tolerates duplicates and never answers
200 to a swallowed failure. Secrets never logged, never committed, never in the
browser. Rate limit every public and money-adjacent path. Step up on anything that
moves where money lands. Every privileged action writes an append-only audit row.
**Never claim Vallo is a bank, an escrow institution or CBN-licensed, and never state
a provider's regulatory status without documentation.**

## 9. TESTING REQUIREMENTS

Money, identity and compliance changes ship with a test that reads the live policy
shape, never a mock. The existing payment suite passes untouched after the provider
refactor. A contract test per provider. State machines tested for every legal and
every illegal transition. Idempotency tested by replaying the same event. Webhook
signature tested with a wrong signature, a replayed body and a mangled body. Keep the
guard tests green and unchanged in intent: `banned-phrases`, `revoked-columns`,
`anon-columns`, `no-committed-secrets`, `claims`, `ranking`, `check-migrations`.

## 10. OUT OF SCOPE

Visual design, component styling, motion, icons, copy tone: Session 3. Build the
plainest working version and note the route for dressing. Store submission and device
testing: Session 4.

**Do not:** switch the escrow rail on, add or request a Payluk production key, build
a Vallo-held wallet or balance or withdrawal, ship new money wording alone, switch on
`crypto_payments`, `room_bookings`, `vnin_identity` or any off flag, apply anything
from `supabase/migrations/pending/`, write a destructive migration, make a concierge
listing bypass review, expose cNGN or build a crypto wallet, or restyle anything.

## 11. ACCEPTANCE CRITERIA

1. `/open` has a deadline and a test.
2. Paystack runs behind the provider interface with no behaviour change, proven.
3. The rail router resolves every listing type, fails closed, and writes
   `transactions.rail`.
4. The financial schema exists, additive, every migration with a read-back block and
   a rolling-back probe, each reviewed twice by different agents.
5. The ledger is append-only, fourteen event types, corrections as new events.
6. Escrow runs its twelve states with `provider_status` separate, release gated by
   required conditions including human confirmation of arrival.
7. Milestone escrow sums to the total and records each release.
8. Disputes run their machine with two-person rulings and append-only records.
9. Chargebacks have a state, a path and a recovery process.
10. Wallet, deposit, withdrawal, transfer work against Payluk staging with fees read
    from the provider and verification never bypassed.
11. AML observers cover deposits, withdrawals and transfers.
12. Tax mechanism exists with rates in a dated schedule; unconfirmed rates named.
13. Referral engine qualifies on first paid booking, rewards in basis points, one per
    verified identity, with the admin graph and cluster queries.
14. Entitlements exist at zero. Promotion is labelled inventory and organic ranking is
    provably untouched.
15. Phone verification is a reusable gate.
16. Event layer and the analytics query layers exist.
17. The nine admin financial desks have real queries and actions.
18. `blocked_terms` seeded with an admin surface.
19. ADR-0003 and the V-06 superseding ADR written.
20. Standing streaks count, pause and feed the passport, with none purchasable.
21. Passcode defaults to four digits with six still offered.
22. The notification channel policy is one table; SMS carries only the three
    permitted cases; every event has an actionable preview payload.
23. Demo rows cannot reach a member-facing query, proven by a probe.
24. Typecheck, lint and the full test suite green. Every doc you contradicted, fixed.

## 12. YOUR RESPONSE FILE

Write `docs/sessions/SESSION-2-RESPONSE.md` and keep it current as you work. It ends
with these nine headings, which are not optional:

**Completed** what was actually implemented. **Changed** important files and systems.
**Tested** what was actually run. **Failed** anything that failed. **Remaining**
anything intentionally unfinished. **Decisions** architectural and product decisions
made. **Risks** anything that could still cause problems. **Next Session** exactly
what Session 3 needs. **Do Not Repeat** work already done.

It must also contain: **what Session 1 got wrong about Payluk** once you have read
the real documentation, bluntly; the twelve questions answered or still open with
question 3 called out; every migration with what it does and whether it is applied;
both review passes per money change; anything built plainly for Session 3 to dress,
with routes; the classification of everything you touched; and what is blocked on the
founder with the exact value needed.
