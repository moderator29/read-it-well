# The release condition on a proposal: a decision paper

**For the founder. This is not a build and nothing here is implemented.**
Research 4.2 asks the compose sheet for "the release condition, chosen from a
short list rather than typed, because a free-text release condition is a
contract nobody can adjudicate". ADR-E1 section 5 item 2 deferred it rather
than inventing it, on the ground that "a list invented today would be a list
the adjudication desk has never had to read". That deferral was right and it is
not reopened by writing this. What is reopened is the QUESTION, so that when it
is answered it is answered on purpose.

**Scope: the agency fee leg and nothing else.** `agency_fee` is the one purpose
the gate opens (ADR-E1 section 2). `purchase_deposit` is refused until a
trustee structure is signed, `purchase_balance` is refused permanently, and
`rent_deposit` and `first_rent` are refused. **Everything below is about one
transaction: a person pays an agent's fee, and that fee is held until the agent
has done the thing they were paid for.** None of it generalises, and a future
reader opening `purchase_deposit` should treat this file as inapplicable rather
than as a head start.

---

## 1. The thing that has to be decided first, before any vocabulary

**Can the platform observe the event the money is waiting on?**

For an agency fee in Nigeria, the events that end the service are: a viewing
happened, a tenancy agreement was signed, keys changed hands, the agent did
what they said they would do. **Vallo can see none of them.** There is no
signing integration, no key handover, no inspection that gates the money, and
no third party reporting any of it. The platform sees two people in a thread
and a balance.

That single fact decides the shape of the whole feature, and it is worth
stating before anybody reaches for a list of conditions:

> **A release condition cannot be a trigger, because there is nothing to
> trigger on. It can only be a STATEMENT OF WHAT THE MONEY IS FOR, recorded at
> the moment both people still agree, and read by whoever has to decide later.**

Anything built on the other premise, that the platform detects the condition
and releases, is building an automation whose sensor is a person pressing a
button. That sensor already exists and is called confirmation.

---

## 2. What already decides release today, stated so the gap is visible

Four things move money out of a held agreement, and all four are built:

| Route | Who decides | What it needs |
| --- | --- | --- |
| Both parties confirm | the two of them | `escrow_confirm_as`, from either side |
| One asks, the other lets it stand | the payee asks, the payer does not dispute | `escrow_request_release_as` |
| The window runs out | nobody; the date does | `auto_release_at`, set from the hold days at funding |
| Vallo rules on a dispute | the adjudication desk | `escrow_admin_resolve`, one ruling only, at least 20 characters, delivered verbatim to both parties |

**The gap is not in the routes. It is in the fourth one.** When two people
disagree, the desk reads the thirteen filed facts and the attached files, and
it has **no statement of what was supposed to happen**. One party files "The
work was done", the other files "The work was not done", and nothing in the
agreement says what "the work" was. The desk is then deciding a contract term
that was never written down, from a thread.

**That is the whole case for a release condition, and it is an adjudication
case rather than an automation case.**

---

## 3. What it would have to be able to express

Derived from the one transaction in scope, not from a general model of escrow.

1. **One completion event, named in the words both parties already use.** Not a
   description of the service, not a scope of work. One thing that either
   happened or did not.
2. **It must be the same thing a disputing party can later file as evidence.**
   If the condition is expressed in one vocabulary and the evidence in another,
   the desk translates between them, and a desk that translates is a desk that
   decides on the translation.
3. **It must be legible as a fact rather than as a promise.** "This is for: the
   keys being handed over" is a statement about the transaction. "Vallo
   releases when the keys are handed over" is a statement about what this
   company does with money, and ADR-E1 section 1 forbids the product saying
   anything about who holds it or what they will do with it until the solicitor
   has answered.
4. **It must not carry free text, a date the parties invent, or a number.** The
   amount is already a field. The window is already a field, shown as a date.
   A third place to type is a third place to put an address, a bank account, a
   NIN, or a sentence that reads as a contract.
5. **It must be settable once, by the proposer, and never edited afterwards.**
   An agreement whose terms can change after it is funded is not an agreement.
   The counterparty's answer to a condition they do not accept is **Decline**,
   which exists and works.

---

## 4. THE VOCABULARY IS NOT INVENTED. IT ALREADY EXISTS.

This is the part that makes the feature small, and it is the reason the
deferral can be closed without anybody making a list up.

`apps/web/src/lib/escrow/copy.ts` already carries a **closed set of thirteen
facts**, mirrored by an enum in the database and by check constraints that say
which of them carry a date and which carry an amount. They are what a party
files as evidence in a dispute today, and they are what the desk reads. Each
one "either happened or did not", with no free text beside it.

Four of the thirteen are candidate completion events for an agency fee:

| Fact, as the database spells it | The line a person reads |
| --- | --- |
| `agreement_signed` | An agreement was signed |
| `keys_received` | The keys were handed over |
| `service_delivered` | The work was done |
| `viewing_attended` | The viewing happened |

**A release condition should be one of these, and nothing else.** Then the
condition at proposal time and the evidence at dispute time are the SAME WORD,
the desk compares like with like, and the answer to "was the condition met" is
"a party filed `keys_received` and the other party did not file
`keys_not_received`" rather than a reading of somebody's prose.

The negative halves of the same pairs already exist too
(`agreement_not_signed`, `keys_not_received`, `service_not_delivered`,
`viewing_missed`), which means the disagreement has a shape before anybody
builds one: **two facts from the same pair, filed by the two sides.**

**A note on `viewing_attended`, because it is the odd one.** It is the only
candidate that carries a date, and a fee held against a single viewing is a
different and smaller transaction than a fee held against a let. It is listed
because it is in the set, not because it is recommended. Whether it is offered
is a decision in section 8.

---

## 5. What adjudicates it

**Nothing automatic, and that is the recommendation rather than a limitation
being apologised for.**

- **Neither party's filing releases money.** A condition is not met because
  somebody says it is. `service_delivered` filed by the payee is that party's
  claim, and it is already recorded as such.
- **The condition does not shorten the window.** `auto_release_at` is set at
  funding and stays the only clock. A condition that accelerated release would
  be an automation whose sensor is one person's button.
- **The condition does not lengthen it either.** A held payment that never
  releases because a condition was never met is money stuck in a float that
  ADR-E1 section 3 books as a liability of a company that has not decided
  whether it may hold it at all. **An unmet condition must not be a reason to
  keep holding.**
- **The desk is the adjudicator, and the condition is a QUESTION PUT TO THE
  DESK, not an answer given to it.** It changes the desk's job from "decide who
  is right about an unstated expectation" to "decide whether one named thing
  happened", which is a question a person can answer from files and facts.

The ruling machinery for that already exists and is proved: `escrow_admin_resolve`
takes a direction and a note of at least twenty characters, refuses a second
ruling, and delivers the note verbatim to both parties. The condition would
appear in the desk's view of the agreement and in that note's context. **No new
verb, no new state, no new money path.**

---

## 6. What happens when the two parties disagree

The honest answer today, and the honest answer with a condition, differ in
exactly one place.

**Today.** Either party raises a dispute, which stops the clock and moves the
agreement to DISPUTED. Both file facts and files into their own folder, which
neither can edit or delete. The desk rules once, in writing, and the ruling
credits one side. If nobody disputes, the window expires and the money goes to
the payee.

**With a condition.** Identical, except that the desk opens the agreement and
reads one line that both parties saw before any money moved. The two facts from
the same pair sit under it. **The condition does not break the tie by itself,
and the paper should say so to whoever builds it:** a payer who filed
`keys_not_received` against a condition of `keys_received` has not won; they
have asked a question the desk can now actually answer.

**The case that has to be answered out loud before this ships.** A condition is
met and the payer still refuses to confirm. Nothing changes: the window runs
out and the payee is paid, exactly as now. **There is no mechanism in which a
met condition pays anybody early, and if the founder wants one, that is a
different decision with a different risk, because it is the first mechanism in
this product where a person's own assertion moves money.**

---

## 7. The smallest shippable version

**One column, four values, one sentence on two screens, and no behaviour
change.**

| Piece | What it is |
| --- | --- |
| Database | one nullable column on `escrows`, typed as the existing fact enum, constrained by a one-line `private.` function to the subset agreed in section 8, in the same shape as `private.escrow_purpose_is_open` |
| Who writes it | `escrow_propose_as`, at proposal time, from the proposer. Never updated afterwards, which is a constraint rather than a convention |
| Where it is read | the proposal card in the thread, the agreement screen for both parties, the receipt, and the adjudication desk |
| What it changes | nothing. No transition, no clock, no verb, no money path |
| What it must never render as | a promise. The line is "This is for: the keys being handed over", never "Vallo releases when" |

**Cost if it turns out wrong: one column and one sentence.** Deliberately, and
for the same reason the custody sentence is a function rather than a rule.

**Version zero, which is worth considering and is cheaper still.** Because
exactly one purpose is open, the condition could simply be DERIVED: every
agency fee is for the work being done. No column, no choice, one sentence on
the card. **The argument against it is the only argument that matters here:**
the desk needs the parties' own statement made at the time, not a derivation
this codebase makes afterwards, and "the work" is precisely the phrase that two
people disagreeing about an agency fee mean different things by. That is the
whole reason the desk is stuck today. **If the founder does not want the
column, version zero is honest and should ship with its weakness written down
rather than the column being half built.**

---

## 8. Options I would refuse, and why

### Refused: free text

Research 4.2 already refuses it and it is restated here with the harm named,
because "chosen from a short list" reads as a UI preference and it is not.

A typed release condition is a **contract term drafted by one party, in a
thread, that Vallo then has to interpret with somebody's money in the middle.**
It is also the only field on this surface with no shape, which makes it the
place a bank account, a phone number, an address or a NIN gets typed and then
rendered by us on a receipt, against rule 16. And it is where a person writes
"Vallo will protect this money", which is a claim about custody that ADR-E1
section 1 exists to keep off every surface, made in a user's own words on our
page. **Refused outright, in any wording, including a free-text field "for
extra detail" beside a chosen condition.**

### Refused: a condition the platform claims to verify

"Releases when the tenancy agreement is uploaded" sounds like the strongest
version and is the most dangerous one in this file. **Uploading a PDF is not
evidence that a tenancy was signed.** A release triggered by a file arriving is
a release triggered by whoever can put a file in a bucket, which after the
evidence work of 23 September is either party, into their own folder. It
converts a document into a payment instruction and it does so silently, because
the person uploading believes they are filing evidence. **Refused.** If a
document is ever to release money, that is a signing integration with a
counterparty who attests, and it is a different product.

### Refused: a third party as the condition

"Releases when the solicitor confirms", "releases when the inspector signs
off". It puts the money's fate in the hands of somebody with no account, no
obligation to us, no deadline they have agreed to, and no way to be chased.
The predictable outcome is money held indefinitely in a float that the company
has not established it may hold, which is the one thing ADR-E1 section 1 says
must not be allowed to grow while the question is open. **Refused while custody
is undecided**, and it should be re-argued from scratch afterwards rather than
inherited from this paragraph.

### Refused: a negative condition

"Releases unless the payer objects within seven days." That is the auto-release
window we already have, restated as though it were an agreement. It would print
a second countdown beside the real one, and two clocks on a money screen is the
shape of a dark pattern whether or not it was meant as one. **Refused**, and
the existing window is shown as a date rather than a count of days for the same
reason.

### Refused: more than one condition per agreement

The moment two conditions combine, somebody has to say whether they are AND or
OR, and the desk is adjudicating a boolean expression written by a layperson.
**One agreement, one condition.** Two things to be satisfied is two agreements,
and the thread permits one open agreement at a time by design, so that would
need arguing on its own merits rather than arriving through this door.

---

## 9. What the founder actually has to decide

Nothing here is engineering and nothing below can be decided in this
repository.

1. **Column or version zero.** Is the condition chosen by the proposer from a
   short list, or derived from the purpose and printed as one fixed sentence?
   Section 7 recommends the column and says plainly what version zero costs.
2. **Which of the four.** `agreement_signed`, `keys_received`,
   `service_delivered`, `viewing_attended`. My reading is the first three:
   `viewing_attended` describes a different and smaller transaction, and
   offering it invites a fee to be held against a single viewing, which is a
   product decision rather than a list entry.
3. **Whether a met condition may ever pay early.** Section 6 says it may not,
   today. Changing that is the first mechanism in this product where one
   person's own assertion moves money, and it should be decided as that rather
   than as a convenience.
4. **Nothing here unblocks anything.** The feature is switched off: there is no
   `held_payments` flag row, so every money path in it refuses right now, and
   conditions 1, 2 and 9 of the gate in ADR-E1 section 6 are not engineering
   work. **A release condition is worth deciding before the first real
   agreement, and it is not worth waiting for.**
