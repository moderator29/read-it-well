/**
 * THE COMPLIANCE DESK, in English. SCUML-EFCC AML/CFT duties (Money
 * Laundering (Prevention and Prohibition) Act 2022).
 *
 * Staff-only copy. Nothing in this namespace is ever shown to a member: a
 * sanctions hit, a PEP flag, a risk class or a report is an internal record,
 * and the member is told nothing that would tip them off.
 *
 * WHY THIS IS ITS OWN FILE. `en.ts` is written by several builders at once;
 * a namespace in its own module touches it with one import and one line.
 * Each builder adds their lane's copy in their OWN module
 * (`compliance-<item>.en.ts`) and one line below, so nobody edits another's.
 */
export const complianceEn = {
  desk: {
    title: "Compliance",
    lede: "The AML/CFT duties Vallo owes as a DNFBP, one lane per obligation. Staff only; nothing here is ever shown to a member.",
    tabsLabel: "Compliance lanes",
    noLanes: "No compliance lanes are built yet.",
    unavailableTitle: "This lane could not be read",
    unavailableBody: "The check could not run just now, so nothing here means clear. Try again in a moment.",
    item: "SCUML item {item}",
    tryAgain: "Try again",
  },
  /* SCUML items 8 and 9: sanctions screening. */
  sanctions: {
    tab: "Sanctions",
    lede: "Every person and transaction screened against the UN Consolidated List and the Nigeria Sanctions List. A match waits here until two people agree.",
    lists: "Lists in force",
    listNone: "No list has been loaded yet, so nobody has been screened against it.",
    listRow: "{source}: version of {when}, {count} entries",
    sourceUn: "UN Consolidated List",
    sourceNg: "Nigeria Sanctions List",
    upload: "Load a list file",
    uploadHelp: "The UN list as its XML file, or the Nigeria list as CSV (reference, name, aliases, date of birth, nationality, listed on). Loading a new version re-screens everyone.",
    uploadSource: "Which list",
    uploadFile: "File",
    uploadGo: "Load and re-screen",
    uploadDone: "Loaded {count} entries. Everyone is queued to be screened again.",
    uploadSame: "That file is the version already in force. Nothing changed.",
    uploadFailed: "The file could not be read as that list. Nothing changed.",
    hitsTitle: "Matches waiting on a decision",
    hitsEmpty: "No matches are waiting.",
    hitsEmptyBody: "Every screening since the lists were loaded came back clear, or has been decided.",
    exact: "Exact match",
    fuzzy: "Close match ({score})",
    against: "Against {name}, {reference}",
    screenedAs: "Screened as {name}",
    why: "Why it was screened: {trigger}",
    trigger: {
      lister_verification: "lister verification",
      payout_account: "payout account added",
      identity: "identity checked",
      transaction: "a transaction",
      list_change: "a new list version",
      manual: "asked by staff",
    },
    proposeClear: "Not the same person",
    proposeConfirm: "It is the same person",
    notePlaceholder: "What you checked (date of birth, nationality, documents)",
    proposed: "{who} proposed: {decision}. A second person must approve.",
    approve: "Approve",
    ownProposal: "You proposed this; a second person must approve it.",
    byYou: "You",
    byColleague: "A colleague",
    decided: "Decided",
    cleared: "Cleared: not the same person",
    confirmed: "Confirmed: money on the account is held",
    strOffer: "Open a suspicious transaction report",
    decisionFailed: "That decision was not recorded. Nothing has changed.",
    recentTitle: "Recent screenings",
    recentEmpty: "Nothing has been screened yet.",
    outcome: { clear: "Clear", exact: "Exact match", fuzzy: "Close match", error: "Could not screen" },
  },
};
