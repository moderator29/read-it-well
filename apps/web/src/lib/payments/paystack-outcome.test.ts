import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PaystackError, PaystackUnknownOutcome, refundTransaction } from "./paystack";

/*
 * MON-01, kept for the one call that still moves money out: a refund. The
 * client tells "did not happen" (an explicit refusal) apart from "we do not
 * know" (no answer, a 5xx, an unreadable 2xx), and only the first may be
 * recorded as failed. Track A retired the transfer calls this was first
 * written against.
 */
const transfer = () => refundTransaction({ reference: "rm-book-test", amountMinor: 100000 });

function answer(status: number, body: unknown) {
  return vi.fn(async () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), { status }),
  );
}

describe("Paystack outcome classification", () => {
  beforeEach(() => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_x");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("a network failure or timeout is an unknown outcome", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new DOMException("timed out", "TimeoutError"); }));
    await expect(transfer()).rejects.toBeInstanceOf(PaystackUnknownOutcome);
  });

  it("a 5xx is an unknown outcome", async () => {
    vi.stubGlobal("fetch", answer(502, "<html>bad gateway</html>"));
    await expect(transfer()).rejects.toBeInstanceOf(PaystackUnknownOutcome);
  });

  it("an unreadable 2xx is an unknown outcome", async () => {
    vi.stubGlobal("fetch", answer(200, "not json"));
    await expect(transfer()).rejects.toBeInstanceOf(PaystackUnknownOutcome);
  });

  it("an explicit refusal is a known failure, not an unknown one", async () => {
    vi.stubGlobal(
      "fetch",
      answer(400, { status: false, message: "Transaction has been fully reversed" }),
    );
    const error = await transfer().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PaystackError);
    expect(error).not.toBeInstanceOf(PaystackUnknownOutcome);
  });

  it("a success is a success", async () => {
    vi.stubGlobal(
      "fetch",
      answer(200, { status: true, data: { id: 42, status: "pending" } }),
    );
    await expect(transfer()).resolves.toMatchObject({ refundId: "42", status: "pending" });
  });
});
