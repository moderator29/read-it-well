# The nine escrow probes, and what is actually known shut

> **no naira moves until all nine probes pass in both directions, and right
> now that sentence is still untested.**
>
> The founder, 23 September 2026. It governs this file. Nothing here softens
> it, and no row in the table below is allowed to claim a verdict that the run
> which would have produced it never performed.

**Read the verdict column and nothing else first.** A reader who wants to know
which doors are known shut should be able to answer that from one glance, so
the vocabulary is deliberately small and each word means one thing:

| Word | What it means |
| --- | --- |
| **PASS** | The run happened, on the date given, and its assertions held. |
| **FAIL** | The run happened, on the date given, and something did not hold. |
| **NOT RUN** | The run has never happened. Not once. It is not a pass, it is not a fail, and it is not evidence of anything. |
| **STALE** | It passed on the date given, and the thing it tested has changed since. The verdict is about a version that is no longer shipping. |

**State of the whole gate on 23 September 2026: NOT MET.** One probe half has
never run and cannot be run from this machine. Eight probes were red when they
were last executed, for a reason in the harness rather than in the product, and
that reason is now fixed but the fix has not been proved by a green run at the
time of writing. See the last section for exactly what is owed.

---

## The table

Dates are the date the verdict in that row was TAKEN, not the date the probe
was written and not the date it last passed at some earlier version.

| # | What it asserts | How it is run | Verdict | Date taken |
|---|---|---|---|---|
| **P-1** | Two concurrent funding calls against one balance that affords exactly one of them: exactly one succeeds, the second blocks on the first's row lock, re-reads spendable after the commit and is refused. One escrow, one hold, balance zero, never negative. | `scripts/probes/escrow_concurrency.sh`. Two real `psql` sessions against a local Postgres 16 cluster, over a minimal copy of only the tables the functions touch, running the function text lifted out of `supabase/migrations/*.sql` with each body's sha256 printed. Nothing touches the live project. | **FAIL** | 2026-09-23 |
| **P-2** | An escrow hold and a withdrawal hold for the same balance, **in both orders**: exactly one commits, the other is refused, and both sessions answer rather than raise. | As P-1. | **FAIL** (escrow first). **PASS** (withdrawal first) **and it is not evidence**, see the note below the table. | 2026-09-23 |
| **P-3** | The same shape against the third and fourth committing paths: an escrow against a pot move, and an escrow against a transfer to another person. Exactly one takes the naira. | As P-1. | **FAIL** (both) | 2026-09-23 |
| **P-4** | Two sessions settle the same HELD agreement at the same instant: exactly one credit, exactly one state change, exactly one audit row, and the payee is paid once. | As P-1. | **FAIL** | 2026-09-23 |
| **P-5** | The timeout sweeper and a dispute race on one agreement, **in both orders**: never both a release and a dispute, and the agreement ends in one coherent state. | As P-1. | **FAIL** (both) | 2026-09-23 |
| **P-6** | The same funding reference called twice, **serially and concurrently**: one ledger entry, and `duplicate` answered rather than raised. | As P-1. | **FAIL** (both) | 2026-09-23 |
| **P-7, the EXECUTE layer** | `anon` and `authenticated` are refused by Postgres itself on every revoked escrow verb, before any body runs. | `scripts/probes/escrow_revoke_roles.sql`, through `mcp__Supabase__apply_migration` against the live project, ending in a deliberate `raise exception` so the whole transaction rolls back. | **PASS.** 22 refusals over 11 verbs and 2 roles, every one `insufficient_privilege` (42501). A control verb granted to `authenticated` on purpose answered `{"status":"forbidden"}` in the same transaction, so the harness demonstrably reaches function bodies. | 2026-09-23 |
| **P-7, the HTTP layer** | PostgREST, given a real anon key and a real user JWT over the wire, also refuses every one of those verbs. | `scripts/probes/escrow_revoke.sh`, against `https://uccixoonmbhrnyczyigt.supabase.co`. | **NOT RUN.** It has never run, not once. See the section below. | never |
| **P-8** | A direct `update public.escrows set state = 'RELEASED'` on a REFUNDED row, from a plain prompt as the owning role, raises from the transition trigger and the row does not move. | As P-1. | **FAIL** | 2026-09-23 |
| **P-9, locally** | Across a lifecycle mix of held, released, refunded, disputed and cancelled, with a live commission rate, the two derivations of the float agree to the kobo, no wallet goes negative, and every settlement's net plus commission equals its gross. | As P-1. | **FAIL** | 2026-09-23 |
| **P-9, against the live database** | The same identity, I-2, plus I-3a and I-3b, asserted against production inside a transaction that rolls back, including that each breach opens exactly one alert and not one per pass. | `scripts/probes/escrow_invariants.sql`, through `apply_migration`, ending in a deliberate raise. | **PASS**, and **STALE**. Its first run found a real defect: the deduplication compared a column with a same-named variable, so it was a tautology that would have gone silent after its first finding. | 2026-09-22 |

### P-2 (withdrawal first) passed today with the escrow door unusable

This is the clearest thing in the file and it belongs above the fold rather
than in a footnote. P-2's assertion is that exactly one of the two paths
commits the balance, that both sessions SPEAK rather than raise, and that the
payer ends at zero. With the withdrawal going first, it takes the balance, and
the escrow leg is then refused `insufficient` by the spendable check **before
it reaches the statement that was broken**. Every condition is satisfied.
`insufficient` is the expected word whether the door behind it is sound or
cannot run at all.

The other direction caught it correctly and read FAIL with
`BOTH-ANSWERED: no. One session raised rather than answering.` **That is why
the founder's sentence says in both directions.** One direction of one probe
went green over a door that could not open a row.

---

## Why eight of them are red, and it is not the product

`scripts/probes/escrow_concurrency_20260923_stale_scratch_schema.log` is the
run. Migration `20260923093233` added `escrows.opened_by` at 09:32 on
23 September and made `escrow_fund_from_wallet_as` write it. **The harness
builds a minimal copy of `escrows` by hand and that copy had no such column**,
while it lifts the CURRENT function text out of the migration files. So every
probe that funds an escrow died on one statement:

```
ERROR:  column "opened_by" of relation "escrows" does not exist
CONTEXT: PL/pgSQL function escrow_fund_from_wallet_as(...) line 42
```

**The harness was right to report failures and is not the thing at fault for
reporting them.** What is at fault is that the suite carrying the sentence "no
naira moves until all nine probes pass" can go red at 09:32 and still be
believed green at 17:00 because nobody ran it. It is the second time this
exact scratch table has been more permissive or less faithful than production:
on 22 September it copied the COLUMNS and not the CHECK CONSTRAINTS, and a
shipped fault in `escrow_cancel_as` went straight through it.

**UNPROVEN, and said plainly:** the eight red rows above are believed to be red
for the schema reason alone, because every one of them has the same
`opened_by` error in its session output. That belief rests on reading the log.
Until the harness is repaired and a green run is captured, **no row in this
file may be read as evidence that the locking, the ordering or the float
identity still hold.** The last green run of those eight was 2026-09-22, and
the bodies they ran have changed since.

---

## P-7's HTTP half has never run, and this machine cannot run it

`uccixoonmbhrnyczyigt.supabase.co` is refused by this box's egress proxy.
Checked once more while writing this file:

```
== checked at 2026-09-23T10:12:18Z
curl: (56) CONNECT tunnel failed, response 403
HTTP 000
```

**This is an environment policy and it is not retryable.** No amount of waiting,
retrying, or reaching the host another way turns it into a run, and any such
route would be a different question answered by a different path. The only
thing that changes it is the founder allowing `*.supabase.co` out of this
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

The founder's sentence says both directions, and for most of these it is
literal rather than a figure of speech.

| Probe | The two directions |
| --- | --- |
| P-1 | The two concurrent funders, A first and B second. Only one ordering is meaningful, because the probe's whole point is which one blocks. |
| P-2 | Escrow first, then withdrawal first. Both run. |
| P-3 | Escrow against a pot, and escrow against a transfer. Both run. The reverse orderings within each pair are **NOT RUN**. |
| P-4 | Two settles, symmetric by construction. |
| P-5 | Sweeper first, then dispute first. Both run. |
| P-6 | Serially, then concurrently. Both run. |
| P-7 | `anon` and `authenticated` on the EXECUTE layer: both run. `anon` and `authenticated` over HTTP: **NOT RUN**, neither of them. |
| P-8 | One direction only: REFUNDED to RELEASED. The reverse, and the other illegal pairs in the transition table, are **NOT RUN**. |
| P-9 | Ledger-derived against agreement-derived, which is the identity's two sides and is what makes it an identity. |

Two of those rows say NOT RUN about a direction rather than about a probe, and
they are stated here rather than left to be discovered: **P-3's reverse
orderings and P-8's other illegal transitions have never been executed.**

---

## What is owed before any of this reads green

1. **Repair the scratch schema so it cannot go stale again**, then capture a
   green run of P-1 to P-6, P-8 and P-9 and date this table from it.
2. **P-1 to P-6 fund through `escrow_fund_from_wallet_as`, which was retired on
   23 September** by migration `20260923101038`: `EXECUTE` is revoked from
   every role including `service_role`. The body is deliberately kept so the
   harness can still lift it, and the reason is written into that migration.
   **So even a green run of those six is evidence about the shared locking and
   ledger machinery, and NOT about the door the product now funds through.**
   Re-pointing them at `escrow_propose_as` plus `escrow_fund_proposal_as` is
   not done.
3. **P-7's HTTP half needs the founder.** Nothing in this repository can
   produce that verdict.
4. **P-8 and P-3 need their missing directions.**

Until 1 to 4 are closed, the founder's sentence stands exactly as he wrote it.
