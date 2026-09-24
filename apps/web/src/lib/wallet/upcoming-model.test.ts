import { describe, expect, it } from "vitest";
import { mergeUpcoming, type UpcomingItem } from "./upcoming-model";

const item = (kind: UpcomingItem["kind"], on: string, amountMinor = 100, id = kind): UpcomingItem => ({
  kind,
  on,
  amountMinor,
  href: "/x",
  id,
});

describe("mergeUpcoming", () => {
  it("drops the past and zero amounts, and sorts soonest first", () => {
    const out = mergeUpcoming(
      [item("stay", "2026-10-02"), item("renewal", "2026-09-01"), item("held", "2026-09-30", 0), item("caution_owed_to_you", "2026-09-28")],
      "2026-09-24",
    );
    expect(out.map((row) => row.kind)).toEqual(["caution_owed_to_you", "stay"]);
  });
  it("breaks a same-day tie by what the reader owes first", () => {
    const out = mergeUpcoming([item("stay", "2026-10-01"), item("caution_you_owe", "2026-10-01"), item("renewal", "2026-10-01")], "2026-09-24");
    expect(out.map((row) => row.kind)).toEqual(["caution_you_owe", "renewal", "stay"]);
  });
  it("keeps today and refuses a malformed day", () => {
    expect(mergeUpcoming([item("held", "2026-09-24"), item("stay", "24/09/2026")], "2026-09-24")).toHaveLength(1);
  });
});
