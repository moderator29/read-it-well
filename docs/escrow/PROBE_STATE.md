# The nine escrow probes, and what is actually known shut

> **no naira moves until all nine probes pass in both directions, and right
> now that sentence is still untested.**
>
> The founder, 23 September 2026. It governs this file. Nothing here softens
> it, and no row in the table below is allowed to claim a verdict that the run
> which would have produced it never performed.

**HOW MUCH OF THAT SENTENCE IS TESTABLE TODAY, IN ONE SENTENCE.** Every local
probe now exercises the door the product actually funds through and every
direction named in the sentence has been run except the HTTP half of P-7,
which has never run once and cannot be run from this machine: so the sentence
is testable everywhere except at the API a person's browser reaches, and that
one gap is enough to keep the gate shut.

**Read the verdict column and nothing else first.** A reader who wants to know
which doors are known shut should be able to answer that from one glance, so
the vocabulary is deliberately small and each word means one thing:

| Word | What it means |
| --- | --- |
| **PASS** | The run happened, on the date given, and its assertions held. |
| **FAIL** | The run happened, on the date given, and something did not hold. |
| **NOT RUN** | The run has never happened. Not once. It is not a pass, it is not a fail, and it is not evidence of anything. |
| **STALE** | It passed on the date given, and the thing it tested has changed since. The verdict is about a version that is no longer shipping. |

**State of the whole gate on 23 September 2026: NOT MET, and one probe half is
the reason.** Everything that can be run from this machine was re-run today,
against the proposal door, and passed. **P-7's HTTP half has never run, not
once, and cannot be run from here.** Until it has, the claim "the escrow verbs
are shut to a signed-in person's browser" is a claim about the database and
not about the API, and the founder's sentence stands.

**Every privilege verdict in this file is taken from the CATALOGUE**, meaning
`pg_proc.proacl` and `has_function_privilege`. None of it comes from
`information_schema.role_table_grants` or `information_schema.column_privileges`,
which only return rows where the QUERYING role is grantor or grantee: an empty
result from those views is a fact about the observer and not about the object,
and a worker on this tree drew the wrong conclusion from one.

---

## WHICH DOOR THE LOCAL PROBES FUND THROUGH, WHICH CHANGED TODAY

This is the first thing to know about every local row below.

Until 23 September, P-1 to P-6, P-8 and P-9 funded through
`public.escrow_fund_from_wallet_as`, which opened an agreement and funded it in
one call. That verb was RETIRED the same day: migration `20260923101038`
revoked `execute` from every role including `service_role`, confirmed again
today from `pg_proc.proacl`, which reads `{postgres=X/postgres}` and nothing
else. A green probe over a revoked door is evidence about shared locking and
ledger machinery. It is not evidence about the door a real payer walks
through, and the previous cycle said so and left it.

**Every funding call in the harness now goes through the pair the product
uses:** `public.escrow_propose_as` opens a row in INITIATED with nothing moved,
and `public.escrow_fund_proposal_as` takes the money. Both hold
`service_role=X/postgres` and nothing else, read from the catalogue today.

**Three gates came with the move, and they are now inside the probes rather
than beside them:** the thread membership test, the one-live-agreement-per-
thread rule, and a funding reference DERIVED from the row instead of chosen by
the caller.

**And one structural fact that the retired verb could not express.**
`conversations` is unique on `(guest_id, agent_id, listing_id)`, read from
`pg_constraint` on the live database, and the proposal door refuses a second
live agreement in one thread. So two simultaneously fundable proposals between
the same two people need TWO different properties. P-1 races exactly that, so
P-1 now needs two listings and two threads. The harness's cast carries eight of
each.

**Nothing was left re-pointed only in part, and no row below implies a verdict
about the live door on the strength of a run against the retired one.** The
retired verb's body is still lifted, because the catalogue guard covers it and
because it is still in the live database, but no probe calls it.

---

## The table

Dates are the date the verdict in that row was TAKEN, not the date the probe
was written and not the date it last passed at some earlier version.

| # | What it asserts | How it is run | Verdict | Date taken |
|---|---|---|---|---|
| **P-1** | Two proposals for one balance that affords exactly one of them, funded concurrently: exactly one succeeds, the second blocks on the first's wallet row lock, re-reads spendable after the commit and is refused. One escrow HELD, one left INITIATED, one hold, balance zero, never negative. Proposing itself moves nothing. | `scripts/probes/escrow_concurrency.sh`. Two real `psql` sessions against a local Postgres 16 cluster, over a minimal copy of only the tables the functions touch, running the function text lifted out of `supabase/migrations/*.sql` with each body's sha256 printed, checked against the live catalogue before anything runs. Nothing touches the live project. | **PASS**, through `escrow_propose_as` plus `escrow_fund_proposal_as` | 2026-09-23 |
| **P-2** | An escrow funding and a withdrawal hold for the same balance, **in both orders**: exactly one commits, the other is refused, both sessions answer rather than raise, and the probe NAMES which leg must win and which must be refused. | As P-1. | **PASS** (both orders), through the proposal door | 2026-09-23 |
| **P-3a** | An escrow funding against a pot move, **in both orders**: escrow first, and pot first. Exactly one takes the naira, and the named leg is the one refused. | As P-1. | **PASS** (both orders). `pot_first` had **NEVER RUN** before today. | 2026-09-23 |
| **P-3b** | An escrow funding against a transfer to another person, **in both orders**: escrow first, and transfer first. | As P-1. | **PASS** (both orders). `transfer_first` had **NEVER RUN** before today. | 2026-09-23 |
| **P-4** | Two sessions settle the same HELD agreement at the same instant: exactly one credit, exactly one state change, exactly one audit row, and the payee is paid once. The agreement is proposed and funded through the live door first. | As P-1. | **PASS** | 2026-09-23 |
| **P-5** | The timeout sweeper and a dispute race on one agreement, **in both orders**: never both a release and a dispute, and the agreement ends in one coherent state. | As P-1. | **PASS** (both orders) | 2026-09-23 |
| **P-6** | The same proposal funded twice, **serially and concurrently**: one ledger entry, one debit, and the repeat answers `not_fundable` rather than raising. Plus the unique index backstop reached on purpose, which must answer `duplicate` and leave the agreement INITIATED. | As P-1. | **PASS** (all three) | 2026-09-23 |
| **P-7, the EXECUTE layer** | `anon` and `authenticated` are refused by Postgres itself on every revoked escrow verb, before any body runs. | `scripts/probes/escrow_revoke_roles.sql`, through `mcp__Supabase__apply_migration` against the live project, ending in a deliberate `raise exception` so the whole transaction rolls back. | **PASS.** 22 refusals over 11 verbs and 2 roles, every one `insufficient_privilege` (42501), re-taken today. Two of the eleven are `escrow_propose_as` and `escrow_fund_proposal_as`, so this is about the live door. A control verb granted to `authenticated` on purpose answered `{"status":"forbidden"}` in the same transaction. | 2026-09-23 |
| **P-7, the HTTP layer** | PostgREST, given a real anon key and a real user JWT over the wire, also refuses every one of those verbs. | `scripts/probes/escrow_revoke.sh`, against `https://uccixoonmbhrnyczyigt.supabase.co`. | **NOT RUN.** It has never run, not once. Re-checked at 2026-09-23T10:59:48Z: `curl (56) CONNECT tunnel failed, response 403`. | never |
| **P-8a** | A direct `update public.escrows set state = 'RELEASED'` on a REFUNDED row, from a plain prompt as the owning role, raises from the transition trigger and the row does not move. The agreement reaches REFUNDED through the live door. | As P-1. | **PASS** | 2026-09-23 |
| **P-8b** | **Every one of the 72 ordered pairs of the nine states**, from a plain prompt: the 58 illegal ones must raise with the trigger's own sentence and leave the row where it was, and the 14 legal ones must be ALLOWED THROUGH in the same run. The 14 are compared against the probe's own hand-written copy of the table, not against the shipped function. | As P-1. | **PASS.** 72 pairs, 14 legal allowed, 58 illegal refused, 0 disagreements with the probe's own table. It had **NEVER RUN** before today: P-8 tested one pair. | 2026-09-23 |
| **P-9, locally** | Across a lifecycle mix of held, released, refunded, disputed and cancelled, with a live commission rate, the two derivations of the float agree to the kobo, no wallet goes negative, and every settlement's net plus commission equals its gross. Seven agreements in seven threads, six funded through the live door and the seventh proposed and cancelled. | As P-1. | **PASS** | 2026-09-23 |
| **P-9, against the live database** | The same identity, I-2, plus I-3a and I-3b, asserted against production inside a transaction that rolls back, including that each breach opens exactly one alert and not one per pass. | `scripts/probes/escrow_invariants.sql`, through `apply_migration`, ending in a deliberate raise. | **PASS**, re-taken today. **Baseline clean**, which is the half of it that is about production rather than about the probe: at the moment of the run the two derivations of the float agreed and no wallet was overdrawn. | 2026-09-23 |

Fourteen local results, because P-2, P-3a, P-3b and P-5 each run two
directions and P-8 is now two probes.

---

## THE THREE GATES IN FRONT OF THE PROBES, AND WHY EACH ONE EXISTS

A probe is only worth its verdict if the thing under it could have failed and
the harness demonstrably reached it. Three gates run before any probe, in this
order, and each was put there by a specific fault.

### 1. THE CATALOGUE GUARD, new on 23 September

The harness lifts function text by scanning the migrations for
`create or replace function`. **A `drop` is neither a create nor a replace**,
so a function dropped in production went on passing here against a body that
no longer existed anywhere. So did a signature changed, a body rewritten by a
do-block the harness does not replay, and a migration written but never
applied.

`scripts/probes/escrow_live_catalogue.tsv` now records the live catalogue for
all 32 probed functions, taken from `pg_proc` by somebody who could read it:
identity arguments, sha256 of `prosrc`, sha256 of `prosrc` with comments and
trailing whitespace removed, `prosecdef`, and the acl. After the bodies load,
the harness reads its own `pg_proc` with the same normalising expression and
compares row by row. **Any code disagreement stops the run before the smoke
check.**

**It found five divergences on its first real run and they were not an
artefact of the guard.**

| Function | What differs | Verdict |
| --- | --- | --- |
| `private.compute_fee` | live copy is the same code with its `--` comments stripped | **UNEXPLAINED** |
| `private.notify` | same | **UNEXPLAINED** |
| `public.move_into_pot` | same | **UNEXPLAINED** |
| `private.escrow_invariants_check` | same | **UNEXPLAINED** |
| `private.pay_booking_from_wallet` | said `RentMe` here, says `Vallo` live | **REAL, and fixed** |

The fifth was real and it exposed the general fault: **six migrations rewrite
function bodies through `pg_get_functiondef` and `execute` rather than through
`create or replace`, and the harness replayed two of them.** The brand rewrite
of `20260922130000` is now replayed too, for the functions the harness holds.

**WHO STRIPPED THE COMMENTS OUT OF THOSE FOUR LIVE BODIES IS NOT KNOWN.** It is
recorded as unexplained rather than guessed at. The code hashes agree, which is
what the gate is on, so no probe is running different logic from production.

**What the guard still cannot do.** The manifest is a file, not a live query,
because this machine has no route to the project: the same wall P-7's HTTP half
is behind. A change made straight against the live database after the file was
taken is invisible to it, and the four stripped-comment bodies are exactly what
such a change looks like. The staleness test narrows the window for anything
that arrives as a migration and narrows nothing else. **UNPROVEN, and named
rather than hidden.**

### 2. THE SMOKE CHECK

One uncontested proposal and one uncontested funding call, with nothing racing
them, before any probe runs. If the proposal does not open exactly one
INITIATED agreement with nothing moved, or the funding call does not answer
`ok` and leave one HELD agreement and one hold entry, the run STOPS.

Its wording changed today. It used to say "THE HARNESS IS THE SUSPECT, NOT THE
PRODUCT". A mutation that made the transition table refuse every pair stopped
the run right there with the PRODUCT at fault, so it now says the harness is
the FIRST suspect and names the other possibility. A gate that names a culprit
it has not identified is the same error as a probe claiming a verdict it did
not take.

### 3. `require_escrow`, per probe

A funding call against an agreement that does not exist answers `not_found`,
and several of these probes would read that as the refusal they were hoping
for. Every probe that opens a proposal checks it opened.

---

## P-2 (withdrawal first) PASSED THIS MORNING WITH THE ESCROW DOOR UNUSABLE

Kept at the top of this file because it is the clearest thing in it.

P-2's assertion is that exactly one of the two paths commits the balance, that
both sessions SPEAK rather than raise, and that the payer ends at zero. With
the withdrawal going first, it takes the balance, and the escrow leg is then
refused `insufficient` by the spendable check **before it reaches the statement
that was broken**. Every condition was satisfied. `insufficient` is the
expected word whether the door behind it is sound or cannot run at all.

The other direction caught it correctly and read FAIL. **That is why the
founder's sentence says in both directions.**

---

## THE SAME SHAPE, FOUND AGAIN TODAY, IN P-3

The mutation runs in
`scripts/probes/escrow_concurrency_20260923_mutation_tests.log` are the
evidence for everything in this file, and one of them found a second blind
light of exactly the family above.

**Mutation C removed the overdraft refusal from `escrow_fund_proposal_as`
entirely**, so the escrow door would let a payer spend money they did not
have. With only the forward orderings in the harness, as it stood this
morning, **P-3a and P-3b both still read PASS**, and so did P-2 (escrow_first).

The reason is P-2's reason seen from the other side. With the escrow going
first it wins the balance honestly, and the leg that then has to be refused is
the POT or the TRANSFER, whose own spendable check is untouched. "Exactly one
of them took the naira" is satisfied by the OTHER path doing all of the
refusing.

**So P-3's reverse orderings are not a fuller version of a covered direction.
They are the only directions of P-3 in which the escrow door's own refusal is
tested at all.** They had never run. They run now, and they go red under that
mutation while the forward ones stay green.

---

## EVERY PROBE HERE HAS BEEN WATCHED FAIL

Eleven mutation runs, each breaking exactly one thing in an ISOLATED COPY of
the migrations and the script under `/tmp`. Nothing touched this repository's
migrations or the live project. The full runs are kept in
`scripts/probes/escrow_concurrency_20260923_mutation_tests.log`.

| Mutation | What was broken | What caught it |
| --- | --- | --- |
| A | the funding half of the live door cannot insert | smoke check, before any probe |
| B | the proposal half cannot insert | smoke check, before any probe |
| C and D | the escrow door stops refusing an unaffordable amount | P-1, P-2 (withdrawal_first), P-3a (pot_first), P-3b (transfer_first). The three forward orderings stayed green. |
| E | every state transition is legal | P-8a and P-8b |
| F | no state transition is legal | smoke check, and it rewrote the smoke check's own wording |
| G | one legal pair swapped for `REFUNDED -> RELEASED` | P-8b only, and ONLY through its own hand-written table: the counts stayed 72, 14, 58, 0 wrong |
| H | a probed body changed to open `purchase_balance` | catalogue guard, before any probe |
| I | a probed function dropped in a migration | catalogue guard, before any probe |
| J | a defining migration newer than the live head | catalogue guard, before any probe |
| K | the manifest deleted | catalogue guard, before any probe |

**Two defects in the probes themselves came out of that list, and both are
fixed.** Mutation G showed that asking the shipped function which pairs are
legal and then checking it refused the rest is a circle, so P-8b holds its own
copy of the fourteen. And the query comparing the two tables was written
`A except B union all B except A` with no brackets, which Postgres reads
leftwards as `((A except B) union all B) except A`, and it reported one
disagreement where there were two.

---

## P-7's HTTP half has never run, and this machine cannot run it

`uccixoonmbhrnyczyigt.supabase.co` is refused by this box's egress proxy.
Checked twice more while doing today's work, at 10:30:15Z and again at
10:59:48Z:

```
curl: (56) CONNECT tunnel failed, response 403
HTTP 000
```

**This is an environment policy and it is not retryable.** No amount of
waiting, retrying, or reaching the host another way turns it into a run, and
any such route would be a different question answered by a different path. The
only thing that changes it is the founder allowing `*.supabase.co` out of this
sandbox, or the probe being run from somewhere that can reach it.

**Why the EXECUTE pass does not stand in for it, in one paragraph.** PostgREST
resolves an RPC by ARGUMENT NAME against a cached schema, so a verb can be shut
in `pg_proc` and still answerable over the wire through an overload that was
not revoked or a schema cache that has not reloaded. `anon` and `authenticated`
being refused inside the database is a fact about the database. The claim the
gate needs is about the API a person's browser can actually reach. **They are
two questions and only one of them has an answer.**

---

## What "both directions" means, per probe

| Probe | The two directions | State |
| --- | --- | --- |
| P-1 | The two concurrent funders, A first and B second. Only one ordering is meaningful, because the probe's whole point is which one blocks. | run |
| P-2 | Escrow first, then withdrawal first. | both run |
| P-3a | Escrow first, then pot first. | both run, `pot_first` for the first time today |
| P-3b | Escrow first, then transfer first. | both run, `transfer_first` for the first time today |
| P-4 | Two settles, symmetric by construction. | run |
| P-5 | Sweeper first, then dispute first. | both run |
| P-6 | Serially, then concurrently, then the index backstop reached on purpose. | all three run |
| P-7 | `anon` and `authenticated` on the EXECUTE layer. | both run |
| P-7 HTTP | `anon` and `authenticated` over HTTP. | **NOT RUN**, neither of them, never |
| P-8 | Every ordered pair of the nine states, both the 58 that must be refused and the 14 that must be allowed. | all run, for the first time today |
| P-9 | Ledger-derived against agreement-derived, which is the identity's two sides. | run |

**One row still says NOT RUN and it is P-7's HTTP half.** The two rows that
said NOT RUN about a direction yesterday, P-3's reverse orderings and P-8's
other illegal transitions, have run.

---

## WHICH TREE EACH VERDICT IS ABOUT, WHICH IS NOT THE SAME AS WHICH BRANCH

Main was red for a stretch on 23 September and nobody could see it, because
suites were being run in the shared worktree where several workers' in-flight
edits were supplying a module main did not have. **A suite run in that tree
measures a tree nobody has and nobody deploys.** Every local row above was
taken in that same shared worktree, so the question has to be answered rather
than waved past.

**No row in this table is a verdict about main, and none of them needs to be.**

| Row | What it is actually a verdict about |
| --- | --- |
| P-7 EXECUTE, P-9 live | **The live database.** Not a tree at all. Run through `apply_migration` against project `uccixoonmbhrnyczyigt` and rolled back. |
| P-7 HTTP | Nothing. It has never run. |
| Every local row | **The `.sql` text of `supabase/migrations/*.sql`, the harness script and the catalogue manifest, as they stood in the shared worktree on 2026-09-23.** |

**Why the last row transfers to `origin/main` anyway, and it is checked rather
than assumed.**

1. **The harness has no JavaScript in it.** It is bash plus `psql` plus
   `python3` plus a local Postgres 16 cluster. It does not read `node_modules`,
   does not build, does not import a module, and does not touch `apps/web`. The
   failure mode above has no path into it.
2. **Its inputs are `supabase/migrations/*.sql`, its own script and
   `scripts/probes/escrow_live_catalogue.tsv`**, all three of which are pushed
   to `origin/main` in the same commit as the run that produced the log.
3. **The catalogue guard now closes the hole that used to sit here.** The old
   version of this file recorded, as UNPROVEN, that an untracked migration from
   another worker could redefine one of the probed bodies and the harness would
   silently lift it, because "the last definition in filename order" is exactly
   what an untracked file wins. **That is now caught**: an untracked migration
   redefining a probed function changes the lifted code hash, disagrees with
   the live catalogue, and stops the run. Mutation J is the demonstration.

---

## What is owed before any of this reads green

1. **DONE, 23 September.** P-1 to P-6, P-8 and P-9 fund through
   `escrow_propose_as` plus `escrow_fund_proposal_as`. No row above rests on
   the retired verb.
2. **DONE, 23 September.** P-3's reverse orderings and the whole transition
   table are in the harness, and both were watched failing before they were
   believed.
3. **DONE, 23 September.** The harness refuses to run when what it lifted
   disagrees with the live catalogue.
4. **P-7's HTTP half needs the founder.** Nothing in this repository can
   produce that verdict.
5. **The four stripped-comment bodies are unexplained**, and nobody has found
   what edits the live database outside a migration. Until somebody does, the
   catalogue guard's window is open by exactly that much.

**Item 4 is the one that cannot be closed from inside this repository**, and it
alone is enough to keep the gate shut. The founder's sentence stands exactly as
he wrote it.
