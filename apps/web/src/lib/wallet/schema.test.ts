import { describe, expect, it } from "vitest";

import { withdrawSchema } from "./schema";

/**
 * The withdrawal input, tested for what it REFUSES to accept.
 *
 * This schema decides what a caller may say about a payout, and the defect it
 * now guards against was live: the sheet carried a box reading "Name on the
 * account / As it appears at your bank", the schema required it, and whatever
 * was typed there went to Paystack as the holder of the destination account.
 * Nothing checked it against the account. A confident typo was a payout
 * instruction addressed to a name nobody had verified.
 *
 * `withdraw` asks the bank now. These cases exist so that a future form cannot
 * quietly start supplying the answer again.
 */

const valid = {
  amount: "1000",
  bankCode: "044",
  accountNumber: "0123456789",
};

describe("withdrawSchema", () => {
  it("accepts an amount, a bank and an account number, and asks for nothing else", () => {
    const parsed = withdrawSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("does not carry an account name, so no caller can address the payout", () => {
    const parsed = withdrawSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    // Not merely optional: absent. An optional field is one a form can start
    // posting again, and the name a payout is addressed to must come from the
    // bank every time.
    expect("accountName" in parsed.data).toBe(false);
  });

  it("ignores an account name if one is posted anyway", () => {
    const parsed = withdrawSchema.safeParse({ ...valid, accountName: "SOMEBODY ELSE" });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(JSON.stringify(parsed.data)).not.toContain("SOMEBODY ELSE");
  });

  it("refuses an account number that is not ten digits", () => {
    expect(withdrawSchema.safeParse({ ...valid, accountNumber: "12345" }).success).toBe(false);
  });

  it("refuses a missing bank code", () => {
    expect(withdrawSchema.safeParse({ ...valid, bankCode: "" }).success).toBe(false);
    expect(withdrawSchema.safeParse({ ...valid, bankCode: "   " }).success).toBe(false);
  });

  /**
   * THE SCHEMA IS NO LONGER WHERE A BANK CODE IS CHECKED, AND THIS SAYS SO.
   *
   * It used to refuse anything outside the twenty three in `./banks`, which is
   * why the withdraw sheet could not pay a Sparkle, VFD or Jaiz account that
   * the payments settings page had happily stored. The membership check moved
   * to `withdraw`, which asks the live registry through `lookupBank` before a
   * kobo is held.
   *
   * A test that stopped here would be reporting that the gate is OPEN and
   * nothing else, so the refusals that replaced it are proved at the action in
   * `withdraw-door.test.ts`, including the one that matters: an unreachable
   * registry refuses rather than waving the code through.
   */
  it("accepts a code it has never heard of, because the action checks the registry", () => {
    expect(withdrawSchema.safeParse({ ...valid, bankCode: "51310" }).success).toBe(true);
  });
});
