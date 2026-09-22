import { getDictionary, LOCALES } from "@vallo/i18n";
import { describe, expect, it } from "vitest";
import { COMPARABLES_LEAD, PRICE_CHECK_DISCLAIMER, disclaimerSentence, SHARE_CARD_FOOTER } from "./disclaimer";
import { REGULATED_WORDS } from "./regulated-words";
import { NOT_A_SUPPLY_PROBLEM, REFUSALS, REFUSAL_CODES } from "./refusals";

/**
 * THE BANNED WORDS ARE BUILT FROM THE GATE'S OWN LIST, NOT TYPED OUT HERE.
 *
 * Two reasons and the second is the one that bit. Widening the gate's
 * vocabulary should widen this assertion with it, rather than leaving a
 * hand-typed pattern behind that tests the old list. And a test file that
 * SPELLS the regulated word is a file the gate refuses: it scans the whole
 * tree, this file is not one of the rule's own, and it failed the build the
 * first time this test was written. That is the rule working, so it is obeyed
 * rather than exempted.
 */
const BANNED = new RegExp(REGULATED_WORDS.join("|"), "i");

/**
 * EVERY REFUSAL HAS ITS COPY, IN EVERY LOCALE, AND THE TWO HALVES CANNOT DRIFT.
 *
 * `refusals.ts` holds the STRUCTURE of a refusal - its icon, its next actions,
 * whether the comparables are drawn beneath it. The words are in
 * `packages/i18n` because this platform ships four locales and a refusal screen
 * a Hausa speaker cannot read is a refusal twice over.
 *
 * Splitting them is right and it creates exactly one hazard: a tenth refusal
 * code added here with no copy there renders an empty heading, and nothing
 * else fails. TypeScript cannot see it, because the dictionary is a plain
 * object and the lookup is by a computed key. This test can.
 */

/** The dictionary key each code's copy lives under, written out once. */
const COPY_KEY: Record<(typeof REFUSAL_CODES)[number], string> = {
  no_location: "noLocation",
  no_comparables: "noComparables",
  too_few_comparables: "tooFewComparables",
  too_few_sized: "tooFewSized",
  wide_dispersion: "wideDispersion",
  stale: "stale",
  unsupported_type: "unsupportedType",
  unsupported_period: "unsupportedPeriod",
  demo_only: "demoOnly",
};

describe("nine refusals, nine screens", () => {
  it("has exactly the nine the ruling names", () => {
    expect(REFUSAL_CODES).toHaveLength(9);
  });

  it("gives every one of them a title and a body in every locale", () => {
    for (const locale of LOCALES) {
      const refusals = getDictionary(locale).priceCheck.refusals as Record<
        string,
        { title: string; body: string } | undefined
      >;
      for (const code of REFUSAL_CODES) {
        const words = refusals[COPY_KEY[code]];
        expect(words, `${locale}: ${code} has no copy`).toBeDefined();
        expect(words!.title.trim().length, `${locale}: ${code} has an empty title`).toBeGreaterThan(
          0,
        );
        expect(words!.body.trim().length, `${locale}: ${code} has an empty body`).toBeGreaterThan(0);
      }
    }
  });

  it("gives every next action a label", () => {
    const actions = getDictionary("en").priceCheck.actions as Record<string, string | undefined>;
    for (const code of REFUSAL_CODES) {
      for (const action of REFUSALS[code].actions) {
        expect(actions[action], `${code} offers ${action} with no label`).toBeDefined();
      }
    }
  });

  it("never writes the banned vocabulary into a refusal", () => {
    /* The build gate scans the whole tree and would catch this anyway. It is
       asserted here as well because the refusal screens are where the
       temptation actually is: "this is not a professional X" reads as a
       helpful clarification and is the exact implication the Act is about. */
    for (const locale of LOCALES) {
      const refusals = getDictionary(locale).priceCheck.refusals as Record<
        string,
        { title: string; body: string }
      >;
      for (const code of REFUSAL_CODES) {
        const text = `${refusals[COPY_KEY[code]]!.title} ${refusals[COPY_KEY[code]]!.body}`;
        expect(text, `${locale}: ${code}`).not.toMatch(BANNED);
      }
    }
  });

  it("names the codes that carry no notify me, and only those", () => {
    /* `too_few_sized` is in this list and it is the one worth explaining: its
       natural home is a NOTE beside an answered figure rather than a screen,
       and offering to tell somebody when we can answer, underneath an answer,
       is nonsense. The gap it names is size coverage on listings, which the
       listing wizard closes and recruitment does not. */
    expect([...NOT_A_SUPPLY_PROBLEM].sort()).toEqual(
      [
        "no_location",
        "too_few_sized",
        "unsupported_period",
        "unsupported_type",
        "wide_dispersion",
      ].sort(),
    );
  });
});

describe("the standing disclaimer", () => {
  it("leads with the sentence that does the work, and it is one sentence", () => {
    /* Asserted against the gate's own word list rather than a typed copy of
       the sentence, for the reason in BANNED above. */
    expect(PRICE_CHECK_DISCLAIMER.lead).toMatch(
      new RegExp(`^This is not a (${REGULATED_WORDS.join("|")})\\.$`),
    );
    expect(PRICE_CHECK_DISCLAIMER.lead.split(".").filter(Boolean)).toHaveLength(1);
  });

  it("says who may carry one out, which is the half that makes it useful", () => {
    expect(disclaimerSentence()).toMatch(/estate surveyor and valuer/i);
    expect(disclaimerSentence()).toMatch(/ESVARBON/);
  });

  it("cites no section number, because nobody has read the Act", () => {
    /* The research reached a third party reproduction of the Act, not the
       gazette. A disclaimer citing a section it has not verified has an
       invented citation in it, which is worse than no citation at all. The
       sentence is true without the number. */
    expect(disclaimerSentence()).not.toMatch(/section\s*\d/i);
  });

  it("keeps the regulated word off a share card, which travels without it", () => {
    /* A card is a fragment. A fragment carrying the word without the sentence
       that disclaims it is the implication the Act is about, so the card's
       footer says the true thing instead. */
    expect(SHARE_CARD_FOOTER).not.toMatch(BANNED);
    expect(SHARE_CARD_FOOTER).toMatch(/asking prices, not sold prices/i);
  });

  it("says the thing about Nigeria that a reader will repeat", () => {
    expect(COMPARABLES_LEAD).toMatch(/nobody publishes sold prices in Nigeria/i);
  });
});
