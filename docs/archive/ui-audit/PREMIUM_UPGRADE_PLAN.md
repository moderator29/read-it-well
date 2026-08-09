# SUPERSEDED: Premium Upgrade Plan

> **Superseded 2026-08-09. Not a backlog.** This plan consolidates eight audits
> that graded the codebase against `00-reference-brief.md`, which is itself
> retired because it produced the visual overload now being removed. Read the
> banner at the top of that file first.
>
> The 308 findings below were measured against a codebase that has since moved
> substantially: `globals.css` is 71 lines and 19 partials rather than 3,167
> lines, `components/ui/` exists with 12 primitives, there are 60 `loading.tsx`
> files, and an ESLint configuration is in place. **Re-measure before quoting any
> figure in this file.**
>
> The two root causes it names are still real and are carried forward as
> `RECOMMENDATIONS.md` D-1 (no enforcement layer, so the token system drifts) and
> D-2 (primitives built and never wired, or wired to the wrong brief).
>
> Original text follows, unaltered.

---

Consolidated from a full-platform UI sweep run on 2026-08-04 by eight parallel
audit agents, each auditing one layer against a single reference brief distilled
from 15 best-in-class product screenshots supplied by the owner
(`00-reference-brief.md`).

**308 findings — 56 P0, 109 P1, 143 P2.** Per-layer detail with `file:line`
evidence lives in `audit-01` … `audit-08` beside this file. Nothing in this plan
is speculative: every claim traces to a cited line of code.

Target: the platform ships to the Apple App Store and must read as though a
top-tier product studio designed it.

---

## The two root causes

Almost every finding is downstream of one of these. Fix these and hundreds of
symptoms resolve together; fix symptoms individually and they grow back.

### Root cause 1 — the premium primitive gets built, then never wired up

This pattern recurred independently in **six of the eight audits**:

| Primitive | Built at | Used |
|---|---|---|
| `.nf-skeleton` | `globals.css:1610-1636` | **0 times** — while search and rent block navigation on awaits |
| `.nf-hero-figure` two-tone numeral | `globals.css:1767-1783` | **1 time**, and its "unit" is the phrase *"in full"*, not a numeral |
| `--nf-glass-specular` | `tokens.css:141` | **0 times** — referenced by nothing |
| bell-wiggle keyframe | `globals.css:424` | **0 call sites** |
| `iconRamp` semantic tint | `glyphs.ts` | orphaned — the file has **zero imports** |
| `MomentScreen` designed empty state | `components/app/` | ignored by notifications and messages, which ship centred grey sentences |
| `getPlatformStats()` | `lib/` | dead code, imported by nothing |
| `--nf-shadow-sm`, `glow-brand`, `glow-accent` | `tokens.css` | **0 uses each** |

A large fraction of this upgrade is **wiring, not inventing**. That is the
cheapest quality per hour available anywhere in this codebase and it is where
Phase 1 starts.

### Root cause 2 — there is no enforcement layer, so the system drifted

There is **no `tailwind.config`, no stylelint, no eslint anywhere in the repo.**
Nothing was ever going to catch drift. The measured consequences:

- `globals.css` opens with the comment *"Nothing below may introduce a raw
  colour"* and then contains **~250 raw colour literals** — one blue 68 times,
  one ink 51 times.
- **768 arbitrary `text-[…rem]` literals across 35 distinct values**, against 11
  scale tokens referenced 6 times total.
- **12 button implementations, 45 distinct override signatures, 140 call sites,
  7 different heights** (32/36/40/41/44/46/48px).
- `globals.css` is 3,167 lines against 365 lines of tokens — ~9:1.
- 77 hand-written `box-shadow`s in `globals.css` plus 16 arbitrary
  `shadow-[…]` in components.

**Enforcement lands in Phase 1 and is non-negotiable.** Without it, Phases 2–6
drift back within a quarter.

---

## Decisions needed from the owner

These block or reshape specific work. Everything else proceeds without them.

1. **Brand name.** Three are live in the codebase simultaneously: **RentMe**
   (chrome + manifest), **naijafinds.com**, **rentme.ng**, while `package.json`
   says `naijafinds`. One must win before the manifest, metadata, app icon and
   marketing copy are rebuilt. *(Blocks: app-icon set, manifest, marketing hero.)*
2. **Light mode's target identity.** `KNOWN_GAPS.md:79` claims the light theme is
   a "shipped, exchange-grade paper twin"; `tokens.css:280` says it "has NOT had
   a design pass". The token file is correct — light mode is currently flat SaaS.
   Choose: warm neumorphic paper (references 8/9), or clean flat light
   (reference 2). They are different builds. *(Blocks: light-theme surface work.)*
3. **`getPlatformStats()`.** `NumbersBand.tsx:16` and `PlatformConsole.tsx:17`
   currently hardcode "17+ listings" and a fabricated rising chart. That is worse
   than the honest label-only design the gaps file describes. Choose: wire a real
   aggregate, or ship the honest label-only design. *(Blocks: marketing stats.)*

---

## Phase 0 — App Store blockers

Small, mechanical, and every one is a genuine submission or accessibility
exposure. Do these first; they are hours, not days.

| # | Fix | Evidence |
|---|---|---|
| 0.1 | **`safe-area-inset-top` honoured in exactly one file** while `viewportFit:"cover"` and `black-translucent` are both set — every sticky header and `inset-0` overlay paints under the notch | `Onboarding.tsx:92`; `layout.tsx:83,104`; `SiteHeader.tsx:27`; `AppShell.tsx:90` |
| 0.2 | **Muted text fails WCAG AA in light theme** — `#7A8189` = 3.94:1 on white, 3.61:1 on canvas, across ~290 call sites, 30 of them at 10–11px. Found independently by two agents | `tokens.css`; patched only at `globals.css:3013` |
| 0.3 | **`--nf-state-info` skipped in the light contrast pass** — 2.14:1. Success and error badges also fail (3.79:1, 3.95:1) | `tokens.css` |
| 0.4 | **Touch targets below 44pt** — `.nf-icon-btn` is 41.6px despite its own comment claiming 44; `.nf-chip` 36.6px with 47 of 51 usages lacking a floor; `.nf-btn` 43px; admin mobile nav ~32px; language switcher ~31px; listing-wizard step buttons **6px** | `globals.css:1571,1576,1663`; `LanguageSwitcher.tsx:43`; `ListingWizard.tsx:686` |
| 0.5 | **"Explore the demo" is the dominant CTA on both auth pages**, writes `nf_demo=1` — a cookie read by nothing — and violates the owner's zero-demo-strings rule | `AuthPanel.tsx:84-93` |
| 0.6 | **No favicon of any kind** — no `.ico`, no `app/icon.*`; tab icon points at a 192px PNG downscaled 12:1 | `layout.tsx:88-94` |
| 0.7 | **One `themeColor` for both themes** (navy) while light canvas is `#F4F5F7`; no iOS splash screens, no `manifest.screenshots` | `layout.tsx:101` |
| 0.8 | **Sticky price bar collides with the tab bar on notched iPhones** — `bottom-20` (80px) vs tab-bar edge at 94px, `z-30` under `z-50`; tab bar's own bottom margin resolves to **0px** on a notch | `ListingStickyBar.tsx:64` |
| 0.9 | **Reduced-motion hole** — `.nf-page-scene` runs a 20s infinite loop, missing from the reduce block | `globals.css:741`, `:918` |
| 0.10 | **Emoji as UI** — hardcoded 👋 on sign-in, ❤️ in all four locale files, `&times;` as a close icon at 4 sites in 3 sizes | `AuthPanel.tsx:63` |
| 0.11 | **Fake unread badge hardcoded to `3`** shown to every agent forever, pointing at a coming-soon stub | `AgentNav.tsx:26` |
| 0.12 | **Global `:focus-visible` forces 6px radius unlayered**, overriding Tailwind — every pill nav item squares off on keyboard focus | `globals.css:96-100` |

---

## Phase 1 — Foundations

The spine. Everything after this depends on it.

### 1.1 Create `components/ui/` — it does not exist today

Ship these primitives, with the API shapes returned in `audit-05` §3:

`Button` · `ActionBar` · `Chip` / `ChipRow` · `Segmented` · `Sheet` ·
`StatusPill` · `Input` / `Field` · `Switch` · `Stepper` · `Progress` ·
`Spinner` · `Skeleton`

Non-negotiable behaviours the current code lacks entirely:

- **Press state on touch.** Today `.nf-btn:active` is `translateY(1px)` and the
  primary's ripple and glow live **entirely on `:hover`** — touch users get
  nothing. Ship scale-down + shadow compression + spring-back.
- **Haptics.** `navigator.vibrate` appears **zero times** in the codebase.
- **A spinner.** None exists. All 18 pending buttons swap label text, so the
  button visibly jumps width mid-press.
- **Visible input errors.** `.nf-field` paints its border via a `border-box`
  gradient, so `[aria-invalid] { border-color: … }` at `globals.css:1557` has
  **no visible effect** — errors are being set and silently not shown.
- **One status vocabulary.** Four compete today; bare `.nf-badge` renders
  **invisible** (layout and type, no background or colour) and ships bare at 8+
  sites including a `default` branch.
- **Sheets with mechanics** — drag handle, detents, spring, drag-to-dismiss,
  focus trap, body-scroll lock. Today: 8 hand-rolled copies, **zero** of any of
  those, despite `aria-modal="true"`; two never lock scroll.
- **Segmented that slides.** Five implementations, none with a sliding shadowed
  capsule.

Migration order is in `audit-05` §3.8.

### 1.2 Real glass and a real elevation ladder

Ship-ready replacement CSS for both themes is written out in `audit-03` §3.1–3.2.

- **`.nf-glass` is a flat rgba panel, not glass** — no inner top-edge highlight,
  no ambient shadow. It is the material of **every sticky header** (28 uses).
- **Dark-mode drop shadows are mathematically invisible** — 45% black on
  `#000010` yields a **1.003:1** delta. Every card, sheet, modal and dock casts a
  shadow that cannot be seen.
- **The dark surface ladder is 1.09:1 end to end** — canvas/card/elevated/raised
  differ only in the blue channel (7% of perceived luminance). Only the 1px
  border separates surfaces. There is effectively no depth in dark mode.
- Build the 6-rung ladder: ground → card → raised → sheet → modal → toast.

### 1.3 Rebuild the icon system

Per `audit-01` §3:

- **Variant-aware `UiIcon`** with real filled/outline states. Today "active" is
  `strokeWidth 1.8 → 2` — a **0.18 CSS pixel** change, i.e. invisible.
- **Optical sizing.** Fixed `strokeWidth 1.8` at every size means 73 usages
  render sub-1px strokes. This is the core reason it cannot read as
  SF-Symbols-grade.
- **A size scale.** 23 magic numbers today; `UiIcon` alone is called at 14 sizes.
  Zero `--nf-icon-*` tokens exist.
- **Symbol effects** — `bounce | pulse | wiggle | rotate | replace`, CSS
  keyframes gated on `prefers-reduced-motion`, wired to the tab bar, save heart,
  notification bell, refresh and send. This is the reference set's headline
  feature and the platform has **zero** of it across 166 icon usages.
- **Close the 26-glyph gap**, then delete all 29 inline `<svg>` blobs across 18
  files (skyline duplicated 5×, chevron 3× at 3 stroke weights).
- **Normalise the 17 optical scales** in `public/brand/icons/` (57 PNGs, 256→384px
  canvas, rendered into identical tiles — one glyph renders 1.50× its neighbour).
- **Revive `iconRamp`** for tinted icon tiles, or delete the dead system. 23.5KB
  of dead source and 1.32MB of unreferenced PNGs currently ship, still precached
  by `sw.js:63`.
- **Ship a real app-icon set** — resolves 0.6 once the brand name is decided.

### 1.4 Typography and numerals

Per `audit-04` §4:

- **Move `.nf-numeric` into `@layer components`.** Defined at `globals.css:107-112`
  outside the layer, it beats every Tailwind utility — 14 `tracking-*` utilities
  are dead code, and `agents/status/page.tsx:99` asks for `+0.04em` and silently
  renders `−0.02em`.
- **Ship `<Amount>` and `<Metric>`** (full implementations and call-site
  replacement lists are in the audit). Two-tone display numerals exist **once** on
  the whole platform. This is the single strongest premium tell in the reference
  set.
- **Tabular figures on every column of digits.** The wallet ledger — the one
  finance screen — is not tabular; digits jitter row to row.
- **Complete the type scale as roles with recipes** and enforce it against the
  768 arbitrary literals.
- **Truncation policy.** One `line-clamp` exists in the entire app; an unclamped
  listing title desynchronises every card in its grid row, and earnings
  `truncate`s a money value to `₦12,500,0…` on a phone.
- **Currency consistency.** ₦ hardcoded in 5 places; `ha-NG` emits `₦ 9,000,000`
  *with a space*, so the wallet hero disagrees with the ledger row beneath it;
  `Odometer.tsx:32` calls `toLocaleString()` with no locale (hydration mismatch);
  the agent dashboard renders the same value as `₦9M` and `₦9,000,000` 200px apart.

### 1.5 Enforcement

Add `tailwind.config` with the real token scale, plus stylelint and eslint rules
banning raw colour literals, arbitrary `text-[…]`, arbitrary `shadow-[…]`, and
off-token radii. Wire into CI. **This is what prevents the whole plan from
rotting.**

Also fix: `.nf-btn` radius is 18px, not a pill, despite `--nf-radius-pill`
existing and being used by chips; `rounded-t-3xl` on every bottom sheet is
off-scale because `--radius-3xl` isn't mapped in `@theme inline`; no spacing
token scale exists at all; 26 dead tokens; `index.ts` has drifted from
`tokens.css` on cyan/emerald/rose despite a comment claiming exact parity; and
the off-brand indigo/slate array copy-pasted into 6 component files is the exact
family `tokens.css:52-66` says was hunted out of the tree.

---

## Phase 2 — Navigation

Today there are **three unrelated navigation designs**: guest = floating glass
pill, agent = hamburger drawer, admin = a scrolling 32px chip strip. Different
icon families, three active-row recipes, three route-matchers.

Per `audit-02` §4:

- **R1 — Rebuild the tab bar** as an expanding labelled capsule with a sliding
  indicator. Today no tab text is ever painted, and `.nf-tab-pop__pill` is
  `inset:0` on a 48×48 circle so each tab owns its own blob — the change is a
  cross-fade, not a slide.
- **R2 — Add the FAB.** Zero `fab` matches codebase-wide. "List an apartment",
  the highest-value supply action on the platform, is row 3 of 10 in a rail.
- **R5 — Unify the three workspaces on one navigation language.**
- **R6 — Build the real three-pane console** (icon rail → list → detail).
- **R7 — Make the glass real and add the under-nav scrim.**
- **R8 — Scroll-aware headers.** Zero scroll listeners exist;
  `SiteHeader.tsx:28`'s `border-b border-transparent` is a dead stub.
- **R10 — Real badges everywhere.** The consumer app has zero unread indicators
  — `AppRail.tsx:18` declares `badge` and no item ever sets it.
- **Fix exact-equality route matching** — 5 of 7 discovery rows carry `?type=`
  hrefs `usePathname()` can never match; six consumer routes show no active tab.
- **Fix `ScrollToTop.tsx:15`**, which destroys back-navigation scroll restoration
  on every route.

---

## Phase 3 — Guest screens

Per `audit-06`. The listing detail page is the money screen and gets priority.

**Shell first — it unblocks everything else.** `AppShell.tsx:90-121` welds a 64px
glass header onto every guest route, so no hero can ever run under the status bar.

**Listing detail vs reference 3, line by line:**
- No content sheet overlapping the hero — currently gallery then a plain `mt-6`
  grid, no negative margin, no top radius, no overlap.
- Price is 24px single-tone; wire `<Amount>`.
- No photo gallery grid, no "Show all", no lightbox — tapping a photo does nothing.
- The "pinned footer" is a sticky glass card with one CTA and is `lg:hidden`, so
  desktop has no action bar at all. Ship the blurred ghost + solid pair.

**Then:**
- **Booking flow** — replace native `<input type="date">` with the reference-4
  chip sheet: horizontal strip, coloured selected ring, off-edge bleed, sheet.
- **Category chips** carry 3D glyphs on home and search; ship photo thumbnails.
- **Empty states** — route notifications, messages, saved, bookings, wallet and
  no-results through `MomentScreen`. Two are currently a centred grey sentence in
  a card.
- **Loading** — add `loading.tsx` + `<Suspense>` and finally use `.nf-skeleton`.
- **Errors** — route-level boundaries in `(app)`; checkout's four `MomentScreen`
  states are the model nothing else copies.
- **Wallet** — dark/light action pair, red debits, a real sparkline (today's has
  a hardcoded stroke that breaks in light theme).
- **Chat** — reply-quotes, attachment row, real avatars, one unread treatment
  (two ship on the same screen today), and delete the dead 318-line duplicate
  thread implementation.

---

## Phase 4 — Agent workspace and admin console

Per `audit-07` §3. The back office is on-brand but uncomposed — correct
primitives, zero composition.

- **3.1 Build the three-pane console.** Every queue is `max-w-3xl` + a list of
  full-detail cards; the agents queue renders all 18 detail rows of a six-step
  application inline *for every card*. Support's two-pane is inverted — detail
  renders above the list, selected by full navigation on a `force-dynamic` route.
- **3.2 Ship a table primitive.** No table rules exist in `globals.css`; two
  hand-rolled `<table>`s with no sticky header, hover, sort, density or pagination.
- **3.3 Add `loading.tsx` + `error.tsx`** to `app/agent`, `app/agents`, `app/admin`
  — all 8 admin pages are `force-dynamic` awaiting Supabase, so every navigation
  is a blank screen then a content pop.
- **3.4 Rebuild `StatCard`** — 22px value, no two-tone, no sparkline, no tinted
  icon tile.
- **3.5 Upgrade charts** — bare today, and the sparkline and donut render **only
  on the seeded demo branch**, never in `RealDashboard.tsx`.
- **3.6 Destructive-action design** — no danger variant exists; reject/suspend are
  faked with inline styles over a blue primary, and agent Delete is the
  lowest-contrast element in its row.
- **3.8 Agent Mode mobile nav** — give agents the same floating pill guests get.
- **3.9 Make the top-bar search real or delete it** — no name, no form, no
  handler, no results.
- **3.14 Operator affordances** — no filter, sort, search or pagination on any
  queue, all hard-truncated in the query layer with no "showing 40 of N".

**Protect:** the shared `ActionSheet`, the listing wizard's 7-segment progress
bar, `ApplyWizard`'s three-state `UploadZone`, `/agents/status` (the best-designed
screen in the back office), and `AccessScreen`.

---

## Phase 5 — Marketing, auth, onboarding, motion

Per `audit-08` §C.

- **C1 — Hero rebuild.** No product screenshot exists anywhere on the marketing
  site; the hero is an illustration. Add the reference-15 shape: mesh gradient,
  inline brand logo chips set into the headline, shared-pill email capture,
  floating tilted UI fragments, screenshot in a soft-shadowed frame.
- **C2 — Cut 21 marketing sections to 10.**
- **C3 — Stat cards premium *and* honest** (see owner decision 3).
- **Add social proof** — zero avatars, stars, counts, testimonials or logo wall
  exist on any page. Biggest credibility gap against both marketing references.
- **C4 — Auth rebuild.** Currently a plain centred 24rem form card with an emoji
  in the headline. Also: auth errors are painted in the *warning* (cyan) palette,
  and there is no forgot-password route.
- **C5 — Build real onboarding.** What exists is a 5.2s auto-dismissing splash —
  no progress, no steps, no option cards, no CTA — that blocks the landing page
  on first visit with no focus trap.
- **C6 — Close the four motion gaps.** For the record, `KNOWN_GAPS.md` is wrong in
  both directions: map transitions and AI states **are** built (4 + 3 keyframes);
  **sheets are the real gap** and aren't mentioned. 47 keyframes exist, no
  framer-motion, ~30 hardcoded durations leak because there is no ambient/stagger
  token tier. Missing: bottom-sheet slide/detents, press scale, sliding tab
  indicator, exit animations, page transitions, number roll-up, skeleton
  shimmer → content crossfade.
- **C7 — App Store list** (folded into Phase 0 above).

---

## Phase 6 — Cleanup

- Resolve the three-way brand-name split across manifest, metadata and chrome.
- Delete dead code: `Icon.tsx`, `Icon3D.tsx`, `glyphs.ts` (zero imports), the
  318-line duplicate thread implementation, `getPlatformStats()`, 26 dead tokens,
  1.32MB of unreferenced PNGs still precached by the service worker.
- **i18n stress pass.** Hausa `agent.dashboard.lastMonth` is 3.00× English in a
  tile whose own comment documents an English collision; Igbo `nav.rent` is 3.25×
  inside a non-wrapping badge row; `.nf-overline` uppercases Yoruba tone marks at
  +0.14em across 50 sites; `t.common.seeAll` is a dead key in all four locales.
- Rewrite `KNOWN_GAPS.md` — its motion and light-theme claims are both wrong.
- Rewrite `rate-limit.ts`, which contains a literal NUL byte and is invisible to
  grep and GitHub code search.

---

## What is genuinely good and must not be regressed

The sweep found real quality worth defending:

- **The ambient canvas + film grain system** — genuinely atmospheric, beats the brief.
- **Reduced-motion handling** — thorough and correct (one hole, listed at 0.9).
- **The pre-paint theme script** — no FOUC.
- **`.nf-card` and `.nf-icon-tile`** — real layered material. Use these as the
  template everything else is rebuilt from.
- **Global `:focus-visible` coverage** — excellent (one radius bug, listed at 0.12).
- **100% `dvh` usage** — no `100vh` bug anywhere, which is rarer than it sounds.
- **`public/sw.js`**, the `data-instant` scroll-timeline fix, the `will-change`
  scoping note, and `Odometer.tsx`.
- **Checkout's `MomentScreen` states** and the reserve success choreography — the
  model the rest of the app should copy.
- **The floating detached tab bar**, the gallery's circular glass controls, the
  typing indicator, and the saved-undo-in-slot pattern.
- **Zero third-party icon libraries** and **zero unlabelled icon-only buttons** —
  the foundation is sound; the discipline just was not applied.
