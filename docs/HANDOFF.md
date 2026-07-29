# RentMe: Session Handoff

The complete state of the platform as of 2026-07-29, written for the next
session to pick up with zero context loss. Read this first, then
`docs/NEXT_SESSION_PROMPT.md` (the kickoff prompt with every owner rule), then
`docs/MASTER_TODO.md` (the delivery ledger), then `docs/recommendations-inbox.md`
(250 reviewed recommendations).

Owner: moderator29. Repository: `read-it-well`. Working branch:
`claude/repo-cleanup-1spitz` (never push main). Everything below is committed
and pushed through `649b4de`.

---

## 1. What RentMe is

RentMe (renamed from NaijaFinds mid-build) is a Nigeria-first discovery,
property, hospitality and booking platform: homes, hotels, shortlets, villas,
restaurants and experiences, with an AI assistant, a naira wallet, and
guest-to-agent messaging with a trust pipeline. Tagline: "Find it. Rent it.
Love it." The current build is a production-grade prototype for the owner's
team: real architecture and real behaviour on seed data, ready for envs.

## 2. Brand canon (verbatim owner rules, never violate)

- The supplied background artwork (`/brand/rentme-bg.png`) is the CANONICAL
  visual source of truth. "Keep the actual background image as the primary
  visual source of truth. Use background-image. Do not recreate the background
  with CSS gradients. The artwork itself must remain visible."
- "Do not interpret the brand as purple. Deep navy-black + dark neon blue +
  electric blue glow. Do not replace them with purple, violet, magenta, cyan,
  or generic SaaS blue." After any styling change, "verify that the overall
  palette has NOT drifted toward purple."
- Sampled palette anchors: base `#010118`, glow `#0C39EF`, mid `#000F98`,
  neon `#0010E0`, electric `#0010D0`, ink family down to `#000010`.
- Dark mode is the DEFAULT. Light mode is a designed paper-white twin
  (near-white canvas, no blue wash, neon effects night-only), matching the
  clean reference the owner supplied. System preference only on first visit,
  `nf_theme` in localStorage after, no-flash boot script in `layout.tsx`.
- Logo: `/brand/rentme-logo.png` is a true transparent cutout;
  `/brand/rentme-logo-ink.png` is the auto-generated ink recolour that CSS
  swaps in for light mode (`.nf-logo-on-dark` / `.nf-logo-on-light`).

## 3. Owner working rules (distilled, all still binding)

1. Never push to main. All work on `claude/repo-cleanup-1spitz`.
2. Commit and push green snapshots often; the stop hook demands a clean tree.
3. No em dash anywhere (code, copy, docs, commits). British spelling in docs
   and product copy.
4. Money is integer kobo (bigint), `formatMoney`/`formatKoboExact`,
   `Math.round(naira*100)` only at the input boundary. Never float money.
5. Mobile-first always; every new surface verified at 390px.
6. Glass everywhere via the Naka recipe (see section 5); all buttons and
   containers glass or brand blue; one label/headline gradient only.
7. Navigation icons are stroked SF-style `UiIcon` glyphs; 3D `Icon3D` tiles
   are for content surfaces only. Nav labels are white in dark mode and ink
   in light mode.
8. Full-page drawers, never partial. Footer on landing (and site pages) only.
9. Every app page has a PageHeader back button following real history
   (`history.state.idx > 0 ? router.back() : router.push(fallback)`).
10. No focus rectangles on pointer clicks (`:focus:not(:focus-visible)`).
11. Sign-up carries first name, surname, optional nickname, strength meter,
    confirm, hear-about-us, state, referral. X provider removed. A demo
    button sits on auth ("Explore the demo").
12. Zero "sample / preview / demo / not live" strings anywhere in UI copy.
13. The platform charges NO fees anywhere; copy must never mention fees.
14. Messaging trust flow: guests DM agents of approved listings (text and
    images); a DB trigger flags 10-digit account numbers and payment
    keywords to admin; in-chat verify-inspection sheet; "pay only after
    inspection" messaging.
15. Wallet is the demo-first flagship surface.
16. Owner adds all envs personally; everything must work cleanly once envs
    land. Never block on missing envs; env-guard all clients.
17. Screenshots to the owner sparingly, not for every step.
18. Agents (subagents) get strict non-overlapping file scopes, self-audit
    contracts (typecheck + build exit 0, banned-word and em-dash scans), and
    never run git; the lead commits.
19. When the owner supplies artwork, it is used as supplied (background
    removal or crops only when asked); the owner's newest instruction always
    supersedes older ones.
20. Commit authors: the repo history predating this session is
    `moderator29`/`guddsuddi`; current platform tooling appends its own
    trailer automatically, leave it be.

## 4. Repository layout

npm workspaces monorepo:

- `apps/web`: Next.js 16.2.12 App Router (Turbopack), React 19, TS strict
  with `noUncheckedIndexedAccess`, Tailwind v4 (`@theme inline`).
- `packages/design-tokens/src/tokens.css`: two-layer token system (raw
  palette + semantic). THE control surface: restyle the platform here.
- `packages/i18n/src/locales/{en,yo,ha,ig}.ts`: en is the typed source of
  truth; the other three are full translations (yo/ha/ig hero lines still
  translate the OLD slogan, flagged in file comments for native review).
- `supabase/migrations/`: 12 applied migrations plus one drafted (below).
- `supabase/templates/` + `scripts/build-auth-emails.mjs`: 5 branded auth
  emails, STILL NaijaFinds-branded purple, not yet rebuilt for RentMe.
- `docs/`: MASTER_TODO (ledger + section 5b architecture canon), this file,
  NEXT_SESSION_PROMPT, recommendations-inbox (250), intake/.

## 5. Design system, as built

- Ambient engine (`.nf-ambient` in `globals.css`, mounted once in layout):
  the artwork as fixed background (`center bottom / cover`; at `<=768px`
  `100% auto` so the waves show fully on phones), span 1 is the artwork
  flipped and masked to crown the top of the viewport, spans 2-3 are
  drifting blue blooms, span 4 is the pointer bloom driven by
  `LivingCanvas`, `::before` is 4 pulsing hotspots (9s), `::after` is the
  rotating conic ribbon (20s). `html` carries the solid background, `body`
  is transparent (iOS fixed-background fix). Reduced motion kills loops.
- Glass recipe (`.nf-card`): radial corner light + translucent dark glass +
  edge-lit ring (135deg bright to transparent) via padding-box/border-box
  multi-backgrounds, `backdrop-filter: blur(14px) saturate(140%)`.
  `.nf-card--live` adds the conic breathing ring; `.nf-card--interactive`
  adds hover lift, cursor-lit glass (`--mx`/`--my` from LivingCanvas), and
  Ken Burns on `img.object-cover`.
- Buttons: `.nf-btn--primary` (CTA gradient, glow, light ripple sweep on
  hover via `::after`), `.nf-btn--glass` ghost. Light mode overrides the CTA
  gradient to a brighter blue so buttons stay vivid on paper.
- Motion pack: staggered hero entrances (`.nf-rise` + `.nf-rise-2..5`),
  `nf-shine` sweep on the gradient headline, `nf-breathe` on the hero search
  button, scroll `Reveal`, `nf-float` family, daypart grading
  (`data-daypart` on html from Lagos time via `LivingCanvas`).
- Hero scene: `.nf-hero-scene` renders the villa dissolved into the canvas
  through a radial mask, no frame, on all breakpoints.
- Icons: `UiIcon` (24-grid stroked, ~30 glyphs) for ALL navigation;
  `Icon3D` (vector 3D on glass tile, per-instance `useId` for paint-server
  safety) for content. `Icon` wraps Icon3D with alias table.
- Theme machinery: `data-theme` attribute; light block in tokens.css plus
  `[data-theme="light"]` overrides at the end of globals.css. Light mode is
  paper-first: aurora hidden, blooms at 0.07, artwork layers off.

## 6. Surfaces, as built (34 routes, all green)

Landing `/`: hero (masked villa scene, staggered "Find it. Rent it. Love
it.", live search card posting GET to `/search`, city chips), feature row,
How it works, Featured carousel, VillaShowcase (canonical copy + city island
art), facts band, vision/mission, MoodRow, PopularDestinations, CoverageMap
(cleaned Nigeria artwork linking to `/search?view=map`), AgentsBand,
WhyRentMe, AssistantShowcase (robot hologram + prompt chips that seed the
assistant), NumbersBand, trust strip, 12-question FAQ, CTA, footer.
`SiteHeader` has bigger logo, white nav, Sign in and Sign up both primary
blue. `MobileMenu` is portalled to body (backdrop-filter containing-block
bug fixed), full-page, X to close.

App shell `(app)`: AppRail (13 rows, stroked icons, agent promo, identity
card), MobileTabBar, full-page drawer, scroll-to-top on navigation.

- `/home`: greeting, search capsule, category tiles, AI banner (artwork
  card, white "Ask the assistant" pill bottom-left, whole card links to
  `/assistant`), recommendations.
- `/search`: sticky search bar, trip frame (Any week / 2 guests pills, demo
  controls), city quick chips, live sort chips, results header with count,
  List/Map toggle. Map view is a real Leaflet map (Carto dark/light tiles by
  theme, price-and-city pins per covered city from live catalogue floors,
  tap navigates to that city's results). `q`, `type` (with `property`
  alias), `sort`, `view` all server-rendered and shareable.
- `/listing/[id]`: gallery, facts, price, Reserve + Message agent, amenities,
  host, sticky mobile bar.
- `/bookings`: tabs with three real seeded trips (kobo totals, Friday
  snapped). `/saved`: 4-listing grid. `/messages` + `/messages/[id]`:
  threads, image attachments, options sheet with inspection confirm.
  `/notifications`: 5 linked items. `/wallet`: flagship demo (balance card
  with shimmer, sparkline, eye toggle, action deck, day-grouped
  transactions, trust strip). `/profile`, `/settings` (9 groups +
  SupportChat that answers or honestly escalates with name/email only).
  `/assistant`: ChatGPT-class page with sidebar (search, history, settings),
  multi-thread localStorage store, `?q=` seeds the composer.
- Auth `/sign-in`, `/sign-up` (full validation, demo button), `/agents`
  application flow. Site pages: about, careers, contact, help, privacy,
  terms (NDPA-aware), each with SiteHeader/Footer.

Data: `lib/listings/` (17 listings, 7 kinds, Unsplash CDN photos,
`search(filter)`, diversity-aware `recommended()`), `lib/demo/bookings.ts`,
`lib/wallet/`, `lib/messages/`, `lib/auth/`. localStorage keys: `nf_theme`,
`nf_settings`, `nf_profile_name/email`, `nf_member_since`, `nf_ai_threads`,
`nf_support_thread`, `nf_notifications_read`, `nf_inspections`, `nf_demo`.

## 7. Backend, as built

Supabase project `uccixoonmbhrnyczyigt` (eu-west-1, Postgres 17,
ACTIVE_HEALTHY). 12 migrations applied via MCP `apply_migration` after
review: identity core, locations, agents, listings, bookings (GiST
exclusion constraint on half-open dateranges, no double booking at the
database level), payments ledger (wallet balance derived from the ledger,
never stored; unique reference idempotency; kind-to-direction check),
engagement (reviews, messaging, saved), admin/trust (audit log, risk
alerts, reports), fk covering indexes. 27 tables, RLS on every table,
`private.*` security-definer helpers (`has_role`, `owns_listing`,
`in_conversation`, `wallet_balance`), `security_invoker` views. App wiring:
env-guarded browser/server/service clients in `lib/supabase/`, session
middleware, generated types, agent application server action persisting
under RLS.

DRAFTED BUT NOT APPLIED: `supabase/migrations/20260728171000_messaging_trust.sql`
(message_attachments, message_flags with reason enum, `private.scan_message`
trigger flagging `\d{10}` account numbers and payment keywords,
inspection_confirmations). Review it, apply via MCP, then reconcile the
filename with the server-recorded version as done before.

Envs the owner will add (everything is guarded, nothing crashes without
them): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, auth provider secrets (Google, Apple), plus
whatever payment provider lands later. Auth email templates in
`supabase/templates/` must be rebuilt for RentMe before wiring.

## 8. The end-to-end truth: feature-by-feature audit

The owner's core frustration, correctly held: most features are half loops.
A screen without a write path, or a table without a screen, is NOT a
feature. The definition of done from now on:

> A feature is DONE only when the full loop closes: UI action, validated
> server action or route handler, database write under RLS, UI reflecting
> the new reality after reload, the related notification or email firing,
> and a Playwright golden-path test proving it. Anything less is HALF.

The honest matrix. FE = what the user sees today. BE = what the database
and server can do today. LOOP = the exact missing steps, in build order.

| # | Feature | FE today | BE today | Missing to close the loop |
|---|---------|----------|----------|---------------------------|
| 1 | Auth | Full forms, validation, demo button | Supabase auth wired, env-guarded, middleware refresh | Configure providers + SMTP in dashboard (owner keys); profile row trigger on signup; session-aware shell (real name/avatar in rail, sign out); route guards; demo-mode flag distinct from real session |
| 2 | Profile + Settings | Full 2035 UI | profiles table exists | Read/write profile from DB; settings as JSONB column or table; avatar upload to Storage; delete-account flow |
| 3 | Discovery (home/search) | Full UI, seed repo, live sort/filter params | listings tables + indexes | SupabaseListingRepository implementing the existing interface; price/bedroom filters; real pagination; ISR caching; keep seed as fallback when env missing |
| 4 | Live map | Real Leaflet, price pins, theme tiles | city floors computed from repo | Production tile key (MapTiler); listing-level pins with clustering; map reads same repository as list |
| 5 | Listing detail | Full page | reviews/bookings tables | Reviews read from DB; availability calendar derived from bookings; gallery from Storage once agent uploads land |
| 6 | RENT market | Full page, message-first, disclaimer, per-year pricing | rental kind in seed only | `kind` column value + `price_period` in listings schema (tiny migration); agent listing flow able to create rentals; rentals in Supabase repo |
| 7 | Bookings | Tabs UI with seeded trips | Full schema incl. GiST no-double-booking | `reserve` server action (validate dates, insert pending, friendly conflict error); cancel action; status transitions; booking notifications; payment step hook |
| 8 | Wallet | Flagship demo UI | Full ledger schema, derived balance, idempotency | Paystack init + webhook route (signature-verified) crediting ledger; withdraw via Paystack Transfers with ledger hold; P2P transfer action; statement query; transaction PIN; render REAL balance |
| 9 | Messaging | Thread UI, attachments UI, inspection sheet, seed data | conversations/messages tables; trust migration DRAFTED NOT APPLIED | Apply trust migration; send action; Supabase Realtime subscription; attachment upload bucket + RLS; flags feed admin queue; first-money-word education card |
| 10 | Notifications | Static list of 5 | NO TABLE YET | notifications table migration; fan-out triggers from bookings/messages/wallet; unread badge counts in rail; realtime updates; mark-read action |
| 11 | Saved | Static grid | saved table exists | Heart toggle server action; optimistic UI; saved page reads DB |
| 12 | AI Assistant | Full ChatGPT-class UI, threads in localStorage | nothing | `/api/assistant` streaming route on the Claude API (`claude-sonnet-5`), listing-search tool so answers cite real inventory, policy system prompt (no fees, pay after inspection), thread persistence table, rate limiting |
| 13 | Support | Chat UI with canned escalation | nothing | FAQ content store; support_tickets table migration; escalation writes ticket (name/email only); admin queue; email notify via Resend |
| 14 | Agent application | Full multi-step form, persists | application table under RLS | Admin review/approve flow; approval flips role; applicant notification |
| 15 | Agent listings CRUD | NOT BUILT | listings schema ready | Create/edit forms, photo upload with quality gate (HYBRID_INVENTORY §5), draft/submit/approve states, agent dashboard real numbers |
| 16 | Admin console | NOT BUILT | audit/risk/reports tables ready | Shell + queues: message flags, risk alerts, agent approvals, listing approvals, reports, support tickets; audit log every action; feature-flag kill switches |
| 17 | Hybrid inventory | Spec + types + env keys | n/a | Provider layer per HYBRID_INVENTORY §3 (Amadeus hotels, Places restaurants), merge + ranking, partner badges |
| 18 | Payments core | none | ledger ready | `lib/payments/paystack.ts` (init, verify, webhook, transfer), webhook route, reconciliation job |
| 19 | Emails | 5 templates, WRONG BRAND | none | Rebuild templates RentMe-blue; Resend integration; booking/wallet/support sends |
| 20 | i18n | 4 locales wired | n/a | Native review of yo/ha/ig hero lines; translate strings hardcoded in newest sections (Rent page, showcases, map copy) |
| 21 | PWA/deploy | Manifest, icons | n/a | Offline shell, app shortcuts; rename middleware to proxy; Vercel envs + deploy checklist |

### Build order that closes loops fastest

- Phase A (foundations everything else needs): notifications table,
  support_tickets, storage buckets, trust migration applied, Paystack lib,
  typed action envelope + Zod. Nothing user-visible, everything unblocking.
- Phase B (close the money and booking loops): bookings reserve/cancel,
  wallet fund/withdraw/transfer, payment webhooks, their notifications.
- Phase C (close the communication loops): messaging live send + realtime +
  attachments + flags; assistant API with listing tool; support tickets.
- Phase D (close the supply loop): agent listings CRUD with the photo
  quality gate; admin console queues; approvals feeding search.
- Phase E (widen the catalogue): Supabase repository swap, hybrid
  providers, map clustering, reviews.
- Phase F (polish the shell): emails, i18n completion, PWA, deploy.

Each phase lands as verified vertical slices: schema, action, UI, test,
screenshot, push. Never build two half-features when one whole feature is
possible.

## 9. Hard-won gotchas (do not relearn these)

- A `backdrop-filter` ancestor becomes the containing block for `fixed`
  descendants: any full-screen overlay inside the glass header must be
  portalled to body (`MobileMenu` is the reference fix).
- Playwright here: `node --input-type=module` from repo cwd, import from
  `"playwright-core"`, `executablePath: "/opt/pw-browsers/chromium"`, and
  ALWAYS pass `colorScheme: "dark"` for dark shots (default is light).
  `waitUntil: "load"` + fixed waits; `networkidle` times out.
- Server restarts: kill by port (`fuser -k 3210/tcp`), not by name.
  Concurrent builds corrupt `.next`: `rm -rf apps/web/.next` and rebuild.
- Regex/sed over CSS once swallowed an `@layer` opener (the chip-restyle
  disaster). Prefer exact-string Edit patches on CSS.
- SVG `url(#id)` paint servers resolve to the first DOM instance; defs
  inside `display:none` subtrees blank all sharers. Icon3D generates
  per-instance ids with `useId`; keep it that way.
- Background agents die silently when usage credits run out: salvage their
  partial files (fix `noUncheckedIndexedAccess` fallout), finish inline, and
  relaunch when credits return.
- The sandbox has no internet to Unsplash or tile servers: listing photos
  and map tiles show placeholders in local screenshots but load on deploy.
  Say so when sending screenshots, never "fix" it.
- Image cutouts: luminance keys eat dark interiors. Use the filled
  silhouette method (threshold, largest component, hole fill, feathered
  halo) as done for `rentme-city.png`.

## 10. Verification ritual (run before every commit)

```
cd apps/web && npx tsc --noEmit && rm -rf .next && npm run build
grep -rn "NaijaFinds" apps/web/src packages/i18n/src   # expect none in copy
grep -rn "$(printf '\xe2\x80\x94')" apps packages docs   # em dash scan, expect none
```

Then screenshot the touched surfaces at 390px dark (and light if styling
changed), commit with a descriptive message, and
`git push -u origin claude/repo-cleanup-1spitz`.
