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
| **The escrow gate holds over HTTP, which had never once been tested** | P-7's HTTP half, the half that had never run in this platform's life: **PASS 8 of 8 at 2026-09-23T15:17:03Z.** Seven escrow verbs each answered `HTTP 401` with `42501 permission denied for function`, and the control `GET /rest/v1/listings` answered 200 in the same run, so the run proves the door is shut rather than that the network is. This matters because PostgREST resolves by argument name against a cached schema, so a verb shut in `pg_proc` can still answer over the wire. It does not. | standing |
| **The public catalogue is readable by a stranger again** | The catalogue's exact 58 column read, run **as `anon`** inside a rolled back transaction with a control: `control=64 anon_published=64 anon_demo=64 listing_select_ok=t`. | `83c03d66` |
| **One failed withdrawal is one email** | Three direct senders removed; `withdrawalFailed` now sits in the REFUSED map of `lib/email/reachability.test.ts`, which asserts the unreachable set EQUALS the refused set in both directions. That is positive proof of absence, not a grep. | `366d0ad6` |
| **The verified badge has one derivation** | `agent-badge-derivation.test.ts` passes, and I proved it can fail: re-adding a direct send to `welcome.ts` turned the sibling guard red, and the supply desk's second read of `agents.verified` is gone. | `24453445` |
| **Light mode is out of the token layer** | `light.css` does not exist, `prefers-color-scheme: light` appears in zero stylesheets. Measured at `92d6eb2b`. | `9b9359eb` |
| **The email junction carried four real messages the whole way, on two templates** | `public.email_outbox` held 0 rows for its entire life until today. Re-read at 16:36Z it holds four, **all four SENT, one attempt each, no errors**: two `account.welcome` written by a trigger on `auth.users` when the QA accounts were created, and two `security.new_device_sign_in` written by a trigger on `auth.sessions` when somebody signed into them at 16:25. Nobody called anything by hand. The drain claimed each at the first quarter-hour run after the enqueue and settled it within six seconds. **SENT means the provider accepted it. It is not proof an inbox rendered it**, and the table keeps no provider message id, so we cannot go back and ask. | standing |
| **Migration hygiene** | 289 migrations, **zero duplicate version prefixes**, checked with `uniq -d` on the prefix. | standing |

### A2. What is built but unproven, and what proving it needs

**This section is the honest half of the file. Everything here works as far as
anyone can see and none of it has been watched doing its job.**

| What | Why it is unproven | What would prove it |
| --- | --- | --- |
| **Thirteen of the fifteen email templates.** One durable outbox, a trigger writing in the same transaction as the event it describes, a quarter hourly drain, fifteen templates with a path to the wire. | **`account.welcome` and `security.new_device_sign_in` are no longer in this section. They are proved, in A1.** What is left is the other thirteen: `email_outbox` has never held a row for any of them, so no escrow, withdrawal, inspection, verification or enquiry email has ever been enqueued by anything, and `outbox-delivery.test.ts` proves the message rather than the delivery. **And "proved" has a ceiling even for the two: SENT is the provider's acceptance, not an inbox.** | One qualifying event per template: an escrow funded, a withdrawal settled, an inspection booked, a verification rung, an enquiry sent. The junction itself no longer needs proving, only exercising. |
| **Push notifications.** Tokens, a queue, deliveries that cannot claim success without the provider's status, quiet hours in WAT, three transports. | **0 rows in `push_tokens`, re-read at 16:23Z today. Nothing has reached a device.** And until this afternoon nothing could: `/api/push/key` was not in `PUBLIC_API_PATHS`, so the proxy answered the sign-in redirect and the browser parsed HTML as JSON, which the enrol code reported as `not_configured`. **A blind light: the surface said push was not set up when push was set up and the door was locked.** Fixed and deployed; `GET https://www.vallospaces.com/api/push/key` now answers HTTP 200 with `configured: true` and the public key, with no session. | Still one handset. Open Vallo, grant at any of the four moments, then `POST /api/push/self-test`, which reaches only the caller's own devices and returns the push service's answer verbatim per device. Android now has a Firebase project (`vallo-44059`, production only); iOS still needs the 99 USD membership. |
| **The escrow gate, past the door it was never tested through.** | **P-7's HTTP half is no longer unproven. It ran for the first time at 15:17:03Z today and passed 8 of 8** (A1). What is left in this section is the thing behind the gate: **no escrow has ever been funded on this platform**, so the refusals are proved and the happy path is not. | One funded escrow, end to end, through the product rather than through SQL. |
| **Wallet send and withdraw against a live Paystack.** | The network wall is down: `api.paystack.co` answers 200 from here now. But there is still no live transfers-enabled key in this container, so nothing past the socket is proved. **External bank send is being removed outright** on the founder's 23 September direction, because a merchant of record that moves other people's money to third party accounts is not what VALLO SPACES LTD is licensed for; **wallet to wallet and `withdraw()` to the account holder's own bank stay.** | A test key and a sandbox transfer for `withdraw()`. `docs/PAYSTACK_GO_LIVE.md` names what is needed, never values. |
| **Every surface that needs live data.** | **The egress reason is gone.** All four hosts answer from this container now: the Supabase REST root 401, `www.vallospaces.com` 200, Resend 200, Paystack 200. So the screen proofs taken during the blackout were taken against the not-found body at HTTP 200 and **none of them should be trusted**; they have not yet been re-taken. That is an outstanding job of mine, not an environment limit. | Re-run the screen proofs now that a dev server here can reach the project, and replace every proof taken before 15:00Z today. |

### A3. What is not built, with an honest estimate

| What | Estimate |
| --- | --- |
| **Real supply. Zero listings, zero bookings, zero reservations, zero escrows, ever.** 64 published listings and all 64 are examples. | No engineering hours move this. It is the founder's and it is the only number that matters. |
| **The abuse filter has no terms.** `public.blocked_terms` = 0 rows, so `objectionable_pattern()` matches nothing. A store refusal under Apple 1.2 and Play's UGC policy. | In flight now. A worker is seeding it from the written proposal and proving the matcher catches and, just as importantly, does not over-catch. |
| **Three locales are drafts.** `ha`, `ig` and `yo` carry keys awaiting a native speaker. | A speaker's afternoon per locale. Not a coding task and deliberately not invented. |
| **Filtering by supply kind.** `LISTING_ROLE_FILTER_LABEL` has zero consumers and `ListingSearchFilter` has no role field, while the index `(listing_role, listing_intent, state_code, city)` was already built for it. | Half a day. In flight. |
| **The lister line on the listing card, map pin sheet and filter drawer.** The data reaches every surface; `GOVERNING-01` draws no slot for it. | A form decision, then an hour. |
| **A review can be written on a booking nobody paid for.** `reviews_insert_own` requires CONFIRMED and checked out; it does not mention money, and `lib/bookings/settlement.ts` line 25 says in the repository's own words that a host accepting a request confirms a stay "without any money arriving". So a manufactured five-star history costs zero naira. **The cheapest of the four gates and the only one with no vendor behind it.** | 2 to 3 hours, plus one decision from the founder on what counts as paid. `docs/ONE_PERSON_MANY_ACCOUNTS.md`. |
| **A ban attaches to one `agents` row and nothing else.** `agent_suspensions` holds no identity and no bank account, and no deny-list table exists. A banned agent's second email address is a new account in thirty seconds. | 1 day, but worth little until a NIN is actually verified. |
| **A bank account is proved real and never proved yours.** Paystack resolves it and the holder's name is stored; nothing compares that name to the person withdrawing, and there is no verified name on file to compare it to. | Half a day of engineering, blocked behind identity verification. |
| **Nothing verifies a NIN.** The string appears in zero migrations. It is typed at registration into `agent_applications.id_number` and never checked. `verification_tier` exists and gates nothing. | 1 day of engineering **plus a licensed provider**, which is a contract and a per-check cost, so it is a founder decision. Three other items queue behind it. |

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
   [CORRECTION, DOC-15 in docs/THE_AUDIT.md: the "check" was a manual probe
   run by hand, not an automated gate (DOC-03).]
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

**The one thing to know before reading on (rewritten 23 September, evening).**
Until 15:20 UTC this box could not reach the Supabase project and no account
could be used, so every signed-in screen was proved on fixtures only. The
founder then opened the network and created two labelled QA accounts
(`phantomfcalls+qamember@gmail.com`, member, and `phantomfcalls+qaadmi@gmail.com`,
admin; the admin grant read back from `user_roles`). From 16:00 Session B ran
signed-in live proofs against the real project, and against the production site
for reads that need the service role key this box does not hold. **Live proof
now covers 104 of 131 chain links (B4)**; what is still unproven, and why, is B2.
No proof wrote anything except what a screen saves for the QA account itself;
no money moved; no password is in the repository.

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
| Send money `/wallet/send` | `77A54EA3` | Wallet to wallet only since `32830d5b`: external bank send removed by founder decision (a regulatory line: CAC required N500,000,000 share capital while the objects clause carried payment wording; pushing money to an unrelated third party's bank is licensed activity), so the image's "To bank" mode is intentionally absent. Re-measured after the cut: one form panel 362 wide at 10px, rows 60px, amount chips 64x44 (0.23), Send 340x44.5 (0.31), shape sweep 0. Refund line "3 to 5 business days" (founder, C3.6). No NDIC, no encryption badge | PASS (run 4), re-measured after the cut | `d46aa3a`, `24eac4c6`, `92d6eb2b`, `32830d5b` |
| Inspections | `F6A8A482` and the founder's `inspection-target.jpg` | Rebuilt to the founder image: eight rooms with the render's glyphs, round checks, notes, Add Photos, Submit enabled only at eight of eight (the database refuses fewer); lifecycle kept as a strip; lit glass back square; five overlay passes plus the audit's S12 (seven differences: six fixed, the rest recorded). Writes go only through Session A's `saveInspectionReport` and `addReportPhoto` (I1, I1b). R18 re-run in a browser (`7a52575a`) | second independent audit: SWEPT | `890acbde`, `521f91cc`, `7a52575a`, `a5459f08` |
| Admin console, all desks | `5EAA44CB`, `01F7DFC7`, `8E9602E2`, `C1D98B3C` | Shell, full-height rail, sampled panel material, 10px corners, filled badges; overview always first, by address too, with a server route for no-JS; every desk measured against its panel; designed empty states; shape sweep 0 on 27 admin harness routes | shell FAIL (R19), review PASS, money PASS; R19 fixed and **pressed in a browser** on a committed harness in `ff967a20` | many; see ledger 6, 7, 8 |
| Admin handbook `docs/ADMIN_CONSOLE.md` | none | Every desk: shows, sources, actions, who may act, effects, limits, rejected; job counts derived from code and tested (8 Vercel, 14 pg_cron, matching live) | PASS | `1a95553`, `bf1bca71`, `949930e2`, `9042610c` |
| Welcome email | none | Six role versions, lit button with Outlook fallback, plain text, preheader, every link on the route list, every claim cited to code; no "viewing"; 111 email tests | PASS | `ac5e07a`, `ca4e5857`, `a570acd0` |
| Deleted posts (item 4) | none | Every listing read excludes removed posts at the query; a tombstone only in a thread that has a reply; 26 tests, 14 of 15 failing against the old code; live: 74 live, 1 removed | PASS | `1385bfc8`, `0fb6b951` |
| Examples probe (item 1) | none | Cause found with evidence: Track G migration 6 revoked EXECUTE on `private.owns_listing`; Session A fixed it live | report | `9cfd73b0` |

**Checks:** the gates on the last measured tree, with their numbers, are in
PART D (Session B confirms). The token check that was red on `ff967a20` (TK-1)
was closed by the shared layer in phase 1.

### B2. What is built but unproven, and what proving it needs

Proven live since the network opened (full rows in the ledger, each with time,
commit and evidence): Profile 17 of 17, Feed 17 of 17, Wallet reads 6 of 6
(the recipient lookup on the production site), Welcome back 5 of 8 testable
links, the admin console 49 of 50 on the production site. What remains:

| Surface | Built and unproven | What proves it |
|---|---|---|
| Welcome back | the Google-account and no-account lookups and the rate limiter (need the service role key, not on this box); Google OAuth round trip | a run on a preview deployment, or the key as an environment secret |
| Wallet and Send | every write: fund, a wallet to wallet send, withdraw (no money was moved on purpose; the QA wallets hold nothing) | the founder's decision to fund a QA wallet with a small sum |
| Inspections | every write (request, confirm, offer a time, the report, Add Photos, submit) and the other side refreshing | **one real, labelled, non-example listing** (the database refuses inspections on examples; all 64 are examples) and both QA accounts |
| Admin console | the Supply desk's "Firm rosters" panel fails on production: `infinite recursion detected in policy for relation "firm_members"` (Session A, request A15); every console write (rulings, cancels, review decisions) was deliberately not pressed | A15's migration; a real dispute and booking for the writes |
| Push | the fixed control (`e633e2d3`) reads ON only when the server holds this device's row; `push_tokens` is still 0 rows | the founder signing in inside the home-screen app after deploy and tapping Turn on |
| Welcome email | provider accepted one real send (`email_outbox` `76ab6c4e`, SENT 16:00:05); the second row was PENDING at 16:20. **0 of 6 role versions seen in an inbox**; SENT is the provider's acceptance, not rendering | the founder opening it, then Outlook and Apple Mail |
| Badge | platinum seen live (console identity, feed author, wallet recipient); gold never seen, because no gold person has a live post, listing or wallet | a verified supplier on the platform |
| Email lock | the change affordance is gone (`fefc0b4f`) and the email is drawn as a fixed fact; **not handled** until Session A's server refusal has a test | Session A (EMAIL-LOCK) |

### B3. What is not built, with an honest estimate

| Item | Why not | Owner | Estimate once unblocked |
|---|---|---|---|
| The inspection outcome ("Inspected / Deal done / No deal") with the report on | no outcome column (I1a) | Session A migration, then one control | an hour each side |
| The listing card's lister badge | Session A published `public.listing_lister_tier` (`9b5b3524`, agent listings only, 0 rows today); the listing read that feeds the card (Session A's) does not select it yet | Session A read, then one line in `ListingCard` | an hour |
| Badge on Moderation reporters and authors, Support requesters, wallet rows and receipts, 5 of 14 money-desk names | those reads return names without user ids | Session A reads, then one line each | an hour |
| Admin data Session A must expose first | A5, A6, A8, A11 to A14, AR-10 to AR-12, request 10 | Session A | each panel is built and says what it waits on |
| Yoruba, Hausa and Igbo copy for the money desks | English keys added (`4bdf6504`); no session invents those words | native speakers (C2.3) | an afternoon each |
| Escrow countdown formats and two payment channel labels on locale keys | built by tested read helpers; a separate change | Session B | an hour |

### B4. The code, by the numbers

Re-counted on 23 September, evening, from the ledger's LIVE PROVEN rows. A
chain link is proven live only when a running build talked to the real project
(or the production site did) and the result was watched and recorded.

| Surface | Chain links proven live | Not proven, why |
|---|---|---|
| Profile | 17 / 17 | none |
| Get started | 7 / 10 | a signed-in Continue and Skip; Android hardware back (GS5) |
| Welcome back | 5 / 8 testable (plus Google OAuth) | lookups and rate limiter need the service role key |
| Wallet and Send | 6 / 9 | fund, send, withdraw: no money moved on purpose |
| Inspections | 0 / 12 | no real listing exists |
| Admin console (all desks) | 49 / 50 on production | Firm rosters (A15) |
| Feed and plus bloom | 17 / 17 | gold mark not seen |
| Push | 0 / 1 | a real device row |
| Welcome email | provider accepted 1; 0 / 6 versions seen in an inbox | the founder's inbox |

**Chain links proven live across Session B: 104 of 131 (79 per cent)**, email
counted separately. Checks on the last measured tree are in PART D.

**Sweep, by the second independent audit** (`e389457f`, measured at `0ab215f6`):
**115 of 121 judged routes SWEPT (95 per cent)**, 5 partial, 1 not swept; first
audit 57 of 120. Of the first audit's 16 findings, 13 fixed, 1 partly (S9), 2 not
(S5, S13). Its eight new should-fix items went to one final worker; the result
is in B5b.

**One overall figure.** Half the weight on the images and sweep (115 of 121, 95
per cent), half on the wiring proven live (104 of 131, 79 per cent). **Session B
overall: 87 per cent.** The gap is exactly B2: writes nobody may make without a
funded wallet, a real listing or a real device, and three links that need a key
this box does not hold.

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

- **Two finished releases silently undone on main.** `dc52e031` and
  `d3d1620c` (stays group) were committed from checkouts that predated the
  commits they sat on, reverting the social group's thread card passes 2 to 5
  (`e6f82a9a`, 112 proofs) and the lit selected tab (`361eabe5`). Nobody noticed
  until the first independent audit (`a6c7a80a`). Restored in `e93bb8a9` and
  `a6edcaaf`; every worker now runs a no-revert diff before every push, and the
  second audit found no revert since.
- **Main went red four more times.** Harness directories without a root
  `page.tsx` (twice, fixed by Session A `ceb463e7` and `866aac75`, then made a
  mandatory pre-push check); a harness passing a removed prop (Session A
  `033ac4c3`); a Session A doc naming a service account address (fixed by
  Session B `1d0b41c3`, one line).
- **The shared glass field drew nothing.** `--nf-well-fill` wrapped in a second
  gradient made the declaration invalid everywhere `Field material="glass"`
  was used (fixed `eb9afe04`, measured in Chromium).
- **A rule broken by our own worker.** The inspection worker wrote its own
  photo insert (`recordReportPhoto`, `890acbde`); Session B never writes a
  mutation. Deleted in `521f91cc`; Session A supplied `addReportPhoto` (I1b).
- **The box ran out of memory** (15 concurrent builds) **and then disk**
  (twenty worktrees at about 200MB each). A lock now serialises every build,
  whole tsc and whole vitest; finished worktrees are removed.
- **A blind light on the live site.** The push control read ON from browser
  permission alone while nothing was saved (founder, 23 September). Fixed in
  `e633e2d3`; Session A opened `/api/push/key` (`dab5a688`).

### B5a. The wide platform sweep (founder instruction, 23 September)

The founder named the admin console and Get started the reference
implementation for the whole platform and asked for their anatomy to move into
the shared token and component layer once, then for every surface to be swept
onto it, plus the feed and the plus bloom rebuilt to his image
(`docs/design/references/founder/feed-plus-bloom-target.jpg`). Files claimed in
the scope file (`ccf594ba`). Workers: shared layer (phase 1), feed and bloom,
and six surface groups (home, search and listing; stays, trips and checkout;
settings and notifications; public profile, messages and threads; drawer, dock,
host, agent and landing; plus Session B's own surfaces). Later joined by a
leftovers worker, an orphans worker (23 routes no group owned), two audit-fix
workers and two independent audits. The route by route result is B5b; the
full per-route register with evidence is the second audit's
`docs/design/proofs/session-b/audit-sweep-2/AUDIT2.md`.

### B5b. The sweep register (final, 23 September, evening)

**The independent verdict** is the second audit (`e389457f`, measured at
`0ab215f6`), which re-judged every row of the first audit's register:
**SWEPT 115 of 121 judged routes (95 per cent), PARTIAL 5, NOT SWEPT 1**, plus
one n/a and one left by the founder's dock ruling (123 rows). The first audit had
57. The full per-route table, with evidence per row, is
`docs/design/proofs/session-b/audit-sweep-2/AUDIT2.md`; it is not copied here so
there is one register, not two.

**After that audit**, one worker closed its six remaining rows and its eight
should-fix items (`beb3883a`, ledger 13.A2), measured before and after at 390
and 1440. **These closures are the fixing worker's own measurements; no
independent audit has re-run over them.** So the honest statement is: 115 of 121
independently swept, and 121 of 121 swept by the builders' measurement.

| Group | Rows | Independently swept (audit 2) | Closed after, builders' measurement | Still not proven, and why |
|---|---|---|---|---|
| Shared layer | tokens, Panel, IconPlate, Button, Switch, StatusBadge | released | Switch hit area to 44 (13.A2.6) | reflection proofs cover the overview and Get started only |
| Console | 18 | 18 | search fields 44 at 1440 | none |
| Auth | 2 | 2 | | Google OAuth |
| Settings | 15 | 15 | | none |
| Stays | 12 | 11 | `/restaurant/[id]` proof on the real component (S-B) | none |
| Home | 8 | 8 | 44px hit areas (S-E) | none |
| Social | 11 judged | 9 | "Confirmed" badge (S-A), options sheet (S-C) | 24-hour times recorded as deliberate (shared formatter) |
| Wallet | 10 | 10 | send inputs 44 (S-E) | none |
| Profile | 4 | 4 | | none |
| Feed and plus bloom | 1 | 0 (partial) | location bar spacing (S-D) | gold mark never seen live; ⋯ drawn one way (the image draws it two ways) |
| Inspection | 1 | 1 | date format recorded as deliberate | every write (C3.8) |
| Chrome | 16 judged | 14 | `/docs` selected (S-F); gated host routes proven live as the member | the hosts' filled screens (the member owns no business; creating one is a write) |
| Orphans (no group owned them) | 23 | 23 | 44px hit areas (S-E) | filled states proven on fixtures only |

**What was not swept, on purpose:** the bottom dock (founder ruling), and the
Yoruba, Hausa and Igbo copy (no session invents those words).

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
- **The badge.** Every Session B surface draws Session A's `TierBadge`
  directly (`f8a73bc8` removed the four slot wrappers); the console uses
  `PersonTier`, itself `TierBadge`, written with `createElement` so its unit
  test can render it. Nothing in Session B decides a tier.
- **No-revert check before every push.** After `git pull --rebase`, read
  `git diff origin/main HEAD` for every file outside your claim; a removed line
  you did not write stops the push. Two releases were lost to this once.
- **Live proof.** QA credentials live only in the scratchpad's `qa.env` of the
  session that holds them; a new session asks the founder. Start the server
  with `NODE_USE_ENV_PROXY=1` and `NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`.
  Reads that need the service role key are proven against the production site.
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

> **DONE 23 September 15:20:** the network is open and Session B has proven 104 of 131 chain links live since (B4).

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

> **Narrower now:** bank send is gone, so this unblocks only withdraw to your own bank.

**C2.5. Upgrade the Paystack account so it may pay out to a bank account.**
The only real payout ever attempted on production was refused with "You cannot
initiate third party payouts as a starter business". That is a setting on your
Paystack business account (compliance and business verification in the Paystack
dashboard), so no session can do it. Until it changes, Withdraw stays hidden and
bank send cannot complete even if C3.1 is answered yes. Roughly half an hour of
forms, then Paystack's review time. It unblocks withdrawals and bank send.

### C3. Decisions only he can make

> **ANSWERED 23 September: no.** External bank send is removed (`32830d5b`); wallet to wallet and withdraw to your own bank stay. A regulatory line, recorded in the ledger so nobody rebuilds it.

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

> **ANSWERED 23 September:** browsing is signed-in only; `/search` and `/around` now go back to the landing page (`b2a1ef5f`).

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

> **ANSWERED 23 September: yes.** The line is on the card (`cfc7fad4`), recorded as your deliberate override of GOVERNING-01.

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

> **ANSWERED 23 September:** you created both; the admin grant is applied; the member account is the store reviewers' account. Live proof ran against them (B4). Consider changing their shared password before handing it to the stores, since it was sent in a chat.

**C3.5. May a session create two labelled test accounts on production, one of
them an admin?** Session B was told never to create a user in production, so
every signed-in screen it built is proved only on fixtures (PART B, B2). With
C1.1 open, a session could sign up `qa-member@` and `qa-admin@` style accounts,
mark them clearly, run every signed-in proof, and leave them for the store
reviewers (which also serves C2.4).
**Recommendation: yes, two accounts, excluded from statistics the way example
listings are, and named in the ledger.** Without them the 84 unproven chain
links in PART B stay unproven.

> **HALF ANSWERED 23 September:** refund time "3 to 5 business days" is on the screen; custody wording stays off until the solicitor answers.

**C3.6. Two facts the send screen needs from you.** "How a send works" states
only what the code proves. It deliberately leaves out **who holds the wallet's
money** (the custody question already with your solicitor under C3.1) and **how
long a refund takes**, because no session can know either. Tell us both and they
go on the screen in one line each; until then they stay off it.
**Recommendation: answer the refund time now** (it is a business promise you
set), and let the custody wording follow the solicitor.

**C3.7. (Session B) Put a small sum in the QA member's wallet, or say no.**
Every wallet write (fund, a wallet to wallet send to the QA admin, withdraw) is
built and unproven because no session may move money without your word. One
small top up by you proves funding, and then a session can prove the send
between the two QA wallets. **Recommendation: yes, the smallest amount Paystack
accepts, recorded in the ledger as QA money.**

**C3.8. (Session B) May the QA member publish one real, labelled listing?**
Inspections cannot be proven end to end: the database refuses an inspection on
an example, and all 64 listings are examples. One listing by the QA member,
labelled QA and excluded from statistics like the examples, lets a session
prove the request, the eight-room report, the photos and the submission.
**Recommendation: yes, and unpublish it after the proof.**

**C1.3. (Session B) One tap for push, after the fix deploys.** Open the home
screen app, sign in inside it (it does not share Safari's sign-in), open
Settings, Notifications, and tap Turn on. Then tell a session, which reads
`push_tokens` for the row. Five minutes.

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

**Gates, RE-RUN at `origin/main` `56bb587a` in a freshly cut isolated worktree
with `node_modules` hardlinked at the root (npm workspaces hoist, so
`apps/web/node_modules` holds only caches):**

| Gate | Result |
| --- | --- |
| `next build` | **exit 0.** Compiled in 37.3s, TypeScript in 52s, 198 static pages generated, 380 routes. |
| `vitest run src` | **239 files, 3,844 passed, 1 skipped.** |
| `tsc --noEmit` | no errors. |
| `eslint src` | **0 errors, 330 warnings.** |

**`next build` was the gap in the previous confirmation and it is closed.** The
earlier run was at `92d6eb2b`: 222 files, 3,613 passed, with two eslint errors
found by the audit rather than by anybody building, since fixed.

**ONE THING NOT CLEAN, recorded rather than smoothed over.** A single run of
`vitest run src/lib` in the working tree reported **1 failure out of 3,327**,
and I lost its name by piping the output to `tail`. Three subsequent runs with
the full output captured were clean, and the gate above was clean. **I do not
know which test it was and I am not calling it nothing.** The new
`no-committed-secrets` sweep shells out to `git ls-files` and is the only new
thing touching shared mutable state, so it is the first suspect. Losing the
output was the mistake, not the flake.

**Production.** READY on recent commits through the session. Nine cron jobs ran
in production today and each wrote its own audit row, and three things were
measured against the live system rather than inferred: the email outbox carried
four messages end to end on two templates, `/api/push/key` answers 200 with no
session, and `auth_logs` shows the Send Email Hook running on both sign-ups
with zero GoTrue mail events beside it.

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

**Last written:** 2026-09-23, 18:05 UTC, measured at `origin/main` `56bb587a`
for the gate table above. Work landed after that commit is in
`docs/BUILD_07_LEDGER.md` sections 78 to 83 and is NOT covered by those
numbers: the removal of external bank send, the preview deck indexes, email
immutability, the Android build guard, I1b, the committed-secret sweep, the
reader-role privilege revoke across 95 tables, and R-SH4. **Anybody checking
this file should re-run the gates rather than trusting a table measured eight
commits ago.**

#### Session B confirms

Written 23 September 2026, 22:30 UTC, by Session B's lead. **Measured at
`4482b30e`** (origin/main at 22:22 UTC, the last code commit of Session B's
work), in the main working tree, every heavy job under the shared lock.

**Branch and main.** Everything Session B and its workers wrote is on
`origin/main`. The local main tree is clean and not ahead of origin. All ten
worker worktrees still on the box were checked at 22:25: 0 tracked changes,
0 untracked files, 0 commits ahead of origin/main in every one; twenty earlier
worktrees were removed after the same check. The designated branch
`claude/five-surfaces-rebuild-1rz9e0` is set to the same commit as main after
this confirmation is pushed.

**Gates, with the numbers, at `4482b30e`:**

| Gate | Result |
|---|---|
| `tsc --noEmit` on the whole web project | exit 0 |
| `vitest run`, whole suite | exit 0: 242 of 242 files, 3,859 passed, 1 skipped |
| `check-css-tokens` (all ten checks) | exit 0, clean |
| `eslint .` | exit 0: 0 errors, 333 warnings (warnings pre-existing; none is a new error) |
| `next build` (production, harness off) | exit 0, 199 pages generated |
| A root `page.tsx` in every `preview/session-b/**` harness directory | yes |
| Secrets | `no-committed-secrets` passes inside the suite; the QA password exists only in the scratchpad's `qa.env` and in no file of the tree |

Known flake, not hidden: `src/lib/push/service-worker.browser.test.ts` failed
once under load during the day and passed 7 of 7 alone; it passed in this run.

**Production.** `https://www.vallospaces.com` answered 200 at 22:24 UTC
(`x-vercel-id` iad1). **Which commit production serves is not known from this
box:** the Vercel tool needs an approval this session was not given, and the
GitHub status API refuses this integration. Two facts bound it: production
redeployed at least twice during the evening (`dpl_MmeTx6Vi...` at 17:19 and
`dpl_7dLACdyX...` at 17:24, seen by the console proof), and at 17:23 the
production `/wallet/send` still appeared to carry the bank option, so the bank
removal (`32830d5b`) had not deployed by then. The founder can read the current
deployment's commit in the Vercel dashboard in one click.

**Scope file and ledger.** `docs/SESSION_B_SCOPE.md` carries every claim of the
day with its RELEASED line, the requests to Session A (QA accounts settled,
B-BANK withdrawn with the order `transferToBank` may go in, EMAIL-LOCK, I1a,
I1b delivered, I5, A15, R-SH4 published, PUSH-KEY done, SW-A1, the main-red
note). `docs/BUILD_SESSION_B_LEDGER.md` carries sections 0 to 13 including
every sweep group, both audit-fix rounds (13.A2 with addendum 13.A2.7), the
push blind light, and the live-proof rows with time, commit and evidence path.
Both are pushed.

**Uncommitted, and why:** nothing. Two things are deliberately outside the
repository: the QA credentials (`qa.env` in the scratchpad, mode 600, because a
credential never lives in the tree) and the build caches (`.next`, deleted).

**Unproven, restated so nobody reads this section as "all done":** every
money write (C3.7), every inspection write (C3.8), a real device push row
(C1.3), the welcome email in an inbox, the hosts' filled screens, the Google
lookups and rate limiter (service role key), Firm rosters (A15), the email
lock's server door (Session A), and the 6 sweep rows closed after the second
audit, which no independent audit has re-run over (B5b).
