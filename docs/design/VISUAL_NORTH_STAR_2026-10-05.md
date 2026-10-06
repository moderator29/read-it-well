# Vallo visual north star and platform-wide sweep

**Written by Session 1, 5 October 2026.** The governing visual, material and
motion specification for the full-platform next-generation upgrade. Derived from
79 founder reference images in `docs/design/references/2026-10-05/` and four
decisions the founder locked on 5 October.

**Scope: every single page. Landing to the last screen.** 200 product pages, 27
public pages, the admin console, the email templates and the native shell. No
surface is exempt and every surface is audited as part of the upgrade.

**Supersedes on conflict:** `DESIGN_DIRECTION.md`, `design/GLOW_IDENTITY.md`,
`BRAND_MARKS.md`, `ICON_UPGRADE_2026-09-29.md`,
`ICONS_3D_INVENTORY_2026-09-30.md`, `ICONS_3D_WISHLIST_2026-09-30.md`. Those
five are archived by this document. `design/CLEAN_UNIFIED_DIRECTION.md` and
`TRACK_M_MOTION_PLAN.md` remain live and are extended here, not replaced.

---

## 1. The four locked decisions

Settled by the founder, 5 October 2026. Not reopenable by a later session.

### D1. Theme leads by surface

> **AMENDED BY FOUNDER DIRECTIVE D28.1, 6 OCTOBER.** The member's chosen theme governs
> the whole application and **Dark stays the default**. Paper is no longer a screen
> register: it is **a treatment for the document itself**. On a dark canvas a receipt,
> statement, agreement or transaction detail renders as a light document sheet sitting
> on the dark surface, the way a receipt sits on a desk, with the chrome and navigation
> around it staying in the member's theme. The table below therefore says which
> surfaces are **documents**, not which flip the application.

Both themes continue to work on every screen. What changes is which one **leads**.

| Register | Surfaces | Leads |
|---|---|---|
| **Night** | Landing, startup, welcome, auth, home, search, stays, restaurants, listing and stay detail, Around, stories, profile, saved, notifications, assistant, host and agent dashboards | Deep navy `#010118`, electric blue glow, navy glass islands |
| **Paper** | Checkout, pay, receipts, payments history, earnings, statements, agreements, move-in ledger, tenancy, caution register, the Money desk, invoices and every emailed receipt | Warm paper `#F4F4F1`, white surfaces, navy ink, soft blue shadow |

**The reason, stated so nobody undoes it:** a receipt should read like a
document, not like an interface. The founder's references show exactly this split
without being asked to: every wallet and dashboard reference is dark, and every
bill, receipt, itemised breakdown and payment-processing reference is light. A
Nigerian guest about to send real money is reading the screen for proof that this
is not a scheme, and paper reads as proof.

A member who has chosen Light or Dark explicitly always gets their choice. The
lead applies to System and to first visit.

### D2. Icons: matte clay for content, line glyphs for chrome

| Tier | What | Where | Rule |
|---|---|---|---|
| **Clay** | Matte royal-blue 3D objects, warm-spark accent permitted on one detail | Content objects at 32px and above: property and space types, categories, success moments, empty states, onboarding art, email headers, tier and badge art | **Matte only. Never glossy, bevelled, chrome, neon-rimmed or glass.** |
| **Line** | Stroked glyphs on a 24 grid, inheriting `currentColor`, on a flat `IconPlate` | All chrome below 32px: navigation, rows, settings, buttons, chips, status, form affordances, table headers | Stroke 1.9 inside, 2.25 navigation. No glow, no rim |
| **Brand** | The logo, the hero scenes, the startup lockup | Logo lockup, landing hero, onboarding illustration | Artwork, not an icon tier |

**Glossy 3D is banned**, and the reason is specific rather than aesthetic: it is
the single strongest visual marker of betting and crypto products, several of
which appear in the reference set and are classified AVOID in section 9. A
property platform that looks like a coin app loses the cautious renter it most
needs. Matte clay reads as crafted; gloss reads as a scheme.

### D3. Full redesign, surface by surface, with motion as the personality

Every page may be restructured: what leads it, the order of its sections, its
hierarchy, its containers, its figures, its motion. Navigation **keeps the
capsule bottom dock and the side navigation** and both are upgraded rather than
replaced.

End-to-end specs will break. Session 4 repairs them. That cost is accepted.

Many of the reference images are frames from videos, which is why motion is not a
finishing pass here. It is half the specification. See section 7.

### D4. The signature: oversized live figures

Every screen that has a number leads with it, large and tabular, counting up on
arrival and re-rolling like an odometer when it changes. With it: sliding-pill
segmented controls, and a primary action that morphs into a tick.

Typography stays **Poppins display, Inter text**. No serif and no new display
face, because ADR-006 chose Inter for coverage the brand genuinely needs: the
naira sign, Yorùbá `ẹ ọ ṣ`, Igbo `ị ọ ụ`, Hausa `ɓ ɗ ƙ ƴ`, and tone marks
stacking over vowels that already carry a dot below. A display face that breaks
on those is not a style choice, it is a defect in four locales.

---

## 2. What premium means here

The founder's instruction: the platform must feel like a company worth far more
than it is, investors should fall in love with it, and **everyone should feel
safe and feel premium at the same time.**

Those two feelings are usually in tension. Luxury products signal exclusivity;
safety products signal transparency. The resolution is the whole design thesis:

> **Vallo earns premium by being the most honest screen in the room.**

Premium here is not ornament. It is the confidence to show the whole number, name
the fee, date the inspection, tick the steps as they actually complete, and leave
space around all of it. Cheap products hide the total and decorate the edges.

**The six properties every screen must have:**

1. **One subject.** One figure, one primary action, one thing the eye lands on
   first. If a screen has two primaries it has none.
2. **Air.** Generous vertical rhythm. Crowding is the clearest signal of a cheap
   product, and it is free to fix.
3. **The whole truth, early.** The move-in total before the rent. The fee beside
   the amount. The processor named. The date rather than a tick.
4. **Material consistency.** Four container tiers, section 4. Nothing invents a
   fifth.
5. **Motion that explains.** Every animation answers where something came from,
   what changed, or how far along it is. Decoration that answers nothing is cut.
6. **Legible in Lagos sunlight on a cheap Android panel.** The test that kills
   most premium designs. Contrast is not negotiable and blur is droppable.

**The one-line direction:** a well-run Nigerian bank app that happens to be
beautiful. Calm surfaces, one honest naira figure, receipts worth screenshotting
as proof, real photographs of real spaces instead of ornament, motion as the
personality, and night as the signature with paper for documents.

---

## 3. Colour

The palette does not change. Its discipline tightens.

| Role | Night | Paper |
|---|---|---|
| Canvas | `#010118` | `#F4F4F1` |
| Surface | `#040A1F` to `#0A1231` | `#FFFFFF` |
| Primary | `#0C6AEF` electric | `#005FE8` |
| Royal | `#2B3FE0` | `#2B3FE0` |
| Ink on canvas | White to 72% | `#010118` to 72% |
| Success | Emerald | Emerald |
| Error, overdue | Rose | Rose |
| Attention | Bright cyan | Bright cyan |
| Warm spark | `#FF6A3D` | `#E4541F` |

**Warm spark stays on its enumerated list** and gains one entry: a single accent
detail permitted on a clay object. It is never a button fill, never body text,
never a status, and never a second primary. One spark per screen at most.

**Because the palette is one hue, colour alone may never be the only signal.**
Every status, state and category must also differ by label, shape or icon.

**Glow budget, enforced:** one glowing primary per view, plus the dock, plus the
hero band. Everything else is flat or ringed. The current count of 134 glow and
135 backdrop-filter declarations comes down, and the lint should ratchet it.

---

## 4. The premium container system

> **Founder directive D28.2.** These four tiers are **a formalisation of shapes the
> product already uses**, not a new system imposed over it. The radii, the navy glass
> material, the edge light and the blue family all stay. What changes is that
> elevation, edge treatment and two-theme behaviour become consistent and deliberate.
> **The test: a member who used Vallo last week should open it and feel they are in the
> same product, only better.**

Four tiers. Nothing invents a fifth. This is the thing that will make 200 pages
feel like one product.

### Tier 1: Plate

Flat, quiet, for rows and list items. Radius 14. No shadow, no glow. Night: a
2% white wash with a 6% hairline. Paper: white with a 6% ink hairline. Hover and
press tint only.

Used by: settings rows, list items, table rows, message rows, nav rows,
amenity rows, benefit rows.

### Tier 2: Card

The workhorse. Radius 18, or 22 when it carries a figure.

- **Night:** surface fill, a 1px top highlight at 10% white falling to
  transparent by 40% height, one ambient shadow `0 1px 2px` plus
  `0 8px 24px -8px` in near-black, and the gradient ring brightest at the upper
  left. One subtle inner top hairline so the card reads as lit from above.
- **Paper:** white fill, no border, and a blue-tinted shadow
  `0 1px 2px rgba(1,1,24,.04), 0 8px 24px -10px rgba(0,95,232,.16)`. The blue
  tint in the shadow is what stops white cards on a warm canvas looking flat and
  grey, and it is the single highest-value detail in Paper.

Used by: listing cards, booking cards, figure tiles, analytics tiles, receipt
blocks, form groups.

### Tier 3: Island

The hero container, one per screen at most. Radius 26 to 32.

- **Night:** navy glass. Backdrop blur 16, a navy fill at 72%, the moving
  edge-light on the border box, and a wider ambient bloom beneath.
- **Paper:** white, elevated, with a stronger blue-tinted shadow and a faint
  blue inner glow at the top edge. Never a border.

Used by: the figure hero, the balance or total block, the landing hero, the
startup lockup, the tier hero, the receipt summary.

### Tier 4: Sheet

Overlays. Radius 32 on the leading corners only, a 36px grabber, backdrop blur
ramping from 0 to 12 over the entrance, and a scrim at 56%.

Used by: create, filters, payment method, share, confirm, success.

### Elevation

Five levels, tokenised per theme: `flat`, `raised` (Card), `floating` (Island),
`overlay` (Sheet), `dialog`. A component picks a level; it never writes a shadow.

### The hairline rule

Every container has exactly one edge treatment: a hairline, or a ring, or a
shadow. Never two. Doubling edges is the most common way a careful design starts
looking cheap.

---

## 5. Typography

| Role | Face | Size | Weight | Notes |
|---|---|---|---|---|
| Hero figure | Poppins | 56 to 72 | 600 | Tabular, tight tracking, optical left-align |
| Figure | Poppins | 32 to 40 | 600 | Tabular |
| Display | Poppins | 28 to 34 | 600 | Page titles |
| Title | Inter | 20 to 24 | 600 | Section heads |
| Body | Inter | 15 to 16 | 400 to 450 | 1.55 line height |
| Label | Inter | 13 | 500 | Above a figure, quiet, sentence case |
| Overline | Inter | 12 | 600 | Minimum size anywhere. Replaces the 11px dock label |
| Mono | Inter tabular | 13 to 15 | 450 | References, transaction ids, codes |

**Rules.** Sentence case everywhere, including buttons. At most three weights per
screen. All figures tabular. Naira always through `formatMoney`. Never a size
below 12. The 11px dock label and the 650 and 750 weights currently in the dock
are corrected by this document.

---

## 5A. The button system

**Master spec section 40 is explicit: "Do not make every button a pill."** A
product where every control is a pill reads as a template, which is the opposite
of this brief. Buttons must feel designed, which means the shape carries meaning.

| Role | Shape | Radius | Use |
|---|---|---|---|
| **Primary** | Rounded rectangle, confident and wide | 14 | The one action a screen exists for. Full width on a phone, intrinsic on desktop. Carries the view's single glow |
| **Secondary** | Rounded rectangle, outlined or tinted | 14 | The alternative. Same size and weight as the primary, never a pill, so the pair reads as a genuine choice |
| **Tertiary and inline** | Text, underlined on hover | none | Low-commitment navigation inside content |
| **Chip and filter** | Pill | 999 | **Pills are for selectable, removable, plural things**: filters, interests, categories, tags. This is where a pill carries meaning |
| **Segmented** | Pill track, pill thumb | 999 | Period and view switches. The sliding thumb is the signature |
| **Icon control** | Circle | 50% | 44px header controls, the dock centre, floating actions |
| **Destructive** | Rounded rectangle, rose | 14 | Never a pill, never glowing, always behind a confirm |
| **Sticky bar action** | Rounded rectangle, full width | 14 | Checkout, booking, escrow release. Sits above the safe area |

**The rules.** One primary per screen. Press sinks 1px and pulls its bloom in.
The primary morphs into a tick on success (motion 7). Sentence case always. A
destructive action never sits flush beside a primary. Minimum touch target 44px.
**The 999px radius is reserved for the chip, segment and circle roles**, so that
seeing a pill tells a person the thing is selectable.

## 6. Navigation: both kept, both upgraded

The founder was explicit: keep the capsule bottom dock and keep the side
navigation. Upgrade both.

### 6.1 The capsule dock

Keeps its shape, slots and the pill that moves on tap. What changes:

- **Material.** It becomes a true floating Island rather than a bar: 999px
  radius, 16px backdrop blur, the navy glass fill at night and white with a
  blue-tinted shadow on paper, floating 12px clear of the safe area with the
  content scrolling visibly beneath.
- **The pill.** Spring to the tapped slot, 240ms, arriving before the route does.
  The chosen slot widens from 44 to 100 and reveals its label at 12px, 600.
- **Glyphs.** Line tier, solid-cutout when active. Blue in Paper rather than
  ink, which closes the long-standing partial item. The inactive glyphs and the
  menu glyph both move to brand blue in Paper.
- **The centre action.** A filled 52px circle, one of the two permitted glows,
  rotating 90 degrees into a close affordance when its sheet opens.
- **Badges.** A 16px count on messages and notifications, cyan, never red: red
  is reserved for genuine error.
- **Auto-hide** on scroll down, return on scroll up, 240ms, already built.

### 6.2 The side navigation

Keeps its flat structure. What changes:

- **Material.** The rail becomes a continuous Island surface rather than a
  panel, with the edge-light running its leading border at night and a soft blue
  shadow separating it from content on paper.
- **Rows.** Plate tier. The active row carries a 3px leading bar in brand blue, a
  tinted fill and a brighter glyph. Never a glow.
- **Icons.** Line tier at stroke 2.25, blue in both themes.
- **The workspace coin** keeps its dark ground in Paper so the logo never sits on
  white.
- **Counts** right-aligned, tabular, cyan.
- **Theme choice** stays at the foot.
- **Desktop** gains a collapsed 72px icon-only mode with tooltips, remembered per
  member.

### 6.3 Workspace navigation

Host and agent navigation adopt the same Plate rows, the same active treatment
and the same figure hierarchy, so a lister moving between the two workspaces and
the member app meets one product.

---

## 7. The motion system

Many references are video frames. Motion is specification, not polish.

**Tokens.** Durations 90, 160, 240, 380, 620, 900. Press 120. Entrance 520.
Eases: standard, entrance, exit, spring, press. Transform and opacity only.

### 7.1 The motion inventory

| # | Moment | Specification |
|---|---|---|
| 1 | **App open** | Mark turns in, letters arrive from depth, lockup settles 0.86 to 1, a door opens into the first screen. 1,000 to 1,500ms, once per cold start, tap to skip. Section 8 |
| 2 | **Route transition** | Grows from the tapped element's origin, folds back to it on Back. Built; extend the origin map to every new surface |
| 3 | **Tab change** | Crossfade plus a 12px lift, 240ms |
| 4 | **Figure arrival** | Counts from zero, 620ms, entrance ease, once per mount. Never re-counts on re-render |
| 5 | **Figure change** | Odometer: each digit rolls, 380ms, staggered 20ms left to right. Only the digits that changed move |
| 6 | **Segmented control** | Pill springs to the chosen segment, 240ms. Content crossfades 160ms |
| 7 | **Primary action** | idle, press sinks 1px and pulls the bloom in, loading morphs the pill into a circle with an arc, done morphs the circle into a tick at 240ms, then settles. The reference set shows this repeatedly and it is the single most memorable interaction available |
| 8 | **Toast** | Dark pill rises 16px with a leading tick, 240ms in, 2,400ms dwell, 160ms out. Never red unless it is an error |
| 9 | **Sheet** | Rises with entrance ease at 380ms while the scrim blur ramps 0 to 12 |
| 10 | **List stagger** | First six items only, 40ms apart, 12px lift and fade |
| 11 | **Card press** | Scale 0.985, 120ms |
| 12 | **Code or reward unfold** | The ticket unfolds, its dashed border draws, the code lands, 520ms. For referral codes and earned badges |
| 13 | **Full-screen success** | Tick scales in over a radial wash, 620ms, with the amount and counterparty beneath |
| 14 | **Payment processing** | Three real steps ticking as each genuinely completes, with the line that promises no double charge. Never a fake sequence on a timer |
| 15 | **Chart morph** | The line path interpolates between periods at 380ms. Bars grow from the baseline, staggered 30ms |
| 16 | **Skeleton to content** | Crossfade 160ms. Shaped skeletons only, never a spinner |
| 17 | **Pull to refresh** | The brand mark rotates with the drag and spins once on release |
| 18 | **Photo open** | Shared-element zoom from the tapped thumbnail |
| 19 | **Map pin** | Drops 12px and settles with a spring; the selected pin lifts |
| 20 | **Status change** | Label and colour crossfade together, 240ms. The shape changes too |
| 21 | **Empty state** | The clay object settles in, 520ms, then the copy fades |
| 22 | **Badge earned** | A quiet sunburst behind the medal, scale-in, then a share affordance. Real milestones only |
| 23 | **Dock pill** | Section 6.1 |
| 24 | **Form error** | The field shakes 4px once, 160ms, and its message fades in beneath. Never a dialog |

### 7.2 The refusals

Reduced motion collapses everything to instant or a 160ms fade; tokens already
collapse to 1ms. Data saver and low-end devices drop blur, keeping a solid
surface. No animation ever blocks interaction. No parallax. No autoplaying
video. No confetti. No streak flames. No countdown that is not a real deadline.

---

## 8. The startup animation

**Root-cause first.** `/open` still makes an unbounded auth call. An animation
over a hanging request is a longer hang with better production values. Fix the
deadline before building this.

**Where it lives.** Not the iOS launch screen, which cannot animate by rule. Not
the native shell, which only loads offline. It belongs in the first route as an
inline, nonce-carrying, CSS-only overlay in the root layout, the way the landing
intro already works, so it never waits on a JavaScript chunk.

**The sequence**, extending `TRACK_M_MOTION_PLAN.md` §1a:

| Time | What |
|---|---|
| 0 to 120ms | Navy ground, matching the native splash exactly so the handoff is invisible |
| 120 to 480ms | The mark turns in from 12 degrees, scaling 0.86 to 1, its edge-light sweeping once |
| 380 to 720ms | The wordmark letters arrive from depth, 24ms apart, blur 6 to 0 |
| 720 to 980ms | The lockup settles; a soft bloom breathes once |
| 980 to 1,320ms | The door opens: the ground splits and the first screen is revealed beneath |

**Rules.** Once per cold start, gated on sessionStorage and the native shell. Tap
to skip. A 160ms crossfade under reduced motion. The native splash hides on first
paint so the two never fight. `lib/motion/threshold.ts` gains an `open` kind
beside `door` and `leave`; `ThresholdStage` is already mounted.

**Blocker: there is no SVG logo.** The mark is a 614 by 587 PNG. Scaling and
rotating a raster mark will be visibly soft on a 3x screen. **A vector mark is a
prerequisite**, and the source sheets in `assets/brand-sheets/` are where it
comes from.

**Android.** Set `windowSplashScreenBackground` and
`windowSplashScreenAnimatedIcon` so the Android 12+ system splash matches frame
one. Today neither is set, so the system shows the launcher icon instead of the
splash, which has never been checked on a device.

---

## 9. The 79 references, classified

All 79 viewed. Many are consecutive frames of the same video, which is itself the
signal that motion is the point. Duplicate frames are marked and are not
weakened references, they are evidence of which motions the founder replayed.

**Verdicts: BORROW** take the pattern nearly as-is. **ADAPT** take the idea,
reject the styling. **AVOID** including duplicate frames and off-brand products.

| File | What it shows | Verdict | Maps to |
|---|---|---|---|
| 7025 | Dark bookkeeping home, segmented toggle, net balance hero, expanding FAB | ADAPT | Earnings home: figure hero, ledger, expanding action |
| 7026 | Amount entry, giant numeral, custom numpad, swipe to confirm | ADAPT | Amount entry; swipe-to-confirm for irreversible money |
| 7027 | Same, typed amount, slider mid-drag | ADAPT | Confirm state |
| 7028 | Toast over blurred home, radial wash | ADAPT | Transaction toast; emerald for credit |
| 7030 | Duplicate frame | AVOID | |
| 7031 | Balance recounts after action | ADAPT | Odometer re-roll, motion 5 |
| 7032 | Betting app splash, floating glossy 3D | AVOID | Gloss and betting adjacency: exactly what D2 bans |
| 7033 | Before and after collection app, hero numeral, segmented, glass tiles | BORROW | Host dashboard: figure hero plus list. Canonical |
| 7034 | Paywall with a three-step trial timeline | ADAPT | "What happens next" timeline for bookings |
| 7035 | Onboarding with scored cards, gauges, social proof row | ADAPT | Onboarding proof row; gauge to trust score |
| 7036 | Savings circles, streak and goal cards, comparison table | ADAPT | Referral hub. Streaks rejected |
| 7037 | Transfer success screens, green check, rate us, share receipt | BORROW | Payment success and share receipt |
| 7038 | Enlistment flow in dark and light, hero summary, key-value list, radio cards | BORROW | Checkout structure, and proof the theme split works |
| 7039 | Glassy add-to-calendar pill | ADAPT | Booking confirmation action |
| 7040 | Glossy circular arrow button | ADAPT | Component only; gloss rejected |
| 7041 | Neumorphic date pills, selected state | ADAPT | Date selector; neumorphism rejected |
| 7042 | Decorative traffic lights | AVOID | No mapping |
| 7043 | Streak badge reveal, sunburst medal, share | ADAPT | Badge earned moment, motion 22. Milestones only, never streaks |
| 7044 | Splash on brand swirl, photo login, journey home | BORROW | Startup tone and auth: quiet, photographic. Canonical |
| 7045 | Invite code in a dashed ticket pill with copy | BORROW | Referral code. Canonical |
| 7046 | Invite reveal state | BORROW | Referral unfold, motion 12 |
| 7048 | Card app home, balance, deposit, promo carousel, fanned tiers | ADAPT | Money home layout. Fake urgency rejected |
| 7049 | Duplicate | AVOID | |
| 7050 | Tier page: hero, three stats, benefit rows, sticky CTA | BORROW | Trust tiers and lister plans. Canonical template |
| 7051 | Top tier, holographic | ADAPT | Same template. Staking language rejected |
| 7052 | Onboarding slide, frosted card over phone, cashback versus referrals | BORROW | Earnings versus referral split card |
| 7053 | Tier explainer, fanned cards | ADAPT | Passport tier explainer |
| 7054 | Partner perks logo grid | ADAPT | Partner perks for listers |
| 7055 | Rewards tab, progress chip, invite, all-time card | ADAPT | Referral hub. Urgency chips rejected |
| 7056 | Earnings card, bar chart, period toggle, monthly delta | BORROW | Host analytics hero. Canonical |
| 7057 | Transition frame | AVOID | |
| 7058 | Withdraw amount, arrival estimate, quick-fill chips | BORROW | Payout amount; the estimate line is a trust win |
| 7060 | Black pill button, idle | ADAPT | Motion 7, frame 1 |
| 7061 | Pill morphs to circle with tick | ADAPT | Motion 7. Canonical |
| 7062 | Music player card | AVOID | No mapping |
| 7063 | Toggle switch spring | ADAPT | Settings toggles |
| 7064 | Segmented control with sliding pill | BORROW | Motion 6. Canonical primitive |
| 7065 | Analytics card, odometer figure, line chart | BORROW | Motions 4, 5, 15. Canonical |
| 7066 | Same, period changed, chart reflowing | BORROW | Motion 15 |
| 7067 | Command palette with result rows | ADAPT | Admin lookup; search suggestions |
| 7068 | Dark pill toast with tick | BORROW | Motion 8. Canonical |
| 7069 | Duplicate | AVOID | |
| 7071 | Bill flow: list with status chips, method, receipt | BORROW | Payments and receipts architecture. Canonical |
| 7072 | Transition frame | AVOID | |
| 7073 | Itemised bill, overdue chip, meter, charges | BORROW | Move-in and price breakdown. Canonical |
| 7074 | Itemised total, PDF, share and dispute tiles, sticky pay bar | BORROW | Receipt actions |
| 7075 | Payment methods with the fee shown per method | ADAPT | Method sheet with Nigerian rails and honest fees |
| 7076 | Processing with a three-step checklist and the no-double-charge line | BORROW | Motion 14. Copy to lift almost verbatim. Canonical |
| 7078 | Frame | AVOID | |
| 7079 | Frame | AVOID | |
| 7080 | Confirmed, receipt blurring in | ADAPT | Success entrance |
| 7081 | Receipt body, reference, amount still rolling | BORROW | Receipt body |
| 7082 | Full receipt, two Confirmed rows, download | BORROW | Dual confirmation. Canonical |
| 7083 | Bento revenue tile, hatched empty bars, target line | BORROW | Analytics with sparse data. Canonical for a young platform |
| 7084 | Activity donut animating in | ADAPT | Booking source donut; four hues rejected |
| 7085 | Frame | AVOID | |
| 7086 | Web mega-menu, icon plus title plus description rows | BORROW | Help index, admin sections, web nav |
| 7087 | Line icon set comparison | ADAPT | The line tier decision in D2 |
| 7092 | Nigerian fintech page, navy, naira amounts | ADAPT | Local baseline to differentiate from |
| 7105 | App Store screenshot set, three-word headline, press logos | ADAPT | Store screenshots and landing |
| 7110 | Course modules, progress path with ticks | ADAPT | Lister onboarding checklist |
| 7111 | Eighty gamification badges, rainbow | AVOID | Badge wall reads as a game. Six restrained badges maximum |
| 7112 | Duplicate | AVOID | |
| 7113 | Four-app grid, serif numerals, gold coins | ADAPT | Figure hero idea; serif rejected per D4, coins rejected |
| 7114 | Frame | AVOID | |
| 7115 | Spending chart with 3D coin slices | ADAPT | Flatten to stacked bars |
| 7116 | Gradient orb loader | ADAPT | A searching state |
| 7117 | Frame | AVOID | |
| 7118 | Status flow card, new expense sheet | ADAPT | Listing approval status; lister expense |
| 7119 | Payment method as four tiles | ADAPT | Card, transfer, USSD, credit |
| 7120 | Revenue chart tile | ADAPT | Host revenue tile |
| 7121 | Plan card with checklist, selected tile | ADAPT | Plan selection |
| 7122 | Frame | AVOID | |
| 7123 | Frame | AVOID | |
| 7126 | Premium paywall, benefits, two plans | ADAPT | Lister plan page; hot gradient rejected |
| 7128 | WhatsApp status rings | ADAPT | Host updates as stories; the native sheet idiom |
| 7135 | Six-screen store set, streak, discount offer | ADAPT | Store set grid only; growth tactics rejected |
| 7136 | Frame | AVOID | |
| 7137 | Frame | AVOID | |

**Tally:** 22 BORROW, 33 ADAPT, 24 AVOID, of which 17 are duplicate or
transition frames.

### The twelve canonical references

Pinned, and a later session should look at these before designing the matching
surface: **7082** receipt with dual confirmation, **7076** processing with the
no-double-charge promise, **7073** itemised breakdown, **7071** list to method to
receipt, **7050** tier template, **7058** payout with an arrival estimate,
**7056** earnings with a period toggle, **7033** figure hero plus list,
**7065** odometer and morphing chart, **7045** with **7046** the code unfold,
**7038** checkout in both themes, **7044** startup and auth tone.

### What the founder is drawn to, across the whole set

One large figure as the headline. Odometer digits. Sliding-pill segments. Tier
pages with a hero object, three stats and a benefit list. Itemised receipts with
dual confirmation. Explicit "what happens next" step lists. Before-and-after
studies, meaning the reasoning matters as much as the result. Bento analytics
tiles with hatched empty bars. Big soft-shadowed buttons, though **master spec
section 40 overrules the obvious reading of these: "Do not make every button a
pill." See section 5A.** Micro-interaction studies.
Reveal and unfold moments for codes and rewards. Frosted cards floating over a
device. One considered icon family.

### What we refuse, and why

| Refused | Appears in | Why |
|---|---|---|
| Token, staking, coin language | 7051, 7052, 7055 | A decade of Nigerian coin schemes. Reads as fraud to the careful renter |
| Glossy and bevelled 3D | 7032, 7039, 7040, 7113 | The strongest betting-app marker. Banned by D2 |
| **Daily-habit** streaks and app-open streaks | 7036, 7043, 7135 | Finding a home is not a daily habit. **Corrected by D17: earned standing streaks that count real behaviour with a counterparty are built, and are among the strongest features in the plan. Section 15.1** |
| Countdown urgency | 7048, 7055, 7135 | Only real deadlines: check-in, an agreement window, a genuine promotion with a visible end |
| Confetti | 7135 | Cheapens a real transaction |
| Mascots and bro copy | 7025, 7031, 7034 | Real money and real homes |
| Badge walls | 7111 | Six restrained badges, each meaning something |
| Neumorphism | 7039 to 7042 | Fails contrast on cheap panels in sunlight |
| Four-hue charts | 7084, 7115 | Brand plus neutral plus one semantic |
| Fake progress | 7076 if timed | Steps must tick when they actually complete |
| Hidden fees | counter-example 7075 | Always show the fee beside the amount and the total before Pay |

---

## 10. Surface-by-surface sweep

**Every page is audited and upgraded.** Families below, with what leads, which
theme and the specific changes. A session works a family at a time and does not
leave it half done.

### A. Entry and brand

| Surface | Theme | Upgrade |
|---|---|---|
| Startup | Night | Section 8. The deadline fix first |
| `/` landing | Night | Hero on the brand line, the move-in argument as its own band, premium Islands, the capsule band, store badges live once the URLs exist. Figures count up. One glow |
| `/welcome` | Night | Four slides on clay art, the pager as a sliding pill, the question beat gaining the arrival asks on cold start |
| Auth, 11 pages | Night | One Island per screen, photographic ground, pill actions, the code screen with a real resend countdown, the verify success as a full-screen moment, then the door |

### B. Discovery

| Surface | Theme | Upgrade |
|---|---|---|
| `/home` | Night | **Leads with a figure.** Up next, or the saved count, or the area's typical move-in total. Personalised by interests, which it currently ignores. Clay category objects. Staggered sections |
| `/search`, `/stays/search` | Night | Search as one surface, filters in a Sheet, results on Cards with the move-in total leading and the rent secondary, hatched skeletons, map toggle with pin drop |
| `/stays`, `/restaurants` | Night | Figure hero for the area, clay type row, Cards |
| `/price`, `/areas/*` | Night | Odometer figures, period segments, line chart morph, hatched bars where data is thin |
| Empty states | Night | Clay object settling in, the honest reason, and a demand capture |

### C. Detail

| Surface | Theme | Upgrade |
|---|---|---|
| `/listing/[id]` | Night | Gallery with shared-element zoom and 44px round controls, **the move-in total as the hero figure with the rent beneath**, the itemised breakdown on 7073, power, water and meter facts as clay-marked rows, trust facts as dates never ticks, a sticky action bar, the agent card with an honest reply time |
| `/stay/[id]` | Night | Same with nightly rate leading and the total for the dates below |
| `/restaurant/[id]` | Night | Same with per-head and the window picker |

### D. Transaction: the Paper register

The most important family. It is where the founder's references concentrate and
where trust is won.

| Surface | Theme | Upgrade |
|---|---|---|
| `/checkout`, `/checkout/[id]` | **Paper** | 7038 structure: Island summary, key-value details, radio method cards each showing its own fee, the total before the action, motion 7 on Pay |
| Payment processing | **Paper** | Motion 14: real steps ticking as they complete, plus the no-double-charge line from 7076 |
| Success | **Paper** | Motion 13, then the receipt |
| `/payments`, receipts, `/record/[code]` | **Paper** | 7082: reference, dual Confirmed rows, itemised total, download, share, dispute. Worth screenshotting as proof |
| `/bookings`, `/bookings/[id]` | **Paper** | 7071 status chips: label and shape, never colour alone |
| `/agreements/*` | **Paper** | Document register, version diff, both confirmations, the approval state as a timeline |
| Rent and move-in, `/rent/*` | **Paper** | The move-in ledger as an itemised document with the total as the hero figure; the share split as named rows |
| `/tenancy/*`, caution | **Paper** | Register, deductions, returns, a dispute as a documented exchange |
| `/pay/crypto/[ref]` | **Paper** | Leave the logic alone; restyle only |

### E. Social

| Surface | Theme | Upgrade |
|---|---|---|
| `/around`, places | Night | Premium Cards, story rings, staggered feed, composer in a Sheet |
| `/post/[id]`, `/stories/*` | Night | Sequence motion, share card |
| `/u`, `/u/[handle]` | Night | Profile Island, badge row, counts as figures |
| Paused state | Night | Hide the tab when the switch is off |

### F. Member

| Surface | Theme | Upgrade |
|---|---|---|
| `/profile` | Night | Island hero, 44px round gear replacing the 14px square, counts as figures, clay row marks |
| `/settings` and 16 children | Night | Plate rows, grouped, one primitive, toggle spring |
| `/settings/invite` | Night | **Referral hub**: the code as a dashed ticket that unfolds (7045, 7046), earned-to-date figure, progress to the next reward, share sheet |
| `/settings/passport` | Night | **The Space Passport.** Facts as dates, tier on the 7050 template, share card |
| `/saved`, `/notifications` | Night | Cards, compare, severity by label and shape |
| `/verification` | Night | Ladder as a progress path (7110), each rung naming what was actually checked |
| `/assistant`, `/support` | Night | Message Cards, streamed answer, the searching orb |

### G and H. Lister workspaces

| Surface | Theme | Upgrade |
|---|---|---|
| `/host`, `/agent/dashboard` | Night | **7033: figure hero plus list.** Today, next action, 2x2 figure tiles counting up |
| `/host/earnings`, `/agent/earnings` | **Paper** | 7056: earnings figure, period segments, delta, chart morph. Statement as a document |
| `/agent/analytics` | Night | 7065 and 7083: odometer, morphing chart, hatched bars, funnel |
| **Host analytics: new** | Night | Does not exist. Build on the agent funnel's model and its privacy rules |
| Calendar, decide, reservations, rooms, photos, reviews | Night | Premium Cards, bulk actions, photo intake accepting a large batch |
| `/agent/list`, `/host/apply` | Night | Wizard with a progress path, autosave, clay step art |

### I. Admin, 38 pages

Night. It keeps its density and gains the material system: Plate rows, Card
panels, figure tiles on the overview, the command palette on 7067, status chips
by label and shape, and the Money desk in **Paper** because it is a money
surface. Tables stay horizontally scrollable inside their panel; below 1024 the
rail folds to a drawer. **Operators deserve the premium too**, and a console that
feels considered is how a small team stays accurate at 2am.

### J. Public site, 27 pages

Night, except the legal and policy pages which go **Paper** as documents. Mega
menu on 7086. Guides and docs with real typographic hierarchy. The move-in
calculator leading with its figure. The verification doors as single confident
answers.

### K. Email

Dark shell for notification and lifecycle mail; **Paper for every receipt and
statement**. Clay object in the header. Figures tabular and large. One action.

### L. Native shell

The offline card gets the real logo instead of an inline building glyph, the
navy ground, one Island, one pill action, and copy that says what is happening.

---

## 14. Feature onboarding, Pro mode, plans and premium artefacts

Added 6 October from founder directives D11 to D16 and five further references.

### 14.1 The feature onboarding system

**Every significant feature gets a designed first run.** Not fifteen bespoke screens:
**one reusable system** with a consistent shape, so a person learns the grammar once
and every later feature feels familiar rather than novel.

**The shape.** One to three full-page panels, never a tooltip tour. Each panel is one
idea: a short headline in display type, one line of body, one piece of art or one real
product moment, and nothing else. A dot pager. A skip that is always reachable and
never hidden. A final panel whose action is the thing itself, not "Done".

**The rules.**

- **Once, remembered, dismissible.** Keyed per feature, per member, server-side so it
  survives a device change. Never re-shown because a cache cleared.
- **It must teach something true.** A first run that only decorates is deleted. The
  wallet's first run explains what Available and In Escrow mean; escrow's explains who
  holds the money and what releases it; the referral hub's explains what qualifies.
- **It never blocks.** Skip lands on the working feature, not a dead end.
- **It respects reduced motion**, collapsing to a 160ms fade.
- **It is a route, not a modal**, so back behaves and a deep link can reach it.

**Where it is required**, each with the one true thing it must teach:

| Feature | What the first run must make clear |
|---|---|
| Wallet | Available against In Escrow, and that Vallo never holds it |
| Escrow and protected payment | Who holds the money, what releases it, what happens in a dispute |
| Withdrawal | Where it lands, what the fee is, how long it takes |
| Referral hub | What qualifies a referral, when the reward lands, and that it is not an investment scheme |
| Space Passport | What is on it, who can see it, how to share it |
| Verification | What each rung actually checks |
| Space Analytics | What the figures count and who can see them |
| Promotion | What is bought, what is not bought, and that rank is never for sale |
| Host and agent workspace | The one thing to do today |
| Owner and Tenant command centre | What this surface is for |
| Agreements and inspections | What has to happen before payment opens |

**Where it is forbidden:** sign-in, search, the feed, and anything a person reaches
more than weekly. Teaching someone how to scroll is how a premium product becomes
annoying.

### 14.2 Pro mode

When a member holds a paid plan or paid feature, a **Pro switch** appears and flips
the surface into its Pro state. **A member holding nothing never sees the switch.**

| State | What is shown |
|---|---|
| **No entitlement** | No switch, anywhere. The ordinary surface, complete and unapologetic. At most **one** honest route to the plan, placed where the need is felt, never a banner on every screen |
| **Entitled, Pro off** | The switch, off, in the workspace header beside the existing controls |
| **Entitled, Pro on** | The switch, on, and the surface in its Pro state |

**The switch itself:** a segmented control or a labelled toggle, 999px, carrying the
word Pro, never a crown, never a diamond, never gold. **Never a locked padlock
control**: a disabled Pro switch is an advertisement pretending to be an interface,
and it is banned.

**Fails closed.** No entitlement resolved means no switch, and the entitlement is
checked on the server on every render, never inferred in the browser.

**What Pro changes** is depth, not access to the truth: more history, more comparison,
export, bulk actions, deeper analytics. **A Pro state never hides a fact a free
member needs to transact safely.** Price, fees, trust facts and money state are never
behind a plan.

### 14.3 Plan and paywall screens

From references 7034, 7126, 34 and 35. The honest version of a pattern that is usually
dishonest.

**The anatomy**, in order: the artefact (14.4) or a single clay object; the promise in
one line; **three to five benefit rows**, each a line glyph plus a concrete benefit,
never an adjective; the plans as **two cards, monthly and annual**, annual showing its
real saving as a figure rather than a shout; the price large and tabular; **what
happens next as a three-step timeline** when there is a trial, which is reference
7034's best idea; one primary action; and beneath it, in plain small type, exactly what
is charged and when, and how to cancel.

**Forbidden, and all four appear in the references:** "80% OFF FOREVER" and any
permanent-discount claim; countdown timers and "1 day only" on anything that is not a
real deadline; confetti on a purchase; and a preselected annual plan the person did
not choose. A person who feels hurried into a plan will not trust the same product
with their rent.

### 14.4 Premium artefact cards

Reference 38's fanned metallic cards with "Select your tier" is the treatment for
every tier, credential and membership Vallo has: the Space Passport, trust tiers, Pro
plans, promotion tiers.

**The artefact.** A flat rounded rectangle at radius 18, in the plate proportion, with
a quiet material difference per tier rather than a colour change: matte navy, then
royal, then matte navy with one thin warm edge line. Floating level at a slight
three-quarter angle so its thickness reads. **Matte, never glossy**, which is the one
place this specification departs from reference 38, whose cards are mirror-finished
and would read as a crypto product here.

**The fan.** Three artefacts overlapping with the active one forward, the others
receding in scale and opacity. Tapping or swiping brings one forward on a spring at
380ms. The stack itself is the selector: there is no separate list.

**The one hard limit.** **Vallo issues no payment card.** An artefact must never look
like a debit or credit card, must never carry a network mark or a chip or a long
number, and must never imply a card product exists. It is a credential. If it could be
mistaken for a bank card at a glance, it is wrong.

**Where it is used:** the Space Passport tier, trust tiers, Pro plan selection,
promotion tier selection, and a badge or milestone at the moment it is earned.
**Where it is not:** anywhere there is no tier. A card artefact on a screen with one
option is decoration.

### 14.5 Get Started, monotone

**The first screen after the startup animation**, which makes it the most seen screen
in the product and the first real impression after the brand moment.

**Monotone**, in the spirit of reference 37: a single hue, no secondary colour, no
glow, no gradient beyond one soft ground wash. Restraint is the message, and it is the
opposite of the busy launch screens most products ship.

**The composition:** generous top air; the mark, small; one display line that says what
Vallo is; one quiet line beneath it; then the doors. **The doors are the only
contrast on the screen**: the primary action solid, the secondary outlined, both
rectangles at radius 14 per D2. Legal consent in small honest type. Nothing else.

**What it must not have:** a carousel, a phone mock, a feature list, social proof, an
animation that loops, or more than one route onward besides sign in.

The handoff from the animation is a 240ms crossfade from the lockup's final frame into
this page with the mark already in position, so the two read as one movement.

### 14.6 Full-page onboarding

Beyond Get Started, onboarding uses full-page compositions in the spirit of reference
36: **one idea per page**, large display type, a real illustration or product moment,
generous air.

**Proof is allowed only where it is legitimate.** Reference 36 carries "1 Million
Creators" and press logos. Vallo has 16 accounts and no published listing. **Until the
numbers are real, there is no proof band**, and the space is given to the product
instead. Inventing one would breach the honesty rules the whole platform rests on and
would be caught by the claims lint.

### 14.7 The light-mode icon fix

The founder reports the 3D icons still read poorly on light. This is material, not
rendering: **glass needs a dark ground to resolve**, and on white it goes muddy and
loses its edges.

**Two changes, both required.**

1. **The clay migration**, already decided in D2. A matte deep-royal-blue object has
   genuine contrast on white, where a glass one has almost none. This is the real fix
   and it is why the decision was taken.
2. **The ground.** On paper, a clay object sits on a plate: radius 14, a very light
   blue-grey fill at about 4% brand, with a soft blue contact shadow beneath the
   object so it never floats on pure white. On night the plate is unnecessary and the
   object sits directly on the surface.

**The acceptance rule: no clay asset is accepted until it has been viewed on paper at
390px as well as on night.** An object approved only on navy will fail on white, which
is exactly how the current set reached this state.

**For any glass mark that survives**, in the logo lockup and the role-switch coin, the
existing rule stands and is correct: give it a dark ground in light mode rather than
letting it sit on white.

### 14.8 App Store screenshots

Reference 36 is the structure: a bold three-word headline, one device, one idea per
frame, a consistent ground across the set so it reads as a series.

Six frames: Space, without the runaround. The whole move-in cost, up front. Verified
by a real person. Protected payment. Your space, managed. Built for Nigeria.

**No invented press logos, no invented awards, no invented counts.**

---

## 15. Standing streaks, sheets, comparison and inbox

Added 6 October from references 39 to 43 and founder directives D17 and D21.

### 15.1 Standing streaks

Founder directive D17. **Not habit bait: earned, verifiable standing.** A streak on
Vallo counts a real-world behaviour with a counterparty, never an app-open, because
somebody looks for a home once every few years and a daily-open streak would punish
them for not needing one.

**The six**, with the on-time rent streak the most valuable thing in this document:
on-time rent for a tenant, which becomes a **portable rent-payment history in a market
where tenants have no credit record**; reply time for an agent or host; dispute-free
months; listing freshness; inspection follow-through; and months at full Listing
Health.

**The surfaces.**

| Surface | Treatment |
|---|---|
| **The streak tile** | On the dashboard and the passport: the count as a Figure, the unit beneath it quietly, and the current window as a row of small marks. Paused shows the word paused, never a broken flame |
| **The earned moment** | Reference 41, which is earned so the celebration is honest: a quiet sunburst behind a matte clay medal, scale-in at 620ms, the achievement named in display type, one line saying what it means, then **Share** and **Back**. Tapping the medal replays it once |
| **On the passport** | A row per streak with its best and its current, as dates and counts, never a score |
| **In the share card** | A tenant sharing an on-time rent record is the single strongest organic growth loop available, because the recipient is usually a prospective landlord |

**The prohibitions, which are what keep it trustworthy.** Breaking is quiet: no flame
going out, no loss animation, no shaming notification, the number simply restarts and
the history is kept. **Never broken by not needing the product**: between tenancies it
pauses and says so. No leaderboard, no comparison against strangers, nothing
purchasable. No streak counts an app-open, a login, or a session.

### 15.2 The illustrated action sheet

Reference 43. The best sheet pattern in the whole reference set and it generalises
widely.

**Anatomy:** a clay object at the top on a soft radial ground; a title in display type;
one line of body; then **rows separated by hairlines**, each a small round tinted glyph
plate, a label, and a chevron; then a single quiet dismiss. Rises at 380ms with the
scrim blur ramping 0 to 12.

**Use it for:** Manage your circle in the referral hub, Add a workspace, Create,
Share, Invite, Manage payout accounts, Manage a tenancy, and the per-feature
onboarding's final panel. **It replaces the generic list sheet everywhere**, and it is
the reason a Vallo sheet will feel considered rather than default.

### 15.3 The comparison table

Reference 43's head-to-head. Two columns of figures with a labelled row per metric, a
small glyph per row, and the leading value weighted.

**Where it earns its place:** comparing two saved spaces, which is a premium feature
the spec names; this month against last on a lister dashboard; organic against
promoted on a campaign; and a tenancy's quoted cost against what was actually paid.

**Never** against another member by name, and never a leaderboard.

### 15.4 Messages and inbox

Reference 40, which is the strongest inbox reference in the set.

**The thread:** a quoted reply block above the message that answers it, so a
conversation about a specific listing stays legible; a day divider; an unread divider
that says how many; attachments as a bordered row with a type glyph; and voice notes
as a waveform with a duration, which matters because Nigerian property conversations
happen in voice notes.

**The inbox:** filter chips across the top, rows carrying an avatar with a presence
dot, the counterparty, a one-line preview, a time, and an unread count as a cyan
badge.

**The workspace overview:** reference 40's top row of small count cards is the right
shape for a lister's "what needs me today": three or four cards, each a count and a
label, tappable straight into that queue.

### 15.5 The floating tab bar with a raised centre

Reference 39 raises and highlights the active tab out of the bar. Vallo already does
this with the pill that moves and the 52px centre action, so **this is confirmation
rather than a change**. Keep the capsule, keep the moving pill, keep the raised
centre. The one thing worth taking is the depth under the raised item, a soft ambient
shadow so it reads as lifted rather than merely coloured.

### 15.6 The trial timeline, and preselection corrected

Reference 42 is the honest version of a paywall and corrects section 14.3 per D21.

**The three-step timeline is required wherever a trial exists**, and the wording model
is reference 42's: today, everything unlocked, zero charged; **day before the end, we
remind you**; last day, the trial ends and cancelling before it costs nothing. The
reminder step is the honest part and the one most products omit.

**Preselection is permitted** when the full charge, the charge date, the renewal terms
and the cancel path are all visible on the same screen at legible size without
scrolling past the action. The dark pattern was never preselection; it was hiding what
happens next. A "no charge today" marker is permitted because it is true.

**Still forbidden:** permanent-discount claims, countdowns on anything that is not a
real deadline, and confetti on a purchase.

---

## 16. Notifications, email, and inner-page depth

Added 6 October from founder directives D22 to D25.

### 16.1 Four channels, and which earns which

| Channel | Carries |
|---|---|
| **In app** | Everything. The notification list is the complete record |
| **Push** | Anything time-sensitive or conversational, subject to quiet hours |
| **Email** | Anything with a document, a decision, a receipt, or a long explanation. Always for money |
| **SMS** | **Only money that moved or failed, a deadline with consequences, or security** |

**SMS costs money per message and interrupts at any hour, so it is rationed to three
cases** and is never social, never marketing, and never for something that can wait
until the person next opens the app. The Termii transport that already delivers
authentication codes carries it, WhatsApp first with the DND route so do-not-disturb
numbers still receive it, which makes this a routing change rather than a new
integration.

**Every event declares its channels in one table**, so a channel decision is data
rather than scattered logic, and a member's preferences and quiet hours are applied in
one place. Security notifications ignore preferences, which is said plainly in
settings.

### 16.2 The event coverage

**A floor, not a ceiling.** Every session adds what it finds in its own area and
records it.

**Money.** Payment opened, processing, succeeded, failed. Refund initiated, processed,
delayed. Escrow funded, condition satisfied, release requested, released, expired.
Dispute opened, responded, evidence requested, resolved. Withdrawal initiated,
completed, failed, returned. Deposit received. Transfer sent and received. Chargeback
opened and resolved. Payout settled. Statement ready. Receipt ready. Rent due, due
soon, overdue. Caution deduction proposed, disputed, ruled, returned. Flatmate
invited, paid, short, cancelled. Referral qualified, reward available, reward expiring,
reward reversed. Plan renewing, payment failed, cancelled.

**Trust.** Verification submitted, approved, rejected, more information needed.
Document expiring. Mandate expiring. Badge earned. **Streak milestone, streak paused.**
Passport shared, passport viewed. Identity check result.

**Supply.** Listing submitted, approved, rejected, more information needed, published,
expiring. Availability confirmation due. Listing Health dropped. Photo rejected.
Promotion started, ending, report ready. Price change on a saved space. Back on
market. Saved search match. Space Watch triggered.

**Bookings and stays.** Requested, accepted, declined, cancelled. Check-in tomorrow,
today. Arrival instructions. Check-out tomorrow. Review request, review received,
review response. Restaurant reservation confirmed and reminder.

**Tenancy.** Inspection requested, accepted, scheduled, reminder, report submitted.
Agreement drafted, confirmed by the other party, amended, approved, rejected. Move-in
approaching. Renewal window opening. Tenancy ending.

**Social.** Message received, message request, reply. Follow, mutual follow. Post
reply, comment, **mention or tag**, share received, story reply. Area or place
activity.

**Relations**, which the founder named specifically. Agent: lead assigned, client
message, viewing scheduled, mandate requested. Landlord: landlord line reply, mandate
request, rent remitted. Hotel and shortlet: reservation, housekeeping task, rate plan
expiring, calendar conflict from another site. Firm: member invited, member joined,
role changed.

**Account and security.** Sign-in from a new device, passcode changed, email change
requested, phone confirmed, payout account added or changed, suspicious activity,
support ticket updated, data export ready, deletion scheduled and cancelled.

**Staff.** Queue over threshold, alert raised, dispute waiting, STR nudge, threshold
event, sanctions hit, provider health degraded, job failed.

### 16.3 Preview and full view

**Every notification has both**, and both are designed.

**The preview**, which is the list row, the push body and the email subject: a clay
glyph on a tinted plate carrying the event's family; the subject in one line; the
consequence in one more; the figure where money is involved, tabular; a relative time;
and an unread mark. **It must be actionable without opening**: "Rent of ₦1,200,000 is
due on 14 October" rather than "You have a new notification".

**The full view is a designed screen for that event family**, reached by a route so
back behaves and a deep link lands. It carries what happened, when, who was involved,
the figure and its breakdown where there is money, **the one action the event asks
for**, a link to the underlying object, and the timeline of what came before. It is
never a generic detail page, and it never dead-ends: when there is nothing to do, it
says so and offers the object.

**Grouping.** Several events of one kind on one object collapse into one row that
expands. Counts are cyan, never red; red is reserved for genuine error.

### 16.4 The notification centre

Filter chips for All, Money, Trust, Spaces, Messages and Account. Unread first, then
chronological, with day dividers. Mark all read. Per-family preferences reachable from
the top, so a person who wants money SMS but not social push can say so in two taps.

### 16.5 Email, rebuilt

The founder's assessment of the current emails is that they look like nothing. They
become a designed surface using the app's own material system.

**The frame.** **In light mode every email is a white background**, with no grey wash
and no dark card floating on light. The body is a single centred column at 600px with
generous padding. Money and document emails follow the **Paper** register; notification
and lifecycle emails may use the dark shell, and a receipt is always Paper.

**The anatomy**, in order: the wordmark, small, with the slogan beneath it at a quiet
size; a **clay object** naming the email's family; the subject as a display line; the
consequence in one sentence; **the figure, large and tabular**, where money is
involved; the detail as key-value rows separated by hairlines, never a paragraph of
prose; **one primary button**, a rounded rectangle at radius 14, never a pill, with a
plain-text link beneath it for clients that strip buttons; a quiet footer carrying the
company, the one-click unsubscribe where the law requires it, and the preference link.

**Components to build**, because the founder asked for components rather than text:
the figure block, the key-value table, the itemised breakdown with a total rule, the
status chip, the timeline for a multi-step process, the space card with a photograph
and the move-in total, the person row with an avatar and a role, the receipt block with
dual confirmation rows, the code block for a verification code, and the quiet callout
for a warning.

**Icons.** The clay object in the header plus line glyphs in the key-value rows, which
is the first time email has had any. Every image carries alt text and a sensible
fallback, because a mail client that blocks images must still leave the email
readable.

**The rules.** Legible with images off. Legible in dark-mode mail clients, which is
already tested. One job per email. Plain text alternative for every send. Never a
money sentence not from `lib/money/copy.ts`. **A receipt email matches the on-screen
receipt exactly**, because a receipt that differs looks forged.

### 16.6 Inner pages

Founder directive D25. **When a screen carries more than one job, the second job
becomes an inner page.**

An overview answers "what needs me, and how am I doing". An inner page answers one
question completely, with its own motion, its own back destination, and its own empty,
loading and error states.

| Area | Overview | Inner pages |
|---|---|---|
| Wallet | Balance, one next action, recent activity | Transaction detail, deposit, withdrawal, transfer, methods, statements |
| Escrow | What is held and what it waits on | Conditions, milestones, evidence, dispute, release |
| Referrals | Earned, qualified, pending, the code | Each referral's state, payout history, campaign detail, how it works |
| Analytics | Headline figure, period, one chart | Per-metric breakdown, per-listing funnel, promotion report |
| Passport | Tier, the facts, share | Each fact's evidence, streak history, share settings |
| Host and agent | Today and what needs me | Each queue, calendar, decide, reviews, earnings, statements |
| Settings | Grouped rows | One page per setting with its explanation |
| Admin desk | Queue counts | Each queue, each case, each audit trail |

**Not clicks for their own sake.** It is the difference between a dashboard read in
three seconds and a wall a person scrolls past.

---

## 11. Asset generation

What has to be produced, and prompts for generating it. **House rules for every
prompt:** matte finish never glossy, royal blue `#2B3FE0` with deep navy
`#010118`, one optional warm `#FF6A3D` accent detail, soft top-left key light,
transparent background, centred, generous padding, no text, no logos, no people's
faces, square.

### 11.1 Priority assets

| Asset | Why it blocks | Format |
|---|---|---|
| **Vector logo mark and wordmark** | The startup animation is soft without it | SVG from `assets/brand-sheets/` |
| Clay set completion | D2 needs one coherent matte family | webp 1x and 2x |
| Onboarding art, 4 slides | Exists; must be re-rendered matte | webp |
| Empty-state objects, about 12 | Every surface is empty until supply arrives | webp |
| Success and badge art, about 8 | Motions 13 and 22 | webp |
| Email header objects, about 10 | Paper receipts | png |
| Store screenshots | Both submissions | png per device class |
| Play feature graphic | Play requires it | 1024x500 png |

### 11.2 Prompts

**Base, prepend to every object prompt:**

> A single 3D object rendered in matte clay with a soft velvety finish, deep
> royal blue, on a transparent background. Soft diffused key light from the upper
> left, gentle ambient occlusion, no specular highlights, no gloss, no reflection,
> no chrome, no glass. Subtle rounded bevels. Centred, generous padding, square.
> No text, no logo, no letters. Clean studio render, premium product feel.

**Property and space types:** a modern Nigerian apartment block with slim
balconies | a detached family house with a pitched roof and a compound gate | a
boutique hotel building with a canopy | a shortlet studio with one wide window |
a serviced office tower, cropped | a small retail shop with a shutter and awning |
an empty plot of land with boundary markers and a survey peg | a restaurant
building with an awning and two outdoor tables | a luxury villa with a flat roof
and a pool edge | a gated estate entrance with a boom barrier.

**Nigerian specifics**, which no stock set has and which are part of the moat: a
prepaid electricity meter with a blank digital display | a water storage tank on
a slim steel frame | a compact home inverter unit with a battery beside it | a
tall estate gate with a guard post | a rolled tenancy agreement tied with a
ribbon | a bunch of house keys on a simple ring | a labelled cardboard moving box.

**Money and trust:** a stack of three banknotes, no denomination or text | a
folded paper receipt with blank ruled lines | a shield with a soft rounded face
and a single embossed tick | a passport booklet, closed, with a blank cover | a
rosette medal with two short ribbon tails | an upright padlock, closed | a simple
bank card, blank, slight perspective | a small safe with a round dial.

**Actions and states:** a magnifying glass over a small map pin | a paper plane
mid-flight | a bell with a soft dome | a calendar block with a blank page | a
chat bubble pair, one solid one outline | an upward bar chart of three bars | a
checklist clipboard with three blank rows | a pair of balanced scales.

**Empty states, each with a deliberate quiet mood:** an open empty cardboard box,
lid folded back | an empty birdcage with its door open | a single unlit paper
lantern | an empty shelf with one unused hook | a closed envelope resting flat |
a stack of three blank cards, slightly fanned.

**Success and reward:** a large rounded tick inside a soft circle | a trophy with
a wide shallow cup | a gift box with its lid lifting | a ticket with a perforated
edge and a blank face | a key resting on a small cushion | a rosette with a
blank centre.

**Tier art, matching 7050**, warm accent permitted on the top tier only: a flat
rounded plaque, blank, in brushed navy | the same in a lighter blue | the same
with a single thin warm orange edge line.

**Onboarding, wider scenes**, same base but 3:2 and a shallow depth of field: a
small cluster of three Nigerian apartment buildings with a street tree | a
doorway with a key in the lock, warm light beyond | a desk corner with a signed
document and a pen | two chat bubbles above a small house.

**For the store and the landing**, not clay: photographic, real Nigerian
interiors and exteriors, natural daylight, no people's faces, no stock-photo
gloss, shot on a 35mm equivalent, slight grain, the honest texture of a real
place. These must eventually be real listings, which is why supply is priority
one. Until then use licensed photography and never imply it is inventory.

---

## 12. The per-page audit checklist

**Every page must pass before its family is called done.** This is what the
founder meant by auditing every single page as part of the upgrade.

**Structure**

1. One subject. One primary action. One glow at most.
2. Leads with its figure, where it has one.
3. Correct theme register per D1.
4. Containers only from the four tiers. One edge treatment each.
5. Sections in a deliberate order, with air between them.

**Type and figures**

6. Nothing below 12px. At most three weights. Sentence case.
7. All figures tabular, through `formatMoney`, counting up on arrival.
8. A label above a figure, quiet and small.

**Icons**

9. Clay at 32 and above, matte. Line glyphs below 32. No gloss anywhere.

**Motion**

10. Entrance motion present and under 620ms.
11. Press feedback on everything tappable.
12. Shaped skeleton, never a spinner.
13. Correct behaviour under reduced motion and data saver.

**Honesty**

14. The whole cost shown before the action that incurs it, fee beside amount.
15. Trust facts as dates, never ticks. A null never looks negative.
16. No banned word: demo, sample, preview, coming soon, lorem.
17. Money sentences read from `lib/money/copy.ts`.
18. Empty states say why, and offer the next step.

**Craft**

19. No horizontal scroll at 390. Checked at 390, 768, 1440.
20. Both themes checked. Contrast passes on a cheap panel in sunlight.
21. Keyboard reachable, focus visible, labels present.
22. Four locales do not overflow, including the longest Hausa strings.
23. Safe areas respected; the dock never covers content.
24. The back destination is correct from every entry path.

---

## 13. Sequence

Session 3 works in this order, because each stage makes the next cheaper.

1. **Foundations.** Container tiers, elevation, type scale, figure and odometer
   components, segmented pill, button morph, toast, sheet. Nothing visual ships
   before these exist, or 200 pages get 200 one-off treatments.
2. **Navigation.** Dock and side nav, section 6. Every screen sits inside them.
3. **Startup and entry.** After the `/open` deadline fix.
4. **Transaction, in Paper.** The highest-trust, highest-reference family.
5. **Discovery and detail.** The most-visited surfaces.
6. **Lister workspaces,** including the missing host analytics.
7. **Member, social, public site.**
8. **Admin.**
9. **Email and the native shell.**

Each stage ends with the section 12 checklist run on every page in it, and a note
in the session's response document naming what was audited.
