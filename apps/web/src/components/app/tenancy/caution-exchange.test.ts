import { describe, expect, it } from "vitest";
import type { TenancyCautionReturn, TenancyDeduction } from "@/lib/tenancy/queries";
import { CAUTION_CHIP, cautionExchange, deductionThread, returnThread } from "./caution-exchange";

/**
 * M2: the caution register as a documented exchange. Its three promises are
 * held here: both parties see the same entries, no ruling appears before it
 * is made, and nothing is invented.
 */

const deduction = (over: Partial<TenancyDeduction> = {}): TenancyDeduction => ({
  id: "d1",
  item: "kitchen",
  amount: "₦50,000",
  note: "Cooker hob cracked",
  answer: null,
  ruledAllowed: null,
  ruledReason: null,
  photoId: "p1",
  photoUrl: null,
  ...over,
});

const ret = (over: Partial<TenancyCautionReturn> = {}): TenancyCautionReturn => ({
  id: "r1",
  amount: "₦100,000",
  date: "3 Oct 2026",
  method: "bank_transfer",
  reference: "TRF123",
  recordedAs: "lister_sent",
  ownRecord: false,
  standing: "counted",
  contested: false,
  ruling: null,
  rulingReason: null,
  ...over,
});

const kinds = (entries: { kind: string }[]) => entries.map((e) => e.kind);

describe("a deduction thread", () => {
  it("is proposed, then waits for the tenant", () => {
    expect(kinds(deductionThread(deduction(), 1).entries)).toEqual(["proposed", "awaiting-answer"]);
  });

  it("ends when the tenant accepts it: no ruling is ever drawn on an accepted line", () => {
    expect(kinds(deductionThread(deduction({ answer: "accepted" }), 1).entries)).toEqual(["proposed", "accepted"]);
  });

  it("waits for a ruling once disputed, with no figure and no outcome", () => {
    const thread = deductionThread(deduction({ answer: "disputed" }), 1);
    expect(kinds(thread.entries)).toEqual(["proposed", "disputed", "awaiting-ruling"]);
    const last = thread.entries.at(-1)!;
    expect(last).toEqual({ key: "d-d1-awaiting-ruling", actor: "vallo", kind: "awaiting-ruling", mark: "waiting" });
    expect(JSON.stringify(thread.entries)).not.toContain("allowed");
  });

  it("shows the ruling only once the record holds it, with the record's own figure and reason", () => {
    const thread = deductionThread(deduction({ answer: "disputed", ruledAllowed: "₦20,000", ruledReason: "Wear and tear" }), 1);
    expect(thread.entries.at(-1)).toEqual({
      key: "d-d1-ruled",
      actor: "vallo",
      kind: "ruled",
      mark: "done",
      allowed: "₦20,000",
      reason: "Wear and tear",
    });
  });

  it("never shows a ruling on a line nobody disputed, even if a stray ruling were read", () => {
    const thread = deductionThread(deduction({ answer: null, ruledAllowed: "₦1" }), 1);
    expect(kinds(thread.entries)).toEqual(["proposed", "awaiting-answer"]);
  });

  it("marks a dispute with the diamond, never as a failure", () => {
    const thread = deductionThread(deduction({ answer: "disputed" }), 1);
    expect(thread.entries.map((e) => e.mark)).toEqual(["done", "disputed", "waiting"]);
  });
});

describe("a return thread", () => {
  it("is the record, said by the side that made it, with the date the record holds", () => {
    expect(returnThread(ret(), 1).entries).toEqual([{ key: "r-r1-returned", actor: "lister", kind: "returned", mark: "done", date: "3 Oct 2026" }]);
    expect(returnThread(ret({ recordedAs: "tenant_received" }), 1).entries[0]).toMatchObject({ actor: "tenant", kind: "received" });
  });

  it("is contested, then waits for staff, then shows their finding only once made", () => {
    expect(kinds(returnThread(ret({ contested: true }), 1).entries)).toEqual(["returned", "contested", "awaiting-ruling"]);
    const found = returnThread(ret({ contested: true, ruling: "not_received", rulingReason: "No bank record" }), 1);
    expect(found.entries.at(-1)).toMatchObject({ kind: "found", outcome: "not_received", mark: "stopped" });
    const received = returnThread(ret({ contested: true, ruling: "received", rulingReason: "Statement shows it" }), 1);
    expect(received.entries.at(-1)).toMatchObject({ kind: "found", outcome: "received", mark: "done" });
  });
});

describe("the whole register", () => {
  it("is the same record whoever reads it: it never takes the viewer", () => {
    /* `ownRecord` is the only viewer-relative field the read carries; flip
       it and the exchange must not move. */
    const asTenant = cautionExchange({ deductions: [deduction()], returns: [ret({ ownRecord: false })] });
    const asLister = cautionExchange({ deductions: [deduction()], returns: [ret({ ownRecord: true })] });
    expect(asTenant.deductions.map((t) => t.entries)).toEqual(asLister.deductions.map((t) => t.entries));
    expect(asTenant.returns.map((t) => t.entries)).toEqual(asLister.returns.map((t) => t.entries));
    expect(cautionExchange.length).toBe(1);
  });

  it("keeps the read's order and numbers each thread from one", () => {
    const exchange = cautionExchange({
      deductions: [deduction({ id: "a" }), deduction({ id: "b" })],
      returns: [ret({ id: "x" })],
    });
    expect(exchange.deductions.map((t) => [t.n, t.deduction.id])).toEqual([
      [1, "a"],
      [2, "b"],
    ]);
    expect(exchange.returns.map((t) => [t.n, t.record.id])).toEqual([[1, "x"]]);
  });

  it("gives every caution state a chip, and only a completed return reads as done", () => {
    expect(CAUTION_CHIP).toEqual({
      open: "pending",
      deductions_proposed: "pending",
      agreed: "pending",
      disputed: "disputed",
      escalated: "disputed",
      returned: "success",
    });
  });
});
