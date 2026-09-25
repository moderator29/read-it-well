# R2: the content truth sweep, and three carried items written out

> **Track A, 25 September 2026.** Vallo no longer holds customer money: the wallet, escrow and held payments are retired. Where this document describes them it describes the past; the current truth is [`docs/MONEY_ARCHITECTURE.md`](/docs/MONEY_ARCHITECTURE.md).

**Agent R2, recommendation only, 19 September 2026, on `claude/brave-feynman-9g0ykr`
at `12270a9`.** Four named jobs. This file holds what R2 did NOT apply, with the
exact change at each site and the worker who owns it. Nothing here was edited
into another worker's files.

R2 restates the rules it worked under: one blue family, emerald success, rose
error, cyan pending, no warm hues; no raw colours or spacing; no em dashes;
British spelling; the banned UI word list; `BrandIcon` for brand marks and
`UiIcon` for interface glyphs; rule 12, the verified badge only ever means a
human was checked; rule 15, no invented counts and no manufactured social
proof; rule 18, nothing is called done unless it is. Stop list acknowledged in
full, and the two items below that touch the database are written as proposals
for the lead rather than applied, because one of them changes a trigger.

---

## 0. The headline

Two things in this file are worth reading before the rest.

1. **JOB 4 is a live trust fault, not a latent one.** Approving an agent
   application sets `agents.verified = true` in the same breath, before one
   document has been looked at, and three surfaces read that boolean while the
   listing badge reads the KYC ladder. The first agent this platform ever
   approves will be shown as verified in messaging and on their social profile
   and as not verified on every listing they publish, and their own dashboard
   will tell them they have not started. Section 4.
2. **JOB 1 passes on every rendered surface.** No figure on the landing, the
   home or the catalogue is invented; each one traces to a query. What the
   sweep did find is four DEAD dictionary keys carrying claims this platform
   cannot support, sitting in the dictionary waiting for somebody to wire them
   up. Section 1.

The founder's private gmail address appears in no tracked file except
`apps/web/src/lib/brand-domain.test.ts`, which forbids it, and
`docs/archive/BUILD_06_LEDGER.md` section 10, which records the earlier sweep. Checked
across the whole tree, clean, no urgent finding. It is not repeated here, so
this file cannot become the next place it leaks from.

---

## 1. JOB 1: the content truth sweep

### 1.1 The stats band: clean, and it traces

Every figure rendered on a public or signed-in surface was followed to its
query.

| Surface | Figure | Source | Verdict |
| --- | --- | --- | --- |
| Landing, community band (`components/site/landing/CommunityBand.tsx:36`) | up to three figures | `statTiles()` over `getPlatformStats()` over the `platform_stats()` security-definer aggregate | real |
| Landing, the same band | renders nothing at all when `stats` is null or every count is zero (`figures.length > 0 &&`, and `statTiles` filters `value > 0`) | n/a | correct: silence, not a rounded-up zero |
| Home, market tiles and city capsules (`app/(app)/home/market-queries.ts`) | one count per tile and capsule | `count: "exact"` head queries on the same `status = 'PUBLISHED'` predicate discovery uses; an unreadable count is absent and the tile draws its name alone | real |
| Home, the for-sale band | the photograph and its badge | one real for-sale row with a photograph, or the whole band is absent | real |

There is no `StatsBand` component any more; `stat-tiles.ts:17` records that it
was removed and that the rule moved to the caller. The render's "10K+
properties, 5K+ happy clients, 200+ agents" is quoted in that file's comment as
the thing being refused, and it is refused.

**Nothing to fix.** This bullet of the sweep passes.

### 1.2 The Invest segment: not in the build, with one caveat

The reference image's Invest segment reaches no reader.

- `components/site/landing/SearchPill.tsx:13` records that the fourth segment
  was dropped, naming the reason: Vallo sells no investment product.
- `components/site/SiteFooter.tsx:45` records that the Product column's Invest
  slot carries Restaurants instead.
- `packages/i18n/src/locales/en.ts:438` records that the ten-tile grid was
  removed on the founder's ruling and that one of its tiles was Invest.
- The signed-in home still has a band whose component is called `InvestBand`,
  whose CSS is `.nf-home__invest*` and whose dictionary key is `home.invest`.
  **Its copy carries no investment claim:** eyebrow "Buy", headline "Property
  for sale on Vallo.", body about homes, land and commercial space, action
  "Explore properties for sale", target `/search?intent=sale`. `en.ts:1533`
  narrates the change and states the rule correctly: two surfaces of one
  product cannot disagree about whether a product exists.

**Caveat, and it is only a caveat.** The identifiers still say invest:
`InvestBand`, `InvestFeature`, `readInvestFeature`, `home.invest`,
`.nf-home__invest`, and the comments in `home.css:231`, `markets.ts:74` and
`market-queries.ts:151` still call it "the investment band". No reader sees any
of it, and `en.ts:1543` gives the reason the key was left alone (two components
read it by that name and a key is not copy). It is a naming hazard rather than
a content fault: the next person to write copy against a key called `invest`
has been handed a nudge towards the words we deleted. Renaming the key, the
type, the component and the class to `forSale` is a single mechanical change in
F1's scope (`components/app/home/**`, `app/css/home.css`) plus a key rename in
`packages/i18n` (lead). It is not urgent and R2 did not do it.

**Verdict: the Invest segment does not appear anywhere in our build.**

### 1.3 Advertised inventory: four dead keys carrying claims we cannot support

The discipline was taken from `apps/web/src/lib/email/shell.test.ts`, which was
narrowed on 19 September with the reasoning written down: ban the HARM, not the
nouns. R2 transplanted that test's four rules (quantity, availability promise,
superlative inventory framing, `experiences` outright), kept its money strip
`/₦[\d,]+(\.\d+)?/g` before counting, and widened the quantity noun list by
`guests`, `hosts`, `clients`, `cities` and `states` because those are the nouns
this half of the product would boast in. It was run over string LITERALS only,
across all four locales and all of `apps/web/src` except the
`app/(dev)/preview/**` harnesses: 1,112 files, 66 raw hits, every one read by
hand.

Sixty-two were correct to leave. The pattern the narrowed email test exists to
protect is the reason: "Every listing on Vallo was put up by a real person on
Vallo" is a true sentence about how the product is built, not a superlative
inventory boast, and so are the fifteen other sentences of that shape. "One
cancellation schedule covers every stay" is a policy statement. "Nigeria is 36
states and the Federal Capital Territory" is geography. "1 guest" and "2 guests"
are plural forms. `HowVallo.tsx:19`'s `experience` is the third of four step
names, Discover, Verify, Experience, Manage, and not a category.

Four hits are real, and every one of them is a DEAD key. None is rendered on
any surface today. R2 verified each by grepping the whole of `apps/web/src` for
the key and finding no reader.

| Key | Copy | Rule broken | Reader today |
| --- | --- | --- | --- |
| `agent.join.benefitReach` (`en.ts:1677`, `ha:1148`, `ig:1152`, `yo:1146`) | "Reach thousands of verified guests" | quantity, and the invented count is of PEOPLE | none: the whole `agent.join` namespace is unreferenced |
| `welcomeCards.one.body` (`en.ts:83`) | "Homes to rent, hotels for the weekend, restaurants and experiences. All of Nigeria, all thirty-six states, one search." | `experiences` (no table, no route, no screen, zero rows), plus a coverage claim | none: `FirstRun.tsx` renders `twoWorlds` and `three` only, never `one` or `two` |
| `home.topExperiences` (`en.ts:1490`) | "Explore top experiences" | `experiences`, and `top` on top of it | none |
| `categories.experiences` (`en.ts:221`) | "Experiences" | names a category with zero rows | none |

`experience` is a real `ListingKind` in the schema, and the live database holds
**zero** rows of it (property types present: apartment 16, home 16, rental 8,
shortlet 8, office 3, shop 3, land 3, villa 3, hotel 2, restaurant 2). The
filter drawer is honest about this by construction: `FilterDrawer.tsx:320`
filters `KIND_ORDER` down to the kinds actually present in the results, so the
Experiences chip cannot appear until an experience listing does. That is the
right pattern and it is why this section has no live finding.

**Why R2 did not fix these itself.** Ledger section 2:
`packages/i18n/src/locales/*.ts` may be edited by a worker only to ADD keys
inside its own namespace. Changing an existing string in `agent.join` (F5's),
`welcomeCards` (F1's), `home` (F1's) or `categories` (shared) is neither an add
nor R2's namespace, and ledger 11.8 records that two agents already collided
once on this exact file and the second overwrote the first's finished locale
work. The fix is one line each and it belongs to the owner.

**The recommended change, for whoever holds the file:**

```diff
-      benefitReach: "Reach thousands of verified guests",
+      benefitReach: "Reach guests who chose Vallo",
```

and, because the honest version of a claim about reach is no claim about size,
the same removal of the quantity word in `ha`, `ig` and `yo`.

For the three `experiences` keys R2 recommends **deletion rather than rewording
in all four locales**, because there is nothing to reword them to: deleting a
key that no component reads costs nothing, and leaving it is how a future home
screen ends up with an "Explore top experiences" rail over an empty result set.
`welcomeCards.one` and `welcomeCards.two` should go together, as one unreferenced
pair, and if a future first-run card wants that sentence it should be written
against what the catalogue holds at the time.

**Do not invent replacement copy for a gap.** R2 wrote none.

### 1.4 Two consistency nits, neither a truth fault

- Three surfaces count Nigeria differently: "Search 37 states"
  (`en.ts:992`, states plus the FCT), "Built for all 36 states" (`en.ts:807`)
  and "all thirty-six states" (`en.ts:83`, dead). All three are defensible and
  none is false, but a reader moving between them sees two numbers for one
  country. Worth one decision, once.
- `app/(auth)/start/StartCarousel.tsx:44` holds its two slides as hardcoded
  English `SLIDES` rather than dictionary keys, on a screen that is the first
  thing a Yoruba, Hausa or Igbo speaker meets. Not a content truth fault, an
  i18n gap, and F1 owns it.

---

## 2. JOB 2: `RENT_PERIOD_LABEL` is English only, in three workers' scopes

Carried in ledger 11.8 with the instruction that it wait for one owner holding
all the sites at once. This section is that owner's brief. The ledger named
eight sites; R2 found the same eight and **two more faults in the same lines**
that a fix limited to the period label would leave behind, so the shape below
is slightly wider than the ledger's and the reason is given.

### 2.1 What is actually wrong

```ts
// apps/web/src/lib/listings/pricing.ts:177
export const RENT_PERIOD_LABEL: Record<RentPeriod, string> = {
  month: "Monthly",
  quarter: "Quarterly",
  year: "Yearly",
};
```

Three faults, not one.

1. **The label is English.** A Yoruba reader gets "Háyà (yearly)".
2. **`.toLowerCase()` is an English casing assumption.** Six of the eight sites
   lowercase the label to drop it inside a sentence. That is a rule about
   English orthography applied to four languages, and it is the reason the fix
   needs two forms per period rather than one plus a string method.
3. **The lines around it are English too**, so fixing only the period produces
   a half-translated ledger. `ListingMoveIn.tsx:61-70` hardcodes "Caution
   deposit", "Agency fee", "Legal fee", "Agreement fee" and "Service charge";
   `ledger-model.ts:56-71` hardcodes the same six labels AND six hint strings
   ("Held against damage, returned as agreed", "Estate and building upkeep",
   "The agent's own fee", "Documentation and processing", "The tenancy
   agreement"); `rent/pay/[inspectionId]/page.tsx:232` hardcodes "Total to pay"
   and the two paragraphs under it. A reader who sees "Háyà (ọdọọdún)" over
   "Caution deposit" has been told the product is half finished.

**Worse than any of the three, and not in the ledger's list:**
`ledger-model.ts:58-60` prints the raw database enum to the reader.

```ts
label: `${t.catalogue.card.rent} (1 ${period})`,
hint: `${formatMoney(listing.priceMinor, locale, listing.currency)} × 1 ${period}`,
```

`period` there is the column value, `"year" | "month" | "quarter"`. So the
label is a translated noun followed by an untranslated enum: a Hausa reader
sees the Hausa word for rent, then `(1 year)`. That line should be fixed
whatever else is or is not done.

### 2.2 The shape to build

There is already a precedent in this repo and the fix should match it rather
than invent a second pattern. F5 landed `agent.pricing.period` in all four
locales after the ₦24,000,000 asking price printed "per night":

```ts
// packages/i18n/src/locales/en.ts:1946, inside the `agent` namespace
period: { month: "per month", quarter: "per quarter", year: "per year",
          night: "per night", guest: "per head", sale: "asking price" },
```

That map is **adverbial** ("per month") and it lives under `agent`. The
move-in ledger needs an **adjectival** form ("Monthly", "monthly") on
**guest-facing** surfaces. So it needs its own keys, and they must NOT go under
`agent`.

Recommended: a new top-level `rentPeriod` namespace. It is top-level because
the eight sites span F3, E, BB and the lead, and hanging it off any one of
their namespaces makes the next owner's import read like a mistake.

```ts
// packages/i18n/src/locales/en.ts, new top-level namespace, all four locales
  /*
   * The tenancy period, in the two forms the product actually needs.
   *
   * `label` is the standalone form, for a chip or a receipt field: "Monthly".
   * `inline` is the form that goes inside a bracket or a sentence, already in
   * the case the language wants. It exists so no call site calls
   * `.toLowerCase()`, which is a rule about English orthography that three of
   * our four languages did not agree to.
   */
  rentPeriod: {
    label:  { month: "Monthly",  quarter: "Quarterly",  year: "Yearly" },
    inline: { month: "monthly",  quarter: "quarterly",  year: "yearly" },
    /* The two money lines that carry a period in brackets, as whole
       sentences, because bracket placement is not universal either. */
    rentLine: "Rent ({period})",
    serviceChargeLine: "Service charge ({period})",
    serviceCharge: "Service charge",
    /* "Rent is monthly, moving in from 1 October." */
    rentIsPeriod: "Rent is {period}",
  },
```

Yoruba, Hausa and Igbo values need a speaker, not R2. The ledger already
records that `ha` "needs native review before launch"; R2 will not put invented
Yoruba in a dictionary and call it a translation. **This is the one thing that
blocks the whole item and it should be said out loud rather than discovered at
the diff.** Until those twelve strings exist, `withFallback` in
`packages/i18n/src/locales/fallback.ts` means a non-English reader keeps seeing
English, which is exactly where they are today, so landing the English keys and
the helper first is a strict improvement and not a regression.

The helper goes beside the constant:

```ts
// apps/web/src/lib/listings/pricing.ts, beside RENT_PERIOD_LABEL
import type { Dictionary } from "@vallo/i18n";

/** The standalone label: "Monthly". */
export function rentPeriodLabel(t: Dictionary, period: RentPeriod): string {
  return t.rentPeriod.label[period];
}

/** The in-sentence form: "monthly", already cased for the language. */
export function rentPeriodInline(t: Dictionary, period: RentPeriod): string {
  return t.rentPeriod.inline[period];
}
```

`pricing.ts` imports no runtime from `@vallo/i18n` for this, only the
`Dictionary` type, so it stays a pure module and nothing about its current
importers changes.

**`RENT_PERIOD_LABEL` itself is then deleted**, not left beside the helper. A
constant that still compiles is a constant the next person will reach for.

### 2.3 The eight sites, the diff at each, and who owns it

`moveInParts` and `ledgerLines` take a row, not a dictionary, so the two that
build labels have to take `t`. That signature change is the only ripple and it
reaches three further callers, listed at the end.

---

**Site 1 and 2. `apps/web/src/lib/listings/pricing.ts:239,244`. Owner: LEAD**
(`lib/listings/pricing.ts` is in no worker's written scope; `lib/listings/**`
is shared, with only `scene-photographs.generated.ts` and `sitemap.ts` assigned).

```diff
-export function moveInParts(row: MoveInColumns): MoveInPart[] {
+export function moveInParts(row: MoveInColumns, t: Dictionary): MoveInPart[] {
   const parts: MoveInPart[] = [];
   const push = (key: string, label: string, value: number | null) => {
     if (value === null || value === undefined) return;
     parts.push({ key, label, minor: Number(value) });
   };
-  push("rent", `Rent (${RENT_PERIOD_LABEL[asRentPeriod(row.rent_period)].toLowerCase()})`, row.rent_amount_minor);
+  push(
+    "rent",
+    t.rentPeriod.rentLine.replace("{period}", rentPeriodInline(t, asRentPeriod(row.rent_period))),
+    row.rent_amount_minor,
+  );
   push("caution", "Caution deposit", row.caution_deposit_minor);
   push(
     "service",
     row.service_charge_period
-      ? `Service charge (${RENT_PERIOD_LABEL[asRentPeriod(row.service_charge_period)].toLowerCase()})`
-      : "Service charge",
+      ? t.rentPeriod.serviceChargeLine.replace(
+          "{period}",
+          rentPeriodInline(t, asRentPeriod(row.service_charge_period)),
+        )
+      : t.rentPeriod.serviceCharge,
     row.service_charge_minor,
   );
```

`moveInTotal` at `pricing.ts:268` calls `moveInParts(row)` only to sum the
minor units and never reads a label. It should NOT be made to take a
dictionary; split the summation off the labelling instead, or pass the English
dictionary there and leave a comment saying the labels are discarded. The first
is cleaner.

---

**Site 3 and 4. `apps/web/src/components/app/listing/ListingMoveIn.tsx:60,65`.
Owner: F3** (`components/app/listing/**`).

`partsOf` is already local to the component and the component already receives
`locale`. It needs `t` as well, which its parent has.

```diff
-function partsOf(listing: Listing): Part[] {
+function partsOf(listing: Listing, t: Dictionary): Part[] {
   ...
-  push("rent", `Rent (${RENT_PERIOD_LABEL[rentPeriod].toLowerCase()})`, listing.priceMinor || undefined);
-  push("caution", "Caution deposit", listing.cautionDepositMinor);
+  push("rent", t.rentPeriod.rentLine.replace("{period}", rentPeriodInline(t, rentPeriod)), listing.priceMinor || undefined);
+  push("caution", t.rentPeriod.caution, listing.cautionDepositMinor);
   push(
     "service",
     listing.serviceChargePeriod
-      ? `Service charge (${RENT_PERIOD_LABEL[listing.serviceChargePeriod].toLowerCase()})`
-      : "Service charge",
+      ? t.rentPeriod.serviceChargeLine.replace("{period}", rentPeriodInline(t, listing.serviceChargePeriod))
+      : t.rentPeriod.serviceCharge,
     listing.serviceChargeMinor,
   );
-  push("agency", "Agency fee", listing.agencyFeeMinor);
-  push("legal", "Legal fee", listing.legalFeeMinor);
-  push("agreement", "Agreement fee", listing.agreementFeeMinor);
+  push("agency", t.rentPeriod.agency, listing.agencyFeeMinor);
+  push("legal", t.rentPeriod.legal, listing.legalFeeMinor);
+  push("agreement", t.rentPeriod.agreement, listing.agreementFeeMinor);
```

This is the point at which the fix must widen: four more keys
(`caution`, `agency`, `legal`, `agreement`) belong in the same namespace, or
F3 ships a ledger that is translated on line one and English on lines two to
six. R2 recommends adding all four in the same change.

---

**Site 5. `apps/web/src/app/(app)/rent/move-in/[listingId]/ledger-model.ts:54`,
and lines 58, 60, 65, 70, 71, 72 with it. Owner: F3** (`app/(app)/rent/**`
except `rent/pay/**`).

This function already takes `t` and `locale`, so it is the cheapest of the
eight and the one with the worst current output.

```diff
   push({
     key: "rent",
     icon: "home",
-    label: `${t.catalogue.card.rent} (1 ${period})`,
-    hint: `${formatMoney(listing.priceMinor, locale, listing.currency)} × 1 ${period}`,
+    label: t.rentPeriod.rentLine.replace("{period}", rentPeriodInline(t, period)),
+    hint: `${formatMoney(listing.priceMinor, locale, listing.currency)} × ${t.rentPeriod.one[period]}`,
     minor: listing.priceMinor,
   });
   push({
     key: "caution",
     icon: "verified",
-    label: "Caution deposit",
-    hint: "Held against damage, returned as agreed",
+    label: t.rentPeriod.caution,
+    hint: t.rentPeriod.cautionHint,
     minor: listing.cautionDepositMinor,
   });
   push({
     key: "service",
     icon: "bolt",
     label: listing.serviceChargePeriod
-      ? `Service charge (${RENT_PERIOD_LABEL[listing.serviceChargePeriod].toLowerCase()})`
-      : "Service charge",
-    hint: "Estate and building upkeep",
+      ? t.rentPeriod.serviceChargeLine.replace("{period}", rentPeriodInline(t, listing.serviceChargePeriod))
+      : t.rentPeriod.serviceCharge,
+    hint: t.rentPeriod.serviceChargeHint,
     minor: listing.serviceChargeMinor,
   });
```

`t.rentPeriod.one` is a fourth small map, `{ month: "1 month", quarter:
"1 quarter", year: "1 year" }`, because "1 year" is the arithmetic behind the
figure and the numeral's position is not universal either. The remaining three
pushes (`agency`, `legal`, `agreement`) take the same treatment with their
hints.

---

**Site 6. `apps/web/src/app/(app)/rent/pay/[inspectionId]/page.tsx:240`.
Owner: BB** (`app/(app)/rent/pay/**` is BB's new route; F3's scope explicitly
excludes it).

```diff
-            Rent is {RENT_PERIOD_LABEL[view.rentPeriod].toLowerCase()}, moving in from {view.moveIn}. Vallo
-            charges nothing on this payment; a card processor may show its own charge on the payment page.
+            {t.rentPeriod.rentIsPeriod.replace("{period}", rentPeriodInline(t, view.rentPeriod))},
+            {" "}{t.rentPeriod.movingInFrom.replace("{date}", view.moveIn)} {t.rentPeriod.noFeeNote}
```

The page is a server component and can call `getDictionary` directly. "Total to
pay" on line 232 is English on the same screen and should go in the same
change. Splitting one sentence into three keys is deliberate: a translator
given "Rent is {period}, moving in from {date}." cannot reorder the clauses,
and Yoruba and Hausa may want to.

---

**Site 7. `apps/web/src/app/(app)/wallet/transactions/[id]/paid-for.ts:98`.
Owner: E** (`app/(app)/wallet/**`).

Standalone form, a receipt field, so `label` rather than `inline`.

```diff
-        period: RENT_PERIOD_LABEL[charge.rent_period as RentPeriod] ?? null,
+        period: rentPeriodLabel(t, charge.rent_period as RentPeriod) ?? null,
```

This function does not currently receive `t`. It is server-side and its caller
resolves a session, so threading the dictionary in is a one-argument change,
not a refactor. Note the existing `?? null` is already dead, because a
`Record` lookup on a narrowed union cannot be undefined unless the column holds
something outside the union, which is the real risk; `asRentPeriod` should
guard it, as `pricing.ts` does at the other sites.

---

**Site 8. `apps/web/src/lib/bookings/queries.ts:393`. Owner: BB**
(`lib/bookings/queries.ts` is named in BB's scope).

```diff
-      periodLabel: RENT_PERIOD_LABEL[charge.rent_period],
+      periodLabel: rentPeriodLabel(t, charge.rent_period),
```

This function already takes `locale` (it calls `formatMoney(..., locale, ...)`
three lines down), so it can call `getDictionary(locale)` itself and needs no
signature change at all. It is the cheapest of the eight. The value is consumed
by `components/app/bookings/TenancyCard.tsx:93` as
`copy.period.replace("{period}", tenancy.periodLabel)`, which is already the
right pattern, so nothing downstream moves.

---

**The ripple, named so it is not a surprise.** Making `moveInParts` take `t`
touches three more callers, none of which renders a label to a person:
`lib/admin/queries.ts:917`, `lib/rent/ledger.ts:45`, and `pricing.ts:268`
(`moveInTotal`). `lib/admin/queries.ts` is unscoped console code and
`lib/rent/**` is BB's. If `moveInTotal` is split from `moveInParts` first, as
recommended above, only two of the three move.

### 2.4 Ownership summary

| Site | Path | Owner |
| --- | --- | --- |
| 1, 2 | `lib/listings/pricing.ts:239,244` (and the constant at 177) | LEAD |
| 3, 4 | `components/app/listing/ListingMoveIn.tsx:60,65` | F3 |
| 5 | `app/(app)/rent/move-in/[listingId]/ledger-model.ts:54` (+58,60,65,70) | F3 |
| 6 | `app/(app)/rent/pay/[inspectionId]/page.tsx:240` (+232) | BB |
| 7 | `app/(app)/wallet/transactions/[id]/paid-for.ts:98` | E |
| 8 | `lib/bookings/queries.ts:393` | BB |
| keys | `packages/i18n/src/locales/{en,ha,ig,yo}.ts` | LEAD (structure), and a Yoruba, Hausa and Igbo speaker for the values |

Four workers. Ledger 11.8's judgement stands: this needs ONE owner holding all
of it at once, and it should not be started across live edits. What has changed
since 11.8 was written is that the scope is now measured rather than estimated,
and it is bigger: eighteen strings and two signature changes, not eight call
sites.

---

## 3. JOB 3: the `/delete-account` footer link

**Already landed. Not by R2, and R2 will not claim it.**

The link is in the tree at `apps/web/src/components/site/SiteFooter.tsx:196`,
committed in `7914721`, in the legal line beside Terms and Privacy:

```tsx
<Link href="/delete-account" className="nf-site-footer-link">
  {f.deleteAccount}
</Link>
```

It matches the surrounding markup exactly (`Link`, the same
`nf-site-footer-link` class, the same `<p className="nf-caption flex flex-wrap
gap-group">` row as Terms and Privacy) and it uses the dictionary rather than a
hardcoded string, as its neighbours do: `f.deleteAccount` resolves to
`landing.face.footer.deleteAccount`, added at `en.ts:847` as "Delete account"
with a comment naming the Play requirement. British spelling throughout. There
was nothing for R2 to add.

**One gap R2 did find, and did not fix.** `deleteAccount` exists in that
namespace in `en.ts` ONLY. The occurrences at `ha.ts:959`, `ig.ts:957` and
`yo.ts:954` are a DIFFERENT key, `settings...deleteAccount` ("Delete my
account"), not the footer's. So `withFallback` serves a Hausa, Igbo or Yoruba
reader the English words "Delete account" in the footer. The page is reachable,
which is what Play asks, so this is not a compliance failure; it is one missing
string in three files. It is an ADD inside F2's `landing.face.footer` namespace
and therefore F2's to make, three lines, with a speaker for the values.

The render proof is recorded in section 6.

---

## 4. JOB 4: the verified badge has two derivations, and they will disagree on
the first agent we approve

**This is the loud one.** Rule 12 says the verified badge only ever means a
human was checked. One of the two derivations below does not mean that.

### 4.1 Derivation A: the KYC ladder. This one is right.

```
agent_verification_checks   one row per rung, per agent, each a named
  (identity, address,       member of staff's recorded decision
   payout, in_person)
        |  trigger private.sync_agent_verification_tier
        v
agents.verification_tier    private.agent_tier(): rungs passed with no gap
        |                   below them, 0 to 4, never written by hand
        |  trigger private.sync_agent_badge
        v
agent_badges.verified       := verification_tier >= 1
```

`private.sync_agent_badge`, read from the live database today:

```sql
is_verified := coalesce(new.verification_tier, 0) >= 1;
```

So A means exactly one thing: **a person here looked at a government document
and said yes.** That is rule 12, stated in SQL.

**Who reads A:** every listing surface, through
`getAgentBadges()` in `lib/listings/supabase-repository.ts:863`
(`verified: !row.is_demo && verifiedAgents.has(row.agent_id)`, line 826), and
every stays and restaurant surface, through the `catalogue_entries.verified`
projection, which m09 computes as
`coalesce((select ab.verified from public.agent_badges ab where ab.agent_id = l.agent_id), false)`
at three separate sites and keeps current with the `agent_badges_catalogue_sync`
trigger. Also the agent's own dashboard, through
`lib/agent/kyc-standing.ts:58` (`if (ladder.ladder.tier >= 1) return { state:
"verified" }`), and `/agent/verification`, through `TIER_NAME[tier]`.

### 4.2 Derivation B: a hand-set boolean. This one is wrong.

`agents.verified` is a plain column. The ladder migration decoupled it on
purpose and said so, at
`supabase/migrations/20260805095946_an_agent_climbs_a_verification_ladder.sql:20`:

> `agents.verified` is untouched. The two mean different things and coupling
> them would quietly redefine the verified badge.

That reasoning was sound for what `agents.verified` meant at the time, which the
same file's opening paragraph states: "the first-party inventory mark", meaning
only "this listing is ours". **It is no longer used that way.** It is used as a
person-level trust mark on three surfaces.

**Who reads B:**

1. `lib/messages/live.ts:128,136` reads `agents.verified` through the service
   role and carries it as `counterpartVerified` into the inbox
   (`live.ts:238`) and into the thread (`live.ts:465`, filed under
   `listing.verified`). `components/messages/VerifiedAvatar.tsx` draws the tick
   from it, and its own docstring states the source plainly: "WHERE THE TRUTH
   COMES FROM. `agents.verified`, resolved in `lib/messages/live.ts`". Two
   components in this repo each carry a long comment asserting they hold the
   truth about the badge, and they read two different columns.
2. `private.award_agent_badges()`, the trigger on `public.agents`, awards the
   social profile badge `verified_agent` off it:
   ```sql
   if new.status <> 'APPROVED' or not new.verified then return new; end if;
   perform private.award_badge(new.user_id, 'verified_agent',
     'Identity and payout account verified, application approved.', ...);
   ```
   That caption asserts an identity check AND a payout check. Both are ladder
   rungs. Neither has been looked at.
3. `app/(app)/messages/[id]/cards.ts:76` passes it to the chat listing chip, so
   a PERSON's badge is drawn on a LISTING card. A comment at
   `app/(app)/messages/[id]/page.tsx:155` already flags this as a misleading
   home for the field and asks the lead for a rename.

### 4.3 The write that makes them disagree, and it is on the happy path

`apps/web/src/lib/admin/actions.ts:300`, in the agent application approval:

```ts
await admin.from("agents").upsert(
  { user_id: application.user_id, application_id: application.id,
    display_name: application.full_name ?? "Vallo agent",
    type: application.type, status: "APPROVED",
    verified: true },                      // <-- here
  { onConflict: "user_id", ignoreDuplicates: true },
);
```

`verified: true` at approval. `verification_tier` is 0 at that moment, because
no rung row exists yet. The notification sent on the next line is titled **"You
are a verified Vallo agent"**.

**So, for every agent this platform approves, from the instant of approval:**

| Where they look | What it says | Which derivation |
| --- | --- | --- |
| Their listings, search results, listing page | **no badge** | A, tier 0 |
| Stays and restaurant cards behind them | **no badge** | A, via `catalogue_entries` |
| Their own agent dashboard | **"you have not started"** (`getKycStanding` returns `none`) | A |
| `/agent/verification` | **Tier 0, "Approved"** | A |
| Any message thread with them, inbox and thread view | **verified tick on their avatar** | B |
| Their social profile | **badge: "Identity and payout account verified"** | B |
| The approval notification | **"You are a verified Vallo agent"** | B |

A person deciding whether to send a deposit to a stranger opens the thread,
sees the tick, and opens the listing, and the tick is gone. That is the exact
shape of thing that destroys trust in a marketplace, and it is worse than
having no badge at all because the reader cannot tell which screen is lying.

**It is not visible today, and R2 will not overstate it.** Queried live,
read-only, aggregates only: 1 agent row, 0 with `verified = true`, 0 with
`agent_badges.verified = true`, 0 disagreements, 0 with the boolean true at
tier 0. The fault is on the approval path, and no application has been approved
through it in this database. It fires on the first one.

### 4.4 Which is right, and how to collapse them

**A is right.** It is rule 12 in SQL, it is what the founder's trust rule says
the badge means, and it is what `/standards` publishes to the public as the
meaning of each rung. B is a column whose original meaning was "first-party
inventory" and which drifted into being a person's trust mark without anybody
changing what writes it.

There is also a decided precedent in this repo, and it went the other way from
the agents table. M15, seven weeks later, built the business ladder and coupled
the two deliberately, at
`supabase/migrations/20260918120500_m15_a_business_climbs_a_verification_ladder.sql:77`:

```sql
alter table public.businesses
  add constraint businesses_verified_means_identity_chk
  check (verified = false or verification_tier >= 1);
```

with `businesses.verified` commented as "Derived by trigger". Businesses cannot
have this bug. Agents can, only because the agents table is older.

**The recommendation, in four steps, smallest blast radius first. Steps 3 and 4
are migrations and belong to the lead; R2 applied none of them.**

**Step 1, the one-line stop, and it should happen first because it is the write
that causes the fault.** Remove `verified: true` from the approval upsert in
`lib/admin/actions.ts:300`, and change the notification title from "You are a
verified Vallo agent" to one that says what actually happened, that the
application was approved and Agent Mode is open. Approval is not verification;
the body text on the next line already says the right thing. Owner: unscoped
`lib/admin/**`, effectively the lead. This alone removes the contradiction for
every future agent.

**Step 2, point B's readers at A.** `lib/messages/live.ts:128` should read the
published projection rather than the raw column:

```diff
-      admin.from("agents").select("user_id, display_name, verified").in("user_id", ids),
+      admin
+        .from("agents")
+        .select("user_id, display_name, id, agent_badges(verified)")
+        .in("user_id", ids),
```

and `live.ts:136` takes `verified: a.agent_badges?.verified ?? false`, with the
missing-row case reading as false for the same reason `getAgentBadges()` gives:
the failure mode must be a tick that does not appear, never a tick that appears
without a check behind it. `VerifiedAvatar.tsx`'s docstring must be corrected in
the same change, because it currently documents the wrong source and the next
reader will believe it. Owner: `lib/messages/**` is unscoped, `components/
messages/VerifiedAvatar.tsx` was being edited in the working tree while this
was written, so this needs coordination with F5 rather than a drive-by edit.

**Step 3, a migration, lead only.** Repoint `private.award_agent_badges()` at
the tier so the social profile badge cannot outrun the ladder either:

```diff
-  if new.status <> 'APPROVED' or not new.verified then return new; end if;
+  if new.status <> 'APPROVED' or coalesce(new.verification_tier, 0) < 1 then
+    return new;
+  end if;
```

and correct the badge's caption, because "Identity and payout account verified"
claims two rungs where tier 1 proves one. "Identity checked by a person at
Vallo" is what tier 1 actually means, in the ladder's own words at
`lib/trust/verification.ts:41`. The trigger must also move from `after insert
or update on public.agents` to fire on `verification_tier` changing, or a tier
climb will not award the badge at all.

**Step 4, a migration, lead only, and the one that makes it impossible to come
back.** Give the agents table the constraint the businesses table already has:

```sql
alter table public.agents
  add constraint agents_verified_means_identity_chk
  check (verified = false or verification_tier >= 1);
```

This is not on the stop list's revoke or data-loss ground: it removes nothing
and drops no column. It will, however, **fail to apply if any agent row is
currently `verified = true` at tier 0**, which is the point of it. Zero rows in
this database are in that state today, so it applies clean now and will not in
a month. That is an argument for doing it soon.

**Step 5, optional and larger.** Once `agents.verified` can only be true at
tier 1 or above it is a slower copy of `agent_badges.verified` and should be
dropped, leaving one published fact. That IS a data-losing migration and it is
on the stop list, so it is named here and goes no further without the founder's
word.

### 4.5 What R2 deliberately did not do

R2 did not touch `lib/admin/actions.ts`, `lib/messages/live.ts`,
`components/messages/VerifiedAvatar.tsx` or any migration. Step 1 is a
two-line change and R2 could have made it, but it changes what an approval
means on a money product and it changes a notification a person receives, and
the brief for R2 was to establish which derivation is right and write the
collapse, not to redefine approval unilaterally while five workers sweep the
surfaces. It should be the lead's first pick-up from this file.

---

## 5. What R2 skipped, unprompted

- **Every locale string fix in section 1.3.** Ledger section 2 allows a worker
  to ADD keys to `packages/i18n/src/locales/*.ts` inside its own namespace, and
  nothing more. All four are edits or deletions in other workers' namespaces,
  in the file that has already cost this build one collision.
- **The whole of JOB 2.** By design: the brief said hand over the patch, not
  apply it.
- **Every step of JOB 4.** Reasons in 4.5.
- **The `invest` to `forSale` rename** in section 1.2. No reader is affected
  and it spans F1 and the lead.
- **The three missing footer `deleteAccount` strings** in section 3. F2's
  namespace, and the values need a speaker.
- **`npx vitest run`, full.** Not run, on instruction: under this load a full
  run produces false reds, and ledger 11.7 is the record of that happening.
  R2 changed no source file, so there was no scoped file to run it against.
- **`node scripts/check-css-tokens.mjs`.** Not run. R2 wrote no CSS.

---

## 6. The proof for section 3, from a production server

`next dev` does not hydrate reliably on this box, so the proof is a production
build and a production server. The build went through the shared lock, because
four workers build at once on four cores and an unlocked build risks an
out-of-memory kill that costs somebody their work.

```
flock .../scratchpad/nextbuild.lock -c 'cd /home/user/read-it-well/apps/web \
  && NEXT_DIST_DIR=.next-r2 npx next build'
    -> exit 0

fuser -k 3168/tcp
cd /home/user/read-it-well/apps/web && NEXT_DIST_DIR=.next-r2 npx next start -p 3168
    -> Next.js 16.2.12, Ready in 123ms
```

The link, as server-rendered HTML, not as a client-side render:

```
curl -s http://127.0.0.1:3168/ | grep -o '<a[^>]*href="/delete-account"[^>]*>[^<]*</a>'
<a class="nf-site-footer-link" href="/delete-account">Delete account</a>
```

Present on every site route carrying the footer, and the target answers:

| Route | HTTP | Footer link anchors |
| --- | --- | --- |
| `/` | 200 | 1 |
| `/privacy` | 200 | 1 |
| `/terms` | 200 | 1 |
| `/about` | 200 | 1 |
| `/help` | 200 | 1 |
| `/delete-account` | 200 | `<title>Delete your account | Vallo</title>`, `<h1>Delete your account</h1>` |

The legal line renders in the order Terms, Privacy, Delete account, all three
with the same `nf-site-footer-link` class, beside the copyright carrying
VALLO SPACES LTD, which rule 14 allows on a legal surface and this is one.

**Google Play's requirement is met on this build:** the deletion page is
publicly reachable, linked from the footer of every public page, with no sign
in in front of it.
