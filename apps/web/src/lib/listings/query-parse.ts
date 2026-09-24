import { nairaToKobo } from "./search-params";
import type { UnitShape } from "./unit-shape";

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

/* Longest phrases first, so "semi detached" is not read as "detached". */
const SHAPE_PHRASES: [RegExp, UnitShape][] = [
  [/(?:^|\s)s\/c(?=\s|$)/g, "self_contain"],
  [/\bself[\s-]*con(?:tain(?:ed)?)?\b/g, "self_contain"],
  [/\broom\s*(?:and|&|n)\s*parlou?r\b/g, "room_parlour"],
  [/\bmini[\s-]*flat\b/g, "mini_flat"],
  [/\bsemi[\s-]*detached\b/g, "semi_detached"],
  [/\bdetached(?:\s+house)?\b/g, "detached"],
  [/\bterraced?(?:\s+house)?\b/g, "terrace"],
  [/\bduplex\b/g, "duplex"],
  [/\bbungalow\b/g, "bungalow"],
  [/\bmaisonn?ette\b/g, "maisonette"],
  [/\bpenthouse\b/g, "penthouse"],
  [/\bboys?'?\s*quarters?\b/g, "boys_quarters"],
  [/\bflat\b/g, "flat"],
];

const MONEY =
  /(?:\b(under|below|max(?:imum)?|less\s+than|up\s*to|within|above|over|from|min(?:imum)?|at\s+least)\s+)?(?:₦|\bngn\s*|\bn(?=\d))?(\d+(?:\.\d+)?)\s*(m|mil|million|k|thousand)\b/g;
const MONEY_PLAIN = /(?:\b(under|below|max|above|over|from|min)\s+)?(?:₦|\bngn\s*|\bn(?=\d))(\d{4,10})\b/g;
const FLOOR_WORDS = /^(above|over|from|min(?:imum)?|at\s+least)$/;

const ROOMS = /\b(\d{1,2}|one|two|three|four|five|six|seven)\s*-?\s*(?:br|bdr|bdrm|bdrms|bed|beds|bedroom|bedrooms|bedroomed)\b/g;
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
  const out: ParsedWords = { shapes: [], ownerDirect: false, withBq: false, areas: [], rest: "", recognised: false };
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

  const money = (m: RegExpExecArray, naira: number) => {
    const floor = m[1] !== undefined && FLOOR_WORDS.test(m[1].replace(/\s+/g, " "));
    if (floor) out.minMinor = nairaToKobo(naira);
    else out.maxMinor = nairaToKobo(naira);
  };
  take(MONEY, (m) => money(m, amountToNaira(m[2]!, m[3]!)));
  take(MONEY_PLAIN, (m) => money(m, Number(m[2])));

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

  const words = text.split(" ").filter(Boolean);
  const kept = out.recognised ? words.filter((w) => !JOINERS.test(w)) : words;
  out.rest = kept.join(" ");
  return out;
}
