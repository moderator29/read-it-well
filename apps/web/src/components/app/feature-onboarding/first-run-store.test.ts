import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * D49.3: a first-run gate whose store read throws interrupts nobody, and
 * reports the throw rather than swallowing it.
 */
const reported = vi.hoisted(() => [] as unknown[]);

vi.mock("@/lib/observability/report", () => ({
  reportError: vi.fn(async (input: { context?: { kind?: unknown } }) => {
    reported.push(input.context?.kind);
    return { sent: false, reason: "not_configured" };
  }),
}));

const BROKEN = new Error("relation does not exist");
beforeEach(() => {
  reported.length = 0;
});

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
const redirect = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ redirect }));

describe("the first-run gate", () => {
  it("lets the member through and reports when the store read throws", async () => {
    const { gateFirstRun } = await import("./first-run-store");
    const store = {
      read: async () => {
        throw BROKEN;
      },
    };
    await gateFirstRun("host", "/host", {}, store as never);
    expect(redirect).not.toHaveBeenCalled();
    expect(reported).toEqual(["read.first_run"]);
  });
});
