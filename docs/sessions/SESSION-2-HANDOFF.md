# SESSION 2 HANDOFF: Backend, money and trust

**From Session 1, 5 October 2026.** Copy this whole file as your opening brief.

**You own:** database and migrations, server actions, payments, the Payluk track,
identity and trust, compliance, supply tooling, the native entry path.

**You do not own:** visual design, component styling, motion, icons, copy tone.
Those are Session 3. If a change of yours needs a new screen, build the plainest
possible version and note it in your response document for Session 3 to dress.

**THE FOUNDER DECIDED THE MONEY MODEL ON 5 OCTOBER. Read
`docs/payments/VALLO_PAYMENTS_ARCHITECTURE.md` section 3A before anything else.**
Two rails: **escrow through Payluk** for rent, shortlet, apartment, land and
property sale; **direct Paystack split** for hotel bookings and restaurant
reservations. The principle the code encodes is the accountability of the
counterparty: an individual lister gets escrow, a registered business gets direct
settlement. The founder has instructed that the escrow rail be built now and has
accepted the legal position; the switch-on for real customer money stays behind a
founder-controlled flag.

**The full list of what is new is `docs/sessions/NEW-FEATURES.md`.** Items 1 to 16
and 17 to 22 are yours.

**Read first, in this order:** `docs/payments/VALLO_PAYMENTS_ARCHITECTURE.md` in
full, especially section 0 (an evidence warning) and section 3A (the two rails),
`docs/sessions/SESSION-1-RESPONSE.md` (sections 1 to 5, 15, 16, 19),
`docs/PRODUCT.md`, `docs/MONEY_ARCHITECTURE.md`,
`docs/adr/0002-vallo-never-holds-customer-money.md`, `docs/COMPLIANCE_SCUML.md`.

---

## Read before you start

1. `docs/sessions/FEATURE-REGISTER.md` — the complete inventory, 1,547 requirements
   extracted from the founder's prompts. **Sections A, B, D, E, F, J, K are yours.**
2. `docs/sessions/BLIND-SPOTS.md` — 39 gaps the spec does not cover. B-01, B-05,
   B-06, B-11, B-13, B-15 are yours.
3. `docs/payments/VALLO_PAYMENTS_ARCHITECTURE.md` — in full. Section 0 is an
   evidence warning. Section 3A is the two-rail decision.
4. `docs/sessions/SESSION-1-RESPONSE.md` — sections 1 to 5, 15, 16, 19.
5. `docs/PRODUCT.md`, `docs/MONEY_ARCHITECTURE.md`, `docs/COMPLIANCE_SCUML.md`,
   `docs/adr/0002-vallo-never-holds-customer-money.md`.
6. The conflict register at the end of the feature register. Five conflicts between
   the spec and the code are already resolved there; implement the resolutions.

---

## THE OPERATING RULES (Third Follow-Up Addendum, binding on this session)

### You work autonomously. Do not stop to ask.

Routine access is already authorised: GitHub, Vercel, Supabase, the repository, the
deployment environment, the project configuration. **Never ask whether you may
inspect the repository, Supabase, Vercel or GitHub, whether you may run tests,
whether you may investigate an implementation, whether you may fix an obvious
issue, or whether you should do something the approved strategy already requires.**
Use the access and proceed.

For normal implementation, investigation, testing, refactoring, auditing,
documentation and debugging: **do the work.**

The only limits: do not expose or print secrets, do not rotate or delete
credentials, do not destroy production data, and do not perform irreversible
destructive actions casually.

### When you hit something you cannot resolve, climb the ladder before escalating

1. Investigate the repository.
2. Inspect related implementation.
3. Inspect the database, schema and configuration.
4. Search existing documentation.
5. Check dependencies.
6. Check previous session response files.
7. Decide whether the answer follows from the established Vallo strategy.
8. Make the safest production-quality decision.

**Only escalate a genuinely blocking decision**, and escalate it by writing it into
your response file, not by stopping.

### The response file protocol

The repository is the authoritative execution record. Do not rely on chat memory or
on the founder remembering anything.

Write `docs/sessions/SESSION-<N>-RESPONSE.md` and keep it current as you work. It
must end with these nine headings, which are not optional:

| Heading | Contents |
|---|---|
| **Completed** | What was actually implemented |
| **Changed** | Important files, systems and components changed |
| **Tested** | What tests and checks were actually run |
| **Failed** | Anything that failed |
| **Remaining** | Anything intentionally unfinished |
| **Decisions** | Important architectural and product decisions made |
| **Risks** | Anything that could still cause problems |
| **Next Session** | Exactly what the next session needs to know |
| **Do Not Repeat** | Work already done, so the next session does not redo it |

### The breadth mandate

**The prompts are a strategic direction, not a feature checklist.** Upgrade the
platform wherever the audit shows it is incomplete, outdated, inconsistent, broken,
poorly designed, poorly implemented or below production standard.

**Do not leave an existing screen untouched simply because it was not named.**
Classify every route, dashboard, workspace, navigation item, flow, modal, form,
settings area, profile, listing workflow, admin page, mobile page, web page, auth
state, onboarding state, empty state, error state, loading state, success state,
detail page, management page, document area, payment flow and notification surface
as **KEEP, UPGRADE, REWORK, COMPLETE, REPLACE or DEFER**, and record the
classification in your response file.

### Verify, never assume

**Never assume a previous session completed something because it said it would.**
Check the code.

### The default decision ladder

**KEEP, IMPROVE, HARDEN, REFACTOR, EXTEND. Not REBUILD.** Recommend replacement
only where the existing implementation creates a serious architectural, security,
correctness, scalability, maintainability or product problem, and then justify it in
nine parts: what exists now, what is wrong, why it matters, what should change, what
must remain untouched, dependencies, migration strategy, risk, acceptance criteria.


## Binding rules

1. **The KEEP list in SESSION-1-RESPONSE section 5 is binding.** Extend, do not
   replace. If you believe something on it must be replaced, write down why and
   stop.
2. **Integer kobo. Always.** Never float money, never divide by 100 by hand, only
   `formatMoney` renders it. Percentages are integer basis points.
3. **Never bypass the custody guard.** The `retired_custody` schema, the revoked
   grants, the off flags that refuse to turn on and the event trigger refusing
   custody-named objects all stay. Do not name a new object `wallet`, `escrow`,
   `balance` or `custody`.
4. **Build the escrow rail fully; do not switch it on.** Every line is written,
   tested and proven against Payluk staging. The production switch is a
   founder-controlled, fail-closed flag on the `lib/crypto/gate.ts` pattern. Do
   not add a production key and do not flip the flag.
5. **Do not switch on a feature flag that is off.** Do not apply a migration from
   `supabase/migrations/pending/`. Do not rotate or delete a credential. Do not
   touch production data.
6. **Money, identity and compliance changes ship with a test that reads the live
   policy shape.** Five of the nine incidents in this repository's history would
   recur today with every test green. Breaking that pattern is part of the job.
7. **Every webhook** verifies its signature over the raw body with a constant-time
   compare, tolerates duplicates, and never answers 200 to a swallowed failure.
8. **A doc that disagrees with your code is a bug.** Fix it in the same change.
9. **Maximum four agents**, with file ownership declared before work starts. Two
   agents never hold the same file.

---

## Tasks, in order

### Task 1: The `/open` deadline. Do this first, it is three lines

`apps/web/src/app/open/route.ts` is the real native entry path and it calls
`resolveSession()` with no deadline. This is the same hang class that was fixed in
`home-or-landing/route.ts` at commit `f82f2148f`, and it was never applied here.

Copy that fix exactly: a timeout constant, `guessSignedIn()` from the auth
cookie, and a race between the live session read and the deadline. Add a test
mirroring the `home-or-landing` one.

**Why it is first:** Session 3 cannot build the startup animation over an
unbounded network call, and every tester's cold start currently depends on this.

### Task 2: Seed `blocked_terms`

The table ships empty. `docs/safety/BLOCKED_TERMS_PROPOSAL.md` is still a
proposal. An empty abuse filter on a platform carrying posts, stories, messages
and reviews is an Apple 1.2 and Google UGC exposure at review.

Turn the proposal into a migration. Keep the list conservative and reviewable:
each term carries its category and its action (hold for review, or refuse). Hold
for review is the default; a hard refusal needs a reason recorded. Give the admin
console a way to add and retire terms with an audit row, because a list nobody can
edit will be wrong within a month.

### Task 3: Unstick the supply pipeline

Two blockers, both small, both currently stopping the founder's own application.

**3a.** `MORE_INFO_REQUIRED` has no forward path. An application in that state
cannot move for either side. Give the applicant a way to answer and resubmit, and
staff a way to see the answer. The founder's application VL-AGT-10016 has been
stuck since 22 September.

**3b.** Nobody can create a listing in some paths (DB-03 lineage). Re-verify
against current `main` with a live probe of the real insert shape, and add that
probe to the `db-probes` CI job so it cannot regress silently.

### Task 4: The concierge listing tool

**This is the highest business value in your whole queue.** A single founder
cannot onboard 20 listers by asking each of them to complete a seven-step web
wizard. Nigerian supply arrives over WhatsApp, in photographs and voice notes.

Build, in the admin console:

- A staff flow that creates a listing **on behalf of** a named lister, from
  photographs and a phone call.
- The lister confirms by a signed link, which creates their account if they have
  none and records their confirmation.
- It uses the existing mandate machinery (`listing_mandates`, SCUML item 17) so
  acting for somebody is lawful, recorded and auditable. **Do not invent a second
  path around the mandate gate.**
- A photo intake that accepts a large batch at once, HEIC included, with the
  existing server-side resize and EXIF strip.
- Every action writes an `audit_log` row.

**The rule that must not bend:** a concierge listing is not pre-verified and not
pre-approved. It enters the same review queue as any other and the badge still
depends on the same checks. If this tool can mint trust, it has broken the
product.

### Task 5: The `PaymentProvider` interface

Today Paystack is called directly across about 149 files while the crypto path
has a proper interface. Close that asymmetry.

Build the fiat interface described in `VALLO_PAYMENTS_ARCHITECTURE.md` section
4.2, with **capability declaration** at its centre, because the providers are not
equivalent: Paystack splits and cannot hold, Payluk holds and cannot split. Call
sites must ask rather than assume.

Then move Paystack behind it **with no behaviour change and no migration.** The
deliverable is identical outcomes with one seam. If any money outcome changes,
the refactor has failed. Prove it with the existing payment tests passing
untouched plus a new contract test for the interface.

### Task 6: The Payluk escrow rail

**Read `VALLO_PAYMENTS_ARCHITECTURE.md` section 0 before anything else.** The
Payluk documentation could not be reached from Session 1's environment. Section 3
of that file was reconstructed from npm, search snippets and a third-party
vendored copy of Payluk's agent skill. **It is a hypothesis, not a
specification.**

**6a.** Read the live documentation at `docs.payluk.ng`, including `/llms.txt`,
`/introduction`, `/api-reference`, `/guides/ai-agent-skill` and
`/guides/payluk-test-bank`. **Correct `VALLO_PAYMENTS_ARCHITECTURE.md` section 3
against what you find, and say in your response document what was wrong.**

**6b.** Answer the twelve questions in section 7 from the live docs. Anything the
docs do not answer stays on the list for the founder to ask Payluk. **Question 3
is the one that matters most:** can a funded escrow be refunded without opening a
dispute? If it cannot, then every ordinary guest cancellation becomes a dispute
Vallo must rule on, and Payluk may be the wrong tool for bookings. Establish this
before building the booking integration.

**6c.** Build the adapter behind the Task 5 interface, against
`staging.api.payluk.ng` with an `sk_test_` key. Mirror tables named per section
4.3: `payluk_customers`, `payluk_escrows`, `payluk_escrow_events`,
`payluk_balance_mirror`, `payluk_payouts`.

**6d.** The non-negotiables of the adapter:

- **Vallo owns idempotency.** No `Idempotency-Key` is documented on Payluk's
  side. Use `idempotency_records` and `withIdempotency` with a Vallo-generated
  reference, as the existing rail does.
- **Webhook:** hex HMAC-SHA512 over the raw body, keyed with the environment
  secret, constant-time compared. The Paystack verifier in
  `lib/payments/paystack.ts` is the template because the shape is identical. Add
  a replay window even though none is documented, and say so in a comment.
- **Reconciliation is the source of truth, not the webhook.** No failure events
  appear to exist, so build a reconciler on the `crypto-reconcile` model that
  reads every moving escrow back from the provider on a schedule and applies it
  through one door.
- **The mirror is never read as truth for a decision that moves money.** Every
  mirror row carries the time it was observed. A disagreement between mirror and
  provider raises an alert for a person; it is never silently corrected.
- **The `customer-id` header rule is encoded in the adapter**, not left to call
  sites: required on some routes, forbidden on others, and wrong in either
  direction is an error.
- **Decide on the inline checkout widget.** It loads a third-party script from
  `checkout.payluk.ng` into the payment path, and Vallo's CSP is nonce-based and
  strict. Driving the API directly may be the better answer. Write down the
  decision.

**6e. The escrow lifecycle**, per section 3A.6. Each of these is a requirement:

- **Release is gated on a human confirming arrival or move-in**, never on a clock
  alone. If Payluk's delivery window can auto-release, set it long enough that it
  is a backstop and not the normal path.
- **The agreement gate stays in front of escrow.** Escrow does not replace it.
  Payment still opens only after both parties confirm and an admin approves.
  Escrow then holds what the gate permitted.
- **Cancellation must not require a dispute.** This is open question 3 and it is
  the most important fact to establish, because the product already freezes
  cancellation terms at acceptance and at payment and must honour them
  automatically. Establish the answer before building this path.
- **Milestone escrow for sale**, with milestones mapped to a real Nigerian property
  transaction: deposit, title and documents verified, completion. Amounts must sum
  to the total, each release needs its own confirmation and its own record.

**6f. The switch-on gate.** Build it fail-closed on the `lib/crypto/gate.ts`
pattern: the flag is on, the provider is fully configured, the dispute policy page
is published, a second super admin exists so two-person rulings do not fail closed,
and the Terms version has been bumped. **Do not add a production key, do not
request one, and do not flip the flag.** That is the founder's act.

### Task 6B: The payment rail router

**A policy table with effective dates, never a condition in code.** Same discipline
as `fee_rates`, same reason: every transaction records which rail priced it, and
changing the routing is a data change with an audit row rather than a deploy.

Schema and the resolution table are in `VALLO_PAYMENTS_ARCHITECTURE.md` section
3A.3. `transactions` gains a `rail` column written at open and never altered: a
transaction's rail is a historical fact, like the frozen quote and the frozen
cancellation terms.

**Fail closed.** If the router cannot resolve a rail, no payment opens. It must
never fall back, because one fallback holds money that should not be held and the
other releases money that should have been held.

### Task 6C: The escrow dispute desk

Payluk does not arbitrate. The merchant does, which means **Vallo rules on who
keeps a guest's money.** Build the apparatus, reusing what already exists rather
than inventing it:

- Two-person rulings on the existing threshold pattern. Note that two-person
  rulings currently fail closed because no second super admin has been appointed,
  and say so in your response document.
- An append-only record of every ruling with the evidence that supported it. The
  caution-dispute and Guarantee-claim machinery is the precedent.
- Nobody rules a case they are party to. The existing `conflicted` answer is the
  pattern.
- A `SPLIT` outcome where the two amounts must sum exactly to what the escrow still
  holds, which Payluk enforces and you must enforce before calling it.
- Everything written to `audit_log`.

### Task 6D: One protection per rail

The two-rail model forces a decision and section 3A.4 sets it out. **Build Option 1
unless the founder says otherwise:** on the escrow rail the hold itself is the
protection, so no Guarantee contribution is taken; on the direct rail the Vallo
Guarantee works exactly as it does today.

This touches `money_policy`, the `transactions` summing constraint and
`guarantee_reserve_entries`, so it needs migrations and a test reading the live
policy shape. It also needs **one sentence per rail in `lib/money/copy.ts`** so a
payer always knows which protection they have. That copy is part of the ADR; draft
it and flag it for the founder rather than shipping new money wording alone.

### Task 6E: ADR-0003

Write it before the escrow rail is switched on, not after. It supersedes ADR-0002,
records the founder's 5 October decision, states the two rails and the principle
beneath them, names Payluk as the custodian and Vallo as never one, and records
that the written legal opinion is outstanding. An architecture decision that
reverses a previous one and is not written down is how a team re-litigates it in
three months.

### Task 7: Referral economics as booking credit

The attribution half is built and correct: `referral_codes`, the `/join/<code>`
door, `admin_referral_counts`. The economics do not exist, and the current copy
honestly says no reward is promised.

Build **booking credit, not cash.** A credit applied at checkout against a future
booking is a discount on Vallo's own revenue. It is not client funds, it needs no
custodian, it cannot be withdrawn, and it only costs Vallo when the referred
member actually transacts.

- **Qualification:** the referred member completes their first paid booking, and
  the reward is released **after the Guarantee claim window closes**, so Vallo
  does not pay out on a booking that is later refunded.
- **One reward per verified identity, not per account.** `identity_denylist`
  already exists for this.
- **A monthly ceiling per referrer**, so one person cannot become an unbudgeted
  channel.
- **Credit expires**, and the screen that grants it says the date.
- **Size as a percentage of Vallo's take**, in basis points, in a table with
  effective dates, the way `fee_rates` works. Never a hard-coded naira figure, so
  a reward can never exceed revenue.
- **An append-only credit ledger**, consistent with the rest of the money layer,
  and a credit can only be spent once.

The exact figures are the founder's to set; build the engine and set it to the
founder's answer, or to zero if there is none yet.

### Task 8: Identity, so that "verified" means something

`lib/identity/provider.ts` offers `unconfigured`, which is the production default,
and `stub`. So the strongest claim the product makes is currently backed by a
staff member looking at a JPEG.

**8a.** Write a comparison of the Nigerian vNIN aggregators (Dojah, Youverify,
Prembly, Smile and any other current option): sandbox availability, documented
pass rates, pricing shape, NDPR posture, data residency. Recommend one. **This is
a decision document for the founder, not a purchase.**

**8b.** Make the provider interface ready for a real implementation: the shape,
the error taxonomy, the HMAC storage of the NIN, the name-match rules and the
tests all exist already. Prove them against the stub.

**8c.** Do not integrate a live provider until the founder has chosen one and
supplied credentials.

### Task 9: Entitlement infrastructure, exercised at zero

There is no entitlement system. Build it the way the fee engine was built: now,
at zero, so nothing is retrofitted the day a paid tier exists.

A plan table with effective dates, an entitlement check every gated feature
calls, and a default plan granting everything that is free today.

**Paid placement stays forbidden.** The check constraint forcing
`listings.featured = false`, the published ranking formula and the test asserting
no featured, boost, sponsor, premium or subscription input in ranking all stay.
Entitlements gate **services and tools**, never rank and never trust. Read
SESSION-1-RESPONSE section 7.1 for the permitted and forbidden lists.

### Task 10: Analytics foundations

**10a.** One first-party event table with a recorder obeying the same privacy
rules as the listing funnel (V-73): HMAC-salted deduplication, service-role-only
recording, rate caps, and comparison only against an aggregate of at least five
other parties so no single party's numbers can be inferred.

**10b.** The host analytics query layer, so Session 3 has data to draw. Hotel
hosts have no analytics at all today. Model it on `listing_funnel`.

**10c.** Do not install a third-party analytics SDK. The privacy policy and the
store privacy answers do not yet describe one, and the store form currently
answers no to performance data.

### Task 11: Housekeeping that is yours

- Add the replay window on the Yellow Card webhook
  (`lib/crypto/providers/yellowcard.ts:246`). Change nothing else about crypto.
- Remove the four dead `revalidatePath("/wallet")` calls.
- Correct `docs/MONEY_ARCHITECTURE.md`, which says the custody retirement
  migration is pending when it has been applied.
- Correct the five documents that describe virtual accounts as a plan. Payluk has
  deprecated them and the founder has dropped the approach.
- Interests must reach `/home`. They are collected and then only used by
  `/search`. Provide the personalised query; Session 3 draws it.

---

## What you must not do

- Switch the escrow rail on, add a Payluk production key, or request one.
- Build a Vallo-held wallet, balance or withdrawal. Custody is Payluk's; Vallo
  holds a reconciled mirror and never a liability.
- Add a Payluk production key or request one.
- Ship new money wording on your own. Draft the per-rail sentences for
  `lib/money/copy.ts` and flag them: that copy is a legal act and belongs to
  ADR-0003 and the founder.
- Switch on `crypto_payments`, `room_bookings`, `vnin_identity` or any other off
  flag.
- Apply anything from `supabase/migrations/pending/`.
- Touch the ranking formula.
- Make a concierge listing bypass review.
- Restyle anything.

---

## Your response document

Write `docs/sessions/SESSION-2-RESPONSE.md` before you finish. It must contain:

1. What you built, per task, with file paths.
2. **What Session 1 got wrong about Payluk**, now that you have read the real
   documentation. Be blunt; section 3 of the payments file was explicitly a
   hypothesis.
3. The twelve questions, answered or still open, with question 3 called out.
4. Every migration you wrote, what it does, and whether it is applied or pending.
5. Anything you built plainly that Session 3 must dress, with the route.
6. What you found that nobody asked about.
7. What is blocked on the founder, with the exact value or decision needed.
