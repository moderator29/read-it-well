# Session B closing audit

Auditor: Session B worker "auditor". Read only: no product file was changed.
Audited on 22 September 2026 against `main` at `2470bdf` (worktree
`wt-auditor`, production build served on port 3181 with
`VALLO_PREVIEW_HARNESS=1`). Live database read with SELECT only
(project `uccixoonmbhrnyczyigt`): 64 published listings, 64 of them
`is_demo`, 0 real supply, 7 accounts, 0 open risk alerts, the same as R4.

The founder's closing standard, applied strictly: (1) every surface closes
with a measured side-by-side comparison in the ledger (property | image
measured | built measured | match) and a render-vs-built image; (2) every
screen walks its whole chain with broken links named; (3) nothing ships a
claim; plus light mode correct and the shape ratio sweep at zero. A
resemblance is a FAIL. A missing measured row is a FAIL. A claim is a FAIL.

## Result at a glance

| Surface | Owner | Gate |
|---|---|---|
| Profile `/profile` | profile | **FAIL** |
| Get started `/welcome`, `/start` | welcome | **FAIL** |
| Welcome back `/sign-in`, `/sign-in/email` (+ `/sign-up`, `/forgot-password`) | signin | **FAIL** |
| Wallet `/wallet` | wallet | **FAIL** |
| Send money `/wallet/send` | wallet | **FAIL** |
| Inspections `/inspections`, `/agent/inspections` | inspection | **FAIL** |
| Admin shell, overview, operations, analytics | admin-shell | **FAIL** |
| Admin review desks (listings, moderation, kyc, queue, support) | admin-review | **FAIL** |
| Admin money desks (money, escrow, supply, bookings, payments) | admin-money | **FAIL** |
| Welcome email | email | **FAIL** |

No surface passes. The reasons, per surface, are below; most are closeable
with a side-by-side image, the missing measured rows and a re-shoot, but four
are real product or claim faults (the wallet trust strip, the admin landing
bypass, the two empty admin ledger sections and the inspection composition).

## A. Claims sweep

Grep over every Session B-owned file (scope file sections Profile to 8, 261
files, tests excluded for the claim words) and the i18n namespaces they read
(`auth`, `signUp`, `welcomeCards`, `wallet`, `walletSend`, `walletReceive`,
`admin`, `inspectionsPage`) for NDIC, insur, encrypt, 256, airtime, bills,
swap, reimagined, guarantee, certified, demo, sample, preview, coming soon,
welcome aboard, plus safe, secure, protect and instant.

| File:line | Text | Verdict |
|---|---|---|
| `packages/i18n/src/locales/en.ts:2845` (`wallet.home.trustTitle`) | "Your money is safe" | **FAIL, claim.** Read by `components/app/wallet/TrustStrip.tsx` (Session B's file), rendered on `/preview/e/wallet` under the harness. Same key in ha, ig, yo. |
| `en.ts:2846` (`wallet.home.trustBody`) | "Encrypted in transit and recorded to the kobo. Nothing moves without you." | **FAIL, claim** (encryption claim R1 refuses). ha.ts:2097, ig.ts:2102, yo.ts:2097 carry the same. |
| `en.ts:2847` (`wallet.home.trustBadge`) | "256-bit TLS" | **FAIL, claim** (the 256 bit badge R1 refuses, reworded). ha.ts:2098, ig.ts:2103, yo.ts:2098. |
| `apps/web/src/components/app/wallet/TrustStrip.tsx:7-11` | comment: "The second [256 bit] is a fact about every request this product makes" | **FAIL.** The component keeps the encryption badge the ledger (5, refused) says was refused. Delete the component and the three keys; `(dev)/preview/e/wallet/page.tsx:4,28` (Session A's) imports it, so the deletion needs a line in section 49 or a scope request. |
| `en.ts:3805` (`walletSend.tagline`) | "Fast. Safe. Always." | FAIL (dead). No reader in `src` (the send page no longer draws it; the receive page reads `walletReceive.tagline`), but it is the render's "Quick. Safe. Reliable." claim kept in the dictionary. Remove. |
| `apps/web/src/components/app/wallet/WalletSettingsSheet.tsx:28-37` | hard-coded English "Moved only by our servers", "Every movement lives in a permanent, kobo-exact ledger." | NOTE. Not i18n (four locales get English); "permanent" is an unevidenced claim (ledger rows are append-only by policy, but "permanent" is not established in the ledger section). Evidence or reword. |
| `WalletSettingsSheet.tsx:117-118` | "...is not insured by the Nigeria Deposit Insurance Corporation." | NOTE. A true negative disclaimer that mirrors `lib/legal/terms.tsx` section 15, not a claim; but the founder's line is "no NDIC", so it needs the founder's yes. |
| `en.ts:2849`, `en.ts:2855` (`wallet.topUpHint`, `wallet.opening`) | "secure Paystack window", "Opening the secure payment window" | NOTE. A statement about Paystack's hosted page, not Vallo; acceptable, flagged for the founder. |
| `en.ts:3766` (`walletSend.instantChip`) | "Instant transfer" | PASS. Evidence in the ledger (both legs in one statement). |
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
session's trailer: 54 commits, zero em dashes. PASS.

## B. Shape and light sweep

Production build of `main` at `2470bdf`, served with
`VALLO_PREVIEW_HARNESS=1 npx next start -p 3181`. Every run:
`node scripts/design/compare-surface.mjs --base http://127.0.0.1:3181 --shape-sweep --routes <route> --theme both`,
at 390 and 1536, dark and light. Columns: BREACHES (ratio >= 0.5) /
WORTH AN EYE (> 0.35) / ROUND ICON-ONLY.

**Signed-out routes (real pages, no fixture).**

| Route | Breaches | Worth an eye | Round icon-only |
|---|---|---|---|
| `/welcome` | 0 | 0 | 0 |
| `/start` | 307 to `/welcome?next=%2Fsign-up` (checked with curl; nothing to sweep) | | |
| `/sign-in?welcomed=1` | 0 | 0 | 0 |
| `/sign-in/email` | 0 | 0 | 0 |
| `/sign-up` | NOT MEASURED: the page never reached network idle in 60 s, twice (also with `?welcomed=1`); HTTP 200 by curl | | |
| `/sign-up/email` | 0 | 0 | 0 |
| `/forgot-password` | 0 | 0 | 0 |

**Signed-in routes redirect** (curl, 307 to
`/sign-in?next=<path>&notice=sign-in-required`): `/profile`, `/wallet`,
`/wallet/send`, `/inspections`, `/agent/inspections`, `/admin` and every
`/admin/**` desk. The sweep refuses a redirected page, so these surfaces have
**fixture-only proof**: Profile, Wallet, Send money, Inspections (both
routes), and the whole admin console. No signed-in page was measured by
anybody in Session B.

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

Total on the admin harnesses: **0 breaches, 128 worth an eye.** Every one
of the 128 is one of two shared admin controls, both admin-shell's
(`app/admin/_components/QueueFilters.tsx` and `admin.css`): the status chip
`.nf-admin-chip` (40 px tall, radius 14, ratio 0.35) and the "Search this
queue" input (352 x 40, radius 14, ratio 0.35). The 2 on
`/preview/f5/agent-inspections` are the agent console's "Search my
listings" input (448 x 40, radius 14), agent chrome rather than the
inspection sheet. **The founder's "shape ratio sweep at zero" is not met on
the console**: a 14 px radius on a 40 px control sits exactly on the 0.35
line. A 44 px control or a 12 px radius clears it.

No committed harness renders the money, escrow, supply, analytics,
operations, kyc, moderation, listings-queue, support or bookings desks; the
workers' proofs came from uncommitted harnesses (`/preview/zz-am/*`,
`/zz-pf`, `/ix-harness`, `/preview/sbw/*`), which cannot be re-run by
anybody else. Those desks have no reproducible sweep on `main`.

**Light.** Every sweep above ran in light as well as dark. Beyond shape, I
read the light proofs: profile, wallet, send and inspection hold their
anatomy on paper with no dark plate on white; welcome and sign in are dark
in both themes by rule 22 and their ledgers prove it (sign in by a computed
style diff, 0 differences). Admin light proofs exist only for admin-money at
1440 (and money at 390). Admin shell and admin review have no light proof.

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
also needs the proxy's `next` for `/admin/**` to point at `/admin`.

## D. Ledger gate, per surface

Columns: chain with every link named; comparison table with measured image
and built values for container radii, rim, glass fill, glow, icon plates,
every text role's size and weight, spacing, button treatment, badges,
colours; light mode check; shape sweep numbers; refused-from-render list;
skipped or unverified list; proofs at 390 dark, 390 light (or the rule 22
note), desktop; a render-vs-built side-by-side. Then my own reading of the
side-by-side (or, where none exists, the governing image beside the 390 dark
proof), naming the three largest visual differences.

### 1. Profile (`/profile`), owner: profile. GATE FAIL

| Check | Result |
|---|---|
| Chain | Yes, every row (ledger 1.2); broken links named (scope 1, 1b, 1c) |
| Comparison rows | radii, rim, fill, plates, every text role, spacing, button, badges: measured. **Glow: image side not measured** ("soft blue bloom round the row", no radius or alpha). **Colours: "one blue family", not measured.** |
| Light | Yes (1.5) |
| Sweep numbers | Yes, harness `/zz-pf` 0 / 0 / 0 |
| Refused list | Yes |
| Skipped list | Yes |
| Proofs | 390 dark, 390 light, 1280 dark and light: present. **Side-by-side: none** (ledger 1.6 says so) |

Three largest differences (render `50E032EA` beside `profile-390-dark.jpg`):
1. The icon plates are dim, small-glyph navy squares; the render's are lit
   glass squares with a bright electric edge and a glyph that fills them.
2. The rows are flat; the render's rows glow, with a brighter foot and a
   luminous fill that separates them from the page.
3. Type is 1.16 times the render and the name heavier, so the text column and
   rows read larger and the page longer than drawn (a deliberate choice in
   1.1, but it is the image that governs).

Fail reasons: no side-by-side; two unmeasured rows (glow, colours); the
three differences above.

### 2. Get started (`/welcome`, `/start` redirect), owner: welcome. GATE FAIL

| Check | Result |
|---|---|
| Chain | Yes; W1 (Session A), W2 (done by signin), W3, W4 named |
| Comparison rows | lockup, headline, sub-line, stage, dots, button, Skip, ground: measured. **Glow: not measured** for the lockup and the headline, which glow in the render. Tile radii, rim, glass: "as drawn" (they are the render's pixels, accepted). Sub-line weight not stated. |
| Light | Yes, rule 22 (dark in both themes), proof `welcome-light-390.jpg` |
| Sweep numbers | Yes, 0 / 0 |
| Refused list | Yes |
| Skipped list | Yes |
| Proofs | 390 dark, 390 light, desktop 1440, side-by-side `welcome-render-vs-built-390.jpg`: all present |

Three largest differences (from `welcome-render-vs-built-390.jpg`):
1. The coin is a different object: the render's is a slim coin turned almost
   edge-on inside a lit orbit ring; the built one is the drawer's thicker,
   darker coin nearer face-on.
2. "One platform." is a pale lavender-to-ice gradient; the render's is a
   saturated electric blue to cyan with a glow. The lockup's glow is also
   missing.
3. The lit button's bloom and rim are weaker than drawn; the render's button
   glows onto the page beneath it.

Fail reasons: the coin and the headline are visible departures from the
image; the glow row is missing.

### 3. Welcome back (`/sign-in`, `/sign-in/email`; inherits to `/sign-up`, `/forgot-password`), owner: signin. GATE FAIL

| Check | Result |
|---|---|
| Chain | Yes, 12 links; SIGNIN-1 named |
| Comparison rows | card radius, fill, edge, rim, every control, type: measured. **Spacing row says "tightened 3 to 10px"**: measured, and not a match. Icon plates n/a. |
| Light | Yes, computed-style diff, 0 differences |
| Sweep numbers | Yes, but `/forgot-password` was not in the worker's sweep (covered in B below) |
| Refused list | Yes (the slogan) |
| Skipped list | Yes |
| Proofs | 390 dark, 390 light, 1440 dark, side-by-side `signin-vs-55A56F21-390.jpg`: present. No proof of `/forgot-password`. |

Three largest differences (from `signin-vs-55A56F21-390.jpg`):
1. Proportion. The render's card spans about 62 per cent of the poster with
   the aurora and the lake visible round it; the built card runs almost edge
   to edge and the landscape is gone.
2. The card is an opaque navy slab; the render's is translucent glass with
   the aurora showing through and a stronger lit edge.
3. Type and controls are 1.2 to 1.36 times the render's scale (stated), and
   the lockup is larger and crowds the top, so the whole screen reads
   heavier than drawn.

Fail reasons: this is a resemblance, not the image; the scale choice is
recorded but the image governs.

### 4. Wallet (`/wallet`), owner: wallet. GATE FAIL

| Check | Result |
|---|---|
| Chain | Yes; W2, W4 named |
| Comparison rows | measured, including two recorded NO rows (page gutter 24 vs 13.5, section heads 17 vs 14) |
| Light | Yes. The ledger cites `wallet-390-light.png`; the file is `.jpg` |
| Sweep numbers | Yes, harness `/preview/sbw/*` 0 / 0 / 0 |
| Refused list | Yes |
| Skipped list | Yes |
| Proofs | 390 dark, 390 light, 1280 dark: present. **Side-by-side: none.** |
| Claims | **FAIL**: `TrustStrip.tsx` and `wallet.home.trustTitle/Body/Badge` (section A) |

Three largest differences (render `6AF37222` beside `wallet-390-dark.jpg`):
1. The balance figure in the committed dark proof was shot mid-animation:
   it reads "₦245,6̆70.00" with a half-rolled digit clipped by its line box.
   The proof is not a still of the built page; retake it (and check the
   roll's clipping, which a slow phone would show too).
2. "Add money" overflows its tile at 390 (the label touches both edges in
   dark and light); the render's tiles have air round every label.
3. The quick-action cards are cramped: the plate sits hard against the top
   left edge and the two lines crowd the foot, where the render's cards are
   roomy with the plate inset. The 24px shell gutter (against 13.5) narrows
   every card.

Fail reasons: claim in a Session B file and namespace; no side-by-side; the
proof defect; the overflowing label.

### 5. Send money (`/wallet/send`), owner: wallet. GATE FAIL

| Check | Result |
|---|---|
| Chain | Yes. **W1 is a money-safety blocker (a second tap sends twice)**, named, in Session A's files. The surface cannot be called wired real while it stands. |
| Comparison rows | balance card, title, chip, panel, plates, type, chips, counter, button, reassurance: present. **Missing measured rows: container radii of the panel and rows (only "14px corners", image side unmeasured), rim, glow, spacing, colours.** |
| Light | Yes. The ledger cites `send-390-light.png`; the file is `.jpg` |
| Sweep numbers | Shared with wallet: 0 / 0 |
| Refused list | Yes |
| Skipped list | Yes |
| Proofs | 390 dark (empty and filled), 390 light: present. **Desktop: none. Side-by-side: none.** |

Three largest differences (render `77A54EA3` beside `send-390-dark.jpg`):
1. Every row sub-panel wears a thick bright outline; the render's rows are
   quiet sub-panels with a soft lit edge inside one panel.
2. The four amount chips are crammed (the figures touch the chip edges) and
   the lit Send Money button's label is dim grey-blue (the disabled state is
   what the proof shows); the render's label is white on a bright button.
3. The reassurance card is a large three-paragraph block; the render's is a
   single slim strip. (Words are right by the claims rule; the form is not.)

Fail reasons: missing measured rows, no desktop proof, no side-by-side, W1
open.

### 6. Inspections (`/inspections`, `/agent/inspections`), owner: inspection. GATE FAIL

| Check | Result |
|---|---|
| Chain | Yes; I1 to I4 named |
| Comparison rows | complete and measured, with NO rows recorded (gutter, info row layout) |
| Light | Yes |
| Sweep numbers | Yes, harness `/ix-harness` 0 / 0 / 0 |
| Refused list | Yes |
| Skipped list | Yes |
| Proofs | 390 dark, 390 light, 1280 dark, lister view, side-by-side `inspection-render-vs-built-390-dark.jpg`: present |

Three largest differences (from the side-by-side):
1. Composition. The render fits the whole inspection (card, info row, eight
   rows, notes, both buttons) in one phone screen; the built page is about
   one and a half screens and Add Photos and Submit sit below the fold,
   behind an outcome chooser the render does not draw.
2. The checklist is four tall rungs at larger type where the render draws
   eight compact rows (the eight are refused under I1, recorded, but the
   panel no longer looks like the drawn one).
3. The title's second word is near white; the render's "Inspection" is the
   electric blue gradient. The info row stacks glyph above text where the
   render sets them side by side.

Fail reasons: a resemblance at phone size. The ledger itself is complete.

### 7. Admin shell, overview, operations, analytics, owner: admin-shell. GATE FAIL

- **Ledger section 6 on `main` reads "(pending)".** No chain, no comparison,
  no light check, no sweep numbers, no refused list, no skipped list.
- **No proofs**: `docs/design/proofs/session-b/` has no `admin-shell/`
  folder (nothing at 1440 dark or light, 390, or side by side with
  `5EAA44CB` or `01F7DFC7`).
- **Shape sweep not at zero**: admin-money's run (ledger 8.6) found 45
  WORTH AN EYE, all on the shell ("All desks" rail row at 0.39, the bar's
  search input and the shared status chips at 0.35). My own run is in B.
- **Landing rule not enforced** for addresses (section C).
- The handbook covers the shell, overview, operations and analytics
  (sections 2, 3, 13, 14, 16, 17, 18), which is the one part that is done.

### 8. Admin review desks (listings, listing under review, moderation, kyc, queue, support), owner: admin-review. GATE FAIL

- **Ledger section 7 on `main` reads "(pending)"**: nothing of the gate.
- **No proofs** folder for the review desks; no side-by-side with
  `C1D98B3C` panels 1 and 2 or `01F7DFC7` panel 1 or `8E9602E2` panel 2.
- The handbook sections 4 to 7, 16 to 18 are written and are good.
- Known limits recorded: decided buckets capped at ten (AR-5), no provider
  match score (refused).

### 9. Admin money desks (money, escrow, supply; bookings and payments in register), owner: admin-money. GATE FAIL

| Check | Result |
|---|---|
| Chain | Yes, per desk; request 10 named |
| Comparison rows | Present, but the image side is mostly proportions and hexes; **text sizes are in image px ("cap 12 img px") not converted, the card radius is "close" not matched, and escrow rows are "partly"**. Bookings and payments: none. |
| Light | Yes (1440 only) |
| Sweep numbers | Yes: 0 breaches, **45 worth an eye** (attributed to the shell) |
| Refused list | Yes |
| Skipped list | Yes |
| Proofs | 1440 dark and light for all three, 390 dark for all three, 390 light for money only. **Side-by-side: none.** |

Three largest differences (render `C1D98B3C` panel 3 beside
`money-full-1440-dark.jpg`):
1. The rail is a short floating box that ends a third of the way down the
   page; the render's rail is a full-height lit panel joined to the bar.
2. The money chart is a steep wave of two curves oscillating month to month;
   the render's is one rising filled mountain with a quiet second series.
   (Fixture data drives the shape; the smoothing and the second area do not
   match the drawn chart.)
3. The panels are darker and flatter than the render's: its cards have a
   visible lit edge and a brighter glass fill; the built edge is a thin line.

Fail reasons: no side-by-side, 45 over 0.35 in the sweep, unconverted
measured rows, bookings and payments not compared.

### 10. Welcome email (`lib/email/welcome-message.ts`), owner: email. GATE FAIL

| Check | Result |
|---|---|
| Chain | Yes, six links, the send is Session A's |
| Comparison | No governing image exists for the email, so no table is owed; the design echoes first run. Accepted as N/A. |
| Light | By design dark only (theme.ts), recorded |
| Sweep | N/A (not a page); shape law checked by ratio in the checklist |
| Refused list | Yes (the old copy's claims) |
| Skipped list | Yes |
| Proofs | 600 and 375, images on and off, stripped fallback, plain text: present |
| Claims | **FAIL**: two unevidenced statements (section A): "Agents are checked more closely than owners", "Each step you complete shows on your listings." |

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
