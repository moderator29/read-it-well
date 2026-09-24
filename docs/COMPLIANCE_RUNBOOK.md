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
  - make any transaction: a card payment and its settlement line, every wallet
    ledger entry, a rent payment, a held payment (escrow) and a business
    transfer.
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
   End the file with a row `END,<number of entries>`: a count that does not
   match is refused, and a file fetched from a URL without it waits for staff.
3. Set `SANCTIONS_UN_URL` to the UN's published XML address, and the UN list
   refreshes itself daily. Otherwise, upload the XML.
4. A file identical to the one in force changes nothing. A file that does not
   read as its list (including one cut off before its closing tag) is refused,
   and nothing changes.
5. **An uploaded file loads inactive.** A different staff member must activate
   it on the desk, and only activation re-screens anyone (item 19). A URL
   fetch activates itself unless it has fewer than 90% of the entries in force
   (checked again at activation) or cannot prove it is whole; a short one needs
   a proposer and a different person to activate it. An older file can never
   replace a newer one already in force. The file limit is 4 MB.
6. **De-listing.** When a new version no longer carries the reference of a
   confirmed match, the desk flags it. Consider a release (below).

**When a match appears (the escalation path).**

1. **Nothing happens to the person automatically.** Neither an exact nor a
   close match places a hold, because a name is not an identity.
2. **Check it.** Compare the list entry's date of birth, nationality and
   aliases with what Vallo holds: the NIN name on an agent application, the
   bank-resolved account name, and the documents.
3. **Propose.** Choose "Not the same person" or "It is the same person" and
   write what you checked. The note is required.
4. **A second staff member approves, or rejects.** The person who proposed
   cannot approve or reject their own proposal (item 19); the database refuses
   it. A rejected proposal leaves the match open for a new one. Nobody decides
   a match about themselves: a staff member who is the matched person cannot
   propose, approve or reject on it.
5. **If it is the same person, the approval freezes the account.** It sets the
   sanctions desk's own claim (`private.hold_claims`, owner `sanctions`),
   thirty days, renewed by every screening run while the match stands. The
   audit's hold row (`account_money_holds`) follows every desk's claims under
   the reason code `plain`, which names nothing (the member can read it); a
   "this was not me" hold keeps its own words and is only lengthened. No money
   leaves and no payout account changes.
6. **Report it.**
   - Open the STR from the match ("Open a suspicious transaction report", SCUML
     item 6).
   - The Compliance Officer files with the NFIU through goAML and informs the
     Nigeria Sanctions Committee, both outside Vallo.
   - Record the references in the STR register.
7. **Releasing a hold** (de-listing, or the solicitor's advice) is two-person
   too: one proposes "Release the hold" with the reason, a second approves.
   The match becomes released and, if the person has no other confirmed match,
   the sanctions claim ends. An STR hold (item 6) or a "not me" hold is its
   own claim and stands.

**What the job raises on Operations.**

- `sanctions.hits_raised` (warning) when a run raised new matches. It carries
  counts only, never a name.
- `sanctions.lists_unreadable` (critical) when the lists could not be read.
  Nothing was screened, and nothing should be read as clear.
- `sanctions.list_refresh_failed` (warning) when a configured URL could not be
  loaded.

**Accepted limitation.** The triggers that queue a screening swallow every
error, but a statement cancelled from outside (a timeout or an operator
cancel, `query_canceled`) is deliberately not caught by PL/pgSQL, so such a
cancel still fails the write it rides on. The 200ms lock timeout keeps the
queue from causing one.

**Retention.** Screenings, matches and decisions are kept for at least five
years. See `docs/RETENTION_SCHEDULE.md` section 3.1a.
