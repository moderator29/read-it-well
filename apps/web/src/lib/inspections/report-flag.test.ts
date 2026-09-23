import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("reportStorageLive", () => {
  it("is on now that I1 is applied, and off only when VALLO_INSPECTION_REPORTS is 0", async () => {
    const { reportStorageLive } = await import("./report-flag");
    expect(reportStorageLive({})).toBe(true);
    expect(reportStorageLive({ VALLO_INSPECTION_REPORTS: "1" })).toBe(true);
    expect(reportStorageLive({ VALLO_INSPECTION_REPORTS: "0" })).toBe(false);
  });
});
