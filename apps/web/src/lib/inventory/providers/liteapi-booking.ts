import "server-only";

import { asNumber, asRecord, asString, requestJson } from "../http";
import { decimalToMinor } from "../mapping";

/**
 * Placing and cancelling a real booking at LiteAPI, on our own account.
 *
 * ## The one fact that matters more than the code
 *
 * Every booking this module places uses `payment: { method: "ACC_CREDIT_CARD" }`,
 * and `ACC_CREDIT_CARD` means LiteAPI charges the credit card attached to OUR
 * account rather than the guest's. That single field makes RentMe the MERCHANT
 * OF RECORD. We pay the supplier out of our own funded account, we collect naira
 * from the guest ourselves, and we owe that guest a refund out of our own pocket
 * every time a supplier fails after we have already taken their card. It is a
 * funded balance and an accepted liability before it is a line of code.
 *
 * The alternative that was rejected is `TRANSACTION_ID`, which is the payment
 * SDK flow where LiteAPI holds the card and carries the supplier risk. It was
 * rejected because it takes payment in LiteAPI's checkout rather than ours, and
 * the platform already collects naira through its own rails: a guest who paid on
 * a foreign card form is a guest we cannot refund, reconcile or support, and the
 * whole point of building a booking path here rather than deep linking to the
 * whitelabel is that the money and the booking end up on the same ledger.
 * `liteapi.ts` and `liteapi-prebook.ts` both describe the whitelabel handover as
 * the safe half of that trade, and it stays the shipped behaviour until the
 * commercial decision recorded in docs/HYBRID_INVENTORY.md section 7 is actually
 * made. This module is the client for that decision, not the decision.
 *
 * ## What this module deliberately is not
 *
 * It is a pure API client. It calls two endpoints, reads their answers
 * defensively and returns an outcome. It writes no database row, takes no
 * payment, touches no webhook and knows nothing about Paystack. Everything that
 * makes a booking safe (a row that can say "guest paid, supplier not confirmed",
 * an idempotency key shared with the charge webhook, an automatic refund path
 * for the failure that will happen) lives above this file and has to exist
 * before anything calls it. Keeping the transport separate is what lets that
 * layer be written and tested against a client whose behaviour is already
 * proved.
 *
 * ## Nothing here throws, and a failure is not a "no"
 *
 * Like every other provider in this directory, all faults resolve to an outcome
 * rather than an exception, so a caller never needs a try/catch. There is one
 * thing a caller MUST NOT infer from that, and it is the most dangerous
 * assumption available here: a `failed` outcome on `bookPrebookedStay` does NOT
 * mean no booking was made. A socket that died after the request left, or a
 * timeout on our side, leaves the supplier free to have confirmed a room and
 * charged our account. The booking budget below is generous for exactly this
 * reason, and a caller that sees `failed` must reconcile against
 * `GET /bookings` before it retries, never simply book again. Retrying blind is
 * how one guest ends up with two rooms and we end up paying for both.
 *
 * ## Money
 *
 * The cancellation reader converts to integer kobo through `decimalToMinor`, the
 * same integer-only parser the rest of this directory uses, and only when the
 * supplier says NGN. A non-naira figure is reported as unknown rather than
 * converted, because we hold no FX rate and a made-up rate applied to a REFUND
 * is worse than the same mistake on a shelf price: it is a number we would owe
 * somebody. This rule is inherited from `liteapi.ts` and is not negotiable.
 */

/**
 * The host, and an honest note about it.
 *
 * This matches the base URL the two sibling LiteAPI modules already use.
 * LiteAPI's own endpoint documentation additionally describes a separate
 * `book.liteapi.travel` host for the booking family, and which of the two a
 * production key actually accepts has not been confirmed against a live
 * account here. It is one constant, deliberately in one place, so that
 * confirming it is a one-line change rather than a hunt. Nothing else in this
 * file depends on the answer.
 */
/* The booking family is documented on a DIFFERENT host from search. See
   liteapi-hosts.ts, which is the only place either is written down. */
import { bookingHost } from "./liteapi-hosts";

/**
 * Longer than the search and prebook budgets on purpose.
 *
 * A rates search that times out costs a thinner shelf. A book that times out
 * costs an unresolved question about whether a supplier took our money, and the
 * only way to answer it is a reconciliation call somebody has to write. Waiting
 * is much cheaper than that, so this budget is set to let a slow supplier finish
 * rather than to keep a page snappy. Nobody is watching a spinner during a
 * booking confirmation in the way they are during a search.
 */
const BOOK_BUDGET_MS = 20_000;

/**
 * Cancellation is shorter than booking but still not a page-render budget.
 *
 * The ambiguity is smaller in this direction: a cancellation that did not answer
 * leaves a booking that still exists, which is the state the guest was already
 * in, so a timeout here is recoverable by asking again. It is still a supplier
 * round trip, so it gets room to breathe.
 */
const CANCEL_BUDGET_MS = 12_000;

function apiKey(): string | null {
  const key = process.env.LITEAPI_KEY ?? "";
  return key.length > 0 ? key : null;
}

/* ------------------------------------------------------------------ field reading
 *
 * LiteAPI does not spell its response fields with one convention. `liteapi.ts`
 * already documents the same problem on the content endpoints (`main_photo`
 * beside `mainPhoto`), and the cancellation response is documented with
 * snake_case money fields (`cancellation_fee`, `refund_amount`) while the
 * booking response beside it is camelCase (`bookingId`, `supplierBookingId`).
 *
 * So every read below tries the spellings there is evidence for and treats a
 * field it cannot recognise as absent. This is TOLERANCE, not confirmation: the
 * exact casing of the cancellation money fields has not been verified against a
 * live response, and the snake_case and camelCase pairs are both attempted for
 * that reason rather than because both are known to exist. The failure mode is a
 * figure reported as unknown, which a caller is already required to handle,
 * never a wrong figure and never a throw.
 */

function firstString(record: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return value;
  }
  return null;
}

function firstNumber(record: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = asNumber(record[key]);
    if (value !== null) return value;
  }
  return null;
}

/**
 * The payload, whether or not it arrived wrapped.
 *
 * The rates and content endpoints answer `{ data: ... }` and the prebook module
 * already unwraps that shape. Whether the booking endpoints wrap the same way
 * has not been confirmed, so both are accepted rather than one being assumed.
 * Getting this wrong in the assuming direction would turn a perfectly good
 * confirmation into a `failed`, and a `failed` on a booking is the expensive
 * outcome described in the header.
 */
function payloadOf(value: unknown): Record<string, unknown> | null {
  const body = asRecord(value);
  if (!body) return null;
  return asRecord(body["data"]) ?? body;
}

/* -------------------------------------------------------------------- booking */

/**
 * The person the booking is held in the name of.
 *
 * Separate from the guest list because the supplier treats it separately: the
 * holder is who the reservation belongs to and who gets the confirmation, and
 * they are frequently not one of the people sleeping in the room. Booking a
 * family trip in a parent's name is the ordinary case, not the exception.
 */
export type StayHolder = {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
};

/**
 * One person in one room.
 *
 * `occupancyNumber` is which room of the booking this guest belongs to, and it
 * is one-based to match the occupancies array the rate was quoted against. It is
 * required rather than defaulted because a silent default would quietly put a
 * four-person party in room one and leave the other rooms registered empty, and
 * a supplier that notices at the desk turns that into a guest standing in a
 * lobby at midnight.
 *
 * `email` is optional because only the holder's address is needed to deliver a
 * confirmation, and collecting an address for every member of a party we are not
 * going to write to is data we would then be responsible for.
 */
export type StayGuest = {
  readonly occupancyNumber: number;
  readonly firstName: string;
  readonly lastName: string;
  readonly email?: string;
};

export type BookStayInput = {
  /** From `prebookOffer`. It identifies the revalidated offer, not the hotel. */
  readonly prebookId: string;
  readonly holder: StayHolder;
  readonly guests: readonly StayGuest[];
};

export type Booked =
  /**
   * The supplier confirmed. `bookingId` is LiteAPI's own reference and is what a
   * cancellation is addressed to, so it is the one field a caller must persist
   * before it does anything else. `supplierBookingId` and `confirmationCode` are
   * the references a guest quotes at a desk, and both are nullable because a
   * confirmation is still a confirmation when the supplier did not return them.
   */
  | {
      outcome: "ok";
      bookingId: string;
      supplierBookingId: string | null;
      confirmationCode: string | null;
      status: string | null;
    }
  /** No key, or nothing to book with, so no call was made and no money moved. */
  | { outcome: "unavailable" }
  /**
   * Called and did not come back with a booking we can recognise. Read the
   * header before treating this as "nothing happened", because it is not the
   * same claim: the reason is for server logs and reconciliation, never for a
   * guest and never as grounds for an automatic retry.
   */
  | { outcome: "failed"; reason: string };

/**
 * Book a prebooked stay on our own account.
 *
 * The `prebookId` has a short life at the supplier, which is the whole reason
 * the prebook step exists: it pins a price for long enough to charge against.
 * Calling this with an id that has expired is an ordinary `failed`, not an
 * exception, and the correct recovery is to prebook again and show the guest the
 * new price rather than to book something they did not agree to.
 *
 * Input is validated before the network so that a caller bug shows up as a
 * logged reason instead of as a rejected request nobody can read. An empty
 * `prebookId` is `unavailable` rather than `failed`, matching the sibling
 * prebook module: there was nothing to call with, so nothing was attempted.
 */
export async function bookPrebookedStay(input: BookStayInput): Promise<Booked> {
  const key = apiKey();
  if (!key) return { outcome: "unavailable" };

  const prebookId = input.prebookId.trim();
  if (prebookId.length === 0) return { outcome: "unavailable" };

  /* A booking with no name on it is a booking nobody can claim at a desk, and a
     booking with no guests is a room the supplier has no occupancy for. Both are
     caller faults rather than upstream ones, so they are refused here with a
     reason that says which, instead of being sent on to come back as an opaque
     400 that a log reader has to decode. */
  const holder = {
    firstName: input.holder.firstName.trim(),
    lastName: input.holder.lastName.trim(),
    email: input.holder.email.trim(),
  };
  if (holder.firstName.length === 0 || holder.lastName.length === 0) {
    return { outcome: "failed", reason: "book refused: holder has no name" };
  }
  if (holder.email.length === 0) {
    return { outcome: "failed", reason: "book refused: holder has no email" };
  }
  if (input.guests.length === 0) {
    return { outcome: "failed", reason: "book refused: no guests" };
  }

  const guests = input.guests.map((guest) => ({
    occupancyNumber: guest.occupancyNumber,
    firstName: guest.firstName.trim(),
    lastName: guest.lastName.trim(),
    // Omitted rather than sent empty. An empty string is a value the supplier
    // may well store and then try to deliver a confirmation to.
    ...(guest.email && guest.email.trim().length > 0 ? { email: guest.email.trim() } : {}),
  }));
  if (guests.some((guest) => guest.firstName.length === 0 || guest.lastName.length === 0)) {
    return { outcome: "failed", reason: "book refused: a guest has no name" };
  }

  const deadline = Date.now() + BOOK_BUDGET_MS;
  const result = await requestJson<unknown>(
    `${bookingHost()}/rates/book`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "X-API-Key": key,
      },
      body: JSON.stringify({
        prebookId,
        holder,
        guests,
        /* The line that costs money. See the header: this charges the card
           attached to OUR LiteAPI account, which is what makes this platform the
           merchant of record and what puts the refund obligation on us. It is
           written as a literal rather than taken as an argument on purpose, so
           that no caller can pass a payment method through and quietly change
           who is liable for a booking. */
        payment: { method: "ACC_CREDIT_CARD" },
      }),
    },
    deadline,
  );

  if (!result.ok) return { outcome: "failed", reason: result.reason };

  const data = payloadOf(result.data);
  if (!data) return { outcome: "failed", reason: "book answered no object" };

  /* The booking id is the only field treated as required, because it is the
     handle every later action needs: without it a booking cannot be cancelled,
     reconciled or looked up, so a response carrying no id is unusable even if
     the supplier really did confirm. That case ends in the reconciliation path
     the header describes, which is why the reason names the field. */
  const bookingId = firstString(data, ["bookingId", "booking_id"]);
  if (!bookingId) return { outcome: "failed", reason: "book answered no bookingId" };

  return {
    outcome: "ok",
    bookingId,
    supplierBookingId: firstString(data, ["supplierBookingId", "supplier_booking_id"]),
    confirmationCode: firstString(data, ["hotelConfirmationCode", "hotel_confirmation_code"]),
    status: firstString(data, ["status"]),
  };
}

/* --------------------------------------------------------------- cancellation */

/**
 * What a cancellation cost, when it can be honestly stated in kobo at all.
 *
 * Split into a union rather than left as two nullable numbers because the two
 * situations are genuinely different and a caller must not be able to confuse
 * them. `known: false` means the supplier answered in something other than
 * naira, so there is no exchange rate here to turn it into one and no honest
 * number to show a guest or write to a ledger. Collapsing that into a null
 * beside a currency string would let a caller read the null as "nothing to
 * refund", and a refund silently rounded to zero is the single worst bug this
 * module could ship.
 */
export type CancelAmounts =
  | {
      readonly known: true;
      readonly currency: "NGN";
      /** Integer kobo, or null when the response did not state a fee. */
      readonly feeMinor: number | null;
      /** Integer kobo, or null when the response did not state a refund. */
      readonly refundMinor: number | null;
    }
  | {
      readonly known: false;
      /** Whatever the supplier said, for a log line and a human to look at. */
      readonly currency: string | null;
    };

export type Cancelled =
  | { outcome: "ok"; bookingId: string | null; status: string | null; amounts: CancelAmounts }
  /** No key, or no booking id, so no call was made. */
  | { outcome: "unavailable" }
  /**
   * Called and did not come back with a cancellation we can recognise. Unlike a
   * failed booking this is safe to retry, because the booking either still
   * exists or is already cancelled and asking twice changes neither.
   */
  | { outcome: "failed"; reason: string };

/**
 * The fee and refund from a cancellation response, in integer kobo or not at all.
 *
 * Exported and pure so the rule can be proved without a network, because the
 * rule is the point. Two things are being defended here at once:
 *
 * 1. **Naira only.** The currency the supplier states is checked before any
 *    figure is believed, exactly as `liteapi.ts` checks it before believing a
 *    rate. A refund of 412.76 in dollars is not a refund of 41,276 kobo, and we
 *    hold no rate that would make it one.
 * 2. **Integer arithmetic only.** The amounts arrive as JSON numbers, so they are
 *    stringified and handed to `decimalToMinor` rather than multiplied by 100.
 *    412.76 times 100 is 41275.999999999993 in floating point, and a refund
 *    computed that way is a kobo short of what somebody is owed for no reason
 *    anybody could later explain. An amount in exponent form, or with more
 *    precision than kobo can hold, is refused by that parser rather than rounded
 *    into a number we would then owe.
 *
 * A missing figure stays null rather than becoming zero. Zero is a real and
 * common answer here, since a free cancellation genuinely does refund the whole
 * amount with no fee, so the absence has to stay distinguishable from it.
 */
export function readCancelAmounts(data: Record<string, unknown>): CancelAmounts {
  const currency = firstString(data, ["currency"]);
  if (currency !== "NGN") return { known: false, currency };

  const toMinor = (amount: number | null): number | null => {
    if (amount === null || amount < 0) return null;
    return decimalToMinor(String(amount));
  };

  return {
    known: true,
    currency: "NGN",
    feeMinor: toMinor(firstNumber(data, ["cancellationFee", "cancellation_fee"])),
    refundMinor: toMinor(firstNumber(data, ["refundAmount", "refund_amount"])),
  };
}

/**
 * Cancel a booking we placed.
 *
 * `PUT /bookings/{bookingId}` is LiteAPI's cancellation, and the id is theirs
 * rather than the supplier's, which is why `bookPrebookedStay` treats
 * `bookingId` as the one field it will not proceed without.
 *
 * The id is percent-encoded into the path rather than interpolated raw. It is a
 * value that arrived from an upstream response and may since have been through a
 * database and a caller, and a path segment is not a place to find out that it
 * carried a slash.
 */
export async function cancelStay(bookingId: string): Promise<Cancelled> {
  const key = apiKey();
  if (!key) return { outcome: "unavailable" };

  const id = bookingId.trim();
  if (id.length === 0) return { outcome: "unavailable" };

  const deadline = Date.now() + CANCEL_BUDGET_MS;
  const result = await requestJson<unknown>(
    `${bookingHost()}/bookings/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: {
        accept: "application/json",
        "X-API-Key": key,
      },
    },
    deadline,
  );

  if (!result.ok) return { outcome: "failed", reason: result.reason };

  const data = payloadOf(result.data);
  if (!data) return { outcome: "failed", reason: "cancel answered no object" };

  /* A cancellation response has to identify itself somehow before its numbers
     are believed. Accepting a bare object would mean an error envelope, or an
     endpoint that moved, could be read as a successful cancellation with two
     unknown figures, and the caller would then tell a guest their booking is
     gone when it is not. Either the id or the status is enough to recognise it;
     requiring both would fail a real answer over a field we have not confirmed
     is always present. */
  const echoedId = firstString(data, ["bookingId", "booking_id"]);
  const status = firstString(data, ["status"]);
  if (!echoedId && !status) {
    return { outcome: "failed", reason: "cancel answered a shape we do not recognise" };
  }

  return { outcome: "ok", bookingId: echoedId, status, amounts: readCancelAmounts(data) };
}
