import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * WHO MAY MOVE MONEY, AND WHAT HAPPENS WHEN THE DATABASE SAYS NO.
 *
 * The console gained three capabilities that reach the ledger: reading payment
 * health, sweeping stuck withdrawal holds, and retiring the example listings.
 * The first two touch money and the third takes rows off the public catalogue.
 *
 * The real authorisation for all of them lives in Postgres. Each RPC is
 * SECURITY DEFINER and re-checks `private.has_role(auth.uid(), 'admin' |
 * 'super_admin')` at its own boundary, answering `{"status":"forbidden"}`
 * otherwise, and `anon` holds no EXECUTE on any of them. That is deliberately
 * not something a Vitest process can prove, and this file does not pretend to:
 * it was proved against the live database by calling all four functions with a
 * null `auth.uid()` and getting `forbidden` from every one.
 *
 * WHAT THIS FILE PROVES IS THE HALF THAT LIVES IN TYPESCRIPT, and it is the
 * half that has historically gone wrong:
 *
 *   1. A non-admin caller is refused BEFORE the RPC is reached, so a missing
 *      database check could never be the only thing standing in the way.
 *   2. A `forbidden` answer from the database is never read as success. This is
 *      the failure mode that matters most: an envelope reader that returns ""
 *      for an unknown shape and a caller that treats anything non-throwing as
 *      done is how a refusal becomes a green tick.
 *   3. An unreadable or failed read becomes "unavailable" rather than an empty
 *      result, because an empty payments screen states that nobody's money is
 *      stuck, which is the one lie this screen must never tell.
 *   4. The sweep window floor is enforced server side, not only by the input.
 */

const guard = vi.hoisted(() => ({ requireAdmin: vi.fn() }));

vi.mock("./guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./guard")>();
  return { ...actual, ...guard };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { expireStaleWithdrawalHolds, retireExampleListings } from "./payments-actions";
import { getPaymentHealth } from "./payments-queries";
import { getRevenueSummary } from "./revenue-queries";
import { isOverdue, lagosToday } from "./examples-queries";
import { ADMIN_FORBIDDEN_MESSAGE } from "./guard";

/** An admin whose client answers every RPC with `data`. */
function adminAnswering(data: unknown, error: { message: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  guard.requireAdmin.mockResolvedValue({
    state: "admin",
    supabase: { rpc },
    user: { id: "11111111-1111-4111-8111-111111111111" },
    isAdmin: true,
    isSuperAdmin: false,
  });
  return rpc;
}

/** Somebody signed in who is not staff. */
function notAdmin() {
  const rpc = vi.fn();
  guard.requireAdmin.mockResolvedValue({ state: "not-admin" });
  return rpc;
}

const LISTING = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("a caller who is not staff", () => {
  it("cannot sweep withdrawal holds, and never reaches the database", async () => {
    const rpc = notAdmin();
    const result = await expireStaleWithdrawalHolds({ olderThanMinutes: 30 });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toBe(ADMIN_FORBIDDEN_MESSAGE);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("cannot retire the example listings, and never reaches the database", async () => {
    const rpc = notAdmin();
    const result = await retireExampleListings({ listingIds: [LISTING] });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toBe(ADMIN_FORBIDDEN_MESSAGE);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("reads no payment health and no revenue", async () => {
    notAdmin();
    await expect(getPaymentHealth()).resolves.toEqual({ state: "unavailable" });
    await expect(getRevenueSummary()).resolves.toEqual({ state: "unavailable" });
  });
});

describe("a `forbidden` answer from the database", () => {
  /*
   * The case this suite exists for. Suppose the TypeScript guard above were
   * removed, or a role were revoked between the guard and the call. The
   * database still refuses, and nothing in this process may round that up to a
   * success or to an empty-but-fine result.
   */
  it("fails the sweep rather than reporting nothing was stuck", async () => {
    adminAnswering({ status: "forbidden" });
    const result = await expireStaleWithdrawalHolds({ olderThanMinutes: 30 });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toBe(ADMIN_FORBIDDEN_MESSAGE);
  });

  it("fails the retirement rather than reporting zero retired", async () => {
    adminAnswering({ status: "forbidden" });
    const result = await retireExampleListings({ listingIds: [LISTING] });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toBe(ADMIN_FORBIDDEN_MESSAGE);
  });

  it("makes payment health unavailable rather than empty", async () => {
    adminAnswering({ status: "forbidden" });
    // Not `{ state: "ok", data: { overdrawn: [], ... } }`. An empty payments
    // screen is a claim that nobody's money is stuck.
    await expect(getPaymentHealth()).resolves.toEqual({ state: "unavailable" });
  });

  it("makes revenue unavailable rather than zero earned", async () => {
    adminAnswering({ status: "forbidden" });
    await expect(getRevenueSummary()).resolves.toEqual({ state: "unavailable" });
  });
});

describe("an answer that cannot be read", () => {
  it.each([
    ["null", null],
    ["a bare string", "ok"],
    ["an array", []],
    ["an envelope with no status", { expired: 4 }],
    ["a status that is not a string", { status: 7 }],
  ])("does not let %s pass as a completed sweep", async (_label, data) => {
    adminAnswering(data);
    const result = await expireStaleWithdrawalHolds({ olderThanMinutes: 30 });
    expect(result.ok).toBe(false);
  });

  it("treats a transport error as a failure, not as a clean sweep", async () => {
    adminAnswering(null, { message: "connection reset" });
    const result = await expireStaleWithdrawalHolds({ olderThanMinutes: 30 });
    expect(result.ok).toBe(false);
  });

  it("makes payment health unavailable when the envelope is not an object", async () => {
    adminAnswering("ok");
    await expect(getPaymentHealth()).resolves.toEqual({ state: "unavailable" });
  });
});

describe("the sweep window floor", () => {
  /*
   * A one-minute window would fail withdrawals that are merely still in flight,
   * turning a working transfer into a FAILED entry. The screen offers ten as a
   * floor; this proves the server does not rely on the screen to say so.
   */
  it.each([0, 1, 9, -30])("refuses a window of %i minutes without calling the database", async (
    minutes,
  ) => {
    const rpc = adminAnswering({ status: "ok", expired: 3 });
    const result = await expireStaleWithdrawalHolds({ olderThanMinutes: minutes });

    expect(result.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("accepts the ten-minute floor itself", async () => {
    const rpc = adminAnswering({ status: "ok", expired: 2 });
    const result = await expireStaleWithdrawalHolds({ olderThanMinutes: 10 });

    expect(result.ok).toBe(true);
    expect(result.ok === true && result.data.expired).toBe(2);
    expect(rpc).toHaveBeenCalledWith("admin_expire_stale_withdrawal_holds", {
      p_older_than_minutes: 10,
    });
  });

  it("refuses a fractional window, because minutes are whole", async () => {
    const rpc = adminAnswering({ status: "ok", expired: 1 });
    const result = await expireStaleWithdrawalHolds({ olderThanMinutes: 30.5 });

    expect(result.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("retiring the examples", () => {
  it("refuses an empty selection without calling the database", async () => {
    const rpc = adminAnswering({ status: "ok", retired: 0 });
    const result = await retireExampleListings({ listingIds: [] });

    expect(result.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("refuses anything that is not a listing id", async () => {
    const rpc = adminAnswering({ status: "ok", retired: 1 });
    const result = await retireExampleListings({ listingIds: ["all"] });

    expect(result.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("passes the chosen ids through and reports what actually moved", async () => {
    const rpc = adminAnswering({ status: "ok", retired: 1 });
    const result = await retireExampleListings({ listingIds: [LISTING] });

    expect(result.ok).toBe(true);
    expect(result.ok === true && result.data.retired).toBe(1);
    expect(rpc).toHaveBeenCalledWith("admin_retire_demo_listings", {
      p_listing_ids: [LISTING],
    });
  });
});

describe("money arriving from jsonb", () => {
  /*
   * Kobo is an integer end to end. A float, a string or a value past 2^53 is
   * not an amount that can be added up honestly, and the totals on the payments
   * screen are sums. Anything unreadable becomes 0 rather than an
   * approximation nobody can trace back.
   */
  it("refuses to total a float or a stringified amount", async () => {
    adminAnswering({
      status: "ok",
      stale_minutes: 30,
      overdrawn: [],
      stale_holds: [
        { reference: "a", amount_minor: 1000, created_at: "2026-08-01T00:00:00Z" },
        { reference: "b", amount_minor: 10.5, created_at: "2026-08-01T00:00:00Z" },
        { reference: "c", amount_minor: "2000", created_at: "2026-08-01T00:00:00Z" },
        { reference: "d", amount_minor: Number.MAX_SAFE_INTEGER + 2 },
      ],
      unsettled: [],
    });

    const read = await getPaymentHealth();
    expect(read.state).toBe("ok");
    if (read.state !== "ok") return;

    // Only the one honest integer contributes.
    expect(read.data.totals.frozenMinor).toBe(1000);
    expect(read.data.staleHolds).toHaveLength(4);
  });

  it("reports a shortfall as a positive amount owed", async () => {
    adminAnswering({
      status: "ok",
      stale_minutes: 30,
      overdrawn: [
        { wallet_id: "w1", user_id: "u1", display_name: "Ada", balance_minor: -400000 },
        { wallet_id: "w2", user_id: "u2", display_name: null, balance_minor: -100 },
      ],
      stale_holds: [],
      unsettled: [],
    });

    const read = await getPaymentHealth();
    expect(read.state).toBe("ok");
    if (read.state !== "ok") return;

    expect(read.data.totals.shortfallMinor).toBe(400100);
    expect(read.data.overdrawn[0]?.ownerName).toBe("Ada");
    expect(read.data.overdrawn[1]?.ownerName).toBeNull();
  });
});

describe("the example retirement date", () => {
  /*
   * The column is a DATE and Lagos is an hour ahead of UTC, so parsing a bare
   * date as an instant makes an example due on the 7th read as overdue from
   * 11pm on the 6th for anybody sitting in Nigeria. Comparing ISO day strings
   * is exactly as precise as the column and has no timezone in it at all.
   */
  it("is not overdue on the day itself", () => {
    expect(isOverdue("2026-11-07", "2026-11-07")).toBe(false);
  });

  it("is overdue the day after", () => {
    expect(isOverdue("2026-11-07", "2026-11-08")).toBe(true);
  });

  it("is not overdue before the day", () => {
    expect(isOverdue("2026-11-07", "2026-11-06")).toBe(false);
  });

  it("is never overdue without a date", () => {
    expect(isOverdue(null, "2030-01-01")).toBe(false);
  });

  it("reads today in Lagos, not in UTC", () => {
    // 23:30 UTC on the 6th is already 00:30 on the 7th in Lagos.
    expect(lagosToday(new Date("2026-11-06T23:30:00Z"))).toBe("2026-11-07");
    expect(lagosToday(new Date("2026-11-07T10:00:00Z"))).toBe("2026-11-07");
  });
});
