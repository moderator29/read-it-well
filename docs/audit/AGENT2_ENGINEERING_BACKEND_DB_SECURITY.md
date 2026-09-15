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

