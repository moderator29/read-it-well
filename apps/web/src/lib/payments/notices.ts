import "server-only";

import { announce } from "../notify/junction";
import type { AdminClient } from "../wallet/ledger";

/**
 * EVERY CHANGE TO HOW SOMEBODY PAYS, OR GETS PAID, SAYS SO.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS.
 *
 * Six things can change on the payments desk: a card is saved, a card becomes
 * the default, a card is removed, a bank account is added, an account becomes
 * the default, an account is removed. Before this file, all six were silent.
 * Not quiet, silent: no in-app row, no email, nothing in `audit_log` for four
 * of the six. Somebody whose session was stolen could have their payout
 * account swapped for the attacker's and the first they would know of it is a
 * withdrawal that did not arrive.
 *
 * That is the exact shape of the failure the money audit trail was built to
 * end (`lib/wallet/audit.ts`), and the payments desk was outside it.
 *
 * ---------------------------------------------------------------------------
 * WHAT EACH NOTICE MAY SAY, AND WHAT IT MAY NEVER SAY.
 *
 * Rule 16 is absolute here: no card number, no bank account number, no bank
 * verification name. A notification row is read by the recipient, but it is
 * also read by anybody standing behind them and it sits in a table an operator
 * can select from. The vocabulary is therefore the brand word for a card
 * ("Visa", "Mastercard", "Verve") and the bank's name, both of which are
 * public facts about an institution rather than facts about a person, and the
 * last four digits of a card, which the card networks themselves treat as
 * non-sensitive and which is the only handle a person has for telling two of
 * their own cards apart. A bank account number gets NO digits at all, because
 * ten digits minus four is still a NUBAN somebody can narrow, and the bank's
 * name plus "the account ending in" would identify it to the one person who
 * does not need identifying and to one who does.
 *
 * ---------------------------------------------------------------------------
 * NEVER THROWS, AND WHY THAT IS NOT LAZINESS.
 *
 * `announce` is already best effort on both halves. This wraps it once more
 * because the change these notices describe has ALREADY COMMITTED by the time
 * anything here runs. A failed notification must never turn a card that really
 * was removed into an error message that says it was not. A missing notice is
 * a gap somebody can see; a rolled-back removal that the person was told
 * succeeded is a lie.
 *
 * ---------------------------------------------------------------------------
 * NO EMAIL YET, SAID PLAINLY RATHER THAN LEFT TO BE ASSUMED.
 *
 * Every notice here passes `email: null`. `lib/email/messages.ts` has a
 * builder for a password change and for a new device sign-in, which are the
 * two events of this exact class that already exist, and it has none for a
 * payment instrument. Writing one belongs to whoever owns `lib/email`, and
 * inventing a half-shaped builder from this side would be worse than the gap.
 * The gap is recorded in `docs/BUILD_07_LEDGER.md`. When the builder lands,
 * the only change here is the `email` field on each announcement: the call
 * sites, the audit lines and the in-app rows do not move.
 */

/** Where a payments notification lands. One page, and it is the right one. */
const PAYMENTS_HREF = "/settings/payments";

type Announced = { notified: boolean };

async function quietly(work: () => Promise<{ notified: boolean }>): Promise<Announced> {
  try {
    return await work();
  } catch {
    return { notified: false };
  }
}

/**
 * A card brand as a notice may print it.
 *
 * Paystack's `card_type` arrives as "visa", "mastercard", "verve DEBIT" and
 * other lower-case shapes. `components/app/payments/format.ts` is the printer
 * for the interface; a notification is written on the server and read on any
 * surface, so it gets its own small, deliberately dull version that never
 * throws on an unexpected value and never prints an empty word.
 */
function brandWord(cardType: string | null | undefined): string {
  const raw = (cardType ?? "").trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (raw === "visa") return "Visa";
  if (raw === "mastercard" || raw === "master") return "Mastercard";
  if (raw === "verve") return "Verve";
  return "card";
}

/** "your Visa ending 4081", or "your card" when the brand is unknown. */
function cardPhrase(cardType: string | null | undefined, last4: string | null | undefined): string {
  const brand = brandWord(cardType);
  const digits = (last4 ?? "").trim();
  const noun = brand === "card" ? "card" : `${brand} card`;
  return /^\d{4}$/.test(digits) ? `your ${noun} ending ${digits}` : `your ${noun}`;
}

/* ------------------------------------------------------------------- cards */

/** A card was saved to the account, after the setup charge succeeded. */
export function cardSavedNotice(
  admin: AdminClient,
  userId: string,
  card: { cardType?: string | null; last4?: string | null },
): Promise<Announced> {
  return quietly(() =>
    announce(admin, {
      recipient: { kind: "user", userId },
      notice: {
        kind: "wallet",
        title: "A card was saved to your account",
        body: `We saved ${cardPhrase(card.cardType, card.last4)}. If this was not you, remove it on the payments page and change your password.`,
        href: PAYMENTS_HREF,
      },
      email: null,
    }),
  );
}

/** A different card is now the one charged by default. */
export function cardDefaultChangedNotice(
  admin: AdminClient,
  userId: string,
  card: { cardType?: string | null; last4?: string | null },
): Promise<Announced> {
  return quietly(() =>
    announce(admin, {
      recipient: { kind: "user", userId },
      notice: {
        kind: "wallet",
        title: "Your default card changed",
        body: `Payments now use ${cardPhrase(card.cardType, card.last4)} first. If this was not you, change it back and change your password.`,
        href: PAYMENTS_HREF,
      },
      email: null,
    }),
  );
}

/** A card was taken off the account. */
export function cardRemovedNotice(
  admin: AdminClient,
  userId: string,
  card: { cardType?: string | null; last4?: string | null },
): Promise<Announced> {
  return quietly(() =>
    announce(admin, {
      recipient: { kind: "user", userId },
      notice: {
        kind: "wallet",
        title: "A card was removed",
        body: `We removed ${cardPhrase(card.cardType, card.last4)} from your account. Nothing was charged. If this was not you, change your password.`,
        href: PAYMENTS_HREF,
      },
      email: null,
    }),
  );
}

/* ------------------------------------------------------------------- banks */

/**
 * An account was added for payouts.
 *
 * The bank's name and nothing else. See the note at the top on why a NUBAN
 * gets no digits here at all, not even the last four.
 */
export function bankAccountAddedNotice(
  admin: AdminClient,
  userId: string,
  account: { bankName: string },
): Promise<Announced> {
  return quietly(() =>
    announce(admin, {
      recipient: { kind: "user", userId },
      notice: {
        kind: "wallet",
        title: "A bank account was added",
        body: `We added an account at ${account.bankName} for your payouts, after the bank confirmed the name on it. If this was not you, remove it and change your password.`,
        href: PAYMENTS_HREF,
      },
      email: null,
    }),
  );
}

/** Money now leaves to a different account. The one to shout about. */
export function bankDefaultChangedNotice(
  admin: AdminClient,
  userId: string,
  account: { bankName: string },
): Promise<Announced> {
  return quietly(() =>
    announce(admin, {
      recipient: { kind: "user", userId },
      notice: {
        kind: "wallet",
        title: "Your payout account changed",
        body: `Money you withdraw now goes to your account at ${account.bankName}. If this was not you, change it back now and change your password.`,
        href: PAYMENTS_HREF,
      },
      email: null,
    }),
  );
}

/** An account was taken off the list. */
export function bankAccountRemovedNotice(
  admin: AdminClient,
  userId: string,
  account: { bankName: string },
): Promise<Announced> {
  return quietly(() =>
    announce(admin, {
      recipient: { kind: "user", userId },
      notice: {
        kind: "wallet",
        title: "A bank account was removed",
        body: `We removed your account at ${account.bankName}. Your balance is untouched. If this was not you, change your password.`,
        href: PAYMENTS_HREF,
      },
      email: null,
    }),
  );
}

/** Exported for the unit test, which is the only other honest reader. */
export const __testing = { brandWord, cardPhrase };
