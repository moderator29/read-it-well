import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The payer's choice goes to the database through the payer's own session
 * (`public.payment_rail_choose`): who may choose, and what, is the database's
 * rule (pinned by probe pov04). The action passes the choice, words nothing
 * itself, and hands back the refusal's code for the step to say.
 */

const seam = vi.hoisted(() => ({
  state: "signed-in" as "signed-in" | "signed-out" | "unconfigured",
  answer: { data: { status: "ok", choice: "card" } as unknown, error: null as unknown },
  calls: [] as { fn: string; args: unknown }[],
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "not configured",
  SIGNED_OUT_MESSAGE: "signed out",
  resolveSession: async () =>
    seam.state === "signed-in"
      ? {
          state: "signed-in",
          user: { id: "payer" },
          supabase: {
            rpc: async (fn: string, args: unknown) => {
              seam.calls.push({ fn, args });
              return seam.answer;
            },
          },
        }
      : { state: seam.state },
}));

const { choosePaymentRail } = await import("./rail-choice-actions");
const AG = "4f0e8a52-3c1b-4f7a-9d2e-0b6a1c2d3e4f";

beforeEach(() => {
  seam.state = "signed-in";
  seam.answer = { data: { status: "ok", choice: "card" }, error: null };
  seam.calls = [];
});

describe("choosePaymentRail", () => {
  it("passes exactly the agreement and the rail through the payer's own session", async () => {
    expect(await choosePaymentRail({ agreementId: AG, choice: "card" })).toEqual({ ok: true, data: { choice: "card" } });
    expect(seam.calls).toEqual([{ fn: "payment_rail_choose", args: { p_agreement: AG, p_choice: "card" } }]);
  });

  it("refuses a word that is not escrow or card before asking anything", async () => {
    expect(await choosePaymentRail({ agreementId: AG, choice: "wallet" })).toEqual({ ok: false, error: "bad_choice" });
    expect(seam.calls).toHaveLength(0);
  });

  it("hands back the database's refusal as its code (a sale refuses card, only the payer)", async () => {
    seam.answer = { data: { status: "sale_escrow_only" }, error: null };
    expect(await choosePaymentRail({ agreementId: AG, choice: "card" })).toEqual({ ok: false, error: "sale_escrow_only" });
    seam.answer = { data: { status: "not_payer" }, error: null };
    expect(await choosePaymentRail({ agreementId: AG, choice: "escrow" })).toEqual({ ok: false, error: "not_payer" });
    seam.answer = { data: { status: "payment_started" }, error: null };
    expect(await choosePaymentRail({ agreementId: AG, choice: "escrow" })).toEqual({ ok: false, error: "payment_started" });
  });

  it("an error or an unknown answer is unavailable, never success", async () => {
    seam.answer = { data: null, error: { message: "x" } };
    expect(await choosePaymentRail({ agreementId: AG, choice: "card" })).toEqual({ ok: false, error: "unavailable" });
    seam.answer = { data: { status: "something_new" }, error: null };
    expect(await choosePaymentRail({ agreementId: AG, choice: "card" })).toEqual({ ok: false, error: "unavailable" });
  });

  it("says when the new rail sends the deal to a person first (pov04: never a dead end)", async () => {
    seam.answer = { data: { status: "ok", choice: "card", review: true }, error: null };
    expect(await choosePaymentRail({ agreementId: AG, choice: "card" })).toEqual({ ok: true, data: { choice: "card", review: true } });
  });

  it("signed out is told so", async () => {
    seam.state = "signed-out";
    expect(await choosePaymentRail({ agreementId: AG, choice: "card" })).toEqual({ ok: false, error: "signed out" });
  });
});
