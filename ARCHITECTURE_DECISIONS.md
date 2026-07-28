# Architecture Decision Record

Every entry states the decision, why it was made, what else was considered, and
what it would cost to change later. Required by Master Rule 22.

---

## ADR-001. npm workspaces monorepo

**Decision.** `apps/*` plus `packages/*`, wired with npm workspaces.

**Why.** The build specification calls for `apps/mobile`, `apps/web`,
`apps/admin`, `apps/api` and shared packages. Starting single-app and splitting
later means rewriting every import path across four surfaces. Master Rule 75
says not to take shortcuts because the current MVP is small.

**Considered.** pnpm and Turborepo. Both are better at scale, but npm ships with
Node and adds no toolchain to learn or break. Turborepo can be added later
without moving a single file.

**Cost to change.** Low. Moving to pnpm is a lockfile regeneration.

**Status.** Active. `apps/web`, `packages/design-tokens`, `packages/i18n` exist.

---

## ADR-002. Two layer design tokens, CSS first

**Decision.** `packages/design-tokens/src/tokens.css` holds a raw palette
(layer 1) and a semantic layer (layer 2). Components may only reference layer 2.
A TypeScript mirror exists for SVG and canvas, where `var()` and `color-mix()`
are not reliable.

**Why.** Master Rules 27 and 29 demand a centralised system and forbid stray
colours. CSS custom properties theme at runtime with no re-render, which a JS
token object cannot do.

**Considered.** A JS-only token object consumed through Tailwind config. Rejected
because runtime theme switching then requires a full React re-render, and the
light theme and reduced motion overrides get much harder.

**Cost to change.** Moderate. Renaming semantic tokens is a repo wide find and
replace.

---

## ADR-003. Vector icon family instead of the supplied raster pack

**Decision.** The production icon set is authored as SVG in
`apps/web/src/design-system/icons/`. The supplied pack is kept in
`assets/icon-pack/` as visual reference only.

**Why.** Measured: the supplied sheet is 1300 x 1209 for roughly 192 icons, so
each glyph is about 61 x 59 real pixels, largest 72. A 64px category tile on a
3x display needs 192px of source. Upscaling produces visible softness, and no
slicing technique recovers detail that was never captured. Master Rule 28 asks
for one coherent 3D family; Master Rule 60 says visual effects must not cost
usability, and blurred icons do.

**Considered.** Slicing and serving at native size only. Rejected because it caps
icons at roughly 24px logical on a 3x screen, which is far smaller than the
references use them.

**Cost to change.** Low. `Icon3D` is one component with a glyph registry behind
it, so genuine vector sources can be dropped in without touching call sites.

**Reversal condition.** If vector or high resolution sources for the original
pack appear, prefer them and keep the `Icon3D` API.

---

## ADR-004. Money is always integer minor units

**Decision.** All amounts are stored and passed as integer kobo. Division happens
in exactly one place, `formatMoney` in `packages/i18n`.

**Why.** Floating point money produces rounding drift that surfaces as
reconciliation failures. Paystack transacts in kobo, so this also removes a
conversion at the payment boundary. Master Rule 48 puts financial correctness on
the server; the representation has to be right before that matters.

**Considered.** Decimal strings. Heavier and needs a library for arithmetic.

**Cost to change.** Very high after any real transaction exists. This is the
cheapest possible moment to fix it, which is why it is fixed now.

---

## ADR-005. Data access behind a repository interface from day one

**Decision.** Discovery reads through `ListingRepository`. `NF_DATA_SOURCE`
selects a seed implementation or the real API, and the seed source is labelled
in the UI wherever it renders.

**Why.** Master Rule 8 forbids fake functionality and Master Rule 66 requires
provider abstraction. Hardcoding sample listings into components creates work
that has to be deleted later and risks sample data reaching production
unlabelled.

**Considered.** Building the pages against a live API first. Not possible, the
API does not exist. Hardcoding into components. Rejected per above.

**Cost to change.** Very low. One factory function.

---

## ADR-006. Inter as the typeface

**Decision.** Inter Variable, `latin` plus `latin-ext` subsets.

**Why.** Coverage, not fashion. The face has to carry all of: the naira sign
U+20A6; Yoruba `ẹ ọ ṣ` and Igbo `ị ọ ụ`, which are Latin Extended Additional and
need a combining dot below; Hausa `ɓ ɗ ƙ ƴ` from Latin Extended-B; and tone marks
stacking above vowels that already carry a dot below. That last case breaks most
display faces. The supplied mockups themselves show the failure mode, rendering
the naira sign as a plain capital N in several places.

**Considered.** A geometric display face for headings. Deferred until a candidate
is validated against a real four language string set plus ₦.

**Cost to change.** Low. One token and one font import.

---

## ADR-007. Consumer navigation frozen at twelve destinations

**Decision.** Home, Hotels, Apartments, Homes, Restaurants, Experiences, then
Bookings, Messages, Wallet, AI Assistant, Profile, Settings.

**Why.** Master Rule 17 freezes navigation. Three independent source-of-truth
references agree on exactly this list and order, including the brand sheet whose
icon row enumerates all twelve. A fourth reference shows a different consumer
rail, which is recorded as contradiction C-10 and is not adopted.

**Cost to change.** Moderate and rising. Routing, layout shells and permission
boundaries all key off it.

**Open.** The admin rail has four conflicting variants and is NOT decided. No
admin surface is built until the owner picks one.

---

## ADR-008. Security headers at the edge, secrets server side only

**Decision.** `next.config.ts` sets HSTS, `X-Content-Type-Options`,
`X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy` on every route.
Modules that read credentials import `server-only`.

**Why.** Master Rules 9 and 10. The `server-only` guard turns a leaked secret
into a build failure rather than a runtime disclosure, which is the difference
between an inconvenience and an incident.

**Not yet done.** Content Security Policy needs a nonce strategy that works with
Next streaming. Tracked in KNOWN_GAPS.

---

## ADR-009. Dependency overrides for transitive vulnerabilities

**Decision.** Root `overrides` pin `sharp` to ^0.35.3 and `postcss` to ^8.5.23.

**Why.** Next 16.2.12 depends on `sharp` 0.34.5 and `postcss` 8.4.31, which carry
four libvips CVEs and two postcss advisories. `npm audit fix --force` proposes
downgrading Next to version 9, which is absurd. The overrides resolve all six
while the build stays green.

**Residual.** Nine high severity advisories remain in the ESLint toolchain via
`brace-expansion`. They are lint-time only and never reach the shipped bundle or
the request path. Tracked rather than papered over.
