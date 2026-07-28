# Roadmap

Required by Master Rule 23. Updated as work lands, not as work is imagined.

Last updated: 2026-07-28

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

---

## Active

Nothing in flight. Awaiting owner decisions listed under Blocked.

---

## Blocked

| Item | Blocked by |
|---|---|
| Admin Command Centre | Which of four admin rails is canonical (R-01) |
| Agent listing wizard | Which wizard is canonical, 7 step or 6 step |
| First database migration | Location model, State/LGA versus City/Area |
| Settlement and payouts | Take rate and service fee ownership (R-03) |
| Anything Pro related | Whether NaijaFinds Pro is in scope (R-11 in intake) |

---

## Next

### Phase 1b. Authentication and data
Session layer, real sign in, route protection, PostgreSQL with PostGIS, first
migrations, role based access control, and the **first test suite**. Testing is
the largest outstanding rule compliance gap.

### Phase 2. Discovery
Search abstraction, Google Maps behind a service adapter, category aware
filters, results list and map synchronisation, pagination, favourites.

### Phase 3. Agent and admin
Agent application flow, listing wizard, media pipeline with real upload
validation, moderation workflow with audit trail, admin command centre.

### Phase 4. Booking and payments
Booking state machine, availability without race conditions, Paystack with
webhook idempotency, refunds, ledger, settlement.

### Phase 5. AI
Tool layer over real platform data, grounding classification, permission
enforcement, prompt injection defence, support escalation, evaluations.

### Phase 6. Mobile
Expo application sharing the token and i18n packages.

### Phase 7. Hardening and release
Security review, end to end tests, store readiness, monitoring, rollback.

---

## Verification currently run before every commit

Typecheck, production build, dependency audit, and a scan for forbidden content
(AI attribution and em dashes). A real test suite joins this in Phase 1b.
