import { describe, expect, it } from "vitest";
import { POT_PREFIX, potMoveReference } from "./pot-reference";

/** MON-18: a double tap on one pot move sheet is one move. */
describe("potMoveReference (MON-18)", () => {
  const KEY = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
  const POT = "4f2504e0-4f89-41d3-9a0c-0305e82c3302";
  const move = { key: KEY, direction: "in" as const, potId: POT, amountMinor: 500_000 };

  it("gives the same reference to the same move from the same sheet", () => {
    expect(potMoveReference("u1", move)).toBe(potMoveReference("u1", move));
    expect(potMoveReference("u1", move)).toMatch(new RegExp(`^${POT_PREFIX}[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`));
  });

  it("gives a different reference to a different move, person or direction", () => {
    const base = potMoveReference("u1", move);
    expect(potMoveReference("u2", move)).not.toBe(base);
    expect(potMoveReference("u1", { ...move, direction: "out" })).not.toBe(base);
    expect(potMoveReference("u1", { ...move, amountMinor: 600_000 })).not.toBe(base);
  });

  it("is random without a key, as an older client sends", () => {
    const { key: _key, ...keyless } = move;
    expect(potMoveReference("u1", keyless)).not.toBe(potMoveReference("u1", keyless));
  });
});
