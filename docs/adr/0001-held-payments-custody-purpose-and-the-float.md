> **Superseded on 25 September 2026 by [ADR 0002](0002-vallo-never-holds-customer-money.md).** Vallo no longer holds customer money; everything below is history.

# ADR-E1. Held payments: custody, the purpose gate, and the float

**Status.** Accepted for the machinery. **The custody question is OPEN and is
the reason no naira has moved.**
**Date.** 23 September 2026.
**Supersedes.** Nothing. `ARCHITECTURE_DECISIONS.md` in the repository root
predates escrow entirely, which is finding `A2-150` in `RECOMMENDATIONS.md` and
item 8 on the gate in `docs/research/ESCROW_END_TO_END_RESEARCH.md` 5.10. This
is that missing record.
**Reading.** `docs/research/ESCROW_END_TO_END_RESEARCH.md` is the long form.
This file records what was DECIDED, what was deliberately NOT decided, and
where the build departs from that research. It does not repeat it.

---

## 1. Custody: undecided, and undecided is rendered as nothing

### The decision

**VALLO SPACES LTD does not say, anywhere a person can read, who holds the
money.** Not in the product, not in an email, not on a receipt, not in a brand
mark. The structure has not been chosen, the solicitor has not answered, and
until he does the product describes the EFFECT of a hold and never its
CUSTODIAN.

The sentence that ships is:

> This money is set aside. Neither of you can spend it until it is paid out or
> returned.

That is true under every one of the five structures in research part 2.7, so it
will still be true after the structure is chosen. It is not a placeholder.

### Why this is enforced by a function and not by a rule

A rule is a thing a reviewer has to remember. `custodySentence()` in
`apps/web/src/lib/escrow/copy.ts` returns `string | null`, and for the shipped
value `CUSTODY_STRUCTURE = "undecided"` it returns **null**. Every caller
renders nothing when it is null. There is no fallback string anywhere in the
call chain, and adding one is the single change that would undo this decision.

The type is a union of three, not a string, so a fourth structure cannot be
introduced by typing a sentence: it has to be added to the union, which puts it
in front of whoever reviews the change.

### What is at stake, in the company's own words

"Held in escrow by Vallo" would be a public claim about a regulated activity,
made by a company whose objects clause **deliberately omits every payment and
escrow word** because including them demanded N500,000,000 of share capital
(`docs/archive/HANDOFF_01_COMPANY.md`). `apps/web/src/lib/legal/terms.tsx` currently
tells a reader that Vallo does not hold their money. A screen saying otherwise
would contradict the contract on the same domain.

This is also why the `escrow-hold` brand mark is cut, finished, and **withheld**
rather than shipped: artwork that says one thing while the terms say another is
worse than no artwork.

### What would change it

One thing only: the founder's solicitor answering **in writing**, naming a
structure. Then `CUSTODY_STRUCTURE` moves off `undecided`, the matching sentence
starts rendering everywhere at once because there is only one of it, and the
terms clause is rewritten **in the same change** as the first surface that says
it. Not before, and not separately.

### Cost of changing later

Low, and deliberately so. One constant, one union member, one sentence, and the
terms. The cost was paid up front by refusing to let any surface write its own
custody string.

---

## 2. The purpose gate: one purpose open, one refused permanently, one deferred

### The decision

`escrow_purpose` carries five values. **Exactly one may be opened.**

| Purpose | Ruling | Why |
|---|---|---|
| `agency_fee` | **OPEN** | The one transaction where holding the money until the service is delivered is both useful and proportionate. The service is discrete, it either happened or it did not, and the sums are small enough that a hold is not itself a risk. |
| `purchase_deposit` | **REFUSED UNTIL A TRUSTEE STRUCTURE IS SIGNED** | It passes the same usefulness test, and only through a trustee. Nobody has signed one. This is a deferral with a named condition, not a rejection. |
| `purchase_balance` | **REFUSED PERMANENTLY** | It never passes the test at any size. A property purchase balance goes through a solicitor, with searches done first. A platform standing between a buyer and that money is adding risk, not removing it, and no structure makes that untrue. |
| `rent_deposit` | REFUSED | A caution deposit is better served by a record of what was paid and what condition the place was in than by a hold. |
| `first_rent` | REFUSED | Paid to the landlord under the tenancy agreement. A hold does not fit the instrument. |

### Where the gate lives, and why it is in three places

`private.escrow_purpose_is_open(p)` is one line: `select p = 'agency_fee'`. It
is called inside **every** door that can open or fund an agreement, so the
refusal happens under the same transaction as the write it refuses.

Above it, the server actions in `lib/escrow/actions.ts` close their Zod schemas
to `agency_fee` as well. That is not redundancy for its own sake: **a schema
refusal names a field and a database refusal names a status**, and a person
filling in a form should get the first. `PURPOSE_REFUSAL` in `copy.ts` carries
a sentence for each refused purpose so that if a surface ever offers one, the
answer is English and not `purpose_not_open`.

Above that, the screens do not offer the choice at all. Only one purpose is
open, so a menu with one item in it would be a choice that is not a choice; the
proposal composer states what the payment is for as a fact.

### Why the enum keeps values it refuses

Postgres has no `DROP VALUE`. The four refused purposes cannot be removed, so
they are refused in the function and documented as refused in the migration.
This is recorded because it looks like an oversight and is not.

### Cost of changing later

**Opening `purchase_deposit`: high, and correctly so.** It requires the signed
trustee structure, and it is the leg that also needs partial settlement, which
is unbuilt (see section 5). **Opening `purchase_balance`: it should not be
opened.** If a future person disagrees, the argument to beat is in research part
3.2, not in this file.

---

## 3. The float is a liability, and the identity is asserted rather than assumed

### The decision

**Money held between two users is a LIABILITY of the company, not revenue and
not an asset.** It is booked as one, it is reconciled as one, and the identity
that says so is checked on a schedule rather than believed.

### The derivation, stated as the invariant it is

There is **one ledger** (`public.wallet_entries`) and no second table of escrow
balances anywhere. A shadow ledger is how a marketplace ends up unable to
answer "how much does this person have" with one number.

The float is therefore derived two ways, and they must agree exactly:

**From the ledger:**

```
float = sum(escrow_hold debits) - sum(escrow_release credits) - sum(escrow_refund credits)
```

**From the agreements:**

```
float = sum(amount_minor) over escrows in FUNDED, HELD, RELEASE_REQUESTED, DISPUTED
```

These two numbers are **I-2** in research 5.4, and before 22 September the
identity had never been asserted anywhere in this codebase. It now lives in
`private.escrow_invariants_check()`, is snapshotted into
`public.escrow_float_snapshots`, and runs on the scheduler.

### Why the identity is worth more than the code that computes it

It has already caught something. `scripts/probes/escrow_ruling.log` records a
probe that seeded an agreement straight into DISPUTED with no hold behind it
and then ruled a refund on it: 500,000 kobo left a pot it had never entered,
and I-2 reported the gap **to the kobo, with its sign**. The probe was wrong and
the invariant was right. That is the clearest demonstration in this build that
the number is connected to something real.

Every probe that touches money now asserts I-2 afterwards, including the
proposal probe added today.

### The consequences that follow from "liability"

- **Commission is guarded, not computed.** `escrow_settle` used to take a
  commission on every release unconditionally.
  `private.escrow_commission_is_permitted(purpose)` now gates it, so switching a
  rate on cannot silently start taking a cut of money the company is only
  holding. At today's rates the commission is zero and the receipt says so
  rather than hiding it.
- **The float is never spendable.** `private.wallet_spendable_locked` is the one
  function that decides what a person may commit, and a hold is subtracted
  inside the wallet lock. There were four inlined copies of that arithmetic;
  there is one now.
- **Integer kobo as bigint, everywhere, and never a float.** `Number("1234.56")
  * 100` is `123455.99999999999`. `nairaToKobo` in `copy.ts` parses the naira
  and the kobo as two runs of digits and combines them with integer arithmetic,
  and refuses anything it cannot parse exactly rather than guessing.

### Cost of changing later

Very high, and that is the point. The identity is the thing that would detect
the change having gone wrong.

---

## 4. Two departures from the research sketch, named rather than left to be found

The research file is a sketch, and a sketch that is followed exactly where it
is wrong is worse than one that is departed from openly.

### Departure 1. The verbs were not just revoked. They were split in two.

**What the research asked for.** F-2: revoke `escrow_fund_from_wallet`,
`escrow_confirm`, `escrow_request_release` and `escrow_raise_dispute` from
`authenticated`, and reach them through server actions running as the service
role.

**What was built.** The revoke, and then every body moved into an `_as` sibling
that **takes the actor as its first argument**, with the original left as a
one-line delegate passing `auth.uid()`.

**Why.** The sketch is not implementable as written. Those functions are
`security definer` and identified their caller with `auth.uid()`. Under the
service role `auth.uid()` is **null**, so a server action calling the original
function would have arrived as nobody and been refused. The actor had to stop
being ambient and become an argument.

**What it bought, beyond working at all.** The actor is now a value that can be
written to a row, and that is what made the audit defect in section 5 visible
and fixable. It also means no exported server action can name a different actor:
the actor is never a parameter of anything exported in `lib/escrow/actions.ts`.

**What it cost.** Two functions per verb instead of one, and a rule that the
delegate must never grow a second implementation. Both are stated at the top of
each migration.

### Departure 2. One funding door derives its reference from the row. The other cannot.

**What the research asked for.** 5.3, stated absolutely: the idempotency key is
derived from the escrow row's id, never a fresh uuid, because "a random uuid per
attempt would make every retry a second payment".

**What was built.** Two doors, and only one obeys it literally.

- `escrow_fund_proposal_as` funds an agreement that **already exists**. It
  derives `rm-esc-<escrow uuid>-hold` inside the database, from the row, and
  takes no reference argument at all. There is nothing for a caller to choose
  and therefore nothing for a caller to get wrong. This is the rule, honoured
  exactly.
- `openHeldPayment` opens and funds in **one call**. There is no row to derive
  from: the row is created in the same transaction. Its reference is a fresh
  uuid generated server-side.

**Why that second one is safe, and why it is still a departure.** What makes a
retry safe is not the shape of the key; it is that the key is **stable across
attempts of the same logical action** and that a collision answers `duplicate`
rather than raising. A client retrying `openHeldPayment` with the same
reference moves nothing, because the unique index on `wallet_entries.reference`
catches it and the door answers `duplicate` (which is E-8, fixed). But a client
that retries by calling the action again generates a **new** reference and would
open a second agreement. That risk is real, it is bounded by the rate limiter
and by the fact that the person sees the result, and it is named here rather
than papered over.

**The direction of travel.** The proposal door is the better shape and is now
the one the product uses: propose, then fund what exists. `openHeldPayment` is
the older single-step path and should be retired once nothing calls it.

**CLOSED, 23 SEPTEMBER, LATER THE SAME DAY.** Nothing called it. It had no UI
caller at any point: the only references outside its own definition were its
own unit tests and a rate-limit key named after it. `openHeldPayment` is
deleted, and migration `20260923101038` revokes `EXECUTE` on
`public.escrow_fund_from_wallet_as` and on its delegate
`public.escrow_fund_from_wallet` from every role, `service_role` included, and
reads the catalogue back inside itself with a control that must answer yes.
**There is now exactly one way to open an agreement and exactly one way to fund
one, and neither of them accepts a reference.** This departure is therefore no
longer a departure: research 5.3 is honoured literally by the only funding door
that exists.

**The two functions are NOT dropped, and that is deliberate.**
`scripts/probes/escrow_concurrency.sh` funds P-1 to P-6 through
`escrow_fund_from_wallet_as`, by lifting the function text out of the migration
files into a scratch cluster. Dropping it would not have made those probes
fail: the extractor reads `create or replace function` statements and would
never have seen a `drop`, so six probes would have gone on passing against a
body that no longer existed in production. The body is kept readable and
unreachable until the probes are re-pointed. **That re-pointing is not done and
is named in `docs/archive/retired-custody/escrow/PROBE_STATE.md` as the reason P-1 to P-6 are proved
against a retired door.**

---

## 5. What this ADR deliberately does not decide

Recorded because an undecided thing that is not written down reads as an
oversight later.

1. **Partial settlement.** Research 5.2 offers two shapes: `released_minor` and
   `refunded_minor` columns with a `PARTIALLY_SETTLED` state, or two child
   escrows with a `parent_escrow_id`. **Neither is built and neither is chosen.**
   The agency fee leg does not need it. The purchase deposit leg cannot ship
   without it. Decide before that leg, not before this one.
2. **The release condition on a proposal.** Research 4.2 asks the compose sheet
   for a release condition chosen from a short list. **It is not built.** There
   is no column for it, no vocabulary for it, and a list invented today would be
   a list the adjudication desk has never had to read. The proposal carries what
   it can carry honestly: who pays, how much, and the date it would pay out on.
   This is a deferral made today and it is the third departure in this file.
3. **Who the payee's money reaches when the payee has no wallet.** The funding
   door refuses with `no_wallet`. That is correct and it is not a product.
4. **The custody structure itself.** Section 1. Nobody in this repository may
   decide it.

---

## 6. The gate, and where it actually stands

Research 5.10 lists nine conditions before a naira moves. This is the honest
state of each on 23 September 2026.

| # | Condition | State |
|---|---|---|
| 1 | The legal answer exists in writing and names the structure | **NOT MET.** The solicitor has not answered. |
| 2 | The terms clause rewritten by the solicitor and shipped with the first surface | **NOT MET**, and blocked by 1. |
| 3 | F-1 to F-9 done | **MET**, read back off the live database. |
| 4 | P-1 to P-9 pass with captured logs | **PARTLY.** P-1 to P-6, P-8, P-9 pass. **P-7 is half proved**: the EXECUTE layer passes with a control that answers; the HTTP layer has never run because the egress policy denies `*.supabase.co`, re-checked today. |
| 5 | T-1 to T-14 pass in CI | **PARTLY.** The copy, float, action and evidence suites pass. Several T items have no test yet. |
| 6 | The float check and the overdrawn check run on a schedule and alert | **MET** for the float identity. |
| 7 | The feature flag exists and fails closed | **MET.** `lib/escrow/flag.ts`, uncached, and closed on a missing row, which is what the database says today: there is no `held_payments` row, so **every money path in this feature refuses right now**. |
| 8 | An ADR is written | **This file.** |
| 9 | The founder has walked one real escrow end to end | **NOT MET**, and blocked by 1 and 7. |

**The feature is built and switched off.** That is the intended state, and
conditions 1, 2 and 9 are not engineering work.

---

## 7. What a reviewer should refuse

Short, because a list a person can hold in their head is a list they use.

1. Any string naming who holds the money, or any fallback for
   `custodySentence()` returning null.
2. Any purpose reaching a door other than `agency_fee`, and any widening of
   `private.escrow_purpose_is_open` that is not accompanied by the signed
   structure it depends on.
3. Any second ledger, any escrow balance stored outside `wallet_entries`, and
   any arithmetic on money that is not integer kobo.
4. Any read-before-write idempotency check in TypeScript. The unique index is
   the enforcement and nothing else is.
4b. Any funding door that takes a reference as an argument, and any door that
   opens an agreement and funds it in the same call. The row has to exist
   before the money moves, so that the key can be derived from the row. This
   was true of `openHeldPayment` and it is why it is gone.
5. Any flag read for this feature that can fail open, or that is cached.
6. Any evidence that can be edited or deleted, by anybody, including its author.
7. Any copy containing the word itself, or a promise of safety, protection or a
   guarantee.
