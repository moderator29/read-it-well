# Audit 08 — Marketing site, Auth, Onboarding, Motion, App Store / PWA readiness

> **SUPERSEDED 2026-08-09. Not a backlog, and every count in it needs re-measuring.**
> This audit grades the codebase against `00-reference-brief.md`, which is retired
> because it produced the visual overload the platform is now removing. Read the
> banner at the top of that file before acting on anything here. The current
> design and navigation work is `RECOMMENDATIONS.md` sections 2 and 3.


Scope: `apps/web/src/app/(site)/**`, `app/page.tsx`, `components/site/**`,
`app/(auth)/**`, `components/auth/**`, `app/offline/**`, `app/manifest.ts`,
`app/layout.tsx`, `public/sw.js`, `public/pwa/**`, `app/globals.css`,
`packages/design-tokens/src/tokens.css`.

Yardsticks: PREMIUM_REFERENCE_BRIEF §6 (layout/composition), §7 (motion),
§8 (App Store readiness); reference screens 11 (onboarding set), 14 (design
studio marketing site), 15 (SaaS marketing hero variants).

Verdict up front: **the craft level of the CSS material system is genuinely high
— arguably the best thing in the repo — but the marketing page is built on the
wrong information architecture for reference 14/15, the auth screen is not
designed at all against reference 11, there is no onboarding flow (only a 5.2s
splash), and App Store readiness has four hard blockers (demo CTA, safe-area
top, 44pt targets, no splash/theme-color-per-theme).**

Total findings: **47** (7× P0, 21× P1, 19× P2).

---

# PART A — WHAT EXISTS

## A1. Marketing site

### Landing page — `apps/web/src/app/page.tsx` (417 lines)

Section order as built:

| # | Section | File |
|---|---|---|
| 0 | `<Onboarding />` full-screen splash | `components/site/Onboarding.tsx` |
| 1 | Hero: aurora + grid veil + 3 floating 3D icons + masked villa still + display headline + search form + FilterLink + 5 city chips | `page.tsx:73–196` |
| 2 | 4-up feature row (3D icon + title + body) | `page.tsx:172–195` |
| 3 | StoryRail — 8 cinematic cards in a snap carousel | `landing/StoryRail.tsx` |
| 4 | HowItWorks — 3 numbered steps with connector hairline | `landing/HowItWorks.tsx` |
| 5 | FeaturedCarousel — 6 real listings from the repository | `landing/FeaturedCarousel.tsx` |
| 6 | VillaShowcase — split card, artwork + 2 benefits | `landing/SignatureShowcase.tsx:13` |
| 7 | Facts band — 4 hardcoded stat cards | `page.tsx:210–230` |
| 8 | PlatformConsole — sunken panel, tag pills, StatChart | `landing/PlatformConsole.tsx` |
| 9 | Vision/mission — 2-col + 4 value cards | `page.tsx:238–276` |
| 10 | Categories — 5 tiles | `page.tsx:279–302` |
| 11 | MoodRow — 6 snap chips | `landing/MoodRow.tsx` |
| 12 | PopularDestinations — 6 cities | `landing/PopularDestinations.tsx` |
| 13 | CoverageMap — one big map image link | `SignatureShowcase.tsx:80` |
| 14 | AgentsBand — split card + floating icon cluster | `landing/AgentsBand.tsx` |
| 15 | WhyRentMe — 4 value cards | `landing/WhyRentMe.tsx` |
| 16 | AssistantShowcase — split card + prompt chips | `SignatureShowcase.tsx:112` |
| 17 | NumbersBand — 4 Odometer figures | `landing/NumbersBand.tsx` |
| 18 | Trust strip — 5 divided cells | `page.tsx:323–355` |
| 19 | FAQ — 12 `<details>` accordions | `page.tsx:358–388` |
| 20 | CTA card | `page.tsx:391–411` |
| 21 | SiteFooter | `components/site/SiteFooter.tsx` |

That is **21 sections and roughly 9 separate "value / benefit / trust" blocks**
(2, 3, 4, 6, 9, 15, 16, 18 all restate the same four promises: verified,
naira, four languages, AI assistant).

### Content pages
`(site)/about` (165), `careers` (174), `contact` (117 + ContactForm 86),
`help` (164 + HelpSearch 109), `privacy` (286), `terms` (289). All share
`(site)/layout.tsx` → SiteHeader + aurora + SiteFooter. All are competently
written and honest (careers has a real designed empty state for "no open
roles"; contact says the form is a stub).

### Chrome
- `SiteHeader.tsx` — sticky glass bar, 7 desktop links, LanguageSwitcher, two
  primary buttons (Sign in + Sign up), `MobileMenu`.
- `SiteFooter.tsx` — brand block, 4 link columns, language chips, App Store /
  Google Play lockups, copyright.
- `MobileMenu.tsx` — portalled full-screen panel with chevron rows.

## A2. Auth

- `(auth)/layout.tsx` — centred column on the ambient canvas: `LogoLockup`
  104px, tagline, a **24rem glass card**, "Back to home" link. `nf-rise`
  stagger at 0 / 90 / 180 ms.
- `components/auth/AuthPanel.tsx` (559 lines) — one component for both modes.
  Order: h2 + sub → optional notice → **"Explore the demo" primary button** →
  "or continue" divider → collapsed "Continue with email" row that expands
  into the form → error alert → Google row → Apple row → provider-unavailable
  note → "Already have an account? Sign in" → terms notice.
- Field primitives in the same file: `Field`, `SelectField` (native select with
  drawn chevron), `PasswordField` (real toggle button, `aria-pressed`,
  swapped label), `StrengthMeter` (4 segments + live label), `FieldError`
  (`role="alert"`, `aria-describedby` wired).
- `ProviderMarks.tsx` — correct 4-colour Google G, correct Apple glyph, stroke
  mail glyph. Brand marks are right.
- `lib/auth/actions.ts` powers real `signInWithPassword` / `signUp` / OAuth;
  unconfigured providers render disabled with an honest explanation.

## A3. Onboarding

`components/site/Onboarding.tsx` (116 lines). It is **not a flow**. It is a
one-shot, 5.2-second, auto-dismissing full-screen image of
`/brand/story-world.png` with a "Skip" pill, an overline, one `nf-h2`, a slow
Ken-Burns pull-back (`nf-onboarding-pan`, globals.css:661–667), Escape to
close, `localStorage` key `nf_onboarded`. Reduced motion skips it entirely and
marks it seen. No steps, no progress, no questions, no option cards, no CTA.

## A4. Motion system

No `framer-motion`, no `motion/react` — verified against
`apps/web/package.json`. **Everything is CSS.** 47 `@keyframes` blocks, all in
`globals.css`, all inside `@layer components`, plus tokenised durations/easings
in `tokens.css:211–220`.

Full keyframe inventory (`globals.css`):

| Keyframe | Line | Purpose |
|---|---|---|
| `nf-gallery-pan` | 273 | gallery Ken Burns |
| `nf-ring` | 424 | bell icon symbol effect |
| `nf-confirm-pop` | 435 | confirm settle |
| `nf-verify-pulse` | 443 | verification ring |
| `nf-confirm-dim` | 474 | booking-confirm room dim |
| `nf-confirm-sweep` | 497 | light band across card |
| `nf-msg-in-right/left` | 530/534 | message bubble direction |
| `nf-typing-breathe` | 544 | typing dots |
| `nf-bot-spin` | 597 | assistant thinking ring |
| `nf-listing-fold` | 617 | assistant result stagger |
| `nf-onboarding-pan` | 664 | onboarding camera |
| `nf-status-assemble` | 686 | agent approval ceremony |
| `nf-tile-sheen` | 731 | living-glass specular |
| `nf-balance-pulse-up/down` | 827/832 | wallet delta |
| `nf-tx-slide-in/out` | 849/853 | ledger row direction |
| `nf-hero-scroll` | 887 | scroll-linked hero (view timeline) |
| `nf-art-breathe` | 903 | artwork breathing |
| `nf-scene-live` | 913 | scene drift |
| `nf-enter-up` / `nf-enter-scale` / `nf-parallax-soft` | 1014/1024/1034 | scroll-linked section entrances |
| `nf-word-in` | 1063 | word-by-word headline |
| `nf-rule-draw` | 1096 | hairline draw |
| `nf-drift` | 1111 | decorative float |
| `nf-map-pin-drop` / `nf-map-cluster-drop` / `nf-map-pin-breathe` / `nf-map-pin-bloom` | 1188/1197/1213/1234 | map marks |
| `nf-shimmer` | 1613 | skeleton |
| `nf-moment-badge-in` | 1922 | moment screen badge |
| `nf-tab-pop-in` | 2088 | tab pill pop |
| `nf-aurora-pulse` / `nf-aurora-drift` | 2349/2353 | ambient canvas |
| `nf-drift-a/b/c` | 2358/2362/2366 | ambient blooms |
| `nf-spin` | 2413 | living stride (`@property --nf-spin`) |
| `nf-breathe` | 2440 | CTA bloom |
| `nf-rise` | 2545 | entrance |
| `nf-float` | 2556 | float |
| `nf-pulse-ring` | 2566 | pulse (declared, class never applied) |
| `nf-reveal-in` | 2675 | scroll reveal |
| `nf-card-in` | 2709 | grid stagger |
| `nf-shine` | 2728 | headline sheen |

Plus JS-side directors: `LivingCanvas.tsx` (pointer bloom + card light spot +
Lagos daypart grading), `TiltField.tsx` (3D tile lean), `Reveal.tsx`
(IntersectionObserver fallback), `Odometer.tsx` (digit strips), `ScrollToTop.tsx`.

View Transitions are wired for the card → gallery photo morph
(`ListingCard.tsx:131`, `ListingGallery.tsx:129`, `globals.css:64–70`).

## A5. App Store / PWA

- `layout.tsx:97–105` — `viewport` with `themeColor: "#010118"`,
  `viewportFit: "cover"`, `initialScale: 1`, `width: device-width`.
- `layout.tsx:80–87` — `appleWebApp.capable`, title, `black-translucent`,
  plus a hand-added `apple-mobile-web-app-capable` via `other` (correct, and
  the comment explaining why is right).
- `manifest.ts` — id, name, short_name, description, lang, dir, start_url
  `/home`, scope, `standalone`, `portrait`, background/theme navy, 3 categories,
  192 + 512 + maskable-512 icons, 3 shortcuts with 96px icons.
- `public/sw.js` — 300-line hand-written worker. Network-first navigations,
  precached `/offline`, allowlisted asset caching, blocklisted personal
  segments, Save-Data respected, cache versioning. **This is genuinely good
  work** and the security posture is better than most shipped PWAs.
- `app/offline/page.tsx` + `RetryButton.tsx` — designed offline screen with a
  real headline, three honest bullets, a primary retry and a live online/offline
  status line.
- Theme flash guard: `layout.tsx:133–138` inline script, first child of `<body>`.
- Fonts: `next/font` Inter + Poppins, both `display: "swap"`, self-hosted.

---

# PART B — GAPS VS THE REFERENCE STANDARD

Severity: **P0** = blocks App Store / embarrasses on first view · **P1** =
visibly below "top-tier product studio" · **P2** = polish.

## B1. Hero vs reference 15 — Q1

Reference 15 asks for: soft mesh/aurora gradient · display headline with
**inline brand logo chips set into the sentence** · **inline email capture
where input and CTA share one pill** · **social-proof cluster (overlapping
avatars + five stars + "1,000+ startups")** · thin top announcement bar ·
**floating tilted UI fragments and annotation cards orbiting the hero** ·
**large product screenshot in a soft-shadowed frame fading into the background**.

| Reference element | Status | Evidence |
|---|---|---|
| Mesh / aurora gradient | **Present, strong** | `.nf-aurora` globals.css:2497–2527, `.nf-grid-veil` 2529–2541, `.nf-ambient` 2213 |
| Display headline, tight tracking | **Present** | `.nf-display` globals.css:1270–1275, `--nf-tracking-display: -0.035em` tokens.css:257 |
| Inline brand logo chips in the sentence | **ABSENT** | headline is three plain `<span>`s, `page.tsx:112–118` |
| Inline capture, input + CTA share one pill | **PARTIAL / WRONG** | `page.tsx:126–149` — the input and button *do* share one `nf-card` shell, but `border-radius` is `--nf-radius-lg` (18px), not a pill, and on mobile it becomes `flex-col` so they stop sharing a shape entirely (`flex-col … sm:flex-row`, line 130). Then `FilterLink` (line 152) parks a **separate 52px square glass button outside the pill**, which breaks the single-object read the reference is built on. |
| Social-proof cluster (avatars + stars + count) | **ABSENT — nothing anywhere on the page** | no avatar stack, no star row, no count. Grep for testimonial/avatar-stack across `components/site` returns nothing. |
| Floating tilted UI fragments / annotation cards | **ABSENT** | what exists is three floating *3D brand object PNGs* at 50% opacity (`page.tsx:78–88`, `.nf-icon-field` globals.css:2464). These are decorative icons, not tilted UI fragments showing the product. |
| Product screenshot in a soft-shadowed frame | **ABSENT** | the hero art is `/brand/rentme-villa.png`, an illustration, masked to dissolve (`page.tsx:96–108`, `.nf-hero-scene` globals.css:2597–2602). **Nowhere on the entire marketing site is there a single screenshot of the actual product.** |
| Thin top announcement bar | **ABSENT** | — |

**Findings**

- **P0-1** — No product screenshot anywhere on the marketing site. Every
  reference-15 variant leads with the app. A prospect cannot see what they are
  signing up for. `page.tsx` (whole file).
- **P0-2** — No social proof of any kind: no avatars, no stars, no counts, no
  testimonials, no logo wall. Reference 14 and 15 both make this a hero-level
  element. This is the single largest credibility gap on the page.
- **P1-3** — Hero capture is not one pill and is broken by the adjacent
  `FilterLink` square. `page.tsx:125–153`.
- **P1-4** — Headline carries no inline brand chips; the "logo set into the
  sentence" device from reference 15 is entirely unused.
- **P2-5** — Floating objects are brand icons, not UI fragments; they read as
  clip-art rather than as the product orbiting itself. `page.tsx:78–88`.
- **P2-6** — No announcement bar.

## B2. Supporting sections vs reference 14 — Q2

| Reference 14 pattern | Status | Evidence |
|---|---|---|
| Chip label above the headline | **Present** | `.nf-overline` used throughout; `nf-chip` eyebrow on about/contact/careers |
| Stat line above the H1 | **ABSENT in hero** | facts band is section 7, far below the fold, `page.tsx:210` |
| Paired dark + light CTA pills with tiny brand icons inside | **PARTIAL** | pairs exist (`page.tsx:400–407`: primary + glass) but **neither carries an icon**; the reference's icon-in-pill detail is unused |
| Work gallery of rounded cards | **Present, good** | `FeaturedCarousel.tsx`, `StoryRail.tsx` |
| Greyed logo wall + "30+ More" pill | **ABSENT** | no logo wall, no "+N More" pill anywhere |
| 3-then-2 grid of icon + bold title + grey body | **Present ×3, duplicated** | `page.tsx:172` (4-up), `WhyRentMe.tsx:289` (4-up), `page.tsx:258` (2×2). Same pattern, same four promises, three times. |
| Testimonial cards led by a client logo, signed with avatar + name | **ABSENT** | — |
| Tools logo strip | **ABSENT** | — |
| Team grid with "5+ More" tile | **ABSENT** | careers page has culture cards, no faces |
| Pricing cards with a **segmented switcher** | **ABSENT** | no pricing surface at all. Mapped to a marketplace this should be the fee/plan story — and the platform's actual position ("we charge no fees anywhere", per KNOWN_GAPS) is a *strong* differentiator that is currently buried in one FAQ answer (`page.tsx:370`). |
| FAQ accordion with **chevron rotation** | **PARTIAL / WRONG GLYPH** | `page.tsx:378–384` uses a literal `+` character rotating 45° (`group-open:rotate-45`). A text `+` is not a designed glyph, it inherits the body font, and it is the only place on the platform that draws an affordance from a typed character instead of `UiIcon`. |

**Findings**

- **P1-7** — No logo wall / social-proof strip / "+N More" pill.
- **P1-8** — No testimonials. For a marketplace this maps to guest reviews or
  agent quotes; the reviews table exists and has a read path (per KNOWN_GAPS)
  but nothing surfaces on marketing.
- **P1-9** — No pricing/plans surface with a segmented switcher. The
  zero-fee position is the product's best marketing asset and appears only as
  FAQ prose. `page.tsx:370`.
- **P1-10** — Value-prop grid triplicated: `page.tsx:172`, `page.tsx:258`,
  `WhyRentMe.tsx`. Reads as padding, not as a designed argument.
- **P1-11** — 21 sections. Reference 14 gets its authority from *editorial
  restraint*: chip → headline → gallery → logos → values → testimonials →
  tools → team → pricing → FAQ. The page needs cutting to ~10 sections, not
  more sections.
- **P2-12** — FAQ chevron is a text `+`. `page.tsx:381`.
- **P2-13** — FAQ has **12 items rendered flat** with no grouping and no
  search, while a fully built, searchable, categorised FAQ already exists at
  `(site)/help/HelpSearch.tsx`. Two divergent FAQ systems.
- **P2-14** — No team grid; careers page shows no human faces at all.

## B3. `getPlatformStats()` — Q3

**The KNOWN_GAPS entry is stale and the described design does not exist.**

- `lib/platform-stats.ts:22–26` returns `null` as documented.
- **It is imported by nothing.** Verified: `grep -rn "platform-stats\|PlatformStats" apps/web/src` returns only the file itself.
- There are therefore **no label-only hero stat cards**. The hero has no stat
  cards at all.

What actually renders instead is worse than a label-only card — it is
**hardcoded inventory numbers presented as platform facts**:

- `page.tsx:213–217` — facts band: `"36 + FCT"`, `"4"`, `"₦"`, `"24/7"`.
  The `"₦"` tile is a currency symbol rendered as though it were a metric, in
  display weight, above the label "Honest naira pricing". It reads as a
  broken/missing number.
- `NumbersBand.tsx:16` — `{ label: "Listings", value: 17, suffix: "+" }`.
  **A hardcoded live inventory count.** This is exactly the misleading
  advertising the KNOWN_GAPS note set out to avoid, just written as a literal
  instead of a mock API.
- `PlatformConsole.tsx:17` — `{ pill: "Trust", big: "17+", label: "Verified listings" }`. Same number, second location, guaranteed to drift.
- `PlatformConsole.tsx:22` — `const PULSE = [3,5,4,7,6,9,8,11,10,13,12,15]` —
  an **invented rising chart** rendered under real-looking metrics. The comment
  calls it "an unlabeled ambient line rather than a claim", but a rising line
  under a tile that says "Verified listings 17+" *is* a growth claim.

**Findings**

- **P0-15** — `NumbersBand.tsx:16` and `PlatformConsole.tsx:17` publish a
  hardcoded inventory count ("17+ listings") in two places. It was true on the
  day it was typed and is unmaintainable. This is the honesty failure the
  gaps file was trying to prevent.
- **P1-16** — `PlatformConsole.tsx:22` fabricated growth curve under
  metric tiles.
- **P1-17** — `page.tsx:216` — `₦` as a display "figure" reads as a rendering
  bug.
- **P2-18** — `lib/platform-stats.ts` is dead code; KNOWN_GAPS describes a
  design that is not in the tree.

**Recommendation (premium AND honest)** — see §C3.

## B4. Auth vs reference 11 — Q4

Reference 11 asks for: **full-bleed atmospheric imagery** · **editorial
headline** · segmented/dot progress · **huge black or brand primary pill** ·
quiet "Already have an account? Log in" beneath · correct provider marks.

| Element | Status | Evidence |
|---|---|---|
| Full-bleed atmospheric imagery | **ABSENT** | `(auth)/layout.tsx:27–30` — a centred `min-h-dvh` flex column with `.nf-aurora` + `.nf-grid-veil` behind. Pure CSS glow, **no photograph, no illustration, no imagery**, on a screen the reference builds entirely out of imagery. |
| Editorial headline | **ABSENT** | `AuthPanel.tsx:62–64` — `nf-h2` (clamp 1.22–1.8rem) reading `"Welcome back 👋"` / `"Create your account"`. Small, centred, generic, **with an emoji**. |
| Huge black/brand primary pill | **PARTIAL, WRONG TARGET** | the biggest, most prominent button is **"Explore the demo"** (`AuthPanel.tsx:84–93`). The real submit is a plain `w-full py-3.5` primary that only appears *after* the email row is expanded. |
| Quiet "Already have an account? Log in" | **Present** | `AuthPanel.tsx:273–281` |
| Provider marks at correct colour | **Present, correct** | `ProviderMarks.tsx:3–32` — proper 4-colour Google, proper Apple |
| Verdict | **A plain centred form card.** `(auth)/layout.tsx:53` — a 24rem glass box, vertically centred. This is the exact shape the brief says to avoid. |

**Findings**

- **P0-19** — **"Explore the demo" is the dominant CTA on both sign-in and
  sign-up.** `AuthPanel.tsx:84–93`. It sets `nf_demo=1`, and that cookie is
  **read by nothing in the codebase** (verified by grep — only the write site
  exists). So it is a dead scaffold occupying the primary action slot. It also
  directly violates the owner's own stated rule recorded in KNOWN_GAPS ("zero
  sample, preview or demo strings in UI copy"), and an App Store reviewer
  landing on a sign-in screen whose loudest button says "Explore the demo"
  will read the app as unfinished. **Remove before submission.**
- **P0-20** — Auth is a centred form card with no imagery. `(auth)/layout.tsx:25–67`.
  Against reference 11 this is the weakest screen in the product.
- **P1-21** — Headline is `nf-h2` and generic. Reference 11 uses a display-size
  editorial line ("Your next place is waiting.").
- **P1-22** — Emoji in the H1: `` `${t.auth.welcomeBack} 👋` `` `AuthPanel.tsx:63`.
  Emoji render inconsistently across platforms and immediately drop the
  register from "product studio" to "template".
- **P1-23** — The email path starts **collapsed** behind "Continue with email"
  (`AuthPanel.tsx:104–114`), so the default state of the sign-up page is a
  screen with **no input on it at all** — while both OAuth providers below are
  rendered `disabled` when unconfigured (`AuthPanel.tsx:259`). Worst case a
  visitor sees three buttons, two greyed out, and no way to type anything
  without a second tap.
- **P1-24** — "Forgot password?" links back to `/sign-in` — a self-link
  (`AuthPanel.tsx:230–235`). No reset route exists. Password recovery is a
  hard App Store expectation for any account-based app.
- **P2-25** — Sign-up asks for firstName, surname, nickname, email, password,
  confirm, hearAbout, state, referralCode — **9 fields in one screen**
  (`AuthPanel.tsx:119–214`). Reference 11's answer to this is a *flow*: one
  question per screen with a segmented progress bar.
- **P2-26** — No password-requirements hint before typing; the `StrengthMeter`
  (`AuthPanel.tsx:510`) is reactive only, so the 8-character server minimum is
  discovered by failing.

## B5. Onboarding — Q5

Against reference 11 and brief §6 ("multi-step flows show a segmented progress
bar at the very top", "large tappable option cards", "one question per screen"):

- **P0-27** — **There is no onboarding flow.** `Onboarding.tsx` is a 5.2-second
  auto-dismissing splash over one image. No segmented progress
  (`Onboarding.tsx` has no progress element of any kind), no steps, no
  questions, no option cards, no primary CTA at the end — it just disappears
  and drops the visitor on the landing page. This is the single biggest miss
  against reference screen 11.
- **P1-28** — The splash **blocks the landing page for 5.2s** on first visit
  (`AUTO_DISMISS_MS = 5200`, `Onboarding.tsx:24`) with only a small "Skip" pill
  top-right. A first-time visitor's first impression of the product is an
  interstitial they must dismiss. It also has `role="dialog"` but **no focus
  trap and no `aria-modal`** (`Onboarding.tsx:81–87`), so keyboard focus stays
  on the page underneath it.
- **P1-29** — The splash renders `nf-story-stage--paper` with hardcoded
  `color: rgb(18 21 26)` (`globals.css:630–631`), i.e. **it is light-mode only
  by construction** while dark is the product default. Deliberate (the comment
  explains it) but it means the first frame of the product contradicts the
  brand theme.
- **P2-30** — Copy is a single sentence with no CTA; the reference always ends
  an onboarding on a huge primary pill.

## B6. Auth error/validation/loading — Q6

Genuinely good, and better than most of the rest of this scope:

- Field errors: `role="alert"`, `aria-describedby`, `aria-invalid`
  (`AuthPanel.tsx:304–311`, `336–345`). `.nf-field[aria-invalid="true"]`
  recolours the border (`globals.css:1557–1559`).
- Password: real toggle button with `aria-pressed` and swapped `aria-label`
  (`AuthPanel.tsx:461–469`); hand-drawn `EyeGlyph` with slash state
  (`AuthPanel.tsx:541`).
- Strength meter: 4 segments + `aria-live="polite"` label
  (`AuthPanel.tsx:510–538`).
- Live confirm-mismatch check (`AuthPanel.tsx:57–58`).
- Submit: `disabled={pending}` + `aria-busy` (`AuthPanel.tsx:217–224`).

Gaps:

- **P1-31** — The loading state is **a text swap only**: `{pending ? t.common.loading : …}` (`AuthPanel.tsx:223`). No spinner, no button-width lock, so the pill **changes width mid-submit**. Reference-grade is a spinner that replaces the label inside a fixed-width pill.
- **P1-32** — Form-level errors use the **warning** palette, not error:
  `bg-[var(--nf-state-warning-surface)]` / `text-[var(--nf-state-warning)]`
  (`AuthPanel.tsx:244`). In this token set warning is *cyan*
  (`tokens.css:120`), so a failed sign-in renders in a friendly blue that is
  visually indistinguishable from the brand. A rejected credential must read
  as rejected.
- **P2-33** — `.nf-field[aria-invalid="true"]` sets `border-color` on an
  element whose border is `1px solid transparent` painted by a
  `border-box` gradient (`globals.css:1524–1537`). The gradient `background`
  wins, so **the invalid state is very nearly invisible**. Verify visually;
  it needs a `box-shadow` ring instead.
- **P2-34** — No `<input inputMode>` / `enterKeyHint` on any field; on iOS the
  keyboard's action key says "return" instead of "Go"/"Next".

## B7. Motion — Q7, Q8, Q9

### Verifying the KNOWN_GAPS claim

> "Entrance, float, reveal and pulse exist. The full system for sheets, map
> transitions and AI states is not built."

**This claim is wrong in both directions.**

- Map transitions **are** built: `nf-map-pin-drop` (1188), `nf-map-cluster-drop`
  (1197), `nf-map-pin-breathe` (1213), `nf-map-pin-bloom` (1234), all with
  index-staggered delays and reduced-motion handling.
- AI states **are** built: `.nf-bot-thinking` spinner ring (583–599),
  `nf-typing-breathe` (544), `nf-listing-fold` staggered results (612–620).
- `pulse` — the `nf-pulse-ring` keyframe (2566) exists but **no `.nf-pulse-ring`
  class is ever applied**; it is referenced only in a reduced-motion block
  (2748). Dead.
- Sheets **are** the real gap, and the file does not say so.

### What is actually missing, against brief §7

| §7 requirement | Status | Evidence |
|---|---|---|
| Press scale | **PARTIAL** | `.nf-btn:active { translateY(1px) }` (1362) — a *translate*, not a scale, and **no shadow compression**, so the brief's "scale-down + shadow compression, spring back" is not what happens. `.nf-icon-btn:active { scale(0.94) }` (1594) and `.nf-action-circle:active` (1885) do it correctly. Only 10 `active:scale` usages across all `.tsx`. **The primary button — the most-pressed object in the product — has no press scale.** |
| Spring sheet snapping | **ABSENT** | Every sheet/drawer uses `nf-rise` (fade + 18px up, `globals.css:2577`): `ListingOptionsSheet.tsx:74`, `AdminActions.tsx:113`, `AccountSection.tsx:167`, `AppShell.tsx:74`, `MobileMenu.tsx:71`. **No sheet slides up from the bottom edge, none has a drag handle, none has detents, none is swipe-dismissible, and none has an exit animation** (they unmount instantly). Brief §7 explicitly: "Sheets have detents and a drag handle." |
| Tab indicator slide | **ABSENT** | `.nf-tab-pop__pill` (2102–2118) *pops* per-tab (scale 0.82 → 1.06 → 1). Each tab owns its own pill. **Nothing slides between positions** — the brief and reference 2/6/8/12 all show a single indicator translating. |
| Icon symbol effects | **PARTIAL** | only `nf-ring` (bell, 424) and `nf-verify-pulse` (443) exist. Reference 1 is a whole grid: refresh rotate, heart fill+pulse, send fly, speaker waves, star. Missing: **save/heart** (the most-used affordance in a marketplace), refresh, send. |
| Number roll-up | **PRESENT, GOOD** | `Odometer.tsx` — real digit strips, per-digit 90ms stagger, thousands separators handled |
| Progress fill | **ABSENT** | no animated progress-bar fill anywhere; `StrengthMeter` uses `transition-colors` only (`AuthPanel.tsx:521`), the segments do not grow |
| Skeleton shimmer → content crossfade | **HALF** | `.nf-skeleton` shimmers (1621–1633) but **there is no crossfade**; skeletons are swapped for content by React, hard-cut |
| Page transitions | **ABSENT** | no route-level transition. `ScrollToTop.tsx` jumps to top with `behavior: "instant"`. View Transitions are used only for one listing-photo morph. |
| Scroll-linked reveals | **PRESENT, EXCELLENT** | `@supports (animation-timeline: view())` at 993, 1053, 1088, 878, 2648, with a genuine IO fallback in `Reveal.tsx` and a real, well-documented `data-instant` fix for above-the-fold blocks |
| Stagger | **PRESENT** | `--i` / `--card-i` / `--pin-i` / `--tile-i` custom-property stagger in 5 places |

**Findings**

- **P0-35** — No bottom-sheet motion system. Every "sheet" in the product is a
  fade-and-lift box. On iOS this is the most obvious tell that the app is a web
  page. Affects 8+ surfaces.
- **P1-36** — Primary button has no press scale / shadow compression
  (`globals.css:1362–1364`, `1407–1409` — `:active` actually *cancels* the
  hover lift back to `translateY(0)` rather than compressing below rest).
- **P1-37** — Tab indicator pops per-tab instead of sliding between tabs
  (`globals.css:2099–2126`).
- **P1-38** — No exit animations anywhere. Every dialog, drawer and sheet
  unmounts instantly (`MobileMenu.tsx:87`, `AppShell.tsx:66`,
  `AccountSection.tsx`, etc. — all `{open && …}`).
- **P1-39** — No heart/save symbol effect, no refresh rotate, no send fly.
- **P2-40** — No progress-fill animation; no skeleton→content crossfade; no
  page transitions.
- **P2-41** — Dead code: `nf-pulse-ring` keyframe (2566) and `nf-drift-c`
  (2366) are never applied to anything.

### Q8 — reduced motion

**Claim in KNOWN_GAPS: "Reduced motion is honoured throughout via token
collapse." Substantially true, with one real hole and two edge cases.**

The architecture is right: `tokens.css:356–365` collapses all five duration
tokens to `1ms` and `--nf-ease-spring` to `linear`, so every
token-driven transition/animation self-neutralises; then 22 explicit
`@media (prefers-reduced-motion: reduce)` blocks in `globals.css` kill the
hardcoded-duration loops. `motion-safe:` / `motion-reduce:` variants are used
correctly in 11 `.tsx` locations. `Reveal.tsx:38`, `Odometer.tsx:36`,
`TiltField.tsx:21`, `Onboarding.tsx:48` all check `matchMedia` in JS.

Holes:

- **P1-42** — **`.nf-page-scene` is not collapsed.** `globals.css:741–747` sets
  `animation: nf-scene-live 20s … infinite`. The reduced-motion block at
  `globals.css:918–925` lists `.nf-icon-tile::after`, `.nf-story-art`,
  `.nf-hero-scene` — **`.nf-page-scene` is missing**. Used by
  `components/app/PageScene.tsx:51`, so an infinite drift-and-brighten loop
  plays behind page headings for reduced-motion users.
- **P2-43** — `.nf-ambient > span:nth-child(4)` (the pointer bloom) has
  `transition: left 1100ms, top 1100ms` (`globals.css:2276–2278`). The
  reduced-motion block at 2370 kills `animation` only, not this transition, so
  a 1.1-second easing glow still chases the cursor. (Fine-pointer only, so
  desktop-only.)
- **P2-44** — `.nf-card--interactive img.object-cover { transition: transform 900ms }`
  (globals.css:245–247) is a hardcoded duration. The reduce block at 251–261
  neutralises it by setting `transform: none` on hover, which works, but the
  transition itself is never cancelled — a fragile pattern if the hover rule
  is ever edited.

### Q9 — token-driven vs ad-hoc

**Mostly token-driven, with a consistent and quantifiable leak.**

- Easing: essentially 100% tokenised. `--nf-ease-standard/entrance/exit/spring`
  (tokens.css:217–220) are used everywhere; raw `cubic-bezier(` appears in
  `globals.css` only inside the token file's own definitions. `linear` is used
  correctly for scroll-timelines and spins.
- Duration: **~30 hardcoded ms/s values** sit alongside the 5 tokens. Notable:
  `900ms` (247), `20s` (271), `2.4s` (421), `2.8s` (441), `900ms` (469),
  `650ms` (495), `1.2s` (542), `850ms` (594), `5.2s` (662), `600ms` (684),
  `7s` (722), `1.15s` (776), `1.1s` (816/825), `420ms` (858/861), `18s` (911),
  `12s` (901), `14s` (1109), `640ms` (1185/1194), `5s` (1211), `1.5s` (1231),
  `1.8s` (1632), `0.5s` (1963), `0.4s` (2117), `16s/21s/9s/20s` (2248/2259/2312/2326),
  `14s` (2431), `4.5s` (2460), `9s/12s/10s` (2474/2477/2481), `6s` (2734),
  `7s/11s` (2589/2606).
- Stagger steps are ad-hoc too: `70ms` (1051), `90ms` (614), `26ms` (1186),
  `900ms` (723), `70ms` (2707), `140/280/420/560ms` (2583–2586), `90ms`
  (Odometer.tsx:81), `60/70/80/90ms` (Reveal `delay` props scattered across
  landing components).

**Finding**

- **P1-45** — The token set has **no ambient/loop duration tier and no stagger
  tier**, so every long-cycle animation invents its own number. Result: 6
  different ambient loop lengths (5s, 7s, 9s, 12s, 14s, 18s, 20s, 21s) that
  beat against each other on the same screen, and 6 different stagger steps
  (26/60/70/80/90/140ms). Tokens needed: `--nf-duration-ambient-{slow,slower,slowest}`
  and `--nf-stagger-{tight,base,loose}`.

## B8. App Store / PWA readiness — Q10–Q16

### Q10 — Safe-area insets

`env(safe-area-inset-*)` appears **12 times**, all of them bottom except one:

| Location | Inset | Line |
|---|---|---|
| `Onboarding.tsx` skip pill | **top** | 92 |
| `Onboarding.tsx` copy | bottom | 108 |
| `ThreadView.tsx` | bottom | 355 |
| `AgentShell.tsx` | bottom | 71 |
| `AgentMobileNav.tsx` | bottom | 98 |
| `AssistantChat.tsx` | bottom | 427 |
| `MobileTabBar.tsx` | bottom | 33 |
| `ListingsWorkspace.tsx` / `BookingsWorkspace.tsx` | bottom | 186 / 127 |
| `globals.css .nf-action-bar` | bottom | 1909 |
| `ListingWizard.tsx` ×2 | bottom | 678, 1280 |
| `admin/layout.tsx` | bottom | 90 |

- **P0-46** — **`safe-area-inset-top` is respected in exactly one place — the
  onboarding splash's Skip button.** Meanwhile `layout.tsx:104` sets
  `viewportFit: "cover"` and `layout.tsx:83` sets
  `statusBarStyle: "black-translucent"`, which together mean **the page paints
  under the iPhone status bar and notch**. Every top-anchored surface is
  therefore clipped in a standalone install:
  - `SiteHeader.tsx:27–29` — `sticky top-0`, fixed `h-[60px]` on phones. With a
    47–59px status bar the logo and the Sign-up pill sit **under the clock and
    the Dynamic Island**.
  - `AppShell.tsx:90–91` — `sticky top-0`, `h-[64px]`. Same problem for the
    entire signed-in product.
  - `MobileMenu.tsx:71` — full-screen panel with `pt-5`; the close button
    lands under the notch.
  - `AppShell.tsx:74` and `AccountSection.tsx:167` — full-screen drawers,
    `inset-0`, no top inset.
  - `(auth)/layout.tsx:27` — `py-10`, no inset.
  - `admin/layout.tsx:51`, `AgentRail.tsx:30` — `h-dvh` rails with `py-5`.

  Fix is a `--nf-safe-top` pattern: `padding-top: max(<n>, env(safe-area-inset-top))`
  on every sticky header and every `inset-0` overlay. **This is a hard blocker.**
- **P1-47** — Left/right insets (`safe-area-inset-left/right`) are used
  **nowhere**. In landscape on a notched iPhone, `nf-shell`'s
  `padding-inline: 1.25rem` (globals.css:2760) is less than the notch inset, so
  content clips.

### Q11 — Viewport / theme-color / apple tags

- `layout.tsx:97–105` — viewport correct: `width: device-width`,
  `initialScale: 1`, `viewportFit: "cover"`. No `maximumScale` / `userScalable`
  lock — **correct**, pinch-zoom stays available.
- **P1-48** — **One `themeColor` for both themes**: `"#010118"`
  (`layout.tsx:101`). In light mode the canvas is `#F4F5F7`
  (`tokens.css:295`) but the browser/status chrome renders navy — a 100%
  mismatch on the most visible seam of the app. Next supports
  `themeColor: [{ media: "(prefers-color-scheme: light)", color: "#F4F5F7" }, { media: "(prefers-color-scheme: dark)", color: "#010118" }]`.
  Note the extra wrinkle: theme is stored in `localStorage` and applied via
  `data-theme`, not via `prefers-color-scheme`, so the meta tag also needs
  updating from `ThemeToggle.tsx` at runtime to actually track the user's choice.
- Apple tags: `appleWebApp.capable/title/statusBarStyle` plus the manual
  `apple-mobile-web-app-capable` in `other` (`layout.tsx:80–87`) — correct, and
  the reasoning comment is accurate.
- **P2-49** — `statusBarStyle: "black-translucent"` is only defensible *once
  safe-area-inset-top is honoured*. Today it is the direct cause of P0-46.
  Until the insets land, `"default"` would be the safer setting.

### Q12 — Manifest completeness

`app/manifest.ts` — present and good: `id`, `name`, `short_name`,
`description`, `lang`, `dir`, `start_url: "/home"`, `scope`, `display: standalone`,
`orientation: portrait`, `background_color`, `theme_color`, `categories`,
3 icons (192 any, 512 any, 512 **maskable**), 3 shortcuts with 96px icons.

- **P1-50** — **No `screenshots` array.** Chrome/Android's richer install UI
  and the Play Store's PWA listing both require it; without it the install
  prompt is the minimal one. Needs `form_factor: "narrow"` and `"wide"` entries.
- **P2-51** — No `display_override: ["standalone", "minimal-ui"]`.
- **P2-52** — `orientation: "portrait"` hard-locks. On a tablet this is a
  reviewer complaint; `"any"` or `"portrait-primary"` with responsive layout
  is the safer choice.
- **P2-53** — `start_url: "/home"` has no `?source=pwa` tracking param and, more
  importantly, `/home` is a **signed-in route** — an installed app opened by a
  logged-out user starts on a redirect.
- **P2-54** — Icon set is 192 + 512 only. Android is fine; but there is no
  1024×1024 for App Store submission and no 96/144/384 for older launchers.

### Q13 — Splash / app icon / favicon

- **P1-55** — **No iOS splash screens.** No `apple-touch-startup-image` link
  anywhere (grep confirms zero matches). On iOS an installed PWA shows a blank
  white screen during launch. iOS needs a `<link rel="apple-touch-startup-image" media="...">`
  per device class (≈12 entries), or at minimum the common iPhone sizes.
- **P1-56** — **No favicon.ico and no `app/icon.*` / `app/apple-icon.*`.**
  `public/` contains only `brand/`, `icons/`, `pwa/`, `sw.js`. `/favicon.ico`
  will 404 on every request from legacy clients, and the tab icon is a
  downscaled 192px PNG rather than a hinted 32/16 mark.
- **P2-57** — All PWA icons are **8-bit colormap (256-colour palette) PNGs**
  (`file public/pwa/*.png`). The brand mark is a blue gradient on navy;
  palette quantisation will band it on a large launcher tile. `icon-512.png`
  is 28 KB — regenerate as truecolour PNG.

### Q14 — Overscroll / pull-to-refresh / tap highlight / selection / scrollbars / vh

Good:
- `globals.css:86–87` — `-webkit-tap-highlight-color: transparent` and
  `overscroll-behavior-y: none` on `body`. Correct and native-feeling; also
  suppresses Chrome-Android pull-to-refresh.
- `globals.css:46` — `-webkit-text-size-adjust: 100%`.
- `globals.css:102–105` + `3164–3167` — themed `::selection` in both themes.
- `globals.css:1645–1651`, `2768–2774` — `scrollbar-width: none` +
  `::-webkit-scrollbar { display: none }` on `.nf-snap-x` / `.nf-scroll-x`.
- **`100vh` is used nowhere.** Every full-height surface uses `dvh`
  (`min-h-dvh` ×8, `h-dvh` ×4, `100dvh` in `MessageThread.tsx:123`,
  `88dvh` in `AdminActions.tsx:113`). This is correct and better than most
  shipped apps.
- `-webkit-overflow-scrolling: touch` + `overscroll-behavior-x: contain` on
  snap rails (`globals.css:1646–1647`).

Gaps:
- **P1-58** — **Touch targets below 44×44pt**, which is the App Store HIG
  minimum and brief §8:
  - `.nf-icon-btn` is `2.6rem` = **41.6px** (`globals.css:1576–1577`) — used
    for back, close, filter, carousel paging, theme toggle, hamburger, and the
    mobile-menu social row. The comment on line 1571 literally says "at a 44px
    touch target", which is wrong.
  - `ThemeToggle.tsx:41` — `h-9 w-9` = **36px**.
  - `MobileMenu.tsx:78` close button — `h-9 w-9` = **36px**.
  - `MobileMenu.tsx:46` / `AppShell.tsx:98` hamburger — `h-10 w-10` = **40px**.
  - `.nf-dock__btn` — `2.5rem` = **40px** (`globals.css:2163–2164`).
  - `MobileTabBar.tsx:46` — `h-12 w-12` = 48px. **Correct.** It is the only one.
- **P2-59** — `overscroll-behavior` is set on `body` but not `html`. Propagation
  from `body` works in current engines but is spec-fragile; belt-and-braces is
  to set it on `html` too.
- **P2-60** — Scrollbars are hidden only on the two rail utilities; the main
  document scrollbar is unstyled. On desktop Windows this is a visible seam
  against the near-black canvas.
- **P2-61** — No `user-select: none` on chrome/nav elements, so long-press on
  a tab label selects text on iOS instead of feeling like a button.

### Q15 — Offline page quality

Strong. `app/offline/page.tsx` is a real designed empty state per brief §6: an
overline, an `nf-h2` headline, a paragraph, three specific honest bullets, a
primary retry and a secondary link, plus a genuinely thoughtful live
online/offline status line (`RetryButton.tsx:48–56`) and the correct decision to
use a plain `<img>` so the optimiser cannot mint an uncacheable URL
(`page.tsx:37–45`).

- **P2-62** — Brief §6 wants "full-bleed illustration or photograph". The
  offline screen uses a 72px icon; a story-scene at hero scale would lift it.
- **P2-63** — `RetryButton.tsx:43` — `"Reconnecting..."` uses three ASCII dots
  rather than an ellipsis, and there is no spinner (same class of issue as P1-31).
- **P2-64** — `RetryButton.tsx:45` — "Back to home" points at `/home`, a
  signed-in route, from a screen that by definition has no network.

### Q16 — Layout shift / unstyled flash

- Theme flash: **handled well.** `layout.tsx:133–138` — a blocking inline
  script as the first child of `<body>`, and the default (no key) is dark,
  which matches the CSS default. No FOUC of the wrong theme.
- **P2-65** — The theme script is in `<body>`, not `<head>`. It executes before
  first paint in practice, but `<head>` is the guaranteed position.
- **P2-66** — Both fonts use `display: "swap"` (`layout.tsx:19`, `31`).
  `next/font` auto-generates a metric-adjusted fallback, which mitigates CLS,
  but the **display face is Poppins at weight 700–800 on a `clamp(1.95rem …
  4.6rem)` headline** (`tokens.css:245`) — the largest text on the page is the
  most sensitive to a swap. Consider `display: "optional"` for Poppins, or
  preloading it, since the hero H1 is above the fold on every marketing page.
- **P2-67** — `page.tsx:96–108` — the hero villa is `priority` and 1536×1024 at
  up to 95vw, `position: absolute` inside `inset-0`. It is out of flow so it
  cannot shift layout, but it is a large LCP-adjacent payload on a mid-range
  Android over a metered bundle — the exact audience the sw.js comments name.
  No `placeholder="blur"`.
- **P2-68** — `.nf-grain` (`globals.css:2388–2397`) is a fixed full-viewport
  `mix-blend-mode: overlay` layer at `z-index: 70`. It sits **above the mobile
  tab bar (`z-50`) and above sticky headers (`z-40/50`)** and forces a
  full-screen blended composite on every frame. On low-end Android this is a
  measurable scroll cost for a 5%-opacity effect.

## B9. Cross-cutting

- **P1-69** — **Brand name is inconsistent.** The product ships as "RentMe"
  everywhere in UI and in `manifest.ts` (`name: "RentMe"`), but the packages are
  `@naijafinds/*`, the support addresses are `support@naijafinds.com`
  (`contact/page.tsx:13`) and `careers@naijafinds.com` (`careers/page.tsx:18`),
  while `MobileMenu.tsx:108` uses `hello@rentme.ng`. Three brands in one
  product. An App Store reviewer comparing the listing name to the in-app
  support address will flag this.
- **P2-70** — Light-theme muted text fails WCAG AA. `--nf-content-muted: #7A8189`
  on `#FFFFFF` (`tokens.css:304`) computes to **3.95:1**, below the 4.5:1
  small-text threshold, and it is used for body copy at 0.75–0.8125rem
  throughout the landing page (`page.tsx:188`, `223`, `267`, `347`;
  `WhyRentMe.tsx:299`; `HowItWorks.tsx:72`). Brief §8 requires AA in both
  themes. Needs roughly `#6B7280` or darker.
- **P2-71** — **No haptics anywhere.** Grep for `vibrate` returns zero matches.
  Brief §8 requires haptics on primary actions; `navigator.vibrate()` on
  Android + a Taptic bridge on iOS wrapper.

---

# PART C — CONCRETE UPGRADE RECOMMENDATIONS

## C1. Hero rebuild (reference 15)

Replace `page.tsx:73–196` with:

1. **Thin announcement bar** above the header — one sentence, one link
   ("Payments launch in Q4 · read the roadmap →"), dismissible, `nf-glass`.
2. **Eyebrow chip** (`nf-chip` + `UiIcon sparkle`) — "Now live in 36 states".
3. **Display headline with inline chips.** Build a `<BrandChip>` primitive:
   an `inline-flex` pill at `0.82em` height carrying the 3D object, set *into*
   the sentence — "Find [🏠] it. Rent [🔑] it. Love [💙] it." Use the existing
   `.nf-icon-tile` material at small scale so it is the same object family.
4. **One true capture pill.** Merge the search input, the filter opener and the
   submit into a single `border-radius: var(--nf-radius-pill)` container.
   On mobile it must stay one pill (icon + input + circular submit), never
   `flex-col`. Delete the standalone `FilterLink` from the hero and put the
   sliders glyph *inside* the pill as a leading affordance.
5. **Social-proof cluster** directly under the pill: overlapping avatar stack
   (use real agent avatars once reviews land; until then use the four language
   marks or state crests — anything real), five `UiIcon star` in
   `--nf-rating`, and a factual count that is *derived*, not typed (see C3).
6. **Product screenshot frame.** A real capture of `/search` and `/listing/[id]`
   in a device-less rounded frame with `--nf-shadow-float`, masked with the
   same radial fade the villa uses so it dissolves into the aurora. Two
   **tilted UI fragments** floating beside it — a real `ListingCard` at
   `rotate(-6deg)` and a real wallet `BalanceCard` at `rotate(4deg)` — plus one
   annotation card ("₦0 in fees"). All three are components you already own,
   so this costs composition, not design.
7. Keep the aurora, the grid veil and the villa **behind** the frame; drop the
   three floating icon PNGs (they compete with the fragments).

## C2. Marketing IA — cut 21 sections to 10

Proposed order, mapping reference 14 onto a marketplace:

1. Hero (C1) · 2. Logo/trust wall — payment provider, bank partners, state
coverage, with a **"+30 More" pill** · 3. Product gallery (`FeaturedCarousel`,
kept) · 4. Value grid — **one** 3-then-2 grid, merging today's three duplicate
grids · 5. How it works (kept, 3 steps) · 6. **Testimonials** — guest and agent
quotes led by a location mark, signed avatar + name + city · 7. **Fees**, as
the pricing analogue: a segmented switcher (Guest / Agent / Business) over two
cards whose feature list is checkmarks and whose headline figure is **₦0** ·
8. Coverage map (kept) · 9. FAQ — 6 items, chevron glyph, linking to `/help` ·
10. CTA (kept).

Delete or fold: facts band (7), PlatformConsole (8), vision/mission (9) → move
to `/about`, MoodRow (11) → move to `/search`, PopularDestinations (12) → fold
into the map, WhyRentMe (15) → merged into 4, NumbersBand (17) → merged into 2,
trust strip (18) → merged into 2.

## C3. Stat cards — premium and honest

The right pattern is **"claim what you can count, and label the rest"**:

1. **Wire `getPlatformStats()` for real.** The listing repository already
   backs `FeaturedCarousel.tsx:32`; a `count(*)` grouped by `kind`, cached with
   `unstable_cache` at a 1-hour TTL, is a small amount of work and removes the
   entire honesty problem.
2. **Design the card for both states in one shape**, so nothing re-designs when
   data lands — three-part hierarchy per brief §4:
   - small grey label ("Verified listings")
   - **huge two-tone figure** — `Odometer` for the digits in
     `--nf-content-primary`, then the qualifier ("across 36 states", "and
     growing") in `--nf-content-muted` at `0.32em`, exactly like
     `.nf-hero-figure` / `.nf-hero-figure__unit` (`globals.css:1767–1783`),
     which is already built and unused on marketing.
   - a `nf-tag-pill` for the category.
3. **The null state is not "hide the number" — it is "show a different true
   number".** When inventory is unpublishable, the figure slot renders the
   *verifiable* fact instead: "36 + FCT states", "4 languages", "₦0 fees",
   "24/7 assistant". Same shape, same weight, no visual downgrade, nothing
   invented. That is what the facts band is groping towards at `page.tsx:213`;
   it just needs the two-tone treatment and needs to stop printing a bare `₦`
   as if it were a value ("**₦0** in fees" is a real two-tone metric; "**₦**"
   alone is not).
4. **Delete the hardcoded `17`** from `NumbersBand.tsx:16` and
   `PlatformConsole.tsx:17` today, whatever else happens.
5. **Delete `PULSE`** (`PlatformConsole.tsx:22`) or replace `StatChart` with a
   flat decorative gradient. A rising line under metrics is a growth claim.

## C4. Auth rebuild (reference 11)

1. **Delete the demo button** (`AuthPanel.tsx:84–93`) and the `nf_demo` cookie.
2. **Split the layout.** Desktop: two-column — left 55% full-bleed atmospheric
   imagery (`/brand/rentme-city.png` or `story-world.png` bled to the edge with
   a bottom-up scrim), right 45% the form on the canvas. Mobile: the imagery
   becomes a full-bleed top third with the form sheet overlapping it by a
   `--nf-radius-2xl` top radius (brief §6: "immersive media hero → content
   sheet that overlaps it").
3. **Editorial headline** at `--nf-text-hero` (already tokenised,
   `tokens.css:246`, currently unused anywhere), left-aligned, tight tracking,
   two lines. Drop the emoji.
4. **Show the email fields by default.** OAuth rows go *above* a divider,
   email fields below it, always visible. Never render a sign-up page with no
   input on it.
5. **Split sign-up into a flow** (this also fixes B5): step 1 email + password,
   step 2 name, step 3 location + discovery. **Segmented progress bar pinned to
   the very top** (three segments, active fills with `--nf-gradient-cta`), large
   tappable option cards for `hearAbout` and `state` instead of native selects,
   huge primary pill at the bottom of each step, quiet "Already have an
   account? Log in" beneath.
6. **Loading state**: fixed-width pill, label replaced by an inline spinner
   reusing `nf-bot-spin` (`globals.css:597`), `aria-busy` retained.
7. **Errors in the error palette**, not warning (`AuthPanel.tsx:244` →
   `--nf-state-error-surface` / `--nf-state-error`), and give
   `.nf-field[aria-invalid="true"]` a `box-shadow: 0 0 0 3px color-mix(… error 24% …)`
   ring so it survives the gradient border.
8. **Build `/forgot-password`.** Supabase `resetPasswordForEmail` is one call
   and the email templates already exist under `supabase/templates/recovery.html`.

## C5. Onboarding — build the real thing

Replace the 5.2s splash with a **3-screen, skippable, first-run flow** that
runs *after* sign-up rather than before the landing page:

- Segmented progress bar pinned to the very top (`.nf-progress-seg` — 3
  segments, active fills over `--nf-duration-deliberate`).
- One question per screen, full-bleed story artwork behind each:
  1. "What are you here for?" → 4 large option cards (Shortlet / Yearly rent /
     Hotel / Just looking), each a `.nf-card--interactive` at 88px tall with a
     3D object, a title, and a check that fills on select.
  2. "Where do you spend most time?" → state chips in a wrapped chip field.
  3. "Turn on booking alerts?" → one toggle + a huge black primary pill.
- The landing splash reduces to nothing; first-time landing visitors see the
  page immediately.
- Keep the existing `localStorage` gate and reduced-motion skip.

## C6. Motion — close the four real gaps

1. **Bottom-sheet system.** One `.nf-sheet` primitive:
   ```
   .nf-sheet {
     border-radius: var(--nf-radius-2xl) var(--nf-radius-2xl) 0 0;
     padding-bottom: max(1.25rem, env(safe-area-inset-bottom));
     animation: nf-sheet-in var(--nf-duration-slow) var(--nf-ease-spring) both;
   }
   @keyframes nf-sheet-in { from { transform: translateY(100%); } to { transform: none; } }
   .nf-sheet__handle { width: 2.25rem; height: 0.25rem; border-radius: 999px;
     background: var(--nf-border-strong); margin: 0 auto 0.75rem; }
   ```
   Plus an exit state driven by a `leaving` flag (the `Onboarding.tsx:38`
   `setTimeout` pattern already in the codebase), a drag handle on every sheet,
   and pointer-drag-to-dismiss with a snap-back spring. Apply to all 8 sheet
   surfaces.
2. **Press physics on `.nf-btn`.** Replace `translateY(1px)` (`globals.css:1363`)
   with `transform: scale(0.97)` plus a compressed shadow, and remove the
   `:active { translateY(0) }` on primary (line 1408) which currently cancels
   the press.
3. **Sliding tab indicator.** One absolutely-positioned pill inside
   `MobileTabBar`'s `<ul>`, with `left` / `width` driven from the active tab's
   offset and transitioned on `--nf-ease-spring`. Replaces the per-tab
   `.nf-tab-pop__pill`.
4. **Symbol effects** for save/heart (fill + pulse), refresh (rotate) and send
   (fly), matching the two that exist (`nf-ring`, `nf-verify-pulse`).
5. **Skeleton → content crossfade**: wrap content in `.nf-fade-in` on first
   paint after loading resolves.
6. **Add `.nf-page-scene` to the reduced-motion block at `globals.css:918`.**
7. **New tokens**: `--nf-duration-ambient: 14s`, `--nf-duration-ambient-slow: 20s`,
   `--nf-stagger-tight: 40ms`, `--nf-stagger-base: 70ms`,
   `--nf-stagger-loose: 120ms`. Then sweep the ~30 hardcoded durations.
8. Delete dead `nf-pulse-ring` (2566) and `nf-drift-c` (2366).

## C7. App Store / PWA — ship-blocking list

Ordered by what a reviewer or a first-launch user hits first:

1. **Safe-area top.** Add to `globals.css`:
   ```
   .nf-safe-top { padding-top: env(safe-area-inset-top); }
   .nf-shell { padding-inline: max(1.25rem, env(safe-area-inset-left)) max(1.25rem, env(safe-area-inset-right)); }
   ```
   and apply `.nf-safe-top` to `SiteHeader.tsx:28`, `AppShell.tsx:90`,
   `MobileMenu.tsx:71`, `AppShell.tsx:74`, `AccountSection.tsx:167`,
   `(auth)/layout.tsx:27`, `admin/layout.tsx:51`, `AgentRail.tsx:30`,
   `Onboarding.tsx:84`.
2. **Delete the demo CTA** (`AuthPanel.tsx:84–93`).
3. **44×44pt minimum.** `.nf-icon-btn` `2.6rem` → `2.75rem`
   (`globals.css:1576`); `.nf-dock__btn` `2.5rem` → `2.75rem` (2163);
   `ThemeToggle.tsx:41` `h-9 w-9` → `h-11 w-11`; `MobileMenu.tsx:78` same;
   both hamburgers `h-10` → `h-11`.
4. **Per-theme `theme-color`** — array form in `layout.tsx:101`, plus a runtime
   `<meta name="theme-color">` update in `ThemeToggle.tsx:24–34` since theme is
   `localStorage`-driven, not media-driven.
5. **iOS splash screens** — generate `apple-touch-startup-image` links for the
   current iPhone/iPad classes; the navy `background_color` already gives you
   the right ground.
6. **`favicon.ico` + `app/icon.png` + `app/apple-icon.png`**; regenerate all
   `public/pwa/*.png` as truecolour, and add a 1024×1024 for App Store.
7. **Manifest**: add `screenshots` (narrow + wide), `display_override`,
   relax `orientation`, and point `start_url` at a route that works logged-out.
8. **Haptics**: a `lib/haptics.ts` with `navigator.vibrate([8])` on primary
   press, wired into `.nf-btn--primary` click handlers and tab selection.
9. **Light-theme AA**: `--nf-content-muted` `#7A8189` → `#666D75` or darker
   (`tokens.css:304`).
10. **Lower `.nf-grain` below the nav** (`z-index: 70` → `z-index: 5`) or drop
    it on `(pointer: coarse)`; it currently composites over the tab bar every
    frame.
11. **Settle the brand name.** One name in `manifest.ts`, in the copy, and in
    every support address.

---

## Appendix — what is genuinely excellent and must not be regressed

- `public/sw.js` — the allowlist/blocklist split, the `Vary: Cookie` refusal,
  Save-Data respect and cache versioning are better than most production PWAs.
- `globals.css:2648–2686` — the `data-instant` fix for above-the-fold
  scroll-timeline reveals, and the comment explaining the real bug it solved.
- `globals.css:2616–2620` — scoping `will-change` to the hidden state only, and
  the note about it trapping `position: fixed` descendants. That is hard-won.
- `Odometer.tsx` — digit strips with grouped separators and a real a11y
  fallback. Better than any count-up library.
- `tokens.css:356–365` — collapsing duration tokens rather than deleting
  animations is the correct reduced-motion architecture.
- `.nf-icon-tile` (`globals.css:320–410`) + `TiltField.tsx` — genuine layered
  glass with a real inner well, and one delegated listener for the whole page.
- `(site)/careers` and `(site)/contact` — honest designed empty states rather
  than fake vacancies or a form that swallows messages.
