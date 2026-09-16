/**
 * What `/around` says when it has nothing to show, in words that belong to the
 * reader rather than to us.
 *
 * ---------------------------------------------------------------------------
 * THE OLD SENTENCE HAD TWO FAULTS IN ONE LINE.
 *
 * "Places switch on the moment the platform keys land. Nothing here is a mock
 * up: there is simply nothing to read yet."
 *
 * "THE PLATFORM KEYS" IS OUR INFRASTRUCTURE, DESCRIBED TO A MEMBER OF THE
 * PUBLIC IN OUR OWN VOCABULARY. A key is a thing we hold and a thing we forgot
 * to renew; the reader neither knows nor cares what one is, and telling them
 * about it makes our deployment their problem. "Mock up" is the same fault
 * again: it is a word from our own review process, and a reader who was not
 * worried about mock-ups until we mentioned them now is.
 *
 * "SWITCH ON THE MOMENT X LANDS" IS "COMING SOON" IN A DIFFERENT COAT. It is a
 * schedule nobody can keep, it is banned in UI copy and the ban is enforced by
 * specs, and the synonym walks straight past them. Worse, it is not even a
 * pre-launch state: in production this branch means a key has lapsed, so the
 * copy was telling somebody a working feature was unbuilt.
 *
 * So these say whose fault it is, that nothing has been lost, and what will be
 * here when it is here. No timing, because we cannot keep one.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS A FILE AND NOT TWO STRINGS AT TWO CALL SITES.
 *
 * `/around` and `/around/settings` both answer this and they answer it about
 * different things: one about the timeline, one about the directory. Two
 * hand-written copies of an apology drift, and the product ends up apologising
 * twice in two voices on two screens of the same feature.
 *
 * WHAT IS STILL WRONG AND IS NOT THIS OWNER'S TO FIX. The banned sentence also
 * lives as `PLACE_COPY.unconfigured` in `lib/social/places-schema.ts`, which is
 * outside this scope. Nothing renders it any more, so the product no longer
 * says it, but the string is still in the tree and the spec that bans the
 * synonym will not catch it. It is listed in the sprint report for removal.
 */
export const AROUND_UNCONFIGURED = {
  /** The feed, where the question is "why is there nothing to read". */
  feedTitle: "We cannot reach Around right now",
  feedBody:
    "This is on our side, not yours. Nothing you have written has been lost. When it is back, the places you are in and what people are saying in them are here.",

  /** The directory, where the question is "where are all the places". */
  settingsTitle: "We cannot reach the list of places right now",
  settingsBody:
    "This is on our side, not yours. Nothing you have joined has been lost, and the places you are already in come back with it. Everything else in the app works as normal.",
} as const;
