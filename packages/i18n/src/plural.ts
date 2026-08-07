/**
 * The shape a counted phrase takes in a dictionary.
 *
 * This file holds the type and nothing else, and imports nothing at all, so
 * that `locales/en.ts` can describe its own keys with it without either file
 * having to reach back into `index.ts` for `Locale`. The selection function
 * itself lives in `index.ts` beside `formatMoney`, because it resolves through
 * the same `intlTag` map and a second copy of that map is exactly how the naira
 * sign once ended up hard-coded in five places disagreeing with each other.
 *
 * `other` is required and every other category is optional, because the set of
 * categories a language actually uses is decided by CLDR and not by us. English
 * and Hausa use `one` and `other`. Yoruba and Igbo use `other` alone: neither
 * inflects a noun for a numeral, so one form serves every count and a required
 * `one` key would force three locale files to write the same string twice.
 *
 * The count itself is substituted for `{count}`, formatted through `Intl` for
 * the same locale, so a locale that groups or digits differently gets the right
 * digits rather than whatever `String(n)` produces.
 */
export type PluralForms = { other: string } & Partial<Record<Intl.LDMLPluralRule, string>>;

/**
 * The four counted nouns the booking surfaces need, plus the template that
 * joins a party's two halves.
 *
 * `party` is a plain string rather than a `PluralForms`, because both of its
 * placeholders arrive already pluralised. It exists so a translator owns the
 * separator and the word order: "2 adults, 1 child" is not the only way to
 * write that, and a component gluing two strings together with a comma would
 * have decided it for every language at once.
 */
export type CountForms = {
  nights: PluralForms;
  guests: PluralForms;
  adults: PluralForms;
  children: PluralForms;
  party: string;
};
