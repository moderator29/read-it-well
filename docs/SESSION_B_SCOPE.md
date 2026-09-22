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
- `apps/web/src/app/(app)/profile/belongings.ts` (new: pure helpers for the row values and the Switch role line)
- `apps/web/src/app/(app)/profile/belongings-queries.ts` (new: the head counts and balance the rows carry)
- `apps/web/src/app/(app)/profile/SwitchRoleRow.tsx` (new: the Switch role row, opening the dock's own workspace sheet)
- `apps/web/src/app/(app)/profile/profile-harness` is NOT a file of ours: proofs
  come from a throwaway harness that is never committed.
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

### 6. Inspections (worker inspection)
- `apps/web/src/app/(app)/inspections/**`
- `apps/web/src/components/app/inspections/**`
- `apps/web/src/app/agent/inspections/**`
- `apps/web/src/lib/inspections/**`
- Governing images: `F6A8A482-657B-4836-B30A-1A0578BC3FBA.png` (root and
  `docs/design/references/`), plus anything relevant in
  `docs/design/references/founder/`.

### 7. THE WHOLE ADMIN CONSOLE (founder instruction, 22 September)
Session B owns **`apps/web/src/app/admin/**` in full**, every route under it,
and the admin components:
- `apps/web/src/app/admin/**` (every page, layout, loading, error, route
  component and `_components/**`, including desks that do not exist yet)
- `apps/web/src/app/css/admin.css`
- `apps/web/src/components/admin/**` if it comes to exist
- `apps/web/src/components/agent/charts/**`: ADDITIVE ONLY. New inline SVG
  chart files beside `AreaSparkline.tsx` and `DonutChart.tsx`, and backwards
  compatible extensions to those two; the agent console that uses them today
  must render unchanged.
- `docs/ADMIN_CONSOLE.md` (new, the operations handbook)
- Governing images: `docs/design/references/admin/` (landing now; layout,
  density and UX taken from them, never their purple palette) and the four
  admin renders at the repo root.

**Session B does NOT own `apps/web/src/lib/admin/**`.** The queries and the
actions stay with the other session, which is adding new desks behind new
backend work. Where a panel needs a query that does not exist or returns the
wrong thing, Session B writes it below as a request and ships the honest
state meanwhile.

Standing rules for the console, from the founder:
- Entering the console lands on the overview, every time, before any desk.
- Charts obey the palette and never invent a number: single series on a blue
  ramp for magnitude; one stacked status bar on the existing status four with a
  word on every segment; no charting dependency; a trend panel with no data
  behind it says so and draws nothing.
- Desktop first for the console, then narrow.

Internal split between Session B workers (for Session B's own coordination):
- admin-shell: `layout.tsx`, `page.tsx` (overview), `loading.tsx`,
  `error.tsx`, `_components/**`, `admin.css`, the chart primitives, and the
  operations, analytics, alerts, audit, notifications and scheduled-job desks,
  plus the register sweep of every admin route not listed below.
- admin-review: listings (queue and the single listing under review),
  moderation, kyc (verification), queue, support.
- admin-money: money, escrow, supply, bookings, payments.

### Shared, additive only
- `packages/i18n/**` dictionaries: ADDING keys inside the `sessionB` namespace or
  inside the existing `wallet`, `profile`, `auth`, `welcome`, `admin` and `inspections` namespaces, in all
  four locales, by text edit. Never restructuring.
- Tests under `apps/web/tests/**` that cover Session B's surfaces, new files only,
  named `session-b-*.spec.*` or `session-b-*.test.*`.

### Docs
- `docs/SESSION_B_SCOPE.md` (this file)
- `docs/ADMIN_CONSOLE.md`
- `docs/BUILD_SESSION_B_LEDGER.md`
- `docs/design/proofs/session-b/**` (screenshots and comparisons)

## Files Session B will never edit

Design token files (`packages/design-tokens/**`), every stylesheet not listed
above (including `globals.css`, `social.css`, `light.css`, `buttons.css`,
`glass.css`), `packages/i18n` structure, `docs/DESIGN_DIRECTION.md`,
`docs/CATALOGUE.md`, `docs/design/CATALOGUE.md`, `docs/BUILD_07_LEDGER.md`,
every handoff document, every migration, `apps/web/src/lib/admin/**`, and
every listing, host, escrow or
supply file OUTSIDE `apps/web/src/app/admin/**` (the admin pages for those
areas are Session B's since the reassignment above; the user-facing and
server-side listing, host, escrow and supply code is not).

## Requests to the other session

Changes Session B needs in files it does not own. Session B has NOT made
these; it is carrying on around them.

Session B has read the other session's channel to it, `docs/BUILD_07_LEDGER.md`
section 49 (R1: no NDIC badge; R2: no Buy Airtime, Pay Bills or Swap tiles), and
agrees with both.

1. **Profile, Switch role.** `components/supply/ProfileSwitcher.tsx` (a supply
   file, the other session's) owns the workspace sheet and its only trigger is
   the dock button. The profile's Switch role row opens that same sheet by
   clicking the dock's own trigger (`.nf-tab__link--switch`), falling back to
   `/profile/setup` when no dock is rendered. That is a coupling to a class
   name. Request: an optional `renderTrigger(open)` prop, or an exported
   `openProfileSwitcher()` event, so the row can open the sheet directly.
   Session B will switch the row over the day it lands.

### Requests from admin-money (money, escrow, supply, bookings, payments)

Session B does not own `apps/web/src/lib/admin/**`. Each panel below is built
in full against a typed prop of exactly the shape asked for (the types live in
`apps/web/src/app/admin/money/_desk/contracts.ts`, so the function can return
them verbatim), and it draws an honest "not wired yet" state until the
function lands. Every function is a READ, goes through `requireAdmin()` and
the admin's own RLS client (the tables below all carry an `*_select_admin` or
`*_admin_all` policy, checked live on 22 September), and returns
`AdminRead<T>`. Money is integer kobo throughout. "Uncapped" means computed in
Postgres (a view or a `security definer` function repeating the role check),
not summed in TypeScript over a `limit`ed read.

2. **`getMoneyPulse(): Promise<AdminRead<MoneyPulse>>`** in
   `lib/admin/money-queries.ts`. Feeds the four KPI cards on `/admin/money`.
   Reads `wallet_entries (direction, amount_minor, status, kind, created_at)`,
   `escrows (state, amount_minor, held_at, released_at, refunded_at,
   resolved_at)`, `transactions (status, amount_minor, created_at)`. Uncapped.
   ```ts
   type MoneyPulse = {
     asOf: string;                       // ISO, when computed
     floatMinor: number;                 // sum of COMPLETED credits minus COMPLETED debits, every wallet
     floatWeekAgoMinor: number;          // the same, over entries created before asOf - 7 days
     inEscrowMinor: number;              // HELD + RELEASE_REQUESTED + DISPUTED, every escrow
     inEscrowWeekAgoMinor: number;       // escrows held at asOf - 7 days (held_at <= t and not settled by t)
     settledMinor: { thisWeek: number; lastWeek: number };  // COMPLETED entries, rolling 7 days and the 7 before
     failedCharges: {                    // FAILED transactions plus FAILED wallet deposits
       thisWeek: { count: number; amountMinor: number };
       lastWeek: { count: number; amountMinor: number };
     };
   };
   ```
3. **`getMoneyFlow(months = 12): Promise<AdminRead<MoneyFlow>>`** in
   `lib/admin/money-queries.ts`. Feeds "Money in vs money out" and
   "Transaction summary". Reads `wallet_entries (direction, amount_minor,
   status, created_at)`, COMPLETED only, bucketed by Lagos calendar month.
   Uncapped.
   ```ts
   type MoneyFlow = {
     months: { month: string /* YYYY-MM */; inMinor: number; outMinor: number }[]; // ascending, zero months included, from the first month with an entry
     last30Days: { inMinor: number; outMinor: number };
     firstEntryAt: string | null;
   };
   ```
4. **`getLedgerPage(filter: MoneyFilter & { page: number; pageSize: number }): Promise<AdminRead<LedgerPage>>`**
   in `lib/admin/money-queries.ts`. Feeds the Ledger table and its numbered
   pager. Same `q`, `from`, `to` contract as `getMoneyConsole`. `total` is an
   exact count; `balanceAfterMinor` is the platform float immediately after
   the entry (a window sum in Postgres), null when a filter is applied because
   a running balance over a filtered subset is not a balance.
   ```ts
   type LedgerPage = {
     rows: {
       id: string; createdAt: string; kind: string; direction: "credit" | "debit";
       amountMinor: number; status: string; reference: string; note: string | null;
       ownerName: string | null; balanceAfterMinor: number | null;
     }[];
     total: number; page: number; pageSize: number;
   };
   ```
5. **Export `RECENT_LIMIT` and `WALLET_LIMIT` from `lib/admin/money-queries.ts`.**
   Until 2 to 4 land, `/admin/money` derives the float, the week's
   settlement, the flow chart and the ledger's running balance from
   `getMoneyConsole()` ONLY when its result is provably whole (no filter,
   fewer than 60 entries, fewer than 40 wallets). The page mirrors those two
   numbers today; exporting them stops the gate drifting from the read.
6. **`getEscrowPipeline(): Promise<AdminRead<EscrowPipeline>>`** in
   `lib/admin/money-queries.ts`. Feeds the state pipeline, "Escrow by
   purpose" and "Recent activity" on `/admin/escrow`. Reads `escrows` (every
   state and timestamp column) and `listings (title)`. Uncapped counts; the
   activity list is the newest 8 transitions across `funded_at`, `held_at`,
   `release_requested_at`, `released_at`, `refunded_at`, `disputed_at`,
   `resolved_at`.
   ```ts
   type EscrowPipeline = {
     byState: Record<EscrowState, { count: number; amountMinor: number }>;
     byPurpose: Record<EscrowPurpose, { count: number; amountMinor: number }>;
     total: number;
     recent: { escrowId: string; event: "funded" | "held" | "release_requested" | "released" | "refunded" | "disputed" | "resolved"; at: string; amountMinor: number; listingTitle: string | null }[];
   };
   ```
7. **`getEscrowConsole` additions**: an exact `total` for the narrowed read
   (the numbered pager needs a page count), and `fundedAt`,
   `releaseRequestedAt`, `disputedAt`, `listingId` and the cover photo path on
   `EscrowView` (the live table draws a thumbnail and "days held" from
   funding). The `SUMMARY_LIMIT` floor on `totals` should become the same
   aggregate as request 6.
8. **`getReconciliationHealth(days = 7): Promise<AdminRead<ReconciliationHealth>>`**
   in a lib module of the other session's choosing. Feeds "Reconciliation
   health" on `/admin/money` and "Reconciliation check" on `/admin/escrow`.
   Until it lands both panels read the newest page of
   `wallet.reconciliation.run` rows through the existing `getAuditLog` and
   say "of the last N runs"; what that cannot see is
   `private.reconciliation_watch` (the job's last HTTP reply and verdict),
   which is the half that caught the three silent weeks.
   ```ts
   type ReconciliationHealth = {
     windowDays: number; runs: number; clean: number; needsAttention: number;
     expectedRuns: number;               // from the schedule, so a missed run lowers the figure
     lastRunAt: string | null; lastCleanAt: string | null;
     lastReply: { at: string; status: number | null; verdict: string } | null; // from private.reconciliation_watch
   };
   ```
9. **`getSupplyConsole(filter: { role?: "owner" | "agent" | "firm" | "host"; examples?: boolean; page: number; pageSize: number }): Promise<AdminRead<SupplyConsole>>`**
   in a new `lib/admin/supply-queries.ts`. Feeds every panel on
   `/admin/supply`. Reads `agents (id, user_id, display_name, type, status,
   verified, is_demo, created_at, application_id)`, `agent_applications
   (supply_role)`, `businesses (id, owner_id, agent_id, kind, name, status,
   verified, is_demo, created_at, area, city)`, `listings (agent_id,
   property_type, status, area, city, is_demo)`, `accommodations
   (business_id, status, is_demo)`, `escrows (payee_id, amount_minor,
   released_at)`, `bookings (listing_id, status, total_minor)`. Role follows
   `lib/supply/workspaces-queries.ts`: an agent row is owner or agent by
   `agent_applications.supply_role`, falling back to `kindFromAgentType`; a
   business is a firm when `kind = 'agency'`, otherwise a host. Examples
   (`is_demo`) are excluded unless asked for, and counted separately so the
   page can say how many it left out. Uncapped.
   ```ts
   type SupplyRoleKey = "owner" | "agent" | "firm" | "host";
   type SupplyConsole = {
     counts: Record<SupplyRoleKey, { now: number; weekAgo: number }>;
     examplesExcluded: number;
     rows: {
       id: string; kind: "agent" | "business"; name: string; role: SupplyRoleKey;
       verified: boolean; listings: number; transactedMinor: number; joinedAt: string;
     }[];
     total: number; page: number; pageSize: number;
     growth: { month: string; counts: Record<SupplyRoleKey, number> }[]; // cumulative, ascending, last 6 months
     topAreas: { area: string; count: number }[];                           // live listings plus live accommodations, top 5
     byPropertyType: { type: string; count: number }[];                     // live listings by property_type, descending
   };
   ```
