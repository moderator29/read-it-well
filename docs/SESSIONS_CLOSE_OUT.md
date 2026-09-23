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
| **The whole email junction.** One durable outbox, a trigger writing in the same transaction as the event it describes, a quarter hourly drain, fifteen templates with a path to the wire. | **`public.email_outbox` has 0 rows and not one email has ever been sent.** `RESEND_API_KEY` is unset, and this container's egress proxy refuses `api.resend.com:443` with a 403, so no send can be proved from here at all. | The key set on the deployment, then one real message read back from the provider's own log. Fifteen minutes once the key exists. |
| **Push notifications.** Tokens, a queue, deliveries that cannot claim success without the provider's status, quiet hours in WAT, three transports. | **0 rows in `push_tokens`. Nothing has reached a device.** Chrome refuses the Push API in incognito and every Playwright context is incognito; the proxy permits the sending side and blocks the subscribing side. | `npx web-push generate-vapid-keys`, two variables, then one handset. Web Push needs nobody and no money. |
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

*Per brief and per track, with denominators, in the revision that follows this
one. The register those figures come from is being re-derived now rather than
copied from `PLATFORM_STATUS.md`, because that file's own numbers were taken in
the shared worktree and one of them was wrong.*

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

### C2. Needed before launch, not blocking today

### C3. Decisions only he can make

*Product and business questions, not engineering ones. State the options and
your recommendation.*

---

## PART D: The state of the tree at close

*Both sessions confirm, separately.*

- Branch synced with `main`, nothing unpushed
- Tests, lint and build all green, with the numbers
- Production deployment green, with the commit
- Every scope file and ledger current and pushed
- Anything left uncommitted, and why

---

**Last written:** *(date, time, and the commit it was measured at)*
