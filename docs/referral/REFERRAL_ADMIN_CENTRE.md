# The referral admin centre

**Status: specification, 6 October 2026. Written by Session 1. Built by Session 2 (the
engine, the detection, the money) and Session 3 (the console surfaces).**

The founder's instruction, verbatim: *"admin panel for referral need to be detailed
clean big that covers and help us detect more dangers too"*.

This document is the detail. It assumes D51's economics, which are settled and are not
reopened here: **70 naira per qualified referral**, **1,500 qualified referrals per
member per month**, **1,000 naira minimum payout**, phone verification plus a real
action for qualification, a Rewards Balance that is a liability and never a wallet, and
payouts by Paystack transfer from Vallo's own marketing float.

**What exists today, measured rather than assumed.** One migration,
`20260930084741_a5_invite_codes_a_member_can_share.sql`: a `referral_codes` table with
a six character code per member, a select-own policy, `my_referral_code()`,
`referral_door(text)` for the public landing, and `admin_referral_counts(int)`. **That
is the whole of it.** There is no attribution record, no qualification, no balance, no
payout, no detection and no console. Everything below is new work, and nothing below
conflicts with what is there.

---

## 1. Why this needs a centre rather than a page

At the ceiling, one member can earn **105,000 naira a month**. A thousand members at
the ceiling is **105 million naira a month**. Referral programmes do not get
defrauded gradually; they get defrauded the week somebody works out the cheapest
qualifying action and writes a script. The centre exists so that the week it happens,
somebody at Vallo sees it inside an hour rather than at the end of the month when the
float is empty.

**The design rule for every screen below: show the money and the risk in the same
view.** A referral console that shows counts without naira teaches whoever reads it to
think in counts, and the fraud is denominated in naira.

---

## 2. The data model

Five new objects. Names deliberately avoid `wallet`, `pot` and `escrow` as whole words,
because `private.refuse_custody_objects` refuses any new object so named (ADR-0002) and
would reject the migration outright.

### 2.1 `referral_attributions`

One row per referred person, created the moment a code is used. **This is the spine:
every number in the centre is an aggregate over this table.**

| Column | Why it exists |
|---|---|
| `referrer_id`, `referred_id` | The pair. `unique (referred_id)`, because a person is referred once and for all |
| `code` | The code actually used, kept even if the referrer later rotates it |
| `state` | `pending`, `qualified`, `rejected`, `reversed`. The state machine in section 3 |
| `qualified_at`, `qualifying_action` | Null until qualification. The action is named, not a boolean, so a later audit can ask which action was being farmed |
| `amount_minor`, `rate_bps_or_flat` | **The rate at the moment of qualification, stored on the row.** Never read live. D51 already requires this for pricing; it matters more here, because a rate change must never retroactively alter an accrued liability |
| `signup_ip_hash`, `signup_device_hash` | Hashed, never raw. Feeds the risk graph in section 5. A raw IP is personal data with a retention obligation and no extra detection value |
| `risk_score`, `risk_reasons` | Written by the scorer, an integer and an array of codes. **Never free text**: free text cannot be aggregated, and the first thing anyone asks is "how many flagged for this reason" |
| `reviewed_by`, `reviewed_at`, `review_note` | Who decided, when. Null for everything the machine passed |

Append-mostly: `state` and the review columns may change, nothing else. Enforce with a
trigger, not a convention.

### 2.2 `referral_balances`

One row per referrer. `accrued_minor`, `paid_minor`, `reversed_minor`,
`available_minor` as a generated column. **Never a sum computed in the application**, so
two screens can never disagree about what Vallo owes.

The invariant worth a probe of its own: `available_minor` equals the sum of qualified
attributions minus paid minus reversed, for every member, always.

### 2.3 `referral_payouts`

One row per transfer attempt. Paystack transfer reference, status, the fee, the failure
reason, and the bank account it went to **as it was at the time**, denormalised. A
payout record that reads today's bank account cannot answer "where did that money
actually go" after the member edits their details, which is the exact question asked in
a dispute.

### 2.4 `referral_budget_periods`

One row per calendar month: `cap_minor`, `committed_minor`, `paid_minor`, and a
`frozen` flag. **D51's platform-wide cap, server-side and visible.** Qualification
checks it and refuses past the cap with a named reason rather than silently.

### 2.5 `referral_campaigns`

Named periods with their own rate, their own caps, and their own qualifying actions, so
that a push can be run and measured without editing the global rate. **Every
attribution records the campaign that produced it**, or null for the standing
programme. Without this, the economics dashboard can never answer whether a campaign
paid for itself, which is the only question a campaign exists to answer.

---

## 3. Qualification, as a state machine rather than a flag

```
   code used
       |
       v
   pending ----- phone verified AND qualifying action -----> qualified
       |                                                         |
       |-- fails the rules, or scored over the bar --> rejected   |
       |                                                          |
       |                       chargeback, account closed,        |
       +<--------------------- or fraud found later <-------------+
                                    reversed
```

**Four rules, all server side, all refusing with a named reason:**

1. **Phone verified**, the referred person's own, never the referrer's.
2. **A real action.** Named per campaign, never a signup. The launch set should be the
   narrowest thing that is genuinely valuable: a completed booking, or a listing
   published and passing review. **Not** a profile completion, a search, or a saved
   listing, every one of which is free to manufacture.
3. **Per member monthly cap**, 1,500.
4. **Platform budget cap**, from section 2.4.

**Reversal is a first-class state, not a correction.** Money already paid out on a
reversed attribution is a loss Vallo has to see, which is why `reversed_minor` sits
beside `paid_minor` rather than being netted into it.

### The ambassador question D51 left open

**1,500 a month is 50 a day, which is a job, not a referral.** The recommendation:
accrue automatically to a ceiling of **200 a month**, and above that move the member
into a `pending_ambassador` state where further accrual continues but **payout requires
one human approval**. Nobody is cut off, nothing is confiscated, and the first person
to industrialise the programme meets a human before they meet the float. This is a
judgement call and the founder's to make; it is written here as a recommendation, not
as settled.

---

## 4. The screens

Five. The founder asked for big and clean, which means few screens with real density,
not many screens with a widget each.

### 4.1 Overview

The one screen somebody looks at every morning.

- **This month, in naira**: accrued, paid, available, reversed, and the budget cap with
  a bar. Naira first, counts second, on every tile.
- **Burn rate** against the cap, with the projected month end and the date the cap is
  reached at the current rate. **"On this trend the float is empty on the 19th"** is the
  sentence this screen exists to produce.
- **Open alerts**, highest severity first, each one clicking through to the cluster or
  member it concerns.
- **Qualification funnel**: codes used, pending, qualified, rejected, with the rejection
  reasons broken out. A rejection reason that suddenly dominates is either an attack or
  a bug in the rules, and both need looking at today.

### 4.2 Referrers

A table that sorts and filters, with the columns that answer the questions actually
asked: referrer, qualified this month, accrued, available, paid, reversal rate, risk
score, days since first referral, and ambassador state.

**Reversal rate as a first-class column.** A member with 400 qualified and a 30 percent
reversal rate is the most interesting row in the table, and a view sorted by volume
alone will never surface them.

Row click opens the member file: their attributions, their risk reasons, their payouts,
their shared signals, and the actions in section 6.

### 4.3 Risk centre

The screen the founder's "detect more dangers" asks for. **Four detectors, each one a
query, each one producing alerts rather than a dashboard nobody reads.**

1. **Cluster detection.** Group attributions by shared `signup_device_hash`,
   `signup_ip_hash`, bank account, and phone number prefix plus registration window.
   **A cluster is the unit of investigation, not a member**, because self-referral rings
   use many accounts and one device. Show the cluster as a list with its total naira
   exposure at the top. Exposure, not size: twelve accounts worth 840 naira is noise,
   and three worth 90,000 is not.

2. **Velocity.** Qualified referrals per hour per referrer against their own trailing
   baseline, not a global threshold. A member who did two a week for a month and then
   forty in an afternoon is the signal; a global threshold either misses them or drowns
   in false positives from genuinely popular members.

3. **Behavioural sameness.** Referred accounts whose qualifying actions are
   suspiciously alike: the same listing booked, the same amount, the same minute of the
   hour, the same handful of characters' difference in their names. **Fraud is cheap
   because it is repetitive, and repetition is exactly what a query finds.**

4. **Payout concentration.** Many referrers, one destination bank account. This is the
   single highest value detector in the set, because it catches the ring at the only
   point it has to converge: the money has to land somewhere.

Each detector writes an alert with a severity, the naira exposure, the members
involved, and a one line explanation in plain words. **An alert that does not say what
it thinks is happening will be dismissed, and a dismissed alert is worse than none,
because it trains the reader.**

### 4.4 Payouts

The queue: requested, approved, sent, failed, reversed. Paystack reference and the fee
on every row. Failures grouped by reason, because twenty failures with one cause is one
problem.

**Approval is explicit for anything above a threshold or any member with an open
alert**, and the approver's identity is on the record. The second factor already
required for the console (`console_step_ups`) applies here without exception.

### 4.5 Campaigns and economics

Per campaign: spend, qualified referrals, cost per qualified referral, and then the part
that matters, **what those referred members went on to do.** Bookings, listings,
retention at 30 and 90 days, and gross commission earned from them against the naira
paid to acquire them.

**A referral programme that is not measured against the revenue it produces is a
discount with extra steps.** This screen is the one that eventually tells the founder
whether 70 naira is too much or far too little.

---

## 5. The risk graph

Members as nodes, shared signals as edges: device, IP, bank account, phone block,
qualifying action pattern. Rendered as a list of clusters by naira exposure by default,
with the visual graph available for a single cluster when somebody is investigating one.

**The list is the product and the picture is the garnish.** A force directed graph of
ten thousand members is a screensaver. A ranked list of eleven clusters with naira
against each is a morning's work.

---

## 6. Actions, each one reversible and each one recorded

Hold a payout · release a hold · reverse an attribution with a reason · suspend a
referrer's accrual · adjust a balance with a mandatory note · freeze the whole
programme · approve an ambassador · set a campaign live or dark.

**Freeze the whole programme is deliberately on this list.** The day something is badly
wrong, the right action is to stop accrual in one click and investigate while nothing
further accrues. Every one of these writes to the existing admin audit trail with the
actor, the reason and the naira affected.

---

## 7. What the engine must refuse, and must say so

Qualification past either cap · a payout below 1,000 naira · a payout to an unverified
bank account · a payout to a member with an open high severity alert, until a human
clears it · a second payout against the same attribution, ever · accrual at a rate
other than the one on the attribution row.

**Every refusal returns a named reason, never a silent no.** D52 was caused by exactly
this: a gate that refused without saying why cost Session 1 a wrong directive and the
founder two wrong answers from me.

---

## 8. Probes, because none of this is believable without them

1. Balances equal the sum of their attributions, for every member, always.
2. No payout exists against a non-qualified or reversed attribution.
3. No member exceeds 1,500 qualified in a calendar month.
4. The platform cap cannot be exceeded, including by two qualifications racing.
5. A rate change does not alter any already accrued amount.
6. `authenticated` can read its own balance and nothing else, and can write none of
   these tables. `service_role` writes through functions only.
7. The money moved by payouts reconciles against the marketing float in the ledger.
8. Every detector returns in under a second on a hundred thousand attributions, or the
   risk centre is unusable at the only scale where it matters.

**Probe 4 is the one most likely to be skipped and most likely to cost money.** Two
qualifications arriving in the same instant against a cap with one slot left is a
textbook race, and the textbook answer is that the check and the write happen in one
statement.

---

## 9. Ownership and order

| Work | Session |
|---|---|
| Schema, state machine, caps, refusals, balances, payouts, probes | **2** |
| The four detectors, the scorer, the alert records | **2** |
| All five screens, the risk graph, the action surfaces | **3** |
| Review against this document and the probe suite | **4** |

**Order matters.** The engine and the caps land before any screen is drawn, because a
console over an engine that cannot refuse is a console that displays a problem it
cannot stop. Payouts land last, after the detectors, because a payout rail that opens
before the detection exists is the single most expensive ordering mistake available
here.

**Nothing in this document is urgent relative to launch blockers.** Referral money does
not move until a referral is qualified, and nothing qualifies until the engine exists.
Section 9's order is the discipline; the current red CI, the db-06 allowlist and the
unverified ledger probe all come first.

---

## 10. Still the founder's to decide

1. **The ambassador threshold**, section 3. Recommended at 200 a month with payout
   approval above it.
2. **The platform monthly cap in naira.** It should be a number Vallo can fund twice
   over without pain, and it cannot be chosen from this side of the table.
3. **The qualifying action set at launch.** Recommended: completed booking, or listing
   published and passing review. Nothing cheaper.
4. **Whether 70 naira survives contact with section 4.5.** It may well want to be far
   higher for a referral that produces a lister, and zero for one that produces a
   dormant account. A single flat rate is the simplest thing that works, not the best
   thing.
