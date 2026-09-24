import { describe, expect, it } from "vitest";
import { parseBroadcast } from "./broadcast";

/**
 * The review's list (24 September), each after "2 bed flat Yaba rent 1.5m".
 * For every one: no run of the number's digits survives in the cleaned text
 * or the description, the rent is still read, and the removal is reported.
 */
const LEAD = "2 bed flat Yaba rent 1.5m ";
const CASES = [
  "call zero eight zero three one two three four five six seven",
  "call 0 8 0 3 1 2 3 4 5 6 7",
  "call O8O3 123 4567",
  "call 0803 x 123 x 4567",
  "call 0803-12-34-567",
  "call 0803 1234 567",
  "call 0803  123  4567",
  "call 0803/123/4567",
  "call 0803_123_4567",
  "call ０８０３１２３４５６７",
  "call 0803 one two three 4567",
  "call 080three1234567",
  "landline 01-2345678",
  "email ade at gmail dot com",
  "IG: vallo_homes",
  "ig vallohomes insta",
  "pay to GTB 0123456789",
  "acct 012 345 6789",
  "acct 01234 56789",
  "acct 0 1 2 3 4 5 6 7 8 9",
  "0803.123.4567",
  "+2348031234567",
  "2348031234567",
  "(0803) 123 4567",
  "0803 123 4567.",
  "wa.me/2348031234567",
  "whatsapp:08031234567",
  "0913 123 4567",
  "0703 123 4567",
  "0802 123 45 67",
  "call 08O3 123 4567",
];

/** Digits only, O read as zero: what a reader could still dial. */
function dialable(text: string): string {
  return text.normalize("NFKC").replace(/[Oo](?=\s*\d)|(?<=\d\s*)[Oo]/g, "0").replace(/\D/g, "");
}

describe("contacts are removed whatever shape they are written in", () => {
  for (const tail of CASES) {
    it(tail, () => {
      const parse = parseBroadcast(LEAD + tail);
      const left = `${parse.cleaned} ${String(parse.values.description ?? "")}`;
      /* The only digits allowed to remain are the rent's and the bedroom count. */
      expect(dialable(left).replace(/^2|15/g, "").length, left).toBeLessThan(4);
      expect(left).not.toMatch(/gmail|vallo_?homes/i);
      expect(parse.values.rentNaira, tail).toBe("1500000");
      expect(parse.notCarried.some((n) => ["phone", "account", "email", "handle", "link"].includes(n.kind)), tail).toBe(true);
      /* The word that introduced the number goes with it. */
      expect(left).not.toMatch(/\b(?:call|landline|acct|pay to)\b/i);
    });
  }

  it("leaves prices, counts and years alone", () => {
    const parse = parseBroadcast("3 bedroom flat in Yaba, rent 1500000 per annum, built 2019, 2 toilets");
    expect(parse.values.rentNaira).toBe("1500000");
    expect(parse.notCarried.filter((n) => n.kind === "phone" || n.kind === "account")).toEqual([]);
  });
});

describe("figures the reader will not guess at (review item 6)", () => {
  it("hands back a range or a choice as ambiguous, never one end of it", () => {
    for (const text of ["2 bed flat Yaba rent 1.5m-2m yearly", "2 bed flat Yaba rent 1.5m to 2m", "2 bed flat Yaba rent 1.5m or 1.8m"]) {
      const parse = parseBroadcast(text);
      expect(parse.values.rentNaira, text).toBeUndefined();
      expect(parse.notCarried.some((n) => n.kind === "ambiguous"), text).toBe(true);
    }
  });

  it("reports a figure with kobo it cannot carry, and a percentage written with the letter O", () => {
    const kobo = parseBroadcast("2 bed flat Yaba rent ₦1,500,000.50");
    expect(kobo.values.rentNaira).toBeUndefined();
    expect(kobo.notCarried).toContainEqual({ kind: "unreadable", text: "₦1,500,000.50" });
    const letterO = parseBroadcast("2 bed flat Yaba rent 1.5m agency 1O%");
    expect(letterO.values.agencyFeeNaira).toBeUndefined();
    expect(letterO.notCarried).toContainEqual({ kind: "unreadable", text: "1O%" });
  });
});

describe("the second review's survivors (rv_a2c)", () => {
  const LEAD2 = "3 bedroom flat in Yaba, rent 2.5m. Very nice and clean house with good water. ";
  for (const tail of [
    "Call 0803\u2014123\u20144567",
    "Follow instagram.com/vallohomes",
    "tel eight zero three, one two three, four five six seven",
    "call 0803 ...123... 4567",
    "call 0803 and then 1234567",
    "Whatsapp wa.me/2348031234567",
    "call +234 (0) 803 123 4567",
    "0803 _ 123 _ 4567",
    "call 080 three 123 4567",
    "t.me/vallohomes",
    "@vallohomes on insta",
    "ade [at] yahoo [dot] com",
    "call 0803, 123, 4567",
    "call 0803;123;4567",
    "call 0803|123|4567",
    "call 0803*123*4567",
    "call 0803~123~4567",
    "call 0803 or 123 4567",
    "call 0803 / 123 / 4567",
    "call 0803.....123.....4567",
    "call o8o3 i23 4567",
    "call 08O3l234567",
    "call 0803\u200b123\u200b4567",
    "call 0803\u2060123\u20604567",
    "call 0803 then after that 1234567",
    "call 0803 and 123 and 4567",
    "call 080 312 34567 and 070 111 22233",
    "call 0803 1 2 3 4 5 6 7",
  ]) {
    it(tail, () => {
      const parse = parseBroadcast(LEAD2 + tail);
      const left = `${parse.cleaned} ${String(parse.values.description ?? "")}`;
      expect(dialable(left).replace(/^3|25/g, "").length, left).toBeLessThan(4);
      expect(left).not.toMatch(/vallohomes|yahoo|\/[a-z]/i);
      expect(parse.values.rentNaira, tail).toBe("2500000");
    });
  }

  it("keeps a plain price where it was", () => {
    expect(parseBroadcast("3 bedroom flat in Yaba, rent 2500000 per year").values.rentNaira).toBe("2500000");
  });

  it("hands back 'between X and Y' and 'from X to Y' as ranges", () => {
    for (const text of [
      "3 bedroom flat in Yaba, rent between 2.5m and 3m.",
      "3 bedroom flat in Yaba, rent from 2.5m to 3m.",
      "3 bedroom flat in Yaba, rent 2.5 to 3m.",
      "3 bedroom flat in Yaba, rent 2.5-3m.",
      "3 bedroom flat in Yaba, rent between 2.5 and 3 million.",
      "3 bedroom flat in Yaba, rent 2.5m~3m.",
      "3 bedroom flat in Yaba, rent 2.5m \u2013 3m.",
      "3 bedroom flat in Yaba, rent 2.5m and 3m.",
    ]) {
      const parse = parseBroadcast(text);
      expect(parse.values.rentNaira, text).toBeUndefined();
      expect(parse.notCarried.some((n) => n.kind === "ambiguous"), text).toBe(true);
    }
  });
});
