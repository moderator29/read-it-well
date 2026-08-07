import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bookingUrl, joinContentAndRates, whitelabelHost, type HotelContent } from "./liteapi";
import { DEFAULT_PARTNER_CITY } from "../mapping";

/**
 * The LiteAPI mapping, against payloads rather than a network.
 *
 * Same reasoning as the Places spec next door: this layer's whole job is to
 * interpret somebody else's JSON, so the only honest test hands it some. What
 * is asserted here, in order of how much damage getting it wrong would do:
 *
 * 1. **Money.** A dollar amount must never be shown as naira, and kobo must
 *    never come from floating point arithmetic. This is the assertion that
 *    matters most: everything else on this page is cosmetic by comparison.
 * 2. **Partner stock never carries our trust badge.**
 * 3. **A hotel with no naira rate is dropped, not shown priceless.**
 * 4. **The booking link only exists when a booking site does**, and it opens on
 *    the same dates the price was quoted for.
 */

const CITY = DEFAULT_PARTNER_CITY;

function content(over: Partial<HotelContent> = {}): HotelContent {
  return {
    hotelId: "lp4aa75",
    name: "Eko Hotel & Suites",
    lat: 6.4281,
    lng: 3.4219,
    area: "Victoria Island",
    photos: ["https://cdn.example/1.jpg"],
    ...over,
  };
}

/** A `/hotels/rates` entry, with only the fields the provider reads. */
function rates(hotelId: string, totals: { amount: number; currency: string }[]) {
  return [
    hotelId,
    {
      hotelId,
      roomTypes: [{ offerId: "offer-1", rates: [{ retailRate: { total: totals } }] }],
    } as Record<string, unknown>,
  ] as const;
}

describe("money", () => {
  it("maps a naira amount to exact integer kobo", () => {
    const notes: string[] = [];
    const out = joinContentAndRates(
      [content()],
      new Map([rates("lp4aa75", [{ amount: 185_000.55, currency: "NGN" }])]),
      CITY,
      notes,
    );

    expect(out).toHaveLength(1);
    // 185,000.55 naira is 18,500,055 kobo. Not 18500054.999999998, which is
    // what `amount * 100` produces for this value in floating point.
    expect(out[0]!.priceMinor).toBe(18_500_055);
    expect(Number.isSafeInteger(out[0]!.priceMinor)).toBe(true);
  });

  it("drops a hotel priced in a currency that is not naira", () => {
    // The fault this prevents is a $412 hotel appearing on the shelf as N412.
    // We hold no FX rate, so there is no honest number to show.
    const notes: string[] = [];
    const out = joinContentAndRates(
      [content()],
      new Map([rates("lp4aa75", [{ amount: 412.76, currency: "USD" }])]),
      CITY,
      notes,
    );

    expect(out).toHaveLength(0);
    expect(notes.join(" ")).toContain("NGN");
  });

  it("takes the cheapest naira offer and ignores foreign ones beside it", () => {
    const notes: string[] = [];
    const out = joinContentAndRates(
      [content()],
      new Map([
        rates("lp4aa75", [
          { amount: 400, currency: "USD" },
          { amount: 260_000, currency: "NGN" },
          { amount: 185_000, currency: "NGN" },
        ]),
      ]),
      CITY,
      notes,
    );

    expect(out[0]!.priceMinor).toBe(18_500_000);
  });

  it("drops a hotel with no rate at all rather than showing it priceless", () => {
    const notes: string[] = [];
    const out = joinContentAndRates([content()], new Map(), CITY, notes);

    expect(out).toHaveLength(0);
    expect(notes.join(" ")).toContain("1 hotel(s)");
  });
});

describe("the mapped listing", () => {
  it("is partner stock and never verified", () => {
    const out = joinContentAndRates(
      [content()],
      new Map([rates("lp4aa75", [{ amount: 185_000, currency: "NGN" }])]),
      CITY,
      [],
    );

    expect(out[0]!.source).toBe("partner");
    expect(out[0]!.verified).toBe(false);
    expect(out[0]!.instantBook).toBe(false);
    expect(out[0]!.partner?.provider).toBe("liteapi");
  });

  it("states no amenities and no guest rating, because the feed states neither", () => {
    const out = joinContentAndRates(
      [content()],
      new Map([rates("lp4aa75", [{ amount: 185_000, currency: "NGN" }])]),
      CITY,
      [],
    );

    // `amenities` holds our own codes, which the filter matches with AND
    // semantics. Foreign vocabulary in there either never matches or matches
    // the wrong thing.
    expect(out[0]!.amenities).toEqual([]);
    // LiteAPI's rating is a star rating, not guest opinion. Publishing it next
    // to a review count of zero would be a different claim from the one the
    // feed is making.
    expect(out[0]!.rating).toBe(0);
    expect(out[0]!.reviewCount).toBe(0);
  });

  it("carries the coordinate, so de-duplication has geometry to work with", () => {
    const out = joinContentAndRates(
      [content()],
      new Map([rates("lp4aa75", [{ amount: 185_000, currency: "NGN" }])]),
      CITY,
      [],
    );

    expect(out[0]!.lat).toBe(6.4281);
    expect(out[0]!.lng).toBe(3.4219);
  });

  it("places a hotel by its own coordinate rather than the city searched", () => {
    // Abuja coordinates while the search ran from Lagos.
    const out = joinContentAndRates(
      [content({ hotelId: "abj1", lat: 9.0722, lng: 7.4801, area: "Maitama" })],
      new Map([rates("abj1", [{ amount: 210_000, currency: "NGN" }])]),
      CITY,
      [],
    );

    expect(out[0]!.city).toBe("Abuja");
    expect(out[0]!.state).toBe("FCT (Abuja)");
  });
});

describe("the booking link", () => {
  const ORIGINAL = process.env.LITEAPI_WHITELABEL_DOMAIN;

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.LITEAPI_WHITELABEL_DOMAIN;
    else process.env.LITEAPI_WHITELABEL_DOMAIN = ORIGINAL;
  });

  it("does not exist until a booking site is configured", () => {
    delete process.env.LITEAPI_WHITELABEL_DOMAIN;

    expect(whitelabelHost()).toBeNull();
    expect(bookingUrl("lp4aa75", { checkin: "2026-08-08", checkout: "2026-08-09" })).toBeNull();

    const out = joinContentAndRates(
      [content()],
      new Map([rates("lp4aa75", [{ amount: 185_000, currency: "NGN" }])]),
      CITY,
      [],
    );
    // No dead button on the detail page: the panel reads this absence and says
    // the hotel is priced here but not bookable here.
    expect(out[0]!.partner?.bookUrl).toBeUndefined();
  });

  it("opens on the same dates the price was quoted for", () => {
    process.env.LITEAPI_WHITELABEL_DOMAIN = "rentme.nuitee.link";

    const url = bookingUrl("lp4aa75", { checkin: "2026-08-08", checkout: "2026-08-09" });
    expect(url).toBe(
      "https://rentme.nuitee.link/hotels/lp4aa75?checkin=2026-08-08&checkout=2026-08-09",
    );
  });

  it("accepts the domain however the owner pasted it", () => {
    for (const value of [
      "rentme.nuitee.link",
      "https://rentme.nuitee.link",
      "https://rentme.nuitee.link/",
      "  rentme.nuitee.link  ",
    ]) {
      process.env.LITEAPI_WHITELABEL_DOMAIN = value;
      expect(whitelabelHost()).toBe("rentme.nuitee.link");
    }
  });

  it("accepts the real booking site, hyphens and digits and all", () => {
    /* The actual whitelabel this platform provisioned. It is pinned here
       because the generated name carries both a hyphenated label and a digit
       suffix, and a tightened pattern that still passed every invented example
       above could quietly stop matching the one host that matters. */
    for (const value of [
      "naija-finds-3twpj.nuitee.link",
      "https://naija-finds-3twpj.nuitee.link/",
    ]) {
      process.env.LITEAPI_WHITELABEL_DOMAIN = value;
      expect(whitelabelHost()).toBe("naija-finds-3twpj.nuitee.link");
    }

    process.env.LITEAPI_WHITELABEL_DOMAIN = "naija-finds-3twpj.nuitee.link";
    expect(bookingUrl("lp4aa75", { checkin: "2026-08-08", checkout: "2026-08-09" })).toBe(
      "https://naija-finds-3twpj.nuitee.link/hotels/lp4aa75?checkin=2026-08-08&checkout=2026-08-09",
    );
  });

  it("refuses anything that is not a bare host", () => {
    // This value is interpolated into a URL a paying guest is sent to, so a
    // pasted path, a query or whitespace is refused rather than patched up.
    for (const value of [
      "rentme.nuitee.link/hotels",
      "rentme.nuitee.link?a=b",
      "not a domain",
      "javascript:alert(1)",
      "localhost",
    ]) {
      process.env.LITEAPI_WHITELABEL_DOMAIN = value;
      expect(whitelabelHost()).toBeNull();
    }
  });

  it("escapes a hotel id rather than pasting it into the path", () => {
    process.env.LITEAPI_WHITELABEL_DOMAIN = "rentme.nuitee.link";
    expect(bookingUrl("lp4/../evil", { checkin: "2026-08-08", checkout: "2026-08-09" })).toBe(
      "https://rentme.nuitee.link/hotels/lp4%2F..%2Fevil?checkin=2026-08-08&checkout=2026-08-09",
    );
  });
});
