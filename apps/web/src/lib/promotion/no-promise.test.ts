import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { stringLiterals } from "@/lib/copy/source-scan";
import * as moneyCopy from "@/lib/money/copy";

/**
 * GUARDRAIL 3, IN EVERY FORM: PROMOTION NEVER SAYS "THIS WILL GET YOU X LEADS"
 * (`VALLO_PROMOTION.md`, "The measurement surface": not as a projection, not
 * as an average, not as "listings like yours typically").
 *
 * `promotion-run.test.ts` holds the first run's own panels to a phrase list.
 * This holds EVERY promotion word to a wider detector: the dictionary's
 * promotion namespaces, Session 2's PROMOTION_* money sentences, and every
 * string literal in the promotion code, screens and preview. The detector is
 * shown to catch the shapes it exists for, so it cannot pass by going blind.
 */
const PROMISE = [
  /\bwill (?:get|bring|earn|give|win|deliver|send|drive)\b/i,
  /\b(?:get|gets|getting|bring|brings|expect|earns?|delivers?|drives?)\b[^.]{0,40}\b(?:leads?|enquir\w*|inquir\w*|views?|viewers|bookings?|tenants|buyers|clicks)\b/i,
  /\b(?:typically|on average|average[sd]?|listings like yours|similar listings|guarantee\w*|forecast\w*)\b/i,
  /\b(?:estimated|projected|expected)\s+(?:\w+\s+)?(?:reach|leads?|views?|viewers|enquir\w*|inquir\w*|bookings?|results?)\b/i,
  /\b(?:projected|estimated)\s*:/i,
  /\d[\d,.]*\s*(?:x\s+)?(?:more\s+)?(?:leads?|enquir\w*|inquir\w*|views|viewers|bookings|clicks)\b/i,
  /\b\d+(?:\.\d+)?\s*(?:x|times)\s+(?:the|more|as)\b/i,
  /\bup to \d/i,
  /\b(?:increase|double|triple|multipl\w*|grow)\w*\s+(?:your\s+)?(?:leads|enquir\w*|inquir\w*|views|bookings|chances|reach)\b/i,
];

const promises = (text: string) => PROMISE.some((pattern) => pattern.test(text));

function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (value && typeof value === "object") for (const v of Object.values(value)) strings(v, out);
  return out;
}

const WEB = join(__dirname, "..", "..");
const SOURCES = [
  ...readdirSync(join(WEB, "lib", "promotion")).filter((f) => /\.tsx?$/.test(f) && !f.includes(".test.")).map((f) => join(WEB, "lib", "promotion", f)),
  ...readdirSync(join(WEB, "components", "promotion")).filter((f) => /\.tsx?$/.test(f) && !f.includes(".test.")).map((f) => join(WEB, "components", "promotion", f)),
  join(WEB, "app", "agent", "listings", "[listingId]", "promotion", "page.tsx"),
  join(WEB, "app", "(dev)", "preview", "promotion", "page.tsx"),
];

describe("guardrail 3: no promotion word promises an outcome", () => {
  it("the detector catches every shape of the promise", () => {
    for (const bad of [
      "This will get you 40 leads.",
      "Featured will bring you more enquiries.",
      "Listings like yours typically get 3x the views.",
      "Expect up to 200 views a week.",
      "Promoted listings average 12 inquiries.",
      "Guaranteed leads, or your money back.",
      "Boost gets most listings more bookings.",
      "Increase your enquiries this week.",
      "Projected reach: 4,000.",
      "2,700 more views from the rail.",
    ]) {
      expect(promises(bad), bad).toBe(true);
    }
  });

  it("the dictionary's promotion words never promise", () => {
    const t = getDictionary("en");
    const words = [...strings(t.experienceFeatures.promotion), ...strings(t.experienceFeatures.firstRun.promotion)];
    expect(words.length).toBeGreaterThan(30);
    expect(words.filter(promises)).toEqual([]);
  });

  it("the promotion money sentences never promise", () => {
    const sentences = Object.entries(moneyCopy)
      .filter(([name, value]) => name.startsWith("PROMOTION_") && typeof value === "string")
      .map(([, value]) => value as string);
    sentences.push(moneyCopy.promotionTierPriceText("₦2,500", "7", "₦357"));
    expect(sentences.length).toBeGreaterThan(5);
    expect(sentences.filter(promises)).toEqual([]);
  });

  it("no string in the promotion code, screens or preview promises", () => {
    const offenders: string[] = [];
    for (const file of SOURCES) {
      for (const literal of stringLiterals(readFileSync(file, "utf8"))) {
        if (promises(literal.text)) offenders.push(`${file.slice(WEB.length)}:${literal.line} ${literal.text.slice(0, 80)}`);
      }
    }
    expect(SOURCES.length).toBeGreaterThan(8);
    expect(offenders).toEqual([]);
  });
});
