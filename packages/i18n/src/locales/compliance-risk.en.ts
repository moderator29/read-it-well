/**
 * SCUML item 15. RISK CLASSIFICATION, in English.
 *
 * Staff only. A person's risk class is never shown to them and is not a public
 * score (V-21). The only member-facing words this item has are the gates'
 * refusals, which live in the database and say a check is needed, never why.
 *
 * Its own module so `en.ts` carries one import and one line. British spelling,
 * no dashes as punctuation.
 */
export const complianceRiskEn = {
  /* The gates' refusals. The admin is told why; the member is told nothing
     that would tip them off. */
  gate: {
    admin: "Needs a cleared EDD review on the compliance desk (item 15).",
    member: "We need to check a detail before this can be added. We will be in touch.",
  },
  lane: {
    tab: "Risk",
    lede: "Every customer classified high, medium or low from the documented factors, dated, with the history kept. A high-risk lister cannot publish or add a payout account until two people clear an enhanced due diligence review.",
    counts: "{high} high, {medium} medium, {low} low. {due} due for review.",
    peopleTitle: "High and medium, and anyone due",
    peopleEmpty: "Nobody is high or medium risk, and no review is due.",
    peopleEmptyBody: "The daily run classifies every lister, every PEP and everyone who moved money in the last 90 days.",
    class: { high: "High", medium: "Medium", low: "Low" },
    derived: "Derived {date}",
    overridden: "Set by {who} on {date}: {reason}",
    due: "Next review {date}",
    overdue: "Review overdue since {date}",
    gateShut: "Gates shut until an EDD review is cleared",
    gateOpen: "EDD cleared",
    reasons: {
      pep: "PEP",
      sanctions_hit: "sanctions match",
      upheld_fraud: "upheld fraud",
      volume_very_high: "₦50m or more in 90 days",
      lister_unverified: "lister, identity not checked",
      open_reports: "open report",
      volume_reportable: "₦5m or more in 90 days",
      staff_override: "set by staff",
    },
    factors: "PEP {pep}; sanctions {sanctions}; lister {lister}; identity rung {rung}; {volume} in 90 days; {reports} open reports; {fraud} upheld fraud",
    yes: "yes",
    no: "no",
    unknown: "not screened",
    none: "none",
    openTitle: "Enhanced due diligence waiting",
    openEmpty: "No enhanced due diligence is waiting.",
    overrideTitle: "Set a person's class by hand",
    overrideHelp: "Their handle, or the account id from their person file. The reason is kept with the class for five years.",
    person: "Handle or account id",
    reason: "Why",
    reasonHelp: "At least a sentence: what you checked and what it showed.",
    set: "Set the class",
    saved: "Recorded.",
    notFound: "No member has that handle or id.",
    failed: "That was not recorded. Nothing has changed.",
    pendingTitle: "Class changes waiting on a second person",
    pendingEmpty: "No class change is waiting.",
    pendingRow: "{name}: {from} to {to}, proposed by {who} on {date}: {reason}",
    pendingNote: "A class lowered by hand takes effect only when a second member of staff approves it.",
    approve: "Approve",
    ownProposal: "You proposed this, so a second person must approve it.",
    approved: "Approved.",
    proposed: "Recorded. Lowering a class needs a second person to approve it.",
    reopen: "Reopen the EDD review",
    reopened: "Reopened. The gates stay shut until it is cleared again.",
  },
};
