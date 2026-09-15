# Agent 3: frontend, design, motion and QA

Audit run 15 September 2026, branch `claude/zealous-brown-gn45mg`.
Read-only on the codebase. This file is the only thing I wrote.

---

## 1. The rules, restated

1. Zero em dashes anywhere. Commas, colons, full stops, brackets.
2. British spelling in docs and product copy.
3. Money is integer kobo as bigint. `Math.round(naira * 100)` only at the input
   boundary. Display through `formatMoney` from `@naijafinds/i18n`. Never float,
   never hand-divide by 100. Percentages are integer basis points.
4. Every server action returns the `ActionResult` envelope. Sessions come from
   `resolveSession()`.
5. `BrandIcon` and `UiIcon` only. `Icon` and `Icon3D` are deleted. No
   `strokeWidth` prop on UiIcon, no `ramp` prop on BrandIcon. `TrustIcon` is the
   landing trust strip and nowhere else.
6. 390px first, in dark, then wider, then light.
7. Dark is the default and the operating system does not override it. Only a
   stored choice moves the theme. Light is a designed paper twin, no blue-tinted
   greys.
8. No fees anywhere in copy.
9. One blue family. Emerald for success, rose for error, bright cyan for
   attention and pending. No orange, amber, gold, purple, violet, magenta or
   generic SaaS blue. A new accent is a new depth of blue.
10. First-party inventory only, ADR-013.
11. Escrow is promised nowhere.
12. No dark patterns.
13. Banned in UI copy: demo, sample, preview, not live, coming soon, lorem.
14. The brand is Vallo. VALLO SPACES LTD only on legal surfaces.
15. No raw colours, no raw spacing. Never disable a lint rule to land a change.
16. Colour alone is never the only signal.

Scope: `components/**`, `design-system/**`, `app/css/**`,
`packages/design-tokens/**`, the `(app)` route screens, the test tree, and
motion, responsive behaviour and component-level accessibility. Agent 1 owns the
marketing, auth and social discovery libraries. Agent 2 owns the server
libraries, API, middleware, admin and agent server work. Track A owns the rename,
the brand assets, the legal surfaces, `MediaFrame.tsx` and `CityHero.tsx`.

---

## 2. What I read, what I ran, what I looked at

**Read in full:** `docs/HANDOFF_02_PLATFORM.md` sections 0, 1, 3.2, 8, 9, 10, 11,
12, 13, 14, 20, 23.3, 24, 25, 26.3, 26.5, 27, 29. `docs/HANDOFF_01_COMPANY.md`
outline plus sections 4.7 and 5. `docs/ICON_SYSTEM.md`, `docs/BRAND_MARKS.md`.
`packages/design-tokens/src/index.ts` and the first 700 lines plus the light
block of `src/tokens.css`. `apps/web/src/app/globals.css` and the partials
`ambient.css`, `animation.css`, `base.css`, `buttons.css`, `controls.css`,
`data-saver.css`, `fonts.css`. The twelve `components/ui` primitives, with
`Button`, `Sheet`, `StatusPill`, `Skeleton` and `Amount` read line by line.
`BrandIcon`, `UiIcon`, `Logo`. `MomentScreen`, `PageHeader`, `Reveal`,
`ComingSoon`, `AgentComingSoon`, `KycBanner`, `KycStatus`, `Receipt`,
`ReceiptActions`, `PayPanel`, `PaymentReturn`, `FundingVerifier`,
`settings-store.ts`, `ThreadView` state machine, the checkout page, the listing
wizard submission, `vitest.config.ts`.

**Ran, and read the output:**

| Command | Result |
| --- | --- |
| `npx next dev -p 3210` from `apps/web` | Ready in 387ms, served 200 |
| `node scripts/verify-shots.mjs / /home /wallet /listing/x /settings` | 5 PNGs at 390x844 dark |
| `node scripts/verify-shots.mjs --light /wallet /settings` | 2 PNGs at 390x844 light |
| a Playwright probe I wrote for overflow, zero-size images and tap targets | 5 routes |
| a Playwright network probe for payload by type | 2 routes |
| `npx vitest run` from `apps/web` | 44 files, 1,415 tests, all pass, 6.09s |
| `node scripts/build-icon-vectors.mjs --check` | exit 1, 60 vectors drifted |
| `node apps/web/scripts/check-css-tokens.mjs` | exit 0, 0 layer-1 leaks, 343 raw colour literals |

**Screenshots: yes.** Seven, all at 390x844 with `deviceScaleFactor: 2`, five
dark and two light, and I looked at four of them in full. The landing, the
signed-out wallet in both themes, and settings in dark are the ones I read
pixel by pixel and they are cited as evidence below.

**Environment:** signed-out only. The sandbox cannot reach Supabase, so every
screen I rendered was in its signed-out or fallback state. That is environment,
not product, and nothing in this report treats it as a bug.

---

## 3. WHAT I DID NOT CHECK AND DID NOT DO

Read this before the ratings. It bounds everything below.

- **I did not render a single signed-in screen.** No authenticated wallet, no
  real balance, no booking, no message thread with messages, no agent workspace,
  no admin queue, no populated search. Every state I describe on those screens
  comes from reading the source, not from seeing it. Where I say "the user sees",
  on a signed-in screen, read it as "the code renders".
- **I did not see a single confirmation screen render.** Every Section 24 finding
  about `MomentScreen`, `PayPanel`, `PaymentReturn`, `FundingVerifier` and the
  listing wizard is source reading. I could not reach them signed out.
- **I did not run the 82 Playwright specs.** They need a server on 3210 plus a
  reachable database, and the second half is not available here. I inventoried
  them by reading; I did not execute them. Nothing in this report says a
  Playwright spec passes or fails.
- **I did not run `npm run build`, `npm run lint` or `npm run typecheck`.** The
  lead is running the baseline build concurrently and the brief says not to loop
  it. So I cannot tell you the product typechecks or builds today. I ran the two
  narrow checkers (`check-css-tokens.mjs`, `build-icon-vectors.mjs`) and vitest.
- **I did not audit at tablet or desktop widths.** 390px only, in both themes.
  Every responsive claim here is about the phone frame.
- **I did not measure real contrast ratios.** I did not run an automated
  contrast probe. Where I discuss contrast I am reading the token comments, which
  state measured values, rather than measuring for myself.
- **I did not profile.** No Lighthouse, no CPU trace, no bundle analysis. The
  performance numbers below are network bytes with `content-length` from a dev
  server, which is accurate for static and optimised images and unreliable for
  scripts (the dev server chunks them without a length, so my script total of
  3KB is meaningless and I have not quoted it as anything else).
- **I did not read `social-feed.css` (2,944 lines), `social.css`,
  `side-nav.css`, `settings-rows.css`, `chips.css`, `chrome.css`, `glass.css`,
  `motion.css` or `utilities.css` in full.** I grepped them for specific things.
  There is more in those files than this report contains.
- **I did not read 140 of the 183 components.** I read roughly 40 closely and
  grepped the rest. The component-level findings are a sample, not a census.
- **I did not verify a single claim about the database, RLS, server actions or
  payments settlement.** Agent 2 owns those and I did not go there.
- **I did not test with a screen reader or a keyboard.** The accessibility
  findings are structural (missing live regions, missing labels, a dead setting)
  read from source, not observed behaviour.
- **I did not check the native shells** (`apps/web/android`, `apps/web/ios`).

---

## 4. The honest state of my scope

This is a better-built frontend than almost anything in this market, and it is
not yet a premium one. Those are two different statements and both are true.

**What is genuinely strong, and I verified it.** The token file is the best piece
of design engineering in the repository: two layers, honest comments, measured
contrast reasoning, no orange, no purple, and a lint rule that holds zero layer-1
leakage under `src/app/css` (I ran it). The elevation ladder is six real rungs
with rim highlights rather than flat drop shadows, which is the correct answer on
a navy canvas where black shadows measure 1.003:1. The `Sheet` has real spring
physics, detents, velocity-aware dismissal, a shared focus trap and a counted
scroll lock. `Button` collapsed twelve implementations into one with three
heights and no overridable geometry. Loading states are covered by 69
`loading.tsx` files, which is rare discipline. The `Receipt` is designed by
somebody who has actually been on the phone to a Nigerian bank. There is no
horizontal scroll at 390px on any of the five routes I probed, which means the
phantom-scroll work held. 1,415 unit tests pass in six seconds.

**What is bad, and it is bad in a specific way.** The system is coherent at the
token layer and incoherent everywhere above it. Three examples I measured rather
than felt:

1. **There are 995 raw font sizes in the TSX tree** across more than forty
   distinct values, sitting on top of an eleven-step type scale that exists and
   is largely unused. `text-[0.9375rem]` appears 123 times; `--nf-text-body-sm`,
   which is 0.90625rem and is the rung that value is reaching for, has
   essentially no adoption. The scale did not fail. Nobody was made to use it.
2. **Twelve primitives exist and four of them have one, two or three
   consumers.** `ActionBar` has exactly one. `Table` has two. `Segmented` has
   two. `Switch` has three. Meanwhile `nf-card`, the most-used surface in the
   product, appears in 205 files as a raw class string and **has no component at
   all.** The library was built from the wrong end.
3. **The in-app "Reduce motion" setting does nothing.** `settings-store.ts`
   writes `data-reduce-motion="1"` onto the root element and persists it. Not one
   CSS rule in any of the 25 stylesheets reads that attribute. The only consumer
   in the entire tree is `lib/native/keyboard.ts`. The row's own copy says it
   "calms entrance animations and hover movement across the app" and it does not.

**The confirmation system, which is the brief's largest ask, is the weakest part
of my scope, and the numbers are these.** 41 files paint `--nf-state-success` by
hand, 43 paint `--nf-state-warning` by hand and 41 paint `--nf-state-error` by
hand. There is one shared piece, `MomentScreen`, and it has three variants:
success, brand and warning. **There is no failure variant.** So every error
boundary on the platform, the "we could not find that booking" screen, the
"checkout is unavailable" screen and the "this booking was cancelled" screen all
render in `warning`, which resolves to bright cyan, which is the token the
platform reserves for pending. A crashed page, a missing booking, an unavailable
checkout, a cancelled stay and a payment in flight are all the same colour. Rose
exists, is correct, and is not reachable from the one shared confirmation
component.

It gets worse in the place it matters most. In `PayPanel`, a **declined payment**
is rendered as a paragraph in `var(--nf-state-warning)` with a `bell` glyph. A
Nigerian who just tried to pay rent and failed is shown the pending colour and a
notification bell. And `KycBanner` has the assignment exactly inverted:
verification `pending` is painted with `--nf-state-info` (a Tailwind sky,
`#38BDF8`) while verification `failed` is painted `--nf-state-warning` (the
cyan). Two states, both wrong, in the same twelve-line object.

**Pending, on the money path, is a button spinner.** `PayPanel`'s `Phase` machine
has `card-starting`, `card-redirecting` and `wallet-paying`, and all three render
as `loading` on a `Button`. Somebody tapping "Pay from my wallet" for a year's
rent sees a spinner inside a button, on a Nigerian mobile network, with no
sentence telling them what is happening, no restatement of the amount, no "do not
close this page" and no live region. That is the exact screen the brief says is
either reassuring or frightening, and it is currently neither because it says
nothing at all.

**The single largest performance problem is one file.** `/brand/rentme-bg.png` is
1,343KB, served raw out of `/public` with no format negotiation, and it is
painted twice on `.nf-ambient` on **every page in the product**. I measured 1,475KB
of images on the landing and 1,364KB on `/home`, of which that one file is 91%.
The data-saver path that turns it off is thoughtful and correct and it only fires
for somebody who has already told us their connection is bad. Everyone else, on
the target device on the target network, pays 1.3MB before they read a price.

**What holds it back is not talent, it is enforcement.** Every single thing above
was already known to somebody: the comments in `tokens.css`, `buttons.css` and
`UiIcon.tsx` are some of the most self-aware engineering prose I have read. The
colour rule got a lint rule and it is at zero. Type, geometry, primitive adoption
and the confirmation vocabulary got no rule and each of them is at forty to a
thousand violations. The lesson the repository has already learned about colour
has not been applied to anything else.

---

## 5. Ratings, each capped by its worst user-visible failure

Scored against a shipped competitor a Nigerian user could open today
(PropertyPro, Nigeria Property Centre, Jiji, and on the polish axis against
Airbnb and a Nigerian neobank like Kuda).

| Dimension | Score | Evidence | The failure that caps it |
| --- | ---: | --- | --- |
| **Frontend** | 74 | 183 components, 97 routes, 69 `loading.tsx`, no horizontal scroll at 390px on five probed routes, 1,415 unit tests green | `.nf-reveal` ships `opacity: 0` in the SSR HTML and only becomes visible after hydration on engines without `animation-timeline: view()`, so on Safari and Firefox the content is blank until JS lands |
| **UI** | 68 | One `Button` with three heights, a real `Sheet` with detents and a focus trap, a coherent settings row system | `ActionBar` has one consumer, `Table` two, `Segmented` two, `Switch` three, and `nf-card` is a raw class in 205 files with no component |
| **Visual design** | 76 | The light theme is a genuine paper twin and reads beautifully; the elevation ladder and rim highlights are correct for a navy canvas | 995 raw font sizes across 40+ values against an 11-step scale, so type is the one system with no authority |
| **Branding** | 55 | The palette is disciplined: no orange, amber, gold, violet or magenta anywhere in `tokens.css`, verified by reading it | Every screenshot I took still says RentMe, and `--nf-state-info` is `#38BDF8`, a Tailwind sky, which is a generic SaaS blue sitting outside the stated family. Track A is mid-rename, so the name half of this is in hand |
| **Accessibility** | 61 | A correct `:focus-visible` policy including ARIA controls and `summary`, 84 `role="alert"` and 45 `role="status"` sites, `Skeleton` correctly `aria-hidden` | The "Reduce motion" setting is wired to nothing. A user with a vestibular disorder flips it, it persists, and every animation keeps running |
| **Performance (client)** | 52 | Self-hosted subset fonts with real reasoning, a genuine `Save-Data` path, `overflow-x-clip` discipline that holds | 1,343KB of background art on every page, painted twice, outside `next/image` |
| **Property and listing experience** | 70 | 30 commissioned property-type objects so a mansion and a mini flat no longer share one picture; a drawn fallback for a listing with no photo | The drawn fallback is broken: `--nf-media-wall` and four siblings are declared twice in the same `:root` and the second block reverts them to the near-invisible values the first block's comment describes as "a dark grey smudge" |
| **Messaging (presentation)** | 72 | Optimistic send with `sending` and `failed` states and a working retry, which most products in this market do not have | No delivery or read state at all, and the `sending` to `failed` transition is announced to nobody: there is no live region on the thread |
| **Overall Vallo standard** | 64 | | The confirmation language does not exist as a system, so the moment the platform earns its trust is forty-odd hand-rolled treatments and a colour that means five things |

**What these numbers mean.** Against PropertyPro or Jiji this is already the
better product on every axis. Against the standard the brief sets, "surprised it
was built by a small team", it is not there, and the gap is concentrated in three
places: the confirmation system, type and primitive enforcement, and one image
file.

---

## 6. THE SECTION 24 INVENTORY

Every success, pending, verified, failed, banner and receipt state I could find
by reading the tree. **I did not render any of these**, with the single exception
of the signed-out wallet empty state which I screenshotted in both themes.

Mark column: which of the 87 brand objects the state should carry. All eighteen
status marks named in the brief **exist** in `apps/web/public/brand/icons/`; I
checked each filename individually and none is missing.

### 6.1 Success

| # | State | File, symbol | What renders today | Mark today | Mark it should carry | Verdict |
| ---: | --- | --- | --- | --- | --- | --- |
| S1 | Wallet payment for a stay | `PayPanel`, `phase.kind === "wallet-paid"` | `MomentScreen` success, amount in the description string | `calendar-check` | `calendar-check` correct | Right mark, wrong anatomy: the amount is buried in prose, not a fact line |
| S2 | Card payment settled | `PaymentReturn`, `phase.kind === "settled"` | One green bold line in a card, no mark at all | none | `payment-sent` (gap) | No mark on the single most important success in the product |
| S3 | Wallet funded | `FundingVerifier`, `phase === "credited"` | `+₦X added to your wallet` in green, no mark | none | `wallet-plus` (gap) | Near-duplicate of S2 in a different file with different classes |
| S4 | Stay already paid | `checkout/[bookingId]/page.tsx`, `view.paid` branch | `MomentScreen` success | `calendar-check` | `calendar-check` correct | Fine |
| S5 | Listing published | `ListingWizard`, `submitted` branch | `MomentScreen` **success** (emerald) | `shield-check` (variant default, no icon passed) | `listing-review` | **Wrong on both axes.** The copy is "Your listing is with our review team", which is PENDING, painted emerald with a shield |
| S6 | Review submitted | `bookings/[bookingId]/review/ReviewForm` | `MomentScreen` | not read | `reviews` | Not inspected closely |
| S7 | Inspection booked | `RequestInspection` | No success screen. Sets error state only; success closes | none | `calendar-check` | Success is the absence of an error. Nothing confirms it |
| S8 | Message sent | `ThreadView`, `state` undefined | Timestamp replaces "Sending" | none | none needed | Correct for a chat, but silent to assistive tech |
| S9 | Profile saved | `ProfileEditor`, `AccountProfile` | Bespoke inline `--nf-state-success` text | none | `user-check` | One of 41 hand-rolled successes |
| S10 | Settings changed | `SettingsGroups`, `AccountToggles` | Optimistic switch flip, no confirmation | none | none needed | Acceptable |
| S11 | Password changed | `ResetPasswordForm` | Bespoke inline, `--nf-state-warning` and `--nf-state-success` both present in the file | none | `shield-lock` | Not inspected closely |
| S12 | Agent application submitted | `ApplyWizard` | Not a `MomentScreen`; inline | none | `doc-shield` | One of 41 |
| S13 | Area proposed | `around/new/ProposeAreaForm` | Inline `--nf-state-success` | none | none | Agent 1 scope, listed for completeness |
| S14 | Reference copied | `ReceiptActions`, `copied` | Button label flips to "Copied" for 2s | none | none needed | No live region; a screen reader hears nothing |

### 6.2 Pending. The most neglected state, and the brief was right

| # | State | File, symbol | What the user sees while they wait | Mark | Verdict |
| ---: | --- | --- | --- | --- | --- |
| **P1** | **Wallet payment in flight** | `PayPanel`, `phase.kind === "wallet-paying"` | **A spinner inside the button. Nothing else.** No sentence, no amount restated, no live region, no timeout | none | **The worst state in the product.** Real money, no words |
| **P2** | **Card checkout starting** | `PayPanel`, `card-starting` | Spinner in the button | none | Same |
| **P3** | **Redirecting to Paystack** | `PayPanel`, `card-redirecting` then `window.location.assign` | Spinner, then the page is gone | none | The user is sent to a third-party domain with no warning that it is about to happen |
| P4 | Card payment settling on return | `PaymentReturn`, `checking` | "Confirming your payment / Checking with the payment service. This takes a moment." in a `role="status"` card | none | **The best pending state in the product.** Verdict plus consequence. Still no mark, no progress, no timeout, no escape if it hangs |
| P5 | Wallet funding settling | `FundingVerifier`, `verifying` | Byte-identical copy to P4, different file, different type classes | none | Two implementations of one state |
| P6 | Verification under review (personal) | `KycStatus`, `state: "pending"` | Panel, tone `warning` (cyan), pill, `UiIcon calendar-booking`, says how long | UiIcon, not a brand mark | Colour correct, mark tier wrong |
| **P7** | **Verification under review (agent banner)** | `KycBanner`, `COPY.pending` | Row tinted `--nf-state-info`, a **sky blue**, not cyan | `UiIcon history` | **Disagrees with P6 about the colour of the same state on the same subject** |
| P8 | Listing awaiting approval | `ListingWizard` submitted | Painted **emerald** as a success | `shield-check` | See S5. A pending state wearing the success colour |
| P9 | Agent application in the queue | `profile/application/page.tsx` | `StatusPill` via `toneForStatus` plus a hand-drawn step track using `--nf-state-success` and `--nf-state-warning` inline styles | none | A third rendering of "in a queue" |
| P10 | Withdrawal settling | `Receipt`, `entry.status === "PENDING"` | A cyan sentence: "This has left your balance and is with the bank... keep this receipt until it settles" | `KIND_ICON[kind]` | **The best pending copy in the product.** Correct colour |
| P11 | Booking awaiting host | `MyBookings` | `StatusPill` warning via `toneForStatus("PENDING")` | none | Cyan, correct |
| P12 | Payment processing (generic) | `toneForStatus("PROCESSING")` | `StatusPill` **info** (sky `#38BDF8`) | none | `PENDING` is cyan and `PROCESSING` is sky. Two near-identical light blues the eye cannot separate, for two states the user genuinely needs to tell apart |
| P13 | Any button submitting | `Button`, `loading` | Spinner in the leading slot, label dimmed, `aria-busy` set | none | `aria-busy` on a button is weakly announced. There is no live region anywhere in `Button` |

### 6.3 Verified

| # | State | File | Today | Mark | Verdict |
| ---: | --- | --- | --- | --- | --- |
| V1 | Identity verified | `KycStatus`, `approved` | Panel, tone success (**emerald**), `UiIcon verified` | UiIcon | **Wrong colour by the platform's own rule.** `--nf-status-verified` exists, is `--nf-electric-300`, and `tokens.css` states plainly that "VERIFIED IS BRAND BLUE... it is Vallo putting its own name to something". `KycStatus` paints it emerald |
| V2 | Verified agent badge | `VerifiedAvatar` | Not inspected | | Not checked |
| V3 | Verified listing | `ListingCard` | Not inspected closely | | Not checked |
| V4 | Agent verified, banner state | `KycBanner`, `state === "verified"` | Renders `null`, deliberately, with a good reason written above it | none | Correct |
| V5 | `--nf-status-verified` token | `tokens.css` | Defined, correct, brand blue | | Almost nothing consumes it |
| V6 | `user-verified.png` | `public/brand/icons/` | **Exists.** It is already the blue scalloped rosette with a white tick, which is exactly the reference screenshot's orange mark done in the brand | | Does not need replacing. It needs using |

### 6.4 Failed and partial

| # | State | File, symbol | What renders | Colour | Verdict |
| ---: | --- | --- | --- | --- | --- |
| **F1** | **Payment declined** | `PayPanel`, `phase.kind === "error"` | `role="alert"` paragraph, `UiIcon bell` | **`--nf-state-warning`, bright cyan** | **The pending colour on a declined payment, with a notification bell.** The two most consequential failures in the product are painted as "please wait" |
| **F2** | **Card settlement failed** | `PaymentReturn`, `failed` | Heading "**Payment check**", body is the raw action error, no colour, no mark, no retry, no support link, no reference | none | "Payment check" is not a verdict. It tells a frightened person nothing. And there is nowhere to go |
| **F3** | **Wallet funding failed** | `FundingVerifier`, `failed` | Same "Payment check" heading, plus **a button labelled "Done"** | none | Dismissing a failed payment with a control labelled "Done" is actively misleading |
| F4 | Page crash, personal mode | `(app)/error.tsx` | `MomentScreen` **warning** (cyan), `shield-lock`, digest as a reference | cyan | Honest copy, right instinct, wrong colour. Also uses a padlock for a crash |
| F5 | Page crash, agent | `agent/error.tsx` | `MomentScreen` | not read | Same family |
| F6 | Page crash, admin | `admin/error.tsx` | `MomentScreen` | not read | Same family |
| F7 | Booking not found | `checkout/page.tsx`, `state === "missing"` | `MomentScreen` warning, `calendar-check` | cyan | A tick mark on a "not found" screen |
| F8 | Checkout unavailable | `checkout/page.tsx`, `state === "unavailable"` | `MomentScreen` warning, `shield-check` | cyan | A tick mark on a failure |
| F9 | Booking cancelled | `checkout/page.tsx`, `CANCELLED` | `MomentScreen` warning, `calendar-check` | cyan | Third tick on a non-success |
| F10 | Verification rejected | `KycStatus`, `rejected` | Panel tone danger, `shield-stop`, **reason and fix both required by the type** | **rose, correct** | **The best failure state in the product.** TypeScript refuses a rejection without a reason and a fix. This is the pattern everything else should copy |
| **F11** | **Agent verification failed** | `KycBanner`, `COPY.failed` | Row tone `warning` | **cyan** | Should be rose. Inverted against P7 in the same object |
| F12 | Message send failed | `ThreadView`, `state === "failed"` | Caption in `--nf-state-error` with a working retry | rose, correct | Correct, and not announced |
| F13 | Upload failed | `ProfilePhotos`, `StoryComposer` | Inline `--nf-state-error` | rose | Not inspected closely |
| F14 | Form validation | `ApplyWizard` | `role="alert"` at `text-[0.75rem]` and `text-[0.6875rem]` | rose | **11px and 12px error text on a phone** |
| F15 | Clipboard refused | `ReceiptActions`, `copy` catch | **Nothing at all.** Silent | none | A tap that does nothing and says nothing |
| F16 | Share dismissed or absent | `ReceiptActions`, `share` | Silently copies instead | none | The user asked to share and got a copy, with no indication |
| F17 | Unknown status on a receipt | `Receipt` | Renders the **raw enum**: `REVERSED`, `AWAITING_PAYMENT` in the pill and again in the Status row | via `toneForStatus` | Shouting snake case on a document people screenshot |

### 6.5 Banners and persistent notices

| # | Notice | File | Behaviour | Verdict |
| ---: | --- | --- | --- | --- |
| B1 | Agent KYC standing | `KycBanner` | Three states, no dismiss, renders `null` when verified, carries the reviewer's own words | Structurally excellent, two of its three colours are wrong |
| B2 | Example listing notice | `ExampleNotice` | `--nf-state-warning` | Uses the word "Example" and never a banned string. Correct |
| B3 | Payment keys absent | `checkout`, `state === "unconfigured"` | "Payment switches on shortly" | A coming-soon promise in different words, on a money screen |
| B4 | Notifications not configured | `notifications/page.tsx` | "**Notifications switch on shortly**" | Same family. States a date-less promise rather than the real condition |
| B5 | Signed-out wallet | `(app)/wallet` | Good empty state. **Screenshotted, both themes** | The headline orphans the word "in" onto its own line at 390px, and a settings gear sits in the header of a wallet the visitor cannot see |
| B6 | Agent workspace stub | `AgentComingSoon` | "In development", "will fill in shortly" | **Dead code.** Zero call sites; both former consumers are now real pages |
| B7 | App-wide coming soon | `components/app/ComingSoon` | | **Dead code.** Zero call sites. Also exports a second, unused skeleton primitive called `Ske` |
| B8 | Email not confirmed | none found | | I found no such banner. If confirmation is required anywhere, nothing persistent says so |
| B9 | Document expiring | none found | | Does not exist |
| B10 | Tenancy ending | none found | | Does not exist |

### 6.6 Receipts

| # | Surface | File | Verdict |
| ---: | --- | --- | --- |
| R1 | Wallet receipt | `Receipt` | **Genuinely good.** Direction in words not just colour, status unmissable, full selectable reference with `break-all`, exact date and time in Africa/Lagos, a pending sentence that stops a dispute being filed. This survives six months |
| R2 | Receipt actions | `ReceiptActions` | Copy and share. The argument against a PDF is sound. The silent failures are not |
| R3 | Transaction detail route | `(app)/wallet/transactions/[id]` | Exists, so a receipt is addressable six months later. **It has no `loading.tsx`** |
| R4 | Transaction list | `(app)/wallet/transactions` | **No `loading.tsx`** |
| R5 | Booking receipt | none | A stay has no receipt document. Only a booking row. The one payment a guest most needs to prove has no artefact |
| R6 | Receipt mark | | `receipt-check` does not exist. Gap |

### 6.7 What the inventory adds up to

- 14 success states, **one** shared component, **zero** consistent marks.
- 13 pending states, **three** different colours for the same idea
  (cyan on `KycStatus`, sky on `KycBanner`, emerald on `ListingWizard`).
- 17 failure states, of which **nine** are painted cyan, the pending colour.
- 6 verified states, of which the primary one is painted emerald while the
  platform's own token says verified is brand blue.
- 10 banners, **two of them dead code**, three absent entirely.
- 6 receipt surfaces, one excellent, one missing, two without a loading state.

---

## 7. THE ResultSheet SPECIFICATION

One component. Every confirmation on the platform goes through it. It replaces
`MomentScreen` rather than sitting beside it: two confirmation components is the
problem this solves, not a step toward solving it.

### 7.1 Placement

`apps/web/src/components/ui/ResultSheet.tsx`, beside the other twelve primitives,
not in `components/app`. It is composed from `Sheet`, `Button`, `BrandIcon`,
`StatusPill` and `Amount`. It introduces no new geometry.

### 7.2 The prop surface

```ts
export type ResultState = "success" | "pending" | "verified" | "failed";

export type ResultSheetProps = {
  /** Controls the sheet. Omit entirely for the inline/page presentation. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;

  /** Which of the four meanings this is. Drives colour, mark default,
      live-region politeness and motion. There is no fifth. */
  state: ResultState;

  /** THE VERDICT. One or two words. "Payment sent". "Under review".
      Enforced at the type level as a branded string produced by `verdict()`,
      which refuses a trailing "!" and refuses more than four words. */
  verdict: Verdict;

  /** THE MARK. Defaults per state from MARK_FOR_STATE. Override only when a
      flow has a more specific object, e.g. `calendar-check` for a booking. */
  mark?: BrandIconName;

  /** THE FACT. The thing the person will screenshot. Rendered as a definition
      list, largest value first. Money is passed as minor units and rendered
      through `Amount`, never as a pre-formatted string. */
  facts?: ReadonlyArray<
    | { label: string; minorUnits: number; currency?: string }
    | { label: string; value: string }
  >;

  /** THE CONSEQUENCE. What happens next and when. REQUIRED, and it is required
      on purpose: this is the line that removes fear and it is the line every
      product skips. A `pending` or `failed` result cannot be constructed
      without it. */
  consequence: string;

  /** For `failed` only, and REQUIRED there, exactly as KycStatus requires a
      reason and a fix. A failure the user cannot act on is a locked door. */
  recovery?: { label: string; onAction?: () => void; href?: string };

  /** At most two. The type is a tuple, so a third is a compile error. */
  actions?: [ResultAction] | [ResultAction, ResultAction];

  /** A reference, a digest, a transaction id. Rendered `select-all`, never
      truncated, in `nf-numeric`. */
  reference?: string;

  /** "sheet" rises from the bottom edge over the flow. "page" fills the
      content area, for a result that IS the destination (a wizard's end, an
      error boundary). Default "sheet". */
  presentation?: "sheet" | "page";
};

type ResultAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  tone?: "primary" | "quiet";   // exactly one primary
};
```

Three things the prop surface does that the current code cannot:

- `consequence` is **required**. Today `MomentScreen.description` is optional and
  half the call sites use it for the fact rather than the consequence.
- `actions` is a **tuple of at most two**. Today it is `ReactNode` and a caller
  can put six buttons there.
- `state` has **four members including `failed`**. Today there are three and
  failure is not among them, which is why nine failures are cyan.

### 7.3 The four states

| State | Ink | Surface | Default mark | Live region | Motion |
| --- | --- | --- | --- | --- | --- |
| `success` | `--nf-state-success` | `--nf-state-success-surface` | `seal-check` (gap), `payment-sent` for money | `role="status"`, `aria-live="polite"` | mark settles once, 420ms, spring |
| `pending` | `--nf-status-pending` (cyan) | `--nf-status-pending-surface` | `seal-pending` (gap), `payment-pending` for money | `role="status"`, `aria-live="polite"` | mark breathes on a 2.4s loop, opacity only |
| `verified` | `--nf-status-verified` (**brand blue**, not emerald) | `--nf-status-verified-surface` | `user-verified` (**exists**) | `role="status"`, `aria-live="polite"` | ring pulse once |
| `failed` | `--nf-state-error` (rose) | `--nf-state-error-surface` | `seal-cross` (gap), `payment-failed` for money | `role="alert"`, `aria-live="assertive"` | mark arrives with no bounce, 180ms fade |

**Brand blue is the primary action in all four.** The state colour paints the
mark's halo, the verdict and the rim of the glass tile. It never paints the
button: a rose CTA on a failure screen tells somebody the way out is dangerous.

**Nothing else.** No sixth colour, no amber, no sky. `--nf-state-info` is not a
member of this system.

### 7.4 The anatomy, in render order

```
┌─────────────────────────────────────┐
│           [ grip, sheet only ]      │
│                                     │
│            ╭───────────╮            │  1. THE MARK
│            │  ◈ 96px   │            │     BrandIcon in a glass tile:
│            ╰───────────╯            │     deep navy ground, electric blue
│                                     │     rim, soft outer glow in the
│          Payment sent               │     state colour at 22% opacity
│                                     │
│          ₦450,000.00                │  2. THE VERDICT  (nf-h2, two words)
│          Ikoyi, Lagos               │  3. THE FACT     (Amount, then rows)
│          14 Sept 2026, 18:04        │
│                                     │
│   The agent has been told and will   │  4. THE CONSEQUENCE
│   confirm within 24 hours.           │     (nf-body-sm, content-secondary,
│                                     │      max 44ch, REQUIRED)
│   Ref  NF-8H2K-99DD-0041            │     (reference, select-all, optional)
│                                     │
│   ┌───────────────────────────────┐ │  5. TWO ACTIONS AT MOST
│   │      View my booking          │ │     primary: brand blue, full width
│   └───────────────────────────────┘ │
│           Back to the stay          │     quiet: ghost, no border
└─────────────────────────────────────┘
```

The glass tile is the only glass on the sheet. The sheet body is
`--nf-surface-elevated` with `--nf-elev-3` and its rim, not a frosted panel.
**Glass where it earns it.** One 96px tile costs one composited layer; a frosted
sheet body costs a full-viewport backdrop blur on a mid-range Android for
decoration nobody asked for.

### 7.5 Motion

| Element | In | Out | Reduced motion |
| --- | --- | --- | --- |
| Backdrop | opacity 0 to 1, `--nf-duration-fast`, `--nf-ease-entrance` | reverse, `--nf-duration-instant` | opacity only, durations already collapse to 1ms via the token block |
| Sheet body | `translateY(100%)` to 0 on `--nf-ease-spring`, `--nf-duration-base` | drag physics from `Sheet`, unchanged | no transform, appears in place |
| Mark tile | scale 0.86 to 1 with a 12px lift, delayed 90ms behind the sheet, `--nf-ease-spring` | none | **scale 1 immediately, and the state colour halo fades in over 200ms** |
| Verdict and facts | opacity 0 to 1 staggered 40ms behind the mark | none | visible immediately |
| Pending mark | a 2.4s opacity loop between 0.82 and 1 on the halo only, never on the object | | **loop stops, halo holds at 1** |

**The reduced-motion rule, done properly.** Under reduced motion the animation is
removed and the state change is still communicated, because the colour halo, the
verdict text and the live region all still arrive. The user is never left
guessing. That is the difference the brief asks for and it is what the current
`.nf-reveal` reduced-motion block already gets right.

**Critically: the mark must be visible at first paint, not revealed.** An
animation outranks a normal declaration in the cascade. The tile renders at its
final state and the entrance is added by a class on mount, exactly as
`Reveal[data-instant]` had to be taught. It must never be `opacity: 0` in the
markup.

### 7.6 Accessibility

- **Focus.** On open, focus moves to the sheet container (`tabIndex={-1}`) with
  `preventScroll`, **not** to the primary action. Focusing a button the instant a
  payment result arrives means a stray Enter press fires it. `Sheet` already does
  the `preventScroll` part; the target changes from "first focusable" to "the
  container".
- **Focus return.** On close, back to the element that opened it. `useOverlay`
  already provides this.
- **Live region.** The verdict, the facts and the consequence sit inside one
  container carrying `role="status"` for three states and `role="alert"` for
  `failed`. The region must be in the DOM **before** its content, so it is
  rendered empty on mount and filled on the next frame; a live region created
  already-populated is not announced by VoiceOver or TalkBack.
- **The mark is decorative.** `BrandIcon` with no `label`, so it is
  `aria-hidden`. The verdict is the accessible name.
- **Dismissal.** Escape, backdrop click, drag past the lowest detent, and the
  quiet action. A `failed` result **must not** be dismissible by backdrop click
  alone: `dismissOnBackdrop` is false for `failed`, so somebody cannot lose a
  payment failure with a stray tap.
- **Heading.** The verdict is the sheet's `h2` and its `aria-labelledby` target.
- **`aria-describedby`** points at the consequence line.
- **No focus rectangle on pointer.** `:focus-visible` only, inherited from
  `base.css`, which already has the correct selector list.

### 7.7 390px

- Sheet detent `[0.62]` for a result with no facts, `[0.78]` with facts. Never
  `0.92`: a result is not a full-page drawer and the flow behind it is
  reassuring context.
- Mark 96px on phones, 112px from `sm`. Fixed pixel sizes on the BrandIcon so
  the percentage-padding trap cannot come back, and the tile's own padding is
  derived in pixels by `BrandIcon` already.
- Facts are a two-column definition list that **stacks to one column below
  340px**. `text-wrap: balance` on the verdict, `text-wrap: pretty` on the
  consequence, so the wallet screen's orphaned "in" cannot happen here.
- **No label is ever truncated.** A long property name wraps to two lines. The
  value stacks under its label rather than the label shrinking.
- Actions are full width and stacked, primary on top, 12px apart, with the
  bottom action clearing `env(safe-area-inset-bottom)`.

### 7.8 Light theme

- The glass tile keeps its navy ground in **both** themes, for the same reason
  `--nf-surface-artwork` exists: the mark is lit against navy and washing it out
  on paper would break the set. It is the one deliberately theme-independent
  element.
- The sheet body is white with a neutral hairline, no glow, no coloured shadow.
- State inks swap to the light-theme values `tokens.css` already defines
  (`#0A7A51`, `#0E6E8C`, `#C10E32`), which are the deeper variants chosen for
  contrast on paper.
- **The outer glow is removed entirely in light.** A coloured bloom under a sheet
  is a night-theme device and it is exactly the "blue-tinted grey" smell rule 7
  forbids. The signed-out wallet screenshot already shows the primary button
  carrying a blue glow in the light theme; the same discipline applies here.

### 7.9 Migration

1. Build `ResultSheet`. Do not touch `MomentScreen` yet.
2. Move the three money surfaces first: `PayPanel`, `PaymentReturn`,
   `FundingVerifier`. They are the highest value and `PaymentReturn` and
   `FundingVerifier` collapse into one call site with two prop sets.
3. Move the error boundaries, which is where the nine cyan failures live.
4. Move the wizard endings.
5. Delete `MomentScreen` and `nf-moment*` from `chips.css`.
6. Add a Playwright spec that asserts no `MomentScreen` import survives and that
   no `role="alert"` element on the platform carries `--nf-state-warning`. That
   is the enforcement step, and it is the step the colour rule got and type
   never did.

---

## 8. THE CREATIVE PROMPTS for the missing marks

House style, matching the 87 matte-clay objects and **not** the glass logo. The
style block is `docs/BRAND_MARKS.md` section 4 verbatim; I have not rewritten it.
What follows are the subject lines for the marks the Section 24 inventory proved
are missing, written the way a creative director briefs a 3D artist.

`docs/BRAND_MARKS.md` is Track A's file. These are recommendations to add there,
written here so the lead can lift them whole.

**Before generating any of these: open `wallet-secure.png` and
`user-verified.png` side by side and match the plinth, the lighting angle and the
blue. And do not build `seal-check` as a rosette that competes with
`user-verified`. That mark already exists and already solves the tick.**

### 8.1 The money group, which is the highest value

> **payment-sent.** The object is: a single Nigerian naira note, soft and
> matte-white with rounded corners like folded felt, lifting off an open white
> palm and tilting away from the viewer, with a smooth electric blue arc curving
> up behind it to trace the path it has taken. The note is caught at the moment
> it leaves the hand. Calm and weightless, not fast.

> **payment-pending.** The object is: a thick white coin standing on its edge,
> caught mid-spin so its face is foreshortened, enclosed by a soft electric blue
> ring that floats a little clear of it. The coin is very slightly soft at its
> leading edge, the way something moving reads in a still photograph. Patient
> rather than urgent.

> **payment-failed.** The object is: a naira note lying flat and slightly
> rumpled on the plinth, with a small electric blue wax seal pressed onto its
> corner bearing a clean white cross. The note is settled and still. This is a
> transaction that stopped, not one that went wrong loudly.

> **wallet-plus.** The object is: the same rounded white wallet as
> `wallet-secure`, closed, with a small electric blue disc badge on its lower
> right corner carrying a thick white plus. Generous and welcoming.

> **wallet-out.** The object is: the same rounded white wallet, its flap lifted
> a little, with one smooth electric blue arrow curving out of the opening and
> away to the upper right. Open and released, not emptied.

> **transfer-arrow.** The object is: two soft white rounded pads set a little
> apart on the plinth, with two thick electric blue arrows curving between them
> in a closed loop, one going each way. Balanced, like a handshake.

> **receipt-check.** The object is: a curled paper receipt with softly rounded
> edges, standing upright on the plinth with its lower end gently rolled, and a
> small scalloped electric blue seal bearing a white tick pressed onto its lower
> half. Reassuring and permanent, the sort of thing somebody keeps.

> **ledger-book.** The object is: a small white book lying open on the plinth,
> its pages ruled with fine electric blue lines, and one short blue tick resting
> in the margin of the right-hand page. Ordinary, careful, complete.

> **savings-pot.** The object is: a round white pot with a soft shoulder and a
> slim electric blue slot in its lid, with a single white coin half-entered in
> the slot and caught before it drops. Homely rather than institutional.

> **escrow-hold.** The object is: a squat white strongbox with rounded corners,
> banded across its middle in electric blue, with the corner of a naira note
> showing at the seam of the closed lid. Solid and quiet. **Do not ship this
> mark until escrow exists.**

### 8.2 The generic state group

> **seal-pending.** The object is: a scalloped rosette in soft matte white,
> floating slightly clear of its plinth, with a small electric blue hourglass at
> its centre, the sand caught mid-fall. Exactly the same rosette silhouette as
> `user-verified`, in white rather than blue, so the two read as the same family
> in two different moods.

> **seal-cross.** The object is: the same scalloped rosette, in soft matte
> white, floating slightly clear of its plinth, with a clean electric blue cross
> at its centre. Plain and calm. It must not look angry.

> **hourglass-blue.** The object is: a rounded hourglass with a soft white frame
> and a thick white base, its sand rendered in electric blue and caught halfway
> through the fall with a thin stream between the bulbs. Still and patient.

> **progress-ring.** The object is: a thick white ring standing upright on the
> plinth, with two thirds of its circumference filled in electric blue,
> beginning at the top and running clockwise, the fill ending in a soft rounded
> cap. Simple, no numbers, no ticks.

> **clock-expired.** The object is: a round white clock with a soft raised bezel
> and no hands, with one clean electric blue diagonal stroke resting across its
> face from upper left to lower right. Finished rather than broken.

> **alert-triangle.** The object is: a triangle with generously rounded corners
> in soft matte white, standing on the plinth, with a short thick electric blue
> exclamation mark set into its face. Attentive, never alarming.

### 8.3 Identity and documents

> **id-card-check.** The object is: a rounded white identity card lying at a
> slight angle on the plinth, with a solid electric blue block where the
> photograph sits and a small blue tick set into its lower right corner. Formal
> but friendly.

> **doc-review.** The object is: a white document with softly rounded corners
> lying on the plinth, with a rounded electric blue magnifier resting across it,
> its handle running off to the lower right. Somebody is reading it carefully.

> **doc-cross.** The object is: a white document with softly rounded corners,
> lying flat, with a small electric blue wax seal bearing a white cross pressed
> onto its lower half. Matches `receipt-check` exactly in the seal, so the pair
> reads as two outcomes of one process.

### 8.4 Property flow

> **keys-handover.** The object is: two soft white hands emerging from opposite
> edges of the plinth, one offering and one receiving a single electric blue key
> held between them. The moment before the key is let go. Warm and ceremonial.

> **contract-sign.** The object is: a white document lying open on the plinth
> with a fine electric blue line ruled across its lower third, and a slim blue
> pen resting on that line at a slight angle, nib toward the viewer. Settled, not
> in progress.

---

## 9. THE RECOMMENDATIONS

Seven fields each. Grouped by area. Ids are stable.

### 9.1 The confirmation system (Section 24)

**A3-001. There is no failure state in the shared confirmation component.**
*Evidence:* `MomentScreen.tsx`, `MomentVariant = "success" | "brand" | "warning"`;
`chips.css` `.nf-moment--warning` sets `--nf-moment-color: var(--nf-state-warning)`.
Nine failure surfaces reach for `warning`: `(app)/error.tsx`, `agent/error.tsx`,
`admin/error.tsx`, and four branches of `checkout/[bookingId]/page.tsx`.
*Action:* add `failed` mapped to `--nf-state-error`, or build `ResultSheet` per
section 7 and retire `MomentScreen`.
*Reason:* cyan is the platform's pending colour. A crashed page, a missing
booking and a cancelled stay currently tell the user "please wait".
*Impact:* every failure on the platform becomes readable as a failure.
*Effort:* S for the variant, M for the migration. *Risk:* low, additive.
*Priority:* **High**

**A3-002. A declined payment is painted the pending colour with a notification bell.**
*Evidence:* `PayPanel.tsx`, `phase.kind === "error"` branch:
`className="... text-[var(--nf-state-warning)]"` with `<UiIcon name="bell" size={16} />`.
*Action:* `--nf-state-error`, the `info` glyph or a `payment-failed` BrandIcon,
and a recovery action beside the message.
*Reason:* somebody who just failed to pay rent is shown "please wait" and a bell.
*Impact:* the single most frightening moment in the product stops lying about
what happened. *Effort:* S. *Risk:* none.
*Priority:* **Critical** (a user who cannot tell a decline from a wait is blocked
from the core loop and may pay twice elsewhere)

**A3-003. Pending on the money path is a button spinner and nothing else.**
*Evidence:* `PayPanel.tsx` `Phase` has `card-starting`, `card-redirecting`,
`wallet-paying`; all three render only as `loading` on `<Button>`. No text
changes, no live region, no timeout.
*Action:* render a `ResultSheet` in `pending` while the action is in flight:
verdict "Sending payment", the amount as the fact, and the consequence "Do not
close this page. This usually settles in under a minute."
*Reason:* the brief names this exact second as the one where the platform is
either reassuring or frightening. Today it is silent.
*Impact:* removes the highest-anxiety moment in the product.
*Effort:* M. *Risk:* low.
*Priority:* **Critical**

**A3-004. Two identical settlement components exist in two files and will drift.**
*Evidence:* `checkout/[bookingId]/PaymentReturn.tsx` and
`(app)/wallet/FundingVerifier.tsx` share the strings "Confirming your payment",
"Checking with the payment service. This takes a moment.", "Payment check" and
"The payment could not be confirmed just now.", with different type classes
(`text-[0.9375rem]` vs `nf-body`).
*Action:* one `SettlementResult` built on `ResultSheet`, taking the action and
the success copy as props.
*Reason:* two copies of one screen means the next fix lands on one of them.
*Impact:* one place to improve the money-settling experience.
*Effort:* M. *Risk:* low. *Priority:* **High**

**A3-005. "Payment check" is not a verdict.**
*Evidence:* `PaymentReturn.tsx` and `FundingVerifier.tsx`, `failed` branch:
`<p ...>Payment check</p>` in `--nf-content-primary`.
*Action:* "Payment not confirmed", in rose, with the reference, a "Try again"
primary and a "Contact support" quiet action.
*Reason:* a heading that names the process rather than the outcome tells a
frightened person nothing, and there is nowhere to go from it.
*Impact:* a failed payment becomes recoverable instead of terminal.
*Effort:* S. *Risk:* none. *Priority:* **Critical**

**A3-006. A failed wallet funding is dismissed by a button labelled "Done".**
*Evidence:* `FundingVerifier.tsx`: `{state.phase !== "verifying" && <Button ... onClick={dismiss}>Done</Button>}`,
rendered for both `credited` and `failed`.
*Action:* label by state. "Done" on success, "Try again" plus "Get help" on
failure.
*Reason:* "Done" on a failure tells the user the matter is closed when their
money is unaccounted for.
*Impact:* removes an actively misleading control on a money screen.
*Effort:* XS. *Risk:* none. *Priority:* **High**

**A3-007. A pending listing is painted as a success.**
*Evidence:* `ListingWizard.tsx` renders `<MomentScreen variant="success" ...>`
with no `icon`, so it falls to `shield-check`. The copy (`en.ts`,
`agent.list.submitted.title`) is "Your listing is with our review team".
*Action:* `pending`, mark `listing-review`.
*Reason:* emerald means settled. This is not settled and the copy says so.
*Impact:* an agent stops believing their listing is live.
*Effort:* XS. *Risk:* none. *Priority:* **High**

**A3-008. KycBanner has pending and failed inverted.**
*Evidence:* `KycBanner.tsx` `COPY`: `pending` carries `tone: "info"` (resolves to
`--nf-state-info`, `#38BDF8`, a sky) and `failed` carries `tone: "warning"`
(resolves to `--nf-state-warning`, the cyan reserved for pending).
*Action:* `pending` to the cyan (`--nf-status-pending`), `failed` to rose
(`--nf-status-rejected`).
*Reason:* the same agent sees pending as cyan in `KycStatus` and sky in
`KycBanner`, and a failed check wears the waiting colour.
*Impact:* one answer to "where do I stand" across both surfaces.
*Effort:* XS. *Risk:* none. *Priority:* **High**

**A3-009. Verified is painted emerald where the platform's own token says brand blue.**
*Evidence:* `KycStatus.tsx` `approved` branch uses `tone="success"`.
`tokens.css` defines `--nf-status-verified: var(--nf-electric-300)` with the
comment "VERIFIED IS BRAND BLUE. Verified is not a state a thing passed through,
it is Vallo putting its own name to something".
*Action:* a `verified` tone on `Panel` reading `--nf-status-verified`.
*Reason:* the decision is already written down and the code does not follow it.
Emerald must mean one thing.
*Impact:* the verified tick reads as the brand's own endorsement.
*Effort:* S. *Risk:* low. *Priority:* **Medium**

**A3-010. `--nf-status-verified` and its surface are defined and almost unused.**
*Evidence:* `tokens.css` defines both; grep across `apps/web/src` finds the
verification surfaces reaching for `state-success` instead.
*Action:* route `VerifiedAvatar`, the listing verified badge and `KycStatus`
through the status tokens.
*Reason:* a token nothing reads is a decision nothing enforces.
*Impact:* one change moves every verified mark. *Effort:* M. *Risk:* low.
*Priority:* **Medium**

**A3-011. `toneForStatus` gives PENDING and PROCESSING two indistinguishable blues.**
*Evidence:* `StatusPill.tsx`: `PENDING` to `warning` (cyan `#00C8FF`),
`PROCESSING` to `info` (sky `#38BDF8`).
*Action:* collapse `info` into `pending`. Both mean "in motion, nothing is owed".
Distinguish by label, which rule 16 requires anyway.
*Reason:* two light blues 10 degrees of hue apart are one colour on a phone in
Lagos sunlight, and neither is a designed distinction.
*Impact:* removes a colour the user cannot decode.
*Effort:* S. *Risk:* low, `info` has two consumers.
*Priority:* **Medium**

**A3-012. `toneForStatus` calls a refund a danger.**
*Evidence:* `StatusPill.tsx`: `REFUNDED` and `REVERSED` both fall into the
`danger` case alongside `FAILED` and `REJECTED`.
*Action:* `REFUNDED` to `success` (the money came back, which is the good
outcome). `REVERSED` stays `danger`.
*Reason:* telling somebody their refund is rose-coloured suggests something went
wrong when the thing they wanted happened.
*Impact:* refunds stop reading as failures.
*Effort:* XS. *Risk:* none. *Priority:* **Medium**

**A3-013. A receipt renders the raw database enum.**
*Evidence:* `Receipt.tsx`: `{settled ? "Successful" : entry.status === "PENDING" ? "Pending" : entry.status}`
and `<Row label="Status" value={settled ? "Successful" : entry.status} />`.
*Action:* a `STATUS_LABEL` map covering every value the ledger can produce, with
a humane default.
*Reason:* `AWAITING_PAYMENT` on a document people screenshot and send to a
landlord is not a product.
*Impact:* every receipt reads as written by a person.
*Effort:* S. *Risk:* none. *Priority:* **High**

**A3-014. A failed or reversed receipt has no explanation.**
*Evidence:* `Receipt.tsx` special-cases `PENDING` with a sentence and nothing
else.
*Action:* an equivalent sentence for `FAILED`, `REVERSED` and `REFUNDED` saying
where the money is and what happens next.
*Reason:* the pending sentence exists because it stops a dispute. The failure
sentence would stop a bigger one.
*Impact:* fewer support calls at the worst moment.
*Effort:* S. *Risk:* none. *Priority:* **High**

**A3-015. A stay has no receipt.**
*Evidence:* `Receipt.tsx` is wallet-only, keyed on `WalletEntry`. There is no
equivalent for a booking payment.
*Action:* a booking receipt at `/bookings/[id]/receipt` built from the same
component with a `BookingEntry` shape: property, dates, guests, the amount and
the reference.
*Reason:* the one payment a Nigerian tenant most needs to prove is the one with
no artefact.
*Impact:* the platform becomes usable as evidence.
*Effort:* M. *Risk:* low. *Priority:* **High**

**A3-016. Copying a receipt reference can fail silently.**
*Evidence:* `ReceiptActions.tsx`, the `copy` catch block is empty by design.
*Action:* on failure, select the reference node and show "Press and hold to
copy". Never a no-op.
*Reason:* a tap that does nothing is the clearest possible signal that a product
is broken.
*Impact:* removes a dead tap. *Effort:* S. *Risk:* none.
*Priority:* **Medium**

**A3-017. "Share" silently becomes "Copy" where `navigator.share` is absent.**
*Evidence:* `ReceiptActions.tsx`, `share` falls through to `copy(summary)` with
no feedback.
*Action:* after the fallback, flip the label to "Copied" exactly as the copy
button does.
*Reason:* the user asked to share and got something else with no acknowledgement.
*Impact:* the control tells the truth. *Effort:* XS. *Risk:* none.
*Priority:* **Medium**

**A3-018. The "Copied" confirmation is invisible to assistive technology.**
*Evidence:* `ReceiptActions.tsx` flips the button's own text with no live region.
*Action:* a visually hidden `role="status"` announcing "Reference copied".
*Reason:* a label change on the focused element is not reliably re-announced.
*Impact:* a blind user knows the tap worked.
*Effort:* XS. *Risk:* none. *Priority:* **Medium**

**A3-019. A booking inspection request has no success state.**
*Evidence:* `RequestInspection.tsx` holds `error` and `pending` and nothing else;
success is the absence of an error.
*Action:* a `ResultSheet` success with `calendar-check`, the date as the fact and
"The agent has been told and will confirm within 24 hours" as the consequence.
*Reason:* booking an inspection is the moment a renter commits time, and nothing
tells them it worked.
*Impact:* closes one of the loops named in the ONE LAW.
*Effort:* S. *Risk:* none. *Priority:* **High**

**A3-020. Redirecting to Paystack happens with no warning.**
*Evidence:* `PayPanel.tsx`: `setPhase({ kind: "card-redirecting" }); window.location.assign(result.data.authorizationUrl);`
*Action:* a `pending` result saying "Opening the secure payment page" with the
processor named, held for a beat before the assign.
*Reason:* being thrown to a third-party domain mid-payment with no explanation is
indistinguishable from a phishing redirect, on a market where that is a real fear.
*Impact:* directly raises payment completion.
*Effort:* S. *Risk:* low. *Priority:* **High**

**A3-021. There is no timeout on either settlement check.**
*Evidence:* `PaymentReturn.tsx` and `FundingVerifier.tsx` both `await` the action
with no race against a timer.
*Action:* after 20 seconds, move to a distinct `pending` result: "Still
confirming", the reference, "Your money is safe. We will email you within 10
minutes" and a link to the wallet.
*Reason:* if the action hangs, the user watches "Confirming your payment" forever
and there is no escape.
*Impact:* removes an unbounded wait on a money screen.
*Effort:* M. *Risk:* low. *Priority:* **High**

**A3-022. "Payment switches on shortly" is a coming-soon promise on a money screen.**
*Evidence:* `checkout/[bookingId]/page.tsx`, `state === "unconfigured"`.
*Action:* state the real condition without a timeline: "Card payment is not
available on this account yet. Your dates are held and nothing has been charged."
*Reason:* rule 13 bans the literal strings; the spirit is that the product never
promises a date it does not hold. "Shortly" is a date.
*Impact:* the platform stops writing cheques its roadmap has not signed.
*Effort:* XS. *Risk:* none. *Priority:* **Medium**

**A3-023. "Notifications switch on shortly" is the same problem.**
*Evidence:* `(app)/notifications/page.tsx`, the unconfigured branch.
*Action:* as A3-022. *Reason:* as A3-022. *Impact:* as A3-022.
*Effort:* XS. *Risk:* none. *Priority:* **Medium**

**A3-024. A tick mark sits on three non-success screens.**
*Evidence:* `checkout/page.tsx` passes `icon="calendar-check"` to the "We could
not find that booking" and "This booking was cancelled" screens, and
`icon="shield-check"` to "Checkout is unavailable".
*Action:* `seal-cross` or `clock-expired` once commissioned; `bell-alert` in the
interim.
*Reason:* a green-adjacent tick on a failure is the clearest possible mixed
signal.
*Impact:* the mark stops contradicting the headline.
*Effort:* XS. *Risk:* none. *Priority:* **Medium**

**A3-025. A page crash is marked with a padlock.**
*Evidence:* `(app)/error.tsx`, `icon="shield-lock"`.
*Action:* `alert-triangle` once commissioned, `bell-alert` today.
*Reason:* a padlock on a crash suggests a permissions or security problem, which
is a worse guess than the truth.
*Impact:* removes a misleading signal on an already bad moment.
*Effort:* XS. *Risk:* none. *Priority:* **Nice-to-have**

**A3-026. `MomentScreen` pops the icon on every variant including warning.**
*Evidence:* `MomentScreen.tsx` hard-codes `state="confirmed"` on the `BrandIcon`
regardless of variant; `chips.css` `.nf-moment__badge` runs
`nf-moment-badge-in 0.5s` unconditionally.
*Action:* map the motion to the variant. A failure does not bounce.
*Reason:* a celebratory pop on "That screen did not load" reads as the product
not understanding what just happened.
*Impact:* the motion carries meaning instead of decoration.
*Effort:* S. *Risk:* none. *Priority:* **Medium**

**A3-027. `MomentScreen` has no live region.**
*Evidence:* the component renders a bare `div`. Its `h1` is not announced on a
client-side transition into the success branch.
*Action:* `role="status"` for success, brand and pending; `role="alert"` for
failed.
*Reason:* `PayPanel` swaps its whole render for a `MomentScreen` on success.
A screen reader user is told nothing happened.
*Impact:* the confirmation of a payment reaches every user.
*Effort:* XS. *Risk:* none. *Priority:* **High**

**A3-028. `MomentScreen` has no focus management.**
*Evidence:* no `tabIndex`, no `ref`, no focus call. After `PayPanel` swaps its
tree, focus is on a button that no longer exists and falls to `<body>`.
*Action:* move focus to the result container on mount.
*Reason:* a keyboard user must tab from the top of the document to find out what
happened. *Impact:* keyboard parity on the money path.
*Effort:* S. *Risk:* low. *Priority:* **Medium**

**A3-029. The fact and the consequence are the same prop.**
*Evidence:* `MomentScreen` has one `description`. `PayPanel` uses it for the fact
(`${view.totalDisplay} left your wallet...`), `ListingWizard` uses it for the
consequence.
*Action:* separate slots, with the consequence required, per section 7.2.
*Reason:* the consequence is the line that removes fear and today it is
optional and competes with the amount.
*Impact:* every result answers "what happens next".
*Effort:* M. *Risk:* low. *Priority:* **High**

**A3-030. Money in a confirmation is a pre-formatted string, not an `Amount`.**
*Evidence:* `PayPanel.tsx` interpolates `view.totalDisplay` into prose;
`checkout/page.tsx` does the same.
*Action:* `Amount` with `minorUnits`, so the confirmation gets tabular figures,
the two-tone treatment and the locale's own symbol placement.
*Reason:* the screen people screenshot renders the figure worse than the summary
above it. *Impact:* the money reads as money on the screen that matters most.
*Effort:* S. *Risk:* low. *Priority:* **Medium**

**A3-031. There is no `payment-sent` mark.**
*Evidence:* `BRAND_ICONS` in `BrandIcon.tsx`, 87 names, none for a payment made.
*Action:* commission it from the prompt in section 8.1.
*Reason:* the highest-value success in the product has no mark of its own.
*Impact:* the screenshot people send to a friend becomes unmistakably Vallo.
*Effort:* S (a render). *Risk:* none. *Priority:* **[TRACK A] High**

**A3-032 to A3-038. The remaining money and state marks.** Same evidence
(`BRAND_ICONS` has none of them), same action (commission from section 8), same
reason (the confirmation system cannot be one system without them), Effort S each,
Risk none, Priority **[TRACK A] Medium**, for: `payment-pending` (A3-032),
`payment-failed` (A3-033), `wallet-plus` (A3-034), `wallet-out` (A3-035),
`receipt-check` (A3-036), `seal-pending` (A3-037), `seal-cross` (A3-038).

**A3-039. Do not commission `seal-check`.**
*Evidence:* `user-verified.png` exists and is the blue scalloped rosette with a
white tick. `docs/BRAND_MARKS.md` section 3.2 lists `seal-check` as a mark to
build and describes the same object.
*Action:* strike row 12 from the commission table; point the generic success mark
at `user-verified`.
*Reason:* two rosettes in one set is how a set stops reading as a set, and the
brief says explicitly that this mark does not need replacing.
*Impact:* saves a render and prevents a near-duplicate.
*Effort:* XS. *Risk:* none. *Priority:* **[TRACK A] Medium**

**A3-040. The `verified` marks the ladder should use are `UiIcon` glyphs.**
*Evidence:* `KycStatus.tsx` uses `UiIcon` `verified`, `shield-stop` and
`calendar-booking` at display size inside a card whose whole job is a status
verdict.
*Action:* `user-verified`, `doc-shield` and `seal-pending` as BrandIcons at 48px.
*Reason:* section 13 and `ICON_SYSTEM.md`: UiIcon is navigation and controls,
BrandIcon is content. A verdict is content.
*Impact:* the verification ladder joins the brand's visual language.
*Effort:* S. *Risk:* none. *Priority:* **Medium**

**A3-041. Nine failure surfaces are cyan. Enforce it once it is fixed.**
*Evidence:* the F-rows of the Section 24 inventory.
*Action:* a Playwright spec asserting that no element carrying `role="alert"`
computes a colour equal to `--nf-state-warning`.
*Reason:* the colour rule is at zero because a checker holds it. Nothing holds
this one.
*Impact:* the fix cannot regress.
*Effort:* M. *Risk:* none. *Priority:* **Medium**

**A3-042. Validation errors render at 11px and 12px.**
*Evidence:* `ApplyWizard.tsx`: `role="alert" className="text-[0.75rem] ..."` and
`text-[0.6875rem]`.
*Action:* `--nf-text-caption` (13px) as the floor for any error message.
*Reason:* the smallest type in the product is on the sentence that unblocks the
user, on a phone, often outdoors.
*Impact:* form errors become readable. *Effort:* XS. *Risk:* none.
*Priority:* **High**

**A3-043. Message send and failure are announced to nobody.**
*Evidence:* `ThreadView.tsx` renders `{m.state === "sending" ? "Sending" : m.timeLabel}`
and the failed caption, with no live region on the list.
*Action:* one `aria-live="polite"` region announcing "Sending", "Sent" and
"Not sent, tap to retry".
*Reason:* a blind user cannot tell whether their message left.
*Impact:* messaging becomes usable without sight.
*Effort:* S. *Risk:* none. *Priority:* **Medium**

**A3-044. There is no delivered or read state.**
*Evidence:* `ThreadView.tsx` `state?: "sending" | "failed"` and nothing else.
*Action:* a third state from the read receipt the database already tracks, drawn
as a shape change on the timestamp, not a colour.
*Reason:* section 20 names read states in scope, and in this market a "seen" tick
is what tells a renter the agent is real.
*Impact:* trust in the messaging loop.
*Effort:* M, and depends on Agent 2's read-receipt data.
*Risk:* low. *Priority:* **Medium**

**A3-045. There is no toast system.**
*Evidence:* the only toast on the platform is `.nf-social-toast` in
`social-feed.css`, used by three social components and `IntentTune`. Every other
surface writes a bespoke inline paragraph.
*Action:* promote it to `components/ui/Toast.tsx` with a single portal host in
the app layout, four tones matching `ResultState`, and `role="status"`.
*Reason:* a lightweight confirmation ("Saved", "Copied", "Removed") needs an
answer, and today there are forty.
*Impact:* the small successes stop being bespoke.
*Effort:* M. *Risk:* low. *Priority:* **Medium**

### 9.2 Design tokens

**A3-046. Five media tokens are declared twice in the same `:root` and the second block reverts the first.**
*Evidence:* `packages/design-tokens/src/tokens.css`. `--nf-media-wall`,
`--nf-media-wall-shade`, `--nf-media-roof`, `--nf-media-glass` and
`--nf-media-land` appear at lines 273 to 277 with the lifted values
(`rgb(226 234 250 / 0.34)` and siblings) and **again at lines 291 to 295** with
the old values (`rgb(255 255 255 / 0.13)` and siblings), under a byte-identical
copy of the same comment block. The later declaration wins. I confirmed the
duplication with a per-token tally: these five are the only tokens in the file
declared three times (twice in `:root`, once in the light block); every other
token appears exactly twice.
*Action:* delete the second block, lines 283 to 295.
*Reason:* the comment above `--nf-media-ground-from` says the sky was lifted out
of being "a dark grey smudge on a dark navy square" and that "every part of the
building below has been lifted to match". It was not. The dark theme still paints
the old building on the new sky, so the listing placeholder in the default theme
is the exact failure that fix was written to remove. The light theme overrides
all five correctly, so **the bug is dark-only**, which is the default theme.
*Impact:* every listing without a photograph stops reading as a broken image, in
the theme almost everybody sees.
*Effort:* XS. *Risk:* none, it restores the intended values.
*Priority:* **High**

**A3-047. `--nf-state-info` is a Tailwind sky and does not belong to the family.**
*Evidence:* `tokens.css`: `--nf-sky-400: #38BDF8` (Tailwind `sky-400` exactly),
`--nf-state-info: var(--nf-sky-400)`. Consumers: `StatusPill` `info`,
`KycBanner` `info`, `theme.css` `--color-info`.
*Action:* retire the `info` role. Its two real meanings are already covered:
"in motion" is pending (cyan) and "explanatory" is `--nf-content-secondary`.
*Reason:* rule 9 says one blue family and names the anchors. `#38BDF8` is none of
them and is the single most recognisable generic SaaS blue there is.
*Impact:* removes the only hue in the palette that could not survive the founder
looking at it. *Effort:* S. *Risk:* low, three consumers.
*Priority:* **High**

**A3-048. `--nf-crimson-400` and `--nf-rose-400` are the same colour under two names.**
*Evidence:* `tokens.css`: both are `#FF1744`. Neither `--nf-crimson-400` nor
`--nf-crimson-500` is referenced anywhere in `apps/web/src` or
`packages/*/src` (I grepped each individually).
*Action:* delete both crimson entries.
*Reason:* two names for one value is how a future change moves half the reds.
*Impact:* the palette stops carrying a decoy.
*Effort:* XS. *Risk:* none, zero consumers. *Priority:* **Medium**

**A3-049. Four layer-1 palette entries have zero consumers.**
*Evidence:* `--nf-cyan-500`, `--nf-royal-600`, `--nf-ink-600` and `--nf-ink-500`
each return zero `var()` references across `apps/web/src` and `packages/*/src`.
*Action:* delete them, or state in a comment why each is held.
*Reason:* an unused palette entry is an invitation to reach into layer 1, which is
the ADR-002 violation the whole two-layer system exists to prevent.
*Impact:* the palette is exactly what the product paints.
*Effort:* XS. *Risk:* low. *Priority:* **Nice-to-have**

**A3-050. Layer 2 contains raw hexes that layer 1 does not carry.**
*Evidence:* `--nf-surface-canvas: #000010`, `--nf-content-inverse: #0B0D14`,
`--nf-content-on-brand: #FFFFFF`, `--nf-icon-ground: #F5F7FD`,
`--nf-media-ground-from: #1B2A52`, and in the light block
`--nf-state-success: #0A7A51`, `--nf-state-warning: #0E6E8C`,
`--nf-state-error: #C10E32`, `--nf-state-info: #0369A1`.
*Action:* promote each to a named layer-1 entry (`--nf-ink-1000`,
`--nf-ink-paper`, `--nf-emerald-600`, `--nf-cyan-700`, `--nf-rose-600`) and have
layer 2 reference them.
*Reason:* the file's own header says layer 1 is the palette and layer 2 is
semantic. Nine of the most-painted values in the product live only in layer 2, so
the palette does not describe the product.
*Impact:* one place to read every colour Vallo paints.
*Effort:* M. *Risk:* low, mechanical. *Priority:* **Medium**

**A3-051. `--nf-content-inverse` is `#0B0D14`, a blue-tinted grey.**
*Evidence:* `tokens.css`. Rule 7 forbids blue-tinted greys.
*Action:* either make it a true neutral, or say in the comment that it is
deliberately navy because it is the brand's own ink on a light chip.
*Reason:* the rule exists and this value is the closest thing in the file to
breaking it. It may be intentional; nothing says so.
*Impact:* removes an ambiguity in the one file that is meant to be unambiguous.
*Effort:* XS. *Risk:* low. *Priority:* **Nice-to-have**

**A3-052. `packages/design-tokens/src/index.ts` has one consumer and 192 lines.**
*Evidence:* the only import of the package's JS entry anywhere in
`apps/web/src` or `packages/*/src` is
`design-system/icons/TrustIcon.tsx: import { token } from "@naijafinds/design-tokens"`.
`palette`, `iconRamp`, `iridescentRamp`, `duration` and `easing` have **zero**
consumers, verified by grepping each name individually.
*Action:* delete `iconRamp`, `iridescentRamp`, `duration` and `easing`. Keep
`palette` only if something is about to draw an SVG from it; if not, delete it
too and keep `token`.
*Reason:* the brief says this file "MUST BE KEPT IN STEP WITH LAYER 1 and it had
drifted badly once". It drifted precisely because nothing reads it and nothing
tests it. A mirror nobody looks in is a mirror that lies.
*Impact:* removes the most likely place for the next brand drift to hide.
*Effort:* S. *Risk:* low. *Priority:* **Medium**

**A3-053. `iconRamp` ships raw literals that are not in the palette and three of them are Tailwind slate.**
*Evidence:* `index.ts`: `slate: ["#CBD5E1", "#94A3B8", "#334155"]` are Tailwind
`slate-300/400/700` exactly, and are blue-tinted greys. Ten further stops
(`#67E8F9`, `#0E7490`, `#7DD3FC`, `#0369A1`, `#8FA5FF`, `#7A8CF5`, `#6EE7B7`,
`#047857`, `#FDA4AF`, `#9F1239`) are hard-coded and absent from `palette`.
*Action:* delete `iconRamp` with A3-052, or derive every stop from `palette`.
*Reason:* the file's own comment says "A mirror that repeats a value is a mirror
that drifts", and then repeats thirteen values. Three of them break rule 7.
*Impact:* the JS mirror stops being a second, unpoliced palette.
*Effort:* XS if deleted. *Risk:* none, zero consumers.
*Priority:* **Medium**

**A3-054. `--nf-canvas-bloom-1/2/3` exist and the ambient layer ignores them.**
*Evidence:* `tokens.css` defines all three as radial gradients built from
`color-mix` on `--nf-electric-500/600/400`. `ambient.css`
`.nf-ambient > span:nth-child(2)` and `(3)` write
`radial-gradient(circle, rgb(12 57 239 / 0.26) ...)` and
`rgb(92 124 255 / 0.18)` by hand instead.
*Action:* point the spans at the tokens.
*Reason:* the tokens carry the light-theme override (`none`); the raw gradients
do not, so the light theme is relying on a separate rule to hide something the
token already handles.
*Impact:* the living canvas follows the theme from one place.
*Effort:* S. *Risk:* low. *Priority:* **Medium**

**A3-055. 343 raw colour literals remain in the stylesheets.**
*Evidence:* `node apps/web/scripts/check-css-tokens.mjs` prints
"0 layer-1 references under src/app/css. 343 raw colour literals remain across
the stylesheets (counted, not yet enforced)". I ran it; exit 0.
*Action:* ratchet. Record 343 as the ceiling in the script and fail on any
increase, then bring it down file by file starting with `ambient.css`.
*Reason:* the script's own comment explains why it is not fatal today and is
right. A ratchet makes the number monotonic without failing a clean checkout.
*Impact:* the debt can only shrink. *Effort:* S for the ratchet.
*Risk:* none. *Priority:* **Medium**

**A3-056. The soft list in the CSS token checker should be empty.**
*Evidence:* `check-css-tokens.mjs` holds `side-nav.css`, `social.css`,
`social-feed.css` and `settings-rows.css` as warn-only "owned by other
workstreams". The run reports zero layer-1 references anywhere.
*Action:* delete the `SOFT` predicate. The script's own comment says this is the
only change needed.
*Reason:* the debt it was protecting is gone and the exemption outlived it.
*Impact:* four more stylesheets held to the same line.
*Effort:* XS. *Risk:* low. *Priority:* **Medium**

**A3-057. There is no type enforcement and 995 raw font sizes.**
*Evidence:* `grep -roh 'text-\[[0-9.]*\(rem\|px\)\]'` across `apps/web/src`
returns 995 matches over more than 40 distinct values. The top five:
`text-[0.8125rem]` 266, `text-[0.875rem]` 168, `text-[0.75rem]` 166,
`text-[0.9375rem]` 123, `text-[0.6875rem]` 42. Eleven type tokens exist,
`--nf-text-display` through `--nf-text-overline`.
*Action:* an ESLint rule `nf/no-raw-type` in the same shape as `nf/no-raw-colour`,
seeded with the current count as a ratchet ceiling. Then a codemod for the 348
that are exact token restatements.
*Reason:* this is RECOMMENDATIONS D-1 with a number on it, and it is the single
biggest reason the product reads as inconsistent screen to screen. Colour is at
zero because a rule holds it. Type has no rule and is at 995.
*Impact:* typography becomes a system rather than a thousand local decisions.
*Effort:* L. *Risk:* medium, a large mechanical change.
*Priority:* **High**

**A3-058. `--nf-text-body-sm` is the scale's most useful rung and nothing uses it.**
*Evidence:* `--nf-text-body-sm: 0.90625rem`. The nearest raw value,
`text-[0.9375rem]`, appears 123 times.
*Action:* either move the token to `0.9375rem` and adopt it, or adopt it as it
stands. Decide once.
*Reason:* 123 authors picked a value 0.03rem from the token because the token was
harder to reach for than the literal.
*Impact:* the scale gains its missing rung in real use.
*Effort:* M. *Risk:* low, a 0.5px shift.
*Priority:* **Medium**

**A3-059. `--nf-radius-circle` has 21 CSS consumers and zero TSX consumers.**
*Evidence:* grep returns 21 hits in the stylesheets and none in `.tsx`, where 79
sites write `rounded-full` instead.
*Action:* a Tailwind theme entry `rounded-circle` mapping to the token, then a
codemod.
*Reason:* the token exists because "a control and a circle shared one token" was
a real bug. The components never got the message.
*Impact:* avatars, dots and count badges move together.
*Effort:* S. *Risk:* low. *Priority:* **Nice-to-have**

**A3-060. 29 Tailwind radius keywords bypass the scale.**
*Evidence:* `rounded-2xl` 12, `rounded-xl` 9, `rounded-lg` 6, `rounded-md` 2.
Tailwind's `rounded-2xl` is 1rem, which sits between `--nf-radius-md` (14px) and
`--nf-radius-lg` (18px) and is not on the scale.
*Action:* map Tailwind's radius keys onto the tokens in the theme config so the
keyword and the token cannot disagree.
*Reason:* a radius the scale does not contain is a radius nobody chose.
*Impact:* one radius ladder. *Effort:* S. *Risk:* low.
*Priority:* **Medium**

**A3-061. Four genuinely raw radii.**
*Evidence:* `ProductFrame.tsx` `rounded-[2.75rem]` and `rounded-[2.2rem]`,
`CalendarEditor.tsx` `rounded-[3px]`, `offline/page.tsx` `rounded-[1.25rem]`.
*Action:* `ProductFrame` is a device bezel and genuinely needs its own value, so
give it `--nf-radius-device` and `--nf-radius-device-inner`. The other two go to
`--nf-radius-xs` and `--nf-radius-md`.
*Reason:* three of the four are ad hoc; one is a real need with no name.
*Impact:* the last unnamed geometry gets a name.
*Effort:* XS. *Risk:* none. *Priority:* **Nice-to-have**

**A3-062. No `color-scheme` is set anywhere.**
*Evidence:* grep for `color-scheme` across `apps/web/src/app/css/**` and
`tokens.css` returns nothing. The only hits in the tree are `prefers-color-scheme`
media queries and the email renderer.
*Action:* `color-scheme: dark` on `:root` and `color-scheme: light` under
`:root[data-theme="light"]`.
*Reason:* without it the scrollbar, the `<select>` dropdown, the native date and
time pickers, the spellcheck underline and the form-control chrome all render in
light mode on the dark theme. On Android Chrome the autofill background paints
near-white over a navy input, which is the first thing a returning user sees on
sign-in.
*Impact:* the dark theme stops breaking at every native control.
*Effort:* XS. *Risk:* low. *Priority:* **High**

**A3-063. No `accent-color` is set.**
*Evidence:* grep returns zero across all stylesheets.
*Action:* `accent-color: var(--nf-brand-primary)` on `:root`.
*Reason:* every native checkbox, radio and range control paints in the operating
system's accent, which on many Android skins is green and on some is **orange**.
That is a literal route for orange to appear in a product that has none.
*Impact:* closes the last door orange can walk through.
*Effort:* XS. *Risk:* none. *Priority:* **High**

**A3-064. Autofill is unstyled.**
*Evidence:* grep for `autofill` across all stylesheets returns nothing.
*Action:* `:-webkit-autofill` with an inset box-shadow in `--nf-surface-elevated`
and `-webkit-text-fill-color: var(--nf-content-primary)`.
*Reason:* Chrome's autofill paints `#E8F0FE`, a pale blue, over the field. On the
dark theme a returning user's email field turns light blue with dark text on the
sign-in screen, which is both ugly and the most-seen screen in the product.
*Impact:* sign-in stops looking broken for every returning user.
*Effort:* S. *Risk:* low. *Priority:* **High**

**A3-065. `.nf-btn--sm` is declared twice at equal specificity in two partials.**
*Evidence:* `buttons.css` declares `min-height`, `padding`, `font-size`;
`controls.css` declares `padding`, `font-size`, `border-radius`. `controls.css`
imports later, so it wins on the three it restates. Its comment says "Still a
40px target" while `buttons.css` moved the floor to 2.75rem (44px) and added a
`::before` to hold it.
*Action:* delete the `controls.css` copy and move `border-radius` into the
`buttons.css` declaration.
*Reason:* `globals.css` warns in its own header that the import order is the
cascade and names this exact selector as one of the deliberate doubles. It is no
longer deliberate: one half has a comment that is a full redesign out of date, so
the next reader will believe the wrong thing.
*Impact:* one place decides what a small button is.
*Effort:* S. *Risk:* medium, it is a cascade change and needs a screenshot.
*Priority:* **Medium**

### 9.3 The icon system

**A3-066. `docs/ICON_SYSTEM.md` is wrong about the size scale, the stroke weight, the glyph count and the object count.**
*Evidence:* the doc says `UI_ICON_SIZES` is "12, 16, 20, 24, 28, 32" and
`UI_ICON_STROKE_PX` is "1.4". `UiIcon.tsx` says
`UI_ICON_SIZES = [16, 20, 24, 28, 32, 40]` and `UI_ICON_STROKE_PX = 1.5`. The doc
says "40 stroked glyphs"; the `UiIconName` union has **60**. The doc lists "57
objects"; `BRAND_ICONS` has **87** and `public/brand/icons/` has 87 files.
*Action:* correct all four facts.
*Reason:* the brief itself repeats the doc's numbers, which means the wrong
numbers have already propagated into an agent prompt. The rule that outranks the
documents is "read the code", and the doc is the thing making people not.
*Impact:* the next person to touch icons is not working from four wrong facts.
*Effort:* S. *Risk:* none. *Priority:* **High**

**A3-067. `ICON_SYSTEM.md` and `BRAND_MARKS.md` both understate `BrandIcon`'s prop surface.**
*Evidence:* both say the props are `name`, `size`, `fill`, `label`, `priority`,
`className`. `BrandIcon.tsx` also takes **`tile`**, **`state`** (`"alert" |
"confirmed" | "verified"`) and **`index`**.
*Action:* document all nine, and say plainly that `tile` defaults to false and
the answer is usually no, which the component's own header already explains well.
*Reason:* `state` is exactly the prop the confirmation system needs and nobody
reading the docs knows it exists. Meanwhile `MomentScreen` uses it on every
variant including failures, which is A3-026.
*Impact:* the confirmation work starts from the real API.
*Effort:* XS. *Risk:* none. *Priority:* **Medium**

**A3-068. All 60 checked-in icon vectors have drifted from the component.**
*Evidence:* `node scripts/build-icon-vectors.mjs --check` exits **1** and prints
"60 vector source(s) no longer match UiIcon.tsx". `assets/icons/ui/` holds **40**
SVG files against 60 glyph names, so 20 glyphs have no vector at all.
*Action:* run the generator. Note that it writes into `assets/`, which is Track A's
tree this session, so it should land after the rename.
*Reason:* the doc says the check "exits non-zero if the two copies have drifted"
and presents the vectors as a reliable source. They are stale across the board, so
anybody taking a glyph from `assets/` gets last month's drawing.
*Impact:* the vector export is trustworthy again.
*Effort:* XS to run. *Risk:* low. *Priority:* **[TRACK A] Medium**

**A3-069. 61 call sites pass a `UiIcon` size the scale does not have.**
*Evidence:* tallied across all `.tsx`: `size={12}` **37 times**, plus 15, 14, 18,
13, 22, 19, 17 and 11. `snapUiIconSize` rounds each onto the grid, so `size={12}`
renders at **16**, `size={11}` at 16, `size={22}` at 24 (ties go to the larger).
*Action:* replace each with the named step it actually renders as, so the call
site says what it gets.
*Reason:* the snap is correct and protective. The problem is that 61 authors
believe they asked for a size they did not get, and any layout tuned around a
12px glyph is 4px out. `StatusPill`'s `ICON_PX = { xs: 11, sm: 13 }` is the sharp
end: both snap to 16, inside a pill whose text is `--nf-text-overline` at
0.71875rem (11.5px), so the glyph renders about 40% larger than the label beside it.
*Impact:* icon sizing stops being a lie at 61 call sites, and the status pill's
glyph stops dominating its own label.
*Effort:* M. *Risk:* low, visually a no-op except in the pill.
*Priority:* **Medium**

**A3-070. `StatusPill`'s claim that the dot is a non-colour signal is false.**
*Evidence:* `StatusPill.tsx`, the `icon` prop comment: "where no glyph is given
the pill leads with a tone dot instead, so every pill still carries a non-colour
mark and a colour-blind reader is never left with hue as the only signal". The
dot is `bg-current` and identically shaped for all six tones.
*Action:* either correct the comment (the label is what carries the meaning,
which satisfies rule 16 on its own), or give each tone a distinct shape: a filled
disc for settled, a ring for pending, a cross for failed.
*Reason:* the comment will be cited the next time somebody asks whether rule 16
is satisfied, and it does not say what it thinks it says.
*Impact:* the reasoning matches the code. The shape version would genuinely
strengthen rule 16 on a one-hue palette.
*Effort:* XS to fix the comment, S to add shapes.
*Risk:* none. *Priority:* **Medium**

**A3-071. The `UiIcon` set has no check, clock, alert or info glyph and `StatusPill` says so.**
*Evidence:* `StatusPill.tsx` comment: "the functional icon set has no check,
clock, alert or info mark, and inventing four here would fork the icon
vocabulary". `UiIconName` confirms: there is `info` and `bell`, no `check`, no
`clock`, no `alert-triangle`.
*Action:* add `check`, `clock` and `alert` to `UiIcon` as first-class glyphs and
regenerate the vectors. Then give `StatusPill` a per-tone default.
*Reason:* the component was right not to invent them locally and right that the
gap is real. Four status tones with no functional glyph is why pills fall back to
a dot that carries nothing.
*Impact:* every pill on the platform gains a shape signal, which is what rule 16
actually asks for.
*Effort:* M. *Risk:* low. *Priority:* **Medium**

**A3-072. The brand object plate is the loudest element on a dark screen.**
*Evidence:* the `/wallet` dark screenshot at 390px. `--nf-icon-ground: #F5F7FD`
renders as a roughly 150 CSS px solid near-white square, brighter than the
primary CTA below it and the highest-contrast element on the page.
*Action:* step the plate down toward `--nf-surface-raised` and compensate by
lifting the object with a `brightness`/`contrast` filter, or mask the artwork's
white ground rather than multiplying it away.
*Reason:* the plate exists for a real reason (multiply against near-black returns
near-black, so an untiled object would be invisible) and the current answer
overshoots. A white sticker on navy is exactly the tinted-tile look the retired
reference brief produced and the product is still removing.
*Impact:* the brand objects stop shouting over the content they illustrate.
*Effort:* M, needs screenshots in both themes.
*Risk:* medium, it is the mechanism keeping 144 icons visible.
*Priority:* **Medium**

**A3-073. The same mark has different visual weight in the two themes.**
*Evidence:* the `/wallet` screenshots. Dark renders a 150px white plate around
the object; light renders the object alone at about 110px with
`--nf-icon-ground: transparent`.
*Action:* size the object so its optical weight matches across themes, rather
than the plate being an extra layer in one of them.
*Reason:* the two themes are meant to be twins and the signature element is a
third bigger in one of them.
*Impact:* theme parity on the brand's most visible asset.
*Effort:* S. *Risk:* low. *Priority:* **Nice-to-have**

**A3-074. A `pin-map` object requests a 3840px source and renders at 0x0 on the landing page.**
*Evidence:* my Playwright probe on `/` reported an `img` with
`src="/_next/image?url=%2Fbrand%2Ficons%2Fpin-map.png&w=3840&q=75"` at 0x0.
*Action:* find the call site, give the wrapper a real size, and constrain the
`sizes` attribute so Next does not select the largest srcset entry.
*Reason:* this is the same family as the 22px tile that rendered 0x0 across the
whole product and that only a screenshot caught. It is still happening, and it is
also requesting the largest possible variant of the asset.
*Impact:* removes a dead element and an oversized request from the first screen a
visitor sees.
*Effort:* S. *Risk:* none. *Priority:* **Medium**

**A3-075. `BrandIcon` `fill` mode hard-codes a 160px intrinsic size and a landing-page `sizes` string.**
*Evidence:* `BrandIcon.tsx`: `width={fill ? 160 : size}` and
`sizes={fill ? "(max-width: 640px) 26vw, 160px" : undefined}`.
*Action:* take `sizes` as a prop, defaulting to the current string.
*Reason:* `26vw` is right for a category grid and wrong for a 40px list-row icon
or a 96px result mark, and `fill` is used in both. A wrong `sizes` makes Next pick
a variant that is either blurry or four times too heavy.
*Impact:* correct image variants on every `fill` call site.
*Effort:* S. *Risk:* low. *Priority:* **Medium**

**A3-076. `TrustIcon` is the only consumer of the token package's JS entry.**
*Evidence:* the single import, in `TrustIcon.tsx`.
*Action:* keep it, and note in `index.ts` that `token` exists for exactly this.
*Reason:* the file reads as a general-purpose API with five exports and one is
load-bearing for one component. Saying so stops the next person maintaining four
dead ones.
*Impact:* the package's purpose is legible.
*Effort:* XS. *Risk:* none. *Priority:* **Nice-to-have**

**A3-077. The `symbol effects` system has a documented history of being unused.**
*Evidence:* `UiIcon.tsx`, the `SymbolEffect` comment: "The platform had zero of
this across 166 icon usages - the one bell-wiggle keyframe that existed in
globals.css had no call sites at all."
*Action:* audit current adoption before extending it, and wire exactly three:
the bell on a new notification, the heart on a save, the spinner on a retry.
*Reason:* the retired reference brief asked for "symbol effects everywhere" and is
the named cause of visual clutter. Three earned effects is the opposite
instruction.
*Impact:* motion that means something, in three places rather than everywhere.
*Effort:* S. *Risk:* low. *Priority:* **Nice-to-have**

**A3-078. `filled` is silently ignored on non-fillable glyphs.**
*Evidence:* `UiIcon.tsx`: `const solid = Boolean(filled) && (Boolean(silhouette) || FILLABLE.has(name))`.
*Action:* keep the runtime behaviour, add a `FillableUiIconName` type so
`filled` is a compile error on a glyph that cannot take it.
*Reason:* silently doing nothing is the right runtime answer and the wrong
authoring answer: a saved heart that does not fill is a bug nobody sees until a
screenshot.
*Impact:* the compiler catches it. *Effort:* S. *Risk:* low.
*Priority:* **Nice-to-have**

### 9.4 Components and primitives

**A3-079. There is no `Card` primitive and `nf-card` appears in 205 files.**
*Evidence:* `find apps/web/src -name "Card.tsx"` returns nothing.
`grep -rc "nf-card" --include=*.tsx` returns 205 files with at least one hit.
*Action:* `components/ui/Card.tsx` with `as`, `interactive`, `elevation` (mapping
to the `--nf-elev-*` ladder) and `padding` (mapping to the space scale), then
migrate.
*Reason:* the most-used surface in the product is a class string that every
author pairs with their own padding, radius and shadow decisions. That is where
most of the 995 raw type sizes and the raw spacing live: inside hand-built cards.
The library was built from the rarest components inward.
*Impact:* the largest single lever on visual consistency.
*Effort:* XL. *Risk:* medium, a very wide change.
*Priority:* **High**

**A3-080. Four of the twelve primitives have three consumers or fewer.**
*Evidence:* `ActionBar` 1 (`ListingStickyBar`), `Table` 2, `Segmented` 2,
`Switch` 3.
*Action:* for each, either find the three places doing the same thing by hand and
migrate them, or fold it back into its one consumer. `ActionBar` with one caller
is a section of `ListingStickyBar`, not a primitive.
*Reason:* section 13 says "before building a new one, find the three places that
already do something similar". Four primitives were built without that test
passing, and the cost is a library that reads as more complete than it is.
*Impact:* the primitive count means something.
*Effort:* M. *Risk:* low. *Priority:* **Medium**

**A3-081. `components/app/ComingSoon.tsx` is dead code.**
*Evidence:* grep for `ComingSoon` outside the file itself returns zero. Its other
export, `Ske`, also returns zero external references.
*Action:* delete the file.
*Reason:* it is a "coming soon" surface in a product where that copy is banned,
and it ships a second, undocumented skeleton primitive beside the real
`components/ui/Skeleton`.
*Impact:* removes a dead surface and a duplicate primitive.
*Effort:* XS. *Risk:* none. *Priority:* **Medium**

**A3-082. `components/agent/AgentComingSoon.tsx` is dead code.**
*Evidence:* the only two references in the tree are comments in
`agent/verification/page.tsx` and `agent/analytics/page.tsx` recording that the
stub was replaced with a real page.
*Action:* delete the file.
*Reason:* it renders an "In development" pill and "will fill in shortly", which
is the coming-soon promise the rules exist to prevent, and it is one import away
from coming back.
*Impact:* the promise cannot be reintroduced by accident.
*Effort:* XS. *Risk:* none. *Priority:* **Medium**

**A3-083. `.nf-tag-pill` is a third badge system with three call sites, one of them dead.**
*Evidence:* `chips.css` defines `.nf-tag-pill` plus `--success`, `--warning` and
`--neutral` modifiers. Consumers: `AgentComingSoon` (dead, A3-082),
`PlatformConsole`, `admin/page.tsx`.
*Action:* migrate the two live ones to `StatusPill` and delete the class.
*Reason:* `StatusPill` exists precisely because four badge implementations
disagreed about what colour a status is. This is a fifth.
*Impact:* one badge vocabulary. *Effort:* S. *Risk:* low.
*Priority:* **Medium**

**A3-084. `Button` claims six variants and paints five.**
*Evidence:* `VARIANT_CLASS` maps both `secondary` and `glass` to
`nf-btn--glass`.
*Action:* delete `glass` from `ButtonVariant`, or give it a distinct material.
*Reason:* two names for one output means a call site cannot tell which it chose,
and a future change to "secondary" silently moves everything that asked for
"glass".
*Impact:* the variant vocabulary is honest.
*Effort:* XS. *Risk:* low. *Priority:* **Medium**

**A3-085. A loading `Button` is silent to assistive technology.**
*Evidence:* `Button.tsx` sets `aria-busy` and `disabled` and swaps the leading
slot for `.nf-spinner`. The label does not change and there is no live region.
*Action:* a visually hidden `role="status"` inside the button announcing a
`loadingLabel` prop, defaulting to "Working".
*Reason:* `aria-busy` on a button is inconsistently announced, and the money
buttons in `PayPanel` use exactly this state for their entire pending experience.
*Impact:* every in-flight action becomes perceivable.
*Effort:* S. *Risk:* none. *Priority:* **Medium**

**A3-086. A loading `ButtonLink` is still clickable.**
*Evidence:* `ButtonLink` accepts `loading`, sets `data-loading`, and does nothing
to the anchor: no `aria-disabled`, no `onClick` guard, no `tabIndex` change.
*Action:* `aria-disabled` plus a click preventer when loading.
*Reason:* a link that looks busy and still navigates on the second tap is how
somebody double-submits.
*Impact:* removes a double-action path. *Effort:* XS. *Risk:* none.
*Priority:* **Medium**

**A3-087. `ButtonLink` fires haptics regardless of state.**
*Evidence:* `ButtonLink`'s `onPointerDown` calls `pulse(wantsHaptic)` with no
guard, where `Button` guards on `!disabled && !loading`.
*Action:* match `Button`.
*Reason:* a buzz on a control that is doing nothing is a small lie about
responsiveness. *Impact:* consistency. *Effort:* XS. *Risk:* none.
*Priority:* **Nice-to-have**

**A3-088. `Sheet` defaults to a single detent and half its capability is unreachable.**
*Evidence:* `Sheet.tsx`, `detents = [0.92]`. The velocity-aware detent selection,
the "nearest on release biased by direction of travel" logic and the resistance
above the tallest detent all exist and, with one detent, resolve to a
drag-to-dismiss.
*Action:* default `[0.55, 0.92]` and audit the 17 call sites.
*Reason:* the best-engineered primitive in the repository runs at a fraction of
its design because of one default.
*Impact:* sheets behave the way the code already knows how to.
*Effort:* M, needs a look at each of 17 sheets.
*Risk:* medium, changes the resting height of every sheet.
*Priority:* **Medium**

**A3-089. `Sheet`'s title is a raw type value.**
*Evidence:* `Sheet.tsx`: `className="... text-[1.0625rem] font-bold ..."`, which
is exactly `--nf-text-body-lg`.
*Action:* use the token.
*Reason:* the primitive that every sheet inherits its heading from restates a
token as a literal, which is the pattern A3-057 is trying to end.
*Impact:* sheet titles follow the scale. *Effort:* XS. *Risk:* none.
*Priority:* **Medium**

**A3-090. `Sheet` has no `aria-describedby` and no content live region.**
*Evidence:* `Sheet.tsx` sets `role="dialog"`, `aria-modal` and
`aria-labelledby` only.
*Action:* an optional `description` prop wired to `aria-describedby`.
*Reason:* a sheet announcing only its title makes a screen reader user tab
through to discover what it is for.
*Impact:* sheets are understandable on first announcement.
*Effort:* S. *Risk:* none. *Priority:* **Nice-to-have**

**A3-091. `Sheet`'s grip is `aria-hidden` with no keyboard or pointer alternative to resize.**
*Evidence:* `Sheet.tsx`, the grip div carries `aria-hidden="true"` and owns the
only path to a different detent.
*Action:* once A3-088 lands, expose the detent as a `aria-valuenow` slider or
give the header a expand/collapse control.
*Reason:* with multiple detents, a keyboard user is locked to whichever one the
sheet opened at.
*Impact:* detents become available to everyone.
*Effort:* M. *Risk:* low. *Priority:* **Nice-to-have**

**A3-092. `Amount` divides by 100 by hand and does not use `formatMoney`.**
*Evidence:* `Amount.tsx`: `const major = minorUnits / 100;` then a direct
`new Intl.NumberFormat(...).formatToParts`.
*Action:* add `formatMoneyParts(minorUnits, locale, options)` to
`@naijafinds/i18n` and have `Amount` consume it.
*Reason:* rule 3 says display only through `formatMoney` and never divide by 100
by hand. `Amount`'s reason for going direct (it needs the parts, not a string) is
genuine, and the correct answer is to move the parts API into i18n rather than to
keep a second money formatter in the component layer. If the two ever disagree on
rounding, one screen shows a different number from the screen above it.
*Impact:* one money implementation. *Effort:* M. *Risk:* medium, it is money.
*Priority:* **High**

**A3-093. Three more hand divisions by 100, all on the wallet.**
*Evidence:* `BalanceCard.tsx` `const wholeNaira = (absMinor - koboRemainder) / 100;`,
`WalletDeck.tsx` `String(Math.round(kobo / 100))` and a second
`(absMinor - koboRemainder) / 100`.
*Action:* route all three through the `formatMoneyParts` from A3-092.
*Reason:* rule 3, on the screen it exists to protect.
*Impact:* the wallet stops carrying its own arithmetic.
*Effort:* S. *Risk:* medium, it is money. *Priority:* **High**

**A3-094. Two `ReportSheet` components exist.**
*Evidence:* `components/social/ReportSheet.tsx` and
`components/app/ReportSheet.tsx`.
*Action:* read both; if they differ only in the report target, unify them behind
one prop.
*Reason:* reporting is a safety surface and two implementations means one of them
will miss the next safety fix. *I did not read either file*, so this is a lead to
follow rather than a confirmed duplicate.
*Impact:* one safety path. *Effort:* M. *Risk:* low.
*Priority:* **Medium**

**A3-095. `Reveal` lives in `components/site` and is used in `(app)` flows.**
*Evidence:* `checkout/[bookingId]/page.tsx` imports
`@/components/site/Reveal`; there are 112 `<Reveal>` call sites across site,
app and components.
*Action:* move it to `components/ui/Reveal.tsx`.
*Reason:* a marketing-namespace component wrapping the checkout summary is how
somebody later "simplifies the marketing components" and breaks payment.
*Impact:* the folder boundary means something.
*Effort:* XS. *Risk:* low. *Priority:* **Nice-to-have**

**A3-096. `Screen.tsx` exports a `TYPE` and `ICON` map that is a third type system.**
*Evidence:* `Receipt.tsx`, `KycBanner.tsx` and `RequestInspection.tsx` use
`TYPE.rowTitle`, `TYPE.rowMeta` and `ICON.row` while neighbouring files use raw
`text-[...]` and others use `nf-body`/`nf-body-sm` classes.
*Action:* pick one. `TYPE` is the best of the three because it names the role
rather than the size; promote it and retire the other two.
*Reason:* three typographic vocabularies in one product is why two adjacent rows
do not match.
*Impact:* one way to say "this is a row title".
*Effort:* L. *Risk:* medium. *Priority:* **Medium**

**A3-097. `Skeleton`'s own header says the material had zero uses before it existed.**
*Evidence:* `Skeleton.tsx`: "`.nf-skeleton` is fully written in globals.css ...
and is used exactly ZERO times ... The material was never the missing piece; the
SHAPES were."
*Action:* nothing. This is cited as the pattern to repeat: the fix was to ship the
shapes, not more material. `ResultSheet` is the same shape of problem.
*Reason:* it is the clearest worked example in the repository of why a primitive
gets adopted.
*Impact:* none directly. *Effort:* none. *Risk:* none.
*Priority:* **Nice-to-have** (documentation value)

**A3-098. Five `(app)` routes have no `loading.tsx`.**
*Evidence:* 69 `loading.tsx` files exist. The `(app)` routes without one are
`profile/application`, `profile/setup`, `profile/setup/[role]`,
`wallet/transactions` and `wallet/transactions/[id]`.
*Action:* add five, reusing `ScreenSkeleton`.
*Reason:* the two wallet ones are the transaction history and the receipt, which
are the screens somebody opens when they are already worried about money. A blank
pause there is the worst possible pause.
*Impact:* no unannounced wait on the money-history path.
*Effort:* S. *Risk:* none. *Priority:* **Medium**

**A3-099. `MyBookings`, `Inbox` and `TransactionsSection` each build their own filter row.**
*Evidence:* `Segmented` has two consumers (`Inbox`, `MyBookings`) and
`TransactionsSection` is not one of them despite filtering by kind.
*Action:* migrate `TransactionsSection` onto `Segmented`.
*Reason:* three filter rows, two implementations.
*Impact:* one filter affordance. *Effort:* S. *Risk:* low.
*Priority:* **Nice-to-have**

**A3-100. `social-feed.css` is 2,944 lines, which is what the split was meant to prevent.**
*Evidence:* `globals.css` explains that the platform stylesheet "was 4,544 lines
in one piece, which is how inbox item 226 came to be written: a monolith is where
merge accidents live". `social-feed.css` is 2,944 lines in one piece.
*Action:* split it the way `app/css/` was split, into ordered partials with the
order stated.
*Reason:* the argument that produced the split applies to it unchanged, and three
people work in the social layer at once by the file's own account.
*Impact:* removes the largest remaining merge-accident surface.
*Effort:* M. *Risk:* medium, it is a cascade change.
*Priority:* **[AGENT 1 overlap] Medium**
