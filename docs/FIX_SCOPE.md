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
| `apps/web/src/lib/agent/payout-actions.ts` | SCUML 20 | One import and one guard: a payout account is not added until the PEP question has been answered once (`pepQuestionRefusal`) | Claimed |
| `apps/web/src/app/(app)/verification/page.tsx`, `apps/web/src/app/agent/earnings/page.tsx` | SCUML 20 | One import and one element each: the PEP question panel, drawn for listers only | Claimed |
| `apps/web/vercel.json`, `apps/web/src/lib/admin/reads/jobs.ts`, `docs/ADMIN_CONSOLE.md` | SCUML 15 | One new cron entry (`risk-classes`), its registry line and its handbook row; the stated count moves from 11 to 12 | Claimed |
| `public.listings`, `public.payout_accounts`, `public.bank_accounts` (triggers only) | SCUML 15 | New BEFORE triggers `*_zz_scuml15_edd_gate` that only refuse a high-risk person without a cleared EDD review; nothing existing is edited | Claimed |
| `public.transactions`, `public.escrows`, `public.wallet_entries`, `public.rent_payments` (triggers only) | SCUML 20 | New AFTER triggers `*_zz_scuml20_pep_watch` that only enqueue a review, inside their own exception block, so money code is never blocked | Claimed |
| `docs/RETENTION_SCHEDULE.md` | SCUML 20, 15 | New section 3.3a, additive | Claimed |
| `apps/web/src/proxy.ts`, `apps/web/src/proxy.test.ts` | SCUML 15 | `/api/cron/risk-classes` added to `PUBLIC_API_PATHS` (the sign-in wall blocked Vercel Cron) and to the test's list, plus a test that every cron path in `vercel.json` is public | Claimed |
| `apps/web/src/lib/admin/actions.ts` | SCUML 15 | One import and one line in `reviewListing`: the EDD gate refusal (RM175) is named for the admin | Claimed |
| `apps/web/src/lib/payments/bank-accounts-actions.ts` | SCUML 15, 20 | Two imports, a PEP-answer check for listers only, and a neutral line for the EDD gate refusal (RM175) | Claimed |
| `apps/web/src/components/agent/AgentShell.tsx` | SCUML 20 | One import and one element: the PEP banner until a lister has answered | Claimed |

## The audit session's statement of ownership

The **audit fix session** works on branch `claude/vallo-audit-app-store-jzmmd4`. It owns:
- security, RLS and the schema;
- money and escrow correctness;
- store compliance;
- the build pipeline and the tests;
- the claims sweep;
- the repository cleanup;
- every file named in a finding in `docs/THE_AUDIT.md`;
- V-33, the live rent charge, taken from THE_HUNDRED;
- the items THE_HUNDRED lists as "Handed to the audit session".

The **recommendations session** owns the new features and surfaces from `docs/THE_HUNDRED.md` that no audit finding touches.

**To claim a file the other session holds,** add a line below and work on something else until the other session releases it.

### Claims by the audit session

(none yet)
