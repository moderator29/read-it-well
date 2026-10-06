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

## D11. Every significant feature gets its own onboarding

**New, 6 October.** Not one onboarding at the front door and nothing afterwards. A
person meeting the wallet, escrow, the referral hub, analytics, the Space Passport,
promotion, a Pro workspace or the host desk for the first time meets a **designed
first run for that feature**, once, dismissible, remembered.

The pattern is one reusable system, not fifteen bespoke screens. North star section
14 defines it.

## D12. Pro mode is a toggle, and it only exists when it is paid for

**New, 6 October.** When a member holds a paid plan or a paid feature, a **Pro
switch** appears and flips the surface into its Pro state. **A member who holds
nothing never sees the switch at all.** It is not a locked control, not a greyed
toggle, not an upsell dressed as a feature: it is simply absent, and what they see
instead is the ordinary surface plus, where appropriate, a single honest route to the
plan.

This is an entitlement-driven presence rule, so the entitlement system (feature
register F1) is its dependency, and it must fail closed: no entitlement, no switch.

## D13. Get Started becomes monotone, and it is the first screen after the animation

**New, 6 October.** The Get Started page is rebuilt **monotone**: one hue, cleaner,
smarter, stronger, in the spirit of reference image 37. It becomes **the first screen
the platform shows once the startup animation completes**, which makes it the single
most seen screen in the product and the first real impression after the brand moment.

Onboarding beyond it uses **full-page** compositions in the spirit of reference image
36: one idea per page, large type, generous air, a real illustration or product
moment, and legitimate proof only.

## D14. Premium artefact cards

**New, 6 October.** Reference image 38's fanned metallic cards with "Select your
tier" is the treatment for anywhere Vallo has a tier, a credential or a membership:
the Space Passport, trust tiers, Pro plans, and promotion tiers. A tier should feel
like an object a person holds, not a row in a pricing table.

**One hard limit:** Vallo issues no payment card, so a card artefact must never look
like a debit or credit card, carry a network mark, or imply a card product exists.
It is a credential, and it reads as one.

## D15. The 3D icons must be clean in light mode

**New, 6 October.** The founder reports the current 3D icons still read poorly on
light. They are glass, and glass needs a dark ground to resolve: on white it goes
muddy and loses its edges. This is a material problem, not a rendering accident.

The fix is the clay migration already decided in D2 of the four locked decisions,
plus a ground. North star section 15 specifies both, and no clay asset is accepted
until it has been checked on paper at 390px as well as on night.

## D16. Sessions research the references themselves

**New, 6 October.** The founder's instruction: the agents should have the power to
research, and should look at the reference images themselves whenever they need the
sentiment for a surface they are building.

So every implementation session is told, in its prompt, to open the relevant
references before designing a surface rather than working only from a written
description of them. Session 1's classification is a map, not a substitute. More
references are being added to the repository and the sessions read whatever is there
on the day they run.

## D17. Streaks, built as earned standing rather than habit bait

**New, 6 October.** The founder wants streaks in the platform. Session 1's earlier
position was that streaks are manipulative here, and that position was half right and
is now refined rather than kept.

**Why the obvious version is wrong for Vallo.** A daily-open streak works for a
language app because using it daily *is* the product. Somebody looks for a home once
every few years. A "12 day streak" on a property platform rewards nothing real, and a
person who loses it feels punished for not needing a house, which is the opposite of
trust.

**Why the right version is one of the strongest features in the whole plan.** Vallo
already measures things that are real, repeated and consequential. Turn those into
streaks and you have **verifiable standing**, not a game:

| Streak | Who | Why it is real |
|---|---|---|
| **On-time rent** | Tenant | Consecutive payments made on time. This becomes part of the Space Passport and is a rent-payment history a tenant can carry to the next landlord. In a market where tenants have no portable credit record, **this is the single most valuable thing Vallo can give a renter** |
| **Reply time** | Agent, host | Consecutive weeks replying inside the promised window |
| **Dispute-free** | Agent, host, tenant | Consecutive months or tenancies closed with no dispute |
| **Listing freshness** | Lister | Consecutive weeks confirming availability, which keeps the catalogue honest |
| **Inspection follow-through** | Agent | Consecutive inspections attended as arranged |
| **Complete listing** | Lister | Consecutive months at full Listing Health |

**The rules that keep it trustworthy.**

- **A streak counts a real-world behaviour with a counterparty, never an app-open.**
- **It is never broken by not needing the product.** A tenant between tenancies does
  not lose their on-time rent record: it pauses, and the screen says it is paused.
- **Breaking is quiet.** No flame going out, no loss animation, no notification
  shaming. The number simply restarts and the history is kept.
- **It feeds standing, not score.** Streaks attach to badges, the Space Passport and
  the trust tier. There is no leaderboard and no comparison against strangers.
- **Nobody can buy one.**
- **The earned moment is permitted and should be good**: reference 41's sunburst,
  medal and share action. It is earned, so the celebration is honest.

This replaces the blanket anti-streak rule in the north star's anti-pattern list,
which remains correct about daily-habit streaks and confetti on purchases.

## D18. Passcode: four digits by default, six still offered

**New, 6 October.** `DEFAULT_PASSCODE_LENGTH` moves from 6 to 4.
`PASSCODE_LENGTHS` keeps both, and a member can still choose six. Setup offers four
by default with six a visible, one-tap alternative, and the existing trivial-code
refusals apply to both lengths.

## D19. Sessions must not duplicate each other

**New, 6 October.** The founder's concern, in his words: not two sessions building the
same thing, because that causes conflict.

`docs/sessions/CROSS-SESSION-CONTRACT.md` is the authority. Every handoff points at
it. The rule: **one owner per concern, declared before work starts, and a session that
finds itself about to build something another session owns stops and writes it into
its response file instead.**

## D20. Sessions propose and build connective work

**New, 6 October.** Sessions are not order-takers. As they build, each is expected to
find and build the things that **connect new features to old ones**, make a flow
whole, or add a premium tool that makes the named features actually work.

Three conditions: it must connect or complete something rather than start a new
unrelated area; it must obey the cross-session contract so it is not another session's
concern; and it must be recorded in the response file with what it connects and why.

**Session 3 carries this most heavily.** The founder's words: the frontend design and
sweep session should make legendary decisions. It has explicit authority to decide
how surfaces work, not only how they look.

## D21. Paywall preselection, corrected

**New, 6 October, correcting the north star.** Section 14.3 forbade a preselected
annual plan. Reference 42 preselects annual and is nonetheless an honest screen,
because it states on the same surface, at readable size: what is charged today (zero),
the exact date the trial ends, that a reminder comes first, the full price after, and
how to cancel.

**The corrected rule:** a plan may be preselected and recommended, with its real saving
shown as a figure, **provided the full charge, the charge date, the renewal terms and
the cancel path are all visible on the same screen at legible size without scrolling
past the action.** The dark pattern was never preselection; it was hiding what happens
next. The three-step trial timeline is the mechanism that makes it honest and it is
required wherever a trial exists.

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
| One onboarding at the front door only | D11 |
| Any locked or greyed Pro control shown to a member without entitlement | D12 |
| The current Get Started page, and the first-screen-after-startup being `/home` or `/welcome` as they stand | D13 |
| Tier and plan presented as a pricing table row | D14 |
| Glass 3D marks on light surfaces | D15 |
| The blanket anti-streak rule, for earned standing only | D17 |
| `DEFAULT_PASSCODE_LENGTH = 6` | D18 |
| North star 14.3's ban on a preselected plan | D21 |
