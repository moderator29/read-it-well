# SESSION 3 HANDOFF: The platform-wide experience upgrade

**From Session 1, 5 October 2026.** Copy this whole file as your opening brief.

**The founder's instruction, in his words:** take the platform to a next
generation international look, from the landing page to the last page. Premium
vibes, like a company worth far more than this one. Generational. Something big
investors fall in love with. Everyone should feel safe and feel premium. Keep the
capsule bottom navigation and the side navigation, but upgrade both. Premium
containers. Lots of motion and animation. **Audit every single page as part of
the upgrade.**

**You own:** every pixel and every millisecond. Layout, structure, position,
containers, type, figures, icons, motion, the startup experience, onboarding,
checkout and receipts, dashboards, analytics screens, email templates, the native
shell's offline card.

**You do not own:** migrations, money logic, row-level security, server-action
authorisation, provider adapters. If a screen needs data that does not exist, say
so in your response document rather than inventing a query.

---

## Read before writing a single line

1. **`docs/design/VISUAL_NORTH_STAR_2026-10-05.md`, in full.** It is your
   specification. The four decisions in its section 1 are locked by the founder
   and you may not reopen them.
2. The 79 reference images in `docs/design/references/2026-10-05/`. **Look at the
   twelve canonical ones yourself** before designing the surface each maps to.
   Many are video frames, so read sequences as motion, not as stills.
3. `docs/design/CLEAN_UNIFIED_DIRECTION.md` and `docs/TRACK_M_MOTION_PLAN.md`,
   both still live.
4. `docs/sessions/SESSION-1-RESPONSE.md` sections 3, 5, 11, 12.
5. `docs/sessions/NEW-FEATURES.md`. Items 12, 13, 20, 21 and 31 to 45 are yours.
6. `docs/design/CHATGPT_ASSET_PROMPTS.md`, for every asset you need generated.
5. `docs/PRODUCT.md` section 7, the terminology table. **The words are not yours
   to change.** Listing, agent, member, guest, stay, reservation, Around, place,
   post, story, standing, stop, the console, workspace.

---

## The four locked decisions

Do not relitigate these.

**D1. Theme leads by surface.** Night for landing, startup, auth, home, search,
stays, restaurants, detail, Around, profile, saved, notifications, assistant and
the lister dashboards. **Paper** for checkout, pay, receipts, payments history,
earnings, statements, agreements, the move-in ledger, tenancy, the caution
register, the Money desk, the legal pages and every emailed receipt. Both themes
still work everywhere; this sets which one leads. An explicit member choice always
wins.

**D2. Icons.** Matte clay 3D for content objects at 32px and above. Line glyphs on
flat plates for all chrome below 32px. **Glossy, bevelled, chrome, neon-rimmed and
glass 3D are banned**, because gloss is the strongest visual marker of betting and
crypto apps and it costs Vallo the cautious renter it most needs.

**D3. Full redesign, surface by surface.** You may restructure, re-order, change
what leads, and move navigation. End-to-end specs will break; Session 4 repairs
them. The capsule dock and the side navigation are both kept and both upgraded.

**D4. The signature is oversized live figures.** Large tabular naira figures
leading every screen that has a number, counting up on arrival, re-rolling like an
odometer when they change, with sliding-pill segmented controls and a primary
action that morphs into a tick. Typography stays Poppins display and Inter text:
no serif, no new display face, because four locales need Inter's coverage of ₦,
Yorùbá, Igbo and Hausa diacritics.

---

## Read before you start

1. `docs/design/VISUAL_NORTH_STAR_2026-10-05.md` — in full. Your specification.
   The four locked decisions in its section 1 are not reopenable.
2. `docs/sessions/FEATURE-REGISTER.md` — **section I is yours**, plus every screen
   named in E2, E3, E4, E6, D9, D10, G, H3 and J3 to J9.
3. `docs/sessions/BLIND-SPOTS.md` — B-26 no chart system, B-27 no map design, B-28
   no print design, B-29 email, B-30 photography, B-31 localisation are yours.
4. `docs/design/CHATGPT_ASSET_PROMPTS.md` — a complete standalone prompt per asset.
5. The 79 reference images in `docs/design/references/2026-10-05/`. **Look at the
   twelve canonical ones yourself** before designing the surface each maps to. Many
   are video frames, so read sequences as motion.
6. `docs/PRODUCT.md` section 7, the terminology table, and conflict C-3 in the
   feature register, which stages the Space rename.

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

1. **Foundations before surfaces.** Build the primitives in Stage 1 first.
   Skipping this gives 200 pages 200 one-off treatments, which is exactly how a
   platform stops feeling like one product.
2. **One subject per screen.** One figure, one primary action, one glow. A screen
   with two primaries has none. The current host home has two and that is the bug
   to stop repeating.
3. **Four container tiers only.** Plate, Card, Island, Sheet. Never invent a
   fifth. One edge treatment per container: a hairline, or a ring, or a shadow,
   never two.
4. **Transform and opacity only** in animation. Entrances at or under 620ms.
   Stagger at most six items. Nothing blocks interaction.
5. **Reduced motion and data saver are features, not fallbacks.** Everything
   collapses to instant or a 160ms fade, and blur drops to a solid surface.
6. **Nothing below 12px.** At most three weights per screen. Sentence case
   everywhere, including buttons.
7. **Every figure is tabular and goes through `formatMoney`.** Never float money,
   never divide by 100.
8. **Banned words stay banned:** demo, sample, preview, coming soon, not live,
   lorem. A test enforces it.
9. **Money sentences read from `lib/money/copy.ts`.** You may not write a new
   sentence about how money moves. If the words need to change, that is a legal
   act and it is Session 2's with counsel.
10. **Trust facts render as dates, never as ticks.** "Inspected 12 July 2026" is
    a fact a reader can weigh. A null is not a negative and must never look like
    one.
11. **The whole cost before the action.** The move-in total leads and the rent is
    secondary. The fee sits beside the amount at the same visual weight. This is
    the product's entire differentiator and no screen may bury it.
12. **Glow budget:** one primary per view, plus the dock, plus the hero band. The
    current 134 glow declarations come down and the lint ratchets.
13. **Run the section 12 checklist on every page in a stage** before calling the
    stage done, and name what you audited in your response document.
14. **Maximum four agents**, file ownership declared before work starts. Two
    agents never hold the same stylesheet.

---

## Stages

Work in this order. Each stage makes the next cheaper. Do not start a stage before
the one above it is finished and checked.

### Stage 1: Foundations

No visual change ships before these exist.

- **Container tiers** as CSS and components: Plate, Card, Island, Sheet, per the
  north star's section 4, both themes, with the blue-tinted shadow in Paper, which
  is the single highest-value detail in that register.
- **Elevation tokens:** flat, raised, floating, overlay, dialog. A component picks
  a level and never writes a shadow.
- **Type scale** per north star section 5, correcting the 11px dock label and the
  650 and 750 weights.
- **`Figure`**: large, tabular, counts from zero on mount at 620ms, never
  re-counting on re-render.
- **`Odometer`**: per-digit roll at 380ms staggered 20ms, moving only the digits
  that changed.
- **`SegmentedControl`**: sliding pill with a spring at 240ms, content crossfade
  at 160ms.
- **`ActionButton`**: the full morph. Idle, press sinking 1px with the bloom
  pulling in, loading as pill-to-circle with an arc, done as circle-to-tick at
  240ms, then settle. **Reference 7061. This is the most memorable interaction
  available to this product, so build it properly.**
- **`Toast`**: dark pill rising 16px with a leading tick, 240ms in, 2,400ms dwell,
  160ms out. Never red unless it is an error.
- **`StatusChip`**: label plus shape plus colour. Never colour alone, because the
  palette is one hue.
- **`Skeleton`** shapes per route family. There are already 99 `loading.tsx`
  files; four families still use a generic skeleton and they get shaped ones.
- **Motion tokens** extended for the new moments, and an `open` kind added to
  `lib/motion/threshold.ts`.
- **Consolidate the 449 raw `<button>` elements** onto the one primitive, guarded
  by `button-classes.test.ts`, and fix the segmented thumb radius.

### Stage 2: Navigation

Per north star section 6.

- **The capsule dock** becomes a true floating Island: 999px radius, 16px blur,
  navy glass at night, white with a blue-tinted shadow on paper, floating 12px
  clear of the safe area with content scrolling visibly beneath. The pill springs
  to the tapped slot in 240ms, arriving before the route. The chosen slot widens
  44 to 100 and reveals a 12px label. Glyphs go blue in Paper, which closes the
  long-standing partial item. The centre action is a filled 52px circle that
  rotates 90 degrees into a close. Counts are cyan, never red.
- **The side navigation** becomes a continuous Island with the edge-light on its
  leading border at night and a soft blue shadow on paper. Plate rows. The active
  row gets a 3px leading bar, a tinted fill and a brighter glyph, never a glow.
  Line glyphs at stroke 2.25, blue in both themes. The workspace coin keeps its
  dark ground in Paper. A collapsed 72px icon-only desktop mode, remembered.
- **Workspace navigation** adopts the same rows and treatments, so a lister moving
  between host, agent and the member app meets one product.
- **Round header buttons:** every header control becomes a 44px circle with the
  soft shadow. The profile gear and the listing photo buttons are 14px squares
  today and that is the most visible cheapness in the product.

### Stage 3: Startup and entry

**Do not start until Session 2 has landed the `/open` deadline fix.** An animation
over an unbounded network call is a longer hang with better production values.

- **The startup animation**, north star section 8: the five-beat sequence, inline
  and nonce-carrying and CSS-only in the root layout so it never waits on a
  chunk, once per cold start, tap to skip, 160ms crossfade under reduced motion,
  the native splash hiding on first paint so the two never fight.
- **A vector logo mark is a prerequisite.** Produce SVG from
  `assets/brand-sheets/`. A rotating, scaling 614px raster will be visibly soft on
  a 3x screen.
- **Android:** set `windowSplashScreenBackground` and
  `windowSplashScreenAnimatedIcon` to match frame one. Neither is set today, so
  Android 12+ shows the launcher icon instead of the splash.
- **The landing page**, which is the first thing an investor opens: hero on the
  brand line, the move-in argument as its own band, premium Islands, figures
  counting up, one glow, the capsule band, store badges live once the URLs exist.
- **Welcome and the four slides** on matte clay art, the pager as a sliding pill.
- **Auth, 11 pages:** one Island per screen on a photographic ground, pill
  actions, a real resend countdown, the verify success as a full-screen moment,
  then the door.
- **Onboarding wiring:** the interests and arrival questions are built and are
  skipped on a cold start because sign-up carries no `next`. Fix the handoff so a
  new member is actually asked what they are looking for, where they are, and how
  they found Vallo. Then **use the answers on `/home`**, which currently ignores
  them.
- **The offline card** gets the real logo instead of an inline building glyph, the
  navy ground, one Island, one pill action.

### Stage 4: Transaction, in Paper

**Two rails now, and the interface must make which one a payer is on obvious
without them having to ask.** The founder decided on 5 October: escrow through
Payluk for rent, shortlet, apartment, land and sale; direct Paystack split for
hotels and restaurants. Architecture in
`docs/payments/VALLO_PAYMENTS_ARCHITECTURE.md` section 3A. Session 2 builds the
rails; you build what a person sees.

**The escrow rail needs screens that do not exist yet:**

- **The held state.** The clearest screen in the product. What is held, by whom,
  what releases it, and when. A payer must never wonder where their money is.
  "Held by Payluk until you confirm you have moved in" is the sentence; take the
  exact wording from `lib/money/copy.ts` once Session 2 has it approved.
- **The release action.** The tenant or guest confirms arrival, and that
  confirmation releases the money. This is the single most consequential button in
  the product, so it gets the full morph (motion 7) and a confirm step, and it is
  never reachable by accident.
- **Milestone progress for a sale:** deposit, title and documents verified,
  completion. A path with ticks on reference 7110, each stage naming what has to
  be true before it releases.
- **Raising a dispute**, and following one. Both parties see the same timeline and
  the same evidence. No party ever sees a ruling before it is made.
- **The lister's side:** what is held in their favour, what has released, what is
  awaiting a confirmation that is not theirs to give.

**The direct rail keeps today's flow** and gets the full restyle below.

**One honesty rule across both:** the protection differs per rail, so the screen
says which one applies. On escrow the hold is the protection; on direct it is the
Vallo Guarantee. Never imply a payer has both.

The highest-trust family, where the founder's references concentrate, and where
investors and guests both decide whether this is real. Build it like a document.

- **Checkout** on reference 7038: Island summary, key-value details, radio method
  cards **each showing its own fee**, the total before the action, the morph on
  Pay.
- **Payment processing** on 7076: three real steps ticking **as they genuinely
  complete**, never on a timer, with the promise that the member will never be
  double-charged. That copy is a trust pattern and it is worth taking almost
  verbatim.
- **Success** as a full-screen moment, then the receipt.
- **Receipts** on 7082: reference, two Confirmed rows, itemised total, download,
  share, dispute. **The test is whether a Nigerian guest would screenshot it as
  proof of payment.** If they would not, it is not finished.
- **The move-in ledger and price breakdown** on 7073: itemised, honest, scannable,
  with the total as the hero figure.
- **Bookings** on 7071, with status chips by label and shape.
- **Agreements** as a document register with a version diff, both confirmations
  and the approval state as a timeline.
- **Tenancy and the caution register** as documented exchanges.
- **Email receipts** in Paper, matching the on-screen receipt exactly, because a
  receipt that looks different in email looks forged.

### Stage 5: Discovery and detail

- **`/home`** leads with a figure and is personalised by the interests it
  currently ignores. Clay category objects, staggered sections, the next action
  surfaced.
- **Search** as one surface: filters in a Sheet, results on Cards with **the
  move-in total leading and the rent beneath**, shaped skeletons, a map toggle
  with the pin drop.
- **Listing detail**, the most important single screen in the product: gallery
  with shared-element zoom and 44px round controls, the move-in total as the hero
  figure, the itemised breakdown, power and water and meter facts as clay-marked
  rows, trust facts as dates, a sticky action bar, the agent card with an honest
  reply time.
- **Stay and restaurant detail** on the same frame with their own leading figure.
- **Price and areas:** odometer figures, period segments, a morphing line chart,
  **hatched bars where data is thin**, which is reference 7083 and is the single
  most useful analytics pattern for a platform this young.
- **Empty states everywhere:** a clay object settling in, the honest reason, and a
  way to capture the demand. Every discovery surface is empty until supply
  arrives, so these are not edge cases, they are the current product.

### Stage 6: Lister workspaces

- **Host and agent dashboards** on reference 7033: a figure hero plus a list,
  today's next action, 2x2 figure tiles counting up.
- **Earnings and statements in Paper** on 7056: the earnings figure, period
  segments, the delta, the chart morph, the statement as a document.
- **Agent analytics** on 7065 and 7083.
- **Host analytics, which does not exist.** Session 2 provides the query layer;
  you build the screen.
- **Calendar, decide, reservations, rooms, photos, reviews:** premium Cards, bulk
  actions, and a photo intake that visibly accepts a large batch.
- **The listing wizard and host application** with a progress path on reference
  7110, autosave, and clay step art.

### Stage 7: Member, social, public site

- **Profile:** Island hero, the 44px round gear replacing the 14px square, counts
  as figures.
- **Settings, 16 screens:** Plate rows, grouped, one primitive, the toggle spring.
- **`/settings/invite`, the referral hub:** the code as a dashed ticket that
  unfolds on references 7045 and 7046, the earned figure, progress to the next
  reward, the share sheet. **Make the reveal feel like a gift**, because that is
  what the founder kept replaying.
- **`/settings/passport`, the Space Passport:** facts as dates, the tier on the
  7050 template, a share card. This already exists as `renter_passports`; make it
  feel like the credential it is.
- **Verification** as a progress path where each rung names what was actually
  checked.
- **Around, posts, stories, profiles:** premium Cards, story rings, a staggered
  feed, the composer in a Sheet. Hide the tab when the switch is off.
- **The public site,** 27 pages: the mega menu on 7086, real typographic
  hierarchy in guides and docs, the calculator leading with its figure, the
  verification doors as single confident answers, **legal pages in Paper as
  documents**.

### Stage 8: Admin, 38 pages

Operators get the premium too, because a console that feels considered is how a
small team stays accurate at 2am. Keep the density, add the material system: Plate
rows, Card panels, figure tiles on the overview, the command palette on 7067,
status chips by label and shape, **the Money desk in Paper**, tables scrolling
horizontally inside their panel, the rail folding to a drawer below 1024.

### Stage 9: Email and the shell

Dark shell for notification and lifecycle mail, **Paper for every receipt and
statement**, a clay object in the header, large tabular figures, one action per
message.

---

## The per-page audit

**Every page.** Run the 24-point checklist in north star section 12 on each page
in a stage before calling the stage done. Record in your response document, per
stage: pages audited, pages changed, and anything that failed a check and why.

The founder asked for this explicitly. A sweep that restyles 200 pages without
checking them is how a redesign ships with horizontal scroll on a phone, 11px
labels and a contrast failure in sunlight.

---

## Assets

North star section 11 holds the full generation prompts. Priorities:

1. **The vector logo**, which blocks Stage 3.
2. **The matte clay set**, completing the commissioned family. **Matte, never
   glossy.**
3. **Twelve empty-state objects**, because every discovery surface is empty today.
4. **Success and badge art** for the reveal moments.
5. **Email header objects.**
6. **Store screenshots** from the shipped build, handed to Session 4.

Photography for the landing and the store must be licensed and must never imply it
is Vallo inventory. The honest answer is real listings, which is why supply is
priority one platform-wide.

---

## What you must not do

- Reopen the four locked decisions.
- Add glossy, bevelled or neon-rimmed 3D anywhere.
- Write a new sentence about how money moves.
- Render a trust signal as a tick, or make a null look negative.
- Bury the move-in total beneath the rent.
- Use a banned word, or invent a synonym for a term in PRODUCT.md section 7.
- Add a spinner where a shaped skeleton belongs.
- Add confetti, a streak, a countdown that is not a real deadline, a mascot, or a
  badge wall.
- Ship a fifth container tier, or two edge treatments on one container.
- Animate anything that blocks interaction.
- Touch a migration, a server action's authorisation, or the ranking formula.

---

## Your response document

Write `docs/sessions/SESSION-3-RESPONSE.md`. It must contain:

1. The primitives you built, with file paths, and the one place each is defined.
2. **Per stage: pages audited, pages changed, checklist failures and their
   resolution.**
3. The motion inventory as built, with the actual durations shipped, against the
   24 moments in north star section 7.
4. Before-and-after screenshots at 390 and 1440, in both themes, for each
   flagship surface. The founder studies before-and-after; two of his references
   are literally redesign comparisons.
5. Every asset generated, and every asset still needed.
6. Anything you could not build because the data does not exist, with the route
   and what is needed, for Session 2.
7. Which end-to-end specs you knowingly broke, for Session 4.
8. What you would do next with another week.
