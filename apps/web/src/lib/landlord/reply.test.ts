import { describe, expect, it } from "vitest";
import { doneKeyFor, readReply, rentRows } from "./reply";

describe("the reply page's model", () => {
  it("passes the four quiet states straight through", () => {
    expect(readReply({ state: "unknown" })).toEqual({ state: "unknown" });
    expect(readReply({ state: "closed" })).toEqual({ state: "closed" });
    expect(readReply(null)).toEqual({ state: "failed" });
    expect(readReply({ state: "something new" })).toEqual({ state: "failed" });
  });

  it("reads an open vacancy question with the area and the lister, and nothing else", () => {
    const view = readReply({
      state: "open",
      purpose: "vacancy",
      place: "2 bedroom apartment in Ikeja GRA",
      area: "Ikeja GRA",
      lister_name: "Chidi Okeke",
      asked_at: "2026-09-24T10:00:00Z",
      answered_at: null,
      answer: null,
      rent: null,
    });
    expect(view).toMatchObject({ state: "open", purpose: "vacancy", place: "2 bedroom apartment in Ikeja GRA", rent: null });
    expect(JSON.stringify(view)).not.toMatch(/address|phone|\+234/i);
  });

  it("refuses a question it cannot place rather than rendering half of one", () => {
    expect(readReply({ state: "open", purpose: "vacancy" })).toEqual({ state: "failed" });
    expect(readReply({ state: "open", purpose: "rent", place: "flat in Yaba", rent: {} })).toEqual({ state: "failed" });
  });

  it("reads the frozen rent figures and lists only the parts that were charged", () => {
    const view = readReply({
      state: "open",
      purpose: "rent",
      place: "flat in Yaba",
      rent: {
        rent_minor: 250_000_000,
        caution_minor: 56_000_000,
        service_minor: null,
        agency_minor: 25_000_000,
        legal_minor: 0,
        agreement_minor: null,
        total_minor: 331_000_000,
        total_stated: false,
        currency: "NGN",
        move_in: "2026-11-01",
        rent_period: "year",
      },
    });
    expect(view.state).toBe("open");
    if (view.state !== "open") return;
    expect(view.rent!.totalMinor).toBe(331_000_000);
    expect(rentRows(view.rent!)).toEqual([
      { key: "rent", minor: 250_000_000 },
      { key: "caution", minor: 56_000_000 },
      { key: "agency", minor: 25_000_000 },
    ]);
  });

  it("names the thank-you for each accepted answer", () => {
    expect(doneKeyFor("not_instructed")).toBe("notInstructed");
    expect(doneKeyFor("disputed")).toBe("disputed");
    expect(doneKeyFor("stopped")).toBe("stopped");
    expect(doneKeyFor("maybe")).toBeNull();
  });
});
