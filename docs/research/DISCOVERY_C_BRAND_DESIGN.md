# Discovery C: brand, design system, assets and responsive truth

**Written 18 September 2026 by discovery Agent C of 3, read-only, for the
visual redesign session.** Agent A owns routes, journeys and surfaces; Agent B
owns backend, admin and security; this file deliberately does not duplicate
them. Every claim carries a file reference. Status vocabulary: EXISTS AND
WORKS / INCOMPLETE / FRONTEND ONLY / MOCK-DEMO / PLACEHOLDER / NOT
IMPLEMENTED / UNCLEAR.

**Read first, because it changes how to read everything else:** the tree was
snapshotted mid-build. `docs/archive/BUILD_05_LEDGER.md` records that the HANDOFF_05
two-side build landed three commits today (`bb36563`, `a8fad5b`, `70c98d9`):
the side flip, six stays route shells, `/stays` and `/stays/search`, the stay
detail showcase, `/trips`, the three thread faces, `/inspections`, the
wallet's send and receive as full pages, and `/settings/payments`. The great
audit in `docs/FRONTEND_REVAMP.md` was written on 16 September, two days and
one landing rebuild ago, so many of its findings are already closed; section 7
below says which verdicts still stand. The authorities, in reading order:
`docs/BRAND_MARKS.md` (rewritten 16 September, glass replaces clay),
`docs/ICON_SYSTEM.md` (two tiers, corrected twice), `docs/HANDOFF_03_FRONTEND.md`
(the visual law), `docs/FRONTEND_REVAMP.md` (the 293-finding audit),
`packages/design-tokens/src/tokens.css` (the single source of truth, 2,960
lines, most of them argued reasoning).

---

## 1. Old-brand census, exhaustive

The repository has carried three names: **NinjaFinds / NaijaFinds** (the
original working name; both spellings appear in the docs, `NaijaFinds` is the
one the code history used), **RentMe** (the second working name), and
**Vallo** (current; the legal person is VALLO SPACES LTD per
`docs/HANDOFF_01_COMPANY.md:427`). The census below covers code, `public/`,
config, database and the assets tree. Docs are excluded except where
user-facing, per the brief.

### 1.1 The headline finding

**The user-facing sweep is essentially complete.** Grepping `apps/web/src`,
`packages`, `scripts` and `apps/web/public` for `rent ?me` (case-insensitive)
returns 26 files, and reading every hit shows that **every single one is a
historical comment explaining what was removed**, not a live string. Examples:
`apps/web/src/lib/legal/company.ts:6` ("RentMe is a dead working name and was
never a legal person"), `apps/web/src/components/app/MediaFrame.tsx:81` ("Two
RentMe-era renders used to fill the gap... THEY ARE GONE"),
`apps/web/src/app/css/ambient.css:67` (the deleted 1,343KB `vallo-bg.png`
render). `naijafinds`/`ninjafinds` returns zero hits in source; it survives
only in docs and in the remote branch `feat/naijafinds-brand-system`, which
`docs/BRANCH_AUDIT.md:279` already verdicts as Delete (236,701 lines of brand
system for a dead name, recovery SHA recorded).

**Status: EXISTS AND WORKS (the rebrand), with the specific remnants below.**

### 1.2 Location-by-location transition list

For each: file, what it says now, what it should become. Nothing was changed.

| # | Location | What it says now | What it should become | Status |
| --- | --- | --- | --- | --- |
| 1 | `apps/web/.next/**` (build output) | The stale compiled chunks still contain `"RentMe <hello@rentme.ng>"` and `"RentMe. Find it. Rent it. Love it."` (seen in `apps/web/.next/server/chunks/apps_web_src_lib_email_client_ts_*.js`) | Nothing: it is a stale local build artefact, the source (`lib/email/client.ts:25`) already says `Vallo <hello@vallospaces.com>`. A fresh `npm run build` erases it. Worth knowing only so nobody greps `.next` and panics | EXISTS AND WORKS (source); stale artefact |
| 2 | `apps/web/src/lib/email/render.ts` (23 occurrences) | Every email CSS class is prefixed `rm-`: `rm-title`, `rm-body`, `rm-muted` (e.g. line 239, 242, 251, 492) | `rm-` almost certainly stands for RentMe. Classes in email HTML are invisible to users, so this is the same call as the `nf-` prefix: optional churn. Rename to `vl-` only if a sweep is otherwise complete, or record it as accepted-internal | INCOMPLETE (cosmetic, internal) |
| 3 | `supabase/migrations/*` (56 files) | Migration filenames and SQL comments say `rentme` (e.g. `20260807131002_rentme_says_one_useful_thing_a_day.sql`); `20260915090000_the_database_stops_saying_rentme.sql` is the migration that renamed the live objects | Nothing. Migrations are immutable history; the database itself was renamed by the 15 September migration. Accept | EXISTS AND WORKS (accepted history) |
| 4 | `--nf-` token prefix | 6,266 occurrences of `--nf-*` custom properties across `apps/web/src` and `packages`; plus cookies `nf_locale` (`lib/locale.constants.ts:8`), `nf_mode` (`lib/mode.constants.ts:8`), `nf_side` (`lib/side.constants.ts:19`); plus the `nf/` ESLint rule namespace and every `.nf-*` CSS class | **Accept as internal, permanently.** `docs/HANDOFF_02_PLATFORM.md:771` already rules on this: "The `nf-` CSS token prefix and the `nf/` lint rules are internal, not user-visible, so renaming them is optional churn. Leave them unless the sweep is otherwise complete." Renaming 6,266 token references plus three live cookies (which would log out preferences platform-wide) buys nothing a user can see. The redesign session should treat `nf-` as the design system's namespace, full stop | EXISTS AND WORKS (accepted internal) |
| 5 | Old slogan "Find it. Rent it. Love it." | **Gone from all source.** Grep of `apps/web/src`, `packages/i18n/src` returns only the stale `.next` artefact and historical doc references. The ten live locations `FRONTEND_REVAMP.md:745` inventoried have all been retired | Nothing left to do in code | EXISTS AND WORKS |
| 6 | Current slogan | `packages/i18n/src/locales/en.ts:326` `slogan: "Real Estate reimagined!"` (deliberately untranslated, per its own comment); `app/layout.tsx:78` metadata title `"Vallo. Real Estate reimagined!"`; `lib/email/theme.ts:159` `SIGN_OFF = "Vallo. Real Estate reimagined!"`; auth shell renders it under the lockup (`(auth)/layout.tsx:49`). The landing hero uses the recast form: `en.ts:358` `title2: "reimagined."` with the FRONTEND_REVAMP:742 reasoning (sentence case, no exclamation in-product) applied to the hero only | One decision for the redesign session: the product now carries **two casings** of the line ("Real Estate reimagined!" in metadata, email and auth; "Real estate... reimagined." in the hero). That is deliberate per the audit, but the redesign should confirm the founder wants both registers, and where the exclamation mark lives | EXISTS AND WORKS, one open register question |
| 7 | Logos | `apps/web/public/brand/`: `vallo-logo.png` (1024px lockup), `vallo-icon.png` (1024px tile), `vallo-mark.png` (614x587 towers-and-swoosh), `vallo-wordmark.png` (758x167). All four are now 8-bit colormap PNGs; `design-system/brand/Logo.tsx:19-40` records that the mark was re-keyed to alpha on 16 September (the audit's "logo has no alpha" finding is CLOSED); `scripts/build-brand-marks.mjs` is the record | Retain. The redesign should judge the mark at header size in both themes (Logo.tsx says it reads as glass with a soft blue halo on paper) but the asset defect is fixed | EXISTS AND WORKS |
| 8 | Favicon and app icons | `apps/web/public/favicon.ico` (32px, PNG data), declared at `layout.tsx:146-148`; `public/pwa/` holds icon-16 through icon-512, maskable, apple-touch and three shortcut icons, all generated from `vallo-icon.png` by `scripts/build-web-icons.mjs`; the duplicate `public/manifest.webmanifest` is DELETED (verified absent), leaving only the typed `app/manifest.ts` | Retain; the pipeline is scripted and reproducible | EXISTS AND WORKS |
| 9 | Open Graph / share card | `app/opengraph-image.png` exists (1200x630, 54KB), generated by `scripts/build-og-image.mjs`, emitted automatically by Next per the comment at `layout.tsx:96-102`. The audit's "no OG image, blank WhatsApp unfurl" finding is CLOSED | Retain; redesign may want to art-direct a richer card once real photography exists | EXISTS AND WORKS |
| 10 | Page titles and meta | `layout.tsx:75-115`: title template `%s \| Vallo`, description is property-led ("Rent, buy or sell property across Nigeria..."), keywords are rent/property/real-estate. The travel-app description the audit flagged is gone | Nothing | EXISTS AND WORKS |
| 11 | Manifest copy | `app/manifest.ts:44` description: "Nigeria's property marketplace..." with the three-faults comment showing the old travel copy was consciously replaced; name and short_name "Vallo"; navy splash | Nothing. Note `categories: ["travel", "lifestyle", "shopping"]` at `manifest.ts:54` still leads with "travel", which is a store-classification remnant of the travel-app era; consider `["business", "lifestyle", "shopping"]` or similar | INCOMPLETE (one word) |
| 12 | Capacitor | `apps/web/capacitor.config.ts:64-68`: `appId: "ng.vallo.app"`, `appName: "Vallo"` | Nothing. Note the HANDOFF_05 stop list forbids touching native app identifiers, so this is frozen anyway | EXISTS AND WORKS |
| 13 | Package names | Root `package.json` name `vallo`; `@vallo/web`, `@vallo/design-tokens`, `@vallo/i18n`. The `@naijafinds/*` scope HANDOFF_02:752 describes is fully retired | Nothing | EXISTS AND WORKS |
| 14 | Repository name | The GitHub repository is `read-it-well`, which is neither brand. It appears nowhere user-facing | Founder's call: renaming a repo is cheap on GitHub (redirects preserved) but touches CI, Vercel linkage and every clone. Recommend renaming to `vallo` at a quiet moment, or accepting it as a codename. Not a redesign blocker | UNCLEAR (decision, not defect) |
| 15 | Email sender | `lib/email/client.ts:25` `DEFAULT_FROM = "Vallo <hello@${BRAND_DOMAIN}>"` resolving to `hello@vallospaces.com` via `lib/brand-domain.ts`; tested at `client.test.ts:210-216`. `lib/support-email.ts` documents that `support@rentme.ng` never existed and is gone | Nothing. The domain itself (`vallospaces.com`) must be verified in Resend by the founder; the repo cannot confirm DNS | EXISTS AND WORKS (code); UNCLEAR (DNS reality) |
| 16 | The live deployment | `docs/HANDOFF_03_FRONTEND.md:210` warns the old Vercel deployment at the old address may still show RentMe branding | Outside this session's reach. The redesign session should confirm what is actually deployed before publishing any visual comparison | UNCLEAR (unverifiable here) |
| 17 | Old navigation labels | None found. Nav strings come from `packages/i18n` and `nav-model.ts`; nothing carries an old brand | Nothing | EXISTS AND WORKS |
| 18 | Historical comments naming RentMe (the 26 files in 1.1) | Deliberate institutional memory, in the founder's documented style of keeping the account of a change beside the change | Keep. Deleting the history is how the same mistake gets made twice; the style is consistent across the tree | EXISTS AND WORKS (by design) |

### 1.3 Is the `nf-` prefix a NinjaFinds remnant, and is renaming practical

Yes, it is a remnant: `nf` = NaijaFinds (HANDOFF_02 section 15 lists "`nf-`
token prefixes" among the places old copy hides, in the same breath as
`naijafinds`). And no, renaming is not practical or worthwhile: 6,266 token
references, three live browser cookies whose rename silently resets every
user's theme, locale, mode and side preferences, an ESLint plugin namespace,
and every class in fourteen stylesheets. It is invisible to users, the
platform's own handoff explicitly blesses leaving it, and the working
convention is stable. **Recommendation: accept as internal, record the
acceptance once (this file plus a line in HANDOFF_06), and never spend a
sprint on it.**

---

## 2. Design system audit

Source of truth: `packages/design-tokens/src/tokens.css` (2,960 lines,
two-layer architecture: layer 1 raw palette, layer 2 semantic; components may
only read layer 2, per ADR-002). The stylesheet layer is
`apps/web/src/app/css/` (21 partials imported in cascade order from
`globals.css`) plus three route-owned sheets (`app/side-nav.css`,
`app/settings-rows.css`, `app/social.css`, `app/social-feed.css`).

### 2.1 Colour. EXISTS AND WORKS, unusually well governed

- **One blue family.** Raw ramps: `--nf-ink-950..500` (navy-biased deep space,
  `#010118` to `#0010A0`, tokens.css:37-44), `--nf-mist-100..500` (pale inks),
  `--nf-royal-*`, `--nf-electric-400..700` (`#0C39EF` the glow ink), cyan 400/500,
  and exactly three hues outside the family: `--nf-emerald-400` (success),
  `--nf-rose-400` (error), `--nf-sky-400` (info). Crimson was deleted with a
  written obituary (tokens.css:80-98). **No orange, amber, gold, purple,
  violet, magenta anywhere**, stated as a decision at tokens.css:118-131.
- **Canvas and surface ladder.** `--nf-surface-canvas: #000010`, then
  primary/secondary/elevated/raised riding the ink ramp, plus `-inset`
  (tokens.css:315-320). Depth on dark is carried by rim and border, not
  shadow, because black shadows on this navy measure 1.003:1 (the file proves
  it at tokens.css:1051-1057 with a rendered-pixel probe script).
- **Semantic roles**: brand primary/strong/quiet (`--nf-brand-quiet` #5C7CFF
  at night, #0C2FE8 on paper, the themed "quiet ink" that focus ring, links,
  rating and verified all ride), a four-rung brand tint ladder (14/20/28/40 per
  cent night, 7/10/14/18 daylight, derived by luminance budget,
  tokens.css:251-254), status tokens (pending = cyan, approved = emerald,
  rejected = rose, **verified = brand blue**, tokens.css:731-750), media
  overlay family (theme-independent because photographs are), the drawn-scene
  media palette, and the on-paper artwork stage.
- **Mode and side accents**: `--nf-mode-personal/agent/admin` all inside the
  blue family, told apart by depth; `--nf-side-accent` (tokens.css:302-312,
  landed with today's flip work) resolves Property to the electric mid and
  Stays to the bright glow, set pre-paint on `<html>` via `data-side`
  (`AppShell.tsx:288`).
- **Dark default, light as a designed twin.** Dark is default and the OS does
  not override it; only a stored choice moves the theme. Mechanism: inline
  pre-paint script at `layout.tsx:252` reads `localStorage nf_theme` and sets
  `document.documentElement.dataset.theme`; `tokens.css:2397`
  `:root[data-theme="light"]` re-answers the whole layer 2 surface;
  `css/light.css` (609 lines) carries the component-level daylight
  adaptations, including the stride ring on white cards (light.css:33-40).

### 2.2 The glass material. EXISTS AND WORKS

The four-ingredient contract (tokens.css:941-951): blur plus saturation,
bright 1px inner top rim, hairline border, two-layer ambient shadow. "A
surface carrying fewer than four is not glass and must not use these tokens."
Three depths (`.nf-glass--thin/default/--strong`, glass.css:148-234), each
mapping fill, blur, rim and elevation rung together (tokens.css:1131-1133).
One light angle for the whole platform, `--nf-light-angle: 152deg`, chosen
because it is the angle the icon artwork was rendered at (tokens.css:906-938).

**The two-layer card** (`.nf-card`, glass.css:516-548): a canvas-mix fill on
the padding box, and a conic **stride ring** on the border box, the
`--nf-edge-stride-stops` token (tokens.css:1448-1459): two catches where the
light enters and leaves, quiet hairline between, radius `--nf-radius-xl` 22px.
The cursor-tracking light and the backdrop blur on cards were deliberately
removed (glass.css:571-585). This is the signature surface and it survives the
light theme (light.css:33).

**The glow scale** (tokens.css:1364-1395): `--nf-glow-ink` plus wash/1/2/3/4
as colours, and a separate brand-edge scale for outlines, replacing 54
hand-written `rgb(12 57 239 / a)` literals at 21 alphas. The audit's
prerequisite item 18 is CLOSED.

### 2.3 Elevation, radius, spacing, type

- **Elevation**: six rungs (`--nf-elev-1..5` plus ground), each ambient +
  direct + its own rim and border weight (tokens.css:1155-1193). Rung 3 is
  the bottom-sheet rung with an upward shadow and must never be ranked against
  its neighbours (tokens.css:1085-1090). Known accepted debt: each theme
  carries a dead half (dark shadows do nothing, light rims do nothing),
  measured and left standing pending a design decision (tokens.css:1034-1073).
- **Radius law**: xs 6 / sm 10 / md 14 / lg 18 / xl 22 / 2xl 32 / pill 999
  (tokens.css:1464-1470), plus `--nf-radius-control` derived from md: **every
  pressed control is a 14px rectangle, not a capsule**, on the owner's ruling
  (tokens.css:1472-1507). Residual: roughly 145 references still on the old
  values per the file's own note; and the audit's Tailwind `rounded-xl` (12px)
  versus `--nf-radius-xl` (22px) namespace collision (FRONTEND_REVAMP item 28)
  is UNCLEAR whether fully resolved; treat any `rounded-*` numeric utility in
  the tree as suspect.
- **Spacing**: a twelve-step scale `--nf-space-0..5xl` (2px to 128px,
  tokens.css:1625-1636) plus role tokens (`--nf-gap-section` clamp 48 to 96,
  `--nf-gap-row`, `--nf-pad-shell` clamp 24 to 40, `--nf-pad-card`,
  `--nf-pad-field-affordance: 44px` the tap floor, tokens.css:1689-1829),
  bridged into Tailwind by name via `css/theme.css` (`p-lg`, `gap-row`,
  `px-gutter`).
- **Typography**: two faces, both self-hosted in `public/fonts` (8 woff2
  files: Inter variable in latin, latin-ext, vietnamese subsets; Poppins 600
  and 700 in latin and latin-ext). **Nothing loads from Google** (grep for
  `fonts.googleapis` returns zero). `css/fonts.css` documents the subsets:
  latin-ext for the naira sign and Hausa hooked letters, vietnamese for the
  Yoruba and Igbo dotted vowels. `--nf-font-display` is Poppins falling back
  to Inter, and the Yoruba/Igbo locales swap display to Inter entirely
  (tokens.css:2376) because Poppins cannot draw their vowels. Type scale:
  display/h0-h4 as clamps, body-lg 17, body 16, body-sm 14, caption 13,
  overline 12 (tokens.css:2034-2121), preloaded per locale
  (layout.tsx:36-47).

### 2.4 Component inventory

| Component | Where | Status |
| --- | --- | --- |
| Buttons | `components/ui/Button.tsx` + `css/buttons.css`. Five variants: primary, secondary (maps to `nf-btn--glass`), ghost, danger, dangerQuiet (Button.tsx:37-59); sizes 44/48/56 on the iOS ladder; press physics on `:active` scale via `--nf-duration-press`/`--nf-ease-press`; primary carries the CTA gradient and a press sweep; hover behind `(hover: hover)`. The audit's "six variants for five implementations, 64px slab" (item 26) is CLOSED | EXISTS AND WORKS |
| Inputs and forms | `components/ui/Field.tsx`, `css/controls.css` (554 lines: fields, selects, toggles, steppers), `Switch.tsx`, `PhoneField.tsx`. Focus is unified: pointer clicks draw no ring, keyboard gets `--nf-focus-ring` everywhere including ARIA controls, and bare inputs in styled shells use `.nf-focus-well` (base.css:130-173) | EXISTS AND WORKS |
| Navigation | Desktop rail `.nf-nav--rail` (side-nav.css, sticky, 100dvh, shown at 64rem); phone drawer (same component, one stylesheet so they cannot drift); floating bottom dock `MobileTabBar.tsx` + `AutoHideDock.tsx` (four destinations per side, travelling active pill, 28px glyphs); `SideSwitch` coin in the nav foot; segmented control in buttons.css:471-533 | EXISTS AND WORKS |
| Sheets / modals / drawers | `components/ui/Sheet.tsx` owns portal, spring, detents, drag, focus trap, counted scroll lock, Escape, focus restoration, safe-area inset and reduced-motion (per ResultSheet.tsx:38-41); overlays.css carries backdrop tokens (`--nf-overlay-backdrop`, one value replacing five hand-written ones, tokens.css:374-381) | EXISTS AND WORKS |
| Confirmation | `components/app/ResultSheet.tsx`: one sheet driven by state, replacing nine bespoke confirmation screens; `consequence` is type-required on pending/review/failed via a discriminated union; no confetti by design (its header). This is HANDOFF_02 section 24 delivered. How many flows are wired through it versus still bespoke is not fully verifiable here | EXISTS AND WORKS (component); INCOMPLETE (adoption breadth UNCLEAR) |
| StatusPill | `components/ui/StatusPill.tsx`, tones riding `--nf-state-*-surface` and `--nf-status-*` | EXISTS AND WORKS |
| Tables | `components/ui/Table.tsx`; admin queues on the QueueFilters frame (HANDOFF_05 phase E language) | EXISTS AND WORKS; phone-width quality per surface UNCLEAR |
| Charts | `components/agent/charts/DonutChart.tsx`, `AreaSparkline.tsx`; wallet `BalanceCard.tsx` sparkline. Small hand-rolled SVG, agent console and wallet only. The fabricated landing PULSE chart is deleted with `PlatformConsole` | EXISTS AND WORKS (small) |
| Toasts | **There is no toast component.** `animation.css:347-353` states it plainly and reserves `nf-arrive` with `--nf-arrive-from` for whoever builds it. Transient feedback today is inline (e.g. `SaveControl.tsx` renders its own in-card status because "a card in a grid has no room for a toast") | NOT IMPLEMENTED (deliberate, with a designed landing slot) |
| Skeletons / loading | `components/ui/Skeleton.tsx`, `components/app/ScreenSkeleton.tsx`, `AgentScreenSkeleton.tsx`; every new route ships `loading.tsx` (stays shells landed with skeletons per ledger item A3) | EXISTS AND WORKS |
| Empty states | `EmptyState` + `ICON` in `components/app/Screen.tsx`, `EmptyActions.tsx`; ledger `70c98d9` unified "one empty-state anatomy between the feed and a profile" | EXISTS AND WORKS |
| Error states | Route-level `error.tsx` on (site), (app), (auth), admin; `Unreachable.tsx`; PayPanel failure branch corrected from cyan to rose (BRAND_MARKS.md:249-266) | EXISTS AND WORKS |

### 2.5 Where the system is inconsistent (verified samples)

The audit's headline inconsistency numbers have moved and I re-counted them:

- **Arbitrary font sizes**: 464 occurrences of `text-[Npx/rem]` in
  `apps/web/src` today, down from the audit's 987; a further 667 sites
  correctly use `text-[var(--nf-text-*)]`. The lint rule
  `eslint-rules/no-arbitrary-font-size.mjs` exists and runs as a warning
  (baseline lint is "exit 0, warnings only... arbitrary font sizes",
  BUILD_05_LEDGER.md:67). INCOMPLETE, roughly half migrated.
- **Raw spacing utilities**: 328 numeric Tailwind spacing utilities remain
  (down from 2,635), against the named scale (`p-lg`, `gap-row`) used
  everywhere new. `eslint-rules/no-raw-spacing.mjs` walks it down.
  INCOMPLETE, mostly migrated.
- **The two thread components**: there are literally two `ThreadView.tsx`
  files, `(app)/post/[id]/ThreadView.tsx` (social post thread) and
  `(app)/messages/[id]/ThreadView.tsx` (messages thread), plus
  `components/app/messages/MessageThread.tsx`. They are different domains
  wearing one name, not one duplicated component, but the shared anatomy
  (bubbles, composer, header) is implemented at least twice. The messages one
  is the canonical engine (the three faces of `components/app/threads/*` fork
  inside it). Recommendation for the redesign: treat the messages thread as
  the reference and restyle the post thread to match, do not merge them.
  INCOMPLETE (duplicated pattern).
- **Dead ladder halves** in elevation (2.3 above): accepted, documented, not
  yet decided. UNCLEAR by design.
- **Mode accent orphans**: `--nf-mode-personal` and `--nf-mode-admin` had no
  consumer for two audits; the side accent finally consumed personal
  (tokens.css:302), so the note's own settlement condition has been met for
  one of two. Admin remains an orphan. INCOMPLETE.
- **The email theme is a parallel palette.** `lib/email/theme.ts` hardcodes
  its own hex ladder (seen compiled: `#F4F5FB`, `#0C39EF`, `#0010D0` etc)
  because email clients cannot read CSS custom properties. Same brand values,
  second definition; any token change must be mirrored by hand. Accepted
  constraint, worth a comment linking the two. INCOMPLETE (structural, low
  risk).
- **Radius migration tail**: ~145 old-value references per tokens.css's own
  note, plus the Tailwind numeric-radius collision. INCOMPLETE.
- **`TiltField` writes `--mx`/`--my` and nothing reads them any more**
  (glass.css:583-585). Dead code flagged in place. PLACEHOLDER (deletable).

`RECOMMENDATIONS.md` section 0 confirms the register is maintained (713
entries; MK rows being closed inline by the build session). The known
inconsistencies I sampled from it and the audit all verified as either fixed
or accurately described above.

---

## 3. Icon and imagery system

### 3.1 The two-tier law. EXISTS AND WORKS

`docs/ICON_SYSTEM.md` is binding and current (corrected 16 and 17 September).

- **Tier 1, BrandIcon** (`design-system/icons/BrandIcon.tsx`): content
  objects. **The glass swap landed 16 September.** It draws from
  `public/brand/glass/`: 103 objects at 256px, 23 usable light twins that
  swap automatically on paper, 12 hero scenes under `glass/hero/` (scenes,
  never icons, painted with `next/image` at their call sites). The multiply
  blend mode is deleted; the near-white ground plate on dark is deleted and
  its absence is the standing acceptance test; `--nf-icon-ground` is
  `transparent` at night (tokens.css:653) and a navy chip in daylight. Seven
  clay names live on as `LEGACY_ALIASES`. Props: name, size, fill, label,
  priority, className; **no `ramp` prop**. Sizing convention 20-24 inline,
  40-48 in cards, 64-96 in showcase.
- **Tier 2, UiIcon** (`design-system/icons/UiIcon.tsx`): 40 stroked
  navigation glyphs on a 24 grid. One weight, `UI_ICON_STROKE_PX` 1.5
  rendered CSS pixels, stroke-width computed from size, **no `strokeWidth`
  prop**. Sizes 12/16/20/24/28/32/40 with `snapUiIconSize` clamping
  off-scale requests. Vector sources checked in at `assets/icons/ui/*.svg`
  (40 files), generated and drift-checked by
  `scripts/build-icon-vectors.mjs --check`.
- The tiers never mix in one row. `Icon3D` and `TrustIcon` are deleted, not
  retired.

### 3.2 The glass pack inventory. EXISTS AND WORKS, with named gaps

Counted on disk at `apps/web/public/brand/glass/`:

- **103 dark objects** (105 directory entries minus the `light/` and `hero/`
  subdirectories). 4.4MB total against the clay set's 6.5MB.
- **24 light twins** in `glass/light/` (the 24-mark transaction set including
  `escrow-hold`; 23 are usable, see below).
- **12 hero scenes** in `glass/hero/`: hero-app, hero-assistant,
  hero-assistant-chat, hero-assistant-home, hero-globe, hero-growth,
  hero-map-stay, hero-property, hero-protected, hero-schedule, hero-support,
  hero-trip. Wide, glowing podiums, hero scale.
- **The withheld mark**: `escrow-hold` is cut, named and in the `WITHHELD`
  set of `scripts/icon-manifest.mjs:266` (alongside `hotel-sign`,
  `shield-lock-alt`, `map-spot-alt`) so nothing can reach it by accident,
  because `lib/legal/terms.tsx` says Vallo does not hold money in escrow.
  Keep it withheld until escrow exists (BRAND_MARKS.md:129-139).
- **Missing marks, the commission list** (BRAND_MARKS.md section 5 plus
  HANDOFF_05 section 6): `homes-sparkle` and `house-sparkle` (standing in as
  `cluster-home` and `modern-house`), a bubble-and-headset `support-chat`
  upgrade (current headset is acceptable), **restaurant and resort marks**
  (needed by the Stays side; `hotel-sign` is banned because it has the word
  HOTEL baked into pixels, which cannot be translated), and the light pass of
  six sheets, wanted only for email, print and light-theme empty states where
  a chip would read as a hole.
- **The light-and-dark law**: two files, not one recolouring. Tested evidence
  is in the repo: `docs/img/glass-on-four-grounds.png` and
  `docs/img/glass-in-daylight.png`. The light twin of `seal-check` fails on
  dark (white tick turns black); the dark artwork on a navy chip in daylight
  "is visibly the most premium the set looks anywhere" (BRAND_MARKS.md:88-98).
  The redesign session should carry this exact rule into any reference image.
- **Rules for new artwork** (BRAND_MARKS.md section 6, binding): rendered on
  black, square at 1024px minimum (hero scenes may be wide), glow inside the
  frame, no text or numerals in artwork, lowercase-hyphen names, replacements
  keep the replaced name, everything goes through
  `scripts/icon-manifest.mjs`, never mixed with UiIcon in a row, no
  orange/amber/gold/purple, check against the set at 24px and 96px on night
  canvas and white card.
- **The clay set**: 87 files, 6.5MB, still on disk at `public/brand/icons/`
  as an archive; nothing draws it. Delete candidate once the founder signs
  off the swap permanently (FRONTEND_REVAMP item 47). PLACEHOLDER.

### 3.3 Photography and imagery reality

- **Zero listing photographs.** `listing_photos` held 0 rows at the last
  count for 64 listings (HANDOFF_03:355-373), all 64 demo rows. Every card
  and detail page renders `MediaFrame.tsx`'s **drawn scene**: `STAND_IN` is
  all-null and `public/brand/scenes/` contains only a README, so the drawn
  scene is the only path (MediaFrame.tsx:70-140). Land keeps the drawing
  permanently by design. The drawn-scene palette was lifted out of near-black
  into a dusk sky with a cool lit window (tokens.css:546-632). MOCK-DEMO
  catalogue, PLACEHOLDER imagery, and the single biggest visual constraint on
  the whole redesign.
- **The blocked-hosts constraint**: the build environment's network answers
  403 to every image host, recorded in `docs/IMAGERY.md` section 1 and
  MediaFrame's header. So `docs/IMAGERY.md` is a verified shopping list
  (eight scenes, licences vetted, drop-in wiring already built via
  `scripts/build-scene-manifest.mjs`), not a delivery. The founder or a
  network-unblocked session must drop the files in.
  `next.config` allows `images.unsplash.com` in `remotePatterns` (line 53),
  so remote Unsplash URLs would render if ever used. NOT IMPLEMENTED
  (photography), EXISTS AND WORKS (the wiring).
- **Videos / animation assets**: none on disk; all motion is CSS. No Lottie,
  no video files under `public/`.
- **Retain / replace / redesign verdicts**:
  - Retain: the four `vallo-*` logo assets, the 103 glass objects, 24 light
    twins, 12 hero scenes, the pwa icon pipeline, the OG image generator,
    the 8 font files, the drawn scene as the land-listing permanent art.
  - Replace: the eight scene photographs (the entire catalogue's face);
    the landing hero if a licensed Lagos-dusk photograph can be obtained
    (IMAGERY.md section 5 argues it is the one image worth paying for).
  - Redesign or commission: restaurant and resort glass marks,
    homes-sparkle, house-sparkle, support-chat with bubble, the light pass
    of the six dark-only sheets (narrow surfaces only).
  - Delete when authorised: the 87 clay objects (6.5MB), the withheld
    `hotel-sign` stays withheld.

---

## 4. Motion system

### 4.1 Tokens. EXISTS AND WORKS

Durations: instant 90, fast 160, base 240, slow 380, deliberate 620,
cinematic 900, entrance 520 (tokens.css:1834-1866). Easings: standard
(colour/shadow), entrance (spring-like arrival), exit, spring, press
(tokens.css:1868-1943). Reduced motion collapses **every duration token to
1ms** inside tokens.css itself (line 2926 onward) and sets spring to linear.

### 4.2 The animation.css contract. EXISTS AND WORKS

The six rules at `css/animation.css:1-36` are the platform's motion law:
motion is physics on two curves; entrances 400-600ms staggering 40-60ms,
never more than four steps; the press is the cheapest and most important and
every tappable surface scales; hover lives inside `@media (hover: hover)`;
**ambient motion is one per viewport, 20-40 seconds, one or two per cent**;
nothing loops for its own sake. The reduced-motion floor
(animation.css:60-71) is deliberately unlayered so it sits at the bottom of
the important cascade, forces `animation-iteration-count: 1` (a 0.01ms
infinite animation would otherwise run a hundred thousand times a second),
and exactly two meters override it: the undo bar (stays full and still) and
the verify sweep (fills).

Shared utilities: `nf-rise` and the capped stagger (`nf-rise-2..5`,
`nf-rise-seq` capped at four steps of 50ms), `nf-card-in` (grid assembly, cap
in the stylesheet not the caller), `nf-arrive` (message from the edge it
belongs to, the future toast's curve), `nf-shine` (gradient headline, sweep
removed, ramp kept), `nf-undo-drain`, `nf-verify-sweep`, and `nf-reveal`
(IntersectionObserver entrance with answers for `scripting: none`, print and
reduced motion; the third case, an observer that never fires, is documented
as belonging to `Reveal.tsx`, animation.css:230-258).

### 4.3 The motion.css component inventory. EXISTS AND WORKS

Message bubbles springing from their sender's side; typing dots; the thread
header's verified tint reusing `nf-confirm-pop`; the assistant's thinking
ring (driven by a real streaming signal, not idle); listing results folding
into the assistant thread; the odometer (roll brought onto the scale from a
hard-coded 1.15s); the wallet balance pulse (up success-tinted, down
brand-tinted, once per real change); transaction rows sliding from the
direction of the money; the landing scroll-driven system (`nf-enter`,
`nf-enter-scale`, `nf-parallax-soft` behind `@supports
(animation-timeline: view())`, word-by-word headline wipe capped at four
steps with the blur deleted, `nf-rule-draw`); the story stage (one navy stage
in both themes, the feather mask deleted because it was eating the glass
glow, motion.css:443-482).

### 4.4 The post mortems, which are the law for the redesign session

`motion.css` carries three written accounts of the same failure shape and
HANDOFF_05 explicitly makes them binding on the flip work:

1. **The guided flight** (motion.css:115-137): eleven rules and a keyframe
   for an onboarding sequence whose named trigger component
   (`components/site/Onboarding`) never existed. Deleted.
2. **The verification ceremony** (motion.css:139-155): same shape, same
   wording, `StatusIcon.tsx` never existed. Deleted.
3. **`.nf-hero-scene`** (motion.css:412-434): optimised three times before
   anyone asked whether anything rendered it. Five rules in four files for a
   class with no call site. Deleted.

The rule extracted: **CSS lands in the same change as the component that
triggers it**, and a cross-reference to a named file proves nothing. What
motion exists today is wired; I found no remaining CSS-without-component
except the deliberately parked `[data-breathe]` hook, which now has exactly
one consumer (the landing hero scene, page.tsx:172-192) and the
`nf-hero-scroll` keyframe at motion.css:352-361, which appears to have
outlived its class deletion and is a one-keyframe orphan worth deleting.

### 4.5 View Transitions and the flip. EXISTS AND WORKS (landed today)

- **View Transitions**: used for one thing, the photo camera move from
  listing card to gallery via matching `view-transition-name` set inline
  per listing, with a no-op fallback for unsupporting browsers and a
  CSS-only reduced-motion guard (base.css:26-41). HANDOFF_05 forbids the
  flip from depending on `startViewTransition`.
- **The flip** (`css/side-flip.css`, `components/app/flip/SideFlip.tsx` and
  `SideCover.tsx`, landed in `bb36563`): idle costs nothing; in flight the
  stage pins to the viewport as a perspective camera; phases lift (press
  curve, scale 0.94), turn (620ms entrance curve, rotation direction encodes
  geography via `--nf-flip-dir`), hold, reveal; the back face is the side
  cover (canvas navy, incoming side's glass mark, accent glow, static brand
  so it cannot race the network, shimmer only while the network is behind);
  input shielded and the front face `inert` mid-turn; `[data-reduced]`
  branch removes rotation outright because a 1ms rotation still rotates
  (side-flip.css:9-11). The ledger records it was driven in headless
  Chromium at 390px and 1280px, both themes, with and without reduced
  motion, both directions, with phase, URL, cookie and live region read at
  five points per flip (BUILD_05_LEDGER.md section 6). The coin control
  (`SideSwitch`) performs an edge tease and press spin (pitch 1), and the
  first-ever flip runs one beat longer as a localStorage-bounded ceremony
  (pitch 4).

---

## 5. Responsive truth

### 5.1 The law versus the mechanics. EXISTS AND WORKS structurally

The law (ledger rule 6): **390px first, in dark, then wider, then light.**
The mechanics that hold it up:

- `html` and `body` both `overflow-x: clip` (clip, not hidden, so sticky
  chrome survives; base.css:56-74); `-webkit-tap-highlight-color:
  transparent` and `overscroll-behavior-y: none` for the native feel.
- The page gutter is one token, `--nf-pad-shell: clamp(1.5rem, 0.9rem + 2vw,
  2.5rem)` (24 to 40px), reached as `px-gutter`.
- Tap targets: 44px is a token (`--nf-pad-field-affordance`) and `.nf-tap`
  grows the hit target without moving a pixel for the 28 controls that must
  look smaller (base.css:176-207).

### 5.2 Breakpoints actually used

In the hand-written CSS: 640px (10 uses), 768px (6), 1024px (4), 64rem (3,
the rail threshold), 1100px (3), 40rem (2, matching Tailwind `sm` for the
header height switch, documented at motion.css:507-527), 1280px (1). In TSX,
Tailwind's default `sm/md/lg` prefixes. So the real grid is: phone (< 640),
`sm` 640, `md` 768, the rail and admin split at `lg`/1024/64rem, and a
handful of wide-desktop refinements. No custom Tailwind screens config.

### 5.3 Phone dock versus desktop rail. EXISTS AND WORKS

- **Phone**: `MobileTabBar` is a floating dock (not edge-to-edge), four
  destinations keyed off the side (Property: Home, Explore, Feed, Messages;
  Stays swaps per `nav-model.ts`), 28px glyphs, a travelling active pill
  (its header documents the fix from per-tab cross-fades), auto-hide on
  scroll via `AutoHideDock`, safe-area inset handled.
- **Desktop**: `.nf-nav--rail` at 64rem+, sticky, `100dvh`,
  `--nf-rail-width`, 14px rows on 18px glyphs (side-nav.css:1-40's own
  account of shrinking it twice). Drawer and rail are one component and one
  stylesheet so they cannot drift.
- The dock and rail agree on ordering (Home first) since the swap documented
  in MobileTabBar.tsx:12-30.

### 5.4 Safe areas and the Capacitor shells. EXISTS AND WORKS

`env(safe-area-inset-bottom)` is used in the nav drawer (side-nav.css:46),
the tab bar, `ResultSheet`, `Sheet`, `AssistantChat`, `ListingGallery`,
`ChoicePicker`, the agent mobile nav and shell, `WelcomeCards`, and the admin
layout's bottom padding (admin/layout.tsx:109). The Capacitor shell
(`apps/web/capacitor.config.ts`) loads the live origin with keyboard resize
configured and a branded offline fallback in `webDir`; native capabilities
(status bar, splash, keyboard inset, hardware back, payment/OAuth handoff)
live in `src/lib/native/`. `docs/MOBILE.md` and `docs/MOBILE_READINESS.md`
carry the store-review risk honestly.

### 5.5 Per-surface mobile quality

- **Home, search, stays**: built mobile-first; home is a server page over
  live queries with the dock; `/stays` and `/stays/search` landed today over
  the existing catalogue with skeletons. EXISTS AND WORKS.
- **Listing detail**: `ListingStickyBar` uses `ActionBar` (the audit's
  "used once" finding is closed: checkout, stay detail and the listing bar
  all use it now). EXISTS AND WORKS.
- **Wallet**: send and receive graduated from sheets to full pages today
  (`(app)/wallet/send`, `/receive`, ledger `a8fad5b`), with the odometer and
  balance-after-send live. EXISTS AND WORKS.
- **Messages, inspections**: rebuilt today on the three-face engine;
  `/inspections` has Open and Closed with `loading.tsx`. EXISTS AND WORKS
  (unrendered signed-in, see honesty log).
- **Admin on a phone**: structurally yes, it is usable: the rail hides below
  `lg`, a scrollable `AdminTabs` strip takes over, the header collapses to
  back button plus mark, and content gets safe-area bottom padding
  (admin/layout.tsx:66-109). What remains UNCLEAR at phone width is the
  **table and queue density**: nineteen destinations of tabular data on the
  shared QueueFilters frame have never been rendered signed-in by any audit
  session (FRONTEND_REVAMP 8.3), so "usable" is verified for the shell and
  unverified for the content. The redesign session should treat admin-on-
  phone as needing one reference image of a queue at 390px.
- **Where desktop is squeezed onto mobile**: the historical offenders (two
  stacked headers costing 116px, F2-042; 39 truncations, item 30) are
  UNCLEAR whether fully closed; the truncation family was partially in
  today's build scope. The one confirmed remaining shape is long-form (site)
  pages (help, safety, legal) which are single-column prose and fine at
  390px but under-designed at desktop widths rather than the reverse.

---

## 6. Landing and marketing surfaces

### 6.1 The landing page today. EXISTS AND WORKS, rebuilt twice since the audit

`apps/web/src/app/page.tsx` (318 lines) is the second rebuild: the first cut
eighteen bands to seven around the move-in total, and the founder ruled that
read as one market, not a marketplace, so the current page leads with
breadth (its 70-line header comment is the account). The spine today:

1. **Hero**: overline (the marketplace line), brand headline with
   `title2: "reimagined."` on the gradient text, subtitle, primary CTA to
   gated `/search` plus secondary to `/agents`, five city chips, and the
   `hero-property` glass scene at desktop only, carrying the platform's one
   `data-breathe` (page.tsx:116-195). The aurora and grid veil paint behind.
2. **MarketsBand**: nine markets with real counts.
3. **FeaturedCarousel**: real listings from the catalogue.
4. **OneAccountBand**: wallet, pots, assistant, messages, verification.
5. **MoveInTruth**: the honest number, demoted from spine to proof.
6. **HowItWorks**: three verbs.
7. **StandardBand**: the standard for every market.
8. Vision and mission (inline section).
9. **AgentsBand**, 10. **NextBand** (the plan, labelled as a plan),
11. **VoicesBand** (real rows or nothing; renders null today),
12. **AssistantShowcase**, 13. FAQ (five questions, `details` elements with
   a UiIcon chevron), 14. CTA card.

**StoryRail is deleted**, replaced by hero scenes sitting inside the sections
they illustrate (page.tsx:76-79). **PlatformConsole, MoodRow,
PopularDestinations, the 2x2 feature grid and the trust strip are deleted**
with written reasons (page.tsx:63-87). `ProductFrame` is gone from the
directory. `CarouselRail.tsx` remains as the carousel primitive.

**Verdict**: the honesty problems that capped the 31/100 rating are
structurally solved (no fabricated numbers, no dead slogan, real listings on
the page, five-question FAQ). What has NOT been re-verified since the
rebuild: page height at 390px, band count against the four-second test, and
whether `gatedHref` still walls a stranger off from every property
(page.tsx:89-94 says the sign-in wall stands by design and is a product
decision recorded in RECOMMENDATIONS.md). The redesign session gets a page
that is honest and coherent but young: the sections themselves have had one
pass, not ten.

### 6.2 Marketing metadata. EXISTS AND WORKS

Covered in section 1.2 rows 9-11: metadataBase ladder, OG image on disk,
property-led description, per-locale font preloads.

### 6.3 Legal pages, help, FAQ, styleguide

- **Legal**: `(site)/terms`, `privacy`, `standards`, `cancellations`,
  `safety` render from `lib/legal/*.tsx` in the platform chrome; the terms
  carry the no-escrow language the artwork system now obeys. Long-form
  reading on solid ground, per the glass law (HANDOFF_03 2.3). EXISTS AND
  WORKS; visually plain, which is correct for the register, but the audit's
  note that `/safety` carried 29 glass reading cards should be re-checked
  after the card changes. UNCLEAR whether that count still holds.
- **Help**: `(site)/help` with `HelpSearch.tsx` (client-side search over
  help content) plus the landing FAQ's five questions. EXISTS AND WORKS,
  modest.
- **Styleguide**: `(site)/styleguide/page.tsx` with `tokens.ts`, a living
  reference of the token system. EXISTS AND WORKS and is a gift to the
  redesign session: it is the page to screenshot before and after.

---

## 7. Per-area visual-weakness verdicts

Each: what already reads premium, what reads generic or unfinished, and the
single highest-leverage visual move. Grounded in files; where the area
changed today, the ledger commit is cited. Ratings inherited from
FRONTEND_REVAMP are marked stale where the surface was rebuilt.

**Landing (`app/page.tsx`).** Premium: the hero scene on its glowing podium,
the gradient headline, the stride-ring cards, real listings. Generic: the
vision/mission two-card section (page.tsx:216-238) is the last
template-shaped band ("Why we exist" beside a mission card); FAQ styling is
serviceable but plain. Highest-leverage move: art-direct the six section
scenes at consistent sizes with one copy rhythm (overline, sentence, link)
per FRONTEND_REVAMP:735, which the rebuild only partially adopted. Stale
rating: 31/100 no longer applies; unrated since rebuild.

**Home (`(app)/home/page.tsx`).** Premium: daypart greeting over live
queries, LogoMark placement, ListingCard with the move-in lead
(ListingCard.tsx:545-565 confirms `price.lead === "moveIn"` renders).
Generic: the AiAssistantBanner and TrendingStrip are functional rows without
a signature; the page is a stack of rails. Highest-leverage: one designed
"good morning" masthead moment (greeting, city, weather-of-the-market)
instead of rails starting immediately.

**Search results (`(app)/search`, `components/app/filters`,
`css/explore.css`, `css/map.css`).** Premium: FilterDrawer pool logic
(praised by the audit), ViewToggle, map pin ground token. Generic: the
results grid is only as good as MediaFrame, which is a drawn scene on every
card; twenty drawn scenes still read as a page whose images failed
(FRONTEND_REVAMP:709). Highest-leverage: the no-photo card treatment, which
is a design decision not a code fix: the 16:9 information-surface card the
audit specified (verdict at FRONTEND_REVAMP:711) or real scene photography.

**Listing detail (`(app)/listing/[id]`, `components/app/listing/`).**
Premium: ListingMoveIn (named by the audit as better than most funded teams
ship), the sticky ActionBar, the gallery photo morph via View Transitions.
Generic: the gallery is a morph into placeholder art until photographs
exist. Highest-leverage: the move-in ledger as a designed surface of its own
(FRONTEND_REVAMP item 49 calls it the one moat in the document).

**Stays surfaces at snapshot (`(app)/stays`, `/stays/search`, `/stay/[id]`,
`/trips`, `/restaurants`, `/restaurant/[id]`; `components/app/stays/`;
commits `bb36563`, `70c98d9`).** Premium: the flip itself, the side cover,
the total-as-headline discipline, the refusal-with-reason on rate plans
(pitch 10), the trips date spine with today marked by shape and word.
Generic risk: first light is over the existing catalogue with the same
MediaFrame constraint, and the side's promised "warmer, more photographic"
character (HANDOFF_05 section 6) cannot exist until photography does; today
the two sides are told apart by accent depth and nav only. Highest-leverage:
the Stays shelf's imagery register, which is the single thing that makes the
flip land as "a different product that is still Vallo".

**Wallet (`(app)/wallet`, `components/app/wallet/`).** Premium: BalanceCard
with the odometer and balance pulse, day-grouped RecentActivity with
directional row entrances, pots, the withdraw sheet's consequence line (the
platform's best pending pattern, BRAND_MARKS.md section 7). Generic: the
action deck is buttons in a row; the trust strip is quiet. Highest-leverage:
wire `seal-pending`/`hourglass` plus amount plus consequence into every
money-moving state through ResultSheet, because the marks exist and nothing
draws them yet (BRAND_MARKS.md:237-247). The checkout pending states were
the worst in the product at audit time; UNCLEAR how far today's build closed
them.

**Messages (`(app)/messages`, `components/app/threads/`).** Premium: the
three faces on one engine, bubbles arriving from their sender's side, the
verified header tint, context glyphs on inbox rows. Generic: unverified
visually (no signed-in render has ever been done). Highest-leverage: the
ThreadContextBanner's three faces as one designed family (rental inspection
card, reservation state pill, booking steps timeline drawing its own rule).

**Inspections (`(app)/inspections`, commit `a8fad5b`).** Premium: Open and
Closed anatomy, the row-that-changed pulsing once on the shipped
transaction-in motion (pitch 8). Generic: brand-new, one pass. Highest-
leverage: the accept ceremony in the thread (pitch 7) as the reference
moment.

**Profile and social (`(app)/u`, `(app)/around`, `app/social.css`,
`social-feed.css`).** Premium: the stride material on post cards
(social.css:8-11), the on-media ink family, the story viewer's token
discipline. Generic: 88 per cent of posts are bot-authored (audit), so the
feed's visual truth is a system feed; the post thread duplicates the thread
anatomy (section 2.5). Highest-leverage: one designed empty-and-sparse state
for a feed that is honest about being young.

**Settings (`(app)/settings`, `app/settings-rows.css`).** Premium: the
grouped-row grammar (glyph rail, label, live value, one focus rhythm) is the
platform's best pattern statement outside tokens.css; `/settings/payments`
landed today on it. Generic: nothing serious. Highest-leverage: none needed;
this is the pattern other list surfaces should copy.

**Admin (`app/admin/`).** Premium: the shell (glass header, rail, tab
strip, access screen). Generic-to-unfinished: nineteen queues of tabular
content never audited signed-in; the audit found seventeen queues sharing
one congratulatory empty state and no filters (F2-055/056), partially
addressed by the QueueFilters frame. Highest-leverage: one queue reference
design at 390px and 1280px (filters, dense rows, StatusPill vocabulary) that
all nineteen inherit.

**Auth (`(auth)/layout.tsx`).** Premium: the audit's highest-rated surface;
the 104px lockup on the aurora with the slogan riding quiet beneath is
genuinely premium and now uses the alpha-keyed lockup. Generic: the forms
below the lockup are standard fields. Highest-leverage: none urgent; keep it
as the register-setter.

**Onboarding / welcome (`app/welcome/`, `components/app/welcome/
WelcomeCards.tsx`).** Premium: the first-run slides now paint glass objects
on the artwork stage (the 6.3MB RentMe renders are deleted,
WelcomeCards.tsx:49). Generic: three slides of brand objects and copy;
the deleted "guided flight" was never replaced with any richer first-run
moment. Highest-leverage: this is the natural home of the first-flip
ceremony and the two-sides story; a designed welcome that introduces the
coin would do double duty.

---

## 8. The recommended image list, draft

Rules taken from the brief: one image = one area, never a collage. Each row:
area, screen and purpose, what must be visible, important components,
property/image requirements, UI requirements, motion or interaction ideas,
viewport, and why the area needs its own reference. All images obey the
token law (one blue family, no warm hues), the glass law (glass floats,
reading sits on solid), the radius law (22px cards, 14px controls) and the
390px-dark-first law; light-theme twins are called out only where the
crossing is the hard part. 24 images.

1. **Landing hero, phone.** 390px dark. Must show: overline, two-line
   headline with gradient second line, primary CTA, city chips, no scene
   (the scene is desktop-only by design, page.tsx:166-179). Components:
   ButtonLink primary lg, nf-chip, nf-aurora ground. Imagery: none. Motion
   idea: the rise stagger frozen mid-arrival. Why: the four-second surface;
   the phone hero is words-only and must prove it can carry that.
2. **Landing hero, desktop.** 1280px dark. Adds the `hero-property` scene
   breathing on its podium at up to 480px. Why: the one `data-breathe`
   placement and the scene-beside-words balance need a reference.
3. **Markets band.** 390px dark. Nine markets with real counts, one glass
   object per market at 40-48px, one copy rhythm. Components: BrandIcon,
   count as nf-numeric. Why: this is the section that says "marketplace" and
   it is the newest band with the least design history.
4. **Property card, no photograph.** 390px two-up grid, dark. Must show the
   information-surface treatment for the zero-photo reality: market label,
   power answer, move-in total leading, drawn scene as quiet ghost, example
   mark, save control. Components: ListingCard, MediaFrame, StatusPill.
   Why: the most important component in the product judged against the real
   catalogue (64 listings, 0 photos).
5. **Property card, with photograph.** Same crop with a real warm-light
   photo (per IMAGERY.md section 3: golden hour, Nigerian architecture),
   56px scrim under the location line only. Why: the card must be designed
   for both realities and the pair proves the transition.
6. **Search results with filters.** 390px dark. Grid of card v2 above,
   FilterDrawer open at a detent, ViewToggle, result count line. Why: the
   grid-in-quantity question (twenty cards together) is different from one
   card.
7. **Listing detail, top fold.** 390px dark. Gallery edge to edge (photo
   morph target), title, market pill, move-in total prominent, sticky
   ActionBar pinned. Why: the money decision surface; ActionBar treatment
   sets the pattern checkout inherits.
8. **The move-in ledger.** 390px dark. The full cost breakdown as a designed
   surface: rows, total as headline, area comparison. Why: the product's
   moat (FRONTEND_REVAMP item 49) has no design yet.
9. **The flip, mid-turn.** 390px dark. The lifted viewport card at ~90
   degrees over the darkened canvas, the side cover's back face visible:
   navy, incoming side's glass mark, name, accent glow, three-object
   miniature. Components: SideFlip, SideCover. Why: the signature
   interaction of the whole platform deserves its own frame
   (side-flip.css:59-110).
10. **Stays home shelf.** 390px dark. StaySearchBar, StayCategoryRail,
    warmer imagery register, "Third party" tag mocked on one row (small and
    calm, per HANDOFF_05 Phase F law), total-price-first cards. Why: the
    Stays side's promised warmth versus Property's architecture needs a
    stated visual difference inside one token system.
11. **Stay detail showcase.** 390px dark. Gallery edge to edge, room types
    as rows, rate-plan sheet with one refused plan showing its reason, the
    total as the headline. Why: landed today (`70c98d9`) with one pass;
    it is the Stays side's listing-detail equivalent.
12. **Trips.** 390px dark. The date spine, today marked by shape and word,
    the past folded with its count, one "booked with partner" row rendered
    honestly. Why: the date spine is a new pattern with no precedent
    elsewhere in the product.
13. **Wallet home.** 390px dark. BalanceCard with odometer, action deck,
    day-grouped activity with directional rows, pots. Why: the financial
    heart of both sides; the audit called the wallet pattern the best in
    the product and it should be canonised.
14. **Send money, mid-flow.** 390px dark. Recipient, amount with the
    odometer rolling, balance-after-send live, consequence line.
    Why: graduated from sheet to page today; the reference sets the
    full-page money-flow grammar.
15. **ResultSheet, pending state.** 390px dark. The sheet over a dimmed
    checkout: `seal-pending` glass mark large, verdict two words, the
    amount, the consequence line, one primary and one quiet action.
    Why: pending is "the most neglected state and the most anxious"
    (BRAND_MARKS.md section 7) and the marks exist unwired.
16. **ResultSheet, failed state, light theme.** Same anatomy in rose with
    `seal-cross`'s light twin on paper. Why: the light crossing is the
    hardest problem in the brand (HANDOFF_03 2.5) and failure is where
    colour discipline matters most.
17. **Messages inbox plus thread, rental face.** 390px dark. Inbox rows
    with context glyphs, then the thread with ThreadContextBanner's
    inspection card and controls. Why: the three-face engine landed today;
    the rental face carries the inspection ceremony.
18. **Thread, booking face.** 390px dark. The booking steps timeline
    drawing its own rule as steps complete, contact channel below.
    Why: a different face on the same engine must read as family, and the
    timeline motion (pitch 5) needs a visual anchor.
19. **Inspections.** 390px dark. Open and Closed sections, one row pulsing
    as just-changed, outcome states. Why: brand-new surface, one pass,
    property-side signature flow.
20. **Settings grouped rows.** 390px dark and light in one pair if needed,
    otherwise dark. Group label outside the card, glyph rail, live values,
    a toggle, `/settings/payments` cards and bank accounts. Why: the
    platform's best list grammar (settings-rows.css) should be the
    reference other surfaces copy.
21. **Admin queue at phone width.** 390px dark. The AdminTabs strip, one
    queue on the QueueFilters frame: search, status filter chips bound to a
    real enum, dense rows with StatusPill, pagination. Why: nineteen
    destinations inherit whatever this looks like, and admin-on-phone is
    the least-verified surface in the product.
22. **Admin queue at desktop.** 1280px dark. Same queue with the rail,
    wider table, bulk affordances. Why: admin is the one surface where
    desktop is the primary viewport and it must not be a stretched phone.
23. **Auth sign-in.** 390px dark. The 104px lockup on the aurora, slogan
    beneath, the glass panel with fields, linked consent line. Why: the
    register-setter; the redesign must not regress the best screen while
    changing everything around it.
24. **Welcome / first-run with the coin.** 390px dark. A first-run slide
    introducing the two sides: glass objects on the artwork stage, the
    SideSwitch coin shown with its edge tease, one line about the flip.
    Why: onboarding is the natural home of the two-sides story and
    currently the thinnest designed moment in the product.

Deliberately not given their own images: legal pages (prose on solid
ground, no design question), help (inherits landing FAQ grammar), the map
view (inherits card + pin tokens; add later if the redesign touches
map.css), restaurants (blocked on the restaurant glass mark commission;
image 10's third-party row carries the labelling question meanwhile), and
the social feed (a redesign there is premature while 88 per cent of posts
are system-authored; the empty-state verdict in section 7 is the cheaper
first move).

---

## Honesty log

- **Nothing was rendered.** This session read code, tokens and documents
  only. No route was served, no screenshot taken, no signed-in state seen.
  Every "premium/generic" verdict in section 7 is a structural read plus the
  16 September audit's rendered evidence where the surface has not changed
  since; where it changed today I say so.
- **The build session was pushing while I read.** The ledger's "Landed"
  table (BUILD_05_LEDGER.md section 4) was my map of what moved today; I
  verified the flip CSS, the stays routes, the wallet pages, the payments
  settings directory and the thread faces exist on disk, but a commit
  landing after my reads could invalidate any line here. The FRONTEND_REVAMP
  ratings are two rebuilds stale for the landing page specifically.
- **Counts I made myself**: 103/24/12 glass files, 87 clay files, 8 font
  files, 464 arbitrary font sizes, 328 raw spacing utilities, 6,266 `--nf-`
  references, 26 rentme-comment files. Counts I inherited without
  re-counting: the audit's 423 `.nf-card` call sites, 59 backdrop-filters,
  10,862px landing height (all pre-rebuild and certainly stale), the 197
  UiIcon call sites (ICON_SYSTEM.md).
- **Not checked**: the live Vercel deployment's branding (network-restricted
  and out of scope); the Resend DNS reality for `vallospaces.com`; whether the
  checkout pending states specifically were rewired through ResultSheet in
  today's commits (the wallet ones were; checkout is UNCLEAR); the exact
  remaining count of Tailwind numeric-radius utilities; whether `/safety`
  still carries 29 glass reading cards after the card changes; the rendered
  truth of admin queues at 390px; and `apps/mobile` (no such directory
  exists; the Capacitor shell lives inside `apps/web`, which I verified).
- **One judgement call to flag**: I classified the `rm-` email class prefix
  as a RentMe remnant by inference from the pattern (`nf-` = NaijaFinds is
  documented; `rm-` = RentMe is not stated anywhere I found). Treat the
  expansion as probable, the internal-only impact as certain.
- No secrets were read or reproduced; no git commands were run; no file
  outside this report was created or modified.
