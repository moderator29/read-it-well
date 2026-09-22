# Session B build ledger

Session B's own record. The other session's ledger is `docs/BUILD_07_LEDGER.md`
and Session B does not write in it. Scope: `docs/SESSION_B_SCOPE.md`.

Every surface gets three sections before it can be called finished:
1. **The chain**: control, server action, validation, policy, table, trigger,
   notification, query, screen. Every broken link named.
2. **The comparison**: the governing image against the built page at 390px dark,
   property by property, with measured numbers.
3. **Light mode**: the same surface on paper, checked.

## 1. Profile

(pending)

## 2. Get started

(pending)

## 3. Welcome back

(pending)

## 4. Wallet

(pending)

## 5. Send money

(pending)

## 6. Admin shell, overview, operations, analytics

(pending)

## 7. Admin review desks: listings queue, listing under review, moderation, verification

(pending)

## 8. Admin money desks: money, escrow, supply

Worker admin-money. Governing images: panel 3 of `C1D98B3C` (Money), panels 1
and 3 of `8E9602E2` (Escrow, Supply). Routes `/admin/money`, `/admin/escrow`,
`/admin/supply` (new). `/admin/bookings` and `/admin/payments` keep their
behaviour and wear the shell's register; they were not restyled beyond it.

Files: `app/admin/money/{page,MoneyDesk,MoneyRows}.tsx`,
`app/admin/money/_desk/{Desk,charts,ChartReadout,Reconciliation}.tsx` and
`desk.css`, `app/admin/escrow/{page,EscrowDesk}.tsx`,
`app/admin/supply/{page,SupplyDesk,loading}.tsx`, and the reads
`lib/admin/reads/{money,escrow,supply,money-derive,money-types}.ts` with
`money.test.ts`, `escrow.test.ts`, `supply.test.ts`, `money-derive.test.ts`
(40 tests). Handbook: `docs/ADMIN_CONSOLE.md` sections 8 to 12, and the money
desks' parts of 16, 17 and 18.

### 8.1 The chain, per desk

**Money.**
- Screen: `/admin/money` (server component, `force-dynamic`, `LiveRefresh`
  re-runs the reads every 60 seconds and on tab focus).
- Query: `getMoneyDesk` (`lib/admin/reads/money.ts`): `requireAdmin()` then the
  admin's RLS client, `readEvery` over `wallet_entries`, `wallets`, `escrows`,
  FAILED `transactions` of the last 14 days, the count checked against
  `count: "exact"`. `getReconciliationHealth`: every
  `wallet.reconciliation.run` row in `audit_log` in 7 days, plus the newest
  clean run and newest run of all time. Existing reads kept:
  `getMoneyConsole` (stuck debits, wallets), `getRefundConsole`,
  `getEscrowConsole({ status: "DISPUTED" })`.
- Policies (read live, `pg_policies`): `wallet_entries_select_admin`,
  `wallets_select_admin`, `escrows_select_admin`,
  `transactions_admin_select`, `audit_log_admin_select`,
  `profiles_select_admin`, all `private.has_role(auth.uid(), admin |
  super_admin)`. No policy was widened; no service role is used by the new
  reads.
- Writers of the rows it reads: the Paystack webhook and reconcile route
  (`wallet_entries`, `transactions`), `recordMoneyAudit` (the reconciliation
  audit rows, `app/api/paystack/reconcile/route.ts`), the escrow functions.
- Control: the dispute ruling (`EscrowRuling`, Session A's
  `_components/MoneyDecisions.tsx`), unchanged. Action `resolveEscrow`
  (`lib/admin/money-actions.ts`), zod validation (uuid, release | refund, note
  20 to 1000 chars), RPC `public.escrow_admin_resolve` (security definer,
  repeats the role check, refuses non-DISPUTED), `private.escrow_settle`,
  trigger `escrows_guard_transition` writes the audit row, notification
  `private.notify(payer | payee, 'wallet', ...)` with the ruling word for word,
  then `revalidatePath("/admin/escrow")`. Read from `pg_proc` source on 22
  September. The money page is `force-dynamic` and live-refreshed, so it shows
  the new state too.
- Broken links: `private.reconciliation_watch` (the job's last HTTP reply and
  verdict) is unreachable by any admin read; request 10 in the scope file asks
  for an admin-callable function. Nothing else is broken on this chain.

**Escrow.**
- Screen `/admin/escrow`, `LiveRefresh`. Query `getEscrowDesk`
  (`lib/admin/reads/escrow.ts`): every `escrows` row with `listings ( title )`
  once, count checked, pipeline by state and purpose, the seven transition
  timestamps into "recent activity", the float, every dispute unpaged, the
  narrowed numbered page; names from `profiles`. Policies
  `escrows_select_admin`, `listings_admin_all`, `profiles_select_admin`.
- Controls: the six pipeline tiles are links (`?status=`), the shared
  `QueueFilters` (search by property, status chips, date range), numbered
  pager (`?page=`), and the dispute ruling (chain as above).
- Broken links: none found. `escrows` holds zero rows today, so the ruling
  path was verified by reading code and function source, not by running it.

**Supply.**
- Screen `/admin/supply` (new route; admin-shell's rail already carries the
  Supply row), `LiveRefresh`. Query `getSupplyDesk`
  (`lib/admin/reads/supply.ts`): `agents`, `agent_applications (supply_role)`,
  `businesses`, `listings`, `accommodations`, released `escrows`,
  CONFIRMED and COMPLETED `bookings`, each read whole. Role resolution mirrors
  `lib/supply/workspaces-queries.ts` and `kindFromAgentType`. Policies
  `agents_select_admin`, `agent_applications_select_admin`,
  `businesses_admin_all`, `listings_admin_all`, `accommodations_admin_all`,
  `escrows_select_admin`, `bookings_admin_all`.
- Controls: role cards are links (`?role=`), the examples toggle
  (`?examples=1`), numbered pager. No writes.
- Demo rule (founder claims ruling R4): `is_demo` rows are excluded from every
  figure unless the operator asks, and the page prints how many were left
  out. On 22 September that is every supply row there is, so the live desk
  reads zero across the board and says why.

### 8.2 Measured comparison

Scale. Each render panel is a browser window 485 image px wide
(`C1D98B3C` panel 3: x 1033 to 1518; `8E9602E2` panels: 490 px). At the
brief's 1440 CSS px per window that is 2.97 CSS px per image px, and it puts
body text at about 36 CSS px and KPI cards at 252 CSS px tall, which is not a
console at 1440; the renders are zoomed. Type-consistent scale, from ledger
row text (cap height 6 image px against a 13 to 14 px body), is about 1.7. So
PROPORTIONS (grid fractions, aspect of cards, column shares) are taken from
the image, and SIZES follow the shell's measured type scale so every desk
reads alike. Colours sampled with `sample` over 3x3 boxes.

| Property | Image (measured) | Built (measured, 1440 dark) | Match |
|---|---|---|---|
| Page ground | `#000d2a` | shell canvas, same token as every desk | yes (shell's) |
| Card fill | `#00153e` to `#001646` | `--nf-admin-panel-fill` (shell) | yes |
| Card border | `#003c8a` to `#1085bc`, lit | `--nf-admin-panel-edge`, 1px | yes |
| Top rim | brighter hairline on top edge | inset 1px rim at 55% plus a centred catchlight `::before` | yes |
| Glow | soft blue outside each card | `--nf-admin-panel-glow` (0 0 22px, 22%) | yes |
| Card radius | 5 img px on 82 px cards (6%) | 14px on ~330px cards (4%), `--nf-radius-md` | close |
| KPI row | 4 equal cards, gap 7 img px | 4 equal, gap 16px | yes |
| KPI label | 10 img px wide cap, `#1085bc` blue | 13px 500, `--nf-brand-quiet` | yes |
| KPI figure | cap 12 img px, white bold | clamp 22 to 34px 700 display face | yes |
| Delta | green arrow, `+12%`, "vs last week" muted | emerald/rose arrow glyph, whole %, muted "vs ..." | yes |
| Money chart | full width, 2 series, smooth, filled, legend top right | full width, 2 series, monotone curves, filled, legend top right, dashed second series, hover readout | yes |
| Recon + summary | 54 : 46 split | 1.17fr : 1fr | yes |
| Recon ring | emerald ring, % centre, "Last successful run", Healthy badge | same; badge on the shape law | yes |
| Ledger columns | Date 17%, Description 31%, Type 12%, Amount 17%, Balance 23% | Date, Description (reference under it), Type, Amount, Balance | yes |
| Credit colour | `#1aba8d` emerald | `--nf-state-success` | yes |
| Pager | squares, active lit blue, 1 2 3 4 5 ... 12 | rounded squares 44px, active gradient + rim + bloom, same numbering | yes |
| Escrow pipeline | 6 cards with arrows | 6 linked cards with arrow glyphs | yes |
| Escrow table | photo thumb, id, amount, from to, purpose, days, countdown in emerald | line glyph plate (no photo in the read), same columns, emerald countdown | partly (no photo) |
| Float total | figure with short cyan rule | same | yes |
| Recon check | emerald check disc, Healthy, last run | same, centred | yes |
| Donuts | teal, mauve, pink slices | one blue ramp by lightness, word + share + count per slice | translated |
| Supply table | name, role, listings, tick, transacted, joined | same, tick carries the word Yes/No | yes |
| Supply growth | 4 lines, 4 hues | 4 lines on the blue ramp, dash patterns, direct labels | translated |
| Top areas | ranked bars | ranked bars | yes |
| Status badges | pill-ish chips | `StatusPill` rounded rectangle | shape law wins |

### 8.3 Refused from the render

- Every count, amount and percentage drawn in the three panels (₦842,500 float,
  548 escrows, 1,248 owners and the rest). The desks print only what the
  database returns.
- The render's off-palette donut slices (teal, mauve, pink) and the four-hue
  growth chart: research part four proved no four-slot palette passes our
  colour law; translated to the blue ramp plus words and dash patterns.
- Property photographs in the escrow rows: `escrows` has no photo and the read
  does not join one; a line glyph plate stands in.
- "Last successful run 98%" as a single figure: built as the share of runs in
  the last seven days, and the badge reports silence before the share.

### 8.4 Light mode

Checked at 1440 on all three desks (`docs/design/proofs/session-b/admin-money/`).
Cards take the shell's paper surface and edge; no glow; charts follow the
ramp tokens' light twins; the credit colour and badges take the daylight state
tokens from `2596ed9`. One defect found and fixed: the escrow row plate was a
dark glass object on paper; replaced with a line glyph.

### 8.5 Phone 390

One defect found and fixed: on the escrow desk the page grid's auto column
grew to the status chip row's min-content (1,007px measured) so everything
ran off the right edge. `.nf-md` now declares `minmax(0, 1fr)`. Tables become
self-naming rows below 768px; the pipeline is two columns; charts scale.

### 8.6 Measured built values, shape sweep and checks

Built, measured in the browser at 1440 dark (`getComputedStyle`): page title
26px 700 white; lede 14px `rgb(92 159 255)`; KPI card 284 x 122, radius 14px,
edge the shell's panel edge; KPI label 13px 500 `rgb(92 159 255)`; KPI figure
28.96px 700; delta 13px 600 `rgb(16 185 129)`; panel title 16px 600; table
head 13px 500 quiet blue; table row 65px (the render's rows are about 42px at
the type-consistent scale; ours carry the payment reference on a second line,
which the render omits and which support needs); pager items 44 x 44, radius
10px (ratio 0.23), the current one on the lit primary gradient with the
primary rim and bloom.

`node scripts/design/compare-surface.mjs --shape-sweep --theme both` over
`/preview/zz-am/{money,escrow,supply}?state=full` and
`/preview/zz-am/{money,supply}?state=live` at 390 and 1536:

```
BREACHES, a text-bearing control drawn as a capsule (ratio at or above 0.5): 0
WORTH AN EYE, text-bearing and over 0.35 but not yet a capsule: 45
ROUND ICON-ONLY CONTROLS, allowed only where a governing image draws them round: 0
no text-bearing control is a capsule.
```

All 45 "worth an eye" are the shell's (the "All desks" nav row at 0.39, the
bar's search input and the shared status chips at 0.35); none is on a money
desk's own control. `check-css-tokens.mjs`: clean. `tsc --noEmit`: clean (also
by `next build`). `eslint` on every changed file: clean. `vitest run
src/lib/admin/reads`: 40 passed.

### 8.7 Proofs

All desk screenshots come from an uncommitted harness at
`/preview/zz-am/{money,escrow,supply}` that renders the real desk components
inside admin-shell's real `AdminFrame` with FIXTURE props, because no admin
session exists on this box. Two fixture states: `live` mirrors the rows the
production database held on 22 September (read with SQL: one wallet, two
entries, no escrows, every supply row an example); `full` is invented data
used only to prove the layout against the render. The live wiring is proven by
the reads' code, the SQL introspection above and the 40 unit tests, not by a
signed-in screenshot.

### 8.8 Skipped or not verified

- No signed-in run of the real pages: no admin test user may be created.
- The escrow ruling was not exercised end to end (zero escrows exist).
- `private.reconciliation_watch` not surfaced (request 10).
- Bookings and payments were not restyled beyond the shell's register.
- The render's escrow row photographs.
- An incident during the work: once, before the coordinator's warning, this
  worker ran `git stash` and `git stash pop` in its worktree; the stash is
  shared across worktrees. The popped change set was this worker's own (the
  file list matched), but it is recorded here in case another worker lost
  work around 20:35.

## 9. Inspection

(pending)

## 10. The welcome email

Owner: Session B worker "email", design and words only. The send is Session
A's and was not touched.

### The chain as it stands

1. **Trigger.** A person confirms their address. Two paths do that, both in
   `apps/web/src/lib/auth/actions.ts` (Session A): the six digit code path
   (`verifyOtp({ type: "signup" })`, then `welcomeOnce(data.user.id)`) and the
   emailed link path (`exchangeCodeForSession` / `verifyOtp({ token_hash })` /
   `setSession`, then `welcomeOnce(confirmed.user.id)`).
2. **Guard.** `apps/web/src/lib/notify/welcome.ts` `welcomeOnce` (Session A):
   refuses unless `auth.users.email_confirmed_at` is set and less than a day
   old; claims the send with a conditional update
   `profiles set welcomed_at = now() where id = $1 and welcomed_at is null
   returning signup_role`, so two confirmations race on the row and exactly one
   wins; releases the stamp if nothing was sent, so a missing Resend key does
   not burn the welcome.
3. **Recipient.** `contactForUser` in `lib/email/recipients.ts`: the auth
   address and `profiles.display_name` as the name.
4. **Template.** `welcome({ name, role })`, now in
   `apps/web/src/lib/email/welcome-message.ts`, re-exported from
   `messages.ts`. The version is picked from `profiles.signup_role`
   (`renter`, `buyer`, `landlord`, `seller`, `agent`, confirmed live as the
   enum's five values) and null gets the general version.
5. **Client.** `sendMessage` in `lib/email/client.ts` (Resend REST, HTML and
   text parts), wrapped in `bestEffortEmail`, which does nothing when
   `RESEND_API_KEY` is absent.
6. **Landing.** The button goes to `/welcome`, the first run screen (Session B
   "welcome" worker, its files untouched here). Signed in: the first run, or on
   to `/home` once it has been seen. Signed out on another device: the same
   slides ending on Sign in. The line under the button says exactly that and
   nothing more.

Live DB, read only: `profiles.welcomed_at`, `profiles.signup_role` and
`profiles.display_name` exist; the enum holds the five roles. No usernames live
on `profiles`; the only handle is `social_profiles.handle` (scope request E1).

Broken links found and fixed in the template: the old landlord and seller
buttons pointed at `/agent/listings/new` and the agent button at
`/agent/apply`. **Neither route exists** (no page, no redirect), so three of
the six versions sent a new lister to a 404. Every link now resolves; the test
file walks `apps/web/src/app` and fails if any allowed route loses its page.

### What changed

- `32687e3`: pure move of `welcome`, `WelcomeData`, `SignupRole` and the one
  helper only it used into `welcome-message.ts`; one re-export line in
  `messages.ts`; no caller changed; the whole email suite green.
- `ac5e07a`: the new design and words, the tests, the proofs.

**Design.** Its own document rather than the shared `compose()`, because the
shell's closed block set cannot draw tiles, numbered plates or a lit button.
Everything comes from `theme.ts` (palette, type stack, 600 max width, 40px
card padding, lockup, sign-off, legal line) and `render.ts` (`escapeHtml`,
`appUrl`, `siteUrl`, `greetingName`, `hello`), so it is the same family as
every other message and it passes every catalogue rule in `shell.test.ts`
(tables only, one style block, ground painted three times, exactly the two
lockup images, hidden inbox line, legal line once, under 40KB: about 21KB).

Top to bottom: the lit rim (the gradient cap rule, solid electric blue for
Outlook) on the navy glass card with its blue rim; the lockup; a small
letter-spaced eyebrow "Welcome to Vallo"; a two line headline, "Hello Ada." in
white and "Make yourself at home." in quiet blue, the email's echo of the first
run's "Two worlds. / One platform."; one sentence on what Vallo is; the two
worlds as glass tiles (Property, Stays) with a lit top edge, side by side at
600 and stacked at 375; the role's opening line; "Where to begin" over a glass
panel of three numbered steps (numbered plate on a rounded rectangle, title,
one or two sentences, a text link underlined as well as coloured); the lit
button "Step inside" to `/welcome`; one quiet line under it; the calm panel
with a small round glyph and the one safety sentence; the small print outside
the card (why you got this, "Change what Vallo emails you", sign-off, legal).

No glass object icons: `shell.test.ts` holds every message to exactly two
images, and a step number in live text survives images off, costs no bytes on
a metered connection and cannot carry words in a picture.

### The copy, every version

Shared by all six (HTML and text): eyebrow "Welcome to Vallo"; headline
"Hello {first name}." / "Make yourself at home."; "Vallo is one account with
two sides to it, and you can flip between them whenever you like."; tiles
"Property: Homes to rent, buy or sell." and "Stays: Hotels, shortlets and
restaurant tables."; section "Where to begin"; button "Step inside";
"Opening this on another device? Sign in there with this same address.";
footer "You are receiving this because you created a Vallo account with this
address." and "Change what Vallo emails you". Subject "Welcome to Vallo,
{first name}", or "Welcome to Vallo" with no usable name.

The plain text of each version, exactly as rendered (proof names used; the
general version is shown with no name to show the fallback):

**Renter.**

```
Subject: Welcome to Vallo, Adaeze

Vallo

Welcome to Vallo
----------------

Hello Adaeze.
Make yourself at home.

Vallo is one account with two sides to it, and you can flip between them
whenever you like.

Property: Homes to rent, buy or sell.
Stays: Hotels, shortlets and restaurant tables.

You told us you are looking for somewhere to live. Here is where we
would start.

Where to begin
--------------

1. Search where you want to live
   Filter by area and budget. Where a listing states its total move-in
   cost, sort by that rather than the rent, because the rent is rarely
   the whole of what it takes to move in.
   Search homes to rent: https://vallospaces.com/search?market=rent&sort=move-in-asc

2. Ask, then go and see it
   Message the lister from the listing and keep your questions in
   writing. When you are ready, request an inspection and see the place
   in person before any money moves.
   Your inspections: https://vallospaces.com/inspections

3. Keep what you like
   Save homes and searches as you go, so they are waiting for you when
   you come back.
   Your saved homes: https://vallospaces.com/saved

Step inside:
https://vallospaces.com/welcome
Opening this on another device? Sign in there with this same address.

One thing worth knowing from day one: nobody from Vallo will ever ask
you to pay outside Vallo. If somebody does, report them from the
listing.

You are receiving this because you created a Vallo account with this
address.
Change what Vallo emails you: https://vallospaces.com/settings/notifications

Vallo
VALLO SPACES LTD (RC 9870413), Abuja, Nigeria
https://vallospaces.com
```

**Buyer.**

```
Subject: Welcome to Vallo, Tunde

Vallo

Welcome to Vallo
----------------

Hello Tunde.
Make yourself at home.

Vallo is one account with two sides to it, and you can flip between them
whenever you like.

Property: Homes to rent, buy or sell.
Stays: Hotels, shortlets and restaurant tables.

You told us you are looking to buy. Here is where we would start, and
the one thing we would want you to know first.

Where to begin
--------------

1. Search property for sale
   Filter by area and price, and read each listing's title before its
   photographs.
   Browse property for sale: https://vallospaces.com/search?market=buy

2. Read the title first
   Every listing for sale states the title the seller claims, or says
   plainly that none was given. We record the claim and we cannot verify
   it. Have your lawyer search it at the land registry before any money
   moves.
   How Vallo thinks about safety: https://vallospaces.com/safety

3. See it in person
   Message the seller inside Vallo, keep every answer in writing, and
   inspect the property before you commit to anything.
   Your inspections: https://vallospaces.com/inspections

Step inside:
https://vallospaces.com/welcome
Opening this on another device? Sign in there with this same address.

One thing worth knowing from day one: nobody from Vallo will ever ask
you to pay outside Vallo. If somebody does, report them from the
listing.

You are receiving this because you created a Vallo account with this
address.
Change what Vallo emails you: https://vallospaces.com/settings/notifications

Vallo
VALLO SPACES LTD (RC 9870413), Abuja, Nigeria
https://vallospaces.com
```

**Landlord.**

```
Subject: Welcome to Vallo, Ngozi

Vallo

Welcome to Vallo
----------------

Hello Ngozi.
Make yourself at home.

Vallo is one account with two sides to it, and you can flip between them
whenever you like.

Property: Homes to rent, buy or sell.
Stays: Hotels, shortlets and restaurant tables.

You told us you have property to let. Here is how it gets onto Vallo.

Where to begin
--------------

1. Register as an owner
   A few short screens about you and the property. A person at Vallo
   reads every registration before listings go up, so what people see
   has somebody behind it.
   Register as an owner: https://vallospaces.com/profile/setup/owner

2. Verify who you are
   Identity, then address, then your payout account, then a check in
   person. Each step you complete shows on your listings.
   Start verification: https://vallospaces.com/verification

3. Put the whole cost in
   When your listing goes up, state the total a tenant needs to move in,
   not only the rent. Photographs earn a viewing; a walkthrough video
   answers the questions before anybody asks them.
   Open the listing form: https://vallospaces.com/agent/list

Step inside:
https://vallospaces.com/welcome
Opening this on another device? Sign in there with this same address.

Keep your conversations and payments inside Vallo. It is the record both
sides can point to if anything is ever in question.

You are receiving this because you created a Vallo account with this
address.
Change what Vallo emails you: https://vallospaces.com/settings/notifications

Vallo
VALLO SPACES LTD (RC 9870413), Abuja, Nigeria
https://vallospaces.com
```

**Seller.**

```
Subject: Welcome to Vallo, Ibrahim

Vallo

Welcome to Vallo
----------------

Hello Ibrahim.
Make yourself at home.

Vallo is one account with two sides to it, and you can flip between them
whenever you like.

Property: Homes to rent, buy or sell.
Stays: Hotels, shortlets and restaurant tables.

You told us you have property to sell. Here is how it gets onto Vallo,
starting with the part buyers read first.

Where to begin
--------------

1. Register as an owner
   A few short screens about you and the property. A person at Vallo
   reads every registration before listings go up, so what people see
   has somebody behind it.
   Register as an owner: https://vallospaces.com/profile/setup/owner

2. State the title you hold
   Buyers read the title before the price. Name the certificate of
   occupancy, governor's consent or deed you hold, and have the document
   to hand.
   Open the listing form: https://vallospaces.com/agent/list

3. Verify who you are
   Identity, then address, then your payout account, then a check in
   person. Each step you complete shows on your listings.
   Start verification: https://vallospaces.com/verification

Step inside:
https://vallospaces.com/welcome
Opening this on another device? Sign in there with this same address.

Keep your conversations and payments inside Vallo. It is the record both
sides can point to if anything is ever in question.

You are receiving this because you created a Vallo account with this
address.
Change what Vallo emails you: https://vallospaces.com/settings/notifications

Vallo
VALLO SPACES LTD (RC 9870413), Abuja, Nigeria
https://vallospaces.com
```

**Agent.**

```
Subject: Welcome to Vallo, Chinedu

Vallo

Welcome to Vallo
----------------

Hello Chinedu.
Make yourself at home.

Vallo is one account with two sides to it, and you can flip between them
whenever you like.

Property: Homes to rent, buy or sell.
Stays: Hotels, shortlets and restaurant tables.

You do this for a living, so here is the short route in.

Where to begin
--------------

1. Register as an agent or a firm
   Tell us who you are, where you work and what you charge. Agents are
   checked more closely than owners, because you handle other people's
   property, and a person at Vallo reads every registration.
   Choose agent or firm: https://vallospaces.com/profile/setup

2. Verify who you are
   Identity, then address, then your payout account, then a check in
   person. Each step you complete shows on your listings.
   Start verification: https://vallospaces.com/verification

3. List, and state the full cost
   Once you are approved, the listing form walks you through a property
   from the photographs to the total a tenant will actually pay to move
   in.
   Open the listing form: https://vallospaces.com/agent/list

Step inside:
https://vallospaces.com/welcome
Opening this on another device? Sign in there with this same address.

Keep your conversations and payments inside Vallo. It is the record both
sides can point to if anything is ever in question.

You are receiving this because you created a Vallo account with this
address.
Change what Vallo emails you: https://vallospaces.com/settings/notifications

Vallo
VALLO SPACES LTD (RC 9870413), Abuja, Nigeria
https://vallospaces.com
```

**General (no role declared), no name.**

```
Subject: Welcome to Vallo

Vallo

Welcome to Vallo
----------------

Hello there.
Make yourself at home.

Vallo is one account with two sides to it, and you can flip between them
whenever you like.

Property: Homes to rent, buy or sell.
Stays: Hotels, shortlets and restaurant tables.

You have not told us what brought you here, and you do not need to. Any
of these is a good place to begin.

Where to begin
--------------

1. Look for a home
   Rent or buy, filtered by area and budget, with the full move-in cost
   shown wherever the lister has stated it.
   Search homes: https://vallospaces.com/search

2. Find somewhere to stay
   Hotels, shortlets and restaurant tables live on the Stays side of the
   same account.
   Open Stays: https://vallospaces.com/stays

3. Have property to let or sell
   Register as an owner, an agent or a firm. A person at Vallo reads
   every registration before listings go up.
   Register your property: https://vallospaces.com/profile/setup

Step inside:
https://vallospaces.com/welcome
Opening this on another device? Sign in there with this same address.

One thing worth knowing from day one: nobody from Vallo will ever ask
you to pay outside Vallo. If somebody does, report them from the
listing.

You are receiving this because you created a Vallo account with this
address.
Change what Vallo emails you: https://vallospaces.com/settings/notifications

Vallo
VALLO SPACES LTD (RC 9870413), Abuja, Nigeria
https://vallospaces.com
```

### Client compatibility checklist

| Rule | How | Checked by |
|---|---|---|
| Table layout, no flex, grid, float or positioning | every block is a `role="presentation"` table | shell.test, welcome-message.test |
| Inline styles | every colour and size inline beside its background; style block carries nothing load bearing | shell.test (count), stripped proof |
| Bulletproof button | solid `background-color` first, gradient image over it; padding on the anchor; VML `v:roundrect` in `<!--[if mso]>` with the HTML anchor in `<!--[if !mso]><!-->` | welcome-message.test, stripped proof |
| Lit button | gradient, `border-top` in quiet blue plus inset highlight, bloom by `box-shadow` where rendered | welcome-message.test, 600 and 375 proofs |
| Shape law | 14px radius on a 52px button (0.27), plates 10px on 36px, tiles 16px; only the tiny info glyph is round (a shape, not a control) | proofs |
| Outlook conditionals | 600px ghost table for Word, VML button, `o:OfficeDocumentSettings` 96 dpi, `mso-line-height-rule` on fixed-height cells | markup |
| Dark mode | `color-scheme` meta pair, `:root { color-scheme: dark }`, `prefers-color-scheme` re-assertion, `[data-ogsc]` twin for Outlook.com; ground painted on body, outer table `bgcolor` and card | shell.test |
| No web fonts | system stack only | shell.test |
| Alt text | mark alt empty (decorative), wordmark alt "Vallo"; both sized so a blocked image keeps its box | tests, images-off proofs |
| 600px max, fluid, mobile stacking | `max-width:600px;width:100%`; at 480px and below the tiles stack, the button goes full width, the card and step panel tighten | 375 proofs |
| Preheader | hidden span first in the body with spacer entities, per version | tests |
| Plain text | own renderer, same words in the same order, every link printed as "Label: URL" | tests, `*-plain.txt` |
| Escaping | every interpolated value through `escapeHtml`; a name `<b>O'Neil&"Co"` renders as text | test |
| Weight | about 21KB of HTML, under the 40KB budget | tests |

Proofs in `docs/design/proofs/session-b/email/`: `{role}-600.jpg`,
`{role}-375.jpg`, `{role}-600-images-off.jpg`, `{role}-375-images-off.jpg` for
all six, `renter-fallback-600.jpg` (style block, gradients, shadows and radii
stripped: a rough stand in for Outlook's Word engine and Gmail's stripping),
and `{role}-plain.txt`. Rendered in Chromium through Playwright with the
lockup served from `apps/web/public`, dark colour scheme. The email has no
light variant by design (theme.ts: dark in the layer every client honours).

### Refused claims (from the old copy; none of them had evidence)

- "Every listing on Vallo was put up by a real person on Vallo." The live DB
  has 64 published listings, all example rows (`is_demo`), and zero real
  supply. False today.
- "Applications and verification documents are answered within 3 days." A
  schedule promise nobody can stand behind.
- "A verified agent's listings rank above an unverified one ... the only thing
  on this platform that money cannot buy." A ranking claim this worker could
  not find evidence for, so it does not ship.
- "Listings that state the total get far fewer wasted viewings." A statistic
  with no data behind it.
- "Vallo charges you nothing to list or to be verified." Dropped from the
  email rather than restated: rule 15 says Vallo charges no platform fee, but a
  pricing statement belongs to the founder's copy, not the welcome.
- The verification ladder "phone, identity document, address, physical
  inspection" was wrong: the rungs in `lib/trust/verification.ts` are
  identity, address, payout account and in person. The new copy says those.
- Nothing says insured, guaranteed, protected, vetted or checked; no count, no
  percentage; no stock or availability promise.

### Not verified

- **Real inbox rendering.** Not sent to any real client: Outlook desktop
  (Word), Outlook.com, Gmail web and app, Apple Mail and iOS Mail were not
  seen. The VML button, the Outlook ghost table and Gmail's dark-mode repaint
  are built to the known rules and proven only in markup and in the stripped
  Chromium render.
- **That the welcome sends at all in production.** It needs `RESEND_API_KEY`
  on the deployment; this worker cannot read it. Without it `welcomeOnce`
  releases the stamp and nothing leaves.
- **Every link as a signed-in person.** Routes proven to exist as pages by the
  test; not clicked through with a session.

## Skipped or not verified

(appended honestly as work proceeds)

- Welcome email (section 10): not rendered in any real mail client (Outlook,
  Gmail, Apple Mail); the Resend key in production not verified; links not
  clicked through signed in.
- admin-money: no signed-in run of `/admin/money`, `/admin/escrow`,
  `/admin/supply` (no admin test user); proofs are fixture-backed through a
  harness. The escrow ruling was not exercised (zero escrows). The
  reconciliation job's HTTP reply (`private.reconciliation_watch`) is not on
  the desks (scope request 10). Bookings and payments were not restyled beyond
  the shell's register. Escrow row photographs not drawn.
