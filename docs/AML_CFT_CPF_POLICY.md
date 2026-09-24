# Anti-Money Laundering, Counter-Terrorist Financing and Counter-Proliferation Financing Policy

**Entity:** VALLO SPACES LTD, Plot 5, Zone 6, Dutse Alhaji, Bwari Area
Council, Federal Capital Territory, Abuja.
**Drafted:** 24 September 2026.
**Status: DRAFT FOR BOARD APPROVAL.** This draft has not been adopted. It is not
legal advice. The solicitor must confirm it before the board signs it,
especially the statutory references and the reporting questions in section 8.4.

**What this document is.** SCUML's DNFBP checklist, item 5, requires a written
AML/CFT/CPF policy. Not having one carries a ₦1,000,000 fine. This draft
covers every item in `docs/AML_COMPLIANCE_GAP.md` and applies each one to how
Vallo actually works.

**The honesty rule.** Every statement below about what the platform does was
checked against the code and the live database on 24 September 2026. Where a
control is not built, this policy says so and gives the plan. A policy that
describes controls the platform does not have is worse than no policy, because
it is the first thing an examiner compares against the system.

---

## 1. Scope and legal basis

1.1 **The law.** The Money Laundering (Prevention and Prohibition) Act 2022
(MLPPA). Supervision is by the Special Control Unit against Money Laundering
(SCUML) of the EFCC. Financial intelligence reporting goes to the Nigerian
Financial Intelligence Unit (NFIU). The Terrorism (Prevention and Prohibition)
Act 2022 and the Nigeria Sanctions Committee lists apply to sections 6 and 7.
*The solicitor must confirm the section references.*

1.2 **Our category.** VALLO SPACES LTD registers with SCUML as a Designated
Non-Financial Business and Profession (DNFBP), category *Dealers in Real
Estate*. The gap file records this as section 11 of the MLPPA; the solicitor
must confirm it.

1.3 **The business this policy covers.** Vallo is a marketplace in Nigeria
for renting and buying homes. The regulated activity is where money moves:

- **Short stays.** Paid by card at checkout, or from the member's Vallo
  wallet.
- **Rent and move-in payments.** Settled through the ledger to the lister's
  wallet.
- **Wallet funding and withdrawals.** Every naira comes in and goes out
  through Paystack.
- **Member-to-member wallet transfers.**
- **Held payments (escrow).** The database keeps these closed today. See
  section 9.2.

1.4 **Who it binds.** Every director, employee and contractor of VALLO SPACES
LTD with access to the admin console, the database or the payment
provider's dashboard.

1.5 **Relationship to other documents.**

- `docs/AML_COMPLIANCE_GAP.md`: the checklist, and where Vallo stands against
  it.
- `docs/RETENTION_SCHEDULE.md`: how long records are kept (section 10).
- `docs/THE_AUDIT.md` and `docs/THE_AUDIT_FIXES.md`: the engineering record
  behind the controls in section 9.

---

## 2. The Compliance Officer (checklist item 13)

2.1 **Appointment.** The board appoints a Compliance Officer at management
level, in writing. The proposed appointee is the founder. The board minute is
Appendix A. Until the minute is signed, item 13 is not met, and its fine
rises to ₦500,000 a month after six months.

2.2 **Duties.** The Compliance Officer:

1. owns this policy and presents it for review (section 14);
2. keeps the risk assessment (section 3) and signs off every change to it;
3. decides every suspicious-transaction and threshold report (section 7),
   and records the decision, the reasons and the date;
4. is SCUML's and the NFIU's point of contact, and keeps the SCUML
   certificate current and on display (checklist item 3);
5. registers with and monitors the Nigeria Sanctions Committee alert system
   (section 6);
6. keeps the training register (section 11) and the deficiency register
   (section 12);
7. receives internal reports of suspicion from any employee, with no
   intermediary able to block or filter them;
8. reports to the board at least once a year on compliance, open
   deficiencies and reports filed.

2.3 **Independence, and the conflict we have today.** The founder is also the
only `super_admin` on the platform: the live database holds one
`super_admin` and one `admin`. A Compliance Officer who is also the only
person able to rule on held money cannot be the independent check on those
rulings. Section 9 explains how the platform limits this in code. Section 13
explains how internal audit covers the rest. This conflict is recorded as
deficiency D-01 (section 12).

---

## 3. Risk assessment (checklist item 16)

3.1 **Required.** Read the National Risk Assessment, apply it to Vallo, and
record our money laundering, terrorist financing and proliferation financing
risks.

**Status: not yet done.** The Compliance Officer must read the current
National Risk Assessment and sign off the assessment below. Until then, the
table below is a draft built from how the product works, not from the NRA.

3.2 **Draft risk register.**

| Risk | Why it applies to Vallo | Inherent | Main controls (sections) |
|---|---|---|---|
| Rent and purchase money used to place or layer illicit funds | Real estate is a recognised high-risk sector. A Lagos or Abuja move-in is large and paid at once | High | 4, 7, 8, 9 |
| An intermediary hides the real landlord or seller | Every agent listing is made on behalf of someone else | High | 5 |
| Money moved between member wallets with no underlying tenancy | `transfer_between_wallets` lets one member pay another | Medium | 4.4, 7 |
| Fake listings used to take deposits | A common fraud pattern in this market | Medium | 4.2, 9 |
| Refunds or reversals used to clean funds | A payment comes in on one instrument and goes out to a different account | Medium | 4.3, 9.1 |
| Sanctioned persons or PEPs as customers | Not screened today | Unknown until screening exists | 6 |
| Cash | No cash path exists | Low | 8 |
| Crypto funding | Code exists (`lib/payments/yellowcard.ts`) but is dormant: `isYellowCardConfigured()` is false in production, so `startCryptoDeposit` refuses. Turning it on is a policy decision under 3.4 | Low while dormant | 3.4 |

3.3 **Review.** The register is reviewed whenever the NRA is revised, before
any new product or payment channel launches, and at least once a year.

3.4 **New products and channels.** No new way to pay in or pay out goes live
until the Compliance Officer has assessed it in writing. This covers turning
on Yellow Card, opening held payments to the public, and any new payout rail.

---

## 4. Customer due diligence (checklist item 2)

Vallo has two kinds of customer, and treats them differently on purpose. The
reasoning is written down here, as the gap file requires.

### 4.1 Members: not asked to verify, by product decision

A person looking for a home is never asked to prove their identity to browse,
save, message, book or pay. Asking for it drives the searcher off the
platform and into the WhatsApp and cash-at-the-gate deals that
`lib/trust/standards.ts` warns members against. Those deals leave no record at
all.

The reasoning that makes this defensible rests on four facts. Each is checked
below.

1. **Money enters only through a regulated channel.** Card and wallet funding
   go through Paystack (`lib/payments/paystack.ts`). The payer's card or bank
   account belongs to a Nigerian bank that has already done KYC on the account
   holder. Paystack's own KYC covers Vallo as the merchant, not our
   members. The identity behind a payment is known
   to the payer's bank, not to Vallo.
2. **Money leaves only to a bank account the bank itself has named.** A
   withdrawal (`withdrawWork` in `apps/web/src/lib/wallet/actions.ts`) looks
   up the bank (`lookupBank`), then resolves the account number with that
   bank (`resolveAccountNumber`). Both happen before any money is held. The
   account holder's name the bank returns is recorded on the ledger entry.
   A saved payout account (`addBankAccount` in
   `apps/web/src/lib/payments/bank-accounts-actions.ts`) stores the
   bank-resolved name. It is resolved again before each payout, and the payout
   is refused if the name has changed (`sameAccountName`). Every lookup goes
   through one resolver, `lib/payments/bank-resolve.ts`.
3. **What is NOT true today.** It is not enforced that money reaches only
   an account in the member's own name. The
   platform records the bank's account name, but it does not compare that name
   with the member. It cannot, because an unverified member has no verified
   name to compare against. A member can withdraw to any valid Nigerian bank
   account. Deficiency D-02.
4. **Every movement is on the append-only ledger** (section 10). A
   withdrawal therefore always links a named bank account to a Vallo account
   and a date.

**Plan for D-02.** For withdrawals, and for any single payment at or above
the threshold in section 7.2, identify the member before the money moves. The
proposed check: the account name returned by the bank must match the name on
the member's profile, and a mismatch goes to manual review. This asks nothing
of a searcher. It applies only to someone taking money out. It needs founder
approval, because it changes the "never ask a member to verify" rule at the
payout step.

### 4.2 Listers (agents, owners, firms): verified before they list

**What is enforced today:**

- **An agent must apply and be approved by staff.** `reviewAgentApplication`
  in `apps/web/src/lib/admin/actions.ts` creates the `agents` row and grants
  the agent role only on staff approval. The application collects an ID type
  (NIN, BVN, passport, driver's licence or voter's card), the ID number, a
  residential address and payout details, and the identity document is
  uploaded to the private `agent-documents` bucket.
- **Only staff can publish a listing.** The database guard from DB-01/DB-02
  (migration `20260923232741`) refuses a listing owner who tries to publish or
  mark their own listing verified.
- **A publish is refused if the listing has a rejected ownership document
  or a rejected mandate** (`private.listing_supply_proof_gate`, migration
  `20260922230500`).
- **There is a four-rung verification ladder**, recorded per agent in
  `public.agent_verification_checks` and summed into
  `agents.verification_tier` by a trigger. The rungs are identity seen,
  address confirmed, a bank account in the agent's own name, and met in
  person (`lib/trust/verification.ts`). Staff record each rung by hand from
  `/admin/kyc` (`recordVerificationCheck`), and an audit line is written
  after each decision.

**What is NOT true today:**

- **Approving an application does not require the identity rung.** Nothing
  in the approval path checks that a document was looked at. An approved
  agent starts at tier 0.
- **No publish gate reads `verification_tier`.** THE_AUDIT_FIXES SUP-13
  records that the gate on `verification_tier >= 1` was not built.
- **No automated identity check exists.** There is no NIMC, BVN or
  face-match provider. The identity rung is a person comparing the stated
  number with the uploaded document.

Deficiency D-03.

**Plan for D-03.** Staff must not publish a listing from a lister below tier 1
(identity seen). Enforce this in the database with the same publish guard,
and record the rung that allowed it.

**The procedure, as policy, from adoption:** no member of staff publishes a
listing, or approves an application, until the identity rung has been passed
and recorded in `/admin/kyc`. This applies whether or not the code enforces
it yet.

4.3 **Ongoing due diligence.**

- Re-verify a lister whose payout account or legal name changes.
- Re-verify a lister whose listings are reported (`/admin/reports`) for fraud.
- Watch for member activity that does not fit a tenancy: repeated transfers
  between the same wallets, funding followed at once by withdrawal, and
  refunds to a different instrument. The platform has a risk-alert queue
  (`resolveRiskAlert` in `lib/admin/actions.ts`), but no rule raises these
  specific patterns yet. Deficiency D-04.

4.4 **Enhanced due diligence** applies to high-risk customers (section 5), to
PEPs (section 6) and to any payment that crosses the section 7.2 threshold.
EDD means:

- source of funds is asked for and recorded;
- the Compliance Officer approves before the money is released;
- the approval is recorded in `audit_log`.

**Not built:** no flag or queue for EDD exists yet. Until it does, EDD is a
manual procedure, and it relies on the held-payments gate (section 9.2)
staying closed.

---

## 5. Customer risk classification (checklist item 15)

5.1 **Required.** Classify every customer as high, medium or low risk, and
apply due diligence to match.

**Status: not built.** No risk score is stored on a person. Deficiency D-05.

5.2 **Classification rules, as policy:**

| Class | Who | Due diligence |
|---|---|---|
| High | PEPs; any sanctions near-match; a lister acting for a principal who is a company whose owners are not on the CAC beneficial-ownership register; any customer in a single transaction at or above the section 7.2 threshold; anyone reported for fraud | Enhanced (4.4) |
| Medium | Listers (agents, owners, firms) not otherwise high; members who withdraw or transfer between wallets | Standard lister CDD (4.2); payout identification once D-02 is fixed |
| Low | Members who only browse, book short stays and pay by card | Reliance on the funding bank (4.1) |

5.3 **Plan.** Store a class on the person, work it out from the rules above,
and record the date and the rule that set it. The EDD and payout gates then
read it.

---

## 6. Sanctions and PEP screening (checklist items 8, 9 and 20)

6.1 **Required.**

- Screen every customer and transaction against the UN Consolidated
  Sanctions List and the Nigeria Sanctions List (item 8; ₦500,000 per
  violation).
- Register with the Nigeria Sanctions Committee alert system and monitor it
  (item 9).
- Identify Politically Exposed Persons and apply EDD to them (item 20).

6.2 **Status: not yet built.**

- There is no screening step, list ingestion, hit queue or PEP flag anywhere
  in the code or schema.
- No customer has ever been screened.

Deficiencies D-06 (screening), D-07 (alert system registration) and D-08 (PEP).

6.3 **The plan.**

1. **The Compliance Officer registers with the alert system (D-07).** This
   is the founder's action and needs no code.
2. **Build the lists.** Ingest both lists into the database, refresh them on
   every alert, and keep each version.
3. **Screen at three points:**
   - lister application;
   - payout account creation;
   - any payment at or above the section 7.2 threshold.

   Screen all existing listers again whenever a list changes.
4. **Handle hits.**
   - Near-matches go to a queue on the admin console.
   - A confirmed match freezes the account's outbound money.
   - A confirmed match is reported under section 7 the same day.
   - Every screening result is recorded against the person and the
     transaction.
5. **PEPs.**
   - Listers get a PEP question on the application.
   - A PEP flag on the person makes them high risk (section 5).
6. **Until this is built:**
   - no lister is approved without the Compliance Officer checking their
     name by hand against both published lists and recording that in the
     application's review note;
   - held payments stay closed (section 9.2).

---

## 7. Suspicious transaction and threshold reporting (checklist items 6 and 7)

7.1 **Suspicious Transaction Reports.** Any employee who suspects that funds
are the proceeds of crime, or are linked to terrorism or proliferation,
reports it to the Compliance Officer at once. The Compliance Officer decides
whether to file an STR with the NFIU and records:

- the decision;
- the reasons;
- the approver;
- the date.

Filing is prompt. The solicitor must confirm the statutory deadline. No one
tells the customer that a report is being considered or has been made
(tipping off).

7.2 **Threshold reports.** Any transaction at or above **₦5,000,000 for an
individual** or **₦10,000,000 for a body corporate** is reported within **7
days**.

**This will happen in normal business.** A Lagos or Abuja move-in (rent,
caution deposit and fees paid at once) can cross ₦5,000,000, so Vallo's first
real tenancy may be a reportable transaction.

7.3 **Status: not built.**

- There is no threshold monitor over the ledger.
- There is no report action or register on the admin console.
- There is no NFIU filing integration.

Deficiencies D-09 (threshold monitor) and D-10 (STR workflow and register).
At the time of writing, the live database holds no real listings, no real
agents and no escrows, so nothing has yet crossed a threshold.

7.4 **Until it is built:**

- The Compliance Officer reviews the ledger (`wallet_entries`,
  `ledger_entries`, `transactions`) every week for any single payment, or set
  of related payments by one customer, at or above the threshold.
- The Compliance Officer keeps a register of every report filed and every
  decision not to file, with reasons.

7.5 **The plan.**

- A database check over the ledger raises a reportable event when a
  customer's single or linked payments reach the threshold.
- The event appears on the admin console with a 7-day clock.
- The filed or not-filed decision is recorded in `audit_log` with the
  approver.

7.6 **Open question for the solicitor.** Does Vallo's rent settlement and
held-payment model make Vallo a reporting entity for items 6 and 7 in its own
right, alongside Paystack and the banks? If so, who files? This is the same
letter as the custody question (section 9.2).

---

## 8. Cash (checklist items 1 and 4)

8.1 **Vallo takes no cash.**

- Every naira that enters Vallo comes through Paystack, by card or by the
  channels Paystack offers at checkout.
- Every naira that leaves goes out as a Paystack transfer to a bank account
  resolved with the bank (`/transferrecipient` and `/transfer` in
  `lib/payments/paystack.ts`).
- There is no cash desk, no cash collection by staff, and no code path that
  records a cash payment.
- The platform tells members not to pay cash at the gate
  (`lib/trust/standards.ts`).

8.2 **Keeping it true.**

- No employee may accept cash for any Vallo transaction.
- Any new payment method needs a written assessment under section 3.4 first.
- If a lister or member reports that cash changed hands off-platform, that is
  handled as a possible suspicious transaction under section 7.

8.3 **Record of payment method.**

- Each payment that came through Paystack keeps its Paystack reference on
  the ledger or the transaction row.
- Each withdrawal keeps the resolved bank name and account name.

---

## 9. Controls that management cannot override (checklist item 19)

9.1 **Held-money rulings.** Migration
`20260924015442_esc07_esc08_super_admin_rulings_two_people_and_a_database_gate`
puts these rules in the database, not the app:

- only a `super_admin` can resolve a held-payment dispute
  (`escrow_admin_resolve`);
- an admin who is a party to the dispute is refused;
- a ruling needs a written reason of at least 20 characters;
- a ruling above ₦500,000 (`private.escrow_two_person_threshold_minor()`,
  50,000,000 kobo) needs a second, different super admin to approve it;
- a ruling can only be reversed (`escrow_reverse_ruling`) by a super admin
  who is neither the proposer nor the approver.

**The limit today:** there is one `super_admin`. A two-person ruling above
₦500,000 therefore cannot be completed, and a reversal cannot be made at all.
The system fails safe (the money stays held), but it also means no large
dispute can be resolved. Deficiency D-01: appoint a second super admin who is
not the Compliance Officer.

9.2 **The held-payments gate.** No held payment (escrow) can be created unless
both of the following are true (`escrows_refuse_while_gate_closed`):

- the `held_payments` feature flag is on;
- the custody structure in `private.platform_settings` is `trustee` or
  `licensed_partner`.

Today the flag is absent and the custody structure is `undecided`, so the gate
is closed. The setting sits in a private schema that no app role can write.
Opening it is a board decision after the solicitor's custody answer, not an
admin toggle. Work to extend the gate to other money paths is under way.
This policy will describe it when it lands.

9.3 **The records cannot be rewritten.**

- `audit_log` is append-only. Triggers refuse update, delete and truncate,
  and no application role has update or delete rights on it.
- `wallet_entries` is append-only (migration
  `20260924015257_mon10_wallet_entries_are_append_only`). The only allowed
  change to a completed entry is a super admin's reversal, and that is itself
  recorded.

9.4 **What is still a management override.** Whoever holds the Supabase
project's owner or service credentials, or the Paystack dashboard login, can
act outside every control above. Today that is the founder. Code cannot stop
a person with those credentials.

**Mitigation, as policy:**

- dashboard access is limited to named people;
- every use of the Paystack dashboard to move money is logged by hand in the
  deficiency register (section 12), with the reason;
- the internal audit (section 13) checks the Paystack transfer history
  against the ledger each quarter.

---

## 10. Record keeping (checklist item 11)

10.1 **Required.** Keep customer identification and transaction records for at
least five years, in a form from which any transaction can be reconstructed.

10.2 **Transaction records.**

- `wallet_entries` and `audit_log` are append-only (section 9.3).
- Bookings, reservations, ledger entries, transactions and escrows are kept.
  `docs/RETENTION_SCHEDULE.md` section 3.3 sets 6 years for these, with
  redaction of the person and never deletion of the entry.
- Six years is more than the AML minimum of five, so the stricter period
  applies.

10.3 **Customer identification records.**

- `docs/RETENTION_SCHEDULE.md` section 3.1 keeps an approved agent's identity
  document, ID number and payout details for **5 years** after the
  relationship ends.
- A rejected applicant, who never became a customer, is purged after 30 days.
  The solicitor must confirm this (retention schedule, section 7, question 1).

10.4 **The conflict in the tree today.** The account deletion routine
(`purge_account_rows`) deletes `agent_documents`, `bank_accounts` and
`payout_accounts` when an account is closed. That destroys CDD records the
five-year floor requires us to keep. Deficiency D-11. The fix is in progress.

Until it lands, the rule is: no account belonging to an approved agent, or to
anyone with a withdrawal on record, is deleted without the Compliance Officer
first exporting its CDD records to secure storage and noting it in the
deficiency register.

10.5 **Reconstruction.** For any transaction the Compliance Officer must be
able to produce:

- who paid, and by which Paystack reference;
- who received it, and to which bank-resolved account;
- the listing and, for an agent listing, the principal (section 11);
- every admin action on it, from `audit_log`.

---

## 11. Beneficial ownership through the agent's principal (checklist item 17)

11.1 **Why this is about our product.** Every agent is an intermediary acting
for someone else: the landlord or seller. Item 17 requires us to know who that
principal is.

11.2 **What exists.** `public.listing_mandates` (migration
`20260922230400`) records, per listing:

- the principal's name (required);
- the principal's phone number (+234 format);
- the mandate kind (letting, sale or management);
- a review status;
- the signed mandate document in `agent_documents`.

It is never shown publicly. A rejected mandate blocks publishing (section 4.2).

11.3 **What is NOT true today.**

- A mandate is optional. Nothing requires one before an agent or firm
  listing is published.
- No screen in the app lets an agent file a mandate. The database allows the
  agent to insert one, but only the admin console reads mandates
  (`app/admin/listings/MandatesPanel.tsx`).
- The live database holds no mandates.

Deficiency D-12.

11.4 **Policy from adoption.**

- No agent or firm listing is published until staff have seen and recorded
  a mandate naming the principal.
- Where the principal is a company, staff check its owners on the CAC
  beneficial-ownership register (`bor.cac.gov.ng`) and record the result in
  the mandate's review note.

11.5 **Plan.**

- A mandate step in the agent's listing flow.
- A publish guard in the database that requires an approved mandate for
  agent and firm listings.
- A mandate kept for five years after the listing's last transaction.

11.6 **Vallo's own beneficial ownership** is on the CAC register, reconciled
before incorporation on 18 September 2026.

---

## 12. Deficiency register and compliance reviews (checklist items 18 and 22)

12.1 **The register.** The Compliance Officer keeps a register of every
deficiency found, its owner, the remedial action and the date it closed.

**Not built in the product.** Until it is, the register is a controlled
document kept with this policy. It opens with these entries:

| ID | Deficiency | Section | Owner |
|---|---|---|---|
| D-01 | One super admin, who is also the Compliance Officer | 2.3, 9.1 | Board |
| D-02 | Payout account name not matched to the member | 4.1 | Engineering |
| D-03 | No identity gate on listing approval or publish | 4.2 | Engineering |
| D-04 | No monitoring rules for non-tenancy money patterns | 4.3 | Engineering |
| D-05 | No customer risk classification | 5 | Engineering |
| D-06 | No sanctions screening | 6 | Engineering |
| D-07 | Not registered with the Sanctions Committee alert system | 6 | Compliance Officer |
| D-08 | No PEP identification | 6 | Engineering |
| D-09 | No threshold monitor | 7 | Engineering |
| D-10 | No STR workflow or register | 7 | Engineering |
| D-11 | Account deletion destroys CDD records | 10.4 | Engineering (in progress) |
| D-12 | Mandate optional, no filing screen | 11 | Engineering |
| D-13 | Risk assessment not done against the NRA | 3 | Compliance Officer |
| D-14 | No training given or recorded | 14 | Compliance Officer |
| D-15 | No internal audit arrangement | 13 | Board |

12.2 **Compliance reviews.** The Compliance Officer reviews compliance against
this policy at least every six months. They record the gaps found in the
register and report them to the board. The first review is due within three
months of adoption.

---

## 13. Internal audit (checklist item 21)

13.1 **Required.** An internal audit function able to review AML/CFT
compliance.

**Status:** Vallo has no internal auditor. Deficiency D-15.

13.2 **Plan.** The board appoints an independent person, outside the business
or at least not the Compliance Officer, to audit this policy once a year. The
first audit is within twelve months of adoption.

The audit covers:

- a sample of listers checked against section 4.2;
- the threshold and STR registers;
- the Paystack transfer history reconciled to the ledger (section 9.4);
- the deficiency register.

The auditor reports to the board, not to the Compliance Officer.

---

## 14. Training (checklist items 12 and 14)

14.1 Every employee and contractor with console, database or payment-provider
access is trained:

- before they get that access;
- again each year.

Training covers:

- this policy;
- the red flags in section 3.2;
- how to report a suspicion (section 7.1);
- tipping off.

14.2 **Records.** The Compliance Officer keeps a training register: name, date,
content and a signed acknowledgement. The register is not in the product.
Until someone is trained, item 12 is not met. Deficiency D-14.

---

## 15. Policy review (checklist item 23)

This policy is reviewed:

- at least every **three years**;
- whenever the MLPPA, SCUML guidance or the National Risk Assessment changes;
- before any new payment channel launches (section 3.4).

Each review is approved by the board and recorded with its date.

---

## Appendix A. Board minute: appointment of the Compliance Officer

> **VALLO SPACES LTD**
> **Minutes of a meeting of the Board of Directors**
>
> Held at: ________________________ On: ____ / ____ / 20____
>
> Present: ______________________________________________
>
> **1. Appointment of Compliance Officer.**
> IT WAS RESOLVED THAT ______________________ [name], being a director of the
> Company, is appointed Compliance Officer of the Company at management level
> for the purposes of the Money Laundering (Prevention and Prohibition) Act
> 2022 and the Company's registration with the Special Control Unit against
> Money Laundering, with effect from ____ / ____ / 20____.
>
> **2. Duties.** The Compliance Officer shall carry out the duties set out in
> section 2.2 of the Company's AML/CFT/CPF Policy, shall have unrestricted
> access to the Company's records and systems for that purpose, and shall
> report to the Board at least annually.
>
> **3. Policy.** IT WAS FURTHER RESOLVED THAT the AML/CFT/CPF Policy dated
> ____ / ____ / 20____ is adopted / is adopted subject to the amendments
> recorded below: ______________________________________________
>
> **4. Recorded conflict.** The Board notes that the Compliance Officer is
> also, at the date of this minute, the Company's only super administrator
> of the platform, and directs that a second super administrator be
> appointed by ____ / ____ / 20____.
>
> Signed: __________________ (Chair) Date: __________
>
> Signed: __________________ (Director / Secretary) Date: __________

---

**Nothing in this document is legal advice.** It is a draft policy written
against SCUML's DNFBP checklist and the platform as it stands on 24 September
2026. The solicitor confirms it before the board adopts it.
