# Price Check, stage one: what is built, what is proven, and what the numbers say today

Written 23 September 2026 against the live project `uccixoonmbhrnyczyigt`. Every
number below was read from that database on that date and the query that
produced it is given, so a reader can re-run it rather than believe it.

Stage one was scoped in `docs/archive/PROMPTS_THE_FINISH.md` section 3 and in
`docs/archive/HANDOFF_09_THE_DIRECT_PLATFORM.md` section 5:

> the area report from asking prices described as asking, the neighbourhood
> power and water facts, the refusal states with notify-me, the map pin ladder
> for address entry, and the `price_check_events` instrumentation with its five
> character geohash and never an address. The word valuation appears nowhere,
> the lint rule holds it there, and no share artefact ever carries an address.

---

## 0. THE ONE FACT THAT DECIDES EVERY ROW BELOW

```sql
select is_demo, count(*), count(*) filter (where status='PUBLISHED') as published
from public.listings group by is_demo;
--  is_demo | count | published
--  --------+-------+-----------
--  t       |    64 |        64
```

**There is no `is_demo = false` row in this database. Not one.** Sixty-four
listings, all sixty-four of them examples, all sixty-four published.

`is_demo = false` sits inside `comparable_listings`, `comparable_supply_near`,
`area_asking_summary`, `area_suggestions` and `area_utility_facts` — every read
stage one is built on. So the correct behaviour of every one of those functions
today is to return nothing, and **that is what they do**.

This is why the whole feature reads as a row of green lights in the test suite
and produces nothing at all in production. It is not broken. It has no supply.

---

## 1. THE COMPARABLES RULE, PROVED FROM BOTH SIDES

This is the item that matters most, because on an estate where all 64 listings
are examples **a predicate that excludes everything looks exactly like a correct
one**, and this platform has been caught by that shape twice in one day.
`comparable_listings` returning zero proves nothing by itself: a broken bedroom
band, a wrong radius, a mismatched rent period or a typo in the intent test
would each produce the same zero.

**This is proved, and the proof is checked in.**
`scripts/probes/comparables_admit_the_real_and_refuse_the_example.sql`, run
23 September 2026 against this project through `apply_migration` and logged
beside itself, puts two rows in front of the predicate that differ in one
column and asserts both answers, then flips that column on a row already in the
set and watches it leave and come back. It ends in a deliberate
`raise exception` so the whole transaction unwinds, and the rollback was
verified afterwards by a separate read rather than assumed —
`non_demo 0`, the estate back exactly as it was.

```
1 control: both twins PUBLISHED and readable
2 example twin: NOT a comparable
3 real twin: IS a comparable, set size 3
4 flip: is_demo true removes it, false returns it, nothing else moved
4c gate on 3 real: refused / too_few_comparables, count 3
5 area report: 1 group of 3 real, 0 groups when the same rows are demo
6 as anon: both twins still in the catalogue, examples are not hidden
  from search
```

Assertion 3 is the one no earlier test on this build had: **a non-demo listing
can reach a comparable.** Assertion 4 is what makes 2 and 3 mean anything — the
row that left the set is the same row that was in it, so `is_demo` and nothing
else decided. Assertion 6 is the rule's other half: examples are excluded from
Price Check comparables and from statistics **only**, never from search, the
feed or a listing page, so the probe would fail on the day somebody widened the
rule and hid the whole catalogue.

A second, independent reading of the same rule, this one read-only and needing
no writes at all, agrees. Run the shipped function, then run its own body with
the single condition `l.is_demo = false` flipped to `= true` and nothing else
changed:

```sql
-- SIDE A: the shipped function, exactly as the app calls it
select count(*) from public.comparable_listings(
  <lng>, <lat>, 'apartment', 'rent', 3, 5000, 365, null, 200);
-- 0

-- SIDE B: the identical predicate with only the demo flag flipped
--   status='PUBLISHED', location not null, same property_type, same intent,
--   bedroom band ±1 not crossing zero, published_at within 365 days,
--   not sold, price > 0, rent_period='year', st_dwithin 5000m
--   ... and l.is_demo = true
-- 3
```

Side B returning three proves the rest of the rule is satisfiable by rows that
exist right now — the type matches, the intent matches, the bedroom band admits
them, they are inside the radius, recent enough, priced above zero and share a
rent cycle. Side A returning zero on that same set therefore proves
`is_demo = false` is exactly and only what removes them. It is weaker than the
probe, because it reasons about a copy of the predicate rather than calling the
function on a real row, and it is worth having because it needs no writes and
can be run by anyone with a read connection in one query.

**The blind light is off, from both directions.**

## 2. THE AREA REPORT FROM ASKING PRICES — BUILT, CORRECT, RETURNS NOTHING

| Read | Result today |
|---|---|
| `comparable_listings(...)` at Lekki Phase 1 | **0 rows** |
| `area_asking_summary('LA','Lagos','Lekki Phase 1','apartment','rent')` | **0 rows** |

The gate in `lib/price-check/gate.ts` therefore refuses every per-property call
with `no_comparables`, which is the honest answer and the specified one.

`price_basis` is carried on every comparable row and every money figure is
`asking_sale` or `advertised_rent_<period>`. Nothing in this database is a sold
price and nothing claims to be. The advertised rent, not the move-in total, is
the comparable, and the migration argues why in place: a move-in total folds in
agency and legal fees that vary by agent rather than by property, so comparing
totals compares agents.

**State: built and argued, never once observed producing a report.**

---

## 3. THE NEIGHBOURHOOD POWER AND WATER FACTS — AND A SHIPPED COMMENT THAT TODAY FALSIFIES

`20260922222221_price_check_reports_what_places_are_asking.sql` says of
`area_utility_facts`:

> This function needs no price data, which is exactly why stage one leads with
> it: on the day Price Check ships every per-property call refuses, and this
> panel is real product value that does not depend on the gate opening.

That sentence is wrong today, and the database says so:

```sql
select * from public.area_utility_facts('LA','Lagos','Lekki Phase 1');
-- power_grid null, power_backup null, water_supply null,
-- listing_count 0, estate_access_known 0, prepaid_meter_known 0
```

The panel does not depend on the **gate** opening. It depends on **real supply
existing**, because it excludes example listings for the same reason the prices
do — an example listing's power supply is fiction, and a fact panel built from
fiction is an invented number with a picture beside it. That exclusion is right.
The claim that this panel is therefore product value on launch day is not.

**State: built, correct, and the only stage one item whose shipped rationale is
contradicted by production data. Worth a follow-up commit to the comment.**

---

## 4. THE REFUSAL STATES WITH NOTIFY-ME — THE ONE PART THAT IS ACTUALLY PROVEN LIVE

This is the item that works, and it works in the hardest case.

```sql
select * from public.area_supply_census('LA','Lagos','Lekki Phase 1');
-- demo_count 5, real_count 0, sized_count 0, located_count 0

select * from public.comparable_supply_near(6.44, 3.42, 'apartment','rent',3,3000);
-- demo_count 1, real_count 0, stale_real_count 0
```

Both census functions **separate "we hold nothing here" from "everything we hold
here is an example"**, and today they correctly report the second. That is the
whole reason they exist, and it is the distinction that lets the refusal copy be
honest instead of a shrug. `offersNotifyMe` is exercised over the refusal codes
in `gate.test.ts` and offers the prompt exactly where more listings would change
the answer.

**State: built, tested, and observed doing its job against real production
data.** The only stage one item of which that is true.

---

## 5. THE MAP PIN LADDER — AND A RUNG THAT RETURNS NOTHING

```sql
select count(*) from public.area_suggestions('LA', null, 8);
-- 0
```

The third rung of the address ladder offers areas this platform holds real
published listings in. It holds none, so it offers none. The field still accepts
free text, and the function's own comment says why that is deliberate: refusing
an area we have not seen would refuse every area we have not seen.

**A consequence worth naming, because it is a green light in disguise.** The
share-card write path (`shareAreaPrices`) refuses to mint a card for an area
name this platform does not already hold real published listings in. That
vocabulary is empty. **So no share card can be minted at all today.** The guard
is correct and fails closed on purpose — refusing a card costs a person one tap,
and the alternative is a forwarded artefact carrying an address. But nobody
should read `price_check_shares` at zero rows as "the feature works and is
unused". It is closed.

---

## 6. INSTRUMENTATION — BUILT, WIRED, NEVER FIRED

```sql
select count(*) from public.price_check_events;  -- 0
select count(*) from public.price_check_shares;  -- 0
```

Zero events. The table has never recorded a submission, an answer or a refusal.
The five character geohash column exists and no row carries one because no row
exists. The admin analytics read in `lib/admin/reads/analytics.ts` draws from a
table that has never had a row in it.

**State: built and unobserved.** This is the platform's first demand log and it
is at zero. Every claim about what readers ask for is currently unevidenced.

---

## 7. THE WORD, AND THE RULE THAT HOLDS IT

```
$ node apps/web/scripts/check-valuation-words.mjs
valuation words: clean — 1750 files and every directory name scanned,
0 regulated words outside the budgeted disclaimer surfaces, the standing
disclaimer still says the word it disclaims, and the scan reached more than
the 300 file floor.
```

The scanner states its own blind spot in its output, which is the right way to
ship a scanner: it reads source text with comments stripped, so **it cannot see
a word assembled at runtime or pulled from a database.** A regulated word
arriving from a listing title or an admin-entered string would pass it.

**State: proven for source text, explicitly unproven for runtime strings.**

---

## THE SUMMARY A FOUNDER SHOULD READ

| Stage one item | Built | Proven live |
|---|---|---|
| Comparables rule excludes examples | yes | **yes, both sides, by a rolled-back probe with real inserts** (§1) |
| Area report from asking prices | yes | no — 0 comparables, 0 summaries |
| Neighbourhood power and water facts | yes | no — 0 listings, and its shipped rationale is falsified (§3) |
| Refusal states with notify-me | yes | **yes** (§4) |
| Map pin ladder | yes | partly — the area rung returns nothing, and share is closed (§5) |
| `price_check_events` instrumentation | yes | no — 0 rows ever (§6) |
| The word `valuation` held out | yes | yes for source, no for runtime strings (§7) |

Six of the seven are built. Two are proven. **The single unblocking action for
five of the remaining rows is not code: it is one real, non-demo, published,
located listing.** Everything stage one needs is waiting behind
`is_demo = false`, and it has been correct and empty since the day it shipped.
