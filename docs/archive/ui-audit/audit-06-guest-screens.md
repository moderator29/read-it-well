# Audit 06 — Guest-facing app screens (`apps/web/src/app/(app)/`)

> **SUPERSEDED 2026-08-09. Not a backlog, and every count in it needs re-measuring.**
> This audit grades the codebase against `00-reference-brief.md`, which is retired
> because it produced the visual overload the platform is now removing. Read the
> banner at the top of that file before acting on anything here. The current
> design and navigation work is `RECOMMENDATIONS.md` sections 2 and 3.


Yardstick: `PREMIUM_REFERENCE_BRIEF.md` §6 (Layout and screen composition) plus reference
screens 3, 4, 5 (premium real-estate app), 7/10 (chat), 8 (wallet), 12 (grouped lists).

Verdict up front: the codebase is **well-engineered and honestly written, but compositionally
conventional**. Almost every screen is `sticky app header → padded content column → stacked
`nf-card` blocks`. The reference language — immersive media hero, content sheet overlapping it
with a large top radius, pinned blurred footer with a ghost+solid CTA pair, photo-thumbnail
category chips, date/time chip sheets, designed empty states with real artwork — is present in
**one** place (`ListingGallery`'s floating circular glass controls) and absent everywhere else.

Two systemic gaps dominate everything below:
- **No loading states anywhere.** Zero `loading.tsx` files in the entire repo, zero `<Suspense>`
  boundaries in `app/` or `components/`. `.nf-skeleton` is defined at `app/globals.css:1621`
  with a shimmer keyframe and a light-theme variant — and used **zero times** in any `.tsx`.
- **No route-level error states in `(app)`.** Only the global `app/error.tsx` and
  `app/not-found.tsx` exist. Every guest route falls back to the app-wide boundary.

---

# 1. Screen-by-screen inventory

## 1.0 Shell — `components/app/AppShell.tsx`

| Aspect | What it does |
|---|---|
| Chrome | `AppShell.tsx:90-121` — `nf-glass sticky top-0 z-40` header, fixed `h-[64px]`, on **every** non-immersive route |
| Content | `AppShell.tsx:127` — `<div className="nf-shell py-8 sm:py-10">` — `nf-shell` is `max-width + padding-inline: 1.25rem` (`globals.css:2756-2766`) |
| Immersive escape hatch | `AppShell.tsx:50` — only `/assistant` and `/messages/[id]` get the full-viewport treatment |
| Tab bar | `MobileTabBar.tsx:31-33` — floating detached pill `inset-x-4 bottom-[max(0.9rem,env(safe-area-inset-bottom))]`, icon-only, `w-fit` — **this one matches the brief well** |
| Active tab | `MobileTabBar.tsx:45-56` — colour + `nf-tab-pop__pill` change only. **No expand-into-labelled-capsule**, no sliding indicator (brief §2) |

**No screen except assistant/thread can ever be edge-to-edge**, because the shell unconditionally
renders the 64px header and 1.25rem side padding above/around every page.

## 1.1 Home — `app/(app)/home/page.tsx`

- Composition: greeting `<h1>` (`:59-65`) → search form card (`:68-98`) → category rail (`:104-122`)
  → AI banner (`:126`) → recommended grid (`:130-160`) → agent promo (`:163-183`) → experiences rail
  (`:186-203`). **Conventional stacked cards. No hero media at all.**
- Category chips: `:107-118` — `nf-card` tile, `<BrandIcon>` 3D glyph, text label. **No photo
  thumbnails inside the pill** (reference 5).
- No segmented For Rent/For Sale control. No Sort pill. No Map toggle in the search bar.
- Empty state `:141-150`: icon + `"Nothing to show here yet"` + `"Once listings are approved they
  will appear in this space."` — **no CTA**.
- Search bar `:90-97`: submit is a solid pill; no map toggle, no filter icon in-bar (filter is a
  sibling `FilterLink` at `:99`).

## 1.2 Search — `app/(app)/search/page.tsx`

- Composition: nested sticky bar at `:147` `sticky top-16` — sits **below** the 64px app header,
  so the phone loses ~64px + ~180px (bar + categories + city chips + sort chips) of chrome before
  the first result.
- Categories: `:201` → `filters/CategoryTiles.tsx:57-105` — `w-[5.5rem]` cards with `BrandIcon`
  and an `ring-2` active state. **No photo thumbnails.**
- Sort: `:229-254` — a whole horizontal row of 4 sort chips, always visible. Reference 5 uses a
  single compact **Sort pill** that opens a sheet.
- View toggle: `:286` → `ViewToggle.tsx:20-42` — two `nf-chip` links inside an `nf-glass` pill.
  Correct idea, but the active state is a border/glow swap, **not a floating capsule that slides**
  (brief §5). It also lives in the results header, not inside the search bar.
- Empty state `:319-352`: `nf-story-art` BrandIcon, `"No places matched"`, one sentence, one
  primary CTA, plus an honest "N waiting without them" line. **The best empty state in the app.**
- Load more `:376`: `disabled={repo.isSeed}` — a permanently disabled button on the seed catalogue.

## 1.3 Listing detail — `app/(app)/listing/[id]/page.tsx` + `components/app/listing/*`

See §2 for the line-by-line comparison against reference 3. Inventory:
- `ListingGallery` (`:267-274`), then `mt-6 grid lg:grid-cols-[1fr_21rem]` (`:276`).
- Main column: title block (`:280-343`), About (`:346-349`), inline booking panel (`:352-354`),
  Hosted by (`:358-363`), Reviews (`:368-378`).
- Aside: sticky reserve panel from `lg` (`:382`).
- `ListingStickyBar` at `:385-393`.

## 1.4 Rent — `app/(app)/rent/page.tsx`

- `PageScene` decorative art + `PageHeader` (`:52-55`), prose (`:58-61`), safety card (`:64-75`),
  `SceneBanner` (`:77-86`), city chips (`:88-109`), then a grid of `ListingCard` each with a
  full-width "Message agent" button beneath it (`:127-140`).
- Empty state `:113-125`: icon + `"No rentals matched"` + one sentence + a **ghost** CTA that links
  back to `/rent` (the page you are already on).
- No hero. No segmented control. No sort. No filters at all on this market.

## 1.5 Checkout — `app/(app)/checkout/[bookingId]/`

- Four honest pre-states as `MomentScreen` (`page.tsx:57-127`) — unconfigured / signed-out /
  missing / unavailable. **These are genuinely well designed** (`MomentScreen.tsx:35-46`, glow +
  badge + title + description + actions).
- Summary card `page.tsx:137-189` — `<dl>` rows, then total using `nf-hero-figure` (`:178-181`)
  with `<span className="nf-hero-figure__unit">in full</span>`. **The only correct two-tone hero
  numeral in the guest app.**
- `HoldCountdown` (`:237`) — sunken panel + live clock. Good.
- `PayPanel.tsx:162-224` — two option cards in a `<ul>`, each with its own full-width button.
  **No pinned blurred footer, no ghost+solid CTA pair.**

## 1.6 Bookings — `app/(app)/bookings/`

- `PageScene` + `PageHeader` (`page.tsx:70-73`), then everything wrapped in **one** `nf-card`
  (`page.tsx:76`), then a "How booking works" 3-step strip (`page.tsx:85-102`).
- `MyBookings.tsx:269-303` — 3 tabs with a 2px sliding underline. `:305-321` — a flat `<ul>` of
  `BookingCard`. **No sticky section headers, no date grouping, no coloured context row.**
- `BookingCard` `MyBookings.tsx:55-135`: 92px thumbnail, title, status badge, location, date range,
  guests/nights, then a footer row with total + Pay now / Cancel / View details.
- Cancel sheet `MyBookings.tsx:169-235`: portalled, `rounded-t-3xl`, Escape + backdrop. **No drag
  handle, no detents** (brief §7).
- Empty state `MyBookings.tsx:322-340` — see §5.

## 1.7 Wallet — `app/(app)/wallet/`

- `PageScene` + `PageHeader` → `BalanceCard` → `WalletDeck` → `TransactionsSection` → `SecurityNote`.
- `BalanceCard.tsx:154-171` — `₦` + `<Odometer>` at `2.25rem/2.6rem` bold, kobo remainder at
  `1.25rem` in secondary. Two-tone ✅ but ~40% smaller than the design system's own
  `nf-hero-figure` (`globals.css:1767`, `clamp(2.75rem, 11vw, 4.25rem)`).
- In/out tiles `:176-193`, sparkline `:195-213`, eye toggle `:139-147`.
- `WalletDeck` — three equal glass tiles (`WalletActions.tsx:76-96` shows the same shape).
- `TransactionsSection.tsx:103-116` filter chips ✅; `:120-130` day groups; `:164-201` entry rows.

## 1.8 Messages — list, thread, new

- List (signed out): `ConversationList.tsx:73-119`, one `nf-card` with `divide-y` rows.
- List (signed in): `LiveThreadList.tsx:30-77`, same shape, but unread is a **count pill**
  (`:65-72`) where the seeded list uses a **2px dot** (`ConversationList.tsx:108-113`). Two
  different unread treatments for the same screen.
- Thread: `ThreadView.tsx` (live + seed) and a near-duplicate legacy `MessageThread.tsx`.
  `PageHeader` (`:356`), scroller (`:413-516`), safety-education card (`:519-541`), attachment
  preview (`:544-567`), composer (`:568-629`).
- `/messages/new` — a pure redirect bridge with two designed fallback cards
  (`new/page.tsx:22-53`, `:77-99`).

## 1.9 Notifications — `app/(app)/notifications/`

- Signed in: `LiveNotifications.tsx:131-193` — day-grouped under `<h2>` section labels (**not
  sticky**), rows with a tinted circular icon (`:143-148`), title/body/time, unread dot.
- Signed out: `NotificationsList.tsx:134-177` — **flat, ungrouped list**, `when` is free text
  (`"Today"`, `"3 days ago"`) rendered inside the row rather than as a trailing timestamp.
- Two different notification designs (3D `BrandIcon` at `NotificationsList.tsx:142-144`
  vs tinted stroke-icon circle at `LiveNotifications.tsx:143-148`) for the same screen.

## 1.10 Saved — `app/(app)/saved/`

- `PageScene` + `PageHeader` → count line (`SavedBoard.tsx:182-194`) → 2-col grid of the same
  `ListingCard` with an overlaid heart (`:204-214`) → undo chip in place of a removed card
  (`:217-233`). The undo-in-slot pattern is genuinely nice.
- Empty state `:157-177` — see §5.

## 1.11 Profile — `app/(app)/profile/page.tsx`

- `PageHeader` → identity card → 2/3-col grid of 7 quick-action tiles (`:88-111`), each
  `BrandIcon` + label + `nf-count-badge` + sub-label. Clean, but a plain grid, no hero.

## 1.12 Settings — `app/(app)/settings/page.tsx`

- `PageHeader` → `space-y-4` stack of 9 `Reveal`-wrapped cards (`:48-112`). Purely conventional.
  No grouped small-caps section labels across the stack (each card carries its own `nf-overline`).

## 1.13 Assistant — `app/(app)/assistant/page.tsx` → `AssistantChat.tsx`

- Immersive ✅ (`AppShell.tsx:50`), safe-area bottom ✅ (`AssistantChat.tsx:427`), empty state
  with suggestion chips (`:462-475`), streaming dots (`:547-566`), listing cards folded into
  answers (`:515-535`), circular send (`:595-597`).
- Composer is `nf-field` + one circular button; **no attachment row**, and the send glyph is
  `arrow-right` rotated `-90deg` (`:597`) rather than a real send symbol.

---

# 2. The listing detail page vs reference 3, line by line

| Reference 3 element | NaijaFinds | Verdict |
|---|---|---|
| Video/photo hero **under the status bar** | `ListingGallery.tsx:111` `-mx-5 -mt-8 sm:mx-0 sm:mt-0` — bleeds to the phone's side edges and pulls up 2rem, but `AppShell.tsx:90` still paints a 64px sticky glass header above it, and from `sm` up the gallery becomes an inset rounded box (`:116 sm:rounded-[var(--nf-radius-lg)]`) | ❌ Never under the status bar; never edge-to-edge on tablet/desktop |
| Floating circular glass back / share / save | `ListingGallery.tsx:158-165` (back) + `ListingActions.tsx:137-162` (share, save) — `h-10 w-10 rounded-full border-white/25 bg-black/45 backdrop-blur-md`, `active:scale-90` | ✅ **The one place the reference language is fully realised** |
| Content sheet overlapping the hero with a large top radius | `page.tsx:276` — `<div className="mt-6 grid …">`. A plain 1.5rem gap. **No sheet, no negative margin, no top radius, no overlap.** | ❌ P0 |
| `FOR SALE` status pill on the hero | Nothing on the hero. Badges live in a wrapped row *below* the title (`page.tsx:283-319`): Verified / Partner / Instant Book, all `nf-badge` (`globals.css:1694-1715`) | ❌ P1 |
| Huge two-tone price | `page.tsx:326-333` — `text-[1.5rem] font-bold` amount + `text-[0.875rem]` unit. That is 24px. `nf-hero-figure` exists (`globals.css:1767`) at up to 68px and is **not used here** | ❌ P0 — the brief calls two-tone display numerals "one of the strongest premium tells in the whole reference set" |
| Spec row with bed/bath/sqft icons | `ListingAmenities.tsx:74-86` — a scrolling row of `nf-chip` pills, `icon + "3 bedrooms"`. Reference 3 uses an inline icon/value/label triple row, not chips. Also **no area/sqft field exists** on the `Listing` type | ⚠️ Partial |
| Outline "Book a tour" pill | Rentals get `nf-btn--primary` "Message agent" (`RentalPanel.tsx:65-71`); stays get `nf-btn--primary` "Reserve" + `nf-btn--glass` "Message agent" (`ReservePanel.tsx:297-308`). No hairline-outline pill variant | ⚠️ Partial |
| Description with **Show more** | `ListingAbout.tsx:30-49` — real disclosure, `line-clamp-4`, `aria-expanded`, chevron rotation. Label is "Read more"/"Show less" | ✅ |
| Photo gallery with **Show all** | **Does not exist.** `ListingGallery` is a single swipe track with a `n / N` counter (`:169-177`) and dots (`:201-213`). No grid, no "Show all N photos", no lightbox/fullscreen | ❌ P0 |
| Pinned blurred footer, ghost + solid CTA pair | `ListingStickyBar.tsx:64-67` — `sticky bottom-20` (not fixed, not pinned to the edge), one `nf-card` (a glass *card*, not a footer bar), price on the left and **one** primary button on the right (`:89-107`). `lg:hidden` — desktop has no action bar at all | ❌ P0 |
| Rating chip | `page.tsx:284-294` — inline `<span>` with a star glyph and text, no chip background | ❌ P2 |
| Scroll-linked hero collapse / title into header | None. `nf-parallax-soft` is defined at `globals.css:1007-1034` with a `view()` timeline and is **used zero times** anywhere in the repo | ❌ P1 |

Additional listing-page gaps: no map/neighbourhood section, no house rules, no cancellation policy
block, no similar-listings rail, no `<h2>` "Show all reviews" action (brief §4 asks for section
headers paired with a muted trailing action — only home has one, at `home/page.tsx:133-138`).

---

# 3. Home / search chip + control audit

| Reference 5 element | Present? | Evidence |
|---|---|---|
| Category chips carrying a **real photo thumbnail** | ❌ | `home/page.tsx:112-114` and `CategoryTiles.tsx:61-63,91-93` both render `<BrandIcon>` 3D objects |
| Segmented **For Rent / For Sale** | ❌ | Nowhere. `/rent` is a separate route; `kind=rental` is one of 8 category tiles (`CategoryTiles.tsx:19-28`) |
| **Sort** pill | ❌ | `search/page.tsx:229-254` renders all 4 sorts as an always-visible chip row |
| **Map** toggle inside the search bar | ❌ | `ViewToggle` sits in the results header (`search/page.tsx:286`), not in the bar |
| Blue promo card | ⚠️ | `AiAssistantBanner.tsx:12-32` is a full-bleed image card — closest analogue, and good |
| Listing card **New** badge | ❌ | `ListingCard.tsx:203-224` has Verified / Partner / Rent / Instant only; no `createdAt` freshness signal |
| Listing card **rating chip** | ❌ | `ListingCard.tsx:238-246` — bare inline text `★ 4.8 (24)`, no chip background |
| Selected chip with a coloured ring | ⚠️ | `nf-chip--active` (`globals.css:1687-1692`) is a border + box-shadow glow, not a ring; `CategoryTiles.tsx:58` uses `ring-2` on cards |
| Next chip **bleeding off the right edge** | ✅ | `nf-scroll-x` rows with `-mx-5 … px-5` do bleed correctly (`home/page.tsx:105`, `search/page.tsx:205`) |

---

# 4. Booking / checkout flow vs reference 4

Reference 4 is a glass sheet over the hero with **horizontal date chips and time chips, a blue
selected ring, chips bleeding off-edge, and a full-width blue submit**.

What exists instead (`ReservePanel.tsx`):
- `:211-242` — two native `<input type="date">` in a `grid-cols-2`. Platform date pickers, not
  chips. On iOS this is the wheel picker; nothing about it reads as designed.
- `:250-260` — Adults/Children steppers in a bordered box. Fine, but plain.
- `:263-277` — price breakdown `<dl>`.
- `:297-308` — submit + "Message agent", full width, stacked. ✅ full-width submit.
- `:135-186` — the success state (`nf-confirm-sweep`, confirmed calendar tile, pay/pay-later
  buttons) is the most choreographed moment in the whole guest app. Genuinely good.

Missing entirely:
- No chip-based date selection, no time-slot chips, no "next 14 days" horizontal strip.
- No inspection/viewing time booking anywhere, despite "arrange an inspection" being the core
  rental flow (`page.tsx:204`, `RentalPanel.tsx:19-22`) — it dead-ends at "Message agent".
- No sheet/modal presentation: the panel is inline in the page flow (`page.tsx:352-354`).
- No **segmented progress bar** across reserve → checkout → paid (brief §6 asks for one on any
  multi-step flow). The guest crosses three routes with no positional feedback.
- Blocked dates are enforced (`page.tsx:120`, `StayDates`) but never **shown** — there is no
  calendar surface on which to grey them out.

---

# 5. Empty states — actual copy and markup

The brief: *"full-bleed illustration or photograph, a real headline, one sentence of body, and a
single primary CTA. Never a centred grey sentence."*

**None of the 12 empty states uses a photograph or a full-bleed illustration.** All use the same
`BrandIcon` 3D object at `h-16`–`h-20` inside a `nf-card`. Scored below:

| Screen | File:line | Artwork | Headline | Body | CTA | Score |
|---|---|---|---|---|---|---|
| Search no-results | `search/page.tsx:319-352` | icon | "No places matched" | ✅ 1 sentence | ✅ Clear filters / Home | **Best** |
| Saved | `SavedBoard.tsx:157-177` | icon | "Nothing saved yet" | ✅ | ✅ Explore stays | Good |
| Messages (both) | `ConversationList.tsx:56-69`, `LiveThreadList.tsx:12-27` | icon | "No conversations yet" | ✅ | ✅ Explore places | Good |
| Notifications (live) | `LiveNotifications.tsx:84-101` | icon | "You are all caught up" | ✅ | ✅ Explore places | Good |
| Bookings | `MyBookings.tsx:322-340` | icon | ❌ **none** | copy only | ✅ Explore stays | Weak |
| Bookings (seed) | `BookingsTabs.tsx:191-209` | icon | ❌ **none** | copy only | ✅ Explore stays | Weak |
| Wallet transactions | `TransactionsSection.tsx:132-144` | icon | "No transactions yet" | ✅ | ❌ **none** | Weak |
| Home recommended | `home/page.tsx:141-150` | icon | "Nothing to show here yet" | ✅ | ❌ **none** | Weak |
| Rent no-results | `rent/page.tsx:113-125` | icon | "No rentals matched" | ✅ | ⚠️ ghost CTA to the same page | Weak |
| Listing reviews | `ListingReviews.tsx:24-37` | icon | "No reviews yet" | ✅ | ❌ none | Weak |
| **Notifications (seed), filtered** | `NotificationsList.tsx:178-182` | ❌ | ❌ | — | ❌ | **Fail** |
| **Messages maintenance** | `messages/page.tsx:32-35`, `messages/[id]/page.tsx:46-49` | ❌ | ❌ | — | ❌ | **Fail** |

The two failures are literally the anti-pattern the brief names. Verbatim:

```tsx
// components/app/NotificationsList.tsx:179-181
<p className="nf-card p-6 text-center text-[0.875rem] text-[var(--nf-content-muted)]">
  Nothing here yet. Activity in this category will appear the moment it happens.
</p>
```

```tsx
// app/(app)/messages/page.tsx:32-35  (and again at messages/[id]/page.tsx:46-49)
<p className="nf-card p-6 text-center text-[0.875rem] text-[var(--nf-content-muted)]">
  Messaging is paused for maintenance. Your conversations are safe and will be back
  shortly.
</p>
```

Both are a centred grey sentence in a card. `MomentScreen` already exists
(`components/app/MomentScreen.tsx`) and is exactly the right component for both.

Also inconsistent: the bookings empty copy is duplicated verbatim in two files with different
tab keys (`MyBookings.tsx:30-34` `upcoming/completed/cancelled` vs `BookingsTabs.tsx:27-31`
`upcoming/past/cancelled`), and neither has a headline —
`"No upcoming trips yet. Your next adventure starts with a search."` is a body sentence doing a
headline's job. Reference 11's designed empty state is *"No trips yet"* as a headline with the
sentence beneath it.

---

# 6. Loading states

**There are none.**

- `find . -name "loading.tsx"` across the whole repo → **0 results**.
- `grep -rn "Suspense" app/ components/` → **0 results**.
- `grep -rn "nf-skeleton" --include=*.tsx` → **0 results**, despite `globals.css:1610-1636`
  defining `.nf-skeleton` with a `nf-shimmer 1.8s linear infinite` animation, a reduced-motion
  guard at `:1635`, and a light-theme variant at `:2983-2984`.

Consequence: every guest route is an `async` server component that blocks navigation entirely.
`search/page.tsx:118-122` awaits **three** repository calls in parallel;
`rent/page.tsx:44-48` awaits `conversationIdForListing` **once per rental in a serial `for` loop**;
`bookings/page.tsx:27` awaits three `byId` calls. On a Nigerian 3G connection the user taps a tab
and the screen simply does not change until the server responds. No skeleton, no spinner, no
optimistic shell. This is the single most damaging gap for App Store perceived quality.

Client-side, the loading vocabulary is text-swapping only:
- `ReservePanel.tsx:303` `{pending ? "Reserving your dates..." : "Reserve"}`
- `PayPanel.tsx:175-179` `"Opening the secure page..."` / `"Taking you to pay..."`
- `WalletActions.tsx:293` `{pending ? "Checking your request" : label}`
- `MyBookings.tsx:224` `{pending ? "Cancelling..." : "Yes, cancel the booking"}`

No spinner glyph, no progress fill, no button-width lock (labels change width, so buttons jump).

---

# 7. Error states

- No `error.tsx` in `(app)` or any of its sub-routes. Only `app/error.tsx` and `app/not-found.tsx`.
  A failed listing fetch, a Supabase timeout on `/wallet`, a broken `/bookings` read — all land on
  the app-wide boundary, losing the shell and any screen context.
- `notFound()` is used correctly for unknown ids (`listing/[id]/page.tsx:93`,
  `messages/[id]/page.tsx:54,56,93`) but resolves to the same global 404.
- Checkout is the exception and the model to copy: `checkout/[bookingId]/page.tsx:57-127` renders
  four distinct designed `MomentScreen` states. Nothing else in the guest app does this.
- Inline errors are raw text, not designed:
  - `ReservePanel.tsx:280-295` — a tinted box with `{state.error}` and a bare "Sign in" link.
  - `PayPanel.tsx:152-160` — `role="alert"` card with a bell icon and one sentence. Closest to designed.
  - `MyBookings.tsx:208-215` — `<p role="alert">` with a border and warning colour. No icon.
  - `WalletActions.tsx:277-284` / `FieldError` — `text-[0.75rem]` red line. No icon, no field ring.
  - `SavedBoard.tsx:235-239` — `text-[0.75rem]` red line under a card.
  - `ListingActions.tsx:165-178` — a black `rounded-full` toast pill. Nice, but bespoke to this one
    component; there is no shared toast system.
- `ThreadView.tsx:447-458` — failed message shows "Not sent. Retry". Correct behaviour, plain styling.

---

# 8. Messages / chat vs references 10 and 7

| Reference element | Present? | Evidence |
|---|---|---|
| Sent/received bubble asymmetry | ✅ | `ThreadView.tsx:429` (`rounded-br-md` blue) vs `:468` (`rounded-bl-md` glass card) |
| **Reply-quote block inside a bubble** | ❌ | Nothing in `ThreadView.tsx` or `MessageThread.tsx` supports quoting/replying. `ThreadBubble` (`:40-47`) has no `replyTo` field |
| Voice note + waveform | ❌ | Attachments are images only (`ThreadView.tsx:321-326` `accept="image/*"`) |
| **Attachment icon row** in the composer | ❌ | One button (`ThreadView.tsx:586-607`). No camera / document / location / voice row |
| Real avatars | ❌ | First letter in a tinted circle: `ConversationList.tsx:82-87`, `LiveThreadList.tsx:37-42`, `ThreadView.tsx:462-467`. No image, no fallback gradient per user |
| Avatar stacks | ❌ | Nowhere in the app |
| Unread pill | ⚠️ | `LiveThreadList.tsx:65-72` has a proper count pill; `ConversationList.tsx:108-113` has a 2px dot for the same screen |
| Pink/highlighted unread group | ❌ | No visual grouping of unread rows |
| Filter chips over the list | ❌ | The conversation list has no filters, no search, no tabs |
| Timestamp placement | ⚠️ | Inside each bubble bottom-right (`ThreadView.tsx:443-445`, `:482-484`) — every single bubble carries one, which is noisy. No day separators inside the thread |
| Circular send button | ✅ | `ThreadView.tsx:621-628` `h-11 w-11 rounded-full`. But the glyph is `arrow-right` with `-rotate-90` (`:627`), not a send/paper-plane symbol |
| Consecutive-message grouping | ❌ | Every message gets a full avatar + bubble + timestamp |
| Read receipts / delivery ticks | ❌ | Only `"Sending"` / `"Not sent"` text states |
| Typing indicator | ✅ | `ThreadView.tsx:490-515` — three breathing dots in a reply-shaped bubble, driven by a real broadcast. Excellent |
| Three-pane desktop (ref 7) | ❌ | `/messages` is a single `max-w-2xl` column at every breakpoint (`messages/page.tsx:59`). Opening a thread replaces the list |

Duplication risk: `components/app/messages/MessageThread.tsx` (318 lines) and
`app/(app)/messages/[id]/ThreadView.tsx` (633 lines) are near-identical chat implementations.
`MessageThread` appears to be dead — the route renders `ThreadView`. Two copies of the composer,
the bubble markup and the attachment preview will drift.

---

# 9. Wallet vs reference 8

| Reference 8 element | Present? | Evidence |
|---|---|---|
| Huge **two-tone** balance | ⚠️ | `BalanceCard.tsx:154-171` — two-tone is correct (₦ + whole naira bold, kobo in secondary at half size), but `2.25rem`/`2.6rem` where `nf-hero-figure` (`globals.css:1767`) would give up to `4.25rem`. The app's own hero-figure token is used on checkout but not on the wallet |
| **Dark / light button pair** | ❌ | `WalletDeck` / `WalletActions.tsx:76-96` render **three identical** `nf-card` tiles (Add money / Withdraw / Transfer). No primary/secondary contrast pair |
| Filter chips | ✅ | `TransactionsSection.tsx:103-116` — All / Money in / Money out / Pending |
| Transaction rows with icons | ✅ | `TransactionsSection.tsx:169-173` — 44px rounded-square tinted tile holding a `BrandIcon`. Matches brief §1's "tinted icon tiles" |
| **Semantic green/red deltas** | ❌ | `TransactionsSection.tsx:184` — credits get `--nf-state-success`, debits get `--nf-content-primary` (plain white/black). The brief and reference 8 use red for outflow |
| Sparkline | ⚠️ | `BalanceCard.tsx:195-213` — a bare `<polyline>`, hardcoded `stroke="rgb(56 189 248 / 0.9)"` with a drop-shadow. **No dotted grid, no gradient area fill, no axis labels, no hover readout.** The hardcoded sky-blue and the `drop-shadow` glow will look wrong on the light theme |
| Brand/provider marks at correct colour | ❌ | Bank selection is a plain `<select>` of names (`WalletActions.tsx:162-176`); no bank logos anywhere |
| Balance masking | ✅ | `BalanceCard.tsx:139-147` eye toggle. Nice touch, not in the reference |
| Number roll-up on the metric | ✅ | `<Odometer>` at `BalanceCard.tsx:164` |

Theme bug: `BalanceCard.tsx:144` (`border-white/15 bg-white/5`), `:177` and `:185`
(`border-white/10 bg-white/[0.04]`) and `TransactionsSection.tsx:169`
(`border-white/10 bg-white/[0.05]`) are all hardcoded white alphas. In the light theme these are
invisible borders on a white card — the in/out tiles and the icon tiles lose their containers.
Brief §8: "Dark and light both fully designed, not one as an afterthought."

---

# 10. Bookings / notifications lists vs reference 12

| Reference element | Bookings | Notifications (live) | Notifications (seed) | Wallet tx |
|---|---|---|---|---|
| Grouped under section headers | ❌ flat `<ul>` (`MyBookings.tsx:305-321`) | ✅ day groups (`LiveNotifications.tsx:131-136`) | ❌ flat (`NotificationsList.tsx:134`) | ✅ day groups (`TransactionsSection.tsx:120-123`) |
| Headers **sticky** | — | ❌ plain `<h2>` | — | ❌ plain `<h3 className="nf-overline">` |
| Coloured context row / category tag | ❌ | ❌ | ❌ | ❌ |
| Avatar stacks | ❌ | ❌ | ❌ | ❌ |
| Trailing timestamps | ❌ (date range is inline body text) | ⚠️ time under the body, not trailing (`:162-164`) | ⚠️ same (`:150`) | ❌ |
| Metadata row of icon+count triples | ❌ | ❌ | ❌ | ❌ |
| Status pill | ✅ `MyBookings.tsx:74` | ❌ | ❌ | ⚠️ only for non-settled (`:190-198`) |

Bookings specifically: the reference groups trips under **"This weekend"**, **"Next month"**, with
a coloured context row. `MyBookings.tsx` groups only by *status tab*, then renders an
undifferentiated list. There is no "3 nights in Lekki, in 12 days" urgency framing anywhere.

---

# 11. Image handling

- `next/image` is used in 10 files across `(app)` + `components/app`. Raw `<img>` appears 7 times,
  all justified with an eslint-disable and a comment: blob/object URLs and signed Supabase URLs
  cannot go through the optimiser (`ThreadView.tsx:436,471,547`; `MessageThread.tsx:185,208,232`;
  `AccountProfile.tsx:329`).
- **Aspect ratios are locked**, so CLS is largely controlled: `ListingCard.tsx:164`
  `aspect-[4/3]`; `ListingGallery.tsx:116` `aspect-[4/3] sm:aspect-[16/9]`;
  `MyBookings.tsx:63` fixed `h-[5.75rem] w-[5.75rem] sm:h-24 sm:w-32`.
- **Zero blur placeholders.** `grep "blurDataURL\|placeholder=\"blur\""` → 0 results repo-wide.
  Mitigated by the painted gradient + skyline SVG behind every photo
  (`ListingCard.tsx:173-184`, `ListingGallery.tsx:34-54`) — a good, branded, CLS-free substitute,
  but it pops rather than resolves.
- `priority` is set only on the gallery lead pane (`ListingGallery.tsx:138`). The home hero
  region (`AiAssistantBanner.tsx:18-26`, a 1536×1024 PNG) is **not** prioritised and is the LCP
  candidate on `/home`.
- `sizes` mismatch: `MyBookings.tsx:66` and `BookingsTabs.tsx:45` declare `sizes="128px"` for a box
  that is 92px on phones — a ~40% oversized download on the most bandwidth-sensitive device.
- **No lightbox / fullscreen gallery anywhere.** Tapping a listing photo does nothing; tapping a
  chat image does nothing.
- `PageScene.tsx:45-52` loads a 900×900 decorative PNG on Bookings, Wallet, Saved, Rent and
  Checkout — five screens each pulling a large decorative asset above the fold.

---

# 12. Scroll experience

- `Reveal` (`components/site/Reveal.tsx`) — IntersectionObserver fade-up with stagger, used on
  nearly every screen, with a correct "already on screen means already revealed" guard (`:50-55`)
  and a reduced-motion path (`:38-43`). Solid.
- `nf-gallery-kenburns` on the gallery lead pane (`ListingGallery.tsx:140`) — a slow drift. Nice.
- `nf-card--interactive` cursor-lit glass + hover Ken Burns (`globals.css:225-251`) — desktop only.
- **No parallax.** `nf-parallax-soft` with a `view()` timeline is defined at `globals.css:1007-1034`
  and used **zero times** in any `.tsx`.
- **No scroll-linked hero collapse.** The listing hero does not shrink, the title does not migrate
  into a header, the gallery does not zoom on overscroll.
- **No sticky sub-headers.** `search/page.tsx:147` is the only nested sticky, and it is a static
  block that never condenses as you scroll (it keeps its search bar + categories + cities + sorts
  at full height forever, eating ~240px of a 390px-wide phone's viewport).
- Sheets have **no drag handle and no detents** — `MyBookings.tsx:183` (cancel), `FilterDrawer.tsx:331`
  (full-screen), `ThreadOptionsSheet` — none are draggable (brief §7).

---

# 13. App Store readiness (cross-cutting)

- `viewportFit: "cover"` is set (`app/layout.tsx:104`) but **`env(safe-area-inset-top)` is used
  nowhere in the repo**. The `(app)` header at `AppShell.tsx:90` is `sticky top-0` with a fixed
  `h-[64px]`, so on a notched iPhone in a `cover` viewport its content sits partly under the
  status bar. Bottom inset *is* handled (`MobileTabBar.tsx:33`, `ThreadView.tsx:355`,
  `AssistantChat.tsx:427`).
- Touch targets: mostly fine (`min-h-11` / `h-11` used widely), but several are under 44pt:
  `ReservePanel.tsx:62,71` steppers are `h-8 w-8` (32px); `ListingActions.tsx:144,155` and
  `ListingGallery.tsx:162` are `h-10 w-10` (40px); `ListingGallery.tsx:187,196` arrows are
  `h-9 w-9` (36px, desktop-only so acceptable); `PageHeader.tsx:53` back is `h-9 w-9` on phones
  (36px) — that is the primary back affordance on nine screens.
- Haptics: no `navigator.vibrate` anywhere.
- Icon system: two families in play — `UiIcon` (stroked) and `BrandIcon` (3D objects). Mostly
  applied by a consistent rule (navigation/controls = UiIcon, content objects = BrandIcon), but
  there are hand-rolled inline `<svg>` one-offs sitting next to them:
  `ThreadView.tsx:379-393` (info circle), `:592-606` (photo), `BalanceCard.tsx:219-236` (eye),
  `FilterDrawer.tsx:136,151-154` (minus/plus). Brief §1 explicitly names this as a tell.
- No filled/outline variant switching on the tab bar — `MobileTabBar.tsx:55` changes only
  `strokeWidth` (1.8 → 2) between inactive and active.
- No symbol effects: the bell never rings, the heart never pulses on save
  (`ListingActions.tsx:157-161` just swaps a fill class), the send icon never flies.

---

# Gaps vs the reference standard — ranked, with severity

### P0 — blocks "designed by a top-tier product studio"

| # | Gap | Evidence |
|---|---|---|
| 1 | **No loading states at all.** No `loading.tsx` repo-wide, no `Suspense`, `.nf-skeleton` defined and unused | `globals.css:1610-1636` (defined); 0 usages; `search/page.tsx:118-122`, `rent/page.tsx:44-48` (blocking awaits) |
| 2 | **No content sheet overlapping the hero.** Gallery then a plain `mt-6` grid | `listing/[id]/page.tsx:267-276` |
| 3 | **Listing price is 24px single-tone.** The app's own `nf-hero-figure` (up to 68px, two-tone) is used on checkout but not on the money screen | `listing/[id]/page.tsx:326-333` vs `globals.css:1767-1783` |
| 4 | **No photo gallery grid / "Show all" / lightbox.** Swipe track + counter only | `ListingGallery.tsx:113-177` |
| 5 | **Sticky bar is a card with one CTA, not a pinned blurred footer with a ghost+solid pair**, and it vanishes at `lg` | `ListingStickyBar.tsx:64-107` |
| 6 | **Category chips carry no photo thumbnails** on either home or search | `home/page.tsx:112-114`, `CategoryTiles.tsx:61-63,91-93` |
| 7 | **Two empty states are literally a centred grey sentence** | `NotificationsList.tsx:178-182`, `messages/page.tsx:32-35`, `messages/[id]/page.tsx:46-49` |
| 8 | **Booking date selection is native `<input type="date">`**, not the chip sheet of reference 4 | `ReservePanel.tsx:211-242` |
| 9 | **No route-level error boundaries in `(app)`** — every failure loses the shell | no `(app)/**/error.tsx`; only `app/error.tsx` |
| 10 | **Hero never runs under the status bar**; a 64px glass header is welded above every guest screen, and `safe-area-inset-top` is unused repo-wide | `AppShell.tsx:90-121`; `grep safe-area-inset-top` → 0 |

### P1 — visibly short of the bar

| # | Gap | Evidence |
|---|---|---|
| 11 | No `FOR SALE`-style status pill on the listing hero | `listing/[id]/page.tsx:283-319` (badges below the title) |
| 12 | No scroll-linked effects; `nf-parallax-soft` defined and unused | `globals.css:1007-1034`; 0 usages |
| 13 | Wallet has no dark/light button pair — three identical tiles | `WalletActions.tsx:76-96`, `WalletDeck.tsx` TILES |
| 14 | Wallet debits are not semantically red | `TransactionsSection.tsx:184` |
| 15 | Sparkline is a bare polyline: no grid, no fill, no labels, hardcoded stroke that breaks in light theme | `BalanceCard.tsx:195-213` |
| 16 | Hardcoded `white/…` alphas break the light theme on four wallet surfaces | `BalanceCard.tsx:144,177,185`, `TransactionsSection.tsx:169` |
| 17 | No reply-quote blocks, no attachment icon row, no real avatars in chat | `ThreadView.tsx:40-47, 424-488, 586-607` |
| 18 | Two different unread treatments on the same Messages screen (dot vs pill) | `ConversationList.tsx:108-113` vs `LiveThreadList.tsx:65-72` |
| 19 | Two different Notifications designs for the same screen | `NotificationsList.tsx:142-144` vs `LiveNotifications.tsx:143-148` |
| 20 | Bookings list is flat — no sticky section headers, no date grouping, no context row | `MyBookings.tsx:305-321` |
| 21 | Grouped list headers exist but are not sticky | `LiveNotifications.tsx:134`, `TransactionsSection.tsx:123` |
| 22 | No segmented progress bar across reserve → checkout → paid | none |
| 23 | Active tab does not expand into a labelled capsule; no sliding indicator | `MobileTabBar.tsx:45-56` |
| 24 | No `For Rent / For Sale` segmented control; no Sort pill; no Map toggle in the search bar | `search/page.tsx:229-254, 286` |
| 25 | Search sticky bar never condenses — ~240px of permanent chrome on a phone | `search/page.tsx:147-255` |
| 26 | Four empty states have no CTA; two have no headline | `home/page.tsx:141-150`, `TransactionsSection.tsx:132-144`, `ListingReviews.tsx:24-37`, `MyBookings.tsx:322-340`, `BookingsTabs.tsx:191-209` |
| 27 | Sheets have no drag handle and no detents | `MyBookings.tsx:183`, `FilterDrawer.tsx:331` |
| 28 | `PageHeader` back button is 36px on phones — under the 44pt minimum, on nine screens | `PageHeader.tsx:53` |
| 29 | Dead duplicate chat implementation will drift | `components/app/messages/MessageThread.tsx` (318 lines, unrendered) |
| 30 | AI banner (LCP candidate on `/home`) is not `priority` | `AiAssistantBanner.tsx:18-26` |

### P2 — polish

| # | Gap | Evidence |
|---|---|---|
| 31 | Rating is bare text, not a chip, on both card and detail | `ListingCard.tsx:238-246`, `listing/[id]/page.tsx:284-294` |
| 32 | No `New` badge on listing cards | `ListingCard.tsx:203-224` |
| 33 | Send glyph is a rotated arrow, not a send symbol | `ThreadView.tsx:627`, `AssistantChat.tsx:597` |
| 34 | Hand-rolled inline SVGs beside the icon system | `ThreadView.tsx:379-393,592-606`, `BalanceCard.tsx:219-236`, `FilterDrawer.tsx:136,151-154` |
| 35 | No symbol effects (heart pulse, bell ring, send fly) | `ListingActions.tsx:157-161` |
| 36 | No blur placeholders (mitigated by painted gradients) | 0 `blurDataURL` repo-wide |
| 37 | `sizes="128px"` on 92px booking thumbnails | `MyBookings.tsx:66`, `BookingsTabs.tsx:45` |
| 38 | Loading labels change button width → layout jump | `ReservePanel.tsx:303`, `PayPanel.tsx:175-179` |
| 39 | Permanently disabled "Load more" on the seed catalogue | `search/page.tsx:376` |
| 40 | Rent empty-state CTA links back to the page you are on | `rent/page.tsx:122-124` |
| 41 | Rent market has no filters and no sort at all | `rent/page.tsx` |
| 42 | Every chat bubble carries a timestamp; no day separators in-thread | `ThreadView.tsx:443-445,482-484` |
| 43 | No haptics anywhere | 0 `navigator.vibrate` |
| 44 | Reserve steppers are 32px targets | `ReservePanel.tsx:62,71` |
| 45 | Five screens each load a 900×900 decorative PNG above the fold | `PageScene.tsx:45-52` |
| 46 | No map/neighbourhood, house rules, cancellation policy or similar-listings section on the money screen | `listing/[id]/page.tsx:276-379` |
| 47 | No inspection/viewing time booking despite it being the core rental promise | `RentalPanel.tsx:65-71` dead-ends at Message agent |

**Total: 47 findings — 10 P0, 20 P1, 17 P2.**

---

# Concrete upgrade recommendations per screen

## Shell (`AppShell.tsx`) — unblocks everything else
1. Add an `immersive`-adjacent mode, e.g. `transparentHeader`, for `/listing/[id]` (and any future
   hero screen): render no header, let the page own its own floating controls. At minimum, add
   `pt-[env(safe-area-inset-top)]` to the header at `:90` and `h-[calc(64px+env(safe-area-inset-top))]`.
2. Give the active tab a labelled capsule that springs open and a shared-layout indicator that
   slides between positions (`MobileTabBar.tsx:45-56`).
3. Ship a `<Skeleton>` primitive wrapping `.nf-skeleton` and add `loading.tsx` to **every** guest
   route, each mirroring that route's real layout (gallery block + title lines for listing; a
   3-card grid for search/home; row skeletons for bookings/messages/notifications/wallet).
4. Add `error.tsx` per route group reusing `MomentScreen` with a `Try again` action bound to `reset()`.

## Listing detail — the money screen
5. Make the gallery a true hero: full-bleed at **all** breakpoints, no `sm:rounded`, extend under
   the status bar, `min-h-[52vh]`.
6. Wrap everything after the gallery in a content sheet: `-mt-8 rounded-t-[2rem] bg-surface` with a
   1px top highlight and a soft shadow, so it visibly overlaps the photography.
7. Put a status pill on the hero (`FOR RENT` / `FOR SALE` / `INSTANT BOOK`) as a tinted glass badge
   near the bottom-left of the media, above the sheet edge.
8. Promote the price to `nf-hero-figure` with `nf-hero-figure__unit` for `/night`, `/year`,
   `/guest` — exactly as `checkout/[bookingId]/page.tsx:178-181` already does.
9. Rebuild the spec row as an icon/value/label triple strip (`🛏 3 Beds · 🛁 2 Baths · 📐 — m²`)
   with hairline dividers, not chips. Add an `areaSqm` field to `Listing` so the third slot is real.
10. Add "Show all N photos" over the gallery's bottom-right, opening a full-screen grid → lightbox
    with pinch/swipe and the same counter.
11. Replace `ListingStickyBar` with a genuinely pinned `fixed bottom-0` blurred footer carrying
    `pb-[env(safe-area-inset-bottom)]`, price on the left, and a **ghost + solid CTA pair**
    ("Message agent" ghost, "Reserve" solid). Render it on desktop too.
12. Add a scroll-linked collapse: fade the floating controls into a solid glass header and slide the
    title in once the hero passes. `nf-parallax-soft` already exists — wire it to the gallery.
13. Add the missing sections: neighbourhood map, house rules, cancellation policy, similar listings.
14. Make "Reviews" and "Photos" headers carry a muted trailing "Show all".

## Home
15. Rebuild category chips as photo pills: a 40px rounded thumbnail of a real Nigerian property
    inside a pill, label beside it, horizontal scroll with off-edge bleed.
16. Add a segmented `Stay / Rent` control above the category rail (a real Airbnb-class market
    switch), with the active segment as a floating capsule that slides.
17. Give the recommended empty state a CTA ("Browse everything") and a headline.
18. `priority` on the AI banner image.

## Search
19. Condense the sticky bar on scroll: collapse categories + cities + sorts into the bar, leaving a
    single row of `[search] [Sort] [Map] [Filters·2]`.
20. Replace the sort chip row with one `Sort · Top rated` pill opening a sheet.
21. Move the Map toggle into the search bar as a trailing segment.
22. Make `ViewToggle`'s active segment a floating capsule with its own shadow that slides.
23. Add `New` badges (from `createdAt`) and a rating **chip** on `ListingCard`.

## Booking / checkout
24. Replace the two date inputs with a horizontal date-chip strip (14 days, off-edge bleed, blocked
    dates greyed, selected chip with a coloured ring), presented in a glass sheet over the hero —
    this is reference 4 and it is the single biggest flow upgrade available.
25. Add an inspection/viewing time-slot chip row for rentals, so "arrange an inspection" is a real
    booking rather than a chat prompt.
26. Add a 3-segment progress bar across Reserve → Pay → Confirmed at the top of both routes.
27. Turn `PayPanel`'s option list into a selectable radio-card group with **one** pinned blurred
    footer submit, rather than a button per card.
28. Lock button widths during pending states.

## Bookings
29. Group trips under sticky headers ("This weekend", "Next month", "Earlier this year") with a
    coloured context row, rather than only by status tab.
30. Add a headline to every empty state ("No trips yet" / "Nothing completed yet" /
    "No cancellations") and de-duplicate `EMPTY_COPY` between `MyBookings.tsx` and `BookingsTabs.tsx`.
31. Add a countdown/urgency chip on the next upcoming trip ("In 12 days").
32. Give the cancel sheet a drag handle and a detent.

## Wallet
33. Raise the balance to `nf-hero-figure` size and keep the two-tone split.
34. Replace the three equal tiles with a dark/light pair (`Add money` solid + `Withdraw` outline)
    and demote `Transfer` to a text action.
35. Debits → `--nf-state-error`; keep credits green.
36. Upgrade the sparkline: gradient area fill, dotted grid, min/max labels, theme-aware stroke via
    a CSS var. Replace hardcoded `white/…` alphas with `--nf-border-subtle` / `--nf-glass-fill`.
37. Add a CTA to the empty transactions state ("Add money").
38. Add bank logos to the withdraw picker.

## Messages
39. Delete `components/app/messages/MessageThread.tsx` (dead duplicate).
40. Unify unread treatment on one count pill; unify the two Notifications designs on one.
41. Add reply-quote blocks (`replyTo` on `ThreadBubble`, a tinted quote strip inside the bubble).
42. Expand the composer into an attachment row (camera / photo / document / location) behind a `+`.
43. Group consecutive messages from the same sender; show one timestamp per group; add day
    separators.
44. Add real avatar images with a per-user gradient fallback; use them in the list rows too.
45. Add filter chips + search over the conversation list; three-pane it from `lg` (list + thread).
46. Replace the rotated arrow with a real send glyph and give it a fly-out symbol effect.

## Notifications
47. Replace the filtered-empty `<p>` (`NotificationsList.tsx:178-182`) with a `MomentScreen`.
48. Make day headers sticky; add a coloured category tag per row; move the timestamp to a trailing
    position; add avatar/thumbnail for message and booking notifications.

## Saved / Profile / Settings / Rent
49. Saved: add a photo-led empty state and collection/board grouping (the "board" name promises it).
50. Rent: add filters and sort; fix the empty-state CTA to link somewhere new; add a hero.
51. Settings: group cards under small-caps section labels ("Account", "Preferences", "Privacy",
    "About") with the coloured status dots the brief describes.
52. Replace the two maintenance `<p>` blocks in Messages with `MomentScreen`.

## Cross-cutting
53. Retire the hand-rolled inline SVGs into `UiIcon`.
54. Add filled/outline `UiIcon` variants and switch on active state.
55. Add symbol effects: heart pulse+fill on save, bell wiggle on new notification, send fly.
56. Add `navigator.vibrate` on primary actions behind a reduced-motion/settings guard.
57. Raise every sub-44pt control (`PageHeader` back, reserve steppers, gallery controls) to 44pt.
58. Add `placeholder="blur"` with generated `blurDataURL` for catalogue photography, or keep the
    painted gradient but crossfade the photo in over it.
59. Fix `sizes="128px"` → `sizes="(max-width: 640px) 92px, 128px"` on booking thumbnails.
