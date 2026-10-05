# Founder directives, 5 October 2026

**These supersede every earlier spec, plan, audit and architecture decision they
touch.** The founder's instruction: "forget all those old specs and plans and ideas,
always go with current new directives." Where a prior document disagrees with this
one, this one wins, and the prior document is wrong.

Every session reads this file first.

---

## D1. Brand: the three-layer hierarchy

**Locked. Supersedes "Real Estate reimagined!" and supersedes the Master Prompt's
own "FIND YOUR SPACE. WITHOUT THE RUNAROUND."**

| Layer | Line | Where it goes |
|---|---|---|
| **Slogan** | **Space, without the runaround.** | App splash, website, receipts, emails, ads, social, store listings, beside the wordmark |
| **Category and positioning** | **The operating system for physical spaces.** | Investors, partners, press, the company narrative. **Never the primary consumer line**: it is slightly corporate as a first impression |
| **Product explanation** | **Discover, verify, transact, and manage spaces in one place.** | Landing subtitle, store description, the answer to "what is Vallo" |
| **Short form** | **Discover. Verify. Transact. Manage.** | Four-beat rhythm for bands, footers, step headings |

**The reasoning, in the founder's words:** "Find your space" made Vallo sound like a
search company. The platform is now Discover, Understand, Verify, Transact, Occupy,
Manage, Maintain, Repeat. "Space, without the runaround" keeps the spirit and
stretches to every stage: finding without the runaround, verifying without the
runaround, paying, signing, moving in, managing, maintaining, operating a business
space, all without the runaround. It does not lock Vallo into property listings.

**The full stack, as it appears together:**

```
VALLO
Space, without the runaround.

The operating system for physical spaces.

Discover. Verify. Transact. Manage.
```

**Implementation notes.** This is not a find-and-replace. The line is an i18n key
(`landing.hero.*`, `slogan`), it is translated into Yorùbá, Hausa and Igbo, and the
three how-it-works step titles currently reuse it. `packages/i18n/src/locales/en.ts`
already carries a note saying the shipped slogan is retired pending this ruling.
Split the keys so slogan, positioning and explanation are three separate strings
with three separate jobs, then set them. The slogan stays in English in every
locale, as the wordmark does.

## D2. Buttons: rectangles by default

**Supersedes the north star's original reading and tightens Master Prompt section
40.** Section 40 said "do not make every button a pill". The founder's ruling goes
further: **most buttons are rectangles, matching what the platform does today.**

Default is a rounded rectangle at radius 14. The pill is reserved for chips,
filters, segmented controls and circular icon controls, so that seeing a pill tells
a person the thing is selectable or removable. North star section 5A holds the eight
roles.

## D3. Paid promotion is built

**Supersedes migration V-06, which forces `listings.featured = false`, and the
no-paid-placement doctrine in `PRODUCT.md` and `THE_HUNDRED`.**

Boost, Spotlight, Featured and Prime are built, with the per-tier attributes and the
measurement the founder's own spec requires. The guardrails below are not a hedge on
the directive: they come from Master Prompt sections 25 and 26.

- **Promoted placement is separate, clearly labelled inventory.** A paid listing can
  occupy a marked slot; it can never reorder organic results.
- **The organic ranking formula stays untouched and published**, and
  `ranking.test.ts` keeps asserting that no paid input reaches it. Visibility is
  sold; rank is not.
- **Measurable**, per section 26: impressions, views, unique viewers, saves, shares,
  inquiries, contacts, viewings, bookings, transactions, with organic versus promoted
  comparison where statistically valid.
- **Never imply guaranteed leads. Never manufacture numbers** (sections 25, 26).
- **Tier names say what you get**, not Gold or Silver or Platinum (section 25).
- **The badge is never for sale.** Paid promotion buys attention, never trust. A
  promoted listing carries no verification it has not earned.

Session 2 writes an ADR superseding V-06 and a migration that lifts the constraint
deliberately, with the labelled-slot architecture landing in the same change so
there is never a window in which paid placement can touch organic rank.

## D4. Tax: build it

**New. Absent from both the code and the founder's spec until now.** Blind spot
B-05 is promoted to a deliverable.

The True Cost Engine gains a tax layer: stamp duty on tenancy agreements, which
Vallo generates; withholding tax on rent paid to corporate landlords; VAT on service
fees, including commission and any paid service; and the capital-gains
considerations on sale. Rates live in a table with effective dates, never in code,
the way `fee_rates` does, and every transaction records which schedule taxed it.
Counsel confirms the rates and the obligations; engineering builds the mechanism and
shows the line.

**Nothing may be invented.** Where a rate or an obligation is not confirmed, the
line is absent and the gap is named in the session response file, not guessed.

## D5. No staging database: production, with compensating discipline

**Founder's decision, overriding blind spot B-01.** There will be one database. The
founder and co-founders test before going public, and the compensating requirement
is the founder's own: **"you audit twice."**

So every session that touches the database obeys all of the following. These are not
optional, because they are what replaces an environment.

1. **Two-pass review.** Every migration and every money-path change is reviewed a
   second time, adversarially, by a different agent than the one that wrote it. The
   second pass tries to break it. Both passes are recorded in the response file.
   The repository's own history is the argument: three agents once proposed the same
   fix that would have stopped every admin decision on the platform, and only the
   adversarial pass caught it.
2. **No destructive migrations.** No dropped column, no dropped table, no deleted
   row, no truncation, no type change that loses data. Additive only. A column that
   must go is first stopped from being read, and dropped in a later change once
   nothing reads it.
3. **Every migration carries a read-back block** that fails the migration if RLS,
   grants, constraints or triggers did not land as intended. The SCUML migrations
   already do this and are the pattern.
4. **Every migration carries a probe** that creates its fixtures, asserts the
   behaviour, and rolls them back, leaving nothing behind. Again the pattern exists.
5. **Idempotent migrations.** Safe to run twice.
6. **Supabase branches for verification where available.** Not a second project: a
   branch, created for the migration, verified, merged, dropped. This costs nothing
   extra on Pro and is the closest thing to a staging environment without one.
7. **A money-path change ships with a test that reads the live policy shape**, not a
   mock. Five of the nine incidents in this repository's history would recur today
   with every test green.
8. **The founder's test pass is a gate, not a formality.** Before the escrow rail is
   switched on for real customer money, the founder and co-founders complete a
   written run-through, and the result is recorded.

**What is still required of the founder, because no amount of discipline substitutes
for it: Supabase Pro with point-in-time recovery, before the first real payment.** A
money ledger on a plan with no restorable backup is the one risk that cannot be
engineered around.

## D6. Phone verification: nothing to build, one key to buy

**Correcting an earlier finding.** Paystack does not provide SMS; it is a payments
processor. **Termii is already fully built** in this repository:
`lib/phone-otp/termii.ts`, behind the `OtpTransport` interface, trying WhatsApp
first when enabled, then Termii's DND route so MTN and Airtel do-not-disturb numbers
still receive the code, then the generic route. Supabase Auth generates and checks
the code; the hook at `/api/auth/sms-hook` only delivers it. Twilio Verify can
replace Termii later by writing one more `OtpTransport`, with no screen changes.

**What the founder supplies:** `TERMII_API_KEY`, `TERMII_SENDER_ID`, and
`SEND_SMS_HOOK_SECRET` from Supabase Authentication, Hooks, Send SMS. Then
`PHONE_SIGNIN_ENABLED=true`, last, once a test code has arrived.

**Why it matters beyond sign-in:** the referral engine's qualification flow requires
phone verification, and the anti-farming design names a verified phone as the first
real identity signal because email is not sufficient. Until these keys exist, the
referral engine cannot qualify anybody.

**What Session 2 does build:** phone verification as a *gate* reusable outside
sign-in, so an existing email account can confirm a phone from settings and the
referral engine can require it. `confirmed_phones` and `/settings/phone` exist; the
work is wiring them to qualification.

## D7. The database follows the new direction

Session 2 produces a database plan covering: the Space model (D8), the 19 financial
tables, the conditions engine, the referral ledger, entitlements and promotion, the
tax schedule, the event layer, and the Space Passport. Additive, probed, reviewed
twice, per D5.

## D8. Space is the noun

**Space** is the user-facing object and the conceptual model, across the 15
categories the spec names. `listings` stays the table name: renaming a table buys
nothing and risks everything. The vocabulary, the i18n keys and the terminology test
change together in one deliberate change, not drifting across sessions.

## D9. Sessions work autonomously and do not waste the founder's time

**The founder's instruction: the sessions must be fully autonomous and must not
waste sessions.** Three consequences, binding on every handoff.

1. **Never stop to ask what is already authorised.** The escalation ladder in each
   handoff replaces asking. A genuinely blocking decision is written into the
   response file, and work continues on everything not blocked by it.
2. **Model routing by task weight.** A session that runs architecture-grade
   reasoning over a mechanical rename is wasting the founder's money. Each handoff
   carries a routing table: the cheapest capable model for mechanical, well-specified,
   high-volume work; a mid model for ordinary implementation against a clear spec;
   the strongest model for architecture, money logic, security, state machines, and
   anything irreversible. **Money, auth, RLS and migrations are never routed to the
   cheapest model**, whatever the volume.
3. **Parallel work with declared file ownership.** Up to four agents, never two on
   one file, independent tool calls batched, read-only fan-out searches delegated
   rather than run serially.

## D10. Use the current tooling

Sessions use what the harness actually offers now rather than working as if it were
a plain editor: skills for the jobs that have one (**the `dataviz` skill is loaded
before the first line of chart code**, which matters because four of the spec's
intelligence features are charts and the palette is a single hue); subagents for
parallel independent work; worktrees for isolation where a change is broad;
background execution for long builds and test runs; and repository hooks where a
check should be automatic rather than remembered.

---

## What this file supersedes, explicitly

| Superseded | By |
|---|---|
| "Real Estate reimagined!" and "FIND YOUR SPACE. WITHOUT THE RUNAROUND." | D1 |
| The north star's original pill-button reading | D2 |
| Migration V-06's `featured = false` constraint, and the no-paid-placement doctrine | D3 |
| Blind spot B-01's staging-database requirement | D5 |
| The claim that phone verification needs building | D6 |
| `PRODUCT.md` section 7's "Listing" as the user-facing noun | D8 |
