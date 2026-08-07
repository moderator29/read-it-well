/**
 * Which LiteAPI host each call goes to, in one place.
 *
 * This file exists because there are two hosts and getting the split wrong
 * fails in exactly the way that is hardest to notice: not at build time, not in
 * a test, but against a production key, as a 404 on the one call that takes
 * somebody's money.
 *
 * LiteAPI's own documentation splits the surface. The search and content
 * endpoints are documented on `api.liteapi.travel`, and the booking family is
 * documented on `book.liteapi.travel`, which the endpoint reference writes out
 * in full as `https://book.liteapi.travel/v3.0/rates/book`. Three modules had
 * each hardcoded their own constant, and all three said `api`, so the booking
 * call was pointed at a host its own documentation does not put it on.
 *
 * ## What is verified and what is not
 *
 * `DATA_HOST` is settled. `data/hotels` and `hotels/rates` are documented there
 * and that is where the working search already goes.
 *
 * `BOOKING_HOST` is documented for `rates/book` and is used here for the whole
 * booking family, including `rates/prebook` and the cancel `PUT`. Prebook is
 * the one this is inferred for rather than read: it belongs to the booking
 * workflow in the documentation's own ordering, so it is grouped with it, but
 * nobody here has watched it answer on either host with a real key.
 *
 * ## Why guessing was safe enough to ship, and why it still had to be fixed
 *
 * Every caller of these hosts fails closed. A wrong host is a DNS or 404
 * failure, `requestJson` turns it into `{ ok: false }`, and each provider maps
 * that to an empty envelope or a `failed` outcome. So the search degrades to no
 * partner hotels and prebooking degrades to handing the guest over on the price
 * we already had, which is precisely the behaviour before either existed. The
 * booking call is the one where that is not good enough, because by then a card
 * has been charged, and that is why this is settled before the money path is
 * built rather than after.
 *
 * `LITEAPI_BOOKING_HOST` overrides it without a deploy, for the afternoon
 * somebody tests a real key and finds the documentation and the service
 * disagree. Anything that is not a bare hostname is refused rather than
 * interpolated, because this string builds a URL that carries a credential.
 */

/** Search and static content. Documented, and where the working search goes. */
export const DATA_HOST = "https://api.liteapi.travel/v3.0";

const DEFAULT_BOOKING_HOST = "book.liteapi.travel";

/** Prebook, book and cancel. See the note above on what is inferred. */
export function bookingHost(): string {
  const raw = (process.env.LITEAPI_BOOKING_HOST ?? "").trim();
  const host = raw.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  const usable = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9-]+)+$/i.test(host)
    ? host
    : DEFAULT_BOOKING_HOST;
  return `https://${usable}/v3.0`;
}
