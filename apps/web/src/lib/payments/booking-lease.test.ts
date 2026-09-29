import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => ({ claim: { ok: true, data: { state: "fresh" } } as unknown, calls: [] as string[] }));
vi.mock("@/lib/security/service-rpc", () => ({
  callSecurityRpc: vi.fn(async (fn: string) => {
    rpc.calls.push(fn);
    return fn === "claim_idempotency" ? rpc.claim : { ok: true, data: true };
  }),
}));

import { withBookingOpenLease } from "./booking-lease";

beforeEach(() => {
  rpc.calls = [];
  rpc.claim = { ok: true, data: { state: "fresh" } };
});

describe("the booking open lease", () => {
  it("runs the work and always releases, never recording anything", async () => {
    const out = await withBookingOpenLease("booking:1", async () => "opened");
    expect(out).toEqual({ status: "done", result: "opened" });
    expect(rpc.calls).toEqual(["claim_idempotency", "release_idempotency"]);
  });

  it("releases even when the work throws", async () => {
    await expect(withBookingOpenLease("booking:1", async () => { throw new Error("x"); })).rejects.toThrow("x");
    expect(rpc.calls).toContain("release_idempotency");
  });

  it("a second opener while the first holds it is told busy, and its work never runs", async () => {
    rpc.claim = { ok: true, data: { state: "in_flight" } };
    const work = vi.fn(async () => "opened");
    expect(await withBookingOpenLease("booking:1", work)).toEqual({ status: "busy" });
    expect(work).not.toHaveBeenCalled();
    expect(rpc.calls).not.toContain("release_idempotency");
  });

  it("runs unguarded when the claim table cannot be reached", async () => {
    rpc.claim = { ok: false, reason: "down" };
    expect(await withBookingOpenLease("booking:1", async () => "opened")).toEqual({ status: "done", result: "opened" });
    expect(rpc.calls).toEqual(["claim_idempotency"]);
  });
});
