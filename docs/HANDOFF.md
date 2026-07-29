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
- `supabase/migrations/`: 23 applied migrations, 22 committed as files
  (below).
- `supabase/templates/` + `scripts/build-auth-emails.mjs`: 5 branded auth
  emails, rebuilt RentMe-blue (navy-black, electric blue, no violet).
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

## 6. Surfaces, as built (36 page routes plus 2 API routes, all green)

The two API routes: **`/api/assistant`** (POST, streams the assistant reply
over SSE, tool loop against `search_listings`, persists threads for signed-in
users) and **`/api/paystack/webhook`** (POST, HMAC SHA-512 signature
verified against the raw body before anything is parsed, settles
`rm-fund-*`/`rm-wd-*` wallet ledger references).

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
- `/bookings`: tabs UI. Signed in on a configured platform this reads the
  guest's real bookings under RLS (`lib/bookings/queries.ts`) with a working
  cancel action; otherwise it falls back to the three seeded trips exactly
  as before. `/saved`: 4-listing grid, still static. `/messages` +
  `/messages/[id]` + **`/messages/new`** (new route, `?listing=<id>`, finds
  or creates the guest's thread with that listing's agent and redirects
  straight in): threads, image attachments, options sheet with inspection
  confirm, all live for signed-in users on real `conversations`/`messages`
  rows; seeded threads still carry signed-out visitors so the surface never
  dead-ends. `/notifications`: signed-in users get their real inbox,
  day-grouped, with Realtime prepend on arrival and read state persisted
  through a column-scoped grant; otherwise the seeded 5-item list.
  `/wallet`: flagship UI now driving real fund/withdraw/transfer/statement
  actions once `PAYSTACK_SECRET_KEY` lands (balance card with shimmer,
  sparkline, eye toggle, action deck, day-grouped transactions, trust
  strip). `/profile`, `/settings` (9 groups + SupportChat that answers from
  a client-side FAQ store or honestly escalates to a real `support_tickets`
  row with name/email only). `/assistant`: ChatGPT-class page with sidebar
  (search, history, settings), backed by a real streaming
  `/api/assistant` route with a listing-search tool and thread persistence
  once signed in; still a localStorage-only store on the client
  (`nf_ai_threads`), so a persisted thread does not yet read back into the
  sidebar on a new device or after clearing storage - the rows exist in
  `ai_conversations`/`ai_messages`, nothing fetches them on load.
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
ACTIVE_HEALTHY). 23 migrations applied via MCP `apply_migration` (22 files
committed under `supabase/migrations/`; see the gotcha in section 9 about
the one migration recorded server-side with no matching file). 35 tables,
RLS on every one of them (verified live, 0 without), `private.*`
security-definer helpers (`has_role`, `owns_listing`, `in_conversation`,
`wallet_balance`, `notify`), `security_invoker` views. Security advisor is
clean (0 lints). Performance advisor shows only expected pre-launch noise on
empty tables (multiple permissive policies where an "own row" policy sits
alongside an admin-all policy, and unused indexes with zero rows to serve) -
not a regression, nothing actionable before real data lands.

Landed since the morning snapshot, all applied and live:

- **`wallet`** (20260728202225): `wallets`, `wallet_entries`, derived balance
  only via `private.wallet_balance`, never a stored column.
- **`messaging_trust`** (20260728222112): `message_attachments`,
  `message_flags`, `inspection_confirmations`, `private.scan_message`
  trigger flagging `\d{10}` account-number runs and payment keywords. This
  was "drafted but not applied" as of the morning snapshot; it is applied
  now, and `lib/messages/actions.ts` writes through it.
- **`rental_pricing`** (20260729112539): adds `'rental'` to
  `property_type`, the `price_period` enum (`night`/`year`) and column on
  `listings`, and a `settings jsonb` column on `profiles` (not yet read or
  written by any settings UI or action - the column exists, nothing uses it
  yet).
- **`notifications`** (20260729112606): the `notifications` table plus
  `notification_kind` enum, joined to the `supabase_realtime` publication
  (alongside `messages`, added in the same migration) so unread badges and
  the inbox update live. The fan-out is entirely trigger-driven through one
  private writer, `private.notify`:
  - `private.notify_booking_change` on `bookings` insert/update - tells the
    host of a new request, the guest their request was sent, and both sides
    on confirm/cancel.
  - `private.notify_message` on `messages` insert - tells the other
    participant and bumps `conversations.last_message_at`.
  - `private.notify_wallet_entry` on `wallet_entries` insert/update -
    originally COMPLETED-only; extended by `wallet_notify_failures`
    (20260729172800) to also speak on a failed withdrawal or a reversal, so
    money that quietly reappears in the balance is explained, not silent.
  - `private.notify_support_reply` (in `support_tickets`, below) - tells the
    ticket owner when an admin replies.
  Clients can select, mark their own rows read (column-scoped grant on
  `read_at` only) and delete; there is no client insert policy anywhere -
  rows come only from triggers and the service role.
- **`support_tickets`** (20260729112624): `support_tickets` +
  `support_ticket_messages`, `NF-SUP-nnnnn` references, signed-in users
  insert as themselves under RLS, anonymous escalations go through the
  service role (no anon insert policy by design), admins get a full-table
  policy.
- **`assistant_threads`** (20260729112634): `ai_conversations` +
  `ai_messages`, owner-private (no admin read policy - assistant chats are
  personal search intent, not moderation surface).
- **`feature_flags`** (20260729112643): one row per switchable surface
  (`bookings`, `wallet`, `messaging`, `assistant`, `support`,
  `agent_listings`, `hybrid_hotels`, `hybrid_restaurants`), world-readable,
  admin-writable, fail-open on a missing table/row/network error so flags
  can only ever turn a feature off, never break it by being absent
  (`lib/flags.ts`, 30s in-process TTL cache).
- **`storage_buckets`** (20260729112658) + **`storage_policy_hardening`**
  (20260729112722): three buckets - `listing-photos` and `avatars` (public,
  path-scoped to `<user_id>/...`) and `message-attachments` (private, path
  under `<conversation_id>/...`). The hardening migration replaced the
  original broad public-read policies on `listing-photos`/`avatars` with
  owner-scoped reads once the advisor pointed out a public bucket's objects
  serve through their public URL regardless of RLS, so a broad SELECT policy
  only added the ability to list every file in the bucket. It also revoked
  client EXECUTE on the platform's `rls_auto_enable` event-trigger function,
  closing the one pre-existing advisor warning.
- **`stale_hold_release_fn`** (20260729173300): `private.release_stale_booking_holds()`,
  cancels PENDING bookings unconfirmed for 48 hours so an abandoned request
  cannot lock inventory forever under the GiST exclusion constraint. It
  exists and can be called by the service layer today, but has **no
  schedule**: `pg_cron` is not installed on the project (confirmed live -
  `pg_extension` has no `pg_cron` row), so nothing calls this function yet.
  It is a real, tested capability with no trigger.

The two genuinely new `private.*` functions today, beyond the notification
fan-out family above: `private.attachment_path_access` (turns a storage
object path's leading `<conversation_id>` segment into an RLS decision via
`private.in_conversation`, returning false rather than throwing on a
malformed path) and `private.release_stale_booking_holds` (above).

Envs the owner will add (everything is guarded, nothing crashes without
them): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY` (not yet supplied - every
wallet funding/withdrawal action checks `isPaystackConfigured()` and answers
honestly that it switches on the moment keys land), `ANTHROPIC_API_KEY` (not
yet supplied - `/api/assistant` answers 200 with the same honest message
rather than pretending), auth provider secrets (Google, Apple). Auth email
templates in `supabase/templates/`, generated by
`scripts/build-auth-emails.mjs`, are rebuilt for RentMe (navy-black canvas,
electric blue accents, no violet) - this was the one item marked
NaijaFinds-branded in the morning snapshot and it is done.

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
| 6 | RENT market | Full page, message-first, disclaimer, per-year pricing | `rental_pricing` migration applied: `'rental'` added to `property_type`, `price_period` enum (`night`/`year`) on `listings` | The schema gap is closed; still no agent listing flow to create a rental row, so RENT market listings remain seed catalogue only until feature 15 (agent listings CRUD) exists |
| 7 | Bookings | Tabs UI reads the guest's real bookings under RLS when signed in (`lib/bookings/queries.ts`), cancel wired to a working action; seeded trips only for signed-out/unconfigured visitors | Full schema incl. GiST no-double-booking; `reserve` validates dates, snapshots price from the listing row, inserts PENDING under the guest's own RLS client, translates SQLSTATE 23P01 into a friendly conflict message; `cancel` proves ownership via RLS read then transitions via service role; `confirm` is a service-role path with agent/admin authorisation (join through `agents.user_id`, not `listings.agent_id` directly); DB triggers fan out booking notifications on insert and status change | `confirm` has no host-facing UI yet, only the callable action (feature 15/16 territory); `private.release_stale_booking_holds()` exists and correctly cancels PENDING holds over 48 hours old, but `pg_cron` is not installed on the project, so nothing calls it on a schedule - PENDING holds do not yet self-expire; no payment capture at booking time; and because `public.listings` has zero rows today, this whole loop has nothing real to book against outside a manually-inserted row |
| 8 | Wallet | Flagship UI now drives real fund/withdraw/transfer/statement actions, not just demo chrome | Full ledger schema, derived balance, idempotency; `lib/payments/paystack.ts` (init, verify, HMAC SHA-512 webhook signature check, transfer, bank list); `app/api/paystack/webhook/route.ts` settles `rm-fund-*`/`rm-wd-*` references idempotently; `wallet_notify_failures` migration extended the notification trigger to speak on a failed withdrawal or reversal, not just success | `PAYSTACK_SECRET_KEY` is not yet supplied, so every fund/withdraw action answers honestly that it switches on the moment the key lands rather than pretending; no transaction PIN; no scheduled reconciliation job for a stuck PENDING withdrawal hold if a webhook is lost |
| 9 | Messaging | Thread UI, attachments UI, inspection sheet now live for signed-in users on real `conversations`/`messages`; new `/messages/new?listing=<id>` bridges a listing straight into its thread; seeded threads still carry signed-out visitors | `messaging_trust` migration is applied (it was drafted-not-applied as of the morning snapshot): `message_attachments`, `message_flags`, `inspection_confirmations`, `private.scan_message` trigger flagging 10-digit account-number runs and payment keywords; `startConversation`/`sendMessage`/`attachImage`/`confirmInspection`/`markThreadRead` all live in `lib/messages/actions.ts`; `message-attachments` private storage bucket with conversation-scoped RLS via `private.attachment_path_access`; `messages` and `notifications` both joined to `supabase_realtime` | No admin queue reads `message_flags` yet (feature 16, admin console, still not built); no first-money-word education card beyond the existing inspection-confirm sheet |
| 10 | Notifications | Signed-in users get a real inbox, day-grouped, Realtime-prepended on arrival, read state persisted through a `read_at`-only column grant; signed-out/unconfigured still shows the static seeded 5 | `notifications` table plus `notification_kind` enum, single `private.notify` writer, trigger fan-out from bookings, messages, wallet entries (including failure/reversal states) and support replies; RLS lets owners select/mark-read/delete, no client insert path anywhere | Unread badge counts are still not shown in either the desktop rail or the mobile tab bar (neither surface reads a count today); mark-all-read exists client-side in the notifications page itself, not as a rail affordance |
| 11 | Saved | Static grid | saved table exists | Heart toggle server action; optimistic UI; saved page reads DB |
| 12 | AI Assistant | Full ChatGPT-class UI backed by a real streaming route when signed in | `/api/assistant` streams over SSE from the Claude API (`claude-sonnet-5` by default, `ASSISTANT_MODEL` overridable), a `search_listings` tool that runs the same repository search as `/search` so the model can only cite real catalogue rows, the full system-prompt policy (never suggests any charge for using the platform, pay-after-inspection, never invents listings), an in-process token-bucket rate limiter (20 requests/5 minutes per IP), and thread persistence to `ai_conversations`/`ai_messages` for signed-in users; `ANTHROPIC_API_KEY` absent answers a graceful 200 message instead of pretending | Threads persist server-side but the sidebar (`components/app/assistant/threads.ts`) only ever reads `localStorage` (`nf_ai_threads`) - a persisted thread does not read back on a new device or after clearing storage, even though the rows exist; the rate limiter is in-memory per server instance, not shared across deployments |
| 13 | Support | Chat UI answers instantly from a client-side FAQ store, or escalates | `support_tickets` + `support_ticket_messages` tables; `fileSupportTicket` writes a real `NF-SUP-nnnnn` ticket (signed-in users under their own RLS insert policy, anonymous visitors through the service role since there is no anon insert policy); an admin reply fires an in-app notification via `private.notify_support_reply` | No admin queue UI to work the ticket thread (feature 16); no email notification anywhere in the codebase - "email notify via Resend" is still entirely unbuilt, the reply notification today is in-app only |
| 14 | Agent application | Full multi-step form, persists | application table under RLS | Admin review/approve flow; approval flips role; applicant notification |
| 15 | Agent listings CRUD | NOT BUILT | listings schema ready | Create/edit forms, photo upload with quality gate (HYBRID_INVENTORY §5), draft/submit/approve states, agent dashboard real numbers |
| 16 | Admin console | NOT BUILT | audit/risk/reports tables ready | Shell + queues: message flags, risk alerts, agent approvals, listing approvals, reports, support tickets; audit log every action; feature-flag kill switches |
| 17 | Hybrid inventory | Spec + types + env keys | n/a | Provider layer per HYBRID_INVENTORY §3 (Amadeus hotels, Places restaurants), merge + ranking, partner badges |
| 18 | Payments core | none (backend only) | `lib/payments/paystack.ts` complete (init, verify, HMAC SHA-512 webhook signature check, transfer, bank list) and `app/api/paystack/webhook/route.ts` wired end to end into the wallet ledger | `PAYSTACK_SECRET_KEY` not yet supplied by the owner, so nothing has actually charged or transferred against the real Paystack API; no scheduled reconciliation job for entries a webhook never reaches |
| 19 | Emails | 5 Supabase auth templates (`supabase/templates/`), rebuilt RentMe-blue (navy-black, electric blue, no violet) by `scripts/build-auth-emails.mjs` | none for transactional mail | Auth-email rebrand is done; there is still no Resend integration anywhere in the codebase and no booking/wallet/support email sends - those events fire in-app notifications only (section 7, `private.notify*`), never an email |
| 20 | i18n | 4 locales wired | n/a | Native review of yo/ha/ig hero lines; translate strings hardcoded in newest sections (Rent page, showcases, map copy) |
| 21 | PWA/deploy | Manifest, icons | n/a | Offline shell, app shortcuts; rename middleware to proxy; Vercel envs + deploy checklist |

### Build order that closes loops fastest

- **Phase A (foundations everything else needs): COMPLETE.** Notifications
  table and fan-out, support_tickets, storage buckets with path-scoped
  policies, the messaging trust migration applied, `lib/payments/paystack.ts`,
  the typed action envelope + Zod validation throughout. All landed and
  verified live against the database (section 7).
- **Phase B (close the money and booking loops): SUBSTANTIALLY CLOSED.**
  `reserve`/`cancel`/`confirm` are real server actions under RLS with
  database-enforced no-double-booking; wallet fund/withdraw/transfer are
  real actions against a real ledger; the Paystack webhook route settles
  both funding and withdrawal idempotently. What is left is not code but
  configuration and scheduling: `PAYSTACK_SECRET_KEY` has not landed yet, so
  no real charge has happened, and the stale-hold release function has no
  `pg_cron` schedule (see section 9).
- **Phase C (close the communication loops): SUBSTANTIALLY CLOSED.**
  Messaging sends, attaches images, confirms inspection and marks threads
  read, all live under RLS with Realtime delivery; the assistant streams
  from the real Claude API with a grounded listing-search tool and persists
  threads; support escalation writes a real ticket. What is left: the
  assistant sidebar does not read persisted threads back on a new device
  (client-only `localStorage` today), and there is no admin queue yet to
  work `message_flags` or `support_tickets` - that is Phase D territory.
- **Phase D (close the supply loop): IN FLIGHT.** The `rental_pricing`
  migration closed the schema gap for the RENT market (feature 6). Agent
  listings CRUD (feature 15) and the admin console (feature 16) are still
  not built, which is why `public.listings`/`public.agents` remain at zero
  rows in the live database despite every downstream loop (bookings,
  messaging, wallet) being genuinely wired to write against real rows the
  moment they exist.
- **Phase E (widen the catalogue): IN FLIGHT.** Still blocked behind Phase D:
  the Supabase listing repository swap, hybrid providers, map clustering and
  DB-backed reviews all wait on real listing rows existing to widen into.
- Phase F (polish the shell): emails (Resend integration and
  booking/wallet/support sends), i18n completion, PWA, deploy. Not started;
  the one email item that shipped - rebranding the five Supabase auth
  templates - is recorded under feature 19, not this phase.

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
- `playwright-core` is a real `devDependency` of `apps/web` (`@naijafinds/web`
  in `apps/web/package.json`), not an ad hoc install: the four Playwright
  golden-path specs in `apps/web/tests/*.spec.mjs` (assistant, bookings,
  messages, wallet) and `scripts/verify-shots.mjs` (the lead's screenshot
  harness, `node scripts/verify-shots.mjs [--light] route...`, writes
  390x844 PNGs to `scripts/.shots/`) both import it straight from the
  workspace; no separate global install is needed.
- The wallet ledger's reference format is a real contract other code reads,
  not a cosmetic prefix: `rm-fund-<uuid>` (Paystack charge, settled by
  `charge.success`), `rm-wd-<uuid>` (withdrawal hold, settled by
  `transfer.success`/`.failed`/`.reversed`), `rm-p2p-<uuid>-out` /
  `-in` (paired ledger legs for an internal transfer, the sender leg
  reversed if the recipient leg cannot land). The webhook route
  (`app/api/paystack/webhook/route.ts`) routes purely on these prefixes, so
  never invent a new reference shape without updating it.
- `listings.agent_id` points at `public.agents.id`, not at the auth user id.
  To authorise "is this caller the listing's agent", join through
  `agents.user_id` (see `confirm` in `lib/bookings/actions.ts`:
  `.select("agent_id, agents!inner(user_id)")`, then compare
  `listing.agents.user_id === session.user.id`). Comparing
  `listings.agent_id` straight against `session.user.id` is always false and
  silently locks every agent out.
- The database currently has 23 applied migrations but only 22 files in
  `supabase/migrations/`: `20260729174306_rls_initplan_and_fk_index` is
  recorded server-side (it closed the 46 `auth_rls_initplan` performance
  warnings and added missing FK-covering indexes) with no matching committed
  file. Reconcile it - pull the applied SQL and commit the file - before
  trusting `list_migrations` and the repo to agree again.
- `public.listings`, `public.agents`, `public.bookings` and `public.wallets`
  all have **zero rows** in the live database right now (verified by direct
  count, not the advisor's estimate). Every write path (reserve, wallet
  actions, messaging) is real and tested, but there is no DB-backed
  inventory to exercise it against yet: agent listings CRUD (feature 15) is
  still not built, so nothing has created a real listing row. Everything a
  visitor sees on `/search` and `/listing/[id]` today is still the seed
  catalogue in `lib/listings/`. Do not read "the booking loop closed" as
  "there is real inventory" - they are separate facts.

## 10. Verification ritual (run before every commit)

```
cd apps/web && npx tsc --noEmit && rm -rf .next && npm run build
grep -rn "NaijaFinds" apps/web/src packages/i18n/src   # expect none in copy
grep -rn "$(printf '\xe2\x80\x94')" apps packages docs   # em dash scan, expect none
```

Then screenshot the touched surfaces at 390px dark (and light if styling
changed), commit with a descriptive message, and
`git push -u origin claude/repo-cleanup-1spitz`.
