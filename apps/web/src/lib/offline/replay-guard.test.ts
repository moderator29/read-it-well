import { beforeEach, describe, expect, it, vi } from "vitest";

const seam = vi.hoisted(() => ({ calls: [] as { fn: string; args: Record<string, unknown> }[], claim: { state: "fresh" } as unknown }));
vi.mock("../security/service-rpc", () => ({
  hasServiceRole: () => true,
  callSecurityRpc: async (fn: string, args: Record<string, unknown>) => {
    seam.calls.push({ fn, args });
    return fn === "claim_idempotency" ? { ok: true, data: seam.claim } : { ok: true, data: true };
  },
}));

const KEY = "3f1c2a4e-9b7d-4c1e-8a2b-6d5e4f3a2b1c";

beforeEach(() => {
  seam.calls = [];
  seam.claim = { state: "fresh" };
});

describe("one row per tap (V-40)", () => {
  it("claims with a two-minute lease and keeps a success for three days", async () => {
    const { oncePerTap } = await import("./replay-guard");
    const result = await oncePerTap("outbox.message", "u-1", KEY, async () => ({ ok: true as const, data: { id: "m", conversationId: "c", createdAt: "t", body: "secret words" } }), (m) => ({
      id: m.id,
      conversationId: m.conversationId,
      createdAt: m.createdAt,
    }));
    expect(result.ok).toBe(true);
    expect(seam.calls[0]).toMatchObject({ fn: "claim_idempotency", args: { ttl_seconds: 120 } });
    expect(seam.calls[1]).toMatchObject({ fn: "record_idempotency_result_kept", args: { keep_seconds: 3 * 86_400 } });
    expect(JSON.stringify(seam.calls[1]!.args.result)).not.toContain("secret words");
  });

  it("releases a failure at once, and answers in-flight as retryable", async () => {
    const { oncePerTap } = await import("./replay-guard");
    await oncePerTap("outbox.post", "u-1", KEY, async () => ({ ok: false as const, error: "no" }));
    expect(seam.calls.map((c) => c.fn)).toEqual(["claim_idempotency", "release_idempotency"]);
    seam.claim = { state: "in_flight" };
    const busy = await oncePerTap("outbox.post", "u-1", KEY, async () => ({ ok: true as const, data: null }));
    expect(busy.ok === false && busy.fieldErrors?.idempotency).toBe("in_flight");
  });
});
