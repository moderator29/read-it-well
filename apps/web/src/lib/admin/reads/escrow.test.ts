import { describe, expect, it } from "vitest";
import { narrowEscrows } from "./escrow";

const row = (state: string, created: string, title: string | null) => ({ state, created_at: created, listings: title ? { title } : null });

describe("narrowEscrows", () => {
  const rows = [
    row("HELD", "2026-09-20T10:00:00Z", "Flat in Lekki"),
    row("RELEASED", "2026-09-21T10:00:00Z", "Flat in Lekki"),
    row("DISPUTED", "2026-09-22T10:00:00Z", "House in Ikoyi"),
    row("FUNDED", "2026-09-10T10:00:00Z", null),
  ];
  it("shows only live escrows when no state is chosen, newest first", () => {
    expect(narrowEscrows(rows, {}).map((r) => r.state)).toEqual(["DISPUTED", "HELD", "FUNDED"]);
  });
  it("shows exactly the chosen state, settled ones included", () => {
    expect(narrowEscrows(rows, { status: "RELEASED" }).map((r) => r.state)).toEqual(["RELEASED"]);
  });
  it("ignores a state that is not an escrow state rather than showing everything", () => {
    expect(narrowEscrows(rows, { status: "NOPE" }).map((r) => r.state)).toEqual(["DISPUTED", "HELD", "FUNDED"]);
  });
  it("matches the property title and a Lagos date range", () => {
    expect(narrowEscrows(rows, { q: "lekki" }).map((r) => r.state)).toEqual(["HELD"]);
    expect(narrowEscrows(rows, { from: "2026-09-21", to: "2026-09-22" }).map((r) => r.state)).toEqual(["DISPUTED"]);
  });
});
