import { beforeEach, describe, expect, it, vi } from "vitest";

/* The feature_flags read, with the database stubbed: what the row says, or a
   failed read, or no keys at all. */
const state: { configured: boolean; row: { enabled: boolean } | null; error: unknown; asked: string[] } = {
  configured: true,
  row: null,
  error: null,
  asked: [],
};

vi.mock("../supabase/env", () => ({ isSupabaseConfigured: () => state.configured }));
vi.mock("../supabase/server", () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({
        eq: (_column: string, key: string) => {
          state.asked.push(key);
          return { maybeSingle: async () => ({ data: state.row, error: state.error }) };
        },
      }),
    }),
  }),
}));

import { LISTER_FEE_GATE_BLOCKING_FLAG, flagIsOn } from "./read";

beforeEach(() => {
  state.configured = true;
  state.row = null;
  state.error = null;
  state.asked = [];
});

describe("the fee gate's blocking flag reads fail closed (D60)", () => {
  it("is the key D60 names", () => {
    expect(LISTER_FEE_GATE_BLOCKING_FLAG).toBe("lister_fee_gate_blocking");
  });

  it("reads off with no row, so publishing is never blocked today", async () => {
    expect(await flagIsOn(LISTER_FEE_GATE_BLOCKING_FLAG)).toBe(false);
    expect(state.asked).toEqual(["lister_fee_gate_blocking"]);
  });

  it("reads off on a failed read and without platform keys", async () => {
    state.error = { message: "down" };
    state.row = { enabled: true };
    expect(await flagIsOn(LISTER_FEE_GATE_BLOCKING_FLAG)).toBe(false);
    state.error = null;
    state.configured = false;
    expect(await flagIsOn(LISTER_FEE_GATE_BLOCKING_FLAG)).toBe(false);
    expect(state.asked).toEqual(["lister_fee_gate_blocking"]);
  });

  it("reads on only when the row says true", async () => {
    state.row = { enabled: false };
    expect(await flagIsOn(LISTER_FEE_GATE_BLOCKING_FLAG)).toBe(false);
    state.row = { enabled: true };
    expect(await flagIsOn(LISTER_FEE_GATE_BLOCKING_FLAG)).toBe(true);
    expect(state.asked).toEqual(["lister_fee_gate_blocking", "lister_fee_gate_blocking"]);
  });
});
