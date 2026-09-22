# Design drift survey: the shipped frontend against the reference images

Written 22 September 2026, on the founder's complaint: "there is a lot of areas that need fixing
on the frotned that other session did that didn't look like the files we told it to follow survey
it especially the wallet features".

Method: every finding below was produced by opening the reference image, reading the shipped
component and the shipped stylesheet, and where a number is claimed, measuring the image in pixels
and converting to the 390px logical viewport the phone renders assume. There is no browser in this
environment, so nothing here was screenshotted live. Where a shipped screenshot already exists in
`docs/design/proofs/` it was opened and measured too, and those measurements are marked MEASURED
ON PROOF; they are the strongest evidence in this document because they are the browser's own
output. Everything else that depends on how a rule paints rather than on what it says is marked
INFERRED.

Severity scale, used throughout:

- **P1** the shipped surface reads as a different design from the image. A person holding the two
  side by side would not call them the same screen.
- **P2** visible on a side-by-side. One element in the wrong size, shape, place or colour.
- **P3** a detail. Real, worth closing, invisible at arm's length.

---

## 0. The short answer for the founder

The wallet is not wrong in its ideas. Every section the governing render draws is present, in the
right order, wired to real money. What went wrong is **size and proportion**, in four places, and
the effect compounds:

1. The balance figure draws about 13 per cent shorter than the render draws it, and the
   stylesheet's own comment says it should be 2.6rem while the rule beside it paints 2.09rem at
   phone width.
2. The four action tiles are 83px tall where the render's are 60px, so a squat landscape band
   became four tall portrait boxes.
3. The four quick-action cards are 127px tall where the render's are 85px, and their titles are
   small enough that "Send Money" breaks over two lines and "Withdraw / To your bank" over three.
4. Every money page carries a second header row ("Wallet", "Send money", "Transactions") under the
   app bar. The render has one header row and then the balance card.

Together those four push the screen down and make it read loose and tall where the render reads
tight and wide. That is what "didn't look like the files" means here.

And the structural reason it was never caught: **the money family has no row in the ledger's
screenshot proofs table**. `docs/BUILD_06_LEDGER.md` section 6 opens with "a scope closes only
with its row here" and then lists the drawer, the dock, sign in, welcome, the assistant, home,
notifications, the landing, the filters, stays home, the move-in ledger, trips, the glass objects
and the flip. There is no wallet row, no send row, no receive row, no transactions row, no
payments-settings row. The screenshots exist (`docs/design/proofs/e/` holds thirteen of them) but
no verdict was ever written against a governing image. The one family the founder singled out is
the one family that never went through the gate.

---

## 1. Before anything else: the catalogue does not cover all the governing images

`docs/design/CATALOGUE.md` opens "Source: `docs/design/references/` (66 PNGs: 61 UUID-named + 5
GOVERNING-*)". That count is wrong. There is a subfolder, `docs/design/references/founder/`,
holding twelve more files, four of which are named GOVERNING:

- `founder/GOVERNING-home-markets-target.png`
- `founder/GOVERNING-home-markets-target-2.jpg`
- `founder/GOVERNING-search-filters-target.png`
- `founder/GOVERNING-thread-hotel-booking.jpg`
- `founder/GOVERNING-thread-rental-enquiry.jpg`

plus `founder/landing-fullpage-target.png` and five "as-shipped" shots the founder sent back as
evidence of faults.

This matters for the survey itself, and I want it on the record before the findings, because I
nearly filed two false drifts off it:

- The landing's "Popular Cities" label, which the UUID hero render
  (`GOVERNING-landing-desktop-hero.png`) does not draw, **is** drawn in
  `founder/landing-fullpage-target.png`. The shipped code is right and the catalogue image is
  stale.
- The removal of the ten-tile "Everything you need in one platform" grid, which
  `GOVERNING-landing-desktop-hero.png` does draw and `docs/DESIGN_DIRECTION.md` section 2 names
  explicitly, is justified by `founder/landing-fullpage-target.png`, which shows a six-cell chip
  row in its place. The shipped code is right and the frontend law's own prose is stale.

**Fix instruction (documentation, P2):** extend `docs/design/CATALOGUE.md` with a `founder/`
section, state that the founder targets supersede the UUID renders and the five top-level
GOVERNING files wherever they disagree, and correct `docs/DESIGN_DIRECTION.md` section 2's
description of the landing hero so it no longer requires a grid the founder's own target replaced.

---

# PART ONE: THE WALLET FAMILY

Governing images for this family, all opened for this survey:

| Image | Governs |
| --- | --- |
| `6AF37222-1D2E-4200-AB23-E55A24AE5E4F.png` | wallet home (balance card, action row, quick actions, recent transactions) |
| `95840448-AEBA-4671-9CAA-9B77B6A5D383.png` | send money (the KEEPER per the catalogue) |
| `77A54EA3-BBB5-4BF4-B3A5-144C99CABAF7.png` | send money variant; the trust strip comes from its foot |
| `7F96BE6C-BF8C-4413-BD58-25531B27D549.png` | settings and `/settings/payments` |

No image governs receive, the payment result sheets, or a full-screen transaction history. Those
inherit the register (DESIGN_DIRECTION rule 1.5).

## Measured anatomy of `6AF37222`, for reference

The phone screen in that render spans x=178 to x=841, which is 663 image pixels for a 390px
logical viewport, so the scale is 1.70 image pixels per logical pixel. Everything below is
converted through that figure.

| Element | Image | Logical at 390px |
| --- | --- | --- |
| balance digits, cap height | 48px | 28.2px, so a font of about 40px |
| "Total Balance" label, cap height | 15px | 8.8px, about 12.5px type |
| glass wallet object | 152 x 152px | about 90 x 90px |
| action tile, height | 101px | about 60px |
| action tile, width | 131px | about 77px |
| quick-action card, height | 145px | about 85px |
| transaction glyph circle | 61px | about 36px |
| "Completed" badge, height | 28px | about 16.5px |
| card gutter from screen edge | 22px | about 13px |
| card corner radius | about 23px | about 13.5px |

---

## W-MONEY-1: wallet home (`/wallet`)

### 1.1 The balance figure is a rung short, and the file says so itself

- **Surface:** `/wallet`, the balance card.
- **Image:** `6AF37222-1D2E-4200-AB23-E55A24AE5E4F.png`.
- **What the image shows:** "₦245,680" set at roughly 40px, with ".00" at about 0.58 of that, in
  the same white. Measured digit cap height 28.2 logical px.
- **What the code does:** `apps/web/src/app/css/wallet.css:74` sets `font-size: clamp(2rem, 8.6vw,
  2.75rem)`. At a 390px viewport that resolves to 33.5px. MEASURED ON PROOF: in
  `docs/design/proofs/e/wallet-390-dark.png` (780px wide, so 2x) the digits "245" measure 49
  device px, which is 24.5 logical px of cap height against the render's 28.2. The shipped figure
  is about 13 per cent shorter.
- **The tell:** `apps/web/src/app/css/wallet.css:101` reads "The hero figure is 2.6rem", and
  `apps/web/src/components/app/wallet/money.ts:8` reads "The balance card sets the naira at 2.6rem
  and the kobo at 1.4rem beside it". 2.6rem is 41.6px, which is the render's size almost exactly.
  The intent was right and the clamp under-delivers: `8.6vw` only reaches 2.6rem at a 484px
  viewport, which no phone in the target set has.
- **Severity:** P1. It is the one number the screen exists for.
- **Fix:** in `wallet.css:74` set `font-size: clamp(2.4rem, 10.3vw, 2.75rem)`, which paints 40.2px
  at 390 and reaches the 2.75rem ceiling at 427px. Leave `.nf-money-kobo--hero` at `0.6em`; that
  ratio already matches the render's measured 0.58.

### 1.2 The four action tiles are portrait where the render's are landscape

- **Surface:** `/wallet`, the Send / Receive / Top Up / Crypto row inside the balance card.
- **Image:** `6AF37222`.
- **What the image shows:** four tiles about 77px wide by 60px tall, glyph above a single-word
  label, sitting as a squat band across the foot of the balance card. The first is filled brand,
  the other three are blue-tinted glass.
- **What the code does:** `apps/web/src/app/css/wallet.css:135` sets `min-height: 5.25rem`, which
  is 84px. MEASURED ON PROOF: the Send tile in `wallet-390-dark.png` runs from y=626 to y=791
  device, which is 83 logical px tall, and the four tiles plus three gaps occupy 307 logical px,
  so each tile is about 71px wide. Shipped 71 x 83 (portrait) against the render's 77 x 60
  (landscape).
- **Severity:** P1. The aspect ratio flip is the single most visible difference between the two
  screens.
- **Fix:** `wallet.css:135`, `min-height: 3.75rem` (60px). Keep the 44px tap floor honest by
  leaving the vertical padding at `--nf-space-sm` and letting the glyph drop from 24px to 22px if
  the label then crowds; the glyph in the render measures about 22px. Do not reduce the gap: the
  render's inter-tile gap measures about 8px, which is already `--nf-gap-inline`.

### 1.3 The quick-action cards are half again too tall and their titles break

- **Surface:** `/wallet`, the Quick Actions row.
- **Image:** `6AF37222`.
- **What the image shows:** four cards about 85px tall. Glyph plate top left, then a title on ONE
  line and a sub on ONE line: "Send Money / To bank or wallet", "Request Money / Share your link".
- **What the code does:** `apps/web/src/app/css/wallet.css:239` fixes `min-height: 7.75rem`
  (124px) and `wallet.css:248` sets the title at `--nf-text-caption` (13px) with `text-wrap:
  balance`, deliberately so the title may take two lines. MEASURED ON PROOF: the block in
  `wallet-390-dark.png` runs y=998 to y=1252 device, which is 127.5 logical px, and every one of
  the four titles has broken: "Send / Money", "Request / Money", "Withdraw / To your / bank",
  "Statement / Every / movement".
- **Severity:** P1. A 50 per cent overshoot with ragged wrapping where the render has a tidy
  four-across band.
- **Fix:** three changes together in `wallet.css`.
  1. Line 239: `min-height: 5.25rem` (84px).
  2. Line 246 to 253: move `.nf-wallet-quick__title` to `--nf-text-overline` (12px) with
     `white-space: nowrap` removed but `text-wrap: balance` kept, and shorten the two longest
     strings at `packages/i18n/src/locales/en.ts:2487` and `:2489` from "Send Money" and "Request
     Money" to "Send" and "Request", which is what a 71px card can carry on one line and is what
     the render's own wider card is doing.
  3. Line 264 to 268: the glyph plate is 2.125rem (34px); the render's measures about 30px. Bring
     it to `1.875rem`.
  Alternatively keep the two-word titles and give the row `gap: var(--nf-gap-inline-tight)`, which
  buys 12px of width across the row. The first option is closer to the image.

### 1.4 There is a second header row the render does not have

- **Surface:** `/wallet`, and every other money page.
- **Image:** `6AF37222`.
- **What the image shows:** ONE header row: back glyph, the VALLO lockup, bell with an unread dot,
  avatar. Then, immediately, the balance card. There is no page title anywhere on the screen. The
  word "Wallet" appears only in the dock.
- **What the code does:** `apps/web/src/app/(app)/wallet/page.tsx:72` draws `<PageHeader
  title={t.nav.wallet} actions={<WalletSettingsSheet />} />` BELOW the app bar that `AppShell`
  already renders (the header at `apps/web/src/components/app/AppShell.tsx:256` with hamburger,
  lockup, bell and avatar per DESIGN_DIRECTION rule 3.2). MEASURED ON PROOF: in
  `wallet-390-dark.png` the app bar occupies y=0 to 118 device and the "Wallet" row y=185 to 273
  device, so the second row costs about 68 logical px, and the balance card starts at y=160
  logical where the render starts it at y=122.
- **Severity:** P1 for composition. It is the reason the whole screen sits lower than the render.
- **Fix:** on `/wallet` drop the `PageHeader` entirely and move the settings control into the app
  bar's actions slot or into the balance card's corner, because the app bar already carries the
  render's header. If a back affordance is wanted on `/wallet`, note the render's back glyph goes
  in the same single row, not a second one. Keep `PageHeader` on `/wallet/send`, `/wallet/receive`
  and `/wallet/transactions`, which are task pages the render does give titles, but see 2.1 for
  the layout they should use.

### 1.5 Quick Actions has no "See all", where the render gives it one

- **Image:** `6AF37222`. The section head reads "Quick Actions" on the left and "See all →" in
  brand ink on the right, exactly as Recent Transactions does below it.
- **What the code does:** `apps/web/src/app/(app)/wallet/WalletDeck.tsx:277` to `:279` draws the
  `h2` alone. The `seeAll` string already exists at `packages/i18n/src/locales/en.ts:2498` and is
  used on the transactions card at `apps/web/src/components/app/wallet/RecentActivity.tsx:53`.
- **Severity:** P3, but it makes the two section heads on one screen inconsistent, which the
  render does not.
- **Fix:** either add the affordance pointed at a real destination, or accept the deviation and
  record it. There are only four quick actions and all four are on screen, so "See all" has
  nothing behind it: this is a case where the honest answer is to leave it out and write that
  down, not to add a control that goes nowhere. Recommend: leave out, record in the ledger.

### 1.6 The glass wallet object is smaller than the render draws it

- **Image:** `6AF37222`. The object measures 152 x 152 image px, which is about 90 x 90 logical,
  and it overlaps vertically from the label row down past the week-change line.
- **What the code does:** `apps/web/src/app/css/wallet.css:56` sets `width: 6rem; height: 6rem`
  (96px), which is right, but MEASURED ON PROOF the drawn mark in `wallet-390-dark.png` occupies
  about 72 x 67 logical px, because the PNG asset carries transparent margin inside its own box.
- **Severity:** P3.
- **Fix:** raise `.nf-wallet-hero__object` to `7rem` on the phone so the drawn mark lands near
  90px, or re-crop the asset. Measure the drawn mark, not the box. The same correction applies to
  `.nf-money-hero__object` (`wallet.css:383`), see 2.2.

### 1.7 The section headings are larger than the render sets them

- **Image:** `6AF37222`. "Quick Actions" and "Recent Transactions" both measure about 10 logical
  px of cap height, which is roughly a 14px font.
- **What the code does:** `TYPE.sectionTitle` is `nf-h3`
  (`apps/web/src/components/app/Screen.tsx:113`), which is `--nf-text-h3: clamp(1.1875rem, ...)`,
  19px at 390.
- **Severity:** P3, and **this is one of the places the image should not be followed**. See
  section 9. Recorded here so the next worker does not shrink it by reflex.

---

## W-MONEY-2: send and receive

### 2.1 The page top uses the inline header where both money renders use the stacked one

- **Surface:** `/wallet/send`, `/wallet/receive`, `/wallet/transactions`, `/settings/payments`.
- **Images:** `95840448` and `77A54EA3` for send; `7F96BE6C` for settings.
- **What the images show:** a two-row page top. Row one is the chrome (back square, lockup, and on
  settings a gear). Row two is a large title, about 25px on send and about 30px on settings, with
  a tagline under it running the full width, and the glass object floating free at the right,
  overlapping the card below.
- **What the code does:** every money page calls `PageHeader` without `layout`, so it takes the
  `inline` branch at `apps/web/src/components/app/PageHeader.tsx:131` to `:188`: back square,
  title, subtitle and actions all on ONE row. `apps/web/src/app/(app)/wallet/send/page.tsx:44` to
  `:53` then passes the glass object into the `actions` slot, which puts a 76px object in the same
  row as a 44px back button and a 25px title. MEASURED ON PROOF: in
  `docs/design/proofs/e/send-390-dark.png` the title column is squeezed into the middle third and
  the object sits as a rounded plate on the right of the same row. `PageHeader` already implements
  the correct branch at `:98` to `:128`, and its own docstring at `:66` names it "the renders'
  page top (Settings, Admin Queue)".
- **Severity:** P1 for send and receive, P2 for transactions and payments.
- **Fix:** pass `layout="stacked"` at `apps/web/src/app/(app)/wallet/send/page.tsx:44`,
  `apps/web/src/app/(app)/wallet/receive/page.tsx:44`,
  `apps/web/src/app/(app)/wallet/transactions/page.tsx:31` and
  `apps/web/src/app/(app)/settings/payments/page.tsx:46`. Then take the glass object OUT of the
  `actions` slot and position it absolutely over the stacked block's right edge, as the render
  floats it.

### 2.2 The send object is the wrong mark and about half the drawn size

- **Image:** `95840448`. A glass PAPER PLANE, free-floating, no plate, measuring 118 x 85 logical
  px, overlapping the top edge of the balance strip. The same plane glyph appears again inside the
  Continue button.
- **What the code does:** `apps/web/src/app/(app)/wallet/send/page.tsx:50` renders `<BrandIcon
  name="transfer-arrow" />` in a 4.75rem (76px) box (`wallet.css:383`). MEASURED ON PROOF:
  `send-390-dark.png` draws two circular arrows around coins, inside a visible rounded-square
  glass plate, at about 72px. Two differences: the mark is a swap, not a send; and the asset
  carries a plate where the render's object floats.
- **Severity:** P2.
- **Fix:** use the send/plane object from the glass pack if one exists (check
  `apps/web/public/brand/glass/` for a plane or `payment-sent`), raise `.nf-money-hero__object` to
  `7rem` on the phone, and use a plate-free variant. If no plated-free plane exists, cut one from
  `95840448` through `scripts/cut-icon-ground.mjs` as DESIGN_DIRECTION rule 3.5 allows. It carries
  no baked text, so it is eligible.

### 2.3 The balance strip's wallet mark has no plate

- **Image:** `95840448`. The wallet mark sits inside a rounded-square brand-tinted plate measuring
  43.5 x 44 logical px, with its own lit rim, at the left of the balance strip.
- **What the code does:** `apps/web/src/components/app/wallet/SendFlow.tsx:316` draws a bare
  `BrandIcon` inside `.nf-balance-strip__mark`, which at `apps/web/src/app/css/wallet.css:401` to
  `:405` is 2.75rem of width and height and nothing else: no background, no border, no rim.
  MEASURED ON PROOF: `send-390-dark.png` shows the mark floating with no plate behind it.
- **Severity:** P2.
- **Fix:** give `.nf-balance-strip__mark` the `.nf-glyph-tile` treatment (border
  `--nf-brand-edge`, background `--nf-brand-tint-2`, `--nf-rim-lit`) at `--nf-radius-md`, or add
  the `nf-glyph-tile` class in `SendFlow.tsx:316` and let the object sit inside it.

### 2.4 The recipient field lost the scan affordance the catalogue named

- **Image:** `95840448`. The recipient control is a SEARCH field: magnifier on the left, "Search
  by name, bank or account number", and a QR-SCAN glyph in its own small rounded square at the
  right. `77A54EA3` draws the same scan glyph. `docs/design/CATALOGUE.md` names it explicitly as a
  pattern to keep: "Recent-recipient chips and QR-scan affordance; cleanest transfer flow".
- **What the code does:** `apps/web/src/components/app/wallet/SendFlow.tsx:357` to `:377` uses a
  `TextField` with `leadingIcon="mail"` and no trailing control at all. MEASURED ON PROOF:
  `send-390-dark.png` shows an envelope and nothing on the right.
- **Severity:** P2. The field is honestly an email field here, which is right and should stay, but
  the render's scan affordance is missing entirely and there is no counterpart anywhere in the
  family: `/wallet/receive` (`apps/web/src/components/app/wallet/ReceiveCard.tsx`) shows a link
  and a share button but no QR code, so there is nothing to scan and nothing to scan with.
- **Fix:** either build the pair (a QR on receive carrying the `/wallet/send?to=` link, and a scan
  button on send that opens the camera and fills the field), or record the omission in the ledger
  against both renders. Do not ship the scan glyph without the camera behind it: rule 3 of the
  definition of done forbids a picture of a feature.

### 2.5 The "All Contacts" tile is missing from the recipient row

- **Image:** `95840448`. Four circular initial avatars (AO, TK, MB, SO) and then a FIFTH tile, a
  rounded square carrying a people glyph and the words "All Contacts", visually distinct from the
  four circles.
- **What the code does:** `apps/web/src/components/app/wallet/SendFlow.tsx:421` to `:442` draws
  only the recent recipients this device has stored, and adds a "Clear recent" text button at
  `:410` to `:419` that the render does not have. MEASURED ON PROOF: `send-390-dark.png` shows
  four circles, "Recent" on the left and "Clear recent" on the right.
- **Severity:** P3.
- **Fix:** the platform has no contacts list, so "All Contacts" has nothing behind it and must not
  be drawn. Record the deviation. The "Clear recent" addition is correct and should stay: it is
  the control that makes a device-local list honest.

### 2.6 The bank section reintroduces the grey border the partial banned

- **Image:** `95840448`. The bank control is a field-shaped select: a small brand-tinted plate at
  the left, "Select Bank", a chevron-down at the right, inside the section card, with the lit
  brand edge every container on these surfaces carries.
- **What the code does:** `apps/web/src/components/app/wallet/SendFlow.tsx:517` writes `border
  border-[var(--nf-border-subtle)] bg-[var(--nf-surface-inset)]` as an inline Tailwind class. The
  header of `apps/web/src/app/css/wallet.css:17` to `:19` states the rule this breaks:
  "`--nf-border-subtle` and `--nf-border-default` are gone from every dark rule in this file: the
  edge is `--nf-brand-edge`". The rule was enforced in the stylesheet and then broken from the
  component.
- **Severity:** P2, and see 5.1: it is not the only one.
- **Fix:** replace with `border border-[var(--nf-brand-edge)]` and add `box-shadow:
  var(--nf-rim-lit)`, or better, give the row a class in `wallet.css` so the partial keeps
  ownership of the edge.

### 2.7 The Continue button carries the wrong glyph

- **Image:** `95840448`. "Continue" with a PAPER PLANE before the word. `77A54EA3` draws "Send
  Money" with a plane before and an arrow after.
- **What the code does:** `apps/web/src/components/app/wallet/SendFlow.tsx:555` passes
  `leadingIcon="arrow-right"`.
- **Severity:** P3.
- **Fix:** use the send glyph. If the stroked set has no plane, add one; it is a tier-one
  navigation glyph and the render uses it three times.

### 2.8 The amount field loses the render's naira affordance the moment it is used

- **Image:** `95840448`. The amount input shows "Enter amount" with a ₦ at its right edge,
  permanently.
- **What the code does:** `apps/web/src/components/app/wallet/SendFlow.tsx:467` sets
  `trailing={<span>₦</span>}` and `:471` sets `clearable`. MEASURED ON PROOF: `send-390-dark.png`
  with "25000" typed shows an X where the ₦ should be, so `clearable` displaces `trailing` as soon
  as there is a value. The render's currency mark is therefore present only on an empty field.
- **Severity:** P3.
- **Fix:** render both, with the ₦ inside and the clear control outside it, or drop `clearable` on
  this one field: the amount is three taps to retype and the currency mark is the render's
  affordance.

### 2.9 The Amount section sub-line repeats its own title

- **Image:** `95840448`. The head reads "Amount" over "Enter amount".
- **What the code does:** `apps/web/src/components/app/wallet/SendFlow.tsx:449` passes
  `sub={copy.amountLabel}`, and `copy.amountLabel` is also the field's label. MEASURED ON PROOF:
  `send-390-dark.png` reads "Amount" over "Amount (₦)".
- **Severity:** P3.
- **Fix:** add a distinct `amountSub` string, "Enter amount", at `packages/i18n/src/locales/en.ts`
  beside the other `walletSend` strings, and pass it.

### 2.10 The big rolling amount above the field is an addition

- **Image:** `95840448` has no large figure on the send screen. The amount is only ever in the
  field.
- **What the code does:** `apps/web/src/components/app/wallet/SendFlow.tsx:450` to `:457` draws an
  `nf-h0` rolling figure above the input, and `:491` to `:508` adds a balance-now / balance-after
  pair the render does not have.
- **Severity:** P3, and **this is a case where the code is better than the image**. See section 9.
  Recorded so it is not deleted by a literal reading.

### 2.11 Receive has no governing image and inherits correctly, with one gap

- **Surface:** `/wallet/receive`. `docs/design/CATALOGUE.md` section 1 lists "receive money" under
  "No reference at all".
- **What the code does:** `apps/web/src/components/app/wallet/ReceiveCard.tsx:90` and `:121` build
  two glass sections with the same solid-circle glyph heads the send page uses (`:196` to `:209`),
  which is exactly the inheritance rule 1.5 asks for.
- **Severity:** none for the register. One gap: no QR code, which is the universal affordance for
  this screen and the counterpart the send render's scan glyph implies. See 2.4.

---

## W-MONEY-3: transactions, receipts and the result sheets

### 3.1 The statement is a stack of cards where the render draws one card

- **Surface:** `/wallet/transactions`.
- **Image:** `6AF37222` is the only image that draws a transaction list, and it draws ONE glass
  card with a head and five rows separated by hairlines.
- **What the code does:** `apps/web/src/components/app/wallet/TransactionsSection.tsx:122` opens a
  new `<section className="nf-card">` per calendar day. MEASURED ON PROOF: in
  `docs/design/proofs/e/transactions-390-dark.png` four movements produce FOUR separate cards,
  each holding one row, each with its own lit rim and its own day heading. A statement reads as a
  stack of near-empty boxes.
- **Severity:** P2, rising to P1 for an account that moves money once a day, which is the common
  case.
- **Fix:** one `nf-card` for the whole list, with the day label as a sticky overline row inside it
  and `.nf-tx-row + .nf-tx-row` keeping the hairline it already has at
  `apps/web/src/app/css/wallet.css:337`. The render's own anatomy is already implemented by
  `.nf-tx-card__head` and `.nf-tx-list`; this is a change of nesting, not of styling.

### 3.2 The transaction row wraps where the render keeps three tight lines

- **Image:** `6AF37222`. Row height about 75 logical px: title, counterparty, "date • time", with
  the amount and the badge stacked on the right.
- **What the code does:** `apps/web/src/components/app/wallet/EntryRow.tsx:62` to `:66`
  deliberately wraps the counterparty rather than truncating, with a good reason stated in the
  comment. MEASURED ON PROOF: in both `wallet-390-dark.png` and `transactions-390-dark.png`
  "Transfer to Tunde Adebayo" takes two lines and the row grows past 110 logical px.
- **Severity:** P3, and **the code's reasoning is better than the image's**. The render's
  counterparty happens to be short. Recorded, not to be "fixed" by adding a truncation. The honest
  improvement is to shorten the row title: `walletWords` yields "Transfer sent" where the render
  says "Money Sent", and "Transfer to Tunde Adebayo" repeats the word the title already carried.
  Dropping the leading "Transfer to " from the counterparty line would fit one line at 390 in most
  cases.

### 3.3 The transaction glyph circle is larger than the render's

- **Image:** `6AF37222`. The circle measures 61 image px, about 36 logical.
- **What the code does:** `apps/web/src/app/css/wallet.css:353` to `:366` sets `.nf-tx-tile` at
  2.75rem (44px).
- **Severity:** P3, INFERRED from the CSS plus the proof (the proof's circle measures close to
  44).
- **Fix:** 2.25rem (36px) with the glyph at 18px. This also buys 8px of width for the wrapping
  counterparty in 3.2.

### 3.4 The "Completed" state ships emerald where the render ships cyan

- **Image:** `6AF37222`. Sampled directly: the "Completed" badge text is `rgb(23, 245, 242)`, the
  "+12.5% this week" is `rgb(2, 255, 255)`, the credit amount "+ ₦30,000.00" is `rgb(172, 251,
  252)`, and the outgoing arrow glyph is `rgb(0, 255, 250)`. Every one of those is CYAN, inside
  the blue family, not green.
- **What the code does:** `apps/web/src/components/app/wallet/EntryRow.tsx:80` paints a credit
  `var(--nf-state-success)`, which is `--nf-emerald-400: #10B981`
  (`packages/design-tokens/src/tokens.css:201` and `:784`), and
  `apps/web/src/components/ui/StatusPill.tsx:38` paints the badge from the same token. MEASURED ON
  PROOF: `wallet-390-dark.png` and `transactions-390-dark.png` both show a clearly green badge and
  a green credit amount.
- **Note:** `docs/design/CATALOGUE.md` records this as "Emerald Completed badges and +green
  amounts on-palette", which is a misreading of the image. The image is cyan.
- **Severity:** P2. It is the one warm-leaning hue on the money surfaces and the render
  deliberately keeps everything inside the blue family.
- **Fix:** this needs the founder's word, because it is a platform token and not a wallet
  decision. Two honest options. (a) Leave emerald: it is the platform's one success colour, it is
  used identically on bookings, verification and the admin queue, and changing it here alone would
  fork the status vocabulary `StatusPill` exists to unify. (b) Move `--nf-state-success` towards
  the render's cyan across the platform, which collides with `--nf-state-warning:
  var(--nf-cyan-400)` (`packages/design-tokens/src/tokens.css:785`), so pending and completed
  would become the same hue. Recommend (a), and record the deviation against `6AF37222` rather
  than leaving it undocumented, which is its current state.

### 3.5 The receipt draws four grey hairlines on a money surface

- **Surface:** `/wallet/transactions/[id]`.
- **Image:** none governs a receipt. It inherits the money register, whose rule is stated at
  `apps/web/src/app/css/wallet.css:13` to `:22`: no flat grey borders anywhere in the dark.
- **What the code does:** `apps/web/src/components/app/wallet/Receipt.tsx:96`, `:136`, `:167` and
  `:189` all use `border-[var(--nf-border-subtle)]`.
- **Severity:** P2.
- **Fix:** `--nf-divider` for the internal rules and `--nf-brand-edge` for the card-level
  separations, matching `.nf-tx-row + .nf-tx-row` at `wallet.css:338`.

### 3.6 The receipt and the transactions page are hard-coded English

- **Surface:** `/wallet/transactions`, `/wallet/transactions/[id]`.
- **Image:** none, but DESIGN_DIRECTION rule 4.3 applies and the rest of the family is fully
  localised.
- **What the code does:** `apps/web/src/app/(app)/wallet/transactions/page.tsx:31`, `:37`, `:38`,
  `:50`, `:51`, `:54` and `apps/web/src/components/app/wallet/Receipt.tsx:102`, `:116`, `:129` to
  `:132`, `:137` to `:152`, `:174`, `:195` to `:197` all write English literals, while
  `apps/web/src/app/(app)/wallet/page.tsx:48` and `.../send/page.tsx:40` read from the dictionary.
  The Receipt docstring at `:73` to `:75` even argues the opposite: "A receipt is the thing
  somebody forwards to a landlord, so it is the last surface that should be in a language they did
  not choose", and then hard-codes every label on it.
- **Severity:** P2. The comment states the rule and the code below it breaks the rule.
- **Fix:** move all of it into `packages/i18n/src/locales/*` under `wallet.receipt` and
  `wallet.transactions`, and translate.

### 3.7 The result sheets have no governing image and are the best-built thing in the family

- **Surface:** the payment pending, failed, sent, received and expired sheets.
  `docs/design/CATALOGUE.md` lists "payment pending/failed sheets" under "No reference at all".
- **What the code does:** `apps/web/src/components/app/ResultSheet.tsx` carries the register
  correctly: one glass mark on a lit disc, the verdict, the fact block with the amount at
  `clamp(2rem, 9vw, 2.75rem)` (`:264`, note it is a rung above the wallet's own hero clamp, which
  is itself evidence for finding 1.1), the consequence line made REQUIRED by the type system for
  `pending`, `review` and `failed` (`:110` to `:129`), and no glow on a failure for a stated
  reason (`:210` to `:218`).
- **One drift:** `:193` still reads "the render's capsule and its glow, scoped in
  `app/css/wallet.css`". There is no capsule any more; the rule that comment refers to was deleted
  at `wallet.css:589`. A stale comment pointing at a withdrawn ruling is how a shape law gets
  reopened by accident. **Severity P3, fix: delete the clause.**

---

## W-MONEY-4: `/settings/payments`

### 4.1 The block is a close match, and this should be said

- **Image:** `7F96BE6C`, the Payment Methods card at the foot.
- **What the image shows:** a glyph plate, the title, a sub-line, and a "+ Add" control across the
  top; then a card row (brand plate, masked number, the brand's word, a "Default" chip, a chevron)
  and a bank row (bank glyph tile, bank name, masked number and account type, a "Verified" chip in
  emerald, a chevron).
- **What the code does:** `apps/web/src/components/app/payments/PaymentMethodsPanel.tsx:112` to
  `:236` implements that anatomy row for row, and `apps/web/src/app/css/wallet.css:510` to `:575`
  paints it with the lit edge. The render's Verve logo becomes a brand-gradient plate carrying the
  brand's WORD (`.nf-pay-brand`, `wallet.css:560`), which is the correct translation: no
  third-party logo artwork is shipped.
- **Verdict:** matches. No P1 or P2 found.

### 4.2 Two P3 details

- The render's "Verified" badge is a SOLID emerald lozenge with white text; the code uses the
  tinted `StatusPill` at `PaymentMethodsPanel.tsx:221`. Consistency with the platform's one status
  vocabulary is worth more than the render's fill. Record, do not change.
- The render's bank sub-line is one line, "**** 2210 • Savings Account"; the code splits it over
  two at `PaymentMethodsPanel.tsx:216` to `:219` with a reason stated in the comment (a confirmed
  full name wraps at 390). The reasoning is sound. Record, do not change.

### 4.3 The page above the block uses the inline header

Covered by 2.1. `apps/web/src/app/(app)/settings/payments/page.tsx:46`. `7F96BE6C` is the stacked
page top with a 30px title and a lede, which is exactly what `PageHeader`'s `stacked` branch
draws.

---

## W-MONEY-5: systemic faults across the money family

### 5.1 Sixteen grey borders on the surfaces whose partial bans them

`apps/web/src/app/css/wallet.css:17` states the rule. These break it:

| File and line | What it is |
| --- | --- |
| `apps/web/src/components/app/wallet/Receipt.tsx:96` | receipt head rule |
| `apps/web/src/components/app/wallet/Receipt.tsx:136` | receipt facts rule |
| `apps/web/src/components/app/wallet/Receipt.tsx:167` | paid-for row rule |
| `apps/web/src/components/app/wallet/Receipt.tsx:189` | receipt foot rule |
| `apps/web/src/components/app/wallet/SendFlow.tsx:517` | bank row border |
| `apps/web/src/components/app/wallet/PotsSection.tsx:80` | pot card border |
| `apps/web/src/components/app/payments/AddBankAccountSheet.tsx:194` | notice border |
| `apps/web/src/app/(app)/wallet/WalletDeck.tsx:685` | fund sheet notice |
| `apps/web/src/app/(app)/wallet/WalletDeck.tsx:712` | withdraw sheet notice |
| `apps/web/src/app/(app)/wallet/loading.tsx:41` | skeleton dividers |
| `apps/web/src/app/(app)/wallet/receive/loading.tsx:44` | skeleton dividers |
| `apps/web/src/app/(app)/wallet/send/loading.tsx:32` | skeleton rule |
| `apps/web/src/app/(app)/settings/payments/loading.tsx:22` | skeleton rules |
| `apps/web/src/app/(app)/checkout/page.tsx:68` | checkout summary rule |
| `apps/web/src/app/(app)/checkout/page.tsx:96` | checkout line rule |
| `apps/web/src/app/(app)/checkout/[bookingId]/CheckoutSummary.tsx:29` | checkout summary rule |
| `apps/web/src/app/(app)/checkout/[bookingId]/CheckoutSummary.tsx:54` | checkout total rule |

**Severity:** P2 collectively. Each one is a dull grey hairline where every render in the family
draws a lit brand edge, and the skeleton ones are the first thing a person sees on a slow
connection. **Fix:** `--nf-divider` for anything inside a card, `--nf-brand-edge` for anything
that separates cards. One pass, seventeen lines.

### 5.2 Shape-law ratio risks in and around the money family

The shape law is a RATIO, not a token name (DESIGN_DIRECTION section 1.4, and BUILD_06_LEDGER
section 15.1). Every text-bearing control whose drawn radius reaches half its drawn short side is
a capsule however it was spelled. A source scan over every stylesheet, computing radius against
declared height or against font plus padding, produced these. Heights derived from padding are
INFERRED (font size times 1.3, plus twice the block padding) and marked.

| Rule | File and line | Radius | Height | Ratio | Note |
| --- | --- | --- | --- | --- | --- |
| `.nf-nav__badge` | `apps/web/src/app/side-nav.css:623` | 14px | ~18px (INFERRED) | **0.77** | comment claims "a rounded rectangle" |
| `.nf-badge-overlap` | `apps/web/src/app/css/chips.css:452` | 14px | ~24px (INFERRED) | **0.59** | carries a word |
| `.nf-detail-capsule` | `apps/web/src/app/css/catalogue.css:1405` | 14px | ~25px (INFERRED) | **0.56** | named "capsule"; also uses `--nf-border-subtle` |
| `.nf-nav__whocta` | `apps/web/src/app/side-nav.css:269` | 14px | ~27px (INFERRED) | **0.52** | comment at `:275` claims it is not a capsule |
| `.nf-pcard__note` | `apps/web/src/app/css/catalogue.css:322` | 10px | ~20px (INFERRED) | **0.51** | on a photograph |
| `.nf-switch` | `apps/web/src/app/settings-rows.css:329` | 14px | 30px | 0.47 | EXEMPT, a switch track is a shape |
| `.nf-segment__option` | `apps/web/src/app/settings-rows.css:397` | 14px | 32px | 0.44 | carries a word |
| `.nf-detail-tag` | `apps/web/src/app/css/catalogue.css:868` | 14px | 32px | 0.44 | carries a word |
| `.nf-trust__badge` | `apps/web/src/app/css/wallet.css:486` | 10px | ~24px (INFERRED) | **0.42** | in the wallet family |
| `.nf-chat-card__chip` | `apps/web/src/app/css/threads.css:695` | 10px | ~23px (measured in its own comment) | 0.43 | argued in the comment; the render draws straight sides |
| `.nf-feedtab` | `apps/web/src/app/css/chips.css:219` | 14px | 38px | 0.37 | the For You / Following segment |

The three that matter most:

- **`.nf-nav__whocta`** is the drawer's "View profile" control. Both the component docstring
  (`apps/web/src/components/app/AppRail.tsx:121`, "a 'View profile' glass capsule") and the
  ledger's own proof row for the drawer (`docs/BUILD_06_LEDGER.md` section 6, "View profile
  capsule") call it a capsule. The stylesheet comment at `side-nav.css:275` then asserts it is not
  one. At 5px of block padding on 13px type it draws about 27px tall against a 14px radius. **Fix:
  `--nf-radius-xs` (6px), ratio 0.22.**
- **`.nf-nav__badge`** at 0.77 is the unread count in the drawer. BUILD_06_LEDGER section 15.2
  ruled the count badge onto the control rung, correctly in principle; at 18px tall the control
  rung IS the capsule. **Fix: `--nf-radius-xs`, exactly as `.nf-badge` already does at
  `chips.css:350` for the same reason spelled out at `chips.css:318` to `:344`.**
- **`.nf-detail-capsule`** is the listing detail's spec chip and it is still named after the
  withdrawn ruling. **Fix: rename to `.nf-detail-spec` and move to `--nf-radius-xs`.**

None of these can be found by a grep, and `scripts/check-css-tokens.mjs` rule 10 passes all of
them, which is precisely the failure mode BUILD_06_LEDGER section 15.1 documents. Running
`scripts/design/compare-surface.mjs --shape-sweep` on `/wallet`, `/wallet/send`, `/listing/[id]`
and any route with the drawer open would confirm all eleven in a browser. I could not run it.

### 5.3 `size="sm"` on a chip does nothing

- `apps/web/src/components/ui/Chip.tsx:135` maps `sm` to `h-9` (36px).
- `apps/web/src/app/css/chips.css:85` sets `min-height: 44px` on `.nf-chip`.
- A `min-height` always clamps a `height` upward, so every `size="sm"` chip in the product paints
  at 44px. That includes the transactions filter row (`TransactionsSection.tsx:106`) and the send
  presets (`SendFlow.tsx:480`), both of which are smaller than 44px in their renders: the send
  presets in `95840448` measure about 40px.
- **Severity:** P3. **Fix:** make `HEIGHT` set `min-height` too, or drop the `sm` size and say the
  platform has one chip height. Do not leave a prop whose value the cascade ignores.

---

# PART TWO: THE FIVE GOVERNING IMAGES

## W-GOV-1: the landing hero (`GOVERNING-landing-desktop-hero.png`)

### 6.1 The breadcrumb says Restaurants where both the image and the law say Invest

- **Image:** "PROPERTY / STAYS / INVEST / MANAGE". `docs/DESIGN_DIRECTION.md` section 2 repeats it
  verbatim.
- **What the code does:** `packages/i18n/src/locales/en.ts:393` ships `["Property", "Stays",
  "Restaurants", "Manage"]`, with a comment at `:389` to `:392` explaining that Vallo sells no
  investment product and the landing may not name a capability with no shipped surface.
- **Severity:** P3, and **the code is right**. This is the content truth sweep doing its job
  (DESIGN_DIRECTION rule 1.3, honest data). It is recorded here because it is a visible difference
  from a governing image and a reader comparing the two will spot it. The fix is to the LAW, not
  the code: `docs/DESIGN_DIRECTION.md` section 2 should be amended to say Invest was replaced.

### 6.2 The city chips match; the comment about them does not

- **Image:** four chips, each carrying its OWN pin glyph, measured at about 31 logical px tall
  with a radius of roughly 10, so a ratio near 0.33. They are rounded rectangles, not capsules.
  The founder's ruling recorded in DESIGN_DIRECTION section 1.4, "not one capsule in that image",
  is correct when measured.
- **What the code does:** `apps/web/src/app/css/landing.css:625` to `:643` gives
  `.nf-landing-city` `--nf-radius-control` (14px) on a 44px min-height, a ratio of 0.32. Correct.
- **The drift:** `landing.css:624` still reads "City chips: capsules, per ledger section 8". That
  is the withdrawn amendment, named as the authority for a value it does not describe. **Severity
  P3. Fix: rewrite the comment to cite the ruling of 19 September and the measured ratio.**
- **The pin:** `apps/web/src/components/site/landing/Hero.tsx:86` to `:93` moves the pin onto a
  shared "Popular Cities" label rather than into each chip, and the comment claims "The render
  puts the pin on the LABEL". The UUID hero render does NOT: it puts a pin in every chip and has
  no label. `founder/landing-fullpage-target.png` DOES show a "Popular Cities" label with plain
  chips. **The code is right and the comment cites the wrong image. Severity P3. Fix: correct the
  comment to cite the founder target.**

### 6.3 The ten-tile feature grid is gone, and that is correct

Covered in section 1. `packages/i18n/src/locales/en.ts:435` to `:439` records the removal;
`founder/landing-fullpage-target.png` shows a six-cell chip row in its place, which is what
`apps/web/src/components/site/landing/FeatureChips.tsx:22` to `:29` ships. **No drift. The stale
party is `docs/DESIGN_DIRECTION.md` section 2.**

### 6.4 Section order matches the founder target exactly

`apps/web/src/components/site/landing/LandingBody.tsx:79` to `:85` renders Hero, FeatureChips,
CommunityBand, HowVallo, CategoryGrid, StaysBand, AppBand. `founder/landing-fullpage-target.png`
reads, top to bottom: hero, six-cell chip row, "A growing community" band with stats and layered
listing cards, "HOW VALLO WORKS / Simple Steps. Big Possibilities." with four steps, "EXPLORE BY
CATEGORY / Find exactly what you're looking for" with photo tiles, the Stays band, "Take VALLO
with you" with store badges, footer with a newsletter field. **Match. No drift.**

### 6.5 One copy difference worth a founder call

The founder target sets the community band's overline as "TRUSTED BY THOUSANDS".
`packages/i18n/src/locales/en.ts:466` ships "Real people. Real places." **Severity P3.** The
replacement avoids a count claim the platform cannot yet stand behind, which is the honest-data
rule, so it is probably right; it is recorded because it is a visible difference from a target the
founder himself supplied.

## W-GOV-2: the feed and the plus bloom (`GOVERNING-feed-plus-bloom.png`)

### 6.6 The bloom is the best-matched surface in the product

Stated plainly because it is unusual in this survey.
`apps/web/src/components/social/bloom/physics.ts:79` to `:83` carries slot offsets that were
measured off the render and remeasured after the first screenshot, with the remeasurement
documented at `:66` to `:72`. Checking them against the image: the FAB centre sits at about image
(793, 1300), the Review lozenge at (790, 1207), Story at (738, 1146), Post at (683, 1090), which
converts to offsets of roughly (-2, -55), (-32, -91) and (-65, -124) logical. The shipped slots
are (-12, -58), (-40, -100), (-72, -140). Close, and the tilts (-6, -12, -18 degrees) match the
image's rising labels. The lozenge size, 104 x 40 at
`apps/web/src/components/social/bloom/physics.ts:86`, matches the remeasurement note. The FAB is
60px at `apps/web/src/app/social-feed.css:3312`; the render's measures about 62. **No P1 or P2.**

### 6.7 Two bloom details

- **The lozenge glyph has no ring.** The image draws each glyph inside a small circle at the
  lozenge's leading edge. `apps/web/src/components/social/bloom/CreateBloom.tsx` renders a bare
  `UiIcon` with an 8px gap (`social-feed.css:3383`). **Severity P3. Fix: a 22px circular plate in
  `--nf-brand-tint-2` before the word.**
- **The lozenge is at ratio 0.35.** `social-feed.css:3391` sets `--nf-radius-control` (14px) on
  `block-size: 40px`. That lands exactly on the "looked at on the running page rather than in the
  file" threshold DESIGN_DIRECTION section 1.4 names. The image draws them as true capsules, which
  rule 3 says to translate. **Severity P3, INFERRED. Fix: verify with `--shape-sweep`; if it reads
  as a capsule, drop to `--nf-radius-sm` (10px, ratio 0.25).**

### 6.8 The dock's active pill, and the images disagree with each other

- `GOVERNING-feed-plus-bloom.png` and `founder/GOVERNING-home-markets-target.png` both draw NO
  plate behind the active destination: the bar is one even sheet and the active slot is a lit
  glyph and a lit label.
- `7F96BE6C` (settings) DOES draw a filled brand rounded-rectangle behind Profile.
- The code (`apps/web/src/app/css/chrome.css`, `.nf-tabbar__pill`) draws a travelling pill, and
  the comment there resolves the conflict explicitly, citing both images and keeping the pill
  because it is the only thing in the dock that moves. The ledger's proof row for the dock says
  "active slot on a soft brand pill with a glow".
- **Severity:** P3, and it needs the founder's word rather than a fix. Two named governing images
  say no plate; one render says plate. Recorded so the decision is visible rather than buried in a
  stylesheet comment.

## W-GOV-3: the chat booking card (`GOVERNING-chat-booking-card.png`)

### 6.9 The card matches, with three P3s

`apps/web/src/components/app/messages/ChatCard.tsx:198` to `:283` builds the render's anatomy in
order: photo with the status badge on it, name, blue stars, pin and place, the three-column
check-in / check-out / guests grid with vertical hairlines (`apps/web/src/app/css/threads.css:582`
to `:597`), the room row with a thumbnail and a nights chip, then the primary and the glass
action. The stars are blue by rule 8 (`threads.css:571`, `--nf-rating: var(--nf-brand-quiet)` at
`packages/design-tokens/src/tokens.css:788`), where the render's stars are already blue anyway.

- **Photo aspect.** `threads.css:511` sets `3 / 1`. The render's photo measures 527 x 144 image
  px, which is about 3.66 : 1. **P3, INFERRED. Fix: `aspect-ratio: 11 / 3`.**
- **"Contact hotel" glyph.** The render draws a PHONE glyph; `ChatCard.tsx:271` draws
  `chat-bubble` and says "Contact host". The word is right (it opens a thread, not a call) and the
  glyph should follow the word. **No fix, record.**
- **The nights chip.** `.nf-chat-card__chip` at `threads.css:695` sits at a ratio of about 0.43 by
  its own comment's measurement. The render's "3 Nights" chip has a visible straight side. **P3.
  Fix: verify in a browser; `--nf-radius-xs` if it reads as a lozenge.**

### 6.10 The forwarding foot is an addition, and a correct one

`ChatCard.tsx:187` to `:192` and `:275` to `:280` add a "Listing on Vallo / Forward" foot the
render does not have. DESIGN_DIRECTION section 2 requires it: "Cards in chat are REAL and
FORWARDABLE". **No drift.**

## W-GOV-4: the flip mid-turn (`GOVERNING-flip-mid-turn.png`)

### 6.11 The incoming face carries more than the render's mark alone

- **Image:** the turning pane's incoming face carries the glass building mark ALONE, centred, with
  a bright edge and a bloom, over the dimmed home.
- **What the code does:** the ledger's own proof row admits it: "The name, brand line and
  miniature stay beneath the mark for the first-flip ceremony and the wait; the render has the
  mark alone."
- **Severity:** P2, self-declared and never closed.
- **Fix:** founder's call. The argument for keeping them (a first-flip ceremony needs words) is
  reasonable; the argument for the render is that the flip happens dozens of times after the
  first. Recommend: mark alone on every flip after the first, name and line on the first only.

## W-GOV-5: the landing fullpage (`GOVERNING-landing-desktop-fullpage.png`)

Superseded by `founder/landing-fullpage-target.png`, which the code follows. See 6.3 and 6.4. **No
drift found.**

---

# PART THREE: THE OTHER CATALOGUED SURFACES

These were checked at the level of "does the shipped anatomy match the image's anatomy", by
reading the component and the stylesheet against the image. They were not measured in the detail
the wallet family was. Where a surface is listed as matching, that is a statement about anatomy,
not a pixel claim.

| Surface | Image | Verdict |
| --- | --- | --- |
| Chrome header | founder ruling 3.2, `GOVERNING-feed-plus-bloom.png` | Matches, with the hamburger added by ruling. `AppShell.tsx:256` to `:270`. |
| Dock | `founder/GOVERNING-home-markets-target.png`, `6AF37222`, `7F96BE6C` | Five slots by ruling where the renders show four. Radius resolved to `--nf-radius-xl` on a 66px bar (`chrome.css:335`) after the 2xl capsule fault. Correct. The active pill needs a founder call, see 6.8. |
| Side drawer | `BCD39CA8` | Matches: user block, glyph rail, badge counts, WORKSPACE section, flip coin, theme row. Two faults: `.nf-nav__whocta` at ratio 0.52 (5.2), `.nf-nav__badge` at 0.77 (5.2). |
| Sign in | `55A56F21` | Matches per the ledger proof row and the code. Not re-derived here. |
| Welcome, first run | `2A49E2F7` | The image's capsule "Get Started" was correctly squared: `apps/web/src/app/css/auth.css:765` uses `--nf-radius-control` on a full-width button. The image's "HOTEL"-lettered icon was correctly not used, see 8.2. The LEDGER's proof row still says "capsule Get Started", which is now false. **P3, fix the ledger.** |
| Search and filters | `3EB3E2A9`, `founder/GOVERNING-search-filters-target.png` | Ledger proof row claims a match on the sheet anatomy. Not re-derived. |
| Listing detail | `0D3D34D2`, `7B5335E0`, `9E8B56ED`, `B047A0CE` | `.nf-detail-capsule` at ratio 0.56 and carrying `--nf-border-subtle` (`catalogue.css:1405`). `.nf-detail-tag` at 0.44 (`catalogue.css:868`). Both P3. |
| Stays home | `FD3DFE84` | Ledger proof row claims a match. Not re-derived. |
| Stay detail | `84054CE9`, `BB0C2C85` | Both renders carry gold stars; the product ships `--nf-rating: var(--nf-brand-quiet)`, so the leak did not happen. See 8.1. |
| Trips and bookings | none | Register inherited per the ledger proof row. |
| Restaurants | none (category tile plus photo plates only) | No governing image. See part four. |
| Checkout | none | Four grey borders on a money surface, listed in 5.1. |
| Crypto | `213F6F47` (off-brief) | `apps/web/src/app/css/crypto.css:6` to `:8` states the render's gold, orange and flame are ignored. Verified: no warm literal anywhere in the partial. See 8.1. |
| Profile | `50E032EA` | Not re-derived. |
| Notifications | none | Register inherited per the ledger proof row. |
| Settings | `7F96BE6C` | Payments block matches (4.1). The page top uses the inline header where the image is stacked (2.1, 4.3). |
| Messages, three faces | `9E06F51C`, `GOVERNING-chat-booking-card.png`, `founder/GOVERNING-thread-*.jpg` | ChatCard matches (6.9). The BookingFace timeline (`apps/web/src/components/app/threads/BookingFace.tsx`) is an addition with no image behind it; its docstring argues correctly that the render draws nothing between header and first bubble, so it ships folded. |
| Inspections | `F6A8A482` | Not re-derived. `.nf-insp-notes__body` flagged at ratio 0.41 in 5.2. |
| Host wizard | none | See part four. |
| Agent console | none | See part four. |
| Admin queue | `278CC66A`, `CDA4B82B` | The status palette was matched and `.nf-badge` was brought down to `--nf-radius-xs` (`chips.css:350`) citing `278CC66A` explicitly, which is the right kind of reasoning. |

---

# PART FOUR: SURFACES WITH NO GOVERNING IMAGE

The rule is DESIGN_DIRECTION section 1.5: a page the images do not cover is designed in the same
language, same glass, same glow, same card anatomy, same rhythm. Checked against that, these are
the ones that visibly do not inherit:

### 7.1 Checkout

`apps/web/src/app/(app)/checkout/page.tsx:68`, `:96` and
`apps/web/src/app/(app)/checkout/[bookingId]/CheckoutSummary.tsx:29`, `:54` draw grey
`--nf-border-subtle` rules on a money surface, where every other money surface draws the lit brand
edge. It is a money screen that does not look like the money family. **P2. Fix with 5.1.**

### 7.2 The wallet loading skeletons

`apps/web/src/app/(app)/wallet/loading.tsx:41`, `.../receive/loading.tsx:44`,
`.../send/loading.tsx:32` and `.../settings/payments/loading.tsx:22` all use grey dividers, so the
first paint of every money screen is in a different register from the screen it becomes. **P2. Fix
with 5.1.**

### 7.3 The receive screen's missing QR

Covered in 2.4 and 2.11. The register is inherited correctly; the affordance the send render
implies has no counterpart. **P3 as design, P2 as product.**

### 7.4 The transactions statement

Covered in 3.1. One image draws a transaction list and the statement does not inherit its anatomy.
**P2.**

### 7.5 Everything else

The host wizard, agent console, stories, help, verification, post threads, edit profile, sign-up
and notifications were not opened line by line in this pass.
`apps/web/src/app/agent/list/ListingWizard.tsx:320` and `:329` draw a switch track and knob with
`rounded-full`, which the shape law exempts by name, so that is correct. No other inheritance
fault was found by the cross-cutting scans in 5.1 and 5.2. **Not a clean bill of health: they were
sampled, not surveyed.**

---

# PART FIVE: OFF-BRAND LEAKS, AND THE ONES THAT DID NOT HAPPEN

The catalogue's section 2 names six kinds of off-brand detail that must be translated rather than
copied. Each was checked.

### 8.1 Warm hues and gold: NO LEAK

- `--nf-rating: var(--nf-brand-quiet)` at `packages/design-tokens/src/tokens.css:788`, so every
  rating star in the product ships blue, against the gold stars in `84054CE9`, `BB0C2C85`,
  `B047A0CE`, `9E8B56ED`, `FD3DFE84`, `2C23179E` and `531C7B61`.
- A regex sweep for warm hex literals and the words gold, amber and orange across every stylesheet
  in `apps/web/src/app/css/` returns four hits, and all four are comments saying the warm thing
  was NOT copied: `catalogue.css:1374`, `crypto.css:7`, `landing.css:1479`, `symbols.css:165`.
- No `--nf-amber-*`, `--nf-gold-*` or `--nf-orange-*` token exists.
- **Clean.**

### 8.2 The HOTEL-lettered icon: NO LEAK

The lettered glyph appears in `2A49E2F7`, `2AA604D7`, `BE1093DD` and in
`founder/GOVERNING-home-markets-target.png`. Every hotel asset the product ships was opened as an
image: `apps/web/public/brand/glass/hotel.png`, `hotel-bed.png`, `hotel-room.png`,
`hotel-star.png`, `stays-hotel-palms.png`, and `apps/web/public/brand/icons/hotel.png`,
`hotel-star.png`. None carries a letter. `hotel-star.png` draws a five-star SIGN with no lettering
on it, which is the right translation. **Clean.**

### 8.3 Capsule controls: MOSTLY CLEAN, eleven ratio risks

Every `--nf-radius-pill` use in a stylesheet was opened. All are documented exemptions and all of
them are correct: the welcome dot (`auth.css:733`), the button loading sweep (`buttons.css:787`),
the sheet grip (`catalogue.css:594`, `overlays.css:281`), the standing-tab rule
(`catalogue.css:1096`), the host avatar (`catalogue.css:1448`), the dock's icon island
(`chrome.css:441`), the range track (`controls.css:33`) and the nav underline (`landing.css:166`).
Every `rounded-full` in product TSX is a dot, a progress bar, an avatar, a verified badge or a
switch knob.

The leak is not in the token names, it is in the ratios, and section 5.2 lists eleven. Three are
genuine capsules carrying words. **P2 collectively.**

### 8.4 Garbled render text: NO LEAK

"Verfieum", "Lagoe Lagos", "ibadro Ibadan", "Learn Mores" appear nowhere in the repository. All
landing copy comes from `packages/i18n/src/locales/en.ts` and reads as real English. **Clean.**

### 8.5 Third-party brands: CORRECTLY HANDLED

- "Radisson Blu" from `FD3DFE84` appears nowhere in the product.
- "Verve" and "Access Bank" from `7F96BE6C` are payment brands in a payment context, which the
  catalogue permits, and the code ships the brand's WORD on a house plate rather than logo artwork
  (`apps/web/src/app/css/wallet.css:558` to `:575`), which is a better translation than the
  catalogue asked for.
- The Google mark on sign in is monochrome, recorded in the ledger's own proof row. **Clean.**

### 8.6 The B047A0CE logic error: NOT COPIED

`B047A0CE` pairs a yearly rental price with nightly check-in and check-out pickers. No shipped
surface does this; the market decides the panel, as the DESIGN_DIRECTION rule 1.3 requires.
**Clean.**

---

# PART SIX: WHERE THE CODE IS BETTER THAN THE IMAGE

The catalogue records that some renders carry mistakes. These are the places where a literal
reading of an image would make the product worse, and they are listed so a future worker does not
"correct" them.

1. **Type scale.** `6AF37222` sets its section heads at roughly 14px and its row subs at roughly
   11px on a 390px screen. `TYPE.sectionTitle` is 19px and `TYPE.rowMeta` is 14px
   (`apps/web/src/components/app/Screen.tsx:113`, `:121`). The render's sizes are below what is
   comfortable on a real phone and the reasoning at `Screen.tsx:86` to `:98` is sound: hierarchy
   carried by type rather than by borders. **Do not shrink the platform scale to the render.** The
   wallet balance figure (1.1) is the exception and goes the other way, because a hero number is
   not body copy.
2. **The send page's live amount and balance-after pair.** `SendFlow.tsx:450` to `:457` and `:491`
   to `:508` show the amount growing as it is typed and what the balance will be afterwards.
   `95840448` shows neither. A person about to move money should see the consequence before the
   confirm step. **Keep.**
3. **The wrapped counterparty in a transaction row.** `EntryRow.tsx:59` to `:66`. The render's
   counterparty fits; a real one often does not, and "Transfer to Tunde ..." destroys the one fact
   the row exists to carry. **Keep the wrap; shorten the string instead (3.2).**
4. **The forwardable chat card foot.** `ChatCard.tsx:187`. Required by DESIGN_DIRECTION section 2
   and absent from the render. **Keep.**
5. **The five-slot dock and the hamburger.** Founder rulings 3.1 and 3.2 against four-slot renders
   with no hamburger. **Keep.**
6. **Honest labels over render labels.** The balance card's fourth tile says "Crypto" and goes to
   the crypto surface where the render says "Swap", and the quick actions say Withdraw and
   Statement where the render says Buy Airtime and Pay Bills (`WalletDeck.tsx:45` to `:58`, `:266`
   to `:271`, `:281` to `:299`). Neither airtime nor bills nor swap exists. **Keep, and this is
   exactly the right instinct.**
7. **Real counts over invented ones.** The landing's stats read live. The founder target's "10K+ /
   5K+ / 200+" are render numbers. **Keep the live reads.**
8. **The status pill's non-colour mark.** `StatusPill.tsx:137` to `:150` gives six
   greyscale-separable shapes where the renders separate by hue alone. The render's Completed
   badge has no mark at all. **Keep the mark.**
9. **The failure sheet's missing glow.** `ResultSheet.tsx:210` to `:218`: rose at 26 per cent
   blurred over navy composites to magenta, a banned hue. No render covers this state. **Keep.**

---

# PART SEVEN: LEDGER CLAIMS THAT DO NOT HOLD

`docs/BUILD_06_LEDGER.md` is the previous session's own record. Treated as claims, these are the
ones this survey contradicts.

| Claim | Where | What is actually true |
| --- | --- | --- |
| "a scope closes only with its row here" | section 6 preamble | The money family has no row. Thirteen shots exist in `docs/design/proofs/e/` with no verdict written against any governing image. |
| Welcome proof row: "capsule Get Started" | section 6 | It is squared: `auth.css:765`, `--nf-radius-control` on a full-width button. The proof text describes a state that no longer ships. |
| Drawer proof row: "View profile capsule" | section 6 | Accurate as a description and a shape-law breach: ratio about 0.52 (5.2). The row records the fault without naming it as one. |
| Flip proof row: "the render has the mark alone" | section 6 | Correct, and the deviation was recorded and never closed (6.11). |
| `wallet.css:101`, "The hero figure is 2.6rem" | stylesheet | It is 2.09rem at 390px (1.1). |
| `money.ts:8`, "the naira at 2.6rem and the kobo at 1.4rem" | component | Same. The kobo ratio is right; the naira is not. |
| `TrustStrip.tsx:19` to `:20`, "The badge drops to its own line beside the words, which is where the send render puts it" | component | `77A54EA3` puts BOTH badges ("NDIC INSURED" and "256 BIT ENCRYPTION") on the SAME line as the words, to their right. The layout chosen is defensible at 390px; the claim about the render is wrong. **P3, fix the comment.** |
| `side-nav.css:275`, "this carries text, so it is a rounded rectangle" | stylesheet | At 14px radius on about 27px of height it is a capsule (5.2). |
| `Hero.tsx:86`, "The render puts the pin on the LABEL" | component | `GOVERNING-landing-desktop-hero.png` puts a pin in every chip and has no label. The founder target does what the code does. **Correct behaviour, wrong citation.** |
| `landing.css:624`, "City chips: capsules, per ledger section 8" | stylesheet | Section 8's amendment is withdrawn at its root by DESIGN_DIRECTION section 1.4, and the shipped value is `--nf-radius-control`, not a capsule. |
| `ResultSheet.tsx:193`, "the render's capsule and its glow, scoped in `app/css/wallet.css`" | component | That rule was deleted; `wallet.css:589` records its deletion. |
| `CATALOGUE.md` preamble, "66 PNGs" | catalogue | 66 in the top level, plus twelve in `references/founder/`, four of them named GOVERNING (section 1). |
| `CATALOGUE.md` section 2, "Emerald Completed badges and +green amounts on-palette" | catalogue | Sampled from the image, both are cyan (3.4). |
| `CATALOGUE.md` section 2, "city chips in the governing hero" listed as capsules | catalogue | Measured at a ratio near 0.33. They are rounded rectangles. The founder's ruling was right and the catalogue's reading was wrong. |

---

# PART EIGHT: THE WORK, GROUPED FOR PICK-UP

Each block is independent. A build session can take one and go.

## Block A: the wallet's proportions (P1, highest value, one file plus three props)

1. `apps/web/src/app/css/wallet.css:74` figure clamp to `clamp(2.4rem, 10.3vw, 2.75rem)`.
2. `apps/web/src/app/css/wallet.css:135` tile `min-height` to `3.75rem`.
3. `apps/web/src/app/css/wallet.css:239` quick card `min-height` to `5.25rem`; `:248` title to
   `--nf-text-overline`; `:264` plate to `1.875rem`; shorten `en.ts:2487` and `:2489`.
4. `apps/web/src/app/(app)/wallet/page.tsx:72` remove the second header row.
5. `apps/web/src/app/css/wallet.css:56` object to `7rem` on the phone.
6. Correct the comments at `wallet.css:101` and `money.ts:8`.

## Block B: the money page tops (P1, four one-word changes)

`layout="stacked"` at `wallet/send/page.tsx:44`, `wallet/receive/page.tsx:44`,
`wallet/transactions/page.tsx:31`, `settings/payments/page.tsx:46`, then move the glass object out
of `actions` and float it (2.1, 2.2).

## Block C: the money family's edges (P2, seventeen lines)

The table in 5.1.

## Block D: the statement (P2)

One card for the whole list (3.1), smaller glyph circle (3.3), shorter counterparty string (3.2),
localise (3.6).

## Block E: the send details (P2 and P3)

Scan affordance decision (2.4), balance-strip plate (2.3), Continue glyph (2.7), trailing naira
(2.8), amount sub-line (2.9).

## Block F: the shape ratios (P2, needs a browser)

Run `scripts/design/compare-surface.mjs --shape-sweep` on `/wallet`, `/wallet/send`,
`/wallet/transactions`, `/listing/[id]`, `/settings`, `/feed` and any route with the drawer open.
Close the eleven in 5.2, starting with `.nf-nav__whocta`, `.nf-nav__badge` and
`.nf-detail-capsule`. Fix `Chip.tsx:135` while there (5.3).

## Block G: the documents (P2, no product code)

Extend `CATALOGUE.md` with `founder/` and state the supersession (section 1). Correct
`DESIGN_DIRECTION.md` section 2 on the feature grid and the breadcrumb. Add the missing money rows
to `BUILD_06_LEDGER.md` section 6, or mark the family as unclosed. Fix the stale comments listed
in part seven.

## Block H: founder calls needed

1. Emerald or cyan for Completed and for a credit amount (3.4).
2. The dock's travelling pill: two governing images say no plate, one render says plate (6.8).
3. The flip's incoming face: mark alone, or mark with name and line (6.11).
4. Whether the QR pair gets built or the omission gets recorded (2.4).

---

# HONESTY LOG

## Images I actually opened

Full-size, with my own eyes, for this survey:

1. `docs/design/references/6AF37222-1D2E-4200-AB23-E55A24AE5E4F.png` (wallet home), plus two 2x
   crops of its top and its transaction card, plus nine programmatic pixel measurements and four
   colour samples.
2. `docs/design/references/95840448-AEBA-4671-9CAA-9B77B6A5D383.png` (send money), plus seven
   programmatic measurements.
3. `docs/design/references/77A54EA3-BBB5-4BF4-B3A5-144C99CABAF7.png` (send money variant, trust
   strip).
4. `docs/design/references/7F96BE6C-BF8C-4413-BD58-25531B27D549.png` (settings and payments).
5. `docs/design/references/GOVERNING-feed-plus-bloom.png`.
6. `docs/design/references/GOVERNING-chat-booking-card.png`.
7. `docs/design/references/GOVERNING-flip-mid-turn.png`.
8. `docs/design/references/GOVERNING-landing-desktop-hero.png`, plus a 3x crop of the CTA and
   city-chip band.
9. `docs/design/references/founder/landing-fullpage-target.png` (downscaled to 900px tall; legible
   for structure and section order, not for type sizes).
10. `docs/design/references/founder/GOVERNING-home-markets-target.png`.

Shipped screenshots opened and measured:

11. `docs/design/proofs/e/wallet-390-dark.png`, with five programmatic measurements.
12. `docs/design/proofs/e/send-390-dark.png`.
13. `docs/design/proofs/e/transactions-390-dark.png`.

Product assets opened as images:

14. A contact sheet of all seven shipped hotel icons from `apps/web/public/brand/glass/` and
    `apps/web/public/brand/icons/`.

## Images I did NOT open

`GOVERNING-landing-desktop-fullpage.png` was not opened; I relied on
`founder/landing-fullpage-target.png`, which supersedes it, and on the catalogue's description.
`founder/GOVERNING-home-markets-target-2.jpg`, `founder/GOVERNING-search-filters-target.png`,
`founder/GOVERNING-thread-hotel-booking.jpg` and `founder/GOVERNING-thread-rental-enquiry.jpg`
were prepared for reading and then not read, for budget. The five "as-shipped" founder complaint
images in that folder were not opened. None of the 20 photography plates or the abstract
background was opened; they carry no UI.

Of the 61 UUID references, I opened four: the three wallet and money images and the settings
image. The other 57 were not opened, including `50E032EA` (profile), `BCD39CA8` (side drawer),
`3EB3E2A9` (search filters), `BE1093DD` (explore markets), `FD3DFE84` (stays home), `84054CE9` and
`BB0C2C85` (stay detail), the four listing-detail variants, `9F384CFE` (move-in ledger),
`9E06F51C` (rental thread), `BF49B814` (AI assistant), `F6A8A482` (inspections), `55A56F21` (sign
in), `2A49E2F7` (welcome), `278CC66A` and `CDA4B82B` (admin), `1A655910` (feed variant),
`213F6F47` (off-brief crypto), `531C7B61` and `2C23179E` (landing variants) and `2AA604D7` (Stays
brand plate). Part three's verdicts on those surfaces rest on the catalogue's descriptions, on the
shipped code and stylesheets, and on the ledger's own proof rows. **They are not image comparisons
and must not be read as if they were.** If the founder wants those surfaces surveyed to the same
depth as the wallet, that is a second pass of comparable size.

## What I could not check at all

- Anything that depends on what the browser draws rather than what the file says. The eleven shape
  ratios in 5.2 are computed from source and are marked INFERRED where the height comes from
  padding. They need `scripts/design/compare-surface.mjs --shape-sweep`.
- The light theme. Every measurement here is dark. The money partial's light twin at
  `wallet.css:668` to `:713` was read and looks structurally correct, but
  `docs/design/proofs/e/wallet-390-light.png` was not opened.
- Desktop. Every measurement is at 390px.
- Motion, focus order, live regions, reduced motion. Not surveyed.
- Whether any of this compiles. I ran no build, no type check and no test, and I changed no
  product code.

## Confidence

- Part one findings 1.1, 1.2, 1.3, 1.4, 2.1, 3.1: **high.** Measured on the shipped screenshots
  against measured image pixels.
- Part one findings 1.6, 2.2, 2.3, 3.3, 3.4: **high on the code, medium on the image
  measurement**, because AI renders are not drawn to a grid and my 1.70 scale factor is derived
  from one edge detection.
- Part five (off-brand leaks): **high.** These were exhaustive greps and direct image opens, not
  samples.
- Part three: **low to medium.** Anatomy read from code against catalogue prose, not against
  images.
- Part six and part seven: **high.** Both are quotations checked against values.

## One thing I want on the record

The wallet is not badly built. Every control on it moves real money, the empty and unreadable
states are distinguished with care, the kobo arithmetic is integer throughout, and the reasoning
written into `wallet.css` is, in most places, correct about what the render shows. The failure is
narrower and more mundane than "it does not look like the files": four numbers are wrong, one
header row is extra, and nobody ever put the shipped screenshot next to the render and wrote a
verdict, because the table that would have forced them to has no row for this family. Closing
block A and block B would move the wallet most of the way, and closing block G would stop it
happening again.
