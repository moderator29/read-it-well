import { describe, expect, it } from "vitest";

import {
  LIVE_STATES,
  floatFromLedger,
  floatFromRows,
  floatIdentity,
  type EscrowCommissionRow,
  type EscrowLedgerEntry,
  type EscrowRow,
} from "./float";

/**
 * INVARIANT I-2, ASSERTED. It had never been asserted anywhere, in either
 * direction, before this file.
 *
 * The identity: the escrow money the ledger says is held equals the escrow
 * money the agreement rows say is held, to the kobo, across a full lifecycle
 * mix. The database side of the same claim is proved against the live project
 * by `scripts/probes/escrow_invariants.sql`, which seeds real breaches and
 * asserts they are caught. This file proves the arithmetic.
 *
 * THIS TEST WAS WATCHED FAILING BEFORE IT WAS BELIEVED. The commission
 * subtraction in `floatFromLedger` was removed on purpose and the run is
 * recorded in `scripts/probes/escrow_invariants.log`. A test nobody has seen
 * fail is a test nobody knows is connected to anything.
 */

let nextId = 0;
function id(): string {
  nextId += 1;
  return `e${nextId}`;
}

function hold(escrowId: string, amountMinor: number, status = "COMPLETED"): EscrowLedgerEntry {
  return { kind: "escrow_hold", direction: "debit", status, amountMinor, escrowId };
}
function release(escrowId: string, amountMinor: number): EscrowLedgerEntry {
  return { kind: "escrow_release", direction: "credit", status: "COMPLETED", amountMinor, escrowId };
}
function refund(escrowId: string, amountMinor: number): EscrowLedgerEntry {
  return { kind: "escrow_refund", direction: "credit", status: "COMPLETED", amountMinor, escrowId };
}

describe("the escrow float identity", () => {
  it("holds across a full lifecycle mix, to the kobo", () => {
    /*
     * Nine agreements, every state the machine can reach, with a commission
     * taken on one release so the commission term is actually exercised.
     */
    const stillHeld = id();
    const asked = id();
    const inDispute = id();
    const funded = id();
    const releasedClean = id();
    const releasedWithCut = id();
    const refunded = id();
    const resolved = id();
    const cancelled = id();
    const proposed = id();
    const disputedBeforeFunding = id();

    const rows: EscrowRow[] = [
      { id: stillHeld, state: "HELD", amountMinor: 250_000 },
      { id: asked, state: "RELEASE_REQUESTED", amountMinor: 75_000 },
      { id: inDispute, state: "DISPUTED", amountMinor: 1_200_000 },
      { id: funded, state: "FUNDED", amountMinor: 33 },
      { id: releasedClean, state: "RELEASED", amountMinor: 500_000 },
      { id: releasedWithCut, state: "RELEASED", amountMinor: 1_000_000 },
      { id: refunded, state: "REFUNDED", amountMinor: 99_999 },
      { id: resolved, state: "RESOLVED", amountMinor: 640_000 },
      { id: cancelled, state: "CANCELLED", amountMinor: 400_000 },
      { id: proposed, state: "INITIATED", amountMinor: 80_000 },
      /* Legal, and it never took a kobo. This is the row that breaks a naive
         implementation keyed on the state alone. */
      { id: disputedBeforeFunding, state: "DISPUTED", amountMinor: 7_000_000 },
    ];

    const entries: EscrowLedgerEntry[] = [
      hold(stillHeld, 250_000),
      hold(asked, 75_000),
      hold(inDispute, 1_200_000),
      hold(funded, 33),
      hold(releasedClean, 500_000),
      release(releasedClean, 500_000),
      hold(releasedWithCut, 1_000_000),
      /* Five per cent taken, so the payee is credited the net. */
      release(releasedWithCut, 950_000),
      hold(refunded, 99_999),
      refund(refunded, 99_999),
      hold(resolved, 640_000),
      release(resolved, 640_000),
    ];

    const commissions: EscrowCommissionRow[] = [{ escrowId: releasedWithCut, amountMinor: 50_000 }];

    const identity = floatIdentity(rows, entries, commissions);

    expect(identity.escrowFloatMinor).toBe(250_000 + 75_000 + 1_200_000 + 33);
    expect(identity.ledgerFloatMinor).toBe(identity.escrowFloatMinor);
    expect(identity.differenceMinor).toBe(0);
    expect(identity.ok).toBe(true);
    expect(identity.escrowCount).toBe(4);
  });

  it("counts the commission out of the float, because a release credits the net", () => {
    const e = id();
    const entries = [hold(e, 1_000_000), release(e, 950_000)];
    const rows: EscrowRow[] = [{ id: e, state: "RELEASED", amountMinor: 1_000_000 }];

    expect(floatFromRows(rows, entries)).toBe(0);
    /* Without the commission term the ledger would still be holding 50,000. */
    expect(floatFromLedger(entries, [])).toBe(50_000);
    expect(floatFromLedger(entries, [{ escrowId: e, amountMinor: 50_000 }])).toBe(0);
  });

  it("does not count an agreement the ledger never took a hold for", () => {
    const e = id();
    const rows: EscrowRow[] = [{ id: e, state: "DISPUTED", amountMinor: 7_000_000 }];
    expect(floatFromRows(rows, [])).toBe(0);
    expect(floatIdentity(rows, [], []).differenceMinor).toBe(0);
  });

  it("does not count a hold that has not completed", () => {
    const e = id();
    const rows: EscrowRow[] = [{ id: e, state: "HELD", amountMinor: 500_000 }];
    const pending = [hold(e, 500_000, "PENDING")];
    expect(floatFromLedger(pending, [])).toBe(0);
    expect(floatFromRows(rows, pending)).toBe(0);
  });

  it("reports the exact gap when one kobo goes missing", () => {
    const e = id();
    const entries = [hold(e, 500_000)];
    const rows: EscrowRow[] = [{ id: e, state: "HELD", amountMinor: 500_001 }];

    const identity = floatIdentity(rows, entries, []);
    expect(identity.ok).toBe(false);
    expect(identity.differenceMinor).toBe(-1);
  });

  it("keeps a settled state out of the live set", () => {
    expect(LIVE_STATES).toEqual(["FUNDED", "HELD", "RELEASE_REQUESTED", "DISPUTED"]);
    for (const settled of ["RELEASED", "REFUNDED", "RESOLVED", "CANCELLED", "INITIATED"] as const) {
      expect(LIVE_STATES).not.toContain(settled);
    }
  });

  it("stays in whole kobo and never produces a fraction", () => {
    const e = id();
    const entries = [hold(e, 333_333), release(e, 316_666)];
    const identity = floatIdentity(rows(e), entries, [{ escrowId: e, amountMinor: 16_667 }]);
    for (const value of Object.values(identity)) {
      if (typeof value === "number") expect(Number.isInteger(value)).toBe(true);
    }
    expect(identity.differenceMinor).toBe(0);

    function rows(escrowId: string): EscrowRow[] {
      return [{ id: escrowId, state: "RELEASED", amountMinor: 333_333 }];
    }
  });
});
