# NaijaFinds — Intake Status (Pre-Implementation)

> **STAGE: INTAKE. NO IMPLEMENTATION AUTHORISED.**
> Per Master Execution Instruction §1 and §59, no application code, schema, or UI
> may be produced until all 15 design references are received.
> This file is the intake-stage project brain. It is **not** the Phase-0 audit
> deliverable — those documents are only created after 15/15 (Master §2).

Last updated: 2026-07-28

---

## 1. Design reference tracker

**Status: 0 / 15 received.**

| # | Received | Authority | Filename | System area informed | Notes |
|---|----------|-----------|----------|---------------------|-------|
| 01 | ☐ | — | — | — | — |
| 02 | ☐ | — | — | — | — |
| 03 | ☐ | — | — | — | — |
| 04 | ☐ | — | — | — | — |
| 05 | ☐ | — | — | — | — |
| 06 | ☐ | — | — | — | — |
| 07 | ☐ | — | — | — | — |
| 08 | ☐ | — | — | — | — |
| 09 | ☐ | — | — | — | — |
| 10 | ☐ | — | — | — | — |
| 11 | ☐ | — | — | — | — |
| 12 | ☐ | — | — | — | — |
| 13 | ☐ | — | — | — | — |
| 14 | ☐ | — | — | — | — |
| 15 | ☐ | — | — | — | — |

Each row is filled in on receipt with the owner-assigned authority level, the
area it informs, and any IA, component, state or navigation facts it establishes.

### Authority levels (owner-assigned — see §4 C-01)

**A — NaijaFinds Source of Truth.** An actual NaijaFinds screen. Preserve its
navigation, information architecture, component structure, layout relationships,
logo placement, icon system, typography hierarchy, spacing logic, states and
interaction patterns. Do not redesign these core elements arbitrarily.

**B — Visual Inspiration / Mood Board.** Do **not** copy its branding, logo,
navigation, text or proprietary identity. Extract design *principles* only —
glassmorphism, 3D depth, lighting, material treatment, gradients, neumorphism,
card construction, motion language, spacing rhythm, visual hierarchy — and
translate them into the established NaijaFinds design system.

**C — Mixed.** Determine which parts are authoritative NaijaFinds specification
and which parts are inspiration, and record that split explicitly in the Notes
column.

**The authority level is assigned by the owner, never inferred by Claude.** If a
reference arrives without a stated level, ask before recording or analysing it.

---

## 2. Source documents ingested

| Document | Form | Status |
|---|---|---|
| Master Execution & Orchestration Instruction | chat message | Ingested |
| Design System & 2030 Creative Direction (`design_prompt_v2.md`) | markdown | Ingested |
| Design System Prompt v2 (PDF) | PDF | Verified identical to the markdown |
| Build / Infrastructure & Orchestration (`build_prompt_v2.md`) | markdown | Ingested |
| Build System Prompt v2 (PDF) | PDF | Verified identical to the markdown |
| Living Recommendations & Ideas (`recommendations.md`) | markdown | Ingested |

The two PDFs are rendered copies of the two markdown files. They are **not**
independent specifications and carry no additional requirements. Treat the
markdown as canonical to avoid double-tracking.

---

## 3. Repository reconnaissance (Build §4 / Master §2, items 5–9)

This part of the audit does not require the design references and is complete.

| Question | Finding |
|---|---|
| Existing source | **None.** Repository is empty (0 tracked files). |
| Package manifests | None. |
| Dependencies | None. |
| Environment files / secrets | None. No `.env`, no `.env.example`. |
| Database schema | None in-repo. |
| Routes / components / tests | None. |
| Deployment config | None. |
| Assets | None. |
| Git state | Branch `claude/repo-cleanup-1spitz`, clean. |

**Context:** the repository previously held an unrelated product ("NakaGo", a
React + Vite + Tailwind crypto site, 113 files). It was deliberately deleted at
the owner's instruction in commit `eeb1279`. The full prior tree remains
recoverable at commit `8329334`.

**Consequence:** Build §4's instruction *"do not destroy working implementation
simply because your preferred architecture would start differently"* is moot.
This is a **greenfield build**. There is no prior work to preserve and no
architectural constraint inherited from the repository.

**Note:** the repository is named `read-it-well`, which does not match the
product. Renaming is the owner's decision; recorded here so it is not forgotten.

---

## 4. Contradiction register

Contradictions found **between the three source documents**. These must be
resolved during the Phase-0 audit; the ones marked **BLOCKING** change how the
design references themselves are interpreted and should be settled earlier.

### C-01 — Are the 15 references *specification* or *inspiration*? — **RESOLVED**

- **Design §0:** "The supplied visual references are inspiration for material
  language only. **Do not reproduce** their composition, logo, characters, icon
  shapes, screen layouts or visual identity. Extract principles from them and
  create a distinct NaijaFinds system."
- **Master §31:** "The 15 design references are part of the **visual source of
  truth**. Maintain: same navigation, same logo, same 3D icon family, same
  typography, same spacing, same cards…"

**Owner ruling (2026-07-28):** the two documents are not in conflict because the
15 references are **not all the same type**. Authority is assigned **per
reference** by the owner, using levels **A / B / C** as defined in §1.

**Precedence rule:** the authority level assigned to an individual reference
**overrides the generic wording of both** the Design System prompt and the Master
Instruction. At 15/15, the two documents are reconciled *through* these
per-image assignments rather than by picking one document over the other.

**Intent:** preserve genuine NaijaFinds design decisions, while using inspiration
references only to raise visual quality — without absorbing another product's
identity or structure.

**Standing constraint:** Claude never infers the level. An unlabelled reference
is queried, not guessed.

### C-02 — Three incompatible documentation naming conventions

The three documents each mandate a different filename convention, and several
files collide:

| Master §2 | Build §41 | Design §23 |
|---|---|---|
| `/docs/RECOMMENDATIONS.md` | `docs/recommendations.md` | `docs/recommendations.md` |
| `/docs/ARCHITECTURE.md` | `docs/architecture.md` | — |
| `/docs/API_MAP.md` | `docs/api-map.md` | — |
| `/docs/DATABASE_SPEC.md` | `docs/database-schema.md` | — |
| `/docs/SECURITY_MODEL.md` | `docs/security.md` | — |
| `/docs/DESIGN_SYSTEM.md` | — | `docs/design-system.md` |
| `/docs/LOCALIZATION.md` | — | `docs/localisation.md` |
| `/docs/IMPLEMENTATION_PLAN.md` | `docs/phase-plan.md` | — |
| `/docs/KNOWN_GAPS.md` | `docs/known-risks.md` | — |

`RECOMMENDATIONS.md` vs `recommendations.md` is the serious one: on Linux and in
CI these are two distinct files, so the mandated "living project brain" would
silently **fork into two divergent documents**. On macOS they collide instead.
`LOCALIZATION.md` vs `localisation.md` additionally differs in spelling.

**Decision taken (routine, documented rather than escalated):** adopt
**lowercase-kebab-case** throughout — it is used by two of the three documents,
is filesystem-safe everywhere, and avoids the case-collision. British spelling
(`localisation`) is used, matching the product's own copy. The Master §2 uppercase
names are treated as aliases pointing at the same documents; a mapping table will
lead `docs/`. No document is duplicated.

### C-03 — Two vocabularies for review/approval states

- **Master §6** (agent *application*): Draft, Submitted, Under Review, More
  Information Required, Approved, Rejected, Suspended.
- **Master §11** (listing pipeline): "Pending Review" → Approve / Reject /
  Request Changes.
- **Build §8** (listing): `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`,
  `CHANGES_REQUESTED`, `APPROVED`, `PUBLISHED`, `SUSPENDED`, `EXPIRED`,
  `REJECTED`, `ARCHIVED`.
- **Design §15** (listing): Draft → Submitted → Under Review → Changes Requested
  or Approved → Published.

Two *different* state machines exist (agent application, and listing), which is
correct — but they use inconsistent labels for the same concept: "More
Information Required" = "Request Changes" = `CHANGES_REQUESTED`; "Pending Review"
= `SUBMITTED` or `UNDER_REVIEW`. A single canonical vocabulary must be fixed
before any schema work, since these become enum values.

### C-04 — Agent navigation listed twice, differently

- **Master §7** lists 11 destinations: Dashboard, My Listings, List Apartment /
  Property, Bookings, Messages, Reviews, Earnings, Analytics, Availability,
  Profile / Business Profile, Settings.
- **Master §7** then states the authoritative IA as 8: Dashboard, Listings,
  Bookings, Messages, Reviews, Analytics, Earnings, Settings — omitting *List
  Apartment*, *Availability* and *Profile*.

*List Apartment* is called a primary side-navigation destination by both Design
§15 and Build §8, so its omission from the second list is likely an oversight.
The design references are expected to settle this; flagged so it is not silently
guessed.

### C-05 — Location hierarchy: "city / area" vs "LGA"

- **Master §10:** state, city, area, neighbourhood, address, coordinates.
- **Build §7 / Design §15:** states, **LGAs**, neighbourhoods.

Nigeria's official administrative hierarchy is State → LGA (774 of them) → Ward;
"city" and "area" are informal and do not nest cleanly inside LGAs. Canonical
model must be chosen once, with the informal terms as display aliases. Also note
the count is **36 states + FCT = 37**.

### C-06 — Is Agent Mode a mobile experience, a web experience, or both?

- **Master §5/§7** describes Agent Mode as a *mode switch* reached from Profile —
  a mobile app pattern.
- **Design §15** describes *List Apartment* as a **side-navigation** destination
  in a "listing studio" — a desktop pattern.
- **Build §3** provides `apps/mobile`, `apps/web` and `apps/admin` without
  assigning Agent Mode to any of them.

Whether the full agent workspace (10-image upload, analytics, earnings,
availability) must ship on mobile, on web, or on both is a **large** scope
difference — potentially the difference between one and two full application
surfaces. Must be answered before Phase 6 is estimated.

### C-07 — Supabase vs NestJS: who owns auth and authorisation?

Build §3 specifies Supabase PostgreSQL **and** a NestJS backend. Workable
(Supabase as managed Postgres), but it leaves two things undefined:

1. **Auth provider** — Supabase Auth, or NestJS-owned auth? Build §24 lists the
   requirements without naming an owner.
2. **Row Level Security** — if NestJS connects with a service-role credential,
   RLS is bypassed and *all* authorisation lives in application code. That is a
   legitimate choice, but it must be deliberate, because Build §25 requires
   server-enforced RBAC and Build §34 requires tests proving users cannot reach
   each other's bookings.

Picking one is a Phase-1 gate; retrofitting RLS later is expensive.

### C-08 — Delivery timeline vs scope

Build §0 targets **~1 month to MVP** and ~1 further month to hardening. The
specified scope is 4 applications, 8 shared packages, ~50 database tables, 8
third-party integrations (Travelgate, Paystack, Google Maps Platform, Cloudinary,
Anthropic, Resend, Termii, Sentry), 4 languages, a 9-domain admin command centre,
three distinct AI systems with RAG and evals, 19 categories of test, and dual
app-store submission.

Build §0 explicitly instructs: *"If scope threatens the quality bar, record the
risk and recommendations rather than hiding it."* Recording it: this scope is not
achievable in two months at the stated quality bar, particularly under the
Claude-usage constraints of Master §57 / Build §43. A defensible MVP cut will be
proposed with the Phase-0 audit. **No quality, security or testing reduction is
being proposed** — the recommendation will be to reduce *surface*, not rigour.

---

## 5. Gaps — requirements absent from all three documents

Raised now because several need commercial or legal input with long lead times,
and would otherwise block a phase mid-flight.

**Legal / regulatory**
- **NDPA 2023 / NDPR compliance is not mentioned anywhere.** A Nigeria-first
  platform processing personal data at scale has obligations including data
  controller registration and a designated DPO. This has a lead time.
- No privacy policy, terms, or cookie/consent content owner identified.
- Cross-border data transfer position (Supabase / Cloudinary / Anthropic regions).

**Financial / commercial**
- **No commission or take-rate defined.** Build §16 requires recording a platform
  fee but no rate exists.
- **No KYC/AML standard for agent payouts.** Paystack subaccounts need settlement
  bank details; identity verification (BVN/NIN) is implied but never specified.
- No chargeback / fraud liability position between platform and agent.
- **No cancellation and refund policy set.** The system is required to *track*
  policies, but the actual policies (flexible / moderate / strict) are undefined.
- No dispute-resolution workflow. Master §12 lists "disputed" bookings as an
  admin state but no process produces or resolves that state.

**Product**
- Review and message moderation is unspecified — only *listing* moderation is
  covered, yet reviews and chat are the more common abuse surface.
- Money representation is never specified. Must be **integer minor units
  (kobo)**, never floating point; Paystack transacts in kobo. Cheap to fix now,
  expensive later.
- No canonical dataset chosen for 37 states / 774 LGAs / neighbourhoods.
- Push provider undecided (Expo Push vs direct FCM/APNs).
- No environment/tenancy plan (separate dev / staging / prod Supabase projects).
- No concrete rate-limit values, AI per-user cost ceiling, or backup/DR targets
  (RPO/RTO) — all three are required in principle but never quantified.

**Platform capability**
- **Alternate app icons (Master §33) are iOS-only in practice.** iOS supports
  `setAlternateIconName`. Android has no supported equivalent; the
  `activity-alias` technique force-kills the running app and is fragile. Master
  §33 itself says *"do not promise unsupported operating-system capabilities"* —
  so this feature should ship iOS-only, with the setting hidden on Android.
- **Sign in with X** (Build §24) requires a paid X API tier for OAuth; needs
  budget confirmation. Sign in with Apple is correctly required, since Apple
  mandates it wherever third-party social login is offered.
- **Travelgate requires a signed commercial agreement** before any credentials
  exist. External hotel inventory cannot be built or tested against the real
  provider until then — the mock adapter (Build §14) is the mitigation, but the
  contract is on the critical path for launch.
- Glass/blur and 3D materials (Design §5/§6) versus low-end Android performance
  (Design §20, Build §31) is a real tension. Backdrop blur is costly on Android
  in React Native. A concrete device-tier degradation ladder is needed, not just
  the principle "fall back gracefully".

---

## 6. Checklists (Master §1)

Maintained from intake onward. Each expands into its Phase-0 document at 15/15.

- [ ] **Requirements** — consolidated across all three documents; conflicts in §4.
- [ ] **Architecture** — monorepo, Supabase/NestJS boundary (C-07), adapters.
- [ ] **Design system** — tokens, materials, typography, icon tiers, motion.
- [ ] **API / integration** — versioned API surface, 8 provider adapters.
- [ ] **Security** — OWASP baseline, RBAC, media validation, webhook replay.
- [ ] **Mobile** — Expo/EAS, permissions, deep links, store readiness.
- [ ] **Admin** — 9 domains, roles, moderation workspace, audit logs.
- [ ] **Agent Mode** — application state machine, workspace IA (C-04, C-06).
- [ ] **Booking / payment** — booking + payment state machines, idempotency.
- [ ] **AI** — tool layer, grounding classes, injection defence, evals, budgets.
- [ ] **Localisation** — 4 languages, keys, plurals, locale formatting.
- [ ] **Launch** — store metadata, legal, data safety, monitoring, rollback.

---

## 7. Open questions for the owner

1. ~~C-01 — reference authority.~~ **Resolved 2026-07-28:** per-image A/B/C
   levels assigned by the owner; see §1 and §4 C-01.
2. **C-06 — must Agent Mode ship on mobile, web, or both for MVP?**
3. **C-08 — confirm the MVP surface cut** once the Phase-0 audit proposes one.
4. Is the **Travelgate commercial agreement** signed, in progress, or not started?
5. Commission rate, cancellation policy tiers, and KYC standard for agent payouts.
6. Is there budget for the **paid X API tier**, or should Sign in with X be cut?
7. Should the repository be renamed from `read-it-well` to match the product?

---

## 8. What happens next

1. Owner supplies design references 01…15. Each is acknowledged, its system area
   recorded, and its IA/component/state facts added to this file.
2. At **15/15**: full product audit (Master §2) — all three documents, all 15
   references, and this intake file are synthesised into the Phase-0
   documentation set.
3. Phased implementation plan proposed (Master §56 / Build §42), with the MVP
   scope recommendation from C-08.
4. Owner approves. Only then does implementation begin.
