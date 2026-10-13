/**
 * payout-schema: the zod schemas the SERVER validates with.
 *
 * Everything a client component may import (the constants, labels, limits,
 * copy and pure helpers) lives in `./payout-model` and is re-exported here, so a server
 * module still imports from this file as before. A client component imports
 * the model, never this file, because this file builds zod schemas at import
 * time and zod's classic API is 64 KB gzipped in every client chunk that
 * reaches it (W13, chunk 2008felnqkn1d).
 */

import { z } from "zod";

/**
 * Payout account input, and the bits the form and the action both need.
 *
 * Client-safe: imports nothing server-only, so the payout form can use the
 * NUBAN rules and the grouping helper without pulling a server module into the
 * browser bundle.
 */
import {
  NUBAN_RE,
  digitsOnly,
} from "./payout-model";
export * from "./payout-model";

const accountNumber = z
  .string({ message: "Enter the ten digit account number." })
  .transform(digitsOnly)
  .refine((v) => NUBAN_RE.test(v), "A Nigerian account number is exactly ten digits.");

export const resolveAccountInputSchema = z.object({
  accountNumber,
  bankCode: z.string().min(1, "Choose the bank."),
});

export const addPayoutAccountInputSchema = z.object({
  accountNumber,
  bankCode: z.string().min(1, "Choose the bank."),
  bankName: z.string().min(1, "Choose the bank."),
  /**
   * The name the bank returned, carried through from the resolve step. It is
   * re-resolved server side before the insert, so a tampered value cannot be
   * stored: this field only saves a second round trip in the happy path.
   */
  accountName: z.string().min(1, "Confirm the account before saving it."),
});

export const payoutAccountIdSchema = z.object({
  accountId: z.string().min(1, "That account could not be identified."),
});

export type AddPayoutAccountInput = z.infer<typeof addPayoutAccountInputSchema>;
