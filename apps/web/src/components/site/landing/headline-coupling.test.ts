import { describe, expect, it } from "vitest";
import { LOCALES, getDictionary } from "@vallo/i18n";
import { ORDER } from "./segments";
import { heroCopy } from "./hero-copy";

/**
 * THE LANDING HEADLINE, THE BRAND HIERARCHY, AND THE SEARCH CONTROL UNDER IT.
 *
 * WHAT CHANGED ON 6 OCTOBER 2026, AND WHY THIS TEST CHANGED WITH IT.
 *
 * Until then the headline was "Rent, buy or stay. Without the runaround.", and
 * this file asserted that every locale's headline named each of the search
 * control's three segments, because the headline taught the control and the
 * control proved the headline. Founder directive D1 (5 October) replaced that
 * line with the brand hierarchy: the hero's line is the SLOGAN, "Space,
 * without the runaround.", and its sub is the PRODUCT EXPLANATION. The slogan
 * deliberately does not name markets: "find your space" made Vallo sound like
 * a search company, and the platform now runs from discovering to managing.
 * So the clause "the headline names every segment" is SUPERSEDED, not
 * loosened, and it is the only clause that went.
 *
 * WHAT STILL HOLDS, AND IS ASSERTED BELOW:
 *
 *   - The control has exactly its three segments (the reason is in
 *     `segments.ts`: a fourth once named a product Vallo does not have).
 *   - The hero promises nothing the control cannot do. If the headline ever
 *     names a market action again, it may only name one the control offers,
 *     which is the honest half of the old coupling and the half worth a build.
 *   - "Runaround" stays in the line: it is the position itself (Vallo does
 *     not remove the agent, it removes the runaround), and a rewrite that
 *     drops it has changed what the platform claims to be.
 *   - The hierarchy itself: the line is the slogan, verbatim and in English in
 *     every locale like the wordmark; the sub is the explanation; and the
 *     positioning line is never on the hero, because D1 rules it is never the
 *     primary consumer line.
 *
 * IF THIS TEST GOES RED, DO NOT LOOSEN IT. Either the hero has drifted off the
 * brand hierarchy or it has started promising something the control under it
 * cannot do, and both are what it exists to catch.
 */

/** Case and punctuation carry no meaning for this comparison; the words do. */
function words(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[.,;:!?'"’“”()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * Market actions a headline could plausibly promise. Only the control's own
 * segments may appear in the line; the rest would be a promise the control
 * under it cannot keep. English only, because the line is English everywhere.
 */
const MARKET_ACTIONS = ["rent", "buy", "stay", "sell", "lease", "book", "invest", "let"] as const;

describe("the landing headline and the search control", () => {
  it("offers exactly the three segments the control was built with", () => {
    expect([...ORDER]).toEqual(["buy", "rent", "stay"]);
  });

  it("sets the slogan as the line and the explanation as the sub, in every locale", () => {
    const en = getDictionary("en");
    for (const locale of LOCALES) {
      const d = getDictionary(locale);
      const { lines, subtitle } = heroCopy(d);
      /* The slogan is English in every locale, like the wordmark. */
      expect(d.landing.slogan, `${locale}: the slogan is translated, and D1 keeps it in English`).toBe(
        en.landing.slogan,
      );
      expect(lines.join(" "), `${locale}: the hero's line is not the slogan`).toBe(d.landing.slogan);
      expect(subtitle, `${locale}: the hero's sub is not the product explanation`).toBe(d.landing.explanation);
    }
  });

  it("never puts the positioning line on the hero", () => {
    for (const locale of LOCALES) {
      const d = getDictionary(locale);
      const { lines, subtitle } = heroCopy(d);
      for (const text of [...lines, subtitle]) {
        expect(text, `${locale}: the positioning line is on the hero, and D1 rules it never the consumer line`).not.toBe(
          d.landing.positioning,
        );
      }
    }
  });

  it("promises no market action the control does not offer", () => {
    const control = new Set<string>(ORDER);
    const line = words(heroCopy(getDictionary("en")).lines.join(" ")).split(" ");
    for (const action of MARKET_ACTIONS) {
      if (!line.includes(action)) continue;
      expect(control.has(action), `the headline promises "${action}", which the search control does not offer`).toBe(
        true,
      );
    }
  });

  it("keeps the line on the position it states", () => {
    /* "Without the runaround" is the position itself, not decoration. */
    expect(words(heroCopy(getDictionary("en")).lines.join(" "))).toContain("runaround");
  });

  it("breaks the slogan after its first comma, and never loses a word doing it", () => {
    const en = getDictionary("en");
    expect(heroCopy(en).lines).toEqual(["Space,", "without the runaround."]);
    const oneLine = heroCopy({ ...en, landing: { ...en.landing, slogan: "Vallo" } });
    expect(oneLine.lines).toEqual(["Vallo"]);
  });
});
