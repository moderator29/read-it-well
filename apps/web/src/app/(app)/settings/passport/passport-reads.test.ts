import { beforeEach, describe, expect, it, vi } from "vitest";

/** D49.3: the passport's phone date read reports a throw and still answers null. */
const reported = vi.hoisted(() => [] as unknown[]);

vi.mock("@/lib/observability/report", () => ({
  reportError: vi.fn(async (input: { context?: { kind?: unknown } }) => {
    reported.push(input.context?.kind);
    return { sent: false, reason: "not_configured" };
  }),
}));

const BROKEN = new Error("relation does not exist");
const throwing = {
  from: () => {
    throw BROKEN;
  },
  rpc: () => {
    throw BROKEN;
  },
};

const ID = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  reported.length = 0;
});

vi.mock("@/lib/actions/session", () => ({
  resolveSession: async () => ({ state: "signed-in", supabase: throwing, user: { id: ID } }),
}));

describe("the phone confirmation date", () => {
  it("is reported when the read throws, and is null", async () => {
    const { readPhoneConfirmedAt } = await import("./passport-reads");
    expect(await readPhoneConfirmedAt()).toBeNull();
    expect(reported).toEqual(["read.passport_phone"]);
  });
});
