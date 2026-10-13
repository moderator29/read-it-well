/**
 * Session 3's copy for a lister publishing (round 5, M6): the last step of the
 * listing wizard, the chain it becomes once the listing is sent, and the line
 * a live listing carries in the workspace.
 *
 * One module per owner so agents can add strings without editing en.ts at
 * the same time. English only: ha, ig and yo fall back to it through
 * `withFallback` until a translator supplies a line, because an invented
 * translation of a new line is worse than none. The status words themselves
 * ("Draft", "Submitted", "Under review", "Live") are the workspace's
 * (`agentListings.workspace.status`), so the card, the chain and the
 * workspace row say one thing in one vocabulary.
 */
export const experienceListerEn = {
  publish: {
    /** Above the card on the last step: it is the card a member will see. */
    cardLabel: "What members will see",
    /** The heading over the chain once the listing is sent. */
    chainTitle: "Where your listing stands",
    /** `{date}` is a formatted date: the day the review team received it. */
    sentOn: "Received {date}",
    /** Read out beside each link of the chain, so it is never colour alone. */
    stateDone: "Done",
    stateNow: "Happening now",
    stateNext: "Not yet",
  },
  live: {
    /** The way from a live row to the listing as members see it. */
    open: "Open listing",
  },
};
