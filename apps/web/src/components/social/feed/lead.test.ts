import { describe, expect, it } from "vitest";
import { LEAD_COUNT, LEAD_STEP_MS, leadProps } from "./lead";

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
});
