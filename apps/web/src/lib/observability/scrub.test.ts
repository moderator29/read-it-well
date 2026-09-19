import { describe, expect, it } from "vitest";

import { buildEvent } from "./report";
import { redact, safeString, scrubContext, scrubError } from "./scrub";

/**
 * The test that decides whether crash reporting may ship.
 *
 * Everything else about this feature is recoverable. Sending one NIN, one
 * bank account or one bearer token to a third party is not, so the proof is
 * written against the FINISHED PAYLOAD rather than against the scrubber in
 * isolation: the assertion is that a specific personal value does not appear
 * anywhere in the JSON that would go on the wire, whatever field it entered
 * through.
 *
 * The values below are invented and belong to nobody. They are shaped like
 * the real thing on purpose, because a scrubber tested with "1234" proves
 * nothing about an eleven digit NIN.
 */

/** Invented, not anybody's. Shaped correctly so the patterns are exercised. */
const SPECIMEN = {
  email: "segun.okafor@example.com",
  bankAccount: "0123456789",
  nin: "12345678901",
  authorization: "Bearer sk_live_51NxAbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
  card: "4111 1111 1111 1111",
  phone: "+2348012345678",
};

/** Every specimen value, in the forms they could survive as. */
const FORBIDDEN_SUBSTRINGS = [
  SPECIMEN.email,
  "segun.okafor",
  SPECIMEN.bankAccount,
  SPECIMEN.nin,
  "sk_live_51NxAbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
  SPECIMEN.card,
  "4111111111111111",
  SPECIMEN.phone,
  "8012345678",
];

function expectNothingPersonal(serialised: string) {
  for (const needle of FORBIDDEN_SUBSTRINGS) {
    expect(serialised).not.toContain(needle);
  }
}

describe("redact", () => {
  it("removes an email address", () => {
    expect(redact(`contact ${SPECIMEN.email} please`)).not.toContain(SPECIMEN.email);
    expect(redact(`contact ${SPECIMEN.email} please`)).toContain("[redacted:email]");
  });

  it("removes a ten digit bank account number", () => {
    expect(redact(`account ${SPECIMEN.bankAccount}`)).not.toContain(SPECIMEN.bankAccount);
  });

  it("removes an eleven digit NIN", () => {
    expect(redact(`nin ${SPECIMEN.nin}`)).not.toContain(SPECIMEN.nin);
  });

  it("removes a card number written with spaces", () => {
    const out = redact(`card ${SPECIMEN.card}`);
    expect(out).not.toContain(SPECIMEN.card);
    expect(out).not.toContain("4111111111111111");
  });

  it("removes an authorization header value but keeps the label", () => {
    const out = redact(`authorization: ${SPECIMEN.authorization}`);
    expect(out).not.toContain("sk_live_51NxAbCdEfGhIjKlMnOpQrStUvWxYz0123456789");
    expect(out.toLowerCase()).toContain("authorization");
  });

  it("removes a JSON web token", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    expect(redact(`session ${jwt}`)).not.toContain(jwt);
  });

  it("removes a Nigerian phone number in international form", () => {
    expect(redact(`called ${SPECIMEN.phone}`)).not.toContain(SPECIMEN.phone);
  });

  it("leaves an ordinary machine sentence alone", () => {
    const line = "TypeError: cannot read property id of undefined";
    expect(redact(line)).toBe(line);
  });
});

describe("scrubContext", () => {
  it("drops every key outside the allowlist, whatever it holds", () => {
    const out = scrubContext({
      routePath: "/listing/[id]",
      method: "POST",
      statusCode: 500,
      // None of these are allowlisted, so none of them may appear.
      email: SPECIMEN.email,
      body: { nin: SPECIMEN.nin, account_number: SPECIMEN.bankAccount },
      headers: { authorization: SPECIMEN.authorization },
      userId: "8f2c0b1e-5d3a-4c7b-9e11-2a4d6f8b0c33",
      walletBalanceKobo: 125_000_00,
      path: "/u/segun-okafor?invite=abc",
    });

    expect(out.routePath).toBe("/listing/[id]");
    expect(out.method).toBe("POST");
    expect(out.statusCode).toBe(500);
    expect(Object.keys(out).sort()).toEqual(["method", "routePath", "statusCode"]);
    expectNothingPersonal(JSON.stringify(out));
  });

  it("redacts a personal value that arrives through an ALLOWED key", () => {
    // The allowlist alone cannot save us here: `routePath` is legitimate and
    // this is exactly how a live path leaks in.
    const out = scrubContext({ routePath: `/u/${SPECIMEN.email}` });
    expectNothingPersonal(JSON.stringify(out));
  });

  it("returns an empty bag for null, undefined and an empty object", () => {
    expect(scrubContext(null)).toEqual({});
    expect(scrubContext(undefined)).toEqual({});
    expect(scrubContext({})).toEqual({});
  });
});

describe("scrubError", () => {
  it("redacts the message and the stack", () => {
    const error = new Error(`could not pay out to ${SPECIMEN.bankAccount} for ${SPECIMEN.email}`);
    error.stack = `Error: nin ${SPECIMEN.nin}\n    at payout (/app/lib/wallet.ts:12:3)`;
    const out = scrubError(error);
    expect(out.type).toBe("Error");
    expectNothingPersonal(JSON.stringify(out));
    // The useful part still survives.
    expect(out.stack).toContain("payout");
  });

  it("handles a rejection that is a whole object rather than an Error", () => {
    const out = scrubError({
      status: 400,
      authorization: SPECIMEN.authorization,
      customer: { email: SPECIMEN.email, nin: SPECIMEN.nin },
      card: SPECIMEN.card,
    });
    expectNothingPersonal(JSON.stringify(out));
  });

  it("handles a thrown string", () => {
    expect(scrubError("plain failure").value).toBe("plain failure");
  });
});

describe("buildEvent, the whole pipeline", () => {
  it("lets nothing personal through, from any entry point at once", () => {
    const error = new Error(
      `payout failed: account ${SPECIMEN.bankAccount}, nin ${SPECIMEN.nin}, card ${SPECIMEN.card}, contact ${SPECIMEN.email}, ${SPECIMEN.phone}`,
    );
    error.stack = `Error: authorization: ${SPECIMEN.authorization}\n    at send (/app/lib/payments/paystack.ts:88:11)`;

    const event = buildEvent({
      error,
      context: {
        routePath: "/api/paystack/webhook",
        method: "POST",
        statusCode: 500,
        digest: "2748301923",
        // Everything below is outside the allowlist and must vanish.
        ...({
          headers: { authorization: SPECIMEN.authorization, cookie: "sb-access-token=abc" },
          body: { account_number: SPECIMEN.bankAccount, nin: SPECIMEN.nin, card: SPECIMEN.card },
          email: SPECIMEN.email,
          user: { id: "u_1", email: SPECIMEN.email },
        } as Record<string, unknown>),
      },
    });

    const serialised = JSON.stringify(event);
    expectNothingPersonal(serialised);

    // And the report is still worth having.
    expect(serialised).toContain("paystack.ts");
    expect((event.tags as Record<string, unknown>).routePath).toBe("/api/paystack/webhook");
    expect(event.level).toBe("error");
  });

  it("never carries a key the allowlist did not name", () => {
    const event = buildEvent({
      error: new Error("boom"),
      context: { routePath: "/x", ...({ secretSauce: "value", ip: "197.210.0.1" } as Record<string, unknown>) },
    });
    expect(Object.keys(event.tags as Record<string, unknown>)).toEqual(["routePath"]);
    expect(JSON.stringify(event)).not.toContain("197.210.0.1");
    expect(JSON.stringify(event)).not.toContain("secretSauce");
  });

  it("never carries the DSN", () => {
    const event = buildEvent({ error: new Error("boom") });
    expect(JSON.stringify(event)).not.toContain("sentry_key");
    expect(JSON.stringify(event)).not.toContain("@o0.ingest");
  });
});

describe("safeString", () => {
  it("bounds a very long value", () => {
    expect(safeString("a".repeat(5_000)).length).toBeLessThanOrEqual(403);
  });
});
