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
- `apps/web/src/app/css/inspection.css` (new, imported by
  `components/app/inspections/InspectionSheet.tsx`, so `globals.css` is not
  touched; its classes are `nf-ix-*`, so the old `nf-insp-*` rules in
  `threads.css` no longer reach this surface)

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
- admin-review: `app/admin/_review/**` (the review desks' own area
  stylesheet, presentational parts and pure helpers; no data access), and
  listings (queue and the single listing under review),
  moderation, kyc (verification), queue, support.
- admin-money: money, escrow, supply, bookings, payments.

### 8. The welcome email (founder instruction, 22 September)
Session B owns the welcome email's DESIGN AND WORDS. Session A owns wiring the
send (`lib/notify/welcome.ts`, `welcomeOnce`, the `welcomed_at` guard, the
callers in `lib/auth/actions.ts`) and Session B does not touch any of that.
- `apps/web/src/lib/email/welcome-message.ts` (new): the welcome template moves
  here, all role versions, HTML, preheader and plain text.
- `apps/web/src/lib/email/welcome-message.test.ts` (new)
- `apps/web/src/lib/email/messages.ts`: ONLY the `welcome` function, its
  `WelcomeData` type and the helpers used by nothing else, until the move lands;
  after it, the single re-export line. **Session A: please do not edit the
  welcome template while this entry stands.** Every other message in that file
  stays yours.
- NOT `lib/email/shell.ts`, `render.ts`, `theme.ts`, `client.ts`,
  `recipients.ts`, `fixtures.ts`: shared, Session A's. Anything the welcome
  needs there is raised below as a request.
- The screen the email's button lands on is a Session B surface (`/welcome` or
  another listed above), so the tap-through feels like the email that sent it.

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
agrees with both. R3 to R7 are read and acknowledged as well: the slogan is gone
with no replacement; the admin console designs its empty state as the real state
and never prints a figure the database did not return; the review queue and the
listing under review are Session B's while the lister's notification centre and
search by listing ID stay with Session A, and every fee line names whose fee it
is; the two token traps are not to be reintroduced; Operations starts from the
functions and tables R7 names. The rule in `docs/design/references/roles/README.md`
that images govern form and never claims binds every Session B worker, and every
refused render element is recorded in `docs/BUILD_SESSION_B_LEDGER.md`.

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
### Requests from admin-review (listings, moderation, verification, queue, support)

Every one of these is a function in `apps/web/src/lib/admin/**`, which Session B
does not edit. Each panel it feeds is built against a typed prop of exactly the
shape below and, until the function lands, says on the panel that its data is
not wired yet. Wiring it is then one line in the route. All reads behind
`requireAdmin`, same `AdminRead<T>` envelope as the rest of the layer.

AR-1. **`getListingStatusCounts(): Promise<AdminRead<Record<ListingStatus, number>>>`**
   in `queries.ts`. One exact `count: "exact", head: true` read per value of
   `listing_status` (DRAFT included, the screen leaves it out). Reads
   `listings.status`. Feeds the status tab counts on `/admin/listings` and the
   Queue health donut. Why: no read returns per-status totals today;
   `getQueueCounts().listings` is one sum of three statuses, and counting the
   rows of a page is a total from a capped list.

AR-2. **`getListingReviewTimes(): Promise<AdminRead<{ thisWeek: ReviewTimes; lastWeek: ReviewTimes }>>`**
   with `type ReviewTimes = { decisions: number; medianMinutes: number | null; meanMinutes: number | null }`,
   weeks as Lagos rolling seven-day windows ending now. Reads `audit_log` rows
   with `action = 'listing.review'` (their `created_at`) joined to the listing's
   `submitted_at`, because `listings.reviewed_at` is overwritten on every
   decision and cannot give history. Feeds the Average review time card and
   its week-on-week delta.

AR-3. **`getListingForReview(id: string, filter?: AdminQueueFilter): Promise<AdminRead<ListingForReview | null>>`**
   where `ListingForReview = ListingReviewView & { amenities: string[]; latitude: number | null; longitude: number | null; availableFrom: string | null; lister: ListerVerification | null; nextId: string | null; previousId: string | null }`
   and `ListerVerification = { name: string; role: "owner" | "agent" | "firm" | null; avatarUrl: string | null; verified: boolean; tier: number; rungs: { kind: "identity" | "address" | "payout" | "in_person"; status: "passed" | "failed" | "pending" }[] }`.
   Reads `listings` (the existing `LISTING_COLUMNS` plus `latitude, longitude,
   available_from`), `listing_amenities -> amenities(label)`, `agents
   (display_name, verified, verification_tier, type, application_id, user_id)`,
   `agent_applications.supply_role`, `profiles.avatar_url`,
   `agent_verification_checks (kind, status)`. `nextId` is the next listing in
   the waiting bucket under the same filter and order the queue uses, so the
   desk can load the next listing after a decision. Feeds
   `/admin/listings/[id]`: the Location map, Amenities, Availability, the Lister
   verification panel and "next after decision". Why: no read takes an id; the
   route finds its row inside a `getListingSubmissions` page meanwhile, and a
   listing outside that page cannot be opened.

AR-4. **`ListingReviewView` gains `listerRole: "owner" | "agent" | "firm" | null`**
   (from `agent_applications.supply_role` through `agents.application_id`,
   falling back to `agents.type`: business is "firm", individual is "agent")
   and `coverPhoto: string | null`. Feeds the role tag beside the lister on
   every queue row.

AR-5. **`getListingSubmissions` pages the decided bucket.** It is `.limit(10)`
   with no offset, so the Live, Rejected and Suspended tabs can never show more
   than the ten most recent. Request: honour `filter.offset` and return
   `full` for the decided bucket when a decided status is filtered.

AR-6. **`getReports(filter & { category?: string })`**: narrow on
   `reports.category` in the query (values from `reports_category_chk`, plus
   `"uncategorised"` for null). Feeds the reason tabs on `/admin/moderation`.
   Filtering a fetched page instead would search only what the page cap
   returned.

AR-7. **`getModerationSummary(): Promise<AdminRead<ModerationSummary>>`** with
   `ModerationSummary = { openReports: number; reviewingReports: number; held: { posts: number; stories: number; comments: number; bios: number }; olderThan24h: { reports: number; held: number }; byCategory: Record<string, number>; medianResponseMinutes: { thisWeek: number | null; lastWeek: number | null }; newThisWeek: number; newLastWeek: number; newPerDay: number[] }`
   (`newPerDay` is fourteen Lagos days, oldest first). Reads `reports
   (status, category, created_at, resolved_at)` and the `status = 'HELD'` rows
   of `posts`, `stories`, `story_comments`, `social_profiles.bio_status`.
   Feeds the Total reports and Over 24 hours cards with their deltas and
   sparklines, the Report breakdown donut and the Queue health panel.

AR-8. **`getVerificationSummary(): Promise<AdminRead<VerificationSummary>>`** with
   `VerificationSummary = { awaiting: number; passedToday: number; failedToday: number; passedYesterday: number; failedYesterday: number; awaitingLastWeek: number | null; medianDecisionMinutes: { thisWeek: number | null; lastWeek: number | null }; documents: Record<"pending" | "approved" | "rejected", number>; rungs: Record<"identity" | "address" | "payout" | "in_person", { passed: number; failed: number; pending: number }>; recent: { documentId: string; name: string | null; kind: string; subtype: string | null; approved: boolean; decidedAt: string }[] }`
   (`recent` is the ten latest by `reviewed_at`). Reads `agent_documents
   (review_status, uploaded_at, reviewed_at, kind, subtype, uploader_id,
   application_id)`, `agent_verification_checks (kind, status)`, `profiles`.
   Feeds all four KPI cards on `/admin/kyc`, the Verification funnel, the Rung
   results panel (the render's "Provider performance": no provider or match
   score is recorded anywhere, so the rungs are what is real) and Recent
   verifications.

AR-9. **`getKycQueue` counts `pendingCount` over a 300-document cap** and
   `decided` is sliced to twenty subjects. Request: `pendingCount` from its own
   exact count read, and `capped: boolean` on the result so the desk can say
   when the list is not all of it.

### Requests from inspection (the property inspection surface)

Session B has not made these; the surface ships the honest state around each.
Checked by read-only SQL against production on 22 September.

I1. **The room-by-room checklist, the report notes and the report photos have
   nowhere to live.** F6A8A482 draws eight ticked rows (Exterior, Interior,
   Kitchen, Bathrooms, Utilities, Appliances, Safety, Overall Condition), a
   notes field and Add Photos, all belonging to one inspection. Production has
   `inspection_requests` (state, two times, two notes, outcome) and
   `inspection_confirmations`, and no table, column or bucket for any of the
   three. The surface therefore shows the four-rung ladder the row can prove
   and the two notes read-only. Migration requested:
   ```sql
   create table public.inspection_reports (
     inspection_id uuid primary key references public.inspection_requests(id) on delete cascade,
     author_id uuid not null references auth.users(id),
     notes text check (char_length(notes) <= 2000),
     submitted_at timestamptz,
     created_at timestamptz not null default now(),
     updated_at timestamptz not null default now()
   );
   create table public.inspection_report_items (
     inspection_id uuid not null references public.inspection_reports(inspection_id) on delete cascade,
     item text not null check (item in ('exterior','interior','kitchen','bathrooms','utilities','appliances','safety','overall')),
     checked boolean not null default false,
     note text check (char_length(note) <= 400),
     checked_at timestamptz,
     primary key (inspection_id, item)
   );
   create table public.inspection_report_photos (
     id uuid primary key default gen_random_uuid(),
     inspection_id uuid not null references public.inspection_reports(inspection_id) on delete cascade,
     item text,
     storage_path text not null,
     created_at timestamptz not null default now()
   );
   ```
   RLS on all three: select for either party of the parent
   `inspection_requests` row (requester_id or lister_id = auth.uid()) and for
   admins; insert and update only while the parent is `CONFIRMED`, and only by
   a party; no update once `submitted_at` is set; no delete policy. A private
   bucket `inspection-photos` with path `<inspection_id>/<uuid>.<ext>` and the
   same party rule on `storage.objects`. A trigger on `inspection_reports`
   when `submitted_at` goes from null to a value: move the parent to
   `COMPLETED` in the same transaction (so the existing
   `notify_inspection_change` tells both sides) and refuse it unless all eight
   items are checked, which is the render's disabled-until-complete rule held
   in the database rather than only in the button. When it lands, Session B
   adds `saveReportItem`, `saveReportNotes`, `addReportPhoto` and
   `submitReport` to `lib/inspections/actions.ts` and swaps the ladder for the
   eight rows.

I2. **Add `public.inspection_requests` to the `supabase_realtime`
   publication.** Today only `notifications` is published. The surface
   re-reads when a notification about an inspection arrives for the reader
   (`InspectionsLive`), which covers every state change because
   `notify_inspection_change` writes one to the other party; publishing the
   table itself would also cover a party who has muted that notification
   kind. `alter publication supabase_realtime add table public.inspection_requests;`
   (row visibility already follows `inspection_requests_select_party`).

I3. **The thread does not read `?attach=1`.** Add Photos links to
   `/messages/<conversation>?attach=1`, meaning "open with the photo picker
   up". `app/(app)/messages/[id]/ThreadView.tsx` (not Session B's) ignores the
   parameter, so the person lands in the thread and taps the paperclip
   themselves. Request: open the composer's attach control on arrival when
   the parameter is present.

I4. **`threads.css` carries dead `nf-insp-*` rules** (the hero, card, facts,
   ladder, notes and their light twins, roughly lines 1020 to 1400 and 1429
   to 1455) that only `InspectionSheet` used. The sheet now draws from
   `app/css/inspection.css` under `nf-ix-*`. `InspectionRows` still uses
   `nf-insp-row__state` and `nf-insp-row__controls`, so those two stay; the
   rest can be deleted by whoever owns `threads.css`.

