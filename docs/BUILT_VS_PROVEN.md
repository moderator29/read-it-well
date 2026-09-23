# Built versus proven: the register for Session A's half

**Taken:** 23 September 2026, between 11:20 and 12:05 UTC.
**Measured at:** `origin/main` = `92d6eb2b`; session branch
`claude/brave-feynman-9g0ykr` = `80097483`. Where a mark is about the tree
rather than about production, the row says which of the two it is about.
**Taken by:** the register worker, alone, by opening the file, running the
command and querying the live database `uccixoonmbhrnyczyigt`.

**No verdict in this file was copied from another document.** Not from
`BUILD_07_LEDGER.md`, not from `PLATFORM_STATUS.md`, not from
`docs/email/WHAT_SENDS.md`, not from `docs/escrow/PROBE_STATE.md`, not from a
commit message. Those five were read first, so that a claim could be checked;
every claim was then re-derived. Where a document and the measurement
disagree, **the measurement wins and the disagreement is recorded in section
13**, because a thing that was claimed and turned out not to be true is worth
more to the founder than a thing that was never claimed.

---

## The three marks, and what each one costs to earn

| Mark | What it means |
|---|---|
| **DONE** | The real thing was exercised, and the outcome was observed. For a job, a production run with its own audit row. For a privilege, the live catalogue. For a table, a count. The evidence and its date are in the row. |
| **BUILT AND UNPROVEN** | The code exists and reads correct, and the thing it does has never been observed happening for real. A unit test that asserts on source text, on a mock, or on a hand-built copy of a live object leaves an item here, and the row names which kind of test it is. |
| **NOT BUILT** | There is no code, or the code cannot reach the wire. |

**Two rules applied throughout.**

An HTTP 200 is not a render. A Next.js layout `notFound()` answers 200 with
the not-found body, so a render claim needs the `[data-nf-not-found]` marker
checked, in a browser. A grep is not a render either, and a test asserting on
source text is not a statement about behaviour.

`mcp__Supabase__execute_sql` runs as `supabase_read_only_user`, which holds
`rolbypassrls`. **It can therefore never demonstrate an RLS refusal**, and no
row below claims one from it. It is used for counting rows and for reading the
catalogue, which is what it is sound for. Every privilege statement below is
read from `pg_class.relacl`, `pg_attribute.attacl` and `pg_proc.proacl`, never
from `information_schema`, whose privilege views answer about the observer
rather than about the object.

**The egress wall, re-tested today rather than assumed.** At 11:34:50Z, from
this container:

```
uccixoonmbhrnyczyigt.supabase.co -> 000
api.resend.com                   -> 000
api.paystack.co                  -> 000
```

All three are refused by the proxy. **Anything whose proof needs one of those
three over HTTP is UNPROVEN and cannot be made otherwise from here.** That is
stated rather than worked around.

---

## 0. The floor: what main actually does when you run it

| Gate | How, today | Result |
|---|---|---|
| Test suite at `origin/main` | `git worktree add --detach` at `92d6eb2b`, `node_modules` hardlinked with `cp -al` at BOTH the root and `apps/web`, never a symlink; `npx vitest run` from `apps/web` | **222 files, 3613 passed, 1 skipped, exit 0**, 185s, 11:31 to 11:35 UTC |

**Mark: DONE, and it is a verdict about main rather than about the shared
worktree.** The shared tree `/home/user/read-it-well` has thirteen modified
files and thirteen untracked paths in it from other writers at the moment of
writing, so a run there would have measured a tree nobody deploys. This one
did not.

**What this gate does NOT say.** 3613 green tests is a statement about 222
test files. It is not a statement about any of the twelve blocks below,
because most of what follows has no unit test that could fail for the reason
the block would fail.

---

## 1. The seven cron routes and the pg_cron path

### 1.1 The seven routes

`apps/web/src/app/api/cron/` holds exactly seven `route.ts` files, counted
today with `find`. `apps/web/vercel.json` schedules eight paths: those seven
plus `/api/paystack/reconcile`.

**How the mark was established.** Not from the route file and not from a log
line, but from `public.audit_log`, which each route writes into through
`lib/cron/run.ts`. Grouped by `action` with first and last timestamp:

| Route | Schedule in `vercel.json` | Audit action | Production runs | First | Last |
|---|---|---|---|---|---|
| `/api/cron/email-outbox` | `*/15 * * * *` | `cron.email-outbox.ok` | **6** | 2026-09-23 10:15:03Z | 2026-09-23 11:30:04Z |
| `/api/cron/hold-sweep` | `5 * * * *` | `cron.hold-sweep.ok` | **18** | 2026-09-22 18:05:36Z | 2026-09-23 11:05:36Z |
| `/api/cron/pg-cron-watch` | `20 * * * *` | `cron.pg-cron-watch.ok` 3 + `.attention` 15 | **18** | 2026-09-22 18:20:03Z | 2026-09-23 11:20:02Z |
| `/api/cron/complete-stays` | `30 2 * * *` | `cron.complete-stays.ok` | **1** | 2026-09-23 02:30:18Z | same |
| `/api/cron/inventory-drift` | `45 2 * * *` | `cron.inventory-drift.ok` | **1** | 2026-09-23 02:45:45Z | same |
| `/api/cron/account-purge` | `15 3 * * *` | `cron.account-purge.ok` | **1** | 2026-09-23 03:15:07Z | same |
| `/api/cron/saved-search-alerts` | `40 7 * * *` | `cron.saved-search-alerts.ok` | **1** | 2026-09-23 07:40:40Z | same |

**Mark: DONE, all seven.** Every one of the seven has run in production, on
its own schedule, and left an audit row it wrote itself. The four daily jobs
have run once each because they have each had exactly one opportunity since
the deployment that carries them. This is the strongest evidence in this
register and it is the only block in it that earns DONE outright.

**What DONE does and does not mean here.** It means the route was reached,
authenticated against `RECONCILE_CRON_SECRET`, ran its job and recorded the
outcome. It does not mean the job did anything: `cron.email-outbox.ok` six
times over a queue with zero rows in it is six correct runs that sent nothing
(section 2). A route that runs and correctly does nothing is a working route,
and it is not a working feature.

**One of the eight is not one of the seven.** `/api/paystack/reconcile`
(`wallet.reconciliation.run`, **511 rows**, 2026-08-09 18:10:07Z to
2026-09-23 11:10:18Z) is the oldest live job on the platform and by far the
most exercised. **Mark: DONE.**

### 1.2 The pg_cron path

**How the mark was established.** `select ... from cron.job` joined to
`cron.job_run_details`, today.

Fourteen jobs are registered and active. Thirteen have run. **One has never
run:**

| pg_cron job | Schedule | Runs | Failures | Last |
|---|---|---|---|---|
| `vallo_release_stale_holds` | `*/15 * * * *` | 91 | 0 | 2026-09-23 11:30:00Z |
| `vallo_purge_rate_limits` | `30 * * * *` | 23 | 0 | 2026-09-23 11:30:00Z |
| `vallo_escrow_sweep_timeouts` | `17 * * * *` | 23 | 0 | 2026-09-23 11:17:00Z |
| `vallo_reconcile_payments` | `47 * * * *` | 23 | **1** | 2026-09-23 10:47:00Z |
| `vallo_push_drain` | `*/5 * * * *` | 19 | 0 | 2026-09-23 11:30:00Z |
| `vallo_escrow_invariants` | `23 * * * *` | 13 | 0 | 2026-09-23 11:23:00Z |
| `vallo-nightly-badges` | `20 2 * * *` | 1 | 0 | 2026-09-23 02:20:00Z |
| `vallo_purge_idempotency` | `10 2 * * *` | 1 | 0 | 2026-09-23 02:10:00Z |
| `vallo_escrow_book_the_float` | `5 3 * * *` | 1 | 0 | 2026-09-23 03:05:00Z |
| `vallo_sweep_price_check_events` | `40 3 * * *` | 1 | 0 | 2026-09-23 03:40:00Z |
| `vallo_announce_completed_stays` | `20 5 * * *` | 1 | 0 | 2026-09-23 05:20:00Z |
| `vallo_sweep_price_check_watches` | `50 5 * * *` | 1 | 0 | 2026-09-23 05:50:00Z |
| `vallo-daily-note` | `0 6 * * *` | 1 | 0 | 2026-09-23 06:00:00Z |
| **`vallo_purge_email_outbox`** | `25 2 * * *` | **0** | - | **never** |

**Mark for the pg_cron path as a whole: DONE for thirteen of fourteen jobs,
BUILT AND UNPROVEN for `vallo_purge_email_outbox`.**

**A counting trap inside this measurement, recorded because it nearly went
into this file as a fact.** The first version of the query used
`count(*)` over a `left join`, which returns **1** for a job with no runs at
all. `vallo_purge_email_outbox` read "1 run" with a null timestamp. It has
zero. The null date is what gave it away. A register that had reported the
count without the date would have said this job runs.

**`vallo_reconcile_payments` has one non-succeeded run out of 23.** It is not
the most recent and the job has run successfully since. The failure was not
diagnosed in this pass; see section 14.

**What proving the outstanding one would take.** Nothing but time: it is a
`25 2 * * *` job registered after 02:25 today, so its first opportunity is
02:25 tomorrow. Re-read `cron.job_run_details` after that and it becomes DONE
or a defect, one or the other.

---

## 2. The email junction

`docs/email/WHAT_SENDS.md` was read first and then checked. It is an unusually
honest document and most of it survives checking. What it gets wrong, it gets
wrong in the direction of being too generous, and that is in section 13.

### 2.1 Has anything ever been sent

**How the mark was established.** `select count(*) from public.email_outbox`.

```
email_outbox: 0 rows. SENT 0. PENDING 0. FAILED 0.
```

**Mark: NOT BUILT, in the only sense the founder is asking about. Nothing has
ever been sent, and more than that: nothing has ever been QUEUED.** The table
is not a queue with unsent mail in it. It is empty. No trigger on `auth.users`,
`auth.sessions`, `public.escrows`, `public.wallet_entries`,
`public.inspection_requests`, `public.agent_verification_checks` or
`public.messages` has ever written a row into it in production.

This is a materially different statement from the one the documents make, and
it is the single most important line in section 13.

### 2.2 The templates, and whether each has a path to the wire

**How the mark was established.** The registry itself, not the prose:
`OUTBOX_TEMPLATES` in `apps/web/src/lib/notify/templates.ts` exports exactly
fifteen keys, extracted today:

`account.welcome`, `escrow.INITIATED`, `escrow.HELD`,
`escrow.RELEASE_REQUESTED`, `escrow.RELEASED`, `escrow.REFUNDED`,
`escrow.DISPUTED`, `escrow.RESOLVED`, `escrow.CANCELLED`,
`security.password_changed`, `security.new_device_sign_in`,
`wallet.withdrawal_outcome`, `inspection.scheduled`,
`verification.rung_passed`, `listing.new_enquiry`.

Fifteen, matching the document. The builder count was also re-derived:
`lib/email/messages.ts` 26, `escrow-messages.ts` 8,
`payment-instrument-messages.ts` 2, `listings.ts` 1, `welcome-message.ts` 1,
plus two in `lib/account-deletion/`. **Thirty eight has a path to it**; the
exact partition between 35 reachable and 3 refused was not independently
re-derived and is called out in section 14.

| Group | Count | Mark | How the mark was established |
|---|---|---|---|
| The fifteen outbox templates | 15 | **BUILT AND UNPROVEN** | The registry exports all fifteen keys; `outbox-delivery.test.ts` walks each one to a stubbed `globalThis.fetch` and asserts the HTTP request that WOULD go out. Passing today at `origin/main`. **That test replaces the socket**, so it proves the message, never the delivery. `email_outbox` holds zero rows, so no trigger has ever written one. |
| The twenty direct senders | 20 | **BUILT AND UNPROVEN** | Same: every one goes through `bestEffortEmail`, which is a no-op while `isEmailConfigured()` is false. No key on the deployment, and `api.resend.com` is refused from here. |
| The three refused builders | 3 | **DONE as refusals** | `lib/email/reachability.test.ts` fails in both directions: red if somebody wires a refused builder, red if a reachable one loses its last caller. Passing today at `origin/main`. This is the one email claim where a unit test IS the real thing, because the assertion is about the import graph and the import graph is what is being claimed. |
| `verificationCode`, the sign-up code | 1 | **NOT BUILT, as a live path** | The route exists and is correct. The Send Email Hook is not enabled, so GoTrue sends its own mail from `noreply@mail.app.supabase.io` and the route is never called. Not re-derived from `auth_logs` today: `auth_logs` was not queried in this pass. See section 14. |

**What proving the junction would take, in order.**

1. `RESEND_API_KEY` on the deployment. That is the founder's, and it is one
   paste.
2. Before that: fix the double send on a failed withdrawal, which
   `WHAT_SENDS.md` finding 1 proved against the live catalogue. One failed
   withdrawal is two emails, from the trigger and from three direct call
   sites.
3. Then a human being reads the first email that arrives, in a real inbox, and
   looks at the From line, the dark rendering and the spam verdict. **No test
   in this repository can produce any of those four facts**, and the box this
   register was written on cannot reach Resend to try.

---

## 3. Escrow

`docs/escrow/PROBE_STATE.md` was read first and then the live catalogue was
read directly, which is the check the brief asked for.

### 3.1 The live catalogue, read today from `pg_proc.proacl`

Thirty one escrow functions exist across `public` and `private`. The privilege
claims in `PROBE_STATE.md` were checked one at a time:

| Claim in the document | Catalogue today | Verdict |
|---|---|---|
| `escrow_fund_from_wallet_as` retired, `{postgres=X/postgres}` and nothing else | `postgres=X/postgres` | **holds** |
| `escrow_propose_as` holds `service_role=X/postgres` and nothing else | `postgres=X/postgres \| service_role=X/postgres` | **holds** |
| `escrow_fund_proposal_as` the same | `postgres=X/postgres \| service_role=X/postgres` | **holds** |
| The escrow verbs are shut to `anon` and `authenticated` | **`public.escrow_admin_resolve` holds `authenticated=X/postgres`**, and `private.escrow_evidence_path_access` holds `authenticated=X/postgres` | **does NOT hold as stated, see below** |

**The finding this register contributes.** `public.escrow_admin_resolve(p_escrow
uuid, p_direction text, p_note text)` is `SECURITY DEFINER` and its ACL reads
`postgres=X/postgres | authenticated=X/postgres | service_role=X/postgres`.
**Every signed-in account on this platform can EXECUTE the verb that resolves a
dispute.** The same is true of `private.escrow_evidence_path_access`.

That is not by itself a hole: both presumably guard internally, and
`escrow_admin_resolve` is the kind of verb a signed-in admin has to be able to
call. But rule 21 of the ledger says BORN LOCKED, and the summary sentence
"`anon` and `authenticated` are refused by Postgres itself on every revoked
escrow verb" is true only of the eleven verbs the probe chose. It is not true
of the escrow surface. **The grant is real, it was read from `proacl` today,
and whether the internal guard is sound was NOT checked in this pass**, because
demonstrating a refusal needs a non-`rolbypassrls` role and this tool has none.

### 3.2 Escrow in production

**How the mark was established.** `select count(*) from public.escrows`.

```
escrows: 0 rows.
```

**Mark: BUILT AND UNPROVEN, and the gate is correctly shut.** No agreement has
ever existed in production. No naira has ever moved through escrow. The
machinery has been exercised only against a hand-built local copy of the tables
in the probe harness, and against production only inside transactions that
deliberately raise and roll back.

`vallo_escrow_invariants` has run 13 times with a clean baseline and
`vallo_escrow_sweep_timeouts` 23 times, both against zero rows. **Thirty six
successful runs of two jobs over an empty table is thirty six correct runs and
zero evidence about escrow.** That is exactly the shape of a blind light and
it is recorded as such rather than counted as progress.

### 3.3 P-7's HTTP half

**Mark: NOT BUILT, as a verdict.** Re-tested at 11:34:50Z today:
`uccixoonmbhrnyczyigt.supabase.co` answers `000` through this container's
proxy. **It has never run and it cannot run from here.** The EXECUTE half
cannot stand in for it, because PostgREST resolves an RPC by argument name
against a cached schema and a verb shut in `pg_proc` can still be answerable
over the wire through an unrevoked overload or a stale cache. The document is
right about this and the block is confirmed, not removed.

**What proving it would take.** The founder allows `*.supabase.co` out of this
sandbox, or somebody runs `scripts/probes/escrow_revoke.sh` from a machine that
can reach the host. It is one command from anywhere else.

---

## 4. Push

**How the mark was established.** Three counts on the live database, and the
catalogue for the tables.

```
push_tokens:     0 rows
push_queue:      0 rows
push_deliveries: 0 rows
```

**Mark: BUILT AND UNPROVEN. Nothing has reached a device, and no device has
ever registered one.**

The database half is real and the transport code exists:
`lib/push/transport/` holds `apns.ts`, `fcm.ts` and `webpush.ts` with
`live-proof.test.ts` and `webpush.test.ts` beside them.
`private.request_push_drain()` runs every five minutes on pg_cron, has run 19
times since 10:00Z today, has never failed, and each run leaves a
`cron.push-drain.ok` row in `public.audit_log` (14 of them). **Nineteen
successful drains of an empty queue.**

`push_tokens` at zero is the load-bearing number. A drain that never fails
over a queue that never fills, fed by a token table nobody has ever written
to, is three layers of correct behaviour with no user anywhere near it.

**What proving it would take.** One real device registering a token through
`lib/push/devices-actions.ts`, one queued notification, and a human seeing the
banner. Nothing in this repository can substitute for the last step, and
`live-proof.test.ts` is a test against a stubbed transport, not a delivery.

---

## 5. Price Check

**How the mark was established.** The catalogue for the three tables, the
suite for the logic, and the file tree for the surface.

| Table | `relacl` today | What it says |
|---|---|---|
| `price_check_events` | `postgres`, `service_role`, `authenticated=r` | readable signed in, writable only by the service role |
| `price_check_shares` | `postgres`, `service_role` **only** | **`anon` holds nothing.** The `created_by` leak the last cycle reported is shut at the table grant, confirmed from `relacl` today, not from the fix's commit message |
| `price_check_watches` | `postgres`, `service_role`, `authenticated=ard` | signed-in insert, select, delete |

`lib/price-check/` holds 24 modules with 9 test files. All pass at
`origin/main` today, including `share-card.test.ts` (19 tests),
`refusals.test.ts` (10), `route-openness.test.ts` (3), `og-palette.test.ts`
and `regulated-words.test.ts`.

**Mark: BUILT AND UNPROVEN.**

The logic, the refusal states, the share-card composition and the rule that no
artefact may carry an address are all held by tests that exercise real
functions rather than source text, and that is worth something. But the
surfaces at `app/(app)/price` and `app/(dev)/preview/price` were **not
rendered in a browser in this pass**, and the two nightly sweepers
(`vallo_sweep_price_check_events`, `vallo_sweep_price_check_watches`) have each
run exactly once, against tables whose contents were not counted in this pass.
The OG image renders through `@vercel/og` and the naira-sign defect the last
cycle found was a silent failure only visible inside somebody else's chat app;
**that class of defect cannot be caught by any check in this repository** and
this register did not look at a rendered card.

**What proving it would take.** Open `/price` on a 390px viewport in dark,
check `[data-nf-not-found]` is absent, walk one valuation to a refusal and one
to a result, share it, and look at the card that arrives in a real chat app.

---

## 6. Track G: the supply roles

**How the mark was established.** Two things: the column grant, and the data.

The grant, from `pg_attribute.attacl`, which is the right place and the reason
is in section 13: **`public.listings.relacl` shows `anon=awdDxtm`, with no
`r`.** Read at the table level alone, anon has INSERT, UPDATE, DELETE and
TRUNCATE on the listings table and NO SELECT, which reads like a catastrophe.
It is not one. Sixty four columns carry `anon=r/postgres` as **column-level**
grants, `listing_role` among them, and a column grant does not appear in
`relacl`. Anonymous catalogue reads work. **A worker checking `relacl` alone
would have filed a false emergency, and a worker checking `information_schema`
would have got an answer about themselves.**

`private.owns_listing(uuid)` reads `postgres=X | anon=X | authenticated=X`
today, so the revoke that made the examples look deleted is genuinely undone in
production, confirmed from the catalogue rather than from the fix's commit.

The data:

```
select listing_role, status, count(*) from public.listings group by 1,2
-> agent | PUBLISHED | 64
```

**Mark: BUILT AND UNPROVEN, and it renders for nobody.** Every one of the 64
published listings carries `listing_role = 'agent'`. There is not a single
`owner` row and not a single `firm` row in production. The read half is wired,
the column travels to the detail page, and the string "Listed by the owner" has
a code path that will never be taken with today's data. The ruling that
distinguishes an owner from an agent from a firm is, as a thing a visitor can
see, **entirely theoretical**.

**What proving it would take.** One listing created through the owner form,
which is the write half, and then the detail page opened and read. That is a
Track G write-side question, not a read-side one.

---

## 7. Navigation

**How the mark was established.** `ROUTE_PARENTS` in
`apps/web/src/lib/nav/route-parents.ts` declares **189** route patterns. The
twenty two routes in question are the subset that declare a parent and drew no
back control. The walk artefacts in `docs/design/proofs/nav/` were counted row
by row.

| Artefact | State in git | Route rows | Verdict tally |
|---|---|---|---|
| `walk.md` | **committed**, at `f70c0bbe` | 22 | 15 correct, 2 WRONG DESTINATION, 2 NOT REACHED (redirected to `/welcome`), 2 NOT REACHED (not-found body at 200), 1 NO CONTROL |
| `walk-subjects.md` | **untracked** | 22 | 15 correct, 2 correct-but-parent-gated, 2 NOT REACHED, 1 NO CONTROL |
| `walk-dynamic.md` | **untracked** | 22 | 6 correct, 8 NOT REACHED, 1 gated |
| `walk-added.md` | **untracked** | 22 | 2 correct, 11 NO CONTROL, 6 NOT REACHED, 2 gated |
| `walk-gated.md` | **untracked** | 6 | 5 NOT REACHED, 1 gated |

**Mark: BUILT AND UNPROVEN.**

The walk is a real walk. It drove Chromium, it pressed the control, it recorded
where the browser landed, and it caught two routes serving a not-found body
under a 200, which is precisely the trap this register was warned about. It is
a better instrument than anything else on this platform.

**But no row in it is a verdict I took.** The committed artefact predates
today's navigation work. The four that reflect today are **untracked files in
the shared worktree**, which is to say they are one writer's in-flight output
and not part of main. **The walk was not re-run in this pass**, because it needs
a built app and a browser and the hour did not have that in it.

**What proving it would take.** `node scripts/design/proof-nav.mjs` against a
build of `origin/main`, with the output committed, and the `[data-nf-not-found]`
marker checked on every route the walk says it reached. Under thirty minutes
for somebody with a warm build.

---

## 8. The wallet and payments

**How the mark was established.** Counts and audit rows.

| Thing | Measurement today | Mark |
|---|---|---|
| The reconciliation job | `wallet.reconciliation.run`, **511** audit rows, 2026-08-09 to 2026-09-23 11:10Z | **DONE** |
| Money that has actually moved | `public.wallet_entries`: **2 rows**, in total, ever | see below |
| Funding | `wallet.funding.started` 1 (2026-09-19), `wallet.funding.recovered` 1 (2026-08-09) | **BUILT AND UNPROVEN** |
| Withdrawal | `wallet.withdrawal.hold_placed` 1 and `wallet.withdrawal.not_started` 1, both 2026-08-10, **and nothing since** | **BUILT AND UNPROVEN** |
| `transferToBank`, request B-BANK (b) from Session B | not searched for in this pass | see section 14 |

**Mark for the block: BUILT AND UNPROVEN.** Two wallet entries in the lifetime
of the platform, the last money event of any kind six weeks ago, and the one
production payout refused by Paystack with "You cannot initiate third party
payouts as a starter business". `api.paystack.co` is refused from this
container, so no payment path can be exercised from here at all.

The reconciliation job is the exception and it is genuinely DONE: 511 real runs
over six weeks is the most-exercised thing on this platform.

**What proving it would take.** The Paystack account upgraded off starter, then
one real funding and one real payout watched end to end. The account upgrade is
the founder's and nothing engineering can do substitutes for it.

---

## 9. The search and catalogue reads

**How the mark was established.** The column grants in section 6, plus the
row counts.

```
listings: 64, all PUBLISHED
posts:    75
profiles:  7
```

**Mark: BUILT AND UNPROVEN.**

The permission fault that made the examples look deleted is confirmed undone at
the catalogue: `private.owns_listing` is executable by `anon` and
`authenticated`, and all 64 listing columns the catalogue needs carry
`anon=r`. That is the cause, checked at the cause rather than at the symptom.

**What was NOT established: that a browser draws them.** No page was rendered
in this pass. Sixty four rows readable by `anon` at the grant layer is a
necessary condition for the catalogue to work and not a sufficient one, because
seventeen RLS policies sit between the grant and the row and
`supabase_read_only_user` holds `rolbypassrls`, so **this tool physically
cannot tell whether RLS lets a real anonymous visitor see any of those 64
rows.** That is the honest boundary of the measurement.

There is also a latent fault in the read layer that was not fixed and is
recorded here so it is not lost: `lib/social/posts-queries.ts`
`readPostListings` selects `price_per_night_minor` and `price_period`, and
neither column is in the 64 that `attacl` lists. It is latent only because no
post carries a `listing_id` today. And `supabase-repository.ts` still turns a
query error into an empty market, which is the reason a permissions fault
presented as "the listings are gone" rather than as an error. **Both are still
open.**

---

## 10. The admin reads that belong to Session A

**How the mark was established.** The suite at `origin/main` and the catalogue.

`src/lib/admin/reads/moderation.test.ts` (3 tests),
`src/lib/admin/reads/verification.test.ts` (3),
`src/lib/admin/payments-authorisation.test.ts` (33) and
`src/app/admin/_review/metrics.test.ts` (9) all pass at `origin/main` today.

Production evidence that an admin has ever used the console: **one row**,
`agent_application.review`, 2026-09-22 18:05:55Z. That is the whole of it.

**Mark: BUILT AND UNPROVEN.**

One admin action in the platform's history, and the moderation desk itself
carries a written admission that it cannot do its job:
`ModerationDesk.tsx` line 254 says in as many words that reading the blocked
terms list needs an admin read on `public.blocked_terms` **which has none**,
and files it as request AR-11. Confirmed from `relacl` today:
`blocked_terms` grants `postgres` and `service_role` and nothing else, so no
admin role can read it. **The desk is honest about the hole, and the hole is
real.**

---

## 11. The blocked terms filter

The brief is right that this is a table anybody can count, and counting it is
the whole answer.

**How the mark was established.**

```
select count(*) from public.blocked_terms -> 0
```

```
relacl: postgres=arwdDxtm/postgres | service_role=arwdDxtm/postgres
relrowsecurity: true
```

**Mark: BUILT AND UNPROVEN, and the filter is NOT IN FORCE.**

The table exists, RLS is on, the grants are tight, and
`private.objectionable_pattern()` builds its regular expression from it.
**With zero rows that function returns null, and BOTH post scanners skip the
abuse branch entirely.** Every post and every bio written on this platform
since the table was created on the evening of 22 September has been accepted
with no objectionable-content filter in front of it. Seventy five posts exist.

The code handles this correctly and says so out loud, which is to its credit:
`lib/cron/content-filter.ts` raises a distinct finding for an empty list
(line 181) and a *different* one for a list it could not read (line 167),
because "the filter is off" and "I do not know whether the filter is on" are
two different sentences and conflating them is how a blind light is born. The
`pg-cron-watch` job reports `blocked_terms: -1` when it cannot read the count
rather than reporting 0, for the same reason. **That is the best-written
defensive code found anywhere in this pass.**

The fraud checks (account numbers, payment language) are a separate branch and
are unaffected.

**One caveat on the test that guards this.**
`src/lib/safety/user-generated-content.test.ts` asserts on the **text of the
migration file** (`expect(migration).toContain("alter table
public.blocked_terms enable row level security")`). That is a test asserting
on source text and it proves nothing about the live database. It happens to be
right today, because `relrowsecurity` reads true, but it would have gone on
passing if somebody had disabled RLS in production. **Checked against the
catalogue, not against the test.**

**What proving it would take.** The founder inserts the agreed terms. This is
deliberately not seeded by an engineer, which is the correct call: the term
list is a product decision. The scanners pick it up on the next write with no
deploy. **This is the cheapest open item on the whole platform and it is
blocking a real safety function.**

---

## 12. The trust badge

Listed because Session B's scope file assigns the derivation to Session A and
Session B's surfaces are recorded as blocked on it.

**How the mark was established.** `public.person_badge` exists as a **view**
with `anon=r/postgres | authenticated=r/postgres`, which is the shape Session B
was promised. `src/lib/trust/agent-badge-derivation.test.ts` (7 tests) passes
at `origin/main`. The component tree `src/components/trust/` and
`src/lib/trust/badge-tier.ts` exist in the shared worktree as **untracked
files**, which is to say they are not in `origin/main`.

**Mark: BUILT AND UNPROVEN, and the component half is not on main.**

**A measurement I could not take, stated rather than guessed.** `select tier,
count(*) from public.person_badge` was refused: `permission denied for
function is_platform_staff`. The view calls it and
`supabase_read_only_user` does not hold EXECUTE. `is_platform_staff` reads
`anon=X | authenticated=X | service_role=X` from `proacl`, so a real reader can
call it and the view is not broken for the product. **But I cannot tell the
founder how many gold or platinum badges exist**, including whether the
platinum grant to his own account landed.

---

## 13. Where a document and the measurement disagree

The founder asked for this explicitly. Six.

**1. "The queue fills correctly and loses nothing meanwhile"
(`WHAT_SENDS.md`).** `public.email_outbox` holds **zero rows**. The queue has
never filled. No trigger has ever fired in production. The sentence describes a
queue accumulating unsent mail behind a missing API key, and the true state is
that the enqueue path has never once been exercised either. Both halves of the
junction are unproven, not one.

**2. "19 of 22 drawn and correct, 3 correctly draw nothing"
(`PLATFORM_STATUS.md`, cycle 4 table).** The committed walk artefact
`docs/design/proofs/nav/walk.md` at `f70c0bbe` reads **15 correct**, with 2
WRONG DESTINATION, 2 redirected to `/welcome`, 2 serving a not-found body under
a 200, and 1 with no control at all. The best of the four untracked artefacts
reads 15 correct plus 2 correct-but-gated, which is 17. **No artefact in this
repository reads 19.** Either the figure is from a run whose output was not
kept, or it counts something the artefacts do not.

**3. "`anon` and `authenticated` are refused by Postgres itself on every
revoked escrow verb" (`PROBE_STATE.md`, P-7 EXECUTE).** True of the eleven
verbs the probe names. Not true of the escrow surface:
`public.escrow_admin_resolve` and `private.escrow_evidence_path_access` both
hold `authenticated=X/postgres` in `proacl` today. The claim is sound about
what it tested and its summary sentence is wider than what it tested.

**4. The "seven cron routes have run" question was never claimed, and the
answer is better than the documents imply.** `PLATFORM_STATUS.md` cycle 4 makes
no claim either way. All seven have run in production with their own audit
rows. **This is the one place in the register where the true figure is higher
than the documents suggest**, and it is recorded with the same care as the
places where it is lower.

**5. `vallo_purge_email_outbox` is registered and active and has never run.**
No document says otherwise; no document says it either. A fourteen-job pg_cron
table where thirteen have run reads as a working scheduler, and one job in it
has produced nothing.

**6. `public.listings.relacl` shows no SELECT for `anon`.** No document
mentions this, and it looks exactly like the fault that made the examples
disappear. It is not that fault: sixty four column grants in `attacl` carry it.
**Recorded because the next worker who runs the obvious query will believe the
platform is broken**, and will be wrong, and the five minutes that costs are
avoidable.

---

## 14. What I skipped, unprompted

This register measured what could be measured in forty five minutes from a box
with no route to Supabase over HTTP, no route to Resend, no route to Paystack
and no time for a build. **Everything below is genuinely unchecked, not
checked-and-fine.**

1. **No page was rendered in a browser. Not one.** No `[data-nf-not-found]`
   marker was checked by me. Every render claim anywhere in this register is
   somebody else's and is marked unproven for that reason. This is the largest
   single hole in the file.
2. **The navigation walk was not re-run**, so the 22 routes have no verdict
   taken today. Section 7 counts other people's artefacts and says so.
3. **The escrow probe harness was not run.** The fourteen local results in
   `PROBE_STATE.md` are re-reported as that document's claims, not as mine. I
   checked its privilege claims against the catalogue and nothing else.
   Specifically I did not re-verify the catalogue-guard hashes, the mutation
   log, or that the harness was run from a `git archive` of `origin/main`.
4. **No typecheck and no lint and no build were run**, at `origin/main` or
   anywhere. The ledger's floor is four gates and I measured one of them. The
   suite is green; `tsc`, `eslint` and `next build` at `92d6eb2b` are
   **unknown** as of this writing.
5. **RLS was not tested and cannot be tested from here**, because the only SQL
   role available holds `rolbypassrls`. Every policy on every table in this
   register is unverified. The grants are checked; the policies are not.
6. **`auth_logs` was not queried**, so `verificationCode`'s NOT BUILT mark
   rests on `AUTH_EMAILS.md`'s reading of `mail_from`, which is the one verdict
   in this file taken partly from a document. It is flagged rather than
   laundered.
7. **The 35-reachable / 3-refused partition of the 38 email builders was not
   independently re-derived.** I counted 38 builders and confirmed the 15
   outbox keys. The reachability test passes, which is real evidence, but I did
   not walk the import graph myself.
8. **`transferToBank` (Session B's request B-BANK part b) was not looked for.**
   I do not know whether it exists.
9. **The one failed `vallo_reconcile_payments` run was not diagnosed.** I have
   its existence and not its cause.
10. **Price Check's three tables were not counted**, so I do not know whether
    the two nightly sweepers swept anything.
11. **The badge tier counts could not be read** (section 12), so the platinum
    grant to the founder's account is unverified.
12. **The twelve governing images were not compared against anything.** Their
    percentage in section 15 is a structural count and is labelled as such,
    because a governing image is closed by a human comparing a screenshot to a
    render and no such comparison happened here.

---

## 15. The numbers, each with its denominator in words

**Rule applied throughout: a fraction counts an item as closed only if it
earned DONE in this register.** An item that is BUILT AND UNPROVEN counts as
zero, because that is the whole point of the exercise. A second column counts
"built", which is the number that feels like ninety, so the founder can see
both and see the gap between them.

### Per brief

| Brief and part | Denominator, in words | Proven | Built | Proven % | Built % |
|---|---|---|---|---|---|
| **HANDOFF 05, PART ONE, the backend** | The eight lettered items B0 to B7 in section 1 of the brief: inherited debts, the founder-gated pair, the stays read layer, the consumer dead-ends, the lifecycle jobs, the security hardening, the crypto proxy, and admin enrichment. | **1 / 8** (the lifecycle jobs, B4, which are the pg_cron and route jobs of section 1 and have production runs) | 7 / 8 | **13%** | 88% |
| **HANDOFF 05, PART TWO, the frontend** | The five lettered items F1 to F5: chrome and navigation, the landing and marketing shell, catalogue and money surfaces, social and identity, conversations and operations. | **0 / 5** | 4 / 5 | **0%** | 80% |
| **HANDOFF 08, the countable rows** | The brief's own total in section 9.1: **157 distinct build items** across five research files (40 audit rows, 25 store work orders, 32 on-platform departures, 32 uniqueness defects, 28 email and notification items). The five newer files are tracks and are counted below instead. | **not counted item by item in this pass** | - | **not stated** | - |
| **The twelve governing images** | The twelve files in `docs/design/references/roles/`, `GOVERNING-01` to `GOVERNING-12`, which are the founder's targets of 22 September. | **0 / 12** | unknown | **0%** | unknown |

**The 157 is left blank on purpose.** I did not open five research files and
tick 157 boxes in the time available, and inventing a fraction for it would be
the exact failure this register exists to prevent. It is the largest single
denominator on the platform and it is unmeasured today.

**The twelve governing images read 0 of 12 proven and that is not the same as
0 built.** A governing image is closed when a human compares the render to the
target. No such comparison was made today by me, and section 14 item 12 says
so. The honest reading is "unmeasured", and it is scored zero rather than
omitted, because omitting it would flatter the total.

### Per track

| Track | Denominator, in words | Mark | Proven fraction |
|---|---|---|---|
| **H08 Track A**, nobody leaves Vallo | The 32 rows of `ON_PLATFORM_SWEEP.md`: 24 departures to close and 8 half-built flows. | not counted | **not stated** |
| **H08 Track B**, the emails | The 38 message builders, plus the junction: one outbox, the triggers, the drain. | the 3 refusals are proven; nothing else is | **3 / 38 = 8%** on builders, **0 / 1** on the junction ever having sent |
| **H08 Track C**, notifications | The brief's notification matrix: **forty events against three channels**, of which nine cells were built. | `notifications` holds 26 rows in production, so the in-app channel is live; push is 0 and email is 0 | **1 / 3 channels**, 33%, on channels ever exercised |
| **H08 Track D**, the store rejection sweep | The 25 work orders of `STORE_REJECTION_RISK_RESEARCH.md`, 7 of which refuse us on submission one. | not counted | **not stated** |
| **H08 Track E**, one product | The 32 rows of `UI_UNIQUENESS_AND_ADMIN_RESEARCH.md`: 8 toggle and geometry defects, 24 uniqueness inconsistencies. | not counted | **not stated** |
| **H08 Track F**, the mobile landing page | One page. | not rendered today | **0 / 1** |
| **H08 Track L**, light mode | The five root causes of `LIGHT_MODE_SURVEY.md`, which the brief names as the unit that matters. **Superseded:** the founder's item 2 of 23 September removes light mode entirely, so this track's denominator is now the removal, not the five causes. | removal in progress on the branch, not on main | **0 / 1** |
| **H08 Track M**, the drift and the wallet | The 8 pick-up blocks of `DESIGN_DRIFT_SURVEY.md`, 4 wallet P1s inside block A. | not counted | **not stated** |
| **H09 Track G**, the supply roles | The brief's own unit: **3 forms, 2 axes, 3 badges, 15 surfaces on one vocabulary**, so 23 items. The read half is one of them. | the read half is wired and renders for nobody: 64 of 64 listings are `agent` | **0 / 23 = 0%** proven; the read path is built |
| **H09 Track H**, what you will actually pay | The full cost model, its component and search sorting on the honest number: 3 items in the brief's own section. | not counted | **not stated** |
| **H09 Track I**, Price Check | The brief's own unit: **3 stages and 9 refusal states**, so 12 items. | all 12 are covered by passing tests that exercise real functions; none has been walked in a browser or shared to a real chat app | **0 / 12 = 0%** proven; 12 / 12 built |
| **H09 Track J**, escrow end to end | The brief's own unit: **15 defects E-1 to E-15, plus the 9 probes**, so 24 items, gated on "no naira moves until all nine probes pass in both directions". | 8 of the 9 probes have local runs that this register did not take; P-7's HTTP half has never run; 0 escrows exist in production | **0 / 24 = 0%** proven by me; the gate is correctly SHUT |
| **H09 Track N**, the supply pipeline | Sections 6A.4 and 6A.5 of the brief, which name what is missing and the chain to measure. | not counted | **not stated** |
| **H09 Track O**, the switch | One ruling, both sides. | not rendered today | **0 / 1** |
| **H09 Track P**, the home pages and the dock | The dock, the property home page and the Stays home page: 3 surfaces. | not rendered today | **0 / 3** |

### The tree at close

| | |
|---|---|
| Test suite at `origin/main` `92d6eb2b` | **222 files, 3613 passed, 1 skipped, exit 0.** Isolated worktree, `cp -al` hardlinks at root and `apps/web`. **DONE.** |
| Typecheck at `origin/main` | **not run today. Unknown.** |
| Lint at `origin/main` | **not run today. Unknown.** |
| Build at `origin/main` | **not run today. Unknown.** |
| Production deployment | Live and serving: seven cron routes reached it and wrote audit rows between 02:30Z and 11:30Z today. |

---

## 16. One honest figure for Session A's half

**Of the countable blocks in this register, 3 of 12 are DONE.**

The denominator, in words: the twelve blocks this register covers, which are
the seven cron routes as one block, the pg_cron path, the email junction,
escrow, push, Price Check, Track G, navigation, the wallet and payments, the
search and catalogue reads, the admin reads, and the blocked terms filter.

**3 / 12 = 25 per cent.**

The three that earn DONE are the seven cron routes (all seven have run in
production with their own audit rows), the pg_cron path (thirteen of fourteen
jobs have run, and the fourteenth has not yet had an opportunity), and the
payment reconciliation job (511 runs over six weeks, inside the wallet block).

**By the other count, the one that feels right, 11 of 12 blocks are BUILT, and
that is 92 per cent.** The distance between 25 and 92 is this file's entire
reason for existing, and it is the same distance that turned out to be 47 when
it felt like 90.

**Which of the two is the honest one.** Neither, quite, and the reason matters:
this register covers twelve blocks and HANDOFF 08 alone has 157 countable
items in it that nobody ticked today. **A percentage over twelve blocks that I
chose is a smaller and friendlier denominator than the brief's own.** Taken
against the denominators the briefs themselves set, section 15 shows almost
every cell either at zero or unmeasured. **If the founder wants one number to
carry into the close-out, 25 per cent over twelve blocks is the one this file
can defend, and he should know that the number over HANDOFF 08's own 157 rows
was not computed and would be lower.**

## 17. The single biggest thing standing between this and a hundred

**Not one real user has ever done anything.**

Zero email outbox rows. Zero push tokens. Zero escrows. Two wallet entries in
the platform's lifetime, the most recent six weeks ago. One admin action, ever.
Sixty four listings, all of them `listing_role = 'agent'`, none of them created
through the owner form the whole of Track G exists to serve. Zero blocked
terms, so the content filter is off.

Every green light in this register is a machine reporting on itself over an
empty table. Nineteen push drains of an empty queue. Thirty six escrow jobs
over zero agreements. Six email drains over zero rows. Each of those is
correct code running correctly, and **none of them can fail for the reason the
feature would fail**, which is the definition of a blind light and the reason
this platform found seventeen of them.

**The thing to do about it is not more code.** Three of the four blockers are
one action each by the founder, and each one converts a whole block from
unproven to provable in an afternoon:

1. **Set `RESEND_API_KEY` on the deployment** (after fixing the double-send on
   a failed withdrawal, which is an engineering half-hour). Unblocks the entire
   email junction, 38 builders and 15 templates, and it is one paste.
2. **Insert the agreed blocked terms into `public.blocked_terms`.** The
   cheapest item on the platform, a product decision nobody else can make, and
   it is currently leaving a real safety function switched off over 75 posts.
3. **Upgrade the Paystack account off starter.** Nothing in the money half can
   be proved until third-party payouts are permitted.
4. **Allow `*.supabase.co` out of this sandbox**, or run
   `scripts/probes/escrow_revoke.sh` from anywhere else. That is the last
   thing standing between the escrow gate and being opened, and it is one
   command.

After those four, the honest work is **one real end-to-end walk by a human
being**: sign up, receive the welcome email, list a property as an owner, get
the badge, fund the wallet, open an agreement, and read the push notification
on a phone. **That single walk would convert more of this register than another
week of building**, because almost everything here is built and almost nothing
here has ever been touched.

---

**Written 23 September 2026 at `80097483`, measured against `origin/main`
`92d6eb2b` and the live database `uccixoonmbhrnyczyigt`.** Section 14 lists
twelve things this register did not check. It is not complete and it says so.
