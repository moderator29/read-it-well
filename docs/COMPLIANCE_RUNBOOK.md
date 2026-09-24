# Compliance runbook: what staff do, and in what order

Vallo's AML/CFT duties as a DNFBP (Dealers in Real Estate) under the Money
Laundering (Prevention and Prohibition) Act 2022, from the SCUML-EFCC checklist.
Each section names its checklist item. Everything here is staff only. **Nothing
here is legal advice; the solicitor confirms it.**

The desk is `/admin/compliance`, one tab per obligation.

## Never tip off

A person whose name matched a list, who is under review, or about whom a report
is filed sees nothing different, and is told nothing that names sanctions, a
list, a review or a report. If money is held, they see only the neutral line
"Nothing can leave this wallet for now" (hold reason `plain`, which names nothing, and no date). Staff
say nothing more on the phone, in support or by email.

## SCUML items 8 and 9: sanctions screening

**What runs by itself.**

- Every person is screened against the UN Consolidated List and the Nigeria
  Sanctions List when they:
  - submit or change an agent application (lister verification);
  - have an identity check recorded;
  - add a bank account or payout account, or when the bank returns its name;
  - make any transaction (a card payment, and every wallet ledger entry).
- Triggers queue the screening, and the `sanctions-screen` job runs it every 15
  minutes. Nothing about a payment waits on it.
- Every screening is recorded, clean ones included, in `sanctions_screenings`,
  with the list versions it used.
- A new list version re-screens everybody (item 9). Versions come from the
  daily `sanctions-lists` job when `SANCTIONS_UN_URL` / `SANCTIONS_NG_URL` are
  set, or from a staff upload on the Sanctions tab.

**Keeping the lists current (item 9).**

1. The founder registers with the Nigeria Sanctions Committee Alert System.
2. When an alert says the Nigeria list changed, load the new file on the
   Sanctions tab as CSV with these columns: `reference, name, aliases,
   date_of_birth, nationality, listed_on, type`. Separate multiple values with `;`.
3. Set `SANCTIONS_UN_URL` to the UN's published XML address, and the UN list
   refreshes itself daily. Otherwise, upload the XML.
4. A file identical to the one in force changes nothing. A file that does not
   read as its list is refused, and nothing changes.

**When a match appears (the escalation path).**

1. **Nothing happens to the person automatically.** Neither an exact nor a
   close match places a hold, because a name is not an identity.
2. **Check it.** Compare the list entry's date of birth, nationality and
   aliases with what Vallo holds: the NIN name on an agent application, the
   bank-resolved account name, and the documents.
3. **Propose.** Choose "Not the same person" or "It is the same person" and
   write what you checked. The note is required.
4. **A second staff member approves.** The person who proposed cannot approve
   their own proposal (item 19); the database refuses it.
5. **If it is the same person, the approval freezes the account.** It places
   the audit's own hold, `account_money_holds`,
   for ten years or until lifted, under the reason code `plain`, which names nothing (the member can read it). No money leaves and no payout account
   changes.
6. **Report it.**
   - Open the STR from the match ("Open a suspicious transaction report", SCUML
     item 6).
   - The Compliance Officer files with the NFIU through goAML and informs the
     Nigeria Sanctions Committee, both outside Vallo.
   - Record the references in the STR register.
7. **Lifting a hold** is a decision for the Compliance Officer and the
   solicitor. It is not made on this desk.

**What the job raises on Operations.**

- `sanctions.hits_raised` (warning) when a run raised new matches. It carries
  counts only, never a name.
- `sanctions.lists_unreadable` (critical) when the lists could not be read.
  Nothing was screened, and nothing should be read as clear.
- `sanctions.list_refresh_failed` (warning) when a configured URL could not be
  loaded.

**Retention.** Screenings, matches and decisions are kept for at least five
years. See `docs/RETENTION_SCHEDULE.md` section 3.1a.
