# SCUML compliance layer

Status as of 29 September 2026. For the compliance lead. Operational steps are in `docs/COMPLIANCE_RUNBOOK.md`; this document says what each control does, what it watches, who sees what, and what is and is not live.

## The ground rule

Since 25 September 2026 Vallo holds no customer money (ADR 0002, `docs/MONEY_ARCHITECTURE.md`). Guests and tenants pay by card through Paystack split settlement; the lister's share settles straight to their own payout account. So the controls below watch the **live money records**:

- `public.transactions`: every card charge (stays and move-ins), with `payee_user_id` and `lister_share_minor` for the split;
- `public.rent_payments`: the move-in record (tenant and lister);
- `public.bookings`: the stay a charge belongs to;
- `public.payout_accounts`, `public.bank_accounts`: where money is paid out to;
- `public.account_money_holds`: the one live "hold" a desk can place. Its triggers refuse a new or changed payout or bank account while it stands.

Nothing reads or writes wallets, escrows or held payments. Those objects are retired and a database guard refuses to recreate them. All amounts are integer kobo.

The twenty SCUML migrations written on 24 September were never applied because they depended on those retired objects. They sit unapplied in `supabase/migrations/superseded/` (see its README.md), and five new migrations now in force replace them; three more extend and fix them (`20260929011120`, `20260929011534`, `20260929014729`).

## What is live

| SCUML item | Live migration | Live? |
|---|---|---|
| 17 Beneficial ownership (mandates before publish) | `20260929001007_scuml_17_beneficial_ownership_on_live_tables.sql` | Live, probed |
| 6 Suspicious transaction reports (STR desk, holds) | `20260929002643_scuml_6_str_desk_and_hold_claims_on_live_tables.sql` | Live, probed |
| 7 Threshold (cash/currency transaction) reports | `20260929003449_scuml_7_threshold_reports_on_split_settlement.sql`, `20260929011120_scuml_7_refunds_and_guarantee_payouts_are_watched.sql` | Live, probed (charges, refunds, Guarantee payouts) |
| 20 Politically exposed persons, EDD | `20260929004739_scuml_20_15_pep_and_risk_on_live_tables.sql` | Live, probed |
| 15 Risk classification | same as above, plus the sanctions hook in item 8 | Live, probed |
| 8 Sanctions screening; 9 re-screen on list change; 19 two-person decisions | `20260929010407_scuml_8_sanctions_screening_on_live_tables.sql`, end-to-end matcher probe `20260929011534_scuml_8_the_matcher_end_to_end_probe.sql` | Live and probed end to end with a synthetic list. **No real list is loaded yet**, so every screening currently records `no_list` (never `clear`). See "What depends on outside inputs". |

Every migration was applied with a read-back block that fails the migration if RLS, grants or triggers are wrong, and a probe that rolls back its fixtures and checks that nothing was left behind. All eight probes passed on the live database, including the audit fixes (`20260929014729_scuml_audit_fixes_own_cases_tipping_off_and_two_person_lists.sql`). The app's "not deployed" fallbacks are gone: the PEP gate before a payout account now refuses on any error, a missing function included.

## Item 17: beneficial ownership

**What it does.** A listing cannot be published, or kept published, by someone acting for somebody else unless a mandate from the principal is on file and approved by staff. The lister files the mandate: principal name, contact and ID kind. National ID numbers are refused, and the ID-card kind is not offered. A staff member approves or refuses it; the database answers `own_listing` and decides nothing when that staff member is the listing's agent or assigned agent (`20260929014729`). Once decided, a mandate is frozen as a record; a renewal supersedes it and does not edit it. A mandate that is about to expire sends reminders, and after the grace period the listing needs a new mandate.

**Watches.** `listings` (a status, demo or role change runs through `listing_supply_proof_gate`) and `listing_mandates`.

**Staff tools.** `beneficial_ownership_desk` lists waiting mandates. `decide_listing_mandate` approves or refuses one. `acting_for(kind, id)` answers "who is the real principal behind this listing, booking, transaction or rent payment" as of that record, and every lookup is audited. The kinds are `listing`, `booking`, `transaction` and `rent_payment`; anything else is refused. `principal_stop_number` lets a principal stop being messaged.

**Retention.** Kept at least five years after the listing ends; a listing with a refused mandate under five years old cannot be deleted. The purge job only removes mandates that were never acted on (`vallo_scuml17_purge_stale_mandates`).

**Jobs.** `vallo_scuml17_mandate_grace_sweep` (05:25 daily), `_expiry_reminders` (05:30), `_purge_stale_mandates` (05:35).

## Item 6: suspicious transaction reports

**What it does.** Staff open an STR case on a person and link transactions, rent payments or other records to it. A second, different staff member approves the report. Staff then record the filing to the NFIU with its reference and date. Cases that have waited too long nudge staff every hour. Case records are append-only and cannot be truncated.

**The hold.** A desk can place a 30-day hold on a person (`str_place_hold`). Holds are **claims** (`private.hold_claims`, one per desk: `str`, `sanctions`). The person's single `account_money_holds` row follows the union of claims with reason `plain`. While it stands, a new or changed payout or bank account is refused with a sentence that names no cause and no date: "A new payout account cannot be added to this account right now." Releasing a hold needs a second person (`str_release_hold` then `str_approve_release`), and it clears only that desk's claim. `public.hold_claims_sweep` runs every minute to keep the row in step. Tipping-off: nothing tells the member about an STR. The owner's read policy on `account_money_holds` hides any row whose reason is `plain`, so a member cannot see a compliance hold on their own account; the only hold the app describes to its owner is the 7-day hold support places when it moves an email address (reason `email address moved by support ...`). The payout refusal names no cause and no date (`20260929014729`).

**Who sees what.** Admin and super_admin staff see the case, the register and pending releases. The tables live in `private` and are revoked from every API role. Members see nothing.

**Jobs.** `vallo_str_nudge_overdue` (hourly at :17), `vallo_hold_claims_sweep` (every minute).

## Item 7: threshold reports

**What it does.** Every successful card charge in `public.transactions` is observed once, for both parties: the payer as money out and the payee as money in. Money that reaches a member any other way is observed once too, as money in, when it actually moves: a refund to the card when Paystack reports it processed (`booking_refunds`, source `refund`; `rent_share_refunds`, source `rent_refund`; the person refunded, as an individual) and a Guarantee claim when it is marked paid (`guarantee_claims`, source `guarantee_payout`; the claimant, classed by their account; no counterparty, since Vallo's reserve pays it). The payer is the guest or tenant. The payee is `payee_user_id`, else the rent payment's lister, else the listing's agent. The payee amount is the lister's share where the split records one. Move-ins are observed through the charge and are not counted a second time through `rent_payments`.

**Thresholds.** ₦5,000,000 for an individual and ₦10,000,000 for a body corporate (500,000,000 and 1,000,000,000 kobo, `aml_threshold_minor`). The system raises a single event when one movement crosses the threshold, and a structuring event when several movements add up across it. One event is raised per flow.

**Staff actions.** One staff member decides an event (file the report or no filing needed) and a second approves it (`decide_threshold_event`, `approve_threshold_decision`). Both answer `conflicted` to a staff member who is the event's party or counterparty, and the lane does not show them their own events. The lane (`threshold_lane`) shows open and closed events and any monitor faults. Hourly reminders go out for events still waiting (`vallo_threshold_reminders`, :05).

**Retention.** Observations, events, decisions and approvals are append-only and kept at least five years.

**Watches.** `transactions`, `booking_refunds`, `rent_share_refunds`, `guarantee_claims`, each through an AFTER trigger that can never fail the payment, refund or payout it follows; a fault becomes a high risk alert shown on the lane.

## Items 20 and 15: PEPs, enhanced due diligence, risk classes

**PEP.** Members answer the PEP question (`answer_pep_question`); a lister must have answered it before a payout account is added (the gate refuses on any error). Staff can flag someone else (`flag_pep`), never themselves. Clearing a flag needs a second staff member, who is not the person flagged. A successful card charge involving a PEP raises an EDD review: the watch is a trigger on `transactions` covering the guest, the listing agent, the payee, and the tenant and lister of any rent payment. Refunds and Guarantee payouts do not raise a PEP review (they are watched by item 7).

**EDD.** A review records the source of funds, is decided by one staff member and approved by another, and can be reopened; nobody decides or approves a review about themselves. The gate triggers on `listings`, `payout_accounts` and `bank_accounts` ask `edd_clear_for`: a lister is blocked from publishing or adding a payout destination while they are classed high without an approved, cleared item 15 review since that class began, while a reopened review is unsettled, or, when not yet classified, while they are a PEP or carry an open or confirmed sanctions match. A member who is not a lister is never blocked; their new bank account opens a review instead.

**Risk class.** `risk_factors_for` looks at volume from SUCCESSFUL transactions over 90 days, PEP status, reports, fraud suspensions, and (item 8) sanctions. `record_derived_risk_class` sets the class. A staff override that lowers a class needs a second staff member's approval; raising it takes effect at once. Nobody overrides, or approves an override of, their own class, and the risk and PEP desks leave out the caller's own rows. `risk_people_due` lists who needs a class or a review.

**Who sees what.** Staff only. The tables have RLS on with no policies and are revoked from anon and authenticated. The service role can read them.

**Retention.** Every PEP, EDD and risk row is append-only with no exempt column, and none has a foreign key that nulls it when an account is deleted: the person's id stays on the record for five years.

## Items 8, 9, 19: sanctions screening

**Lists.** The UN Consolidated List and the Nigeria Sanctions List. Each loaded file is a version, identified by its SHA-256. Its entries are written first and the version is activated afterwards. Four rules protect activation:

- an upload waits for a staff member other than the one who loaded it;
- a fetched file with under 90% of the entries in force waits for a proposer and a different approver;
- an incomplete file can never be activated;
- a version that a later one has superseded cannot be activated.

**Who and what is screened.** Screening happens on these events, each queued by an AFTER trigger that can never fail the write it follows:

- lister verification (`agent_applications`);
- identity checks (`agent_verification_checks`);
- payout or bank account added or renamed;
- every card charge: the guest, the name on the booking, the listing agent and the split payee;
- every rent payment: the tenant and the lister;
- every business transfer: both people;
- and when a list is activated, everybody (item 9).

The `sanctions-screen` job (Vercel cron, four times an hour) matches exact and close names and writes a screening row for every check, clean ones included. **Screening never blocks a payment.**

**Matches.** Exact and fuzzy matches are recorded with their score. A match that rests only on a name common in Nigeria is grouped separately. One staff member proposes clear, confirm or (later) release, and a different one approves (item 19). Nobody decides a match about themselves.

A confirmed match places the sanctions desk's hold claim, and the `plain` hold then blocks new payout destinations with the same neutral sentence. The job renews the claim for 30 days at a time while the match stands. A release approved by two people clears only the sanctions claim. When a newly activated list drops a confirmed person's reference, a de-listing flag is raised for staff.

**Risk hook.** A confirmed match, or an open exact match that is not a common name, counts as a sanctions hit for the risk class. Someone never screened reads as unknown, never as clear.

**Retention.** Screenings are append-only. Matches and decisions are never deleted. Everything is kept at least five years.

**Who sees what.** Staff see `sanctions_desk`, which leaves out any match on the caller. The job and upload route use the service role: it may insert a list version's loading columns (source, file hash, origin, loader), its entries, screenings and matches, and mark queue rows done; it may update only a waiting version's entry count, previous count and completeness. It cannot activate a list: a whole, non-short URL file is activated by the database function `sanctions_list_autoactivate`, which refuses uploads, and a trigger keeps a version's source, file, origin and loader fixed (`20260929014729`). No role can delete. Members see nothing, and nobody tells them anything (the probe checks this).

## What depends on outside inputs

- **Sanctions lists.** Set `SANCTIONS_UN_URL` (https address of the UN Consolidated List XML) and `SANCTIONS_NG_URL` (https address of the Nigeria list CSV) as server-only environment variables. Both are documented in `apps/web/.env.example` and `docs/ENVIRONMENT.md`. If they are unset, nothing is fetched and staff must upload each list on /admin/compliance, where a second staff member activates it. **Until a list is active, every screening records `no_list`.** No API key is needed.
- **NFIU filing** of STRs and threshold reports is manual. The system records the filing reference; it does not submit anything.

## Not done / known gaps

- Name matching runs in the app (`lib/compliance/sanctions/`). It was proved end to end with a synthetic list: the real ingest and screening code produced the rows, which were replayed into the live tables as the service role in a rolled-back probe (`20260929011534`). It has not yet been run against the real UN or Nigeria list, because neither has been loaded.
- `/admin/compliance` has not been checked in a browser: it needs a signed-in admin session, which the build environment does not have. The lanes are covered by their unit tests and the database probes.
- `ledger_entries` are not screened separately, because they duplicate the transactions they settle.
- Some older comments in the admin payment readers still mention wallets. They are historical and outside the SCUML code.
