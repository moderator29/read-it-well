import { describe, expect, it } from "vitest";
import { LEAD_COUNT, LEAD_STEP_MS, leadIndexes, leadProps, leadPropsFor } from "./lead";

/** Motion 10: the first six arrive 40ms apart, and nothing after them. */
describe("the lead six", () => {
  it("staggers items 0 to 5 in order and nothing else", () => {
    for (let i = 0; i < LEAD_COUNT; i += 1) {
      const lead = leadProps(i);
      expect(lead.className).toBe("nf-feed-lead");
      expect((lead.style as Record<string, number>)["--nf-i"]).toBe(i);
    }
    expect(leadProps(LEAD_COUNT)).toEqual({});
    expect(leadProps(40)).toEqual({});
    expect(leadProps(-1)).toEqual({});
  });

  it("is six items at forty milliseconds, as the motion system says", () => {
    expect(LEAD_COUNT).toBe(6);
    expect(LEAD_STEP_MS).toBe(40);
  });

  it("keys the lead by post id, once: hiding card 3 does not pull card 7 in, and it stops after it has played", () => {
    const ids = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const leads = leadIndexes(ids);
    expect(leads.size).toBe(LEAD_COUNT);
    expect(leadPropsFor(leads, "g", false)).toEqual({});
    expect(leadPropsFor(leads, "h", false)).toEqual({});
    expect(leadPropsFor(leads, "c", false).className).toBe("nf-feed-lead");
    /* A returning remount, after the lead has played, carries no class. */
    expect(leadPropsFor(leads, "c", true)).toEqual({});
  });
});
