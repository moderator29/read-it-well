# Session B closing audit

Auditor: Session B worker "auditor". Read only: no product file was changed.
Audited on 22 September 2026 against `main` at `486cb23` (worktree
`wt-auditor`, a production build of that commit served on port 3181 with
`VALLO_PREVIEW_HARNESS=1`). A first draft of this file was written against
`2470bdf`; twenty commits landed while it was being written (profile round
two, welcome polish, sign in round two, inspection density, admin-shell's
ledger section and proofs, the W1 fix), so every section below was redone on
`486cb23`, with a fresh build and a fresh sweep. Live database read with
SELECT only (project `uccixoonmbhrnyczyigt`): 64 published listings, 64 of
them `is_demo`, 0 real supply, 7 accounts, 0 open risk alerts, the same as R4.

The founder's closing standard, applied strictly: (1) every surface closes
with a measured side-by-side comparison in the ledger (property | image
measured | built measured | match) and a render-vs-built image; (2) every
screen walks its whole chain with broken links named; (3) nothing ships a
claim; plus light mode correct and the shape ratio sweep at zero. A
resemblance is a FAIL. A missing measured row is a FAIL. A claim is a FAIL.

## Result at a glance

| Surface | Owner | Gate | The deciding reasons |
|---|---|---|---|
| Profile `/profile` | profile | **FAIL** | row glow not measured on the image side; plates still 27 blue levels under the render; rows lack the render's lit foot |
| Get started `/welcome`, `/start` | welcome | **FAIL** | lockup glow not measured and visibly weaker; coin face "close, not identical" by its own ledger |
| Welcome back `/sign-in`, `/sign-in/email` (+ `/sign-up`, `/forgot-password`) | signin | **FAIL** | one open departure that no law requires: card 78 per cent of the width against the render's 62 |
| Wallet `/wallet` | wallet | **FAIL** | a claim kept in a Session B component and the wallet dictionary, rendered on the committed harness (`TrustStrip`: "256-bit TLS", "Encrypted in transit", "Your money is safe"); no side-by-side; proof shot mid-animation; "Add money" overflows its tile |
| Send money `/wallet/send` | wallet | **FAIL** | missing measured rows; no desktop proof; no side-by-side; chain still says W1 is broken although `7763ff39` fixed it |
| Inspections `/inspections`, `/agent/inspections` | inspection | **FAIL** | still 1.38 times the render's height; the phone number wraps in the info row |
| Admin shell, overview, operations, analytics | admin-shell | **FAIL** | sweep not at zero (128 controls at 0.35); the landing rule is not enforced for addresses; operations and analytics tables unmeasured |
| Admin review desks (listings, moderation, kyc, queue, support) | admin-review | **FAIL** | ledger section 7 is "(pending)"; no proofs |
| Admin money desks (money, escrow, supply, bookings, payments) | admin-money | **FAIL** | no side-by-side; image values not converted; bookings and payments not compared |
| Welcome email | email | **FAIL** | two unevidenced statements in the copy |
| Handbook `docs/ADMIN_CONSOLE.md` | admin-shell, admin-review, admin-money | **FAIL** | thirteen acting desks have one line each |

Nothing passes today. Sign in is closest: its ledger is complete and one
decision stands between it and a pass. Welcome and profile are close. The
wallet claim, the admin landing rule, section 7 and the handbook's thin desks
are real faults, not paperwork.

## A. Claims sweep

Grep over every Session B-owned file (scope file sections Profile to 8, about 260
files, tests excluded for the claim words) and the i18n namespaces they read
(`auth`, `signUp`, `welcomeCards`, `socialProfile`, `wallet`, `walletSend`, `walletReceive`,
`admin`, `inspectionsPage`) for NDIC, insur, encrypt, 256, airtime, bills,
swap, reimagined, guarantee, certified, demo, sample, preview, coming soon,
welcome aboard, plus safe, secure, protect and instant.

| File:line | Text | Verdict |
|---|---|---|
| `packages/i18n/src/locales/en.ts:2909` (`wallet.home.trustTitle`) | "Your money is safe" | **FAIL, claim.** Read by `components/app/wallet/TrustStrip.tsx` (Session B's file), rendered on `/preview/e/wallet` under the harness. Same key in ha, ig, yo. |
| `en.ts:2910` (`wallet.home.trustBody`) | "Encrypted in transit and recorded to the kobo. Nothing moves without you." | **FAIL, claim** (encryption claim R1 refuses). ha.ts:2136, ig.ts:2141, yo.ts:2136 carry the same. |
| `en.ts:2911` (`wallet.home.trustBadge`) | "256-bit TLS" | **FAIL, claim** (the 256 bit badge R1 refuses, reworded). ha.ts:2137, ig.ts:2142, yo.ts:2137. |
| `apps/web/src/components/app/wallet/TrustStrip.tsx:7-11` | comment: "The second [256 bit] is a fact about every request this product makes" | **FAIL.** The component keeps the encryption badge the ledger (5, refused) says was refused. Delete the component and the three keys; `(dev)/preview/e/wallet/page.tsx:4,28` (Session A's) imports it, so the deletion needs a line in section 49 or a scope request. |
| `en.ts:3869` (`walletSend.tagline`) | "Fast. Safe. Always." | FAIL (dead). No reader in `src` (the send page no longer draws it; the receive page reads `walletReceive.tagline`), but it is the render's "Quick. Safe. Reliable." claim kept in the dictionary. Remove. |
| `apps/web/src/components/app/wallet/WalletSettingsSheet.tsx:28-37` | hard-coded English "Moved only by our servers", "Every movement lives in a permanent, kobo-exact ledger." | NOTE. Not i18n (four locales get English); "permanent" is an unevidenced claim (ledger rows are append-only by policy, but "permanent" is not established in the ledger section). Evidence or reword. |
| `WalletSettingsSheet.tsx:117-118` | "...is not insured by the Nigeria Deposit Insurance Corporation." | NOTE. A true negative disclaimer that mirrors `lib/legal/terms.tsx` section 15, not a claim; but the founder's line is "no NDIC", so it needs the founder's yes. |
| `en.ts:2913`, `en.ts:2919` (`wallet.topUpHint`, `wallet.opening`) | "secure Paystack window", "Opening the secure payment window" | NOTE. A statement about Paystack's hosted page, not Vallo; acceptable, flagged for the founder. |
| `en.ts:3830` (`walletSend.instantChip`) | "Instant transfer" | PASS. Evidence in the ledger (both legs in one statement). |
| `components/app/wallet/SendFlow.tsx:603-606`, `WalletDeck.tsx:52,251-252`, `WalletTiles.tsx:10` | NDIC, 256, Airtime, Bills, Swap in comments explaining the refusal | PASS (comments, not rendered). |
| `lib/email/welcome-message.ts:252` | "Agents are checked more closely than owners" | **FAIL, unevidenced claim.** Neither the ledger (section 10) nor `lib/supply`/`lib/trust` shows a stricter check for agents than for owners. |
| `lib/email/welcome-message.ts:163` | "Each step you complete shows on your listings." | **FAIL, unevidenced claim.** Only `agent_badges.verified` (tier >= 1) is shown to a renter on the evidence in section 2; that every rung shows on listings is not established. |
| `lib/email/welcome-message.ts:30` | "nothing insured or guaranteed" in a comment | PASS. |
| `app/admin/**` "preview" hits (AdminActions, alerts, audit, reservations, listings, money, payments) | code identifiers and comments about the preview harness and `previewCancellation` | PASS (not UI copy). |
| `app/admin/examples/page.tsx:31`, `lib/admin/reads/listings.ts:67-98` | "demo" in a comment and a variable | PASS. UI says "Example". |
| `app/admin/standing/page.tsx:47`, `lib/inspections/actions.ts:80` | "guarantee" in comments | PASS. |
| `profile.css`, `auth.css`, `wallet.css`, `welcome.css`, `inspection.css` "sampled" | comments recording measurements | PASS. |
| `admin/_review/map-tiles.ts:51-52`, `WelcomeScene.tsx:52-116` "256" | tile maths, image dimensions | PASS. |

No hit for reimagined, certified, airtime or bills in rendered copy, no
"coming soon", no "welcome aboard".

**Hard-coded figures in JSX.** Pattern search over every Session B `.tsx`
for digits in JSX text and for currency or percent literals: the only hits
are skeleton widths, SVG gradient stops, and `yLabels={["₦0", ...]}` on the
empty-chart axis in `admin/_components/OverviewView.tsx:271`,
`admin/money/MoneyDesk.tsx:328` and `admin/payments/PaymentsFlow.tsx:81`
(a zero baseline, true). No render figure (1,248, 18,450, 137, 548, 42,
245,680, 12.5, 64) appears in code. PASS.

**Em dashes.** Session B files: one hit,
`lib/email/welcome-message.test.ts:208`, the assertion that the email carries
none. PASS. Locale files: zero em dashes in all five. Session B docs (scope,
ledger, handbook): zero. Commit messages since `2a5ff60` carrying this
session's trailer, `2a5ff60..486cb23`: 63 commits, zero em dashes. PASS.

## B. Shape and light sweep

Production build of `main` at `486cb23`, served with
`VALLO_PREVIEW_HARNESS=1 npx next start -p 3181`. Every run:
`node scripts/design/compare-surface.mjs --base http://127.0.0.1:3181 --shape-sweep --routes <route> --theme both`,
at 390 and 1536, dark and light. Columns: BREACHES (ratio >= 0.5) /
WORTH AN EYE (> 0.35) / ROUND ICON-ONLY.

**Signed-out routes (real pages, no fixture).**

| Route | Breaches | Worth an eye | Round icon-only |
|---|---|---|---|
| `/welcome` | 0 | 0 | 0 |
| `/start` | 307 to `/welcome?next=%2Fsign-up` (curl; nothing to sweep) | | |
| `/sign-in?welcomed=1` | 0 | 0 | 0 |
| `/sign-in/email` | 0 | 0 | 0 |
| `/sign-up` | 0 | 0 | 0 |
| `/sign-up?welcomed=1` | 0 | 0 | 0 |
| `/sign-up/email` | 0 | 0 | 0 |
| `/forgot-password` | 0 | 0 | 0 |

(On `2470bdf` `/sign-up` never reached network idle: the "What Vallo is"
link prefetched the `/start` redirect on every render. `486cb23` points it at
`/welcome` with prefetch off, and the sweep now completes.)

**Signed-in routes redirect** (curl, 307 to
`/sign-in?next=<path>&notice=sign-in-required`): `/profile`, `/wallet`,
`/wallet/send`, `/inspections`, `/agent/inspections`, `/admin` and every
`/admin/**` desk. The sweep refuses a redirected page, so **these surfaces
have fixture-only proof: Profile, Wallet, Send money, Inspections (both
routes) and the whole admin console.** No signed-in page has been measured
by anybody in Session B.

**Committed `(dev)/preview` routes that render Session B components**
(fixture props).

| Route | Renders | Breaches | Worth an eye | Round icon-only |
|---|---|---|---|---|
| `/preview/f1/welcome` | first run, member path | 0 | 0 | 0 |
| `/preview/f4/profile` | profile components | 0 | 0 | 0 |
| `/preview/e/wallet` | `WalletDeck`, `RecentActivity`, `TrustStrip` | 0 | 0 | 0 |
| `/preview/e/send` | `SendFlow` | 0 | 0 | 0 |
| `/preview/e/receive` | receive | 0 | 0 | 0 |
| `/preview/e/transactions` | statement | 0 | 0 | 0 |
| `/preview/e/receipt` | receipt | 0 | 0 | 0 |
| `/preview/e/wallet-topup` | funding sheet | 0 | 0 | 0 |
| `/preview/f5/inspection` | `InspectionSheet` | 0 | 0 | 0 |
| `/preview/f5/agent-inspections` | lister side | 0 | 2 | 0 |
| `/preview/f5/admin-overview` | `ConsoleOverview`, `AdminNav`, `QueueTable` | 0 | 2 | 0 |
| `/preview/f5/admin-frame` | `QueueFilters`, `ui` | 0 | 20 | 0 |
| `/preview/f5/admin-desks` | examples, held, reference, social, standing, stops, switches | 0 | 0 | 0 |
| `/preview/f5/admin-queue` | queue | 0 | 22 | 0 |
| `/preview/c1/listing-review` | listing card | 0 | 0 | 0 |
| `/preview/bd/alerts` | `AlertCards` | 0 | 14 | 0 |
| `/preview/bd/payments` | `LookupPanel` | 0 | 2 | 0 |
| `/preview/bd/refunds` | `MoneyRows` | 0 | 2 | 0 |
| `/preview/bd/reservations` | `ReservationCard` | 0 | 26 | 0 |
| `/preview/bc/audit` | `AuditList` | 0 | 2 | 0 |
| `/preview/p3/admin-businesses` | businesses desk | 0 | 38 | 0 |

Consumer surfaces: **0 / 0 / 0 everywhere.** Admin harnesses: **0 breaches,
128 worth an eye.** Every one of the 128 is one of two shared admin
controls, admin-shell's (`app/admin/_components/QueueFilters.tsx`,
`app/css/admin.css`): the status chip `.nf-admin-chip` (40 px tall, radius 14,
ratio 0.35) and the "Search this queue" input (352 x 40, radius 14, ratio
0.35). Ledger 6.4 records the search input's 0.35 as "accepted"; the chips it
does not mention. The 2 on `/preview/f5/agent-inspections` are the agent
console's "Search my listings" input (448 x 40, radius 14), agent chrome
rather than the inspection sheet. **The founder's "shape ratio sweep at zero"
is not met on the console.** A 44 px control, or `--nf-radius-sm` on these
two, clears it.

No committed harness renders the money, escrow, supply, analytics,
operations, kyc, moderation, listings-queue, support or bookings desks. The
workers' proofs came from uncommitted harnesses (`/preview/zz-am/*`,
`/preview/sbadmin/*`, `/zz-pfs`, `/ix-harness`, `/preview/sbw/*`), which
nobody else can re-run, so those numbers rest on the workers' word.

**Light.** Every sweep above ran in light as well as dark. Beyond shape, I
read the light proofs: profile (now the same objects in their paper
rendition), wallet, send and inspection hold their anatomy on paper with no
dark plate on white; welcome and sign in are dark in both themes by rule 22,
and sign in proves it with a computed-style diff (0 differences). Admin:
light proofs exist for overview, operations, analytics (admin-shell) and the
three money desks at 1440 (money also at 390). Admin review has none.

## C. Admin landing

Code path, read on `main`:

1. `apps/web/src/proxy.ts:84`: `admin` is in `PRODUCT_SEGMENTS`. A signed-out
   request to ANY `/admin/**` path is redirected (`proxy.ts:198-211`) to
   `/sign-in?next=<that exact path>&notice=sign-in-required`.
2. `lib/auth/actions.ts` `landingAfterAuth` honours `next` after sign-in.
   So a signed-out operator who opens `/admin/money` signs in and lands on
   `/admin/money`, not the overview.
3. `app/admin/layout.tsx:36-38`: `requireAdmin()`; a non-admin gets
   `AccessScreen` (links to `/`, `/sign-in`, `/home`). An admin gets the frame
   around whichever child was requested. There is no redirect, cookie or
   "first visit this session" check in the layout, `page.tsx` or anywhere
   under `app/admin/` (`grep redirect( app/admin` returns nothing).
4. Every in-product entry point lands on `/admin`: the drawer's Console row
   (`components/app/nav-model.ts:276`), the workspace switcher
   (`lib/supply/workspaces.ts:147`, `workspaces-queries.ts:103`), the
   "You are now a Vallo administrator" notification
   (`private.grant_staff_role`, href `/admin`, read from `pg_proc`), and
   `BackButton`'s declared parent. No email, cron alert or database
   notification links a desk directly (grep of `lib/email`, `lib/notify`,
   `lib/cron`, `app/api` and `pg_proc` source).

**Verdict: FAIL (admin-shell).** The founder's rule is "entering the console
lands on the overview, every time, before any desk". Entry through the
product's own doors does. Entry by address does not: (a) the sign-in bounce
carries `next=/admin/<desk>` and returns there; (b) a signed-in admin who
types, bookmarks or is sent a desk URL (`/admin/money`,
`/admin/listings/<id>`, `/admin/escrow?status=DISPUTED`) gets the desk with no
overview first. `docs/ADMIN_CONSOLE.md` section 1 ("Nothing redirects you to
a desk first") and the layout comment state the landing rule as met; they
are accurate about the doors and silent about the addresses. Either the
founder accepts deep links as not "entering", recorded in the handbook, or
the layout needs an entry check (for example a session cookie set by the
overview, and a redirect to `/admin?next=<desk>` when it is absent), which
also needs the proxy's `next` for `/admin/**` to point at `/admin`. Ledger 6.1 (added
after the first draft of this audit) says the same as the handbook ("no
redirect exists"), which is accurate and does not close the gap. Checked
live on the production build: `curl /admin/money` signed out answers 307 to
`/sign-in?next=%2Fadmin%2Fmoney&notice=sign-in-required`.

## D. Ledger gate, per surface

Columns: chain with every link named; comparison table with measured image
and built values for container radii, rim, glass fill, glow, icon plates,
every text role's size and weight, spacing, button treatment, badges,
colours; light mode check; shape sweep numbers; refused-from-render list;
skipped or unverified list; proofs at 390 dark, 390 light (or the rule 22
note), desktop; a render-vs-built side-by-side. Then my own reading of the
side-by-side (or, where there is none, the governing image beside the 390
dark proof), naming the three largest visual differences that remain.

### 1. Profile (`/profile`), owner: profile. GATE FAIL

| Check | Result |
|---|---|
| Chain | Yes (1.2); requests 1 and 1d open, 1b and 1c withdrawn (done) |
| Comparison rows | radii, rim, fill, plates, every text role (sizes and weights now in one row), spacing, button, badges, colours sampled per element: measured. **Row glow: image side still "soft blue bloom round the row", no radius or alpha measured.** |
| Light | Yes (1.5), the same five objects in their paper rendition |
| Sweep numbers | Yes, harness `/zz-pfs` 0 / 0 / 0; committed `/preview/f4/profile` 0 / 0 / 0 in this audit |
| Refused list | Yes |
| Skipped list | Yes |
| Proofs | 390 dark and light, 1280 dark and light, `profile-side-by-side-390-dark.jpg`: present |

Three largest differences (from `profile-side-by-side-390-dark.jpg`):
1. The rows are flatter than drawn: the render's rows carry a lit foot edge
   and a luminous band along the bottom that separates each from the next;
   the built rows have a thin even border and a faint bloom.
2. The plate glass is still dimmer and bluer-grey than the render's lit
   squares (the ledger's own sample: blue channel 27 under), so the icons sit
   quieter in their rows.
3. Type is 1.16 times the render and the name heavier, so the text column and
   the rows read larger and the Switch role row ends lower (a stated choice,
   1.1; the image governs). The gear joining the header row and the back
   square dropping are chrome decisions, recorded.

Fail reasons: the unmeasured glow row; differences 1 and 2 are fixable in
`profile.css`.

### 2. Get started (`/welcome`, `/start` redirect), owner: welcome. GATE FAIL

| Check | Result |
|---|---|
| Chain | Yes; W1 (Session A), W3, W4 open, W2 done by signin |
| Comparison rows | lockup, headline (now sampled in bands), sub-line, stage, coin size and place (matched in a 3x zoom), dots, button fill, edge and bloom (all sampled), Skip, ground: measured. **Lockup glow: not measured**, and it is the most visible glow above the stage. Sub-line weight not stated. |
| Light | Yes, rule 22, `welcome-light-390.jpg` |
| Sweep numbers | Yes, 0 / 0; confirmed 0 / 0 / 0 in this audit |
| Refused list | Yes |
| Skipped list | Yes |
| Proofs | 390 dark, 390 light, 1440, `welcome-render-vs-built-390.jpg`, `welcome-coin-render-vs-built-3x.jpg`: present |

Three largest differences (from the two side-by-sides):
1. The lockup: the render's mark and wordmark glow blue into the ground; the
   built lockup is crisp with little or no halo.
2. The coin face: the ledger's own row says "close, not identical"; its face
   art is the drawer render's coin, lighter glass with ridged edges at 3x
   where the render draws one smooth band.
3. The button's bloom is fainter and less saturated than drawn (sampled
   #003490 against #0225b8 at 6 px), so the lit bar does not cast the pool of
   blue the render shows under it.

Fail reasons: the unmeasured lockup glow; the coin face is not the drawn
coin. Everything else here matches.

### 3. Welcome back (`/sign-in`, `/sign-in/email`; inherits to `/sign-up`, `/forgot-password`), owner: signin. GATE FAIL (one decision from a pass)

| Check | Result |
|---|---|
| Chain | Yes, 12 links plus 12b; SIGNIN-1 named |
| Comparison rows | complete: proportions as shares of the screen, card glass sampled at four points, rim, top highlight, glow, every text role with size and weight, every gap, both buttons, the G, colours. Each departure carries its reason. |
| Light | Yes, computed-style diff, 0 differences |
| Sweep numbers | Yes; confirmed 0 / 0 / 0 on `/sign-in?welcomed=1`, `/sign-in/email`, `/sign-up`, `/sign-up/email`, `/forgot-password` in this audit |
| Refused list | Yes (the slogan) |
| Skipped list | Yes |
| Proofs | 390 dark, 390 light, 1440 dark, `signin-vs-55A56F21-390.jpg`: present. `/forgot-password` has no proof of its own (it inherits the shell; swept here). |

Three largest differences (from `signin-vs-55A56F21-390.jpg`, re-shot):
1. The card is 78 per cent of the width against the render's 62 (ledger row
   "Card width"): the aurora margins are 43 px where the render leaves about
   a fifth of the screen each side. The ledger names this the lead's target,
   not a rule.
2. The controls are 44 px against 34 to 37 at the render's scale (the tap
   rule, a platform law) and the card is 49 px taller, so the plinth sits
   lower and the card reads chunkier.
3. The card's lit edge is a steady electric line; the render's is brighter at
   the top centre and fades towards the corners more strongly. Small.

Fail reason: difference 1 is a departure no law requires. If the founder
accepts 78 per cent (or the card goes to 62 with 44 px controls), this
surface passes on everything else.

### 4. Wallet (`/wallet`), owner: wallet. GATE FAIL

| Check | Result |
|---|---|
| Chain | Yes; W2, W4 named |
| Comparison rows | measured, with two recorded NO rows (page gutter 24 vs 13.5, section heads 17 vs 14). **Glow: image side "soft blue bloom off every edge", not measured.** |
| Light | Yes. The ledger cites `wallet-390-light.png`; the file is `.jpg` |
| Sweep numbers | Yes, harness `/preview/sbw/*` 0 / 0 / 0; committed `/preview/e/wallet` 0 / 0 / 0 here |
| Refused list | Yes |
| Skipped list | Yes |
| Proofs | 390 dark, 390 light, 1280 dark. **Side-by-side: none.** |
| Claims | **FAIL**: `TrustStrip.tsx` and `wallet.home.trustTitle/Body/Badge` (section A) |

Three largest differences (render `6AF37222` beside `wallet-390-dark.jpg`):
1. The committed dark proof was shot mid-animation: the balance reads
   "₦245,6̆70.00" with a half-rolled digit clipped by its line box (the light
   proof shows 245,680.00). Retake it, and check the roll's clipping, which a
   slow phone would show too.
2. "Add money" overflows its tile at 390 in dark and light (the label touches
   both edges); the render's tiles have air round every label.
3. The quick-action cards are cramped: the plate is hard against the top
   left edge and the two lines crowd the foot, where the render's cards are
   roomy with the plate inset. The shell's 24 px gutter (render 13.5)
   narrows every card.

Fail reasons: the claim; no side-by-side; the proof defect; the overflowing
label; the unmeasured glow row.

### 5. Send money (`/wallet/send`), owner: wallet. GATE FAIL

| Check | Result |
|---|---|
| Chain | Present, but **stale**: it still reads "BROKEN, scope request W1" for idempotency, and scope W1 still stands as a blocker. `7763ff39` ("a second tap on Send moved the money twice") added `idempotencyKey` to `transferSchema` (`lib/wallet/schema.ts:81,92`) with `transfer-idempotency.test.ts`. The chain must be re-walked and W1 closed or re-stated. |
| Comparison rows | balance card, title, chip, panel, plates, row type, chips, counter, button, reassurance: present. **Missing: the panel's and rows' radii on the image side, rim, glow, spacing and colours.** |
| Light | Yes. The ledger cites `send-390-light.png`; the file is `.jpg` |
| Sweep numbers | Shared with wallet: 0 / 0; committed `/preview/e/send` 0 / 0 / 0 here |
| Refused list | Yes |
| Skipped list | Yes |
| Proofs | 390 dark (empty and filled), 390 light. **Desktop: none. Side-by-side: none.** |

Three largest differences (render `77A54EA3` beside `send-390-dark.jpg`):
1. Every row sub-panel wears a thick bright outline; the render's rows are
   quiet sub-panels with a soft lit edge inside one panel.
2. The four amount chips are crammed (the figures touch the chip edges), and
   the proof shows the Send Money label dim grey-blue (disabled); the render's
   label is white on a bright bar.
3. The reassurance card is a large three-paragraph block where the render
   draws one slim strip (the words are right by the claims rule; the form is
   not).

Fail reasons: missing measured rows, no desktop, no side-by-side, a stale
chain.

### 6. Inspections (`/inspections`, `/agent/inspections`), owner: inspection. GATE FAIL

| Check | Result |
|---|---|
| Chain | Yes; I1 to I4 named |
| Comparison rows | complete, measured, per-row ratios, with NO rows recorded (gutter; overall height) |
| Light | Yes |
| Sweep numbers | Yes, 0 / 0 / 0; committed `/preview/f5/inspection` 0 / 0 / 0 here; `/preview/f5/agent-inspections` 0 / 2 (the agent console's search input, not this sheet) |
| Refused list | Yes |
| Skipped list | Yes |
| Proofs | 390 dark, 390 light, 1280 dark, lister view, `inspection-render-vs-built-390-dark.jpg`: present |

Three largest differences (from the side-by-side, re-shot after the density
round):
1. The page is 1.38 times the render's height (ledger's own number): the
   outcome chooser the render does not draw pushes Add Photos and Submit
   below the first screen, where the render keeps both in view.
2. The info row's phone number wraps onto a second line ("+234 801 000 /
   0000"), which the render never does; the cells are cramped at 390.
3. Text runs at the platform's readable minimums against the render's much
   smaller type, so every row and card reads heavier and larger (the
   checklist is four rungs, not eight, by I1, recorded).

Fail reasons: 1 and 2. The ledger is the most complete in Session B; the
composition is the gap.

### 7. Admin shell, overview, operations, analytics, owner: admin-shell. GATE FAIL

| Check | Result |
|---|---|
| Chain | Yes, per page (6.1), A5 to A11 named |
| Comparison rows | Overview: measured with hexes and sizes. **Operations and Analytics tables: image values are words ("26ish bold", "four cards"), not measurements.** Glow on the open row and panels: image side "blue bloom", not measured. |
| Light | Yes (6.3), four light proofs |
| Sweep numbers | 0 breaches, 5 worth an eye "accepted" (6.4). **This audit finds 128 on the committed admin harnesses, all on the shell's chip and search input** (section B). Not zero. |
| Refused list | Yes (6.5) |
| Skipped list | Yes (6.7), including: console copy English only, not in the dictionaries |
| Proofs | `docs/design/proofs/session-b/admin/`: 1440 dark and light, 390 dark and light, empty and fixture variants, `side-by-side-overview.jpg`, `-operations.jpg`, `-analytics.jpg`. From an uncommitted harness. |
| Landing | **FAIL**, section C |

Three largest differences (from `side-by-side-overview.jpg`):
1. The money chart: the render's is a glowing line over a deep, saturated
   blue fill with a hover card; the built line has no glow and its fill is
   thinner and paler, so the panel reads darker and emptier.
2. The KPI sparklines are faint flat marks where the render draws bright,
   glowing curves in each card's corner.
3. The vertical rhythm is looser: the render fits the pulse strip, four
   cards, both charts and both lower panels in one 1440 x 900 window; the
   built page runs the lower panels off the foot.

Fail reasons: the sweep, the landing rule, the unmeasured operations and
analytics rows, and English-only console copy.

### 8. Admin review desks (listings, listing under review, moderation, kyc, queue, support), owner: admin-review. GATE FAIL

- **Ledger section 7 on `main` reads "(pending)".** No chain, no comparison,
  no light check, no sweep numbers, no refused list, no skipped list.
- **No proofs** under `docs/design/proofs/session-b/` for these desks; no
  side-by-side with `C1D98B3C` panels 1 and 2, `01F7DFC7` panel 1 or
  `8E9602E2` panel 2.
- The one committed harness that touches them, `/preview/c1/listing-review`,
  sweeps 0 / 0 / 0; the queue page's chips and search input are the shell's
  0.35 controls.
- The handbook sections 4 to 7 and their parts of 16 to 18 are written and
  good; that is the only part of the gate met.

### 9. Admin money desks (money, escrow, supply; bookings and payments in register), owner: admin-money. GATE FAIL

| Check | Result |
|---|---|
| Chain | Yes, per desk; request 10 named |
| Comparison rows | Present, but **type sizes are left in image px ("cap 12 img px") and never converted to CSS; card radius "close"; escrow rows "partly"; glow "soft blue outside each card", not measured.** Bookings and payments: no table. |
| Light | Yes (1440 for all three, 390 for money only) |
| Sweep numbers | 0 breaches, 45 worth an eye, attributed to the shell (true, and it is still not zero) |
| Refused list | Yes |
| Skipped list | Yes |
| Proofs | 1440 dark and light, 390 dark for all three. **Side-by-side: none.** Uncommitted harness. |

Three largest differences (render `C1D98B3C` panel 3 beside
`money-full-1440-dark.jpg`):
1. The rail in the proof is a short floating box that ends a third of the way
   down; the render's rail is a full-height lit panel (the shell's rail; the
   overview proof shows it full height, so this proof predates or bypasses
   the shell's fix).
2. The money chart is two steep oscillating curves; the render's is one
   rising filled mountain with a quiet second series.
3. The panels are darker and flatter than the render's lit cards; the built
   edge is a thin line.

Fail reasons: no side-by-side, unconverted and unmeasured rows, bookings and
payments not compared, sweep not at zero.

### 10. Welcome email (`lib/email/welcome-message.ts`), owner: email. GATE FAIL

| Check | Result |
|---|---|
| Chain | Yes, six links; the send is Session A's |
| Comparison | No governing image exists for the email, so no table is owed. Accepted as N/A. |
| Light | Dark only by design (`theme.ts`), recorded |
| Sweep | N/A (not a page); shape ratios listed in the checklist |
| Refused list | Yes (the old copy's claims) |
| Skipped list | Yes |
| Proofs | 600 and 375, images on and off, stripped fallback, plain text: present |
| Claims | **FAIL**: "Agents are checked more closely than owners" (line 252) and "Each step you complete shows on your listings." (line 163): section A |

## E. Admin coverage map

Enumerated from the live schema (enums in `public`, status-like columns,
check constraints, `cron.job`, `notification_kind`, `risk_alerts`, and the
functions that write alerts), then mapped to the desk and panel that shows
each. "MISSING" means no admin route reads it.

### Queues

| Queue (table, waiting state) | Desk and panel |
|---|---|
| Listings `SUBMITTED`, `UNDER_REVIEW`, `MORE_INFO_REQUIRED`, `APPROVED` | `/admin/listings` status tabs; `/admin/queue` |
| Agent applications `SUBMITTED`..`MORE_INFO_REQUIRED` | `/admin/agents` (Supply > Applications); `/admin/queue` |
| Agent documents `pending` | `/admin/kyc` Identity verification queue |
| Businesses (listing_status) and `business_documents` | `/admin/businesses` |
| Reports `open`, `reviewing` | `/admin/moderation`, `/admin/reports`; `/admin/queue` |
| Held posts, stories, story comments, bios (`social_status` `HELD`) | `/admin/moderation` Held by the scan |
| Message flags `open` | `/admin/flags`; `/admin/queue` |
| Support tickets `open`, `pending` | `/admin/support`; `/admin/queue` |
| Areas `PROPOSED`, moderator applications `PENDING` | `/admin/social` (Around) |
| Escrows `DISPUTED` | `/admin/escrow` Waiting on a ruling; `/admin/money` Disputed holds |
| Reservations `PENDING` | `/admin/bookings/reservations` |
| Stuck withdrawal holds | `/admin/payments` |
| Events `HELD` (`event_status`, raised by `private.scan_event`) | **MISSING**: no admin read of `events` |
| Account deletions `SCHEDULED`, `PURGING` (`account_deletion_requests`) | **MISSING** (only the account-purge job's run is on Operations) |
| Business transfers `PENDING` (`business_transfers`) | **MISSING** |

### Money paths

| Path | Desk and panel |
|---|---|
| Card charges (`transactions` SUCCESSFUL, PENDING, FAILED, REFUNDED) | `/admin/money` Failed charges; `/admin/payments` Waiting on the provider, Money in per day; Overview Naira transacted |
| Wallet entries, all 11 kinds and 4 statuses | `/admin/money` Ledger (every entry, kind and status badge), Wallet float, Settled this week |
| Deposits (top-ups) | Overview Naira transacted; `/admin/money` |
| Withdrawals and payouts | `/admin/payments` stuck holds; `/admin/money` ledger. Payout accounts: only masked lookup on `/admin/payments` |
| Transfers between people | `/admin/money` ledger (kind shown) |
| Pots (`pot_hold`, `pot_release`) | `/admin/money` ledger only, no panel of its own |
| Escrow, all 9 states | `/admin/escrow` pipeline (6 tiles: Funded, Held, Release requested, Released, Refunded, Disputed) plus status chips for every state; INITIATED, RESOLVED, CANCELLED only as chips and badges |
| Escrow purposes (5, including `agency_fee`) | `/admin/escrow` Escrow by purpose (grouped from rows). **Handbook section 9 lists four and omits `agency_fee`.** |
| Booking refunds (`booking_refunds`, 4 reasons) | `/admin/money` Refunds; `/admin/bookings/[id]` |
| Fee rates, revenue sources | `/admin/fees` |
| Reconciliation (`private.reconciliation_watch`) | Audit-row history on `/admin/money` and `/admin/escrow`; the watch table itself **MISSING** (request 10) |

### Supply roles

Owner, Agent (agents by `supply_role`), Firm, Host (businesses by kind):
`/admin/supply` role cards and table; Overview New listings by role.
`agent_type`, `business_kind` (7) feed the resolution. Complete.

### Verification rungs

| Rungs | Desk |
|---|---|
| Agent: identity, address, payout, in_person (`agent_verification_checks`, passed/failed/pending); agent document kinds identity, address, business, selfie, association | `/admin/kyc` Results by rung, queue, funnel |
| Business: identity, registration, payout, on_site (`business_verification_checks`); business document kinds identity, registration, association, licence, hygiene | `/admin/businesses` ladder |

Complete, with the render's provider and match score refused.

### Listing states

`DRAFT, SUBMITTED, UNDER_REVIEW, MORE_INFO_REQUIRED, APPROVED, PUBLISHED,
REJECTED, SUSPENDED`: every state but `DRAFT` has a tab on
`/admin/listings` (drafts deliberately not shown, recorded). `sale_status`
(available, under offer, sold) is read on the queue card and the listing
under review (`ListingCard.tsx`, `ListingReview.tsx`); the handbook does not
mention it. Accommodations and room types use `listing_status`:
`/admin/businesses`. Examples (`is_demo`) on `/admin/examples` and tagged on
every list.

### Inspections

`inspection_state` (REQUESTED, CONFIRMED, PROPOSED, DECLINED, COMPLETED,
WITHDRAWN) and `outcome`: **MISSING** from the console. No admin route reads
`inspection_requests`.

### Bookings

`booking_status` (5, including NO_SHOW): `/admin/bookings` board;
`booking_state_events` on the stay's page. Reservations: reservations desk.

### Notifications

`notification_kind`: booking, message, wallet, listing, agent, support,
system, social. **MISSING, all eight**: Operations > Notifications says
"Not wired yet" (request A6; admins cannot read `notifications`). Email
sends are not tracked anywhere an admin can read.

### Scheduled jobs

| Job | Desk |
|---|---|
| Vercel Cron: hold-sweep, paystack-reconcile, pg-cron-watch, complete-stays, inventory-drift, account-purge, saved-search-alerts | Operations jobs table, row by row, from `audit_log` |
| pg_cron (live `cron.job`, all active): vallo_announce_completed_stays `20 5 * * *`, vallo_escrow_sweep_timeouts `17 * * * *`, vallo_purge_idempotency `10 2 * * *`, vallo_purge_rate_limits `30 * * * *`, vallo_reconcile_payments `47 * * * *`, vallo_release_stale_holds `*/15 * * * *`, vallo-daily-note `0 6 * * *`, vallo-nightly-badges `20 2 * * *` | **Partial**: one summary row from the newest pg-cron-watch audit row; per-job last run and status MISSING (request A5). Schedules in the handbook match `cron.job`. |

### Alerts

`risk_alerts` (severity low, medium, high; status open, resolved): Overview
Recent alerts, Operations Active alerts and tab, `/admin/alerts` to
resolve. Writers found in `pg_proc`: `scan_post`, `scan_story`,
`scan_event`, `scan_review`, `scan_review_response`,
`scan_social_profile`, `notify_report`, `request_money_reconciliation`, plus
the cron reporters (`cron`, `cron_job` entity types in the rows). All land on
the same desks. `blocked_terms` (severity) has no admin editor: **MISSING**
if the founder wants the scan's word list managed in the console.

### Handbook completeness (`docs/ADMIN_CONSOLE.md`)

Per desk: data sources, actions, permissions, effects, limits, options
rejected.

| Desk | Sources | Actions | Permissions | Effects | Limits | Rejected |
|---|---|---|---|---|---|---|
| Overview (3) | yes | none (reads) | section 1 | n/a | yes (3, 17) | yes (18) |
| Listings (4) | yes | yes | yes | yes | yes | yes |
| Moderation (5) | yes | yes | section 1 only | yes | yes | yes |
| Verification (6) | yes | yes | section 1 only | yes | yes | yes |
| Support, queue (7) | partly (functions, no tables) | yes | section 1 only | partly | **no** | **no** |
| Money (8) | yes | yes | yes | yes | yes | yes |
| Escrow (9) | yes | yes | yes | yes | yes | yes |
| Supply (10) | yes | none | yes | n/a | yes | yes |
| Bookings (11) | yes | yes | **no** | yes | **no** | **no** |
| Payments (12) | yes | yes | **no** | yes | **no** | **no** |
| Operations (13) | yes | none | section 1 | n/a | yes | yes |
| Analytics (14) | yes | none | section 1 | n/a | yes | yes |
| The other desks (15): agents, businesses, stops, fees, flags, reports, social, standing, alerts, audit, switches, reference, examples | **one line each** | **no** | **no** | **no** | **no** | **no** |

**Verdict: FAIL** on coverage of every desk. Thirteen desks in section 15
have a purpose line and nothing else, although several of them act
(Applications admits and refuses, Businesses verifies and puts live, Stops
suspends, Switches turns surfaces off, Alerts resolves, Standing grants
badges, Around opens areas). Bookings and payments carry no permissions,
limits or rejected options. Escrow purposes omit `agency_fee`. Inspections,
events, account deletions and business transfers are not on any desk and
the handbook does not say so.

## Routes under `/admin` (from the filesystem)

`/admin`, `/admin/agents`, `/admin/alerts`, `/admin/analytics`,
`/admin/audit`, `/admin/bookings`, `/admin/bookings/[bookingId]`,
`/admin/bookings/reservations`, `/admin/businesses`, `/admin/escrow`,
`/admin/examples`, `/admin/fees`, `/admin/flags`, `/admin/kyc`,
`/admin/listings`, `/admin/listings/[id]`, `/admin/moderation`,
`/admin/money`, `/admin/operations`, `/admin/payments`, `/admin/queue`,
`/admin/reference`, `/admin/reports`, `/admin/settings`, `/admin/social`,
`/admin/standing`, `/admin/stops`, `/admin/supply`, `/admin/support`,
`/admin/switches`: 30 pages. Every one redirects a signed-out browser to
sign in, so none has a live shape sweep; see B for which have harness
proof.
