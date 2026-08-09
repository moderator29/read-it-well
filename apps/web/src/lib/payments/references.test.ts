import { describe, expect, it } from "vitest";
import {
  BOOKING_PREFIX,
  ESCROW_PREFIX,
  FUND_PREFIX,
  escrowReference,
  isBookingReference,
  isEscrowReference,
  isFundReference,
} from "./references";

/**
 * The reference contract, proved rather than described.
 *
 * A reference is the idempotency key every money movement on this platform
 * turns on: `wallet_entries.reference` is unique, `transactions.provider_ref`
 * is unique, and both the webhook and the reconciliation sweep route purely on
 * these shapes. A prefix test that accepted `rm-fund-anything` would let a
 * hand-typed value reach a settlement path, and an escrow reference that was
 * not derived from the escrow id would make every retry a second payment.
 */

const UUID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
const OTHER_UUID = "9c858901-8a57-4791-81fe-4c455b099bc9";

describe("funding references", () => {
  it("accepts the shape fundWallet generates", () => {
    expect(isFundReference(`${FUND_PREFIX}${UUID}`)).toBe(true);
  });

  it("refuses a prefix with anything else after it", () => {
    // The whole point of shape-checking rather than prefix-checking.
    expect(isFundReference(`${FUND_PREFIX}not-a-uuid`)).toBe(false);
    expect(isFundReference(`${FUND_PREFIX}`)).toBe(false);
    expect(isFundReference(`${FUND_PREFIX}${UUID}-extra`)).toBe(false);
  });

  it("refuses another family's reference", () => {
    expect(isFundReference(`${BOOKING_PREFIX}${UUID}`)).toBe(false);
    expect(isBookingReference(`${FUND_PREFIX}${UUID}`)).toBe(false);
  });

  it("refuses a foreign processor reference, which the sweep will see plenty of", () => {
    expect(isFundReference("T123456789")).toBe(false);
    expect(isBookingReference("T123456789")).toBe(false);
  });
});

describe("escrow references", () => {
  it("derives each leg from the escrow id, not from chance", () => {
    // Called twice, the same escrow produces the same key both times. This is
    // the whole reason a retried release cannot pay twice.
    expect(escrowReference(UUID, "release")).toBe(escrowReference(UUID, "release"));
    expect(escrowReference(UUID, "hold")).toBe(`${ESCROW_PREFIX}${UUID}-hold`);
    expect(escrowReference(UUID, "release")).toBe(`${ESCROW_PREFIX}${UUID}-release`);
    expect(escrowReference(UUID, "refund")).toBe(`${ESCROW_PREFIX}${UUID}-refund`);
  });

  it("gives the three legs of one escrow three different keys", () => {
    const keys = new Set([
      escrowReference(UUID, "hold"),
      escrowReference(UUID, "release"),
      escrowReference(UUID, "refund"),
    ]);
    expect(keys.size).toBe(3);
  });

  it("gives two escrows different keys for the same leg", () => {
    expect(escrowReference(UUID, "hold")).not.toBe(escrowReference(OTHER_UUID, "hold"));
  });

  it("recognises its own shapes and nothing else", () => {
    expect(isEscrowReference(escrowReference(UUID, "hold"))).toBe(true);
    expect(isEscrowReference(escrowReference(UUID, "release"))).toBe(true);
    expect(isEscrowReference(escrowReference(UUID, "refund"))).toBe(true);

    expect(isEscrowReference(`${ESCROW_PREFIX}${UUID}-settle`)).toBe(false);
    expect(isEscrowReference(`${ESCROW_PREFIX}${UUID}`)).toBe(false);
    expect(isEscrowReference(`${ESCROW_PREFIX}not-a-uuid-hold`)).toBe(false);
    expect(isEscrowReference(`${FUND_PREFIX}${UUID}`)).toBe(false);
  });
});
