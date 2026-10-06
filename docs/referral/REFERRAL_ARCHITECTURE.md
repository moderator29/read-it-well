# The Vallo referral engine: locked architecture

**Status: baseline, locked by the founder on 6 October 2026. This supersedes
`REFERRAL_ADMIN_CENTRE.md` wherever the two differ.** That document remains correct on the
admin screens and the detectors; this one governs the engine, the lifecycle and the
configuration model.

**The core business rule, in the founder's words, and every decision below serves it:**

> **Vallo rewards genuine network growth, not account creation.**

---

## 1. The refinement that changes everything else

**No reward amount, threshold, window or cap is a product rule. They are all campaign
configuration.**

This is the most consequential line in the founder's brief and it resolves three open
questions at once. D51 set the reward at 70 naira; the founder's latest note says 76; an
earlier instruction set the withdrawal minimum at 1,000 naira and the latest note mentions 80.
**Under this refinement none of those need settling before implementation**, because each is a
row in a campaign, not a constant in code. The launch campaign ships with whatever figures the
founder confirms on the day, and changing one later is an insert, never a deploy and never a
migration.

**What must be configuration, explicitly:** the reward amount, the qualification
requirements, the per-member monthly cap, the platform budget cap, the review window length,
the minimum withdrawal, and the campaign's start and end.

**What must never be configuration:** the guardrails. Append-only accounting, the separation
of referral money from customer money, payment only on webhook confirmation, and the rule that
a reward's amount is frozen on its row at qualification. **A guardrail that can be switched
off in a dashboard is not a guardrail.**

---

## 2. The lifecycle, as the founder specified it

```
REFERRAL LINK
    -> ATTRIBUTED
    -> ACCOUNT CREATED
    -> EMAIL AND PHONE VERIFIED
    -> RISK CHECK
    -> REAL PRODUCT ACTIVATION
    -> QUALIFIED
    -> REWARD PENDING
    -> REVIEW WINDOW
    -> AVAILABLE
    -> WITHDRAWAL REQUEST
    -> ELIGIBILITY CHECK
    -> PAYSTACK
    -> WEBHOOK CONFIRMATION
    -> PAID

and branching at any point:
    -> UNDER REVIEW -> APPROVED or REJECTED -> REVERSED
```

**This is richer than the four states `REFERRAL_ADMIN_CENTRE.md` proposed, and the two extra
ideas in it are the ones that matter most:**

**REWARD PENDING, then a REVIEW WINDOW, then AVAILABLE.** A qualified reward does not become
withdrawable immediately. It sits for the campaign's review window while the risk graph keeps
correlating. **This single delay defeats most of the economically rational attacks**, because
fraud at scale needs the money out quickly and a ring that must wait days to find out whether
it worked is a ring that stops trying. The window is campaign configuration; the existence of
a window is not.

**PAID only on WEBHOOK CONFIRMATION.** Never on the transfer API's response. A transfer that
returns 200 and then fails is a reward Vallo believes it paid and did not. Three consequences:
the webhook handler is idempotent on the transfer reference; a reconciliation job sweeps
transfers that reach neither success nor failure within a bounded time; and **the member-facing
state says "sent" rather than "paid" until the webhook lands.**

**UNDER REVIEW is a state, not a flag**, reachable from any earlier state, and REVERSED is
terminal. Money already paid against a reversed reward is a loss Vallo must see, so reversed
amounts sit beside paid amounts and are never netted into them.

---

## 3. The Qualification Policy Engine

The founder's requirement: campaigns define their own qualification, rather than the engine
hard-coding "email verified plus phone verified plus one action". His examples:

| Campaign | Reward | Qualification |
|---|---|---|
| **A, consumer** | 76 naira | phone verified, email verified, onboarding completed, meaningful activity |
| **B, business** | 150 naira | phone verified, business profile completed, business verified |
| **C, supply** | 300 naira | phone verified, legitimate property owner, space successfully published |

### How to build it, and the mistake to avoid

**Do not build an expression language.** A table of predicates parsed at runtime is the
obvious design and it is a trap: it becomes a small programming language with no type checking,
no tests, and no way to reason about what a campaign actually requires. Vallo would be
debugging its own interpreter inside a money path.

**Build a fixed registry of named requirement checks instead.** Each check is a function with
one job, individually tested, registered under a stable key. A campaign stores an array of
keys. Qualification is: every key in the array resolves true, in order, with the first failure
recorded as the reason.

Launch registry, enough for all three campaigns above:

| Key | What it verifies |
|---|---|
| `phone_verified` | The referred person's own phone, verified |
| `email_verified` | Their own email, verified |
| `onboarding_completed` | They finished onboarding |
| `meaningful_activity` | A real action, defined per campaign by a parameter rather than by a new key |
| `business_profile_completed` | A business profile with its required fields |
| `business_verified` | Business verification passed, by its own record |
| `property_owner_verified` | Ownership evidence accepted |
| `space_published` | A listing published and passing review |

**Adding a campaign type must not require a new key.** If it does, the registry is too narrow
and the check is too specific. Parameterise instead: `meaningful_activity` takes what counts,
rather than spawning `meaningful_activity_for_hotels`.

**Every key returns a reason when it fails**, and the reason is stored on the referral row.
That is what makes the admin centre's rejection breakdown possible, and a rejection reason
suddenly dominating is either an attack or a bug in a check.

### The arithmetic nobody has done yet, and it needs the founder

**Different rewards per campaign multiply against the per-member cap, and the cap was set
once, globally.** At 1,500 qualified referrals a month:

| Campaign | Per member, per month, at the ceiling |
|---|---|
| A at 76 naira | 114,000 naira |
| B at 150 naira | 225,000 naira |
| C at 300 naira | **450,000 naira** |

**So a single global cap of 1,500 means something four times more expensive under Campaign C
than under Campaign A.** The cap must be **per campaign**, set alongside the reward, and the
platform budget cap must be the real ceiling. Campaign C's qualification is genuinely hard to
fake, which is the right defence, but a hard-to-fake requirement is not a budget.

---

## 4. The risk graph

The founder's requirement: a graph, not an `email === email` check. Continuously correlate
user, phone, email, device, network, referral, referred users, payout destination, activity
and rewards.

```
            user
  phone ----  |  ---- email
 device ----  |  ---- network
referral ---- | ---- referred users
payout  ----  |  ---- activity, rewards
              v
          RISK GRAPH
```

**The founder's own caveat is the most important engineering constraint in it:** identify the
cluster **without automatically accusing every shared-network user**. That is not a nicety. In
Nigeria shared networks are the normal case, not the suspicious one: mobile carrier NAT puts
thousands behind one address, and shared Wi-Fi, cybercafés, campuses and offices do the rest.
**A system that treats a shared network as evidence will spend its life accusing honest people
in Lagos.**

So the edges are weighted, and the weights are not equal:

| Edge | Weight | Why |
|---|---|---|
| **Same payout destination** | **Strongest** | A ring must converge to collect. Almost no honest reason for many referrers, one account |
| **Same device** | **Strong** | Shared phones exist, but at volume this is the signal |
| **Mutual or circular referral** | **Strong** | A refers B refers A has no honest shape |
| Same phone pattern plus a tight registration window | Moderate | Sequential SIMs bought together |
| Near-identical activity timing or amounts | Moderate | Fraud is cheap by being repetitive |
| **Same network** | **Weak. Never sufficient alone** | The normal case in this market |

**No single edge triggers an action.** A cluster is flagged on a combination crossing a
threshold, and it is ranked by **naira exposure, not member count**: twelve accounts worth 900
naira is noise, three worth 90,000 is not.

**And flagging is not accusing.** A flagged cluster moves rewards to UNDER REVIEW, which is
reversible and invisible to the member beyond a held payout with an honest message. Nobody is
told they committed fraud by a graph.

---

## 5. The money, kept apart

The founder's separation, which matches ADR-0002 and D50 exactly:

```
Vallo customer money   -> payment and escrow infrastructure, held by the provider

Vallo referral rewards -> rewards ledger -> withdrawal -> Paystack payout
```

**A referral reward is not a member balance that Vallo holds.** It is Vallo owing a member
money for marketing it has already received: a liability, accrued from qualification, funded
from Vallo's own marketing float, paid by Paystack transfer. **No customer money is ever
involved, so no custody question arises and the referrer never needs provider KYC to collect a
small sum.**

**The ledger is authoritative and Paystack is only the rail.** If the two disagree, the ledger
is right and the difference is an incident. That makes reconciliation a first-class job rather
than an afterthought: every transfer reference in the ledger resolves to exactly one Paystack
transfer with a matching amount and a terminal state, and anything that does not reconcile is
surfaced, never silently retried.

Posting goes to **`ledger_marketing_float`**, the third of the three books b2_ledger created.

---

## 6. What the member sees

The founder's surface, and it is right that it is this plain:

```
Invite and Earn

Bring people to Vallo and earn rewards
when they become qualified users.

Available        1,824 naira
Pending            456 naira

12 qualified referrals

[ Invite friends ]      [ Withdraw ]
```

Four rules for it:

1. **"Pending" is explained on tap, never left mysterious.** One line: what still has to happen
   and roughly when. An unexplained held amount is the single largest source of support
   contacts in any rewards product.
2. **"Qualified" is the word, and the requirements are visible before anybody starts.** A person
   who learns the conditions after inviting ten friends has been misled, whatever the small
   print said.
3. **Never show a projection.** No "earn up to", no "members like you earn". The same rule as
   promotion: never imply a number Vallo cannot deliver.
4. **"Sent" until the webhook confirms, then "Paid".** Section 2's consequence, surfaced
   honestly rather than optimistically.

---

## 7. The consequence for the migration waiting to be applied

**`supabase/migrations/pending/b4_referral_rewards_engine.sql` should not be applied as it
stands, and Session 1 is reversing its own earlier instruction to apply it.**

Checked against this architecture: the file creates `referral_policy`, `referrals`,
`referral_events`, `rewards_payouts` and `rewards_ledger`, and it already contains risk
scoring, reversal, cluster and velocity work, which is good and should be kept. **What it has
no trace of is campaigns, a budget period, or a cap in naira.** Those are not additions at the
edge: under the architecture above, **the campaign is the organising dimension.** Qualification
policy hangs off it, the reward amount comes from it, the per-member cap belongs to it, and the
review window is its setting.

**Applying a referral spine without its organising dimension means restructuring the spine
later, in a money area, after rows exist.** That is the expensive order.

**And nothing is lost by waiting**, which is what makes this easy: the feature register records
that **phone verification is built and switched off pending an SMS provider**, and
`phone_verified` is a requirement in every campaign the founder listed. **Not one referral can
qualify until that provider exists.** There is no cost to getting the schema right first.

So: add to the file, then apply once. Campaigns, with their reward, caps, window and
requirement-key array. A budget period per month with a cap in naira and a committed total. The
requirement registry as a set of named checks. The lifecycle states from section 2 in place of
a shorter set. Then one application, one probe run, one recorded verdict.

---

## 8. Probes

The eight in `REFERRAL_ADMIN_CENTRE.md` still hold. Five more come from this architecture:

1. **A reward cannot reach AVAILABLE before its campaign's review window has elapsed.**
2. **A reward is PAID only after a webhook, and the handler is idempotent**: the same webhook
   twice pays once.
3. **No campaign can exceed its own per-member cap, and no campaign can spend past the
   platform budget period**, including under two qualifications racing for the last slot.
4. **A campaign's requirement keys all resolve against the registry.** A campaign referencing
   an unknown key cannot be saved.
5. **Network alone never flags a cluster.** Construct a set of accounts sharing only a network
   and assert nothing is flagged, then add a shared payout destination and assert it is.

**Probe 5 is the one that protects honest members**, and it is the one most likely to be left
out, because it asserts an absence rather than a behaviour.

---

## 9. Still the founder's to decide

1. **The launch campaign's figures:** reward amount (D51 says 70, the latest note says 76),
   minimum withdrawal (1,000 naira earlier, 80 in the latest note), and the review window
   length. **None of these block implementation** now that they are configuration, but the
   launch campaign needs a row.
2. **The per-campaign caps**, given section 3's arithmetic. 1,500 at 300 naira is 450,000 naira
   per member per month.
3. **The platform monthly budget in naira.** It should be a figure Vallo can fund twice over
   without pain.
4. **Which campaigns launch at all.** Starting with the consumer one alone is the cautious path
   and loses nothing: the architecture supports the others the day they are wanted.
