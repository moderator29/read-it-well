/**
 * THE ONE PLACE IN THIS PRODUCT WHERE THE REGULATED WORD APPEARS.
 *
 * ---------------------------------------------------------------------------
 * WHY THE WORD IS BANNED EVERYWHERE ELSE.
 *
 * Under the Estate Surveyors and Valuers Act the offence is using any name,
 * title, addition or description IMPLYING authorisation to practise. The
 * offence is in the implication, not in the arithmetic. Vallo is not on the
 * register, so an estimate presented as the regulated act is the regulated
 * act, whatever the arithmetic behind it was.
 *
 * So the feature is called Price Check, because that is what it honestly does:
 * it checks what property near here is being ASKED for. It survives a refusal
 * without becoming a lie, which matters, because on the day it ships it
 * refuses every per-property call.
 *
 * ---------------------------------------------------------------------------
 * AND WHY IT IS NOT BANNED HERE.
 *
 * Erasing the word entirely makes the disclaimer harder to write and leaves
 * the reader to supply the comparison themselves, which is worse than saying
 * it. So it appears exactly here, inside the sentence that disclaims it, and
 * `apps/web/scripts/check-valuation-words.mjs` fails the build if it reaches
 * anywhere else: not a page title, not a heading, not a button, not a route
 * segment, not a meta description, not a push notification, not an app store
 * listing.
 *
 * FOUR RULES FOR THIS CONSTANT, and they are the reason it is a constant.
 *
 *   1. It appears ON the result surface, never behind a Disclosure. A thing a
 *      person needs in order to decide whether to act stays on the page.
 *   2. The first sentence is never truncated, never collapsed, never a tooltip.
 *   3. It travels with any figure that leaves the product: share cards, emails,
 *      push copy, an API if one ever exists.
 *   4. One wording, every surface. A disclaimer that is paraphrased per screen
 *      is four disclaimers, and three of them have not been read by anybody.
 *
 * ---------------------------------------------------------------------------
 * ONE THING HERE IS NOT SETTLED AND IT IS MARKED RATHER THAN HIDDEN.
 *
 * The section number of the offence is deliberately ABSENT from the copy. The
 * research that produced this feature could not reach the Act itself, because
 * the primary source is blocked from the build environment, and read a third
 * party reproduction instead. A disclaimer that cites a section number it has
 * not verified is a disclaimer with an invented citation in it, which is a
 * worse failure than one with no citation at all. The sentence below is true
 * without the number. `SECTION_NUMBER_PENDING` is the note for whoever puts it
 * in, and nothing in the product reads it.
 */

/**
 * The standing disclaimer. One wording, every surface, never paraphrased.
 *
 * Kept as four sentences rather than one string so a surface can render the
 * lead sentence at full strength and the rest at body weight, without any
 * caller being able to drop one.
 */
export const PRICE_CHECK_DISCLAIMER = {
  /** Never truncated, never collapsed, never behind a tap. */
  lead: "This is not a valuation.",
  body: [
    "It is a price check: a range built from what similar properties near here are currently being advertised for on Vallo.",
    "It is not a professional valuation and it is not evidence of what anything has sold for.",
    "Only an estate surveyor and valuer registered with ESVARBON may carry out a valuation in Nigeria.",
  ],
  /** The hand-off, which is the other honest use of the regulated noun. */
  handOff: "If you need one, we can point you to a registered firm.",
} as const;

/** The whole thing as one paragraph, for a share card or an email body. */
export function disclaimerSentence(): string {
  return [
    PRICE_CHECK_DISCLAIMER.lead,
    ...PRICE_CHECK_DISCLAIMER.body,
    PRICE_CHECK_DISCLAIMER.handOff,
  ].join(" ");
}

/**
 * The one line that travels on a share card, where the whole disclaimer does
 * not fit and where the reader has no screen to read it on.
 *
 * It says the two things a forwarded card has to say on its own: these are
 * asking prices, and nobody publishes sold prices in Nigeria. It deliberately
 * does NOT contain the regulated word, because a card is a fragment and a
 * fragment carrying the word without the sentence that disclaims it is the
 * implication the Act is about.
 */
export const SHARE_CARD_FOOTER = "Asking prices, not sold prices. vallo.ng";

/**
 * The sentence above the comparables, and the most valuable copy in the
 * feature: it is true, it explains the limitation, and it tells the reader
 * something about their own country that they will repeat.
 */
export const COMPARABLES_LEAD =
  "These are asking prices from live Vallo listings. They are not sold prices. Nobody publishes sold prices in Nigeria.";

/**
 * FOUNDER GATED, AND NOTHING WAITS ON IT.
 *
 * Nothing in the product reads this. It is here so the open item has a home in
 * the code that needs it rather than only in a document.
 */
export const SECTION_NUMBER_PENDING =
  "A lawyer must confirm the section of the Estate Surveyors and Valuers Act before any copy cites one. The research reached a third party reproduction of the Act, not the gazette. Until then the disclaimer cites no section, which is true, rather than a number nobody has read.";
