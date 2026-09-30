import { describe, expect, it } from "vitest";
import { countReasons } from "./review-reason-counts";

describe("why listings were sent back (C8)", () => {
  it("counts codes on send-backs and rejections only", () => {
    const out = countReasons([
      { metadata: { decision: "reject", reasons: "photos_unclear,wrong_category" } },
      { metadata: { decision: "request_changes", reasons: "photos_unclear" } },
      { metadata: { decision: "approve", reasons: "photos_unclear" } },
      { metadata: null },
    ]);
    expect(out[0]).toMatchObject({ code: "photos_unclear", count: 2 });
    expect(out.find((r) => r.code === "wrong_category")?.count).toBe(1);
  });
});
