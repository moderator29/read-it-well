# Platform survey, 22 September 2026

**Measured, not remembered.** Every number below was taken today against the
live project (`uccixoonmbhrnyczyigt`), the live Vercel production deployments,
and the working tree at `e79125ee`. Nothing here is quoted from an earlier
document. Where a claim could not be measured it is marked and it says why.

This file answers the founder's instruction to survey the whole platform and
confirm that every layer is built and up, before any new work is scoped. The
scoped work itself is `docs/HANDOFF_08_THE_NEW_WEEK.md`.

---

## 1. The layers, and whether each one is up

| Layer | State | Evidence |
| --- | --- | --- |
| Web application | **UP** | Vercel production `dpl_8zS2p1WDmqBWdVesrdzK4N6wBhkN`, state READY, built from `e79125ee` on `main`. The four production deployments before it are READY too, so the deploy pipeline has not broken once in this window. |
| Database | **UP** | Postgres 17, 98 public base tables, PostGIS 3.3.7, pg_cron, pg_trgm, btree_gist, Vault. |
| Scheduled jobs | **UP** | 8 cron jobs, all `active`, every one with `last_status = succeeded` as of 22 September. |
| Authentication | **UP, one gap** | Supabase Auth live; leaked password protection is still DISABLED (advisor `auth_leaked_password_protection`). |
| Payments | **UP, wrong shape** | Paystack initialise and webhook exist and the hourly reconcile job succeeds. The flow leaves our origin, which the founder has ruled out. |
| Email | **PARTIAL** | Resend is wired; the count of built-but-never-sent templates is being measured separately. |
| Push notifications | **DOWN** | Nothing wired. |
| Native shells | **BUILT, NOT SHIPPED** | Capacitor 8.5.0, `com.vallospaces.app`, both projects generated; deep links carry placeholder fingerprints. |
| Real supply | **DOWN. This is the launch blocker nobody has said out loud.** | 64 listings, 64 published, **64 of 64 are `is_demo`**. 0 bookings. 0 escrows. 1 wallet. 2 wallet entries. 8 conversations, 18 messages, 74 posts, 6 profiles, 1 agent, 8 businesses. |

**Read the last row twice.** The engine is real and the shop is empty. Every
number the landing page prints about supply is counting example stock, and
`public.platform_stats()` has no `is_demo` filter, so the marketing surface
advertises 64 properties that cannot be transacted. That is not only dishonest
to a visitor, it is the exact shape Apple rejects under guideline 2.1 and
Google Play rejects as misrepresentation.

---

## 2. What the live database says that the repository does not

### 2.1 The dead brand is still inside the running engine

Fifteen live functions and three badge rows still carry the retired brand
name. This is wider than the earlier audit found, and it includes functions on
the money path that write the old name into text a user reads.

Functions: `private.pay_booking_from_wallet`, `private.label_review`,
`private.validate_social_handle`, `private.sweep_badges`,
`private.handle_seed`, `private.revoke_staff_role`,
`private.open_place_entries`, `private.announce_agent_in_place`,
`private.refund_and_cancel_booking`, `private.grant_staff_role`,
`private.daily_note_body`, `private.escrow_settle`,
`public.escrow_fund_from_wallet`, `public.escrow_hold`,
`private.request_money_reconciliation`.

Badge rows: `rentme_elite` named "RentMe Elite"; `year_one` described as "One
year since joining RentMe."; `top_contributor` described as "Given by RentMe
to somebody whose answers have made a place better."

All eight cron jobs are named `rentme_*` as well. Job names are not user
visible, so they are cosmetic, but they are renamed in the same pass so the
next person reading the schedule is not misled about what product this is.

### 2.2 An escrow money path is live, callable, and has no product behind it

`public.escrow_fund_from_wallet` is `SECURITY DEFINER` and executable by the
`authenticated` role, which means any signed-in user can call it directly over
`/rest/v1/rpc/escrow_fund_from_wallet` and move their own wallet balance into
a HELD escrow. There is no surface in the product that opens an escrow and no
surface that releases one, so money entering that state has no designed way
out except `escrow_admin_resolve` or the hourly sweep.

Worse for the brand: the function writes the literal note **"Held in escrow by
RentMe"** into `wallet_entries.metadata`. The standing rule is that escrow is
promised nowhere, and this function promises it in a row the user can read.

The same applies, less sharply, to `escrow_confirm`, `escrow_request_release`
and `escrow_raise_dispute`: all four are reachable by any signed-in user.

**The decision this needs is the founder's**, because it is a product
question, not a cleanup: either escrow becomes a real, designed feature with
its own surfaces, or the four public entry points have `EXECUTE` revoked from
`authenticated` and the machinery stays private until it does.

### 2.3 One function leaks to strangers

`public.agent_trust(p_user uuid)` is executable by the `anon` role. Anyone,
signed out, can pass any user id and read that person's trust score, completed
deal count, median reply time in minutes, review count and average rating.
Nothing in the product calls it signed out. `EXECUTE` should be revoked from
`anon`.

`public.platform_stats()` is also anon-executable and that one is deliberate:
the landing page needs it. It keeps its grant and gains the `is_demo` filter.

### 2.4 The advisor's other rows, triaged

Three tables have RLS enabled and no policy: `idempotency_records`,
`platform_revenue`, `rate_limits`. That is the correct posture for
service-role-only tables and the advisor cannot tell the difference. Each one
gains a comment saying so, so the next reader does not "fix" it by adding a
policy that opens it.

Twenty-three `SECURITY DEFINER` functions are executable by `authenticated`.
Every one whose name begins `admin_`, plus `review_kyc_document`,
`set_fee_rate` and `escrow_admin_resolve`, was checked and every one of them
carries an internal authorisation guard, so the grant is not a privilege
escalation. `end_session` was read in full and its ownership check is inside
the `DELETE`, which is the right way to write it. The exceptions are the four
escrow entry points in 2.2 and `agent_trust` in 2.3.

---

## 3. The code, measured

| Measure | Count |
| --- | --- |
| `.tsx` files under `apps/web/src` | 680 |
| `.ts` files under `apps/web/src` | 557 |
| `page.tsx` route files | 235 |
| `route.ts` API handlers | 19 |
| Applied migration files in `supabase/migrations` | 212 |
| Migrations drafted and deliberately unapplied in `pending/` | 2, plus `LANDMARKS.md` |
| Migrations written and never applied, sitting loose in `migrations/` | 3 |
| Migrations applied with no file in the repository | 4 |

The last two rows together are the serious one: **the live schema cannot be
rebuilt from this repository.** Four migrations exist only in the database and
three exist only on disk. Until those seven are reconciled, there is no
reproducible environment, no safe restore, and no honest staging copy.

---

## 4. The mobile landing page, answered

The founder's question was: on mobile there is no landing page, and the
landing page is essential, so how is it done.

Measured facts. `apps/web/src/app/page.tsx` renders the landing unconditionally
for everyone, signed in or out. `apps/web/src/app/css/landing.css` is 1,957
lines and is written mobile-first with `min-width` escalations at 640px and
1024px, so **the landing page does already render on a mobile browser.** What
does not happen is the native app ever showing anything else: the Capacitor
shell loads `CAPACITOR_SERVER_URL`, which is the origin root, so the app opens
on `/`, which is the landing page, for a signed-in user too.

So there are two separate defects hiding inside one question:

1. **A signed-in person who opens the app is dropped on the marketing page.**
   `/home-or-landing` exists precisely to resolve this and the root route does
   not use it.
2. **A native app whose first screen is a marketing website is the single most
   rejectable shape under Apple guideline 4.2.** The reviewer's first
   impression must be product, not a brochure.

The answer, specified in the handoff: the web keeps `/` exactly as it is,
because on the web the landing page is doing its job and it is responsive. The
native shell opens on a native first-run sequence that carries the landing
page's substance in the product's own chrome, and the marketing landing
becomes reachable inside the app from one honest place rather than being the
front door.

---

## 5. What this survey could not measure

1. `node_modules/@vallo/*` is not linked in this sandbox, so `typecheck`,
   `test` and `build` could not be run meaningfully here. The Vercel builds
   are the standing evidence that the tree compiles, and they are green.
2. There is no browser here, so nothing about rendered geometry was measured
   by me. The toggle overflow the founder is seeing is being measured
   statically against the CSS.
3. Vercel environment variables returned 404 to this session, so which keys
   are actually set in production is not knowable from here. Every "is it
   configured" question is therefore the founder's to answer.
4. No signed-in session exists in this sandbox, so every authenticated surface
   is unproven by me personally today.
