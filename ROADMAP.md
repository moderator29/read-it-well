# Roadmap

Required by Master Rule 23. Updated as work lands, not as work is imagined.

Last updated: 2026-08-07

**This file had rotted and its middle has been rewritten.** It was last accurate
on 2026-07-28 and still said "Nothing in flight", listed the admin console, the
listing wizard, the first migration and settlement as blocked on decisions the
owner made that same week, and described the session layer, search, the map and
the first test suite as future work under "Next". All of it shipped. Every claim
below was checked against the code, the build output or the live database on the
date above; where a number could not be re-verified it says so rather than
carrying an old one forward.

---

## Done

### Phase 0. Intake and audit
- Three specification documents ingested. The two PDFs verified as rendered
  copies of the two markdown files, so there are three sources, not five.
- 11 unique design references recorded with per-image authority levels.
- 12 contradictions raised across the specifications and references.
- Repository reconnaissance: greenfield, no prior work to preserve.
- Records: `docs/intake/00-INTAKE-STATUS.md`, `docs/intake/01-PROJECT-RULES.md`.

### Phase 1a. Foundation and first surfaces
- npm workspaces monorepo: `apps/web`, `packages/design-tokens`, `packages/i18n`.
- Two layer token system, dark theme complete, light theme scaffolded.
- NaijaFinds Material: glass, soft depth, pure surface, plus a fallback for
  devices without `backdrop-filter`.
- Vector 3D icon family, 34 glyphs, one light source and one material response.
- Brand mark and wordmark as vector.
- Isometric island hero scene, authored as vector, deterministic.
- Localisation for English, Yoruba, Hausa and Igbo. No hardcoded user strings.
- Money as integer minor units with locale aware formatting.
- **Landing page**, **sign in**, **sign up**, **home**, plus `/search`, 404 and
  a route error boundary.
- Auth provider structure gated on environment variables, server side
  validation, no fake success paths.
- Listing repository interface with a labelled seed source.
- Security headers at the edge. `server-only` guards on credential modules.
- Dependency overrides closing six high severity advisories.

### Phase 1b. Authentication and data

- Real Supabase Auth: `signInWithPassword`, `signUp`, sign out, Google and Apple
  OAuth, password reset, and a middleware lock on the product because a link is
  not a lock.
- 113 migrations applied, 71 tables in `public`, RLS enabled on every one of
  them. Role helpers live in a private, non-exposed schema. A GiST exclusion
  constraint makes double booking impossible at the database level.
- Durable Postgres rate limiting (`private.consume_rate_limit`) and idempotency
  records, both fail-open.
- The first test suite, and then a lot more of it: 78 standalone node specs
  under `apps/web/tests` plus 66 vitest unit tests under `apps/web/src`.

### Phase 2. Discovery

`/search` with a real engine, `FilterDrawer`, a real Leaflet map with
`MapCanvas` and `MapDock`, pagination, and `saved_items` written under RLS.
The location model settled on state, city and area, with all 774 local
governments seeded alongside.

### Phase 3. Agent and admin

Agent application persisting under RLS with documents in a private bucket, the
eight step listing wizard, the admission quality gate shared by the wizard and
the server, the admin console across 13 sections, moderation, and an
append-only audit log. The verification ladder exists in
`agent_verification_checks` with an admin screen over it.

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

---

## Active

Not tracked here. This file records what has landed; what is in flight lives in
`docs/HANDOFF.md` and what is honestly missing lives in `KNOWN_GAPS.md`. Saying
"nothing in flight" here for ten days while four subsystems shipped is what
made the rest of this document untrustworthy.

---

## Blocked

Every item this table used to carry was decided and built. They are kept as a
record of what unblocked them rather than deleted, because two of them are
still cited as open in other documents.

| Item | Was blocked by | Reality |
|---|---|---|
| Admin Command Centre | Which of four admin rails is canonical (R-01) | Decided 2026-07-28 (B-10, Ref 04). Built, 13 sections under `/admin` |
| Agent listing wizard | Which wizard is canonical, 7 step or 6 step | Decided 2026-07-28 (B-12). Built, and it is eight steps now, not seven |
| First database migration | Location model, State/LGA versus City/Area | Settled on state, city and area, with all 774 local governments seeded as their own layer |
| Settlement and payouts | Take rate and service fee ownership (R-03) | Settled: the platform charges NO fees anywhere. The ledger keeps the column and records zero |
| Anything Pro related | Whether NaijaFinds Pro is in scope (R-11 in intake) | Still open with the owner. The only genuine survivor of this table |

---

## Next

The remaining work is in `KNOWN_GAPS.md`, item by item with what unblocks each.
The three largest, in the order they matter:

1. **A Content Security Policy.** Nothing sets one, on a platform that takes
   card details. This is the largest outstanding security item.
2. **`pg_cron`.** A Supabase toggle rather than code. Until it lands the stale
   booking hold sweep, seven of the badges and the social layer's expiry have
   nothing scheduling them.
3. **Partner hotels can be priced but not booked**, and restaurants can be
   discovered but not booked. Both are costed in `docs/HYBRID_INVENTORY.md`.

Phase 6, the Expo application sharing the token and i18n packages, and Phase 7,
launch hardening, are both untouched and unchanged.

---

## Verification currently run before every commit

```
npm run typecheck                 # repo root, all workspaces, must be 0
cd apps/web && npx vitest run     # 66 unit tests, no server needed
npm run build                     # repo root, must compile
```

Vitest MUST be run from `apps/web`. The repo root picks up a different config
and appears to fail. The node specs under `apps/web/tests` need a server on
port 3210; `docs/HANDOFF.md` section 9 has the invocation. Plus the standing
scan for forbidden content: no AI attribution, no em dashes.
