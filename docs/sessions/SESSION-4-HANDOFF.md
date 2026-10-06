# SESSION 4 EXECUTION PROMPT: QA, release, security verification, final polish

**From Session 1, 5 October 2026.** Paste this entire file as your opening brief.

**Your special responsibility.** The founder has ruled there will be **no staging
database** (directives D5). Production is the only environment, the founder and
co-founders test before public launch, and the compensating requirement is his own
words: **"you audit twice."** You are the second audit. On this project that is not a
formality: five of the nine incidents in this repository's history would recur today
with every test green.

---

## 0. READ THESE FIRST

1. **`docs/sessions/DIRECTIVES-2026-10-05.md`**: the founder's current rulings. D5
   governs database discipline and makes your verification load-bearing.
2. **`docs/sessions/FEATURE-REGISTER.md`**: section L is yours, plus I12 navigation,
   I26 accessibility, I27 performance.
3. **`docs/sessions/BLIND-SPOTS.md`**: B-02, B-03, B-04, B-34 to B-39 are yours.
4. **Session 2's and Session 3's response files. Verify every claim in them.**
   Never assume a session did what it said.
5. `docs/VALLO_NATIVE_TEST_MATRIX.md`, `docs/MOBILE.md`,
   `docs/STORE_SUBMISSION_NOTES.md`, `docs/NATIVE_CI.md`,
   `docs/security/GRANT_STATE.md`.

---

## 1. OBJECTIVE

Prove the platform works, on real devices, with real money moving, and get it into
both stores. Then leave behind a readiness list the founder can act on.

## 2. THE OPERATING RULES

### 2.1 Autonomy

Routine access is authorised. Never ask whether you may inspect, test or investigate.
Do the work. Never expose a secret, never rotate or delete a credential, never destroy
production data.

### 2.2 The escalation ladder replaces asking

Investigate, inspect, check configuration, search documentation, check dependencies,
read previous response files, decide from the established strategy, make the safest
decision. Only a genuinely blocking issue escalates, **into your response file**,
while you continue on everything else.

### 2.3 Model routing

| Weight | Route to | Work |
|---|---|---|
| **Mechanical, high volume** | cheapest capable model | Selector repair across 95 specs, snapshot updates, screenshot runs, link checking, doc link fixes, inventory and matrix filling, store-asset resizing |
| **Ordinary verification** | mid model | Writing new specs, accessibility passes, responsive sweeps, store form preparation, legal page assembly |
| **Risk** | strongest model | **The second audit of every money path**, the security review, the grant-state verification, root-causing a device failure, deciding whether something is a flake |

**Never route the money second-audit, the security review or a root-cause
investigation to the cheapest model.** That is the whole reason you exist.


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

### 2.4 Hard rules

**Never skip, disable or quarantine a test to get green.** If a test fails, either the
code or the test is wrong and you say which. **A failing test is never an
infrastructure flake** until you have proved it twice and named the cause. **Never
change a money, identity or compliance outcome to make a test pass**; escalate
instead. **Report faithfully:** if something was not run, say it was not run. Every
row of the current native matrix reads NOT RUN, which is the right answer honestly
recorded, and that standard continues.

---

## 3. AGENT OWNERSHIP

| Agent | Owns |
|---|---|
| **C1 Functional QA and journeys** | Both two-sided journeys end to end, the 95 specs, new specs, the device matrix |
| **C2 Visual, responsive, accessibility** | 390, 768 and 1440 in both themes and four locales, contrast, focus, screen readers, touch targets, reduced motion, the per-page audit verification |
| **C3 Performance, mobile, Capacitor, startup, network** | Startup timing, WebView, memory, bundle, feed scrolling, offline and poor network, Android release lane |
| **C4 Security, payments, permissions, regression, release** | **The second audit of every money path**, RLS and grants, webhook and idempotency verification, store submission, the readiness checklist |

---

## 4. TASKS, IN ORDER

### Task 1: Prove one payment, end to end, on a real phone

**Nothing else matters more.** The money layer has never carried a single naira. The
only top-up ever recorded was credited by the reconciler 16 hours late rather than by
the webhook, so the webhook has never been proven in production. Paystack 3-D Secure
inside the Capacitor WebView is untested and the native audit calls it the single most
likely failure in the whole application.

This runs in **test mode**, and nothing in it waits on the founder (D38). Test mode reads
`PAYSTACK_TEST_GUARANTEE_SUBACCOUNT` and `PAYSTACK_TEST_SECRET_KEY`, a test subaccount needs
no real bank account, and a test lister's payout account is made on a test-mode deployment.
Register the sandbox webhook against the Preview deployment. Do not create a real lister
subaccount on the live account: Paystack is moving to the company account and it would die
with the migration. Live mode waits on one `ACCT_` code from the founder and nothing else.

In test mode, on a real device, through the installed app: open a payment and
reach the Paystack sheet inside the WebView; complete a 3-D Secure challenge; confirm
the webhook lands and settlement runs; confirm the split records with the three parts
summing to the charge; confirm the receipt renders and verifies. Then abandon one
attempt and confirm the sweep marks it `ABANDONED`. Then refund one and confirm all
three refund stamps move.

Then the same for the escrow rail against Payluk staging: fund, hold, satisfy
conditions, release, and a dispute through to resolution.

**Write up the result whether it passes or fails.** A failure here is the most
valuable finding available to this project.

### Task 2: The second audit (D5)

This is your defining task and it replaces the staging environment.

For **every** money, identity, compliance and RLS change Session 2 made, re-derive it
adversarially: read the migration, read the policy it creates, and try to break it.
Specifically check that every migration is additive with no destructive operation;
that each carries a read-back block that would actually fail; that each probe creates,
asserts and rolls back leaving nothing; that money tests read the live policy shape
rather than a mock; that the ledger is genuinely append-only with no update or delete
path; that `provider_status` is never written into Vallo's business state; that the
rail router fails closed; that idempotency holds when the same event is replayed; that
a wrong, replayed or mangled webhook signature is refused; that no client-supplied
amount, status, user or fee is trusted anywhere; that the AML observers now see
deposits, withdrawals and transfers; and that paid promotion provably cannot reach the
organic ranking formula.

Record both passes. Where Session 2's own review missed something, say so plainly.

### Task 3: Repair the test suite

Session 3's redesign will break end-to-end specs; that cost was accepted. Repair the
95 Playwright specs, **preferring role and accessible-name selectors over class
names** so the next redesign does not break them again. Re-run the full vitest suite
and fix what the sweep legitimately changed. Keep the guard tests green and unchanged
in intent: `banned-phrases`, `button-classes`, `css-diet`, `revoked-columns`,
`anon-columns`, `no-committed-secrets`, `workspace-terms`, `claims`, `ranking`,
`check-migrations`. **Wire the end-to-end suite into a package script and into CI**:
today only `check:a11y` is wired, so 95 specs run only when somebody remembers.

### Task 4: Device testing, for the first time ever

Every row of the matrix reads NOT RUN. Fill it in, recording device and OS version per
row, and the 21 dimensions in feature register L4.

**iOS** on real hardware through TestFlight: cold start with the new startup
animation, warm resume, no network, slow network, airplane mode mid-payment, deep link
from cold start, push tap routing once the APNs key exists, back gesture at a root,
keyboard on every form, safe areas on notched and non-notched devices, the dock never
covering content.

**Android** on a real handset: all of the above, plus the hardware back button at a
root and mid-flow, and **the Android 12+ system splash**, which today shows the
launcher icon because `windowSplashScreenAnimatedIcon` is unset. Verify Session 3
fixed it.

**The offline card:** kill the network at launch, confirm the card appears with the
real logo, confirm Try again recovers.

"Probably fine" is not an entry.

### Task 5: The Android release lane

Android has only ever built debug. Needs from the founder: Play enrolled as the
organisation, the upload keystore, Play App Signing, the real `assetlinks.json`
SHA-256 values, a real Firebase key.

Then: replace the two `PLACEHOLDER_` SHA-256 values, which strict `cap:sync` correctly
refuses today; replace the placeholder Firebase key, which makes `bundleRelease`
refuse; add a release workflow mirroring `native-ios.yml` with a signed AAB and the
keystore from the `ANDROID_KEYSTORE_*` secrets already reserved in `NATIVE_CI.md`;
verify App Links resolve on a device; internal testing before production.

### Task 6: The navigation audit verification

Session 3 performs the audit; you verify it on devices. For every flow: back, close,
breadcrumb, browser back, mobile back, Android hardware back, iOS navigation, modal
dismissal, nested pages, deep links, notification routing, and the destination after
an action completes. Plus the six financial deep-link destinations: transaction,
escrow, receipt, withdrawal, dispute, wallet. **The destination must never be lost.**

### Task 7: Store submission

**Apple:** screenshots from the shipped build at every required size, the privacy form
with **Diagnostics and Performance Data changed to yes** once Sentry exists, a reviewer
account with working credentials and passcode, What to Test notes, Associated Domains
verified, the APNs key before claiming push.

**Google:** the full listing, the 1024x500 feature graphic, the Data Safety form
matching the privacy policy exactly, the Financial Services declaration, and the
account deletion URL, which already exists.

**Both:** confirm no banned word reaches a screenshot and that a reviewer can reach
real content. **If no listing is published at submission time, tell the founder before
submitting**: a reviewer who finds an empty marketplace is a rejection risk
independent of anything technical.

### Task 8: Legal and policy pages

Content pages, yours to build, with the gaps clearly marked rather than invented.
**Identify what needs a lawyer rather than pretending engineering gave legal advice.**

Terms, privacy, cookie consent, **payment terms**, **booking terms**, **listing
terms**, **referral and rewards terms**, verification disclaimers, UGC rules, services
marketplace terms, cancellation and refund language, **a dispute resolution policy
with an SLA, escalation and an FCCPC reference**, which becomes urgent the moment the
escrow rail opens because Payluk does not arbitrate and Vallo does. Plus the NDPC
registration number into `lib/legal/company.ts` where it is null, a Data Protection
Officer who is not the founder, and a date on the cancellations page, which carries
none. **Never claim Vallo is a bank, an escrow institution or CBN-licensed.**

### Task 9: Documentation

Update product, user, workspace, feature, developer, API, payment, verification,
referral, trust, admin, onboarding, support and release docs to the new direction.
Remove outdated descriptions and contradictory terminology.

**Fix the 21 broken `archive/HANDOFF_*` links**, and reconstruct the company
obligations content into a live `docs/COMPANY.md`: the docs README calls one deleted
file the only written record of the company's registration, data protection and money
obligations. Collapse the five overlap clusters to one document each. Archive the
finished dated sweeps. Keep `THE_HUNDRED.md` and `RECOMMENDATIONS.md` because code
comments cite their identifiers, and merge `recs/` into the latter. Re-date
`security/GRANT_STATE.md` after any grant change. Sweep the remaining em dashes in
`THE_AUDIT*` and `docs/archive/`, which the linter does not scan but the repo rule
forbids.

### Task 10: The operational gaps nobody is watching

**Nobody is paged.** `SENTRY_DSN` is unset, so a member hitting an exception reaches
no human. The founder creates the project; you wire it and set the store privacy
answer to match. **No pager:** `OPS_ALERT_WEBHOOK_URL` unset, and the database pager
pages nobody until a Vault secret exists. **No uptime monitor** on
`/api/health/catalogue`. **A status page** (B-35): with money held in escrow an outage
needs somewhere that says so, or support drowns. **Secret rotation** (B-03): no
lifecycle exists and a known Firebase key is still un-rotated; produce the inventory,
owner, interval and procedure. **Load testing** (B-04): nothing establishes concurrent
capacity, and live Supabase allows 60 connections.

**And the one that gates real money: Supabase Pro with point-in-time recovery.** A
money ledger on a plan with no restorable backup is the single risk that cannot be
engineered around. Do not let the first real payment happen before it is fixed.

### Task 11: The production readiness checklist

One list. Every item **READY**, **NOT READY** or **BLOCKED**, with who holds each
blocker. This is the document the founder reads before submitting to either store and
before switching the escrow rail on for real customer money.

It must include the founder's own test pass: before switch-on, the founder and
co-founders complete a written run-through of the money paths, and the result is
recorded. That gate is the other half of the no-staging decision.

---

## 5. ACCEPTANCE CRITERIA

1. One real test-mode payment proven on a device through the WebView including 3-D
   Secure, written up pass or fail.
2. One escrow lifecycle proven against Payluk staging, including a dispute.
3. The second audit complete, both passes recorded, every money migration re-derived
   adversarially.
4. The device matrix filled with device and OS per row; NOT RUN only where true.
5. The full test suite green with nothing skipped, disabled or quarantined, and the
   end-to-end suite wired into CI.
6. The Android release lane produces a signed AAB and App Links resolve on a device.
7. Both store submissions prepared, with anything missing named and owned.
8. Every legal and policy page exists or its gap is explicitly marked for counsel.
9. Documentation updated, the 21 broken links fixed, `COMPANY.md` reconstructed.
10. Sentry, the pager and an uptime monitor wired, or blocked on a named founder item.
11. The readiness checklist delivered, every item READY, NOT READY or BLOCKED.

## 6. OUT OF SCOPE

Feature work. If you find a bug, write it up with a reproduction and route it to the
owning session. Fix only what is inside your own files.

## 7. YOUR RESPONSE FILE

Write `docs/sessions/SESSION-4-RESPONSE.md`, ending with the nine mandatory headings:
**Completed, Changed, Tested, Failed, Remaining, Decisions, Risks, Next Session, Do
Not Repeat.**

It must also contain: the Task 1 result in full, pass or fail; **the second audit,
finding by finding, including anything Session 2's own review missed**; the device
matrix filled in; test suite state with counts and what you could not repair and why;
store readiness per platform with owners; every bug found with a reproduction, routed;
and the readiness checklist.

---

## ROUND 2, added 6 October 2026

**Read `docs/sessions/ROUND-2-2026-10-06.md` in full before continuing.** It
measures what each session actually built, lists what is missing after reading the
tree rather than the response files, and carries thirty numbered recommendations.

**Your share is R2-25 to R2-30**, quality, release and the system.

**R2-25, the 34 row matrix, remains the single highest-value action on the project.** Then R2-26 to R2-30: correct the four wrong documents, add the NativeRuntime mount test that the outage still lacks, gate scripts/marketing, set the QA_MEMBER secrets to unlock signed-in coverage, and fix the weight measurement variance so every budget can come down.

**The standing rule this round adds: "done" means the brief, not the session.**
Report what you finished and what remains, in those words. Never report completion
while your own Remaining section is non-empty. If you believe the brief is
finished, say so against this handoff's acceptance criteria one by one, with
evidence for each.

---

## ROUND 3, added 6 October 2026

**Read `docs/sessions/ROUND-3-2026-10-06.md` in full.** Four audits were run
against the branches rather than the response files, and they found what the
reports did not.

**Your share is R3-33 to R3-40.**

**Four agents this round**, with declared file ownership, never two on one file:
Q1 Task 2, the second audit. Q2 the device matrix and the native lane. Q3 tests and gates. Q4 documents, store and operations.

**D48 outranks everything on every branch.** Shipped copy tells members Vallo holds
their money, in a dictionary that is wired to live panels and gated only by three
keys not being mounted.

**The rule for this round: a number, not an adjective.** Every claim of progress
carries a count and a denominator. Routes audited of 213. Sections done of 18.
Matrix rows run of 34. "Upgraded", "swept" and "done" are not reportable without
one, and a surface edited by five lines is not a surface that was audited.

### Your share of the financial layer (D50)

**Everything in D50 is money, so it is all second-audit work and it is all yours.**

Specifically: verify that **no raw provider status, error or identifier reaches a
member** on any surface; that **no fiat transaction shows a fabricated chain hash**
or a provider reference relabelled as one; that **"Processing" is never shown as
"Successful"** before the provider confirms; that **failover can never
double-charge**; that **customer money and Vallo revenue are separated in the
schema**, not only in a report, since Payluk cannot do a three-way split; and that
**legally required provider disclosures are present** where a rule, a receipt, the
Terms or a KYC step requires them, because the abstraction governs the product
surface and never the legal one.

**Also audit the rate limit as a design property**, not a runtime surprise: ten
requests per minute per key across all routes means any call per listing, per
render or in a loop is a defect, and every reconciliation sweep must be paced
against it. Find them before production does.

### Pricing and referral audit (D51): yours to verify

**Confirm `guarantee_bps = 0` actually unblocks payment**, rather than taking
Session 2's word for it: the split refuses a charge whose reserve leg is missing,
and the founder is blocked for nothing if that still holds at zero.

**Confirm no withdrawal figure is hardcoded.** Payluk's fee is variable and read
back per intent; any constant in the withdrawal path is a defect, and a quoted
total shown before the intent exists is a defect.

**Confirm the pricing table is continuous**, with no gap between bands and no
boundary where splitting a withdrawal is cheaper than making one.

**Confirm the three pots are separated in the schema**, not in a report, and that
no rewards balance is presented as custody.

**Confirm no fraud signal, risk score or admin note is reachable by a member**, on
any surface, in any payload, including a server response the UI does not render.

**Confirm the platform-wide referral budget cap is enforced server-side** and
cannot be exceeded by concurrent qualification.

### The 2 percent and the agreement gate (D51 final)

Verify: **no fee line ever reaches a renter or guest surface**, on any rail, in any
payload. **The agreement gate is enforced server-side** and a listing cannot
publish without a recorded acceptance carrying a rate version. **A rate change
cannot alter an accepted listing's rate retroactively**, which needs a test, not an
inspection. **The Payluk commission sweep records to Vallo revenue** and never to
customer funds. And the figures a lister accepted at publish are **the same figures
shown at payout**.
