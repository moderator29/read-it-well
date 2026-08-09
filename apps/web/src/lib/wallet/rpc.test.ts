import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callMoneyRpc, readMoneyStatus } from "./rpc";
import type { AdminClient } from "./ledger";

/**
 * The boundary between the money path and its locking database functions.
 *
 * Two things have to be true here or the fallbacks in actions.ts are dangerous.
 *
 * First, "the function is not deployed yet" and "the function ran and failed"
 * must never be confused. `missing` sends a caller down the documented
 * unlocked fallback; `failed` must not, because a function that ran and errored
 * may have moved money and re-running an unlocked equivalent on top of it is
 * how a double payment happens.
 *
 * Second, an unreadable answer must produce a branch rather than a crash. These
 * functions are called halfway through a payment, and a thrown TypeError there
 * leaves the caller with no idea whether money moved.
 */

function clientReturning(result: { data: unknown; error: unknown }): AdminClient {
  return { rpc: () => Promise.resolve(result) } as unknown as AdminClient;
}

function clientThrowing(error: unknown): AdminClient {
  return {
    rpc: () => Promise.reject(error),
  } as unknown as AdminClient;
}

beforeEach(() => {
  // logMoney writes one line per branch on purpose. Silence it here so the
  // suite output stays readable; the lines themselves are the product.
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("callMoneyRpc", () => {
  it("reports ok with the payload when the function ran", async () => {
    const result = await callMoneyRpc(
      clientReturning({ data: { status: "ok" }, error: null }),
      "transfer",
      "transfer_between_wallets",
      {},
    );
    expect(result.outcome).toBe("ok");
    expect(result).toMatchObject({ data: { status: "ok" } });
  });

  it("reports missing for PostgREST's undefined-function code", async () => {
    const result = await callMoneyRpc(
      clientReturning({
        data: null,
        error: { code: "PGRST202", message: "Could not find the function" },
      }),
      "transfer",
      "transfer_between_wallets",
      {},
    );
    expect(result.outcome).toBe("missing");
  });

  it("reports missing for Postgres's own undefined-function code", async () => {
    const result = await callMoneyRpc(
      clientReturning({ data: null, error: { code: "42883", message: "" } }),
      "withdraw",
      "hold_wallet_withdrawal",
      {},
    );
    expect(result.outcome).toBe("missing");
  });

  it("reports missing when only the message says so, with no code", async () => {
    const result = await callMoneyRpc(
      clientReturning({
        data: null,
        error: { code: null, message: "Could not find the function public.escrow_hold in the schema cache" },
      }),
      "escrow",
      "escrow_hold",
      {},
    );
    expect(result.outcome).toBe("missing");
  });

  it("reports failed, NOT missing, for an error the function itself raised", async () => {
    // The distinction the fallbacks depend on. A deadlock or a constraint
    // violation must never send a caller down an unlocked path.
    const result = await callMoneyRpc(
      clientReturning({
        data: null,
        error: { code: "40P01", message: "deadlock detected" },
      }),
      "transfer",
      "transfer_between_wallets",
      {},
    );
    expect(result.outcome).toBe("failed");
    expect(result).toMatchObject({ reason: "deadlock detected" });
  });

  it("reports failed rather than throwing when the call itself blows up", async () => {
    const result = await callMoneyRpc(
      clientThrowing(new Error("socket hang up")),
      "withdraw",
      "hold_wallet_withdrawal",
      {},
    );
    expect(result.outcome).toBe("failed");
    expect(result).toMatchObject({ reason: "socket hang up" });
  });

  it("says something on the money channel for every branch", async () => {
    const warn = vi.spyOn(console, "warn");
    const error = vi.spyOn(console, "error");

    await callMoneyRpc(
      clientReturning({ data: null, error: { code: "PGRST202", message: "" } }),
      "escrow",
      "escrow_hold",
      {},
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("rpc_not_applied:escrow_hold"));

    await callMoneyRpc(
      clientThrowing(new Error("boom")),
      "escrow",
      "escrow_release",
      {},
    );
    expect(error).toHaveBeenCalledWith(expect.stringContaining("rpc_threw:escrow_release"));
  });
});

describe("readMoneyStatus", () => {
  it("reads the jsonb shape the locking functions return", () => {
    expect(
      readMoneyStatus({
        status: "insufficient",
        available_minor: 250000,
        amount_minor: 500000,
        wallet_id: "w1",
      }),
    ).toEqual({
      status: "insufficient",
      amountMinor: 500000,
      availableMinor: 250000,
      walletId: "w1",
      state: null,
    });
  });

  it("reads the bare text transfer_between_wallets returns", () => {
    expect(readMoneyStatus("duplicate").status).toBe("duplicate");
    expect(readMoneyStatus("ok").status).toBe("ok");
  });

  it("answers unreadable rather than throwing on a shape it does not know", () => {
    for (const value of [null, undefined, 42, [], { nothing: true }]) {
      expect(() => readMoneyStatus(value)).not.toThrow();
      expect(readMoneyStatus(value).status).toBe("unreadable");
    }
  });

  it("refuses a non-integer amount rather than passing a float into money", () => {
    // Money is integer kobo everywhere. A float arriving from the database
    // becomes null, which callers treat as "not told", never as an amount.
    expect(readMoneyStatus({ status: "ok", amount_minor: 1234.56 }).amountMinor).toBeNull();
    expect(readMoneyStatus({ status: "ok", amount_minor: "5000" }).amountMinor).toBeNull();
  });
});
