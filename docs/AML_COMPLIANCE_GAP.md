# AML/CFT compliance: what the law requires of Vallo, and what we have

**Source.** SCUML-EFCC, *AML/CFT Compliance Checklist for DNFBPs* (2026) and
*Documents Required for SCUML Registration* (2025), supplied by the founder on
24 September 2026. Statutory basis: the Money Laundering (Prevention and
Prohibition) Act 2022.

**Why this file exists.** Neither `docs/THE_AUDIT.md` nor `docs/THE_HUNDRED.md`
covers any of this, because neither session had the checklist. It is not
advice. It is twenty-three obligations, each with a stated fine, and they bind
VALLO SPACES LTD from the day its SCUML certificate issues.

**The category.** Vallo registers as a DNFBP under section 11, *Dealers in Real
Estate*. Four documents, no professional licence:

1. Certificate of Incorporation
2. Memorandum and Articles of Association
3. Status Report or equivalent (CAC 1.1, or CAC 7 and CAC 2)
4. TIN printout

Merged into one PDF of 2.5 MB or less. **Registration is free**, and SCUML
warns publicly that anyone offering to facilitate it is not their agent.

**Beneficial ownership is NOT a registration document for this category.**
Checklist item 17 shows why: SCUML expects beneficial ownership to be read from
CAC's own register at `bor.cac.gov.ng`, which VALLO SPACES LTD already
populated — the PSC reconciliation was one of the two queries cleared before
incorporation on 18 September. A beneficial-ownership section that refuses to
save should not block the submission.

---

## THE ONE THAT IS ABOUT OUR PRODUCT, NOT OUR PAPERWORK

**Item 17. Beneficial ownership where the customer is an intermediary or
representative of another party, in all circumstances or any form such
representation may take.** Fine ₦250,000, rising to ₦1,000,000 on recurrence.

**Every agent on Vallo is that intermediary.** An agent letting a landlord's
flat represents another party by definition. The Act does not care that we call
them a lister; it asks who is behind the transaction.

We are closer to compliant here than anywhere else, by accident rather than
design: `listing_mandates` already stores the principal's name and phone
number, and the migration's own comment says they are "what make it checkable".
What is missing is that the obligation is not stated anywhere, the mandate is
optional rather than required for an agent or firm listing, and nothing
records that we discharged the duty.

**What compliance looks like:** a mandate is mandatory before an agent or firm
listing publishes; the principal's identity is recorded and dated; the record
is retained five years; and an admin can produce, for any transaction, who the
lister was acting for.

This is also THE_HUNDRED's V-31 and V-32 seen from the other side. Those were
argued as the strongest product idea in the file. They are also a legal duty.
That is the rare case where the best feature and the regulator agree.

---

## THE REST, BY WHAT IT COSTS TO IGNORE

### Free, or nearly. Do these first.

| # | Obligation | State | Fine |
|---|---|---|---|
| 13 | **A Compliance Officer appointed at management level**, with written duties | Not appointed | ₦150,000, then **₦500,000 per month** after six months |
| 5 | **A written AML/CFT/CPF policy** | Does not exist | ₦1,000,000 |
| 12, 14 | **Every employee trained, and the training recorded** | Not done | ₦100,000, then ₦150,000; ₦1,000,000 if unaddressed two years |
| 3 | **SCUML certificate obtained and displayed**, new business lines declared | In progress | ₦100,000 |
| 16 | **Read the National Risk Assessment, domesticate it, classify our ML/TF/PF risks** | Not done | ₦250,000 |
| 23 | **Review the policies every three years** | n/a until one exists | ₦100,000 |
| 18 | **Keep records of deficiencies found and remedial action taken** | Not kept | ₦50,000 |
| 22 | **Periodic compliance reviews, gaps documented** | Not done | ₦100,000 |

The founder is the Compliance Officer. Appointing himself in writing, today,
closes the most expensive recurring fine on the list for the cost of one
document.

### Engineering. None of it is built.

| # | Obligation | What it needs | Fine |
|---|---|---|---|
| 8 | **Screen every customer and transaction against the UN Consolidated Sanctions List and the Nigeria Sanctions List**, with a documented escalation path for matches | A screening step at verification and at payment, the lists ingested and refreshed, a hit queue on the admin console, and the screening recorded per person and per transaction | ₦500,000 **per violation** |
| 9 | **Register with the Nigeria Sanctions Committee Alert System** and monitor it for new listings and de-listings | Registration is the founder's; monitoring and re-screening on a new listing is ours | ₦300,000, or ₦1,000,000 aggravated |
| 20 | **Identify and monitor Politically Exposed Persons**, with enhanced due diligence on their transactions | A PEP question at verification, a PEP flag on the person, and a rule that raises their transactions for review | ₦300,000, ₦1,000,000 beyond two years |
| 15 | **Classify every customer into high, medium and low risk**, and apply due diligence to match | A risk score on the person, derived and dated, and gates that read it | Warning, then ₦500,000 |
| 6 | **File Suspicious Transaction Reports with the NFIU promptly**, with the decision documented and approved | A report action on the admin console, the decision and approver recorded, and a register of everything filed | ₦1,000,000 |
| 7 | **Report any transaction above ₦5,000,000 (individual) or ₦10,000,000 (corporate) within 7 days** | A threshold monitor over the ledger raising a reportable event, and a register of what was reported and when. **A Lagos or Abuja move-in total will cross ₦5,000,000 routinely** | ₦100,000 **per unreported transaction** |
| 4 | **Record and report cash transactions over USD 1,000 or equivalent** | Vallo takes no cash today. State that, and keep it true | ₦50,000 each |
| 1 | **No cash above ₦5,000,000 individual / ₦10,000,000 corporate outside a financial institution** | Structurally satisfied: every naira moves through Paystack. Keep the record of payment method per transaction | ₦2,000,000 |
| 21 | **Internal audit with the capacity to review AML/CFT compliance** | A person and a documented review, not a tool | ₦150,000, then ₦500,000 monthly |
| 19 | **Controls that management and the Compliance Officer cannot override** | With one super_admin who is also the Compliance Officer, no such safeguard exists. Ties directly to THE_AUDIT's ESC-07 and ESC-08 | ₦250,000, and stricter if an override enabled laundering |

### Already satisfied, and worth knowing

| # | Obligation | Why we are covered |
|---|---|---|
| 2 | Identify and verify clients before any transaction | NIN verification exists for listers. **Not** for members, by the founder's rule that a person looking for a home is never asked to verify — defensible, because a member transacting is verified at payout. Record the reasoning. |
| 11 | Retain transaction records five years, reconstructable | The append-only ledger does exactly this. The retention schedule must not purge below five years — check `docs/RETENTION_SCHEDULE.md` against this, because NDPA minimisation and AML retention pull in opposite directions and AML wins for transaction records. |

---

## WHERE THIS COLLIDES WITH DECISIONS ALREADY TAKEN

- **Item 19 versus one admin.** THE_AUDIT found one admin with a password can
  open escrow, rule on their own dispute, and no ruling can be reversed. Item 19
  makes that a finable control weakness as well as a defect. The audit's fix —
  super_admin only, two-person approval above a threshold, an audit row on every
  change — satisfies both. Do it once.
- **Item 7 versus the move-in total.** A single Lagos move-in of rent, caution
  and fees crosses ₦5,000,000 easily. The first real tenancy may be a reportable
  transaction, and the clock is seven days.
- **Item 11 versus account deletion.** A member asking for deletion under the
  NDPA cannot take the transaction records with them. Deletion must anonymise
  the person and keep the financial record. Check what the purge actually does.
- **Item 17 versus the optional mandate.** Making the mandate mandatory for
  agent and firm listings adds friction to the one thing the platform is short
  of, which is supply. It is still the law. Frame it as the check that makes an
  agent's listing worth trusting — which is what THE_HUNDRED argues anyway.

---

## WHAT ONLY THE FOUNDER CAN DO

1. **Appoint a Compliance Officer in writing, today.** Himself. A signed board
   minute naming the officer and their duties. Closes item 13.
2. **Register with the Nigeria Sanctions Committee Alert System** (item 9).
3. **Read the National Risk Assessment** and sign off the risk classification
   (item 16).
4. **Approve the AML/CFT/CPF policy** once drafted (item 5).
5. **Decide whether members are verified before transacting** (item 2), and
   record the reasoning either way.
6. **Ask the solicitor, in the same letter as the custody question:** does
   Vallo's escrow and rent settlement make us a reporting entity for items 6 and
   7 in our own right, and who files?

---

**Nothing in this file is legal advice.** It is a reading of two documents
SCUML publishes, set against what the code does. The solicitor confirms it.
