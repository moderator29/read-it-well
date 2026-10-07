import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  flag: false,
  rpcs: [] as string[],
  opened: [] as Record<string, unknown>[],
  answer: {} as Record<string, unknown>,
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "vallo.test" }) }));
vi.mock("../flags/read", () => ({ flagIsOn: async () => state.flag }));
vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "not configured",
  SIGNED_OUT_MESSAGE: "signed out",
  resolveSession: async () => ({ state: "signed-in", user: { id: "11111111-1111-4111-8111-111111111111", email: "g@vallo.test" } }),
}));
vi.mock("../payments/paystack", () => ({
  PaystackError: class extends Error {},
  PaystackUnknownOutcome: class extends Error {},
  currentPaystackMode: () => "test",
}));
vi.mock("../payments/providers", () => ({
  assertProviderEnabled: async () => undefined,
  paystackSeam: () => ({}),
  openCheckout: async (_p: unknown, input: Record<string, unknown>) => {
    state.opened.push(input);
    return { reference: input.reference, authorizationUrl: "https://checkout.paystack.com/x", accessCode: "ac" };
  },
}));
vi.mock("@/lib/supabase/service", () => ({
  getAdminClient: () => ({
    rpc: async (fn: string) => {
      state.rpcs.push(fn);
      return { data: state.answer, error: null };
    },
    from: () => ({ update: () => ({ eq: async () => ({}) }) }),
  }),
}));

const RES = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  Object.assign(state, { flag: false, rpcs: [], opened: [], answer: {} });
});

describe("payReservationDeposit (D75)", () => {
  it("with restaurant_deposits off, refuses before anything is written or opened", async () => {
    const { payReservationDeposit } = await import("./deposit-actions");
    const r = await payReservationDeposit(RES);
    expect(r.ok).toBe(false);
    expect(state.rpcs).toHaveLength(0);
    expect(state.opened).toHaveLength(0);
  });

  it("on: opens Paystack with the database's figures and the venue's split, never its own", async () => {
    state.flag = true;
    state.answer = {
      status: "ok",
      reference: "rm-dep-0f8fad5b-d9cb-469f-a165-70867728950e",
      amount_minor: 3_000_000,
      payee_subaccount_code: "ACCT_venue",
      lister_share_minor: 2_940_000,
      commission_minor: 60_000,
    };
    const { payReservationDeposit } = await import("./deposit-actions");
    const r = await payReservationDeposit(RES);
    expect(r.ok).toBe(true);
    expect(state.rpcs).toEqual(["reservation_deposit_open"]);
    expect(state.opened[0]).toMatchObject({
      amountMinor: 3_000_000,
      split: { listerSubaccount: "ACCT_venue", listerShareMinor: 2_940_000, reserveSubaccount: null, guaranteeMinor: 0 },
    });
  });

  it("on: a second press resumes the open checkout instead of opening another", async () => {
    state.flag = true;
    state.answer = {
      status: "pending",
      reference: "rm-dep-0f8fad5b-d9cb-469f-a165-70867728950e",
      amount_minor: 3_000_000,
      authorization_url: "https://checkout.paystack.com/x",
      access_code: "ac",
    };
    const { payReservationDeposit } = await import("./deposit-actions");
    const r = await payReservationDeposit(RES);
    expect(r.ok && r.data.authorizationUrl).toBe("https://checkout.paystack.com/x");
    expect(state.opened).toHaveLength(0);
  });
});
