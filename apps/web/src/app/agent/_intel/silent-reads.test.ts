import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * D49.3: the agent intel reads report a throw through `reportError` and still
 * answer "unavailable", so schema drift or a policy refusing the read is
 * visible rather than an empty state forever.
 */
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

describe("an agent intel read that throws is reported, and still answers", () => {
  it("listing health", async () => {
    const { readListingHealth } = await import("./health-read");
    expect(await readListingHealth(throwing as never, ID, ID)).toEqual({ state: "unavailable" });
    expect(reported).toEqual(["read.agent_listing_health"]);
  });

  it("requests, funnels, one funnel and the listing titles", async () => {
    const reads = await import("./space-read");
    expect(await reads.readRequests(throwing as never, ID)).toEqual({ state: "unavailable" });
    expect(await reads.readFunnels(throwing as never, ID)).toEqual({ state: "unavailable" });
    expect(await reads.readOneFunnel(throwing as never, ID, ID)).toEqual({ state: "unavailable" });
    expect(await reads.readListingTitles(throwing as never, ID)).toBeNull();
    expect(reported).toEqual([
      "read.agent_requests",
      "read.agent_funnels",
      "read.agent_one_funnel",
      "read.agent_listing_titles",
    ]);
  });
});
