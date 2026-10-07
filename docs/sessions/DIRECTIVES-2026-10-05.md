# Founder directives, 5 October 2026

**These supersede every earlier spec, plan, audit and architecture decision they
touch.** The founder's instruction: "forget all those old specs and plans and ideas,
always go with current new directives." Where a prior document disagrees with this
one, this one wins, and the prior document is wrong.

Every session reads this file first.

---

## D1. Brand: the three-layer hierarchy

> **Amended by D28.1 on 6 October.** The theme half of the original D1, which had
> money surfaces leading Paper, is superseded: the member's chosen theme governs
> everywhere and Dark stays the default. Paper is now a treatment for the document
> itself rather than the screen around it. The brand hierarchy below is unchanged.

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

## D22. Notifications across three channels, including SMS

**New, 6 October.** Notifications become a first-class system on **three channels: in
app, push, and email, plus SMS** for the narrow set that earns it.

**SMS is already built and paid for.** The Termii transport behind `OtpTransport`
delivers authentication codes today, with WhatsApp first and the DND route so MTN and
Airtel do-not-disturb numbers still receive messages. The same transport carries
notification SMS, so this is a routing change rather than a new integration.

**SMS costs money per message and interrupts a person at any hour, so it is rationed.
It is permitted only for:**

1. **Money that moved, or failed to move**: a payment settled, a refund processed, a
   withdrawal landed or failed, escrow funded or released, a chargeback.
2. **A deadline with consequences**: rent due or overdue, an agreement about to lapse,
   a check-in today, a dispute response window closing.
3. **Security**: a new device, a payout account changed, a password or passcode reset.

**SMS is never used for anything social**, never for marketing, and never for
something that can wait until the person next opens the app. A member can turn
non-security SMS off, and the preference is honoured everywhere.

**Every notification has a preview and a full view.** The preview is the row in the
list, the push body and the email subject line, and it carries enough to act on
without opening. Opening it goes to **a designed full screen for that event**, not a
generic detail page and never a dead end. North star section 16 specifies both.

**Coverage is broad and the sessions must extend it.** Section 16.2 lists the events
Session 1 found across money, trust, supply, bookings, tenancy, social, relations,
account and staff. **It is a floor, not a ceiling**: every session adds the events it
discovers in its own area and records them.

## D23. Emails rebuilt

**New, 6 October.** The founder's assessment of the current emails is that they look
like nothing. They become a designed surface with the same material system as the
app: premium containers, real buttons, clean icons and **more** icons, and proper
components rather than paragraphs of text.

**In light mode every email is a white background.** No grey wash, no dark card on
light. Receipts, statements and anything that is a document follow the Paper register.

Full specification in north star section 16.5.

## D24. Demo listings stay. The visible demo labels go

**Founder instruction, 6 October, and it is his call, not engineering's.**

Session 1 initially answered this by gating demo listings out of production reads
instead. **That was wrong of me: it substituted my judgement for an instruction the
founder had already given, and then described it as what he meant.** The founder's
instruction stands, and it is this:

1. **The demo listings stay in place.** They are not removed, not gated out, not
   hidden from reads.
2. **The visible "demo" and "example" labelling comes off the listing surfaces.** No
   "this is a demo" text, no example badge, nothing on a card or a detail page telling
   a viewer the listing is an example.
3. **The founder removes the demo rows himself when the platform goes live**, which is
   his stated plan and his decision to time.

### What engineering does alongside this, because it is engineering's job

These are not conditions on the instruction above. They are the things that make it
safe, and none of them re-adds a label or removes a listing.

**A demo listing may never carry a trust signal it has not earned.** This is the part
that actually matters, and it is worth being precise about why. The 2026 incident was
not bad because content lacked a label: it was bad because 22 invented places carried
`verified: true` with fabricated ratings on addresses that do not exist. **The danger
was never the missing word "demo". It was fabricated trust.** So:

- No verified badge on a demo listing.
- No `address_verified_at`, `physically_inspected_at` or `verified_by` timestamp.
- No fabricated review score, review count or rating.
- No agent presented as verified behind it.

A demo listing can look like a real listing. It must never look like a *checked* one.

**`is_demo` stays in the database.** The founder asked for the labels to come off the
screen, not for the flag to come out of the schema. Staff still see it in the admin
console, the flag still drives the admin examples surface, and it is what makes point
three possible: **one switch removes every demo row on launch day.** Build that switch
so the founder can act on his own timing in one action rather than hunting rows.

**The claims and banned-phrase lints are unaffected**, because they govern invented
trust and the words `demo`, `sample` and `preview` in product copy. Removing a demo
badge from a card does not touch either.

## D25. Inner pages, so nothing is jammed into one screen

**New, 6 October.** Too much currently lives on single screens. The platform gains
**depth**: an area has a clean overview, and the detail lives on its own inner page
with its own motion, its own back destination and its own empty, loading and error
states.

**The rule of thumb:** when a screen carries more than one job, the second job becomes
an inner page. An overview answers "what needs me and how am I doing"; an inner page
answers one question completely.

This is not more clicks for their own sake. It is the difference between a dashboard a
person can read in three seconds and a wall they scroll past. Session 3 owns the
information architecture and has authority to split surfaces.

## D26. Sessions keep the repository and their environment clean

**New, 6 October.** Professionalism, in the founder's words. Scratch files, experiments
and one-off scripts live in the scratchpad and are never committed. Commits are
focused, with real messages that say why. Generated files are not hand-edited.
Branches are tidy. The working tree is clean when a session finishes, lint and
typecheck are green before any push, and nothing is left half-applied. A session that
creates a mess for the next session has not finished its work.

## D27. Sessions use the current Claude Code tooling, including mods

**New, 6 October.** Sessions work as engineers with modern tooling rather than as a
plain editor.

**Mods**, Claude Code's plugin system, are used where a check should be automatic
rather than remembered: a hook that runs lint and typecheck before a commit, a status
line showing the current session and the per-page audit progress, a pane for the
checklist Session 3 must run on every page. **Session 4 owns the shared mods** so
three sessions do not each build their own, and it records what it created so the
others can enable them.

Also used: skills where one exists for the job, and **the `dataviz` skill is loaded
before the first line of chart code**; subagents for parallel independent work under
declared ownership; worktrees where a change is broad; background execution for long
builds and test runs.

## D28. It stays Vallo. Evolution, not a new platform

**New, 6 October, and it amends D1. This is the governing instruction for the whole
sweep.**

The founder's words: the default mode does not change, the current containers and flow
stay as they are but upgraded, and **he does not want the platform to look like a
different platform**. A legendary upgrade **of Vallo**, not a replacement for it.

**This outranks any individual design decision in this file or the north star.** Where
something below would make a returning member feel they had opened an unfamiliar
product, it is wrong, however good it looks in isolation.

### D28.1 The theme default does not change

**Dark stays the default.** Light, Dark and System remain the choice, painted from the
`nf_theme` cookie, defaulting to Dark, exactly as today.

**This amends D1**, which said money and document surfaces would *lead* Paper. Taken
literally, that meant a member on Dark walking from a dark home into a white checkout,
and that is precisely the jarring, different-platform feeling the founder is refusing.

**The resolution, which keeps both intentions.** The member's chosen theme governs the
application, always and everywhere. **Paper becomes a treatment for the document
itself, not for the screen around it.** On a dark canvas, a receipt, a statement, an
agreement or a transaction detail renders as **a light document sheet sitting on the
dark surface**, the way a real receipt sits on a desk: elevated, bounded, unmistakably
a document, with the chrome and navigation around it staying in the member's theme.

That gives the receipt its "worth screenshotting as proof" quality, which was the point
of D1, without ever flipping the application out from under somebody. A member who
chooses Light gets the same document on a light ground, where it reads as paper on
paper and needs only its border and elevation to separate it.

### D28.2 Containers and flow are evolved, not replaced

The four container tiers are **a formalisation of what the product already does**, not
a new system imposed over it. Plate, Card, Island and Sheet are names for shapes
already in use, with their radii, elevation and edge treatment made consistent and
their behaviour in both themes made deliberate. **The radii, the navy glass material,
the edge light and the blue family all stay.**

**Flow stays.** The dock keeps its slots. The side navigation keeps its structure. The
listing, checkout, agreement and workspace flows keep their steps. The inner-page work
in D25 **splits screens that carry two jobs; it does not reorder a flow a member
already knows.**

### D28.3 The test every change must pass

> **Would a member who used Vallo last week open it and feel they are in the same
> product, only better?**

If the honest answer is no, the change is wrong and is reworked. Upgrade the material,
the type, the figures, the motion, the depth and the craft. **Do not move somebody's
furniture.**

### D28.4 What this does not soften

The upgrade is still thorough: every page audited, the motion system, the figure
signature, the matte clay migration off glass, feature onboarding, the notification
and email rebuild, the money surfaces, the admin mobile rebuild. **The standard is
unchanged; the identity is preserved.** Those are not in tension, and a session that
treats D28 as permission to do less has misread it.

## D29. The two-tier material rule for 3D assets

**New, 6 October, founder approved. This amends D2 of the four locked decisions.**

D2 said matte clay for every content object. **That was over-applied.** The no-gloss
rule exists because coins, gems and glossy abstract objects read as a betting or crypto
product in this market. **A building with glass windows is not that**, and a property
platform is better served by places that look like places.

The corrected rule has two tiers, and **the tier is decided by what the object is, not
by its size**:

| Tier | What belongs | Material |
|---|---|---|
| **A. Real things** | Buildings, land, estates, and real Nigerian infrastructure: the prepaid meter, water tank, inverter, generator, borehole pump, estate gate, ceiling fan | **Rich and realistic.** Warm interior light, foliage, real materials, a dominant blue palette with natural accents. Recognisable by sight |
| **B. Symbols** | Anything standing for an idea: shield for trust, chart for analytics, bell for notification, wallet, padlock, key, receipt, tick, map pin, speech bubble, medal, credential card | **Simple and matte.** Deep royal blue, minimal geometry, **no gloss, no reflection, no gem or coin aesthetic**. Legible at 32px |

**The test:** does a person recognise it because they have seen one in the world, or
because it stands for a concept? The first is Tier A. The second is Tier B.

**Why the split is enforced rather than loose.** A set that mixes materials inside one
tier looks cheap the moment two of them share a screen. Within a tier, every object
must match every other object exactly: same angle, same lighting, same finish.

**Tier B keeps the casino prohibitions in full.** No coins, no gold, no gems, no
tokens, no glossy abstract forms. Those were never about buildings.

**Hard rule for both tiers: no text, letters, words or signage baked into any asset.**
Vallo ships in English, Yorùbá, Hausa and Igbo, and an icon with English welded into it
is wrong in three of four locales and can never be translated. Signage boards render
blank.

**Both tiers must survive a light background.** Every asset is checked on `#F4F4F1` at
390px as well as on `#010118`. An asset whose edges disappear on white is rejected,
which is the failure that made the existing glass set unusable.

**Assets arrive as sheets.** The founder generates them in grids rather than one at a
time, because image-generation limits make 130 separate generations impractical.
Session 3 slices them. `scripts/build-icon-assets.py` already does this for the
original brand sheets and is the precedent. Resolution per object is the constraint
that sets the grid size, not the generation limit.

## D30. Motion is cinematic, and the system is specified

**New, 6 October.** The founder's instruction: the platform must feel alive and
cinematic, with heavy motion in Get Started and onboarding, Pro areas, the wallet, the
landing page and many more. His motion designer supplied a brief.

**`docs/design/MOTION_SYSTEM.md` is the specification**, and its section 0 contains a
finding every session must read: **the GSAP engine the designer's brief says to pull
from does not exist in this repository.** There is no `scripts/marketing/video/`
directory, no `gsap` dependency and no `CustomEase` match anywhere in the tree or in
git history. It lives in the separate marketing and video project. A session told to
reference it would waste an hour and then invent something.

**What the repository does have is substantial** and is used instead: eight duration
tokens, five ease tokens, and nine motion components including `BrandAssemble` and
`DepthWords`, which were built for exactly the startup sequence now being specified.

**The designer's five curves are adopted as vocabulary.** Four already exist under
other names and are aliased; only `whip` is new. **His ten principles are adopted in
full**: intent, fast entrances and slow exits, 60ms stagger, 0.6x parallax, and the
payoff pop reserved for confirm, verify, unlock, release and earn.

**GSAP is not added to the application bundle.** Roughly 70KB gzipped, in a Capacitor
WebView, on budget Android, over Nigerian networks, against a weight budget the
repository already enforces. It is dynamically imported for two cases only: the Get
Started scroll choreography and the startup sequence if the existing component cannot
carry it. **Three.js is refused for the product entirely**: the 3D feeling comes from
the pre-rendered assets the founder is generating, moved with CSS 3D transforms. The
marketing video engine may use whatever it likes, because it is not shipped to a phone.

## D31. The startup screen: 1.5 seconds, animated, root-caused

**New, 6 October.** The founder reports the logo screen currently holds for about eight
seconds before Get Started appears, and that it must become a 1.5 second animated brand
moment.

**The eight seconds is not an animation duration. It is an unbounded network call**,
`resolveSession()` in `app/open/route.ts` with no deadline. **Session 2 fixes that
before Session 3 builds the animation.** The founder's own earlier instruction applies:
the fix must not be a timer, and the animation must never conceal a broken
initialisation.

The six-beat sequence is in `MOTION_SYSTEM.md` section 3. **If the app is ready early
the sequence still completes**, because a brand moment cut short looks broken. **If it
is not ready by 1,500ms it holds on the settled lockup with the breath continuing**,
which is the only honest waiting state, and it never pretends to finish.

## D32. Get Started is specified in depth, and the passcode screen is rebuilt

**New, 6 October.** `MOTION_SYSTEM.md` section 4 is the deep reference for Get Started:
four parallax layers at 0.3x, 0.45x, 0.6x and 1.0x; a seven-beat 900ms entrance that
**inherits the startup's final frame with the mark already in position**, so the two
screens are one continuous movement; a breathing aurora and a slow bloom pulse so the
screen reads as alive rather than looping; pull-down stretch; and press-to-route
morphing through `nav-origin`.

**The passcode screen is rebuilt** (section 6). The founder's assessment is that it is
bad, and it is also the screen a returning member sees more than any other. Four digits
by default per D18. The dots become the subject of the screen. Each digit lands with a
scale pop and a light haptic, a wrong code shakes once and clears quietly with no red
flash and no dialog, and the correct code opens **the same door the startup sequence
uses**, so unlocking and launching feel like one gesture.

## D33. Icon origins and the orange accent

**New, 6 October.** The founder reports that the generated icons now carry consistent
origins and that the identity is settling around the 3D set with orange present.

**The accent rule is therefore widened slightly and deliberately**: warm orange
`#FF6A3D` may appear as a small detail within a Tier A or Tier B asset where the
generated set already carries it, and it remains forbidden as a button fill, as body
text, as a status colour and as a second primary. **One accent per object, one spark
per screen.** The enumerated list in north star section 3 stands, with generated assets
added to it.

**Consistent origins matter for slicing.** The sheets in
`docs/design/assets-raw/2026-10-06/` are sliced by Session 3, and a consistent origin
and scale across a sheet is what makes an automated slice produce assets that align
optically rather than merely geometrically. `scripts/build-icon-assets.py` is the
existing precedent.

## D34. The component library is adopted, and ported

**New, 6 October.** The founder supplied a component library and asked that it be used
widely, in Vallo's style. **`docs/design/COMPONENT_LIBRARY.md` is the spec.**

They are good engineering and **written for a different design system**. Dropped in as
they are, they fail this repository's own checks on the first commit: every colour is
hardcoded and `check-css-tokens.mjs` fails the build on a raw colour, they import an
icon family Vallo does not use, they carry invented data the claims lint exists to
prevent, and they contain infinite spinners which Vallo bans. The porting checklist in
section 2 is not optional.

**`framer-motion` is added, through `LazyMotion` with `domAnimation` only**, roughly
18KB rather than 50, justified by three things CSS genuinely cannot do: shared-element
`layoutId` transitions, drag with spring-on-release, and interruptible springs.
**Everything else stays CSS.** `lucide-react`, `clsx` and `tailwind-merge` are not
added: Vallo has `UiIcon` and a two-line `cn` helper. **This does not reopen GSAP**,
which stays out of the bundle.

**The glass navigation is for inner areas, not the main navigation.** The dock and side
navigation are settled by D28. This is second-level navigation inside admin desks,
workspaces, settings, the wallet, escrow, space detail, analytics and support, and the
pull on the hamburger is the part worth keeping.

**Drag-to-confirm is for genuinely irreversible actions only**: releasing escrow,
confirming a withdrawal, sending a transfer, deleting an account, an admin ruling. **Its
auto-reset is disabled on anything that moves money**, because a confirmed transfer must
never return to looking unconfirmed.

**The receipt printer keeps the paper and loses the chassis.** The extrusion, serrated
edge, perforation and monospace ledger feel are right, because a receipt a guest can
screenshot as proof is a real requirement. A simulated POS terminal with LEDs is a toy
on a property platform. **No drawn barcode unless it encodes a real reference, and no
invented transaction ids.**

**Particle delete is never used on money**, a payout method, a transaction record or an
account. A playful dissolve on a consequential deletion is the wrong emotional register.

## D35. The craft doctrine governs taste

**New, 6 October.** The founder supplied the premium-branding principles behind Apple's
work and asked that the platform follow them. **`docs/design/CRAFT_DOCTRINE.md`
translates them to a product**, where they get sharper rather than softer, because a
product is used a thousand times where a video is watched once.

The eight: intention behind every choice; rules kept deliberately so the product feels
decided; **the negative discipline of not doing what makes it feel cheap**, which is
actionable by subtraction and therefore free; one screen one idea with space to breathe;
smoothness, **overlap**, and transitions that carry rather than cut; **adaptive rhythm**,
so startup is slow, browsing is quick, money is deliberate and error is immediate;
**haptics as the product's sound design**, since Vallo is used in public on mute; and
design decided before the component is written.

**Its section 8 is seven questions every surface answers before it is called done.**

## D36. Session 3 may use six agents

**New, 6 October.** The frontend and experience session may run **up to six agents**
rather than four, because its scope is the largest: 200 pages, the motion system, the
component library, the asset slicing and the per-page audit.

**Ownership discipline tightens rather than loosens with six.** Every agent declares its
files before any parallel work, two agents never hold one file, and the shared files in
the cross-session contract keep their single named owner. **Six agents without declared
ownership is slower than four, not faster**, because the time goes into reconciling
conflicting edits.

Sessions 2 and 4 stay at four.

## D37. Clean work: CI, commits, and pushing to main

**New, 6 October.** The founder's instruction: the work should be organised, audited,
committed and pushed as it is done, cleanly, without sessions conflicting.

- **Commit as you finish a unit**, not in one enormous commit at the end. A unit is a
  thing that works and passes the checks.
- **Green before every push, without exception**: `npm run typecheck`, `npm run lint`
  and `npm test`. A push that reddens CI costs the other sessions their ability to
  trust the branch.
- **Scratch files, experiments and one-off scripts are never committed.** They live in
  the scratchpad.
- **Pull before you push.** Three sessions share this repository, and the cross-session
  contract's file ownership is what keeps a merge trivial.
- **A conflict means somebody crossed a boundary.** Resolve it by the contract, and
  record it in your response file so it is not repeated.
- **Commit messages say why**, not what. The diff already says what.
- **Never force-push a shared branch.** Never rewrite history another session has
  pulled.
- **The working tree is clean when you finish.** Nothing half-applied, nothing
  uncommitted, nothing left for the next session to discover.
- **Keep CI green as a shared asset.** A session that finds CI red from another
  session's push says so in its response file rather than working around it.

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
| **D2's matte clay for every content object** | **D29: two tiers, realistic for real things, matte for symbols** |
| The blanket anti-streak rule, for earned standing only | D17 |
| `DEFAULT_PASSCODE_LENGTH = 6` | D18 |
| North star 14.3's ban on a preselected plan | D21 |
| Notifications as a two-channel afterthought | D22 |
| The current email design | D23 |
| Session 1's own proposal to gate demo listings out of production reads | D24: the listings stay, the visible labels come off, the founder removes the rows at launch |
| Single screens carrying several jobs | D25 |
| **D1's per-surface theme lead** | **D28.1: the member's theme governs; Paper becomes a document treatment within it** |
| Session 4's "needs from the founder first" on the live reserve subaccount | D38 |
| Session 3's decision not to add framer-motion in this pass | D39 |
| D39 section 4's single owner for the lockfile | D46 |
| Reading a cancelled check as anything other than "did not run" | D47 |
| Treating retired custody language as a naming tidy-up | D48 |
| **D39's LazyMotion requirement** | **D49: it is dead weight here and comes out** |
| **D48's reading that no balance may ever exist** | **D50: a balance held by a licensed provider may be presented, under four conditions** |
| **The Vallo Guarantee at 1 to 2 percent** | **D51: retired to zero, machinery kept** |
| **D51's claim that zeroing the rate is a row and lifts the blocker** | **D52: false on three counts, corrected** |
| Any reading that a defect predating a session is nobody's | D53 |
| **Any reading that db-06's red is branch-local** | **D54: it reads production, so it is red everywhere until the allowlist row lands** |
| Chasing the production dependency advisory inside a feature branch | D55 |
| **D55's assignment of the lockfile bump to Session 3** | **D55 itself, amended: Session 1 landed it on PR #86 to get that PR green** |
| **Any probe recorded as "pending" on an applied migration** | **D56: a check that did not run is a check that failed** |
| **Session 1's "nothing else is hiding behind the red"** | **D57: false. A third failure was hiding in a cancelled job** |
| Any plan for referral payouts that opens before the detectors exist | D58 |
| **D54's assignment of the db-06 row to Session 2** | **D59: Session 1 took it after two hours of no movement** |
| **Any reading that paid promotion was removed** | **D60: D3 built it on 5 October; the gap was the tier detail, now written** |
| **The flat "keeps 96 percent" on the fee screen** | **D61: wrong, rail dependent, and Session 1 wrote it. A range now** |
| **D58 on the referral engine, and Session 1's "apply it" on b4_referral_rewards_engine** | **D62: architecture locked by the founder; hold the migration until campaigns are in it** |
| **D62's hold on b4_referral_rewards_engine** | **D63: wrong on both reasons. Apply it. Only the payout path waits, on the budget cap** |
| **"Qualification refuses past the cap with a named reason"** | **D64: it pauses instead, and the cap is 700,000 naira a month** |
| Suspecting your own diff when Advisories goes red | D65: check the package name first, it is usually a new advisory |
| **D64's silence on when a pause ends** | **D66: a paused reward releases against the month it is released in, oldest first** |
| **D66's claim that the implementation never resumes a paused reward** | **D67: false of the shipped code. The rule stands, the accusation does not** |

---

## D67. D66's headline finding is wrong about the shipped code, and Session 4 caught it

**D66 said a paused reward would never resume, called it "a hole in D64 that would have left
people unpaid", and attributed it to Session 1's own underspecified rule. The defect is not in
what shipped.** Session 4 corrected their own 16:30 pre-review after #84 landed, and Session 1
verified the correction in the applied SQL rather than taking the report.

### What was checked, and where

`supabase/migrations/20261006152509_b4_referral_rewards_engine.sql`, now on main:

- **Line 533:** `v_month date := private.lagos_month(now());` computed at the moment of the
  attempt.
- **Line 580:** the qualification update writes `month = v_month`.

**So the month is recomputed on every attempt, not stamped once.** A referral blocked under
October's exhausted budget and retried in November is written with November's month and
measured against November's budget. **That is exactly the behaviour D66 prescribed**, and it
was already in the code before D66 prescribed it.

**The surrounding machinery, from Session 4's trace:** a paused referral stays `attributed`
with `blocked_on = 'budget_paused'`, the sweep re-selects on `status = 'attributed'`, so the
month turning hands it a fresh period with no hand override. `referral_programme_status()`,
in the campaigns migration `20261006154817`, returns paused with reason `budget_reached` and is
granted to `authenticated`.

### Three things to take from this, in order of how much they matter

**1. D66's rule stands; D66's accusation does not.** "A paused reward is measured against the
month it is released in, oldest first" is still the correct rule and is worth keeping written
down. **What was wrong was asserting that the implementation failed it.** Those are different
claims and D66 ran them together.

**2. Session 1 published a defect it had not verified.** D66 was written from Session 4's
pre-review and from reading D64's own silence, not from the SQL. **The rule this file has
enforced all day, against three sessions, is that a status line is not the thing itself, and
Session 1 broke it while writing the directive that enforced it.** The verification was one
`grep` away and would have taken a minute.

**3. The implementation is better than the specification in one respect worth copying.**
`referral_programme_status()` **names no amounts.** It says the programme is paused and why,
without publishing the budget. D64 asked for a visible pause and did not think about whether
the cap figure should be public. **Telling members the exact ceiling invites gaming it;**
telling them the programme is paused is honest without being an invitation. That is a better
answer than the one specified.

### The other three findings, also closed

- **The 700,000 figure** was corrected before the migration was applied: the pending-to-applied
  diff is two hunks, the header and `100000000` becoming `70000000`. Independently confirmed
  against production: `platform_monthly_budget_minor` reads 70000000.
- **Rule 1 now has D64's original shape.** `referral_reserve` puts the cap in the `WHERE` of
  the statement that writes it, with a check constraint behind it, which also **retires the
  READ COMMITTED caveat**: the loser either fails its predicate re-check or raises a
  serialization failure, and both are safe.
- **The b2-ledger probe has passed.** It is in `probes/` on main and reports `PASS b2-ledger
  (957 ms)`. **Three cancellations became a recorded pass**, and the standing rule's entry for
  it is struck by evidence rather than by a report.

**Nothing in the referral area is outstanding against Session 2 from D64 or D66.**

---

## D66. Session 4's cap review found a hole in D64 that would have left people unpaid, and it is Session 1's

**Session 4 pre-reviewed D64's three rules against the unapplied referral migration at Session
2's head `257eb1e1f`, tracing the code rather than trusting the comments that assert it. The
work is correct and three of its findings change what gets built.**

### The one that matters most, and it is a defect in D64 itself

> **"A paused reward never resumes. `month` is written once and the cap always sums spend for
> that month, so a reward paused in an exhausted month measures against the exhausted budget
> for ever and needs a hand override."**

**That is a hole in Session 1's design, not in Session 2's code.** D64 said a pause "never
reaches backwards" and that it "is recoverable by raising the cap". **It never said what
happens to a paused reward when the next month begins**, and the implementation did the
reasonable thing with an underspecified rule: it pinned the reward to the month it qualified
in. The consequence is that a reward paused in a full month is measured against that month's
exhausted budget for ever.

**So D64, written specifically to stop Vallo breaking a promise to somebody who earned a
reward, would have produced exactly that**: rewards that are never refused and never paid,
which is worse than a refusal because nobody is ever told. The irony is the point, and the
lesson is that **"it pauses rather than refuses" is only true if the pause has a defined end.**

**The rule, now stated:**

> **A paused reward is measured against the budget of the month in which it is being released,
> never the month it qualified in. When a new month opens with a fresh budget, rewards paused
> earlier become eligible again, oldest first.**

**Oldest first is load-bearing.** Without it the backlog never clears, because new rewards keep
arriving and would compete with it every month. A paused reward from two months ago has
priority over one qualified this morning. And the member surface shows a paused reward as
waiting for the next month, with a date, not as an indefinite hold.

### The seeded figure contradicts the founder

**The migration seeds 100000000 minor, which is 1,000,000 naira. D64 sets 700,000.** Correct it
to `70000000` minor before the migration is applied. A seeded default that disagrees with the
decision is the kind of thing that survives for months because everything appears to work.

### Rule 3 fails, and it is the one the founder cares about

> **"`my_rewards_summary` exposes no budget and no pause flag, `my_referrals` omits
> `review_reason`, and select on `referrals` is service_role only. A budget pause is
> byte-identical to a fraud hold on the member's screen."**

**That is the lying by omission D64 named, already present in the code.** A member whose
reward is waiting because Vallo ran out of monthly budget sees exactly what a member suspected
of fraud sees. The first is Vallo's own limit and should say so plainly; the second is a
review and should say that instead.

**So:** `my_rewards_summary` gains a pause state and the date it is expected to lift;
`my_referrals` surfaces enough of a reason to distinguish the two cases; and **the two cases
must never render identically.** Session 2 for the reads, Session 3 for the surface.

### Rule 1: accepted, by a different mechanism than D64 prescribed

D64 required the cap "checked before accrual, in the same statement that writes it". **The
migration closes the race differently**: the write is unconditional, the cap is read after it,
and what actually prevents double spending is a transaction-scoped
`pg_try_advisory_xact_lock` on the month key, taken before the write and held to commit, so the
second qualification cannot read the budget until the first has committed.

**That satisfies the requirement and Session 1 accepts it.** The directive specified a shape
when it should have specified the property: **two qualifications racing for the last of the
budget must not both succeed.** The lock achieves it.

**One condition, from Session 4's own caveat:** the check is only correct under `READ
COMMITTED`, which Supabase defaults to and **the migration does not state.** Assert it or
document it in the migration, because a silent dependency on an isolation level is exactly the
kind of assumption that breaks when somebody later wraps a caller in a stricter transaction.

### Rule 2 passes

The cap function mutates nothing, `referral_release_due` does not recheck it, and the only
route from approved back to under review needs a staff decision and a reason. Nothing further.

### Two notes from the same review, carried rather than acted on

**The b2-ledger probe has now failed a third cancelled apply** and remains invisible to CI,
correctly recorded under the standing rule as a failed check rather than a pending one. **The
route past it is still the one in the #84 comment: move the probe into
`supabase/tests/probes/` and let CI be its first runner**, because CI uses psql and
`DATABASE_URL` with no tool boundary and no sixty second limit. A fourth cancelled apply will
tell nobody anything new.

**The referral engine's application code is already on Session 2's branch while the migration
is unapplied.** Not dangerous, since the calls would error rather than do something wrong, but
worth knowing: **nothing in that code path should be reachable from a member surface until the
migration lands.**

---

## D65. A new advisory landed mid-afternoon and it is nobody's change: the pattern, and how to handle the next one

**At 15:14 the Advisories check went red on PR #86 after two documentation-only pushes.** No
code changed, no dependency was touched, and the failure was real:

```
sharp  <0.35.5
Severity: high
sharp: Vulnerability in librsvg dependency CVE-2026-96889
       GHSA-wq5f-xc86-pv6w
```

**A different package from the morning's `source-map-js`, and a CVE published while the
session was working.** `npm audit` queries the live advisory database rather than anything in
the repository, so **a newly published advisory turns the check red on every branch
simultaneously, with nobody having done anything.** That is the second time in one day the
Advisories job has gone red for a reason no diff explains, and it will not be the last.

### The handling rule, so nobody loses an hour to it again

**Red Advisories after a push that touched no dependency is almost always a new advisory, not
your change.** Check it in this order, and it takes two minutes:

1. **Read the package name.** If it is not something the push went near, stop suspecting the
   push.
2. **Check whether a patched version satisfies the existing range.** If it does, the whole fix
   is a lockfile bump and no `package.json` changes.
3. **Check whether it is red on the base branch too.** If it is, it is not that pull request's
   failure, though somebody still has to fix it.

**Do not reach for the diff first.** Session 1 spent real time this morning suspecting its own
lockfile change for a Vercel failure that turned out to be transient, which is the same
mistake in a different costume: **assuming the most recent change is the cause because it is
the most recent.**

### What was done, and the verification that matters for a native package

`sharp@0.35.5` satisfies the existing `^0.35.4`, so it is a lockfile bump. **A native package
deserves more care than a parser did**, so:

- `npm audit fix --omit=dev --package-lock-only` changed **nothing but `sharp`, its platform
  binaries and the `libvips` natives they wrap** (1.3.3 to 1.3.4, which carries the librsvg
  fix). Added none, removed none, verified by comparing the parsed lockfile before and after.
- **The native module actually loads:** `require("sharp").versions.vips` reports 8.18.7. For a
  compiled dependency that check matters more than the audit does, because a lockfile can be
  perfectly valid while the binary fails to load on the platform.
- `npm run build` passes, which is the meaningful test: Next.js uses `sharp` for image
  optimisation at build time.
- Typecheck and lint pass, audit exits 0.

**One honest note on the first attempt at that check.** Session 1 first ran
`require("sharp/package.json")`, which threw `ERR_PACKAGE_PATH_NOT_EXPORTED` because `sharp`
does not export that path. **That was the probe being wrong, not `sharp` being broken**, and
it is recorded because a thrown error in a verification step is exactly the kind of thing that
gets misreported as a finding.

### Who fixes it on the other branches

**It is red everywhere right now.** Session 2's and Session 4's branches carry the morning's
`source-map-js` pin but not this one; Session 3 carries neither. **Nobody should chase it
separately.** It arrives with main once #86 lands, and each session picks it up in the merge
they are already going to do. **If a session sees Advisories red on `sharp` before that merge,
the correct response is to note it as main's and carry on.**

---

## D64. The platform budget cap is 700,000 naira a month, and it pauses rather than refuses

**Decided by the founder on 6 October.** The referral programme's platform-wide ceiling is
**700,000 naira a month**, one row, enforced server-side before any reward may accrue. Detail
in `docs/referral/REFERRAL_ARCHITECTURE.md` section 10.

### Why it exists, in one table

The per-member cap limits one person to 1,500 qualified referrals a month. **Vallo's exposure
is the member count multiplied by that cap**, and the per-member cap is satisfied in every row:

| Members at the ceiling | Consumer campaign, 76 naira | Supply campaign, 300 naira |
|---|---|---|
| 10 | 1.14m naira | 4.5m naira |
| 100 | 11.4m naira | 45m naira |
| 1,000 | **114m naira** | **450m naira** |

**Nobody broke a rule in the bottom row.** That is the hole the budget cap closes, and it is
why the per-member cap was never protection. At 700,000 naira with a 76 naira reward the cap
is roughly **9,200 qualified referrals a month**, which is a great deal of genuine growth
before anything pauses.

### The correction: it pauses, it does not refuse

**`REFERRAL_ADMIN_CENTRE.md` said qualification "refuses past the cap with a named reason".
That was wrong.** Refusing is a broken promise: somebody invited a real person who really
qualified, and Vallo would be telling them no because other referrers reached the cap first.
**That is the worst possible way to spend a reputation, and it would be spent on the people
doing exactly what Vallo asked of them.**

- **At 75 percent of the cap, an alert fires**, so the founder sees it coming with time to
  raise the cap or wind the campaign down deliberately.
- **At 100 percent, new qualification pauses, visibly**, and the member surface says so in
  plain words.
- **Everything already qualified is honoured and paid in full.**

**Pausing is honest and refusing is not.** A pause stops people inviting friends under a
promise Vallo cannot fund, which is the actual harm. It is recoverable by raising the cap; a
refusal cannot be taken back.

### Three rules this puts on the engine

1. **The cap is checked before accrual, in the same statement that writes it**, so two
   qualifications racing for the last of the budget cannot both succeed.
2. **A pause never reaches backwards.** It changes what happens next and never touches a
   reward that has already qualified.
3. **The pause is visible to members, not silent.** A rewards surface still inviting people
   while the programme is paused is lying by omission.

**And D63's gate still stands:** no payout path goes live until this cap exists and is
enforced server-side.

---

## D63. Apply the referral migration after all, and nobody was ever told to switch phone verification off

**Two corrections, both prompted by the founder challenging D62 on 6 October. He was right on
one and the other was a misreading worth clearing up precisely.**

### Nobody told Session 2 to switch phone verification off, and Termii is already built

D62 and the architecture document said **"phone verification is built and switched off pending
an SMS provider"**. That is a **report of the current state**, taken from the feature register's
own D4 row, not an instruction to anybody. **No session has been told to disable anything**, and
Session 1 would have no business telling them to.

**And the provider was never an open question: Termii is already chosen and already built.**
Measured in the tree rather than assumed:

- `apps/web/src/lib/auth/phone-sign-in.ts`, `phone-sign-in-flag.ts`, and the Supabase send hook
  at `apps/web/src/app/api/auth/sms-hook/route.ts`.
- The transport sends **WhatsApp first when `TERMII_WHATSAPP_ENABLED=true`, then Termii's DND
  route so MTN and Airtel numbers on do-not-disturb still receive codes.** That DND detail is
  the part most integrations get wrong in this market, and it is already handled.
- **One switch closes or opens every part at once:** `PHONE_SIGNIN_ENABLED`. The door, the
  actions and the hook all read it.

**So there is nothing for a session to build here.** The eight remaining steps are in
`docs/PHONE_SIGNIN.md` and every one is founder-side: the Termii account and KYC, an approved
sender ID, the optional WhatsApp template, a cost ceiling per code, the Supabase dashboard
settings, the Vercel variables (`TERMII_API_KEY`, `TERMII_SENDER_ID`,
`TERMII_WHATSAPP_ENABLED`, then `PHONE_SIGNIN_ENABLED=true` **last**, after a test code has
actually arrived), the privacy notice naming Termii as a recipient of phone numbers, and a test
on a real MTN and a real Airtel number with one on DND.

**What Session 2 should do:** read that document, confirm every step still matches the code, and
fix anything stale. **Not rebuild what exists.**

### Apply the referral migration. D62's hold was wrong on both of its reasons

**Reason one is dead.** D62 argued nothing is lost by waiting, because nothing can qualify
until an SMS provider exists. **The founder is obtaining the Termii key now.** Qualification is
days away. And "there is no hurry" was a weak argument even while it was true: it justifies
delay without demonstrating any benefit from it.

**Reason two was overstated, and that is the more useful admission.** D62 called adding
campaigns later **"restructuring the spine in a money area after rows exist"**. It is not a
restructure. A `referral_campaigns` table, a `referral_budget_periods` table and a nullable
`campaign_id` on `referrals` are **additive DDL**, and with zero rows in every referral table
the extension costs one ordinary migration. **Session 1 reached for the strongest available
word rather than the accurate one, and a directive built on an inflated word is a directive
that stops real work for no return.**

**So: apply `b4_referral_rewards_engine.sql`.** It carries risk scoring, reversal, cluster and
velocity work, and it has had two review passes. **Applying schema pays nobody**: the payout
path needs application code that does not exist yet.

### The one line that does not move

> **No payout path goes live until the platform budget cap exists and is enforced
> server-side.**

This is not caution about schema. The moment `PHONE_SIGNIN_ENABLED` is true, referrals can
qualify, and **without a platform cap one viral moment creates a debt Vallo has not agreed to
and cannot fund.** The per-member cap does not protect against it, because the exposure is the
member count multiplied by the cap.

**Order:** apply now; the next migration adds campaigns, the budget period with its cap in
naira, the requirement registry and the review window. **Qualification may run before campaigns
exist, defaulting to the launch policy. Payout may not run before the cap does.**

---

## D62. The referral engine's architecture is locked, and the pending migration must not be applied yet

**The founder locked the referral architecture on 6 October.** It is
**`docs/referral/REFERRAL_ARCHITECTURE.md`**, and it **supersedes D58 and
`REFERRAL_ADMIN_CENTRE.md` wherever they differ.** The admin screens and detectors in that
earlier document still stand; the engine, lifecycle and configuration model now come from here.

**The rule everything serves, in the founder's words:** *Vallo rewards genuine network growth,
not account creation.*

### The refinement that resolves three open questions at once

**No reward amount, threshold, window or cap is a product rule. All of them are campaign
configuration.** D51 set the reward at 70 naira and the founder's latest note says 76; an
earlier instruction set the withdrawal minimum at 1,000 naira and the latest mentions 80.
**None of those need settling before implementation any more**, because each is a row in a
campaign rather than a constant in code.

**What may never be configuration:** append-only accounting, the separation of referral money
from customer money, payment only on webhook confirmation, and a reward's amount frozen on its
row at qualification. **A guardrail that can be switched off in a dashboard is not a
guardrail.**

### Three things in the founder's brief that Session 1's spec got wrong or missed

**A review window between QUALIFIED and AVAILABLE.** A qualified reward is PENDING, waits the
campaign's window while the risk graph keeps correlating, and only then becomes withdrawable.
**That one delay defeats most economically rational attacks**, because fraud at scale needs the
money out fast. D58 had no such state.

**PAID only on webhook confirmation**, never on the transfer API's response. A transfer that
returns 200 and then fails is a reward Vallo believes it paid and did not. So: an idempotent
handler keyed on the transfer reference, a reconciliation sweep for transfers that reach no
terminal state, and **the member sees "sent" rather than "paid" until the webhook lands.**

**Qualification is a policy engine, per campaign**, not a hard-coded rule. Consumer at 76
naira, business at 150, supply at 300, each with its own requirements. **Build it as a fixed
registry of named, individually tested requirement checks, and never as an expression
language.** A predicate table parsed at runtime becomes a small programming language with no
type checking inside a money path. A campaign stores an array of registry keys; adding a
campaign type must not require a new key.

### The arithmetic nobody had done, and it needs the founder

**Different rewards per campaign multiply against a cap that was set once, globally.** At 1,500
qualified referrals a month: 114,000 naira per member under the consumer campaign, 225,000
under business, **450,000 under supply.** So one global cap means something four times more
expensive under the 300 naira campaign. **The cap must be per campaign**, and the platform
budget cap must be the real ceiling. A hard-to-fake requirement is a good defence; it is not a
budget.

### The risk graph, and the constraint that protects honest members

The founder's caveat is the most important engineering constraint in his brief: identify the
cluster **without automatically accusing every shared-network user.** In Nigeria shared
networks are the normal case: carrier NAT puts thousands behind one address, and shared Wi-Fi,
cybercafes, campuses and offices do the rest. **A system that treats a shared network as
evidence will spend its life accusing honest people in Lagos.**

So edges are weighted and unequal. **Strongest: a shared payout destination**, because a ring
must converge to collect. Strong: shared device, and mutual or circular referral. Moderate:
sequential phone patterns in a tight window, near-identical activity. **Weak, and never
sufficient alone: the same network.** No single edge triggers anything, clusters rank by naira
exposure rather than member count, and flagging moves rewards to UNDER REVIEW, which is
reversible. **Nobody is told they committed fraud by a graph.**

### The migration: Session 1 reverses its own instruction to apply it

**`supabase/migrations/pending/b4_referral_rewards_engine.sql` must not be applied as it
stands.** Session 1 told Session 2 to apply it earlier today. That was before this
architecture was locked, and it is now the wrong call.

Checked: the file creates `referral_policy`, `referrals`, `referral_events`, `rewards_payouts`
and `rewards_ledger`, and already contains risk scoring, reversal, cluster and velocity work,
all of which is good and is kept. **It has no trace of campaigns, a budget period, or a cap in
naira.** Those are not edge additions: under this architecture **the campaign is the organising
dimension**, so qualification policy hangs off it, the reward comes from it, the per-member cap
belongs to it and the review window is its setting. **Applying a referral spine without its
organising dimension means restructuring the spine later, in a money area, after rows exist.**

**And nothing is lost by waiting.** The feature register records that phone verification is
built and switched off pending an SMS provider, and `phone_verified` is a requirement in every
campaign the founder listed. **Not one referral can qualify until that provider exists**, so
there is no cost to getting the schema right first. Add campaigns, the budget period, the
requirement registry and the full lifecycle states to the file, then apply once, probe once,
record once.

---

## D61. Session 3's round in detail, and a wrong number that was Session 1's

Full working-through: **`docs/sessions/SESSION-3-DEEP-2026-10-06.md`**. The headline is a
correction Session 1 owes.

**The fee acceptance screen shows a figure that is wrong, and Session 3 is not at fault.**
They built it from `docs/payments/VALLO_PRICING.md` and used its sentence verbatim: "you keep
96 percent instead of 90: 108,000 naira more on 1,800,000". The arithmetic is right. **The
figure is not, and the fault is in the pricing document.** Four percent is the escrow rail;
the direct rail is 2 percent plus a capped Paystack fee, so the lister keeps about 98 percent
there. Session 1 wrote a flat percentage into a document whose own rail table, forty lines
below, contradicts it.

**It cannot be fixed by choosing the other number, because the rail is not knowable when the
lister accepts.** Acceptance happens before publishing; the rail is chosen per booking, later,
by how the buyer pays. So the screen shows a **range anchored on the worst case**, with the
second two percent named as escrow protection rather than a Vallo fee:

```
Rent you set                          1,800,000
Platform fee                     36,000 to 72,000
  Vallo, 2%                           36,000
  Escrow protection, 2%
  when a buyer pays into escrow       36,000
You receive                   1,728,000 to 1,764,000
```

**The worst case is the headline**, because a pleasant surprise is the only acceptable
direction for a money figure to move. The pricing document is corrected in place with the
reasoning rather than quietly edited.

**The comparison claim needs dating.** "Instead of 90" asserts what other people charge. Ten
percent is fair for a typical Nigerian agency fee, so it is defensible, but on a screen
forming part of an agreement it is a typical market rate **as at a date**, never attributed to
a named competitor. If an agent charges eight percent, Vallo's screen is false and Vallo put
it in writing. **Lead with the naira the lister keeps, not the percentage:** competing on
percentage invites a race against someone charging nothing.

**The acceptance record is a legal artifact.** It stores both rates as numbers, the terms
version, the exact figures shown including the rent entered, the timestamp and the actor. And
per D51 a lister **keeps the rate they accepted until they accept a new one**, so a rate change
re-prompts rather than applying silently. That makes the record versioned by necessity.

**Two of the sweep's bug fixes need probes, not just fixes.** "Paid in total" on an unpaid
tenancy appeared in the **complaint pack**, a document a member may hand to a landlord or a
tribunal: Vallo generated a document that misstated whether money had been paid. It needs a
test across unpaid, part-paid and fully-paid. **False verified ticks** converge with promotion
guardrail 5, so one test covers both: a badge renders only from an earned verification record,
and a promoted listing's badges are byte-identical to unpromoted.

**The weight target is the wrong target.** 20 percent off a bundle is a proxy. Vallo's members
are on mid-range Android on congested Nigerian networks paying by the megabyte, so the real
measure is **time to interactive on a throttled connection on a mid-range device**. Keep the
percentage as tracking, add the real one, and confirm D49's LazyMotion removal actually landed
before a fourth pass hunts smaller wins.

**The i18n move needs three assertions**, because moving hundreds of strings breaks silently:
every key referenced in code exists in English, no locale value is empty, and any string with
a placeholder in English has the same placeholders in every locale. Extend
`slice-coverage.test.ts`.

---

## D60. Promotion was never removed. Session 3 is blocked on a premise D3 overturned, and the three "your call" items are answered here

**Session 3 reported the promotion onboarding as blocked, saying "paid placement was
removed".** It was not. **D3, 5 October, explicitly supersedes migration V-06 and the
no-paid-placement doctrine in `PRODUCT.md` and `THE_HUNDRED`**, and the feature register
carries F2, F3 and F4 for it. Session 3 read the superseded documents rather than the
superseding directive.

**This is the fourth instance of one pattern in two days** (D41, D45, D47, now this): a
session concluded something was absent or impossible without checking the layer that
supersedes. The rule is already written and is repeated here because it keeps costing real
work: **this directives file wins over every earlier document it touches, and a blocker
should be verified against it before it is reported.**

**But the founder's annoyance is earned, and not at Session 3 alone.** The decision existed;
**the product did not.** Nobody ever wrote what Boost gives a lister that Spotlight does not,
so Session 3 could not write an onboarding without inventing the feature and Session 2 could
not price a row. That gap was Session 1's, and it is closed:
**`docs/promotion/VALLO_PROMOTION.md`**, which is now the authority on this area. Four tiers
with duration, placement, exposure, audience, analytics, price and limitations; seven
testable statements of what promotion must never do; the measurement surface; where the money
goes; and the four onboarding screens.

**Three things from it that change other sessions' work:**

- **The money path is already built.** Promotion is Vallo's own revenue and posts to
  `ledger_vallo_revenue`, which b2_ledger created, because D51 names that pot as "commission,
  withdrawal fees, promotion". A promotion purchase is a single-party charge: no split, no
  subaccount, no escrow, no provider holding anything. **It is the simplest money path on the
  platform and must not be borrowed from the booking flow.**
- **"Prime" breaks guardrail 4**, D3's own rule that tier names say what you get. Boost,
  Spotlight and Featured each name a placement; Prime names a rank, which is Gold and
  Platinum in a different hat. Recommended rename: **"Everywhere"**. The founder's call, and
  nothing waits on it: key the tier on the slug `prime` and keep the display name in the
  locale file.
- **Prices are proposed, not decided**, in the D38 pattern: 2,500 naira for Boost, 7,500 for
  Spotlight, 20,000 for Featured, 50,000 for Prime. Effective dating makes a change a row.

### The three "your call" items, decided

**1. The fee acceptance screen: connect it now, behind a flag that is off.** Session 3 is
right that connecting it live would stop every lister from sending a listing for review until
Session 2 lands the rate and the acceptance record. That is a real production risk and the
hesitation was correct. It is also not a reason to leave finished work dangling. The repo has
`feature_flags`. **Wire the screen into the wizard now and gate only the blocking behaviour
on the flag.** With the flag off the screen is reachable, reviewable and testable, and
publishing is never blocked; the day Session 2's rate and acceptance record exist, one flag
flips. Nothing is left on a shelf and nothing breaks.

**2. The auth redesign: Session 3's reading of D28 is correct, and no structural redesign is
assigned.** The founder's "real redesign" was dissatisfaction with how it looked, not a
request to restructure sign-in. **Auth is where a product loses people, so restructuring it
is high risk for low reward.** Keep the containers and flows recognisable. Go further on
craft instead: motion, spacing, the type scale, the premium feel of the reference images.
"Consistent" is not the same as "finished", and that gap is where the remaining work is.

**3. The weight diet: continue the third pass.** At minus 11 percent against a 20 percent
target, with sign-in down 17.5 and `/check` down 25. Moving member-only styles out of the
stylesheet every page loads is the right lever. **Also confirm D49 actually landed**: that
directive found LazyMotion costing 31 KB per route. If it is still there, removing it is a
large share of the remaining nine points on its own.

### What stays blocked, and it is not promotion

The real blocker in this area is unchanged and is the founder's: **the promotion product
cannot be sold until there is a way to take the money**, which is the Paystack company
account migration (D38). Promotion needs no subaccount and no split, so it is the **first**
thing that works the moment that account exists. Worth knowing when deciding what to sort
first.

---

## D59. Session 1 took the db-06 row itself after two hours, and says plainly why that overrides D54

**D54 assigned the db-06 allowlist row to Session 2 and said it was theirs. Session 1 has
now done it instead.** That is a reversal of a directive Session 1 wrote four hours
earlier and told Session 2 twice on their own pull request, so it needs a reason rather
than a shrug.

**The reason: the owner was absent and the blocker was platform wide.** Session 2's last
push was `def190bd5` at 10:59. At 12:42 nothing had moved: the allowlist row absent, the
ledger probe still in `probes-pending`, `events.test.ts` still on the pending path. Two
hours, three one-line fixes, three directives naming each of them exactly. **D53 exists so
that no defect is an orphan. A rule whose purpose is that everything has an owner cannot
be used to justify a blocker sitting still because its owner went quiet.**

**What was changed, and nothing else:** one row in
`supabase/tests/probes/db-06.sql`, `('first_runs_seen', 'i')`, in alphabetical position
between `follows` and `inspection_confirmations`, plus the dated note the file's own
convention requires. **No migration touched, no grant altered, no money code, no
production change.** A probe allowlist is test infrastructure, which is the narrowest
thing that could be taken without stepping into Session 2's area.

**Session 2 still owns the other two**, and they are untouched here: the ledger probe
without a verdict (D56, still the most consequential open item on the platform) and
`events.test.ts`'s path (D57). If Session 2 adds the same allowlist row independently,
git resolves it or hands over a one line conflict, which is a cost worth paying over
leaving every branch red.

### Verified, and the first attempt at verifying was wrong

The claim is that db-06's grant assertions now pass. **Session 1's first verification was
built on the wrong instrument and would have produced a false report**, so the method
matters as much as the result.

The first attempt read `information_schema.role_table_grants` and compared it to an
allowlist pulled out of the file with a regular expression. It returned two lists of
apparent discrepancies, and **both were artefacts of the verification, not findings**:

1. The regular expression missed `viewing_windows`, the last row, because it has no
   trailing comma. That produced a phantom "live but not allowlisted".
2. `role_table_grants` sees only table level grants. **db-06 deliberately counts column
   level grants too**, through `has_table_privilege(...) or has_column_privilege(...)`.
   That produced a phantom list of seven "allowlisted but dead" entries, every one of
   which is granted per column.

Had either been reported as a finding it would have sent a session chasing nothing.
**The lesson is the same one this file keeps relearning: reproduce the check, do not
approximate it.**

The second attempt used db-06's own grant expression verbatim, both roles, table and
column privileges, against production, with the updated allowlist. Result: `extra` null,
`missing` null. **Both of the probe's grant assertions pass.** The probe's remaining
sections were already passing and are unaffected.

**The authoritative verdict is still CI's**, for the reason D56 gives: a check Session 1
reproduced by hand is evidence, not a pass.

---

## D58. The referral admin centre, specified

The founder asked for it in as many words: *"admin panel for referral need to be
detailed clean big that covers and help us detect more dangers too"*. The specification
is **`docs/referral/REFERRAL_ADMIN_CENTRE.md`**, 317 lines, and it is the authority on
this area. What follows is only what a session needs to know before opening it.

**What exists today, measured.** One migration,
`20260930084741_a5_invite_codes_a_member_can_share.sql`: a `referral_codes` table, a
select-own policy, `my_referral_code()`, `referral_door(text)`, `admin_referral_counts(int)`.
That is all. No attribution record, no qualification, no balance, no payout, no
detection, no console. Everything in the specification is new work and none of it
conflicts with what is there.

**Why it is a centre and not a page.** At D51's ceiling one member earns 105,000 naira a
month, so a thousand members at the ceiling is 105 million a month. Referral programmes
are not defrauded gradually: they are defrauded the week somebody finds the cheapest
qualifying action and scripts it. **Every screen shows naira and risk in the same view**,
because a console that counts referrals teaches its reader to think in counts while the
fraud is denominated in naira.

**Five new objects**, named to avoid `wallet`, `pot` and `escrow` as whole words, since
`private.refuse_custody_objects` would reject the migration outright (the mistake that
cost Session 2 an hour on 6 October): `referral_attributions` as the spine,
`referral_balances`, `referral_payouts`, `referral_budget_periods` for D51's
platform-wide cap, and `referral_campaigns` so a push can be measured without editing
the global rate.

**Qualification is a four-state machine**, not a flag: `pending`, `qualified`,
`rejected`, `reversed`. Reversal is first class and `reversed_minor` sits beside
`paid_minor` rather than being netted into it, so money already paid on a reversed
attribution stays visible as a loss. **The rate is stored on the attribution row at
qualification and never read live**, so no rate change can retroactively alter an
accrued liability.

**Four detectors**, in descending order of value: payout concentration (many referrers,
one bank account, which is where a ring is forced to converge), cluster detection by
shared device, IP, bank and phone window, velocity against a member's own trailing
baseline rather than a global threshold, and behavioural sameness. **Clusters are ranked
by naira exposure, not by size.** Twelve accounts worth 840 naira is noise; three worth
90,000 is not.

**Order, and it matters more than the content.** The engine and its caps land before any
screen is drawn, and **payouts land last, after the detectors**. A console over an engine
that cannot refuse displays a problem it cannot stop, and a payout rail that opens before
detection exists is the most expensive ordering mistake available in this area. Session 2
owns the engine, the detection and the probes; Session 3 owns all five screens and the
risk graph; Session 4 reviews against the document.

**Eight probes are specified and probe 4 is the one that will be skipped**: two
qualifications racing for the last slot under the platform cap. The check and the write
happen in one statement or the cap is decorative.

**This is not urgent relative to the launch blockers.** No referral money moves until a
referral qualifies, and nothing qualifies until the engine exists. The red CI, the db-06
allowlist row (D54) and the unverified ledger probe (D56) all come first.

**Four decisions are the founder's** and are listed at the end of the document: the
ambassador threshold (recommended 200 a month, with payout approval above it), the
platform monthly cap in naira, the qualifying action set at launch (recommended: a
completed booking, or a listing published and passing review, nothing cheaper), and
whether a single flat 70 naira survives section 4.5's economics, since a referral that
produces a lister is worth far more than one that produces a dormant account.

---

## D57. A third failure was hiding behind the cancelled runs, and Session 1 said it was not there

**Session 1 was wrong, in writing, ten minutes before this was found.** The claim was
"nothing else is hiding behind the red" and "no new probe has broken", made on the
strength of three consecutive probe runs that all reported 69 of 70 with db-06 alone.
That reasoning covered the *probe* job and was then stated as if it covered the branch.
**A third failure was there, in a different job, and it was invisible for exactly the
reason D56 had just finished warning about: the job kept being cancelled by the next
push before it could report.** The correction is owed plainly, and the lesson is the one
already written down, now demonstrated at Session 1's own expense.

### The failure

`Typecheck, lint, test` on `def190bd5`. 714 test files pass, one fails:

```
FAIL  src/lib/ledger/events.test.ts
      > the ledger vocabulary matches the database
Error: ENOENT: no such file or directory, open
  '.../supabase/migrations/pending/b2_ledger.sql'
```

Two tests, one cause. `apps/web/src/lib/ledger/events.test.ts:9`:

```ts
const MIGRATION = join(__dirname, "../../../../../supabase/migrations/pending/b2_ledger.sql");
```

Commit `def190bd5` promoted that migration out of `pending/`:
`migrations/{pending/b2_ledger.sql => 20261006105326_b2_ledger.sql}`. The test still
reads the old path. **Session 2's own promotion commit broke Session 2's own test**, and
the branch had no way to know because the test job was being cancelled.

### The fix, which is to follow the convention this repo already has

**Point `MIGRATION` at the applied filename, `20261006105326_b2_ledger.sql`, and nothing
more.**

Session 1's first instinct here was to make the test resolve the file from either
location so it would survive promotion. **That instinct was wrong, and checking the
repository is what showed it.** Around twenty five tests read migrations by exact,
version stamped filename, and the convention is deliberate. From
`src/lib/admin/str.test.ts`, verbatim:

> "readFileSync throws when it is missing, so a renamed or moved file fails the suite."

A test that throws when its migration moves is the point, not a bug: applied migrations
are never renamed, and `check-migrations.mjs` enforces that on every push, so a throw
means something happened that should not have. A clever resolver would have traded a
loud, correct failure for silence, and would have diverged from two dozen tests that all
read the same way. **Match the house pattern.**

**The rule that actually prevents the recurrence is upstream of the test:** never write
a test against a path under `migrations/pending/`, because promotion is certain and the
break is therefore scheduled rather than possible. If a migration is still pending when
its test is written, the test and the promotion land together.

**Checked, so nobody has to:** `events.test.ts` is the only test in the repository that
reads a file under `migrations/pending/`. The two other matches,
`notify/templates.test.ts:88` and `ci/pipeline.test.ts:56`, are a comment and a fixture
string, neither of which touches the filesystem. Nothing else is waiting to break this
way.

### The test itself is good and nothing about its intent changes

It asserts that the fourteen event types in TypeScript are exactly the fourteen the SQL
function allows, and that the three pots are three separate `create table` statements
with no `drop trigger` or `delete from` anywhere in the migration. That is precisely the
test the ledger should have: it is the thing that would catch the vocabulary drifting
away from the database, which is how ledgers quietly stop balancing. Keep it, fix its
path, and widen it rather than weaken it.

### What the full picture on that branch now is, measured

| Failure | Whose | Size |
|---|---|---|
| `db-06`, `first_runs_seen.INSERT` not on the allowlist | Session 2. Platform wide, red on main too | One allowlist row (D54) |
| `Advisories`, `source-map-js` under GHSA-68fv-2mgg-jv7q | Main's, not the branch's. Session 3 as lockfile owner | One resolved version (D55) |
| `Test`, `events.test.ts` ENOENT on the promoted migration | Session 2. Caused by their own promotion commit | One path, resolved robustly |

Three failures, three owners, none of them large, and **the b2-ledger probe is still
without a verdict** (D56), which remains the most consequential open item because it is
the only one that touches whether money arithmetic is right.

### A method note, because Session 1 nearly got this one wrong too

The job log's visible tail ended in a loud block of red about `assetlinks.json`
placeholders and `##[error]Process completed with exit code 1`. Reading the tail alone,
the obvious conclusion was that the deep-link gate failed the job. **It did not.** That
step carries `continue-on-error: true` deliberately, documented in `ci.yml` since
2 October: Android's placeholders are absent on purpose because Play Console setup comes
after Apple, and `npm run cap:sync` runs the same check strictly so a release sync still
refuses while it is red. The step's own conclusion reads `success`. The real failure was
`Test`, several steps earlier, with no red left near the end of the log.

**So: read the step conclusions, not the end of the log.** `GET
/actions/jobs/{id}` returns every step with its own conclusion, which is the only place
the failing step is unambiguous. This is the same lesson as D47 and D54 in a third
costume: know what a signal measures before concluding anything from its colour.

### Separately, a real founder item surfaced by that advisory block

`apps/web/public/.well-known/assetlinks.json` still holds
`PLACEHOLDER_REPLACE_WITH_PLAY_APP_SIGNING_SHA` and
`PLACEHOLDER_REPLACE_WITH_UPLOAD_KEY_SHA256_SE`. Advisory in CI by design, and **a hard
block on a Play release**, because `npm run cap:sync` refuses while it is red and Android
App Links do not verify without the real fingerprints. Until they land, a shared Vallo
listing link opens the browser rather than the app, and an email confirmation link for an
account created in the app lands in a browser that cannot complete it. The Apple side is
already done: the real Team ID `X74KD52994` replaced its placeholder on 2 October.

**Founder only.** Play Console, the app, Release, Setup, App signing, for the app signing
key; `keytool -list -v -keystore upload-keystore.jks -alias upload` for the upload key.
Two SHA-256 fingerprints. Drop `continue-on-error` from that step the day they land.

---

## D56. The ledger is live in production with no probe verdict. Session 1 verified it structurally; the probe still has to run

**What happened, from Session 2's own commit message on `def190bd5`, 10:59:**

> "Applied to production verbatim with its read-back block. The live run of the
> b2-ledger probe timed out in the MCP tool with nothing recorded and no probe rows
> left behind, so the probe stays in probes-pending."

So the append-only money ledger, `20261006105326_b2_ledger.sql`, 641 lines, three pots,
is **applied to production and its verification probe has never produced a verdict**.
The honesty of the commit message is to Session 2's credit. The resting state is not
acceptable: this is the ledger.

**This is the third instance of one pattern in two days.** D47 was a cancelled check
read as a pass. D54 was a probe whose scope was misread. This is a probe that did not
run at all, recorded as "pending" and moved past. The lesson is the same each time and
it is now a standing rule, below.

### What Session 1 verified directly, because the probe could not

Checked against production rather than against the migration file, on 6 October:

| Claim in the migration's header | Verified in production |
|---|---|
| Three separate pot tables, never columns on one table | `ledger_customer_funds`, `ledger_vallo_revenue`, `ledger_marketing_float` all exist as base tables |
| Row level security on each | `relrowsecurity` true on all three |
| "Nothing writes these tables directly, not even `service_role`" | `service_role` holds **SELECT only**. No insert, update or delete, on any of the three |
| Members cannot touch them | `authenticated` and `anon` hold **no grant at all** on any of the three. They do not appear in `role_table_grants` |
| Append only, no row ever updated or deleted | Each pot carries a `history_is_fixed` trigger and a separate no-truncate trigger |
| Corrections are new entries (E5.3) | Each pot carries a `ledger_correction_guard` trigger |
| The settlement path posts without rewriting `settle_booking_charge` | `ledger_entries` carries `ledger_entries_zz_post_pots`, firing `private.ledger_entries_post_books` |
| The writers exist | `private.ledger_append`, `private.ledger_entries_post_books`, `public.ledger_record_payluk_commission` all present. `ledger_balances_by_book` present as a view |
| Nothing has posted yet | All three pots at 0 rows |

**The structure landed correctly and matches what the migration says it does.** Nothing
is at risk: no money has moved through it, and the grant surface is tighter than any
other money table on the platform. Session 2's design here is good work, and the
separation of customer funds from Vallo revenue into distinct tables rather than
distinct columns is the right call for exactly the reason the header gives.

**What a structural check cannot tell you, and the probe must:** that the posting
trigger produces entries that net to zero on a direct charge; that the refund legs net
to zero; that a correcting entry is accepted while an update is refused; that
`ledger_append` is genuinely idempotent on its key; that a posting failure raises a
risk alert without aborting a settlement of money already taken. Those are behaviours,
and only running them proves them. **Do not read the table above as the ledger being
verified. It means the shape is right and the behaviour is unproven.**

### What Session 2 does

1. Fix db-06 first (D54). It blocks every branch.
2. Then run the b2-ledger probe to a recorded verdict. If the MCP tool times out again,
   run it through the probe runner instead of the tool: the runner does not time out at
   a tool boundary, and it accepts `--dir supabase/tests/probes-pending` to run the
   probe where it currently sits.
3. **Precision, added after checking the runner rather than assuming it.** The probe is
   at `supabase/tests/probes-pending/b2-ledger.sql`, and `scripts/db-probes/run.mjs`
   reads only `supabase/tests/probes/*.sql`. **CI will never run it where it is.**
   Saying "run it in CI" without saying this would have cost Session 2 a cycle. Run it
   locally with `--dir` first, and move the file into `supabase/tests/probes/` in the
   same change that records it as passing, so CI keeps running it forever after.
4. A pending probe on an applied ledger migration is the single highest item on that
   branch after db-06.

### The standing rule, from three instances in two days

**A check that did not run is a check that failed.** Cancelled, timed out, skipped,
"pending", or never triggered: none of these is a pass, and none may be recorded in a
way that reads like one. Where a probe cannot be run, say that it has not been run,
in those words, in the status document and in the commit message, and carry it as
open work rather than as a footnote.

### The pushing pattern, separately

Session 2 pushed four times between 10:45 and 11:00. Each push cancelled the previous
run's remaining jobs, which is why `46d81338f`'s typecheck and front-door jobs read
`cancelled` despite the commit being sound, and why no complete verdict existed on
that branch for over an hour. **Two migrations were applied to production inside that
window while the probe suite was red.** Nothing broke, and the second of them is good
work, but a stream of production migrations applied faster than the probes can report
means that when something does break, nobody will know which change broke it. Land,
wait for the report, then push again. The minute of waiting is cheaper than the hour
of not knowing.

### One useful side effect, worth recording as evidence for D54

`63c59ec77` is a merge of Session 1's **documentation-only** branch into Session 2's.
Its only new content is markdown. db-06 failed on it anyway, identically. That is
direct proof of D54's central point: db-06 reads the live database, not the branch, so
its red is platform-wide and no amount of branch content explains it.

---

## D55. The production dependency advisory is main's, not any branch's, and it is one lockfile line

**Measured, 6 October, 10:53.** The "Advisories (production dependencies)" job fails
on PR #84 and **it fails identically on main's head `d685f5e04`**. It is not that
pull request's failure. Nobody should chase it inside a feature branch, and nobody
should widen a money branch to carry it.

The job runs `npm audit --omit=dev --audit-level=high`. One finding:

```
source-map-js  1.0.0 - 1.2.1
Severity: high
source-map-js allows event-loop denial of service through indexed
source-map section offsets - GHSA-68fv-2mgg-jv7q
```

**What was checked rather than assumed:**

| Question | Answer |
|---|---|
| Is it really a production dependency, or dev leaking through? | Production. `postcss@8.5.23` depends on it and is not marked dev. `@tailwindcss/node` also pulls it, and that one is dev |
| Is there a patched version? | Yes, `source-map-js@1.2.2`, published and outside the advisory range |
| Does the patched version satisfy the existing range? | Yes. `postcss` asks for `^1.2.1`, which `1.2.2` satisfies. No major bump, no API change, no `postcss` upgrade needed |
| What is the actual change? | One resolved version in `package-lock.json`. `npm audit fix` produces it |

So the whole fix is a lockfile bump from `1.2.1` to `1.2.2`. There is no code change
and nothing to redesign.

### Who does it

> **Superseded in part on 6 October at 13:50, by the same reasoning as D59.** Session 1
> has landed the bump itself, on PR #86. The rest of this section still holds: **Session 2
> does not touch the lockfile**, and nobody should chase this failure inside a money
> branch.
>
> **Why the reversal.** This section gave the bump to Session 3 and argued the change was
> "too small to be worth breaking that rule for". That weighed the conflict risk against
> the advisory and left out the thing that actually mattered: **PR #86 is the change that
> unblocks every other branch's CI, and a red check on it makes the founder less likely to
> merge the one thing everybody is waiting on.** Advisories was the only red left on #86
> once db-06 went green. Getting it green is worth a resolvable lockfile conflict.
>
> **What was verified before pushing**, since a lockfile edit is exactly where a careless
> push does damage: `npm audit fix --omit=dev --package-lock-only` changed **one package
> version and nothing else**, proven by comparing the parsed lockfile before and after
> (added: none, removed: none, version changed: `source-map-js` 1.2.1 to 1.2.2). The
> `string_decoder` block moves position with identical content, which is npm re-sorting.
> Then, with `node_modules` synced to the new lockfile: audit exits 0, typecheck passes,
> lint passes, and **the build passes**, which is the check that matters because `postcss`
> is what pulls `source-map-js` and the build is the only place it runs.
>
> **If Session 3 has already changed the lockfile on their branch**, whoever merges second
> regenerates it with `npm install` rather than resolving it by hand. That cost was known
> and accepted, not discovered.

**Session 3** was the single owner of `package-lock.json` under D46, and for the
framer-motion work still is. Two sessions editing the lockfile on two branches is the
conflict D46 exists to prevent.

**Session 2 does not touch it.** If Session 4 or Session 2 sees the Advisories job
red on a money branch, the correct response is to note it as main's and carry on, not
to fix it locally. A second lockfile edit on a money branch costs more than the
advisory does.

### Why this is not urgent in the way CI makes it look

The advisory is a denial of service reachable by feeding a crafted source map to the
parser. Vallo's build runs `postcss` over Vallo's own stylesheets at build time; no
member input reaches it. The severity rating is correct for the library and
overstated for this application. **Fix it because a red check trains everyone to
ignore red checks, not because Vallo is exposed.** Say it that way if it comes up.

---

## D54. Session 2's own migration broke a probe allowlist, and because it is applied to production, it is now red on every branch including main

**The custody rename worked.** This is worth stating plainly because Session 1 spent a
good while pointed at the wrong thing. On the database probes run against commit
`46d81338f` at 10:53: `track-a-custody-retired` **passes**, and all three of the day's
new money migrations pass their own probes, `b3-money-policy`, `b3-payluk-sweep`,
`b3-tax-entitlements`. `private.refuse_custody_objects` was defending production
exactly as ADR-0002 intends, Session 2's rename to `ledger_entries_post_books`,
`ledger_balances_by_book` and `ledger_record_payluk_commission` satisfied it, and
that half is finished.

**69 of 70 probes pass. The one failure is new and is a different defect:**

```
FAIL db-06 (815 ms) PROBE_FAIL db-06: write grants not on the
allowlist: authenticated:first_runs_seen.INSERT
```

### What this is

`supabase/tests/probes/db-06.sql` holds a checked-in allowlist of every write
privilege `authenticated` is permitted to hold on a public table. Its own header
states the contract: *"A new write grant, or one left without a policy, fails this
probe until it is added here deliberately."*

Migration `20261006104536_b4_first_run_store.sql` adds
`grant select, insert on public.first_runs_seen to authenticated`. The allowlist was
not updated. The probe is not wrong; it is doing the single job it was built for.

**The migration itself is good work and nothing about it should change.** Verified
line by line: the grant is `select, insert` only with no update or delete, the insert
is behind `first_runs_seen_write_own ... with check (user_id = (select auth.uid()))`,
the read is behind an equivalent select policy, `service_role` holds the wider set,
and the migration ends with its own two assertions that the grants did not come out
wider than intended. This is how a table should be added. The only thing missing is
the allowlist line that declares the new grant deliberate.

### The part that makes it urgent

**db-06 runs against the live database, and the grant is live in the live database.**
Confirmed directly against production: `information_schema.role_table_grants` returns
`authenticated: INSERT` and `authenticated: SELECT` on `public.first_runs_seen` right
now, because Session 2 applied the migration at 10:45.

The consequence follows mechanically and is easy to miss: **db-06 will now fail on
every branch, on every pull request, and on main**, because the probe reads production
state rather than branch state. Main's probes currently show green only because main
has not re-run CI since 02:57, before the migration was applied. The next push to main
goes red. Nothing is wrong with production and no data is at risk; the platform's
grant allowlist and the platform's grants simply disagree, and the probe is correctly
refusing to let that pass silently.

**This is also the second lesson of the same shape in two days.** D47 was "a cancelled
check is not a pass." This one is "a probe that reads production is not branch-local."
Both say: know what the check actually measures before reasoning about what its colour
means.

### Who does it, and how

**Session 2, before anything else on the branch.** It is their migration, their probe
area, and it blocks everyone.

1. Add one row to the allowlist in `supabase/tests/probes/db-06.sql`, in alphabetical
   position: `('first_runs_seen', 'i'),`
2. Add the dated note the file's convention requires, in the same voice as the
   29 September block already there: 6 October, `first_runs_seen i`, insert only,
   behind `first_runs_seen_write_own` scoped to `auth.uid()`, no delete grant by
   design.
3. Run the probes once and let the run finish. **Do not push again until it reports.**
   Four of the last five probe runs on that branch were cancelled by the next push,
   which is why no clean verdict existed for hours. A cancelled run costs more than
   the minute of waiting.
4. Land it on main quickly, ahead of the rest of the branch if the rest needs more
   review. Every other session's CI is red until this line exists.

### What nobody should do

Do not revoke the grant, do not alter the migration, and do not weaken db-06 to a
warning. The grant is correct and the probe is correct. One declares what the other
enforces, and the declaration is what is missing.

---

## D53. Ownership is by concern, never by authorship. And nobody second-reviews their own change

Session 4 asked, on 6 October, who owns three Task 2 defects, noting that one
"predates Session 2, so it may be nobody's under the current split". **It is not
nobody's, and the question is worth settling once because it will recur every time
an audit finds something older than the session that owns its area.**

### The rule

**A defect belongs to whichever session owns the concern, whatever its age and
whoever wrote it.** The cross-session contract divides the platform by area so that
every part has an owner, not so that each session owns only what it typed. A rule
that assigns by authorship creates orphans by construction: the older the defect,
the less likely its author is still working, so the oldest and most settled bugs
would become permanently unownable.

**This repository already has the evidence.** D40, the wrong-payer refund, predated
every current session and sat unfixed through two rounds. The wallet, escrow and
withdrawal copy in `experience-features.en.ts` predated Session 3 and shipped
anyway. Both were found by a session auditing someone else's area, and both needed
an owner assigned before anything happened.

**So the three findings go to Session 2**, because all three are its concerns:

1. **The `transactions` column grant.** A grant is schema, and schema is Session
   2's, whoever wrote the migration.
2. **The per-render `listBanks()`.** A provider call is Session 2's, and this one
   also breaks D50's ten-requests-per-minute constraint directly: a call per render
   is the exact shape that directive names as already broken. The fix is server
   side, cached, and shaped to the limit.
3. **The raw Paystack error text.** D50 forbids a raw provider error reaching a
   member. The **mapping** to Vallo language is Session 2's, as part of the status
   vocabulary and error abstraction in its brief. Session 3 owns only how the
   mapped sentence is presented.

### And the second half, which Session 4 raised against itself

**Nobody second-reviews their own change.** Session 4 keyed `db-probes` per ref,
which widened concurrency against the production database, and reviewed it itself.
It flagged that as a D5 breach without being asked twice, which is the behaviour
D5 exists to produce. **The second pass goes to Session 2**, which owns the
database.

**The specific thing to attack**, so the review is a review rather than a nod:
**can sixty-four probes running concurrently from several branches interact in a
way one serialised run cannot?** Named risks, each checkable:

- **A probe that asserts on global state.** Any probe checking a count, or that no
  row exists, can be broken by another branch's probe inserting at the same moment.
  This is the likeliest failure and it would read as a flaky test rather than as a
  concurrency defect.
- **Advisory locks.** Two probes taking locks in different orders deadlock under
  concurrency and never under serialisation.
- **Fixed-name temporary objects.** A probe creating an object by a constant name
  collides with itself across branches.
- **Connection count** against the pooler's limit, with several full runs at once.

**Mitigating context, which the reviewer should weigh rather than assume away:**
the `claude/vallo-**` push trigger was removed, so only pull requests start runs
and the realistic concurrency is three or four, not unbounded. That lowers the risk
without removing the question.

---

## D52. D51 was wrong about the mechanism. Session 4 caught it, Session 1 verified it

**Session 4 ran Task 2, its defining task, and its lead finding breaks a premise of
a founder decision.** Session 1 re-derived every part from the code before writing
this. **All three claims are correct and D51's mechanism section is withdrawn.**

### What D51 said, and why each part is false

**D51 said the rates are policy data, so "changing a price is a row, never a
deploy".** For commission that is true. **For the Guarantee it is false.**
`money_policy.guarantee_bps` is declared
`check (guarantee_bps between 100 and 200)`
(`20260925121219_track_a2_...sql:49`) and no later migration relaxes it.
**The value 0 is rejected by the database.** Retiring the Guarantee needs a
migration that does not exist.

**D51 said `commission_bps = 200` in `money_policy`.** There is **no
`commission_bps` column** in that table: its data columns are `guarantee_bps`,
`claim_window_hours` and `min_inspection_photos`. Commission lives in **`fee_rates`,
read through `private.current_fee_bps('commission')`**, which returns 0 when no row
exists. Setting the 2 percent means a `fee_rates` row, not a `money_policy` update.

**D51 said zeroing the rate lifts the `PAYSTACK_GUARANTEE_SUBACCOUNT` blocker, on
the evidence of `if (split.guaranteeMinor > 0)`.** It does not. That condition
lives inside `splitBody()` and only decides whether the reserve appears in the
Paystack payload. **Two independent gates refuse first, neither conditioned on the
rate:**

1. **The application.** `split-attempt.ts:74` calls `guaranteeReserveSubaccount()`
   and returns `refused` at line 75 **before `payment_split_for_booking` is ever
   called**.
2. **The database.** The payment gate requires `reserve_subaccount_code` to be
   non-null on a before-insert trigger (same migration, line 694).

**And nothing covers the zero case: there is no `split-attempt.test.ts` at all.**

### What this changes for the founder

**`PAYSTACK_GUARANTEE_SUBACCOUNT` is still a hard blocker.** Session 1 told the
founder twice that retiring the Guarantee would probably remove it. **It does not.**
Either he creates the reserve subaccount anyway, or Session 2 changes both gates so
a zero rate is a legitimate configuration rather than a refusal.

**Retiring the Guarantee is a migration, not a setting.** It drops or relaxes the
check constraint, changes the application gate, changes the database gate, and adds
the test that does not exist. That is real work, and the founder was told it was a
row.

**VAT is not modelled at all.** `vat_bps` and `vat_registered` return zero hits
across `supabase/` and `apps/web/src`. D51 wrote them as though they existed. They
are new columns and new code.

### The standing correction

**D41 said measure, never quote. Session 1 then quoted its own reading of one
`if` statement and called it evidence**, without following the call path to the two
gates in front of it, and a founder made pricing decisions on it. The rule applies
to Session 1 exactly as written: **reading a condition is not reading a code path**,
and a claim about what a system refuses is only established by finding every place
it refuses.

Session 4's note on its own method is the standard: *"Every finding was re-derived
from the code before being written down, because D5's point is that the author is
the wrong reviewer."*

---

## D51. Pricing, the Guarantee retired, and the referral engine

**Founder decisions, 6 October 2026.** Full detail and the maths in
`docs/payments/VALLO_PRICING.md`. Every rate is **policy data in `money_policy`**,
in basis points or kobo. Changing a price is a row, never a deploy.

### The rates

**Vallo commission 2 percent** (`commission_bps = 200`), both rails. The leg
already exists: `commission_minor` is in the split today, at zero. **Escrow rail
total is 4 percent**, Payluk's 2 plus Vallo's 2, borne by the lister. **Direct rail
is 2 percent plus Paystack's capped fee**, and because no provider takes a
percentage there, Vallo keeps the whole 2 percent and the cost does not scale: the
direct rail is where the margin is.

**The Guarantee is retired. `guarantee_bps = 0`.** Escrow already holds the money
until conditions are met, so charging again for the same promise meant 4 percent
off the lister on a platform with no listers to lose. It also had the shape of
insurance, which `THE_HUNDRED.md` already refuses elsewhere as NAICOM-regulated,
and nobody had decided what happens to unclaimed money. **The machinery stays
built at zero**, switchable per rail in one row if the direct rail later shows
fraud.

Two pieces of work follow: **every Guarantee sentence comes out** of
`lib/money/copy.ts`, the Terms, the help centre and the emails, replaced with what
is now true, *your payment is held until you confirm*; and
**`PAYSTACK_GUARANTEE_SUBACCOUNT` may stop being a blocker**, since there is no
reserve leg to route. **Session 2 verifies that, never assumes it**, because the
split currently refuses a charge whose reserve leg is missing.

**VAT is not charged. `vat_bps = 0`, `vat_registered = false`.** Nigeria's
threshold is 25 million naira of **turnover, meaning Vallo's own revenue**, which
is the 2 percent and not the value of transactions facilitated. **Charging VAT
while unregistered is an offence.** When it is switched on it applies to Vallo's
fee only, never the rent, and is recorded as its own ledger line because it is
remitted to FIRS and was never Vallo's money.

### Withdrawals

Minimum **1,000 naira**. Bands as the founder set them, with two Session 1
corrections, both overridable:

- **The 100,000 to 200,000 gap is closed**: the 200 naira band starts at 100,000,
  so the table is continuous. A pricing table with a hole is a support ticket.
- **The 2,000,000 cliff is smoothed.** At 1,999,999 the fee is 300 and at
  2,000,001 it is 2,500, so anyone withdrawing 2.5 million sends two withdrawals
  and pays 600. The top band becomes a percentage with a cap.

**And the context the founder asked for: the CBN caps bank NIP transfers at 50
naira above 50,000, and Paystack's own transfer pricing is 10, 25 and 50 naira.** A
member's own bank moves 2 million naira for 50. The under-100,000 band at 50 naira
matches the market exactly; the upper bands are far above it, and they are also
the ones that will almost never fire at launch, since referral payouts run from
1,000 to 105,000 naira.

**The operational rule that governs every withdrawal.** Payluk does not publish
its withdrawal fee and it is not fixed: *"Payluk sets the `fee` on the returned
intent; you do not send it ... The fee depends on the amount and on which provider
Payluk currently settles payouts through, and it may include VAT."* So: **create
the intent, read the provider fee back, add Vallo's band, show one total before
the member confirms.** Never compute a withdrawal from a hardcoded table, never
quote before the intent exists, and reconcile against the figure read back.

**Payluk's 2 percent is escrow only.** Withdrawals, deposits and transfers carry
their own separate, variable fee. Deposits are card top-ups charged through
Paystack underneath, minimum 100 naira.

### Referral

**70 naira per qualified referral, 1,500 qualified referrals per member per
month**, which is **105,000 naira per member per month at the ceiling**.

**So the cap is not the fraud control at that level; qualification is.** Three
requirements follow:

1. **Qualification is phone verified AND a real action** by the referred person,
   never a signup. A SIM costs less than 70 naira of effort.
2. **A platform-wide monthly budget cap**, server-side, separate from the
   per-member cap, so one viral moment cannot create a liability Vallo cannot fund.
3. **1,500 a month is 50 a day**, which is a professional rather than a member.
   Consider whether that volume should move somebody into a reviewed ambassador
   tier instead of accruing automatically.

**It is a Rewards Balance and never a wallet.** Vallo owing a member money is a
different legal object from Vallo holding a member's money. It accrues as a
liability from qualification, it never expires, and the threshold is stated before
anybody starts earning.

**Payout rail is Paystack transfers from a Vallo-funded marketing float**, not
Payluk: the money is Vallo's own marketing spend, so no custody question arises,
and it avoids forcing a referrer through provider KYC to collect a small sum.

### The three pots, separated in the schema and not merely in a report

**Customer funds** (the member's, at the provider) · **Vallo revenue** (commission,
withdrawal fees, promotion) · **the marketing float** (Vallo's, funding referral
payouts). Payluk cannot do a three-way split, so on the escrow rail Vallo's
commission is a separate recorded movement, which makes the separation a ledger
requirement.

### Who pays, and the agreement that records it

**`whoPays: "seller"`, decided 6 October.** The lister bears the fee on both rails
and the renter sees exactly the advertised price, no line item, no footnote. It is
the Booking.com, Uber, Amazon and Etsy model; Vallo already publishes "VALLO
CHARGES NO INSPECTION FEE", so a renter-side charge would contradict a live
promise; and a Nigerian renter already pays roughly 20 percent in agency and legal
fees, so charging that side would make Vallo part of the problem it exists to
solve. For a lister replacing a 10 percent agent, 4 percent is a **reduction**:
they keep 96 percent instead of 90, which is 108,000 naira more on 1,800,000 of
rent.

**A lister cannot publish until they accept the figures**, and acceptance is
recorded server-side with the member, the timestamp and **the rate version in
force**. Figures in naira, not a bare percentage. A rate change **never** applies
retroactively to an accepted listing: the lister is asked again and keeps the old
rate until they accept the new one. The same figures reappear at payout, because a
deduction a landlord first understands when the money arrives is how a landlord is
lost permanently.

### Where the commission lands, and the job that is easy to forget

**Paystack: automatic.** The split sets `bearer_subaccount` to the lister, so the
lister bears the processing fee too; **Vallo's commission is the remainder and
settles to Vallo's own main account by itself**. At `guarantee_bps = 0` the reserve
leg is skipped entirely (`if (split.guaranteeMinor > 0)`), which is the evidence
the `PAYSTACK_GUARANTEE_SUBACCOUNT` blocker lifts. **Verify, do not assume.**

**Payluk: not automatic.** Its documentation: *"plus your own commission, if you
set one in your merchant settings ... credited to your merchant wallet as a
`commission` transaction"*. So Vallo's 2 percent on escrow is **a merchant
dashboard setting** and it **accrues inside Vallo's Payluk merchant wallet** until
somebody withdraws it. Paystack revenue arrives on its own; **Payluk revenue piles
up where nobody is watching.** Required: a scheduled sweep reading the merchant
balance, withdrawing to Vallo's bank, recording the movement as **Vallo revenue and
never customer funds**, with an admin surface showing the balance, the last sweep
and any failure, paced against the ten-per-minute limit.

### One rate that should not stay flat

**Sale and land.** Four percent of 80,000,000 naira is 3,200,000, which no seller
will accept, while 2 percent to Vallo on that sale is the largest single
transaction the platform will ever see. `money_policy` holds rates in basis points,
so a per-space-type rate with an absolute cap above a threshold is one row.
**Decide it before the first land listing.**

---

## D50. Vallo presents, the provider holds. The financial layer is Vallo's product

**The founder's brief of 6 October, and it corrects Session 1.** Full translation
in `docs/payments/VALLO_FINANCIAL_LAYER.md`; read it before any money surface.

### The sentence, which is the founder's own and is now the platform's

> **Vallo uses regulated financial infrastructure partners to process and protect
> eligible transactions. Vallo does not hold customer funds.**

Shorter, for a screen: **"Payments are processed through Vallo's financial
infrastructure partners."** For a protected payment: **"Your payment is protected
through Vallo's transaction infrastructure."**

### What Session 1 got wrong, stated plainly

This morning Session 1 told the founder there is no wallet and there can never be
one, and read his request for a premium wallet surface as meaning only the
existing money screens. **That was half right and the wrong half was asserted most
firmly.** ADR-0002 forbids **Vallo** holding client funds, because that is CBN
regulated and outside the objects clause. It says nothing about a licensed third
party holding them, and Payluk is one. Under the Paystack-only rail nobody held
anything, so "no balance anywhere" was true by accident rather than by rule.

**Verified against Payluk's own API:** `GET /v1/wallet` returns a customer's
**main balance** and **escrow balance**; withdrawals run through a payment intent
with a bank code; **verify account number** resolves the account name before the
withdrawal is created; payment history covers deposits, withdrawals, transfers,
wallet transfers and escrow payments. **Every surface the founder described has a
real endpoint behind it.**

### The four conditions, all of which must hold

A balance surface ships only when:

1. **The money is held by the licensed provider**, in that member's own account
   there, never by Vallo.
2. **No Vallo sentence says or implies Vallo holds, keeps, owns or guarantees
   it.** "Your money is 100 percent safe" is forbidden; so is any guarantee of an
   outcome Vallo cannot deliver.
3. **ADR-0003 is accepted, not proposed**, and the merchant account is live.
4. **The words come from `lib/money/copy.ts`, per rail**, so Terms, help centre,
   emails and screens cannot drift.

**D48 is unchanged in the meantime.** The `wallet`, `escrow` and `withdrawal`
strings in `experience-features.en.ts` describe custody by Vallo on a rail that
does not exist, and they come out now. What replaces them later is different copy,
written against a live rail, naming who actually holds the money.

### Provider abstraction, and the line the founder drew himself

**Vallo is the product; the provider is infrastructure.** The frontend consumes
`Payment`, `Protected`, `Withdrawal`, `Receipt`, never `PaylukEscrow` or
`PaystackCheckout`. Provider vocabulary, statuses and errors stay inside the
adapter, behind a Vallo status vocabulary and Vallo error language.

**And the founder's own limit is binding: "clean abstraction, not deceptive
concealment."** Where a provider name is required by a card-network rule, a
banking rule, a provider agreement, a receipt, a KYC flow, the Terms or a
transaction disclosure, **it is shown**. The abstraction governs the product
surface, never the legal surface. A hosted checkout that cannot be embedded is an
infrastructure boundary to be explained, not dressed up as Vallo's own page.

**Never fabricate**, which this repository already bans for figures and now states
for status: no invented chain hash on a fiat payment, no provider reference
relabelled as a transaction hash, and never "Payment successful" before the
provider has confirmed it. "Processing" must be real.

### The three constraints that shape every design here

1. **Payluk charges 2 percent** of the escrow amount, on top of the Guarantee's 1
   to 2 percent. The escrow rail costs more than the direct rail and **True Cost
   must show it.** Who absorbs it is the founder's decision and is not made.
2. **There is no plain cancel and refund.** The only route from a funded escrow
   back to a buyer is a dispute resolved as `REFUNDED`, so the dispute surface
   **is** the cancellation path. It cannot be called "dispute" to two people who
   simply agreed to stop.
3. **Ten requests per minute per key.** Routing, health checks, search and every
   reconciliation sweep are bounded by it. Any call per listing or per render is
   already broken.

### And the one that is purely architectural

**Payluk cannot do a three-way split.** Paystack divides lister, Guarantee and
Vallo in a single transaction; Payluk does not. On the escrow rail the Guarantee
contribution and Vallo's commission are separate recorded movements, which makes
the brief's revenue separation the only thing keeping customer money and Vallo
money apart on that rail. It is a ledger requirement, not bookkeeping taste.

---

## D49. The code review, and the directive of mine that cost 31 KB on every route

A fourth audit reviewed Session 3's 290 new non-test modules. Its findings, with
the two Session 1 verified directly, and one correction Session 1 owes.

### D49.1. Remove `MotionProvider`. D39 was wrong for this codebase

**Verified 6 October:** `grep -cE '<m\.[a-z]'` across `apps/web/src` returns
**zero**. Not one `m` element exists. Yet `app/layout.tsx:500` mounts
`MotionProvider`, which wraps the whole app in `LazyMotion features={loadFeatures}
strict` and imports `domAnimation`.

By the component's own measurements that is **7.0 KB gz for `LazyMotion` and
`MotionConfig`, plus a 24.1 KB gz `motion-features` chunk fetched after first paint
on every route**, for nothing. `strict` is meaningless without `m` elements, and
`MotionConfig reducedMotion` is redundant because every ported component already
routes through `springFor(quiet, ...)`.

**This is Session 1's mistake, not Session 3's.** D39 section 2 said framer-motion
is installed "as D34 set out: `LazyMotion` with `domAnimation` and the `m`
namespace". Session 3 complied exactly. But the components it then built use
`useMotionValue`, `useTransform` and `animate` through its own `useDrive`
(`ported-motion.ts:83`), and **all three of those are renderer-independent**: they
never needed `domAnimation` at all. The directive specified a delivery mechanism
for a renderer the work does not use, and compliance cost 31 KB on every route.

**So: delete `MotionProvider` from `layout.tsx:500` and delete
`motion-features.ts`.** D39's real rule survives and is unchanged: **never a
top-level `motion` import**, which `eslint.config.mjs:209-233` enforces and which
the branch satisfies with zero violations. If an `m` element is ever genuinely
wanted, `LazyMotion` comes back with it and not before.

### D49.2. Money moves on one keystroke, and a test pins it

**Verified:** `components/ui/DragToConfirm.tsx:319-326`. `onClick` treats
`e.detail === 0`, which is how Enter, Space and a screen reader's activate arrive,
as a completed confirmation and calls `commit()` at once. A pointer user must cover
**90 percent** of the track (`THRESHOLD = 0.9`). A keyboard or assistive-technology
user gets the same irreversible `money: true` transfer **from a single Enter**, and
`DragToConfirm.dom.test.tsx:249` cements it as intended.

The handle is a plain `<button>`: no `role="slider"`, no `aria-valuenow`, no Arrow
handling. **Fix:** make it a real slider advanced by Arrow keys, or require a second
explicit keypress when `money` is true. The whole point of this control is that
money should be hard to move by accident, and today it is hard for exactly the
people who can use a pointer.

Related, same file, lines 266 to 278: the `catch` discards the exception and a
**declined** result and a **crashed** request land in the same branch with nothing
reported. Use `reportError` from `lib/observability/report.ts:214`.

### D49.3. The rest, by severity

- **A toast that lies.** `social/badges/BadgeMoment.tsx:87-90` shows "Copied"
  unconditionally, before and regardless of the clipboard promise. It is also the
  nineteenth hand-rolled clipboard path in a repository whose `lib/ui/clipboard.ts`
  exists precisely because eighteen others did this. Use `shareOrCopy` and branch on
  its outcome.
- **A celebration that can be farmed.** `app/streaks/EarnedMoment.tsx:66` replays on
  every click with a heavy haptic each time, contradicting its own doc comment and
  the `replayed` latch its twin `BadgeMoment.tsx:73-77` uses with the note that "a
  celebration that can be farmed by tapping is a slot machine". The two components
  are the same spec built twice, with two stylesheets, two medal sizes and two
  different motion gates. Add the latch, then collapse them into one.
- **A chart that re-renders 23 times per animation.** `charts/TrendLine.tsx:351`
  calls `setDrawn` inside the animation frame loop, reconciling both SVG paths and
  an unmemoized `ChartTable` with a freshly built `rows` array on every frame. It is
  the only per-frame `setState` in the new work and it contradicts the no-render-per
  -frame rule its siblings document.
- **Nine server reads swallow exceptions silently**, returning "unavailable"
  forever with no `reportError`, so schema drift or an RLS misconfiguration is
  invisible in production. Listed in the audit; all take one line each.
- **The gallery's motion switch does not reach the components it exists to judge.**
  `motion-pref.ts:89-95` sets attributes without dispatching `MOTION_EVENT`, and
  `useMotionGate` never observes `data-motion`, so every primitive on the review
  board keeps a stale gate until remount.
- **48 dead exports and 14 dead copy keys**, including half of
  `agent/intel/space-model.ts` and all three of `ported-motion.ts`'s ease constants.
- **Thirteen stateful or money-arithmetic components with no test**, including
  `AreaAskingChart` (money), `MoveInBand` (money), `SearchPillMorph` (motion state)
  and `OsTabs` (keyboard).
- **`ConsolePalette.tsx:127-136`** hijacks Ctrl/Cmd+K inside any admin textarea and
  stacks a second `aria-modal` dialog over an open sheet.
- **`use-overlay.ts:47-60`** locks scroll with `body.overflow` alone, which does not
  hold on iOS Safari, and every new sheet inherits it.

### D49.4. What the review found clean, which is worth stating

**Zero `any` in new code. Zero hardcoded user-facing strings**: every new component
takes a `copy` or `words` prop with no defaults, checked against aria-label, alt,
title, placeholder and JSX text. D39's real rule satisfied with zero violations and
a lint enforcing it. The thirteen non-null assertions are all index accesses behind
a bounds check. No file over roughly 400 lines. One unused CSS class across every
new stylesheet.

That is a high standard, and it is why the findings above are worth fixing rather
than a reason to doubt the work.

---

## D48. Shipped copy tells members Vallo holds their money. Remove it before anything else on the experience branch

Found 6 October by audit, verified by Session 1 against
`origin/claude/vallo-experience-upgrade`. **This is a legal exposure, not a naming
preference**, and it outranks every other item on Session 3's list.

### What is in the bundle today

`packages/i18n/src/locales/experience-features.en.ts`, lines 149 to 168, ships
three feature-onboarding entries, verbatim:

```
wallet:     name: "your wallet"
            p1Title: "Available and in escrow are different money"
            action: "Open my wallet"
escrow:     name: "escrow"
            p1Title: "Who holds the money"
            action: "Open escrow"
withdrawal: name: "withdrawals"
            action: "Start a withdrawal"
```

`apps/web/src/lib/money/copy.ts:17` ships, in the same build: **"Vallo never holds
your money."** Both sentences are in the product. One of them is false, it is the
one on the Terms and the money screens that is true, and ADR-0002 exists because
holding client funds between two parties is regulated by the Central Bank of
Nigeria and the company's objects clause does not cover it.

**It is reachable code, not a dead string.**
`components/app/feature-onboarding/first-runs.ts:45` holds
`WAITING_FIRST_RUNS = ["wallet", "escrow", "withdrawal"]` and lines 180 to 209 wire
`c.wallet.*`, `c.escrow.*` and `c.withdrawal.*` into panel content. It is gated
only by those keys not being mounted. **One array edit publishes a screen that
tells a member Vallo is holding their money.**

### Two more, in live code

- `apps/web/src/lib/profile/model.ts:28` declares `wallet: boolean` and line 85
  defaults it `true`. It is a notification channel named `wallet`, **persisted in
  `profiles.settings`**, rendered at `settings/AccountToggles.tsx:81, 110, 127,
  149`. Members have a saved preference for notifications about a thing that
  cannot exist.
- `apps/web/src/components/auth/auth-intent.ts:48` lists `"wallet"` as a valid
  gated action. `/wallet` does not exist, so `?do=wallet` returns a member to a 404
  after they sign in, and `auth-intent.test.ts:55` **asserts that behaviour**.

### What Session 3 does, first, before any other round-two item

1. Delete the `wallet`, `escrow` and `withdrawal` entries from
   `experience-features.en.ts` and their wiring in `first-runs.ts`. Not renamed,
   not commented out: deleted.
2. Rename the `wallet` notification channel to what it is (`payments`), with a
   migration that carries each member's existing preference across. **Session 2
   owns the migration**; Session 3 owns the label and the toggle.
3. Remove `"wallet"` from `auth-intent.ts` and change the test to assert it is
   refused rather than that it 404s.
4. Fix `InnerNav.tsx`'s own docstring, lines 23 to 27, which still names "the
   wallet (transactions, methods, statements, limits)" and "escrow (conditions,
   milestones, evidence, dispute)" as destinations the component serves.
5. Sweep the dictionaries for the rest and delete what no renderer reads:
   `en.ts:4103-4132`, `4173-4188`, `4320-4347` ("every wallet", "platform float",
   "spendable balance", "top-up", "withdrawal holds", "Overdrawn wallets"), and
   `compliance.en.ts:52`, which still lists "held payment" in a scope sentence.
6. Leave alone what is legitimately named: withdrawing AI consent, withdrawing an
   inspection request, a guest's own external crypto wallet, and `icon="wallet"`
   glyph names.

### And the rule this sets

**A retired capability's words are retired with it, in the same commit.** ADR-0002
is thirteen days old and its language survived in a shipped dictionary, in a
persisted member preference, and in an auth path with a test pinning it. A
decision that lives only in an ADR and a schema constraint is not enforced; it has
to be swept out of the words too, and the sweep is part of retiring it rather than
a follow-up somebody gets to later.

### On the founder's request for a premium wallet surface

The founder asked on 6 October to "make wallet look amazing with all settings on
it". **Session 1 read that as the money surfaces**, payments history, earnings,
receipts, payouts and checkout, made as rich as a wallet without ever implying a
balance Vallo holds, and that reading governs until the founder says otherwise.
**No session builds a wallet, a balance or a withdrawal.** Restoring custody is a
legal decision requiring counsel and an ADR that supersedes 0002; it is not
something a session infers from a design instruction.

---

## D47. The database probes silently did not run on the one PR that needed them most

A third gate that measures nothing, found on 6 October, in the same class as the
fifteen null weight budgets and the preview-harness accessibility scan Session 4
caught. This one is worse, because it hid on a pull request full of migrations.

**The evidence, from the three session pull requests' check runs.**

| PR | Database probes | Started to completed |
|---|---|---|
| 83, Session 4 | one `cancelled`, one **`success`** | 19 s, then 92 s |
| 85, Session 3 | **`success`** | 95 s |
| **84, Session 2** | **`cancelled`, and nothing else** | **9 s** |

A real run takes 92 to 95 seconds. Session 2's lasted nine, concluded `cancelled`,
and had no successful companion. **So the pull request carrying this round's
migrations and money changes was merged-ready with no RLS policy, grant or trigger
checked at all**, and the check did not read red while that was true.

**The cause.** `ci.yml`'s `db-probes` job declares `concurrency: group: db-probes`
with `cancel-in-progress: false`. The group is global: it is not keyed on the ref,
so every open pull request contends for one slot. `cancel-in-progress: false`
protects the run that is already going, which is what its comment intends ("never
cancelled halfway: every probe rolls back, but a killed client leaves its locks to
time out"). It does nothing for a run still queued behind it, and a queued run that
is superseded is cancelled. With four pull requests open at once, the middle ones
lose.

**Why this is the serious kind of mistake.** The author of that job already saw this
exact danger from one direction and handled it well: when `PROBES_DATABASE_URL` is
unset the job **fails on purpose**, with the comment "a job that passes without
running is the blind light this job exists to remove, and must never be able to
satisfy a required check." The cancellation path defeats that same intent by another
route, because `cancelled` is not red either. The lesson generalises past this job:
**a check has three outcomes, not two, and the third one means it did not run.**

**Session 4 owns the fix**, since it owns CI. Required:

1. **A cancelled probe run must not read as acceptable.** Whatever else changes,
   the state where nobody checked the database must be as loud as a failure.
2. **Key the concurrency group so independent branches do not evict each other**,
   for example `db-probes-${{ github.ref }}`. Weigh it first and say which way you
   went: the probes run against the **production** database because there is no
   staging one, so per-ref grouping trades a silent gap for several branches
   touching that database at once. Probes roll back and Postgres handles lock
   contention, so this is likely right, but it is a judgement about production and
   it belongs in your response file with the reasoning, not in a one-line diff.
3. **Re-run the probes on PR 84's head** so Session 2's migrations are actually
   checked before anything merges. Nothing in this directive is satisfied by a green
   tick on a later commit; this round's migrations are what needed checking.

### D47.1. The premise the trigger change rested on, stated and disproved

Session 4 did not miss this. Its `ci.yml` comment reasons it through explicitly and
reaches the wrong conclusion on one word: "`db-probes` runs on every push and it
runs against the real database, **one at a time and never cancelled**
(`concurrency: db-probes`). Three session branches pushing therefore **queue behind
each other** and behind `main`. That is the intended trade."

**They do not queue. The middle ones are cancelled.** `cancel-in-progress: false`
protects the run that is already going; it does not make GitHub hold every waiting
run. Only the most recent pending run in a group survives. PR 84's nine-second
`cancelled` is the proof, and it means the stated trade, "a migration that revokes a
grant an RLS policy needs is worth catching on the branch rather than after a
merge", bought nothing on the one branch that carried migrations.

**And the trigger now doubles the contention it was weighed against.** Since draft
pull requests exist for all three session branches, a push to one matches **both**
`push: claude/vallo-**` and `pull_request: [main]`, so every push starts two full
check suites. PR 83 shows the duplicate rows plainly: two `Build`, two
`Typecheck, lint, test`, two `Database probes`. That is double the CI minutes and
double the eviction pressure on the single `db-probes` slot.

Session 4's own comment already names the resolution: "A draft pull request per
session branch is the better long-run answer, since `pull_request` already triggers;
this trigger is what works without one." **The pull requests now exist**, so the
branch push trigger has done its job and should go, leaving `main`, `pull_request`
and `workflow_dispatch`. That halves the runs and removes most of the contention
behind D47 before any change to the concurrency group is even needed. Session 4
decides and records it; if it keeps the trigger, the concurrency fix in D47 carries
the whole weight and must be right.

**And the general rule, binding on every session from here.** When you report a
check as passing, say which outcome you saw. `cancelled`, `skipped` and `neutral`
are not passes, and a job that finishes far faster than its normal run did not do
its normal work. Session 4 found two blind gates by reading the files rather than
the logs; this one was found by reading a duration. Both beat trusting a summary.

---

## D46. The lockfile has two legitimate owners, and the order they land in is fixed

D39 section 4 gave Session 3 sole ownership of `package.json` and
`package-lock.json`, to stop six agents fighting over one file. That rule was right
and it was incomplete: Session 4 had already changed the lockfile to clear
`GHSA-68fv-2mgg-jv7q`, a high-severity advisory in `source-map-js`, before it could
read D39 at all. Both changes are correct and neither should be reverted.

**So the rule is split by reason, not by file.**

- **Session 3 owns the lockfile for adding, removing or upgrading a dependency.**
- **Session 4 owns it for a security advisory**, because the advisory job is its
  gate and a high-severity fix does not wait for another session's queue.
- Nobody else touches either file without saying so in their response file first.

**Landing order, which is not negotiable because it decides who resolves a
conflict.** Session 4's advisory fix lands on `main` first. It is one real version
change, it is already proved (`Advisories` passes on PR 83 and fails on 84 and 85
for exactly this reason), and every other branch goes green by merging `main`
afterwards rather than by porting it. Session 3 then merges `main` into its branch
and resolves the lockfile in favour of **both** changes: `framer-motion` added and
`source-map-js` at 1.2.2. Regenerate with the repository's own tooling, never by
hand, and note that the override alone does not take: npm kept the locked 1.2.1 and
it needed `npm update` as well.

**The `Advisories` check is not a required check.** PR 82 merged with it red, which
settles it. So a red advisory on Session 2's or Session 3's branch does not block
that branch and must not be treated as this-branch work: the fix exists, it is in
Session 4's PR, and the answer is to merge `main` once it lands. Saying it is
somebody else's failure is only allowed because it has been established here; a
session that has not established it says what is failing rather than nothing.

**The follow-up this exposed, and it is Session 4's.** `scripts/marketing`, merged
to `main` in PR 82, carries its own `package.json` and lockfile and **nothing gates
it**: the root workspaces are `apps/*` and `packages/*`, and every CI step runs with
`working-directory: apps/web`. That is a second dependency tree with no typecheck,
no lint and no `npm audit`, in the same repository where the audit job just caught a
real high-severity advisory. Add it to the audit job.
| Session 1's own claim that the repository's status documents are reliable | D40 |
| "CI green before every push" as written in D37 | D42 |

---

## D40. R1, the wrong-payer refund, is the first thing Session 2 does. Verified by Session 1

Session 4 reported a probable wrong-payer refund. **Session 1 verified it on 6
October and it is real.** This is the most serious defect anyone has found, it is
ahead of everything else in Session 2's queue, and Session 4 was right not to touch
it.

**The defect.** `submitBookingRefund` (`apps/web/src/lib/payments/refund.ts:181`)
selects the charge to refund with `booking_id`, `status = 'SUCCESSFUL'`,
`order by created_at desc`, `limit 1`, and no payer filter. But V-86 made one
successful charge per payer legitimate on a single booking: the unique index
`transactions_one_share_success_per_payer`
(`20260929004131_money_v86_flatmates_pay_their_own_shares_by_split.sql:90`) is on
`(booking_id, share_payer_id) where status = 'SUCCESSFUL' and share_payer_id is not
null`, replacing the older one-per-booking index precisely so several can exist.

**Reachability, checked at every layer.** Both admin callers
(`lib/admin/bookings-actions.ts:244` and `:399`) pass only a booking id and an
amount. Neither knows a payer exists. Nothing between the desk and the query filters
a booking with shares out. So an admin refunding a flatmate-split booking from the
desk submits the refund against **whichever flatmate paid most recently**, and
Paystack sends that person's card the money. It is silent: the refund row records
the booking, the processor accepts it, and nothing compares the payer it paid
against the payer it was for.

**The codebase already knows the distinction**, which is what makes this an
oversight rather than a design position. `lib/payments/attempt-rules.ts:152` filters
on `share_payer_id`. `lib/tenancy/share-refunds.ts` and
`lib/cron/jobs/rent-share-refunds.ts` refund a share correctly, keyed on
`transaction_id` through `rent_share_refunds`. Only the **admin** path is blind.

**Session 2 owns this.** Not Session 4, which was right to stop at money logic with
no contract naming an owner, and not Session 3. Required: the admin path carries the
payer, or refuses a booking that has share charges and routes the desk to the share
refund path; both admin callers updated; a regression test with two successful
charges on one booking proving the right card is refunded; and the double review pass
D13 requires on a money change, both passes in the response file. **Do not close
this by adding a guard that merely throws:** an admin refunding a flatmate booking is
a thing that has to work, not a thing to forbid.

## D41. The repository's own status documents overstate how blocked the project is. Measure, never quote

Session 4 found nine false claims in the repository's status documents, all drifting
the same way: describing the project as more blocked than it is. Verified examples.

- **A signed iOS build already reached App Store Connect**, run `37103086939` on
  3 October: both jobs green, all four Apple secrets present, the IPA exported with
  `destination=upload`. Four documents here say the archive was never run and Apple
  is blocked.
- **`docs/store/FOUNDER_STEPS.md` told the founder to replace an Apple Team ID
  placeholder that is already the real value** (`X74KD52994`, in both the
  association file and `project.pbxproj`). It could have had him paying for an
  enrolment he holds. Corrected 6 October; the Android fingerprints in the same step
  are still genuinely outstanding.
- **Two gates look green and measure nothing.** All fifteen weight budgets are
  `null`, so the weight check cannot fail whatever ships. The desk accessibility scan
  runs against `/preview/f5/*`, a harness, and not the real desks.

**The rule, binding on every session.** A status document is a claim, not evidence.
Before you build on one, treat it the way Session 4 treated the archive claim: read
the run, the file or the index yourself. When a document and the code disagree,
**the code is right and the document gets fixed in the same commit as the work**. A
gate that cannot fail is worse than no gate, because it spends the credibility of a
green tick, so a null budget or a harness-only scan is reported as a finding and
not read as a pass.

This cuts against Session 1 too. Four premises in Session 4's brief were wrong,
including a 1.5 second startup sequence it was asked to verify on hardware that
**no session has built yet** (`MOTION_SYSTEM.md` section 3 specifies it as work for
Session 3, and the native splash currently has no duration at all), and an escrow
rail it was asked to test that **does not exist today** (custody was retired on
25 September; Payluk is the target, not the state). A handoff must separate what the
repository does today from what the session is being asked to bring about, and
Session 1's did not. Where a handoff names an acceptance criterion against something
unbuilt, the criterion is deferred and said so plainly, not reported as a failure.

## D42. CI does not run on a session branch. D37's "green CI before every push" was unachievable as written

`.github/workflows/ci.yml` triggers on `push` to `main`, `pull_request` targeting
`main`, and `workflow_dispatch`. **A push to `claude/vallo-...` matches none of
them.** So every commit all three sessions have pushed is verified only by the local
gate, and D37 asked for something the repository cannot give. Session 4 found this
and was right to flag it rather than claim CI green.

Until the founder chooses, two things hold.

1. **The local full gate is the standard and it is not optional.** Typecheck, lint
   and the whole suite from the repository root, green, on the exact tree being
   pushed, before every push. Session 4 ran it three times and caught its own
   response file breaking the em dash rule, which is the gate earning its place.
2. **A lockfile change is not provable locally** and must be confirmed on a clean
   runner, because `npm audit` and the local suite both read an already-populated
   `node_modules`. Session 4's `source-map-js` fix (`GHSA-68fv-2mgg-jv7q`, high, the
   one red check on main) is exactly this case: the root override alone did not take,
   npm kept the locked 1.2.1 and it needed `npm update` as well. That fix is
   currently unverified by any runner.

**The fix, and it is Session 4's to make since it owns CI:** add the active session
branches to the `push` trigger, narrowly, as `claude/vallo-**` rather than
`claude/**`, so the eighteen dormant branches stay quiet. A draft pull request per
session branch is the better long-run answer, because `pull_request` already
triggers and a clean-runner `npm ci` is what proves a lockfile, but opening one is
the founder's call and not a session's.

## D43. Ship iOS to TestFlight now. Zero of thirty-four native rows have been run

Session 4's verdict is no, and Session 1 accepts it: zero of 34 native matrix rows
run, ten of them P0, no staging database, and no session can test on hardware from a
Linux container with no device, no Xcode and no App Store Connect access. That is a
limit of the environment and not of anybody's effort, and no amount of further
session work changes it.

Its recommendation stands and is now the ranked next action: **ship iOS to TestFlight
and spend one afternoon with one iPhone on the ten P0 rows.** The signed archive
already uploaded once on 3 October, so this is a step the project has taken before.
It buys more than every other open item combined, and the precedent is specific: the
last time this gap mattered, a component that was never mounted broke the app for
every tester while 8,791 tests passed, and that fix still has no regression test.

## D44. A session's own branch is the one in its kickoff prompt, and it reports a harness mismatch

Session 4's environment was configured for `claude/bold-babbage-7fkjar` while its
brief said `claude/vallo-qa-release`. It used the brief's name and said so, which was
right on both counts. The kickoff prompt's branch wins, because it is the one the
other sessions and this document name. A session that finds its harness pointing
somewhere else says so in its response file rather than silently following either.

The three session branches are `claude/vallo-backend-money-trust`,
`claude/vallo-experience-upgrade` and `claude/vallo-qa-release`.

## D45. Fetch before concluding something does not exist

Session 4 reported that the five documents in its reading list "have never existed at
any commit on any branch", having surveyed the repository and git history. The
conclusion was wrong: they are on `claude/rentme-v2-platform-audit-xuvg0a`, and
Sessions 2 and 3 both found and read them. The container's clone predated the branch
and nothing had fetched since.

**So: `git fetch origin` before concluding that anything is absent.** A survey of
`git log --all` in a stale clone proves what the container knew when it started and
nothing more. Then merge Session 1's branch into your own, per D39 section 6, rather
than reading a specification across branches or deciding it was never written.

Session 4 lost real time to this and then did the right thing anyway, which is worth
saying: it documented the absence precisely and proceeded with everything that did
not depend on it, rather than stopping. That is the behaviour D9 asks for.

---

## D39. framer-motion is installed. The library's source is in the repository. Neither is a session's decision to reopen

**Why this exists.** Session 3 reported that it was "not adding framer-motion in
this pass", doing drag and the sliding indicators with CSS and pointer events to
keep the shared lockfile untouched, and that the founder's component code "isn't in
the repo, only its description". The second was true and is now fixed. The first was
already settled by D34 and is settled again here, because the founder asked for it
directly: install it and build the components.

### 1. The source is in the repository

`docs/design/component-library-source/` holds all nine pieces as supplied, split
one file per component, with a README stating what is wrong with each and why none
of it compiles. No session builds a component from a description again.

### 2. framer-motion is installed, through LazyMotion, and that is the end of it

Every one of the founder's nine components imports `framer-motion`. Four use
primitives with no CSS equivalent worth writing: `useMotionValue` with `useTransform`
for the drag, `AnimatePresence` for exit, a shared `layoutId` for the sliding
indicator, and spring `animate` for the release. **Declining the dependency means
declining the library**, which is not on the table.

Installed as D34 set out: `LazyMotion` with `domAnimation` and the `m` namespace,
around 18KB, never the top-level `motion` import, which pulls the full bundle. One
`LazyMotion` provider high in the tree. A component that imports `motion` directly
has not been ported, whatever it looks like on screen.

### 3. Where CSS is still the right answer, so this does not swing the other way

Session 3's instinct was not stupid, it was over-applied. Use CSS transitions and
the Web Animations API for a transition on a known track with a known end:
hover and focus, a tab underline, a toast entrance, a chip changing state, a
progress bar, anything that plays once and is never interrupted. Reach for
framer-motion only for **gesture-driven, interruptible, spring-physics or
layout-shared** motion: the drag to confirm, the dynamic island morph, a shared
element moving between two routes, a list reordering, an exit that must complete
before unmount. Adding framer-motion to fade in a toast is as wrong as hand-rolling
a spring for the drag.

### 4. Lockfile ownership, so six agents do not fight over one file

**Session 3 owns `package.json` and `package-lock.json` for this work.** It installs
framer-motion once, in its first commit, as a commit of its own that touches nothing
else. No other agent in Session 3 and no other session adds, removes or upgrades a
dependency without saying so in its response file first. A lockfile conflict is not
bad luck, it is two owners.

### 5. The `shadcn` registry commands are not run

The four `npx shadcn@latest add Surajmaurya1/easyui/...` commands write arbitrary
code from one individual's unpinned third-party registry straight into the source
tree of an application that takes card payments. No session runs them. What the
founder wants from those four is specified in `COMPONENT_LIBRARY.md` and built in
Vallo's own tokens: the glass navigation with its hamburger pull for **inner** areas
only, the gesture tray, the streaming response treatment, and the button Vallo
already has. This is a supply chain decision and it is not a session's to make.

### 6. Where the specification documents live until Session 1's branch is merged

Sessions 2 and 3 both reported, correctly, that the briefs are only on
`claude/rentme-v2-platform-audit-xuvg0a` and not on `main`. Until the founder merges
that branch, **a session merges Session 1's branch into its own branch** rather than
reading across branches: it is a documentation-only branch, it touches no code, and
it cannot conflict with implementation work. Reading a specification you do not have
checked out is how two sessions end up building against two different versions of it.

---

## D38. The Paystack account is moving to the company account. Build to the value, never wait for it

**The founder's instruction, 6 October:** the code side is built complete now. He
supplies the `ACCT_` code later and the platform completes itself. He is moving
Paystack from his personal account to the **company account, as an organisation**,
and that migration is not finished.

Four consequences, binding on every session.

1. **No session asks the founder for a Paystack value, ever.** Not the reserve
   subaccount, not a key, not the webhook. "Blocked on the founder" is not a state
   any Paystack work may end in. The reserve subaccount is a one-line paste that
   completes already-finished code, and a session that stops short of finished so it
   can ask for it has wasted the founder's money.

2. **Prove everything on the sandbox account.** Test mode reads
   `PAYSTACK_TEST_GUARANTEE_SUBACCOUNT` and `PAYSTACK_TEST_SECRET_KEY`, both separate
   from live. A test subaccount costs nothing and needs no real bank account, so the
   full split rail, the webhook, the settlement, the three-leg sum, the receipt, the
   abandoned attempt and the refund are all provable today without a single founder
   value. Session 4's device pass runs in test mode for the same reason. Where a
   handoff said a step "needs from the founder first", it means live mode only.

3. **Nothing may be baked to the Paystack account that exists today.** A subaccount
   belongs to one Paystack account: every lister subaccount created on the personal
   account dies when the company account takes over, and a charge against a dead
   subaccount is refused by Paystack. Today this costs nothing, because no lister has
   a subaccount and no payment has ever opened. So: create no real lister payout
   subaccount on the current account, and treat the account identity as a variable
   rather than a fact. Any code, seed, fixture or document that assumes the current
   account survives is wrong. Refunds for a charge are made with the key of the
   account that took it, which is why the ledger records the mode per attempt
   (`transactions.paystack_mode`) and must keep doing so.

4. **The migration is cheapest right now and gets more expensive every week.** It is
   free until the first lister adds a payout account and the first naira moves. After
   that it means recreating every lister subaccount and splitting the refund path
   across two accounts. This is a founder-only action and it is now the highest
   ranked item on the founder's list, above the `ACCT_` code itself: the code is for
   the company account, so there is no reason to produce a value on the personal one.

**The single remaining step, stated once so nobody re-derives it:** the founder creates
the Guarantee reserve subaccount on the company Paystack account, against the reserve's
own bank account and not the operating account, and sets `PAYSTACK_GUARANTEE_SUBACCOUNT`
to its `ACCT_` code in Vercel, Production scope, then redeploys. Everything else is
code, and the code is done.

---

## D68. One session, not three. The three handoffs are deleted and replaced.

**7 October 2026. Founder ruling, and the reason behind it.**

`SESSION-2-HANDOFF.md`, `SESSION-3-HANDOFF.md` and `SESSION-4-HANDOFF.md` are
deleted. `docs/sessions/VALLO-BUILD-HANDOFF.md` replaces all three, for one session
doing both halves of the work, with `docs/sessions/SESSION-PROMPT.md` as the prompt
that starts it. The founder's words: "also this time it's only one session and add
instructions on building other things that those other old sessions I scattered
around them not only system platform upgrade but all the missing areas in backend
money trust etc".

**Agent count: three or four, not two.** His first message said "use 2 agent never
more than"; he corrected himself in the next: "make it have 3 4 agent he works with
not 2 and all the agents have big access to think too too image etc". The correction
stands.

**Starting point: current main, not a revert.** `git revert -m 1 c744095a4`
conflicts (five commits landed on top; `AttachmentRow.tsx` is a modify/delete), and
his instruction after the failure was forward: "tell it to upgrade the looks of the
app the feeds looks to be amazing". So the work starts from current main and goes
through `c744095a4` file by file, taking the old version back only where the old
version was better. `git show c744095a4^:<path>` supplies it. That is the review
that should have happened before the merge, done late.

**The quality bar is now an explicit test, in his words.** "Is it industry standard?
Would users fall in love with this look? Would a person pay 2 million dollars for
this app? Is this really ready to go live? Is the design system really premium?
Would I love it?" He rates the current design 2 out of 100 and wants 90. The handoff
asks for a score per surface in the report.

**His usage limit is now a stated design constraint.** "find way to make this
session not hit my usage limit so fucking hard". Section 2 of the handoff lists the
six things that actually burn it on this repository, in order.

**Adding libraries and external tools is authorised.** "if it need to load external
tools to able to make this lovely he should". Weight and advisory gates still apply.

**Two things he ruled must be preserved**, which a sweeping redesign would break by
accident: the default mode stays dark, and most containers stay. "you know keep my
default mode and most containers but can upgrade".

**Every prompt he has written is now in the repository**, deduplicated, nothing cut,
at `docs/sessions/founder-corpus/` (14 files plus an index, roughly 400
kilobytes). The referral specification arrived three times in one message and
appears once. The only edit to any of them was mechanical: em dashes replaced,
because `check-no-em-dash.mjs` walks every `.md` under `docs/`. His eight pasted
components are at `docs/component-reference/` as inert `.tsx` files outside the
build, with the five shadcn registry commands he named.

---

## D68a. The audit that corrected D68, and the finding that matters most.

**7 October 2026, same day, after merging main.**

D68 and the first draft of `VALLO-BUILD-HANDOFF.md` were written from a checkout
**962 commits behind `main`**. Three of their headline findings were wrong. This
entry is the correction, and the corrected version is section 3 of the handoff.

**Wrong: "there is no motion library in this product."** `apps/web/package.json`
carries `framer-motion` at `^12.43.0`. The previous session also ported all eight
components the founder pasted, with tests, into `apps/web/src/components/ui/`:
`Unfold`, `SlidePagination`, `DragToConfirm`, `BookCallButton`, `LiveIsland`,
`particle-delete`, `InnerNav`, `BatchTray`, plus `Segmented`, `ported-motion.ts`,
`ported.css` and `FirstRunPanels.tsx`.

The real finding is adoption, not absence: **45 product call sites across 1,769
interface files, and seven files in the whole product import framer-motion.** The
components were built and never fitted. That is why the app does not feel different
to the founder, and the fix is far cheaper than building a motion system.

Still genuinely missing: the five named curves from the motion designer (`land`,
`leave`, `glide`, `whip`, `drift`); `gsap` and `three` are not installed, zero
lockfile matches for either; shadcn is not initialised, so
`apps/web/components.json` does not exist and the five registry components were
never pulled. And the motion designer's brief says GSAP and the curves are "already
in the repo" at `scripts/marketing/video/engine/`: **that directory does not exist
here**, it is in the marketing film repository.

**Wrong: "the money rail is not built."** The provider seam is built and tested.
`apps/web/src/lib/payments/provider.ts` defines a capability typed interface with
six capabilities (`split_at_charge`, `hold_in_escrow`, `refund_without_dispute`,
`list_successful_charges`, `charge_saved_card`, `verify_with_record`) where the type
system refuses an adapter declaring a capability it has not implemented.
`providers/index.ts` is the registry with a per provider kill switch, Paystack is
implemented, and:

```ts
case "payluk": return null;   // the entire gap
```

`escrowRailLive()` returns false for exactly that reason. **The single missing piece
is the Payluk adapter**, plus the lifecycle, webhooks and screens hanging off it.
Also already on main: `payluk-merchant.ts`, `commission-sweep.ts`,
`referral-payout.ts`, `referral-transfer.ts`, a 30 file `lib/money/`, `admin/money/`
with a reconciliation desk, and 75 probes including `rail-router.sql`,
`chargebacks.sql`, `b4-referral-campaigns.sql` and `b5-promotion-purchase.sql`.

One fact from the capability types that shapes the refund path and was not recorded
anywhere else: **Payluk has no refund without dispute.** A Payluk refund goes
through dispute resolution, so the refund surface has to branch on rail.

**Wrong: "there is no referral interface."** `/rewards`, `/rewards/referrals`,
`/rewards/history` and `/rewards/withdraw` all exist, with a `(dev)/preview/rewards/`
fixture set covering paused and today states.

**And here is the finding that explains the founder's whole complaint.**

He said: "all the features he claim he built can't see them the wallet not in side
nav or anywhere". He was navigating correctly. The navigation is wrong.

`apps/web/src/components/app/nav-model.ts` lists exactly these destinations:

```
/admin  /agent/dashboard  /agreements  /around  /assistant  /home  /host
/messages  /notifications  /payments  /price  /saved  /search  /settings
/stays  /stays/search
```

**`/rewards`, `/payouts`, `/receipts` and `/refunds` are not in it.** Every money
and rewards surface is reachable only by drilling into `/settings/invite`,
`/settings/payments` or `/payments`. `lib/nav/route-labels.ts` and
`route-parents.ts` already know these routes exist; the navigation model does not.

So three sessions built features and nobody asked whether a person could find them.
Routing them into the navigation is an afternoon's work and it is the first item in
the handoff's order of work, ahead of everything beautiful, because it is what
changes what he sees when he next opens the app.

**The method lesson, for every future session including this one:** a route audit
asks two questions, and the second is the one that was never asked. Is it good? And
**can a person actually get to it?** The handoff now requires both answers for all
223 non preview routes (D.2).

**The startup hold, corrected twice in one day.** The audit found that
`splash-hang.test.ts` records a 3 October fix for this exact symptom
(`<NativeRuntime />` missing from the root layout) and that the fix is present,
`layout.tsx` line 501. The handoff's first draft therefore told the session to check
whether the founder was on a stale build. **He answered the same day: it is still
happening on a current build.** "it's not fixed at all I don't want to see it I don't
want my logo to be there once I open the app I want to see an animations for about 1.5
secs lovely animations like how other serious industry standard platform is."

So the 3 October fix landed and the symptom survived it, and A.2 of the handoff now
says why a timing fix keeps not holding: **the brand is painted onto a native splash
image, whose duration is whatever the slowest thing on the critical path turns out to
be.** That can never be reliably fast, and on a Lagos connection with a cold cache it
is eight seconds of a static PNG.

The ruling, and it is architectural: the native launch image becomes a plain `#010118`
field identical to the app background, so its duration stops mattering; the splash is
dismissed on first paint rather than on window `load`, off the two deep dynamic import
chain in `boot.ts`; and the brand moment moves **into** the app, motion from the first
frame, 1,500ms ceiling, interruptible, interactive underneath, shortened for a
returning member, and handing off into the first screen rather than fading out in
front of it. Closed by three measured numbers on a physical mid range Android and a
screen recording, not by an assertion.

**Also corrected:** `b3_rate_agreement_gate.sql` **is** still in
`supabase/migrations/pending/`, along with `b2_rail_at_open.sql`. The first draft
said it had shipped. A pending migration does nothing, which is directly relevant to
"the pay is still taking me to agreement".

**The process failure behind all of this, stated plainly so it is not repeated:** an
audit run on a stale checkout produces confident, specific, wrong findings, and they
are more dangerous than vagueness because they get acted on. `git fetch` and merge
`main` **before** auditing anything, and say in the report which commit the audit
was run against.

## D68b. The money scope is the whole financial platform, not escrow.

**7 October 2026. Founder correction, and a rewrite of Part B.**

The first draft of Part B described the money work as "the escrow rail" and treated
wallet state, deposits, withdrawals, bank verification and transfers as items under
it. He corrected that:

> All the withdrawal pages for transfers not only escrow we use payluk transfer
> withdrawal etc it's all on the prompt

> don't cut or say not build this or that or don't do this or that make it build and
> connect all the dots together

Part B is now a build map for **all 75 sections** of
`founder-corpus/06-payluk-master-prompt.md`, in his own **25 phase** order from his
section 68. His order puts wallet state, deposits, withdrawals, bank verification and
transfers at phases 6 to 10, **before** standard and milestone escrow at phases 11 and
12, and that order is kept. Escrow is one part of this and not the biggest part.

**His three provider architecture, from his section 4 and 5, recorded here so nobody
re-derives it:**

- **Paystack**: commercial payments. Boosts, subscriptions, premium features, service
  fees, **referral payouts**, other non-escrow.
- **Payluk**: merchant customers, wallets, escrow, payment intents, deposits,
  withdrawals, wallet transfers, payment history, disputes, refunds and resolution,
  bank and account verification, webhooks, transaction records, fees, settlement.
- **Yellow Card**: future international and stablecoin rails, built as its own adapter
  from the start, phase 22, never merged into Payluk code.

**Two rules that were previously written as prohibitions and are actually
instructions**, which matters because he objected to being told what not to build:

1. cNGN is not the launch crypto architecture and is not exposed to members; crypto
   and stablecoin go through Yellow Card instead. Yellow Card **gets built**.
2. Crypto surfaces as a rail on a transaction ("Pay with USDC"), never as a wallet
   product. A regulated wallet product remains a later deliberate decision.

Both say how, not whether. Same for the deprecated virtual-account endpoint: the
documented payment-intent flow replaces it, and his own words add "do not create a
fake Vallo bank account system to compensate for this".

**Two facts recorded nowhere else that will cost a cycle if missed:** Payluk amounts
are naira **major** units, not kobo, the opposite of Paystack. And **Payluk has no
refund without dispute**, which is in the capability type comments and means the
refund surface branches on rail.

**One item added to the founder-only list:** his decision on whether to expose crypto
withdrawal. The provider supports it; his section 12 says not to expose it unless the
product and legal design explicitly enables it. So it is built, flagged, and put to
him.

---

## D68c. The logo never shows on app open. The opening is the product arriving.

**7 October 2026. Founder ruling. This supersedes the apartments.com opening
reference and retires `BrandAssemble` from the startup path.**

> I want that my logo image to not show anytime I open the app to change to something
> animations vibes stuffs like it's when click website link you get something beautiful

This is a change of concept, not of duration, and it reverses an earlier direction of
his own. `BrandAssemble` exists because of a founder reference recorded in its own
comment: "the apartments.com app opening: the mark turns in depth with motion blur and
settles, and the wordmark arrives a letter at a time". That was built faithfully and it
is skilled work. It is now the wrong idea.

**The rule, absolute:** the logo never appears by itself on app open. Not as an image,
not as an animation, not for 1,500ms, not for 200ms.

**The reference, read precisely:** when you click a link to a beautifully built
website, there is no logo card, no bumper, no interstitial. You get the page, its
structure resolving and type settling, in motion from the first frame and usable almost
immediately. The craft is in how the content arrives.

**So the opening becomes the app's own first screen, choreographed:**

- The first frame is already the product. Real structure, header, dock, the shape of
  the content. Never a brand card.
- Motion is the content arriving in sequence, stagger at most 60ms, background layers
  at 0.6 of foreground, entrances on `land` and exits on `leave`.
- Brand presence is incidental and in motion: the mark may ride in as part of the
  header arriving, at header size, among other arriving things. Never the subject,
  never alone, never centred on an empty field.
- Interactive almost immediately. A tap anywhere skips to the settled state.
- About 1,500ms of choreography at most, and roughly 400ms on a returning open,
  because a beautiful website does not replay its entrance every visit either.
- One continuous move into Get Started for a new member, or into the passcode greeting
  then home for a returning one. Not a cut.
- Reduced motion, Calm, Off and save-data each get one settled frame.

**What to keep:** `--nf-splash-hold` and the first paint choreography it coordinates
across `animation.css`, `detail-m.css`, `inner-m.css`, `landing-rooms.css` and
`threshold.css`. That machinery is good and it is most of the answer; it just needs to
be pointed at a content-led opening instead of a logo hold. `BrandAssemble` may keep a
home somewhere a brand moment genuinely belongs, such as an About page or a share card.
It comes off `layout.tsx` and off the `.nf-splash__brand` rules in `threshold.css`.

**And the native launch image loses the brand too**, per D68a: a plain `#010118` field
identical to the app background, so the transition out of it is invisible and its
duration stops mattering. The nine iOS images in `Splash.imageset/` and the Android
`drawable*/splash.png` set are generated, so extend `scripts/build-native-icons.mjs`
rather than hand editing them.

**Closed by measurement, not assertion.** Four numbers on a physical mid range Android
over a throttled connection, the third being **milliseconds of anything that is not the
product, target zero**; still frames at 300ms, 700ms and 1,200ms, none of which may
show a logo and nothing else; and one screen recording. The one sentence test: would
this feel like opening a beautifully built website, or like watching an app's logo?

---

## D68d. The staff approval gate before payment goes, because escrow replaced it.

**7 October 2026. Architectural decision, following from ADR 0003.**

`private.transactions_payment_gate()` refuses any charge unless
`deal_agreements.status = 'approved'`, set by a Vallo person working the queue in
`apps/web/src/app/admin/agreements/AgreementQueue.tsx`. Every deal stops there after
both parties have agreed. The founder hits it himself and reads it as a bug.

It was not a bug. Under ADR 0002 and split-at-charge, money settles to the lister's
own Paystack subaccount the instant the card clears and Vallo cannot claw it back, so
a human reading the agreement first was the only protection a renter had. It was a
compensating control for having no escrow.

ADR 0003 removes the thing it was compensating for, **on the escrow rail only**.
Payluk holds the funds until conditions are met, so the protection is structural and
a pre-read adds nothing a renter can rely on. On the direct rail money still settles
irreversibly, so the original reasoning stands there.

**The rail decides the gate.** Escrow: payment opens immediately, no staff gate.
Direct: payment opens immediately unless a risk signal fires (no completed deal yet,
amount over a configured threshold, price or key facts changed in the last few days,
payout account name mismatch, anything fraud radar flags).

**Review moves, it does not disappear, and this is what makes it safe.** On escrow
Vallo has the entire hold window to look at a deal and can still intervene while the
money is safe. That is a longer window than before and it costs the member nothing.
So the agreement queue stays and improves: it stops being a gate every deal waits
behind and becomes a watch list over live holds, ordered by risk, able to pause a
release.

**Not a global on/off flag.** A single switch turning staff approval off everywhere
would strip the protection the direct rail still needs. It resolves per booking from
the rail plus the signals, the database gate asks that resolver rather than demanding
`approved` unconditionally, and a kill switch can force review on everything during an
incident, off by default. Four probes: escrow opens without approval; direct with a
signal is refused without one; direct with no signal opens; the kill switch refuses
everything.

**A separate thing that was being confused with it:** `b3_rate_agreement_gate.sql`,
still pending, is about the lister having accepted the fee figures before publishing
and the split reading that acceptance. Different gate, about the amount being right
rather than a human approving a deal. **Keep it and apply it.** `b2_rail_at_open.sql`
is also still pending and step 6 of the flow depends on it.

The full twelve step flow from published listing to receipts is in B.3.5 of the
handoff. Step 8 is the one that wins the market: a renter who can see on screen that
their money is held by a licensed provider, and exactly what releases it.

---

## D69. ADR 0003: a licensed provider holds the money, Vallo records it.

**7 October 2026. An architectural decision taken by Session 1, because the work
could not start without it.**

ADR 0002 ("Vallo never holds customer money", accepted 25 September) says flatly:
"No custody. There is no wallet, no balance, no escrow and no held payment, and no
flag that could turn any of them back on." A live event trigger enforces it:
`private.refuse_custody_objects` refuses any table, view, function or materialised
view in `public` or `private` whose name matches
`(^|_)(wallets?|escrows?|pots?)(_|$)`, or begins `held_payment`, on `CREATE TABLE`,
`CREATE TABLE AS`, `CREATE VIEW`, `CREATE FUNCTION`, `CREATE MATERIALIZED VIEW`,
`ALTER TABLE` and `ALTER FUNCTION`.

The founder's 75 section payments prompt asks for escrow, a balance, deposits and
withdrawals through Payluk. Those two things could not both be true, and the
collision is a real part of why the money rail was not built: a session reading
ADR 0002 as a standing instruction would have had to either break the trigger or
stop.

`docs/adr/0003-a-licensed-provider-holds-the-money-vallo-records-it.md` resolves it
and amends ADR 0002 without weakening its principle:

1. **Vallo still never takes custody.** Payluk, a licensed escrow provider, holds
   the funds. Vallo creates the arrangement, watches it, records it, settles its
   own 2 percent out of it and shows every party where their money is. The CBN
   regulated activity remains outside the company.
2. **Vallo's database mirrors provider state and never is the state.** Every stored
   figure carries the provider's reference and the time Vallo observed it. The
   provider is the book of record; where they disagree the provider wins and
   reconciliation raises it. A balance Vallo shows is a provider balance Vallo is
   reporting.
3. **The naming guard stays, deliberately.** It is the only mechanism stopping
   Vallo held custody from reappearing one convenient column at a time. So Vallo's
   objects are named for what Vallo does: `provider_arrangements`,
   `member_funds_reported`, `funds_movements`, `release_conditions`,
   `marketing_float` (already live). The words `wallet` and `escrow` stay free in
   the interface, in copy, in component names and in TypeScript, because that is
   what members and Payluk call these things. **This is a naming rule, not a
   feature restriction.** Nothing the founder asked for is cut.
4. **The member facing promise is unchanged, and becomes a feature.** Vallo says
   plainly that it does not hold the money and names who does. One line, in the
   money surface and in the agreement. In a market where every renter has heard a
   story about a deposit that vanished, that sentence is the product. It is the one
   place the provider is allowed to be visible; everywhere else it stays invisible
   per `founder-corpus/13-provider-must-not-leak.md`.

What this does not change: the three pot append only ledger
(`ledger_customer_funds`, `ledger_vallo_revenue`, `ledger_marketing_float`), the
commission sweep, the Payluk merchant client on main, `whoPays: "seller"` on both
rails, the 2 percent commission, the 1,000 naira withdrawal minimum, or VAT at
zero while unregistered.

What it adds: probes asserting that every mirror row carries a provider reference
and an observation time, and that no Vallo table claims an authoritative customer
balance.

---

## D70. The money pages have doors, and the side navigation has a Money group (7 October 2026)

The build session started from `f94963c7` (main) merged with the docs-only branch
`claude/rentme-v2-platform-audit-xuvg0a` (`93ac365b`), because the handoff, the
founder corpus, ADR 0003 and D68 to D69 had never been merged to main. **Anybody
reading the session prompt on main will not find the files it names.** Merge that
branch, or this one, first.

Section 3.1 of the handoff was partly stale by the time this session read it: Rewards
and Invite friends had been given rows earlier the same day. Receipts, Payouts and
Refunds had not. They now sit in a **Money** group in `nav-model.ts`, with Payments,
Rewards and Invite friends moved into it, on both sides, signed in only. A test
(`nav-money.test.ts`) fails if any of the six loses its row.

The navigation's groups, and the other unification answers A.16 asks for, are decided
in `docs/design/ONE-PRODUCT-DECISIONS.md`. Every agent adds to those groups and nowhere
else.

There is no `/pro` route in the tree. The founder's "the pro and etc too" cannot be
routed until Pro exists; it is in the report under not built.

---

## D72. The whole platform, to the premium standard, by six agents (7 October 2026)

The founder, mid-session: upgrade every page of the platform to a premium, consistent,
next-generation standard, on Android, iOS and the web, with up to six agents working
autonomously, following the handoff and this instruction together. He sent five
reference images in chat; they are described precisely in
`docs/design/PREMIUM-STANDARD.md`, which is now the bar every agent builds to.

He reopened two things earlier rulings had closed. **Get Started is redesigned**, to his
reference of the Vallo onboarding cards ("Find your space.", 1 / 4), and the sign-in
and sign-up flow, which he now calls good, may be raised further if it can be done
better. The feed's actions become small, clean outline icons in separate capsules, per
his reference.

---

## D73. Two ways to pay: rentals through escrow, fixed-price bookings by card directly (7 October 2026)

The founder, in his words: "Pay is now escrow bro but for hotel and restaurants etc is
paystack direct when price is up there fixed by the hotels and rooms bookings you know
how LITEAPI is".

- **Rentals and other negotiated property deals** pay through **escrow**, held by the
  licensed provider (Payluk), per ADR 0003. The agreement stays, because a negotiated
  deal has terms to agree; the payment that follows it is a protected escrow payment,
  not a plain card charge. This is phases 11 and 12 of his payments prompt.
- **Hotels, shortlets, restaurants and any booking at a price the business fixed**
  pay **directly by card through Paystack**, as an instant booking in the shape of a
  hotel booking API flow such as LiteAPI: search, pick a room and rate, see the total,
  book and pay in one flow. No host acceptance step and no Vallo review step stand
  between a guest and paying a published price. The existing database pricing
  (`private.price_room_booking`), inventory hold, split and settlement are kept.

This supersedes, for fixed-price bookings, the step in `docs/ROOM_CHECKOUT.md` and
`docs/MONEY_ARCHITECTURE.md` where a stay agreement waits for both confirmations and a
staff approval before payment opens. It is built behind a switch, reviewed, and the
switch is turned on by him.

He also sent five more references (`docs/design/references/2026-10-07/`): a premium
paywall, a "Start for free" paywall and a one-time offer, a streak screen, store
screenshots with huge headlines, and payment confirmed. They govern Pro, Rewards and
Get Started.

---

## D74. The Plasma set is the premium level, platform wide (7 October 2026)

The founder sent five frames of the Plasma app (rewards, tiers, withdraw, the rewards
home) and ruled them the level of premium he wants across the whole platform, naming
the platinum rewards frame specifically: "that platinum mid color those style clean...
this is the level of premium I need in my platform wide... use them in wallet
withdrawal etc". Saved as `docs/design/references/2026-10-07/GOVERNING-plasma-*.jpg`
and decoded in `docs/design/PREMIUM-STANDARD.md` under "The governing level". A
platinum material joins the token set; dark stays the default.

---

## D75. Bookings end to end, the way the best booking platforms do it, in Vallo's own way (7 October 2026)

The founder: "design it how Airbnb and all these booking platforms are but in our own
way and how we can connect it with the hotels flow how it's done industry standard...
same as this restaurants too and shortlet our commissions too... all end to end".

**The journeys** (each in Vallo's dialect, never a copy):

- **Shortlets and serviced apartments (the Airbnb shape):** search with dates and
  guests, map and list together, a listing page with the gallery, the host, house
  rules, amenities, cancellation policy and reviews, a sticky price bar showing the
  total for the dates, a full breakdown (nights x rate, any cleaning or service line the
  listing really carries, Vallo's fee), Reserve, instant booking and card payment
  (D73), a trip page (dates, address revealed after payment, check-in instructions,
  message the host, the receipt), and a review after check-out.
- **Hotels (the Booking.com and hotel-API shape):** room types, rate plans
  (refundable or not, breakfast or not), per-night availability from the hotel's rate
  calendar and room inventory (built), the total for the stay, instant booking and
  card payment, the same trip page. Hotels manage rooms, rates and the calendar in the
  host console today. **Connecting outside hotel supply** (a channel manager or a hotel
  API such as LiteAPI, so hotels that are not on Vallo appear with live rates) is the
  industry route to inventory at scale; it is a separate integration that needs a
  provider account and keys, recorded as a founder decision, not built blind.
- **Restaurants (the OpenTable shape):** date, party size and time slots, instant
  confirmation, a reservation page with the restaurant's details, reminders, and the
  restaurant's own console of the day's bookings. **No payment today** (a reservation
  has no price). The industry pattern for no-shows is an **optional deposit** a
  restaurant can set for some slots or party sizes, paid by card on the direct rail and
  deducted from the bill; built behind its own switch, off.

**Commissions** (from `docs/payments/VALLO_PRICING.md`, unchanged): Vallo's commission
is **2 percent on every transaction, both rails**; the direct rail (hotels, shortlets,
restaurant deposits) pays Paystack's own fee, capped at 2,000 naira, and Vallo keeps its
2 percent; on the escrow rail (rent, sale, land) Payluk's 2 percent is **borne by the
lister** (decided 6 October; the D73 agent's "who pays" question is already answered).
Every booking shows the guest the total and its breakdown before paying, and the host
sees what they receive.

**Decided for him:** shortlets and serviced apartments with a fixed nightly rate take
the direct rail (instant booking, card), because their price is fixed like a hotel's.
`VALLO_PRICING.md` section 2 listed shortlets on the escrow rail; that line predates
D73 and is superseded for fixed-price shortlets. He can overturn this.

---

## D76. Leaderboards, who to follow, one agents directory for both sides, and the wallet's two-action bar (7 October 2026)

- **Two public leaderboards, City and Global:** (1) **referrals**, by qualified
  referrals; (2) **top performers on the platform**, by completed deals through Vallo,
  across agents, landlords, realtors and firms, with **hotels and restaurants** ranked in
  their own boards by completed bookings and reservations. A 3D podium for the top three,
  ranks 4 and on as rows, a floating "You" pill, a month or period subtitle.
  **Decided for him:** boards rank by counts of completed deals and bookings, never by a
  member's naira earnings shown publicly; a member or business can opt out; only
  verified workspaces and real activity appear; nothing is invented to fill a board.
- **Who to follow** in the feed suggests top agents, landlords, hotels and restaurants
  near the member; a **social search** finds them by City or Global.
- **The agents directory covers both sides:** on the Property side it lists agents,
  landlords and firms; on the Stays side, hosts, hotels and shortlet operators. One
  page, flipped by the side switch, the same way the rest of the shell flips.
- **The wallet's own bottom bar has two actions, Withdraw and Transfer.** The wallet is
  a feature, not a main section; the main dock is unchanged.

## D78 (7 October 2026, evening): blue is the identity; no glass

From the founder's production screenshots (leaderboard, passcode, profile, /pro):

- **No platinum on controls.** Every button, selected pill or toggle that used the platinum (silver-white) colour is Vallo blue. The leaderboard's "FCT (Abuja) | Global" selected pill is the example.
- **No white buttons.** Every call to action is the platform's primary blue button ("Invite friends", "Continue with Agent Pro" were the examples).
- **No grey containers.** Stat strips and cards sit on the platform's own blue-tinted container, the one the Profile lists use ("4 Tools | Coming | Nothing" on /pro was the example). This applies to new features too.
- **The passcode keypad is blue**, not grey.
- **No glass icons anywhere.** Icons are the solid, opaque blue 3D renders (the Profile "Belongings" rows: Plans, Saved, Agreements, Workspaces). Named: Get started, side nav, flip card, the Neighbour badge.
- Gold is not part of this ruling.

This supersedes the platinum direction in `docs/design/PREMIUM-STANDARD.md` where they disagree.

### D78, continued (same evening)

- **It is the Wallet**, never "Balance", in everything a member reads. The wallet screen shows its full designed layout even before the provider is connected: actions present but disabled with one short line, no paragraphs about partners or rails, and still never a figure the provider did not give.
- **The dock is icon-only**, the active tab included (a blue fill behind the icon marks it; the name stays for screen readers).
- **No four-point sparkle icon anywhere.** For you, Pro and the assistant each get a real icon that means the thing.
- **The feed must work and look clean**: avatar and name open the profile, every action does its own thing, actions are bare icons (no pill wrappers), the feed has its own + to post, story avatars sit in clean even rings, the story viewer is calm and full-bleed.
- **The platform's docs sit beside "VALLO SPACES LTD"** at the foot of the side nav.

### D78, navigation (same evening; the lead owns navigation from here)

- **Settings has no pull-out menu.** Every settings page is a row on the Settings page and goes back to it; nothing else lists them.
- **Space Passport is a side-nav feature**, beside Agreements.
- **Money in the side nav is three rows: Wallet, Rewards, Referral.** Payments, Receipts, Payouts and Refunds live on the Wallet screen.
- **"Invite friends" is Referral**, and the Leaderboard opens from the Referral page, not the side nav.
- **No logo or wordmark in the app's top bar.**
- **The bell shows only on Home, Search and Feed** (each side's own), nowhere else.
- **The platform's documents (Terms, Privacy, Safety, Help) sit under VALLO SPACES LTD** at the foot of the side nav.
- **A member's public profile has no composer +** (that belongs on the Feed), quiet Back and Share without containers, a smaller Follow button, a ••• menu that opens fully on screen, and clean, sharp tabs.
