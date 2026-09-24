import { nairaToKobo } from "./search-params";
import { SHAPE_PHRASES, type UnitShape } from "./unit-shape";

/**
 * THE SEARCH BOX READS WHATSAPP SHORTHAND (V-66).
 *
 * "2br under 2m yaba" matched nothing useful: it was one string, searched as a
 * substring of titles. This turns the way people type into the filters they
 * meant, which the search page then shows as removable chips:
 *
 *   rooms     "2br", "3bdr", "2 bed", "4 bedroom", "two bedroom"
 *   shapes    "selfcon", "self con", "self contain", "mini flat",
 *             "room and parlour", "duplex", "bungalow", "terrace", ...
 *   BQ        "bq" beside another shape, "with bq": a BQ comes with it;
 *             "bq" or "boys quarters" alone: the shape is a boys' quarters
 *   money     "1.5m", "N2m", "2.5 million", "800k"; "under", "below", "max"
 *             or nothing before it is a ceiling, "above", "over", "from" or
 *             "min" a floor
 *   owner     "no agency fee", "no agent", "owner direct": Owner direct
 *   market    "for rent", "to let", "for sale"
 *   areas     "Yaba/Akoka": two areas, either will do
 *
 * A DETERMINISTIC TOKENISER OVER A CLOSED VOCABULARY, NO MODEL. It never
 * guesses a number it did not see: a bare "2000000" with no naira sign and no
 * unit stays as text, because it could be a street number. Whatever is not
 * recognised stays as text, minus the joining words ("in", "at", "around")
 * that only made sense beside what was taken out.
 *
 * Idempotent by construction: what is left over contains nothing this reads,
 * so the search page can redirect once without ever looping.
 */

export type ParsedWords = {
  shapes: UnitShape[];
  bedrooms?: number;
  minMinor?: number;
  maxMinor?: number;
  ownerDirect: boolean;
  withBq: boolean;
  /** "serviced": Serviced only, the derived word (V-68). */
  serviced: boolean;
  intent?: "rent" | "sale";
  areas: string[];
  /** What was not recognised, tidied. Empty when everything was read. */
  rest: string;
  /** True when anything at all was read out of the text. */
  recognised: boolean;
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
};

/*
 * A number is whole or has a DOT decimal, and never starts or ends inside a
 * longer run of digits and commas: "1,5m" is refused (a comma decimal would
 * otherwise read as ₦5m) and stays as text.
 */
const NUM = String.raw`(?<![\d.,])(\d+(?:\.\d+)?)(?![\d,])`;
const UNIT = String.raw`(m|mil|million|k|thousand)`;
const SIGN = String.raw`(?:₦|\bngn\s*|\bn(?=\d))?`;
/* "2m-3m", "2 to 3m", "between 1.5m and 2m": a floor and a ceiling. */
const RANGE = new RegExp(
  String.raw`(?:\bbetween\s+)?${SIGN}${NUM}\s*${UNIT}?\s*(?:-|–|\bto\b|\band\b)\s*${SIGN}${NUM}\s*${UNIT}\b`,
  "g",
);
const MONEY = new RegExp(
  String.raw`(?:\b(under|below|max(?:imum)?|less\s+than|up\s*to|within|above|over|from|min(?:imum)?|at\s+least)\s+)?${SIGN}${NUM}\s*${UNIT}\b`,
  "g",
);
/* A naira sign and a bare figure, commas allowed as thousands: "N1,500,000". */
const MONEY_PLAIN =
  /(?:\b(under|below|max|above|over|from|min)\s+)?(?:₦|\bngn\s*|\bn(?=\d))(\d{1,3}(?:,\d{3})+|\d{4,10})(?![\d,])/g;
/* How often rent is quoted: read and dropped, never a filter. */
const PERIOD_WORDS =
  /(?:\bper\s+(?:month|annum|anum|year|yr)\b|\bp\.\s?a\.?|\bpa\b|\bmonthly\b|\byearly\b|\bannually\b|\ba\s+year\b|\/\s*(?:yr|year|annum|month|mo)\b|\bnaira\b)/g;
const SERVICED = /\bserviced\b/g;
const FLOOR_WORDS = /^(above|over|from|min(?:imum)?|at\s+least)$/;

const ROOMS = /\b(\d{1,2}|one|two|three|four|five|six|seven)\s*\+?\s*-?\s*(?:br|bdr|bdrm|bdrms|bed|beds|bedroom|bedrooms|bedroomed)\b/g;
const OWNER = /\b(?:no\s+agen(?:cy|t)(?:\s+fee)?s?|owner\s+direct|direct\s+(?:from\s+)?(?:owner|landlord)|landlord\s+direct)\b/g;
const MARKET_RENT = /\b(?:for\s+rent|to\s+let)\b/g;
const MARKET_SALE = /\bfor\s+sale\b/g;
const WITH_BQ = /\b(?:with\s+(?:a\s+)?)?bq\b/g;
const JOINERS = /^(?:in|at|around|near|within|for|with|and|a|an|the)$/;

function amountToNaira(value: string, unit: string): number {
  const n = Number(value);
  if (unit === "k" || unit === "thousand") return Math.round(n * 1_000);
  return Math.round(n * 1_000_000);
}

export function parseWords(input: string): ParsedWords {
  let text = ` ${input.toLowerCase().replace(/\s+/g, " ").trim()} `;
  const out: ParsedWords = {
    shapes: [],
    ownerDirect: false,
    withBq: false,
    serviced: false,
    areas: [],
    rest: "",
    recognised: false,
  };
  const take = (re: RegExp, on: (m: RegExpExecArray) => void) => {
    text = text.replace(re, (...args) => {
      const groups = args.slice(0, -2) as string[];
      const match = Object.assign([...groups], { index: 0, input: "" }) as unknown as RegExpExecArray;
      on(match);
      out.recognised = true;
      return " ";
    });
  };

  take(OWNER, () => {
    out.ownerDirect = true;
  });
  take(MARKET_RENT, () => {
    out.intent = "rent";
  });
  take(MARKET_SALE, () => {
    out.intent = "sale";
  });

  /* Read and dropped without counting as understanding: "yearly" alone is
     not worth a redirect. */
  text = text.replace(PERIOD_WORDS, " ");

  take(RANGE, (m) => {
    const low = amountToNaira(m[1]!, m[2] ?? m[4]!);
    const high = amountToNaira(m[3]!, m[4]!);
    out.minMinor = nairaToKobo(Math.min(low, high));
    out.maxMinor = nairaToKobo(Math.max(low, high));
  });

  const money = (m: RegExpExecArray, naira: number) => {
    const floor = m[1] !== undefined && FLOOR_WORDS.test(m[1].replace(/\s+/g, " "));
    if (floor) out.minMinor = nairaToKobo(naira);
    else out.maxMinor = nairaToKobo(naira);
  };
  take(MONEY, (m) => money(m, amountToNaira(m[2]!, m[3]!)));
  take(MONEY_PLAIN, (m) => money(m, Number(m[2]!.replace(/,/g, ""))));
  take(SERVICED, () => {
    out.serviced = true;
  });

  take(ROOMS, (m) => {
    const raw = m[1]!;
    const n = NUMBER_WORDS[raw] ?? Number(raw);
    if (n >= 1 && n <= 20) out.bedrooms = n;
  });

  for (const [re, shape] of SHAPE_PHRASES) {
    take(re, () => {
      if (!out.shapes.includes(shape)) out.shapes.push(shape);
    });
  }
  take(WITH_BQ, () => {
    out.withBq = true;
  });
  /* "bq" alone is the shape; beside a home it is what comes with it. */
  if (out.withBq && out.shapes.length === 0 && out.bedrooms === undefined) {
    out.withBq = false;
    out.shapes.push("boys_quarters");
  }

  /* Two areas either side of a slash: "Yaba/Akoka". */
  take(/\b([a-z][a-z'-]+)\s*\/\s*([a-z][a-z'-]+)\b/g, (m) => {
    for (const area of [m[1]!, m[2]!]) {
      if (!JOINERS.test(area) && !out.areas.includes(area)) out.areas.push(area);
    }
  });

  /* Punctuation left standing alone ("+", "/", "-", ",") is not a word. */
  const words = text
    .split(" ")
    .map((w) => w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter((w) => /[a-z0-9]/.test(w));
  const kept = out.recognised ? words.filter((w) => !JOINERS.test(w)) : words;
  out.rest = kept.join(" ");
  return out;
}
