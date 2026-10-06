# Paid promotion: the four tiers, in detail

**Status: specification, 6 October 2026. Written by Session 1. Built by Session 2 (schema,
pricing, measurement, the labelled-slot architecture) and Session 3 (every surface, the
onboarding, the analytics screens).**

**This document exists because the decision was made and the product was not.** D3 settled
on 5 October that paid promotion is built, and superseded migration V-06 along with the
no-paid-placement doctrine in `PRODUCT.md` and `THE_HUNDRED`. The feature register carries
F2 (the four tiers), F3 (seven per-tier attributes) and F4 (ten metrics). **What nobody ever
wrote down is what Boost actually gives a lister that Spotlight does not.** Without that,
Session 3 cannot write an onboarding and Session 2 cannot price a row, which is exactly
where both stalled.

## The guardrails, restated because they constrain every table below

From D3, which takes them from Master Prompt sections 25 and 26. These are not negotiable
and no tier may be designed around them:

1. **Promoted placement is separate, clearly labelled inventory.** A paid listing occupies a
   marked slot. **It can never reorder organic results.**
2. **The organic ranking formula stays untouched and published**, and `ranking.test.ts` keeps
   asserting that no paid input reaches it. **Visibility is sold; rank is not.**
3. **Never imply guaranteed leads. Never manufacture numbers.**
4. **Tier names say what you get.** Not Gold, Silver, Platinum.
5. **The badge is never for sale.** Promotion buys attention, never trust. A promoted
   listing carries no verification it has not earned.

**One naming problem, flagged rather than quietly kept.** Boost, Spotlight and Featured each
describe a placement. **"Prime" does not**, and it is the one name in the set that breaks
guardrail 4: it says "better tier", which is Gold and Platinum wearing a different hat. The
recommendation is **"Everywhere"**, which is literally what it buys. The founder's call, and
the work is not blocked on it: Session 2 should key the tier on a slug like `prime` and keep
the display name in the locale file, so renaming it later is a one line change.

---

## The four tiers

Prices are **proposals, built to the value so nothing is blocked**, in the pattern D38 set
for the Paystack subaccount. They are the founder's to confirm, and `fee_rates` style
effective dating means changing one is a row, not a deploy.

### Boost: your listing in a marked slot in its own area

| Attribute | Value |
|---|---|
| **Duration** | 7 days |
| **Placement** | One marked slot on the area page and in search results filtered to that area |
| **Exposure** | Area-level. Nothing on the front door |
| **Audience** | People already looking in that area |
| **Analytics** | Impressions, views, unique viewers, saves, inquiries |
| **Price** | **2,500 naira** |
| **Limitations** | One active Boost per listing. No front door. No carousel |

**Who it is for:** a lister with one property and a tight budget who wants a week of extra
attention in the place their property actually is. It is the tier that must be cheap enough
to try on a whim, because it is the one that teaches people the product exists.

### Spotlight: a labelled carousel across the area and its searches

| Attribute | Value |
|---|---|
| **Duration** | 14 days |
| **Placement** | A labelled "Promoted" carousel at the top of the area page and of matching searches, plus the Boost slot |
| **Exposure** | Area-level, repeated. Appears on every matching search rather than once |
| **Audience** | Everyone searching that area or its neighbours |
| **Analytics** | Boost's five, plus shares, contacts and a per-day curve |
| **Price** | **7,500 naira** |
| **Limitations** | Up to six listings share the carousel, rotated evenly. No front door |

**Who it is for:** an agent with a property that is good but not obvious, who needs
repetition rather than a single slot.

### Featured: the front door, and the whole city

| Attribute | Value |
|---|---|
| **Duration** | 30 days |
| **Placement** | A labelled slot on the front door, the city page, the area page, and matching searches |
| **Exposure** | City-level, including people who have not chosen an area yet |
| **Audience** | Everyone, including first-time visitors |
| **Analytics** | All ten metrics, with the organic versus promoted comparison where it is statistically valid |
| **Price** | **20,000 naira** |
| **Limitations** | A fixed number of front door slots per city per day, sold first come. Never oversold |

**Who it is for:** a property that needs to be seen by people who were not looking for it.
The front door slot count must be **published to the buyer before they pay**, because a
promise of exposure that cannot be delivered is guardrail 3.

### Prime, proposed rename "Everywhere": every surface, plus the operator tools

| Attribute | Value |
|---|---|
| **Duration** | 30 days |
| **Placement** | Everything Featured buys, plus the saved-search digest, the area digest email, and a marked slot in the map view |
| **Exposure** | Platform-wide, including people who are not currently searching |
| **Audience** | Everyone, plus re-engagement of people who looked and left |
| **Analytics** | All ten metrics, the organic comparison, a viewer-quality breakdown, and export |
| **Price** | **50,000 naira** |
| **Limitations** | Two per city per day. Requires a listing that already passes review with photos and a complete inspection record |

**Who it is for:** high-value property and professional agents. The entry condition is
deliberate: **the most expensive tier must not be the way a weak listing buys its way into
the front door.** That condition is also the honest answer to anyone who thinks promotion
and verification are the same thing.

---

## What promotion must never do, as testable statements

Session 2 writes each of these as a probe or a unit test. **The architecture is only as good
as the test that stops it drifting.**

1. No promotion field, flag, tier or spend appears anywhere in the organic ranking input.
   `ranking.test.ts` already asserts this and must keep passing unchanged.
2. Every promoted slot is rendered from a separate query against separate inventory, never
   by reordering, reweighting or injecting into the organic result set.
3. Every promoted slot carries a visible label in the member's own language. A promoted
   listing that renders without its label is a bug of the same severity as a wrong price.
4. A promoted listing's badges, verification state and trust signals are byte-identical to
   what it would show unpromoted.
5. Front door and map slot counts cannot be oversold: the sale refuses when the day is full,
   with a named reason and the next available date.
6. No metric is ever estimated, modelled, extrapolated or rounded up. A metric with no data
   shows as no data, never as zero dressed up as a result.
7. A promotion that is refunded or cancelled stops appearing in the same transaction that
   records the refund.

---

## The measurement surface, and the sentence it must never say

All ten metrics from F4: impressions, views, unique viewers, saves, shares, inquiries,
contacts, viewings, bookings, transactions. **Organic versus promoted comparison only where
it is statistically valid**, and where it is not, the screen says so in plain words rather
than showing a comparison nobody should trust.

**The screen never says, in any wording: "this will get you X leads".** Not as a projection,
not as an average, not as "listings like yours typically". That is guardrail 3 and it is the
line between selling advertising and selling a promise Vallo cannot keep.

**What it may say:** what this listing actually got, what the same listing got before it was
promoted, and what the median promoted listing in this area got, each labelled as history.

---

## Where the money goes

Promotion is **Vallo's own revenue**, not customer funds and not escrow. It settles to
Vallo's Paystack account directly and posts to **`ledger_vallo_revenue`**, which Session 2's
b2_ledger migration already created for exactly this: D51 names the revenue pot as
"commission, withdrawal fees, promotion".

**So the ledger is ready and no new money plumbing is needed.** A promotion purchase is a
single-party charge: no split, no subaccount, no escrow, no provider holding anything. It is
the simplest money path on the platform and should be built as such rather than borrowed
from the booking flow.

VAT: **zero and unregistered**, per D51, same as every other Vallo fee, until registration.

---

## The onboarding Session 3 was blocked on

Now buildable. Four screens, and the honest framing is the whole point:

1. **What promotion is, and what it is not.** It buys attention in marked slots. **It does
   not change where your listing ranks, and it does not buy a verification badge.** Say both
   of those on the first screen, not in a footnote. A lister who learns the limit later feels
   cheated; one who learns it first trusts the rest.
2. **The four tiers side by side**, with the naira price, the duration, and the one sentence
   on who each is for. Not a feature matrix with ticks: the table above reads as prose for a
   reason.
3. **What you will be able to measure**, with a real example from a real listing, and the
   plain statement that Vallo will never estimate a number it does not have.
4. **Pick, pay, and what happens next**, including when it starts, when it ends, and what
   happens if it is refunded.

**Do not write a fifth screen explaining why promotion is good value.** The tiers either
justify themselves on screen two or the pricing is wrong.
