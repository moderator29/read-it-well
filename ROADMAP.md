# Roadmap

What has landed. This file is not a plan. What is coming is `RECOMMENDATIONS.md`,
what is honestly missing is `KNOWN_GAPS.md`, and what the product IS is
`docs/PRODUCT.md`.

Last updated: 2026-08-09

**Corrected 2026-08-09, and the shape of the rot is the useful part: every stale
claim understated the platform.** The light theme was called scaffolded when it
is a designed paper twin. The admin console was called 13 sections when its nav
carries 14 destinations. `pg_cron` was named the second largest outstanding item
when it has been installed and running six jobs since 2026-08-04. Partner hotels
and restaurants were listed as costed future work when third-party inventory has
been deleted from the product entirely. The migration and table counts were nine
days behind. Every number below was re-checked against the code, the repository
or the live Supabase project on the date above.

**An earlier correction, kept.** This file was last accurate on 2026-07-28 and
for ten days said "Nothing in flight" while four subsystems shipped, and listed
the admin console, the listing wizard, the first migration and settlement as
blocked on decisions the owner had already made.

---

## Done

### Phase 0. Intake and audit
- Three specification documents ingested. The two PDFs verified as rendered
  copies of the two markdown files, so there are three sources, not five.
- 11 unique design references recorded with per-image authority levels.
- 12 contradictions raised across the specifications and references.
- Repository reconnaissance: greenfield, no prior work to preserve.
- Records: `docs/archive/intake/00-INTAKE-STATUS.md`,
  `docs/archive/intake/01-PROJECT-RULES.md`. Both archived 2026-08-09.

### Phase 1a. Foundation and first surfaces
- npm workspaces monorepo: `apps/web`, `packages/design-tokens`, `packages/i18n`.
- Two layer token system (ADR-002). **Both themes are complete.** This line said
  "light theme scaffolded" until 2026-08-09 and had been wrong for weeks: light
  is a designed paper twin with its own 570-line block in
  `packages/design-tokens/src/tokens.css` and its own partial at
  `apps/web/src/app/css/light.css`. Dark is the default and the operating system
  does not override it.
- The material: glass, soft depth, pure surface, plus a fallback for devices
  without `backdrop-filter`.
- **The vector 3D icon family and the vector isometric scene were deleted.**
  ADR-003 chose to redraw the supplied pack as vector; ADR-010 reversed that and
  the redraws were removed. What ships is the commissioned artwork: 57 BrandIcon
  objects and 40 UiIcon glyphs. See `docs/ICON_SYSTEM.md`.
- Brand mark and wordmark, cut from the supplied sheets with alpha preserved.
- Localisation for English, Yoruba, Hausa and Igbo. No hardcoded user strings.
- Money as integer minor units with locale aware formatting.
- **Landing page**, **sign in**, **sign up**, **home**, plus `/search`, 404 and
  a route error boundary.
- Auth provider structure gated on environment variables, server side
  validation, no fake success paths.
- Listing repository interface (ADR-005). **The seed source it was built to
  serve has been deleted**: twenty-three invented places, twenty-two of them
  carrying `verified: true` with fabricated ratings on addresses that do not
  exist. The reasoning is at the top of `apps/web/src/lib/listings/repository.ts`.
- Security headers at the edge. `server-only` guards on credential modules.
- Dependency overrides closing six high severity advisories.

### Phase 1b. Authentication and data

- Real Supabase Auth: `signInWithPassword`, `signUp`, sign out, password reset,
  and a middleware lock on the product because a link is not a lock. Google and
  Apple OAuth were built and are **being removed** by owner decision:
  `RECOMMENDATIONS.md` N-4.
- **120 migrations applied and 120 committed**, 71 tables in `public`, RLS
  enabled on every one of them. Role helpers live in a private, non-exposed
  schema. A GiST exclusion constraint makes double booking impossible at the
  database level. The two migration lists disagree on eight cosmetic filename
  pairs: `RECOMMENDATIONS.md` T-4 has the diff.
- Durable Postgres rate limiting (`private.consume_rate_limit`) and idempotency
  records, both fail-open. Applied to two API routes only, which is
  `RECOMMENDATIONS.md` W-2.
- The test suite: **83 standalone node specs** under `apps/web/tests` plus **8
  vitest files** under `apps/web/src`. No CI runs any of them
  (`RECOMMENDATIONS.md` T-1).

### Phase 2. Discovery

`/search` with a real engine, `FilterDrawer`, a real Leaflet map with
`MapCanvas` and `MapDock`, pagination, and `saved_items` written under RLS.
The location model settled on state, city and area, with all 774 local
governments seeded alongside.

### Phase 3. Agent and admin

Agent application persisting under RLS with documents in a private bucket, the
eight step listing wizard, the admission quality gate shared by the wizard and
the server, **the admin console across 14 destinations**, moderation, and an
append-only audit log. The verification ladder exists in
`agent_verification_checks` with screens on both sides.

The console count said 13 until 2026-08-09. `apps/web/src/app/admin/_components/nav.ts`
carries 14 entries: overview, flags, moderation, alerts, reports, applications,
stops, listings, bookings, tickets, social, standing, reference, switches. An
operator counting rows in the rail gets 14, so 13 was wrong on the only reading
that matters.

### Phase 4. Booking and payments

The booking state machine, per-night availability, Paystack with HMAC SHA-512
webhook verification and idempotent settlement, a naira wallet whose balance is
derived from an append-only kobo ledger, and support-initiated refunds. The
ledger balances exactly and the platform's share is always zero.

### Phase 5. AI

`/assistant` streaming from the Claude API with a grounded `search_listings`
tool, thread persistence, a per-month cost ceiling in `bot_settings` read
against `bot_invocations`, and support escalation into real tickets.

### The social layer

Not on the original phase list at all, and built: `posts`, `stories`, `areas`,
follows, reactions, reposts, blocks, mutes, badges, the SYSTEM author kind that
answers the cold start, `/around`, `/u/[handle]` and an admin moderation queue.
The design record is `docs/SOCIAL_DESIGN.md`.

### The scheduler

`pg_cron` 1.6.4 is **installed** and six jobs are active, applied by
`supabase/migrations/20260804184423_the_scheduler_exists_now.sql`: the nightly
badge sweep, stale booking hold release every fifteen minutes, hourly rate limit
purge, nightly idempotency purge, the completed-stay announcement and the daily
note. All schedules are UTC; Lagos is UTC+1.

### Third-party inventory, built and then removed

A provider layer for LiteAPI hotel rates and Google Places restaurants was built
behind one interface with dedupe, kill switches and a hard timeout per provider.
**The owner removed third-party inventory from the product.**
`apps/web/src/lib/inventory/` no longer exists and `PartnerMeta` is gone from
`lib/listings/types.ts`. Everything on RentMe was listed on RentMe. Residue in
the database and the environment is `RECOMMENDATIONS.md` S-2.

---

## Active

Not tracked here. This file records what has landed. What is in flight lives in
`docs/HANDOFF.md`, what is honestly missing lives in `KNOWN_GAPS.md`, and what
should be done next lives in `RECOMMENDATIONS.md`. Saying "nothing in flight"
here for ten days while four subsystems shipped is what made this document
untrustworthy once already.

---

## Blocked

Every item this table used to carry was decided and built. Kept as a record of
what unblocked them, because two are still cited as open elsewhere.

| Item | Was blocked by | Reality |
|---|---|---|
| Admin Command Centre | Which of four admin rails is canonical | Decided 2026-07-28 (B-10, Ref 04). Built, **14 destinations** under `/admin` |
| Agent listing wizard | Which wizard is canonical, 7 step or 6 step | Decided 2026-07-28 (B-12). Built, and it is eight steps, not seven |
| First database migration | Location model, State/LGA versus City/Area | Settled on state, city and area, with all 774 local governments seeded as their own layer |
| Settlement and payouts | Take rate and service fee ownership | Settled: the platform charges NO fees anywhere. The ledger keeps the column and records zero |
| Anything Pro related | Whether Pro is in scope | Still open with the owner. The only genuine survivor of this table |

---

## Next

The full list is `RECOMMENDATIONS.md`, by domain, with evidence and a priority
on every entry. The four largest, in the order they matter:

1. **The product cannot express a sale.** `public.listings` has no sale price,
   no sale intent and no tenure field, on a platform named for renting that is
   meant to sell. It is free to fix today with zero listings and expensive the
   day after the first hundred. `RECOMMENDATIONS.md` P-1.
2. **Signed-out visitors are locked out of the whole product.**
   `apps/web/src/middleware.ts` redirects an anonymous visitor away from 22
   segments including `/search` and `/listing`, which is the opposite of the
   stated rule and defeats every SEO item behind it. N-1.
3. **A missing service role key silently kills both money settlement paths and
   answers HTTP 200**, so a paid funding is lost with no retry and no log. W-1.
4. **Escrow is zero percent built.** It is correctly not promised anywhere in
   product copy, and it is the reason a Nigerian would send rent to a platform
   rather than to a stranger. E-1.

The Content Security Policy is **built and serving in report-only mode**; what
remains is the decision to enforce (SEC-1). This file listed it as unbuilt.

Phase 6, the Expo application sharing the token and i18n packages, remains the
recommendation for iOS. Capacitor 8 shipped as Path A in the meantime and no
native build has ever been compiled: `docs/MOBILE.md` section 6.

---

## Verification currently run before every commit

```
npm run typecheck                 # repo root, all workspaces, must be 0
cd apps/web && npx eslint .       # from apps/web
cd apps/web && npx vitest run     # from apps/web, 8 files, no server needed
npm run build                     # repo root, must compile
```

Vitest MUST be run from `apps/web`. The repo root picks up a different config
and appears to fail. The 83 node specs under `apps/web/tests` need a server on
port 3210; `docs/HANDOFF.md` section 9 has the invocation and the port trap.
Plus the standing scan for forbidden content: no AI attribution, no em dashes.

**None of this runs automatically.** There is no `.github/workflows` directory
and Vercel deploys from `main`, so nothing mechanical stands between a red spec
and production. `RECOMMENDATIONS.md` T-1.
