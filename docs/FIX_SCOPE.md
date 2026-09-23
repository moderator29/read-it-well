# Fix scope: who holds which file

The audit session (docs/THE_AUDIT.md, branch `claude/vallo-audit-app-store-jzmmd4`) and the build of
docs/THE_HUNDRED.md (branch `claude/vallo-hundred-recommendations-xclnva`) work in parallel. This file is where
either side claims a file the other holds before touching it.

## Held by the audit session (not touched by the build)

Security, RLS and the existing schema; money and escrow correctness; store compliance; the build pipeline
(including `package-lock.json`, which is out of sync with `apps/web/package.json` on main: `npm ci` fails on
`@capacitor/push-notifications`, `npm install` succeeds); the claims sweep; the repository cleanup; every file named
in an audit finding; and V-01 (catalogue canary), V-02 (claims build check), V-17 (error screens), V-33 (rent charge
settlement).

## How the build touches shared files

- **Dictionary.** New copy goes in its own module beside `packages/i18n/src/locales/price-check.en.ts`, reached from
  `en.ts` by one import and one line. No existing key is edited except where a claim below names it.
- **Migrations.** New files only, never an edit to an applied migration. Each is proven against the live schema with a
  probe that ends in a deliberate raise, so nothing persists, and is applied when the branch merges.
- **Audit-named files.** Touched only additively (a new import, a new branch in a switch, a new export), and every such
  touch is claimed below with its V-number.

## Claims by the build

| File | V | What the build changes | State |
|---|---|---|---|
