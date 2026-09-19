import { describe, expect, it } from "vitest";
import {
  blockersFrom,
  canProceed,
  readingFrom,
  EMPTY_READING,
  type BlockerReading,
} from "./preconditions";

/**
 * The preconditions, and the rule that every one of them has a way out.
 *
 * What is pinned: a clean account proceeds; each of the seven blockers fires
 * on its own number and on nothing else; every blocker carries a route; money is
 * ordered before diary entries because a balance is the one that costs
 * somebody something; a negative balance does not hold a deletion hostage; and
 * a malformed answer from the database reads as zero rather than throwing on a
 * settings screen.
 */

function reading(patch: Partial<BlockerReading> = {}): BlockerReading {
  return { ...EMPTY_READING, ...patch };
}

describe("the preconditions", () => {
  it("lets a clean account through", () => {
    expect(blockersFrom(reading())).toEqual([]);
    expect(canProceed(reading())).toBe(true);
  });

  it("names each blocker on its own number and nothing else", () => {
    const cases: [Partial<BlockerReading>, string][] = [
      [{ walletBalanceMinor: 1 }, "wallet-balance"],
      [{ walletHeldMinor: 120_000_00 }, "wallet-held"],
      [{ pendingPayouts: 1 }, "pending-payouts"],
      [{ activeBookings: 2 }, "active-bookings"],
      [{ activeReservations: 1 }, "active-reservations"],
      [{ publishedListings: 3 }, "published-listings"],
      [{ ownedBusinesses: 1 }, "owned-businesses"],
    ];
    for (const [patch, kind] of cases) {
      const blockers = blockersFrom(reading(patch));
      expect(blockers.map((blocker) => blocker.kind)).toEqual([kind]);
      expect(canProceed(reading(patch))).toBe(false);
    }
  });

  it("gives every blocker a route out, and never a dead end", () => {
    const all = blockersFrom(
      reading({
        walletBalanceMinor: 500_00,
        walletHeldMinor: 1_200_000_00,
        pendingPayouts: 1,
        activeBookings: 1,
        activeReservations: 1,
        publishedListings: 1,
        ownedBusinesses: 1,
      }),
    );
    expect(all).toHaveLength(7);
    for (const blocker of all) {
      expect(blocker.href.startsWith("/")).toBe(true);
      expect(blocker.href.length).toBeGreaterThan(1);
    }
  });

  it("puts the money blockers first, because a balance is the costly one to get wrong", () => {
    const all = blockersFrom(
      reading({ walletBalanceMinor: 100, activeBookings: 1, publishedListings: 1 }),
    );
    expect(all[0]?.kind).toBe("wallet-balance");
  });

  it("carries the kobo untouched, so nothing here can turn money into a float", () => {
    const blocker = blockersFrom(reading({ walletBalanceMinor: 1_234_567 }))[0];
    expect(blocker?.amount).toBe(1_234_567);
    expect(Number.isInteger(blocker?.amount)).toBe(true);
  });

  it("does not hold a deletion hostage to a negative balance", () => {
    expect(blockersFrom(reading({ walletBalanceMinor: -5_000 }))).toEqual([]);
    expect(canProceed(reading({ walletBalanceMinor: -5_000 }))).toBe(true);
  });

  it("sends the business blocker to a surface that carries both doors", () => {
    const [blocker] = blockersFrom(reading({ ownedBusinesses: 2 }));
    expect(blocker?.href).toBe("/host/transfer");
    expect(blocker?.amount).toBe(2);
  });

  it("puts the business last, because its route out needs another person to agree", () => {
    const all = blockersFrom(
      reading({ ownedBusinesses: 1, publishedListings: 1, walletBalanceMinor: 100 }),
    );
    expect(all[all.length - 1]?.kind).toBe("owned-businesses");
  });
});

describe("reading the database's answer", () => {
  it("takes the seven numbers", () => {
    expect(
      readingFrom({
        blocked: true,
        wallet_balance_minor: 250_00,
        wallet_held_minor: 0,
        active_bookings: 2,
        active_reservations: 0,
        pending_payouts: 1,
        published_listings: 4,
        owned_businesses: 2,
      }),
    ).toEqual({
      walletBalanceMinor: 25_000,
      walletHeldMinor: 0,
      activeBookings: 2,
      activeReservations: 0,
      pendingPayouts: 1,
      publishedListings: 4,
      ownedBusinesses: 2,
    });
  });

  it("reads a bigint that arrived as a string, which PostgREST does for large kobo", () => {
    expect(readingFrom({ wallet_balance_minor: "9007199254740" }).walletBalanceMinor).toBe(
      9_007_199_254_740,
    );
  });

  it("reads anything malformed as zero rather than throwing on a settings screen", () => {
    expect(readingFrom(null)).toEqual(EMPTY_READING);
    expect(readingFrom("no")).toEqual(EMPTY_READING);
    expect(readingFrom([1, 2])).toEqual(EMPTY_READING);
    expect(readingFrom({ wallet_balance_minor: {} })).toEqual(EMPTY_READING);
  });
});
