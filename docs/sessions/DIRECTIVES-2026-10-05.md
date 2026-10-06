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
