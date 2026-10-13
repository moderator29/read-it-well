import { beforeEach, describe, expect, it, vi } from "vitest";

const seam = vi.hoisted(() => ({
  access: { state: "admin" } as Record<string, unknown>,
  calls: [] as { fn: string; args: Record<string, unknown> }[],
  answer: { data: null as unknown, error: null as unknown },
  scope: undefined as string | undefined,
}));

vi.mock("../guard", () => ({
  requireAdmin: async (scope?: string) => {
    seam.scope = scope;
    return seam.access["state"] === "admin"
      ? {
          state: "admin",
          userClient: {
            rpc: async (fn: string, args: Record<string, unknown>) => {
              seam.calls.push({ fn, args });
              return seam.answer;
            },
          },
        }
      : seam.access;
  },
}));

const { CALL_USAGE_RANGES, DEFAULT_CALL_USAGE_RANGE, callUsageWindow, connectRate, parseCallUsage, readCallUsageRange } =
  await import("./call-usage");
const { readCallUsage } = await import("./call-usage-read");

const SUMMARY = {
  total: 10,
  by_state: { ENDED: 6, MISSED: 3, CANCELLED: 1 },
  audio: 4,
  video: 6,
  review_calls: 2,
  connected: 6,
  accepted: 7,
  estimated_participant_minutes: 41.5,
  reconciled_participant_minutes: null,
  average_duration_seconds: 312,
  average_setup_seconds: 4,
  calls_with_reconnects: 1,
};

beforeEach(() => {
  seam.access = { state: "admin" };
  seam.calls = [];
  seam.answer = { data: null, error: null };
});

describe("the range", () => {
  it("reads 7, 30 or 90 and falls back to 30 for anything else", () => {
    expect(CALL_USAGE_RANGES).toEqual(["7", "30", "90"]);
    expect(readCallUsageRange("7")).toBe("7");
    expect(readCallUsageRange(["90", "7"])).toBe("90");
    expect(readCallUsageRange("365")).toBe(DEFAULT_CALL_USAGE_RANGE);
    expect(readCallUsageRange(undefined)).toBe("30");
  });

  it("is a window of whole days ending now", () => {
    const now = new Date("2026-10-13T12:00:00Z");
    expect(callUsageWindow("7", now)).toEqual({ from: "2026-10-06T12:00:00.000Z", to: "2026-10-13T12:00:00.000Z" });
  });
});

describe("parseCallUsage", () => {
  it("reads the summary and keeps a figure the database did not send as null, never zero", () => {
    const usage = parseCallUsage(SUMMARY)!;
    expect(usage).toMatchObject({ total: 10, video: 6, audio: 4, estimatedMinutes: 41.5, reconciledMinutes: null, withReconnects: 1 });
    expect(usage.byState.map((s) => s.state)).toEqual(["ENDED", "MISSED", "CANCELLED"]);
    expect(parseCallUsage({ ...SUMMARY, average_setup_seconds: undefined })!.averageSetupSeconds).toBeNull();
  });

  it("refuses anything that is not a summary", () => {
    expect(parseCallUsage(null)).toBeNull();
    expect(parseCallUsage([])).toBeNull();
    expect(parseCallUsage({ nothing: true })).toBeNull();
  });

  it("computes the connect rate only when there are calls", () => {
    expect(connectRate({ total: 10, connected: 6 })).toBe(60);
    expect(connectRate({ total: 0, connected: 0 })).toBeNull();
  });
});

describe("readCallUsage", () => {
  it("asks on the operator's own client, in the operations scope, for the window", async () => {
    seam.answer = { data: SUMMARY, error: null };
    const read = await readCallUsage("30", new Date("2026-10-13T12:00:00Z"));
    expect(read.state).toBe("ok");
    expect(seam.scope).toBe("operations");
    expect(seam.calls).toEqual([
      { fn: "call_usage_summary", args: { p_from: "2026-09-13T12:00:00.000Z", p_to: "2026-10-13T12:00:00.000Z" } },
    ]);
  });

  it("is forbidden outside the door, unavailable when the read fails or is malformed", async () => {
    seam.access = { state: "not-admin" };
    expect(await readCallUsage("30")).toEqual({ state: "forbidden" });
    seam.access = { state: "admin" };
    seam.answer = { data: null, error: { code: "42501" } };
    expect(await readCallUsage("30")).toEqual({ state: "unavailable" });
    seam.answer = { data: { oops: 1 }, error: null };
    expect(await readCallUsage("30")).toEqual({ state: "unavailable" });
  });
});
