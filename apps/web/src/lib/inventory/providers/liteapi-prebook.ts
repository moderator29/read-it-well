import "server-only";

import { asArray, asNumber, asRecord, asString, requestJson } from "../http";
import { decimalToMinor } from "../mapping";

/**
 * Revalidating a partner hotel rate at the moment somebody acts on it.
 *
 * The price on a partner hotel card comes from a rates search, and a rates
 * search is a photograph. It was true when it was taken. By the time a guest
 * has read the page, thought about it and tapped Book, the room may cost
 * something else or be gone, and every one of those is a real outcome rather
 * than a rare one: hotel inventory is repriced continuously and a card can sit
 * on a screen for minutes.
 *
 * `POST /rates/prebook` is LiteAPI's answer to exactly that. It takes the offer
 * the guest was looking at and returns what it costs NOW, plus a `prebookId`
 * that identifies this validated offer. That id is the thread a future
 * on-platform booking would pull on, which is why it is captured and stored
 * even though nothing here books anything yet.
 *
 * ## What this deliberately does not do
 *
 * It does not book, and it does not take money. `POST /rates/book` with
 * `ACC_CREDIT_CARD` would make this platform the merchant of record: we would
 * pay LiteAPI from a funded wallet, collect naira ourselves, and owe the guest
 * a refund out of our own pocket every time a supplier failed after we had
 * taken their card. That is a commercial commitment rather than a piece of
 * code, and it is not one anybody has made. Until it is, the guest pays on the
 * whitelabel checkout, where LiteAPI carries the supplier risk and the refund
 * obligation, and this call exists only so the number they leave with is true.
 *
 * `usePaymentSdk` is false for the same reason. Asking for a payment
 * transaction we have no intention of completing would hold inventory we are
 * not going to buy.
 *
 * Nothing here throws. Every failure resolves to an outcome, and the caller
 * treats every one of them as "hand them over on the price we already had",
 * because a revalidation that did not answer is not a reason to block a booking.
 */

const BASE_URL = "https://api.liteapi.travel/v3.0";

/** Shorter than a search budget. A guest is waiting on a tap, not a page load. */
const BUDGET_MS = 4_000;

export type Prebooked =
  /** The offer is still live. `minor` is what it costs now, in kobo. */
  | { outcome: "ok"; prebookId: string; minor: number | null }
  /** No key, so no call was made. */
  | { outcome: "unavailable" }
  /**
   * Called and refused. The offer may be gone, the rate may have moved beyond
   * what they will sell at, or the upstream may simply be down. All three read
   * the same to a guest and all three end in the same place.
   */
  | { outcome: "failed"; reason: string };

function apiKey(): string | null {
  const key = process.env.LITEAPI_KEY ?? "";
  return key.length > 0 ? key : null;
}

/**
 * The cheapest naira total across everything the prebook came back with.
 *
 * Same rule as the search mapping, and for the same reason: we hold no FX rate,
 * so an offer quoted in anything but naira has no honest naira price and is not
 * mapped rather than converted. Null means the response carried no naira amount
 * we could trust, and the caller shows the price it already had instead of
 * inventing one.
 *
 * Amounts arrive as JSON numbers, so they go through the same integer parser
 * the rest of this directory uses rather than being multiplied by 100.
 */
function cheapestNgnMinor(body: Record<string, unknown>): number | null {
  let best: number | null = null;

  for (const roomEntry of asArray(body["roomTypes"])) {
    const roomType = asRecord(roomEntry);
    if (!roomType) continue;
    for (const rateEntry of asArray(roomType["rates"])) {
      const rate = asRecord(rateEntry);
      if (!rate) continue;
      const retail = asRecord(rate["retailRate"]);
      if (!retail) continue;
      for (const totalEntry of asArray(retail["total"])) {
        const total = asRecord(totalEntry);
        if (!total) continue;
        if (asString(total["currency"]) !== "NGN") continue;
        const amount = asNumber(total["amount"]);
        if (amount === null || amount <= 0) continue;
        const minor = decimalToMinor(String(amount));
        if (minor === null || minor <= 0) continue;
        if (best === null || minor < best) best = minor;
      }
    }
  }
  return best;
}

/**
 * Validate one offer and learn what it costs right now.
 *
 * `offerId` is the opaque reference carried on the listing as
 * `partner.offerRef`, put there by the search mapping. A listing without one
 * cannot be revalidated, which is not a failure: it means the feed did not give
 * us a handle for that rate, and the guest is handed over on the search price.
 */
export async function prebookOffer(offerId: string): Promise<Prebooked> {
  const key = apiKey();
  if (!key) return { outcome: "unavailable" };
  if (offerId.trim().length === 0) return { outcome: "unavailable" };

  const deadline = Date.now() + BUDGET_MS;
  const result = await requestJson<unknown>(
    `${BASE_URL}/rates/prebook`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "X-API-Key": key,
      },
      // False on purpose. See the header: we are not completing a payment here
      // and must not hold inventory we are not going to buy.
      body: JSON.stringify({ offerId, usePaymentSdk: false }),
    },
    deadline,
  );

  if (!result.ok) return { outcome: "failed", reason: result.reason };

  const body = asRecord(result.data);
  const data = asRecord(body?.["data"]) ?? body;
  if (!data) return { outcome: "failed", reason: "prebook answered no object" };

  const prebookId = asString(data["prebookId"]);
  if (!prebookId) return { outcome: "failed", reason: "prebook answered no prebookId" };

  return { outcome: "ok", prebookId, minor: cheapestNgnMinor(data) };
}

/**
 * How a revalidated price compares to the one the guest was shown.
 *
 * Exported and pure so the rule can be tested without a network, because the
 * rule is the point: a price that moved by a naira is not worth interrupting
 * somebody over, and one that moved by a third is not something to let them
 * walk into. The threshold is proportional rather than absolute for the obvious
 * reason that a two thousand naira move means nothing on a suite and everything
 * on a guest house.
 */
export const PRICE_MOVE_TOLERANCE = 0.02;

export function priceMoved(shownMinor: number, nowMinor: number): boolean {
  if (shownMinor <= 0) return false;
  return Math.abs(nowMinor - shownMinor) / shownMinor > PRICE_MOVE_TOLERANCE;
}
