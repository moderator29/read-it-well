# Session 3's round, worked through in detail

**6 October 2026. Session 1, in answer to Session 3's status report and the founder's
instruction to take that report as the flow and make it detailed, clean and properly
joined to the product.**

This goes item by item through what Session 3 reported. The three decisions are in D60 and
are not re-argued here. What follows is the detail each item needs in order to be finished
rather than merely working, plus one correction that is Session 1's own.

---

## 1. The fee acceptance screen, and a number that is wrong because Session 1 wrote it wrong

Session 3 built the screen from `docs/payments/VALLO_PRICING.md` and used its sentence
verbatim: **"you keep 96 percent instead of 90: 108,000 naira more on 1,800,000"**. The
arithmetic is right. 1,800,000 times six percent is 108,000.

**The claim is still wrong, and the fault is in the pricing document, not in Session 3's
screen.** The same document says, forty lines later:

| Rail | Total fee | The lister keeps |
|---|---|---|
| **Escrow** (Payluk 2 percent + Vallo 2 percent) | **4 percent** | **96 percent** |
| **Direct** (Vallo 2 percent + a capped Paystack fee) | **2 percent** plus a capped fee | **about 98 percent** |

**So 96 percent is true on one rail and understates the other.** Session 1 wrote a single
flat figure into a document that elsewhere distinguishes the rails, and that figure has now
reached a screen a lister must accept before publishing. Understating is the safe direction,
since nobody is charged more than they agreed, but it is still a wrong number in an agreement
and it undersells the rail with the better margin.

**Worse, the rail is not knowable at the moment of acceptance.** The lister accepts before
publishing; the rail is chosen per booking, later, by the buyer's payment route. **A single
percentage cannot be correct on that screen.**

### What the screen says instead

Show the fee the lister will actually bear, as a range anchored on the worst case, with the
naira figures that D51's agreement gate already requires:

```
Rent you set                          1,800,000

Platform fee                     36,000 to 72,000
  Vallo, 2%                           36,000
  Escrow protection, 2%
  when a buyer pays into escrow       36,000

You receive                   1,728,000 to 1,764,000
```

Three rules follow:

1. **The worst case is the headline.** "You receive 1,728,000" is what the lister should
   remember. If a booking lands on the direct rail they receive more, and a pleasant surprise
   is the only acceptable direction for a money figure to move.
2. **Name what the second two percent buys.** It is not Vallo's; it is the escrow protection,
   and it only applies when a buyer chooses to pay into escrow. A lister who understands that
   stops reading it as a Vallo markup.
3. **No single "you keep N percent" headline.** Percentages invite the comparison; the naira
   figure is what the person actually experiences.

### The comparison claim needs dating and softening

**"Instead of 90" is an assertion about what other people charge.** Ten percent is a fair
description of the typical Nigerian agency fee, so the claim is broadly defensible, but on a
screen that forms part of an agreement it must be framed as a **typical market rate, with the
date it was true**, and never attributed to a named competitor. If an agent charges eight
percent, Vallo's screen is false and Vallo put it in writing.

**Better still, lead with Vallo's own number and let the comparison be secondary.** The real
advantage is not that the percentage is smaller; it is that the money is protected, the
tenancy is documented and the person on the other side is verified. Competing on price alone
invites a race Vallo cannot win against someone willing to charge nothing.

### The acceptance record is a legal artifact, not a checkbox

Session 2 builds it, and it must store, on the row, at the moment of acceptance:

- **Both rates as numbers**, not a reference to the live `fee_rates` row. D51 already requires
  this for referrals and the reasoning is identical: a rate change must never retroactively
  alter what somebody agreed to.
- **The terms version** accepted.
- **The exact figures shown**, including the rent the lister had entered, so the record can
  reproduce the screen.
- **The timestamp and the actor.**

And the rule D51 already set: **a lister keeps the rate they accepted until they accept a new
one.** So a rate change does not silently apply. It re-prompts, and until it is accepted the
old rate stands. **That makes the acceptance record versioned by necessity**, and it is the
difference between a fee change and a fee imposed.

### Wiring, per D60

Connect it to the wizard now; gate **only the blocking behaviour** on a `feature_flags` row
that is off. The screen becomes reachable, reviewable and testable immediately, publishing is
never blocked, and the day Session 2's rate and acceptance record exist, one flag flips.

---

## 2. Auth: no restructure, and here is where the remaining work actually is

D60 decided this: Session 3's reading of D28 is correct and no structural redesign is
assigned. **Auth is where a product loses people, so restructuring it is high risk for low
reward.** What C4 did (one error style, the same code boxes, rebuilt error and loading
screens) is the right work.

**"Consistent" is not "finished", and the founder's "real redesign" was about how it feels,
not how it is arranged.** The gap, concretely:

- **The first 400 milliseconds.** Sign-in is often the first Vallo screen a person ever sees.
  Nothing should pop, reflow or appear late. Measure it rather than eyeball it.
- **The code boxes.** Focus movement, paste of a six digit code in one action, the state when
  one digit is wrong rather than all six, and what a screen reader announces at each step.
  These are the details that make an auth screen feel engineered.
- **Motion with a purpose.** Not decoration: the transition between email and code should
  carry the sense of one continuous step, so the person does not feel restarted.
- **The error that says what to do.** Not "invalid credentials". What went wrong, and the
  single next action.
- **The type scale and spacing against the reference images.** This is the premium feel the
  founder asked for, and it lives in restraint rather than in effects.

---

## 3. The weight diet: the 20 percent target is the wrong target

Minus 11 percent so far, sign-in down 17.5 and `/check` down 25. Good progress, and the third
pass (member-only styles out of the stylesheet every page loads) is the right lever.

**But a percentage off a bundle is a proxy, and the thing it is a proxy for should be measured
directly.** Vallo's members are in Nigeria, frequently on a mid-range Android on a congested
mobile network, often paying for data by the megabyte. **The target that matters is time to
interactive on the front door and on sign-in, on a throttled connection, on a mid-range
device.** A 20 percent smaller bundle that still takes nine seconds to become usable has not
solved the problem it was set to solve.

So: keep the 20 percent as a tracking number, and add the real one. Put both in CI if the
front-door job can carry it, since a budget nobody enforces drifts back within a month.

**Also confirm D49 landed.** That directive found D39's LazyMotion wrapper costing 31 KB per
route. If it is still in the tree, removing it is a large share of the remaining nine points
on its own, and it would be worth knowing that before a fourth pass hunts for smaller wins.

---

## 4. Promotion: unblocked, and it was never removed

See D60 and **`docs/promotion/VALLO_PROMOTION.md`**. D3 built paid promotion on 5 October and
superseded the no-paid-placement doctrine Session 3 was reading. The four tiers now have
duration, placement, exposure, audience, analytics, price and limitations, and the onboarding
has its four screens specified, including the two sentences that have to appear on the first
one: **promotion does not change where a listing ranks, and it does not buy a verification
badge.**

The money path needs nothing new. Promotion is Vallo's own revenue, posting to
`ledger_vallo_revenue`, a single-party charge with no split, no subaccount and no escrow.
**It must not be built by copying the booking flow.**

---

## 5. The bugs the sweep found: two of them deserve probes, not just fixes

Session 3 listed these almost in passing. **Two are more serious than the list implies**, and
a fix without a test is a fix with an expiry date.

**"Paid in total" on an unpaid tenancy, in the complaint pack.** This is the most serious item
in the report. A complaint pack is a document a member may hand to a landlord, an agent or a
tribunal. **Vallo generated a document that misstated whether money had been paid.** The fix
is necessary and not sufficient: this needs a test that renders a complaint pack for an unpaid,
part-paid and fully-paid tenancy and asserts the wording for each. Anything Vallo generates
that a person may rely on as evidence gets that treatment.

**False verified ticks and shields.** A badge that appears without being earned is the one bug
that damages the thing Vallo is selling. It also converges with promotion guardrail 5, "the
badge is never for sale": **one test can cover both** by asserting that a badge renders only
from an earned verification record, and that a promoted listing's badges are byte-identical to
what it would show unpromoted. Write it once, in the trust area, and have the promotion work
depend on it.

The other three are real and properly fixed. **The sideways scroll wants a regression guard**,
because horizontal overflow returns every time a wide element is added, and catching it in CI
at a phone width costs almost nothing. The admin lookup rejecting real listing codes and the
sign-in links losing the person's place are both the kind of thing that only shows up when
somebody actually walks the path, which is the argument for the sweep continuing.

---

## 6. The i18n move: hundreds of strings is where silent breakage hides

Moving hundreds of English-only strings into the translation files is substantial and
overdue work. **Three failure modes come with a move of that size, and none of them show up as
a failing test unless somebody looks for them:**

1. **Interpolation lost.** A string that had a naira amount or a name spliced into it, now
   rendering the placeholder literally or dropping it.
2. **Pluralisation flattened.** "1 night" and "3 nights" collapsed into one form, which reads
   as broken English to everybody and is unfixable in languages with more plural forms.
3. **A missing key falling back silently** to the key name or to an empty string, so a screen
   renders with a blank where a sentence should be.

The existing `slice-coverage.test.ts` is the right place to extend. **Assert that every key
referenced in code exists in the English locale, that no locale value is empty, and that any
string containing a placeholder in English contains the same placeholders in every locale.**
That is three assertions and it closes all three failure modes.

---

## 7. What the four running jobs should include

- **C6, the weight pass.** Add the device-and-network measurement from section 3, and settle
  whether D49's LazyMotion removal actually landed before hunting smaller wins.
- **C8, the two accessibility findings.** The old blue on selected controls is a token
  problem, so fix it at the token and let `no-raw-colour` keep it fixed. Recent searches
  unreachable by keyboard is the more serious of the two: a control that exists only to a
  mouse does not exist on a phone with a keyboard or to anyone using a screen reader.
- **C9, the remaining shared English labels.** Apply section 6's three assertions as part of
  this, not after it.
- **A9, the independent audit.** **Audit the fixes as well as the features.** The five bugs in
  section 5 were found by this round; an audit that only reads new features will not notice
  that one of them was fixed in a way that holds only for the case that was reported. Include
  the complaint pack wording and the badge rendering explicitly.

---

## What is Session 3's, in order

1. Wire the fee screen with its blocking behaviour behind the flag, and **correct the figures
   to the range in section 1**. The current single percentage should not reach a lister.
2. The promotion onboarding, from `docs/promotion/VALLO_PROMOTION.md`.
3. Finish C6, C8, C9 as above.
4. The three i18n assertions in section 6.
5. The regression guard for horizontal overflow, and the two tests in section 5 jointly with
   whoever owns trust.

**Nothing here asks for a restructure, and nothing here is blocked on another session**, with
the single exception of the fee screen's live behaviour, which is exactly what the flag is for.
