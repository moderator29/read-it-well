/**
 * THE SAME TENANCY FILE IN ITS THREE MONEY STATES, DERIVED, NOT WRITTEN.
 *
 * `TENANCY_FILE` (./tenancy-file.ts) is the unpaid f3 tenancy as the real read
 * returns it. The part-paid, fully-paid and void files below are that file with ONLY
 * its payment fields changed (`paid`, `receipts`, `void`), each value read from it:
 *
 *   part-paid   `paid: false` (the read's `complete` is false while the
 *               settled payments add up to less than the total) and one
 *               settled payment of the ledger's first line, the rent: a part
 *               of the move-in, as one flatmate's share (V-86) would be.
 *   fully-paid  `paid: true` and one settled payment of the whole total.
 *   paid, then void  the fully-paid file with `void: true`: the charge was
 *               cancelled, refunded or reversed after it settled (the read's
 *               `tenancy_is_void`). The settled payment stays on the record.
 *
 * WHAT IS NOT HERE, AND WHY:
 *   - a processor reference. No fixture holds one for this charge, and the
 *     read gives "" when the transaction has none (`provider_ref ?? ""`), which
 *     the pack and the file print as no reference at all. So each payment's
 *     `reference` is "", and the reference line goes unmeasured.
 *   - a settlement time. No fixture says when a payment settled; the move-in
 *     day label is the one date the charge has, and it only passes through.
 *   - a receipt code. No fixture holds a code hint, so `receiptCode` stays
 *     null and the "a code ending in ... is working" line goes unmeasured.
 *   - the caution register, reports and the promise snapshot. Those are not
 *     payment fields; no fixture holds them (see ./tenancy-file.ts).
 *
 * The named-lister variant takes the harness's other party, `COUNTERPART`,
 * through `firstNameAndInitial` as the read names a lister. No fixture says who
 * lets this listing; it exists to test the sentence, not to name the lister.
 */
import type { TenancyFile } from "@/lib/tenancy/queries";
import { firstNameAndInitial } from "@/lib/after-gate/public-place-model";
import { TENANCIES } from "./fixtures";
import { TENANCY_FILE } from "./tenancy-file";
import { COUNTERPART } from "../_fixtures/people";

/** The charge's own id, as a list key: the pack keys a payment by its id and prints nothing of it. */
const paymentId = TENANCIES[0]!.id;

export const TENANCY_FILE_UNPAID: TenancyFile = TENANCY_FILE;

export const TENANCY_FILE_PART_PAID: TenancyFile = {
  ...TENANCY_FILE,
  paid: false,
  receipts: [{ id: paymentId, amount: TENANCY_FILE.lines[0]!.display, date: TENANCY_FILE.moveInLabel, reference: "" }],
};

export const TENANCY_FILE_PAID: TenancyFile = {
  ...TENANCY_FILE,
  paid: true,
  receipts: [{ id: paymentId, amount: TENANCY_FILE.total, date: TENANCY_FILE.moveInLabel, reference: "" }],
};

export const TENANCY_FILE_PAID_THEN_VOID: TenancyFile = { ...TENANCY_FILE_PAID, void: true };

export const NAMED_LISTER = firstNameAndInitial(COUNTERPART.name);

/** Any of the four, with a named lister. */
export const withLister = (file: TenancyFile): TenancyFile => ({ ...file, listerName: NAMED_LISTER });
