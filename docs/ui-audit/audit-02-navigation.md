# Audit 02 — Navigation surfaces

Scope: every navigation surface on the platform, measured against
`PREMIUM_REFERENCE_BRIEF.md` §2 (Navigation) and §8 (App Store readiness).

Repo root for all paths below: `/home/user/read-it-well/apps/web/src`.

> Note before anything else: the product is briefed as **NaijaFinds**, but every
> navigation surface in the codebase is branded **RentMe** —
> `app/manifest.ts:26` (`name: "RentMe"`), `components/site/SiteFooter.tsx:74`
> (`aria-label="RentMe home"`), `components/site/SiteFooter.tsx:147`
> (`RentMe. {rights}`), `components/site/MobileMenu.tsx:109` (`aria-label="Email
> RentMe"`), `MobileMenu.tsx:114` (`aria-label="RentMe AI"`),
> `app/admin/_components/ui.tsx:12` ("the console is part of RentMe"). Either the
> brief or the code is wrong. This is an App Store submission blocker if the
> binary name and the in-app chrome disagree.

---

## PART 1 — WHAT EXISTS (honest inventory)

### 1.1 Personal Mode (guest app) — `(app)` route group

Everything under `app/(app)/` is wrapped by `AppShell`
(`app/(app)/layout.tsx:25`), which composes **four** nav objects:

| Surface | File | Breakpoint | Items |
|---|---|---|---|
| `AppRail` (sticky left column) | `components/app/AppRail.tsx:92-142` | `lg:flex` | 14 labelled rows in 2 groups + agent CTA + identity card |
| `AppRail` (`variant="drawer"`) | `AppShell.tsx:66-78` | `lg:hidden` | same 14 rows, full-screen overlay |
| `MobileTabBar` | `components/app/MobileTabBar.tsx:30-62` | `lg:hidden` | 5 icon-only circles, floating pill |
| `DesktopDock` | `components/app/DesktopDock.tsx:25-45` | `lg:flex` | 3 icon-only circles, floating pill |
| Top bar | `AppShell.tsx:90-121` | always | hamburger (mobile) / location chip / ThemeToggle / LanguageSwitcher / Assistant button |

Plus `PageHeader` (`components/app/PageHeader.tsx`), an in-content back+title row
used by individual pages, and `PageScene` (`components/app/PageScene.tsx`), a
decorative background art bleed — not a nav surface, but it sits behind headers.

`AppShell.tsx:50` defines an "immersive" escape hatch (`/assistant`, `/messages/:id`)
which removes the header, tab bar and dock entirely.

### 1.2 Agent Mode — `app/agent/*`

| Surface | File | Breakpoint | Items |
|---|---|---|---|
| `AgentRail` | `components/agent/AgentRail.tsx:28-49` | `lg:flex` | 10 labelled rows, flat list, no groups |
| `AgentMobileNav` | `components/agent/AgentMobileNav.tsx:71-130` | `lg:hidden` | hamburger → 18.5rem left slide-in drawer, same 10 rows |
| Top bar | `components/agent/AgentShell.tsx:37-69` | always | BackButton / hamburger / logo / mode pill / search field / LanguageSwitcher |
| `ModeSwitcher` | `components/agent/ModeSwitcher.tsx` | in rail + drawer | `variant="menu"` single row; `variant="picker"` popover (picker is defined but unused in any nav) |

**No bottom tab bar in Agent Mode at all.** The documented reason is at
`AgentMobileNav.tsx:17-19`.

### 1.3 Admin console — `app/admin/*`

| Surface | File | Breakpoint | Items |
|---|---|---|---|
| Rail `<aside>` | `app/admin/layout.tsx:50-67` (hand-rolled, not shared) | `lg:flex` | logo, `AdminPill`, `AdminRail`, audit note |
| `AdminRail` | `app/admin/_components/AdminNav.tsx:28-71` | `lg:block` | 8 labelled rows + live count badges |
| `AdminTabs` | `AdminNav.tsx:73-114` | `lg:hidden` | 8 **horizontally scrolling chips** under the header |
| Top bar | `app/admin/layout.tsx:69-88` | always | BackButton / logo / AdminPill / email |

`ADMIN_NAV` destinations: `app/admin/_components/nav.ts:22-31`.
Shared queue furniture: `app/admin/_components/ui.tsx` (StatusChip, QueueHeader,
QueueEmpty, DetailRow, CheckRow) — content components, not nav.

### 1.4 Marketing site

| Surface | File | Items |
|---|---|---|
| `SiteHeader` | `components/site/SiteHeader.tsx:27-70` | 7 text links (`lg:flex`), LanguageSwitcher, Sign in, Sign up, MobileMenu |
| `MobileMenu` | `components/site/MobileMenu.tsx:61-130` | full-screen portal overlay: logo row, 8 chevron rows over hairlines, "Community" strip, pinned Sign-up |
| `SiteFooter` | `components/site/SiteFooter.tsx:68-155` | brand block, 4 `<nav>` columns, language + store strip, copyright |

### 1.5 Shared nav atoms

- `BackButton` (`components/site/BackButton.tsx`) — `nf-icon-btn` + `arrow-left`.
- `ThemeToggle` (`components/site/ThemeToggle.tsx`) — `nf-icon-btn h-9 w-9`. Only mounted in `AppShell.tsx:113`. **Not in SiteHeader, AgentShell or admin layout.**
- `LanguageSwitcher` (`components/site/LanguageSwitcher.tsx`) — a native `<select>` styled as a primary button.
- `ScrollToTop` (`components/site/ScrollToTop.tsx`) — mounted globally at `app/layout.tsx:150`.

### 1.6 The nav CSS

- `.nf-tabbar` — `globals.css:2068-2080`
- `.nf-tab-pop` / `__pill` / `__icon` + `@keyframes nf-tab-pop-in` — `globals.css:2088-2134`
- `.nf-dock` / `.nf-dock__btn` (+ light overrides) — `globals.css:2142-2201`
- Light-theme tab bar shadow — `globals.css:2997-3002`
- `.nf-glass` — `globals.css:141-156`
- `.nf-icon-btn` — `globals.css:1573-1607`
- `.nf-chip` — `globals.css:1659-1692`
- `.nf-badge` family — `globals.css:1694-1760`
- `.nf-scroll-x` — `globals.css:2768-2774`
- Global focus ring — `globals.css:90-100`
- Tokens: `packages/design-tokens/src/tokens.css:137` (`--nf-glass-fill-strong: rgb(255 255 255 / 0.09)`), `:263` (`--nf-rail-width: 264px`), `:319` (light `--nf-glass-fill-strong: rgb(255 255 255 / 0.96)`)

---

## PART 2 — ANSWERS TO THE TWELVE QUESTIONS

### Q1 — Floating pill, or flat bar welded to the bottom?

**It IS a floating pill.** This is the single strongest thing in the whole nav layer.

`MobileTabBar.tsx:33`:
```
className="nf-tabbar fixed inset-x-4 bottom-[max(0.9rem,env(safe-area-inset-bottom))] z-50 mx-auto w-fit lg:hidden"
```
`inset-x-4` + `mx-auto w-fit` → detached from left/right edges; `bottom-[max(...)]`
→ detached from the bottom. `.nf-tabbar` (`globals.css:2068-2075`) gives it
`border-radius: var(--nf-radius-pill)` (999px), a 1px border, `backdrop-filter:
blur(22px) saturate(170%)` and `box-shadow: 0 16px 36px -12px rgb(0 0 0 / 0.6)`.

**What it actually renders:** a `<ul>` of 5 `<li>`, each an icon-only 48×48 circular
`<Link>` (`MobileTabBar.tsx:46`, `h-12 w-12 rounded-full`), containing an
absolutely-positioned `.nf-tab-pop__pill` span and a `UiIcon` at 22px. No text is
painted — labels exist only as `aria-label` and `title`
(`MobileTabBar.tsx:43-44`), stated as a deliberate choice in the file comment at
`MobileTabBar.tsx:16-17`. Total footprint: `5 × 48 + 4 × 4 (gap-1) + 2 × 6
(px-1.5) = 268px` wide, `48 + 2 × 6 = 60px` tall.

**But the margin is wrong on the target device.** `max(0.9rem, env(safe-area-inset-bottom))`
resolves to `34px` on a notched iPhone — which is *exactly* the home-indicator
inset, so the pill's bottom edge lands flush on the home indicator with **zero**
visual margin below it. On a non-notched device it gets 14.4px. The reference
pattern is `inset + margin`, i.e. `calc(env(safe-area-inset-bottom) + 0.75rem)`.

### Q2 — Does the active tab expand into a labelled capsule? Sliding indicator?

**No, and no. Hard swap.**

- **No label ever appears.** `MobileTabBar.tsx:52-56` renders only `<span class="nf-tab-pop__pill">` and `<span class="nf-tab-pop__icon"><UiIcon …/></span>`. There is no text node in the tab at any state. The active tab is the same 48×48 circle as every inactive tab.
- **No capsule expansion.** `.nf-tab-pop__pill` is `position: absolute; inset: 0; border-radius: var(--nf-radius-pill)` (`globals.css:2102-2105`) on a 48×48 square box → it is a **circular blob**, not a capsule. Nothing about the geometry changes between states.
- **No sliding indicator.** Every tab owns its *own* pill element. The transition is `opacity` + `transform: scale()` on that one element (`globals.css:2106-2117`): the outgoing tab's pill fades out in place and the incoming tab's pill pops in place. There is no shared element, no `view-transition-name`, no FLIP, no layout-id. It is a cross-fade, not a slide.
- The only differentiation of the active state beyond the blob is `strokeWidth={isActive ? 2 : 1.8}` (`MobileTabBar.tsx:55`) — a **0.2px** stroke delta, invisible at 22px — plus `translateY(-1px)` on the icon (`globals.css:2124-2126`).
- **No filled/outline icon variant switch.** The brief (§1) calls for inactive = outline, active = filled. `UiIcon` is passed the same `name` in both states.
- **`aria-current` drives CSS.** `globals.css:2114` keys off `[aria-current="page"]`, which works, but means the pop animation replays on every React re-render of an already-active tab, not only on a genuine change.

Desktop dock is worse: `.nf-dock__btn[aria-current="page"]` (`globals.css:2178-2181`)
is a flat colour + background swap with **no transition on the background** listed
in `globals.css:2168-2171`… actually `background-color` *is* transitioned, but
there is no indicator element at all.

### Q3 — Does content scroll UNDER the nav with blur + scrim?

**Partially. Real blur, no scrim, and the light theme defeats the blur entirely.**

- Content *does* pass behind the pill: the bar is `fixed`, the page scrolls. `.nf-tabbar` has `backdrop-filter: blur(22px) saturate(170%)` (`globals.css:2072`). ✅
- **No gradient scrim.** There is no mask, no `linear-gradient(to top, canvas, transparent)` layer above the tab bar, and no `mask-image` on the scroll container. Content hits the pill edge with a hard 1px border. The reference's "fade into the nav" depth cue is absent.
- **In light mode the blur is meaningless.** `packages/design-tokens/src/tokens.css:319` sets `--nf-glass-fill-strong: rgb(255 255 255 / 0.96)` — a 96% opaque white fill over a 22px blur. Nothing shows through. It reads as an opaque white pill.
- **The material is the exact thing the brief calls out as fake glass.** Dark mode `--nf-glass-fill-strong: rgb(255 255 255 / 0.09)` (`tokens.css:137`) — brief §3: *"A flat `rgba(255,255,255,0.08)` panel is NOT glass and reads as cheap."* `.nf-tabbar` has **no inner top highlight**; compare `.nf-dock` which does (`globals.css:2153`, `inset 0 1px 0 rgb(255 255 255 / 0.06)`). Two sibling surfaces, two different recipes.
- **The two "same family" pills invert in light mode.** `.nf-tabbar` becomes near-white (`tokens.css:319`); `.nf-dock` is explicitly overridden to near-black (`globals.css:2187-2189`, `rgb(18 21 26 / 0.92)`). At `lg` the dock is a black pill; below `lg` the tab bar is a white pill. The comment at `globals.css:2062-2064` claims "same material as the desktop dock so the two read as one family" — in light mode that is false.

**Bottom padding is also mis-tuned.** `AppShell.tsx:85` uses `pb-24` (96px). Tab
bar footprint on a notched iPhone = `34 + 60 = 94px` → **2px of clearance**.
Content visually collides with the bar.

### Q4 — Is there a FAB / primary create action?

**No. Zero.** `grep -rni "fab\|floating-action\|nf-fab"` across `.tsx` and `.css`
returns **nothing**. There is no offset circular create button in or beside any
nav bar on any surface.

The closest thing is `AppShell.tsx:116-119` — an "AI Assistant" pill in the top
bar (`nf-btn nf-btn--primary gap-2 px-3 py-2`), which is a top-right chrome
button, not a FAB, and it collapses to a bare 18px sparkle icon below `sm`
(`AppShell.tsx:118`, `hidden sm:inline`).

The platform's actual primary create action — "list an apartment" — is buried as
row 3 of 10 in the agent rail (`AgentNav.tsx:24`, `/agent/list`) with **no**
elevated affordance anywhere. Brief §2 explicitly requires "Offset circular FAB
either inside the bar (dark pill with `+`) or floating beside it, visually
dominant."

### Q5 — Safe-area insets

`app/layout.tsx:104` sets `viewportFit: "cover"`, and `:69-70` sets
`black-translucent` status bar style. **That means the layout viewport extends
under the notch and home indicator, so every top-pinned and bottom-pinned surface
must compensate.** Full inventory of `env(safe-area-inset-*)` usage:

| File:line | Inset | Verdict |
|---|---|---|
| `components/app/MobileTabBar.tsx:33` | bottom | present, but `max()` not `calc(+margin)` → 0 margin on notch |
| `components/agent/AgentMobileNav.tsx:98` | bottom | ✅ correct (`calc(1.25rem + env(…))`) |
| `components/agent/AgentShell.tsx:71` | bottom | ✅ |
| `app/admin/layout.tsx:90` | bottom | ✅ |
| `app/(app)/messages/[id]/ThreadView.tsx:355` | bottom | ✅ |
| `components/app/assistant/AssistantChat.tsx:427` | bottom | ✅ |
| `app/agent/list/ListingWizard.tsx:678, 1280` | bottom | ✅ |
| `app/agent/listings/ListingsWorkspace.tsx:186` | bottom | ✅ |
| `app/agent/bookings/BookingsWorkspace.tsx:127` | bottom | ✅ |
| `globals.css:1909` (`.nf-action-bar`) | bottom | ✅ |
| `components/site/Onboarding.tsx:92, 108` | **top** + bottom | ✅ — the **only** top usage in the codebase |

**GAPS — `safe-area-inset-top` is handled in exactly one file.** Every sticky
header is `top-0` with no top inset:

- `AppShell.tsx:90` — `nf-glass sticky top-0` + `h-[64px]` row (`:91`). **P0.** On a notched iPhone in standalone PWA the hamburger, location chip and Assistant button sit under the status bar.
- `AgentShell.tsx:37` — same, `h-[60px] sm:h-[64px]` (`:38`). **P0.**
- `app/admin/layout.tsx:70` — same, plus `AdminTabs` hangs below (`:82-88`). **P0.**
- `components/site/SiteHeader.tsx:27-29` — `sticky top-0` + `h-[60px] sm:h-[72px]`. **P0.**

**GAPS — bottom insets missing in drawers/overlays:**

- `AppShell.tsx:74` — the Personal drawer is `absolute inset-0 overflow-y-auto` with `AppRail variant="drawer"` inside, whose padding is `px-4 py-5` (`AppRail.tsx:96`). **No bottom inset.** The identity card at `AppRail.tsx:129-141` sits under the home indicator. **P1.**
- `components/site/MobileMenu.tsx:71` — `absolute inset-0 … px-5 pb-6 pt-5`. **No top or bottom inset.** The pinned Sign-up CTA (`:119-125`) sits under the home indicator, and the logo row (`:72-85`) under the notch. **P1.**
- `components/app/listing/ListingStickyBar.tsx:64` — `sticky bottom-20`. **No inset.** See Q6 collision note below.

**GAP — no `safe-area-inset-left/right`.** Nothing in the codebase uses them.
Landscape on a notched iPhone will clip the rail, the tab bar (`inset-x-4` = 16px
< 44px landscape inset) and every header's leading control. **P1.**

### Q6 — Touch targets (measured)

Computed from the actual class values. Minimum is 44×44pt (44 CSS px).

| Element | File:line | Classes | Measured | Verdict |
|---|---|---|---|---|
| Mobile tab item | `MobileTabBar.tsx:46` | `h-12 w-12` | **48 × 48** | ✅ |
| Desktop dock button | `globals.css:2164-2165` | `2.5rem` | 40 × 40 | ✅ (pointer-only, `lg:flex`) |
| **`.nf-icon-btn` base** | `globals.css:1577-1578` | `2.6rem` | **41.6 × 41.6** | ❌ — and the comment on `globals.css:1571` *claims* "a 44px touch target". The comment is factually wrong. |
| App hamburger | `AppShell.tsx:98` | `nf-icon-btn h-10 w-10` | **40 × 40** | ❌ P1 |
| App assistant CTA | `AppShell.tsx:116` | `nf-btn … px-3 py-2` | ≈ 40 tall | ❌ P1 |
| `ThemeToggle` | `ThemeToggle.tsx:41` | `nf-icon-btn h-9 w-9` | **36 × 36** | ❌ P1 |
| `LanguageSwitcher` (compact) | `LanguageSwitcher.tsx:43-44` | `py-2` overridden by `paddingBlock: 0.35rem` | **≈ 31 tall** | ❌ **P0** — worst in the app, and it is in *three* headers |
| `PageHeader` back | `PageHeader.tsx:53` | `nf-icon-btn h-9 w-9 sm:h-10 sm:w-10` | **36 × 36** on phones | ❌ P1 |
| `BackButton` in AgentShell | `AgentShell.tsx:41` | `h-9 w-9 sm:h-10 sm:w-10` | **36 × 36** | ❌ P1 |
| `BackButton` in admin | `app/admin/layout.tsx:74` | `h-9 w-9 sm:h-10 sm:w-10` | **36 × 36** | ❌ P1 |
| Agent hamburger | `AgentMobileNav.tsx:63` | `h-10 w-10` | 40 × 40 | ❌ P2 |
| Agent drawer close | `AgentMobileNav.tsx:108` | `h-10 w-10` | 40 × 40 | ❌ P2 |
| `MobileMenu` hamburger | `MobileMenu.tsx:46` | `nf-icon-btn h-10 w-10` | 40 × 40 | ❌ P2 |
| `MobileMenu` close | `MobileMenu.tsx:78` | `nf-icon-btn h-9 w-9` | **36 × 36** | ❌ P1 |
| **`AdminTabs` chip** | `AdminNav.tsx:98` | `nf-chip !py-1.5`, font 0.8125rem | **≈ 32 tall** | ❌ **P0** — this is the *entire* mobile navigation for the admin console |
| `AppRail` row | `AppRail.tsx:64` | `py-2.5`, text 0.9rem | ≈ 42 | ❌ P2 (used in the mobile drawer too) |
| `AgentNavList` row | `AgentNav.tsx:81, 92` | `py-2.5` + 26px icon | ≈ 46 | ✅ |
| `AdminRail` row | `AdminNav.tsx:51` | `py-2.5` + 18px icon | ≈ 41 | ⚠️ desktop-only |
| `ListingGallery` back | `ListingGallery.tsx:162` | `h-10 w-10` | 40 × 40 | ❌ P2 |
| `ListingGallery` prev/next | `ListingGallery.tsx:187, 196` | `h-9 w-9` | 36 × 36 | ⚠️ `sm:grid` only |
| `SiteFooter` links | `SiteFooter.tsx:96-97` | text only, `space-y-2.5` | ≈ 20 tall, 10px gap | ❌ P2 |

**Overlap bug (P1):** `ListingStickyBar.tsx:64` is `sticky bottom-20 z-30` (80px
from the viewport bottom). The tab bar's top edge is at `34 + 60 = 94px` on a
notched iPhone and is `z-50`. **The tab bar covers the bottom 14px of the sticky
price bar on the exact device class this ships to.** On a non-notched phone the
clearance is 5.6px. The comment at `ListingStickyBar.tsx:10-12` says
`bottom-20` "clears the fixed tab bar" — it does not.

### Q7 — Desktop: three-pane, or generic sidebar?

**Generic sidebar + content. There is no three-pane anywhere in the product.**

All three workspaces render the identical structural skeleton — a
264px labelled `<aside>` + one content column:

- `AppRail.tsx:95` — `sticky top-0 hidden h-dvh w-[var(--nf-rail-width)] shrink-0 flex-col border-r … lg:flex`
- `AgentRail.tsx:30` — **byte-identical class string**
- `app/admin/layout.tsx:51-53` — **byte-identical class string** (and hand-inlined, not sharing a component)

Against brief §2 ("narrow icon rail with tooltips + active pill → middle list
pane → right detail pane"):

| Reference feature | Present? | Evidence |
|---|---|---|
| Narrow icon rail | ❌ | all three are 264px labelled rails (`tokens.css:263`) |
| Middle list pane | ❌ | admin queues render list + detail on separate *routes* (`app/admin/agents/`, `app/admin/flags/`…) |
| Right detail pane | ❌ | — |
| Tooltips on rail | ❌ | `grep -rni "tooltip"` → **zero hits** in the entire codebase. Only `title=` attributes exist, and only on `MobileTabBar.tsx:44` and `DesktopDock.tsx:39` — never on any rail |
| Active pill | ⚠️ partial | a tinted rounded-`14px` row, not a pill: `AppRail.tsx:66` / `AgentNav.tsx:88` / `AdminNav.tsx:53`. No motion, no shadow, no left accent bar, no sliding indicator |
| Grouped sections, small-caps labels | ⚠️ only one of three | `AppRail.tsx:106-107` has `<hr>` + `<h2 class="nf-overline">{t.nav.accountLabel}</h2>`. `AgentRail` — 10 items, **no groups**. `AdminRail` — 8 items, **no groups**, despite `nav.ts:5-8` documenting them as "safety queues / supply queues / human queues / switches" |
| Coloured status dots per row | ❌ | dots exist only on the *mode* pills (`AgentNav.tsx:48`, `app/admin/layout.tsx:105`), never per-destination |
| Count badges | ⚠️ one of three real | see Q8 |
| Filter chips at top of list pane | ❌ | none |

### Q8 — Unread / notification badges

| Surface | State | Evidence |
|---|---|---|
| `AppRail` (consumer) | **Dead code.** `RailItem` declares `badge?: number` (`AppRail.tsx:18`) and the row renders it (`:83-85`), but **not one of the 14 items ever sets it** (`:36-54`). Notifications and Messages carry no count. | P1 |
| `MobileTabBar` | No badge support at all — no `badge` field on `Tab` (`MobileTabBar.tsx:19`), no dot markup. | P1 |
| `DesktopDock` | No badge support (`DesktopDock.tsx:16`), even though it exists *solely* to surface Notifications and Messages. | P1 |
| `AgentNavList` | Badge renders (`AgentNav.tsx:96-103`) — but the value is **hardcoded**: `AgentNav.tsx:26` → `{ href: "/agent/messages", …, badge: 3 }`. Every agent, forever, sees "3". | **P0 — fabricated data; App Store review risk** |
| `AdminRail` / `AdminTabs` | ✅ **The only real ones.** Live counts from `getQueueCounts()` (`app/admin/layout.tsx:39-48`) → `AdminNav.tsx:59-63` and `:102-106`. | ✅ |
| `SiteHeader` | none | — |

Design quality of the ones that exist: `AdminNav.tsx:60` is
`h-5 min-w-5 rounded-full bg-[var(--nf-brand-primary)] … text-[0.6875rem]` — a
20px circle, correct tabular figures via `nf-numeric`. Acceptable but plain: no
`99+` truncation (a queue of 1,240 will blow the rail width), no dot-only variant
for "unread but uncounted", no semantic colour (an *alerts* count is the same
brand blue as a *listings* count, contradicting brief §5 "Semantic colour, never
generic"). There is a `.nf-count-badge` class at `globals.css:1747-1760` that
**no nav surface uses**.

### Q9 — Header treatment

**Every header is static. There is no scroll-aware chrome anywhere in the product.**

`grep -rn 'addEventListener("scroll"\|useScroll\|scrollY'` across all `.tsx` →
**zero hits.** Consequences:

- No blur-in on scroll: `AppShell.tsx:90`, `AgentShell.tsx:37`, `app/admin/layout.tsx:70` and `SiteHeader.tsx:28` all apply `nf-glass` unconditionally from scroll position 0. The header is already fully blurred and bordered while sitting on an unscrolled hero.
- No large-title → compact-title collapse. `PageHeader.tsx:58` renders one `nf-h2` inside the *content*, and the sticky header above it never picks the title up. So on a long page you scroll past the page title and the sticky bar shows only a hamburger and a theme toggle — no orientation.
- No hide-on-scroll-down / show-on-scroll-up.
- `SiteHeader.tsx:28` is `border-b border-transparent` — a transparent bottom border that is *never* switched on. That is clearly a stub for a scroll-aware border that was never wired.

**Hero media does NOT run under the header or the status bar.**
`ListingGallery.tsx:111` is `relative -mx-5 -mt-8 sm:mx-0 sm:mt-0` — it bleeds to
the *left/right screen edges* and up to the top of `AppShell`'s content box
(`AppShell.tsx:127`, `nf-shell py-8`), but that box begins **below** the 64px
sticky glass header. The hero therefore starts 64px down the screen with a fully
opaque-ish glass bar sitting above it. Brief §3 requires "Hero media runs
edge-to-edge under the status bar with floating circular glass controls on top
of it." The floating glass controls exist and are good
(`ListingGallery.tsx:162, 187, 196` — `bg-black/45 backdrop-blur-md`), but they
are floating over a hero that is boxed under chrome.

### Q10 — Consistency across guest app / agent workspace / admin

**Three different navigation designs sharing a colour palette. This is the single
biggest problem in the audit.**

| Dimension | Guest app | Agent workspace | Admin console |
|---|---|---|---|
| **Mobile primary nav** | floating 5-item glass pill (`MobileTabBar.tsx:33`) | hamburger → 18.5rem left drawer (`AgentMobileNav.tsx:93-97`) | horizontally-scrolling chip strip under the header (`AdminNav.tsx:85-88`) |
| **Mobile secondary nav** | *also* a hamburger → full-screen drawer (`AppShell.tsx:66-78`) — **two competing primary navs on the same screen**, overlapping on Home/Bookings/Profile | — | — |
| **Drawer geometry** | `absolute inset-0` full-screen (`AppShell.tsx:74`) | `w-[18.5rem] max-w-[85vw]` side panel (`AgentMobileNav.tsx:95`) | n/a |
| **Drawer motion** | none — conditionally mounted, `nf-rise` fade only (`AppShell.tsx:66, 74`) | `translate-x` slide, `duration-300 ease-out`, stays mounted (`AgentMobileNav.tsx:95-96`) | n/a |
| **Drawer Escape key** | ❌ absent | ✅ `AgentMobileNav.tsx:36-43` | n/a |
| **Drawer `inert`** | ❌ absent | ✅ `AgentMobileNav.tsx:75` | n/a |
| **Drawer safe-area** | ❌ absent | ✅ `AgentMobileNav.tsx:98` | n/a |
| **Icon family** | `UiIcon` — stroked line glyphs (`AppRail.tsx:72`, `MobileTabBar.tsx:55`, `DesktopDock.tsx:41`) | `BrandIcon` — filled 3D marks at 26px (`AgentNav.tsx:92-94`) | `UiIcon` — stroked, 18px (`AdminNav.tsx:57`) |
| **Active-row style** | `bg-[color-mix(… brand 22% …)]` (`AppRail.tsx:66`) | inline `style` `color-mix(… mode-agent 18% …)` (`AgentNav.tsx:88`) | `bg-[color-mix(… brand 22% …)]` (`AdminNav.tsx:53`) — three near-but-not-identical recipes, one of them an inline style |
| **Active-route matching** | **exact equality** `item.href === active` (`AppRail.tsx:57`, `MobileTabBar.tsx:37`) | exact equality, `active` passed by hand per page (`AgentNav.tsx:73`) | proper prefix helper `isActive()` (`AdminNav.tsx:23-26`) |
| **Bottom dock at `lg`** | ✅ `DesktopDock` | ❌ | ❌ |
| **ThemeToggle in chrome** | ✅ `AppShell.tsx:113` | ❌ | ❌ |
| **Rail rendered from a shared component** | `AppRail` | `AgentRail` | **hand-inlined `<aside>` in `app/admin/layout.tsx:50-67`** — the class string is duplicated verbatim from the other two |
| **Search in header** | ❌ | ✅ `AgentShell.tsx:53-65` | ❌ |
| **BackButton in header** | ❌ (uses in-content `PageHeader`) | ✅ `AgentShell.tsx:41` | ✅ `app/admin/layout.tsx:74` |

**Consequential bug from the exact-equality matching (P1):** `AppRail.tsx:39-43`
registers hrefs `"/search?type=hotel"`, `"/search?type=property"`,
`"/search?type=home"`, `"/search?type=restaurant"`, `"/search?type=experience"`.
`AppShell.tsx:36` supplies `active = usePathname()`, which returns
`"/search"` — **never** the query string. **Five of the seven Discovery rail
rows can never highlight.** Likewise, on `/listing/:id`, `/messages`,
`/wallet`, `/notifications`, `/settings` and `/checkout`, **no tab in the mobile
tab bar is active** — the user is on a screen with zero orientation cue.

### Q11 — Mobile menu / drawer: designed sheet, or plain overlay?

**Plain overlays. `grep -rni "detent\|drag handle\|drag-handle"` → zero hits
codebase-wide. No drag handle, no detent, no swipe-to-dismiss, no rubber-band,
anywhere.**

- **`MobileMenu.tsx:61-130` (marketing).** Portalled to `document.body` (`:62`, with a good comment at `:55-60` explaining the backdrop-filter containing-block trap). The panel is `absolute inset-0 … overflow-y-auto bg-[var(--nf-surface-primary)]` (`:71`) — a **full-screen opaque takeover**, not a sheet. The file comment at `:12` calls it "a right hand slide-in panel"; the code is neither right-hand nor sliding. `nf-rise` (`globals.css:2577-2578`) is a fade+translate on mount only; there is **no exit animation** — the whole thing is `{open && createPortal(…)}` so dismissal is an instant unmount pop. No Escape handler. No focus trap. No focus return to the opener. The backdrop is a full-viewport `<button aria-label={closeLabel}>` (`:64-69`) which puts a giant invisible button first in the tab order.
- **`AppShell.tsx:66-78` (personal drawer).** Same pattern, worse: `absolute inset-0` full-screen (`:74`), conditionally mounted, `nf-rise` in / instant out, backdrop-as-button (`:68-73`), **no** Escape, **no** `inert`, **no** focus trap, **no** `aria-label` on the `role="dialog"` (`:67`), **no** safe-area padding.
- **`AgentMobileNav.tsx:71-130` (agent drawer).** The best of the three and the only one that is genuinely engineered: stays mounted and translates (`:95-96`), animates both directions, `inert={!open}` (`:75`), Escape (`:36-43`), scroll lock that restores the previous value (`:46-53`), safe-area bottom (`:98`), proper `aria-label` (`:74`), non-focusable backdrop with a comment explaining why (`:81-82`). Still: no drag handle, no swipe-to-dismiss, no focus trap, no focus return.
- **`ModeSwitcher.tsx:78-113` (`variant="picker"`).** An absolutely-positioned popover with **no** outside-click handler, **no** Escape, **no** `role="menu"`/`listbox`, and no `aria-haspopup`. It is also never mounted by any nav surface — only `variant="menu"` is used (`AgentRail.tsx:46`, `AgentMobileNav.tsx:127`). Dead, unpolished code in the nav layer.

### Q12 — Keyboard navigation and focus-visible

**Baseline is there, but there is a real bug in the global rule.**

`globals.css:90-100`:
```css
:where(a, button, input, select, textarea, [tabindex]):focus:not(:focus-visible) { outline: none; }
:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--nf-brand-primary);
  outline-offset: 2px;
  border-radius: var(--nf-radius-xs);   /* ← 6px, tokens.css:200 */
}
```

**The `border-radius` line is a bug.** It sets the *element's* radius, not the
outline's. This rule is **unlayered** — it sits above `@layer components`
(which opens at `globals.css:137`) — and unlayered declarations beat *every*
cascade layer, including the Tailwind `utilities` layer. The file's own comment
at `globals.css:129-136` confirms Tailwind emits utilities in a later layer.
Therefore:

- `MobileTabBar.tsx:46` `rounded-full` → **snaps to a 6px-radius square on keyboard focus.** Every tab.
- `.nf-icon-btn` (`globals.css:1580`, `radius-pill`) → same.
- `.nf-chip` / `AdminTabs` chips (`globals.css:1664`) → same.
- `.nf-dock__btn` (`globals.css:2166`) → same.
- `.nf-btn` (`globals.css:1340`, `radius-lg` 18px) → collapses to 6px.

So the entire nav layer visibly deforms under keyboard focus. The 2px brand-blue
outline *is* applied and *is* visible, so this is a polish defect rather than an
a11y failure — but it is exactly the kind of thing an App Store design reviewer
notices.

Other findings:

- ✅ Skip link exists (`globals.css:114-127`) and every shell targets `id="main"` (`AppShell.tsx:81`, `AgentShell.tsx:36`, `app/admin/layout.tsx:69`).
- ✅ `aria-current="page"` used consistently: `MobileTabBar.tsx:42`, `AppRail.tsx:62`, `DesktopDock.tsx:36`, `AgentNav.tsx:79`, `AdminNav.tsx:49, 97`.
- ✅ `LanguageSwitcher` is a native `<select>` (`LanguageSwitcher.tsx:39`) — correct choice, documented at `:13-15`.
- ❌ **No focus trap in any drawer or menu.** All three drawers let Tab escape into the page behind them.
- ❌ **No focus return.** Closing any drawer drops focus to `<body>`.
- ❌ **Backdrop-as-`<button>`** in two of three drawers (`AppShell.tsx:68-73`, `MobileMenu.tsx:64-69`) — a full-viewport tab stop announced before the menu content.
- ❌ **Duplicate landmark names.** `t.nav.primaryLabel` is the literal string `"Primary"` (`packages/i18n/src/locales/en.ts:51`) and is used as the accessible name for **four** different navigation regions: `AppRail.tsx:98` (`<aside>`), `AppRail.tsx:104` (`<nav>` inside that aside), `MobileTabBar.tsx:32`, `SiteHeader.tsx:34`. Screen-reader landmark lists will show several regions all called "Primary".
- ❌ **Hardcoded English in navigation**, on a 4-locale product: `AppRail.tsx:49` `label: "Notifications"`, `DesktopDock.tsx:20` `label: "Notifications"`, `DesktopDock.tsx:27` `aria-label="Quick access"`, `PageHeader.tsx:21` `backLabel = "Back"`, `BackButton.tsx:17` `label = "Back"`, `MobileMenu.tsx:105` `"Community"`, `:109` `"Email RentMe"`, `:114` `"RentMe AI"`. `en.ts:33-53` confirms `nav` has **no** `notifications` key.
- ❌ **`ScrollToTop` destroys back-navigation scroll restoration.** `ScrollToTop.tsx:15-17` fires `window.scrollTo({top:0, behavior:"instant"})` on **every** `pathname` change, mounted globally at `app/layout.tsx:150`. Next's App Router restores scroll on back/forward; this stomps it. Browsing a search results list, opening a listing and pressing Back returns you to the *top* of the results, not to where you were. That is the opposite of native feel.
- ❌ **No haptics anywhere.** `grep -rni "navigator.vibrate\|haptic"` → zero hits. Brief §8 requires haptics on primary actions; a tab change is the canonical one.
- ❌ **`AdminTabs` has no active-chip scroll-into-view.** `AdminNav.tsx:85-88` is a `nf-scroll-x` strip with 8 chips. On a 390px screen only ~3 fit. If the active queue is chip 7 it is off-screen with no indication, because it is a server-rendered `<nav>` with no `scrollIntoView` effect. There is also no edge fade/mask to signal scrollability (brief §5: "the next chip bleeds off the right edge").

---

## PART 3 — GAPS vs THE REFERENCE STANDARD (ranked, with severity)

### P0 — blocks "top-tier product studio"

| # | Gap | Evidence |
|---|---|---|
| **P0-1** | **Guest app, agent workspace and admin console are three unrelated navigation designs.** Floating glass pill vs. hamburger drawer vs. scrolling chip strip; `UiIcon` stroked vs. `BrandIcon` filled-3D vs. `UiIcon` stroked; three different active-row recipes; three different route-matching strategies. | `MobileTabBar.tsx:33` vs `AgentMobileNav.tsx:93` vs `AdminNav.tsx:85`; `AppRail.tsx:72` vs `AgentNav.tsx:92` vs `AdminNav.tsx:57`; `AppRail.tsx:66` vs `AgentNav.tsx:88` vs `AdminNav.tsx:53` |
| **P0-2** | **Active tab never expands into a labelled capsule; there is no sliding indicator.** The single most-cited premium tell in brief §2 is absent. Active state = a circular blob cross-fade + a 0.2px stroke delta. | `MobileTabBar.tsx:46-56`; `globals.css:2099-2134` |
| **P0-3** | **No FAB / primary create action anywhere.** Zero matches for `fab` in the codebase. | — |
| **P0-4** | **`safe-area-inset-top` handled in exactly one file.** All four sticky headers are `top-0` with `viewportFit: "cover"` active. | `app/layout.tsx:104`; `AppShell.tsx:90`, `AgentShell.tsx:37`, `app/admin/layout.tsx:70`, `SiteHeader.tsx:27` |
| **P0-5** | **Admin's entire mobile navigation is ~32px tall chips.** Primary nav below the 44pt floor. | `AdminNav.tsx:98` + `globals.css:1663` |
| **P0-6** | **`LanguageSwitcher` is ~31px tall** and appears in three headers. | `LanguageSwitcher.tsx:43-44` |
| **P0-7** | **Hardcoded fake unread badge `3` on the agent Messages row**, shipped to every agent. | `AgentNav.tsx:26` |
| **P0-8** | **No three-pane layout in the admin console.** All three rails are the identical 264px labelled sidebar; the admin one is hand-inlined rather than shared. | `AppRail.tsx:95` ≡ `AgentRail.tsx:30` ≡ `app/admin/layout.tsx:51` |

### P1 — visibly short of the bar

| # | Gap | Evidence |
|---|---|---|
| **P1-1** | Global `:focus-visible` sets `border-radius: 6px`, unlayered, so it overrides Tailwind's `rounded-full` — every pill nav item squares off on keyboard focus. | `globals.css:96-100` + `tokens.css:200` |
| **P1-2** | Sticky price bar collides with the tab bar on notched iPhones (`bottom-20`=80px vs tab-bar top edge at 94px, `z-30` under `z-50`). | `ListingStickyBar.tsx:64` vs `MobileTabBar.tsx:33` |
| **P1-3** | Tab bar bottom margin is `max(0.9rem, env(…))` → **0px** of visual margin on a notched device; should be `calc(env(…) + margin)`. | `MobileTabBar.tsx:33` |
| **P1-4** | Exact-equality route matching means **5 of 7** Discovery rail rows can never be active (hrefs carry `?type=`, `usePathname()` does not). Six consumer routes show **no** active tab at all. | `AppRail.tsx:39-43, 57`; `AppShell.tsx:36`; `MobileTabBar.tsx:37` |
| **P1-5** | `ScrollToTop` breaks back-navigation scroll restoration on every route in the product. | `ScrollToTop.tsx:15-17`; `app/layout.tsx:150` |
| **P1-6** | No scroll-aware header anywhere; `SiteHeader`'s `border-b border-transparent` is a stub that never activates. Zero scroll listeners in the codebase. | `SiteHeader.tsx:28`; `AppShell.tsx:90` |
| **P1-7** | Hero media does not run under the header/status bar; it starts 64px down. | `ListingGallery.tsx:111` inside `AppShell.tsx:127` |
| **P1-8** | Consumer app has **zero** unread indicators. `AppRail`'s `badge` field is declared and rendered but never populated; `MobileTabBar` and `DesktopDock` have no badge support at all. | `AppRail.tsx:18, 36-54, 83`; `MobileTabBar.tsx:19`; `DesktopDock.tsx:16` |
| **P1-9** | Personal drawer is materially less finished than the agent drawer: no Escape, no `inert`, no exit animation, no safe-area, no `aria-label`. | `AppShell.tsx:66-78` vs `AgentMobileNav.tsx:36-98` |
| **P1-10** | No focus trap and no focus return in any drawer/menu. Backdrop is a full-viewport `<button>` in two of three. | `AppShell.tsx:68`, `MobileMenu.tsx:64`, `AgentMobileNav.tsx:83` |
| **P1-11** | No blur+gradient scrim above the tab bar; and light mode's `--nf-glass-fill-strong: 0.96` makes the blur a no-op. | `globals.css:2068-2075`; `tokens.css:319` |
| **P1-12** | The tab bar and dock invert in light mode (white pill vs black pill) despite the code comment claiming they are one family. | `tokens.css:319` vs `globals.css:2187-2189`; comment at `globals.css:2062-2064` |
| **P1-13** | `.nf-tabbar` lacks the inner top highlight that `.nf-dock` has → not real layered glass per brief §3. | `globals.css:2068-2075` vs `globals.css:2151-2153` |
| **P1-14** | Missing bottom safe-area in the personal drawer and marketing menu. | `AppShell.tsx:74`; `MobileMenu.tsx:71` |
| **P1-15** | No `safe-area-inset-left/right` anywhere → landscape notch clips the rail and the `inset-x-4` tab bar. | codebase-wide |
| **P1-16** | Hardcoded English strings in navigation on a 4-locale product. | `AppRail.tsx:49`, `DesktopDock.tsx:20, 27`, `PageHeader.tsx:21`, `BackButton.tsx:17`, `MobileMenu.tsx:105, 109, 114` |
| **P1-17** | `.nf-icon-btn` is 41.6px while its own comment claims 44px; it is then further shrunk to 36px at most nav call sites. | `globals.css:1571, 1577-1578`; `PageHeader.tsx:53`; `AgentShell.tsx:41`; `app/admin/layout.tsx:74`; `ThemeToggle.tsx:41` |
| **P1-18** | Mobile Personal Mode ships **two** competing primary navs on the same screen (5-tab pill + 14-item hamburger drawer) with overlapping destinations. | `AppShell.tsx:93-105` + `:131` |

### P2 — polish debt

| # | Gap | Evidence |
|---|---|---|
| **P2-1** | No tooltips on any rail. Zero `tooltip` matches codebase-wide. | — |
| **P2-2** | No drag handle, detent, or swipe-to-dismiss on any sheet/drawer. Zero `detent` matches. | — |
| **P2-3** | No haptics. Zero `navigator.vibrate` matches. | — |
| **P2-4** | No filled/outline icon variant switch on active tabs. | `MobileTabBar.tsx:55` |
| **P2-5** | `AgentRail` (10 items) and `AdminRail` (8 items) have no section groups, though `nav.ts:5-8` documents the admin groups in prose. Only `AppRail.tsx:106-107` groups. | — |
| **P2-6** | No coloured status dots on nav rows; `.nf-count-badge` (`globals.css:1747`) is defined and used by no nav surface; badges have no `99+` truncation and no semantic colour. | `AdminNav.tsx:60, 103` |
| **P2-7** | `AdminTabs` has no active-chip `scrollIntoView` and no edge-fade mask. | `AdminNav.tsx:85-88`; `globals.css:2768-2774` |
| **P2-8** | `t.nav.primaryLabel = "Primary"` names four different landmarks. | `en.ts:51`; `AppRail.tsx:98, 104`; `MobileTabBar.tsx:32`; `SiteHeader.tsx:34` |
| **P2-9** | `ModeSwitcher variant="picker"` is unmounted dead code with no outside-click, no Escape, no menu semantics. | `ModeSwitcher.tsx:66-114` |
| **P2-10** | `MobileMenu`'s doc comment describes a right-hand slide-in; the code is a full-screen instant overlay. | `MobileMenu.tsx:12` vs `:71` |
| **P2-11** | `ThemeToggle` exists only in the Personal Mode header — agent and admin cannot switch theme. | `AppShell.tsx:113` |
| **P2-12** | Footer link rows are ~20px tall with 10px gaps. | `SiteFooter.tsx:92-103` |
| **P2-13** | `.nf-tab-pop-in` keyframe replays on any re-render of an already-active tab because it is keyed purely off the `aria-current` attribute selector. | `globals.css:2114-2118` |

---

## PART 4 — CONCRETE UPGRADE RECOMMENDATIONS

### R1 — Rebuild the tab bar as an expanding labelled capsule with a sliding indicator (fixes P0-2, P1-3, P2-4, P2-13)

Make the tab an inline-flex row whose label is a `grid-template-columns` animation
so it can spring from 0fr to 1fr without measuring:

```tsx
// MobileTabBar.tsx
<nav
  aria-label={t.nav.primaryLabel}
  className="nf-tabbar fixed inset-x-4 z-50 mx-auto w-fit lg:hidden"
  style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
>
  <ul className="relative flex items-center gap-1 p-1.5">
    {tabs.map((tab) => {
      const isActive = isTabActive(active, tab.href);
      return (
        <li key={tab.href}>
          <Link
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className="nf-tab group"
            data-active={isActive || undefined}
          >
            {isActive && (
              <span
                aria-hidden="true"
                className="nf-tab__indicator"
                style={{ viewTransitionName: "nf-tab-indicator" }}
              />
            )}
            <span className="nf-tab__icon">
              <UiIcon name={isActive ? `${tab.icon}-fill` : tab.icon} size={22} />
            </span>
            <span className="nf-tab__label"><span>{tab.label}</span></span>
          </Link>
        </li>
      );
    })}
  </ul>
</nav>
```

```css
.nf-tab {
  position: relative; display: inline-flex; align-items: center; gap: 0;
  height: 3rem; min-width: 3rem; padding-inline: 0.75rem;
  border-radius: var(--nf-radius-pill);
  color: var(--nf-content-secondary);
  transition: color 240ms var(--nf-ease-standard), padding-inline 380ms var(--nf-ease-spring);
}
.nf-tab[data-active] { color: #fff; padding-inline: 0.875rem; }

/* Label expansion without measuring: 0fr -> 1fr on a grid track. */
.nf-tab__label {
  display: grid; grid-template-columns: 0fr; overflow: hidden;
  transition: grid-template-columns 380ms var(--nf-ease-spring),
              opacity 200ms var(--nf-ease-standard),
              margin-left 380ms var(--nf-ease-spring);
  opacity: 0; margin-left: 0;
  font-size: 0.8125rem; font-weight: 650; letter-spacing: -0.01em;
}
.nf-tab__label > span { min-width: 0; white-space: nowrap; }
.nf-tab[data-active] .nf-tab__label {
  grid-template-columns: 1fr; opacity: 1; margin-left: 0.4375rem;
}

/* The indicator: one element, moved by the browser, not one per tab. */
.nf-tab__indicator {
  position: absolute; inset: 0; z-index: -1;
  border-radius: var(--nf-radius-pill);
  background: var(--nf-gradient-brand);
  box-shadow: 0 6px 16px -4px color-mix(in oklab, var(--nf-brand-primary) 65%, transparent),
              inset 0 1px 0 rgb(255 255 255 / 0.22);
}
::view-transition-old(nf-tab-indicator),
::view-transition-new(nf-tab-indicator) { animation-duration: 340ms; }

@media (prefers-reduced-motion: reduce) {
  .nf-tab, .nf-tab__label { transition-duration: 1ms; }
  ::view-transition-group(nf-tab-indicator) { animation: none; }
}
```

Because only the active tab renders `.nf-tab__indicator` and it carries a stable
`view-transition-name`, the browser's View Transitions API morphs it between
positions on navigation — a true sliding indicator with **no** animation library.
The app already uses this API for listing photos (`ListingCard.tsx:113`), so the
technique is established here. Wrap `router.push` in `document.startViewTransition`
where supported; the fallback is the current cross-fade.

Width check: at 390px, four collapsed tabs (48px) + one expanded (~48 + label
~62px) + gaps + padding ≈ 274 + 62 = **336px** < 358px available. It fits, but
add `max-width: 100%` and `min-width: 0` on `.nf-tab__label > span` so a long
Yorùbá/Hausa label truncates rather than overflowing.

Also add the missing filled icon variants to `UiIcon` (`home-fill`, `compass-fill`,
`calendar-booking-fill`, `heart-fill`, `user-fill`) so §1's outline→filled state
switch is real.

### R2 — Add the FAB (fixes P0-3)

Put a 56px dark circular create button **inside** the pill, centre position,
splitting the five tabs 2 / FAB / 2 — matching reference screens 10 and 12:

```tsx
const left  = tabs.slice(0, 2);
const right = tabs.slice(2);
…
<ul className="flex items-center gap-1 p-1.5">
  {left.map(renderTab)}
  <li className="mx-0.5">
    <Link href="/agent/list" aria-label={t.agent.nav.listApartment} className="nf-tab-fab">
      <UiIcon name="plus" size={24} strokeWidth={2.2} />
    </Link>
  </li>
  {right.map(renderTab)}
</ul>
```
```css
.nf-tab-fab {
  display: grid; place-items: center; width: 3.25rem; height: 3.25rem;
  border-radius: var(--nf-radius-pill);
  background: var(--nf-content-primary); color: var(--nf-surface-canvas);
  box-shadow: 0 10px 24px -8px rgb(0 0 0 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.14);
  transition: transform 160ms var(--nf-ease-standard);
}
.nf-tab-fab:active { transform: scale(0.92); }
```
Pair with `navigator.vibrate?.(8)` on press (fixes P2-3) and add the same to the
tab `onClick`.

### R3 — Fix safe areas systematically (fixes P0-4, P1-14, P1-15)

Add two utilities and apply them at the four shells:

```css
.nf-safe-top    { padding-top:    env(safe-area-inset-top, 0px); }
.nf-safe-x      { padding-left:  env(safe-area-inset-left, 0px);
                  padding-right: env(safe-area-inset-right, 0px); }
.nf-safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
```

- `AppShell.tsx:90` → `<header className="nf-glass nf-safe-top sticky top-0 …">`, same for `AgentShell.tsx:37`, `app/admin/layout.tsx:70`, `SiteHeader.tsx:28`. Put the inset on the header element, **outside** the fixed-height inner row, so the row keeps its 64px and the bar simply grows.
- `AppShell.tsx:74` and `MobileMenu.tsx:71` → add `nf-safe-top nf-safe-bottom nf-safe-x`.
- `MobileTabBar.tsx:33` → replace `bottom-[max(0.9rem,env(…))]` with `style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}`.
- `AppShell.tsx:85` → replace `pb-24` with `pb-[calc(env(safe-area-inset-bottom,0px)+7.5rem)]` so clearance is constant, not 2px on a notch.
- Rails (`AppRail.tsx:95`, `AgentRail.tsx:30`, `app/admin/layout.tsx:51`) → add `pl-[env(safe-area-inset-left,0px)]`.

### R4 — Fix the touch-target floor (fixes P0-5, P0-6, P1-17)

- `globals.css:1577-1578` → `width: 2.75rem; height: 2.75rem;` (44px) and delete every `h-9 w-9` / `h-10 w-10` override in nav call sites (`PageHeader.tsx:53`, `AgentShell.tsx:41`, `app/admin/layout.tsx:74`, `ThemeToggle.tsx:41`, `MobileMenu.tsx:46, 78`, `AppShell.tsx:98`, `AgentMobileNav.tsx:63, 108`). Fix the lying comment at `globals.css:1571`.
- `LanguageSwitcher.tsx:43-44` → drop the `paddingBlock` style override entirely and set `min-height: 2.75rem` on the `<select>`. The compact form should shrink horizontally (`px-2.5`), never vertically.
- `AdminNav.tsx:98` → drop `!py-1.5`; give the mobile chips `min-height: 2.75rem` and `padding-inline: 0.875rem`. Better still, see R5.
- Where a 44px hit area would look visually heavy, keep the paint small and expand the target with a pseudo-element instead of the box:
  ```css
  .nf-hit::after { content:""; position:absolute; inset:50% auto auto 50%;
                   width:2.75rem; height:2.75rem; transform:translate(-50%,-50%); }
  ```

### R5 — Unify the three workspaces on one navigation language (fixes P0-1, P0-8, P2-5)

1. **Extract one `NavRail` primitive** to `components/nav/NavRail.tsx` taking
   `{ groups: { label?: string; items: NavItem[] }[], active, footer }`, where
   `NavItem = { href, label, icon, badge?, dot?: Tone }`. Delete the three
   duplicated `<aside>` class strings (`AppRail.tsx:95`, `AgentRail.tsx:30`,
   `app/admin/layout.tsx:51`) and the hand-inlined admin aside.
2. **One active-row recipe**, a pill with a left accent bar and its own shadow:
   ```css
   .nf-nav-row { position: relative; border-radius: var(--nf-radius-md); }
   .nf-nav-row[aria-current="page"] {
     background: color-mix(in oklab, var(--nav-accent, var(--nf-brand-primary)) 18%, transparent);
     color: var(--nf-content-primary);
     box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.06);
   }
   .nf-nav-row[aria-current="page"]::before {
     content:""; position:absolute; left:-0.5rem; top:50%; translate:0 -50%;
     width:3px; height:1.125rem; border-radius:999px; background: var(--nav-accent, var(--nf-brand-primary));
   }
   ```
   Agent Mode sets `--nav-accent: var(--nf-mode-agent)` on the rail root — one
   recipe, one token swap, instead of an inline `style` at `AgentNav.tsx:88`.
3. **Group every rail with `nf-overline` small-caps headers**, using the groupings
   already documented in `nav.ts:5-8` (Overview / Safety / Supply / People /
   Switches) and an equivalent split for the agent's ten.
4. **One icon family in nav.** Move Agent Mode's rows to `UiIcon` stroked glyphs
   (`AgentNav.tsx:92-94`) and keep `BrandIcon` for content surfaces, matching the
   rule already stated at `AppRail.tsx:15-16`.
5. **Give Agent Mode the same floating tab bar** with its 5 most-used destinations
   (Dashboard, Listings, Bookings, Messages, Earnings) and keep the drawer as the
   "More" affordance behind the 5th slot — so the phone gesture is identical in
   both modes. Same for admin: 5 tabs (Overview, Flags, Alerts, Applications,
   More) instead of the 32px chip strip.
6. **One route matcher.** Promote `AdminNav.tsx:23-26` to `lib/nav/isActive.ts`,
   make it compare `URL` pathname **and** the `type` search param, and use it in
   `AppRail.tsx:57`, `MobileTabBar.tsx:37` and `AgentNav.tsx:73`. This fixes P1-4.

### R6 — Build the real three-pane admin (fixes P0-8)

Convert `app/admin/[queue]` to a parallel-route layout:

```
app/admin/layout.tsx           → grid: [72px icon rail | 340px list | 1fr detail]
app/admin/@list/[queue]/page.tsx
app/admin/@detail/[queue]/[id]/page.tsx
app/admin/@detail/default.tsx  → designed empty state ("Pick an item to review")
```
```css
.nf-console { display: grid; grid-template-columns: 4.5rem 21.25rem minmax(0,1fr); height: 100dvh; }
@media (max-width: 1279px) { .nf-console { grid-template-columns: 4.5rem minmax(0,1fr); } }
```
Collapse the rail to a **72px icon rail** with a real tooltip built on the
Popover API so it needs no library and no z-index war:

```tsx
<Link href={item.href} popoverTarget={`tip-${item.key}`} className="nf-railicon">
  <UiIcon name={item.icon} size={22} />
  {count > 0 && <span className="nf-railicon__badge">{count > 99 ? "99+" : count}</span>}
</Link>
<div popover="hint" id={`tip-${item.key}`} className="nf-tooltip">{label}</div>
```
```css
.nf-tooltip {
  position: absolute; margin: 0; inset: auto;
  position-anchor: --rail-item;            /* progressive: falls back to static */
  padding: 0.375rem 0.625rem; border-radius: var(--nf-radius-sm);
  background: var(--nf-surface-elevated); border: 1px solid var(--nf-border-subtle);
  box-shadow: var(--nf-shadow-float); font-size: 0.75rem; font-weight: 600;
}
```
The list pane gets filter chips at the top (reuse `.nf-chip`), avatar-led rows,
per-row `statusTone()` dots (the tone map already exists at
`app/admin/_components/ui.tsx:25-57` — wire it to a 6px dot instead of only a
chip), and trailing relative timestamps.

### R7 — Make the glass real and add the scrim (fixes P1-11, P1-12, P1-13, Q3)

```css
.nf-tabbar, .nf-dock {
  background:
    linear-gradient(180deg, rgb(255 255 255 / 0.14), rgb(255 255 255 / 0.06)) padding-box,
    linear-gradient(180deg, rgb(255 255 255 / 0.30), rgb(255 255 255 / 0.06)) border-box;
  border: 1px solid transparent;
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.18),   /* bright top-edge highlight */
    0 2px 6px -2px rgb(0 0 0 / 0.30),        /* contact shadow */
    0 20px 48px -16px rgb(0 0 0 / 0.62);     /* wide ambient */
}
:root[data-theme="light"] .nf-tabbar,
:root[data-theme="light"] .nf-dock {
  background: rgb(18 21 26 / 0.86);          /* ONE decision — both go dark */
  border-color: rgb(255 255 255 / 0.10);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.12),
              0 18px 40px -14px rgb(18 21 26 / 0.34);
}
```
This deletes the light-mode inversion (`tokens.css:319` no longer reaches these
two classes; the `.nf-dock` override at `globals.css:2187-2189` becomes shared)
and gives both surfaces the inner highlight the brief demands.

For the scrim, mask the scroll container rather than painting a gradient div —
it works over any content and costs nothing:

```css
@media (max-width: 1023px) {
  .nf-scroll-scrim {
    -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 5rem), transparent 100%);
            mask-image: linear-gradient(to bottom, #000 calc(100% - 5rem), transparent 100%);
    -webkit-mask-size: 100% 100vh; mask-size: 100% 100dvh;
    -webkit-mask-position: 0 100%; mask-position: 0 100%;
    -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
    -webkit-mask-attachment: fixed;  mask-attachment: fixed;
  }
}
```
Apply to `AppShell.tsx:127`'s `<div className="nf-shell py-8 …">`.

### R8 — Scroll-aware headers (fixes P1-6, P1-7)

Use a zero-JS sentinel + `IntersectionObserver`-free CSS where possible; where a
title collapse is needed, one shared hook:

```tsx
// components/nav/useScrolled.ts
export function useScrolled(threshold = 8) {
  const [scrolled, set] = useState(false);
  useEffect(() => {
    const el = document.createElement("div");
    // cheaper: rAF-throttled scroll, or a 1px sentinel + IntersectionObserver
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => set(window.scrollY > threshold)); };
    window.addEventListener("scroll", on, { passive: true }); on();
    return () => { window.removeEventListener("scroll", on); cancelAnimationFrame(raf); };
  }, [threshold]);
  return scrolled;
}
```
```tsx
<header data-scrolled={scrolled || undefined} className="nf-appbar nf-safe-top sticky top-0 z-40">
```
```css
.nf-appbar { background: transparent; border-bottom-color: transparent;
             backdrop-filter: none; transition: background 220ms, backdrop-filter 220ms, border-color 220ms; }
.nf-appbar[data-scrolled] {
  background: var(--nf-glass-fill);
  backdrop-filter: blur(22px) saturate(160%); -webkit-backdrop-filter: blur(22px) saturate(160%);
  border-bottom-color: var(--nf-border-subtle);
}
/* Title collapse: hidden at rest, slides up when the page title scrolls away. */
.nf-appbar__title { opacity: 0; transform: translateY(6px); transition: opacity 200ms, transform 200ms; }
.nf-appbar[data-scrolled] .nf-appbar__title { opacity: 1; transform: none; }
```
This also unlocks the hero-under-header treatment: with the header transparent at
rest, change `ListingGallery.tsx:111` to `-mt-[calc(4rem+env(safe-area-inset-top,0px))]`
so the photography runs edge-to-edge behind the status bar, and lift its existing
top scrim (`ListingGallery.tsx:150`) to `h-32` so the floating controls stay legible.

### R9 — Fix the focus-ring bug and finish keyboard support (fixes P1-1, P1-10, P2-8)

`globals.css:96-100` — **delete the `border-radius` declaration.** Outlines already
follow the element's own radius in every browser that ships `:focus-visible`.
Keep `outline: 2px solid` + `outline-offset: 2px`, and add a second ring so the
focus is visible on both dark glass and light paper:

```css
:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--nf-brand-primary);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--nf-brand-primary) 25%, transparent);
}
```

Add a shared `useDismissable(open, close, panelRef, openerRef)` hook doing:
Escape, focus-trap (cycle first↔last of
`panelRef.current.querySelectorAll('a[href],button:not([disabled]),…')`), initial
focus into the panel, and focus return to `openerRef` on close. Apply to
`AppShell.tsx:66`, `MobileMenu.tsx:63`, `AgentMobileNav.tsx:71`,
`ModeSwitcher.tsx:78`. Replace the backdrop `<button>` in `AppShell.tsx:68` and
`MobileMenu.tsx:64` with `<div aria-hidden="true" onClick={close} />`, matching
the pattern already correct at `AgentMobileNav.tsx:83-90`.

Rename the landmarks: `en.ts:51` → `primaryLabel: "Primary navigation"`, and give
each region its own key (`railLabel`, `tabBarLabel`, `siteNavLabel`,
`quickAccessLabel`) so `AppRail.tsx:98/104`, `MobileTabBar.tsx:32`,
`SiteHeader.tsx:34` and `DesktopDock.tsx:27` stop colliding. Add
`nav.notifications` and `nav.quickAccess` and `a11y.back` to all four locale files
and remove the hardcoded English at `AppRail.tsx:49`, `DesktopDock.tsx:20, 27`,
`PageHeader.tsx:21`, `BackButton.tsx:17`, `MobileMenu.tsx:105, 109, 114`.

### R10 — Real badges everywhere (fixes P0-7, P1-8, P2-6)

Delete `badge: 3` at `AgentNav.tsx:26`. Add a `NavCountsProvider` fed by the same
server-side pattern the admin console already proves works
(`app/admin/layout.tsx:39-48` → `getQueueCounts()`), resolving unread messages and
notifications once per shell render and passing them into `AppRail`,
`MobileTabBar`, `DesktopDock` and `AgentNavList`. Add a badge slot to
`MobileTabBar`'s `Tab` type and `DesktopDock`'s `DockItem` type — a 8px dot for
tabs (a number is illegible at 48px), a count pill for rails.

```css
.nf-nav-badge {
  min-width: 1.25rem; height: 1.25rem; padding-inline: 0.375rem;
  border-radius: 999px; font-size: 0.6875rem; font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: var(--badge-bg, var(--nf-brand-primary)); color: #fff;
}
.nf-nav-dot {
  position: absolute; top: 0.5rem; right: 0.5rem;
  width: 0.5rem; height: 0.5rem; border-radius: 999px;
  background: var(--nf-state-error);
  box-shadow: 0 0 0 2px var(--nf-glass-fill-strong);
}
```
Truncate at `99+`. Colour by semantics via `statusTone()`
(`app/admin/_components/ui.tsx:25`): alerts/flags → `--nf-state-error`,
applications → `--nf-state-warning`, everything else → brand.

### R11 — Sheet mechanics: handle, detents, swipe-to-dismiss (fixes P2-2)

Rebuild the mobile drawers on `<dialog>` so the browser gives you the top layer,
the backdrop, Escape, focus-trap and focus-return for free — deleting most of
R9's manual work for these two surfaces:

```tsx
<dialog ref={ref} className="nf-sheet" onClose={close}>
  <div className="nf-sheet__grip" aria-hidden="true" />
  …
</dialog>
```
```css
.nf-sheet { margin: 0 auto auto 0; height: 100dvh; width: 18.5rem; max-width: 85vw;
            border: 0; padding: 0; background: var(--nf-surface-primary);
            translate: -100% 0; transition: translate 320ms var(--nf-ease-spring), overlay 320ms allow-discrete, display 320ms allow-discrete; }
.nf-sheet[open] { translate: 0 0; }
@starting-style { .nf-sheet[open] { translate: -100% 0; } }
.nf-sheet::backdrop { background: rgb(0 0 0 / 0); backdrop-filter: blur(0px);
                      transition: all 320ms allow-discrete; }
.nf-sheet[open]::backdrop { background: rgb(0 0 0 / 0.55); backdrop-filter: blur(6px); }
.nf-sheet__grip { width: 2.25rem; height: 0.25rem; border-radius: 999px;
                  background: var(--nf-content-muted); opacity: 0.4; margin: 0.5rem auto; }
```
`@starting-style` + `transition-behavior: allow-discrete` gives a real **exit**
animation, which none of the three drawers currently has. For bottom sheets
(`ListingsWorkspace.tsx:186`, `BookingsWorkspace.tsx:127`) add CSS scroll-snap
detents: a scroll container with `scroll-snap-type: y mandatory` and two
snap children (peek / full) gives native rubber-band detents with zero JS.

### R12 — Small fixes

- `ListingStickyBar.tsx:64` → `bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)]` and bump to `z-30` under a tab bar that stays `z-50`; or better, merge it *into* the tab bar area as a two-row floating stack so there is one bottom object, not two.
- `ScrollToTop.tsx:15-17` → gate on navigation type. Read `window.history.state?.idx` and compare with a ref of the previous idx: only scroll to top when the index **increased** (a push). Or simply delete the component and let Next's built-in scroll restoration do its job.
- `AdminNav.tsx:85` → add `ref` + `useEffect(() => activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" }), [pathname])`, and add an edge mask: `mask-image: linear-gradient(to right, transparent 0, #000 1rem, #000 calc(100% - 2rem), transparent 100%)`.
- `AppShell.tsx:93-105` → once R5 gives every mode a tab bar, make the 5th tab a "More" sheet and **delete the mobile hamburger**, so Personal Mode stops shipping two primary navs.
- `globals.css:2114` → drive the pop from a `data-just-activated` attribute set in an effect on `active` change, not from `aria-current`, so it fires once per real navigation.
- `ThemeToggle` → mount in `AgentShell.tsx:67` and `app/admin/layout.tsx:79` beside the LanguageSwitcher.
- `ModeSwitcher.tsx:66-114` → either wire `variant="picker"` into the app header as the mode entry point (it is the better UI and matches the "Choose your mode" reference) or delete it.
- `SiteFooter.tsx:96` → `className="block py-2 text-[0.875rem] …"` to lift link rows to 40px.
- Decide **NaijaFinds vs RentMe** and sweep `app/manifest.ts:26-28`, `SiteFooter.tsx:74, 147`, `MobileMenu.tsx:109, 114` before submission.

---

## Findings count

**58 distinct findings** — 8 P0, 18 P1, 13 P2, plus 19 supporting observations
recorded inline in Part 2 (route-matching, i18n, landmark naming, scroll
restoration, dead code, doc/code mismatches).
