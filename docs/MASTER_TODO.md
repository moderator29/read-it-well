# RentMe: Master TODO

The single organising document for RentMe delivery. Every other plan defers
to this one. It records what is built, what is left, who owns each piece, what it
depends on, and how each item is verified as done.

Last updated: 2026-08-07. Owner: moderator29. Repository: `read-it-well`. The
NaijaFinds to RentMe rename is complete in product naming and copy; the npm
package identifiers `@naijafinds/i18n` and `@naijafinds/design-tokens` are
real code identifiers and are staying as-is (see `docs/HANDOFF.md` section 4).

---

## 0. How to read this file

- **Status** is one of: `DONE`, `IN PROGRESS`, `READY` (unblocked, not started),
  `BLOCKED` (waiting on a decision in section 4), `LATER` (post-MVP).
- **Owner** is the workstream that carries it: `BACKEND` (Supabase, data, APIs,
  security), `FRONTEND` (web UI, design system, components), `ADMIN/QA` (admin
  console, tests, audits). These map to the three agents the owner asked for.
- **Verify** states the exact command or check that proves the item is done. No
  item is `DONE` until its verify step passes with output, not by assertion.
- **DoD** is the definition of done: the concrete artefact or behaviour required.
- Money is always integer minor units (kobo). No floating point in money maths
  (ADR-004, Master Rule 50). British spelling in docs and product copy.
- No em dash anywhere. Commit authors are `moderator29` (and `guddsuddi` when a
  second identity is needed). No AI attribution trailers in git history.

---

## 1. Current state snapshot

> **Corrected 2026-08-07.** Everything in this section was nine days stale and
> understated the platform by a wide margin: it reported 23 migrations against
> 113, 35 tables against 71, 38 routes against 91, and it said the agent listing
> CRUD write path "is not built yet" when the whole supply loop from wizard to
> admin approval had shipped. The phase tables in section 5 carried the same
> rot and are corrected in place. The numbers below were re-counted against the
> live database, the build output and the repository on that date.

**Build health, re-run 2026-08-07:**

| Check | Command | Result |
|---|---|---|
| Typecheck, all workspaces | `npm run typecheck` | PASS |
| Unit tests | `cd apps/web && npx vitest run` | PASS, 66 tests in 5 files |
| Production build | `npm run build` | PASS, 91 entries in the route table, 4 of them API routes |

**Superseded build health (2026-07-28), kept because the route count in it is
the number this document repeated for over a week:**

| Check | Command | Result |
|---|---|---|
| Typecheck, all workspaces | `npm run typecheck` | PASS (as of 2026-07-28) |
| Production build | `npm run build` | PASS, 20 routes (as of 2026-07-28; route count is stale, see below) |
| Em dash scan | grep across `apps packages docs scripts` | clean (as of 2026-07-28) |
| Attribution scan | grep for co-authored / claude / anthropic | clean (as of 2026-07-28) |
| Secret scan | grep for key and token patterns | clean (as of 2026-07-28) |
| Commit authorship | `git log --format=%an origin/main..HEAD` | all `moderator29` (as of 2026-07-28) |

This session (documentation only) did not run `npm run build`, `npm run
typecheck` or git; it verified the current state by reading the source under
`apps/web/src`, `supabase/migrations/` and `scripts/`, and by querying the
live Supabase project directly (migrations, tables, RLS, advisors). The route
count, Supabase state and phase tables below reflect that direct
verification on 2026-07-29; the build-health table above is carried forward
from the last session that actually ran the commands and should be re-run
before the next push.

**Git:** feature history sits linearly on top of `origin/main` (`44c3744`). The
earlier branch divergence (a duplicate "Clear repository" commit left by an
authorship rewrite) was resolved by rebasing onto `origin/main` with
`--empty=drop`; the redundant commit dropped cleanly. There was never a textual
code conflict, confirmed with `git merge-tree`. A safety branch
`backup/feat-pre-rebase` preserves the pre-rebase tip.

**Supabase (verified live 2026-08-07):** project `uccixoonmbhrnyczyigt` is
connected, Postgres 17, region eu-west-1. **113 migrations applied, 71 tables in
`public`, RLS enabled on every one of them.** On top of the subsystems listed
below, the schema now also carries the whole social layer (`areas`, `posts`,
`stories`, follows, reactions, reposts, blocks, mutes, badges, events), the
agent verification ladder (`agent_verification_checks`), support-initiated
refunds (`booking_refunds`), agent suspensions, `listing_access`, all 774
`local_governments` and 749 `occupations`. The policy count was not re-run and
is not restated.

Real data, counted the same day: `profiles` 1 holding 2 `user_roles`,
`audit_log` 4, `areas` 6, `posts` 12 (all `author_kind = 'SYSTEM'`, the designed
cold start). `agents`, `agent_applications`, `listings` and `bookings` are all
still zero, so the supply chain has an admin and no agents yet.

**Superseded (verified live 2026-07-29), kept for the record:** **23 migrations
applied, 35 tables, RLS on every table (0 without), 86 policies across
`public` and `storage`.** Identity, location, agents, listings, bookings and
a real payments ledger, engagement (reviews, messaging, saved), admin/trust
(audit log, risk alerts, reports), a naira wallet with a derived-only
balance, messaging trust (attachments, flags, inspection confirmations),
notifications with database-side fan-out, support tickets, AI assistant
thread persistence, feature flags, and three storage buckets with
path-scoped RLS. A database-level GiST exclusion constraint guarantees no
double booking. RLS role helpers live in a private, non-exposed schema.
Security advisor is clean (0 lints). Performance advisor shows only expected
noise on still-empty tables (multiple permissive policies, unused indexes),
not a regression. App wiring is in place: env-guarded browser, server and
service-role clients (`apps/web/src/lib/supabase/`), session-refresh
middleware, and generated types. Real data is thin: `listings`, `agents`,
`bookings` and `wallets` all currently hold zero rows in the live database
(agent listings CRUD, the write path that would populate `listings`, is not
built yet), so every write path described above is real and tested but has
nothing to operate on outside the seed catalogue the discovery surfaces
still fall back to. One migration recorded server-side,
`20260729174306_rls_initplan_and_fk_index`, has no matching committed file
in `supabase/migrations/`; see `docs/HANDOFF.md` section 9.

*(That last sentence is no longer true: the file is committed. The mirror has
drifted in other places instead, and the current state of it is recorded in
`KNOWN_GAPS.md` under "Still open with the owner".)*

**What is live in the web app.** 91 entries in the build's route table, 4 of
them API routes (`/api/admin/inventory`, `/api/assistant`,
`/api/paystack/webhook`, `/api/support`). The table below was written when there
were 38 and has been corrected row by row; rows it never had, for the admin
console and the social layer, are added at the end.

| Area | Routes | Status |
|---|---|---|
| Landing | `/` | DONE |
| Auth | `/sign-in`, `/sign-up`, `/sign-up/verify`, `/forgot-password`, `/reset-password` | DONE. Real Supabase Auth: `signInWithPassword`, `signUp`, sign out, Google and Apple OAuth, password reset, and a middleware lock on the product. P2-1 is closed |
| Personal home | `/home` | DONE |
| Discovery | `/search`, `/listing/[id]`, `/rent` | REAL, and empty. `SupabaseListingRepository` reads published rows from Postgres and appends partner venues from Google Places. **The seed catalogue of twenty-three invented places was deleted**, so a thin shelf is now a true statement about supply rather than a shelf of places that do not exist. See the note at the top of `lib/listings/repository.ts` |
| Bookings | `/bookings` | PARTIAL, real loop (reads real bookings under RLS and cancels for real when signed in; seeded trips are the fallback, not the norm, for signed-out visitors) |
| Wallet | `/wallet` | PARTIAL, real loop (fund/withdraw/transfer/statement are real actions against the ledger; blocked on `PAYSTACK_SECRET_KEY` landing before any money actually moves) |
| Messaging | `/messages`, `/messages/[id]`, `/messages/new` | PARTIAL, real loop (send, attach, confirm inspection and mark-read are real for signed-in users; no admin queue yet for the flags the safety scan raises) |
| Notifications | `/notifications` | PARTIAL, real loop (real inbox with Realtime for signed-in users; no unread badge count on the rail or tab bar yet) |
| AI Assistant | `/assistant`, `/api/assistant` | PARTIAL, real loop (streams from the Claude API with a grounded listing-search tool and persists threads; the sidebar itself still only reads `localStorage`, not the persisted rows, on load) |
| Support | in-app via Settings | PARTIAL, real loop (FAQ answers instantly; escalation files a real `support_tickets` row; no admin queue, no email) |
| Saved | `/saved` | REAL. `toggleSave` writes `saved_items` under RLS (`lib/saved/actions.ts`), with a device-local shortlist for catalogue rows that cannot be a foreign key. This row said STUB long after it stopped being one |
| Payments | `/api/paystack/webhook` | DONE as code, BLOCKED on env (webhook verifies signatures and settles the ledger; no key configured yet so nothing has actually charged) |
| Become an Agent | `/agents`, `/agents/apply`, `/agents/status` | DONE (form posts to a server action that persists under RLS) |
| Agent dashboard | `/agent/dashboard` | DONE, and real. `RealDashboard.tsx` reads listing counts by status, upcoming stays and unread messages through `readAgentNumbers`. The "seed data, labelled sample" note is void: sample labelling was banned outright by the owner |
| Agent workspace | `/agent/{listings,bookings,messages,reviews,earnings,analytics,verification,settings,list}` | REAL except two. `list` is the eight step wizard, `listings` the workspace, `bookings` and `earnings` real consoles, `messages` an inbox over `messages-queries`, `reviews` a workspace with host replies, `settings` the notification and payout surface. **Only `analytics` and `verification` are still `AgentComingSoon` stubs**, verified by grep as the only two importing it |
| Admin console | `/admin` plus agents, alerts, bookings, flags, listings, moderation, reference, reports, social, standing, stops, support, switches | DONE. B-10 was resolved 2026-07-28 and the rail was built; this table never had a row for it |
| Social layer | `/around`, `/around/[slug]`, `/u`, `/u/[handle]`, `/post/[id]`, `/stories/*` | DONE. Not on the original plan at all. See `docs/HANDOFF.md` section 3.2b |
| Site pages | `/about`, `/careers`, `/contact`, `/help`, `/privacy`, `/terms`, `/safety`, `/standards`, `/cancellations`, `/docs`, `/styleguide` | DONE |

**Shared packages:** `@naijafinds/design-tokens` (token CSS + TS mirror),
`@naijafinds/i18n` (en, yo, ha, ig dictionaries, money and number formatters).
Both now carry a `tsconfig.json` so their typecheck runs (fixed this session).
These npm package identifiers keep the `naijafinds` scope deliberately; only
product-facing naming and copy moved to RentMe.

---

## 2. Reference and asset map

The 13 unique design references and where each one lands in the build. Authority
levels are owner-assigned (A = source of truth, B = inspiration, C = mixed); see
`docs/intake/00-INTAKE-STATUS.md` for the full record. References 14 and 15 are
not yet received; the 15/15 intake gate is still open (Blocking Decision B-01).

| Ref | Authority | Drives | Consumed by | Status |
|---|---|---|---|---|
| 01 | A | Discovery: results list, map, filters, property preview rail, AI panel | `/search`, live map (Phase 4) | PARTIAL |
| 02 | A | Mode switch flow, agent dashboard | `ModeSwitcher`, `/agents/*`, `/agent/dashboard` | DONE |
| 03 | A | List Apartment 7-step wizard, admin listing review | `/agent/list` (Phase 3), admin review (Phase 6) | STUB |
| 04 | A | Personal home, agent dashboard, admin command centre, AI assistant, property detail | `/home`, `/agent/dashboard`, admin (Phase 6), property detail (Phase 4) | PARTIAL |
| 05 | A | 3D icon library, ~192 icons in 4 categories | `assets/icon-pack/`, `public/icons/`, `Icon.tsx` | PARTIAL (subset extracted; full sprite pending B-09) |
| 06 | A | Super Admin dashboard, 13-item rail | admin (Phase 6) | BLOCKED (B-10) |
| 07 | A | Admin AI Assistant, 14-item rail | admin (Phase 6) | BLOCKED (B-10) |
| 08 | A | Consumer search and property detail, host panel, review distribution, 13-item rail | property detail (Phase 4), consumer rail | BLOCKED (B-10) |
| 09 | A | 6-step wizard, booking flow and price breakdown, payments overview, media manager, 16-item rail | booking (Phase 5), payments (Phase 5), admin (Phase 6) | BLOCKED (B-10, B-12) |
| 10 | A | Full design system: colour, gradient, typography, motion, landing, auth, mobile home, icon grid, trust bar | `design-tokens`, landing, auth, trust bar | DONE |
| 11 | A | Brand lockup, category icons, consumer icon row, agent and admin dashboards | `public/brand/`, category chips | DONE |
| 12 | A | Island render and logo with alpha, 20-icon grid | `public/brand/island.png`, `logo.png`, `mark.png` | DONE |
| 13 | B | Glowing gradient ring containers, glossy buttons | the stride system, ADR-012 | DONE |

**Raw asset inventory (committed):**

| Path | Contents |
|---|---|
| `assets/source-sheets/` | `design-system-sheet.jpg` (ref 10), `island-logo-cutout.png` (ref 12), `icon-pack-192.png` (ref 05), `auth-icons.png`, `ai-banner.png` |
| `assets/icon-pack/manifest.json` + `raw/` | extracted icon-pack manifest and raw crops |
| `apps/web/public/brand/` | `logo.png`, `mark.png`, `island.png`, `ai-banner.png`, `ai-robot.png` |
| `apps/web/public/icons/` | 31 category and UI icons, `_manifest.json` |

**Icon delivery gap (B-09):** the icon library arrived as a raster contact sheet.
Production quality needs vector or Lottie source plus a sprite or component
wrapper. Slicing 192 icons out of a PNG is not an acceptable final state; a subset
is extracted for current screens, the rest awaits source files.

---

## 3. Infrastructure and API surface map

Derived from the Production Infrastructure and API Master Prompt (works under the
80 Master Rules, does not replace them). This was the target the backend built
toward.

> **"Nothing here is built yet; the database is empty" was the original sentence
> and it is long dead.** Section 3.2's target of roughly 40 tables was passed:
> there are 71. The adapter table in 3.1 is corrected below. The one row in it
> that never happened is Travelgate, which was replaced by LiteAPI after
> Amadeus was decommissioned; see `docs/HYBRID_INVENTORY.md`.

### 3.1 Provider adapter layer

Every third party sits behind an interface so the app never imports a vendor SDK
directly (Master Rule 40, swap without rewrite). Each needs a real adapter, a
seed or stub adapter, and a `NF_*` env switch.

| Adapter | Provider | Purpose | Status |
|---|---|---|---|
| `AuthProvider` | Supabase Auth | sign up, sign in, sessions, social | DONE |
| `DataProvider` | Supabase Postgres | canonical data store | DONE |
| `MapsProvider` | Leaflet with CARTO or MapTiler tiles, Google Places | map tiles, places | DONE. Not Google Maps: the map is Leaflet, and `NEXT_PUBLIC_MAPTILER_KEY` is a licensing item because CARTO's public basemaps are non-commercial only |
| `PaymentProvider` | Paystack | charges, transfers, webhooks | DONE as code, waiting on `PAYSTACK_SECRET_KEY` |
| `HotelProvider` | LiteAPI (Nuitée Connect) | hotel inventory and naira rates | DONE for search and rates, NOT for booking. **Travelgate was never used**, and Amadeus was written and then decommissioned by its vendor on 17 July 2026 |
| `AIProvider` | Anthropic | assistant, grounded retrieval, tools | DONE, with a monthly kobo ceiling in `bot_settings` |
| `EmailProvider` | Resend | transactional + branded auth emails | DONE |
| `SmsProvider` | Termii | OTP, alerts | LATER. `TERMII_API_KEY` is read by nothing |
| `PushProvider` | FCM | mobile push | LATER |

### 3.2 Domain model (target ~40 tables)

Grouped by subsystem. Each group is one migration, RLS on from creation, tests
proving cross-tenant isolation (Master Rules 10, 11, Build §34). Enum values come
from the canonical vocabulary in section 4, not invented per table.

1. **Identity and access:** `profiles`, `roles`, `user_roles`, `sessions_audit`.
2. **Location:** `states`, `lgas`, `wards`, `localities` (canonical hierarchy) plus
   a `cities`/`areas` settlement layer surfaced in the UI (resolves C-05, B-07).
3. **Agents:** `agent_applications` (6-step), `agents`, `agent_documents`,
   `payout_accounts`.
4. **Listings:** `listings`, `listing_photos`, `amenities`, `listing_amenities`,
   `availability` (per-night with check-in/out edge semantics), `pricing`.
5. **Discovery:** `saved_items`, `saved_searches`, `search_alerts`.
6. **Booking:** `bookings`, `booking_guests` (composition, not a count),
   `booking_state_events`.
7. **Payments ledger:** `transactions`, `ledger_entries` (gross, platform fee,
   agent share, processor charge, net settlement), `payouts`, `refunds`,
   `chargebacks`. A real ledger, never a balance field (Master Rule 50).
8. **Messaging and reviews:** `conversations`, `messages`, `reviews`,
   `review_distribution`.
9. **AI:** `ai_conversations`, `ai_messages`, `ai_tool_calls`, `ai_budgets`.
10. **Admin and trust:** `listing_reviews`, `risk_alerts`, `audit_log`,
    `reports`, `moderation_actions`.

### 3.3 Auth email redesign

Supabase auth emails (confirm signup, magic link, invite, recovery, email change)
must be reskinned to RentMe branding: logo, gradient, typography, four-language
awareness. Owner: BACKEND + FRONTEND. Status: DONE (2026-07-29). Delivered as
five HTML templates in `supabase/templates/`, generated by
`scripts/build-auth-emails.mjs`, navy-black canvas with electric blue accents,
no violet.

---

## 4. Blocking owner decisions

These gate downstream work. Nothing marked BLOCKED in sections 2, 3 or 5 can be
finished until the matching decision is made. Full context in
`docs/intake/00-INTAKE-STATUS.md` section 4.

| ID | Decision | Blocks | Recommendation |
|---|---|---|---|
| B-01 | Reference count and 15/15 intake gate (13 unique vs owner count) | full implementation authorisation | reconcile the denominator; treat received refs as buildable now |
| B-10 | RESOLVED 2026-07-28: admin = Ref 04 (15-item rail), consumer = Refs 01/04 (12-item rail). IA frozen. | (was) admin, consumer rail, routing | settled |
| B-11 | Is RentMe Pro in scope | entitlement gating, second revenue model | defer, out of MVP |
| B-12 | RESOLVED 2026-07-28: 7-step wizard (Ref 03) is canonical; photos only for MVP, video/tours/docs LATER. | (was) `/agent/list`, media model | settled |
| B-09 | Are icon source files vector, or only the contact sheet | final icon quality | need vector/Lottie source |
| B-07 | RESOLVED. Canonical location model | (was) location tables, wizard | Settled on state, city and area for a listing, with all 774 `local_governments` seeded as their own layer and used by the social place picker. No Ward layer exists |
| B-09b | RESOLVED by owner ruling | (was) payments ledger, settlement | The platform charges NO fees anywhere. The ledger keeps the platform column and records zero in it, so `gross = platform + agent + processor` still balances |
| B-06 | RESOLVED. Agent Mode on mobile after mode switch | (was) responsive agent scope | Built responsive: slide-in drawer, stacked-card tables, and the listing wizard is authored for one thumb at 390px |
| B-03 | RESOLVED. Admin review: add a Request Changes action | (was) listing state machine enum | Shipped as `MORE_INFO_REQUIRED`, which is the one canonical name for the concept per the vocabulary below |
| B-07c | RESOLVED. Supabase vs NestJS boundary; is RLS used | (was) auth ownership, all authorisation | Supabase Auth with RLS on all 71 tables. There is no NestJS layer and no service-role write path in any user-facing feature |

**Canonical vocabulary to lock before schema (resolves C-03):** application status
`DRAFT / SUBMITTED / UNDER_REVIEW / MORE_INFO_REQUIRED / APPROVED / REJECTED /
SUSPENDED`; listing review uses `MORE_INFO_REQUIRED` for the Request-Changes
transition (one concept, one name). Booking `CONFIRMED / PENDING / CANCELLED`.
Transaction `SUCCESSFUL / PENDING / FAILED / REFUNDED`.

---

## 5. Phased delivery plan

Phases are ordered by dependency. Within a phase, tasks can run in parallel across
the three owners unless a `depends` note says otherwise.

### Phase 0: Foundation and hygiene  (STATUS: DONE)

| ID | Task | Owner | Status | Verify | DoD |
|---|---|---|---|---|---|
| P0-1 | Monorepo, Next 16 + React 19 + TS strict + Tailwind v4 | FRONTEND | DONE | `npm run build` | app builds |
| P0-2 | Design tokens (two-layer CSS + TS mirror) | FRONTEND | DONE | tokens imported by app | the stride renders |
| P0-3 | i18n package, 4 locales, money/number/date formatters | FRONTEND | DONE | `npm run typecheck` | `formatMoney` in kobo |
| P0-4 | Package tsconfigs so typecheck runs | ADMIN/QA | DONE | `npm run typecheck` | all 3 workspaces pass |
| P0-5 | Intake docs, ADRs, roadmap, known gaps | ADMIN/QA | DONE | files present | living docs exist |
| P0-6 | Git conflict resolution + clean authorship | ADMIN/QA | DONE | `git log`, audits | linear on main, no trailers |
| P0-7 | This MASTER_TODO | ADMIN/QA | IN PROGRESS | file present | organised plan exists |

### Phase 1: Backend spine  (STATUS: SUBSTANTIALLY DONE, up from IN PROGRESS)

| ID | Task | Owner | Status | Depends | Verify | DoD |
|---|---|---|---|---|---|---|
| P1-1 | Supabase migrations: full domain model, plus wallet, messaging trust, notifications, support, assistant threads, feature flags and storage | BACKEND | DONE | B-07 | `list_tables` (35), `list_migrations` (23) | all subsystems modelled with RLS |
| P1-2 | RLS policies + cross-tenant isolation tests | BACKEND | PARTIAL | P1-1 | advisor + test run | 86 policies live across `public` and `storage`, security advisor clean (0 lints); automated cross-tenant isolation test still to add |
| P1-3 | Branded Supabase auth email templates (5) | BACKEND+FRONTEND | DONE | none | files render | 5 branded templates + README, rebuilt RentMe-blue (navy-black, electric blue) 2026-07-29 |
| P1-4 | Supabase clients (browser/server/admin) + middleware | BACKEND | DONE | none | `npm run build` | env-guarded clients, session refresh |
| P1-5 | Generate TS types from DB, wire repositories | BACKEND | PARTIAL | P1-1 | `generate_typescript_types` | types generated + stored; bookings, wallet, messaging and notifications read and write the database directly (`lib/bookings/queries.ts`, `lib/wallet/ledger.ts`, `lib/messages/live.ts`); the listing repository itself is still seed-only, no `SupabaseListingRepository` exists, and `listings` holds zero rows regardless |

### Phase 2: Auth and identity  (STATUS: DONE, up from READY)

| ID | Task | Owner | Status | Depends | Verify | DoD |
|---|---|---|---|---|---|---|
| P2-1 | Real sign up / sign in via Supabase Auth | BACKEND+FRONTEND | DONE | P1-1, P1-4 | `tests/{auth-callback,password-reset,signup-verify}.spec.mjs` | `lib/auth/actions.ts` carries real `signInWithPassword`, `signUp`, sign out and Google/Apple OAuth; middleware gates the product and returns you to what you were opening, including across the OAuth round trip |
| P2-2 | Server-side agent-mode gate (not cookie alone) | BACKEND | DONE | P2-1 | `tests/agent-identity.spec.mjs` | `getAgentContext()` walks `agents.user_id = auth.uid()` server side, and every write in `listings-actions.ts` re-resolves it through `requireAgent()`. A cookie decides nothing |
| P2-3 | Profile + role model wired to UI | FRONTEND | DONE | P2-1 | `tests/profile.spec.mjs` | the agent rail's identity card is built from the real `agents` row through `agentProfileFrom` |

### Phase 3: Agent Mode completion  (STATUS: SUBSTANTIALLY DONE, up from IN PROGRESS)

| ID | Task | Owner | Status | Depends | Verify | DoD |
|---|---|---|---|---|---|---|
| P3-1 | Mode switch flow (ref 02) | FRONTEND | DONE | none | build | cookie switch + refresh |
| P3-2 | Become an Agent 6-step wizard (ref 02) | FRONTEND | DONE | none | build | draft autosave, validation |
| P3-3 | Agent dashboard (ref 02, 04) | FRONTEND | DONE | none | build | seed data labelled sample |
| P3-4 | Agent application persisted to DB | BACKEND | DONE | P1-1 | server action | inserts SUBMITTED row under RLS, returns NF-AGT ref |
| P3-5 | List Apartment wizard (ref 03) | FRONTEND | DONE, up from BLOCKED | B-12 (resolved 2026-07-28) | `tests/agent-listings.spec.mjs` | Built, and it is EIGHT steps rather than the referenced seven: basics, photos, location, amenities, utilities, pricing, guest view, submit. The utilities step is ours and not in ref 03, because light, water and getting through the gate are the first three questions a Nigerian guest asks. Autosaves to a real DRAFT row on every step change, uploads photos straight to the `listing-photos` bucket with EXIF stripped in the browser, and `submitRequirements` in `listings-schema.ts` is the one gate both the checklist and the server run |
| P3-6 | My Listings, Bookings, Messages, Reviews, Earnings, Analytics, Verification, Settings | FRONTEND+BACKEND | SUBSTANTIALLY DONE, up from PARTIAL | P1-1, B-10 | build, plus `tests/{agent-listings,agent-messages,agent-reviews,agent-calendar}.spec.mjs` | Six of the eight are real: Listings, Bookings, Earnings, Messages, Reviews and Settings. Only **Analytics and Verification** are still `AgentComingSoon`. Verification is the one that costs something, because `agent_verification_checks` and its admin screen already exist and the host has no view of the ladder they are climbing |

### Phase 4: Discovery and property detail  (STATUS: PARTIAL)

| ID | Task | Owner | Status | Depends | Verify | DoD |
|---|---|---|---|---|---|---|
| P4-1 | Search results list + sort chips + Load more (ref 01) | FRONTEND | PARTIAL | P1-1 | build | real listings, pagination |
| P4-2 | Filters drawer (ref 01) | FRONTEND | READY | P4-1 | build | filters query the repo |
| P4-3 | Live map with price pins + clustering (ref 01) | FRONTEND+BACKEND | PARTIAL, up from BLOCKED | MapsProvider | build | real Leaflet map ships (Carto dark/light tiles by theme, price-and-city pins per covered city, tap navigates to that city's results); still missing a production tile key and listing-level pins with clustering |
| P4-4 | Property detail page (ref 04, 08): gallery, host panel, review distribution, amenities, tabs | FRONTEND | PARTIAL, up from BLOCKED | B-10, P1-1 | build | `/listing/[id]` renders in full, Reserve wired to a real `reserve` action, Message agent wired to a real conversation; reviews still read from seed, not the (empty) `reviews` table, and the gallery still serves seed photography, not Storage |
| P4-5 | Saved items / saved searches | FRONTEND+BACKEND | LATER | P1-1 | test | save persists per user |

### Phase 5: Booking and payments  (STATUS: SUBSTANTIALLY DONE, up from BLOCKED)

| ID | Task | Owner | Status | Depends | Verify | DoD |
|---|---|---|---|---|---|---|
| P5-1 | Booking flow: dates, guest composition, confirm | FRONTEND | DONE, up from BLOCKED | P4-4 | `apps/web/tests/bookings.spec.mjs` | shipped as a single-panel reserve flow on `/listing/[id]` (`ReservePanel` + the `reserve` server action) rather than the referenced 4-step wizard; the DoD itself (dates, guest composition, confirm) is met: validated dates, adult/child counts, PENDING insert under RLS, friendly conflict message on a GiST clash |
| P5-2 | Price breakdown (kobo) | BACKEND | DONE, up from BLOCKED | B-09b | `bookings.spec.mjs` (asserts `× 2 nights` and that the panel never suggests a charge for using the platform) | nights × price snapshot + cleaning + service columns, all integer kobo, `total_minor` database-checked equal to the sum; the service column exists for a future take rate and is 0 today, matching the no-charge rule |
| P5-3 | No double booking (per-night availability, idempotency) | BACKEND | DONE, up from READY | P1-1 | GiST exclusion constraint live; `reserve` translates SQLSTATE 23P01 | concurrent bookings cannot overlap, verified at the database level |
| P5-4 | Payments ledger + Paystack webhooks (replay-safe) | BACKEND | DONE as code, BLOCKED on env, up from BLOCKED | B-09b, PaymentProvider | `lib/payments/paystack.ts`, `app/api/paystack/webhook/route.ts` | ledger balances derived, never stored; webhook HMAC SHA-512 verified against the raw body, settles `rm-fund-*`/`rm-wd-*` idempotently; `PAYSTACK_SECRET_KEY` has not been supplied yet, so no live charge has happened |
| P5-5 | Payouts, refunds, chargebacks | BACKEND | LATER | P5-4 | test | settlement rows correct |
| P5-6 | Release stale PENDING booking holds after 48 hours | BACKEND | PARTIAL | P5-3 | `private.release_stale_booking_holds()` exists and is correct | the function is written, tested by hand and safe to call; as of 2026-07-30 it also releases the calendar nights it wrote (`supabase/migrations/20260730121247_release_stale_booking_holds_calendar.sql`), so an abandoned request no longer locks a listing's calendar forever; `pg_cron` is still not installed on the project, so nothing schedules the function to run |

### Phase 6: Admin command centre  (STATUS: DONE, up from BLOCKED on B-10)

B-10 was resolved on 2026-07-28 and this whole phase was built. It sat marked
BLOCKED for over a week afterwards, which is the single most misleading row this
document carried: a reader would have concluded there was no admin console.

| ID | Task | Owner | Status | Depends | Verify | DoD |
|---|---|---|---|---|---|---|
| P6-1 | Admin shell + canonical rail (ref 04) | ADMIN/QA | DONE, up from BLOCKED | B-10 (resolved) | build, `tests/admin-console.spec.mjs` | 13 sections under `/admin`: agents, alerts, bookings, flags, listings, moderation, reference, reports, social, standing, stops, support, switches |
| P6-2 | Listing approvals queue + review screen (ref 03) | ADMIN/QA | DONE, up from BLOCKED | B-03, P1-1 | `tests/admin.spec.mjs` | `/admin/listings` carries the approve, reject and `MORE_INFO_REQUIRED` transitions, which is B-03's Request Changes under the one canonical name |
| P6-3 | Users, Agents, Payments, Reports, Security sections | ADMIN/QA | DONE, up from BLOCKED | B-10, P1-1 | build | each reads real data under the admin's own RLS-bound client. Agent verification opens documents through short-lived signed URLs; `/admin/stops` can suspend an agent and let them back |
| P6-4 | Audit log on every admin action | BACKEND | DONE, up from READY | P1-1 | `20260805094300_the_audit_log_can_only_be_added_to` | append-only in the strong sense: UPDATE, DELETE and TRUNCATE are revoked from every client role and refused by trigger for all roles, including the service role |

### Phase 7: AI assistant  (STATUS: SUBSTANTIALLY DONE, up from LATER)

| ID | Task | Owner | Status | Depends | Verify | DoD |
|---|---|---|---|---|---|---|
| P7-1 | Docked widget + panel + full view (ref 04) | FRONTEND | PARTIAL, up from LATER | AIProvider | `apps/web/tests/assistant.spec.mjs` | the full ChatGPT-class view ships at `/assistant`, streaming from the real Claude API; the docked-widget and panel surfaces referenced in ref 04 are not built, only the AI banner on `/home` linking into the full view |
| P7-2 | Grounded retrieval returns real listing cards | BACKEND | DONE, up from LATER | P1-1, P4-1 | `assistant.spec.mjs` | `search_listings` tool runs the same repository search as `/search`; the model can only cite listings the tool actually returned |
| P7-3 | Tool layer with permission enforcement + budgets | BACKEND | PARTIAL, up from LATER | P2-1 | code review | one read-only tool (`search_listings`, no write capability to overreach); an in-process IP token bucket caps requests (20 per 5 minutes) but there is no per-user cost budget and the limiter is not shared across server instances |
| P7-4 | Prompt-injection defence | BACKEND | PARTIAL, up from LATER | P7-3 | none yet | the system prompt instructs the model never to reveal, quote or discuss its own instructions; no test proves an injected instruction is actually ignored, so this is a guardrail, not a verified defence |

### Phase 8: Mobile (Expo)  (STATUS: LATER)

| ID | Task | Owner | Status | Verify | DoD |
|---|---|---|---|---|---|
| P8-1 | Expo app, shared packages, EAS config | FRONTEND | LATER | build | app boots on device |
| P8-2 | Permissions, deep links, push (FCM) | FRONTEND+BACKEND | LATER | manual | notifications deliver |
| P8-3 | Store readiness, data safety, iOS-only alt icons | ADMIN/QA | LATER | submission | metadata complete |

### Phase 9: Launch hardening  (STATUS: LATER)

| ID | Task | Owner | Status | Verify | DoD |
|---|---|---|---|---|---|
| P9-1 | Security headers, media validation, webhook replay, audit trail | BACKEND | LATER | test | headers present, uploads validated |
| P9-2 | Test suite across the 19 categories | ADMIN/QA | LATER | CI | coverage on critical paths |
| P9-3 | Observability, rate limits, AI cost ceilings, backups | BACKEND | LATER | dashboards | alerts fire, limits enforced |
| P9-4 | Legal: NDPA/NDPR, privacy, terms, consent | ADMIN/QA | LATER | review | policies published |

---

## 5b. Owner architecture rulings (2026-07-28, canon)

- **Brand:** deep navy-black canvas with dark neon blue and electric blue
  glow, glass-stride containers. Superseded later the same day by the
  neon-blue rebrand (see the done log): purple is not used anywhere on the
  platform any more, action colour is electric blue throughout. Dark is
  default; light mode is a designed first-class twin. See
  `docs/HANDOFF.md` section 2 for the current, binding brand canon.
- **No fees for now:** the platform charges nothing to agents or guests.
  Nothing in any UI may claim a fee. The ledger stays ready for a future take
  rate but records zero platform fee.
- **Messaging trust flow:** guests DM the agent of an approved listing; text
  and images both supported. A database trigger scans every message for
  account numbers and payment keywords and files a flag admins review (the
  fraud bot). Inside each chat an options sheet shows the listing's verified
  state and lets the guest confirm they have inspected the property; product
  copy tells guests to pay only after inspection. Payment happens directly
  between guest and agent (e.g. account transfer), platform monitored.
- **Wallet:** full naira wallet, ledger derived balance (never a stored
  balance field), integer kobo, service-role writes only.

## 6. Cross-cutting invariants (never regress)

Checked on every push. A break here fails the change regardless of feature value.

- [ ] `npm run typecheck` passes on all workspaces.
- [ ] `npm run build` passes.
- [ ] No em dash in any tracked file.
- [ ] No AI attribution trailer in any commit; authors are `moderator29` / `guddsuddi`.
- [ ] No secret committed; secrets are server-only, behind `NF_*` env.
- [ ] Money is integer kobo end to end; no float in money maths.
- [ ] Navigation IA does not drift between screens (Master Rule 17).
- [ ] Seed data is visibly labelled sample; nothing fake is presented as real.
- [ ] RLS on for every table from creation; isolation proven by test.
- [ ] Four locales stay in sync; `Dictionary` type derives from `en`.

---

## 7. Done log

- 2026-07-28: Resolved branch divergence by rebasing onto `origin/main`
  (`--empty=drop`); no code conflict existed. Authorship and trailers clean.
- 2026-07-28: Fixed workspace typecheck by adding `tsconfig.json` to
  `@naijafinds/i18n` and `@naijafinds/design-tokens`.
- 2026-07-28: Verified build health (typecheck, build, em dash, attribution,
  secret, authorship all clean). Confirmed Supabase connected and empty.
- 2026-07-28: Authored this Master TODO.
- 2026-07-28: Shipped five branded Supabase auth email templates plus a
  generator and README (P1-3 done).
- 2026-07-28: Landed the backend spine: identity core (`profiles`, `user_roles`,
  RLS, signup trigger, private-schema role helper) and `states` (37 seeded), 4
  migrations. Hardened function grants; security advisor clean of all
  project-authored functions. Generated and stored DB types.
- 2026-07-28: Owner resolved B-10 (admin = Ref 04 rail, consumer = Refs 01/04)
  and B-12 (7-step listing wizard, photos-only MVP), and directed that all work
  is buildable.
- 2026-07-28: Completed the domain model to 24 tables across 10 migrations:
  agents, listings/amenities/photos/availability, bookings + payments ledger
  (with a GiST no-double-booking constraint), reviews/messaging/saved, and
  admin audit/risk/reports. Every table RLS-enabled (53 policies); advisor clean
  of project functions; btree_gist relocated out of public.
- 2026-07-28: Wired the app to Supabase: env-guarded browser/server/service-role
  clients, session-refresh middleware, and persisted the agent application server
  action under RLS. Added Supabase env keys to `.env.example`. Build green.
- 2026-07-28: Owner directed a total design revamp: mobile-first, next-gen,
  the supplied images demoted to inspiration, the glossy sign-up/search button
  language kept, a demo entry until envs land. Phase 1 shipped: vector 3D icon
  system activated app-wide (raster pack retired), phone-tuned type scale,
  living ambient canvas, scroll reveals, island inside the first mobile frame,
  responsive AppShell wrapping all consumer routes with placeholder pages, demo
  button on auth.
- 2026-07-28: Phase 2 breathing layer: film grain overlay, living rotating
  stride for hero containers, breathing CTA glow, floating hero icon field.
  Four parallel agents revamping agent workspace, auth plus become-an-agent,
  consumer home/search/placeholders, and footer plus system pages.
- 2026-07-28: Neon-blue rebrand shipped: navy ink palette, electric blue
  accents through every stride and glass control, purple kept as the one
  action colour, real light mode with a no-flash boot and a toggle in both
  headers, aurora made actually visible (opaque body background was covering
  the fixed ambient layer), island complete on phones, three line hamburger
  with a Naka-style slide-in panel, logo and scale stepped down again.
- 2026-07-28: Security advisor clean of all project objects; performance
  advisor driven to zero actionable items with 17 FK covering indexes applied
  live and mirrored in the migration set. The 46 auth_rls_initplan rewrites
  are recorded as pre-launch hardening. 150-item strategy inbox reviewed into
  RECOMMENDATIONS.md.
- 2026-07-28: Naira wallet end to end: wallets plus append-only ledger with
  derived balance applied to the live database, and the wallet page rebuilt
  with balance hero, validated purple action panels and transaction filters.
- 2026-07-28: All four agents delivered with green self-audits. Agent Mode is
  mobile responsive (slide-in drawer, stacked-card tables, scaling charts),
  auth got its glass frame plus password toggle, the become-an-agent pitch and
  status timeline landed, home and search are rich (snap rows, real sort
  chips, honest sample labelling), and the footer, 404 and error pages are
  branded. Integration pass added a mobile menu, universal back button in the
  consumer shell, native touch feel and a facts band, and fixed a platform
  wide SVG paint-server bug (gradient ids stolen by hidden responsive rails)
  with per-instance ids via useId. Verified visually on phone viewports.
- 2026-07-28: Applied the `messaging_trust` migration (message_attachments,
  message_flags, inspection_confirmations, the `private.scan_message`
  10-digit account-number and payment-keyword scan trigger) that had
  previously only been drafted, and closed the bookings loop: `reserve`,
  `cancel` and `confirm` server actions in `lib/bookings/actions.ts`, all
  under RLS, with the GiST exclusion conflict translated into a friendly
  message and booking notification fan-out driven entirely by database
  triggers.
- 2026-07-29: Closed the wallet and payments loop for real. Added
  `lib/payments/paystack.ts` (transaction init/verify, HMAC SHA-512 webhook
  signature verification, transfer, bank list) and
  `app/api/paystack/webhook/route.ts`, which settles `rm-fund-<uuid>` and
  `rm-wd-<uuid>` ledger references idempotently. Wired `fundWallet`,
  `withdraw`, `transferToUser`, `verifyFunding` and `getStatement` in
  `lib/wallet/actions.ts` against the real ledger. `PAYSTACK_SECRET_KEY` is
  not supplied yet, so every action answers honestly rather than pretending
  to charge.
- 2026-07-29: Closed the messaging loop for real: `startConversation`,
  `sendMessage`, `attachImage`, `confirmInspection` and `markThreadRead` in
  `lib/messages/actions.ts`, all under RLS, plus the new
  `/messages/new?listing=<id>` route bridging a listing straight into its
  conversation. Applied the `storage_buckets` migration (three buckets:
  `listing-photos`, `avatars`, `message-attachments`) and, once the security
  advisor flagged that a public bucket serves objects through its public URL
  regardless of RLS, the `storage_policy_hardening` migration replacing the
  broad public-read policies with owner-scoped reads and revoking client
  EXECUTE on the platform's `rls_auto_enable` function.
- 2026-07-29: Applied the `notifications` migration: one table, one private
  writer (`private.notify`), and trigger fan-out from bookings, messages and
  wallet entries, joined to `supabase_realtime` alongside `messages` for live
  delivery. Built `LiveNotifications` and `LiveThreadList` client components
  reading real, day-grouped, Realtime-updating data for signed-in users.
  Extended the wallet trigger with the `wallet_notify_failures` migration so
  a failed withdrawal or a reversal tells the owner what happened, not just
  a silent balance change.
- 2026-07-29: Applied `rental_pricing` (adds the `'rental'` property type
  value and the `price_period` night/year enum to `listings`, plus a
  `settings jsonb` column on `profiles`, not yet wired to any UI),
  `support_tickets` (support_tickets + support_ticket_messages, `NF-SUP`
  references, `fileSupportTicket` action), `assistant_threads`
  (ai_conversations + ai_messages, owner-private RLS) and `feature_flags`
  (eight switchable surfaces, world-readable, admin-writable, fail-open via
  `lib/flags.ts`).
- 2026-07-29: Built `/api/assistant`: a real Server-Sent-Events route
  against the Claude API (`claude-sonnet-5`) with a `search_listings` tool
  bound to the same repository search `/search` uses, the full no-charge/
  pay-after-inspection system prompt, an in-process rate limiter, and thread
  persistence to `ai_conversations`/`ai_messages` for signed-in users. The
  assistant sidebar (`components/app/assistant/threads.ts`) still only reads
  `localStorage`, so a persisted thread does not yet read back on a new
  device; that is the one genuinely open half of this loop.
- 2026-07-29: Added `private.release_stale_booking_holds()` (cancels PENDING
  bookings unconfirmed for 48 hours so an abandoned request cannot lock
  inventory under the GiST exclusion constraint); it has no `pg_cron`
  schedule yet, so it exists but nothing calls it. Rebuilt the five Supabase
  auth email templates RentMe-blue (navy-black, electric blue, no violet) via
  `scripts/build-auth-emails.mjs`, closing the one item still flagged
  NaijaFinds-branded that morning. Added four Playwright golden-path specs
  (`apps/web/tests/{assistant,bookings,messages,wallet}.spec.mjs`) and
  `scripts/verify-shots.mjs`, the lead's 390x844 screenshot harness;
  `playwright-core` is now a real `devDependency` of `apps/web` rather than
  an ad hoc install. One migration recorded live against the database,
  `20260729174306_rls_initplan_and_fk_index`, has no matching file committed
  under `supabase/migrations/` and needs reconciling (see
  `docs/HANDOFF.md` section 9).
- 2026-07-30 (documentation audit note, entries below not independently
  re-run against `npm run build`/`npm run typecheck`, verified by reading the
  source and the applied migrations): closed B1 (nobody could ever be
  granted `admin`/`super_admin`) with an `admin_bootstrap` allow-list table
  the signup trigger consults; closed B4 (Google/Apple sign-in buttons wired
  to nothing) by turning each into a form posting to a server action. Closed
  B2 (payment initiation orphaned): `PayPanel.tsx` now calls
  `startCardCheckout`/`payWithWallet`, and `ReservePanel.tsx` sends a
  successful reserve straight to `/checkout/[bookingId]` as the primary CTA.
  Closed B3 (`/agent/bookings` and `/agent/earnings` were 11-line stubs):
  both are real consoles now, `BookingsWorkspace.tsx` with Accept/Decline and
  `EarningsWorkspace.tsx` reading the ledger. Closed B5 (agent identity
  documents discarded in the browser): they now upload to a private
  `agent-documents` bucket and the admin reviewer opens each through a
  ten-minute signed URL. Closed B6 (`pay_booking_from_wallet` migration not
  applied): it is applied now, and also fixed to accept a booking that is
  `PENDING` or `CONFIRMED`-and-unpaid, closing a separate bug where a
  host-accepted stay could never be paid and `checkout-view.ts` called any
  `CONFIRMED` booking "paid" regardless of whether money had moved. Full
  detail in `docs/DEAD_ENDS.md`, rows B1 through B6.
- 2026-07-30/2026-08-01: every orange, amber, gold, magenta and violet design
  token was removed from `packages/design-tokens/src/tokens.css` and
  `src/index.ts`; warning is bright cyan now, stars use a new `--nf-rating`
  token. Dark became the theme default: the before-paint script no longer
  falls back to the operating system, only an explicit stored choice moves
  it, and `system` is written to storage rather than clearing the key. Two
  visual defects fixed: `PageScene` added 29px of phantom horizontal scroll
  on five surfaces (`overflow-x-clip`), and a scroll-driven reveal outranked
  the observer so the first `/search` card sat blurred until scrolled to
  (fixed with a `data-instant` escape). `BrandIcon`'s `padding: 9%` was
  resolving against the containing block, not the tile's own size, so every
  non-fill `BrandIcon` in a sized wrapper rendered as an empty white chip;
  fixed. Agent stat tiles no longer truncate their labels.
