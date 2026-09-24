import { describe, expect, it } from "vitest";
import { parseBroadcast } from "./broadcast";
import { mergeSpans, verbatimSpans } from "./broadcast-model";

const MESSAGE = "2 bed flat in Yaba going for 1.5m yearly, agent 10 percent, caution 200k";

describe("the optional second reader can only point at what the agent wrote", () => {
  it("throws away any span that is not in the message, too long, or not a known field", () => {
    const spans = verbatimSpans(MESSAGE, {
      rent: "1.5m",
      agency: "10 percent",
      caution: "250k",
      legal: "10%",
      phone: "08031234567",
      area: "Yaba",
      total: "x".repeat(41),
    });
    expect(spans).toEqual({ rent: "1.5m", agency: "10 percent", area: "Yaba" });
    expect(verbatimSpans(MESSAGE, null)).toEqual({});
  });

  it("fills only what the first pass left empty, through the same kobo arithmetic", () => {
    const base = parseBroadcast(MESSAGE);
    const merged = mergeSpans(base, { agency: "10 percent", caution: "200k" });
    /* The first pass already had the caution; the second may not replace it. */
    expect(merged.kobo.cautionDepositNaira).toBe(base.kobo.cautionDepositNaira);
    if (base.kobo.agencyFeeNaira === undefined) {
      expect(merged.kobo.agencyFeeNaira).toBe(15_000_000);
      expect(merged.filled).toContain("agencyFeeNaira");
    }
  });

  it("changes nothing when there is nothing to add", () => {
    const base = parseBroadcast(MESSAGE);
    expect(mergeSpans(base, {})).toBe(base);
  });
});
