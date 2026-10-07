import { describe, expect, it } from "vitest";
import { factValue, factViews, isFactKey } from "./passport-facts";
import type { PassportFacts } from "@/lib/trust/passport";

const NOTHING: PassportFacts = {
  phoneConfirmed: false,
  nimcMatchedAt: null,
  inspectionsAttended: 0,
  tenancies: 0,
  memberSince: null,
};

describe("the passport's facts", () => {
  it("prints nothing for a record with nothing behind it, and never a tick or a zero", () => {
    expect(factViews(NOTHING, null)).toEqual([]);
    expect(factViews(null, null)).toEqual([]);
  });

  it("gives a dated fact its date and a counted fact its count, and invents neither", () => {
    const views = factViews(
      { ...NOTHING, nimcMatchedAt: "2026-03-12T10:00:00Z", inspectionsAttended: 4, memberSince: "2026-01-02T09:00:00Z" },
      null,
    );
    expect(views.map((v) => v.key)).toEqual(["identity", "attended", "since"]);
    expect(factValue(views[0]!, "en")).toMatch(/12 Mar 2026/);
    expect(factValue(views[1]!, "en")).toBe("4");
    expect(views[1]!.at).toBeNull();
  });

  it("shows a confirmed phone with its date when the date is known, and with none when it is not", () => {
    const withDate = factViews({ ...NOTHING, phoneConfirmed: true }, "2026-02-01T08:00:00Z");
    expect(factValue(withDate[0]!, "en")).toMatch(/1 Feb 2026/);
    const without = factViews({ ...NOTHING, phoneConfirmed: true }, "not a date");
    expect(without[0]!.at).toBeNull();
    expect(factValue(without[0]!, "en")).toBeNull();
  });

  it("knows its own keys", () => {
    expect(isFactKey("phone")).toBe(true);
    expect(isFactKey("streak")).toBe(false);
  });
});
