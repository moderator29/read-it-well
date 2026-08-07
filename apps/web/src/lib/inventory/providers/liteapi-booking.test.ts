import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bookPrebookedStay,
  cancelStay,
  readCancelAmounts,
  type BookStayInput,
} from "./liteapi-booking";

/**
 * The booking client, against payloads and a stubbed socket rather than LiteAPI.
 *
 * This module is the only one in the directory whose calls cost money, so what
 * is asserted here is chosen by how much damage getting it wrong would do rather
 * than by coverage:
 *
 * 1. **No key means no call.** Every other provider degrades to a thinner shelf
 *    when it is unconfigured. This one would place a real booking against a real
 *    funded account, so "did we even reach the network" is a thing worth proving
 *    rather than assuming, and it is proved by watching `fetch` itself.
 * 2. **A foreign refund figure is reported as unknown, never converted.** We
 *    hold no exchange rate, and a wrong number here is a number we would owe
 *    somebody.
 * 3. **Kobo comes from integer arithmetic.** 412.76 is the value that catches a
 *    floating point implementation, and it is pinned for that reason.
 * 4. **A shape we do not recognise is an outcome, not a throw.** A page or a
 *    webhook that dies mid-booking is far worse than one that logs a reason.
 *
 * `fetch` is stubbed rather than mocked at the module boundary because the whole
 * point of the shared HTTP path is that it turns faults into outcomes, and a
 * test that skipped it would prove the mapping while leaving the part that
 * actually protects a caller untested.
 */

const KEY = "sand_test_key";
const ORIGINAL_KEY = process.env.LITEAPI_KEY;

/** A complete, valid booking request. Individual tests spoil one field at a time. */
function input(over: Partial<BookStayInput> = {}): BookStayInput {
  return {
    prebookId: "prebook_9f2c",
    holder: { firstName: "Adaeze", lastName: "Okonkwo", email: "adaeze@example.com" },
    guests: [{ occupancyNumber: 1, firstName: "Adaeze", lastName: "Okonkwo" }],
    ...over,
  };
}

/** A stub that answers one JSON body with one status, and records what it was asked. */
function respondWith(body: unknown, status = 200) {
  const fetchMock = vi.fn(async () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  process.env.LITEAPI_KEY = KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (ORIGINAL_KEY === undefined) delete process.env.LITEAPI_KEY;
  else process.env.LITEAPI_KEY = ORIGINAL_KEY;
});

describe("an unconfigured account never reaches the network", () => {
  it("returns unavailable and makes no booking call without a key", async () => {
    delete process.env.LITEAPI_KEY;
    const fetchMock = respondWith({ data: { bookingId: "b1" } });

    expect(await bookPrebookedStay(input())).toEqual({ outcome: "unavailable" });
    /* The assertion that matters. A booking placed by accident is a real charge
       against a real funded card, so an unconfigured environment has to stop
       before the socket rather than at the response. */
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns unavailable and makes no cancellation call without a key", async () => {
    delete process.env.LITEAPI_KEY;
    const fetchMock = respondWith({ bookingId: "b1", status: "CANCELLED" });

    expect(await cancelStay("b1")).toEqual({ outcome: "unavailable" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats an empty key the same as no key at all", async () => {
    process.env.LITEAPI_KEY = "";
    const fetchMock = respondWith({ data: { bookingId: "b1" } });

    expect(await bookPrebookedStay(input())).toEqual({ outcome: "unavailable" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("makes no call when there is no prebook id to book against", async () => {
    const fetchMock = respondWith({ data: { bookingId: "b1" } });

    expect(await bookPrebookedStay(input({ prebookId: "   " }))).toEqual({
      outcome: "unavailable",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("what a booking request actually sends", () => {
  it("charges our own account, carries the holder and guests, and authenticates by header", async () => {
    const fetchMock = respondWith({ data: { bookingId: "bk_1" } });
    await bookPrebookedStay(input());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]! as unknown as [string, RequestInit];

    expect(url).toBe("https://api.liteapi.travel/v3.0/rates/book");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["X-API-Key"]).toBe(KEY);

    const sent = JSON.parse(String(init.body)) as Record<string, unknown>;
    /* ACC_CREDIT_CARD is the field that makes this platform the merchant of
       record. It is pinned here because a change to it is a change to who is
       liable for a failed supplier confirmation, and that should never happen
       quietly in a diff. */
    expect(sent.payment).toEqual({ method: "ACC_CREDIT_CARD" });
    expect(sent.prebookId).toBe("prebook_9f2c");
    expect(sent.holder).toEqual({
      firstName: "Adaeze",
      lastName: "Okonkwo",
      email: "adaeze@example.com",
    });
    expect(sent.guests).toEqual([
      { occupancyNumber: 1, firstName: "Adaeze", lastName: "Okonkwo" },
    ]);
  });

  it("omits a guest email rather than sending an empty one", async () => {
    // An empty string is a value a supplier may well store and then try to
    // deliver a confirmation to.
    const fetchMock = respondWith({ data: { bookingId: "bk_1" } });
    await bookPrebookedStay(
      input({ guests: [{ occupancyNumber: 1, firstName: "Ada", lastName: "Okonkwo", email: "  " }] }),
    );

    const [, init] = fetchMock.mock.calls[0]! as unknown as [string, RequestInit];
    const sent = JSON.parse(String(init.body)) as { guests: Record<string, unknown>[] };
    expect(sent.guests[0]).not.toHaveProperty("email");
  });

  it("refuses an incomplete party before spending anything", async () => {
    const fetchMock = respondWith({ data: { bookingId: "bk_1" } });

    const noName = await bookPrebookedStay(
      input({ holder: { firstName: " ", lastName: "Okonkwo", email: "a@example.com" } }),
    );
    const noEmail = await bookPrebookedStay(
      input({ holder: { firstName: "Ada", lastName: "Okonkwo", email: "" } }),
    );
    const noGuests = await bookPrebookedStay(input({ guests: [] }));

    for (const result of [noName, noEmail, noGuests]) {
      expect(result.outcome).toBe("failed");
    }
    // A booking nobody can claim at a desk is a caller bug, and it is refused
    // here so it reads as one in a log rather than as an opaque upstream 400.
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("reading a booking answer", () => {
  it("reports the supplier reference and the confirmation code", async () => {
    respondWith({
      data: {
        bookingId: "bk_7719",
        supplierBookingId: "SUP-44120",
        hotelConfirmationCode: "EKO-2026-8811",
        status: "CONFIRMED",
      },
    });

    expect(await bookPrebookedStay(input())).toEqual({
      outcome: "ok",
      bookingId: "bk_7719",
      supplierBookingId: "SUP-44120",
      confirmationCode: "EKO-2026-8811",
      status: "CONFIRMED",
    });
  });

  it("accepts the answer whether or not it arrived wrapped in data", async () => {
    // Whether the booking endpoints wrap the way the rates endpoints do is not
    // confirmed, and assuming the wrong one would turn a real confirmation into
    // a failure, which is the expensive direction to be wrong in.
    respondWith({ bookingId: "bk_flat", status: "CONFIRMED" });

    const result = await bookPrebookedStay(input());
    expect(result).toMatchObject({ outcome: "ok", bookingId: "bk_flat" });
  });

  it("confirms without a supplier reference rather than calling it a failure", async () => {
    // A confirmation is still a confirmation when the supplier returned no
    // codes. Treating it as failed would send a caller into reconciliation over
    // a booking that plainly succeeded.
    respondWith({ data: { bookingId: "bk_bare", status: "CONFIRMED" } });

    expect(await bookPrebookedStay(input())).toEqual({
      outcome: "ok",
      bookingId: "bk_bare",
      supplierBookingId: null,
      confirmationCode: null,
      status: "CONFIRMED",
    });
  });

  it("fails rather than throwing on an answer carrying no booking id", async () => {
    respondWith({ data: { status: "CONFIRMED" } });

    const result = await bookPrebookedStay(input());
    expect(result.outcome).toBe("failed");
    expect(result.outcome === "failed" && result.reason).toContain("bookingId");
  });

  it("fails rather than throwing on a body that is not an object", async () => {
    for (const body of ["[]", '"CONFIRMED"', "null", "17"]) {
      respondWith(body);
      const result = await bookPrebookedStay(input());
      expect(result.outcome).toBe("failed");
    }
  });

  it("fails rather than throwing on a body that is not JSON at all", async () => {
    // An upstream that answers an HTML error page is a normal Tuesday, and it
    // must not become an exception thrown out of a booking path.
    respondWith("<html>502 Bad Gateway</html>");

    const result = await bookPrebookedStay(input());
    expect(result.outcome).toBe("failed");
  });

  it("fails on a refused request without leaking the request body into the reason", async () => {
    respondWith({ error: { code: 4001 } }, 400);

    const result = await bookPrebookedStay(input());
    expect(result.outcome).toBe("failed");
    // Reasons go to server logs. A holder's email must not travel with them.
    expect(result.outcome === "failed" && result.reason).not.toContain("adaeze@example.com");
  });

  it("fails when the socket dies, because the shared HTTP path never throws", async () => {
    /* This is the outcome the module header warns about hardest: the supplier
       may still have confirmed and charged our card. The contract proved here is
       only that it resolves rather than rejects, since a rejection inside a
       webhook is what loses the record of a booking that may exist. */
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    const result = await bookPrebookedStay(input());
    expect(result.outcome).toBe("failed");
  });
});

describe("cancellation money", () => {
  it("converts a naira figure to exact integer kobo", () => {
    const amounts = readCancelAmounts({
      currency: "NGN",
      cancellationFee: 15_000,
      refundAmount: 412.76,
    });

    expect(amounts.known).toBe(true);
    if (!amounts.known) return;
    expect(amounts.feeMinor).toBe(1_500_000);
    /* 412.76 naira is 41,276 kobo. `412.76 * 100` is 41275.999999999993 in
       floating point, so an implementation that multiplied would be a kobo
       short of what somebody is owed, and nobody would ever be able to explain
       where it went. */
    expect(amounts.refundMinor).toBe(41_276);
    expect(Number.isSafeInteger(amounts.refundMinor!)).toBe(true);
  });

  it("reports a foreign refund as unknown rather than converting it", () => {
    // The fault this prevents is a $412.76 refund being paid out as N412.76, or
    // worse, the other way round. We hold no exchange rate, so there is no
    // honest naira figure to state.
    const amounts = readCancelAmounts({
      currency: "USD",
      cancellationFee: 40,
      refundAmount: 412.76,
    });

    expect(amounts).toEqual({ known: false, currency: "USD" });
    expect(amounts).not.toHaveProperty("refundMinor");
  });

  it("reports amounts as unknown when the response states no currency at all", () => {
    // An amount with no currency beside it is not a naira amount, it is an
    // amount we cannot read. Assuming naira is the same mistake with an extra
    // step.
    expect(readCancelAmounts({ refundAmount: 412.76 })).toEqual({ known: false, currency: null });
  });

  it("keeps a free cancellation distinguishable from a missing figure", () => {
    // Zero fee and a full refund is a real and common answer, so it must not
    // read the same as a supplier that stated nothing.
    const free = readCancelAmounts({ currency: "NGN", cancellationFee: 0, refundAmount: 185_000 });
    expect(free.known && free.feeMinor).toBe(0);
    expect(free.known && free.refundMinor).toBe(18_500_000);

    const silent = readCancelAmounts({ currency: "NGN", status: "CANCELLED" });
    expect(silent.known && silent.feeMinor).toBeNull();
    expect(silent.known && silent.refundMinor).toBeNull();
  });

  it("tolerates the snake_case spellings, because the casing is not confirmed", () => {
    /* LiteAPI's cancellation response is documented with snake_case money fields
       while the booking response beside it is camelCase, and neither has been
       verified against a live account here. Both spellings are read so that the
       wrong guess costs nothing. */
    const amounts = readCancelAmounts({
      currency: "NGN",
      cancellation_fee: 2_500.5,
      refund_amount: 182_499.5,
    });

    expect(amounts.known && amounts.feeMinor).toBe(250_050);
    expect(amounts.known && amounts.refundMinor).toBe(18_249_950);
  });

  it("refuses a figure it cannot parse exactly instead of rounding it", () => {
    // A negative refund, an amount in exponent form and one with more precision
    // than kobo can hold are all refused. A refund is a number we would owe, so
    // a guess is worse than an absence.
    const amounts = readCancelAmounts({
      currency: "NGN",
      cancellationFee: -10,
      refundAmount: 1e21,
    });

    expect(amounts.known && amounts.feeMinor).toBeNull();
    expect(amounts.known && amounts.refundMinor).toBeNull();
  });
});

describe("cancelling a booking", () => {
  it("addresses the booking by id, with PUT and the key on the header", async () => {
    const fetchMock = respondWith({ bookingId: "bk_7719", status: "CANCELLED", currency: "NGN" });
    await cancelStay("bk_7719");

    const [url, init] = fetchMock.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe("https://api.liteapi.travel/v3.0/bookings/bk_7719");
    expect(init.method).toBe("PUT");
    expect((init.headers as Record<string, string>)["X-API-Key"]).toBe(KEY);
  });

  it("encodes the id rather than pasting it into the path", async () => {
    // The id arrived from an upstream response and has since been through a
    // database and a caller. A path segment is not the place to discover that
    // it carried a slash.
    const fetchMock = respondWith({ bookingId: "x", status: "CANCELLED" });
    await cancelStay("bk/../evil");

    const [url] = fetchMock.mock.calls[0]! as unknown as [string];
    expect(url).toBe("https://api.liteapi.travel/v3.0/bookings/bk%2F..%2Fevil");
  });

  it("makes no call when there is no booking id", async () => {
    const fetchMock = respondWith({ bookingId: "x", status: "CANCELLED" });

    expect(await cancelStay("  ")).toEqual({ outcome: "unavailable" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports the status and the kobo figures together", async () => {
    respondWith({
      data: {
        bookingId: "bk_7719",
        status: "CANCELLED",
        currency: "NGN",
        cancellationFee: 12_500,
        refundAmount: 172_500,
      },
    });

    expect(await cancelStay("bk_7719")).toEqual({
      outcome: "ok",
      bookingId: "bk_7719",
      status: "CANCELLED",
      amounts: { known: true, currency: "NGN", feeMinor: 1_250_000, refundMinor: 17_250_000 },
    });
  });

  it("does not convert a foreign refund even on an otherwise perfect answer", async () => {
    respondWith({
      bookingId: "bk_7719",
      status: "CANCELLED",
      currency: "USD",
      refundAmount: 412.76,
    });

    expect(await cancelStay("bk_7719")).toEqual({
      outcome: "ok",
      bookingId: "bk_7719",
      status: "CANCELLED",
      amounts: { known: false, currency: "USD" },
    });
  });

  it("fails rather than throwing on a shape it cannot recognise", async () => {
    /* An error envelope, or an endpoint that moved, must not be read as a
       successful cancellation with two unknown figures. That reading would have
       us tell a guest their booking is gone while it is very much alive. */
    for (const body of [{ message: "not found" }, "[]", "null", '"CANCELLED"']) {
      respondWith(body);
      const result = await cancelStay("bk_7719");
      expect(result.outcome).toBe("failed");
    }
  });

  it("fails rather than throwing when the upstream refuses or dies", async () => {
    respondWith({ error: "nope" }, 500);
    expect((await cancelStay("bk_7719")).outcome).toBe("failed");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    expect((await cancelStay("bk_7719")).outcome).toBe("failed");
  });
});
