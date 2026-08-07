import { describe, expect, it } from "vitest";
import { priceMoved, PRICE_MOVE_TOLERANCE } from "./liteapi-prebook";

/**
 * When a moved price is worth stopping somebody over.
 *
 * The network half of prebooking is proved the way every other provider call in
 * this directory is: it either answers or it does not, and every failure is an
 * outcome rather than a throw. What is worth testing is this rule, because it
 * is the one that decides whether a guest is interrupted, and both ways of
 * getting it wrong are real.
 *
 * Too sensitive and every booking stops on a rounding difference, which trains
 * people to tap through the warning that will one day matter. Too loose and
 * somebody walks into a checkout quoting materially more than the card they
 * just read, which is the thing this whole revalidation exists to prevent.
 */

describe("whether a price move is worth saying out loud", () => {
  const shown = 18_500_000; // 185,000 naira in kobo

  it("ignores a move smaller than the tolerance", () => {
    // A single naira on a 185,000 room. Interrupting here is noise.
    expect(priceMoved(shown, shown + 100)).toBe(false);
  });

  it("ignores a move exactly at the tolerance", () => {
    // Strictly greater than, so the boundary itself passes quietly.
    expect(priceMoved(shown, shown * (1 + PRICE_MOVE_TOLERANCE))).toBe(false);
  });

  it("catches a move past the tolerance, upward", () => {
    expect(priceMoved(shown, shown * 1.1)).toBe(true);
  });

  it("catches a move past the tolerance, downward too", () => {
    /* A price that fell is still a price that is not the one on the card. It
       is good news, but a guest who was quoted 185,000 and lands on 140,000
       should be told they are getting the better number rather than left to
       wonder which page is lying. */
    expect(priceMoved(shown, shown * 0.75)).toBe(true);
  });

  it("is proportional, not absolute", () => {
    // The same 2,000 naira move: nothing on a suite, everything on a guest
    // house. An absolute threshold cannot express that and this is why.
    const suite = 50_000_000;
    const guesthouse = 1_500_000;
    expect(priceMoved(suite, suite + 200_000)).toBe(false);
    expect(priceMoved(guesthouse, guesthouse + 200_000)).toBe(true);
  });

  it("says nothing when there was no price to compare against", () => {
    /* Places hotels carry no price at all, so `priceMinor` is zero. Treating
       zero as a baseline would make every revalidation look like an infinite
       increase and stop every booking. */
    expect(priceMoved(0, 18_500_000)).toBe(false);
  });
});
