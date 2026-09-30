import { formatMoney, type Locale } from "@vallo/i18n/core";

/**
 * B15: MONEY AS A SCREEN READER SHOULD SAY IT. Pure, client-safe.
 *
 * A compact figure is printed "₦2.8m", and VoiceOver reads that "naira two
 * point eight m" (some engines say "metres"); "/yr" is read "slash y r". On a
 * platform about the largest sums people spend, the spoken form matters. So
 * beside every compact figure the page carries a visually hidden spoken one,
 * "2.8 million naira a year", and hides the printed one from assistive tech
 * (`<Money>` does both).
 *
 * The figure is truncated to one decimal exactly as `formatMoney`'s compact
 * form is (it may hide the tail of a figure, never state a bigger one), so
 * the eye and the ear read the same number.
 *
 * English words only. In Yoruba, Hausa and Igbo the spoken form is the full
 * figure through `formatMoney` ("₦2,800,000"), which every engine reads as a
 * number in that language, rather than English words in a Yoruba sentence.
 */

export type SpokenPeriod = "year" | "month" | "quarter" | "night" | "week" | "day" | "person";

const PERIOD_EN: Record<SpokenPeriod, string> = {
  year: "a year",
  month: "a month",
  quarter: "a quarter",
  night: "a night",
  week: "a week",
  day: "a day",
  person: "a person",
};

const SCALES: [number, string][] = [
  [1_000_000_000_000, "trillion"],
  [1_000_000_000, "billion"],
  [1_000_000, "million"],
  [1_000, "thousand"],
];

function oneDecimalTrunc(value: number): string {
  const t = Math.trunc(value * 10) / 10;
  return Number.isInteger(t) ? String(t) : t.toFixed(1);
}

function currencyWord(currency: string, amount: number): string {
  if (currency === "NGN") return "naira";
  if (currency === "USD") return amount === 1 ? "US dollar" : "US dollars";
  if (currency === "GBP") return amount === 1 ? "pound" : "pounds";
  return currency;
}

/** "2.8 million naira a year". Integer kobo in, words out. */
export function spokenMoney(
  minorUnits: number,
  locale: Locale = "en",
  currency = "NGN",
  period?: SpokenPeriod | null,
): string {
  if (!Number.isFinite(minorUnits)) return "";
  if (locale !== "en") return formatMoney(minorUnits, locale, currency);
  const major = Math.abs(minorUnits) / 100;
  const sign = minorUnits < 0 ? "minus " : "";
  let words: string;
  const scale = SCALES.find(([size]) => major >= size);
  if (scale) {
    words = `${oneDecimalTrunc(major / scale[0])} ${scale[1]} ${currencyWord(currency, 2)}`;
  } else {
    const whole = Math.trunc(major);
    const kobo = Math.round((major - whole) * 100);
    words = `${whole.toLocaleString("en-NG")} ${currencyWord(currency, whole)}`;
    if (kobo > 0 && currency === "NGN") words += ` ${kobo} kobo`;
  }
  return `${sign}${words}${period ? ` ${PERIOD_EN[period]}` : ""}`;
}

/** Maps the listings' period words onto the spoken ones, or null. */
export function spokenPeriodOf(period: string | null | undefined): SpokenPeriod | null {
  switch (period) {
    case "year":
    case "month":
    case "quarter":
    case "night":
    case "week":
    case "day":
    case "person":
      return period;
    default:
      return null;
  }
}

const SHORT_SUFFIX_EN: Record<string, string> = {
  "/mo": "a month",
  "/month": "a month",
  "/qtr": "a quarter",
  "/yr": "a year",
  "/year": "a year",
  "/night": "a night",
  "/head": "a head",
  "/person": "a person",
  "/day": "a day",
  "/week": "a week",
};

/**
 * A printed suffix as the ear should hear it: "/yr" is "a year", never
 * "slash y r". Words that are already words ("per year", "total") pass
 * through. An unknown slash form drops its slash rather than be spelled out.
 */
export function spokenSuffix(suffix: string | null | undefined): string {
  if (!suffix) return "";
  const trimmed = suffix.trim();
  const known = SHORT_SUFFIX_EN[trimmed.toLowerCase()];
  if (known) return known;
  return trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
}
