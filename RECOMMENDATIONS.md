# Vallo recommendations

**This file replaces the previous RECOMMENDATIONS.md.** Nothing from it was
discarded: all 171 of its entries are carried into section 8 with their
original identifiers, because code comments, migrations and both handoffs cite
them by name and `P-1`, `N-1`, `W-1` and `E-1` have to keep resolving.

Written 15 September 2026. It holds **645 entries**: 474 from the three-agent
audit of 15 September, and 171 carried forward from the 9 August pass.

Read `docs/PRODUCT.md` first. It says what the product is. This file says what
is wrong with it and what to do next.

---

## How to read this file

**The full evidence for every A1, A2 and A3 entry is in `docs/audit/`.** This
file is the register and the work queue: identifier, what is wrong, effort and
status. The three reports carry the seven fields for each one, being evidence,
action, reason, impact, effort, risk and priority, and they are long on purpose.

| Status | Means |
| --- | --- |
| **OPEN** | Not started |
| **DONE** | Verified fixed, with the commit that did it. Kept so it is not rediscovered |
| **PARTLY DONE** | Some of it landed. The entry now describes only the remainder |
| **WITHDRAWN** | The recommendation was wrong, or the world moved. Says why |

| Priority | Means |
| --- | --- |
| **Critical** | A user loses money, loses data, is exposed, or is blocked from the core loop. Nothing else is critical, however annoying |
| **High** | Required before real money and real people arrive at scale |
| **Medium** | Genuine improvement that can wait |
| **Nice-to-have** | Real, small, and not urgent |
| **Future** | Worth recording, not worth planning around yet |

Legacy entries keep their original P0, P1 and P2 priorities rather than being
remapped, so a reference to "P-1, a P0" still reads correctly.

**Line numbers move. Symbol names do not.** Search for the name.

---

## 1. What this session already closed

Nine entries were fixed between the audit finishing and this file being
written. They are marked DONE in the register below, with the commit.

| Id | What | Commit |
| --- | --- | --- |
| `A2-061`, `A2-119` | Two admin RPCs passed an argument the function does not declare, so **no admin could approve a verification document for 37 days** and no agent could be verified | `60b8fcf` |
| `A2-021`, `A2-022`, `A2-023`, `A2-037` | Four surfaces promised escrow: the terms, the privacy notice, two welcome emails and the support bot. The terms also now disclose message scanning | `6bc1742` |
| `A3-002` | A declined payment was painted the pending colour with a notification bell | `2ee803c` |
| `A3-128` | A 1,343KB background on all 97 pages, painted twice | `201fcc9` |
| `A1-095` | The brand sweep had corrupted PRODUCT.md into a tautology | `6bc1742` |

Plus the platform sweep itself: the RentMe artwork, the 14 image files carrying
it, the native application identifiers, the npm scope and the domain literals.
`docs/SESSION_REPORT_2026-09-15.md` is the account of that.

---

## 2. The state, in one paragraph

Vallo is a well-engineered platform that cannot yet complete its own core
transaction. The database rates 84 out of 100 and retention rates 26, and they
are the same product. **Renting cannot be paid for at all**: `bookings/actions.ts`
refuses a rental at two call sites and tells the person to message the agent,
so the market the company is named after ends at a conversation. Buying and
selling have a schema and no screen. Escrow has a real state machine in the
database and nothing routes a payment into it. The engineering underneath is
genuinely strong and almost none of it is reachable by a user completing a
transaction. **That gap is the whole job.**

---

## 3. Escrow: the diagnosis holds, the cure did not survive review

This was asked directly: is releasing when the buyer moves in right, and is it
fair to the agent?

**No, and the reasons are worth stating precisely because they decide the
schema.** Everything in this first block stands. The model that was first
proposed to replace it did not, and the rest of this section is that argument,
kept visible rather than quietly swapped, because the founder decides.

### 3.1 Why move-in is the wrong trigger. This part is settled

**Move-in is not an event the platform can observe.** Nobody taps a button
carrying a mattress through a door. A trigger the system cannot see becomes a
trigger somebody has to claim, and whoever claims it controls the money.

**It puts all the timing risk on one side.** The agent has done their work when
the tenant has the keys. Holding their fee until a move-in that might happen
three weeks later, or never, means the platform is financing the tenant's
convenience out of the agent's income. An agent who experiences that once
brings their next listing to WhatsApp.

**It treats one payment as one thing when it is four.** A Nigerian move-in is
rent, caution deposit, agency fee and legal or agreement fees. Each is earned
at a different moment by a different party. A single release date is wrong for
at least three of them whatever date is chosen.

### 3.2 The three-leg custody model, and why it was rejected on re-audit

The first proposal was milestone escrow: the agency and legal fees released to
the agent on confirmed key handover, the first rent after a 72 hour objection
window, and the caution deposit held for the whole tenancy and split against a
documented check-out.

**It was re-audited against the migrations and it fails on five counts.** Each
was verified in the files rather than argued from memory.

**One escrow row is one amount, and nothing groups three legs.**
`public.escrow_purpose` has exactly four values: `rent_deposit`, `first_rent`,
`purchase_deposit`, `purchase_balance`. There is no agency fee, no legal fee,
no agreement fee. `escrows` has `amount_minor` with a positive check, one
payer, one payee, no parent id and no tenancy id. Three legs would be three
unrelated rows sharing only a nullable `listing_id`.

**There is no partial settlement anywhere.** `private.escrow_settle` moves
`amount_minor` entirely in one direction and writes one wallet entry. There is
no `PARTIALLY_RELEASED` state among the eight. **So "the caution deposit is
split against a documented check-out" is not a policy this database can express
at all**: the deposit can go 100 per cent to one party or 100 per cent to the
other, including through the admin ruling path, which calls the same
all-or-nothing function.

**A latent trigger would settle every leg on one viewing.**
`private.escrow_inspection_is_a_signal` loops over EVERY escrow where
`payer_id = new.user_id and listing_id = new.listing_id` in state `HELD` or
`RELEASE_REQUESTED` with `payer_confirmed_at is null`, stamps the confirmation
on all of them, and settles each one where the payee has already confirmed.
Under a three-leg design **one in-chat inspection confirmation would confirm
the tenant's side of the agency fee, the first rent and the twelve-month
caution deposit at once**, and release every leg the agent had already
confirmed. The leg meant to be held for a year would settle on the day of the
viewing. That is `G-3` and it must be fixed before any multi-leg escrow exists,
whatever else is decided.

**The window cannot be set.** `public.escrow_hold` hardcodes
`hold_days integer := 21` and takes no window argument, so a 72 hour leg cannot
be opened through the service-role path today. Only `escrow_fund_from_wallet`
accepts `p_hold_days`, in whole days, clamped 1 to 180.

**The commission is applied to every release unconditionally.**
`escrow_settle` calls `private.compute_fee('commission', ...)` on every
settlement. It is zero today, so "the platform takes nothing" is true by
accident and becomes false the day a rate is switched on.

### 3.3 The three objections that matter more than the schema

**The landlord is not on the platform, and the table hides it.** There is no
landlord entity anywhere in the schema. `escrows.payee_id` is one
`auth.users` id. So "the first rent releases to the landlord" means, in the
database, that **Vallo holds a tenant's annual rent and then pays it to the
agent.** That is not escrow protecting anybody from the agent; it is Vallo
delivering millions to an agent under Vallo's brand, on Vallo's instruction,
where the landlord is not a user, cannot dispute, and never agreed to it. If
the agent absconds, Vallo is the party that paid them.

**The caution deposit leg is the proudest part of it and the one that should
not be built.** It converts the platform from a few days of float into twelve
months of custody on every tenancy, which is exactly the shape a regulator
reads as deposit taking. It puts a three-person company in the middle of a
dispute about the state of a wall, with no surveyor and no site visit. And it
raises a question nobody asked: over twelve months on half a million naira,
**who gets the interest?** If Vallo keeps it, Vallo is earning on user money
while telling users in five places that it charges nothing.

**The funding leg is unusable at Nigerian rent sizes.** Escrow debits the
payer's Vallo wallet, so the tenant must first move the entire move-in cost
into a Vallo balance through Paystack. For an annual rent that is three to five
million naira, through card and transfer limits, over days, into a company with
one million naira of share capital. The first real escrow this platform ever
holds will not be a hundred and fifty thousand.

Three more, briefly. **When the agent is the landlord**, which is common, two
legs release to the same wallet on the same trigger and the model's central
distinction stops meaning anything. **On a renewal** there is no handover, no
keys and no agency fee, so the trigger never fires, while last year's deposit
is still held and there is no `HELD` to `HELD` transition to re-date it. **And
72 hours is the wrong shape, not just the wrong number**: the objections it
catches are instant ones, and the ones that actually cost a tenant money, the
borehole, the generator, the roof in the first rain, surface over a fortnight.
Note the hard limit: **there is no transition out of `RELEASED`**, so whatever
window is chosen is absolute and a late dispute has no mechanism at all.

### 3.4 The regulatory finding, which is the most important paragraph here

**As first written, the proposal describes a regulated activity.** Receiving
funds from a payer, holding them in the platform's own name, and disbursing to
a third party on a condition is third-party fund custody, which in Nigeria sits
under the CBN's payment service provider regime. That is the same
classification that cost the objects clause: the CAC portal read payment and
escrow wording as a regulated payments business and demanded 500,000,000 naira
of share capital.

**And the wallet may already have crossed that line.** `fundWallet` takes naira
through Paystack into a Vallo-controlled balance, `wallet_entry_kind` carries
`transfer_in` and `transfer_out` so users can move value to each other, and
withdrawals go out to bank accounts. That is stored value with peer-to-peer
transfer and it is in the code today. **So the question for the solicitor is
about the wallet, with escrow as the aggravating factor. Asking only about
escrow gets an answer to the wrong question.**

### 3.5 What to build instead, ranked

**1. The verified handover record, and build this one now. This is `G-1`.**
Vallo holds no naira and holds the **evidence** instead: a dual-signed,
timestamped handover object carrying photographs, meter readings, an inventory,
the tenancy agreement and both parties' verified identities, with a matching
check-out record at the end of the term. Zero CBN exposure, no licence, no
float, no dispute queue over money, and buildable on top of
`inspection_requests`. **It beats escrow at the caution-deposit problem**,
because that fight is always about proof and never about custody: the tenant's
real grievance is not "the platform did not hold my deposit", it is "I cannot
prove the crack was already there". It is also the only version that works when
the landlord has no account, because evidence does not require them to be a
party to anything. No competitor in this market has it.

**2. Partner-held funds, when money must be held.** The money never touches a
Vallo account. The payer funds a dedicated account at a licensed institution, a
virtual account through Paystack, Flutterwave or Monnify, and Vallo is the
instruction layer that tells the partner when the condition is met. Vallo acts
as an agent of a licensed provider rather than as a deposit taker. The user's
trust benefit is identical, because what they care about is that the agent
cannot take the money and disappear, not whose balance sheet it rests on. And
the copy becomes "held by [named licensed partner]", which is **true**, and
therefore shippable under the rule that escrow is promised nowhere.

**3. Delayed settlement with no hold.** The payer pays the agent through the
processor and Vallo controls only when the settlement instruction fires. The
funds sit with the provider in its regulated capacity throughout.

**4. A solicitor's client account, for sales only.** Established, regulated,
and the company already has a solicitor. Right for a ninety million naira
transaction, absurd for a nine hundred thousand naira room.

### 3.6 The amendment, as two decisions taken separately

**Now, no flag needed:** build the handover and check-out evidence record with
no money in it, fix `escrow_inspection_is_a_signal` before it can ever misfire,
and keep every existing refusal in the copy exactly as it stands.

**Later, and only after a legal answer:** when escrow is turned on, turn on
**one** leg, the agency fee, against a licensed partner's account rather than
Vallo's own. **Never hold a year's rent. Never hold a caution deposit for a
tenancy. Never hold a purchase balance**, and document `purchase_balance` as
never-to-be-used, because leaving it in the enum is an open door to the thing
this section says not to do.

**On the sale half:** title transfer as the trigger is right and the
solicitor's client account is right. But "escrow the deposit only" on a ninety
million naira duplex is a nine million naira hold, which is not a small
liability.

### 3.7 One mechanism worth stealing, which neither version had

The state of the art for releasing on an unobservable milestone is not dual
confirmation. Dual confirmation is table stakes and its failure mode is
deadlock, which is why every serious implementation pairs it with a timer, as
this schema already does. The real mechanism is **positive-signal
substitution**: stop asking about the milestone and key the release to a
different event the platform *can* observe. Uber does not ask whether you
arrived, it watches the GPS. Airbnb releases about twenty-four hours after
**scheduled** check-in rather than after a guest confirmation, because the
scheduled time is observable and the confirmation is not.

**Vallo already has the observable signal and is not using it.**
`inspection_requests.slot_at` is an agreed, timestamped, dual-visible
appointment. Keying anything to "`slot_at` plus N days unless disputed" is
strictly better than keying it to a confirmation tap that, in a market where
most people are on a phone with patchy data and no habit of confirming
anything, will simply not happen.

---

## 4. The inspection fee: do not charge, and here is the better trade

Also asked directly: can an agent set an inspection fee, paid at the property?

**The read of the fraud pattern is right and the instinct to invert it is
right.** "Pay ₦5,000 before I show you the flat" is the scam almost word for
word, and cash at the gate leaves no record, no recourse and no evidence. The
need underneath is real too: agents spend transport and hours, and no-shows
cost them.

**But the fee, in any held form, is the wrong answer, and re-audit found three
reasons that were missed first time round.**

### 4.1 It breaks a rule the founder already wrote

`docs/PRODUCT.md` line 80: **"Never charge a member to look, save, message or
enquire. Fees attach to transactions and to supply-side services."**

An inspection fee is a charge to look. The first version of this proposal never
cited that line and therefore never argued against it. **That is a decision for
the founder to take explicitly and in writing, not one to arrive at by
implication inside a feature spec.**

### 4.2 It makes a clause written this session false

`apps/web/src/lib/legal/terms.tsx` now says, in bold: **"We do not hold your
money in escrow, and you should not treat a payment made here as protected by
us holding it."** That clause replaced a promise of escrow that no guest's
money has ever moved through, and it is the most carefully argued paragraph in
the terms.

A held inspection fee makes it false. **Holding five thousand naira is the same
regulated activity as holding five million. It is only cheaper to get wrong.**

### 4.3 "Credited against the transaction" cannot be computed

This was named as the clause that makes the design honest, and **there is no
object that links a viewing to a tenancy.** No tenancy table, no rental
transaction, and `bookings` is a stay object with dates that a rental never
creates.

A visitor views four flats from three agents, pays four fees, and rents the
third. **Credited against what, by whom, out of whose money?** The agents who
showed flats one, two and four did real work and will not be refunding
anything. So at scale the honest description is not "a refundable commitment
deposit". It is "the platform took money from a renter to look at properties
and gave some of it back on one of them", which is the business the platform
says it is not in, arrived at by arithmetic rather than by anybody's bad faith.

### 4.4 And the gate protects the wrong noun

Nothing in the schema establishes that an agent **controls** the property they
listed. `agent_verification_checks` has four rungs, `identity`, `address`,
`payout` and `in_person`, and every one is about the *person*. There is no
ownership document, no landlord mandate, no title reference.

So a fully verified agent with a real bank account in their own verified name
can list an address they walked past and collect five thousand naira a viewing
from twenty people before enough of them complain. **The gate keeps out new
accounts; the fraud it names does not need a new account.**

### 4.5 It also fails the platform's own dark pattern test, at scale

**Breakage.** Every refundable-deposit business finds its economics in the
unclaimed portion. Here the platform keeps nothing, which sounds like immunity
and is worse: the breakage accrues to **the agent**, whose financially best
outcome becomes a viewing that does *not* convert. That incentive points
directly away from the visitor and it is manufactured by the design.

**Urgency.** A price on looking is raw material for "fee waived today" and
"three people have paid to view this flat". The rules forbid manufactured
urgency and fake scarcity. The fee does not create those; it hands every agent
on the platform the lever, and levers get pulled.

### 4.6 The amendment: ship the commitment without the money. This is `G-2`

Nobody good charges for the viewing. They charge for the **commitment**, they
never take custody, and they make it reversible by whoever bears the risk. The
card mechanism is an **authorisation with delayed capture**, the OpenTable
no-show hold. An authorisation is not custody: no money moves, nothing enters
the platform's balance, there is nothing to refund, no licence question arises,
and it cannot be farmed because the agent only receives anything if the visitor
fails to attend.

**It only half transfers to Nigeria.** Pre-authorisation exists on cards
through Paystack, but the dominant rail here is bank transfer and a transfer
cannot be authorised and then voided. That is the honest answer rather than a
recommendation.

**The version that transfers fully is not monetary at all.** Make the
commitment reputational:

- Confirmed slots with an agreed `slot_at`, which already exists.
- **Symmetric no-show records, visible to both sides.** `inspection_requests`
  is already shaped for this: it has no delete policy at all and `WITHDRAWN` is
  the only exit, and the migration header says plainly that this is what stops a
  pattern of no-shows being invisible.
- A rate limit on how many open viewing requests one visitor may hold.
- **The agent's own no-show rate on their profile**, which is supply-side
  discipline nobody in this market currently faces.

In a low-trust, cash-heavy, annual-transaction market, **reputation is the
currency that actually clears, and it costs nothing to hold.**

Then measure no-shows for three months. If the data says money is needed, the
second-best design is a card authorisation voided on attendance, never a
captured and held fee, gated on the `payout` rung **and** on a property-control
document that does not exist yet and would have to be built first.

### 4.7 The copy fix, which is worth doing on its own

`app/(site)/safety/page.tsx` line 65 tells a renter to "never pay an inspection
fee, a holding fee or an agency fee to anybody", unqualified, while
`listings` itemises `agency_fee_minor` with a column comment reading "the
agent's commission in kobo, paid by the incoming tenant", and
`ListingMoveIn.tsx` renders it.

**The contradiction is real and it is one sentence in one file, not a
product-wide problem.** Four other surfaces already qualify it correctly, in
`standards`, `help`, `docs/chapters` and `lib/trust/standards.ts`, each saying
a fee presented **as ours** is a lie. The fix is to match them: **never pay an
inspection fee, a holding fee or an agency fee outside Vallo.** That is
`A1-026`, it is one line, and it gives the reader a rule they can follow.

**Note what this means for the fee proposal**: those four surfaces say there is
no such fee *payable to Vallo*. The moment a fee is paid through Vallo and
held, all five sentences need rewriting, not one.

---

## 5. The thirty, and nothing starts until the word is given

These are picked to be worked in order, in six blocks. The order is not by
severity: it is by what unblocks what. Block A has to exist before most of the
rest of this file can be built on top of it, and blocks B and C are cheap
enough that they should not wait behind it.

**Tick the box when it is done and verified, not when the code is written.**
Done means the ONE LAW closed: a UI action, a validated server action, a write
that survives RLS, the UI showing the new reality after a reload, the
notification the event deserves, and a test proving it.


### A. The loop. Without this the product cannot do its own job

| | # | Id | What | Effort | Why it is in the thirty |
| --- | ---: | --- | --- | --- | --- |
| [ ] | 1 | `G-1` | The handover evidence record. No money in it | Decision, then M | See section 3 |
| [ ] | 2 | `G-2` | Commitment without money: slots, symmetric no-show records | Decision, then M | See section 4 |
| [ ] | 3 | `A1-001` | Build the rent money path. A tenancy cannot be paid for | XL | The whole product |
| [ ] | 4 | `G-3` | Fix `escrow_inspection_is_a_signal` before any multi-leg escrow exists | S | A latent settle-everything bug |
| [ ] | 5 | `A1-002` | Let a renter or a buyer leave a review | L | The only scalable trust signal. Needs a tenancy record, not `booking_status` |

### B. Money safety. Cheap, dangerous, and none of it should wait

| | # | Id | What | Effort | Why it is in the thirty |
| --- | ---: | --- | --- | --- | --- |
| [ ] | 6 | `A2-001` | /reset-password must require a recovery session | S | Account takeover |
| [ ] | 7 | `A2-002` | A password change must revoke every other session | S | Account takeover |
| [ ] | 8 | `A2-013` | Re-authenticate before a withdrawal or a deletion | M | Money and data |
| [ ] | 9 | `A2-046` | Rate limit every money surface | S | Nothing is limited today |
| [ ] | 10 | `A2-041` | Withdraw must not fall back to an unlocked money path | S | Double spend |
| [ ] | 11 | `A2-052` | Put a ceiling on a single funding, withdrawal or transfer | M | Blast radius |
| [ ] | 12 | `A2-047` | Give Reserve an idempotency guard | M | Double booking |
| [ ] | 13 | `A2-133` | The Yellow Card webhook must check the currency | S | Free money bug |

### C. Privacy and the NDPA. These are legal defects, not nits

| | # | Id | What | Effort | Why it is in the thirty |
| --- | ---: | --- | --- | --- | --- |
| [ ] | 14 | `A2-024` | Stop storing bank account numbers in plain text | M | NDPA, and it is retained forever |
| [ ] | 15 | `A2-025` | Stop loading whole private conversations into the admin screen | M | NDPA and the terms |
| [ ] | 16 | `A2-026` | Make account deletion actually complete | L | A right the notice promises |
| [ ] | 17 | `A2-029` | Purge identity documents for a rejected application | M | Storage with no lawful basis |
| [ ] | 18 | `A2-036` | Write an audit row when an admin opens an identity document | M | Accountability |
| [ ] | 19 | `A1-004` | Make Hide my activity do what it says, or remove it | M | A privacy switch reading nothing |

### D. The confirmation system. Section 24, and the founder asked for it

| | # | Id | What | Effort | Why it is in the thirty |
| --- | ---: | --- | --- | --- | --- |
| [ ] | 20 | `A3-001` | Build the one ResultSheet, with a failure state | L | Section 24, and it is the system |
| [ ] | 21 | `A3-003` | Give every money action a real pending state | M | The most anxious second |
| [ ] | 22 | `A3-005` | Fix the verdict copy on every confirmation | S | Cheap, and it is the screenshot |

### E. Operations. You cannot run what you cannot see

| | # | Id | What | Effort | Why it is in the thirty |
| --- | ---: | --- | --- | --- | --- |
| [ ] | 23 | `A2-141` | Add CI. Nothing runs any check automatically | M | Lint is already failing on main |
| [ ] | 24 | `A2-063` | Check every RPC call against the function's real signature | S | Caught two dead actions |
| [ ] | 25 | `A2-121` | Read cron.job_run_details and alert on a failure | M | Eight jobs, no alerting |
| [ ] | 26 | `A2-123` | Alert on a [money] failed line | M | Money failing silently |

### F. Truth in copy. One paragraph each, and they are trust

| | # | Id | What | Effort | Why it is in the thirty |
| --- | ---: | --- | --- | --- | --- |
| [ ] | 27 | `A1-003` | Stop sending strangers to a sign-up form they do not need | S | 21 links, 16 now public |
| [ ] | 28 | `A1-007` | Let a signed-out visitor save a listing | S | The funnel's lowest step |
| [ ] | 29 | `A1-026` | Fix the safety copy that contradicts the product | S | Trust, and it is one paragraph |
| [ ] | 30 | `A1-117` | Stop claiming checks that do not exist | S | Three published false claims |

**None of the thirty is started.** The instruction is explicit: fix the
platform first, then wait for the word. Section 1 records what this session did
fix, and every one of those was cleanup or a defect that could not be left
standing, not an item from this list.


---

## 6. The 474 new entries, by priority

Grouped by priority, then by identifier. **The full seven-field evidence for
each is in the report named in the last column.** An entry in the thirty carries
a tick box; the rest carry their status.


| Priority | Count |
| --- | ---: |
| Critical | 30 |
| High | 164 |
| Medium | 210 |
| Nice-to-have | 54 |
| Future | 3 |
| Unclassified | 13 |
| **Total** | **474** |

### 6.1 Critical. 30 entries

| | Id | What is wrong | Effort | Status | Evidence in |
| --- | --- | --- | --- | --- | --- |
| [ ] | `A1-001` | A tenancy cannot be paid for, so the market the company is named after cannot transact | XL | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
| [ ] | `A1-002` | No renter or buyer can ever leave a review, so the trust signal the platform depends on cannot accumulate outside nightly stays | L | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
| [ ] | `A1-003` | Every product link on the landing page sends a stranger to a sign-up form the middleware would not have asked for | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
| [ ] | `A1-004` | "Hide my activity" is a privacy switch that nothing reads, and it promises something specific | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-022` | The help centre and the landing FAQ both point a prospective agent at a "Become an agent page" that no longer exists as a page | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
| [ ] | `A2-001` | `/reset-password` accepts any session, not a recovery session | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
| [ ] | `A2-002` | A password change revokes no other session | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
| [x] | `A2-021` | The welcome emails promise escrow | S | **DONE.** Welcome emails no longer promise escrow. Commit 6bc1742. | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
| [ ] | `A2-024` | `message_flags.matched` stores bank account numbers in plain text | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
| [ ] | `A2-025` | The admin flags screen loads whole private conversations | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
| [ ] | `A2-026` | Account deletion cannot complete for most real users | L | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-028` | Storage objects survive account deletion as orphans | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
| [ ] | `A2-029` | Nothing purges documents for a rejected application | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
| [ ] | `A2-041` | `withdraw()` falls back to an explicitly unlocked money path | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-042` | `isMissing()` classifies ordinary errors as a missing function | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
| [ ] | `A2-046` | No money surface is rate limited | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-054` | `wallets_overdrawn()` exists and nothing pages on it | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-055` | The reconciler is inert until two Vault secrets exist | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
| [x] | `A2-061` | `reviewKycDocument` passes an argument the function does not declare | S | **DONE.** The undeclared acting_admin argument is removed. Commit 60b8fcf. | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
| [ ] | `A2-063` | Nothing checks an RPC call against the function's real signature | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
| [x] | `A2-119` | The KYC queue cannot be worked at all today | S | **DONE.** Same root cause as A2-061. The KYC queue can be worked again. Commit 60b8fcf. | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
| [ ] | `A2-121` | Nothing reads `cron.job_run_details` | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-122` | Nothing reads `net._http_response` | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
| [ ] | `A2-123` | Nothing alerts on a `[money] failed` line | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
| [ ] | `A2-133` | The Yellow Card webhook never checks the currency | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
| [ ] | `A2-141` | Nothing runs automatically, and the minimum job list is short | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
| [x] | `A3-002` | A declined payment is painted the pending colour with a notification bell | S | **DONE.** A declined payment is rose with a cross, not cyan with a bell. Commit 2ee803c. | `A3_FRONTEND_DESIGN_MOTION_QA` |
| [ ] | `A3-003` | Pending on the money path is a button spinner and nothing else | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
| [ ] | `A3-005` | "Payment check" is not a verdict | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
| [x] | `A3-128` | One 1,343KB PNG is on every page in the product, painted twice, outside `next/image` | M | **DONE.** The 1,343KB background is deleted, with the whole RentMe art set. Commit 201fcc9. | `A3_FRONTEND_DESIGN_MOTION_QA` |

### 6.2 High. 164 entries

| | Id | What is wrong | Effort | Status | Evidence in |
| --- | --- | --- | --- | --- | --- |
|  | `A1-005` | The copy on the privacy switch describes a surface that does not exist, while the surface that does exist has no control | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-006` | `/search` and `/rent` are submitted to Google in the sitemap and both emit noindex, nofollow | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
| [ ] | `A1-007` | A signed-out visitor cannot save a listing, which removes the funnel's lowest-commitment step | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-008` | Device saves are never promoted into `saved_items` after sign-up, so a shortlist dies with the browser | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-009` | The "Instant book" filter empties the catalogue by construction, and the code says so in a comment | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-011` | Two of the five market links in the footer do nothing, because `intent` is not a search parameter | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-014` | The total move-in cost, which the product rule calls the differentiator, cannot be filtered or sorted on | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-015` | `saved_searches` exists with no writer, no screen and no alert, which removes the most common reason a property app is reopened | L | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-016` | Nothing watches a saved listing, so a shortlist silently rots | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-017` | The assistant has no concept of language, so the platform's flagship AI feature is English only in a four-locale product | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-018` | The public trust and legal site is English only, including the page that exists to prevent fraud | L | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-019` | The conversation layer and notifications are English only, which is where the fraud education has to land | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-020` | Fifteen user-facing strings explain an outage by naming "platform keys", and one of them says "come back soon" | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-021` | The help centre promises automatic payouts after a completed stay, and `booking_status` has no COMPLETED value | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-023` | The landing FAQ tells visitors that payments are not on yet, and card checkout is built and settling | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
| [ ] | `A1-026` | The safety centre tells a renter never to pay an agency fee to anybody, and the product models an agency fee as part of the move-in cost | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-027` | The safety centre's climactic instruction cannot be followed, because there is no rent payment | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-030` | The published response commitments are a four-hour promise with no on-call and no monitoring | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-031` | The landing FAQ claims NDPA compliance as a settled fact, in the same paragraph as a data claim | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-032` | The verified badge is one boolean on a card while the ladder has four named rungs with written meanings | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-034` | `tenure` records what a seller claims and there is nothing to record whether anybody looked | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-036` | Nothing tells a renter what to check on a tenancy agreement, on a platform whose whole pitch is not being defrauded | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-037` | The report categories are excellent and are not reachable from the one place fraud actually happens | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-041` | The utility record, which the social design calls "the whole wedge", has no table | XL | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
| [x] | `A1-049` | The root Open Graph metadata has no image, so sharing the platform itself on WhatsApp produces a blank preview | S | **DONE.** Superseded: the root OpenGraph image slot now has a real asset to point at. | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-053` | There is no way to compare two listings, on a product whose assistant already has a compare tool | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-056` | The assistant's system prompt is the best-written thing in the product and it is not enforced anywhere | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-057` | The assistant has no disclosure that its output is assistance rather than advice | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-059` | A confirmed inspection does not tell the renter where to go | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-060` | Nothing reminds anybody that an inspection is happening | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-061` | There is no way to tell somebody where you are going to a viewing | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-062` | Nothing records how an inspection went, so the inspection produces no trust signal | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-064` | There is no video or remote inspection, which is the single most valuable thing the platform could offer the diaspora | L | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-069` | First run asks what kind of property and never asks where or how much | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-072` | Nothing in the product explains what the move-in breakdown lines mean, at the moment a person reads them | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-074` | There is no returning-user home, so a person who has searched arrives at the same screen as a person who has not | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-075` | Nothing captures demand when a search returns nothing, which is the state the whole catalogue is in | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-078` | There is no tenancy record, so there is no renewal date, no receipt store and no expiry reminder | L | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-081` | Nothing tells a person what they missed, so a return visit does not reward itself | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-086` | A person outside Nigeria cannot store a phone number | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-087` | Nothing anywhere asks whether a person is outside Nigeria, so nothing can be shaped for them | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-093` | `docs/PRODUCT.md` describes rent as ending in "then pay", which the code refuses | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
| [x] | `A1-095` | The brand sweep has corrupted two sentences in `docs/PRODUCT.md` by replacing both dead names with Vallo | S | **DONE.** The two corrupted sentences in PRODUCT.md are restored. Commit 6bc1742. | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-097` | `docs/SOCIAL_DESIGN.md` reads as a description of a built system and its central mechanism has no table | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-100` | `/saved` is behind a session, so the entire signed-out device-save system has no screen | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-101` | The first two sentences a new user reads promise buying and selling, which are not built | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-102` | The intro carousel and every auth screen title are hardcoded English | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-103` | The sign-in notice for an unconfigured platform is the "platform keys" string in the highest-traffic possible place | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-108` | The dictionary has no section for the transaction path, so the gap is structural rather than accidental | L | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-115` | The landing page's secondary call to action sends a stranger to documentation | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
| [ ] | `A1-117` | Listing text is not scanned, and two documents say it is | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-118` | The standards page says duplicate and stolen photographs are checked before publication and nothing checks them | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-120` | The contact form publishes a third, different response commitment that contradicts the other two | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-122` | The cancellation policy covers every stay and nothing covers a rental | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-131` | A shared listing carries no message, so the person receiving it does not know why | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-137` | There is no explanation anywhere of why the catalogue is empty | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-145` | Account deletion exists as code and has no audited user experience | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A2-003` | There is no change-password surface at all | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-004` | The password floor is eight characters with no breach check | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-005` | `/verification` is not classified in the middleware | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-006` | The rate limiter fails open, including on sign-in | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-007` | `ipFromHeaders` trusts the leftmost `x-forwarded-for` entry | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-011` | Two KYC flows exist and one of them does nothing | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
| [ ] | `A2-013` | No re-authentication before a withdrawal or a deletion | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-014` | Nothing tells a person their password changed | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-016` | `deleteAccount` signs out before it knows the delete will work | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-020` | There is no step-up or timeout on an admin session | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
| [x] | `A2-022` | The privacy notice says the platform holds and releases payments | S | **DONE.** The privacy notice no longer says the platform holds and releases payments. Commit 6bc1742. | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-023` | Two escrow email builders promise escrow and have no send site | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-027` | Deleting an admin erases the audit trail's attribution | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-030` | Nothing enforces any other line of the retention schedule | L | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-031` | There is no data export path | L | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-032` | The privacy notice names no processor | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-033` | The assistant and support routes send personal data to Anthropic undisclosed | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-034` | There is no redaction function at the logging boundary | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-035` | The admin reviewer sees the full bank account number | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
| [ ] | `A2-036` | No audit row is written when an admin reads an identity document | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
| [x] | `A2-037` | The terms do not disclose that messages are scanned | S | **DONE.** The terms now disclose that messages are scanned. Commit 6bc1742. | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-038` | `app/error.tsx` logs the whole error object | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-043` | `labelTransferLegs` writes a ledger status while claiming not to | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-044` | `availableBalanceMinor` pulls every pending debit row and sums in Node | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-045` | `net_settlement_minor` is not tied to the parts it should follow from | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
| [ ] | `A2-047` | Reserve has no idempotency guard | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-049` | Escrow, savings pots and crypto have no feature flag | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-051` | `escrows` blocks account deletion for settled escrows too | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
| [ ] | `A2-052` | There is no ceiling on a single funding, withdrawal or transfer | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-053` | A booking charge is settled for whatever the processor reports | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-056` | `recordMoneyAudit` failures are invisible | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-057` | There is no velocity or destination-change control on withdrawals | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-062` | `setFeeRate` has the identical defect | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-064` | `database.types.ts` is generated by hand and can lag the schema | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-065` | Six foreign keys added on 9 August have no covering index | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-067` | `anon` lacks EXECUTE on `can_see_listing_access`, which is a latent 42501 | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-068` | `sweep_badges()` returns a count that nothing reads | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-069` | There is no functional probe harness for database functions | L | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-075` | No role has a `statement_timeout` | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-078` | Nothing in the database enforces that the platform fee is zero | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-080` | The repository cannot prove it matches the database | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-085` | The assistant feeds untrusted resident posts to the model unmarked | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-092` | Flags fail open, including during a Postgres incident | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-096` | There is no dead-letter store for a webhook that cannot be processed | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-101` | `getStopsDesk` reads every agent, then every suspension, with no limit | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-102` | No query in the admin console paginates | L | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-103` | `writeAudit` swallows every failure with no signal | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-104` | `AuditEntry` has no required reason | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-105` | Two money actions write no audit row | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-106` | There is no user management or user search screen | L | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-107` | There is no privacy request queue | L | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-108` | There is no admin activity screen | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-109` | There is no integration health screen | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-110` | There is no system health screen | L | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-115` | The full transcript read needs a justification prompt | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-124` | There is no error tracking of any kind | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-125` | There is no uptime check on the webhook endpoint | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-126` | There is no incident runbook that anybody is pointed at | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-127` | There is no procedure for a leaked service role key | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-128` | Backup and recovery are undocumented and untested | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-134` | The Yellow Card signature fallback is almost certainly dead | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-135` | There is no vendor inventory | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-136` | Nothing confirms a transactional email was delivered | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-142` | There is no pre-commit hook of any kind | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-145` | There are no tests for any RLS policy | L | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-150` | There is no ADR for escrow, and `ARCHITECTURE_DECISIONS.md` predates it | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-152` | `docs/ENVIRONMENT.md` does not list `SUPABASE_AUTH_HOOK_SECRET` or the two Vault secrets | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-156` | Nothing checks that the two signed-out gates agree | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
| [ ] | `A3-001` | There is no failure state in the shared confirmation component | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-004` | Two identical settlement components exist in two files and will drift | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-006` | A failed wallet funding is dismissed by a button labelled "Done" | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-007` | A pending listing is painted as a success | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-008` | KycBanner has pending and failed inverted | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-013` | A receipt renders the raw database enum | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-014` | A failed or reversed receipt has no explanation | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-015` | A stay has no receipt | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-019` | A booking inspection request has no success state | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-020` | Redirecting to Paystack happens with no warning | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-021` | There is no timeout on either settlement check | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-027` | `MomentScreen` has no live region | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-029` | The fact and the consequence are the same prop | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-042` | Validation errors render at 11px and 12px | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-046` | Five media tokens are declared twice in the same `:root` and the second block reverts the first | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-047` | `--nf-state-info` is a Tailwind sky and does not belong to the family | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-057` | There is no type enforcement and 995 raw font sizes | L | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-062` | No `color-scheme` is set anywhere | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-063` | No `accent-color` is set | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-064` | Autofill is unstyled | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-066` | `docs/ICON_SYSTEM.md` is wrong about the size scale, the stroke weight, the glyph count and the object count | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-079` | There is no `Card` primitive and `nf-card` appears in 205 files | XL | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-092` | `Amount` divides by 100 by hand and does not use `formatMoney` | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-093` | Three more hand divisions by 100, all on the wallet | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-101` | There are two switch implementations and two segmented implementations | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-102` | The in-app "Reduce motion" setting is wired to nothing | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-103` | `Reveal` ships `opacity: 0` in the server HTML | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-115` | A 26x48 button appears on four of the five routes I probed | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-118` | There is no `role="status"` on the checkout pending path | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-123` | The wallet headline orphans a word at 390px | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-127` | Two headers stack to 260px before any content at 390px | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-132` | The `Save-Data` path is thoughtful and I could not verify it fires | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-133` | The data-saver path only helps people who already know their link is bad | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-155` | The banned-copy specs check different lists | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-161` | There are zero component tests | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-162` | `toneForStatus` has no test | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-163` | The design tokens package has no test at all | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-166` | Nothing tests the ONE LAW's sixth step for the confirmation states | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-167` | No spec asserts the reduced-motion contract | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |

### 6.3 Medium. 210 entries

| | Id | What is wrong | Effort | Status | Evidence in |
| --- | --- | --- | --- | --- | --- |
|  | `A1-010` | The party-size filter silently guesses capacity because the column it was built for was dropped | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-012` | The landing page's Apartments tile passes a category the parser does not recognise | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-013` | The landing page's Experiences tile can never return a result, and the root Open Graph description advertises the same non-market | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-024` | The landing FAQ is 12 hardcoded English answers on a page whose own facts band advertises four languages | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-025` | The landing FAQ still makes the nationwide coverage claim that the rest of the page was corrected to drop | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-028` | The safety centre names a cleaning charge the schema does not have | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-029` | "Host" appears in user-facing copy in all four locales, against the terminology table | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-033` | Verification is a permanent state, so there is no standing for an agent to maintain | L | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-035` | There is no way for a person to see what the platform did about a report they filed | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-038` | The admin kill switch for the entire social layer renders as the raw string "social" | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-039` | The locale files still describe partner hotel and restaurant inventory, which ADR-013 deleted | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-042` | `events` and `event_attendees` exist, a Meetups feature flag exists, and there is no query and no screen | L | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-043` | Three of the fifteen badges depend on mechanisms that do not exist anywhere in the codebase | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-045` | CORRECTED. The system entry for a published listing is built; the area page has no persistent supply rail | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-046` | All 18 posts are SYSTEM-authored and there is no path from reading the feed to writing in it for somebody who has joined nothing | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-047` | A shared profile link produces a bare handle with no description and no image | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-048` | A shared post produces no image even when the post has one | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-050` | `openGraph.locale` is hardcoded to `en_NG` with no alternates, on a four-locale product | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-052` | Recent searches and recently viewed are device-local, so a person's history does not follow them | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-054` | A saved shortlist has no notes, no tags and no way to record why a place was saved | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-058` | The assistant persists threads it never reads back, so a conversation cannot be resumed | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-063` | There is no record of a no-show, so an agent who never turns up carries no consequence | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-065` | There is no way to nominate somebody to inspect on your behalf | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-067` | A renter's inspections live under a tab called Bookings, a word that by the platform's own terminology means a nightly stay | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-068` | An inspection request asks for one time, so a decline restarts the whole exchange | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-070` | First run cannot express an intent to buy, on a platform whose largest hole is buying | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-073` | `/welcome` asks its question once and there is no way to change the answer from the place it was asked | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-076` | CORRECTED. The stated-intent explanation exists and is good; the string is hardcoded English on an otherwise localised page | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-077` | Five of the eight notification kinds have no preference control | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-080` | No notification is ever batched or summarised, so volume will become noise | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-083` | Badges are awarded nightly and nothing tells the person they earned one | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-084` | There is no referral or invite mechanism, and the social layer has the graph for one | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-089` | Every date and time in the product assumes the reader is in Nigeria | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-090` | There is no surface that answers a diaspora renter's actual questions | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-091` | `docs/PRODUCT.md` says `/agents` is an open supplier pitch and the route does not exist | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-092` | `docs/PRODUCT.md` says the hybrid flags are deleted and `lib/flags.ts` still declares them | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-094` | `docs/PRODUCT.md` section 10 lists ten known divergences and does not list the ones in this group | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-096` | `docs/BADGES.md` defines three badges against mechanisms that do not exist | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-098` | `docs/SOCIAL_DESIGN.md` section 7.8 claims accessibility is answered | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-099` | `lib/saved/actions.ts` and `app/(app)/saved/page.tsx` both carry a comment describing behaviour that does not exist | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-104` | "Owner" is used for an agent on the intro carousel | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-105` | Six `(app)` routes fall through to a loading skeleton that draws the marketing landing page | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-106` | The 404 page offers no search | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-107` | Ninety `metadata.title` values across the app are hardcoded English | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-109` | `KIND_NOUN` is the product's category vocabulary and it is English only | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-112` | Filter results have no live region, so a screen reader user is not told the count changed | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-116` | `docs` is a top-level marketing destination and a stranger has no reason to want it | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-119` | The standards page forbids gaming a utility record that does not exist | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-121` | The support reference shown to every user starts with NF, and RN-3's do-not-touch list does not mention it | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-123` | The safety page's four never-ask items do not include the two newest impersonation routes | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-124` | There is no way to verify that a message claiming to be from Vallo is from Vallo | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-125` | There is no filter for the two structured columns that most distinguish a Nigerian property listing from a foreign one, beyond a boolean | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-126` | The map has no way to filter by rent or sale despite the database function accepting it | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-127` | Search has no way to express "near this place", which is how people actually look for property in a Nigerian city | L | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-128` | Sorting cannot express the only ordering a renter actually wants, which is best value | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-129` | Nothing counts a view of a listing, so an agent cannot tell a good listing from an unseen one | L | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-130` | A shared search is a link and nothing offers to share it | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-132` | There is no way to ask to be told when a specific listing becomes available | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-133` | `/rent` exists as a top-level route and I did not audit it | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-134` | The hero's primary button and the header's Explore link point at different places | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-138` | `/u` tells a person places switch on shortly, and the people directory has nothing to do with places | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-143` | The offline page is precached and the offline experience is otherwise nothing | L | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-144` | There is no way for a person to export or see what the platform holds about them | M | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-150` | The four-hour urgent commitment has no path from the app, only from the public site | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-151` | Nothing in the product explains what happens to a listing between submission and publication | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-152` | `experience` should be removed from `ListingKind` rather than added to the database | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A2-008` | Sign-in is counted per address of origin only | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-009` | The one-time code travels in the email subject line | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-010` | The auth email hook has no replay guard | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-015` | Nothing tells a person about a sign-in from a new device | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-017` | The `resolveSession` memo hazard is documented and unguarded | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-018` | Google and Apple sign-in remain, and so do their CSP and env costs | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-039` | The webhook returns a Postgres error message in its response body | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-040` | There is no inventory of what the platform logs | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-048` | `setEntryStatus` read-then-writes metadata with no lock | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-050` | The four escrow functions live in `public`, not `private` | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-058` | The fee console can introduce a non-zero fee with no extra gate | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-059` | `escrow_purpose` cannot express a nightly stay or an inspection fee | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-060` | The crypto deposit path attributes money by an echoed email | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-066` | `platform_revenue` is a fourth zero-policy table and is not on the do-not-fix list | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-070` | The agent application reference exposes a dead brand | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-071` | The elite badge code and label carry a dead brand | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-072` | Two database functions send notifications naming the dead brand | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-073` | The open-work queues have no partial indexes | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-074` | `notifications`, `message_flags` and `audit_log` grow without bound | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-076` | `currency` is a free text column defaulting to NGN | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-077` | `amount_minor` has a lower bound and no upper bound | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-079` | There are no down migrations and no idempotency guarantee | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-081` | There is no correlation id across a request | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-082` | The webhook routes accept a body of any size | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-083` | `script-src` falls back to `https:` for browsers without strict-dynamic | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-084` | Two cross-origin isolation headers are missing | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-086` | The support tools return more personal data into the model than they need | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-088` | There is no written contract for the nine API routes | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-090` | Feature flags are read with the caller's own RLS client | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-091` | `isFeatureEnabled` caches for 30 seconds per instance | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-093` | `withIdempotency` fails open with no visibility | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-094` | The Paystack webhook does not record deliveries it refuses | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-097` | `app/api/support/route.ts` and the assistant have no spend ceiling | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-098` | `NativeRuntime` is defined, documented as mounted, and mounted nowhere | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-099` | Four scratch files sit in the repository root | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-100` | The `(app)/verification` route duplicates the agent wizard's flow | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-111` | There is no role management screen | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-112` | No money action requires two people | L | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-113` | There is no escrow dispute workflow | L | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-114` | There is no fraud and risk surface beyond a count | L | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-116` | There is no export from the console | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-117` | Support tickets have no SLA view | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-120` | `previewCancellation` and `expireStaleWithdrawalHolds` have no confirmation contract | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-129` | There is no staging environment | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-130` | `docs/DATABASE_AUDIT.md` is stale on its own headline finding | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-131` | The eight cron jobs are all scheduled in UTC with no note of the offset at each site | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-132` | Nothing measures the webhook's own latency | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-137` | There is no webhook secret rotation procedure | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-138` | The auth email hook has no rate limit | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-139` | The platform has no SMS channel | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-140` | Basemap tiles come from a provider with a licence problem and no fallback health check | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-143` | The `Icon3D` grep the rules describe returns two hits | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-144` | `npm run test` from the root is a known trap and nothing warns | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-146` | There is no load test and no stated capacity target | L | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-147` | There is no seed or fixture for a local database | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-148` | The eslint config allows `console.warn` and `console.error` with any argument | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-151` | `lib/security/service-rpc.ts` and `lib/wallet/rpc.ts` duplicate the same untyped seam | M | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-155` | There is no dependency update or advisory policy | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A3-009` | Verified is painted emerald where the platform's own token says brand blue | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-010` | `--nf-status-verified` and its surface are defined and almost unused | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-011` | `toneForStatus` gives PENDING and PROCESSING two indistinguishable blues | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-012` | `toneForStatus` calls a refund a danger | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-016` | Copying a receipt reference can fail silently | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-017` | "Share" silently becomes "Copy" where `navigator.share` is absent | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-018` | The "Copied" confirmation is invisible to assistive technology | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-022` | "Payment switches on shortly" is a coming-soon promise on a money screen | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-023` | "Notifications switch on shortly" is the same problem | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-024` | A tick mark sits on three non-success screens | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-026` | `MomentScreen` pops the icon on every variant including warning | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-028` | `MomentScreen` has no focus management | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-030` | Money in a confirmation is a pre-formatted string, not an `Amount` | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-040` | The `verified` marks the ladder should use are `UiIcon` glyphs | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-041` | Nine failure surfaces are cyan. Enforce it once it is fixed | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-043` | Message send and failure are announced to nobody | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-044` | There is no delivered or read state | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-045` | There is no toast system | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-048` | `--nf-crimson-400` and `--nf-rose-400` are the same colour under two names | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-050` | Layer 2 contains raw hexes that layer 1 does not carry | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-052` | `packages/design-tokens/src/index.ts` has one consumer and 192 lines | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-053` | `iconRamp` ships raw literals that are not in the palette and three of them are Tailwind slate | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-054` | `--nf-canvas-bloom-1/2/3` exist and the ambient layer ignores them | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-055` | 343 raw colour literals remain in the stylesheets | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-056` | The soft list in the CSS token checker should be empty | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-058` | `--nf-text-body-sm` is the scale's most useful rung and nothing uses it | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-060` | 29 Tailwind radius keywords bypass the scale | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-065` | `.nf-btn--sm` is declared twice at equal specificity in two partials | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-067` | `ICON_SYSTEM.md` and `BRAND_MARKS.md` both understate `BrandIcon`'s prop surface | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-069` | 61 call sites pass a `UiIcon` size the scale does not have | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-070` | `StatusPill`'s claim that the dot is a non-colour signal is false | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-071` | The `UiIcon` set has no check, clock, alert or info glyph and `StatusPill` says so | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-072` | The brand object plate is the loudest element on a dark screen | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-074` | A `pin-map` object requests a 3840px source and renders at 0x0 on the landing page | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-075` | `BrandIcon` `fill` mode hard-codes a 160px intrinsic size and a landing-page `sizes` string | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-080` | Four of the twelve primitives have three consumers or fewer | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-081` | `components/app/ComingSoon.tsx` is dead code | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-082` | `components/agent/AgentComingSoon.tsx` is dead code | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-083` | `.nf-tag-pill` is a third badge system with three call sites, one of them dead | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-084` | `Button` claims six variants and paints five | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-085` | A loading `Button` is silent to assistive technology | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-086` | A loading `ButtonLink` is still clickable | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-088` | `Sheet` defaults to a single detent and half its capability is unreachable | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-089` | `Sheet`'s title is a raw type value | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-094` | Two `ReportSheet` components exist | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-096` | `Screen.tsx` exports a `TYPE` and `ICON` map that is a third type system | L | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-098` | Five `(app)` routes have no `loading.tsx` | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-104` | `Reveal` reads `prefers-reduced-motion` once and never listens | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-105` | `will-change` is set permanently on 112 reveal blocks | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-106` | `side-nav.css` has three transitions and no reduced-motion handling | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-108` | `utilities.css` has six transitions and one reduced-motion block; `chrome.css` has ten and four | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-109` | Reduced motion removes the animation without substituting a signal in several places | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-110` | The ambient canvas runs four animated layers forever on every page | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-111` | The mirrored artwork span paints the same 1.3MB image a second time | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-112` | The confirmation mark bounces on failure | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-113` | The settings row glyph is centred against multi-line rows | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-114` | The toggle floats mid-row on a four-line row | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-116` | Four settings controls are 50x30 | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-117` | "View all", "Sign in" and "Choose your city" are 22 to 26px tall | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-119` | The theme never follows a live OS change for a user on "system" | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-120` | `applyTextSize` scales the root font size and nothing tests the layout at L | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-121` | Twelve `next/image` elements carry `alt=""` | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-122` | `iconOnly` requires an `aria-label` by convention only | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-124` | Empty-state body copy is centred over five lines | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-125` | Two stacked CTAs render at different widths | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-126` | A settings gear sits on a wallet the visitor cannot open | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-130` | 157KB of fonts load on every page | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-134` | A `pin-map` icon requests the 3840px variant | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-135` | No horizontal scroll at 390px on the five routes I probed, and it should stay that way | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-136` | The home search control is 140px tall at 390px with the CTA inside the field's border | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-137` | Two of five category tiles are effectively invisible at 390px | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-138` | The dock splits into a tab bar and a detached island | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-140` | The category tiles render as three large white squares on the dark canvas | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-141` | The light theme carries a coloured glow under the primary button | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-143` | Three consecutive settings rows read "Not set" with no prompt | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-144` | The greeting says "Good evening" with no name and no fallback design | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-145` | The error digest is shown with no way to send it | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-150` | `--nf-radius-control` is 14px and the buttons in the screenshots read closer to 18px | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-151` | `.nf-card` is nested inside `.nf-card` in places and the stylesheet knows | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-158` | `Screen.tsx` exports `TYPE` and `ICON` and is imported by components in three different folders | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-159` | There is no styleguide route assertion for the confirmation states | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-164` | `build-icon-vectors.mjs --check` fails and nothing runs it | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-168` | No spec asserts theme parity of the state colours | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-169` | `icons-and-targets.spec.mjs` exists and a 26x48 button survives | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-170` | No spec asserts `scrollWidth === clientWidth` | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-171` | The vitest suite runs in 6 seconds and covers no UI | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |

### 6.4 Nice-to-have. 54 entries

| | Id | What is wrong | Effort | Status | Evidence in |
| --- | --- | --- | --- | --- | --- |
|  | `A1-040` | The cancellation schedule is modelled correctly and is the template the rest of the trust surface should follow | - | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-044` | `docs/BADGES.md` uses "hub", which the terminology table bans | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-051` | `/assistant` is not in the robots disallow list, so crawl budget is spent on a page that always redirects | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-055` | Two copies of the assistant wire protocol exist and they have drifted | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-066` | An inspection cannot be added to a calendar | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-071` | A second copy of the interest labels lives in `lib/interests/schema.ts` beside the dictionary's | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-085` | Recently viewed is collected and never used for anything | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-110` | Zero em dashes and zero banned words in my scope, and the specs that keep it that way exist | - | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-111` | 390px discipline is real and measurable in my scope | - | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-113` | The landing page's facts band prints four numbers and two of them are not counts | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-114` | The landing page's app store row says "Available on" for stores the app is not on | - | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-135` | The landing page's city chips are a hardcoded array while the rest of the page is data-driven | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-136` | The welcome screen's redirect condition can strand somebody who skipped | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-139` | The story composer is called "Write a story" and a story is defined as a picture post | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-140` | There is no way to report a listing without leaving the listing | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-141` | The assistant's price string bypasses the locale, so a price in the chat groups its digits differently from the same price on a card | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-142` | `formatMoney` is called with a bare amount in at least one server path, so the default locale decides | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-146` | The notification preference card is the best-executed small thing in my scope and its pattern is not reused | - | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-147` | The intent-tuning gate is exactly right and is worth protecting | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-148` | The sitemap's exclusion of profiles and posts is a decision and should be revisited once there are people | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-149` | The example-listing share card is the right answer and it should be the model for the sale market too | S | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A2-012` | The webhook timestamp window accepts future timestamps | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-019` | `signaturesMatch` compares base64 text rather than bytes | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-087` | The reconcile endpoint returns user ids in its response body | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-089` | `getAdminClient()` builds a new client on every call | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-095` | Nothing bounds the number of Paystack API calls one webhook can make | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-118` | `ADMIN_FORBIDDEN_MESSAGE` is a 403 that confirms the console exists | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-149` | `supabase/README.md` was not checked against reality by this audit | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-153` | `package.json` has no formatter and no `format` script | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-154` | `apps/web/tsconfig.json` carries dead `include` entries | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A2-157` | `lib/security/anon-columns.test.ts` exists and its scope is not stated anywhere | S | OPEN | `A2_ENGINEERING_BACKEND_DB_SECURITY` |
|  | `A3-025` | A page crash is marked with a padlock | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-049` | Four layer-1 palette entries have zero consumers | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-051` | `--nf-content-inverse` is `#0B0D14`, a blue-tinted grey | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-059` | `--nf-radius-circle` has 21 CSS consumers and zero TSX consumers | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-061` | Four genuinely raw radii | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-073` | The same mark has different visual weight in the two themes | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-076` | `TrustIcon` is the only consumer of the token package's JS entry | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-077` | The `symbol effects` system has a documented history of being unused | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-078` | `filled` is silently ignored on non-fillable glyphs | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-087` | `ButtonLink` fires haptics regardless of state | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-090` | `Sheet` has no `aria-describedby` and no content live region | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-091` | `Sheet`'s grip is `aria-hidden` with no keyboard or pointer alternative to resize | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-095` | `Reveal` lives in `components/site` and is used in `(app)` flows | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-097` | `Skeleton`'s own header says the material had zero uses before it existed | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-099` | `MyBookings`, `Inbox` and `TransactionsSection` each build their own filter row | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-142` | The light canvas is a gradient where the rule asks for flat | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-147` | `nf-numeric` exists and money in confirmations does not use it | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-148` | No label is truncated anywhere I checked, and there is a spec for it | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-149` | The dock is 62px tall and sits 6px from the bottom inset | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-157` | `MomentScreen` lives in `components/app` and is the platform's confirmation | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-160` | `AiAssistantBanner` reasons about "the visual grammar of a demo" | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-165` | 82 Playwright specs exist and I ran none of them | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-172` | Two test files are named for banned words | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |

### 6.5 Future. 3 entries

| | Id | What is wrong | Effort | Status | Evidence in |
| --- | --- | --- | --- | --- | --- |
|  | `A1-079` | The wallet is a checkout, not a habit | L | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-082` | There is no push notification path, which is correct today and is the ceiling on everything above | - | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |
|  | `A1-088` | There is no way to pay from outside Nigeria | XL | OPEN | `A1_RESEARCH_PRODUCT_UX_GROWTH` |

### 6.6 Unclassified. 13 entries

| | Id | What is wrong | Effort | Status | Evidence in |
| --- | --- | --- | --- | --- | --- |
|  | `A3-031` | There is no `payment-sent` mark | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-039` | Do not commission `seal-check` | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-068` | All 60 checked-in icon vectors have drifted from the component | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-100` | `social-feed.css` is 2,944 lines, which is what the split was meant to prevent | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-107` | `social-feed.css` has twelve transitions and one reduced-motion block | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-129` | `public/brand/` is 25MB and six further PNGs exceed 800KB | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-131` | `LogoMark` renders two `<Image>` elements and hides one in CSS | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-139` | The ambient artwork's tiled watermarks show through content screens | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-146` | `console.error` is the observability layer | M | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-152` | The CSP blocks `style-src-elem` to `'self'` and the dev server logs three violations per page | S | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-153` | The CSP allows `images.unsplash.com` | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-154` | `editNotLive` is a banned string in user-facing copy | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |
|  | `A3-156` | `admin/fees/page.tsx` renders a percentage from basis points | - | OPEN | `A3_FRONTEND_DESIGN_MOTION_QA` |

---

## 7. The 171 entries carried forward from 9 August

**Nothing here was discarded and nothing was renumbered.** These identifiers
are cited by code comments, by migrations and by both handoffs, so they have to
keep resolving. Their original P0, P1 and P2 priorities are kept rather than
remapped.

**Three of them were corrected by the 15 September audit** and are marked below.
The full evidence for each of these entries is in this file's own history: it
was the previous RECOMMENDATIONS.md, and `git show` on any commit before
15 September 2026 returns it in full.


### 7.1 P0. 26 entries

| Id | What | Status on 9 August | Correction from the 15 September audit |
| --- | --- | --- | --- |
| `N-1` | Signed-out visitors can now browse | DONE | **WITHDRAWN as stated. Signed-out browsing works.** The middleware no longer holds the public routes. What remains is narrower and is `A1-003`: `lib/site/gated-href.ts` still wraps 21 links in a registration redirect, 16 of which are now public. |
| `N-4` | Google and Apple sign in are still in the codebase | OPEN |  |
| `M-1` | The map draws on CARTO tiles, which are non-commercial only | OPEN |  |
| `P-1` | The listing can express a sale | DONE |  |
| `W-1` | The webhook still answers 200 on a misconfiguration, and the money path is still unlogged | PARTLY DONE | **PARTLY DONE.** The dangerous half is fixed: the webhook answers 503 and retries rather than answering 200 and losing the funding. What remains is that nothing alerts on the log line, which is `A2-123`. |
| `W-2` | Nothing is rate limited on the money surfaces | OPEN |  |
| `E-6` | What the escrow UI must never say | NEW |  |
| `LG-1` | The landing page claims NDPA compliance as a fact | OPEN |  |
| `T-1` | 83 browser specs, 8 vitest files, and no CI runs any of them | OPEN |  |
| `CASE-1` | A funding was paid for and the wallet showed zero | OPEN |  |
| `N-6` | There is still no Buy or Sell anywhere in the navigation | OPEN |  |
| `P-8` | A sale listing must be a different page, and nothing decides what it says | NEW |  |
| `E-1` | Escrow has just started, in the right place. Nothing is promised yet | OPEN | **SUBSTANTIALLY WRONG as written.** Escrow is not zero percent built. `public.escrows` has an eight-state machine enforced by a trigger, three locking movement functions, an hourly timeout sweep and an admin screen. What is true is narrower: nothing routes a guest payment into it. Superseded by `G-1`. |
| `E-2` | Add `COMPLETED` to `booking_status`. Escrow is being built around its absence | OPEN |  |
| `E-3` | The state machine | NEW |  |
| `E-7` | Who holds the money is a regulatory question, not an engineering one | OPEN |  |
| `FEE-3` | Disclosure, so that nobody feels ambushed | NEW |  |
| `KYC-3` | Storage, and this is where a mistake is unrecoverable | NEW |  |
| `DEMO-1` | Get real listings before you get fake ones | NEW |  |
| `DEMO-4` | Never sell the badge | NEW |  |
| `MED-1` | There is no size limit anywhere, on anything, at any layer | NEW |  |
| `LG-5` | Escrow and fees each need their own legal answer, and they are different | NEW |  |
| `T-7` | Verification ritual, as it actually is | OPEN |  |
| `VIBE-5` | The empty state is the product right now, and it is being designed as an accident | NEW |  |
| `MOT-2` | What must never move | NEW |  |
| `BE-3` | There is no full-text index, and free text is filtered in the application | DONE |  |

### 7.2 P1. 85 entries

| Id | What | Status on 9 August | Correction from the 15 September audit |
| --- | --- | --- | --- |
| `S-1` | The npm scope, the package description and the repository still say NaijaFinds | OPEN |  |
| `S-2` | Third-party inventory is gone from the code and from the database | DONE | DONE, and confirmed again on 15 September. No inventory provider code remains. |
| `D-1` | Colour enforcement landed. Type and geometry are still unenforced | PARTLY DONE |  |
| `D-3` | Light mode is a real theme and nothing proves it stays one | OPEN |  |
| `N-3` | There is no indexable page for the query the product most wants to rank for | OPEN |  |
| `P-4` | `ListingKind` and `property_type` still disagree | OPEN |  |
| `P-10` | Nothing counts a view of a listing | OPEN |  |
| `W-3` | A complete second wallet deck is dead, taking four exports with it | OPEN |  |
| `W-4` | The P2P transfer form is an email-address oracle | OPEN |  |
| `W-5` | There is no transaction PIN | OPEN |  |
| `W-6` | There is no reconciliation and no drift alert | OPEN |  |
| `KYC-1` | The screens are built and refuse honestly. The storage is not | PARTLY DONE |  |
| `V-1` | An agent can see the verification ladder and cannot climb it | OPEN |  |
| `V-4` | `private.probe_as` is dropped | DONE |  |
| `V-5` | Leaked password protection is still off | OPEN |  |
| `O-2` | All 18 posts are `author_kind = 'SYSTEM'` | OPEN |  |
| `AI-1` | The assistant persists threads it never reads back | OPEN |  |
| `EM-2` | Nothing proves a transactional message was delivered | OPEN |  |
| `EM-4` | `EMAIL_FROM` must be a verified sender | OPEN |  |
| `LG-2` | The privacy policy names no controller and no officer | OPEN |  |
| `SEC-1` | The Content Security Policy enforces | DONE |  |
| `SEC-5` | A person can see where they are signed in and end it | DONE |  |
| `SEC-6` | The public browse surface, threat-modelled | PARTLY DONE |  |
| `MOB-1` | Capacitor is installed, both native projects generate, no native build has ever run | OPEN |  |
| `MOB-2` | Apple guideline 4.2 is an argument, not a guarantee | OPEN |  |
| `MOB-5` | `@capacitor/assets` writes two files that must be deleted after every run | OPEN |  |
| `RN-3` | The one thing the rename must not touch | NEW |  |
| `T-2` | The node specs are run by hand and the invocation is a known trap | OPEN |  |
| `T-5` | Four specs skip loudly when the catalogue is empty. Do not make them pass | OPEN |  |
| `T-6` | Em dashes are confined to the archive | DONE |  |
| `T-8` | Specs this document now asks for, collected | NEW |  |
| `BE-2` | The catalogue's default ordering has no index behind it | DONE |  |
| `D-2` | The retired reference brief is still in the code | PARTLY DONE |  |
| `N-2` | Nothing tells a crawler anything | OPEN |  |
| `M-3` | Listings have no enforced coordinates, so the map places by area centroid | OPEN |  |
| `M-4` | PostGIS is installed and nothing uses it | PARTLY DONE |  |
| `M-5` | Viewport loading: the map should ask for what is on screen | NEW |  |
| `M-6` | Debouncing, and the specific numbers | NEW |  |
| `M-7` | Clustering by zoom tier, not by pixel grid alone | NEW |  |
| `M-8` | Marker design | NEW |  |
| `M-9` | Map and list split on desktop, map with a bottom sheet on mobile | NEW |  |
| `M-10` | Search this area | NEW |  |
| `P-2` | The rental fee breakdown landed, and it needs a UI contract | DONE |  |
| `P-5` | Generate the database types in CI | OPEN |  |
| `P-7` | `listing_intent` has no value for a nightly stay, and three markets share two labels | NEW |  |
| `P-11` | `public.listing_videos` exists and nothing writes to it | NEW |  |
| `W-8` | `bestEffortEmail` and the bare webhook catch are the same anti-pattern in two places | NEW |  |
| `E-4` | The dispute flow | NEW |  |
| `E-5` | What the escrow UI must explain | NEW |  |
| `FEE-1` | The ledger already models a platform fee and it is always zero | DONE |  |
| `FEE-2` | Rates need a table, and the table needs effective dates | NEW |  |
| `FEE-5` | The fee engine needs tests that run while every rate is zero | NEW |  |
| `KYC-2` | Document types, for Nigeria specifically | NEW |  |
| `KYC-4` | The review workflow | NEW |  |
| `KYC-5` | Rejection reasons, re-verification and expiry | NEW |  |
| `KYC-6` | Title documents are a different check and must not be conflated | NEW |  |
| `V-2` | There is no identity verification standard for payouts | OPEN |  |
| `V-6` | The four trust signals are separate and the UI will conflate them | NEW |  |
| `DEMO-2` | If demo listings are built anyway, these are the non-negotiables | NEW |  |
| `DEMO-3` | The honest ways to make an empty platform feel alive | NEW |  |
| `MED-2` | Video upload is not built at all | NEW |  |
| `O-5` | Nothing connects the social layer back to the catalogue | OPEN |  |
| `AI-4` | The assistant must not answer questions about escrow, fees or verification from its own model | NEW |  |
| `EM-1` | The email system is rebuilt as a block composer | DONE |  |
| `MOB-3` | Both association files exist. Two values in them are placeholders | OPEN |  |
| `MOB-7` | Permissions and usage strings | NEW |  |
| `MOB-8` | Safe areas | NEW |  |
| `MOB-9` | Store metadata and data safety declarations | NEW |  |
| `MOB-10` | Signing | NEW |  |
| `RN-2` | The safe sequence | NEW |  |
| `T-9` | Two places draw the signed-out line and nothing checks they agree | NEW |  |
| `T-10` | The mirror drifted twice, and is now repaired. Add the check | NEW |  |
| `VIBE-1` | There is no spacing scale. Thirty-three step values are doing the work of six | NEW |  |
| `VIBE-2` | When a container earns its existence | NEW |  |
| `VIBE-3` | Surface hierarchy: four levels, and the product should never use a fifth | NEW |  |
| `VIBE-4` | How a screen should open | NEW |  |
| `VIBE-8` | Photography is the product and there is none | NEW |  |
| `VIBE-12` | Write the vibe down where an agent will read it | NEW |  |
| `MOT-1` | The motion language: six movements, and the product should not have a seventh | NEW |  |
| `MOT-4` | Skeleton to content is a replacement, not a transition | NEW |  |
| `MOT-5` | Optimistic updates need a visual grammar and have none | NEW |  |
| `MOT-8` | Ten literal durations escape the reduced-motion safety net | NEW |  |
| `MOT-10` | Realtime arrivals must respect the reader's position | NEW |  |
| `BE-10` | Nothing on the public surfaces is cacheable, because everything reads cookies | NEW |  |
| `BE-11` | The webhook and the reconciler are the only routes that must never be slow, and neither is measured | NEW |  |

### 7.3 P2. 48 entries

| Id | What | Status on 9 August | Correction from the 15 September audit |
| --- | --- | --- | --- |
| `S-3` | Restaurants and hotels are in the taxonomy and have no supply story | OPEN |  |
| `S-4` | The lexicon is settled and only partly enforced | PARTLY DONE |  |
| `D-4` | Two sheet implementations, one bug fixed and the duplication left | OPEN |  |
| `D-5` | The `.nf-icon-chip` wrapper documented in the icon system does not exist | DONE |  |
| `N-5` | ADR-007 describes a flat twelve and the navigation is a grouped tree | OPEN |  |
| `M-11` | Discovery items that still need inventory before they can be checked | PARTLY DONE |  |
| `P-6` | `public.saved_searches` still has no writer and no screen | OPEN |  |
| `P-9` | Nothing records a listing's status history | OPEN |  |
| `W-7` | Refunds go to the wallet first and there is no bank fallback | OPEN |  |
| `V-3` | Badges are built and awarded nightly | DONE |  |
| `V-7` | `message_flags`, `risk_alerts` and `reports` record a status and not a reviewer | OPEN |  |
| `O-4` | Media for a removed post stays in storage | OPEN |  |
| `AI-2` | The assistant's tools have no caller context | OPEN |  |
| `AI-3` | The cost ceiling exists and is not alerted on | OPEN |  |
| `EM-3` | The five auth templates must be pasted in by hand | OPEN |  |
| `LG-3` | There is no cookie or storage consent, and there may be nothing to consent to | OPEN |  |
| `LG-4` | Rental and sale agreements are not modelled and will need legal input | OPEN |  |
| `SEC-2` | Two high severity npm advisories, both lint-time only | OPEN |  |
| `SEC-3` | The database advisors, re-read today | PARTLY DONE |  |
| `PERF-4` | `apps/web/tsconfig.json` carries ten dead `include` entries | OPEN |  |
| `MOB-4` | Push notifications are not wired, and that is the right order | OPEN |  |
| `MOB-6` | A 1024px master of the house-and-R mark would remove the one enlargement | OPEN |  |
| `D-6` | There is no visual regression guard on any of the above | NEW |  |
| `M-2` | Leaflet's stylesheet ships on every page. Deliberately | WITHDRAWN |  |
| `FEE-4` | What is actually chargeable, and in what order | NEW |  |
| `MED-3` | Image handling has real gaps beyond the size limit | NEW |  |
| `O-3` | Two hardcoded `en-NG` number formats remain, and the measurement says leave them | OPEN |  |
| `SEC-4` | The middleware matcher hole is fixed and the lesson generalises | DONE |  |
| `SEC-7` | Two column exposures that need a design decision, not a grant | NEW |  |
| `PERF-5` | Orphan modules | PARTLY DONE |  |
| `PERF-6` | Nothing measures anything in production | NEW |  |
| `T-4` | Four specs fail and none is caused by application code | OPEN | Still open and **not re-verified**: the Supabase tools could not reach the project from this session. |
| `VIBE-6` | `--nf-text-hero` is declared and used nowhere | NEW |  |
| `VIBE-7` | Density is a per-surface decision and the product has not made it | NEW |  |
| `VIBE-9` | Nigerian, without costume | NEW |  |
| `VIBE-10` | The signed-out face and the signed-in face are different products and should look it | NEW |  |
| `VIBE-11` | One motion vocabulary per meaning, and the product already violates it in three places | NEW |  |
| `MOT-3` | Ambience is a separate budget and it has different rules | NEW |  |
| `MOT-6` | Five confirmations, one meaning | NEW |  |
| `MOT-7` | Spring is a special effect and it is being used as a default | NEW |  |
| `MOT-9` | Hover is a desktop idea and this is a phone product | NEW |  |
| `MOT-11` | View transitions are wired and used for one thing | NEW |  |
| `MOT-12` | Nothing tests any of this | NEW |  |
| `BE-4` | The amenity filter reads up to 5,000 join rows and intersects them in Node | NEW |  |
| `BE-5` | Review statistics are computed in Node from raw rows | NEW |  |
| `BE-6` | Every catalogue read pulls the whole listing, including the parts nothing renders | NEW |  |
| `BE-13` | Realtime subscribes per conversation and nothing bounds the channel count | NEW |  |
| `BE-14` | Cold start is the real latency and nothing measures it | NEW |  |

### 7.4 No priority recorded. 12 entries

| Id | What | Status on 9 August | Correction from the 15 September audit |
| --- | --- | --- | --- |
| `O-1` | The social layer is built, and three documents told the next agent to build it | DONE |  |
| `PERF-2` | Fonts are self-hosted, preloaded and correct | DONE |  |
| `PERF-3` | Images all have reserved boxes | DONE |  |
| `RN-1` | The measurements, taken today | NEW |  |
| `P-3` | `price_per_night_minor` is now `rate_minor` | DONE |  |
| `PERF-1` | Home was 3.6MB of imagery and is 28KB under Save-Data | DONE |  |
| `T-3` | `pg_cron` is installed and running six jobs | DONE |  |
| `BE-1` | `resolveSession` is not memoised, so one page render makes several identical auth round trips | NEW |  |
| `BE-7` | `recommended()` reads two hundred listings to show six | NEW |  |
| `BE-8` | `listings_in_bounds` exists, is granted to `anon`, and nothing calls it | NEW |  |
| `BE-9` | Three in-process caches, three implementations, no shared behaviour | NEW |  |
| `BE-12` | The CSP report endpoint keeps an unbounded, caller-keyed map | NEW |  |

---

## 8. What no agent checked, and what this file therefore does not know

Stated here rather than at the end of three separate reports, because it
governs how much weight any number above can carry.

- **No agent reached the live database.** Every database claim in all 474 new
  entries comes from the migration files and the generated types. The Supabase
  tooling available to this session authenticates as a different account and
  cannot see project `uccixoonmbhrnyczyigt` at all.
- **The 82 Playwright specs were not run.** They need a server and a database.
  The 44 vitest files were run on every commit and pass.
- **Nobody rendered a signed-in screen.** One agent got a dev server up and took
  seven screenshots at 390px, all signed out. Every finding about a confirmation
  screen is source reading.
- **Accessibility was not measured.** No axe, no screen reader, no contrast
  measurement. The rating is a source-level judgement and should be read as a
  ceiling, not a score.
- **Performance was measured once**, at 390px against the running build, before
  the artwork was deleted. Those numbers are now historical.
- Nine entries are marked Unverified inside the reports themselves, and two are
  corrections where an agent's first conclusion was wrong and both versions were
  kept visible.

