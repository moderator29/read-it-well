# Audit 07 — Agent (supplier) workspace + Admin console

Scope: `apps/web/src/app/agent/**`, `app/agents/**`, `components/agent/**`, `app/admin/**`.
Yardsticks: reference 7 (desktop SaaS three-pane inbox), 9 (project manager, neumorphic
raised cards + mini charts), 13 (health detail, segmented control + 2×2 metric grid +
gradient line chart), 14 (studio marketing — pricing/FAQ/team polish).

Headline verdict: **the back office is not an unstyled internal tool — it is genuinely
on-brand.** Every surface uses `nf-card`, `nf-glass`, `nf-chip`, `nf-badge`,
`nf-numeric`, `var(--nf-*)` tokens, and the shell chrome is a near-copy of the guest
AppShell. That is the good news and it is a real achievement.

The bad news: it is on-brand at the level of **"correct primitives, no composition"**.
Everything is a vertical stack of `nf-card` in a `max-w-3xl` column. There is no
three-pane, no designed table, no data density, no sparkline on any tile, no filters,
no sorting, no pagination, no loading skeletons, no error boundaries, and a decorative
non-functional search box in the agent top bar. Against reference 7 and 9 this reads as
**a well-themed CRUD app, not a designed workspace.** 43 findings below.

---

## 1. What exists — per surface

### 1.1 Agent shell (`components/agent/AgentShell.tsx`)

- Flex row: `AgentRail` (lg+) + `<main>` with an `nf-glass` sticky header
  (`AgentShell.tsx:37`), 60/64px tall, and a content well padded with
  `pb-[calc(2.5rem+env(safe-area-inset-bottom))]` (`:71`) — safe area is respected.
- Header carries: `BackButton`, `AgentMobileNav` hamburger, `LogoMark` (<lg),
  `AgentModePill`, a search input, `LanguageSwitcher`.
- **No `ThemeToggle`.** The guest shell has one (`components/app/AppShell.tsx:112`).
- The search input (`AgentShell.tsx:59-64`) has no `name`, no `form`, no `onChange`,
  no handler, no results surface. It is decoration.

### 1.2 Agent rail (`AgentRail.tsx` + `AgentNav.tsx`)

- 264px (`--nf-rail-width`, `packages/design-tokens/src/tokens.css:263`) solid
  `bg-[var(--nf-surface-primary)]` sidebar with a hairline right border
  (`AgentRail.tsx:30`).
- Logo → `AgentModePill` (blue dot + "Agent Mode", `AgentNav.tsx:36-52`) → 10-item
  flat nav list → `AgentIdentityCard` → `ModeSwitcher`.
- Active item = `color-mix(in oklab, var(--nf-mode-agent) 18%, transparent)` fill on a
  `rounded-[var(--nf-radius-md)]` row (`AgentNav.tsx:86-90`) — a tinted rectangle, not
  a pill and not an animated indicator.
- One badge exists: `{ href: "/agent/messages", ..., badge: 3 }` — **hardcoded**
  (`AgentNav.tsx:26`), pointing at a page that is a coming-soon stub.
- `/agent/list` and `/agent/bookings` both use `icon: "calendar-check"`
  (`AgentNav.tsx:24-25`) — two adjacent nav rows with the identical glyph.

### 1.3 Agent mobile nav (`AgentMobileNav.tsx`)

- Hamburger → full-height left drawer, `bg-black/55 backdrop-blur-sm` scrim
  (`:87`), `translate-x` slide, `inert` when closed, Escape-to-close, body scroll lock.
  Technically correct and accessible.
- It is the **only** mobile navigation in Agent Mode. There is no tab bar, no FAB,
  nothing persistent at the bottom.

### 1.4 Agent dashboard (`app/agent/dashboard/page.tsx`, `RealDashboard.tsx`)

Two dashboards. The seeded one (`page.tsx:62-322`) is the richer of the two:
- 5 `StatCard`s in an `nf-panel-sunken` well (`:83`) — genuinely nice, the sunken well
  reads like reference 6's instrument panel.
- Earnings card with `AreaSparkline`, a recent-bookings list with status badges, a
  hand-rolled `<table>` for listing performance (`:233-256`) with a phone card fallback
  (`:193-229`), `DonutChart` for booking sources, a guest-messages list with unread
  dots, and a 4-up quick-action grid.
- The real signed-in dashboard (`RealDashboard.tsx`) is **materially thinner**: 5 plain
  `Tile`s with **no delta, no sparkline, no icon tile**, a status-count list, an
  upcoming-stays list. No charts at all. The comment at `RealDashboard.tsx:8-16`
  explains why (no history to compare) — honest, but it means the real agent sees a
  visibly poorer dashboard than the demo.

### 1.5 Agent listings (`ListingsWorkspace.tsx`)

- Grouped into 4 sections (live / review / attention / drafts, `:45-50`) with
  `nf-h3` + `nf-count-badge` + a blurb. This is the closest thing in the codebase to
  reference 7's grouped sidebar and it works.
- Rows are `nf-card` with an 84px cover thumb, title, status badge, location line,
  price, photo count, an optional review-note strip, and a footer action bar.
- Actions (`:314-351`) are **bare text buttons** — `text-[0.8125rem] font-semibold
  text-[var(--nf-content-secondary)]` — including **Delete**, which is
  `text-[var(--nf-content-muted)]` (`:345`), i.e. the destructive action is the
  *quietest* thing in the row.
- `ConfirmSheet` (`:117-237`) — portal, Escape, scroll lock, focus, safe-area padding,
  error + unmet-requirements list. Solid.
- Designed empty state at `:367-385`.

### 1.6 Agent bookings (`BookingsWorkspace.tsx`)

- Chip tab row (`:378-398`) with `nf-chip--active` and a count per tab. Not a segmented
  control with a sliding capsule (reference 13) — four independent chips.
- Booking cards carry dates, guest composition, waiting/hold-release copy, settlement
  state, total, and accept/decline buttons.
- `DecisionSheet` (`:62-211`) with a required decline reason, three suggestion chips,
  field error, and error alert. Good.
- Per-tab designed empty states with a `BrandIcon` at 80px (`:423-435`).

### 1.7 Agent earnings (`EarningsWorkspace.tsx`)

- 4 `Tile`s (icon / label / value) — **no trend, no delta, no chart anywhere on the
  earnings page**. The `AreaSparkline` component exists and is used only on the seeded
  dashboard.
- Month breakdown as a hand-rolled `<table>` (`:124-145`) + phone card fallback.
- Designed empty state (`:71-86`); unreadable state is a single warning paragraph
  (`:59-69`).

### 1.8 Agent list wizard (`app/agent/list/ListingWizard.tsx`, 1308 lines)

- **Segmented progress bar at the very top** (`:679-698`) — 7 equal-width 1.5px
  segments filled with `var(--nf-gradient-agent)`. This is exactly what the brief asks
  for and is the best progress design in the repo.
- Step name as an `aria-live` `<h1>` + `n / 7` counter (`:704-711`).
- Autosave to server + `localStorage`, with a "saved at HH:MM" line (`:1273-1277`).
- Sticky bottom action bar (`:1280`) — but `bg-[var(--nf-surface-primary)]`, **solid,
  not blurred**, and it correctly offsets by `lg:left-[var(--nf-rail-width)]`.
- Success uses the shared `MomentScreen` (`:655-670`).

### 1.9 Apply flow (`components/agent/ApplyWizard.tsx`, `app/agents/apply`, `app/agents/status`)

- `ApplyWizard` stepper (`:195-231`): 6 numbered circles, gradient fill when
  done/current, tick icon on done, connector lines that colour in, desktop captions,
  a phone-only current-step caption. Good, though it is a dot-stepper not a segmented
  bar (inconsistent with `ListingWizard`).
- `UploadZone` (`:473-543`) — dashed 4:3 drop zone, live preview, "Uploading…" scrim,
  an "Uploaded" verified pill, per-slot error. Genuinely well thought through.
- **Validation is submit-only.** `err` comes from `useActionState` on the server action
  (`:68`, `:188`); there is no per-step gate. You can click Next through all six steps
  with an empty form and only learn on submit — and the errors then live on steps you
  have navigated away from (fieldsets are `hidden`, `:245`, `:282`, …), so a field error
  can render in a `hidden` fieldset and be invisible.
- Hardcoded English inside a fully-i18n'd app: `:132`, `:166`, `:177`, `:183` (upload
  errors), `:321-323` (privacy note), `:389` ("Finishing your uploads…"),
  `:516` ("Uploading..."), `:524` ("Uploaded").
- `app/agents/status/page.tsx` is the **best-designed screen in this whole scope**:
  hero reference numeral in `nf-numeric` at 1.75rem with tracking (`:99`), a real
  3-stage vertical timeline with rail segments and done/current/upcoming dot states
  (`:123-189`), staged `nf-rise` animation delays (`:96`, `:120`, `:203`).
- `app/agents/page.tsx` (pitch) — has ~10 hardcoded English strings for step blurbs and
  the FAQ (`:36-66`), acknowledged in its own header comment (`:25-27`).

### 1.10 Admin console (`app/admin/**`)

- `layout.tsx` — server-side access gate, then the identical rail+glass-header shell as
  Agent Mode (`:49-95`). `AdminPill` marker (`:99-112`). Queue counts fetched once and
  passed to both nav form factors as badges (`:35-46`).
- `AdminRail` (`AdminNav.tsx:28-71`) — 8 flat items, `UiIcon` at 18px, active =
  `bg-[color-mix(in_oklab,var(--nf-brand-primary)_22%,transparent)]`, count badge as a
  solid brand-blue pill. `AdminTabs` (`:73-114`) — horizontal `nf-scroll-x` chip strip
  below lg with the same counts.
- `_components/ui.tsx` — a real shared kit: `statusTone()` (`:25-46`), `TONE_STYLE`
  (`:48-57`), `StatusChip`, `QueueHeader`, `QueueEmpty`, `QueueUnavailable`,
  `DetailRow`, `DetailSection`, `CheckRow`. Bound to locale via `adminUi(t, locale)`.
  This is the strongest piece of system thinking in the console.
- `_components/AdminActions.tsx` — one shared `ActionSheet` (`:51-185`) for every
  decision: portal, Escape, scroll lock, focus, `role="dialog" aria-modal`, optional
  required notes textarea, `role="alert"` error, pending label, and a **success state
  rendered in-sheet** (`:115-127`). This is well above average.
- Queue pages: `page.tsx` (6-tile overview), `flags`, `alerts`, `reports`, `agents`,
  `listings`, `support`, `switches` — all the same shape: `QueueHeader` → open list →
  "recently decided" list, each item an `nf-card` `<li>`.
- `AccessScreen.tsx` — centred `nf-card`, logo, tinted circular key icon, three honest
  refusal variants, primary CTA + quiet secondary link. Designed, not embarrassing.

---

## 2. Gaps vs the reference standard

### P0 — ship blockers for "designed by a top-tier studio"

**P0-1 · The admin is a sidebar + single-column card feed, not a three-pane.**
Reference 7 is icon rail → list pane → detail pane. Every admin queue is
`<div className="mx-auto max-w-3xl">` with a `<ul className="space-y-3">` of full
detail cards: `admin/agents/page.tsx:194`+`:200`, `admin/listings/page.tsx:194`+`:200`,
`admin/flags/page.tsx:173`+`:179`, `admin/alerts/page.tsx:101`+`:107`,
`admin/reports/page.tsx:100`+`:106`. On a 1440px monitor a reviewer sees one 768px
column of stacked mega-cards with ~half the screen empty. `admin/agents/page.tsx`
renders **every field of a six-step application** (`:61-152`, five `DetailSection`s,
~18 `DetailRow`s) inline for *every* card in the list — scrolling past three pending
applications means scrolling past ~60 detail rows.

**P0-2 · Support is the one page that tries two panes and gets the order backwards.**
`admin/support/page.tsx`: the selected ticket's detail renders at `:113-183`, i.e.
*above* the list at `:185-225`. Selecting a ticket is a `<Link href="?ticket=id">`
(`:40`) — a full server navigation on a `force-dynamic` page with no loading state, and
the reader is then scrolled to a detail block sitting on top of the list they came
from. That is not a list/detail pane, it is an accordion in the wrong order.

**P0-3 · There is no designed table anywhere, in either surface.**
`grep table app/globals.css` returns zero table rules. The two real tables are
hand-rolled: `agent/dashboard/page.tsx:233-256` and
`agent/earnings/EarningsWorkspace.tsx:124-145`. Both are:
`<table className="w-full min-w-[34rem] text-left text-[0.8125rem]">` with a `<thead>`
of uppercase muted `<th>` and `<tr className="border-t border-[var(--nf-border-subtle)]">`.
Missing versus the brief: sticky header, zebra/hairline system, row hover, row click
target, sortable headers, density control, pagination, column alignment tokens, and any
empty-table state. `nf-numeric` *is* applied per-cell (good) but by hand on every
`<td>`, which will drift.

**P0-4 · No loading states anywhere in the back office.**
`find app/agent app/agents app/admin -name loading.tsx -o -name error.tsx -o -name
not-found.tsx` → **zero results**. Every admin queue is `export const dynamic =
"force-dynamic"` (`admin/page.tsx:9`, `agents/page.tsx:14`, `listings/page.tsx:14`,
`flags/page.tsx:15`, `alerts/page.tsx:14`, `reports/page.tsx:14`, `support/page.tsx:16`,
`switches/page.tsx:15`) and every one of them awaits a Supabase round-trip before
painting anything. The result is a dead white/black screen on every navigation, then a
hard content pop. The brief explicitly asks for "skeleton shimmer → content crossfade".
Same for the agent workspace: `agent/listings`, `agent/bookings`, `agent/earnings` all
await DB reads on the server with no `loading.tsx`.

**P0-5 · No error boundary in either surface.**
No `error.tsx` in `app/agent`, `app/agents` or `app/admin`. `QueueUnavailable`
(`ui.tsx:158-175`) handles *query* failure gracefully, but any render-time throw in a
client workspace (`ListingsWorkspace`, `BookingsWorkspace`, `AdminActions`) escapes to
the root boundary and drops the operator out of the console entirely.

**P0-6 · The agent top-bar search is fake.**
`AgentShell.tsx:59-64`: `<input type="search" aria-label={t.common.search}
placeholder="Search bookings, my listings" className="nf-field hidden !py-2 pl-9
sm:block sm:max-w-md" />` — no `name`, no `form`, no `onChange`, no `onSubmit`, no
results UI. It is a prop that looks like a feature. Shipping a decorative search field
in a supplier tool is a credibility failure, and App Review has rejected apps for
non-functional visible controls.

**P0-7 · Hardcoded fake notification badge.**
`AgentNav.tsx:26`: `{ href: "/agent/messages", label: ..., icon: "chat", badge: 3 }`.
Every agent sees a permanent "3" on Messages. Messages is an `AgentComingSoon` stub
(`app/agent/messages/page.tsx:10`). Tap the badge, get "In development."

### P1 — visibly below the bar

**P1-8 · No rail tooltips, no active pill, no grouped sections, no status dots.**
Reference 7 asks for all four. `AgentNav.tsx:76-104` and `AdminNav.tsx:47-64` are flat
`<ul>`s of full-width rows. No `title`, no tooltip component, no `<section>` grouping
with small-caps labels, no coloured leading dot per destination. `ADMIN_NAV`
(`_components/nav.ts:22-31`) has 8 items in a deliberate work order (safety → supply →
human → switches, per its own comment at `:5-8`) and **that grouping is documented in
prose but never rendered**.

**P1-9 · Agent Mode has no mobile tab bar — a straight downgrade from the guest app.**
Guest: `components/app/MobileTabBar.tsx:31-33` — `nf-tabbar fixed inset-x-4
bottom-[max(0.9rem,env(safe-area-inset-bottom))] mx-auto w-fit`, a floating detached
pill with `nf-tab-pop__pill` sliding indicator and `nf-tab-pop-in` spring animation
(`globals.css:2088-2128`). Agent: a hamburger drawer (`AgentMobileNav.tsx:57-69`).
Agents are the users **most** likely to be on a phone. The justification in the header
comment (`:24-27`) — ten destinations won't fit five slots — is sound reasoning for the
wrong conclusion: the answer is 4 tabs + "More", not zero tabs. Admin is worse: a
horizontal scrolling chip strip (`AdminNav.tsx:85-112`) with no persistent anchor.

**P1-10 · No theme toggle in either back-office shell.**
`AppShell.tsx:112` renders `<ThemeToggle />`. `AgentShell.tsx:38-68` and
`admin/layout.tsx:70-80` do not. An agent who set light mode in the guest app carries it
over via the root, but has no control inside the workspace, and there is no evidence
either surface was reviewed in light mode — `nf-panel-sunken` is a hard
`linear-gradient(180deg, rgb(0 0 0 / 0.5), rgb(0 0 0 / 0.68))` (`globals.css:1825-1832`)
with a light override at `:3109`, and the agent rail/admin rail are opaque
`--nf-surface-primary` rather than glass.

**P1-11 · StatCard is missing three of the four premium tells.**
`components/agent/StatCard.tsx:36-74` against references 9 and 13:
- Big value: `text-[1.25rem] ... sm:text-[1.375rem]` (`:50`). That is 22px. Reference 13
  and 8 use a display numeral. `nf-hero-figure` exists (`globals.css:1808`+,
  `clamp(2.75rem, 11vw, 4.25rem)`, tabular, `-0.03em` tracking) and is used in **exactly
  one file in the repo** — `app/(app)/checkout/[bookingId]/page.tsx`. Never in the
  agent workspace.
- **Two-tone value: absent.** `₦12.4M` renders as one uniform string; there is no muted
  secondary span for the unit/decimal. The brief calls this "one of the strongest
  premium tells in the whole reference set."
- Trend delta: **present and good** — arrow path flips direction (`:59-61`), colour is
  `--nf-state-success` / `--nf-state-error` (`:57`), sign is explicit (`:67`).
- **Sparkline: absent.** No mini chart on any tile.
- Tinted icon tile: **partial.** `<BrandIcon name={icon} fill />` (`:44`) is a filled
  illustrated object, not a rounded-square container with a low-opacity tint of the
  icon's own colour. `nf-icon-tile` (`globals.css:384-408`) is applied inside
  `BrandIcon` (`design-system/icons/BrandIcon.tsx:166`) but it is a *3D tilt* utility,
  not a tint container.

**P1-12 · The real dashboard is poorer than the demo dashboard.**
`RealDashboard.tsx:18-49` `Tile` has no delta, no sparkline, no chart. The signed-in
agent gets 5 flat numbers and two lists; the seeded visitor gets sparkline + donut +
performance table (`dashboard/page.tsx:123-300`). Whatever the data honesty argument,
the *designed* experience must not be the one nobody sees.

**P1-13 · Charts are minimum-viable.**
`AreaSparkline.tsx` — gradient fill (`:49-52`) ✓, line ✓, end dot ✓. Missing: **any
axis, any gridline, any hover/tooltip, any point markers, any value labels**. Worse,
`preserveAspectRatio="none"` (`:43`) means the stroke is non-uniformly scaled — mitigated
by `vectorEffect="non-scaling-stroke"` (`:62`) for the line but the gradient area is
still stretched. And `<linearGradient id="nf-spark-fill">` (`:49`) is a **hardcoded
non-unique DOM id**; two sparklines on one page collide.
`DonutChart.tsx` — segments, gap, centre total, legend with %, colour-independent labels
(`:62-75`). Solid but static: no hover, no segment highlight, no animation.
Reference 13's pink line chart has a labelled axis and a soft gradient fill; reference 8
has a dotted grid. Neither exists here. There is no bar chart, no progress-ring, no
multi-arc gauge, no "heart-rate-zone" style mini progress-bar row.

**P1-14 · Destructive actions have no destructive *button* design.**
There is no `nf-btn--danger` in `globals.css` (only `--primary`, `--glass`, `--ghost`,
`--lg`, `:1372-1446`). So destruction is faked two ways:
- `AdminActions.tsx:167-171` — `className="nf-btn nf-btn--primary"` with
  `style={{ background: "var(--nf-state-error)", boxShadow: "none" }}`. The inline
  override kills the primary's shadow *and* leaves the `::after` sheen (`:1381`)
  painting a blue-tinted gradient over a red button.
- `AdminActions.tsx:398`, `:498`, `:720` — `nf-btn nf-btn--glass` with
  `style={{ color: "var(--nf-state-error)" }}`. Red text on a neutral glass pill, no
  red border, no red tint. "Reject", "Switch off" and "Cancel" are visually the same
  weight.
- Agent delete is worse: `ListingsWorkspace.tsx:342-349` — a bare text button in
  `text-[var(--nf-content-muted)]`, i.e. the *lowest* contrast element in the row.

**P1-15 · Four different mechanisms for one status pill.**
1. `admin/_components/ui.tsx:48-57` `TONE_STYLE` + `statusTone()` — the good one.
2. `agent/listings/ListingsWorkspace.tsx:54-67` `toneStyle()` — a near-identical
   reimplementation reading `STATUS_TONE` from the schema.
3. `agent/bookings/BookingsWorkspace.tsx:47-56` `statusBadgeClass()` — uses the CSS
   classes `nf-badge--warning` / `nf-badge--success` instead.
4. Raw inline objects: `agent/dashboard/page.tsx:172-177`,
   `RealDashboard.tsx:222-232`, `agents/status/page.tsx:105-110`.
Only `--success`, `--brand`, `--warning` exist as badge modifiers (`globals.css:1704-1714`);
there is no `--danger` or `--info`, which is *why* everything falls back to inline style.

**P1-16 · No filters, no sort, no search, no pagination on any admin queue.**
Every list is server-rendered whole, then hard-truncated: `lib/admin/queries.ts:122`
`.limit(40)`, `:217` `.limit(50)`, `:261` `.limit(50)`, `:440` `.limit(30)`,
`:713` `.limit(50)`, `:749` `.limit(100)`. Nothing in the UI says "showing 40 of N".
An operator cannot filter flags by reason, sort applications by age, or search a
ticket by reference. Reference 7 puts filter chips at the top of the list pane.

**P1-17 · Per-step validation missing in `ApplyWizard`.**
`ApplyWizard.tsx:383-386` — Next is `onClick={() => setStep(s => Math.min(last, s+1))}`
with no gate. Errors only arrive from the server on submit (`:68`, `:188`) and render
inside `hidden` fieldsets (`:245`, `:282`, `:290`, `:306`, `:327`) — the applicant can
be told "there is an error" with nothing visible. `ListingWizard.tsx:426` does gate
step 0 on `titleIssue`, so the two wizards in the same product behave differently.

**P1-18 · Two wizards, two different progress designs.**
`ListingWizard.tsx:679-698` = 7 segmented bars (matches the brief).
`ApplyWizard.tsx:195-231` = 6 numbered circles + connectors. Same product, same flow
shape, different visual language.

**P1-19 · No optimistic/inline save state on admin decisions.**
Every action is `startTransition` → `router.refresh()` (`AdminActions.tsx:93`,
`:654`, `:708`). The button shows `common.working` but the underlying card does not
dim, lock, or animate out, and after refresh the item silently vanishes from the list
with no toast, no undo window, no "moved to Recently decided" transition.

**P1-20 · `AgentComingSoon` hardcodes English in a trilingual app.**
`AgentComingSoon.tsx:44` "In development", `:48-50` "This part of the agent workspace is
being built. The navigation is final, so this destination is reserved and will fill in
shortly." A Hausa- or Yoruba-speaking agent hits five of ten destinations in English.

**P1-21 · Five of ten agent destinations are stubs.**
`app/agent/{messages,reviews,analytics,verification,settings}/page.tsx` are 11-line
`AgentComingSoon` wrappers. Half the rail is furniture. For App Store submission this
is a functionality-completeness risk in its own right, independent of design.

### P2 — polish

**P2-22 · Sticky action bar is solid, not blurred.** `ListingWizard.tsx:1280`
`bg-[var(--nf-surface-primary)]` — the brief asks for blurred pinned footers
(§3, §5). The `nf-glass` class is right there and used in both shell headers.

**P2-23 · Duplicate nav icon.** `AgentNav.tsx:24-25` — `calendar-check` for both
"List apartment" and "Bookings".

**P2-24 · Admin nav icons are generic re-use.** `nav.ts:24` uses `chat-bubble` for
*Flags*, `:26` `search` for *Reports*, `:30` `key` for *Switches*. Reference 1 asks for
a coherent purpose-built symbol set with filled/outline state variants; here inactive
and active render the identical glyph at identical weight (`AdminNav.tsx:57`).

**P2-25 · Sparkline gradient id collision.** `AreaSparkline.tsx:49`
`id="nf-spark-fill"` is a module constant. Two instances on one page = one gradient
wins.

**P2-26 · Reviewer thumbnails are unconstrained raw `<img>`.**
`admin/listings/page.tsx:102-108` — `h-24 w-32 object-cover` in an `nf-scroll-x` strip,
no lightbox, no click-to-enlarge, no count. A reviewer approving a listing on photo
quality gets 96×128px crops with no way to see the full image.

**P2-27 · `QueueEmpty` / `QueueUnavailable` are the "centred grey sentence" the brief
warns against.** `ui.tsx:137-152` and `:158-175`: a 48px tinted circle, a bold line, a
muted line. Correct information, zero design. The brief asks for a full-bleed
illustration/photograph, a real headline and a single primary CTA. `QueueEmpty` has
**no CTA at all**. Compare `ListingsWorkspace.tsx:367-385` and
`BookingsWorkspace.tsx:423-435`, which do have an 80px `BrandIcon` and a CTA — the
agent side got a better empty state than the admin side.

**P2-28 · `AgentComingSoon` is decent but generic.** `AgentComingSoon.tsx:31-54` —
blurred gradient halo behind a 72px `BrandIcon` (`:33-40`), "In development" tag pill,
`nf-h2`, a sentence, a ghost CTA back to the dashboard. Not embarrassing. But it is
identical for all five stubs; there is no preview of what is coming, no "notify me",
no ETA, no illustration specific to the surface.

**P2-29 · `AccessScreen` doesn't use the shell.** `AccessScreen.tsx:46` renders its own
bare `<main className="flex min-h-dvh items-center justify-center">` with no aurora, no
`LivingCanvas`, no theme toggle, no footer — where the guest app's equivalent moments
sit on `nf-aurora` (cf. `agents/apply/page.tsx:27`).

**P2-30 · No avatar anywhere in the admin.** Reference 7's list rows are avatar-led.
`admin/agents/page.tsx` renders an applicant's full six-step file with **no photo of
the person**, `admin/support/page.tsx:53-58` shows a name as plain text. The agent side
does have `AgentIdentityCard` (`AgentNav.tsx:114-141`) with a gradient initial circle —
that pattern is never reused in the console.

**P2-31 · No avatar stacks, no timeline, no calendar strip in the agent workspace.**
Reference 9's project manager leans on avatar stacks, a day-strip calendar and a
timeline schedule. `agent/bookings` — the one surface that is *literally a schedule* —
renders a flat card list with no calendar view, no month strip, no timeline.

**P2-32 · Bookings tabs are chips, not a segmented control.**
`BookingsWorkspace.tsx:378-398` — four independent `nf-chip`s. Reference 13's Day/Week/
Month/Year is a segmented control whose active capsule *slides*. No indicator, no
animation, no shared track.

**P2-33 · `nf-panel-sunken` used once.** `dashboard/page.tsx:83` and
`RealDashboard.tsx:99` and `admin/page.tsx:63`. It is the single best surface effect in
the back office and it appears three times; earnings tiles
(`EarningsWorkspace.tsx:92`) are a bare `grid` with no well.

**P2-34 · Admin overview tiles say "Open"/"Clear" in hardcoded English.**
`admin/page.tsx:80-82` — `{value > 0 ? "Open" : "Clear"}`, and `:52`
`title="Total open across every queue"`. Everything else on that page is dictionary-driven.

**P2-35 · `nf-tag-pill` misuse on the overview.** `admin/page.tsx:80` — a queue with
work gets the *default brand-blue* `nf-tag-pill`, a clear queue gets
`nf-tag-pill--success`. So "6 flags waiting" reads as calm brand blue and "nothing to
do" reads as urgent green-adjacent. `--warning` exists (`globals.css:1809`) and is the
correct token for an open queue.

**P2-36 · No density control, no saved views, no keyboard shortcuts** in a console whose
entire job is repetitive triage. Reference-7-grade inboxes have `j`/`k`, `e` to archive,
and a compact/comfortable toggle.

**P2-37 · No bulk actions.** Every decision in `AdminActions.tsx` is single-item. Ten
identical spam flags = ten sheets, ten notes, ten refreshes.

**P2-38 · `ActionSheet` has no focus trap.** `AdminActions.tsx:75` focuses the panel
once; Tab can then walk out of the dialog into the page behind it. Same in
`ListingsWorkspace.tsx:134` and `BookingsWorkspace.tsx:80`. `aria-modal="true"` is set
but not enforced.

**P2-39 · No reduced-motion audit on the back office.** `nf-rise` /
`nf-card-in` have reduced-motion handling in CSS, but the ApplyWizard stepper transition
(`:210` `transition-colors`), the drawer `transition-transform duration-300`
(`AgentMobileNav.tsx:95`) and the sheet `nf-rise` (`AdminActions.tsx:113`) are not
gated in component code.

**P2-40 · `.nf-field` on `<select>` gets inline `background` per `<option>`.**
`ApplyWizard.tsx:455-458` — `style={{ background: "var(--nf-surface-elevated)" }}` on
every `<option>` is a browser workaround leaking into markup; there is no styled
select primitive in the design system.

**P2-41 · Admin has no audit-log view.** `admin/layout.tsx:63-65` promises
`t.admin.console.auditNote` in the rail footer, and eight pages end with
`common.inAuditLog` (`agents/page.tsx:163`, `listings/page.tsx:163`,
`flags/page.tsx:144`, `reports/page.tsx:60`, `alerts/page.tsx:72`). The log itself has
no destination in `ADMIN_NAV` (`nav.ts:22-31`).

**P2-42 · Overview has no trend, no sparkline, no time context.**
`admin/page.tsx:84-91` — six raw integers at `text-[2rem]`. No "up 4 since yesterday",
no 7-day sparkline, no median-age-of-oldest-item. Reference 9 puts a mini chart on
every raised card.

**P2-43 · `agents/page.tsx` pitch page ships hardcoded English marketing copy.**
`:36-41` step blurbs, `:50-66` the entire FAQ. This is the public recruitment page for
suppliers and it is the least-designed content in the flow relative to reference 14
(which has an FAQ *accordion* with chevron rotation, a team grid, testimonial cards,
and a segmented pricing switcher).

---

## 3. Concrete upgrade recommendations

Ordered by ratio of perceived-quality gain to effort.

### 3.1 Build the three-pane console (fixes P0-1, P0-2, P1-8, P1-16, P2-30, P2-36)

Replace `mx-auto max-w-3xl` on all seven queue pages with a shared
`<AdminWorkbench>` layout:

```
grid: [72px icon rail] [minmax(320px, 380px) list pane] [1fr detail pane]
```

1. **Icon rail** — collapse `AdminRail` to 72px icon-only at `xl`, keep the 264px
   labelled rail at `lg`. Add a `title`-backed tooltip component (delayed, positioned
   right, `nf-glass`). Active state becomes a `rounded-full` pill with the brand fill
   *plus* a 3px leading indicator bar. Render `ADMIN_NAV` in the three groups its own
   comment already describes (`nav.ts:5-8`) under small-caps
   `text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--nf-content-muted)]`
   labels — SAFETY / SUPPLY / PEOPLE / SYSTEM — each row carrying a 6px coloured status
   dot (red for flags/alerts, amber for review queues, blue for tickets).
2. **List pane** — one compact row per item: avatar or type glyph, title, `StatusChip`,
   relative age right-aligned, unread dot. `overflow-y-auto`, its own sticky header with
   filter chips (status, age, reason) and a search field. Selection is client state, not
   a `?ticket=` navigation.
3. **Detail pane** — everything `ApplicationCard` / `ListingCard` currently renders
   inline, moved here, with the decision buttons in a **blurred sticky footer**
   (`nf-glass`) at the bottom of the pane.
4. Below `lg`, degrade to the current single column with list → detail as a route push.

This one change is the difference between "internal tool" and reference 7.

### 3.2 Ship a real table primitive (fixes P0-3)

Add to `globals.css`:

```css
.nf-table { width:100%; border-collapse:separate; border-spacing:0; font-variant-numeric: tabular-nums; }
.nf-table thead th { position:sticky; top:0; z-index:1; background:var(--nf-surface-primary);
  backdrop-filter: blur(var(--nf-glass-blur-soft));
  font-size:var(--nf-text-overline); text-transform:uppercase; letter-spacing:.06em;
  color:var(--nf-content-muted); padding:.55rem .75rem; border-bottom:1px solid var(--nf-border-subtle); }
.nf-table tbody tr { transition: background var(--nf-duration-fast); }
.nf-table tbody tr:hover { background: var(--nf-glass-fill); }
.nf-table td { padding:.65rem .75rem; border-bottom:1px solid var(--nf-border-subtle); }
.nf-table--compact td { padding:.4rem .75rem; }
.nf-table [data-numeric] { text-align:right; font-variant-numeric: tabular-nums lining-nums; }
.nf-table th[aria-sort] { cursor:pointer; }
.nf-table th[aria-sort="ascending"]::after  { content:"▲"; font-size:.6em; margin-left:.35em; }
.nf-table th[aria-sort="descending"]::after { content:"▼"; font-size:.6em; margin-left:.35em; }
```

Then a `<DataTable>` wrapper owning sort state, a density toggle, pagination, and the
phone card fallback (so `dashboard/page.tsx:193-256` and
`EarningsWorkspace.tsx:103-146` stop maintaining two hand-written renderings each).

### 3.3 Add `loading.tsx` + `error.tsx` to both surfaces (fixes P0-4, P0-5)

- `app/admin/loading.tsx` — the rail and header are in `layout.tsx` so they persist;
  the loading file only needs a skeleton queue: `QueueHeader` skeleton + 4 shimmering
  `nf-card` blocks. Add an `nf-skeleton` class with a `@keyframes` sweep and a
  `prefers-reduced-motion` collapse to a static tint.
- Per-route `loading.tsx` under `app/agent/{listings,bookings,earnings,dashboard}`.
- `app/admin/error.tsx` and `app/agent/error.tsx` reusing the `QueueUnavailable`
  visual with a `reset()` retry button.

### 3.4 Rebuild `StatCard` to reference 9/13 (fixes P1-11, P1-12, P1-13, P2-33)

```tsx
<article className="nf-card nf-stat">
  <span className="nf-icon-tint" data-tone="brand">   {/* rounded-square, 44px,
        background: color-mix(in oklab, var(--tone) 14%, transparent); colour: var(--tone) */}
    <UiIcon name={icon} size={20} />
  </span>
  <p className="nf-stat__label">{label}</p>
  <p className="nf-stat__value">
    {main}<span className="nf-stat__unit">{secondary}</span>   {/* two-tone */}
  </p>
  <p className="nf-stat__delta" data-dir={up ? "up" : "down"}>…</p>
  <AreaSparkline data={series} height={36} className="nf-stat__spark" />
</article>
```

- Add `.nf-icon-tint` as a real tinted-tile primitive (it does not exist; `nf-icon-tile`
  is a tilt utility).
- Value at `clamp(1.75rem, 5vw, 2.25rem)`, `font-variant-numeric: tabular-nums`,
  `letter-spacing:-0.02em`; `__unit` at `0.45em` in `--nf-content-muted`. Split
  `formatMoney` output at the currency/decimal boundary so `₦12,400,000` renders as
  bold figure + muted `.00`.
- Give `RealDashboard`'s `Tile` the same component. For the missing-history problem,
  show a sparkline of whatever *does* exist (listing count over time, bookings per week)
  rather than nothing — or render an explicit "no history yet" micro-state inside the
  delta slot instead of omitting the row.
- Wrap earnings tiles in `nf-panel-sunken` for consistency with the two dashboards.

### 3.5 Upgrade the charts (fixes P1-13, P2-25)

- `AreaSparkline`: accept a `gradientId` prop defaulting to `useId()`. Add optional
  `showAxis` (baseline + 3 dotted horizontal gridlines at
  `color-mix(in oklab, var(--nf-content-primary) 8%, transparent)`), min/max value
  labels at the ends, and a client hover layer (`onPointerMove` → nearest index →
  crosshair line + `nf-glass` tooltip). Drop `preserveAspectRatio="none"` in favour of a
  computed viewBox so the fill isn't stretched.
- `DonutChart`: animate `stroke-dasharray` from 0 on mount (gated on reduced-motion),
  add hover-to-highlight with the segment's value replacing the centre total.
- Add two missing primitives the references lean on: a labelled mini progress-bar row
  (reference 13's "heart rate zones" — perfect for listing-status distribution) and a
  weekly ring strip.

### 3.6 Fix destructive-action design (fixes P1-14)

Add a real variant rather than inline overrides:

```css
.nf-btn--danger { background: var(--nf-state-error); color:#fff; box-shadow: 0 6px 20px -8px color-mix(in oklab, var(--nf-state-error) 70%, transparent); }
.nf-btn--danger::after { background: linear-gradient(180deg, rgb(255 255 255/.16), transparent); }
.nf-btn--danger-ghost { color: var(--nf-state-error); border-color: color-mix(in oklab, var(--nf-state-error) 40%, transparent); background: var(--nf-state-error-surface); }
```

Then: `AdminActions.tsx:166-171` → `nf-btn--danger` with no inline style;
`:398`, `:498`, `:720` → `nf-btn--danger-ghost`;
`ListingsWorkspace.tsx:342-349` Delete → `nf-btn--danger-ghost` at proper button size.
For the truly irreversible ones (delete listing, switch off a kill switch), add a
**type-to-confirm** field to `ActionSheet` (`requireConfirmText` prop) and a consequence
list rendered as bullet rows with a warning icon, not one paragraph.

### 3.7 Unify status pills (fixes P1-15)

Promote `admin/_components/ui.tsx`'s `Tone` + `TONE_STYLE` to
`design-system/StatusPill.tsx`, add `--danger` and `--info` badge modifiers to
`globals.css` beside the existing three (`:1704-1714`), and delete the three
reimplementations: `ListingsWorkspace.tsx:54-67`, `BookingsWorkspace.tsx:47-56`, and
the inline objects at `dashboard/page.tsx:172-177`, `RealDashboard.tsx:222-232`,
`agents/status/page.tsx:105-110`.

### 3.8 Agent Mode mobile navigation (fixes P1-9)

Reuse `nf-tabbar` / `nf-tab-pop` verbatim from `MobileTabBar.tsx`: Dashboard,
Listings, Bookings, Earnings + a "More" tab that opens the existing drawer with the
remaining six. Put an offset circular black FAB for "List apartment" beside or inside
the pill (reference 12). Add `pb-24 lg:pb-20` to the `AgentShell` content well the way
`AppShell.tsx:86` does. This costs almost nothing and closes the single most visible
parity gap between guest and supplier.

### 3.9 Make the top-bar search real or delete it (fixes P0-6)

Either wire `AgentShell.tsx:59-64` to a `/agent/search` route filtering listings and
bookings, or remove it. There is no third option before App Review.

### 3.10 Kill the fake badge (fixes P0-7)

`AgentNav.tsx:26` — drop `badge: 3`, thread real unread counts from
`readAgentNumbers` (which already returns `unreadMessages`, used at
`RealDashboard.tsx:127`) into `buildAgentNav`. Until Messages ships, render no badge.

### 3.11 Empty states worth the name (fixes P2-27, P2-28)

`QueueEmpty` (`ui.tsx:137-152`): 96px `BrandIcon` or a spot illustration, a real
headline ("Nothing waiting — the flag queue is clear"), one sentence, and a CTA to the
next queue with work. `AgentComingSoon`: per-surface illustration, a two-line preview
of what the screen will do, and move the copy into the dictionary.

### 3.12 i18n sweep (fixes P1-20, P2-34, P2-43 and the `ApplyWizard` strings)

Move to the dictionary: `ApplyWizard.tsx:132,166,177,183,321-323,389,516,524`;
`AgentComingSoon.tsx:44,48-50`; `admin/page.tsx:52,80-82`;
`agents/page.tsx:36-41,50-66`. `admin/listings/page.tsx:26-36`'s English-label lookup
table should be replaced by stable keys emitted from `lib/admin/queries.ts` (its own
comment at `:16-25` already says so).

### 3.13 Wizard consistency (fixes P1-17, P1-18, P2-22)

Adopt `ListingWizard`'s segmented bar in `ApplyWizard` (or vice versa — pick one).
Add a per-step client validation gate to `ApplyWizard` mirroring
`ListingWizard.tsx:426`, and on submit failure jump to the first step carrying an error
so nothing is announced from inside a `hidden` fieldset. Change
`ListingWizard.tsx:1280` to `nf-glass`.

### 3.14 Console operator affordances (fixes P1-16, P1-19, P2-37, P2-41, P2-42)

Filter chips + sort + "showing 40 of N" + a Load more control on every queue; row
checkboxes with a bulk action bar; a toast with a 5-second Undo after each decision
(instead of silent `router.refresh()`); an `/admin/audit` destination in `ADMIN_NAV`;
and a 7-day sparkline plus "oldest item age" on each overview tile.

---

**Total findings: 43** (7 × P0, 14 × P1, 22 × P2).
