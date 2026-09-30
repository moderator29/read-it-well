import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { changeLine, changesFromRows } from "./changes";

const copy = getDictionary("en").catalogue.savedChanges;

describe("changes on saved places (B13)", () => {
  const rows = [
    { listing_id: "a", change: "price", old_minor: 300_000_000, new_minor: 270_000_000, changed_at: "2026-09-29T10:00:00Z" },
    { listing_id: "a", change: "viewing_windows", changed_at: "2026-09-20T10:00:00Z" },
    { listing_id: "b", change: "availability", available: false, changed_at: "2026-09-28T10:00:00Z" },
    { listing_id: "c", change: "price", old_minor: 0, new_minor: 5, changed_at: "2026-09-28T10:00:00Z" },
    { listing_id: 7, change: "price" },
  ];
  const map = changesFromRows(rows);

  it("folds rows per listing, newest first, skipping what cannot be said", () => {
    expect(map.get("a")?.map((c) => c.kind)).toEqual(["price", "viewing_windows"]);
    expect(map.has("c")).toBe(false);
  });

  it("says the newest change since the last visit, and nothing older", () => {
    const line = changeLine(map.get("a"), Date.parse("2026-09-25T00:00:00Z"), "en", copy);
    expect(line?.text).toMatch(/^Price down from ₦3,000,000 to ₦2,700,000$/);
    expect(changeLine(map.get("a"), Date.parse("2026-09-30T00:00:00Z"), "en", copy)).toBeNull();
  });

  it("marks a place that went off the market", () => {
    expect(changeLine(map.get("b"), null, "en", copy)).toEqual({ text: copy.gone, gone: true });
  });
});
