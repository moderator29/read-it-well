import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * AR-11. The desk's three blocked-terms calls go through the database's own
 * functions on the caller's client, refuse a bad shape before the call, and
 * never report success on a failed or refused call.
 */
const seam = vi.hoisted(() => ({
  access: { state: "admin" } as { state: string },
  calls: [] as { fn: string; args?: Record<string, unknown> }[],
  result: { data: null as unknown, error: null as { code?: string; message?: string } | null },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("./guard", () => ({
  requireAdmin: async () =>
    seam.access.state === "admin"
      ? {
          state: "admin",
          userClient: {
            rpc: async (fn: string, args?: Record<string, unknown>) => {
              seam.calls.push({ fn, args });
              return seam.result;
            },
          },
        }
      : seam.access,
  adminRefusal: () => "refused",
}));

const { listBlockedTerms, putBlockedTerm, retireBlockedTerm } = await import("./blocked-terms-actions");

const good = {
  term: "  Send  Money First ",
  category: "fraud.advance-fee",
  action: "hold",
  severity: "high",
  reason: "Classic advance-fee opener in rental scams.",
};

describe("blocked terms desk", () => {
  beforeEach(() => {
    seam.access = { state: "admin" };
    seam.calls = [];
    seam.result = { data: null, error: null };
  });

  it("refuses a caller without the moderation scope before any call", async () => {
    seam.access = { state: "not-admin" };
    expect((await putBlockedTerm(good)).ok).toBe(false);
    expect((await retireBlockedTerm({ term: "x y", reason: "twelve chars plus" })).ok).toBe(false);
    expect((await listBlockedTerms()).ok).toBe(false);
    expect(seam.calls).toEqual([]);
  });

  it("normalises the term and sends exactly the function's arguments", async () => {
    expect((await putBlockedTerm(good)).ok).toBe(true);
    expect(seam.calls).toEqual([
      {
        fn: "staff_blocked_term_put",
        args: {
          p_term: "send money first",
          p_category: "fraud.advance-fee",
          p_action: "hold",
          p_severity: "high",
          p_reason: "Classic advance-fee opener in rental scams.",
          p_refusal_reason: null,
        },
      },
    ]);
  });

  it("refuses a term the scanner could never match", async () => {
    expect((await putBlockedTerm({ ...good, term: "pay-now" })).ok).toBe(false);
    expect(seam.calls).toEqual([]);
  });

  it("refuse needs an abuse category and a written reason", async () => {
    expect((await putBlockedTerm({ ...good, action: "refuse", refusalReason: "long enough reason here" })).ok).toBe(false);
    expect((await putBlockedTerm({ ...good, category: "abuse.violence-threat", action: "refuse" })).ok).toBe(false);
    expect(seam.calls).toEqual([]);
    const done = await putBlockedTerm({
      ...good,
      category: "abuse.violence-threat",
      action: "refuse",
      refusalReason: "A direct threat of violence, never publishable.",
    });
    expect(done.ok).toBe(true);
    expect(seam.calls[0]?.args?.p_refusal_reason).toBe("A direct threat of violence, never publishable.");
  });

  it("never reports success on a database refusal", async () => {
    seam.result = { data: null, error: { code: "42501", message: "not permitted" } };
    expect((await putBlockedTerm(good)).ok).toBe(false);
    seam.result = { data: null, error: { code: "P0002", message: "no live term" } };
    expect((await retireBlockedTerm({ term: "send money first", reason: "No longer seen in reports." })).ok).toBe(false);
    seam.result = { data: null, error: { code: "08006" } };
    expect((await listBlockedTerms()).ok).toBe(false);
  });

  it("retiring needs a reason", async () => {
    expect((await retireBlockedTerm({ term: "send money first", reason: "short" })).ok).toBe(false);
    expect(seam.calls).toEqual([]);
    expect((await retireBlockedTerm({ term: "send money first", reason: "No longer seen in reports." })).ok).toBe(true);
    expect(seam.calls[0]).toEqual({ fn: "staff_blocked_term_retire", args: { p_term: "send money first", p_reason: "No longer seen in reports." } });
  });

  it("lists what the function returns", async () => {
    seam.result = { data: [{ term: "a b", action: "hold" }], error: null };
    const read = await listBlockedTerms();
    expect(read.ok && read.data).toEqual([{ term: "a b", action: "hold" }]);
  });
});
