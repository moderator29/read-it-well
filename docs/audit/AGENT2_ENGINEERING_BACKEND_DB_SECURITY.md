# Agent 2: engineering, backend, database and security

Audit run 15 September 2026 against branch `claude/zealous-brown-gn45mg`.
Read-only on the codebase. This file is the only file written.

---

## 1. The rules, restated

1. No em dashes anywhere. Commas, colons, full stops, brackets.
2. British spelling in docs and product copy.
3. Money is integer kobo in a bigint. `Math.round(naira * 100)` only at the
   input boundary. Display only through `formatMoney`. No floats, no manual
   division by 100. Percentages in integer basis points. The ledger balances
   exactly: `gross_minor = platform_fee_minor + agent_share_minor +
   processor_fee_minor`, and `platform_fee_minor` is always zero.
4. Every server action returns the `ActionResult` envelope. Sessions resolve
   through `resolveSession()`: unconfigured, signed-out, signed-in.
5. `BrandIcon` and `UiIcon` only. `Icon` and `Icon3D` are deleted.
6. 390px first.
7. Dark is the default and the operating system does not override it.
8. No fees anywhere. The engine exists and is zero. Copy never says a platform
   fee is charged.
9. One blue family, emerald for success, rose for error, bright cyan for
   attention and pending. No orange, amber, gold or purple.
10. First-party inventory only. ADR-013.
11. Escrow is promised nowhere until it exists.
12. No dark patterns.
13. Banned in UI copy: demo, sample, preview, not live, coming soon, lorem.
14. The brand is Vallo. VALLO SPACES LTD on legal surfaces only. RentMe and
    NaijaFinds are dead.

Operating rules I held to: no git writes, no database writes, no edits outside
this file. Branding and legal defects are filed as recommendations tagged
`[TRACK A]`. Other agents' scope is tagged and left.

---

## 2. What I read, what I ran, and what the Supabase tools returned

### Read in full or in the sections named

- `docs/HANDOFF_02_PLATFORM.md` sections 0, 1, 3, 8, 9, 11, 16, 17, 18, 19, 22,
  27, 28, 29, 30
- `docs/HANDOFF_01_COMPANY.md` sections 3, 4 in full (4.1 to 4.8), 6, 7
- `docs/DATABASE_AUDIT.md` in full, including the do-not-fix list
- `RECOMMENDATIONS.md` section index in full, plus `KYC-3`, `RN-3`, `T-1`,
  `N-1`, `P-1`, `W-1`, `W-2`, `E-1`, `V-5`, `SEC-1` to `SEC-7`, `BE-1` to `BE-14`
- `.env.example`, `apps/web/.env.example`
- `apps/web/src/middleware.ts`, `lib/actions/envelope.ts`, `lib/actions/session.ts`
- `lib/auth/actions.ts`, `app/(auth)/reset-password/page.tsx`
- `lib/security/csp.ts`, `rate-limit.ts`, `idempotency.ts`
- `lib/supabase/env.ts`, `admin.ts`
- `lib/wallet/ledger.ts`, `rpc.ts`, `escrow.ts`, `actions.ts` (withdraw and
  transfer paths), `audit.ts`
- `lib/payments/observability.ts`, `yellowcard.ts` (signature and parse)
- `lib/admin/guard.ts`, `audit.ts`, `kyc-actions.ts`, `money-actions.ts`,
  `queries.ts` (flags and application detail), `suspension-queries.ts`,
  `verification-queries.ts`
- `lib/profile/actions.ts` (the deletion path, line by line)
- `lib/flags.ts`, `lib/listings/access-queries.ts`
- All nine API routes: paystack webhook, paystack reconcile, yellowcard webhook,
  auth email-hook, assistant, support, map/listings, csp-report
- `lib/legal/privacy.tsx` and `terms.tsx` (searched, not read line by line)
- `apps/web/eslint.config.mjs`, `package.json`, `scripts/`
- Migrations read in full or in the relevant part: `20260728152104`
  (agents core), `20260728152229`, `20260728152358` (bookings, ledger),
  `20260728202225` (wallet), `20260728222112` (messaging trust),
  `20260730021956` (anon grants), `20260730122616` (documents bucket),
  `20260804122155` (let accounts be deleted), `20260804160509` (listing access),
  `20260804163804` (badge sweep), `20260804184423` (scheduler),
  `20260805102702` (refund, ledger constraints), `20260805153920` and
  `20260806112848` (staff roles), `20260809051007`, `20260809051502`,
  `20260809051720`, `20260809052049`, `20260809053537`, `20260809054243`,
  `20260809080815`, `20260809084522`, `20260809084853`, `20260809093843`

### Ran

- `npm run typecheck` from the repo root. **Clean.** All three workspaces pass.
- Two analysis scripts of my own, in the scratchpad, over `supabase/migrations/`
  and `apps/web/src`:
  - an RPC argument cross-check of every `.rpc()` call site against
    `lib/supabase/database.types.ts`
  - a foreign-key covering-index check and an RLS coverage check
- `git log`, read only.

### The Supabase MCP tools: NOT AVAILABLE for this project

`list_projects` returns three projects in organisation `iejztsattexshfdepthl`:
`verith` (inactive), `ravenspire` (active), and one unnamed inactive project.
**The Vallo project `uccixoonmbhrnyczyigt` named in `docs/DATABASE_AUDIT.md` and
in `apps/web/.env.example` is not among them.** Called twice to be sure:

```
execute_sql(uccixoonmbhrnyczyigt, "select 1")  -> MCP error -32600: You do not
                                                  have permission to perform
                                                  this action
list_migrations(uccixoonmbhrnyczyigt)          -> same error
```

So this session could not reach the live database at all. **Every database
finding in this report is from the migration files, not verified live.** That is
stated again on each one. It is a real limitation and it means a whole class of
finding, the class the handoff warns matters most, was unavailable to me:

- I could not run a functional probe on any database function
- I could not read `cron.job_run_details` or `net._http_response`
- I could not run `get_advisors` to refresh the eleven security and 274
  performance advisories
- I could not compare applied migrations against `supabase/migrations/`, so
  `RECOMMENDATIONS.md` T-4's eight filename mismatches are unchecked
- I could not confirm which migrations are actually applied, so I cannot say
  whether the two savings-pot migrations or the escrow set are live

---

## 3. What I did not check and did not do

Stated plainly and near the top, because a quiet skip is worse than a stated one.

1. **Nothing live.** See section 2. No query was run against the Vallo
   database. No function was probed. No advisor was refreshed.
2. **`cron.job_run_details` and `net._http_response` were not read.** The
   Phase 0 badge-sweep row and the reconciliation health question both need
   them.
3. **Leaked-password protection was not checked.** It is a dashboard setting and
   the dashboard is unreachable from here. Unchanged since `V-5`.
4. **I did not run `npm run lint`, `npm run test` or `npm run build`.** The lead
   is running the baseline concurrently and the brief says not to loop the
   build. Typecheck was cheap and load-bearing for one finding, so I ran that
   one only.
5. **I did not run the Playwright or node specs.** They need a server on port
   3210 and they belong to Agent 3's inventory.
6. **I did not read the 167 migrations in full.** I read roughly 25 in full or
   in the relevant part and searched the rest mechanically. A hand-read of the
   remaining 140 would find more.
7. **I did not read `lib/data/**`, `lib/cache/**`, `lib/messages/**`,
   `lib/reports/**`, `lib/support/**` or `lib/native/**` line by line.** I
   searched them and read the parts the findings touch. `lib/social`,
   `lib/search`, `lib/saved`, `lib/places`, `lib/interests`, `lib/assistant`,
   `lib/inspections`, `lib/reviews`, `lib/trust` are Agent 1's and I read only
   what my own findings required.
8. **I did not audit the agent workspace (`app/agent/**`) as a product.** I read
   its route list and its verification query layer. The brief asked for it as a
   product of its own and I got as far as the admin console and ran out of
   room. This is the largest stated gap in my coverage.
9. **I did not verify whether `public.hold_wallet_withdrawal` is applied live.**
   The migration exists at `20260809080815`. Whether it is applied decides
   whether A2-041 is live or dead code, and I could not check.
10. **I did not measure anything.** No query plan, no timing, no load test. Every
    performance and scalability claim below is reasoned from the code and the
    schema, and I say which.
11. **I did not check the npm advisories** (`SEC-2`) or the dependency tree.
12. **I did not verify the eight cosmetic migration filename mismatches** (T-4).

The word "verified" appears in this report only where I ran something and read
its output. The word "compliant" does not appear as a claim. For NDPC the honest
answer today is not yet.

---

## 4. Phase 0 re-verification, row by row

Each row checked on its own, one thing at a time.

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1 | `<NativeRuntime />` defined but mounted in no layout | **CONFIRMED** | `apps/web/src/components/app/NativeRuntime.tsx` exports `NativeRuntime`. A repository-wide grep for the identifier returns only that file, plus `lib/native/boot.ts` line 8, whose comment claims "`NativeRuntime` in `components/app/` mounts this once from the root layout". That comment is false. No layout imports it. |
| 2 | Four `*.tmp.mjs` scratch files in the repository root | **CONFIRMED** | `ls` of the repository root shows `shot.tmp.mjs`, `shot2.tmp.mjs`, `shot3.tmp.mjs`, `shotrm.tmp.mjs`. All four present. |
| 3 | The badge sweep has a `RAISE` that should not be there | **REFUTED in the migration files. NOT CHECKED live.** | The current definition of `private.sweep_badges()` is `supabase/migrations/20260804163804_sweep_badges_first_stay_evidence.sql`, which supersedes the one in `20260804163732`. It contains no `raise` of any kind. A grep for `raise notice`, `raise warning`, `raise log` and `raise info` across all 167 migrations returns nothing. The only `raise exception` near badges is in `20260809081841`, in the example-lister guard, and it belongs there. I could not read `cron.job_run_details`, so I cannot say what the job has actually been doing. |
| 4 | Four escrow RPCs and their private-schema grants exposed for a feature that does not exist | **REFUTED on both halves. DO NOT REVOKE.** | The four are `public.escrow_hold`, `public.escrow_release`, `public.escrow_refund` and `public.escrow_open`, defined in `20260809053537`. Lines 303 to 306 `revoke all ... from public, anon, authenticated`. Lines 309 to 312 `grant execute ... to service_role` only. They are not exposed to any client role. And the feature does exist: `20260809051720` creates `public.escrows` with an eight-state machine, `20260809052049` adds the locking movement functions and an hourly timeout sweep, `apps/web/src/lib/wallet/escrow.ts` is the client layer with tests, and `apps/web/src/app/admin/escrow/page.tsx` is a console screen. A revoke here would break a built subsystem. |
| 5 | `/verification` is not classified in middleware | **CONFIRMED, and worse than recorded.** | `PRODUCT_SEGMENTS` in `apps/web/src/middleware.ts` does not contain `verification`, and `PRODUCT_PATHS` holds only `/styleguide`. So a signed-out visitor reaches `/verification`. The Phase 0 note says the route "returns an honest stub": that is true only of `submitVerification` in `app/(app)/verification/actions.ts`, which refuses. The route itself is a full multi-step KYC flow (`components/verification/KycFlow`) that asks a person for government identity documents before refusing them at the end. An unauthenticated identity-collection screen is a different defect from a stub. See A2-005 and A2-011. |
| 6 | Leaked-password protection off in Supabase auth settings | **NOT CHECKED.** | Dashboard setting, and the Supabase tools cannot reach this project (section 2). Unchanged from `RECOMMENDATIONS.md` V-5. Still needs the founder. It matters more than its priority suggests: see A2-002. |
| 7 | `TravelTime` looked dead and is not | **CONFIRMED ALIVE.** | `apps/web/src/components/app/listing/TravelTime.tsx` exports `TravelTime`; `app/(app)/listing/[id]/page.tsx` imports it at line 31 and renders it at line 1030. Left as the example it was left as. |

### Three corrections to the brief itself

These are not Phase 0 rows but the brief states them as current, and they are
not.

- **N-1 is done.** The brief lists "signed-out visitors are locked out of the
  whole product" as one of the four largest open P0s. `middleware.ts`
  `PRODUCT_SEGMENTS` no longer contains `search`, `listing`, `rent`, `around`,
  `u` or `post`, and the file's own comment records the change and why.
  `RECOMMENDATIONS.md` N-1 is already marked **DONE**.
- **W-1's dangerous half is fixed.** The brief calls it "the most dangerous
  thing in the tree". `app/api/paystack/webhook/route.ts` now answers 503 on
  `service_role_key_missing`, 401 on a bad signature, 400 on an unreadable
  body and 500 on a write failure, and logs every branch through `logMoney`.
  The yellowcard webhook was written with the lesson already learned. What
  remains of W-1 is the monitoring half: nothing alerts on those lines.
- **E-1 is substantially wrong.** The brief says escrow is "zero percent built,
  ledger vocabulary only". Row 4 above lists the schema, the state machine, the
  locking functions, the cron sweep, the TypeScript layer, the tests and the
  admin screen. `RECOMMENDATIONS.md` E-1 already says "STARTED during this
  pass". The parts genuinely missing are a user-facing flow and the regulatory
  answer, which is E-7. **Rule 11 still binds and is being broken in three
  places today: see A2-021, A2-022 and A2-023.**

Also: the brief says six pg_cron jobs. The migrations schedule **eight**:
`rentme-nightly-badges`, `rentme_release_stale_holds`, `rentme_purge_rate_limits`,
`rentme_purge_idempotency`, `rentme_announce_completed_stays`,
`rentme-daily-note`, `rentme_escrow_sweep_timeouts`, `rentme_reconcile_payments`.
From the migration files, not verified live.

---

## 5. The honest state of my scope

Brutally, and in plain language.

**The database is the best thing in this repository and it is not close.** The
RLS posture is genuinely strong: 77 tables, every one with RLS enabled,
`auth.uid()` wrapped in a scalar subquery, SECURITY DEFINER functions in a
`private` schema with EXECUTE revoked from client roles, and the two places
where a function takes an identifier as an argument have both been hardened so
the caller can only ever act as themselves. `20260806112848` is a model of how
to close a privilege escalation: it names the hole, quotes the probe output
before and after, and fixes the argument-trust pattern as well as the grant. The
ledger conservation constraint `ledger_balances_chk` survives the refund
migration that dropped five of its siblings, which I checked specifically
because that is exactly where such a constraint gets lost. Money moves through
locking functions with `SELECT FOR UPDATE` and unique-reference idempotency. The
identity-document bucket is private with path-scoped policies and signed-URL
reads. This is better than most Series A fintech I have read.

**The application layer around it is uneven, and the unevenness is where the
danger is.** Three findings make that concrete:

1. **Two admin actions are broken by an argument the database no longer takes.**
   `20260809054243` moved `set_fee_rate` and `review_kyc_document` into `public`
   with the acting admin derived from `auth.uid()` rather than passed in, which
   was the right decision and is well argued in the migration's header. Nobody
   updated the two call sites. `lib/admin/kyc-actions.ts` and
   `lib/admin/money-actions.ts` still pass `acting_admin`. PostgREST resolves
   RPCs by parameter name, so both calls should fail to resolve and both
   actions should return their "service down" message every time. **If that is
   right, no admin can approve or reject a verification document, so no agent
   can be verified, so the agent onboarding loop does not close.** Typecheck
   does not catch it. This is A2-061 and A2-062 and it is the single highest
   value thing in this report.
2. **A stolen session is a permanent account takeover.** `/reset-password` gates
   on "is there any session at all", not "is this a recovery session", and
   `updatePassword` does not revoke other sessions. So anyone holding a session
   cookie, or sitting at an unattended signed-in browser, sets a new password
   without knowing the old one and locks the owner out. A2-001.
3. **Account deletion cannot work for any user who matters.** `deleteAccount` is
   one call to `auth.admin.deleteUser`. Three foreign keys to `auth.users` are
   `on delete restrict` and three more have no clause at all. Section 7 works
   through it table by table. A2-026.

**Privacy is the weakest dimension and it is engineering, not paperwork.** The
retention schedule in `docs/RETENTION_SCHEDULE.md` is enforced by nothing: eight
cron jobs run and not one purges a document. Rejected applicants' identity
documents sit in `agent-documents` indefinitely. Nothing deletes a storage
object when an account is deleted or an application is rejected, so the bytes
outlive both the row and the person. And `private.scan_message()` writes the
matched ten-digit run, which is a bank account number or the front of a NIN,
into `public.message_flags.matched` in plain text, where the admin flags screen
then loads it alongside up to 400 messages of the surrounding private
conversation. That is a standing prohibition broken in the database and a
whole-transcript staff read that the terms do not disclose.

**Observability is a one-legged stool.** `logMoney` is excellent: a closed
outcome vocabulary, a stable reason string, integer kobo, no PII, one line per
decision. It is exactly what an alert rule wants. **Nothing consumes it.** No
alert, no aggregation, no dashboard. `cron.job_run_details` is unread,
`net._http_response` is unread, `wallets_overdrawn()` is called only by a
reconciler that is itself inert until two Vault secrets exist. The platform can
tell you what went wrong. It cannot tell you that something went wrong.

**Nothing is enforced mechanically.** There is no `.github/` directory, and
`.git/hooks/` contains no non-sample hook, so the pre-commit `Icon3D` grep the
rules refer to does not exist. `Icon3D` is genuinely gone from the source (two
comments documenting its retirement are all that remain), but that is
discipline, not enforcement. 83 browser specs and 8 vitest files run when
somebody remembers.

**The admin console is far better than the brief implies and has one structural
gap.** 22 sections, a single `requireAdmin()` door, an append-only `audit_log`
with no client write policy and a trigger enforcing it, and mandatory reasons
pushed down to check constraints in three layers for a KYC rejection. The gap is
pagination: `getStopsDesk` reads every approved and suspended agent with no
limit and then every suspension for all of them. At a thousand rows PostgREST
truncates silently and the desk lies. No admin query in the console uses
`.range()`. Zero of them.

**Scores against a shipped competitor:** a Nigerian user can open PropertyPro or
Nigeria Property Centre today. Against those, Vallo's backend is already better
architected and its database is in a different league. What Vallo does not have
is the thing those sites do have, which is that their admin can actually verify
an agent and their retention policy at least matches their notice because their
notice promises less.

---

## 6. Ratings, with the evidence and the cap

Out of 100. A dimension is capped by its worst user-visible failure. Scored
against what a Nigerian user could open today, not against an ideal.

| Dimension | Score | Evidence | The worst user-visible failure that caps it |
|---|---:|---|---|
| **Backend** | 72 | One `ActionResult` envelope, one `resolveSession()` memoised per request with the reasoning written out, service-role work isolated behind `getAdminClient()` returning null rather than throwing, every integration env-guarded and degrading honestly. Nine API routes, each with a stated status-code contract. | Two admin RPC call sites pass an argument the function does not declare (A2-061, A2-062), and typecheck does not catch it. A whole console screen returns "service down" forever. |
| **Database** | 84 | 77 tables, RLS on every one, `(select auth.uid())` throughout, SECURITY DEFINER in `private`, locking money functions, `ledger_balances_chk` intact, 141 of 147 foreign keys covered. Migrations that quote their own probe output. | Six foreign keys added on 9 August have no covering index (A2-071), and the audit document still says the last one was fixed on 7 August. From the migration files. |
| **Security** | 68 | Enforcing CSP with a per-request nonce and `strict-dynamic`, durable Postgres rate limiting, timing-safe webhook signature verification on all three signed endpoints, an escalation closed properly in `20260806112848`, `safeReturnPath` with one implementation and tests. | `/reset-password` accepts any session and a password change revokes nothing, so a stolen cookie is a permanent takeover (A2-001). |
| **Privacy** | 41 | Private document bucket, signed-URL reads, path-scoped storage policies, a notice written to the NDPA rather than copied, a rights channel that reaches a real queue. | `message_flags.matched` stores bank account numbers in plain text and the admin screen loads whole private conversations beside them, undisclosed in the terms (A2-024, A2-025). Retention enforced nowhere (A2-030). |
| **Authentication** | 62 | Email and password with per-IP and per-hashed-address throttling, a reset flow that is a deliberate non-oracle with the reasoning in the file, `getUser()` rather than `getSession()`, device list with the User-Agent forwarded at the source. | Same as Security: A2-001. Plus leaked-password protection off, a floor of eight characters, no complexity or breach check, and a rate limiter that fails open on the sign-in path. |
| **Performance** | 66 | `resolveSession` memoised, a bounded map-bounds endpoint with a shared 30-second cache, `listings_in_bounds` in the database, indexes on the paths that carry traffic. | `availableBalanceMinor` pulls every pending debit row and sums in Node, so above the 1,000-row page it silently understates the held amount (A2-044). Not measured. |
| **Reliability** | 58 | Webhook status codes now mean things, settlement shared between the webhook and the return path, idempotency on the unique reference, a reconciliation sweep that can recover a lost credit. | The reconciler is inert until two Vault secrets exist, and nothing reads `net._http_response`, so a sweep that has been 401ing for a month looks identical to a healthy one (A2-119, A2-121). |
| **Scalability** | 54 | Derived balances, append-only ledger, covering indexes on the hot paths, bounded map queries, viewport loading. | The admin console has no pagination anywhere: `getStopsDesk` reads every agent, then every suspension, then every withdrawn listing, with no limit and no range (A2-101). Fine at zero agents, wrong at a thousand. |
| **Admin panel** | 61 | 22 sections, one `requireAdmin()` door with four honest outcomes, append-only `audit_log` enforced by trigger, mandatory rejection reasons in three layers, `escrow_admin_resolve` and `suspend_agent` authorising off the caller. | The KYC queue cannot record a decision (A2-061). An operator's core job does not work. |
| **Integrations** | 64 | Three signed webhooks all verified timing-safe, Paystack and Yellow Card sharing one `recordFunding`, every client env-guarded, the AI routes degrading to an honest sentence without a key. | The Yellow Card webhook never checks the currency, so a non-NGN settlement credits naira one for one (A2-133). The signature fallback on the `authorization` header is unverified against live docs. |
| **Wallet and financial architecture** | 76 | Derived balances with no balance column, unique-reference idempotency enforced by the database, locking transfer and booking payment, a conservation constraint, contra rows for reversals with a sign check, a fee engine that is always zero. | `withdraw()` falls back to an explicitly unlocked read-then-write path, and `isMissing()` classifies any error containing "does not exist" as a missing function, so a real error inside the locking function silently downgrades withdrawals to racy (A2-041, A2-042). |
| **Production readiness** | 44 | Typecheck clean. Enforcing CSP. Money paths logged. Escrow, savings and crypto all gated so nothing half-built can take money. | No CI, no git hooks, no alerting on any of the good logging, no monitoring, no incident runbook that fires by itself, and the reconciler off. Nothing tells anybody the platform broke. |

---

## 7. The account-deletion audit: exactly what survives

`deleteAccount` in `apps/web/src/lib/profile/actions.ts` does four things:
validate, resolve the session, check `hasServiceRoleKey()`, sign the caller out,
then call `admin.auth.admin.deleteUser(user.id)`. **There is no application-level
cleanup of any kind.** So what a deletion does is entirely decided by the
referential actions on the 57 foreign keys pointing at `auth.users(id)`, and by
what those keys do not reach.

All of the below is **from the migration files, not verified live**, because the
Supabase tools cannot reach this project.

### 7.1 The deletion fails outright for most real users

Six foreign keys to `auth.users` block the delete. Three are explicit
`on delete restrict`; three have no clause, which in Postgres is `NO ACTION` and
blocks just the same.

| Table.column | Action | Who this blocks | Migration |
|---|---|---|---|
| `wallets.user_id` | `on delete restrict` | **Anyone who has ever had a wallet.** Wallets are created lazily by `ensureWalletId` and by six SQL paths, including `transfer_between_wallets` creating one for the RECIPIENT. So a person can be given a wallet by somebody else sending them money and lose the ability to delete their account without ever opening the wallet screen. | `20260728202225_wallet.sql:37` |
| `bookings.guest_id` | `on delete restrict` | Anyone who has ever made a booking. | `20260728152358:31` |
| `escrows.payer_id` | `on delete restrict` | Either party to any escrow, including terminal RELEASED and REFUNDED ones. The migration's own comment justifies restrict for "money in flight", but the constraint does not distinguish in-flight from settled. | `20260809051720:98` |
| `escrows.payee_id` | `on delete restrict` | As above. | `20260809051720:99` |
| `booking_state_events.actor_id` | none, so NO ACTION | Anyone who has ever acted on a booking, which includes creating one. | `20260728152358:72` |
| `agent_applications.reviewer_id` | none, so NO ACTION | Any admin who has ever reviewed an application. | `20260728152104:60` |
| `listings.reviewer_id` | none, so NO ACTION | Any admin who has ever reviewed a listing. | `20260728152229:59` |

The Supabase admin API surfaces the resulting 23503 as an error,
`deleteAccount` catches it and returns `DELETE_FAILED_MESSAGE`, and the person is
told "that could not be done" with no explanation and no route forward. **They
have already been signed out by the line above, so they are signed out of an
account they cannot delete.**

Note that `20260804122155_unfreeze_counters_and_let_accounts_be_deleted.sql` is a
migration specifically written to unblock deletion. It fixed the `posts` path
and did not touch these seven. Two of them (`escrows`) were added five days
after it.

### 7.2 If the blockers were removed, here is what would survive

Table by table, from the referential actions in the migrations.

**Deleted with the account (`on delete cascade`), 20 or more paths including:**
`profiles` (the row is `id uuid primary key references auth.users(id) on delete
cascade`), `agent_applications` and therefore `agent_documents` rows,
`social_profiles`, `follows` both sides, `notifications`, `saved` items,
`reports` as reporter, `support_tickets` as requester, `conversations` and
`messages` as sender in the tables that cascade, `inspection_confirmations`,
`area_members`, `stories`, `agents` and its payout accounts.

**Survives, with the name stripped (`on delete set null`), 22 or more columns:**

| What survives | Column | Consequence |
|---|---|---|
| Every post the person wrote | `posts.author_id` | Deliberate and documented in `20260804122155`: the words stay, the name goes, and `posts_author_kind_chk` was relaxed to allow a USER post with no author. This is the right call and it is the only one in this table that was actually decided. |
| Every audit row they created as staff | `audit_log.actor_id` | **`private.audit_log_is_append_only` contains an explicit exemption allowing an UPDATE that nulls `actor_id` and changes nothing else.** So deleting an admin erases the attribution on every privileged action they ever took. After an incident, "who approved this document" is unanswerable. See A2-027. |
| Every refund decision | `booking_refunds.decided_by` | Same exemption, same trigger, same consequence for money decisions. |
| Verification decisions | `agent_verification_checks.decided_by` | Who checked an identity document becomes unknown. |
| Suspensions and reinstatements | `agent_suspensions.suspended_by`, `.lifted_by` | Who stopped an agent becomes unknown. |
| Moderation holds | `posts.hidden_by`, `comments.hidden_by` | Who hid a post becomes unknown. |
| Report resolutions | `reports.resolved_by`, `support_tickets.resolved_by` | Unknown. |
| Escrow actions | `escrows.release_requested_by`, `.disputed_by`, `.resolved_by` | Unknown. |
| Fee rate changes | `fee_rates.created_by` | Who set a rate becomes unknown. |
| Staff bootstrap | `admin_bootstrap.added_by` | Unknown. |

**Survives with the person's data intact, because no foreign key reaches it:**

| What survives | Why | Severity |
|---|---|---|
| **Every identity document in `agent-documents` storage** | `auth.admin.deleteUser` does not touch `storage.objects`. The `agent_documents` ROW cascades away through `agent_applications`, so the path that pointed at the file is destroyed while the file remains. The object is now an orphan: a driving licence, voter card, NIN slip or CAC certificate, in a bucket, with nothing recording whose it was. | **The most serious item in this section.** Deleting an account makes the platform less able to honour a deletion request, not more. |
| Avatars in the `avatars` bucket | Same reason. | Low, but it is still a photograph of a person who asked to be forgotten. |
| Listing photographs in `listing-photos` | Same reason. `RECOMMENDATIONS.md` O-4 names the equivalent for social media. | Medium. |
| Social media objects | O-4, already filed. | Medium. |
| `wallet_entries` | They hang off `wallets.id`, which is `on delete restrict`, so they survive because the parent cannot be removed at all. Financially this is correct, a ledger must not be rewritten, but nobody decided it: it is a side effect of the restrict. | Medium, and it needs to be a stated decision rather than an accident. |
| `message_flags.matched` | Hangs off `messages.id` which cascades from `conversations`, which cascades from participants. Whether a flag row survives depends on which side of the conversation deleted. **Where it survives, a bank account number survives with it.** | High. |
| `rate_limits` rows keyed on `email:<sha256 prefix>` | Not linked to any user id. Correct by design, the hash is why. | None. Good. |
| `idempotency_records` | Not linked. TTL purged nightly. | None. Good. |

### 7.3 The honest summary

**Today, account deletion does not work.** For a browsing-only user with no
wallet, no booking and no escrow, it works and does a reasonable job: the
profile goes, the posts stay anonymised, storage objects are orphaned. For
anybody who used the product for what the product is for, it fails with a
message that explains nothing.

That is a right-to-erasure failure under the NDPA on the platform's most engaged
users, and it is also a broken flow with a dead-end screen, which the standard
in section 17 forbids on its own terms.

The fix is a pre-delete settlement and purge routine, not a relaxation of the
restrict constraints. A2-026 specifies it.


---

## 8. The recommendations

157 entries. Seven fields each, grouped by area, with a stable `A2-NNN` id.
Where an entry extends an existing `RECOMMENDATIONS.md` item rather than
replacing it, the existing id is named so nothing is renumbered and nothing is
duplicated.

Every database claim is from the migration files, not verified live, because the
Supabase tools cannot reach this project. Where that changes a finding's
confidence I say so in the Evidence field.

### 8.1 Authentication and session safety

#### A2-001. `/reset-password` accepts any session, not a recovery session
- **Evidence** `apps/web/src/app/(auth)/reset-password/page.tsx`, the `signedIn`
  IIFE: it calls `supabase.auth.getUser()` and renders `ResetPasswordForm` for
  any non-null user. `updatePassword` in `lib/auth/actions.ts` then calls
  `supabase.auth.updateUser({ password })` with no check of the `amr` claim and
  no current-password prompt. `verification` aside, `reset-password` is not in
  `middleware.ts` `PRODUCT_SEGMENTS`, so nothing else gates it.
- **Action** Read the access token's `amr` array in `updatePassword` and refuse
  unless it contains a `recovery` (or `otp`) factor issued within the last hour.
  Where the caller is an ordinary signed-in session, require the current
  password through `signInWithPassword` before calling `updateUser`.
- **Reason** Anyone holding a session cookie, or standing at an unattended
  signed-in browser, changes the password without knowing the old one. The
  legitimate owner is then locked out of their own wallet.
- **Impact** Closes the gap between session compromise and permanent account
  takeover for every user.
- **Effort** S
- **Risk** Getting the `amr` check wrong breaks the genuine reset flow, so ship
  it with the current-password branch first and the `amr` refusal second.
- **Priority** Critical

#### A2-002. A password change revokes no other session
- **Evidence** `updatePassword` in `lib/auth/actions.ts` ends with
  `revalidatePath` and `redirect("/home")`. There is no
  `signOut({ scope: "others" })` and no call to `end_other_sessions`, which
  already exists and is called from `lib/security/sessions-actions.ts`.
- **Action** Call the existing `end_other_sessions` RPC immediately after a
  successful `updateUser({ password })`, and say so on the confirmation screen.
- **Reason** The commonest reason a person resets a password is that they think
  somebody else has it. Today the reset leaves that somebody signed in.
- **Impact** A reset becomes an actual eviction, which is what a user believes
  it already is.
- **Effort** S
- **Risk** The person's own other devices are signed out too, which is correct
  and needs one line of copy so it is not a surprise.
- **Priority** Critical

#### A2-003. There is no change-password surface at all
- **Evidence** A repository-wide grep for `updateUser({ password` returns one
  call site, in `updatePassword`, reachable only from `/reset-password`. No
  settings screen offers a password change.
- **Action** Add a change-password row under settings that takes the current
  password and the new one, reusing `updatePassword` with the current-password
  branch from A2-001.
- **Reason** A signed-in person who wants to rotate their password has to use
  the forgot-password flow, which sends a code to an inbox they may not have to
  hand, for an action that should need no email at all.
- **Impact** Ordinary account hygiene becomes possible.
- **Effort** S
- **Risk** None beyond the A2-001 work it depends on.
- **Priority** High

#### A2-004. The password floor is eight characters with no breach check
- **Evidence** `updatePassword` in `lib/auth/actions.ts`: `password.length < 8`
  is the only strength rule. `RECOMMENDATIONS.md` V-5 records leaked-password
  protection as off in the Supabase dashboard, and I could not check it.
- **Action** Founder action: enable leaked-password protection in the Supabase
  dashboard under Authentication. Separately, raise the application floor to
  ten characters and refuse a password that equals the email local part.
- **Reason** Eight characters with no breach check, on a platform with a naira
  wallet, is the exact target profile for credential stuffing. Extends V-5 with
  the half the repository can do on its own.
- **Impact** The commonest real-world account compromise gets harder.
- **Effort** S
- **Risk** A longer floor irritates people at sign-up, so the copy has to say
  why in one line.
- **Priority** High

#### A2-005. `/verification` is not classified in the middleware
- **Evidence** `middleware.ts` `PRODUCT_SEGMENTS` does not contain
  `verification`. `app/(app)/verification/page.tsx` renders `KycFlow`, which
  collects identity documents. Phase 0 row 5 above.
- **Action** Add `verification` to `PRODUCT_SEGMENTS`.
- **Reason** A screen that asks a stranger for a driving licence should not be
  reachable without a session. The page's own comment argues a renter who types
  the address should get the flow rather than a refusal, which is a reasonable
  instinct about ROLE and a wrong one about AUTHENTICATION.
- **Impact** Identity collection sits behind the wall with everything else that
  holds personal data.
- **Effort** S
- **Risk** None. The route is linked from inside the product only.
- **Priority** High

#### A2-006. The rate limiter fails open, including on sign-in
- **Evidence** `lib/security/rate-limit.ts` `consume`: when `callSecurityRpc`
  returns `!ok`, or returns a non-boolean, it returns
  `{ allowed: true, degraded: true }`. The file argues the case at length and
  the argument is right for `map_bounds` and `social_follow`. `signInWithEmail`
  uses the same function through `throttle("sign_in", ...)`.
- **Action** Add a `failClosed` flag to `RateLimitRequest`, default false, and
  set it true for `sign_in`, `sign_up`, `password_reset_ip`,
  `password_reset_email` and every money bucket. On a degraded verdict for those
  buckets, fall back to a strict in-process counter rather than to no limit.
- **Reason** A missing service key or a Postgres hiccup removes brute-force
  protection from the sign-in form entirely, and that is precisely when an
  attacker is most likely to be probing. The file's reasoning ("the abuse we are
  pricing is cheap repetition, not a security boundary") is true of the social
  buckets and false of the auth ones.
- **Impact** The auth surface keeps a floor of protection during an outage.
- **Effort** M
- **Risk** A per-instance fallback is weaker than the shared counter and could
  refuse a legitimate person during an incident, so the fallback ceiling should
  be generous, not tight.
- **Priority** High

#### A2-007. `ipFromHeaders` trusts the leftmost `x-forwarded-for` entry
- **Evidence** `lib/security/rate-limit.ts` `ipFromHeaders`:
  `headers.get("x-forwarded-for")?.split(",")[0]?.trim()`.
- **Action** Read `x-vercel-forwarded-for` first, then `x-real-ip`, and only
  then fall back to the rightmost trusted hop of `x-forwarded-for`. Write the
  trusted-proxy assumption in a comment beside it.
- **Reason** The leftmost entry is the one a client can set. On any deployment
  where a client-supplied header is preserved or prepended, every IP-based
  limit on the platform, including sign-in, sign-up, password reset, the
  assistant, support and the map, is evaded by sending a different header each
  request. I did not confirm Vercel's exact behaviour from here, so this is
  stated as a hardening with a documented assumption rather than as a live
  bypass.
- **Impact** All eleven IP-keyed buckets become real limits.
- **Effort** S
- **Risk** Getting the header order wrong groups everybody behind one subject,
  which is strict rather than permissive, so the failure direction is safe.
- **Priority** High

#### A2-008. Sign-in is counted per address of origin only
- **Evidence** `lib/auth/actions.ts`, the comment above `throttle` explains why
  sign-in is not counted per email: an attacker who knows an address could
  otherwise lock its owner out. `throttle("sign_in", subjectForIp(...), 10, 60)`.
- **Action** Add a second counter keyed on `subjectForEmail`, with a high
  ceiling (say 50 failures an hour) that does not lock the account but requires
  a challenge on the next attempt. Count failures only, not successes.
- **Reason** The existing reasoning is sound and leaves a real gap: a
  distributed stuffing run from a thousand addresses is counted ten times per
  address and never once per account. A high-ceiling per-account counter closes
  that without creating the lockout weapon the comment rightly refuses.
- **Impact** Distributed credential stuffing becomes visible and then
  expensive.
- **Effort** M
- **Risk** A challenge step adds friction; the ceiling must be far above any
  human's mistyping.
- **Priority** Medium

#### A2-009. The one-time code travels in the email subject line
- **Evidence** `app/api/auth/email-hook/route.ts` calls `verificationCode({...})`
  and the comment states "The subject carries the code, which `verificationCode`
  does deliberately: most people read it off the notification without opening
  anything, which is faster and strictly safer than opening mail to find it."
- **Action** Keep the code in the body and put a code-free subject on the
  message. If the notification-glance benefit is judged worth keeping, cap it to
  the sign-up template only and never on `recovery`.
- **Reason** "Strictly safer" is the part to challenge. A subject line is
  rendered on a locked phone's notification shade, is retained in mail gateway
  logs and mailbox indexes, and is the part of a message most likely to be
  shown to somebody who is not holding the phone. For a password-recovery code
  that is the whole credential.
- **Impact** Removes a shoulder-surfing and log-retention path to account
  takeover.
- **Effort** S
- **Risk** Slightly slower for the person. Worth it on the recovery template.
- **Priority** Medium

#### A2-010. The auth email hook has no replay guard
- **Evidence** `app/api/auth/email-hook/route.ts` `verified()` checks the
  signature and bounds the timestamp with `MAX_SKEW_SECONDS = 5 * 60`. The
  `webhook-id` header is read into the HMAC input and then discarded.
- **Action** Record `webhook-id` in `public.idempotency_records`, which already
  exists and is already purged nightly, and refuse a second delivery with the
  same id.
- **Reason** Inside the five-minute window a captured request can be replayed to
  send the same code again. The impact is mail amplification against one
  address rather than a credential leak, but the table to prevent it already
  exists.
- **Impact** One signed delivery sends one email.
- **Effort** S
- **Risk** A genuine Supabase retry would be suppressed, which is the correct
  behaviour but means a genuinely lost send is not retried; pair it with the
  502 the route already returns on a send failure.
- **Priority** Medium

#### A2-011. Two KYC flows exist and one of them does nothing
- **Evidence** `app/(app)/verification/actions.ts` `submitVerification` returns
  `{ ok: false }` with a message saying identity storage is not switched on. Its
  own header comment explains the choice and it is the right choice. Meanwhile
  `agent_documents` and the `agent-documents` bucket both exist and the agent
  application wizard uploads to them, which the migration
  `20260730122616` documents.
- **Action** Point `submitVerification` at the tables and bucket the agent
  wizard already uses, or remove the `(app)/verification` route and link its
  entry points to the wizard. Do not leave both.
- **Reason** A person completes a multi-step wizard, uploads a photograph of
  their passport, and is told at the end that nothing was sent. The storage it
  says it is waiting for has existed since 30 July. Extends
  `RECOMMENDATIONS.md` KYC-1 with the specific fact that the blocker it names
  is gone.
- **Impact** Either the flow works or it stops asking for documents it cannot
  keep.
- **Effort** M
- **Risk** Wiring it without the KYC-3 requirements in place would create the
  retention liability KYC-3 warns about, so KYC-3 items 4, 5 and 6 land first.
- **Priority** High

#### A2-012. The webhook timestamp window accepts future timestamps
- **Evidence** `app/api/auth/email-hook/route.ts`:
  `if (Math.abs(Date.now() / 1000 - sentAt) > MAX_SKEW_SECONDS) return false`.
- **Action** Allow at most 30 seconds of clock skew into the future and the full
  five minutes into the past.
- **Reason** A symmetric window doubles the replay opportunity for no benefit.
  Small, but it is free.
- **Impact** Halves the replay window.
- **Effort** S
- **Risk** A badly skewed sender clock would be refused; 30 seconds is
  generous.
- **Priority** Nice-to-have

#### A2-013. No re-authentication before a withdrawal or a deletion
- **Evidence** `withdraw` in `lib/wallet/actions.ts` and `deleteAccount` in
  `lib/profile/actions.ts` both act on `resolveSession()` alone.
  `RECOMMENDATIONS.md` W-5 asks for a transaction PIN, which is the wallet half.
- **Action** Require a fresh password entry (or the W-5 PIN once it exists) for
  a withdrawal above a threshold and for account deletion, and record the
  re-authentication in `audit_log`.
- **Reason** These are the two irreversible actions a hijacked session would
  take. Extends W-5 to cover deletion, which W-5 does not.
- **Impact** A session compromise stops being a straight path to an empty
  wallet.
- **Effort** M
- **Risk** Friction on the withdrawal path, which is why it should be
  threshold-based.
- **Priority** High

#### A2-014. Nothing tells a person their password changed
- **Evidence** `updatePassword` sends no email. `lib/email/messages.ts` has no
  password-changed builder. `RECOMMENDATIONS.md` EM-1e records eleven builders
  with no send site; this is a builder that does not exist at all.
- **Action** Add a `passwordChanged` message and send it from `updatePassword`,
  naming the time and offering a "this was not me" route to support.
- **Reason** The single cheapest detection control for account takeover, and the
  one users expect. Today a successful takeover is silent.
- **Impact** The victim learns within seconds instead of at their next sign-in
  attempt.
- **Effort** S
- **Risk** None. The send is best effort and must never block the change.
- **Priority** High

#### A2-015. Nothing tells a person about a sign-in from a new device
- **Evidence** `lib/security/device.ts` and `my_sessions()` exist and
  `/settings/devices` renders them (`RECOMMENDATIONS.md` SEC-5, done). No
  notification fires on a new session.
- **Action** On a sign-in whose `auth.sessions` row is new, write a
  `notification` row and send a `newDeviceSignIn` email naming the mapped
  browser and platform from `device.ts` and nothing else.
- **Reason** The device list answers the question only if somebody thinks to
  look. A notification asks it for them. Builds on work that is already done.
- **Impact** Detection without the user having to be suspicious first.
- **Effort** M
- **Risk** Noisy for a person who uses three browsers, so it must be
  suppressible and must never include an IP or a location, which
  `middleware.ts` deliberately does not record.
- **Priority** Medium

#### A2-016. `deleteAccount` signs out before it knows the delete will work
- **Evidence** `lib/profile/actions.ts` `deleteAccount`: `await
  supabase.auth.signOut()` runs before `admin.auth.admin.deleteUser`. Given the
  blocking foreign keys in section 7, the common outcome today is a signed-out
  person holding a failure message.
- **Action** Attempt the delete first and sign out only on success. On failure,
  keep the session and say specifically what is holding it, for example "your
  wallet still holds a balance".
- **Reason** The current order produces the worst possible combination: the
  account survives and the person cannot get back to it without signing in
  again, with no idea why.
- **Impact** A failed deletion is explainable and recoverable.
- **Effort** S
- **Risk** A successful delete now needs the sign-out to follow reliably; wrap
  it so a failed sign-out does not report a failed delete.
- **Priority** High

#### A2-017. The `resolveSession` memo hazard is documented and unguarded
- **Evidence** `lib/actions/session.ts` explains at length that the per-request
  `cache()` will return stale state if an action ever signs a user in or out and
  then re-resolves, and names the four call sites checked. Nothing enforces it.
- **Action** Add a vitest spec that asserts no exported function in
  `lib/auth/actions.ts` or `lib/profile/actions.ts` calls `resolveSession` after
  a `signOut`, `signInWithPassword`, `verifyOtp` or `exchangeCodeForSession`, by
  parsing the module rather than by running it.
- **Reason** The comment says "IF ONE IS EVER ADDED, this memo is where it will
  bite". A comment is not a guard, and the bite is an action acting as the
  previous user.
- **Impact** A whole class of future authorisation bug becomes impossible to
  merge.
- **Effort** M
- **Risk** A source-parsing test is brittle; keep the assertion narrow.
- **Priority** Medium

#### A2-018. Google and Apple sign-in remain, and so do their CSP and env costs
- **Evidence** `lib/auth/actions.ts` exports `startGoogleOAuth`,
  `startAppleOAuth` and `startOAuth`. `apps/web/.env.example` documents
  `NEXT_PUBLIC_AUTH_PROVIDERS` and says "Apple is not optional once Google is
  offered". `lib/security/csp.ts` `IMAGE_HOSTS` carries
  `https://*.googleusercontent.com` for Google avatars.
  `RECOMMENDATIONS.md` N-4 owns the removal.
- **Action** When N-4 lands, remove the three exports, the
  `NEXT_PUBLIC_AUTH_PROVIDERS` block from the env template, and the
  `googleusercontent.com` entry from `IMAGE_HOSTS`. The CSP comment about
  `form-action` and provider origins already says what to restore if they ever
  come back.
- **Reason** N-4 names the code; nobody has named the two downstream artefacts,
  and a wildcard image host kept for a removed feature is an exfiltration
  source left open for nothing.
- **Impact** One fewer wildcard in the policy and one fewer misleading env
  variable.
- **Effort** S
- **Risk** Removing the host before the feature breaks Google avatars, so it
  follows N-4 rather than leading it.
- **Priority** Medium

#### A2-019. `signaturesMatch` compares base64 text rather than bytes
- **Evidence** `app/api/auth/email-hook/route.ts` `signaturesMatch` builds
  `Buffer.from(expected)` and `Buffer.from(presented)` from strings without an
  encoding argument, so both are UTF-8 of the base64 text.
- **Action** Decode both sides with `Buffer.from(x, "base64")` before
  `timingSafeEqual`, keeping the length check.
- **Reason** It is still timing-safe and still correct, so this is hygiene
  rather than a hole: comparing the encoded form means a signature that differs
  only in base64 padding is rejected for the wrong reason, and the code reads as
  if it were comparing digests when it is not.
- **Impact** The comparison means what it appears to mean.
- **Effort** S
- **Risk** None if the length check stays.
- **Priority** Nice-to-have

#### A2-020. There is no step-up or timeout on an admin session
- **Evidence** `lib/admin/guard.ts` `requireAdmin` reads `user_roles` for the
  caller and returns. There is no maximum session age, no re-authentication and
  no separate admin session lifetime.
- **Action** Require a password re-entry when an admin session is older than
  four hours before any action in `money-actions.ts`, `suspension-actions.ts`,
  `kyc-actions.ts` or `bookings-actions.ts`, and record it in `audit_log`.
- **Reason** An operations account can suspend an agent, cancel a paid stay,
  refund money and read identity documents. A stolen admin cookie is worth far
  more than a user's, and today it lasts exactly as long.
- **Impact** The highest-value credential on the platform gets a shorter useful
  life.
- **Effort** M
- **Risk** Annoying for a busy operator, so four hours rather than one, and
  never in the middle of a form submission.
- **Priority** High

### 8.2 Privacy, NDPA and the data lifecycle

#### A2-021. The welcome emails promise escrow
- **Evidence** `lib/email/messages.ts`: the renter welcome says "Pay through
  RentMe, so the money is held until the tenancy is real" and the buyer welcome
  says "Pay through RentMe, so the money is held until the transaction
  completes". These are in shipped, sent templates, not fixtures.
- **Action** Rewrite both lines to describe what actually happens: payment
  inside the platform, a receipt, and a record in the wallet. Remove every "the
  money is held" construction.
- **Reason** Rule 11. Escrow is not reachable by any user, so this is a
  financial promise made to somebody deciding whether to part with money, and
  it is untrue today. It is also the exact sentence
  `app/api/assistant/route.ts` removed from the system prompt on purpose, with
  the reasoning written out. The emails were missed.
- **Impact** Removes the platform's most consequential untrue claim from the
  first message every new user receives.
- **Effort** S
- **Risk** None. `[TRACK A]` will rewrite the brand in these files; the escrow
  sentence is a separate defect that a rename will not fix, so it must be
  named rather than assumed.
- **Priority** Critical

#### A2-022. The privacy notice says the platform holds and releases payments
- **Evidence** `lib/legal/privacy.tsx` line 99: "To process bookings, hold and
  release payments, and pay agents out."
- **Action** `[TRACK A]` Change to describe processing payments and paying
  agents out, with no holding or releasing.
- **Reason** Rule 11, in the one document a regulator reads first. "Hold and
  release" is escrow described by its two operations. HANDOFF 01 section 4.7
  lists "any payment screen" as needing a disclaimer that the platform does NOT
  hold the money, and the privacy notice currently asserts the opposite.
- **Impact** The notice stops contradicting the disclaimer the product is
  supposed to carry.
- **Effort** S
- **Risk** None.
- **Priority** High

#### A2-023. Two escrow email builders promise escrow and have no send site
- **Evidence** `lib/email/messages.ts` exports `escrowFunded` ("Your money is
  held in escrow", "tell us and the money comes back to your wallet. That is
  what escrow is for") and `escrowReleased`. The only references are
  `lib/email/fixtures.ts` and `messages.test.ts`. No production caller.
- **Action** Leave the builders, because escrow is being built and they will be
  needed, but move them behind a comment stating they must not be wired until
  E-7's regulatory answer exists, and add a spec asserting they have no
  production call site until then.
- **Reason** Rule 11 and `RECOMMENDATIONS.md` E-6. Two well-written emails that
  promise escrow are one import away from being sent. The fixtures render them,
  so they are also one screenshot away from appearing in a review.
- **Impact** The promise cannot be made by accident.
- **Effort** S
- **Risk** None.
- **Priority** High

#### A2-024. `message_flags.matched` stores bank account numbers in plain text
- **Evidence** `supabase/migrations/20260728222112_messaging_trust.sql`,
  `private.scan_message()`:
  `insert into public.message_flags (message_id, reason, matched) values (new.id,
  'account_number', substring(new.body from '\d{10}'))`. The column is
  `matched text not null`. A Nigerian NUBAN is ten digits and a NIN is eleven,
  so the capture is either a full account number or the first ten digits of a
  NIN. From the migration files, not verified live.
- **Action** Store a redacted form: the last four characters, or a SHA-256
  digest, plus the character offset. Change the column and backfill the existing
  rows with the redacted value in the same migration. The reviewer needs to know
  a number was present, not what it was.
- **Reason** HANDOFF 01 section 4.4 prohibition 1 says never log a bank account
  number or a document number. A permanently retained database column, readable
  by every admin, is worse than a log line, not better. Under the NDPA this is
  excessive collection with no lawful basis stated and no retention period.
- **Impact** A breach of this table stops being a list of bank account numbers
  harvested from private conversations.
- **Effort** M
- **Risk** A backfill over a text column is a data-losing migration, which is on
  the stop list, so it goes to the founder before it is applied. The reviewer
  loses the ability to read the number, which is the point.
- **Priority** Critical

#### A2-025. The admin flags screen loads whole private conversations
- **Evidence** `lib/admin/queries.ts` `getMessageFlags` selects
  `messages ( id, body, sender_id, conversation_id, created_at )` for each flag,
  collects `conversationIds`, and then issues a second query:
  `.from("messages").select("id, conversation_id, sender_id, body, created_at")
  .in("conversation_id", conversationIds).limit(400)`. That is up to 400 full
  message bodies across the flagged conversations, loaded on every render, for
  every flag on the page.
- **Action** Show the flagged message and a fixed window of two messages either
  side. Put the full transcript behind a separate action that requires a typed
  reason, writes an `audit_log` row naming the admin and the conversation, and
  is available only to `super_admin`.
- **Reason** HANDOFF 02 section 19 is explicit: "flag the risk, do not give
  staff casual read access to private conversations. Widening that needs the
  terms to say so first." The current screen is the widened version, by default,
  with no audit row. And because the keyword pattern is
  `(payment|transfer|pay me|account number|acct|bank)`, which matches almost any
  property conversation, "the flagged conversations" is in practice "most
  conversations".
- **Impact** Staff read what they need to decide and nothing else, and every
  wider read is attributable.
- **Effort** M
- **Risk** Slower triage for the operator. That is the correct trade.
- **Priority** Critical

#### A2-026. Account deletion cannot complete for most real users
- **Evidence** Section 7 of this report. Seven foreign keys to `auth.users`
  block the delete: `wallets.user_id`, `bookings.guest_id`,
  `escrows.payer_id`, `escrows.payee_id` (all `on delete restrict`) and
  `booking_state_events.actor_id`, `agent_applications.reviewer_id`,
  `listings.reviewer_id` (no clause, so NO ACTION).
  `lib/profile/actions.ts` `deleteAccount` is a single
  `admin.auth.admin.deleteUser` call with no pre-delete work. From the migration
  files, not verified live.
- **Action** Build a `private.prepare_account_deletion(p_user uuid)` routine
  that runs in one transaction before the delete and: refuses with a named
  reason if a non-terminal escrow or a PENDING withdrawal exists; nulls the
  three NO ACTION reviewer and actor columns; reassigns `wallets` and
  `bookings` to a tombstone by setting the guest and owner references null where
  the schema allows and otherwise retaining the row with the identity stripped;
  deletes every `storage.objects` row under the person's folder in
  `agent-documents`, `avatars`, `listing-photos` and the social bucket; and
  writes one `audit_log` row naming what it removed and what it retained.
  `deleteAccount` calls it, reports its refusal reasons verbatim, and only then
  calls `deleteUser`.
- **Reason** The right to erasure is one of the rights the privacy notice
  promises, and it is unexecutable today for exactly the users who have the most
  data. It is also a dead-end screen, which section 17 forbids on its own terms.
- **Impact** A person can leave, and the platform can prove what it removed.
- **Effort** L
- **Risk** High, and this one goes to the founder before it is applied: it
  deletes personal data and storage objects irreversibly, and a wrong
  reassignment could orphan a ledger row. Build it dry-run first, exactly as the
  reconciler was built dry-run first.
- **Priority** Critical

#### A2-027. Deleting an admin erases the audit trail's attribution
- **Evidence** `supabase/migrations/20260806112848`,
  `private.audit_log_is_append_only()`: the trigger explicitly permits an UPDATE
  where `old.actor_id is not null and new.actor_id is null` and nothing else
  changes. That is the referential action for `audit_log.actor_id on delete set
  null`. `private.booking_refunds_is_append_only()` carries the identical
  exemption for `decided_by`. From the migration files, not verified live.
- **Action** Add an `actor_label text` column to `audit_log` and
  `booking_refunds`, written at insert time with the actor's display name and
  role, and never nulled. Keep the `actor_id` null-on-delete behaviour so the
  foreign key still lets a person leave.
- **Reason** "Who approved this identity document" and "who authorised this
  refund" are the two questions asked after an incident, and both become
  unanswerable the moment that member of staff deletes their account. An audit
  log that can be anonymised by the person it incriminates is not an audit log.
- **Impact** Attribution survives a departure, which is what an audit trail is
  for.
- **Effort** M
- **Risk** Retaining a name after a deletion request is itself a processing
  decision and needs a lawful basis stated in the notice: legitimate interest
  in fraud prevention and regulatory record-keeping. Name it before shipping.
- **Priority** High

#### A2-028. Storage objects survive account deletion as orphans
- **Evidence** `auth.admin.deleteUser` does not touch `storage.objects`. The
  `agent_documents` row cascades away through `agent_applications.user_id on
  delete cascade`, so the row that recorded the `storage_path` is destroyed
  while the file remains. The bucket is `agent-documents`, holding, in the
  migration's own words, "driving licences, voter cards, NINs and CAC
  certificates". Same for `avatars` and `listing-photos`.
- **Action** Covered operationally by A2-026's purge step. Additionally add a
  weekly pg_cron job that lists `storage.objects` in `agent-documents` whose
  first path segment is not a live `auth.users.id` and deletes them, writing an
  `audit_log` row with the count.
- **Reason** Deleting an account currently makes the platform LESS able to
  honour a deletion request, because the bytes remain and the record of whose
  they were is gone. That is the worst possible ordering.
- **Impact** The sweep is a backstop for every path that fails to clean up,
  including the ones not written yet.
- **Effort** M
- **Risk** A bug in the liveness test deletes a live applicant's documents.
  Run it in report-only mode first, like the reconciler.
- **Priority** Critical

#### A2-029. Nothing purges documents for a rejected application
- **Evidence** Eight pg_cron jobs are scheduled across the migrations
  (`rentme-nightly-badges`, `rentme_release_stale_holds`,
  `rentme_purge_rate_limits`, `rentme_purge_idempotency`,
  `rentme_announce_completed_stays`, `rentme-daily-note`,
  `rentme_escrow_sweep_timeouts`, `rentme_reconcile_payments`). None touches
  `agent_documents` or the bucket. `docs/RETENTION_SCHEDULE.md` states periods.
  HANDOFF 01 section 4.3 names this exact gap.
- **Action** Add `private.purge_rejected_verification_documents()`: for every
  `agent_applications` row in `REJECTED` whose `reviewed_at` is older than the
  appeal window in `docs/RETENTION_SCHEDULE.md`, delete the `storage.objects`
  rows under `<user>/<application>/`, null `id_number` and `account_number` on
  the application, keep the decision, the document type, the last four
  characters and the reviewer, and write one `audit_log` row per application.
  Schedule it daily. Add it to `supabase/migrations/` with a timestamp prefix.
- **Reason** HANDOFF 01 section 4.3: holding a rejected applicant's NIN slip
  forever is storage without a lawful basis, because the basis expired when the
  decision was made. The mechanism exists; only the job is missing.
- **Impact** The notice and the database agree about retention for the most
  sensitive category the platform holds.
- **Effort** M
- **Risk** Deleting personal data is irreversible, so it goes to the founder
  first, runs in report-only mode, and the appeal window comes from the approved
  schedule rather than from a guess.
- **Priority** Critical

#### A2-030. Nothing enforces any other line of the retention schedule
- **Evidence** `docs/RETENTION_SCHEDULE.md` is 301 lines. The only purges that
  exist are `purge_rate_limits` and `purge_idempotency_records`, both of which
  are operational hygiene rather than personal-data retention.
- **Action** Take the schedule category by category and, for each, either write
  the purge job or record in the schedule that the category is retained
  indefinitely with the basis named. Candidates the schedule will reach:
  `message_flags`, `notifications`, `audit_log` metadata, expired stories,
  `support_tickets` after closure, `assistant_threads`.
- **Reason** A stated retention period that nothing enforces is a documented
  breach rather than a policy. An NDPC auditor will read the schedule and then
  ask for the job.
- **Impact** The one bolded row of HANDOFF 01's twelve-question table that the
  engineering can close without a legal decision.
- **Effort** L
- **Risk** Each job is a data-losing change and goes to the founder
  individually.
- **Priority** High

#### A2-031. There is no data export path
- **Evidence** `lib/legal/privacy.tsx` lists data subject rights including
  portability. No export exists in `lib/profile/`, in the admin console, or
  anywhere else. HANDOFF 01 section 4.8 records "The export path is not built".
- **Action** Add a `private.export_account_data(p_user uuid)` returning one
  jsonb document covering the profile, listings, bookings, wallet entries,
  messages the person sent, posts and saved items, and a settings row that
  requests it. Deliver it through a short-lived signed URL, never by email, and
  write an `audit_log` row. Mirror it as an admin action for a request that
  arrives by the contact form.
- **Reason** A right the notice promises has to be executable. Today a
  portability request has no answer but a manual database dump, which is both
  slower and less safe.
- **Impact** Two of the notice's stated rights become real.
- **Effort** L
- **Risk** An export is the single largest personal-data egress the platform
  will ever produce, so the signed URL must be short and the audit row must be
  mandatory.
- **Priority** High

#### A2-032. The privacy notice names no processor
- **Evidence** `lib/legal/privacy.tsx` section 5 says "Payment processors.
  Licensed Nigerian providers" and "providers who process data under contract".
  A case-insensitive grep for Anthropic, Resend, Paystack, Yellow Card,
  Supabase, Vercel, Mapbox and MapTiler across the file returns nothing.
- **Action** `[TRACK A]` on the wording, mine on the inventory: produce the
  processor list from the actual code (Supabase for hosting and storage, Vercel
  for hosting, Paystack for card and transfer, Yellow Card for crypto on-ramp,
  Resend for email, Anthropic for the assistant and support summariser, CARTO or
  MapTiler for basemap tiles) with the country of processing for each, and hand
  it to Track A for the notice.
- **Reason** HANDOFF 01 section 4.8 lists Sharing as "Must be updated when a
  vendor is added", and seven vendors are already receiving data. Under the NDPA
  the recipients have to be identifiable.
- **Impact** The notice describes the actual data flows.
- **Effort** S for the inventory, S for the notice.
- **Risk** None.
- **Priority** High

#### A2-033. The assistant and support routes send personal data to Anthropic undisclosed
- **Evidence** `app/api/assistant/route.ts` POSTs the conversation to
  `https://api.anthropic.com/v1/messages`. `app/api/support/route.ts` does the
  same and its tool results, produced by `runSupportTool` against the caller's
  own records, are appended to `convo` and sent on the next round. The privacy
  notice names no AI processor (A2-032).
- **Action** Before the assistant leaves its flag: name Anthropic in the notice
  with the purpose and the country, add one line in the assistant and support
  UI saying the conversation is processed by a third-party model, and cap what
  the support tools may return into the conversation to the minimum the model
  needs (a status and a reference, never a balance or a full address).
- **Reason** HANDOFF 01 section 4.4 prohibition 3: never send personal data to a
  third party that is not in the notice's sharing section. Adding a vendor is a
  notice change first and an integration second, and the integration went first.
- **Impact** The most novel data flow on the platform becomes a disclosed one.
- **Effort** M
- **Risk** Trimming the tool payloads makes the support agent less useful; the
  trade favours disclosure.
- **Priority** High

#### A2-034. There is no redaction function at the logging boundary
- **Evidence** `lib/payments/observability.ts` documents what may never appear
  and then relies on every caller to obey. `failureReason(error)` passes
  `error.message` straight through, capped at 200 characters, and that message
  can come from Postgres. `app/error.tsx` line 25 logs the whole error object.
- **Action** Add a `redact(text)` helper in `lib/security/` that replaces any
  run of ten or more digits with `[redacted:<n> digits]`, and route
  `failureReason`, `app/error.tsx` and every `console.warn`/`console.error` that
  carries a message through it. Add an eslint rule forbidding a bare
  `console.error(x, error)` with an object second argument.
- **Reason** HANDOFF 01 section 4.4 prohibition 1 is currently a rule enforced
  by discipline. A Postgres check-constraint violation on
  `agent_applications_account_chk` or `agent_applications_phone_chk` is exactly
  the error most likely to carry a number, and it is the error most likely to be
  logged.
- **Impact** The prohibition becomes mechanical rather than remembered.
- **Effort** M
- **Risk** Over-redaction hides a useful reference; payment references are not
  digit-only so they survive.
- **Priority** High

#### A2-035. The admin reviewer sees the full bank account number
- **Evidence** `lib/admin/queries.ts` line 421, the application detail select:
  `... id_type, id_number, business_name, business_rc, bank_name,
  account_number, account_name, ...`, mapped to `accountNumber` and `idNumber` at
  lines 500 and 504 with no masking.
- **Action** Select `account_number` masked to the last four in the reviewer
  view. The payout verification path already resolves the account NAME from the
  bank through `verify_payout_account`, so the reviewer never needs the digits
  to do their job. Keep `id_number` in full, because reading it off the document
  is the job, but see A2-036.
- **Reason** Data minimisation. Ten digits of somebody's bank account on an
  operations screen is a screenshot, a shoulder, or a compromised admin session
  away from being useful to somebody else, and it buys the reviewer nothing.
- **Impact** Removes a whole category of data from the most-viewed admin screen.
- **Effort** S
- **Risk** An operator investigating a payout mismatch may want the full number;
  put it behind the same reason-and-audit action as A2-025.
- **Priority** High

#### A2-036. No audit row is written when an admin reads an identity document
- **Evidence** `lib/admin/queries.ts` mints signed URLs for `agent_documents`
  in the application detail read. A grep for `writeAudit` in `queries.ts`
  returns nothing: it is a query module and writes no audit rows by design.
  `RECOMMENDATIONS.md` KYC-3 item 6 asks for exactly this and it is not built.
- **Action** Move the signed-URL minting out of the query path into an explicit
  server action, `openVerificationDocument`, that writes an `audit_log` row
  naming the admin, the document, the application and the reason, and returns
  the URL. The list view shows the document type and nothing else until the
  action is called.
- **Reason** KYC-3 item 6: "Who looked at somebody's passport is the question
  that gets asked after an incident." Today every render of the application
  detail screen mints URLs for every document with no record.
- **Impact** Document access becomes attributable, which is also what makes the
  private bucket worth having.
- **Effort** M
- **Risk** One more click for the reviewer.
- **Priority** High

#### A2-037. The terms do not disclose that messages are scanned
- **Evidence** A grep of `lib/legal/terms.tsx` for message, chat,
  conversation, monitor, scan and flag returns two hits, neither about scanning.
  `private.scan_message()` runs `after insert on public.messages` on every
  message. HANDOFF 01 section 4.6 lists this as required before Launch.
- **Action** `[TRACK A]` for the wording. Mine: supply the accurate technical
  description, which is that every message is checked automatically for
  ten-digit runs and payment keywords, that a match creates a record an
  administrator may review, and that no human reads a conversation unless a
  match or a report brings it to them. That last clause only becomes true once
  A2-025 lands.
- **Reason** Section 4.6 says users should know. It is also the precondition for
  any legitimate widening of moderation access.
- **Impact** The scanning gains a disclosed basis.
- **Effort** S
- **Risk** Do not write the clause to describe the current behaviour, which is
  wider than the clause should permit. A2-025 first.
- **Priority** High

#### A2-038. `app/error.tsx` logs the whole error object
- **Evidence** `apps/web/src/app/error.tsx` line 25:
  `console.error("[rentme] route error", error)`.
- **Action** Log `error.digest` and `failureReason(error)` through the A2-034
  redactor, never the object. Rename the prefix as part of `[TRACK A]`.
- **Reason** A serialised error object carries the stack and, from a Supabase
  client error, the `details` and `hint` fields, which are the two places
  Postgres puts row values. This is the single most likely place a NIN reaches a
  log.
- **Impact** Closes the widest logging leak on the platform.
- **Effort** S
- **Risk** Less detail when debugging a route error; the digest is the
  replacement.
- **Priority** High

#### A2-039. The webhook returns a Postgres error message in its response body
- **Evidence** `app/api/paystack/webhook/route.ts`, the outer catch:
  `verdict("failed", "write_failed:" + failureReason(error), 500)`, and `answer`
  returns `{ received, reason: v.reason }`.
- **Action** Return a stable code in the body (`write_failed`) and keep the
  specific reason in the log only.
- **Reason** The recipient is Paystack, so the exposure is small, but a
  processor's delivery log is a third-party system holding whatever Postgres
  said, and there is no reason for it to.
- **Impact** One fewer place a database message escapes the platform.
- **Effort** S
- **Risk** None. The log keeps the detail.
- **Priority** Medium

#### A2-040. There is no inventory of what the platform logs
- **Evidence** HANDOFF 01 section 4.8 lists Logs as "Not inventoried. Redaction
  is a rule in 4.4, not a verified fact." A grep counts console calls in
  `lib/payments` (4), `lib/places` (2), `lib/email` (2), `lib/maps` (1),
  `lib/listings` (1) and one each in seven route or page files. No document says
  what any of them contain or how long Vercel keeps them.
- **Action** Write `docs/LOGGING.md` listing every log site, the fields it
  emits, whether any field is personal data, and the platform's retention for
  each sink (Vercel runtime logs, Postgres logs, the `[money]` channel). Add it
  to the reading list.
- **Reason** Three of HANDOFF 01's four bolded rows in the twelve-question table
  are engineering; this is the cheapest of them and it is the precondition for
  answering an NDPC question about logs at all.
- **Impact** The Logs row of the data lifecycle table gets an answer.
- **Effort** M
- **Risk** None.
- **Priority** Medium

### 8.3 Money, wallet and the ledger

#### A2-041. `withdraw()` falls back to an explicitly unlocked money path
- **Evidence** `lib/wallet/actions.ts`, the `else` branch after
  `held.outcome === "ok"`. It logs
  `reason: "atomic_hold_unavailable_using_unlocked_path"` and then does three
  separate round trips: `ensureWalletId`, `availableBalanceMinor`, and
  `postEntry` of a PENDING withdrawal debit. The comment says it "goes the day
  `public.hold_wallet_withdrawal` lands". That function is defined in
  `supabase/migrations/20260809080815_the_locking_money_paths_get_a_public_door.sql`,
  which is 37 days old, so the comment is stale. I could not confirm the
  migration is applied live.
- **Action** Delete the fallback. On `missing`, refuse the withdrawal with the
  same honest message `transferToUser` already uses for that case, and log
  `unconfigured`.
- **Reason** This is the exact race the handoff names: two taps on a slow
  Nigerian connection both read the same balance, both find it sufficient, both
  post a hold, and the platform initiates two Paystack transfers against one
  balance. `transferToUser` already refuses rather than falling back, and the
  reasoning in `lib/wallet/rpc.ts` says money must move inside the lock. The
  withdrawal path is the one that disagrees with its own module's contract.
- **Impact** Removes the only unlocked money-moving path in the codebase.
- **Effort** S
- **Risk** If `hold_wallet_withdrawal` is genuinely not applied, withdrawals
  stop. That is the correct outcome and it is loud, whereas the current outcome
  is quiet and racy. Confirm the function is applied before deleting, which
  needs live database access this session did not have.
- **Priority** Critical

#### A2-042. `isMissing()` classifies ordinary errors as a missing function
- **Evidence** `lib/wallet/rpc.ts`:
  ```
  const UNDEFINED_FUNCTION_CODES = new Set(["PGRST202", "42883"]);
  function isMissing(error) {
    if (error.code && UNDEFINED_FUNCTION_CODES.has(error.code)) return true;
    const message = (error.message ?? "").toLowerCase();
    return message.includes("could not find the function")
      || message.includes("does not exist")
      || message.includes("schema cache");
  }
  ```
- **Action** Match on `PGRST202` alone. Drop `42883` and all three message
  heuristics. Everything else becomes `failed`, which every caller already
  handles by refusing.
- **Reason** `does not exist` appears in the message of `42P01` (relation does
  not exist), `42703` (column does not exist) and several role and type errors.
  `42883` is raised when a function called INSIDE the locking function is
  missing, which is precisely the failure the badge-sweep gotcha describes and
  is not the same as the wrapper being absent. So a structural error inside
  `hold_wallet_withdrawal` is reported as "not applied yet" and silently
  downgrades the withdrawal to the unlocked path in A2-041. A money path that
  changes its safety guarantees based on a substring match is the most dangerous
  pattern in this file.
- **Impact** A real database error stops being mistaken for an undeployed
  function.
- **Effort** S
- **Risk** During a genuine deployment gap the callers refuse instead of falling
  back, which is the intended behaviour once A2-041 lands.
- **Priority** Critical

#### A2-043. `labelTransferLegs` writes a ledger status while claiming not to
- **Evidence** `lib/wallet/actions.ts` `labelTransferLegs` is documented as
  "display-only" and "it moves no money". It calls
  `setEntryStatus(admin, ref, "COMPLETED", { note })`, and `setEntryStatus` in
  `lib/wallet/ledger.ts` issues
  `.update({ status, metadata: merged }).eq("reference", reference)`. So a
  function described as cosmetic sets a wallet entry to COMPLETED,
  unconditionally, outside any lock, after the transfer RPC has returned, and it
  runs on the `duplicate` branch too.
- **Action** Split `setEntryStatus` into `setEntryStatus` and
  `mergeEntryMetadata`, and have `labelTransferLegs` call only the second.
- **Reason** A COMPLETED wallet entry is money in somebody's derived balance. A
  helper that can create one must not be described as, or trusted as, display
  only. Today if the transfer function ever left a leg PENDING, this would
  complete it with no balance check at all.
- **Impact** The one function allowed to be best-effort stops being able to move
  money.
- **Effort** S
- **Risk** None. The transfer RPC already sets the statuses it intends.
- **Priority** High

#### A2-044. `availableBalanceMinor` pulls every pending debit row and sums in Node
- **Evidence** `lib/wallet/ledger.ts` `availableBalanceMinor`: reads
  `wallet_balances.balance_minor`, then
  `.from("wallet_entries").select("amount_minor").eq("wallet_id", walletId)
  .eq("status", "PENDING").eq("direction", "debit")` with no limit, then sums in
  a `for` loop.
- **Action** Replace with a single `private.wallet_available_minor(p_wallet
  uuid)` that computes settled minus pending debits in one statement, exposed
  through a `public` wrapper granted to `service_role` only. The logic already
  exists inside `hold_wallet_withdrawal`; this is the read-only twin.
- **Reason** Two problems, one silent. PostgREST pages at 1,000 rows by default,
  so a wallet with more than 1,000 PENDING debits returns a partial set, the
  loop understates the held amount, and the function reports MORE spendable
  balance than exists. That is an overdraft with no error. And it is two round
  trips where one statement would do, on the hottest read in the wallet.
- **Impact** Removes a silent over-reporting failure from the function that
  prices every spend.
- **Effort** M
- **Risk** The new function must be the one the locking paths already agree
  with, so write it by copying the expression out of
  `hold_wallet_withdrawal` rather than by reimplementing it.
- **Priority** High

#### A2-045. `net_settlement_minor` is not tied to the parts it should follow from
- **Evidence** `supabase/migrations/20260728152358_bookings_payments.sql`
  creates `ledger_entries` with `constraint ledger_balances_chk check
  (gross_minor = platform_fee_minor + agent_share_minor + processor_fee_minor)`.
  `net_settlement_minor` is in the table and in neither that constraint nor any
  later one. `20260805102702` replaced the five sign checks with
  `ledger_entries_sign_chk`, which constrains its sign and not its value. From
  the migration files, not verified live.
- **Action** Add `constraint ledger_net_chk check (net_settlement_minor =
  gross_minor - processor_fee_minor - platform_fee_minor)`, or whatever the
  intended identity is, after confirming it against
  `lib/bookings/settlement.ts`.
- **Reason** The conservation rule is enforced for three of the four
  decompositions and not the fourth, and the fourth is the one the revenue
  reports sum. A bug could write a net that does not follow from the parts, and
  `ledger_balances_chk` would pass.
- **Impact** The whole row becomes internally consistent by construction.
- **Effort** S
- **Risk** If any existing row violates the identity, the constraint fails to
  add; check first with a read-only query, which needs live access.
- **Priority** High

#### A2-046. No money surface is rate limited
- **Evidence** A grep of every `consume({` and `throttle(` call site returns
  eleven buckets: `map_bounds`, `support_ticket`, `contact_form`,
  `reservation_create`, `signup_email_probe`, `sign_in`, `sign_up`,
  `password_reset_ip`, `password_reset_email`, `social_follow`,
  `social_profile_update`, `social_handle_claim`, `conversation_new`, `report`,
  and the assistant and support buckets. **None of `fundWallet`, `withdraw`,
  `transferToUser`, `payBookingFromWallet` or the pot actions is in that list.**
  `RECOMMENDATIONS.md` W-2 records this as P0 and it is still open.
- **Action** Add `wallet_fund` (10 an hour per user), `wallet_withdraw` (5 an
  hour), `wallet_transfer` (20 an hour) and `booking_pay` (10 an hour), all
  keyed on `subjectForUser`, all with `failClosed` from A2-006.
- **Reason** Extends W-2 with the specific buckets and numbers. Without them, a
  scripted caller can open unlimited Paystack charges (each a real API call and
  a real fee), enumerate transfer recipients by email at machine speed (W-4's
  oracle, at scale), and hammer the locking functions.
- **Impact** The money surfaces get the protection every other write path
  already has.
- **Effort** S, because the limiter already exists and is durable.
- **Risk** A legitimate person retrying a dropped submit on a bad connection
  must not be refused, so the windows are hours and the ceilings generous.
- **Priority** Critical

#### A2-047. Reserve has no idempotency guard
- **Evidence** `lib/security/idempotency.ts` `withIdempotency` is imported in
  exactly one file, `lib/bookings/checkout.ts`, where it wraps
  `booking.card_checkout` and the wallet payment. A grep for it in
  `lib/reservations/actions.ts` returns nothing, and that file has no
  `idempotencyKey` in its schema.
- **Action** Wrap the reserve action in `withIdempotency` with scope
  `reservation.create`, and add a unique constraint on
  `(guest_id, listing_id, check_in, check_out)` for non-cancelled rows so the
  database is the real guard, as `RECOMMENDATIONS.md` R-27 asks.
- **Reason** The module's own header names the failure: "Nigerian mobile networks
  drop mid-request as a matter of routine, and a person whose Reserve or Withdraw
  tap appears to fail will tap again." Reserve holds calendar nights, so a double
  tap takes the same dates twice and the stale-hold sweep then releases them on
  two different clocks.
- **Impact** A dropped connection stops producing two holds on one property.
- **Effort** M
- **Risk** The unique constraint is the load-bearing half and needs care about
  what "active" means for a cancelled reservation.
- **Priority** High

#### A2-048. `setEntryStatus` read-then-writes metadata with no lock
- **Evidence** `lib/wallet/ledger.ts` `setEntryStatus` with `extraMetadata`:
  a `select("metadata")`, a spread merge in Node, then an `update`.
- **Action** Do the merge in Postgres with `metadata = metadata || $1::jsonb` in
  a single statement.
- **Reason** Two concurrent settlements against the same reference lose one
  side's metadata. It is display data today, so the consequence is a missing
  caption, but the pattern is the same read-then-write the whole wallet design
  exists to avoid and it will be copied.
- **Impact** One round trip instead of two, and no lost update.
- **Effort** S
- **Risk** None.
- **Priority** Medium

#### A2-049. Escrow, savings pots and crypto have no feature flag
- **Evidence** `lib/flags.ts` `FeatureKey` is a closed union:
  `bookings, wallet, messaging, assistant, support, agent_listings,
  hybrid_hotels, hybrid_restaurants, social, events`. There is no `escrow`,
  `savings`, `crypto` or `sale`.
- **Action** Add `escrow`, `savings` and `crypto` keys and check them at the top
  of `lib/wallet/escrow.ts`, `lib/wallet/pot-actions.ts` and the crypto deposit
  action.
- **Reason** The flags exist to switch a feature off during an incident, and the
  three newest money features are the three most likely to need it. Today the
  only way to stop escrow is a deploy.
- **Impact** A money incident can be contained in seconds rather than in a
  build.
- **Effort** S
- **Risk** Fail-open means a flag read failure leaves them on; see A2-127.
- **Priority** High

#### A2-050. The four escrow functions live in `public`, not `private`
- **Evidence** `20260809053537` defines `public.escrow_hold`,
  `public.escrow_release`, `public.escrow_refund` and `public.escrow_open` as
  `security definer set search_path = public`, with EXECUTE revoked from
  `public, anon, authenticated` and granted to `service_role`. Every other
  SECURITY DEFINER money function on the platform is `private.*` with a thin
  `public` wrapper (`20260809080815` exists precisely to add those wrappers).
- **Action** Move the bodies to `private.escrow_*` and leave thin `public`
  wrappers, matching `hold_wallet_withdrawal` and `transfer_between_wallets`.
- **Reason** The grants are correct today, so this is not a hole: it is the one
  place the platform's own convention is broken, and the convention exists
  because a `public` SECURITY DEFINER function is one accidental
  `grant execute ... to authenticated` away from being reachable. That exact
  accident is what `20260806112848` was written to undo.
- **Impact** One consistent rule for where privileged bodies live.
- **Effort** M
- **Risk** A rename of a SECURITY DEFINER function used by a live path; do it
  with the wrapper in place first so nothing breaks between the two steps. Not a
  revoke, so not on the stop list.
- **Priority** Medium

#### A2-051. `escrows` blocks account deletion for settled escrows too
- **Evidence** `20260809051720` lines 98 and 99:
  `payer_id uuid not null references auth.users(id) on delete restrict` and the
  same for `payee_id`. The migration's comment justifies it for "money in
  flight" and the constraint does not distinguish flight from settlement.
  `RELEASED`, `REFUNDED` and `RESOLVED` are terminal per the same file.
- **Action** Keep the restrict, and have A2-026's `prepare_account_deletion`
  refuse only when a non-terminal escrow exists, and for terminal ones replace
  the party reference with a retained tombstone before the delete.
- **Reason** The reasoning in the migration is right and the implementation is
  wider than the reasoning. A person who completed one escrow purchase two years
  ago can never delete their account.
- **Impact** The restrict protects live money and stops being a permanent bar.
- **Effort** M, and it is part of A2-026.
- **Risk** Any change to an escrow party reference is a change to a financial
  record and needs the founder.
- **Priority** High

#### A2-052. There is no ceiling on a single funding, withdrawal or transfer
- **Evidence** `lib/wallet/schema.ts` bounds the amount but I found no
  platform-level maximum, and the database columns are
  `amount_minor bigint not null check (amount_minor > 0)`.
  `parseWebhook` in `lib/payments/yellowcard.ts` accepts anything up to
  `Number.MAX_SAFE_INTEGER` kobo.
- **Action** Add a configured per-transaction ceiling and a per-day-per-user
  total, enforced in the locking functions so it cannot be bypassed, and refuse
  above it with a message naming the limit and the route to raise it.
- **Reason** Two reasons and they point the same way. A malformed provider event
  could credit an absurd amount, and there is nothing to catch it before the
  reconciler's next hourly run. And a Nigerian property platform with no
  transaction ceiling is an AML finding waiting to happen, given SCUML applies
  (HANDOFF 01 section 3).
- **Impact** A bug or an abuse is bounded instead of unbounded.
- **Effort** M
- **Risk** A genuine high-value purchase gets refused, so the ceiling needs a
  raise path in the console rather than being hard-coded.
- **Priority** High

#### A2-053. A booking charge is settled for whatever the processor reports
- **Evidence** `app/api/paystack/webhook/route.ts`
  `handleBookingChargeSuccess` takes `data.amount` from the signed payload and
  passes it to `settleBookingCharge` as `amountMinor`. There is no comparison
  against the booking's own total.
- **Action** In `settleBookingCharge`, compare the settled amount against the
  booking total and, on a mismatch, settle nothing, write a
  `wallet.booking.charge_mismatch` audit row, and return an outcome the webhook
  answers 200 to with a loud log line for a human.
- **Reason** The amount is authentic because Paystack signed it, so this is not
  a forgery risk. It is a correctness risk: a charge initialised at the wrong
  amount, or a partial payment, currently confirms a booking for less than its
  price and nothing notices. The funding path already refuses a non-positive
  amount; the booking path should refuse a wrong one.
- **Impact** A booking is confirmed only when it has actually been paid for.
- **Effort** M
- **Risk** A legitimate rounding difference from the processor would block a
  settlement, so allow an exact match only and investigate any mismatch rather
  than tolerating a band.
- **Priority** High

#### A2-054. `wallets_overdrawn()` exists and nothing pages on it
- **Evidence** `lib/wallet/rpc.ts`'s contract block says
  `public.wallets_overdrawn()` is "a pass-through to private.wallets_overdrawn,
  which already exists and which nothing has ever called. A wallet below zero is
  a ledger that has lost an argument with itself and it must page somebody."
  `lib/wallet/reconciliation.ts` now calls it, and the reconciler reports it in
  a JSON body and an `audit_log` row. Nothing reads either.
- **Action** Have the reconciler, when `report.overdrawn.length > 0`, send an
  email to the operations address through the existing `sendMessage` and write a
  `risk_alerts` row, so it lands in a queue a human already looks at.
- **Reason** The module itself says it must page somebody and it does not. An
  overdrawn wallet means the ledger's arithmetic has failed, which is the single
  most serious condition the platform can be in.
- **Impact** The most serious money condition becomes visible within an hour.
- **Effort** S
- **Risk** Alert noise if the check is wrong; it returns nothing today on an
  empty database so the first non-empty result is meaningful.
- **Priority** Critical

#### A2-055. The reconciler is inert until two Vault secrets exist
- **Evidence** `20260809093843` `private.request_money_reconciliation()` reads
  `rentme_site_url` and `rentme_reconcile_secret` from `vault.decrypted_secrets`
  and returns `{"status":"unconfigured"}` with no request when either is absent.
  The migration's own footer records that state as verified after applying. The
  hourly job `rentme_reconcile_payments` therefore runs and does nothing.
- **Action** Founder action: set both Vault secrets, and set
  `RECONCILE_CRON_SECRET` on Vercel to the same value. Then run the endpoint once
  by hand without `apply=1`, read the report, and leave the schedule to it.
- **Reason** This is the only backstop for the failure that cost real money. It
  is built, it is scheduled, and it is switched off. The environment is the
  founder's per HANDOFF 01 section 6, so this is a handoff item rather than an
  engineering one, but it belongs at the top of the list because everything
  else in the money path assumes it runs.
- **Impact** A lost credit gets recovered automatically for 48 hours instead of
  never.
- **Effort** S, and it is not mine to do.
- **Risk** The first run with `apply=1` writes wallet entries, which is why the
  dry run comes first.
- **Priority** Critical

#### A2-056. `recordMoneyAudit` failures are invisible
- **Evidence** `lib/wallet/audit.ts` (155 lines) is the money audit writer used
  by every webhook branch and every wallet action. Like `lib/admin/audit.ts` it
  is best effort.
- **Action** On a failed audit insert, emit one `logMoney({ outcome: "failed",
  reason: "audit_write_failed" })` line so the gap is greppable on the same
  channel as everything else.
- **Reason** The money audit rows are what a reconciliation conversation joins
  on. A silent gap in them is indistinguishable from a transaction that never
  happened, which is the precise ambiguity the whole `[money]` channel was built
  to remove.
- **Impact** A missing audit row announces itself.
- **Effort** S
- **Risk** None.
- **Priority** High

#### A2-057. There is no velocity or destination-change control on withdrawals
- **Evidence** `withdraw` in `lib/wallet/actions.ts` resolves the account name
  through the bank on every attempt, which is good, and applies no limit on how
  many different destination accounts a wallet may pay out to, or how quickly.
- **Action** Refuse a withdrawal to an account added in the last hour, and
  notify the owner by email whenever a new payout destination is used for the
  first time.
- **Reason** The standard account-takeover pattern is: get in, add a new payout
  account, drain. A cooling-off period plus a notification breaks it and costs a
  legitimate person one hour once.
- **Impact** The window between compromise and loss widens from seconds to an
  hour, which is long enough for A2-014's email to be read.
- **Effort** M
- **Risk** A person in a genuine hurry is delayed; the copy has to explain why.
- **Priority** High

#### A2-058. The fee console can introduce a non-zero fee with no extra gate
- **Evidence** `lib/admin/money-actions.ts` `setFeeRate` requires only
  `requireAdmin()` (admin or super_admin) and a note of at least eight
  characters. `public.set_fee_rate` re-checks `admin` or `super_admin`. Nothing
  distinguishes setting a rate to zero from setting it above zero.
- **Action** Require `super_admin` for any rate above zero basis points or above
  zero flat kobo, keep plain `admin` for a rate of zero, and have the screen say
  which it is doing.
- **Reason** Rule 8: the platform charges nothing today. The engine correctly
  exists and is correctly zero, and `RECOMMENDATIONS.md` FEE-3 makes disclosure
  P0 the moment a rate becomes non-zero. A single admin being able to start
  charging every user, with an eight-character note, is a governance gap rather
  than a security one, and it is cheap to close. Note this action is currently
  broken anyway: see A2-062.
- **Impact** Starting to charge becomes a deliberate act by the most privileged
  role.
- **Effort** S
- **Risk** None.
- **Priority** Medium

#### A2-059. `escrow_purpose` cannot express a nightly stay or an inspection fee
- **Evidence** `20260809051720` creates
  `create type public.escrow_purpose as enum ('rent_deposit', 'first_rent',
  'purchase_deposit', 'purchase_balance')`. The migration argues well that four
  values represent four genuinely different promises. The platform also sells
  shortlets and arranges inspections.
- **Action** Before escrow reaches a user, decide whether a shortlet stay and an
  inspection fee are escrow purposes. If they are, add the values now, in their
  own migration, before any row exists.
- **Reason** The same file records that "Postgres has no DROP VALUE. Adding to an
  enum is a one-way door". Adding a value to an empty enum is free; adding it
  after the state machine, the constraints and the functions all switch on it is
  a coordinated change across a dozen places. The cheapest moment to decide is
  now.
- **Impact** Avoids a one-way door being walked through with two of the
  platform's markets unrepresented.
- **Effort** S to add, M to decide.
- **Risk** Adding a value nobody needs is clutter and cannot be undone, so the
  decision matters more than the migration.
- **Priority** Medium

#### A2-060. The crypto deposit path attributes money by an echoed email
- **Evidence** `app/api/yellowcard/webhook/route.ts`:
  `const user = event.email ? await findUserByEmail(event.email) : null`, and
  `parseWebhook` reads `row["customerEmail"]`. The route's comment explains this
  mirrors the card path deliberately.
- **Action** Carry the user id in the collection's own metadata when
  `startCryptoDeposit` opens it, and resolve from that first, falling back to the
  email exactly as `ownerOfFunding` does in the Paystack route.
- **Reason** The card path has three fallbacks in a documented order because the
  author learned metadata alone is unreliable. The crypto path has one, and it is
  the least reliable of the three. A completed, signed, correctly shaped credit
  that cannot be attributed answers 500 forever, which is better than crediting
  the wrong wallet and worse than crediting the right one.
- **Impact** Fewer unattributable crypto credits sitting in a retry queue.
- **Effort** S
- **Risk** None. The email fallback stays.
- **Priority** Medium

### 8.4 Database: correctness, schema and scale

#### A2-061. `reviewKycDocument` passes an argument the function does not declare
- **Evidence** Three sources agree.
  `lib/admin/kyc-actions.ts`:
  `access.supabase.rpc("review_kyc_document", { acting_admin: access.user.id,
  p_document, p_approve, p_reason })`.
  `lib/supabase/database.types.ts` line 3677:
  `review_kyc_document: { Args: { p_approve: boolean; p_document: string;
  p_reason: string }; Returns: Json }`.
  `20260809054243_the_console_needs_a_door_it_can_actually_knock_on.sql` line
  52 defines `public.review_kyc_document(p_document uuid, p_approve boolean,
  p_reason text)` and line 83 grants EXECUTE on that signature to
  `authenticated`. The migration's own header explains that the wrapper "takes
  one argument fewer, because the acting admin is auth.uid() rather than
  something the caller states", which was the right change. The call site was not
  updated. My RPC cross-check script found exactly two such mismatches across all
  24 `.rpc()` call sites, and `npm run typecheck` passes, so the type system does
  not catch it.
- **Action** Delete the `acting_admin` line from the call. Add the build check in
  A2-063 so the class cannot recur.
- **Reason** PostgREST resolves an RPC by the set of named parameters in the
  body, so a body carrying a fourth name matches no overload and returns
  PGRST202. `reviewKycDocument` then returns `SERVICE_DOWN`. **If that is right,
  an admin cannot approve or reject a single verification document, so no agent
  can be verified, so the agent onboarding loop does not close and the
  verification ladder cannot be climbed.** I could not probe it live, so the
  chain of evidence is the code, the generated types and the grant, and the
  conclusion is high confidence rather than verified. It is one HTTP call to
  settle and it should be settled first.
- **Impact** The operations team's core job starts working.
- **Effort** S
- **Risk** None. Removing a parameter the function does not accept cannot break
  a call that currently succeeds.
- **Priority** Critical

#### A2-062. `setFeeRate` has the identical defect
- **Evidence** `lib/admin/money-actions.ts`:
  `access.supabase.rpc("set_fee_rate", { acting_admin: access.user.id, p_kind,
  p_basis_points, p_flat_minor, p_effective_from, p_note })`.
  `database.types.ts` line 3689 declares five args and no `acting_admin`.
  `20260809054243` line 22 defines the five-argument wrapper and line 81 grants
  it. Same migration, same refactor, same missed call site.
- **Action** Delete the `acting_admin` line.
- **Reason** The fee console cannot record a rate change. The user impact is
  lower than A2-061 because every rate must be zero anyway (Rule 8), but the
  screen reports "service down" for an action that should work, and the day a
  rate genuinely needs setting is not the day to discover this.
- **Impact** The fee screen tells the truth.
- **Effort** S
- **Risk** None.
- **Priority** High

#### A2-063. Nothing checks an RPC call against the function's real signature
- **Evidence** A2-061 and A2-062 both typecheck clean. The `Args` type in
  `database.types.ts` is correct and the supabase-js `rpc` generic does not
  apply an excess-property check to it, so a wrong argument name is a runtime
  404 that no local command catches.
- **Action** Add a node script, `scripts/check-rpc-args.mjs`, that parses every
  `.rpc("name", { ... })` call site and asserts each key exists in that
  function's `Args` in `database.types.ts`. Wire it into `npm run lint` and into
  the CI job in A2-141. I wrote a working version of this in the scratchpad while
  auditing; it found both defects in under a second and produced no false
  positives on the other 22 call sites.
- **Reason** This is the highest-leverage single check available to this
  codebase. Two console screens were silently dead for 37 days and the type
  system reported nothing. The check is cheap and total.
- **Impact** A whole class of silent breakage becomes impossible to merge.
- **Effort** S
- **Risk** The parser needs to handle single-line and multi-line `Args` shapes;
  mine missed four single-line entries on the first pass, which is worth knowing
  when writing it properly.
- **Priority** Critical

#### A2-064. `database.types.ts` is generated by hand and can lag the schema
- **Evidence** `lib/wallet/rpc.ts`'s header explains that the money wrappers are
  called untyped "because they land with Agent B's migrations and are therefore
  absent from the generated database types until the types are regenerated".
  `RECOMMENDATIONS.md` P-5 asks for generation in CI and is open.
- **Action** Extends P-5: generate the types in CI and fail the build on a diff,
  and once that holds, delete the untyped escape hatch in `lib/wallet/rpc.ts`
  and `lib/security/service-rpc.ts` so the money functions are typed like
  everything else.
- **Reason** Two untyped seams exist solely because the types lag. Closing the
  lag closes the seams, and the seams are on the money path.
- **Impact** The money RPCs get the same compile-time protection as the rest.
- **Effort** M
- **Risk** Generating types in CI needs database credentials in CI, which is a
  decision about where a service key lives; use the anon-visible introspection
  path if one suffices.
- **Priority** High

#### A2-065. Six foreign keys added on 9 August have no covering index
- **Evidence** My FK check over all 167 migration files found 147 foreign key
  columns and six where no index has that column first. Each confirmed by hand
  against the creating migration:
  `escrows.release_requested_by`, `escrows.disputed_by` and
  `escrows.resolved_by` (`20260809051720`; the file creates eight indexes on
  `escrows` and none on these three), `platform_revenue.listing_id` and
  `platform_revenue.rate_id` (`20260809084522` creates only
  `platform_revenue_source_idx` and `platform_revenue_escrow_idx`), and
  `fee_rates.created_by` (`20260809051502` creates only
  `fee_rates_kind_effective_idx`). All six are `references auth.users` or
  `references public.listings`/`fee_rates` and all six were added two days after
  `docs/DATABASE_AUDIT.md` recorded `admin_bootstrap.added_by` as "the only one
  missing". From the migration files, not verified live.
- **Action** Add the six indexes in one migration and mirror it into
  `supabase/migrations/`.
- **Reason** `docs/HANDOFF.md` section 6 requires a covering index on every
  foreign key, and `DATABASE_AUDIT.md` explains why it matters more than the
  rule: five of these six point at `auth.users`, so the sequential scan happens
  inside the account-deletion transaction while it holds a lock. That is the
  same reasoning that made `admin_bootstrap.added_by` worth fixing, and A2-026
  is about to make account deletion actually run.
- **Impact** Account deletion and escrow reads stay fast as the tables grow.
- **Effort** S
- **Risk** None. Adding an index is additive.
- **Priority** High

#### A2-066. `platform_revenue` is a fourth zero-policy table and is not on the do-not-fix list
- **Evidence** My RLS check found three tables with RLS enabled and no policy:
  `rate_limits`, `idempotency_records` and `platform_revenue`.
  `docs/DATABASE_AUDIT.md` clears three by name (`idempotency_records`,
  `places_cache`, `rate_limits`) and its section 4 warns a future reader not to
  add policies to those three. `platform_revenue` was created on 9 August, after
  that document was written, and `20260809084853`'s first line confirms the
  zero-policy state is deliberate, with `public.admin_revenue_summary` as the
  only read path (correctly authorising off `auth.uid()`, which I checked).
- **Action** `docs/DATABASE_AUDIT.md` is not in my write scope. Recommend the
  lead add `platform_revenue` to the do-not-fix list in section 4, with the
  reason: the absence of a policy is the control, and the read path is
  `admin_revenue_summary`.
- **Reason** The document's own section 4 exists because "a future reader running
  the linter will see the same list and reasonably try to clear it". A fourth
  table has joined the list and the document does not know.
- **Impact** Stops a future session handing every signed-in user a read of
  platform revenue in the name of clearing an advisory.
- **Effort** S
- **Risk** None.
- **Priority** Medium

#### A2-067. `anon` lacks EXECUTE on `can_see_listing_access`, which is a latent 42501
- **Evidence** `20260804160509_light_water_and_getting_through_the_gate.sql`:
  `revoke execute on function private.can_see_listing_access(uuid) from public;
  grant execute on function private.can_see_listing_access(uuid) to
  authenticated;` and the SELECT policy on `public.listing_access` is
  `using (private.can_see_listing_access(listing_id))`. I checked whether the
  landmine fires today and **it does not**: `lib/listings/access-queries.ts`
  `readListingAccess` returns null for a signed-out caller before touching the
  table, and `hasConfirmedBooking` in the listing page takes a `userId`. So this
  is latent, not live.
- **Action** Grant `anon` EXECUTE on `private.can_see_listing_access(uuid)`.
- **Reason** This is the exact shape the brief warns about: "one non-public row
  breaks the entire anonymous catalogue read with 42501, and it would have worked
  right up until the first agent saved a draft". The function returns false for
  `anon` on every branch (`owns_listing` finds nothing for a null uid,
  `has_role(null, ...)` is false, the bookings existence check matches nothing),
  so the grant leaks nothing and is not a policy widening. It changes the failure
  mode from an error to zero rows, which is what the rest of the platform already
  does. The day somebody embeds `listing_access(...)` in a public listing select,
  as `lib/agent/listings-queries.ts` line 242 already does for the agent
  console, the anonymous listing page would 42501 with no obvious cause.
- **Impact** Removes a landmine that would present as a total failure of the
  public catalogue for a reason nobody would guess.
- **Effort** S
- **Risk** Very low, and I checked the function body rather than assuming: every
  branch is false for `anon`. A grant is reversible, unlike a revoke.
- **Priority** High

#### A2-068. `sweep_badges()` returns a count that nothing reads
- **Evidence** `20260804163804`: the function computes
  `after_count - before_count` and returns it. The cron entry is
  `select private.sweep_badges()`. `cron.job_run_details` records the outcome and
  nothing reads it (Phase 0 row 3, and the brief).
- **Action** Have the job write its return value into a small
  `private.job_runs(job_name, ran_at, result jsonb)` table, and have every other
  scheduled function do the same.
- **Reason** Eight jobs run and the only record of what any of them did is a
  table nobody queries. A count of badges awarded is exactly the number that
  reveals the sweep has been silently returning zero.
- **Impact** Every scheduled job becomes answerable without dashboard access.
- **Effort** M
- **Risk** One more write per job run, which is negligible.
- **Priority** High

#### A2-069. There is no functional probe harness for database functions
- **Evidence** `docs/HANDOFF_02_PLATFORM.md` section 18 lists this as the first
  gotcha, with two worked examples: a rate limiter that raised 42702 on every
  call after a clean DDL apply, and `min(uuid)` raising 42883 on the badge
  sweep's first run. `20260804163804`'s header says "Create a function and you
  have proved nothing. Run it." Nothing in the repository runs one.
- **Action** Add `supabase/probes/` holding one SQL file per privileged
  function that calls it inside a transaction with representative arguments and
  rolls back, plus a `scripts/run-probes.mjs` that executes them and reports.
  Start with the eleven money and admin functions.
- **Reason** The project has hit this failure five times by its own count. A
  probe suite is the only thing that turns "applied" into "works", and A2-061 is
  the application-side twin of the same problem.
- **Impact** A migration that applies cleanly and does not work stops reaching
  production.
- **Effort** L
- **Risk** Needs database credentials to run, so it belongs beside the type
  generation in A2-064.
- **Priority** High

#### A2-070. The agent application reference exposes a dead brand
- **Evidence** `20260728152104_agents_core.sql`:
  `reference text not null unique default ('NF-AGT-' ||
  lpad(nextval('public.agent_ref_seq')::text, 5, '0'))`. NF is NaijaFinds. The
  reference is shown to the applicant and quoted in support conversations.
- **Action** Change the default to a Vallo prefix in a new migration for future
  rows, and leave existing rows alone so no reference anybody has been given
  stops resolving.
- **Reason** `RECOMMENDATIONS.md` RN-3 correctly rules that payment reference
  prefixes and cron job names must never change, because the payment prefixes are
  a contract with Paystack's historical data and the webhook routes on them.
  This one is different: it is not a contract with any third party, it is
  generated fresh for each application, and it is read by a user. Named
  separately so the RN-3 rule is not applied to it by reflex.
- **Impact** New applicants do not receive a reference carrying a name the
  company abandoned.
- **Effort** S
- **Risk** Two prefixes in the table at once, which support has to recognise.
  Document it.
- **Priority** Medium `[TRACK A]` by subject, mine by mechanism.

#### A2-071. The elite badge code and label carry a dead brand
- **Evidence** `20260804105502_social_safety_bot_badges.sql` line 201 seeds
  `('rentme_elite', 'RentMe Elite', 'Every agent badge, and no open trust flag
  for ninety days.', 'AGENT', 'house-sparkle', 5, false)`. The code is referenced
  four times in `20260804163804` and once in `20260804121638`.
- **Action** Update the `name` column to the Vallo equivalent in a new
  migration. Leave the `code` alone: it is a key referenced by the sweep and by
  `user_badges.badge_code`, and renaming it is a coordinated change for no user
  benefit.
- **Reason** The `name` is what a user reads on an agent's profile. The `code` is
  an identifier and falls under RN-3's rule. Separating the two is the whole
  point of this entry.
- **Impact** The highest badge on the platform stops naming the wrong company.
- **Effort** S
- **Risk** None for the name.
- **Priority** Medium `[TRACK A]` by subject, mine by mechanism.

#### A2-072. Two database functions send notifications naming the dead brand
- **Evidence** `20260806112848`: `private.grant_staff_role` calls
  `private.notify(... 'You are now a RentMe super administrator' ...)` and
  `private.revoke_staff_role` sends 'Your RentMe console access has ended'.
  These strings are inside function bodies, so a repository-wide text rename of
  `.tsx` and `.ts` files will not reach them and neither will Track A's sweep.
- **Action** Reissue both functions with the corrected strings in a new
  migration, mirrored into `supabase/migrations/`.
- **Reason** A rename that misses the database is a rename that reappears the
  first time somebody is made an administrator. Flagged here specifically
  because it is invisible to the tooling Track A is using.
- **Impact** One less place the old name can surface after the rename is
  declared done.
- **Effort** S
- **Risk** `create or replace function` on a SECURITY DEFINER function with no
  signature change is safe. Do not rename parameters (the handoff's gotcha:
  `create or replace` cannot, a DROP is required), and nothing here needs to.
- **Priority** Medium `[TRACK A]` by subject, mine by mechanism.

#### A2-073. The open-work queues have no partial indexes
- **Evidence** `message_flags` has `message_flags_status_idx on
  public.message_flags (status)` and `agent_applications` is queried by
  `status in ('SUBMITTED','UNDER_REVIEW', ...)` in the admin console. A full
  index on a low-cardinality status column is mostly dead weight once the closed
  rows outnumber the open ones by a thousand to one.
- **Action** Add partial indexes for the queue reads: `... (created_at desc)
  where status = 'open'` on `message_flags`, and the equivalent on
  `agent_applications`, `reports` and `support_tickets`.
- **Reason** Every one of these tables grows monotonically and is read only for
  its open tail. Cheap now, and the alternative later is an index rebuild on a
  live table. From the migration files, not verified live, and not measured.
- **Impact** Admin queue reads stay constant-time as history accumulates.
- **Effort** S
- **Risk** None. Additive.
- **Priority** Medium

#### A2-074. `notifications`, `message_flags` and `audit_log` grow without bound
- **Evidence** No purge job touches any of them (the eight cron jobs are listed
  in section 4). `audit_log` is append-only by trigger, which is correct, and
  therefore grows for ever.
- **Action** For `notifications`, delete read rows older than 90 days. For
  `message_flags`, apply the retention decided in A2-030. For `audit_log`, do not
  delete: partition by month once it is large, and state the retention period in
  `docs/RETENTION_SCHEDULE.md` with the regulatory basis.
- **Reason** Three tables on a per-event write path with no ceiling. The first two
  are also personal data, so they are an A2-030 item as well as a scalability
  one. `audit_log` must not be purged, which is exactly why it needs a stated
  plan rather than a default.
- **Impact** Storage and index sizes stay predictable.
- **Effort** M
- **Risk** Deleting notifications is a data-losing change; the audit log is not
  to be touched.
- **Priority** Medium

#### A2-075. No role has a `statement_timeout`
- **Evidence** No migration sets `alter role ... set statement_timeout`. A grep
  for `statement_timeout` across `supabase/migrations/` returns nothing.
- **Action** Set a `statement_timeout` per role: a few seconds for
  `authenticated` and `anon`, longer for `service_role`, and longer still for the
  cron role. Put it in a migration so it is recorded rather than configured by
  hand.
- **Reason** A single pathological query from a signed-in user, or one of the
  unbounded admin reads in A2-101, can hold a connection for as long as Postgres
  will let it. A timeout is the cheapest availability control a Postgres
  application has and this one has none.
- **Impact** One slow query stops being able to exhaust the connection pool.
- **Effort** S
- **Risk** Too tight a timeout kills a legitimate report; the admin reads in
  A2-101 should be fixed first or they will start failing.
- **Priority** High

#### A2-076. `currency` is a free text column defaulting to NGN
- **Evidence** `wallets.currency text not null default 'NGN'`,
  `wallet_entries` inherits the wallet's, `escrows.currency text not null
  default 'NGN'`. No check constraint restricts the value.
- **Action** Add `check (currency = 'NGN')` for now, and change it to an enum
  the day a second currency is real.
- **Reason** The entire money layer assumes kobo. A row with a different
  currency string would be summed into a naira balance by
  `private.wallet_balance` with no error. Constraining it to the one value the
  code actually supports is the honest expression of the current design and it
  is free.
- **Impact** A multi-currency bug becomes impossible rather than silent.
- **Effort** S
- **Risk** If any row already holds something else the constraint fails to add.
  Check first, which needs live access.
- **Priority** Medium

#### A2-077. `amount_minor` has a lower bound and no upper bound
- **Evidence** `wallet_entries.amount_minor bigint not null check (amount_minor
  > 0)`. `escrows.amount_minor bigint not null` with no check at all in the
  columns I read.
- **Action** Add an upper bound check to both, at whatever the A2-052 ceiling
  is, times a safety factor.
- **Reason** A bigint holds 92 quadrillion kobo. A bug or a bad provider event
  producing an absurd amount would be accepted by the database and would then
  have to be reversed with a contra row rather than refused. Refusing is
  cheaper.
- **Impact** The database becomes the last line of defence on amount sanity,
  which is where the other money invariants already live.
- **Effort** S
- **Risk** None if the bound is generous.
- **Priority** Medium

#### A2-078. Nothing in the database enforces that the platform fee is zero
- **Evidence** `ledger_entries.platform_fee_minor bigint not null default 0`
  with a sign check only. `fee_rates` exists with `basis_points` and
  `flat_minor` columns and `set_fee_rate` writes them. Rule 8 lives in the
  documentation and in the fact that no rate has been set.
- **Action** Add a check constraint `platform_fee_minor = 0` on
  `ledger_entries`, with a comment naming Rule 8 and saying it is to be dropped
  deliberately, in its own migration, on the day a rate becomes non-zero.
- **Reason** The strongest invariants on this platform are the ones the database
  holds. "The platform charges nothing" is currently the weakest kind of rule:
  a convention. A constraint makes accidentally charging somebody impossible and
  makes deciding to charge them a visible, reviewable act.
- **Impact** Rule 8 becomes structural.
- **Effort** S
- **Risk** The day the decision changes, the constraint has to be dropped, which
  is the feature not the bug. If any existing row is non-zero it fails to add.
- **Priority** High

#### A2-079. There are no down migrations and no idempotency guarantee
- **Evidence** 167 files in `supabase/migrations/`. Some use `if not exists` and
  `drop policy if exists` and re-run safely; `20260809051007` cannot re-run
  safely by construction (`alter type ... add value` is guarded, but the
  surrounding ordering is not), and most `create table` statements are
  unguarded. No file has a matching down migration.
- **Action** Do not retrofit down migrations, which would be busy work on a
  live database. Instead write `supabase/README.md` (which exists, and I did not
  read it) or a section in `docs/DEPLOY.md` stating the forward-only policy
  explicitly, and add a rule that every new migration is written to be
  re-runnable.
- **Reason** Forward-only is a legitimate and common choice. The problem is that
  it is currently implicit, so the next session has no way to know whether
  re-running a migration is safe, and finds out by doing it.
- **Impact** The migration contract is written down.
- **Effort** S
- **Risk** None.
- **Priority** Medium

#### A2-080. The repository cannot prove it matches the database
- **Evidence** `RECOMMENDATIONS.md` T-10 records that the mirror drifted twice
  and is repaired, and T-4 records eight cosmetic filename mismatches. **I could
  not check either, because `list_migrations` is unreachable (section 2).** So
  today the honest position is that nobody in this session can say whether the
  167 files match what is applied.
- **Action** Add a `scripts/check-migration-mirror.mjs` that reads
  `supabase_migrations.schema_migrations` and diffs it against the filenames,
  and run it in CI. That turns T-10's residual into a mechanical check instead
  of a periodic manual audit.
- **Reason** Every database finding in this report carries the caveat "from the
  migration files, not verified live", and that caveat is only acceptable
  because the mirror is believed good. A believed mirror is not a mirror.
- **Impact** The repository stops being able to lie about the database silently.
- **Effort** M
- **Risk** Needs credentials in CI, same as A2-064 and A2-069.
- **Priority** High

