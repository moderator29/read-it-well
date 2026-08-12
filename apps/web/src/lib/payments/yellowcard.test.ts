import { describe, expect, it } from "vitest";

import { parseWebhook } from "./yellowcard";
import { CRYPTO_PREFIX, isCryptoReference, isFundReference } from "./references";

/**
 * The crypto webhook parser, tested because it is the function that decides
 * whether a wallet gets credited and by how much.
 *
 * Everything upstream of it is a signature check; everything downstream is
 * `recordFunding`, which is already exercised by the card path. This is the
 * layer that turns somebody else's JSON into an amount of somebody's money, so
 * the cases that matter are the ones where it should REFUSE.
 */

const settled = {
  sequenceId: `${CRYPTO_PREFIX}0f2b8b1e-1c4a-4b0e-9d3a-2f5c7e8a9b01`,
  amount: 50_000,
  currency: "NGN",
  status: "complete",
  customerEmail: "somebody@example.com",
};

describe("parseWebhook", () => {
  it("reads a settled collection into kobo, a reference and an email", () => {
    expect(parseWebhook(settled)).toEqual({
      reference: settled.sequenceId,
      amountMinor: 5_000_000,
      status: "completed",
      email: "somebody@example.com",
    });
  });

  it("rounds to the nearest kobo rather than shaving it", () => {
    // A provider settling through float arithmetic can hand back
    // 49999.999999. Flooring that quietly takes a kobo off somebody's credit;
    // the fraction is theirs to be exact about and not ours to discard.
    const parsed = parseWebhook({ ...settled, amount: 49_999.999999 });
    expect(parsed?.amountMinor).toBe(5_000_000);
  });

  it("refuses a body with no reference, because there is nothing to credit", () => {
    expect(parseWebhook({ ...settled, sequenceId: undefined })).toBeNull();
    expect(parseWebhook({ ...settled, sequenceId: "" })).toBeNull();
  });

  it("refuses an amount that is zero, negative or not a number", () => {
    expect(parseWebhook({ ...settled, amount: 0 })).toBeNull();
    expect(parseWebhook({ ...settled, amount: -100 })).toBeNull();
    expect(parseWebhook({ ...settled, amount: "fifty thousand" })).toBeNull();
    expect(parseWebhook({ ...settled, amount: Number.NaN })).toBeNull();
  });

  it("refuses anything that is not an object", () => {
    expect(parseWebhook(null)).toBeNull();
    expect(parseWebhook("completed")).toBeNull();
    expect(parseWebhook(42)).toBeNull();
  });

  it("does not treat an unsettled payment as settled", () => {
    // The route only credits on "completed", so every one of these is money
    // still in motion and must not reach the ledger.
    expect(parseWebhook({ ...settled, status: "pending" })?.status).toBe("pending");
    expect(parseWebhook({ ...settled, status: "processing" })?.status).toBe("pending");
    expect(parseWebhook({ ...settled, status: "failed" })?.status).toBe("failed");
    expect(parseWebhook({ ...settled, status: "expired" })?.status).toBe("failed");
    expect(parseWebhook({ ...settled, status: "cancelled" })?.status).toBe("failed");
  });

  it("calls a status it has never seen unknown rather than guessing", () => {
    // Deliberately not defaulting to completed. An unrecognised status must
    // never be the one that moves money.
    expect(parseWebhook({ ...settled, status: "quantum" })?.status).toBe("unknown");
    expect(parseWebhook({ ...settled, status: undefined })?.status).toBe("unknown");
  });

  it("carries a null email rather than an empty one", () => {
    expect(parseWebhook({ ...settled, customerEmail: "" })?.email).toBeNull();
    expect(parseWebhook({ ...settled, customerEmail: undefined })?.email).toBeNull();
  });
});

describe("the crypto reference", () => {
  it("recognises one this platform minted", () => {
    expect(isCryptoReference(settled.sequenceId)).toBe(true);
  });

  it("refuses a reference with the right prefix and a made-up tail", () => {
    expect(isCryptoReference(`${CRYPTO_PREFIX}not-a-uuid`)).toBe(false);
    expect(isCryptoReference(`${CRYPTO_PREFIX}`)).toBe(false);
  });

  it("refuses somebody else's reference entirely", () => {
    expect(isCryptoReference("YC-COLLECTION-99213")).toBe(false);
    expect(isCryptoReference("")).toBe(false);
  });

  it("never confuses a crypto deposit with a card funding", () => {
    // The two are settled by different processors and the reconciliation sweep
    // asks Paystack about every fund reference it finds. A crypto deposit
    // answering true here would be a row that sweep looks for at Paystack,
    // cannot find, and has to make a judgement about.
    expect(isFundReference(settled.sequenceId)).toBe(false);
    expect(isCryptoReference("rm-fund-0f2b8b1e-1c4a-4b0e-9d3a-2f5c7e8a9b01")).toBe(false);
  });
});
