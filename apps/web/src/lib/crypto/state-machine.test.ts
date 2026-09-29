import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { CRYPTO_STATES, FINAL, TRANSITIONS, stepOf, transition, type CryptoState } from "./state-machine";

/**
 * The status machine, and its twin in SQL. The database decides
 * (`private.crypto_transition_allowed`, called by `crypto_payment_apply`);
 * this test reads the migration and fails the day the two disagree.
 */

const MIGRATION = fileURLToPath(
  new URL(
    "../../../../../supabase/migrations/20260929001617_crypto_pay_1_an_alternative_way_to_pay_with_no_custody.sql",
    import.meta.url,
  ),
);

function sqlTable(): Record<string, string[]> {
  const text = readFileSync(MIGRATION, "utf8");
  const start = text.indexOf("create or replace function private.crypto_transition_allowed");
  const body = text.slice(start, text.indexOf("$function$;", start));
  const out: Record<string, string[]> = {};
  for (const match of body.matchAll(/when '(\w+)'\s+then p_to in \(([^)]*)\)/g)) {
    out[match[1]!] = [...match[2]!.matchAll(/'(\w+)'/g)].map((m) => m[1]!).sort();
  }
  return out;
}

describe("the TypeScript table equals the SQL table", () => {
  it("has the same allowed moves from every state", () => {
    const sql = sqlTable();
    for (const state of CRYPTO_STATES) {
      expect([...(sql[state] ?? [])], state).toEqual([...TRANSITIONS[state]].sort());
    }
  });

  it("has the same ten states as the table's check constraint", () => {
    const text = readFileSync(MIGRATION, "utf8");
    const check = /check \(state in \(([^)]*)\)\)/.exec(text)?.[1] ?? "";
    expect([...check.matchAll(/'(\w+)'/g)].map((m) => m[1]).sort()).toEqual([...CRYPTO_STATES].sort());
  });
});

describe("transition", () => {
  it("walks the happy path", () => {
    const path: CryptoState[] = ["quoted", "awaiting_payment", "confirming", "converting", "settled"];
    for (let i = 1; i < path.length; i++) expect(transition(path[i - 1]!, path[i]!)).toBe("applied");
  });

  it("never leaves a final state", () => {
    for (const final of FINAL) for (const to of CRYPTO_STATES) {
      expect(transition(final, to)).toBe(final === to ? "stale" : "refused");
    }
  });

  it("never goes backwards once converting", () => {
    expect(transition("converting", "confirming")).toBe("refused");
    expect(transition("converting", "awaiting_payment")).toBe("refused");
  });

  it("treats a repeat while money moves as a progress update", () => {
    expect(transition("confirming", "confirming")).toBe("updated");
    expect(transition("underpaid", "underpaid")).toBe("updated");
    expect(transition("expired", "expired")).toBe("stale");
  });

  it("handles underpaid and overpaid the way the provider does", () => {
    expect(transition("underpaid", "confirming")).toBe("applied"); // topped up
    expect(transition("underpaid", "refunded")).toBe("applied"); // returned after expiry
    expect(transition("overpaid", "converting")).toBe("applied"); // difference returned, charge converted
  });

  it("lets a report of money outrank the clock, but never a quote", () => {
    expect(transition("expired", "settled")).toBe("applied");
    expect(transition("failed", "settled")).toBe("applied");
    expect(transition("quoted", "settled")).toBe("refused");
    expect(transition("expired", "awaiting_payment")).toBe("refused");
  });
});

describe("stepOf", () => {
  it("puts each state on the step the screen draws", () => {
    expect(stepOf("quoted")).toBe("awaiting_payment");
    expect(stepOf("underpaid")).toBe("confirming");
    expect(stepOf("overpaid")).toBe("confirming");
    expect(stepOf("converting")).toBe("converting");
    expect(stepOf("settled")).toBe("settled");
    expect(stepOf("expired")).toBeNull();
  });
});
