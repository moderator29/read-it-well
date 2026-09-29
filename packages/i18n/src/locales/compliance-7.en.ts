/**
 * SCUML item 7, in English: the threshold reports lane on /admin/compliance.
 *
 * Staff-only copy. Nothing here is ever shown to a member, and nothing about
 * a report reaches them. Its own module so `compliance.en.ts` (builder 6's)
 * is not edited: one import and one line in `en.ts`.
 */
export const complianceThresholdEn = {
  tab: "Threshold reports",
  lede: "Every transaction above ₦5,000,000 for an individual or ₦10,000,000 for a corporate, and every run of smaller ones that together pass it within a week, must reach the NFIU within seven days. File it on goAML, record the reference here, and have a second person approve.",
  emptyTitle: "Nothing to report",
  emptyBody: "Nothing has crossed a reporting threshold. The monitor watches every successful card charge (stays and move-ins, for the payer and the payee), every processed refund and every paid Guarantee claim.",
  faultsTitle: "The monitor missed {count} movements",
  faultsTitleOne: "The monitor missed a movement",
  faultsBody: "A settled movement could not be checked against the threshold, so this lane may be incomplete. The risk alerts say which; check each by hand, then close the alert.",
  truncated: "Only the first events are shown. Close or file the oldest to see the rest.",
  direction: { in: "Money in", out: "Money out" },
  kind: { single: "One transaction", structuring: "{count} transactions in a week" },
  source: { booking: "Booking payment", rent_payment: "Move-in payment", refund: "Refund to card", rent_refund: "Move-in share refund", guarantee_payout: "Guarantee payout", none: "Several movements" },
  classes: { individual: "individual", corporate: "corporate" },
  threshold: "Above the {class} threshold of {amount}",
  party: "{name} ({class})",
  counterparty: "With {name} ({class})",
  unnamed: "A member with no name on file",
  occurred: "Took place {date}",
  due: {
    overdue: "Overdue by {days} days",
    overdueOne: "Overdue by a day",
    withinHour: "Due within the hour",
    inHours: "Due in {hours} hours",
    inHour: "Due in 1 hour",
    inDays: "Due in {days} days",
    inDay: "Due in 1 day",
    done: "Closed",
  },
  state: { open: "Not yet filed", awaiting_approval: "Waiting for a second approver", closed: "Closed" },
  decide: {
    reported: "Filed with the NFIU",
    notReportable: "Not reportable",
    reference: "goAML reference",
    reportedOn: "Filed on",
    reason: "Why it is not reportable",
    record: "Record for approval",
  },
  approve: {
    approve: "Approve",
    reject: "Reject",
    note: "Note (needed to reject)",
    own: "You recorded this, so a different member of staff must approve it.",
  },
  recorded: {
    reported: "Filed {date} under {reference}, recorded by staff {when}",
    notReportable: "Recorded as not reportable: {note}",
    approved: "Approved {when}",
    rejected: "Rejected {when}: open again",
  },
  words: {
    not_staff: "Only staff can do this.",
    not_found: "That event could not be found.",
    not_open: "This event already has a decision waiting or closed.",
    bad_decision: "Choose filed or not reportable.",
    needs_reference: "Enter the goAML reference and the date it was filed.",
    bad_date: "The filing date must be between the transaction and today.",
    needs_reason: "Say why.",
    same_person: "A second member of staff must approve this, not the person who recorded it.",
    conflicted: "This report is about your own money, so another member of staff must decide and approve it.",
    bad_verdict: "Choose approve or reject.",
    superseded: "A newer decision was recorded. Refresh the lane.",
    already_approved: "This has already been approved or rejected.",
    failed: "That did not go through. Nothing was recorded. Try again in a moment.",
  },
};
