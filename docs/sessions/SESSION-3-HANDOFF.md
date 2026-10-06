# SESSION 3 EXECUTION PROMPT: the platform-wide experience upgrade

**From Session 1, 5 October 2026.** Paste this entire file as your opening brief.

**The founder's instruction, in his words:** take the platform to a next generation
international look, landing page to the last page. Premium vibes, like a company
worth far more than this one. Generational. Something big investors fall in love
with. Everyone should feel safe and feel premium. Keep the capsule bottom navigation
and the side navigation, upgrade both. Premium containers. Lots of motion and
animation. **Audit every single page as part of the upgrade.**

---

## 0. READ THESE FIRST, IN THIS ORDER

1. **`docs/sessions/DIRECTIVES-2026-10-05.md`**: the founder's current rulings.
   **They supersede every earlier spec they touch.** D1 is the new brand hierarchy,
   D2 makes rectangles the default button, D3 brings paid promotion, D8 makes Space
   the noun.
2. **`docs/design/VISUAL_NORTH_STAR_2026-10-05.md`**: in full. Your specification.
   The four locked decisions in its section 1 are not reopenable.
3. **`docs/design/CRAFT_DOCTRINE.md`** in full. It governs taste where the other
   documents govern specification, and its section 8 is seven questions every surface
   answers before it is called done.
4. **`docs/design/COMPONENT_LIBRARY.md`** in full. The founder's component library,
   where each piece goes, and the porting checklist that must pass before any of it
   ships.
5. **`docs/design/MOTION_SYSTEM.md`** in full. **Read its section 0 first**: the GSAP
   engine the motion designer's brief points at **does not exist in this repository**,
   and section 0 reconciles his brief with what is actually here so you do not spend an
   hour looking for it. Sections 3, 4 and 6 are the startup sequence, the deep Get
   Started reference and the passcode rebuild.
6. **`docs/sessions/FEATURE-REGISTER.md`**: section I is yours, plus every screen in
   E2, E3, E4, E6, D9, D10, F, G, H3 and J3 to J9.
7. **`docs/sessions/BLIND-SPOTS.md`**: B-26 no chart system, B-27 no map design,
   B-28 no print and PDF design, B-29 email as a surface, B-30 photography, B-31
   localisation, B-32 density, B-33 the component gallery. All yours.
8. **`docs/design/CHATGPT_ASSET_PROMPTS.md`**: a complete standalone prompt per
   asset.
9. **The 79 reference images** in `docs/design/references/2026-10-05/`. **Look at
   the twelve canonical ones yourself** before designing the surface each maps to.
   Many are frames from videos, so read sequences as motion, not as stills.
10. `docs/design/CLEAN_UNIFIED_DIRECTION.md` and `docs/TRACK_M_MOTION_PLAN.md`, both
   still live. `docs/PRODUCT.md` section 7 for terminology, as amended by D8.
11. Session 2's response file. **Verify what it claims rather than trusting it.**

---

## 1. CONTEXT

Vallo is the operating system for physical spaces, beginning in Nigeria. The brand
hierarchy, locked by the founder on 5 October:

```
VALLO
Space, without the runaround.

The operating system for physical spaces.

Discover. Verify. Transact. Manage.
```

The slogan goes on the splash, the website, receipts, emails, ads and the store
listings. The positioning line is for investors, partners and press and is **never
the primary consumer line**. The product explanation is "Discover, verify, transact,
and manage spaces in one place."

**What premium means here**, because the founder asked for investor-grade and for
everyone to feel safe, and those usually pull against each other:

> **Vallo earns premium by being the most honest screen in the room.**

Not ornament. The confidence to show the whole number, name the fee, date the
inspection, tick the steps as they actually complete, and leave air around all of it.
Cheap products hide the total and decorate the edges.

## 2. CURRENT STATE

200 product pages, 27 public pages, 38 admin desks, 216 developer preview pages
behind an environment flag. Tokens in a 4,235-line stylesheet, a motion token scale,
two themes, four locales. 95 Playwright specs that your redesign will break, which
Session 4 repairs.

Known weaknesses you are fixing: the profile gear and listing photo buttons are 14px
squares, the dock label is 11px against a 12px floor, 449 raw `<button>` elements
remain, 134 glow declarations exceed the budget, four route families still use a
generic skeleton, `/home` ignores the interests it collects, cold-start sign-up never
reaches the onboarding questions, and the offline card uses a generic building glyph
instead of the logo.

## 3. OBJECTIVE

Every page redesigned and audited. One coherent product across app, website, docs,
legal, email and admin. Motion as the personality rather than a finishing pass.

## 3A. THE GOVERNING RULE: it stays Vallo (D28)

**Read this before the locked decisions, because it qualifies them.**

The founder's words: the default mode does not change, the current containers and flow
stay but are upgraded, and **he does not want the platform to look like a different
platform.** A legendary upgrade **of Vallo**, not a replacement for it.

**This outranks every individual design decision in your brief.** Where something would
make a returning member feel they had opened an unfamiliar product, it is wrong,
however good it looks alone.

- **Dark stays the default.** Light, Dark and System remain the choice from the
  `nf_theme` cookie. **You never flip the application out from under somebody.**
- **Paper is a document treatment, not a screen register.** On a dark canvas a receipt,
  statement, agreement or transaction detail is **a light document sheet on the dark
  surface**, the way a receipt sits on a desk, with the chrome around it in the
  member's theme. That is what makes it worth screenshotting as proof, which was the
  whole point.
- **Containers are formalised, not replaced.** The radii, the navy glass, the edge
  light and the blue family stay. Elevation and edge treatment become consistent.
- **Flow stays.** The dock keeps its slots, the side nav its structure, and the
  listing, checkout, agreement and workspace flows their steps. The inner-page work
  splits screens carrying two jobs; **it does not reorder a flow a member knows.**

**The test for every change you make:**

> Would a member who used Vallo last week open it and feel they are in the same
> product, only better?

If the honest answer is no, rework it. **Upgrade the material, the type, the figures,
the motion, the depth and the craft. Do not move somebody's furniture.**

**This does not soften the standard.** Every page is still audited, the motion system
still ships, the clay migration still happens, feature onboarding, notifications,
email, the money surfaces and admin mobile are all still built. Identity is preserved
and ambition is not reduced. A session treating D28 as permission to do less has
misread it.

## 4. THE FOUR LOCKED DECISIONS

**D1 Theme, as amended by D28.1.** The member's theme governs everywhere, Dark stays
the default, and Paper is a document treatment within it. The list below names which
surfaces are **documents**, not which flip the app.

**Originally:** Night for landing, startup, auth, home, search, stays,
restaurants, detail, Around, profile, saved, notifications, assistant and the lister
dashboards. **Paper** for checkout, pay, receipts, payments history, earnings,
statements, agreements, the move-in ledger, tenancy, the caution register, the Money
desk, the legal pages and every emailed receipt. Both themes work everywhere; this
sets which leads. An explicit member choice always wins.

**D2 Icons.** Matte clay 3D for content objects at 32px and above. Line glyphs on
flat plates for all chrome below 32px. **Glossy, bevelled, chrome, neon-rimmed and
glass 3D are banned**, because gloss is the strongest visual marker of betting and
crypto apps and it costs Vallo the cautious renter it most needs.

**D3 Full redesign, surface by surface.** Restructure, reorder, change what leads,
move navigation. The capsule dock and the side navigation are both kept and both
upgraded.

**D4 The signature is oversized live figures.** Large tabular naira figures leading
every screen with a number, counting up on arrival, re-rolling like an odometer on
change, with sliding-pill segmented controls and a primary action that morphs into a
tick. Typography stays **Poppins display, Inter text**: no serif and no new display
face, because four locales need Inter's coverage of the naira sign and Yorùbá, Igbo
and Hausa diacritics.

**And the founder's 5 October amendment, D2 of the directives: most buttons are
rectangles**, matching the platform today. Rounded rectangle at radius 14 is the
default. The pill is reserved for chips, filters, segmented controls and circular
icon controls, so a pill tells a person the thing is selectable. North star 5A holds
the eight roles.

## 5. THE OPERATING RULES

### 5.1 Autonomy

Routine access is authorised. **Never ask whether you may inspect the repository,
Supabase, Vercel or GitHub, run tests, investigate an implementation, fix an obvious
issue, or do something the approved strategy already requires.** Do the work. Never
expose a secret, never destroy data, never do something irreversible casually.

### 5.2 The escalation ladder replaces asking

Investigate the repository, inspect related implementation, check configuration,
search the documentation, check dependencies, check previous response files, decide
from the established strategy, make the safest production-quality decision. Only a
genuinely blocking decision escalates, **into your response file**, while you
continue on everything else.

### 5.3 Model routing

| Weight | Route to | Work |
|---|---|---|
| **Mechanical, specified, high volume** | cheapest capable model | The Space vocabulary rename, token sweeps, className migrations, raw-button migration, `loading.tsx` generation from a template, icon call-site swaps, per-page checklist passes, screenshot runs, i18n key splits |
| **Ordinary implementation** | mid model | Screens and components against a decided spec, form states, list and detail layouts, admin desk UI, email templates |
| **Design and risk** | strongest model | The primitives in Stage 1, the motion system, the startup sequence, the chart system, information architecture per surface, anything that changes what a person understands about money |

**Never route money-facing copy, the chart system or the startup sequence to the
cheapest model.** A wrong figure or a misleading animation is worse than an ugly one.

### 5.3a You research the references yourself

**Founder directive D16.** Before you design a surface, **open the reference images
for it.** Session 1's classification in north star section 9 is a map, not a
substitute for looking. Many references are frames from videos, so read a run of
consecutive files as a motion study rather than six stills.

More references are being added to `docs/design/references/`. **Read whatever is in
that directory on the day you run**, not only what Session 1 catalogued, and record in
your response file which references drove which surface.

You also have research latitude generally: if a surface needs a pattern nobody has
specified, find a good one, classify it BORROW, ADAPT or AVOID the way Session 1 did,
and write down the reasoning. **Extract patterns, never clone a platform. Vallo must
emerge as its own product.**


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

### 5.4 The breadth mandate

**Do not leave an existing screen untouched because it was not named.** Classify
every route, dashboard, workspace, navigation item, flow, modal, form, settings area,
profile, listing workflow, admin page, mobile page, web page, auth state, onboarding
state, empty state, error state, loading state, success state, detail page,
management page, document area, payment flow and notification surface as **KEEP,
UPGRADE, REWORK, COMPLETE, REPLACE or DEFER**, and record it.

### 5.5 Verify, never assume

Never assume Session 2 did what it said. Check the code.

---

## 6. AGENT OWNERSHIP

**Up to six agents** (D36), because this session's scope is the largest. **Ownership
discipline tightens rather than loosens with six: declare every agent's files before any
parallel work, and two agents never hold the same file or stylesheet.** Six agents
without declared ownership is slower than four, because the time goes into reconciling
conflicting edits.

Suggested split beyond the four below: **B5** takes the component library port and
`components/ui/`, **B6** takes asset slicing, the clay migration across the 64
`BrandIcon` files, and the per-page audit sweep.

| Agent | Owns |
|---|---|
| **B1 Foundations and navigation** | The four container tiers, elevation, type scale, Figure, Odometer, SegmentedControl, ActionButton, Toast, StatusChip, Skeleton, motion tokens, the capsule dock, the side navigation, workspace navigation, round header controls, the raw-button migration |
| **B2 Money and documents, in Paper** | Checkout, processing, success, receipts, payments history, the wallet and its four balance states, deposit, withdrawal, transfer, escrow held state and release, conditions, milestones, disputes, transaction list and detail, agreements, move-in ledger, tenancy, statements, print and PDF, money email |
| **B3 Discovery, detail, social, member** | Landing, startup, welcome, auth, home, search, stays, restaurants, listing and stay and restaurant detail, Around, posts, stories, profiles, settings, referral hub, passport, verification, saved, notifications, assistant, support, the public site |
| **B4 Workspaces, admin, intelligence** | Host and agent dashboards, calendar, decide, reservations, rooms, photos, reviews, the listing wizard, Owner and Tenant command centres, the 38 admin desks, admin mobile, the chart system, Space Analytics, Listing Health, host analytics, the map design system |

**Shared, with one owner:** `app/globals.css` and the token files (B1), the i18n
locale files (B3 owns the split, others request keys), `components/ui/*` (B1).

---

## 7. STAGES

Each stage makes the next cheaper. **Do not start a stage before the one above it is
finished and checked.**

### Stage 1: Foundations (B1)

Nothing visual ships before these exist, or 200 pages get 200 one-off treatments.

Container tiers Plate, Card, Island and Sheet per north star section 4, both themes,
**with the blue-tinted shadow in Paper**, which is the single highest-value detail in
that register. Elevation tokens. The type scale, correcting the 11px dock label and
the 650 and 750 weights. `Figure` counting from zero at 620ms and never re-counting on
re-render. `Odometer` rolling per digit at 380ms staggered 20ms, moving only changed
digits. `SegmentedControl` with a spring thumb. **`ActionButton` with the eight roles
of north star 5A and the full morph**: idle, press sinking 1px with the bloom pulling
in, loading as rectangle-to-circle with an arc, done as circle-to-tick at 240ms, then
settle. Reference 7061. `Toast` as a dark pill with a leading tick. `StatusChip`
carrying label, shape and colour, **never colour alone**, because the palette is one
hue. Shaped `Skeleton` per route family. Motion tokens extended, and an `open` kind
added to `lib/motion/threshold.ts`. The 449 raw buttons migrated onto the one
primitive, guarded by `button-classes.test.ts`.

### Stage 2: Navigation (B1)

Per north star section 6. **The capsule dock** becomes a true floating Island: 999px
radius, 16px blur, navy glass at night, white with a blue-tinted shadow on Paper,
floating 12px clear of the safe area with content scrolling visibly beneath. The pill
springs to the tapped slot in 240ms, arriving before the route. The chosen slot widens
44 to 100 and reveals a 12px label. Glyphs go blue in Paper, closing a long-standing
partial item. The centre action is a filled 52px circle rotating 90 degrees into a
close. Counts are cyan, never red.

**The side navigation** becomes a continuous Island with the edge-light on its leading
border at night and a soft blue shadow on Paper. Plate rows. The active row gets a 3px
leading bar, a tinted fill and a brighter glyph, never a glow. Line glyphs at stroke
2.25, blue in both themes. The workspace coin keeps its dark ground in Paper. A
collapsed 72px icon-only desktop mode, remembered.

**Round header controls:** every header control becomes a 44px circle with the soft
shadow. The profile gear and the listing photo buttons are 14px squares today and are
the most visible cheapness in the product.

**The navigation audit** belongs here too, per the Third Addendum: for every flow,
check back, close, breadcrumb where useful, browser back, mobile back, Android
hardware back, iOS navigation, modal dismissal, nested pages, deep links,
notification routing and the destination after an action completes. Every screen gets
an intentional model. **Do not mechanically add a back button everywhere.**

### Stage 3: Startup, entry, brand (B3)

**`MOTION_SYSTEM.md` sections 3, 4 and 6 are the specification for this entire stage.**
Build from them rather than from the summary below, which predates them.

**Three things govern it.** The startup sequence is **1,500ms in six beats**, and
**Session 2 must land the `/open` deadline first**, because the eight seconds the
founder sees today is an unbounded network call rather than an animation duration. Get
Started **inherits the startup's final frame with the mark already in position**, so
the two screens are one continuous movement and the mark never re-enters. And the
**passcode screen is rebuilt**, because it is the screen a returning member sees more
than any other and the founder's assessment is that it is bad.

**Use `BrandAssemble` and `DepthWords` before writing anything new.** They exist and
they were built for this.


**Do not start until Session 2 has landed the `/open` deadline fix.** An animation
over an unbounded network call is a longer hang with better production values, and the
founder's spec is explicit: the animation must never conceal a broken initialisation
architecture, and the fix must not be a timer.

The startup sequence per north star section 8: navy ground matching the native splash
exactly so the handoff is invisible, the mark turning in from 12 degrees scaling 0.86
to 1 with its edge-light sweeping once, the wordmark letters arriving from depth 24ms
apart, the lockup settling with one soft bloom, then the door opening into the first
screen. 1,000 to 1,500ms, once per cold start, tap to skip, 160ms crossfade under
reduced motion, inline and nonce-carrying and CSS-only in the root layout so it never
waits on a chunk.

**The vector logo mark is a prerequisite.** Trace SVG from
`assets/brand-sheets/vallo-wordmark-source.png` and the mark sheets. A rotating,
scaling 614px raster will be visibly soft on a 3x screen, on the one screen that forms
a first impression.

**Android:** set `windowSplashScreenBackground` and `windowSplashScreenAnimatedIcon`
to match frame one. Neither is set today, so Android 12 and above shows the launcher
icon instead of the splash.

**The brand hierarchy (D1):** split the i18n keys so slogan, positioning and product
explanation are three strings with three jobs, then set them. The slogan stays English
in every locale as the wordmark does. The three how-it-works step titles currently
reuse the old slogan and need their own keys.

**The landing page**, which is the first thing an investor opens: hero on the new
hierarchy, the Space OS narrative across Trust, Discover, Intelligence, Transactions,
Operations and ecosystem, the move-in argument as its own band, premium Islands,
figures counting up, one glow, editorial information moments, dynamic cards, product
previews, layered motion, intelligent scroll, interactive space examples, animated
maps and a Space Passport demonstration. **Restraint: a serious venture-backed
product, not an over-designed template.** Social proof only where legitimate.

**Welcome, auth and onboarding:** four slides on matte clay art, the pager as a
sliding pill, one Island per auth screen on a photographic ground, a real resend
countdown, verify success as a full-screen moment then the door. **Fix the onboarding
handoff**: cold-start sign-up never carries `next`, so the interests and arrival
questions are skipped; and `/home` must actually use the answers, which it ignores
today. Session 2 provides the personalised query.

**Get Started becomes monotone and becomes the first screen after the animation**
(D13, north star 14.5). One hue, no secondary colour, no glow, no gradient beyond one
soft ground wash, in the spirit of reference 37. Generous top air, the mark small, one
display line saying what Vallo is, one quiet line beneath, then the doors, which are
**the only contrast on the screen**. No carousel, no phone mock, no feature list, no
social proof, no looping animation. The handoff is a 240ms crossfade from the startup
lockup's final frame with the mark already in position, so the two read as one
movement. This becomes the most seen screen in the product, so it carries the first
real impression after the brand moment.

**Onboarding beyond it is full-page** (14.6), in the spirit of reference 36: one idea
per page, large display type, a real illustration or product moment, generous air.
**No proof band until the numbers are real.** Reference 36 carries "1 Million
Creators" and press logos; Vallo has 16 accounts and no published listing, and
inventing proof would breach the honesty rules the platform rests on and be caught by
the claims lint.

**The offline card** gets the real logo instead of the inline building glyph.

### Stage 4: Money and documents, in Paper (B2)

The highest-trust family, where the references concentrate and where investors and
guests both decide whether this is real. **Build it like a document.**

**Two rails, and the interface must make which one a payer is on obvious without them
asking.** Escrow for rent, shortlet, apartment, land and sale; direct Paystack split
for hotels and restaurants.

**The escrow screens, which do not exist yet.** The **held state** is the clearest
screen in the product: what is held, by whom, what releases it, when. A payer must
never wonder where their money is. The **release action** is the most consequential
button in the product: the tenant or guest confirms arrival and that confirmation
releases money, so it gets the full morph, a confirm step, and is never reachable by
accident. **Milestone progress** for a sale as a path with ticks, each stage naming
what must be true. **Disputes** where both parties see the same timeline and the same
evidence, and no party sees a ruling before it is made. **The lister's side**: what is
held in their favour, what has released, what waits on a confirmation that is not
theirs.

**The wallet** with its four states Available, In Escrow, Pending and Processing, and
actions Add Money, Withdraw, Send, Transactions. **Never confuse available funds with
protected escrow.** Deposit. **Withdrawal** showing all eight disclosures: amount,
provider fee, VAT if applicable, total debited, expected received, destination
account, status, reference. Bank selection and account verification showing the
verified name before confirmation. **Transfer** with confirmation on anything
irreversible.

**Checkout** on reference 7038: Island summary, key-value details, radio method cards
each showing its own fee, the total before the action, the morph on Pay.
**Processing** on 7076: three real steps ticking **as they genuinely complete**, never
on a timer, with the promise that the member will never be double-charged. Use the
specified copy: "Preparing secure payment", "Verifying payment", "Confirming with
Payluk", "Protecting your funds", "Confirming withdrawal", "Waiting for bank
confirmation". **The payment confirmation screen** shows what is being paid, for what
space, the amount, the protection and provider, the agreement reference, and that the
payer is protected until the required conditions are satisfied. **No important
financial information in tiny text.**

**Receipts** on 7082: reference, two Confirmed rows, itemised total, download, share,
dispute. **The test is whether a Nigerian guest would screenshot it as proof of
payment.** If they would not, it is not finished. **Never fabricate a hash**: for
fiat a provider reference is not a blockchain hash.

**Transaction list and detail**, the detail showing Overview, Amount, Status, Parties,
Space, Agreement, Payment, Escrow, Conditions, Inspection, Fees, Provider, Reference,
Receipt and Timeline. **Payment history** with its six types and seven filters.

**The move-in ledger and price breakdown** on 7073, itemised and scannable with the
total as the hero figure, now including the tax lines Session 2 builds.
**Agreements** as a document register with a version diff, both confirmations and the
approval state as a timeline. **Tenancy and the caution register** as documented
exchanges.

**Print and PDF** (B-28): receipts, statements and agreements get printed, emailed and
taken to banks and lawyers. A print stylesheet and a PDF layout. **Money email in
Paper**, matching the on-screen receipt exactly, because a receipt that looks
different in email looks forged.

**Three honesty rules across all of it.** The protection differs per rail, so the
screen says which applies and never implies a payer has both. **Money values never
animate in a way that could imply money moved when it did not.** Status is never
communicated by colour alone: success, pending, failed, protected, disputed.

**The financial UI must not look like a generic banking clone or a crypto exchange.**
No excessive glass, no giant rounded containers everywhere, no gaming dashboard, no
clutter, no meaningless animation, no unnecessary gradients, no fake security
graphics. **And no second design system.**

### Stage 4B: Feature onboarding, Pro mode, plans and artefacts (B2 and B4)

Founder directives D11 to D15, specified in north star section 14. **Read that section
before starting this stage**, and look at references 34, 36, 37 and 38 yourself.

**The feature onboarding system (14.1).** One reusable system, not fifteen bespoke
screens: one to three full pages, one idea each, a dot pager, an always-reachable skip,
and a final action that is the thing itself rather than "Done". A route and never a
modal, so back behaves and a deep link reaches it. Once per member, remembered
server-side so it survives a device change. **It must teach something true**: the
table in 14.1 gives the one fact each feature's first run has to land. Build the system
first, then the eleven first runs on top of it. **Forbidden on sign-in, search and the
feed**: teaching somebody to scroll is how a premium product becomes annoying.

**Pro mode (14.2).** A member holding no entitlement **never sees the switch at all**.
Not greyed, not locked, not a padlock: absent. A disabled Pro control is an
advertisement pretending to be an interface. Entitled members get the switch in the
workspace header, carrying the word Pro, never a crown or a diamond or gold. Resolved
on the server every render, failing closed. **Pro changes depth, never access to the
truth**: price, fees, trust facts and money state are never behind a plan. Session 2
owns the entitlement check; you own its presence rule.

**Plan and paywall screens (14.3).** The anatomy in order: artefact, promise in one
line, three to five concrete benefit rows, two plan cards with the annual saving as a
real figure, a three-step "what happens next" timeline where there is a trial, one
primary action, and plain small type saying exactly what is charged, when, and how to
cancel. **Forbidden, and all four are in the references you were sent:** permanent
discount claims like "80% OFF FOREVER", countdowns on anything that is not a real
deadline, confetti on a purchase, and a preselected annual plan. A person hurried into
a plan will not trust the same product with their rent.

**Premium artefact cards (14.4).** Reference 38's fanned tier cards, as matte clay
credentials rather than mirror-finished cards, which is the one place we depart from
that reference because a mirror finish reads as a crypto product. Three artefacts
overlapping, the active one forward, a spring at 380ms bringing one forward, the stack
itself being the selector. Used for the Space Passport tier, trust tiers, Pro plans,
promotion tiers and an earned badge moment. **The hard limit: Vallo issues no payment
card.** No chip, no network mark, no long number. If it could be mistaken for a bank
card at a glance it is wrong.

**The light-mode icon fix (14.7).** The founder reports the current 3D icons still read
poorly on light, and the cause is material: glass needs a dark ground and goes muddy on
white. Two required changes: the clay migration already decided, and a ground on paper,
being a radius-14 plate at about 4% brand with a soft blue contact shadow so an object
never floats on pure white. **Acceptance rule: no clay asset ships until it has been
viewed on paper at 390px as well as on night.** The current set reached this state
precisely because assets were approved only on navy.

### Stage 4C: Streaks, sheets, comparison, inbox (B2, B3, B4)

North star section 15, from references 39 to 43.

**Standing streaks (15.1).** Session 2 owns the counting; **you own the display and the
earned moment.** The streak tile on the dashboard and the passport, the count as a
Figure with the window as small marks. The earned moment on reference 41, which is
earned so the celebration is honest: a quiet sunburst behind a matte clay medal,
scale-in at 620ms, the achievement named, one line saying what it means, then Share and
Back, with a tap replaying it once. **Breaking is quiet**: no flame going out, no loss
animation, no shaming. Paused says paused. The share card for an on-time rent record is
the strongest organic growth loop the platform has, because the recipient is usually a
prospective landlord, so design it as something a person is proud to send.

**The illustrated action sheet (15.2).** Reference 43, and the best sheet pattern in the
set: clay object on a soft radial ground, title, one line, hairline-separated rows each
with a small round tinted glyph plate and a chevron, one quiet dismiss. **This replaces
the generic list sheet everywhere** and is the reason a Vallo sheet will feel
considered rather than default.

**The comparison table (15.3)** for two saved spaces, this month against last, organic
against promoted, and quoted against actually paid. **Never against another member by
name, never a leaderboard.**

**Messages and inbox (15.4).** Reference 40: quoted reply blocks so a conversation about
a specific space stays legible, a day divider, an unread divider saying how many,
attachments as a bordered row with a type glyph, and **voice notes as a waveform with a
duration, which matters because Nigerian property conversations happen in voice notes**.
The inbox with filter chips, presence dots and cyan unread counts. The workspace
overview's top row of count cards as "what needs me today", each tapping straight into
that queue.

**The tab bar (15.5)** is confirmation rather than change: keep the capsule, the moving
pill and the raised centre, and add the soft ambient shadow under the raised item so it
reads as lifted rather than merely coloured.

**The trial timeline, and preselection corrected (15.6, D21).** The three-step timeline
is **required wherever a trial exists**, on reference 42's wording model: today
everything unlocked and nothing charged, the day before the end we remind you, the last
day it ends and cancelling before costs nothing. **The reminder step is the honest part
and most products omit it.** Preselection is now permitted when the full charge, the
charge date, the renewal terms and the cancel path are all visible on the same screen
at legible size without scrolling past the action. Still forbidden: permanent-discount
claims, countdowns that are not real deadlines, and confetti on a purchase.

### Stage 5: Discovery and detail (B3)

**`/home`** leads with a figure and is personalised by the interests it ignores today.
Clay category objects, staggered sections, the next action surfaced.

**Search** as one surface: filters in a Sheet, results on Cards with **the move-in
total leading and the rent beneath**, shaped skeletons, a map toggle with the pin
drop.

**Space detail**, the most important single screen: gallery with shared-element zoom
and 44px round controls, the move-in total as the hero figure, the itemised
breakdown, power and water and meter facts as clay-marked rows, **trust facts as
dates and never ticks**, the "Why trust this space?" surface, a sticky action bar, and
the agent card with an honest reply time. Stay and restaurant detail on the same frame
with their own leading figure.

**Price, areas and market intelligence:** odometer figures, period segments, a morphing
line chart, **hatched bars where data is thin**, which is reference 7083 and the single
most useful pattern for a platform this young.

**Empty states everywhere.** A clay object settling in, the honest reason, a way to
capture the demand. Every discovery surface is empty until supply arrives, so these
are not edge cases, they are the current product.

### Stage 6: Social and member (B3)

Around, posts, stories and profiles with premium Cards, story rings, a staggered feed
and the composer in a Sheet. Hide the social tab when the switch is off.

Profile with an Island hero and the 44px round gear. Sixteen settings screens on Plate
rows with one primitive. **The referral hub**: the code as a dashed ticket that unfolds
on 7045 and 7046, the ten user-side surfaces, progress to the next reward, the share
sheet. **Make the reveal feel like a gift**, because that is what the founder kept
replaying. **No investment-scheme framing, no downline, no passive-income language.**
**The Space Passport** with facts as dates, the tier on the 7050 template and a share
card. Verification as a progress path where each rung names what was actually checked.

### Stage 7: Workspaces and intelligence (B4)

Host and agent dashboards on reference 7033: a figure hero plus a list, today's next
action, 2x2 figure tiles counting up. Earnings and statements **in Paper** on 7056.
**Owner and Tenant command centres**, which do not exist. Calendar, decide,
reservations, rooms, photos, reviews with premium Cards, bulk actions and a photo
intake that visibly accepts a large batch. The listing wizard with a progress path on
7110, autosave and clay step art.

**The chart system first** (B-26), before any analytics screen. **Load the `dataviz`
skill before writing the first line of chart code.** There are no chart primitives and
no chart colour rules, and the palette is deliberately one hue so a colour per series
is unavailable. Define chart types per question, a categorical ramp that works in both
themes within a single hue, empty and sparse states using the hatched-bar pattern, axis
and label rules, tooltip behaviour, and non-colour encoding. Then Space Analytics with
its eleven metrics and four ranges, Listing Health with its six explanations and six
recommendations, host analytics which does not exist, and promotion performance with
organic versus promoted comparison. **Never manufacture a number.**

**The map design system** (B-27): pins, clusters, selected and hovered, heat, bounds,
the empty viewport, and the listing with no pin.

### Stage 8: Admin (B4)

**The admin panel is Vallo's internal operating system, not a secondary dashboard.**
Keep the density, add the material system: Plate rows, Card panels, figure tiles on
the overview, the command palette on 7067, status chips by label and shape, **the
Money desk and the nine financial desks in Paper**.

**Admin mobile is rebuilt as first class**, per the founder: navigation, tables, cards,
filters, search, detail pages, actions, approvals, verification, reports, fraud review,
financial views, audit logs, charts, responsive layouts, touch targets, sticky actions,
bottom sheets, mobile-safe modals, scrolling, keyboard, safe areas. **Do not simply
shrink desktop tables onto a phone.** Design mobile workflows.

Cover the eight required area groups in feature register H2, and **do not assume a
usable control surface exists because a table does.**

### Stage 8B: Notifications, email, and inner-page depth (B2, B3)

North star section 16. Founder directives D22, D23, D25.

**Notification preview and full view.** Every notification has both and both are
designed. The preview is the list row, the push body and the email subject, and **it
must be actionable without opening**: "Rent of ₦1,200,000 is due on 14 October", never
"You have a new notification". The full view is **a designed screen per event family**,
reached by a route so back behaves and a deep link lands, carrying what happened, when,
who, the figure and its breakdown, the one action the event asks for, a link to the
object, and the timeline before it. It is never a generic detail page and it never
dead-ends. Several events on one object group into one expandable row. Counts are
cyan, never red.

**The notification centre** with filter chips for All, Money, Trust, Spaces, Messages
and Account; unread first then chronological with day dividers; mark all read; and
per-family preferences two taps away, so somebody who wants money SMS but not social
push can say so.

**Email, rebuilt (16.5).** The founder's assessment of the current emails is that they
look like nothing. **In light mode every email is a white background**, no grey wash,
no dark card on light. Money and document emails follow Paper; a receipt is always
Paper. The anatomy in order: wordmark with the slogan quiet beneath, a **clay object**
naming the family, the subject as a display line, the consequence in one sentence, the
**figure large and tabular** where there is money, detail as **key-value rows** rather
than prose, **one primary button as a rounded rectangle at radius 14, never a pill**,
with a plain-text link beneath for clients that strip buttons, then a quiet footer.

**Build the components**, because the founder asked for components rather than text:
figure block, key-value table, itemised breakdown with a total rule, status chip,
timeline, space card with photograph and move-in total, person row, receipt block with
dual confirmation rows, verification code block, quiet callout. **Icons at last**: the
clay object in the header plus line glyphs in the rows, every image with alt text and a
fallback so a client that blocks images still leaves a readable email. **A receipt
email matches the on-screen receipt exactly**, because one that differs looks forged.

**Inner pages (16.6).** **When a screen carries more than one job, the second job
becomes an inner page.** An overview answers "what needs me and how am I doing"; an
inner page answers one question completely, with its own motion, back destination, and
empty, loading and error states. The table in 16.6 gives the split for wallet, escrow,
referrals, analytics, passport, workspaces, settings and admin. **You own the
information architecture and have authority to split any surface.** Not clicks for
their own sake: it is the difference between a dashboard read in three seconds and a
wall a person scrolls past.

**Demo labelling comes off (D24).** Remove the visible demo and example labelling from
listing cards and detail pages: no "this is a demo" text, no example badge. **The
listings themselves stay**, and the founder removes the rows at launch. What you must
not draw on a demo listing is any trust signal it has not earned: no verified badge,
no inspection date, no fabricated rating. A demo listing may look like a real listing;
it must never look like a checked one.

**Beta chips** where Session 2's maturity flag says so: small, quiet, honest about
something live and still settling. **The chip does not go on money, trust or
verification surfaces**, because a person about to send rent should not read "Beta"
beside the Pay button. **That is about the label only. Those features are fully
built**, and their screens are in your Stage 4 and Stage 4B work.

### Stage 9: One product (B3, B4)

**App, website, docs, legal and admin must not look like five unrelated products.**
Shared brand, typography, terminology, tokens, tone, navigation principles, visual
quality and responsive behaviour. The mega menu on 7086, real typographic hierarchy in
guides and docs, the calculator leading with its figure, the verification doors as
single confident answers, **legal pages in Paper as documents**.

Email: dark shell for notification and lifecycle mail, **Paper for every receipt and
statement**, a clay object in the header, large tabular figures, one action per
message.

---

## 8. THE PER-PAGE AUDIT

**Every page.** Run the 24-point checklist in north star section 12 on each page in a
stage before calling the stage done. Record per stage: pages audited, pages changed,
checklist failures and their resolution.

The founder asked for this explicitly. A sweep that restyles 200 pages without
checking them is how a redesign ships with horizontal scroll on a phone, 11px labels
and a contrast failure in sunlight.

## 9. UX REQUIREMENTS, non-negotiable

One subject per screen, one primary action, one glow. Four container tiers only, one
edge treatment each. Nothing below 12px, at most three weights, sentence case
everywhere including buttons. Every figure tabular and through `formatMoney`.
**Trust facts as dates, never ticks; a null never looks negative.** **The whole cost
before the action that incurs it, fee beside amount at the same visual weight.**
Banned words stay banned: demo, sample, preview, coming soon, not live, lorem. **Money
sentences read from `lib/money/copy.ts` and you may not write a new one.** Shaped
skeletons, never spinners. No "Something went wrong": useful recovery. Transform and
opacity only, entrances at or under 620ms, stagger at most six. Reduced motion and
data saver are features: everything collapses to instant or a 160ms fade and blur
drops to a solid surface. Nothing blocks interaction. No parallax, no autoplaying
video, no confetti, no streaks, no countdown that is not a real deadline, no mascots,
no badge wall, no neumorphism, no four-hue charts. **Not a gaming interface.**

## 10. OUT OF SCOPE

Migrations, money logic, RLS, server-action authorisation, provider adapters: Session
2. If a screen needs data that does not exist, say so in your response file with the
route rather than inventing a query. Test repair and store submission: Session 4.

**Do not:** reopen the locked decisions, add glossy or bevelled or neon 3D, write a
new money sentence, render a trust signal as a tick, bury the move-in total beneath
the rent, use a banned word, invent a synonym for a mandated term, add a spinner
where a shaped skeleton belongs, ship a fifth container tier or two edge treatments on
one container, animate anything that blocks interaction, or touch a migration or the
ranking formula.

## 11. ACCEPTANCE CRITERIA

1. The Stage 1 primitives exist, each defined in exactly one place.
2. Dock and side navigation upgraded, both kept. Every header control a 44px circle.
3. The navigation audit complete, with a recorded model per screen.
4. Startup animation live, after the `/open` fix, from a vector mark, skippable,
   correct under reduced motion, matching the native splash at frame one.
5. The brand hierarchy split into three keys and set.
6. Checkout, processing, receipts and the wallet in Paper, with all eight withdrawal
   disclosures and real ticking steps.
7. The escrow held state, release action, conditions, milestones and disputes exist
   and say which protection applies.
8. A chart system exists before any chart, with sparse and empty states.
9. Space Analytics, Listing Health and host analytics drawn.
10. Admin mobile usable on a phone, not shrunken tables.
11. App, website, docs, legal, admin and email share one visual language.
12. Every page in every stage passed the 24-point checklist, recorded.
13. No horizontal scroll at 390, checked at 390, 768 and 1440, both themes, four
    locales.
14. The feature onboarding system exists once and carries all eleven first runs.
15. Pro mode is absent for unentitled members, verified by signing in as one.
16. Plan screens carry no countdown, no permanent-discount claim, no confetti and no
    preselected plan.
17. Artefact cards exist as matte credentials and could not be mistaken for a bank card.
18. Get Started is monotone and is the first screen after the animation.
19. **Every clay asset checked on paper at 390px as well as on night**, with any whose
    edges disappear on white rejected and regenerated.
20. Streak tiles and the earned moment exist, with quiet breaking and a paused state.
21. The illustrated action sheet replaces the generic list sheet everywhere.
22. Inbox carries quoted replies, unread dividers and voice-note waveforms.
23. Every trial screen carries the three-step timeline including the reminder step.
24. Every notification has an actionable preview and a designed full view per family.
25. Emails are white in light mode, component-built, with a clay object and line
    glyphs, and a receipt email matches its screen exactly.
26. No screen carries two jobs: the second became an inner page.
27. The startup sequence runs 1,500ms in six beats, skippable, holding honestly on the
    settled lockup if the app is not ready, and never starting before the `/open` fix.
28. Get Started inherits the startup's final frame with no re-entrance of the mark.
29. The passcode screen is rebuilt: dots as the subject, a pop and haptic per digit, a
    quiet shake with no red flash, and the same door as the startup on success.
30. Every moment in the motion inventory built, with shipped durations recorded against
    the specified ones, and verified under reduced motion and data saver on a real
    mid-range Android.
31. No GSAP in the application bundle. No Three.js in the product.
32. The component library ported: every colour a token, every icon `UiIcon`, no
    invented data, no spinner, framer-motion only via `LazyMotion`.
33. The craft doctrine's seven questions answered for every flagship surface.
34. Typecheck and lint green. The glow count reduced and the lint ratcheted.

## 12. YOUR RESPONSE FILE

Write `docs/sessions/SESSION-3-RESPONSE.md`, current as you work, ending with the nine
mandatory headings: **Completed, Changed, Tested, Failed, Remaining, Decisions, Risks,
Next Session, Do Not Repeat.**

It must also contain: the primitives with their single definition point; **per stage,
pages audited, pages changed, checklist failures and resolutions**; the motion
inventory as actually built with shipped durations against the 24 moments;
**before-and-after screenshots at 390 and 1440 in both themes for every flagship
surface**, because the founder studies before-and-after and two of his references are
literally redesign comparisons; every asset generated and every asset still needed;
anything you could not build for want of data, with the route, for Session 2; which
end-to-end specs you knowingly broke, for Session 4; **which reference images drove
which surface**; the light-mode check result per clay asset; and what you would do next
with another week.
