import { describe, expect, it } from "vitest";
import { documentToSupersede, type FiledDocument } from "./supersedes";

/*
 * A resubmission names the row it replaces, and the ladder counts only
 * current rows, so picking the wrong row is either a rung that can never pass
 * (the refused row left current) or an approved document quietly retired.
 */

const row = (id: string, kind: string, review_status: string, supersedes_id: string | null = null): FiledDocument => ({
  id,
  kind,
  review_status,
  supersedes_id,
});

describe("documentToSupersede", () => {
  it("replaces the refused side of a two sided ID, not the newer approved one", () => {
    const rows = [row("back", "identity", "approved"), row("front", "identity", "rejected")];
    expect(documentToSupersede(rows, "identity", { fallbackToLatest: true })).toBe("front");
    expect(documentToSupersede(rows, "identity", { fallbackToLatest: false })).toBe("front");
  });

  it("never picks a row that is already history", () => {
    const rows = [
      row("third", "identity", "pending", "second"),
      row("second", "identity", "rejected", "first"),
      row("first", "identity", "rejected"),
    ];
    expect(documentToSupersede(rows, "identity", { fallbackToLatest: false })).toBeNull();
    expect(documentToSupersede(rows, "identity", { fallbackToLatest: true })).toBe("third");
  });

  it("falls back to the newest current row only when asked", () => {
    const rows = [row("new", "address", "pending"), row("old", "address", "approved")];
    expect(documentToSupersede(rows, "address", { fallbackToLatest: true })).toBe("new");
    expect(documentToSupersede(rows, "address", { fallbackToLatest: false })).toBeNull();
  });

  it("looks only at the kind being filed", () => {
    const rows = [row("bill", "address", "rejected")];
    expect(documentToSupersede(rows, "identity", { fallbackToLatest: true })).toBeNull();
  });
});
