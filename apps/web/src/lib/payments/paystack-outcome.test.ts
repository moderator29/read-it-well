import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initiateTransfer, PaystackError, PaystackUnknownOutcome } from "./paystack";

/*
 * MON-01. A withdrawal whose transfer call timed out was marked FAILED and its
 * money handed back, even when Paystack had accepted the transfer. The client
 * now tells "did not happen" (an explicit refusal) apart from "we do not know"
 * (no answer, a 5xx, an unreadable 2xx), and only the first may release a hold.
 */
const transfer = () =>
  initiateTransfer({ amountMinor: 100000, recipientCode: "RCP_x", reference: "rm-wd-test" });

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
      answer(400, { status: false, message: "You cannot initiate third party payouts as a starter business" }),
    );
    const error = await transfer().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PaystackError);
    expect(error).not.toBeInstanceOf(PaystackUnknownOutcome);
  });

  it("a success is a success", async () => {
    vi.stubGlobal(
      "fetch",
      answer(200, { status: true, data: { transfer_code: "TRF_1", reference: "rm-wd-test", status: "pending" } }),
    );
    await expect(transfer()).resolves.toMatchObject({ transferCode: "TRF_1" });
  });
});
