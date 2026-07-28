# NaijaFinds: Master TODO

The single organising document for NaijaFinds delivery. Every other plan defers
to this one. It records what is built, what is left, who owns each piece, what it
depends on, and how each item is verified as done.

Last updated: 2026-07-28. Owner: moderator29. Repository: `read-it-well`
(rename pending, see Blocking Decision B-13).

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

**Build health (verified 2026-07-28):**

| Check | Command | Result |
|---|---|---|
| Typecheck, all workspaces | `npm run typecheck` | PASS |
| Production build | `npm run build` | PASS, 20 routes |
| Em dash scan | grep across `apps packages docs scripts` | clean |
| Attribution scan | grep for co-authored / claude / anthropic | clean |
| Secret scan | grep for key and token patterns | clean |
| Commit authorship | `git log --format=%an origin/main..HEAD` | all `moderator29` |

**Git:** feature history sits linearly on top of `origin/main` (`44c3744`). The
earlier branch divergence (a duplicate "Clear repository" commit left by an
authorship rewrite) was resolved by rebasing onto `origin/main` with
`--empty=drop`; the redundant commit dropped cleanly. There was never a textual
code conflict, confirmed with `git merge-tree`. A safety branch
`backup/feat-pre-rebase` preserves the pre-rebase tip.

**Supabase:** project `uccixoonmbhrnyczyigt` is connected, `ACTIVE_HEALTHY`,
Postgres 17, region eu-west-1. The full domain model is landed: **10 migrations,
24 tables, RLS on every table (0 without), 53 policies.** Identity, location,
agents, listings, bookings and a real payments ledger, engagement (reviews,
messaging, saved), and admin/trust (audit log, risk alerts, reports). A
database-level GiST exclusion constraint guarantees no double booking. RLS role
helpers live in a private, non-exposed schema. Security advisor is clean of all
project-authored functions (one pre-existing platform event-trigger warning
remains, not ours). App wiring is in place: env-guarded browser, server and
service-role clients (`apps/web/src/lib/supabase/`), session-refresh middleware,
and generated types. The agent application server action persists under RLS.

**What is live in the web app (20 routes):**

| Area | Routes | Status |
|---|---|---|
| Landing | `/` | DONE |
| Auth | `/sign-in`, `/sign-up` | DONE (UI only, no real auth) |
| Personal home | `/home` | DONE |
| Discovery | `/search` | PARTIAL (shell, no live data or map) |
| Become an Agent | `/agents`, `/agents/apply`, `/agents/status` | DONE (form posts to a not-connected server action) |
| Agent dashboard | `/agent/dashboard` | DONE (seed data, labelled sample) |
| Agent workspace | `/agent/{listings,bookings,messages,reviews,earnings,analytics,verification,settings,list}` | STUB (coming-soon) |

**Shared packages:** `@naijafinds/design-tokens` (token CSS + TS mirror),
`@naijafinds/i18n` (en, yo, ha, ig dictionaries, money and number formatters).
Both now carry a `tsconfig.json` so their typecheck runs (fixed this session).

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
80 Master Rules, does not replace them). This is the target the backend builds
toward. Nothing here is built yet; the database is empty.

### 3.1 Provider adapter layer

Every third party sits behind an interface so the app never imports a vendor SDK
directly (Master Rule 40, swap without rewrite). Each needs a real adapter, a
seed or stub adapter, and a `NF_*` env switch.

| Adapter | Provider | Purpose | Status |
|---|---|---|---|
| `AuthProvider` | Supabase Auth | sign up, sign in, sessions, social | READY |
| `DataProvider` | Supabase Postgres | canonical data store | READY |
| `MapsProvider` | Google Maps | geocoding, map tiles, places | LATER |
| `PaymentProvider` | Paystack | charges, transfers, webhooks | LATER |
| `HotelProvider` | Travelgate | hotel inventory (needs signed agreement, B-10 lead time) | LATER |
| `AIProvider` | Anthropic | assistant, grounded retrieval, tools | LATER |
| `EmailProvider` | Resend | transactional + branded auth emails | READY |
| `SmsProvider` | Termii | OTP, alerts | LATER |
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
must be reskinned to NaijaFinds branding: logo, gradient, typography, four-language
awareness. Owner: BACKEND + FRONTEND. Status: READY. Delivered as HTML templates
plus the Supabase Auth config to point at them.

---

## 4. Blocking owner decisions

These gate downstream work. Nothing marked BLOCKED in sections 2, 3 or 5 can be
finished until the matching decision is made. Full context in
`docs/intake/00-INTAKE-STATUS.md` section 4.

| ID | Decision | Blocks | Recommendation |
|---|---|---|---|
| B-01 | Reference count and 15/15 intake gate (13 unique vs owner count) | full implementation authorisation | reconcile the denominator; treat received refs as buildable now |
| B-10 | RESOLVED 2026-07-28: admin = Ref 04 (15-item rail), consumer = Refs 01/04 (12-item rail). IA frozen. | (was) admin, consumer rail, routing | settled |
| B-11 | Is NaijaFinds Pro in scope | entitlement gating, second revenue model | defer, out of MVP |
| B-12 | RESOLVED 2026-07-28: 7-step wizard (Ref 03) is canonical; photos only for MVP, video/tours/docs LATER. | (was) `/agent/list`, media model | settled |
| B-09 | Are icon source files vector, or only the contact sheet | final icon quality | need vector/Lottie source |
| B-07 | Canonical location model (no LGA field is designed) | location tables, wizard | store State/LGA/Ward + City/Area layer |
| B-09b | Guest-paid service fee recipient and platform take rate | payments ledger, settlement | needs commercial decision |
| B-06 | Agent Mode on mobile after mode switch | responsive agent scope | responsive full workspace |
| B-03 | Admin review: add a Request Changes action | listing state machine enum | add the action |
| B-07c | Supabase vs NestJS boundary; is RLS used | auth ownership, all authorisation | Supabase Auth + RLS on, service layer for the rest |

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

### Phase 1: Backend spine  (STATUS: IN PROGRESS)

| ID | Task | Owner | Status | Depends | Verify | DoD |
|---|---|---|---|---|---|---|
| P1-1 | Supabase migrations: full domain model | BACKEND | DONE | B-07 | `list_tables` (24), `list_migrations` (10) | all subsystems modelled with RLS |
| P1-2 | RLS policies + cross-tenant isolation tests | BACKEND | PARTIAL | P1-1 | advisor + test run | 53 policies live, advisor clean; automated isolation test still to add |
| P1-3 | Branded Supabase auth email templates (5) | BACKEND+FRONTEND | DONE | none | files render | 5 branded templates + README |
| P1-4 | Supabase clients (browser/server/admin) + middleware | BACKEND | DONE | none | `npm run build` | env-guarded clients, session refresh |
| P1-5 | Generate TS types from DB, wire repositories | BACKEND | PARTIAL | P1-1 | `generate_typescript_types` | types generated + stored; repos still to wire |

### Phase 2: Auth and identity  (STATUS: READY)

| ID | Task | Owner | Status | Depends | Verify | DoD |
|---|---|---|---|---|---|---|
| P2-1 | Real sign up / sign in via Supabase Auth | BACKEND+FRONTEND | READY | P1-1, P1-4 | manual + test | session persists, protected routes gated |
| P2-2 | Server-side agent-mode gate (not cookie alone) | BACKEND | READY | P2-1 | test | non-approved user cannot reach `/agent/*` |
| P2-3 | Profile + role model wired to UI | FRONTEND | READY | P2-1 | typecheck | identity card shows real user |

### Phase 3: Agent Mode completion  (STATUS: IN PROGRESS)

| ID | Task | Owner | Status | Depends | Verify | DoD |
|---|---|---|---|---|---|---|
| P3-1 | Mode switch flow (ref 02) | FRONTEND | DONE | none | build | cookie switch + refresh |
| P3-2 | Become an Agent 6-step wizard (ref 02) | FRONTEND | DONE | none | build | draft autosave, validation |
| P3-3 | Agent dashboard (ref 02, 04) | FRONTEND | DONE | none | build | seed data labelled sample |
| P3-4 | Agent application persisted to DB | BACKEND | DONE | P1-1 | server action | inserts SUBMITTED row under RLS, returns NF-AGT ref |
| P3-5 | List Apartment 7-step wizard (ref 03) | FRONTEND | BLOCKED | B-12 | build | wizard posts a listing draft |
| P3-6 | My Listings, Bookings, Messages, Reviews, Earnings, Analytics, Verification, Settings | FRONTEND+BACKEND | BLOCKED | P1-1, B-10 | build | each stub replaced with real data view |

### Phase 4: Discovery and property detail  (STATUS: PARTIAL)

| ID | Task | Owner | Status | Depends | Verify | DoD |
|---|---|---|---|---|---|---|
| P4-1 | Search results list + sort chips + Load more (ref 01) | FRONTEND | PARTIAL | P1-1 | build | real listings, pagination |
| P4-2 | Filters drawer (ref 01) | FRONTEND | READY | P4-1 | build | filters query the repo |
| P4-3 | Live map with price pins + clustering (ref 01) | FRONTEND+BACKEND | BLOCKED | MapsProvider | build | map renders listings |
| P4-4 | Property detail page (ref 04, 08): gallery, host panel, review distribution, amenities, tabs | FRONTEND | BLOCKED | B-10, P1-1 | build | detail renders a real listing |
| P4-5 | Saved items / saved searches | FRONTEND+BACKEND | LATER | P1-1 | test | save persists per user |

### Phase 5: Booking and payments  (STATUS: BLOCKED)

| ID | Task | Owner | Status | Depends | Verify | DoD |
|---|---|---|---|---|---|---|
| P5-1 | Booking wizard 4-step (ref 09) | FRONTEND | BLOCKED | P4-4 | build | dates, guest composition, confirm |
| P5-2 | Price breakdown (kobo, ref 09) | BACKEND | BLOCKED | B-09b | test | gross/fees/total exact in kobo |
| P5-3 | No double booking (per-night availability, idempotency) | BACKEND | READY | P1-1 | test | concurrent bookings cannot overlap |
| P5-4 | Payments ledger + Paystack webhooks (replay-safe) | BACKEND | BLOCKED | B-09b, PaymentProvider | test | ledger balances, webhook idempotent |
| P5-5 | Payouts, refunds, chargebacks | BACKEND | LATER | P5-4 | test | settlement rows correct |

### Phase 6: Admin command centre  (STATUS: BLOCKED on B-10)

| ID | Task | Owner | Status | Depends | Verify | DoD |
|---|---|---|---|---|---|---|
| P6-1 | Admin shell + canonical rail (ref 04) | ADMIN/QA | BLOCKED | B-10 | build | rail frozen, routes exist |
| P6-2 | Listing approvals queue + review screen (ref 03) | ADMIN/QA | BLOCKED | B-03, P1-1 | test | approve/reject/request-changes transitions |
| P6-3 | Users, Agents, Payments, Reports, Security sections | ADMIN/QA | BLOCKED | B-10, P1-1 | build | each section reads real data |
| P6-4 | Audit log on every admin action | BACKEND | READY | P1-1 | test | action writes an immutable audit row |

### Phase 7: AI assistant  (STATUS: LATER)

| ID | Task | Owner | Status | Depends | Verify | DoD |
|---|---|---|---|---|---|---|
| P7-1 | Docked widget + panel + full view (ref 04) | FRONTEND | LATER | AIProvider | build | 3 surfaces render |
| P7-2 | Grounded retrieval returns real listing cards | BACKEND | LATER | P1-1, P4-1 | test | "Found N" matches query |
| P7-3 | Tool layer with permission enforcement + budgets | BACKEND | LATER | P2-1 | test | AI cannot exceed user's own scope |
| P7-4 | Prompt-injection defence | BACKEND | LATER | P7-3 | test | injected instruction ignored |

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
