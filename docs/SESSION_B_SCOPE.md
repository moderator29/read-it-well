# Session B scope

Session B is the second Claude session on this repository, rebuilding five
surfaces against their reference images and wiring them to real data. This
file is the collision contract with the other session. **If a path is listed
here, Session B owns it until this file says otherwise. If it is not listed,
Session B does not touch it.** Updated whenever the scope changes, and pushed
immediately.

Ledger: `docs/BUILD_SESSION_B_LEDGER.md`.

## The five surfaces and their governing images

| Surface | Route | Governing image |
|---|---|---|
| Profile | `/profile` | `50E032EA-4141-4237-88D5-01B3720D87B6.png` |
| Get started (first run) | `/welcome` | `2A49E2F7-F99C-47D3-BB79-075DCC1A0F5D.png` |
| Welcome back (sign in) | `/sign-in` | `55A56F21-0654-4F2D-984B-60A8CE97BB17.png` |
| Wallet | `/wallet` | `6AF37222-1D2E-4200-AB23-E55A24AE5E4F.png` |
| Send money | `/wallet/send` | `77A54EA3-BBB5-4BF4-B3A5-144C99CABAF7.png` |

The founder uploaded these five (with the admin and inspection images below)
to the repository root on 22 September. The root copies of
the five above are the governing targets for this work.

## FOUNDER REASSIGNMENT, 22 SEPTEMBER, READ THIS FIRST

The founder has moved two more areas to Session B, in his words "that's even the
reason we are here the most": **the whole admin console** (every area in the four
admin images uploaded to the root: `5EAA44CB` overview, `01F7DFC7` moderation,
operations and analytics, `8E9602E2` escrow, verification and supply,
`C1D98B3C` listings queue, listing under review and money) and **the inspection
surface** (`F6A8A482`). From this commit the files listed under "Admin console"
and "Inspection" below are Session B's. **Other session: please stop editing
them and put anything you need there into your own ledger as a request to
Session B; Session B reads it.** Anything in flight on those files, push it now;
Session B pulls before every push and will not overwrite your commits.

Migrations stay the other session's. Where admin needs a new view, function or
policy, Session B writes it as a request below.

| Surface | Route | Governing image |
|---|---|---|
| Admin overview | `/admin` | `5EAA44CB-5262-4781-8FE8-6704CE9A496C.png` (root) |
| Admin moderation, operations, analytics | `/admin/moderation`, `/admin/operations`, `/admin/analytics` | `01F7DFC7-65F8-4EAB-B051-421B6AEA1214.png` |
| Admin escrow, verification, supply | `/admin/escrow`, `/admin/kyc`, `/admin/supply` | `8E9602E2-0E75-4623-8813-A10D2165CE27.png` |
| Admin listings queue, listing under review, money | `/admin/listings`, `/admin/listings/[id]`, `/admin/money` | `C1D98B3C-D7B7-4B2D-9182-79E0F89ED287.png` |
| Inspection | `/inspections` and the inspection detail | `F6A8A482-657B-4836-B30A-1A0578BC3FBA.png` |

## Files Session B owns

### Profile
- `apps/web/src/app/(app)/profile/page.tsx`
- `apps/web/src/app/(app)/profile/AccountHero.tsx`
- `apps/web/src/app/(app)/profile/AccountBody.tsx`
- `apps/web/src/app/(app)/profile/SignedOutHero.tsx`
- `apps/web/src/app/(app)/profile/loading.tsx`
- `apps/web/src/app/(app)/profile/profile.css` (new, imported by the route, so `globals.css` is not touched)
- `apps/web/src/app/(app)/profile/*.test.ts` (new)
- NOT `profile/setup/**` and NOT `profile/application/**`

### Get started
- `apps/web/src/app/welcome/**`
- `apps/web/src/components/app/welcome/**`
- `apps/web/src/app/(auth)/start/**`
- `apps/web/src/proxy.ts`, ONE LINE ONLY: taking `welcome` out of
  `PRODUCT_SEGMENTS`, because the proxy sends a signed-out visitor to sign in
  before any page runs and first run must be reachable signed out. Nothing
  else in the file is Session B's.
- `apps/web/tests/gate.spec.mjs`, the matching line only: `/welcome` moves from
  the product list to the public list (and `/start` is classified public).
- `apps/web/tests/session-b-welcome.spec.mjs` (new)

### Welcome back
- `apps/web/src/app/(auth)/sign-in/**`
- `apps/web/src/app/(auth)/layout.tsx`
- `apps/web/src/components/auth/AuthChoices.tsx`
- `apps/web/src/components/auth/EmailAuthForm.tsx`
- `apps/web/src/components/auth/fields.tsx`
- `apps/web/src/app/css/auth.css`

### Wallet and Send money
- `apps/web/src/app/(app)/wallet/**`
- `apps/web/src/components/app/wallet/**`
- `apps/web/src/app/css/wallet.css`

### Admin console: shell, overview, operations, analytics (worker admin-shell)
- `apps/web/src/app/admin/layout.tsx`, `apps/web/src/app/admin/page.tsx`,
  `apps/web/src/app/admin/loading.tsx`, `apps/web/src/app/admin/error.tsx`
- `apps/web/src/app/admin/_components/**`
- `apps/web/src/app/css/admin.css`
- `apps/web/src/app/admin/operations/**`, `apps/web/src/app/admin/analytics/**`,
  `apps/web/src/app/admin/alerts/**`, `apps/web/src/app/admin/audit/**`
- the register sweep of every admin route not claimed by another worker below
  (agents, businesses, examples, fees, flags, reference, reports, social,
  standing, stops, switches, payments), styling only unless a control is broken

### Admin console: review desks (worker admin-review)
- `apps/web/src/app/admin/listings/**`, `apps/web/src/app/admin/moderation/**`,
  `apps/web/src/app/admin/kyc/**`, `apps/web/src/app/admin/queue/**`,
  `apps/web/src/app/admin/support/**`

### Admin console: money desks (worker admin-money)
- `apps/web/src/app/admin/money/**`, `apps/web/src/app/admin/escrow/**`,
  `apps/web/src/app/admin/supply/**`, `apps/web/src/app/admin/bookings/**`

### Inspection (worker inspection)
- `apps/web/src/app/(app)/inspections/**`
- `apps/web/src/components/app/inspections/**`
- `apps/web/src/app/agent/inspections/**`
- `apps/web/src/lib/inspections/**`

### Shared, additive only
- `packages/i18n/**` dictionaries: ADDING keys inside the `sessionB` namespace or
  inside the existing `wallet`, `profile`, `auth`, `welcome`, `admin` and `inspections` namespaces, in all
  four locales, by text edit. Never restructuring.
- Tests under `apps/web/tests/**` that cover Session B's surfaces, new files only,
  named `session-b-*.spec.*` or `session-b-*.test.*`.

### Docs
- `docs/SESSION_B_SCOPE.md` (this file)
- `docs/BUILD_SESSION_B_LEDGER.md`
- `docs/design/proofs/session-b/**` (screenshots and comparisons)

## Files Session B will never edit

Design token files (`packages/design-tokens/**`), every stylesheet not listed
above (including `globals.css`, `social.css`, `light.css`, `buttons.css`,
`glass.css`), `packages/i18n` structure, `docs/DESIGN_DIRECTION.md`,
`docs/CATALOGUE.md`, `docs/design/CATALOGUE.md`, `docs/BUILD_07_LEDGER.md`,
every handoff document, every migration, and every listing, host, escrow or
supply file OUTSIDE `apps/web/src/app/admin/**` (the admin pages for those
areas are Session B's since the reassignment above; the user-facing and
server-side listing, host, escrow and supply code is not).

## Requests to the other session

Changes Session B needs in files it does not own. Session B has NOT made
these; it is carrying on around them.

1. (none yet; appended as they are found)
