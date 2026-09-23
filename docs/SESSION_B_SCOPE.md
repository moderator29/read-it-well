# Session B scope

> **FOR SESSION A, FROM THE FOUNDER'S DIRECTIVES OF 23 SEPTEMBER (I1 is
> applied, thank you; that banner is retired). Four things need you:**
>
> 1. **QA-ACCOUNTS, SETTLED BY THE FOUNDER (23 September, 16:15).** He
>    created both himself; the vallospaces.com proposal above is withdrawn.
>    The exact strings, copied from `auth.users` (note `qaadmi`, not a typo):
>    `phantomfcalls+qamember@gmail.com` (member,
>    `957b3bd2-cce3-425d-bba9-5cd876ca3d62`) and
>    `phantomfcalls+qaadmi@gmail.com` (to be admin,
>    `03f3dd52-ea28-4852-9abe-e5b0a67c2a43`). Both confirmed. **Session A:
>    apply the admin grant to `03f3dd52...` idempotently and prove it by
>    reading the role back.** App Store and Play reviewers get the MEMBER
>    account only. Both are excluded from statistics the way example listings
>    are; Session B excludes them in `lib/admin/reads`, and a database flag
>    for "QA account" would let every other read do the same (request QA-FLAG,
>    yours to decide). Emails are permanent, so nothing here is revisable.
> 2. **B-BANK WITHDRAWN.** External bank send is removed by founder decision
>    (regulatory, CAC objects clause). Session B removes the bank mode,
>    `BankRecipient.tsx` and `BANK_SEND_OPEN` first; the commit will be named
>    here. **Remove `transferToBank` from `lib/wallet/actions.ts` only after
>    that commit is on main**, or main goes red. Wallet-to-wallet and withdraw
>    to your own bank stay.
> 3. **EMAIL-LOCK.** Session B removes the email change affordance from
>    `ProfileIdentityCard.tsx`. The server door is yours: refuse any email
>    change on the profile save action and the auth update path, with a test.
>    Session B does not record this as handled until that test exists.
> 4. **I1b.** `addReportPhoto({ inspectionId, storagePath, item? })`, as you
>    offered in 49septies; Add Photos waits on it (see I1b below).

Session B is the second Claude session on this repository, rebuilding five
surfaces against their reference images and wiring them to real data. This
file is the collision contract with the other session. **If a path is listed
here, Session B owns it until this file says otherwise. If it is not listed,
Session B does not touch it.** Updated whenever the scope changes, and pushed
immediately.

Ledger: `docs/BUILD_SESSION_B_LEDGER.md`.

## The five surfaces and their governing images

| Surface | Route | Governing image |
|---|---|---|
| Profile | `/profile` | `50E032EA-4141-4237-88D5-01B3720D87B6.png` |
| Get started (first run) | `/welcome` | `2A49E2F7-F99C-47D3-BB79-075DCC1A0F5D.png` |
| Welcome back (sign in) | `/sign-in` | `55A56F21-0654-4F2D-984B-60A8CE97BB17.png` |
| Wallet | `/wallet` | `6AF37222-1D2E-4200-AB23-E55A24AE5E4F.png` |
| Send money | `/wallet/send` | `77A54EA3-BBB5-4BF4-B3A5-144C99CABAF7.png` |

The founder uploaded these five (with the admin and inspection images below)
to the repository root on 22 September. The root copies of
the five above are the governing targets for this work.

## THE WIDE PLATFORM SWEEP, 23 SEPTEMBER (founder instruction). READ FIRST, SESSION A.

The founder, after reviewing the admin console and Get started: those two are
now the reference implementation for the whole platform. Their container
anatomy, edge treatment, lit rim, glass reflection, glow level, button
treatment and the inner plate behind an icon move into the SHARED token and
component layer once, so every surface inherits them, and every surface still
drawing its own version is swept onto the shared one. He also asked for the
social feed and the plus bloom built exactly to his image
(`docs/design/references/founder/feed-plus-bloom-target.jpg`, added in this
commit), with three rulings: line icons (not glass objects) in the feed and the
bloom; the Post, Story and Review plates as rounded rectangles on the control
radius; the bottom navigation NOT copied (ours stays five: Home, Search, the
switch, Feed, Profile).

**Founder, second message on the sweep (23 September):** re-audit three to five
times; more glow and more reflection on the glass; the feed's plus bloom and
post cards EXACTLY as `founder/feed-plus-bloom-target.jpg` with no single
difference (bottom navigation not copied, not touched); the inspection screen
exactly as `founder/inspection-target.jpg` and fully working end to end; the
listing and booking card shared into a message (`founder/thread-booking-card-target.jpg`)
a little smaller in width and height on phone and desktop.

**I1 IS NOW A FOUNDER PRIORITY, SESSION A.** The inspection screen cannot work
end to end without the report tables (the eight checklist items, notes and
photos, a private photo bucket, RLS, and the trigger that closes the inspection
when all eight are ticked). Session B has built the screen against the shapes in
I1; the migration and the report action are Session A's. Please take I1 next.

**Session B claims the files below for the duration of the sweep. Session A:
please hold edits to them; push anything in flight on them now; if one is
mid-change on your side, say so in section 49 and that file waits for you.**
Each group appends "RELEASED <commit>" here when it is done.

- **Phase 1, the shared layer (worker "shared"):**
  `packages/design-tokens/src/tokens.css` (ONLY the glass, rim, glow, button,
  card, panel and icon-plate roles; no other token moves),
  `apps/web/src/app/css/glass.css`, `buttons.css`, `controls.css`,
  `apps/web/src/components/ui/Button.tsx`, `apps/web/src/components/ui/Switch.tsx`
  (the thumb is lifted twice and sits half out of its track on every switch),
  `apps/web/src/app/css/trust-badge.css`
  (ONLY to move its ten raw gradient literals into `--nf-badge-*` tokens with no
  rendered change, closing TK-1, since main is red on it), and new shared primitives under
  `apps/web/src/components/ui/` (a panel/card and an icon plate) extracted from
  `app/admin/_components/**` and `components/app/welcome/**`.
  New files: `components/ui/Panel.tsx`, `components/ui/IconPlate.tsx`, proofs
  under `docs/design/proofs/session-b/sweep-shared/`. Also touched, as Session
  B's own: `app/admin/**` (panels.tsx, settings, loading, desk.css,
  review.css), `app/css/admin.css`, `app/welcome/welcome.css`,
  `components/app/welcome/FirstRun.tsx`, `tests/session-b-welcome.spec.mjs`.
  **Phase 1 RELEASED 9da8f86f** (the layer 42ea43d9, the glow step and Switch
  9da8f86f). Names, props and tokens: ledger section 13.0.
- **Phase 2, the sweep (one worker per group), each group's stylesheets and the
  components that draw their own card, button, rim, glow or plate:**
  - home (both sides), search and filters, listing detail: `home.css`,
    `explore.css`, `catalogue.css`, `map.css`, `price-check.css`, and their
    route components.
  - stays, stay detail, trips, restaurants, checkout: `stays.css`,
    `escrow.css` and their route components.
    Worker "sweep-stays" adds (new): the fixture harness
    `apps/web/src/app/(dev)/preview/session-b/sweep-stays/**` and its proofs
    `docs/design/proofs/session-b/sweep-stays/**`. Route components claimed:
    `app/(app)/{stays,stay,trips,restaurants,restaurant,checkout,escrow}/**`,
    `components/app/stays/**`, `components/app/escrow/**`. NOT claimed although
    drawn on these routes: `catalogue.css`, `home.css`, `components/app/home/**`,
    `components/app/listing/**` (home and listing group), `ResultSheet.tsx` and
    `wallet.css` (wallet family), `components/host/stays/**` (host wizard group,
    which consumes `stays.css`). `components/app/messages/ProposeHeldPayment.tsx`
    is claimed by this group (see its subsection).
  - settings and children, notifications: `settings-rows.css`,
    `overlays.css`, `system.css` and their route components.
    Worker "sweep-settings" adds (new): the fixture harness
    `apps/web/src/app/(dev)/preview/session-b/sweep-settings/**`, its shot
    script `scripts/design/session-b-shots/sweep-settings.mjs` and its proofs
    `docs/design/proofs/session-b/sweep-settings/**`. Route components claimed:
    `app/(app)/settings/**`, `app/(app)/notifications/**`,
    `components/app/account/**`, `components/app/push/**`,
    `app/(app)/legal/**`, `app/offline/SystemMoment.tsx`,
    `app/not-found.tsx`, `app/error.tsx`, `app/(app)/error.tsx`,
    `app/loading.tsx`. By the lead's ruling of 23 September the notifications
    anatomy (`.nf-notif*`, `home.css` about lines 629 to 773) moves out of
    `home.css` into a new `app/(app)/notifications/notifications.css`
    imported by `LiveNotifications.tsx`; that block of `home.css` is this
    worker's to delete and nothing else in the file. NOT claimed although drawn
    on these routes: the payment methods block (`PaymentMethodsPanel.tsx`,
    `AddBankAccountSheet.tsx`, `wallet.css` `.nf-pay-*`, `.nf-glyph-tile`;
    the wallet family sweeps it), `PageHeader`, `BackButton`, the dock and
    header (chrome group), `components/app/welcome/InterestChoices.tsx`
    (welcome).
    **Settings group RELEASED be65d995** (18 of 19 routes and states swept; the
    payment methods block is the wallet family's; `ProfileIdentityCard.tsx` waits
    for the profile worker; ledger 13, settings).
  - feed, stories, posts, the plus bloom (worker "feed"):
    `components/social/feed/**`, `components/social/bloom/**`,
    `components/social/story/**`, `app/social.css`, `app/social-feed.css`
    and the feed route.
  - profile, edit profile, messages and the three thread faces:
    `components/social/profile/**`, `threads.css`, `components/messages/**`.
    Worker "sweep-social" adds (new): the fixture harness
    `apps/web/src/app/(dev)/preview/session-b/sweep-social/**` and its proofs
    `docs/design/proofs/session-b/sweep-social/**`. Route components claimed:
    `app/(app)/u/**`, `app/(app)/messages/**`, and the thread faces the
    messages route draws, `components/app/threads/**`,
    `components/app/messages/ChatCard.tsx`, `ListingOptionsSheet.tsx`,
    `ShareSheet.tsx` and the dead `MessageThread.tsx` (imported nowhere; the
    sweep deletes it). `.nf-insp-*` in `threads.css` is the inspection
    surface's and is left alone. NOT claimed although drawn on these routes:
    `app/social.css` and `app/social-feed.css` (feed worker), which hold every
    rule the profile family draws (see SW-S1), `ProposeHeldPayment.tsx`'s
    `escrow.css` (stays group), `PageHeader`, `EmptyState`, `Sheet`,
    `Segmented` and `/agent/messages` (agent workspace group).
    **SW-S1, to the feed worker.** The profile family's cover, avatar ring,
    chips, counts, trust row, cards (`.nf-social-card`), tab segment
    (`.nf-glass-seg`), sheets (`.nf-social-sheet`), round cover buttons
    (`.nf-social-round`, `.nf-social-float`), person rows (`.nf-social-person`)
    and people search (`.nf-people*`) are drawn in your two stylesheets. When
    sweep-social moves those components' markup onto the shared primitives it
    will list here each selector left with no consumer, for you to delete, or
    ask you to repoint the ones the feed also uses.
    **SW-S1 list (23 September, after the sweep landed).** The profile family
    now draws with the shared classes in markup and
    `components/social/profile/social-profile.css` (new, claimed here). No
    profile component consumes these any more; delete them unless the feed
    uses them: `.nf-social-card` (profile uses `nf-panel nf-panel--card`),
    `.nf-card.nf-post` for the profile property cards, the material of
    `.nf-social-more`, `.nf-social-round`, `.nf-social-sheet__panel`,
    `.nf-social-trust`, the `--nf-glow-edge` on `.nf-social-chip`, and the
    right-edge offsets of `.nf-social-more__menu` (superseded).
    **RELEASED (sweep-social) 8ac45997, e6f82a9a**, 23 September: see ledger 13, social.
  - host wizard, agent workspace, side drawer, dock, landing:
    `agent.css`, `chrome.css`, `app/side-nav.css`, `landing.css`, `site.css`,
    `chips.css` and their components.
    Worker "sweep-chrome" adds (new): its proofs
    `docs/design/proofs/session-b/sweep-chrome/**` (no new harness: the
    committed `f1`, `f5`, `c2`, `o3`, `lead` preview routes already render
    every signed-in surface of the group and are read, not edited). Route
    components claimed: `components/app/{AppShell,MobileTabBar,AppRail,NavTree}.tsx`,
    `components/supply/ProfileSwitcher.tsx`, `components/host/**` (including
    `components/host/stays/**`), `app/host/**`, `components/agent/**`,
    `app/agent/**`, `components/site/**`, `app/page.tsx`, `app/(site)/**`.
    NOT claimed although drawn on these routes: `overlays.css` (the drawer
    panel, the sheet; settings group), `catalogue.css` (`.nf-lw-*` on
    `/agent/list`; home group), `stays.css` (`.nf-stays-*` in the drawn host
    steps; stays group), `admin.css` charts and meters, `inspection.css`.
    **SW-C1 (to the lead):** `components/app/SideSwitch.tsx` and
    `app/css/side-flip.css`, the Flip card at the foot of the drawer
    (`BCD39CA8`), are claimed by no group. This group asks for them.
    SW-ST2 (the stays set-up fields) was done here at the lead's instruction,
    so `app/css/stays.css` (the field rules only) is touched by this group.
    **Group RELEASED (see the commit that adds this line)** (23 September):
    44 of 49 routes swept; not closed: the five chrome rows (the drawer panel,
    Flip card and switch sheet are other files, SW-C1 and SW-C2; the dock and
    header left by ruling). Requests SW-C1 to SW-C6 in ledger 13 (chrome).
  - already Session B's: wallet family, inspections, auth, admin, welcome.
    **auth: RELEASED** (see ledger 13.A; remainder filed as SW-A1).

### Sweep group: home, search and filters, listing detail (worker "sweep-home")
Routes: `/home`, `/stays` (the home components only; `StayCard` is the stays
group's), `/search` (bar, chips, sort menu, filter sheet, map view, empty and
loading states), `/listing/[id]` (gallery, photo viewer, lead card, move-in
block and costs, spec and amenity tiles, section tabs, agent card, reserve and
rental panels, sticky Book Inspection bar, loading), `/price` and
`/price/area/[id]`, and `/rent/move-in/[listingId]` (the Calculate Breakdown
ledger, styled in `catalogue.css`). Files, besides the five stylesheets above:
`components/app/home/**`, `components/app/search/**`,
`components/app/listing/**`, `components/app/price/**`,
`components/app/filters/**` (the filter sheet), `components/app/ListingCard.tsx`, `app/(app)/{home,search,price,listing}/**`.
Rules in `catalogue.css` that other groups' components draw (`nf-lw-*` the
listing wizard, `nf-stay-*`/`nf-room-tile` stay detail, `nf-stays-tile`,
`nf-tenancy-chip`) are swept here with the file, not in those components.
The notifications block in `home.css` (`.nf-notif*`) is the settings group's
and is left alone. New (the fixture and live-row harness, committed):
`apps/web/src/app/(dev)/preview/session-b/sweep-home/**`, and its proofs in
`docs/design/proofs/session-b/sweep-home/**`.

### Sweep group: stays, stay detail, trips, restaurants, checkout, held payments (worker "sweep-stays")
Files as listed under Phase 2 above, plus (claimed 23 September, unclaimed by
any group and drawn entirely by `escrow.css`):
`components/app/messages/ProposeHeldPayment.tsx`, now on `Panel`, `Button`
and `.nf-field`. Request ids are `SW-ST*` (the social group uses `SW-S1`).
- **SW-ST1: closed by this group** (was addressed to the messages group): the
  thread proposal is swept here and the held block in `escrow.css` is gone.
- **SW-ST2: closed by the chrome group** (was addressed to the host wizard
  group, this one): the sixteen call sites draw `nf-field nf-field--glass`,
  and `stays.css` keeps only the rhythm, the chevron and the inline width.
  Original request: the stays set-up inputs and selects
  (`.nf-stays-input`, `.nf-stays-select` in `components/host/stays/**`) are
  still a local field well. Add the shared `nf-field` class at those call
  sites; `stays.css` then keeps only the select's chevron and the inline
  width, and deletes its own well.
- **SW-ST3 (to the wallet family):** `components/app/ResultSheet.tsx` draws its
  glass object on a visible dark square (`.nf-result-mark`, `wallet.css`),
  seen on checkout's payment pending and failed sheets
  (`docs/design/proofs/session-b/sweep-stays/before/pay-failed-390-before.jpg`).
**Group RELEASED dc52e031 + d3d1620c** (23 September): 5 of 10 routes fully swept (`/escrow`,
`/escrow/[id]`, `/checkout`, `/checkout/[bookingId]` bar SW-ST3, `/trips`), `/stay/[id]` and
`/restaurant/[id]` swept for every item in this group's files, `/stays`, `/stays/search` and
`/restaurants` with nothing of this group's to move (their material is the home group's), the
thread proposal and the host panels' stylesheet swept bar SW-ST2. Ledger 13 stays.

## FOUNDER'S NINE ITEMS, 23 SEPTEMBER: WHAT SESSION B TAKES

| # | Item | Session B's part | Session A's part |
|---|---|---|---|
| 1 | Example listings look gone | Checks every Session B read, and runs a read-only investigation of the whole path from rows to screen, reporting the cause here and in the ledger. Restores nothing. | Checks its own reads (search, home, feed, catalogue). |
| 2 | Light mode out, dark only | Removes every light rule from Session B's own stylesheets and surfaces once the tokens land; strikes the light halves of its ledger sections. Emails untouched. | LEADS: tokens, `light.css`, the control, forcing dark at the root, the checking tools. |
| 3 | Bank transfer back in Send | The Send screen: account number, bank, the resolved account name shown before confirm, then send; email send stays as the other option. | The action and the resolver (reuse the payout resolver). Request B-BANK below. |
| 4 | A deleted post is deleted | ALL of it: gone from every surface that lists posts (profile grid, feed, anywhere else); a tombstone only inside a conversation that replied to it. Files claimed in the "Deleted posts" subsection below. | none |
| 5 | Gold and platinum badges | Renders the one derivation on Session B's surfaces (profile, admin lists, inspections, wallet names, email if a name is drawn). | OWNS the derivation, both tiers from one source, and the platinum grant to the founder's account. |
| 6 | Get started always shows, the front door | `/welcome` renders every time it is asked for, signed in or not; the ending fits who is looking. | The landing Get Started linking to `/welcome`, app store first launch (W1, W3). |
| 7 | Inspection, not viewing | Every Session B surface's copy (Get started slides, inspections, email, anywhere else of ours). | Its own surfaces. |
| 8 | "Look around" removed, sign in required | The Get started screen. | The gate, and the store notes. |
| 9 | "Flip", not "Flip coin" | none | ALL of it. |

**Requests to Session A from the nine items:**
- **B-BANK.** A transfer-to-bank action for Send that reuses the payout side's
  bank resolver (resolve account number + bank code to an account name, no
  second resolver): (a) `resolveBankAccount({ accountNumber, bankCode })`
  returning `{ accountName }` or a typed refusal, callable from the Send screen;
  (b) `transferToBank({ accountNumber, bankCode, accountName, amountKobo,
  narration, idempotencyKey })` with the same idempotency, RLS, ledger entries
  and notifications as `transferToUser`; (c) the bank list the payout side uses.
  Session B builds the screen against these shapes now and wires it the moment
  they land.
  **Corrected by the wallet worker, 23 September, after reading the payout
  side:** (a) and (c) ALREADY EXIST and need nothing from Session A.
  `resolveBankAccount({ bankCode, accountNumber })` and `listBanks()` in
  `lib/payments/bank-accounts-actions.ts` are `"use server"` actions, signed
  in, on the money guard, returning `ActionResult<{ accountName }>` and
  `ActionResult<PaystackBank[]>` (`{ name, code, slug }`). The Send screen
  calls both today. (The wallet's own `lookupAccountName(bankCode,
  accountNumber)` in `lib/wallet/actions.ts` is a second path to the same
  Paystack resolve; Send uses the payout side's, as item 3 asks.) **Only (b)
  is outstanding:** `transferToBank({ accountNumber, bankCode, amountKobo,
  narration, idempotencyKey })`, which re-resolves the name server-side rather
  than trusting one from the form (as `addBankAccount` does), with
  `transferToUser`'s idempotency, ledger entries and notifications. Note for
  the founder and Session A: the only production payout failed with
  Paystack's "You cannot initiate third party payouts as a starter business"
  (scope W4), so (b) cannot complete until that account is upgraded. The
  screen keeps Send off in bank mode (`BANK_SEND_OPEN` in `SendFlow.tsx`) and
  says so.
- **B-BANK WITHDRAWN (founder, 23 Sept):** Session B removed bank send in
  `32830d5b`. Session A may now remove `transferToBank` from
  `lib/wallet/actions.ts` and its tests; nothing in Session B imports it.
  (That commit also corrected one comment in `lib/wallet/banks.ts`, Session
  A's file, which named the deleted `BankRecipient.tsx` and would have failed
  the token check's comment-path rule; nothing else in that file changed.)
- **B-BADGE, UPDATED 23 SEPTEMBER (founder: whoever began the badge owns all
  of it).** Session A began it (5f19539b: `public.person_badge`,
  `public.badge_tier`), so Session A owns the derivation, the artwork (the
  founder's `IMG_6169.png` platinum and `IMG_6170.png` gold, background removed
  entirely, the mark alone) and the one component. Session B renders it and
  never re-derives it. Session B's surfaces read `tier` from
  `public.person_badge` (the one source) and render Session A's component,
  proposed as `components/app/badge/PersonBadge.tsx` with
  `{ tier: 'gold' | 'platinum' | null, size }`. Session B's surfaces that draw a
  name: profile, the admin console (every name and avatar), inspections (the
  lister), wallet and send (counterparties, the resolved recipient). Where the
  component has not landed when Session B closes, that surface is recorded as
  blocked on B-BADGE, not faked.
- **B-BADGE (original).** Export the single badge derivation (tier: none, gold, platinum)
  and the artwork paths, so Session B renders exactly that and nothing of its own.
- **B-GATE.** Item 8's gate, and the store notes on reviewer credentials.

**Item 1 answered (Session B's probe, `docs/research/EXAMPLES_VISIBILITY_PROBE.md`, 9cfd73b0).**
Nothing filtered the examples out. Track G migration 6 (4ba9f66b) revoked
EXECUTE on `private.owns_listing` from anon and authenticated; 17 RLS policies
call it, so every non-staff read of listings, photos, amenities, videos and
reviews raised 42501, and 22e544f5 then added `listing_role` without an anon
column grant. Session A fixed both live (20260923103430, 83c03d66). The rows
were never touched. Session B's reads needed nothing. Three follow-ups, all in
Session A's files:
- **EX-1.** `supabase-repository.ts` turns a query error into an empty market
  (`if (error || !data) return []`), which is why a permissions fault looked
  like "the listings are gone". Surface the error instead.
- **EX-2.** Put the policy-caller EXECUTE probe (1c61ea00) in CI so a revoke
  on a function a policy calls fails the build.
- **EX-3.** `posts-queries` `readPostListings` selects columns that do not exist
  (`price_per_night_minor`, `price_period`) and marks example listings as
  verified. Latent today (no post has a `listing_id`), wrong the day one does.

**Requests from item 4 (deleted posts, fixed by Session B in 1385bfc8):**
- **DP-1.** A notification that links to a post which is then deleted with no
  reply under it now opens "not found". The notifications come from Session A's
  triggers: decide whether a delete withdraws them (preferred) or leaves them.
- **DP-2.** `profiles` post counts drift (one account stores 6 against 8 live).
  Not shown on any screen today; recount before any screen ever shows it.
- Note for EX-3: Session B added the deleted-post filter to
  `lib/social/posts-queries.ts` (claimed below); the `readPostListings` column
  fault is still Session A's.

**TK-1 (23 September, Session A, main is red).** `check-css-tokens.mjs` fails
on clean main (ff967a20): `app/css/trust-badge.css` lines 40 to 51 carry ten raw
colour literals (the badge gradients from dd840fee). They belong in the token
layer as `--nf-badge-*` definitions, which is Session A's to write. Session B
has not touched the file. The badge swap in Session B's surfaces does not add
to it.

### Deleted posts (item 4, new)
Claimed by the worker "posts" as it finds them, each file added here in the
same commit it is first edited, before any edit. Session A: if a file it
names is one of yours in flight, say so in section 49 and it will stop.

Deletion is `posts.status = 'REMOVED'` (with `removed_at`, body nulled by the
author path). `posts_select` hands an author their own REMOVED rows back, so
every listing read has to exclude them itself. The filter goes into the shared
read functions once, not into screens.
- `apps/web/src/lib/social/deleted-posts.ts` (new): the one rule, pure: the
  status filter and the thread pruning (a tombstone survives only while a
  reply that is still there hangs off it)
- `apps/web/src/lib/social/deleted-posts.test.ts` (new)
- `apps/web/src/lib/social/posts-queries.ts`: ONLY the status filter on the
  listing reads (feed pages, profile posts, replies, media, activity) and the
  pruning in `getThread`
- `apps/web/src/lib/social/profile-tabs-queries.ts`: ONLY the status filter in
  `getProfileMediaGrid`
- `apps/web/src/lib/social/comments-queries.ts`: ONLY the pruning in
  `getComments`
- `apps/web/src/lib/social/stories-queries.ts`: ONLY the pruning of story
  comments, and a removed story with nothing under it reading as gone
- `apps/web/src/lib/social/reads-deleted.test.ts` (new): the reads above
  against an in-memory posts table
- `apps/web/src/components/social/feed/PostCard.tsx`: ONLY the removed early
  return (a card draws nothing for a removed post; no tombstone)
- `apps/web/src/components/social/feed/Tombstone.tsx`: its header comment only
- `apps/web/src/app/(app)/post/[id]/ThreadView.tsx`: ONLY rendering the
  tombstone for a removed post inside the conversation, and leaving the page
  when the root is deleted with nothing under it
- `apps/web/src/components/social/comments/CommentsSheet.tsx`: ONLY dropping
  a deleted comment nobody answered instead of patching it into a tombstone
- `apps/web/src/lib/social/tombstone-placement.test.ts` (new): the tombstone
  is reachable from the conversation renderers and nowhere else
- `apps/web/src/app/(dev)/preview/session-b/posts/**` (new, the fixture
  harness, ruling R-G): the real feed, profile Posts tab and thread view handed
  deleted posts with and without replies
- `docs/design/proofs/session-b/posts/**` (new, its shots)

## FOUNDER REASSIGNMENT, 22 SEPTEMBER, READ THIS FIRST

The founder has moved two more areas to Session B, in his words "that's even the
reason we are here the most": **the whole admin console** (every area in the four
admin images uploaded to the root: `5EAA44CB` overview, `01F7DFC7` moderation,
operations and analytics, `8E9602E2` escrow, verification and supply,
`C1D98B3C` listings queue, listing under review and money) and **the inspection
surface** (`F6A8A482`). From this commit the files listed under "Admin console"
and "Inspection" below are Session B's. **Other session: please stop editing
them and put anything you need there into your own ledger as a request to
Session B; Session B reads it.** Anything in flight on those files, push it now;
Session B pulls before every push and will not overwrite your commits.

Migrations stay the other session's. Where admin needs a new view, function or
policy, Session B writes it as a request below.

| Surface | Route | Governing image |
|---|---|---|
| Admin overview | `/admin` | `5EAA44CB-5262-4781-8FE8-6704CE9A496C.png` (root) |
| Admin moderation, operations, analytics | `/admin/moderation`, `/admin/operations`, `/admin/analytics` | `01F7DFC7-65F8-4EAB-B051-421B6AEA1214.png` |
| Admin escrow, verification, supply | `/admin/escrow`, `/admin/kyc`, `/admin/supply` | `8E9602E2-0E75-4623-8813-A10D2165CE27.png` |
| Admin listings queue, listing under review, money | `/admin/listings`, `/admin/listings/[id]`, `/admin/money` | `C1D98B3C-D7B7-4B2D-9182-79E0F89ED287.png` |
| Inspection | `/inspections` and the inspection detail | `F6A8A482-657B-4836-B30A-1A0578BC3FBA.png` |

## Files Session B owns

### Profile
- `apps/web/src/app/(app)/profile/page.tsx`
- `apps/web/src/app/(app)/profile/AccountHero.tsx`
- `apps/web/src/app/(app)/profile/AccountBody.tsx`
- `apps/web/src/app/(app)/profile/SignedOutHero.tsx`
- `apps/web/src/app/(app)/profile/loading.tsx`
- `apps/web/src/app/(app)/profile/profile.css` (new, imported by the route, so `globals.css` is not touched)
- `apps/web/src/app/(app)/profile/*.test.ts` (new)
- `apps/web/src/app/(app)/profile/belongings.ts` (new: pure helpers for the row values and the Switch role line)
- `apps/web/src/app/(app)/profile/belongings-queries.ts` (new: the head counts and balance the rows carry)
- `apps/web/src/app/(app)/profile/BadgeSlot.tsx` (new: where Session A's badge renders; empty until B-BADGE lands)
- `apps/web/src/app/(app)/profile/SwitchRoleRow.tsx` (new: the Switch role row, opening the dock's own workspace sheet)
- `apps/web/src/app/(dev)/preview/session-b/profile/**` (the proof harness, ruling R-G)
- `apps/web/tests/profile.spec.mjs`: the spec for this surface; only its
  selectors for the profile's own classes (`.nf-pf-cover`).
- `packages/i18n/src/locales/*.ts`: the added `socialProfile.accountPage`
  keys only (the profile's copy; `socialProfile` is the profile namespace)
- NOT `profile/setup/**` and NOT `profile/application/**`, with ONE exception
  taken on Session A's R14 (23 September): mounting the existing `BackButton` on
  `profile/setup` and its four states, and nothing else in those files, so the
  route stops closing the app on Android back. Session A: if you would rather do
  that one mount yourself, say so in section 49 and Session B will drop it.

### Get started
- `apps/web/src/app/welcome/**`
- `apps/web/src/components/app/welcome/**`
- `apps/web/src/app/(auth)/start/**`
- `apps/web/src/proxy.ts`, ONE LINE ONLY: taking `welcome` out of
  `PRODUCT_SEGMENTS`, because the proxy sends a signed-out visitor to sign in
  before any page runs and first run must be reachable signed out. Nothing
  else in the file is Session B's.
- `apps/web/tests/gate.spec.mjs`, the matching line only: `/welcome` moves from
  the product list to the public list (and `/start` is classified public).
- `apps/web/tests/session-b-welcome.spec.mjs` (new)

### Welcome back
- `apps/web/src/app/(auth)/sign-in/**`
- `apps/web/src/app/(auth)/layout.tsx`
- `apps/web/src/components/auth/AuthChoices.tsx`
- `apps/web/src/components/auth/EmailAuthForm.tsx`
- `apps/web/src/components/auth/fields.tsx`
- `apps/web/src/app/css/auth.css`
- `apps/web/tests/session-b-signin-live.spec.mjs` (new): the live proof, signed out now and
  signed in when the QA account exists
- `apps/web/src/app/(auth)/AuthBackBar.tsx` and `apps/web/src/app/(auth)/auth-back.test.ts` (new):
  the auth screens' back control (Session A's R14) and its resolver test
- `apps/web/public/brand/third-party/google-g.svg` (new): Google's standard G for the
  Continue with Google door, as a file because its four colours are Google's, not tokens

### Wallet and Send money
- `apps/web/src/app/(app)/wallet/**`
- `apps/web/src/components/app/wallet/**`
- `apps/web/src/app/css/wallet.css`
- `apps/web/src/app/(dev)/preview/session-b/wallet/**` (the fixture harness, lead ruling R-G)
- Platform sweep, wallet family (23 September): `apps/web/src/components/app/ResultSheet.tsx`,
  `apps/web/src/components/app/payments/PaymentMethodsPanel.tsx` and
  `AddBankAccountSheet.tsx` (the `.nf-pay-*` block the settings group leaves to
  the wallet family), the harness `apps/web/src/app/(dev)/preview/session-b/sweep-wallet/**`
  and the proofs `docs/design/proofs/session-b/sweep-wallet/**`.
- `apps/web/public/brand/session-b/send/**` and the `send` block of `scripts/design/session-b-crops.mjs`

### 6. Inspections (worker inspection)
- `apps/web/src/app/(app)/inspections/**`
- `apps/web/src/components/app/inspections/**`
- `apps/web/src/app/agent/inspections/**`
- `apps/web/src/lib/inspections/**`
- Governing images: `F6A8A482-657B-4836-B30A-1A0578BC3FBA.png` (root and
  `docs/design/references/`), plus anything relevant in
  `docs/design/references/founder/`.
- `apps/web/src/app/css/inspection.css` (new, imported by
  `components/app/inspections/InspectionSheet.tsx`, so `globals.css` is not
  touched; its classes are `nf-ix-*`, so the old `nf-insp-*` rules in
  `threads.css` no longer reach this surface)

### 7. THE WHOLE ADMIN CONSOLE (founder instruction, 22 September)
Session B owns **`apps/web/src/app/admin/**` in full**, every route under it,
and the admin components:
- `apps/web/src/app/admin/**` (every page, layout, loading, error, route
  component and `_components/**`, including desks that do not exist yet)
- `apps/web/src/app/css/admin.css`
- `apps/web/src/components/admin/**` if it comes to exist
- `apps/web/src/lib/admin/reads/**`: READ ONLY queries (see below)
- `apps/web/src/components/agent/charts/**`: ADDITIVE ONLY. New inline SVG
  chart files beside `AreaSparkline.tsx` and `DonutChart.tsx`, and backwards
  compatible extensions to those two; the agent console that uses them today
  must render unchanged.
- `docs/ADMIN_CONSOLE.md` (new, the operations handbook)
- Governing images: `docs/design/references/admin/` (landing now; layout,
  density and UX taken from them, never their purple palette) and the four
  admin renders at the repo root.

**READS SPLIT FROM WRITES (founder correction, 22 September, supersedes the
paragraph that stood here).**
- **Session B owns `apps/web/src/lib/admin/reads/**`.** Session B writes these
  read queries itself, owns them and waits for nobody. They are READ ONLY: they
  select and they aggregate; they never insert, update or delete, never call an
  RPC that writes, and never use the service role to get round row level
  security. Admin pages may import them directly.
- **Session A keeps everything else in `apps/web/src/lib/admin/**`**: every
  action, every mutation, every approval, every refund, every queue write, and
  the existing `*-queries.ts` files. Session B never writes a mutation and never
  calls one it did not receive from Session A. Session B does not edit Session
  A's existing query files; where one is capped or short, Session B writes its
  own read beside it in `reads/`.
- Session A is handing over whatever it had started on the read requests into
  `lib/admin/reads/` and saying so in its ledger. **Session B pulls and checks
  `lib/admin/reads/` before writing any read, and builds on what is there
  rather than duplicating it.**
- The rule underneath is unchanged: a mutation is asked for; a read is written.
- Views, functions and policies in the database are migrations, and migrations
  stay Session A's: a read that needs one is still a request.

Standing rules for the console, from the founder:
- Entering the console lands on the overview, every time, before any desk.
- Charts obey the palette and never invent a number: single series on a blue
  ramp for magnitude; one stacked status bar on the existing status four with a
  word on every segment; no charting dependency; a trend panel with no data
  behind it says so and draws nothing.
- Desktop first for the console, then narrow.

Internal split between Session B workers (for Session B's own coordination):
- admin-shell: `layout.tsx`, `page.tsx` (overview), `loading.tsx`,
  `error.tsx`, `_components/**`, `admin.css`, the chart primitives, and the
  operations, analytics, alerts, audit, notifications and scheduled-job desks,
  plus the register sweep of every admin route not listed below, the
  settings page (`app/admin/settings/**`), and its fixture harness under
  `apps/web/src/app/(dev)/preview/session-b/admin/**` (lead ruling R-G).
- admin-review: `app/admin/_review/**` (the review desks' own area
  stylesheet, presentational parts and pure helpers; no data access),
  `lib/admin/reads/listings.ts`, `moderation.ts`, `verification.ts` and their
  tests, the fixture harness under
  `apps/web/src/app/(dev)/preview/session-b/admin-review/**` (R-G), and
  listings (queue and the single listing under review),
  moderation, kyc (verification), queue, support.
- admin-money: money, escrow, supply, bookings, payments.

### 8. The welcome email (founder instruction, 22 September)
Session B owns the welcome email's DESIGN AND WORDS. Session A owns wiring the
send (`lib/notify/welcome.ts`, `welcomeOnce`, the `welcomed_at` guard, the
callers in `lib/auth/actions.ts`) and Session B does not touch any of that.
- `apps/web/src/lib/email/welcome-message.ts` (new): the welcome template moves
  here, all role versions, HTML, preheader and plain text.
- `apps/web/src/lib/email/welcome-message.test.ts` (new)
- `apps/web/src/lib/email/messages.ts`: ONLY the `welcome` function, its
  `WelcomeData` type and the helpers used by nothing else, until the move lands;
  after it, the single re-export line. **Session A: please do not edit the
  welcome template while this entry stands.** Every other message in that file
  stays yours.
- NOT `lib/email/shell.ts`, `render.ts`, `theme.ts`, `client.ts`,
  `recipients.ts`, `fixtures.ts`: shared, Session A's. Anything the welcome
  needs there is raised below as a request.
- The screen the email's button lands on is a Session B surface (`/welcome` or
  another listed above), so the tap-through feels like the email that sent it.

### 9. Art cropped from the governing renders (founder instruction, 22 September)
The founder wants the icons, objects, stages and backgrounds in the governing
images used as they are drawn, cropped from the renders and cleaned. Session B
cuts them into its own folders and does not touch the shared icon pipeline.
- `apps/web/public/brand/session-b/**` (new): every crop, per surface
  (`welcome/`, `signin/`, `wallet/`, `send/`, `profile/`, `inspection/`), with
  a `SOURCES.md` beside them naming the render, the box and the treatment.
- `scripts/design/session-b-crops.mjs` (new): the one script that cuts them. It
  may IMPORT the keying functions from `scripts/cut-icon-ground.mjs` but never
  edits it, `scripts/icon-manifest.mjs`, `public/brand/glass/**` or
  `docs/ICON_SYSTEM.md`. Session A: if you want any of these crops in the shared
  pack, say so in section 49 and Session B will hand them over.
- The claims rule applies to crops too: nothing that states a claim, and no
  lettering baked into an object (the HOTEL sign on `2A49E2F7` is retouched
  blank rather than shipped).

### 10. The platform identity: glow, glass, rim, reflection and the roles icon pack (founder instruction, 22 September)
The founder, with the `roles/` images 01, 02, 04, 05 and 06 open: the glowing,
the shine, the reflection and the lit glass in these images are THE IDENTITY
and must run across the whole platform, every area, every container; and the
icons in those images must be the platform's icons, exactly those, cropped
clean where needed. The surfaces those images draw (home, the switch sheet, the
drawer, add a workspace, the registrations, the listing wizard) are Session A's
and stay Session A's. So Session B does the two parts that do not collide and
hands them over:
- `apps/web/public/brand/session-b/roles/**` (new): every 3D glass object and
  glass icon tile in all twelve `roles/` images, cropped, keyed, cleaned, at
  their native size, with `SOURCES.md` (render, box, native size, suggested
  name, which screen uses it). No baked lettering, no claims.
- `docs/design/GLOW_IDENTITY.md` (new): the identity measured from the images,
  not described: panel fill and blur, border colour and width, the lit top rim,
  the outer glow radius and alpha, the reflection highlight, icon tile anatomy,
  the lit button (gradient stops, rim, bloom), the selected-card state, the
  progress segments, the calm info panel with its round glyph, for dark and for
  paper. Written as proposed token values.
- A preview page is NOT added to `(dev)/preview/**` (Session A's); proofs are
  screenshots under `docs/design/proofs/session-b/identity/`.
- Session B's own surfaces adopt the same recipe so the platform reads as one
  object.

**Request to Session A (identity):** adopt `docs/design/GLOW_IDENTITY.md` into
the token layer (glass panel, rim, glow, lit button, selected state) so every
area inherits it, and file the `roles/` crops into the shared pack through
`scripts/icon-manifest.mjs` and use them on the `roles/` surfaces. Session B
does not edit the tokens or the shared pack. Reply in section 49.

### Shared, additive only
- `packages/i18n/**` dictionaries: ADDING keys inside the `sessionB` namespace or
  inside the existing `wallet`, `profile`, `auth`, `welcome`, `admin` and `inspections` namespaces, in all
  four locales, by text edit. Never restructuring.
- Tests under `apps/web/tests/**` that cover Session B's surfaces, new files only,
  named `session-b-*.spec.*` or `session-b-*.test.*`.

### Proof scripts (new)
- `scripts/design/session-b-shots/**` (new files only): the screenshot and
  side-by-side scripts behind Session B's proofs, committed so the proofs can be
  re-run (R-G), including the stand-in map tile server the review proofs use
  because the sandbox cannot reach the tile hosts.

### Fixture harnesses (new)
- `apps/web/src/app/(dev)/preview/session-b/**` (new files only, behind the
  existing preview gate in `(dev)/preview/layout.tsx`, which Session B does not
  edit). Every Session B proof shot comes from a committed harness here, so it
  can be re-run. Nothing else under `(dev)/preview/**` is touched.

### Docs
- `docs/SESSION_B_SCOPE.md` (this file)
- `docs/ADMIN_CONSOLE.md`
- `docs/BUILD_SESSION_B_LEDGER.md`
- `docs/design/proofs/session-b/**` (screenshots and comparisons)
- `docs/design/proofs/session-b/CLOSING_AUDIT.md` (new): the auditor's closing gate, per surface, and the admin coverage map
- `docs/research/EXAMPLES_VISIBILITY_PROBE.md` (new): founder item 1, the read-only probe of where the example listings stopped showing

## Files Session B will never edit

Design token files (`packages/design-tokens/**`), every stylesheet not listed
above (including `globals.css`, `social.css`, `light.css`, `buttons.css`,
`glass.css`), `packages/i18n` structure, `docs/DESIGN_DIRECTION.md`,
`docs/CATALOGUE.md`, `docs/design/CATALOGUE.md`, `docs/BUILD_07_LEDGER.md`,
every handoff document, every migration, `apps/web/src/lib/admin/**` other
than `lib/admin/reads/**`, and
every listing, host, escrow or
supply file OUTSIDE `apps/web/src/app/admin/**` (the admin pages for those
areas are Session B's since the reassignment above; the user-facing and
server-side listing, host, escrow and supply code is not).

## Requests to the other session

Changes Session B needs in files it does not own. Session B has NOT made
these; it is carrying on around them.

Session B has read the other session's channel to it, `docs/BUILD_07_LEDGER.md`
section 49 (R1: no NDIC badge; R2: no Buy Airtime, Pay Bills or Swap tiles), and
agrees with both. R3 to R7 are read and acknowledged as well: the slogan is gone
with no replacement; the admin console designs its empty state as the real state
and never prints a figure the database did not return; the review queue and the
listing under review are Session B's while the lister's notification centre and
search by listing ID stay with Session A, and every fee line names whose fee it
is; the two token traps are not to be reintroduced; Operations starts from the
functions and tables R7 names. The rule in `docs/design/references/roles/README.md`
that images govern form and never claims binds every Session B worker, and every
refused render element is recorded in `docs/BUILD_SESSION_B_LEDGER.md`.

1. **Profile, Switch role.** `components/supply/ProfileSwitcher.tsx` (a supply
   file, the other session's) owns the workspace sheet and its only trigger is
   the dock button. The profile's Switch role row opens that same sheet by
   clicking the dock's own trigger (`.nf-tab__link--switch`), falling back to
   `/profile/setup` when no dock is rendered. That is a coupling to a class
   name. Request: an optional `renderTrigger(open)` prop, or an exported
   `openProfileSwitcher()` event, so the row can open the sheet directly.
   Session B will switch the row over the day it lands.
1b. **WITHDRAWN.** The profile's copy now lives in `packages/i18n` under
   `socialProfile.accountPage`, added in all four locales (ha, ig, yo are
   drafts awaiting a native speaker).
1c. **WITHDRAWN.** `tests/profile.spec.mjs` is this surface's spec; Session B
   changed its two `.nf-social-cover` selectors to `.nf-pf-cover` itself.
1d. **Profile, a page action in the app header.** On `/profile` the settings
   gear sits in the app header's row (left of the bell) so the band over the
   cover reads as one row, as `50E032EA` draws it. It is placed there by
   `profile.css` from the header's measured geometry and stacked above the
   header (z 41), because the header has no slot for a page's own control.
   Request: an optional `headerAction` slot in `AppShell` (a node rendered
   before the bell), so the gear can live inside the header's DOM and cannot
   drift if the header's gaps change. Session B moves the gear the day it lands.

### Requests from admin-money (money, escrow, supply, bookings, payments)

**WITHDRAWN AS REQUESTS, 22 SEPTEMBER.** Under the reads-split-from-writes
correction every READ below is now Session B's own work in
`lib/admin/reads/`. Session A: drop them from your queue and hand over
anything already started into `lib/admin/reads/`. Anything below that needs a
MUTATION or a MIGRATION still stands as a request and is marked so when it is
re-filed.

**Status, admin-money.** Requests 2 to 9 are written by Session B itself, read
only, through `requireAdmin()` and the admin's RLS client, with tests beside
them: `lib/admin/reads/money.ts` (`getMoneyDesk`: requests 2, 3, 4 and 5;
`getReconciliationHealth`: request 8 less the watch table), `reads/escrow.ts`
(`getEscrowDesk`: requests 6 and 7), `reads/supply.ts` (`getSupplyDesk`:
request 9), with the pure arithmetic in `reads/money-derive.ts` and the shapes
in `reads/money-types.ts`. No aggregate is taken over a capped list: every
table is paged through to the end and checked against an exact count, and past
50,000 rows the desk says its figures are floors.

What still needs Session A, because it needs a migration:

10. **MIGRATION. An admin-callable read of `private.reconciliation_watch`.**
    It holds the reconciliation job's last request, its HTTP reply and its
    verdict, which is the half of reconciliation health that caught the three
    silent weeks. The private schema is not exposed to PostgREST, so the
    money and escrow desks cannot read it. Asked for: a `security definer`
    function `public.admin_reconciliation_watch()` returning
    `{ at timestamptz, status int, verdict text }` for the newest row,
    repeating the `private.has_role(auth.uid(), 'admin' | 'super_admin')`
    check and returning nothing otherwise, EXECUTE granted to
    `authenticated` only. The panels draw `lastReply` the day it lands; the
    type already carries it.

### Requests from admin-review (listings, moderation, verification, queue, support)

AR-1 to AR-9 are WITHDRAWN under the founder's reads correction (a8a0556):
Session B wrote those reads itself, read only, in
`lib/admin/reads/listings.ts`, `moderation.ts` and `verification.ts`, through
the admin's RLS-bound client. Nothing is asked of the other session for the
review desks today. What was asked, for the record, and where it now lives:
AR-1 status counts and AR-2 review times (`getListingStatusCounts`,
`getListingReviewTimes`), AR-3 the listing by id and AR-4 the lister's role
(`getListingReviewExtras`, `getQueueRowExtras`), AR-6 reports by category
(`getReportsByCategory`), AR-7 the moderation summary
(`getModerationSummary`), AR-8 and AR-9 the verification summary and exact
counts (`getVerificationSummary`, `getSupplyRoles`). AR-5 (paging the decided
bucket of `getListingSubmissions`) is still a limit of that Session A read; the
desk says so on the tab rather than asking.

AR-10. **A decision for a held event.** `private.scan_event` holds an event
   (`events.status = 'HELD'`, a `hold_reason`, and a `risk_alerts` row) on
   payment language or an account number, and nothing can release or remove
   it: `decideHeldItem` (`lib/admin/moderation-actions.ts`) takes post, story,
   comment and bio only. Request: add `target: "event"` (RELEASE sets
   `status = 'LIVE'`, REMOVE sets `'REMOVED'` with a required reason the host
   reads word for word, an audit row, and a notification to `host_id`, as the
   other four targets do). Moderation lists held events now (read by Session B's
   `getHeldEvents`) and says under each that it cannot be decided yet.

AR-11. **An admin read of `public.blocked_terms`.** The table has row level
   security on, no policy, and no SELECT grant to `authenticated`, so the
   console cannot show the list or even that it is empty. Request: a
   `blocked_terms_select_admin` policy (`private.has_role(auth.uid(), 'admin')`
   or super_admin) with the grant, or a security definer read function. Writing
   the list stays a founder decision and is not asked for here.

AR-12. **A decision for a listing mandate.** `listing_mandates` (Track G
   migration 5) has `review_status`, `reviewed_by`, `reviewed_at` and a
   `rejection_reason` that must be 8+ characters, and `listing_mandates_staff_all`
   lets an admin write it, but nothing in `lib/admin/**` decides one. Request:
   `reviewListingMandate({ mandateId, approve, reason? })` in the shape of
   `reviewKycDocument` (reason required on refusal and sent word for word, an
   audit row, a notification to the listing's owner, and on approval setting
   `listings.mandate_verified_at`). The Listings desk shows the mandate queue
   now (Session B's `getMandateQueue`) and says under each pending mandate that
   it cannot be decided yet.

### Requests from inspection (the property inspection surface)

Session B has not made these; the surface ships the honest state around each.
Checked by read-only SQL against production on 22 September.

I1. **The room-by-room checklist, the report notes and the report photos have
   nowhere to live.** F6A8A482 draws eight ticked rows (Exterior, Interior,
   Kitchen, Bathrooms, Utilities, Appliances, Safety, Overall Condition), a
   notes field and Add Photos, all belonging to one inspection. Production has
   `inspection_requests` (state, two times, two notes, outcome) and
   `inspection_confirmations`, and no table, column or bucket for any of the
   three. The surface therefore shows the four-rung ladder the row can prove
   and the two notes read-only. Migration requested:
   ```sql
   create table public.inspection_reports (
     inspection_id uuid primary key references public.inspection_requests(id) on delete cascade,
     author_id uuid not null references auth.users(id),
     notes text check (char_length(notes) <= 2000),
     submitted_at timestamptz,
     created_at timestamptz not null default now(),
     updated_at timestamptz not null default now()
   );
   create table public.inspection_report_items (
     inspection_id uuid not null references public.inspection_reports(inspection_id) on delete cascade,
     item text not null check (item in ('exterior','interior','kitchen','bathrooms','utilities','appliances','safety','overall')),
     checked boolean not null default false,
     note text check (char_length(note) <= 400),
     checked_at timestamptz,
     primary key (inspection_id, item)
   );
   create table public.inspection_report_photos (
     id uuid primary key default gen_random_uuid(),
     inspection_id uuid not null references public.inspection_reports(inspection_id) on delete cascade,
     item text,
     storage_path text not null,
     created_at timestamptz not null default now()
   );
   ```
   RLS on all three: select for either party of the parent
   `inspection_requests` row (requester_id or lister_id = auth.uid()) and for
   admins; insert and update only while the parent is `CONFIRMED`, and only by
   a party; no update once `submitted_at` is set; no delete policy. A private
   bucket `inspection-photos` with path `<inspection_id>/<uuid>.<ext>` and the
   same party rule on `storage.objects`. A trigger on `inspection_reports`
   when `submitted_at` goes from null to a value: move the parent to
   `COMPLETED` in the same transaction (so the existing
   `notify_inspection_change` tells both sides) and refuse it unless all eight
   items are checked, which is the render's disabled-until-complete rule held
   in the database rather than only in the button. When it lands, Session B
   adds `saveReportItem`, `saveReportNotes`, `addReportPhoto` and
   `submitReport` to `lib/inspections/actions.ts` and swaps the ladder for the
   eight rows.

I1 APPLIED (Session A, 20260923135847, reply in BUILD_07 section 49septies).
   Session B's screen is switched on against it (flag `reportStorageLive`, on
   by default, `VALLO_INSPECTION_REPORTS=0` turns it off). Two follow-ups:

I1b. **`addReportPhoto({ inspectionId, storagePath, item? })` in
   `lib/inspections/actions.ts`**, as Session A offered in 49septies. It inserts
   the row into `inspection_report_photos` under the same RLS
   (`inspection_report_photos_write_party`) and returns the same refusal
   sentences as `saveInspectionReport`; the path must sit in the inspection's
   folder (`<inspection_id>/<uuid>.<ext>`). Until it lands the screen's Add
   Photos is drawn disabled with "Photos can be added once this is switched
   on." and uploads nothing (Session B writes no mutation of its own; its
   `recordReportPhoto` of 890acbde broke that rule and is deleted).

I1a. **The outcome has nowhere to go once the report closes the inspection.**
   `inspection_requests.outcome` may be written only on the move to COMPLETED
   (`guard_inspection_transition`), and with I1 that move is made by
   `private.inspection_report_submission`. `inspection_reports` has no outcome
   column, so "Inspected / Deal done / No deal" cannot be recorded when a
   report is submitted, and the screen does not draw the choice while report
   storage is on. Request: add `outcome text check (outcome in ('inspected',
   'deal_done', 'no_deal'))` to `inspection_reports`, carry it onto the parent
   in the submission trigger, and accept `outcome` on `saveInspectionReport`
   when `submit` is true.

I5. **`saveInspectionReport` clears the notes on every save that omits them.**
   Its upsert writes `notes: notes ?? null`, so ticking a room without
   resending the notes wipes them. The screen sends the current notes with
   every call, so nothing is lost today; the action should leave `notes`
   untouched when the field is absent (upsert without the column, or
   `ignoreDuplicates` then a separate update when `notes !== undefined`).
   Pinned in `lib/inspections/report-wiring.test.ts`.


   publication.** Today only `notifications` is published. The surface
   re-reads when a notification about an inspection arrives for the reader
   (`InspectionsLive`), which covers every state change because
   `notify_inspection_change` writes one to the other party; publishing the
   table itself would also cover a party who has muted that notification
   kind. `alter publication supabase_realtime add table public.inspection_requests;`
   (row visibility already follows `inspection_requests_select_party`).

I3. **The thread does not read `?attach=1`.** Add Photos links to
   `/messages/<conversation>?attach=1`, meaning "open with the photo picker
   up". `app/(app)/messages/[id]/ThreadView.tsx` (not Session B's) ignores the
   parameter, so the person lands in the thread and taps the paperclip
   themselves. Request: open the composer's attach control on arrival when
   the parameter is present.

I4. **`threads.css` carries dead `nf-insp-*` rules** (the hero, card, facts,
   ladder, notes and their light twins, roughly lines 1020 to 1400 and 1429
   to 1455) that only `InspectionSheet` used. The sheet now draws from
   `app/css/inspection.css` under `nf-ix-*`. `InspectionRows` still uses
   `nf-insp-row__state` and `nf-insp-row__controls`, so those two stay; the
   rest can be deleted by whoever owns `threads.css`.


### Requests from admin-shell (shell, overview, operations, analytics)

The overview's, operations' and analytics' READS are Session B's own work in
`apps/web/src/lib/admin/reads/overview.ts`, `operations.ts`, `analytics.ts`,
`shared.ts`, `jobs.ts` and `shapes.ts` (read only, through the operator's own
session under the admin SELECT policies, exact counts, no capped totals). The
five below cannot be done as a read, because the data is not in any table an
admin can SELECT, and each needs a MIGRATION or a WRITE in a file Session B
does not own. Until they land, each panel says "Not recorded" or names the gap
on the screen. The letters match the panel notes.

A5. **An admin-callable read of the database's own scheduled jobs.** The
    pg_cron jobs (the list is `PG_CRON_JOBS` in `lib/admin/reads/jobs.ts`,
    held equal to every `cron.schedule` in `supabase/migrations` by
    `lib/admin/reads/jobs.test.ts`, so this request never states a count that
    can drift) live in `cron.job`
    and `cron.job_run_details`, which PostgREST does not expose, and
    `public.cron_job_failures` is EXECUTE for `service_role` only. Request: a
    `security definer` function `public.admin_cron_jobs()` that repeats the
    admin role check (`private.has_role(auth.uid(),'admin') or ...'super_admin'`)
    and returns one row per job:
    `jobname text, schedule text, active boolean, last_start timestamptz,
    last_end timestamptz, last_status text, last_message text (left 200),
    runs_24h int, failed_24h int, recovered_at timestamptz`.
    Session B then lists them row by row in the Operations jobs table beside
    the seven Vercel Cron jobs; today they are one summary row drawn from the
    newest `pg-cron-watch` audit row.
A6. **Admins cannot read `public.notifications`.** NARROWED on 23 September:
    push is readable now (`push_queue_staff_read`, `push_deliveries_staff_read`)
    and Operations > Notifications counts it (`getPushActivity`). What remains
    is the in-app notifications table's volumes by kind. Its only SELECT policy is
    `notifications_select_own`. The founder's update puts "every notification
    the platform sends" on the Operations desk. Request, either: a policy
    `notifications_select_admin` (the same `has_role` check the other admin
    policies use), or better, because an operator needs volumes and not
    people's messages, a `security definer` aggregate
    `public.admin_notification_activity(p_days int)` returning
    `kind notification_kind, sent bigint, read bigint, last_sent_at timestamptz`
    per kind plus `day date, sent bigint` per day. Session B's panel
    (`NotificationActivity` in `lib/admin/reads/shapes.ts`) is built and says
    "Not wired yet" until then.
A7. **Site searches are not recorded anywhere.** PARTLY WITHDRAWN on 23
    September: `price_check_events` (migration `20260922222424_...`, admin
    SELECT policy `price_check_events_admin_read`) is the first real demand
    log, and Analytics now reads it (`getPriceCheckDemand` in
    `lib/admin/reads/analytics.ts`) for Price checks, Checks answered, Demand
    vs supply, Top areas by price checks and Price checks vs answered. What
    stays open is the render's own measure, searches of the listings: Total
    searches and Searches vs results still need a log, because a price check
    is one kind of demand and not every search. Request, unchanged: a table
    `public.search_events (id uuid, created_at timestamptz default now(),
    side text check in ('property','stays'), state_code text, city text,
    area text, intent text, results int, user_id uuid null)`, insert-only from
    the search server action (no personal data beyond the optional user id),
    an admin SELECT policy, and a 400 day retention in the existing purge job.
A8. **Listing detail views are not recorded.** Listing views and conversion
    need `public.listing_views (listing_id uuid, created_at timestamptz,
    viewer_id uuid null)` written once per viewer per listing per day from the
    listing page, with an admin SELECT policy.
A11. **Refusal reasons are free text or nothing.** PARTLY COVERED on 23
    September: the platform's own refusals of a price check carry a
    `refusal_code`, and "Top common refusals" now draws those. What stays
    open is the decline of an inspection or a reservation by a person, which
    still needs a reason chosen from a fixed list when an owner or host declines an
    inspection or a reservation (`declined_reason` as an enum or checked text:
    `price`, `incomplete_details`, `not_available`, `location_mismatch`,
    `not_suitable`, `other`) on the tables that record the decline, and the
    decline controls to offer the list.
A12. **Admins cannot read `public.account_deletion_requests`.** Its only
    SELECT policy is `account_deletion_requests_select_own`. The closing audit
    found account deletions (`SCHEDULED`, `PURGING`) on no desk. Request: a
    policy `account_deletion_requests_select_admin` (the usual
    `private.has_role` check), or a `security definer` read returning
    `status, requested_at, purge_after, started_at, completed_at, attempts,
    last_error` without `restore_code_hash`. Operations > In flight has the
    panel built and says so until then.
A13. **Admins cannot read `public.business_transfers`.** Its only SELECT
    policy is `business_transfers_select_party`. Request: a
    `business_transfers_select_admin` policy with the same role check, so
    Operations > In flight can count pending transfers and show when each
    offer expires.
A14. **Admins cannot read `public.email_outbox`.** Row security is on and it
    has no admin SELECT policy (checked in `pg_policies`, 23 September), so
    the console cannot say whether email is flowing. Request, like A12: a
    `security definer` read `public.admin_email_outbox_health()` repeating
    the admin role check and returning, without `payload` or `user_id`,
    `status, count, oldest_available_at, newest_settled_at` per status and the
    ten newest failures as `template, attempts, left(last_error, 200),
    created_at`; or an `email_outbox_select_admin` policy if the payloads are
    judged safe for operators. Operations > Notifications has the panel built
    and says "Not readable by an admin yet" until then.
R13 (answered 23 September). Session A's `email-outbox` line in
    `lib/admin/reads/jobs.ts` stays: data only, it keeps the `VERCEL_JOBS` =
    `vercel.json` equality test green, and nothing else moved. Its comment
    now records the ruling.
R14 (answered 23 September). The console mounts the shared `BackButton`
    once, in `app/admin/layout.tsx`, as the top bar's first control, so all
    23 admin routes draw it and it goes to each route's declared parent.

### Requests from email (the welcome email's design and words)

The welcome template now lives in `apps/web/src/lib/email/welcome-message.ts`
and `messages.ts` re-exports it, so nothing below is blocking: the email sends
correctly through `welcomeOnce` as it stands. These are improvements only
Session A can make, in files Session B does not own.

E1. **Greet by handle when there is no name.** `welcome()` now accepts an
    optional `handle` and greets with it only when the display name is empty
    or an email address. `lib/notify/welcome.ts` passes `{ name, role }`; it
    could also pass `social_profiles.handle` for the user when one exists. If
    it never does, the email falls back to "Hello there.", which is correct.
E2. **The shared button in `render.ts` is not lit the way the welcome's is.**
    The welcome draws its own button: gradient over a solid fallback, a
    brighter top edge (`border-top` in `--nf-brand-quiet` plus an inset
    highlight), a soft bloom by `box-shadow`, and a VML `v:roundrect` for
    classic Outlook. The catalogue's shared `button` block has the gradient and
    the solid fallback only. If every message should match, `render.ts` could
    take the same four lines; `welcome-message.ts` `litButton` is the reference.
E3. **Fixtures.** `fixtures.ts` still renders the welcome with
    `{ name: "Ada", role }`, which is enough for `shell.test.ts`. No change
    needed; noted so nobody "fixes" the welcome back into `compose()` to make
    the shell tests easier. It already passes all of them on its own document.

### Requests from wallet (wallet home and send money)

Checked by read-only SQL against production on 22 September. Session B has not
made these; the surfaces ship the honest state around each.

W1. **CLOSED by Session A in `7763ff39`** (`transferSchema` names `idempotencyKey`, `transferToUser` runs inside `withIdempotency`, `transfer-idempotency.test.ts`); the client also latches the confirm submit (`submit-guard.ts`). The original request, kept for the record: **A second tap on Send sent twice.** `SendFlow` posts an
    `idempotencyKey` minted once per mount, and `transferSchema`
    (`lib/wallet/schema.ts`) drops it, so `transferToUser`
    (`lib/wallet/actions.ts`) never sees it. The pair id is a fresh
    `randomUUID()` per call, so the database's duplicate guard (a unique
    violation on the leg references) only stops a retry of the SAME request,
    never a second submit. Request: add `idempotencyKey: idempotencyKeySchema`
    to `transferSchema`, and in `transferToUser` either wrap the movement in
    `withIdempotency` as `fundWallet` does, or derive the pair id from
    `(sender id, key)` (a v5-style hash) so a replay lands on the same two
    references and comes back `duplicate`. The confirm step's button is
    disabled while pending, which narrows the window but does not close it.
W2. **MIGRATION. Publish the ledger.** `public.wallet_entries` is not in the
    `supabase_realtime` publication, which on 22 September held `messages`
    and `notifications`. The wallet and send pages re-read on a `kind = 'wallet'`
    notification (`LiveWallet`), which covers every COMPLETED movement,
    because `private.notify_wallet_entry()` writes one. A PENDING row (a
    withdrawal hold) notifies nobody and is only seen on the next read.
    `alter publication supabase_realtime add table public.wallet_entries;`
    (row visibility already follows `wallet_entries_select_own`).
W3. **MIGRATION. A transfer's notifications do not say who.** Both legs of a
    transfer notify through the generic branch of
    `private.notify_wallet_entry()`: "Wallet credited / NGN 10,000.00 has
    landed in your wallet." and "Wallet debited / NGN 10,000.00 has left your
    wallet." A person paid by somebody deserves the name. Request: for
    `kind in ('transfer_in','transfer_out')`, read
    `metadata->>'counterparty_user_id'`, look up the display name the same way
    `displayNameFor` does, and write "{name} sent you ₦10,000.00" and "You sent
    ₦10,000.00 to {name}", href `/wallet/transactions/{id}`. Keep every other
    branch as it is.
W4. **Bank payouts do not complete in production.** The only withdrawal in the
    ledger (`rm-wd-c0426a...`, 10 August) FAILED with Paystack's "You cannot
    initiate third party payouts as a starter business". So the wallet does
    not draw Withdraw as a tile or a quick action, and the send render's Bank
    row is not drawn. This is a founder and Paystack account question, not
    code: when the Paystack business is upgraded, say so here and the tile
    comes back (the sheet is still reachable at `/wallet?action=withdraw`).
W6. **A statement row does not know who the other person is.** For the
    badge beside a counterparty name (founder item 5, B-BADGE) the wallet's
    rows and receipt need the other person's id. It is in the ledger row
    (`wallet_entries.metadata.counterparty_user_id`, written by
    `private.transfer_between_wallets`) and `toWalletEntry` in
    `lib/wallet/repository.ts` drops it. Request: carry it as an optional
    `counterpartyUserId` on `WalletEntry`, and ideally the tier from
    `public.person_badge` beside it, so `EntryRow` and `Receipt` render
    `BadgeSlot` without a read per row. Until then those two draw no badge.
W5. **Stroked glyphs the design system does not have.** The two renders draw a
    paper plane, a plus in a rounded square, a bank, a card, a scan frame, a
    shield with a tick and a padlock; `UiIcon` has none of them. They are drawn
    in `components/app/wallet/MoneyGlyph.tsx` on the same grid and stroke.
    If the design system adopts them, that file goes.
### Requests from welcome (Get started, first run)

`/welcome` is reachable signed out (the one proxy line above), `/start` is a
307 to `/welcome?next=/sign-up`, and "seen once" lives in the first-party
cookie `vallo_first_run=seen` for a stranger and in `settings.welcomeSeen` for
an account. Every landing Get started link already goes through `/start`, so
it meets first run with no change. What cannot be done from Session B's files:

SW-A1. **Auth screens: four refusal plates in the pending cyan, and one old card
    (platform sweep, auth group).** Drawn on the auth routes but in files the auth
    group does not claim: `components/auth/ForgotPasswordForm.tsx` (the refusal at
    about line 76, and the `nf-card` confirmation box at about line 52),
    `ResetPasswordForm.tsx` (about 68), `VerifyCodeForm.tsx` (about 178) and
    `EmailTakenNotice.tsx` (about 81) paint their refusals with
    `--nf-state-warning`, which in this palette is the pending cyan, in inline
    Tailwind. Request: give each refusal `className="nf-auth__alert"` (rose,
    defined in `auth.css`, the same plate the sign-in refusals use) and make the
    confirmation box the shared `Panel` (`variant="card"`). Note, not a blocker.
SW-A2. **To "shared": `.nf-field--glass` draws nothing.** `controls.css` writes
    `linear-gradient(var(--nf-well-fill), var(--nf-well-fill)) padding-box`, and
    `--nf-well-fill` is itself a gradient, so the declaration is invalid at
    computed-value time: measured `background-image: none` and a transparent
    edge on every `Field material="glass"`. Request: `var(--nf-well-fill)
    padding-box` in both the resting and the focus rule. `auth.css` states the
    material validly for the auth card until then and drops that the day it lands.
SIGNIN-1. **An unconfirmed address, answered with the way out.** `lib/auth/actions.ts`
    (Session A's) answers `email not confirmed` on sign-in with "Open the link we
    sent you", but sign-up now confirms with a CODE at `/sign-up/verify`.
    Request: in `signInWithEmail`, on that error, call `rememberPendingEmail(email)`
    and return `action: { href: "/sign-up/verify?next=<landing>", label: "Enter your code" }`
    with the message "Confirm your email first. Enter the code we sent you."
    `EmailAuthForm` already renders `state.action` inside the alert. Note, not a blocker.
W1. **Sign up meets first run the first time.** `app/(auth)/sign-up/page.tsx`
    and `app/(auth)/sign-up/email/page.tsx` (Session A's) render straight away.
    Request, at the top of each page, for a signed-out visitor:
    ```ts
    import { cookies } from "next/headers";
    import { FIRST_RUN_COOKIE, FIRST_RUN_PASSED_PARAM, firstRunHref, isFirstRunSeen } from "@/components/app/welcome/first-run-seen";
    const seen = isFirstRunSeen((await cookies()).get(FIRST_RUN_COOKIE)?.value);
    if (!seen && params[FIRST_RUN_PASSED_PARAM] !== "1") redirect(firstRunHref("/sign-up" + search));
    ```
    The `welcomed=1` escape is what first run appends when a browser refuses
    the cookie, so the two pages can never bounce a visitor between them.
W2. **Sign in, the same, for the Welcome back worker (Session B, signin).**
    `app/(auth)/sign-in/page.tsx` with `firstRunHref("/sign-in" + search)`, and
    `AuthChoices`' "What Vallo is" link to `/welcome?next=/sign-in` rather than
    `/start` (which carries sign up as the destination). Recorded here so it
    is not lost; it is Session B's own file, not a request of Session A.
W3. **The native app's first launch.** `apps/web/capacitor.config.ts` loads
    `server.url` = `CAPACITOR_SERVER_URL`, the origin, so a store install opens
    `/`, the marketing landing, not first run (`native-shell/index.html` is only
    the offline card). Request: point the shell at `/welcome` on launch, either
    by setting `CAPACITOR_SERVER_URL` to `https://<origin>/welcome` in the
    native build's environment, or by having the landing page replace itself
    with `/welcome` when `looksNative()` (`lib/native/platform.ts`) is true.
    `/welcome` is safe as the permanent start page: a signed-in person who is
    done goes straight to `/home`, and a stranger who has seen it lands on the
    three doors. Optional, same reasoning: the web manifest's `start_url`
    (`app/manifest.ts`, today `/`) for an installed PWA.
W4. **`tests/gate.spec.mjs` fails on main for reasons that are not first run.**
    Run against a production server on 22 September: eight routes in its
    PRODUCT list are open by design now (`/search`, `/listing/*`, `/rent`,
    `/around`, `/u`, `/post/*`) or redirect elsewhere (`/agents/*`), thirteen
    route segments are in neither list, and it reads `src/middleware.ts`,
    which is now `src/proxy.ts`, so it throws at the end. Session B changed
    only the `/welcome` and `/start` lines, and the public list (23 routes,
    including both) passes. Request: bring the lists up to date.
GS5. **Android's hardware back: `components/app/NativeRuntime.tsx` is not
    mounted anywhere in `src`** (22 and 23 September, `grep NativeRuntime`), so
    the back handler R14 describes never runs and Capacitor's default applies
    (the web view's history, then exit). First run is built on exactly that
    default: every slide is a history entry, so back steps to the previous
    slide. When NativeRuntime is mounted, its `goBack` asks `chooseBack`, which
    would push `/welcome`'s parent from any slide and skip the history. Request:
    in `goBack`, before `chooseBack`, if `window.history.state?.nfGsSlide` is a
    number (an in-page step), call `router.back()`. Session B changes nothing
    in that file.
GS6. **Founder's item 6 changes what `tests/signup-verify.spec.mjs` checks.**
    Its lines 166 to 172 assert `showCards={!intent.welcomeSeen}` on
    `app/welcome/page.tsx` ("a returning sign-in is not shown them again").
    The founder now wants first run shown every time it is asked for, signed in
    or not, so that line no longer exists and the check fails by design.
    Request: drop or invert that check (`/welcome` renders `showCards` for
    everybody; the device cookie `vallo_first_run` decides only the sign up and
    sign in detour).

### Requests from identity (the platform identity and the roles icon pack)

ID1. **Adopt the measured identity into the token layer.**
    `docs/design/GLOW_IDENTITY.md` is the glow, glass, rim, reflection and lit
    controls MEASURED off the `roles/` renders (02 and 04, cross-checked on 03
    and 06), each as a proposed value for dark and paper, naming the token it
    replaces or extends: `--nf-lit-ink`, `--nf-glass-lit-fill`,
    `--nf-glass-lit-edge`, `--nf-glass-lit-glow`, `--nf-container-radius`
    (12px measured against 18px today), the selected-card trio, the icon tile
    (pale glass on paper, never a dark plate), `--nf-gradient-cta`,
    `--nf-cta-edge`, `--nf-rim-primary`, `--nf-bloom-lit`, the progress row,
    the calm info panel and four text colours. Section 9 is a paste-ready CSS
    block for both themes; the proof is
    `docs/design/proofs/session-b/identity/identity-side-by-side.jpg` (render,
    built, paper). Two calls are yours and are flagged in the file rather
    than decided: the cyan top rim (the render's `#58F0FE` against the
    deliberate blue-white `--nf-rim-lit-ink`) and the page ground (the
    renders' `#000D34` against `--nf-surface-canvas` `#000612`).
ID2. **File the roles icon pack into the shared pack and use it on the
    `roles/` surfaces.** `apps/web/public/brand/session-b/roles/`: 113 objects
    and one stage, every 3D glass object and glass icon tile in the twelve
    `roles/` images, keyed with `cut-icon-ground.mjs`'s own `keyRender`, at
    native size and 256, PNG and WebP, each with a `-day` paper rendition.
    `SOURCES.md` there gives render, box, native px, the screen that uses it,
    and a ready `RENDER_CROPS` entry per object for `scripts/icon-manifest.mjs`
    (paste block at its foot). Four need a treatment the manifest pipeline
    lacks (two tick badges and one sign's lettering retouched out, one map
    ground masked): take those from the folder until the slicer can retouch.
    Checked against all 144 objects in `public/brand/glass`: none is the same
    drawing, so nothing duplicates the pack. Contact sheets:
    `docs/design/proofs/session-b/identity/roles-pack-dark.png` and
    `roles-pack-paper.png`. Reply in `docs/BUILD_07_LEDGER.md` section 49.
