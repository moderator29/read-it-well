# Blind spots: what the master spec does not cover

**From Session 1, 5 October 2026.** The Second Follow-Up Addendum instructs Session
1 to find what the previous audits and the spec itself may have missed, so that
Vallo does not enter implementation with a gap that could have been found first.

This document is that list. **Everything here is absent from the master prompt and
its three addendums.** Each item was verified against the codebase, not guessed.
Where something exists in the product but not in the spec, that is flagged too,
because a spec that does not know what already exists will have a session rebuild
or contradict it.

Severity: **S1** would damage customers or the company. **S2** blocks or badly
distorts a feature the spec does ask for. **S3** matters but can wait.

---

## 1. Infrastructure and environment

### B-01. There is no staging database. S1

Verified: one Supabase project, `uccixoonmbhrnyczyigt`, is the only one in
`docs/ENVIRONMENT.md`. Every test, probe and manual check therefore runs against
**production** or a local instance.

The spec asks for escrow, wallets, withdrawals, wallet-to-wallet transfers,
disputes with money outcomes, an immutable ledger and reconciliation. **None of
that can be safely developed against the live database holding real customers.**
Payluk itself has a staging environment and a test bank; Vallo has nowhere to point
it.

What is needed: a second Supabase project as staging, the migration chain applied to
it, seeded fixtures, and CI probes pointed there instead of at production. This
should land before the first line of escrow code, not after.

### B-02. No environment promotion path. S2

There is no documented route for a migration to go staging, then production, with
the same chain and a recorded outcome. `APPLIED.txt` and `RENAMED.txt` track live
history by hand, and 33 migration files were edited after they were applied. With
money tables arriving, hand-tracking stops being adequate.

### B-03. Secrets have no rotation plan. S2

The spec's security section covers access control but not credential lifecycle.
There is a known un-rotated Firebase service account key from 23 September, and
Payluk, Paystack and identity-provider keys are about to be added. Needed: an
inventory of every secret, its owner, its rotation interval, and the procedure.

### B-04. No load or capacity testing. S3

Nothing establishes how many concurrent users the stack serves. Live Supabase
allows 60 connections and the plan is Free. The first marketing push is the load
test, which is the wrong time to find out.

---

## 2. Money the spec does not mention

### B-05. Nigerian tax is entirely absent. S1

Verified: no withholding tax, stamp duty or VAT logic exists anywhere, and the spec
never mentions tax. For a platform transacting tenancies and sales in Nigeria:

- **Stamp duty** is payable on a tenancy agreement, and Vallo generates the
  agreements.
- **Withholding tax** applies to rent paid to corporate landlords.
- **VAT** applies to service fees, including any commission Vallo charges and any
  paid service it sells.
- **Capital gains** considerations arise on property sale, which the spec wants
  Vallo to facilitate.

Nothing here is a feature Vallo can quietly skip: the move-in breakdown already
itemises agency, legal and agreement fees to the naira, so a tax line that is
missing will be noticed by the first corporate landlord or the first auditor.
Needs counsel plus a tax line in the True Cost Engine.

### B-06. Card chargebacks are not handled, and are not the same as disputes. S1

Verified: no chargeback handling exists. The spec has a detailed dispute system for
escrow, but a **chargeback is the card network reversing a payment after Vallo has
already released money to a lister.** That is a direct loss to Vallo or an
unrecoverable debt from the lister.

Needed: a chargeback state on transactions, a notification path from Paystack, a
recovery process against the lister, a reserve or liability account for the
exposure, and a rule about whether a lister with an open chargeback can be paid.

### B-07. Failed and returned payouts. S2

The withdrawal flow in the spec ends at "Completed". Real payouts fail: dormant
accounts, name mismatches, closed accounts, bank downtime. Money then sits in limbo
with the provider. Needed: a failed-payout state, a retry policy, a reconciliation
of money sent against money landed, and a screen that tells the person the truth.

### B-08. The existing Vallo Guarantee is not in the spec at all. S1

The spec describes escrow as the protection model and never mentions the **Vallo
Guarantee**, which is live: a reserve funded at 150 basis points from every
settled charge, with a 72-hour claim window, an append-only
`guarantee_reserve_entries` ledger, claims, staff decisions and payouts.

Two protection systems now exist and the spec reconciles neither. This is resolved
in `docs/payments/VALLO_PAYMENTS_ARCHITECTURE.md` section 3A.4 as one protection
per rail, but it needed finding first.

### B-09. Other live money machinery the spec omits. S2

All of these exist, work, and are absent from the spec, so a session reading only
the spec would duplicate or break them:

- **The caution deposit register**: obligations, deductions, returns, contests and
  staff rulings, with the caution paid to the lister and Vallo keeping only the
  record.
- **Flatmate rent splitting**: contributors on naira shares, one charge per payer
  against one booking, a locked split after the first paid share, and per-share
  refunds with their own retry path.
- **The refund clock**: three stamps per refund, a five Nigerian-business-day
  promise measured against a public holidays table, and an overdue report.
- **Frozen move-in quotes and frozen cancellation terms**, so a listing edited
  later cannot change what somebody was quoted or what prices their refund.
- **Payment attempt discipline**: one open attempt per payer per charge, resumed
  rather than duplicated, with an abandoned sweep.

### B-10. No lister remittance advice or tax statement. S3

Earnings statements exist, but nothing a lister can hand an accountant: gross,
deductions, fees, tax withheld, period, per property.

---

## 3. Compliance the spec does not mention

### B-11. The live AML and SCUML control set is absent from the spec. S1

Eight SCUML obligations are live and probed: beneficial-ownership mandates before
publish, suspicious transaction reports with two-person approval and tipping-off
protection, threshold reporting on every settled charge with structuring detection,
politically exposed persons, risk classification, and sanctions screening with
two-person list management.

The spec's "legal and compliance boundaries" section does not mention any of it.
**Introducing wallets, transfers and withdrawals changes every one of these
controls**, because the observers watch charges and refunds, not balance movements.
Wallet-to-wallet transfer in particular is an unobserved money movement today, and
transfers between users are exactly what a threshold and structuring observer
exists to see.

### B-12. Sanctions screening currently cannot pass. S2

Every screening records `no_list`, never `clear`, because no real list is loaded.
The spec asks for fraud radar and trust but never mentions this, and it is founder
input, not engineering.

### B-13. Wallet KYC tiering is missing from the spec. S2

The spec has customer onboarding states but no limit tiers. Nigerian wallet products
carry balance and transaction limits by verification level. Without tiers, either
everyone is limited to nothing useful or the product is offering an unlimited
unverified wallet.

### B-14. NDPA machinery exists and is unmentioned. S3

A retention schedule, a self-serve data export, a by-request subject access route,
and an account purge that anonymises in place are all live. The spec's privacy
section does not reference them, and the deletion-and-retention audit it asks for
should start from them.

---

## 4. The referral engine's hidden dependency

### B-15. Referral qualification depends on phone verification, which is off. S1

The spec's qualification flow is: signup, **email verification, phone
verification**, onboarding activity, anti-abuse checks, qualification. And the
anti-farming section names **verified phone number** as the first real identity
signal, precisely because email is not sufficient.

Verified: phone sign-in and phone confirmation are built but sit behind
`PHONE_SIGNIN_ENABLED`, which is off, and switching it on needs an SMS provider
account the founder does not yet have.

**So the referral engine cannot qualify a single referral until an SMS provider is
bought and the flag is on.** Nothing in the spec connects these two facts, and it
is the kind of dependency that is discovered three weeks into the build.

### B-16. The reward floor arithmetic is hostile. S2

₦76 per qualified referral against an ₦80 minimum withdrawal means one referral can
never be withdrawn. Either that friction is deliberate, in which case it will be
screenshotted and resented, or it is accidental.

### B-17. Payout cost can exceed the reward. S2

A bank payout of ₦80 may cost more in provider fees than the reward is worth, so a
withdrawal can be loss-making per transaction. The spec asks Session 1 to evaluate
payout costs, and this is the answer: at that size, cash payout economics only work
with a floor well above the fee, or with booking credit, which has no payout fee at
all.

### B-18. No reversal mechanics for a refunded booking. S2

`Reversed` is listed as a status with no rule behind it. If a referral qualified on
a booking that is later refunded or charged back, the reward must claw back, and
that interacts with whether it was already withdrawn.

---

## 5. Product areas the spec omits

All of these exist in the product and are missing from the spec, which means a
session working from the spec alone would not know to keep, improve or connect them.

### B-19. Restaurants and table reservations. S2
A whole market with its own booking shape, windows and per-head pricing. The spec's
space model does not account for it.

### B-20. Price Check and area price intelligence. S3
Built, with its own event table, and currently returning nothing because all 64
listings are demo. The spec asks for Market Intelligence without noticing this is
the beginning of it.

### B-21. Tools that exist and are unmentioned. S3
The move-in cost calculator, saved searches with alerts, saved-listing comparison,
the viewing day kit, the landlord line, the trusted contact and safe link, the
receipt verification door, and the agent check door.

### B-22. Tools that do not exist and should. S2
For the markets the spec explicitly wants:

- **Affordability calculator**: what rent or price a person can carry. Verified
  absent, and the spec wants Diaspora and buy-side.
- **Rent versus buy comparison.** Absent.
- **Rental yield and payback for investors.** Absent, and the spec wants investor
  and diaspora audiences.
- **Listing completeness and photo quality scoring**, which is how supply quality
  improves without a human reviewing every listing.
- **Document checklist generator** per transaction type, which is where Nigerian
  property transactions actually go wrong.

### B-23. Firm and team workspaces are half-blocked. S2
The spec wants team and organisation permissions. Verified: `admit_firm_member`
refuses the firm-member role today and the firm setup door redirects away. So the
feature the spec describes is partly unreachable.

### B-24. Account recovery and the email-change rule. S2
A member who loses their email currently loses their account, and with wallets
arriving they would lose money with it. Account recovery exists as an admin desk;
the spec never mentions the policy question.

### B-25. Support, staff scopes and the operations handbook. S3
Nine staff scopes, a support desk, a staff handbook a unit test reads. The spec's
admin sections do not reference any of it.

---

## 6. Design and design-system gaps

### B-26. There is no data visualisation system. S1 for the analytics work
The spec asks for Space Analytics, Listing Intelligence, Market Intelligence and
admin analytics, all of which are charts. **No chart system, no chart primitives and
no chart colour rules exist**, and the palette is deliberately one hue, so the
normal approach of one colour per series is unavailable.

Needed before any analytics screen: chart types per question, a categorical ramp
that works in both themes within a single-hue brand, empty and sparse states (the
hatched-bar pattern from the references), axis and label rules, tooltip behaviour,
and accessible non-colour encoding.

### B-27. No map design system. S2
Pins, clusters, selected and hovered states, heat, bounds, the empty viewport, and
the "listing has no pin" case. PostGIS and `listings_in_bounds` exist and nothing
calls them; pins currently sit on area centroids.

### B-28. No print and PDF design. S2
The spec wants receipts, statements and agreements. Those get printed, emailed and
taken to banks and lawyers. A receipt that looks like a screenshot is not evidence.
Needed: a print stylesheet and a PDF layout for receipt, statement and agreement.

### B-29. Email is not treated as a design surface. S2
The spec says docs, legal and landing must look like one product and omits email,
which is where receipts, agreements and notifications actually reach people. Forty
notification events and a lifecycle set exist.

### B-30. Photography and image treatment are unspecified. S2
Aspect ratios, crop rules, the minimum acceptable listing photo, placeholder and
blur-up behaviour, how a one-photo listing looks beside a twenty-photo listing, and
what a gallery does on a slow connection.

### B-31. Localisation design is unaddressed. S2
Four locales ship and 57 sentences per locale are untranslated. Hausa in particular
runs long, which breaks fixed-width figures and buttons. Needed: string expansion
budgets per component, number and date formats per locale, and a rule for legal
pages, which are English only and should probably stay so.

### B-32. Density and desktop admin. S3
The admin console is desk-first with wide tables scrolling sideways. The spec wants
the admin mobile experience rebuilt but says nothing about desktop density, which is
where operators actually work.

### B-33. Component inventory governance. S3
216 developer preview pages exist and are the de-facto component gallery, gated by
an environment variable. The spec's design-system governance section does not
mention them, and nothing decides whether they are maintained, moved or deleted.

---

## 7. Operational gaps

### B-34. Nobody is paged. S1
No error reporting, no pager, no uptime monitor. The spec asks for observability
without noting that today a production outage reaches no human.

### B-35. No status page. S3
With money held in escrow, an outage needs a place that says so, or support drowns.

### B-36. No dispute SLA, forum or escalation. S1
The spec gives Vallo the power to rule on disputes. It does not give the customer a
published policy, a response time, an escalation route or a regulator reference.
Since Payluk does not arbitrate, Vallo does, and that is not safe without this.

### B-37. No second super admin, so two-person rulings fail closed. S1
Rulings at or above ₦500,000 require two people and there is only one. Escrow
disputes will hit this on day one.

### B-38. Seed and fixture strategy for an empty marketplace. S2
Every analytics, feed and discovery surface has nothing to show. The spec never
addresses how these are built, demonstrated or tested without inventing fake
listings, which is banned for good reason: this repository once shipped 23 invented
places, 22 marked verified, on addresses that do not exist.

### B-39. Partner and public API. S3
Not in the spec. Worth recording as a deliberate non-goal so nobody builds it
speculatively.

---

## 8. The five that change the plan

If only five of these are acted on:

1. **B-01 staging database.** Escrow cannot be built safely without it.
2. **B-15 phone verification blocks referrals.** Buy the SMS provider now or the
   referral engine cannot qualify anybody.
3. **B-05 tax.** A platform generating tenancy agreements and facilitating sales
   cannot have no tax position.
4. **B-06 chargebacks.** The one money failure that costs Vallo directly and has no
   handling at all.
5. **B-26 no chart system.** Four of the spec's intelligence features are charts,
   and there is nothing to draw them with.
