/**
 * What stands between a person and a deletion, and the way out of each.
 *
 * PURE ON PURPOSE. This module reads no database and imports nothing from the
 * server. It turns the six numbers `public.account_deletion_blockers` answers
 * with into a list a screen can draw, so the same rule can be driven from a
 * test without a database and can never be one version behind the screen.
 *
 * THE RULE THE LIST OBEYS. Every blocker names what is in the way, in plain
 * words, and carries a control that fixes it. There is no blocker here whose
 * answer is "email us": a precondition with no route out is a dead end wearing
 * an explanation, and a dead end is what F-17 is about.
 *
 * NO FIGURE IN HERE IS FORMATTED. Money stays integer kobo and is handed to
 * `formatMoney` at the edge, per the money law.
 */

/** The seven numbers the database answers with, exactly as they arrive. */
export type BlockerReading = {
  /** Spendable kobo. Must be zero. */
  walletBalanceMinor: number;
  /** Kobo sitting in escrow in either direction. Must be zero. */
  walletHeldMinor: number;
  activeBookings: number;
  activeReservations: number;
  pendingPayouts: number;
  publishedListings: number;
  /**
   * First-party businesses of theirs a stranger can still transact against:
   * published, bookable, expected tonight, or still owed money. A draft
   * nobody can find is not one of them.
   */
  ownedBusinesses: number;
};

export const EMPTY_READING: BlockerReading = {
  walletBalanceMinor: 0,
  walletHeldMinor: 0,
  activeBookings: 0,
  activeReservations: 0,
  pendingPayouts: 0,
  publishedListings: 0,
  ownedBusinesses: 0,
};

/**
 * A blocker's machine name. The screen looks its words up by this, so the copy
 * lives in the dictionary and the rule lives here.
 */
export type BlockerKind =
  | "wallet-balance"
  | "wallet-held"
  | "active-bookings"
  | "active-reservations"
  | "pending-payouts"
  | "published-listings"
  | "owned-businesses";

export type Blocker = {
  kind: BlockerKind;
  /** Where the control that fixes it lives. */
  href: string;
  /**
   * The one number the copy interpolates: kobo for the two money blockers, a
   * plain count for the rest. Never a name, never an address.
   */
  amount: number;
};

/**
 * Read the seven numbers, answer with the blockers in the order a person
 * should deal with them: money first, because a balance is the one that costs
 * somebody something if they get it wrong, and the business last, because it
 * is the one whose route out takes another person's agreement and therefore
 * takes the longest.
 */
export function blockersFrom(reading: BlockerReading): Blocker[] {
  const blockers: Blocker[] = [];

  if (reading.walletBalanceMinor > 0) {
    blockers.push({ kind: "wallet-balance", href: "/wallet", amount: reading.walletBalanceMinor });
  }
  if (reading.walletHeldMinor > 0) {
    blockers.push({ kind: "wallet-held", href: "/wallet", amount: reading.walletHeldMinor });
  }
  if (reading.pendingPayouts > 0) {
    blockers.push({ kind: "pending-payouts", href: "/wallet", amount: reading.pendingPayouts });
  }
  if (reading.activeBookings > 0) {
    blockers.push({ kind: "active-bookings", href: "/bookings", amount: reading.activeBookings });
  }
  if (reading.activeReservations > 0) {
    blockers.push({
      kind: "active-reservations",
      href: "/trips",
      amount: reading.activeReservations,
    });
  }
  if (reading.publishedListings > 0) {
    blockers.push({
      kind: "published-listings",
      href: "/agent/listings",
      amount: reading.publishedListings,
    });
  }
  /*
   * A BUSINESS MAY NEVER BE ORPHANED, and this is the precondition that says
   * so. `public.businesses.owner_id` cascades onto `auth.users`, and the purge
   * deliberately does not delete that row, so without this the hotel keeps
   * selling rooms with a tombstone behind it. The founder's principle: nothing
   * a stranger can still transact against may be left ownerless.
   *
   * THE ROUTE OUT IS TWO DOORS AND BOTH ARE REAL. `/host/transfer` carries
   * them: hand the business to another Vallo account, which is an offer they
   * have to accept rather than something done to them, or close it, which is
   * unpublishing the rooms, settling the diary and taking it off the market.
   * The screen names both, and neither is an address to email.
   */
  if (reading.ownedBusinesses > 0) {
    blockers.push({
      kind: "owned-businesses",
      href: "/host/transfer",
      amount: reading.ownedBusinesses,
    });
  }

  return blockers;
}

/**
 * A NEGATIVE BALANCE DOES NOT BLOCK, AND THAT IS DELIBERATE.
 *
 * The precondition is "there is nothing of yours left here", not "your account
 * is settled". A wallet that has somehow gone below zero is a reconciliation
 * problem for the money desk and holding somebody's deletion hostage to it
 * would be the platform using a data-protection right as leverage over a
 * balance the person may not even owe. `blockersFrom` therefore asks
 * `> 0`, not `<> 0`, and the desk sees the negative balance through the
 * reconciliation sweep as it already does.
 */
export function canProceed(reading: BlockerReading): boolean {
  return blockersFrom(reading).length === 0;
}

/** Read the database's answer without trusting its shape. */
export function readingFrom(value: unknown): BlockerReading {
  if (!value || typeof value !== "object" || Array.isArray(value)) return EMPTY_READING;
  const row = value as Record<string, unknown>;
  const num = (key: string): number => {
    const raw = row[key];
    if (typeof raw === "number" && Number.isFinite(raw)) return Math.trunc(raw);
    if (typeof raw === "string") {
      const parsed = Number.parseInt(raw, 10);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };
  return {
    walletBalanceMinor: num("wallet_balance_minor"),
    walletHeldMinor: num("wallet_held_minor"),
    activeBookings: num("active_bookings"),
    activeReservations: num("active_reservations"),
    pendingPayouts: num("pending_payouts"),
    publishedListings: num("published_listings"),
    ownedBusinesses: num("owned_businesses"),
  };
}
