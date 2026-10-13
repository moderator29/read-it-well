import { describe, expect, it } from "vitest";
import { mentionsPayingOutside, offPlatformAsk } from "./off-platform-ask";

/* Founder ruling 7 (13 October 2026): in a listing chat, either side
   mentioning an account number or a transfer gets the one line, "Pay only
   through Vallo. Payments made outside Vallo are not covered." */
describe("a mention of paying outside Vallo", () => {
  it("is an account number, in any spacing", () => {
    expect(mentionsPayingOutside("0123456789 GTB")).toBe(true);
    expect(mentionsPayingOutside("my acct is 012 345 6789")).toBe(true);
  });

  it("is a transfer, in any form, from either side", () => {
    expect(mentionsPayingOutside("Can I just do a transfer?")).toBe(true);
    expect(mentionsPayingOutside("I transferred it this morning")).toBe(true);
    expect(mentionsPayingOutside("Transfers are fine with me")).toBe(true);
  });

  it("is wider than the ask: a lister's own question counts too", () => {
    const body = "Do you want to transfer or pay on the app?";
    expect(offPlatformAsk(body)).toBeNull();
    expect(mentionsPayingOutside(body)).toBe(true);
  });

  it("is not a phone number, ordinary talk, or nothing", () => {
    expect(mentionsPayingOutside("Call me on 08031234567")).toBe(false);
    expect(mentionsPayingOutside("+234 803 123 4567 is my line")).toBe(false);
    expect(mentionsPayingOutside("Is it still available?")).toBe(false);
    expect(mentionsPayingOutside("")).toBe(false);
    expect(mentionsPayingOutside(null)).toBe(false);
  });
});
