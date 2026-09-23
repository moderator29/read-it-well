import { describe, expect, it } from "vitest";
import { isPublicPath } from "../../proxy";

/**
 * PRICE CHECK IS BEHIND THE GATE NOW, AND THIS FILE USED TO ASSERT THE
 * OPPOSITE.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT SAID UNTIL 23 SEPTEMBER, AND WHY IT SAID IT.
 *
 * `/price` is the acquisition surface. It is the one screen on this platform
 * that is useful in an area where we have nothing, and the case for building
 * it before there is any supply was that a stranger arrives cold, asks about
 * their own flat, gets an honest refusal plus a notify me, and leaves us a
 * geocoded demand signal telling us where to recruit. This file existed to
 * stop a one-word tidy-up in `proxy.ts` quietly removing that, because nothing
 * would have failed: the page would still render for anybody signed in and
 * every test would have stayed green.
 *
 * ---------------------------------------------------------------------------
 * THE FOUNDER OVERRULED IT, DELIBERATELY, AND IN THESE WORDS.
 *
 * Item 8 of 23 September: "Remove look around. You must sign in. Nothing
 * inside the platform is visible without signing up or signing in." Two
 * consequences were accepted with it by name, and the loss of the cold
 * acquisition path is the third, which is recorded here rather than left for
 * somebody to rediscover as a regression in three weeks.
 *
 * THE DEMAND SIGNAL IS NOT GONE, IT IS NARROWED. A Price Check ask still
 * records where somebody wanted supply; it now records it for people who made
 * an account first. That is a smaller funnel and it is the founder's call to
 * make. Nobody should "fix" it by reopening the segment.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT ASSERTS NOW, AND WHY IT IS STILL WORTH A FILE.
 *
 * The rule has flipped, so the failure mode has flipped with it. The one-word
 * edit to fear is no longer somebody adding `price` to a closed list; it is
 * somebody adding `price` to `PUBLIC_SEGMENTS` because the strategic argument
 * above is still written down in several places and still reads persuasively.
 * This asserts the founder's ruling against the live rule, through the same
 * function the running middleware calls, so a reopening is a red test with his
 * sentence attached rather than a silent reversal.
 */

describe("Price Check answers to the founder's gate, not to its own strategy note", () => {
  it("reads the real rule rather than a second copy of it", () => {
    /* The whole file is vacuous if the import stopped resolving to the
       middleware's own decision, so the function is shown to discriminate
       before anything is concluded from it. */
    expect(isPublicPath("/"), "the landing page must be public").toBe(true);
    expect(isPublicPath("/wallet"), "the wallet must not be").toBe(false);
  });

  it("gates `/price` behind sign-in, which is item 8", () => {
    expect(
      isPublicPath("/price"),
      "reopening `price` contradicts the founder's item 8 of 23 September: nothing inside the platform is visible without signing up or signing in",
    ).toBe(false);
    expect(isPublicPath("/price/area/anything")).toBe(false);
  });

  it("closes the browsing surfaces a refusal sends people to, so there is no half-open path", () => {
    /* Two of the nine refusals offer "see area prices" and one offers "see
       similar nearby". Those land inside this feature or on `/search`. Under
       the old rule all three had to stay open or a signed-out reader would
       have followed a refusal's own next action into a wall. Under the new
       rule the reader was never signed out in the first place, and the three
       destinations are closed with everything else. Asserted so that the two
       halves cannot drift apart and produce exactly the dead end the old
       version of this test was written to prevent. */
    expect(isPublicPath("/search")).toBe(false);
    expect(isPublicPath("/listing/anything")).toBe(false);
  });
});
