/**
 * The words this product is not allowed to say, in one place.
 *
 * ---------------------------------------------------------------------------
 * THE BAN WAS ENFORCED FIVE TIMES AND THE SYNONYM WALKED PAST ALL FIVE.
 *
 * `docs/PRODUCT.md` section 7 bans `demo`, `sample`, `preview`, `not live`,
 * `coming soon` and `lorem` in UI copy, and records that the ban is "enforced
 * by five specs". It was: `example-notice`, `example-listings`, `faq`,
 * `email/shell` and `syndication` each carried their own hand-typed array of
 * the same words, each checking only its own copy.
 *
 * Five private lists is not one rule. It is five rules that agree today, and it
 * means the ban is only as wide as the narrowest surface anybody remembered to
 * guard. Thirteen screens said a feature "switches on shortly", six more said
 * it would arrive "the moment the platform keys land", two told a reader to
 * "check back soon", and not one of the five specs was looking anywhere near
 * them. See F2-003.
 *
 * So the vocabulary lives here, once, and the specs consult it. When the next
 * synonym is invented it is banned by editing one array, and the sweep in
 * `banned-phrases.test.ts` finds it everywhere at once.
 *
 * ---------------------------------------------------------------------------
 * WHY TWO LISTS AND NOT ONE.
 *
 * `SCHEDULE_PROMISES` is banned in every piece of live copy in the product,
 * because there is no surface on which promising an unnameable date is honest.
 *
 * `UNREAL_WORDS` is banned on the surfaces that describe example content,
 * which is what those five specs were actually written for. It cannot be swept
 * platform-wide: "preview" is a legitimate English word for a thing this
 * product genuinely does (a photo preview), and a sweep that cried wolf about
 * it would be switched off within a week, which is how a guard stops guarding.
 * Where it applies it applies absolutely, and where it does not, it says so.
 */

/**
 * A promise about when something will exist. Every one of these is "coming
 * soon" wearing a different coat, and the reason the ban exists is not the
 * phrase, it is that nobody here can keep the appointment.
 *
 * `label` is what a failing spec prints, because "banned phrase found" without
 * the phrase costs the reader the only useful part of the message.
 */
export const SCHEDULE_PROMISES: { label: string; pattern: RegExp }[] = [
  { label: "coming soon", pattern: /\bcoming soon\b/i },
  { label: "opening soon", pattern: /\bopening soon\b/i },
  { label: "check back soon", pattern: /\bche?ck back soon\b/i },
  { label: "come back soon", pattern: /\bcome back soon\b/i },
  { label: "nearly here", pattern: /\bnearly here\b/i },
  { label: "any day now", pattern: /\bany day now\b/i },
  /*
   * "Switches on shortly", "switch on soon", "switches on the moment X lands",
   * "switched on once Y arrives". The verb plus a schedule, in any tense. The
   * bare present tense is deliberately left alone: "Crypto top-ups are not
   * switched on yet" states today, which is allowed, and only becomes a
   * promise when a time is attached to it.
   */
  {
    label: "switches on <a time nobody can name>",
    pattern: /\bswitch(es|ed|ing)?\s+on\s+(shortly|soon|any\s+day|the\s+moment|once|when)\b/i,
  },
  /*
   * Our own deployment, told to a reader. "The moment the platform keys land",
   * "once the payment keys land". It is both a schedule and infrastructure
   * jargon, which is the pair F2-003 was filed about.
   */
  { label: "keys land", pattern: /\bkeys?\s+land\b/i },
  { label: "launches soon", pattern: /\blaunch(es|ing)?\s+soon\b/i },
  { label: "available soon", pattern: /\b(available|live|here|ready)\s+soon\b/i },
  { label: "goes live soon", pattern: /\bgoes?\s+live\s+soon\b/i },

  /* ----------------------------------------------------------------------
   * AND THE SAME PROMISE IN THE OTHER THREE LANGUAGES, BECAUSE IT CAME BACK
   * THERE FIRST.
   *
   * Five English strings in `packages/i18n/src/locales/en.ts` had already been
   * rewritten away from "the moment the platform keys land" before this sprint
   * began. Their Yoruba, Hausa and Igbo translations had not: they still
   * carried the promise, word for word, on screens nobody reading this file
   * can read. A ban enforced only in English is a ban on one quarter of the
   * product, and the quarter it is not enforced on is the one nobody checks.
   *
   * These are the exact renderings that shipped. Hausa alone had FOUR
   * spellings of "the platform keys" across ten strings - `makullan dandalin`,
   * `makullan dandamali`, `mabuɗan dandalin`, `maɓallan dandalin` - which is
   * the same fault as five hand-typed copies of one banned-word list, in a
   * different alphabet.
   *
   * WHAT THIS CANNOT DO, AND IT MATTERS: a translator who invents a FIFTH
   * rendering is not caught, because nobody who has written a line of this
   * guard speaks these languages. The patterns close the door that was open;
   * they are not a substitute for a native reader.
   */
  {
    label: "yo: the platform keys land",
    pattern: /kọ́kọ́rọ́\s+(pátákó|pátákò|pèpéle)|kò\s+dì\s+kọ́kọ́rọ́/i,
  },
  { label: "yo: opening soon", pattern: /ṣíṣílẹ̀\s+láìpẹ́/i },
  {
    label: "ha: the platform keys land",
    pattern: /(makullan|mabuɗan|maɓallan)\s+(dandalin|dandamali|dandali)|riƙe\s+makullansa/i,
  },
  { label: "ha: opening soon", pattern: /za a buɗe[^".]*ba da jimawa/i },
  {
    label: "ig: the platform keys land",
    pattern: /igodo\s+(nke\s+)?ikpo okwu|ejighị\s+igodo/i,
  },
  { label: "ig: opening soon", pattern: /na-emeghe\s+n'oge na-adịghị anya/i },
];

/**
 * The words that make invented content sound real, or sound like a placeholder
 * somebody forgot. "example" is the agreed word and is not on this list.
 *
 * The ban exists because this repository once shipped twenty-three invented
 * places, twenty-two of them carrying `verified: true` with fabricated ratings
 * on addresses that do not exist.
 */
export const UNREAL_WORDS: { label: string; pattern: RegExp }[] = [
  { label: "demo", pattern: /\bdemos?\b/i },
  { label: "sample", pattern: /\bsamples?\b/i },
  { label: "preview", pattern: /\bpreviews?\b/i },
  { label: "not live", pattern: /\bnot live\b/i },
  { label: "lorem", pattern: /\blorem\b/i },
];

/** Both lists, for the surfaces that are subject to the whole ban. */
export const BANNED_IN_EXAMPLE_COPY = [...UNREAL_WORDS, ...SCHEDULE_PROMISES];

/**
 * The first banned phrase in a piece of text, or null. Returns the label so a
 * caller can say which rule was broken rather than that one was.
 */
export function firstBannedPhrase(
  text: string,
  vocabulary: { label: string; pattern: RegExp }[] = SCHEDULE_PROMISES,
): string | null {
  for (const { label, pattern } of vocabulary) {
    if (pattern.test(text)) return label;
  }
  return null;
}

/* ------------------------------------------------------------- terminology */

/**
 * The synonyms `docs/PRODUCT.md` section 7 forbids, for the words this product
 * has already chosen.
 *
 * The table has existed since the product did and nothing enforced it, which is
 * how "My trips" ended up being a button label five times on a marketplace that
 * sells land. F2-002.
 *
 * ONLY "TRIP" IS HERE TODAY, AND THAT IS A SCOPE LINE, NOT A JUDGEMENT. The
 * table also bans Host, landlord, vendor, user, feed and half a dozen more,
 * and those are live in public copy owned by another queue. Adding a row here
 * turns that row on everywhere at once, so each one lands with the copy fix
 * that makes it pass. The mechanism is the point; the list grows.
 */
export const BANNED_SYNONYMS: { label: string; pattern: RegExp; instead: string }[] = [
  { label: "trip", pattern: /\btrips?\b/i, instead: "stay" },
];
