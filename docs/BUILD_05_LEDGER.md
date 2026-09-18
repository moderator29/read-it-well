# Build 05 ledger: the two-side platform

**The working ledger of the HANDOFF_05 build session, 18 September 2026.**
`docs/HANDOFF_05_UPGRADED_WIDE_PLATFORM_BUILD.md` is the brief and it is law;
`docs/HANDOFF_04_MARKETPLACE.md` section 13 binds every worker. This file
records scopes, the queue, what landed with its commit, the probes, the
pitches taken, and what needs the founder. It absorbs `docs/archive/SPRINT_60_B.md`.

---

## 0. The rules, restated (every worker restates these before starting)

1. Zero em dashes anywhere: code, copy, docs, commits. British spelling.
2. Money is integer kobo as bigint; `Math.round(naira * 100)` only at the
   input boundary; display only through `formatMoney` from `@vallo/i18n`.
3. The platform charges no fees anywhere in copy.
4. Every server action returns the `ActionResult` envelope; sessions come from
   `resolveSession()`.
5. `BrandIcon` and `UiIcon` only; no `strokeWidth` on UiIcon, no `ramp` on
   BrandIcon; tiers never mix in a row.
6. 390px first, in dark, then wider, then light.
7. Dark is the default and the OS does not override it.
8. One blue family. Emerald success, rose error, bright cyan pending. No
   orange, amber, gold, purple, violet, magenta. A new accent is a new depth
   of blue.
9. No raw colours, no raw spacing; tokens and the scale, never a disabled
   lint rule.
10. Motion is physics; `prefers-reduced-motion` turns it all off and the
    product stays complete; one ambient animation per viewport.
11. Escrow is promised nowhere.
12. First-party trust is sacred; the badge means a human was checked; partner
    inventory is labelled, never dressed as first-party.
13. Banned in UI copy: demo, sample, preview, not live, coming soon, lorem.
    Colour is never the only signal.
14. The brand is Vallo.
15. No dark patterns.
16. Never log or paste personal data.
17. Secrets live in the environment and Vault.
18. Never say committed, pushed, tested, verified or done unless it is true.
    Report what was skipped, unprompted.
19. The ONE LAW decides done: UI action, validated server action, database
    write surviving RLS, UI showing the new reality, the notification the
    event deserves, a test proving it.
20. The standard: would a funded design team have shipped this.

**The stop list (HANDOFF_05 section 9), absolute:** merchant-of-record
exposure or any float; spending money or new paid vendors; destructive database
operations; git history rewriting; remote branch deletion; native app
identifiers; `HANDOFF_01` legal ground; writing test rows to live product
tables; relaxing `messages.sender_id`; rendering any partner row before the
label and the fulfilment-honest CTA exist; wallet or saved cards anywhere in
the third-party flow; scraping the CAC portal or anything else; Amadeus.

**Agent contract:** agents never run git; strict written file scopes below; a
finding outside your scope is a line in your report, not an edit; the lead
re-audits and commits everything; no success report is believed without
verification; verify with the narrow command (`npx tsc --noEmit -p apps/web`,
`npx vitest run <file>`, `npx eslint <paths>`) until a phase closes.

---

## 1. Baseline, recorded 18 September 2026 at `66f168b`

| Command | Result |
| --- | --- |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0, warnings only (anonymous default exports, arbitrary font sizes) |
| `npm run test` | exit 0, 49 files, 1484 tests |
| `npm run build` | exit 0 |

Live database (Supabase MCP, project `uccixoonmbhrnyczyigt`): 75 public
tables, PostGIS, pg_trgm, btree_gist present, `unaccent` not installed, none of
the M1 enums exist yet, 7 conversations, 0 bookings, 64 listings, 6 profiles.
No `.env` in the sandbox: the app builds and tests in its signed-out repository
mode; nothing signed-in can be rendered here (the seeded login is asked for in
the close-out).

---

## 2. File scopes (non-overlapping, written before anything starts)

**LEAD (hands-on frontend, the signature work):**
`apps/web/src/lib/side.constants.ts`, `lib/side.ts`,
`components/app/{AppShell,AppRail,nav-model,MobileTabBar,SideSwitch,SideSync}.tsx`,
`components/app/flip/**`, `app/css/side-flip.css`, `app/globals.css`,
`app/layout.tsx`, `app/(app)/layout.tsx`, `middleware.ts`,
`packages/design-tokens/**`, `app/side-nav.css`, `app/css/chrome.css`,
`app/(app)/stays/**`, `components/app/stays/**`, `packages/i18n/**` (agents
may ADD keys with the Edit tool only, inside their own namespace object, in
all four locales), `lib/copy/**`, `docs/**`, `RECOMMENDATIONS.md`. The route
shells `app/(app)/{stay,restaurants,restaurant,trips}/**` are the lead's
until handed to FE in the queue below.

**FE (frontend agent):** `app/(app)/inspections/**`,
`app/(app)/messages/**`, `components/app/messages/**`,
`components/app/inspections/**`, `app/(app)/wallet/**`,
`components/app/wallet/**`, `app/(app)/settings/**`,
`components/app/payments/**`, `components/app/threads/**`, then by handoff:
`app/(app)/stay/**`, `app/(app)/trips/**`, `app/(app)/restaurants/**`,
`app/(app)/restaurant/**`, `app/host/**`, `components/host/**`,
`app/admin/businesses/**`, `app/(app)/around/**`, `app/(app)/u/**`.

**BE1 (migrations M1 to M9 and their probes):**
`supabase/migrations/2026091*_m0[1-9]_*.sql`, `lib/stays/**` (types,
queries, the twelve-filter search), `scripts/probes/**`.

**BE2 (M10 to M15, actions, triggers, API structure):**
`supabase/migrations/2026091*_m1[0-5]_*.sql`, `lib/messages/**`,
`lib/inspections/**`, `lib/payments/**`, `lib/host/**`,
`lib/admin/business*.ts`, `lib/saved/**`, `app/api/paystack/**`,
`lib/reservations/**`, `lib/bookings/**`.

---

## 3. The queue (each worker always has its next scope written)

**LEAD:** A1 side axis and pre-paint; A2 SideSwitch coin, SideFlip, cover
faces, reduced motion, lockout; A3 nav and tab bar by side, six route shells
with skeletons, middleware `trips`; A4 `/stays` and `/stays/search` first light
over the existing catalogue; then re-audit and commit every agent scope as it
closes; then Phase D handoffs, pitches, HANDOFF_06.

**FE:** FE-1 `/inspections` (Open and Closed) plus the `ThreadContextBanner`
slot in `ThreadView` with the rental face on the EXISTING inspection actions;
FE-2 the wallet's send money and receive money as full pages; FE-3
`/settings/payments` on BE2's M12 actions; FE-4 `/stay/[id]` showcase and
`/trips` (after handoff); FE-5 the Host onboarding wizard and
`admin/businesses`; FE-6 restaurants and the reservation face, the booking
face; FE-7 SPRINT_60_B leftovers 50 to 52 and 8.

**BE1:** M1, M2, M3 with probes; M4; M5 with the two-concurrent-taps probe;
M7; M8 (seed list drafted for the founder, not applied); M9 with the four
shelf-flag fixes; `lib/stays` queries and the twelve-filter search; M6 stays
DRAFTED in `supabase/migrations/pending/` and is never applied without the
founder's word.

**BE2:** M10 thread contexts plus the two sibling actions; M11 inspection
notifications plus `outcome`, `requestInspection` stamping `conversation_id`;
M12 `payment_methods`, `bank_accounts`, the webhook branch, the actions; M13
`saved_places`; M14 the `host-documents` bucket and Host onboarding actions;
M15 business verification rungs and admin business actions.

---

## 4. Landed (commit-tied, updated as it lands)

| What | Commit |
| --- | --- |
| Phase A: the side axis, `sideOfPath`, the pre-paint attribute, `--nf-side-accent` | `bb36563` |
| Phase A: `SideFlip`, `SideCover`, `side-flip.css`, the coin, reduced motion, the lockout | `bb36563` |
| Phase A: nav and dock by side, the six stays route shells with skeletons, middleware | `bb36563` |
| Phase A: `/stays` and `/stays/search` over the existing catalogue, the total as the headline | `bb36563` |
| "Trip" leaves the banned-synonym table on the founder's ruling | `bb36563` |
| M1 to M5, M7, M8, M9 applied and probed | `a8fad5b` |
| M10 to M15 applied and probed | `a8fad5b` |
| M6 and the landmark seed DRAFTED, not applied, in `supabase/migrations/pending/` | `a8fad5b` |
| The three thread faces on one messages engine, inspection tooling structurally rental-only | `a8fad5b` |
| Inspections whole: accept in the thread, `/inspections` Open and Closed, notifications, outcome | `a8fad5b` |
| The wallet's send and receive as full pages; the old sheets deleted | `a8fad5b` |
| `/settings/payments`: saved cards webhook-fed, bank accounts resolve-verified | `a8fad5b` |

---

## 5. Pitches taken into the build (small, on-system, reversible)

(filled in as work lands)

---

## 6. Probes

- **M5, the oversell gate, PASS.** Two concurrent sessions against a local
  Postgres 16 cluster running the exact function text from the migration: A
  held the last room and committed, B blocked on A's row lock, re-evaluated
  the WHERE, touched zero rows and raised; `units_booked` never exceeded
  `units_open`; release restored the night. Script and captured output:
  `scripts/probes/m5_oversell.sh` and `m5_oversell.log`. Nothing above M5 was
  treated as real until this held.
- Every other migration was probed on the live project inside a transaction
  that was rolled back: insert as a test user, read back under RLS, read as a
  different user (must fail or return nothing), exercise the trigger. No probe
  row was ever persisted to a live product table.
- The flip was driven in headless Chromium at 390px and 1280px, in dark and
  light, with and without reduced motion, in both directions, with the phase,
  the URL, the cookie and the live region read at five points per flip.

---

## 7. Needs the founder's word

1. M6, `bookings.listing_id` relaxed to nullable (drafted, not applied).
2. The seeded login.
3. The landmark seed list (M8), one page.
4. The four `private` tables the advisor flags.
5. MapTiler key before launch.
6. `outcome` on completed inspections (applied additively; zero cost to ignore).
7. LiteAPI sandbox key and the whitelabel subdomain (Phase F).
8. Booking.com Demand application.
9. Partner photo hosts at Phase F.
