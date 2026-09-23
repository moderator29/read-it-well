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

*Session B fills this in. Delete this line when you do.*

### B1. What is finished and proved

*Each surface: matched against its governing image with the comparison
recorded, wired end to end with the chain walked, and the commit.*

### B2. What is built but unproven, and what proving it needs

### B3. What is not built, with an honest estimate

### B4. The code, by the numbers

*Percentage per surface, each with its denominator. The seven surfaces, the
admin console, its documentation, and the welcome email.*

### B5. What broke, what was wrong, what was corrected

### B6. What the next session needs to know

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
