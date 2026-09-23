# Sessions close-out

**One file. Two sessions. Written for the founder, and written to be checked.**

This is where Session A and Session B each report what they finished, what is
left, what percentage the code stands at, and what the founder has to do
himself. **The founder reads this file directly.** Write it for somebody who
is going to open the repository and verify the claims, not for somebody who
will be reassured by them.

---

## How this file is written, and the rules that govern every line in it

**Each session owns its own part and never edits the other's.** Session A
writes PART A. Session B writes PART B. Both write into PART C. Commit small,
`git pull --rebase origin main` before every push, and push immediately after
writing rather than holding the file.

**Four rules, and they are not optional.**

1. **Nothing is called done unless it is true.** If a thing is built but has
   never been exercised, it is BUILT and UNPROVEN, not DONE. That distinction
   is the whole reason this platform's real figure was 47 per cent when it
   felt like 90.
2. **Every percentage says what it is measured against**, with its raw
   fraction and its denominator. Files touched, scopes closed and items on a
   list are three different numbers. A percentage with no denominator is a
   mood.
3. **Nothing counts as proven because a check passed.** Seven blind lights
   were found on this platform in one day, five of them by pulling on lights
   that were showing the right colour. A grep proving a string exists is not
   proof a browser drew it. An HTTP 200 is not proof a page rendered.
4. **Say what you skipped, unprompted.** A close-out that lists only successes
   is not a close-out.

**Re-audit before you write.** Do not report from memory or from an agent's
summary. Open the file, run the command, query the database, and then write
the number.

---

## PART A: Session A

**Written 23 September 2026. Every figure below was re-taken for this file:
the database was queried, the suite was run in an isolated worktree at
`origin/main`, and the files were opened. Nothing here is carried from a
previous report or from a worker's summary, and where a worker's claim
disagreed with my measurement the measurement is what is written.**

**Measured at commit `92d6eb2b`** unless a line says otherwise. The tree moved
under me while I wrote, because ten workers were pushing; every number carries
the commit it was taken at rather than implying it is the tip.

### A0. THE ONE THING THAT CHANGED THE SHAPE OF THIS FILE, FOUND IN THE LAST HOUR

**An agent could not create a listing, and had not been able to since 22
September.**

`track_g_3` added `listings.listing_role`, backfilled all 64 existing rows, and
made the column `NOT NULL` with no default and no trigger. The agent console
inserts without a role, so every creation failed on `23502
not_null_violation`. **The backfill is what hid it**: every row had a role, so
every read, every probe, every screen and every test looked correct. A
migration that repairs the rows it can see and leaves the next insert to fail
produces a perfect table behind a shut door.

**It also corrects something this session told the founder in every report.**
We have written repeatedly that no engineering moves real supply off zero, and
that the number was his alone. That was not quite true. The one action that
moves it is an agent creating a listing, and that action was refused for a day.
**It works again now**, proved by inserting a row the way the application does
and rolling it back, with two controls: an explicitly passed role survives
untouched, and a firm without a firm is still refused.

**And this is the thread that ties the whole file together.** The Price Check
audit, finished separately and minutes later, ends on the same sentence: the
single unblocking action for five of its seven stage one rows is not code, it
is **one real, non-demo, published listing**. Every read in that feature
correctly excludes examples, so on an estate of 64 examples they all correctly
return nothing, and the feature reads as a row of green lights producing
nothing. The same is true of push drains over an empty queue, escrow jobs over
zero agreements and email drains over zero rows.

**So the gap between 92 per cent built and 25 per cent proved has one cause
under most of it, and for a day that cause had an engineering defect sitting
underneath it.** That defect is fixed. What remains underneath is genuinely
the founder's.

### A1. What is finished and proved

**Proved means I watched the real thing happen, not that a test passed.**

| What | How it was proved | Commit |
| --- | --- | --- |
| **The money reconciliation judges its reply by the body, not the status code** | The strongest evidence in this file: `private.reconciliation_watch.last_verdict` reads `ok_200` at **10:47**, and the new predicate landed at **10:44**. So the new code ran in production against a real reply and accepted it. The refusal half is proved inside the migration itself against the actual Vallo HTML shell. | `7ddf94a1` |
| **Nine cron jobs run in production and record their own outcome** | `public.audit_log` today: `hold-sweep` 18 runs, `push-drain` 14, `pg-cron-watch` 15, `email-outbox` 6, and `complete-stays`, `inventory-drift`, `account-purge`, `saved-search-alerts` each once at their scheduled times. Read off the live table, not from a dashboard. | earlier |
| **The public catalogue is readable by a stranger again** | The catalogue's exact 58 column read, run **as `anon`** inside a rolled back transaction with a control: `control=64 anon_published=64 anon_demo=64 listing_select_ok=t`. | `83c03d66` |
| **One failed withdrawal is one email** | Three direct senders removed; `withdrawalFailed` now sits in the REFUSED map of `lib/email/reachability.test.ts`, which asserts the unreachable set EQUALS the refused set in both directions. That is positive proof of absence, not a grep. | `366d0ad6` |
| **The verified badge has one derivation** | `agent-badge-derivation.test.ts` passes, and I proved it can fail: re-adding a direct send to `welcome.ts` turned the sibling guard red, and the supply desk's second read of `agents.verified` is gone. | `24453445` |
| **Light mode is out of the token layer** | `light.css` does not exist, `prefers-color-scheme: light` appears in zero stylesheets. Measured at `92d6eb2b`. | `9b9359eb` |
| **Migration hygiene** | 289 migrations, **zero duplicate version prefixes**, checked with `uniq -d` on the prefix. | standing |

### A2. What is built but unproven, and what proving it needs

**This section is the honest half of the file. Everything here works as far as
anyone can see and none of it has been watched doing its job.**

| What | Why it is unproven | What would prove it |
| --- | --- | --- |
| **The whole email junction.** One durable outbox, a trigger writing in the same transaction as the event it describes, a quarter hourly drain, fifteen templates with a path to the wire. | **`public.email_outbox` has 0 rows, so nothing has ever been ENQUEUED**, which is a different and smaller problem than nothing being sent. **The provider credential IS present on production and preview**, corrected in A5 below. The drain has run six times today and has raised no `email.outbox.unconfigured` alert, which it would do at CRITICAL on every run if that credential were missing. So configuration is not the gap. The gap is that no qualifying event has happened on a platform with no bookings, no escrows and no new accounts today. | One real event: a sign-up that confirms its address, or a password change. The trigger writes the row, the drain sends it within fifteen minutes, and `email_outbox.status` then carries what the provider answered. **Nobody has to configure anything first.** |
| **Push notifications.** Tokens, a queue, deliveries that cannot claim success without the provider's status, quiet hours in WAT, three transports. | **0 rows in `push_tokens`. Nothing has reached a device.** Chrome refuses the Push API in incognito and every Playwright context is incognito; the proxy permits the sending side and blocks the subscribing side. | **Web Push is now configured on production and preview**, see A5. What remains is one handset: open Vallo, grant at any of the four moments, then `POST /api/push/self-test`, which reaches only the caller's own devices and returns the push service's answer verbatim per device. Android and iOS still need a Firebase project and a 99 USD Apple membership respectively. |
| **The escrow gate.** Fourteen local probes pass through the door the product actually funds through; P-7's EXECUTE half passes with 22 refusals over 11 verbs and 2 roles and a control that answers a real business reply. | **P-7's HTTP half has NEVER RUN.** PostgREST resolves by argument name against a cached schema, so a verb shut in `pg_proc` can still answer over the wire. The EXECUTE half cannot stand in for it. | The Supabase host allowed through Network access, then one run of a script that already exists. |
| **Bank transfer on wallet send.** Action, resolver, refusals, idempotency, all built and mutation tested. | `api.paystack.co` unreachable and no live key here, so nothing past the socket is proved: not that Paystack accepts the bodies, not that the transfer settles, not that the webhook closes the hold. **And it is deliberately switched off** behind `BANK_SEND_OPEN = false` pending a licensing answer. | A test key and a sandbox transfer. Separately, the licensing decision. |
| **Every surface that needs live data.** | The egress proxy refuses `uccixoonmbhrnyczyigt.supabase.co`, so a dev server here cannot reach the project and every data backed route answers **the not-found body at HTTP 200**. No screen proof in this session is against live data. | One reload of the live site by somebody who can reach it. |

### A3. What is not built, with an honest estimate

| What | Estimate |
| --- | --- |
| **Real supply. Zero listings, zero bookings, zero reservations, zero escrows, ever.** 64 published listings and all 64 are examples. | No engineering hours move this. It is the founder's and it is the only number that matters. |
| **The abuse filter has no terms.** `public.blocked_terms` = 0 rows, so `objectionable_pattern()` matches nothing. A store refusal under Apple 1.2 and Play's UGC policy. | In flight now. A worker is seeding it from the written proposal and proving the matcher catches and, just as importantly, does not over-catch. |
| **Three locales are drafts.** `ha`, `ig` and `yo` carry keys awaiting a native speaker. | A speaker's afternoon per locale. Not a coding task and deliberately not invented. |
| **Filtering by supply kind.** `LISTING_ROLE_FILTER_LABEL` has zero consumers and `ListingSearchFilter` has no role field, while the index `(listing_role, listing_intent, state_code, city)` was already built for it. | Half a day. In flight. |
| **The lister line on the listing card, map pin sheet and filter drawer.** The data reaches every surface; `GOVERNING-01` draws no slot for it. | A form decision, then an hour. |

### A4. The code, by the numbers

**The per brief and per track table is in `docs/BUILT_VS_PROVEN.md`**, 968
lines, every mark re-derived today from the live database, the catalogue or a
command run, and nothing taken from the ledger, from `PLATFORM_STATUS.md` or
from a commit message. Read that file for the denominators; this is its
summary.

**Two figures, because one number cannot carry both facts.**

| | |
| --- | --- |
| **BUILT** | **11 of 12 blocks = 92%** |
| **DONE, meaning somebody watched it work** | **3 of 12 blocks = 25%** |

The three that are DONE: all seven cron routes have run in production, each
with an audit row it wrote itself, between 02:30 and 11:30 today; 13 of 14
pg_cron jobs have run; and `/api/paystack/reconcile` has run 511 times over six
weeks.

**That 25% is the honest number and it is lower than the 63% in
`PLATFORM_STATUS.md`.** The difference is not new failure, it is a harsher and
more truthful denominator: twelve blocks where a thing either has or has not
been watched working, rather than items on a list that can be counted as built.
**And twelve is still a friendlier denominator than the briefs' own.** HANDOFF
08 has 157 countable rows and the figure over those was deliberately not
computed rather than estimated, because inventing it is the exact failure this
file exists to prevent. It would be lower.

**Why so much sits in the gap between 92 and 25:** every green light on this
platform is currently a machine reporting on itself over an empty table.
Nineteen push drains of an empty queue. Thirty six escrow jobs over zero
agreements. Six email drains over zero rows. **None of those can fail for the
reason the feature would fail**, so none of them is evidence about the feature.

**Measured at `origin/main` `92d6eb2b`, isolated worktree, `node_modules`
hardlinked at both roots:**

| Gate | Result |
| --- | --- |
| `vitest run` | **222 files, 3,613 passed, 1 skipped, exit 0** |
| `tsc --noEmit` | **exit 0, no diagnostics** |
| `eslint src` | **was exit 1 with 2 errors**, unreported until the audit found it. Fixed, see A5 item 9. |
| `next build` | **not run.** Said rather than implied. |

**Measured directly, at `92d6eb2b`, in an isolated worktree at `origin/main`
with `node_modules` hardlinked at both roots:**

| Fact | Value |
| --- | --- |
| Migrations | **289, zero duplicate versions** |
| Routes (`page.tsx`) | **301** |
| Components (`.tsx`) | **299** |
| Published listings | **64** |
| Of which examples | **64** |
| **Real supply** | **0** |
| Bookings ever / reservations ever / escrows ever | **0 / 0 / 0** |
| Rows ever queued for email | **0** |
| Push tokens | **0** |
| Blocked terms | **0** |
| Accounts | **7** |
| Production deployment | READY |

### A5. What broke, what was wrong, what was corrected

**Things I told the founder that were not true, corrected here because a
close-out that lists only successes is not a close-out.**

1. **I said main was green three times while it was red.** Every one of those
   statements came from running the suite in the shared worktree, which is not
   main: six writers had uncommitted edits in it and one of them was supplying
   a module main did not have. Measured properly at `origin/main` it was 8
   failures in 2 files. **The instrument this whole report depends on was
   wrong, and that is worse than the defect it hid.**
2. **The repository ate seven files in one day, and the procedure was mine.**
   `git add` then `git commit` are two statements over one shared index. Three
   times a worker's commit swept up files it never touched, once deleting
   `lib/notify/welcome.ts` while `lib/auth/actions.ts` still imported from it.
   Every worker now commits by pathspec.
3. **The public catalogue was refused to everybody for about eleven hours**,
   and our own migration did it: a rule 21 revoke over `private.owns_listing`,
   which 17 RLS policies on 10 tables call, and a policy is evaluated as the
   querying role. **The exception to rule 21 was already written in this
   repository in three places.** It shipped anyway because it was in prose
   where it needed to be in a check. There is a check now.
4. **I nearly sent a worker a list of fourteen files with eight false entries
   on it**, an hour before writing this, by grepping for a string that also
   appears in comments. The real check strips comments first. I caught it by
   opening the files before sending.
5. **The money job read a status code and called it a reconciliation.** An
   unknown path on this deployment answers 200 with the Vallo HTML shell, not
   404, so a renamed route would have been recorded as a successful
   reconciliation. That is the 29 August fault that ran twenty four days,
   pointed at payments.
6. **One failed withdrawal was two emails and the two disagreed**, one of them
   less true than the other. Removed rather than reconciled.
7. **I told the founder twice that the email provider was not configured, and
   it is.** It has been present on production and preview since 20 September.
   Three workers and I read the environment INSIDE THIS SANDBOX, found nothing,
   and reported on production. **That is the same blind light as running the
   suite in the shared worktree: measuring one thing and describing another.**
   The deployment's own behaviour was the evidence all along, because the drain
   raises `email.outbox.unconfigured` at CRITICAL on every run when that
   credential is absent, it has run six times today, and no such alert exists.
   A check built precisely to answer this question was answering it correctly
   and nobody read it. The auth hook credential was called absent for the same
   reason and is also present.
8. **`PLATFORM_STATUS.md` says navigation is "19 of 22 drawn and correct" and
   no artefact in the repository reads 19.** The committed walk reads **15
   correct**, with 2 wrong destinations and 2 serving a not-found body under a
   200. The best of four untracked artefacts reads 17. I wrote the 19 from a
   worker's summary instead of opening the file it pointed at, which is the
   thing this close-out's own rules forbid. **The navigation figure to trust is
   15 of 22**, and the three routes that correctly draw nothing are separate
   from that count.
9. **The lint gate was red on main and nobody had reported it.** Two errors,
   both light mode removal residue in the settings hub. It went unnoticed
   because the warning count fell from 339 to 333 in the same change that broke
   the gate, so the number moved the way an improvement moves. **A gate is pass
   or fail; a count printed beside it is not the verdict.** Fixed.
10. **The Web Push identity was on the founder's list and should never have
   been.** It is self generated, costs nothing and needs no account, and this
   session can configure the deployment. I generated the pair, checked it
   against the application's OWN `vapidKeysAgree` before going near production,
   and configured both halves on production and preview. **It was safe to do
   now and will never be this safe again:** `push_tokens` is empty, and
   replacing that public half invalidates every subscription bound to it, so
   once real devices exist this becomes a destructive act.

### A6. What the next session needs to know

**The traps, in the order they will cost you time.**

- **A suite run in the shared worktree is not a verdict about main.** Use
  `git worktree add <path> origin/main --detach` with `node_modules` hardlinked
  by `cp -al` at BOTH the root and `apps/web`, **never a symlink** (Turbopack
  panics). Re-cut it when the tip moves; a stale gate is as misleading as the
  shared tree, and I made that mistake too.
- **Rule 21 has an exception and it is load bearing.** A `private` function
  called by an RLS policy is evaluated AS THE QUERYING ROLE and must keep
  EXECUTE for that role. 22 of the 73 are in that class. Run
  `scripts/probes/policy_callers_hold_execute.sql` before and after any revoke.
- **`information_schema`'s privilege views answer about the OBSERVER, not the
  object.** They return only rows where the querying role is grantor or
  grantee, and the MCP read door is `supabase_read_only_user`, so an empty
  result means nothing. Read `pg_class.relacl`, `pg_attribute.attacl` and
  `pg_proc.proacl`.
- **`mcp__Supabase__execute_sql` runs as a role with `rolbypassrls`** and can
  never demonstrate an RLS refusal. Probes go through `apply_migration` with
  `set local role`, ending in a deliberate `raise exception` so they roll back,
  and **every column of refusals needs a control in the same transaction that
  must succeed.**
- **`apply_migration` stamps its own version from the server clock.** Apply
  first, then rename the file to the recorded version. `version` is the primary
  key of `supabase_migrations.schema_migrations`, not the name.
- **A missing COLUMN privilege fails the whole SELECT.** `listings` is granted
  to `anon` column by column, so adding a column without its grant kills every
  read that selects it.
- **A Next.js layout `notFound()` answers HTTP 200** with the not-found body.
  A 200 is not proof a page rendered; check `[data-nf-not-found]`.
- **An unknown path on this deployment answers 200 with the site shell**, not
  404. Any check that judges by status code alone is already wrong.
- **`"use server"` modules may export nothing that is not an async function.**
  This took the build down twice.
- **Tailwind v4:** `text-[var(--x)]` compiles to `color:` and emits no font
  size. The correct spelling is `text-[length:var(--x)]`.
- **`btrim(x)` with one argument strips SPACES ONLY.** Use
  `btrim(x, E' \t\r\n')` on anything a human pasted.
- **The egress proxy** refuses `uccixoonmbhrnyczyigt.supabase.co`,
  `api.resend.com` and `api.paystack.co` with a 403 on CONNECT. It is an
  environment policy, not retryable, and it is the single biggest reason this
  file has an A2 section at all.
- **An import is not a render**, and a grep for a string that appears in prose
  is not a measurement. Both bit somebody today.

---

## PART B: Session B

Written by Session B's lead on 23 September after re-auditing, not from memory.
What I ran myself, and when, is in B4. What four independent audits found is in
`docs/design/proofs/session-b/CLOSING_AUDIT.md` (four runs, newest on top). The
per surface evidence is in `docs/BUILD_SESSION_B_LEDGER.md` (sections 0 to 12,
each with a dated "Final pass, 23 September" block). Scope and every request to
Session A are in `docs/SESSION_B_SCOPE.md`.

**The one thing to know before reading on.** This box cannot reach the Supabase
project over HTTP (egress refused; C1.1 below), and no session may create a user
in production. So **no Session B screen has ever been loaded signed in against
real data.** Every screenshot of a signed-in surface comes from a committed
fixture harness under `apps/web/src/app/(dev)/preview/session-b/**` rendering the
real components in a production build. The wiring is proved by code, by
read-only SQL against the live project, and by unit tests. By rule 1 that makes
the signed-in wiring BUILT AND UNPROVEN, and it is recorded that way below.

### B1. What is finished and proved

"Proved" here means: matched to its governing image with the measured
comparison recorded, and passed by the independent auditor, whose fourth run
(`d5a024a2`) judged dark only against the lead rulings R-A to R-G (ledger
section 0) and the founder's nine items.

| Surface | Image | What is proved, and how | Audit, run 4 | Key commits |
|---|---|---|---|---|
| Profile `/profile` | `50E032EA` | Layout, rows, tabs, cover, lit rows and plates measured at 30 sample points, all within 10 per channel; text at the render's measured size per role (floor 11px); shape sweep 0 | PASS | `da12513`, `2ed2d416`, `21425a5e`, `e76e259f` |
| Get started `/welcome` | `2A49E2F7` | The render's own stage cut from the image (HOTEL sign retouched out), the turning coin with the render's face, headline and button measured; four slides, never redirects, no "Look around", back steps through slides; 24 browser checks and 12 unit tests pass | PASS | `aea2e4e`, `d48c76b`, `fbf3884f`, `e56cec88`, `d34424d6`, `9488cc26` |
| Welcome back `/sign-in` | `55A56F21` | The render's sky, lockup and plinth (slogan refused), card at the render's 61.6 per cent width, translucent glass, no crop box or stage edge (brightened proof); every error state drawn in a harness; back on 7 auth routes pressed in a browser | PASS | `65794a4`, `f7c9700`, `a74d8e2b`, `5e95e005`, `bd0cceda`, `5cc1b3b7` |
| Wallet `/wallet` | `6AF37222` | Balance card, 33px figure (measured on the digits), render's glass wallet, tiles, transactions; the roll can never overlap digits (frozen mid-roll frame); no claims | PASS | `335143b`, `d84a4832`, `62173c3e`, `bea08147` |
| Send money `/wallet/send` | `77A54EA3` | Form panel, rows and chips at the measured 10px; To bank / To a Vallo wallet; the bank name check shown before confirm; "How a send works" states three checked facts; no NDIC, no encryption badge | PASS | `d46aa3a`, `24eac4c6`, `92d6eb2b` |
| Inspections | `F6A8A482` | Height 1.04 of the render with both actions on the first screen; lit title word, lit round plates, 10px cards; "inspection" not "viewing" | FAIL (one attribute, R18); fixed in `e3c90797` after the run, **not re-run in a browser** | `8dc680a`, `ca322e92`, `b948932c`, `fe412ab8` |
| Admin console, all desks | `5EAA44CB`, `01F7DFC7`, `8E9602E2`, `C1D98B3C` | Shell, full-height rail, sampled panel material, 10px corners, filled badges; overview always first, by address too, with a server route for no-JS; every desk measured against its panel; designed empty states; shape sweep 0 on 27 admin harness routes | shell FAIL (R19), review PASS, money PASS; R19 fixed and **pressed in a browser** on a committed harness in `ff967a20` | many; see ledger 6, 7, 8 |
| Admin handbook `docs/ADMIN_CONSOLE.md` | none | Every desk: shows, sources, actions, who may act, effects, limits, rejected; job counts derived from code and tested (8 Vercel, 14 pg_cron, matching live) | PASS | `1a95553`, `bf1bca71`, `949930e2`, `9042610c` |
| Welcome email | none | Six role versions, lit button with Outlook fallback, plain text, preheader, every link on the route list, every claim cited to code; no "viewing"; 111 email tests | PASS | `ac5e07a`, `ca4e5857`, `a570acd0` |
| Deleted posts (item 4) | none | Every listing read excludes removed posts at the query; a tombstone only in a thread that has a reply; 26 tests, 14 of 15 failing against the old code; live: 74 live, 1 removed | PASS | `1385bfc8`, `0fb6b951` |
| Examples probe (item 1) | none | Cause found with evidence: Track G migration 6 revoked EXECUTE on `private.owns_listing`; Session A fixed it live | report | `9cfd73b0` |

**Checks I ran myself on main at `693e331a`** (isolated worktree): `tsc` exit 0;
`check-css-tokens` exit 0 (all ten checks); `vitest run` 222 files, 3,613 passed,
1 skipped, exit 0. After the badge swap (`e3c90797`): `tsc` exit 0, 58 files and
465 tests passed across admin, profile, inspections, wallet. **The token check is
now red on clean main** (`ff967a20`) because of Session A's `trust-badge.css`
(TK-1, B5).

### B2. What is built but unproven, and what proving it needs

Everything below is written, typechecked and tested against fixtures, and has
never run against the live project with a signed-in person. **All of it is
unblocked by C1.1 (network access) plus two labelled test accounts (C3.5).**

| Surface | Built and unproven | What proves it |
|---|---|---|
| Profile | Every read on the page (identity, counts, posts, row figures, workspaces behind Switch role, the badge tier), avatar and cover upload, the `/profile?switch=` redirects | One signed-in load on a deployed build, figures checked against that account's rows |
| Get started | A signed-in person's Continue and Skip writing `welcomeSeen` / `interestsAsked`; the interests Save and Skip; Android hardware back on a device (needs GS5, the native back handler is not mounted anywhere) | A signed-in session; the app on a phone |
| Welcome back | A real sign in reaching `next`; Supabase's real error replies mapping to the drawn messages; the Google-account and no-account lookups; the rate limiter; Google OAuth round trip; the profile-creating trigger | A test account on a deployed build, and Google OAuth configured for that domain |
| Wallet and Send | Live refresh on a wallet notification; a wallet to wallet send end to end (the production ledger holds 0 transfers); the bank name check against Paystack (only a stand-in resolver so far); the badge tier read | Two test accounts and a funded wallet |
| Inspections | Every write (confirm, offer a time, decline, take a time, withdraw, submit), the notifications, the other side's screen refreshing | A real, non-example listing (the database refuses inspections on examples, and all 64 are examples) and two signed-in people |
| Admin console | 0 of 17 shell reads, 0 of 5 money desks, the escrow ruling with evidence, the booking cancel, and the review desks' decisions have run as a signed-in admin | One signed-in admin load of each desk; a real dispute and a real booking |
| Welcome email | Never seen in Gmail, Outlook or Apple Mail; whether production holds the Resend key is unverified from here | One real sign-up on production, then open the email in three clients |
| Badge | Drawn through Session A's `TierBadge` on every Session B surface since `e3c90797`, but never seen with a real tier because the read cannot run here (the read-only SQL role cannot evaluate `person_badge`; `authenticated` can) | The same signed-in loads as above; the founder's account should show platinum in the console rail |

### B3. What is not built, with an honest estimate

| Item | Why not | Owner | Estimate once unblocked |
|---|---|---|---|
| The eight-room inspection checklist, notes and report photos | No tables (request I1) | Session A migration, then Session B screen | half a day A, two hours B |
| Bank send going live | `BANK_SEND_OPEN = false` pending C3.1; Paystack refuses third-party payouts on a starter account (C2.5) | founder, then one line | minutes |
| Badge on Moderation reporters and authors, and Support requesters | those reads return names without ids | Session A read, then one line each | one hour |
| Badge on wallet transaction rows and receipts | the wallet repository drops the counterparty id (W6) | Session A read, then one line | one hour |
| 5 of 14 money-desk names without a badge | `lib/admin/money-queries.ts` returns names without ids | Session A, then Session B | one hour |
| Money, Escrow, Supply and Payments desk copy in four locales | English in components; only Bookings reads the dictionary | Session B | two hours, plus a native speaker (C2.3) |
| Admin data Session A must expose first | A5 per-job pg_cron, A6 notifications, A8 listing views, A11 refusal reasons, A12 account deletions, A13 business transfers, A14 email outbox, AR-10 held-event decisions, AR-11 blocked terms, AR-12 mandate decisions, request 10 reconciliation watch | Session A | each is a small migration or action; each panel is already built and says what it waits on |
| Live refresh of pending wallet rows (W2), transfer notifications naming the other person (W3) | migrations | Session A | an hour each |
| Glow identity in the token layer and the roles icon pack in the shared pack (ID1, ID2) | Session A's token layer and pack | Session A | half a day |
| Get started as the store first launch and the landing Get Started target (W3, W1) | native config and landing are Session A's | Session A | an hour |

### B4. The code, by the numbers

Every figure has its denominator. "Gate" is the five closing gate items per
surface (measured match, chain walked, no claims, checks green, pushed).
"Proven live" counts chain links run against the real project; on this box that
is only possible for flows that need no session.

| Surface | Gate | Chain links working in code | Chain links proven live | Controls driven in a browser |
|---|---|---|---|---|
| Profile | 5 / 5 | 15 / 15 | 0 / 15 | 3 / 15 |
| Get started | 5 / 5 | 10 / 10 | 7 / 10 | 12 / 15 |
| Welcome back | 5 / 5 | 15 / 15 | 7 / 15 | 5 / 17 |
| Wallet and Send | 10 / 10 | 22 / 24 (W2 open; bank send needs C3.1 and C2.5) | 0 / 24 | harness only |
| Inspections | 5 / 5 after `e3c90797` (audit said 4 / 5) | 10 / 12 (I1, I2) | 0 / 12 | 0 / 12 live |
| Admin shell, Overview, Operations, Analytics | 24 / 24 | 17 / 17 reads built | 0 / 17 | back arrow pressed on a harness |
| Admin money desks | 5 / 5 | 5 / 5 desks | 0 / 5; writes 0 / 2 | all controls drawn in harness |
| Admin review desks | 4 / 5 (wired real is part met: checked in code and read-only SQL, never run) | 5 / 5 desks in code | 0 / 5; controls through a real action 0 / 14 | navigation only, in harness |
| Admin handbook | 1 / 1 (audit PASS) | n/a | n/a | n/a |
| Welcome email | 5 / 5 | send wired by Session A | 0 / 6 versions seen in a real inbox | n/a |
| Deleted posts | 5 / 5 | 17 / 18 listing surfaces filtered at the read (the 18th is DP-1) | chain 6 / 9 (policy, table, triggers by SQL; query by test; screen by harness); live counts 74 / 1 | harness: 0 tombstones in feed and profile, 1 in a replied thread |

**Surfaces passed by the independent audit, run 4:** 6 of 8 (profile, get
started, welcome back, wallet and send, email, handbook); the two narrow fails
(inspections R18, console R19) were fixed after the run, R19 proven in a
browser, R18 not yet re-run. **Chain links proven live across Session B:
14 of 98** (get started 7, welcome back 7; nothing else can be proven from here).

**One overall figure, and how it is made.** Half the weight on the images
(surfaces that passed the audit: 6 of 8, 75 per cent) and half on the wiring
(chain links proven live: 14 of 98, 14 per cent). **Session B overall: 45 per
cent.** If you count "built and wired in code" instead of "proven live", the
wiring half is 94 of 98 and the figure would read 86 per cent. **The honest
figure is 45.** The difference between them is exactly the list in B2.

### B5. What broke, what was wrong, what was corrected

- **The lead set wrong targets.** I told the sign-in worker 300 to 310px for a
  card the render measures at about 240, and accepted whole-surface type
  factors (1.16, 1.36). The first audit failed both; lead rulings R-A to R-G
  (ledger 0) replaced them and every surface was redone.
- **Claims that reached main.** `TrustStrip` still said "Your money is safe",
  "Encrypted in transit" and "256-bit TLS" in all four locales until the first
  audit found it (removed in `d84a4832`). The welcome email carried two
  unevidenced statements (fixed `ca4e5857`). The settings sheet heading "How your
  money is protected" (retitled in `bea08147`).
- **Fixes that never reached main.** The wallet worker's run-two fixes sat
  uncommitted until the third audit caught them.
- **A money-safety defect found, not ours to fix.** A second tap on Send sent
  twice; Session A fixed it (`7763ff39`); the client latch stays.
- **The shared `git stash`.** One pop took another worker's stash; nothing was
  lost; stash was banned for every worker.
- **A container restart** stopped four workers mid round; all worktrees
  survived and every change was recovered.
- **Main went red twice while we watched.** A Session A test file failed `tsc`
  (fixed by Session B, types only, `6fa901d6`). Session A's
  `trust-badge.css` now fails the token check (TK-1, not fixed: token layer).
- **Proof tooling lied once.** The shape sweep's "combinations measured" line
  counts only combinations with a finding; workers who took it at face value
  re-measured controls directly.
- **The earlier profile tick was a second derivation** of the badge; it was
  removed, and the profile drew no badge at all from `a4ba8a10` until the swap
  in `e3c90797`.

### B5a. The wide platform sweep (founder instruction, 23 September, IN PROGRESS at this writing)

The founder named the admin console and Get started the reference
implementation for the whole platform and asked for their anatomy to move into
the shared token and component layer once, then for every surface to be swept
onto it, plus the feed and the plus bloom rebuilt to his image
(`docs/design/references/founder/feed-plus-bloom-target.jpg`). Files claimed in
the scope file (`ccf594ba`). Workers: shared layer (phase 1), feed and bloom,
and six surface groups (home, search and listing; stays, trips and checkout;
settings and notifications; public profile, messages and threads; drawer, dock,
host, agent and landing; plus Session B's own surfaces). **The result of the
sweep, route by route (swept, not swept and why), is recorded in ledger section
13 and summarised in B5b below when it lands. Until B5b says otherwise, treat
every route outside Session B's original surfaces as NOT YET SWEPT.**

### B6. What the next session needs to know

- **Worktrees, not the main tree.** Session B built in per-worker git worktrees
  with node_modules hard-linked (`cp -al`), because symlinked node_modules break
  Turbopack. Never `git stash` (shared across worktrees).
- **Proofs are reproducible.** Harnesses under
  `apps/web/src/app/(dev)/preview/session-b/**`, served by a production build
  with `VALLO_PREVIEW_HARNESS=1`; shot scripts under
  `scripts/design/session-b-shots/**`. `next dev` does not hydrate reliably here.
- **The lead rulings in ledger section 0 settle every "choice" an auditor might
  raise:** type at the render's measured size per role with an 11px floor,
  controls at a 44px floor, containers at the render's width, sweep clear of
  0.35, console lands on the overview on every entry, compact real function,
  committed harnesses.
- **The badge.** Four thin slot components exist (`profile/BadgeSlot.tsx`,
  `admin/money/_desk/BadgeSlot.tsx`, `inspections/BadgeSlot.tsx`,
  `wallet/BadgeSlot.tsx`) plus the console's `PersonTier.tsx`; all now render
  Session A's `TierBadge` and none decides a tier. Consolidating them onto
  `TierBadge` directly is a safe tidy. `PersonTier` is written with
  `createElement` on purpose so its unit test can render it.
- **Badge on the review desks:** drawn for the lister (queue and listing under
  review) and the applicant (verification). Moderation reporters and authors and
  Support requesters have none, because those reads return names without user
  ids (Session A's queries).
- **Admin reads live in `lib/admin/reads/**` (Session B's, read only).** Every
  mutation is Session A's. Totals come from exact counts, never a capped list.
- **The console back arrow preview uses `PathnameContext` from an internal
  Next.js module** (`AsDesk.tsx`); a Next upgrade may break that harness build.
- **Rule 22 is gone with light mode**, but auth and first run were always dark.
- **Requests to Session A** are numbered in the scope file and each Session B
  panel that waits on one says so on screen.

---

## PART C: What the founder must do himself

**Both sessions write here.** One list, no duplicates, and check what the
other has already written before you add.

**For each item: what it is, why it is blocked on him rather than on you, what
exactly he has to click or send or decide, roughly how long it takes, and what
it unblocks.**

**Mark anything that is blocking a whole track**, so he knows which one to do
first thing rather than at the weekend.

**Do not put anything here that you could do yourself.** The last list sent
him to fix a MapTiler key that was already set in production and a `.env.local`
that a session can create for itself.

### C1. Blocking something, do these first

**Session A's entries. Session B adds below without repeating these.**

**C1.1. Allow `uccixoonmbhrnyczyigt.supabase.co` through the environment's
network access. BLOCKING A WHOLE TRACK.**
The cloud environment menu in this session's title bar, then Edit, then Network
access: either a broader access level or that host added to the allowed
domains. **Two minutes.**
It is blocked on you because it is a setting on the environment, not on the
code. What it unblocks: **P-7's HTTP half, which is the last untested condition
on the escrow gate.** Your own sentence is that no naira moves until all nine
probes pass in both directions. Fourteen local probes pass through the real
door and the EXECUTE half passes with a control, but PostgREST resolves by
argument name against a cached schema, so a verb shut in `pg_proc` can still
answer over the wire. **That one run is what stands between the gate and being
provably shut.** It also unblocks every screen proof in this repository, all of
which are currently against fixtures because no dev server here can reach the
project.

**C1.2. One handset, five minutes, for the first push notification ever sent.**
Open Vallo on your phone, grant notifications at any of the four moments, then
`POST /api/push/self-test`. It reaches only your own devices and returns the
push service's answer verbatim per device.
Blocked on you because nobody here has a phone. **Web Push is now configured on
production and preview; the identity pair was generated and set this session,
so there is nothing for you to configure first.** What it unblocks: push moves
from BUILT AND UNPROVEN to DONE, and the queue, the quiet hours and the
delivery accounting all get exercised for the first time by something real.
Note the honest limit before you read the result: a 2xx means the push service
accepted the message, not that a screen lit up. A push service cannot read the
encrypted body either.

**Session B's entries.**

**C1.1 is also Session B's first item.** The same network setting is what
stands between every signed-in Session B screen and a real proof (PART B, B2):
profile, wallet and send, inspections and every admin desk have only ever been
proved against fixtures. Nothing further to do beyond C1.1 itself.

### C2. Needed before launch, not blocking today

**C2.1. A Firebase project, for Android push.** Free. You create it, then drop
the `google-services` JSON into `android/app/` and set `FCM_PROJECT_ID` and
`FCM_SERVICE_ACCOUNT_JSON`. Only you can create it. Web Push covers browsers in
the meantime, so this is not blocking today.

**C2.2. An Apple Developer membership, 99 USD a year, for iOS push and for
shipping to the App Store at all.** `App.entitlements` already records that
there is none. Blocked on you because it is a paid account in your name and
spending money is on this session's stop list. Until it exists, `APNS_KEY_ID`,
`APNS_TEAM_ID` and `APNS_PRIVATE_KEY` cannot be set and no iOS build can be
signed.

**C2.3. A native speaker each for Hausa, Igbo and Yoruba.** The three locales
carry draft keys and **no session has invented translations, deliberately.** A
wrong word in somebody's own language is not a bug you can ship and fix later.
`docs/i18n/LOCALE_STATE.md` says exactly how many keys each needs and which
surfaces are affected, so it is a package you can hand over rather than a
conversation. An afternoon each.

**C2.4. App store reviewer credentials.** Now a hard requirement rather than a
convenience, because the platform is closed to signed-out visitors: a reviewer
cannot see anything without an account. The seeded demo account script exists;
what it needs is for you to decide the credential and store it, because a
credential must never live in the repository.

**Session B's entries.**

**C2.5. Upgrade the Paystack account so it may pay out to a bank account.**
The only real payout ever attempted on production was refused with "You cannot
initiate third party payouts as a starter business". That is a setting on your
Paystack business account (compliance and business verification in the Paystack
dashboard), so no session can do it. Until it changes, Withdraw stays hidden and
bank send cannot complete even if C3.1 is answered yes. Roughly half an hour of
forms, then Paystack's review time. It unblocks withdrawals and bank send.

### C3. Decisions only he can make

**C3.1. May Vallo move money to a third party's bank account at all?**
Wallet send by bank transfer is built, tested and **switched off** behind one
line, `BANK_SEND_OPEN = false`. The engineering introduces no float: the
balance is held under the wallet's own row lock before the processor is called,
and a failed start releases it. But a wallet to a stranger's account is a
different regulated shape from a withdrawal to your own account, even though
the rails and the ledger row are identical.
**Recommendation: ask the same solicitor the custody question, in the same
letter, and leave the flag false until the answer comes.** It costs nothing to
wait and the flag is one line to flip.

**C3.2. Should `/home` be readable signed out?**
You have closed the platform, so this is now mostly settled, but it has a tail.
Two public shelves, `/search` and `/around`, declare `/home` as their parent,
and `/home` is gated, so a signed-out reader pressing back lands on the sign-in
screen. **Options:** make `/home` readable signed out, or give those shelves an
open parent, or accept that browsing is now signed-in only and the landing page
is the whole public surface.
**Recommendation: the third, because it is what you have already chosen**, and
then the back destination for those two shelves should be the landing page
rather than a wall. That is a small change and it is ours once you say so.

**C3.3. The lister line on the listing card.** `GOVERNING-01` draws the
featured card as photo, verified mark, title, locality, price, facts row, and
**there is no lister line on it.** The data now reaches every surface that
takes a listing. The standing rule is that the images govern form, so no worker
added a slot the image does not draw.
**Recommendation: add it.** Track G exists so a person can tell an owner from
an agent from a firm, and the card is where most people will look. But it is a
form decision and it is yours.

**C3.4. Real supply.** Not a decision so much as the only thing that matters.
64 published listings, **all 64 examples**, zero real supply, zero bookings
ever, zero reservations ever, zero escrows ever, and one admin action in the
platform's history. Every green light above is a machine reporting on itself
over an empty table. No engineering on any list moves this.

**Session B's entries.**

**C3.5. May a session create two labelled test accounts on production, one of
them an admin?** Session B was told never to create a user in production, so
every signed-in screen it built is proved only on fixtures (PART B, B2). With
C1.1 open, a session could sign up `qa-member@` and `qa-admin@` style accounts,
mark them clearly, run every signed-in proof, and leave them for the store
reviewers (which also serves C2.4).
**Recommendation: yes, two accounts, excluded from statistics the way example
listings are, and named in the ledger.** Without them the 84 unproven chain
links in PART B stay unproven.

**C3.6. Two facts the send screen needs from you.** "How a send works" states
only what the code proves. It deliberately leaves out **who holds the wallet's
money** (the custody question already with your solicitor under C3.1) and **how
long a refund takes**, because no session can know either. Tell us both and they
go on the screen in one line each; until then they stay off it.
**Recommendation: answer the refund time now** (it is a business promise you
set), and let the custody wording follow the solicitor.

---

## PART D: The state of the tree at close

*Both sessions confirm, separately.*

- Branch synced with `main`, nothing unpushed
- Tests, lint and build all green, with the numbers
- Production deployment green, with the commit
- Every scope file and ledger current and pushed
- Anything left uncommitted, and why

#### Session A confirms

**Branch and main.** Everything Session A wrote is on `origin/main`, verified
by `git rev-list --left-right --count HEAD...origin/main` reading `0 0` after
each push. Late in the session the branch ref and `main` diverged by a few
commits because ten workers were pushing to one branch at once; **`main` is the
ref that carries every Session A change**, and it is the one that deploys and
the one being read here. Four commits were landed on `main` from a clean
worktree by cherry-pick, because a worker's uncommitted migration in the shared
tree blocked the ordinary merge, and nothing of theirs was touched to do it.

**Gates, at `origin/main` `92d6eb2b` in an isolated worktree with
`node_modules` hardlinked at both roots:** `vitest run` 222 files, 3,613
passed, 1 skipped, exit 0. `tsc --noEmit` exit 0. `eslint src` was **exit 1
with two errors**, found by the audit rather than by anybody building, and
fixed. **`next build` was not run, and that is a gap in this confirmation
rather than a pass.**

**Production.** READY on recent commits through the session, including the
light mode removal. Nine cron jobs ran in production today and each wrote its
own audit row.

**Left uncommitted, and why.** The shared worktree carried dozens of modified
paths at close, belonging to workers still mid-edit. **Session A committed only
files it wrote**, by pathspec, never `git add -A` and never a bare
`git commit`. Committing a neighbour's half written file is what took
`lib/notify/welcome.ts` off `main` this morning and left eight assertions red
in two files that had nothing to do with it.

**Two things a reader of this file should check rather than trust.** Three
statements in earlier reports were measured in this container and written about
production, and one was measured in the shared worktree and written about
`main`. They are corrected in A5. **If a claim anywhere in this repository does
not say which tree or which system it was measured on, treat it as unmeasured.**

---

**Last written:** *(date, time, and the commit it was measured at)*
