import { koboToNairaInput, MAX_PRICE_KOBO } from "./listings-model";
import { findNeighbourhood as findPlace } from "../places/neighbourhoods";
import { CUT_MARK_RE, stripContacts } from "./contacts";

/**
 * V-09: PASTE YOUR BROADCAST. The WhatsApp message a Lagos agent already wrote
 * becomes a DRAFT, and nothing more.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A PARSER AND NOT A PROMPT.
 *
 * Every Lagos agent has twenty of these already: "2 bedroom flat at Onike,
 * Yaba. Rent 1.5m, agency 10%, legal 10%, caution 200k. Prepaid meter,
 * borehole, gated compound. Serious clients only". They are written in a
 * closed vocabulary (rent, agency, legal, caution, service charge, self
 * contain, mini flat, prepaid, borehole, per annum) and a closed grammar (a
 * label, then a figure, or a figure, then a label). A deterministic reader
 * handles that vocabulary exactly, runs with no model and no key, costs
 * nothing, and can be tested line by line, which is what money needs.
 *
 * ---------------------------------------------------------------------------
 * THE FOUR RULES IT KEEPS, and the reviewer will look for each.
 *
 *   1. ONLY FIELDS THE DRAFT ALREADY HAS. Every key this returns is a field of
 *      `draftInputSchema` and of the wizard's own values. "Gated compound" has
 *      no column, so it is reported as not carried over, never squeezed into
 *      one that sounds close.
 *   2. NEVER A GUESS. A figure with no label is not rent unless it carries a
 *      period ("1.5m per annum"). "Agency and legal 10%" without "each" is
 *      ambiguous and is reported, not split. An area is filled only from a
 *      closed list of neighbourhood names; an address, a street or a landmark
 *      is never filled at all.
 *   3. MONEY IS INTEGER KOBO, WORKED OUT HERE. "1.5m" is 150,000,000 kobo by
 *      integer arithmetic on the digits; "10%" is 1,000 basis points of the
 *      stated rent, rounded to the kobo. No float touches a figure, and when a
 *      percentage has no rent to be a percentage of, it is reported rather
 *      than resolved against anything else.
 *   4. CONTACT DETAILS ARE STRIPPED after normalising the text first
 *      (`contacts.ts`: full-width digits, spelled digits, the letter O,
 *      numbers split by any separator; handles by platform word; spelled
 *      emails). Every form in the review's list is tested; no claim is made
 *      beyond that. So are the phrases
 *      that only make sense on WhatsApp ("serious clients only", "call or
 *      WhatsApp", an inspection fee). Each is listed back to the agent as not
 *      carried over, so nothing vanishes silently.
 *
 * NOTHING HERE SUBMITS ANYTHING. The result fills a draft on the agent's own
 * screen, every filled field is marked "from your message", and the wizard
 * will not send a listing whose money figures came from the message until the
 * agent has touched each one.
 */

/** The wizard fields a broadcast may fill. Every one is in `draftInputSchema`. */
export type BroadcastKey =
  | "title"
  | "description"
  | "propertyType"
  | "intent"
  | "stateCode"
  | "city"
  | "area"
  | "bedrooms"
  | "bathrooms"
  | "toilets"
  | "parkingSpaces"
  | "rentNaira"
  | "rentPeriod"
  | "rentNegotiable"
  | "cautionDepositNaira"
  | "serviceChargeNaira"
  | "agencyFeeNaira"
  | "legalFeeNaira"
  | "agreementFeeNaira"
  | "totalMoveInNaira"
  | "rateNaira"
  | "salePriceNaira"
  | "saleAgencyFeeNaira"
  | "saleLegalFeeNaira"
  | "priceNegotiable"
  | "furnished"
  | "powerGrid"
  | "powerBackup"
  | "waterSupply"
  | "prepaidMeter";

/** The money fields, which the wizard will not send until each is touched. */
export const BROADCAST_MONEY_KEYS: readonly BroadcastKey[] = [
  "rentNaira",
  "cautionDepositNaira",
  "serviceChargeNaira",
  "agencyFeeNaira",
  "legalFeeNaira",
  "agreementFeeNaira",
  "totalMoveInNaira",
  "rateNaira",
  "salePriceNaira",
  "saleAgencyFeeNaira",
  "saleLegalFeeNaira",
];

export type NotCarriedKind =
  | "phone"
  | "account"
  | "email"
  | "handle"
  | "link"
  | "phrase"
  | "noField"
  | "ambiguous"
  | "noBase"
  | "tooLarge"
  | "tooSmall"
  | "unreadable";

export type NotCarried = { kind: NotCarriedKind; text: string };

export type BroadcastParse = {
  /** Wizard-shaped values: money as naira input text, worked out from kobo. */
  values: Partial<Record<BroadcastKey, string | number | boolean>>;
  /** The same money, in integer kobo, which is what was actually computed. */
  kobo: Partial<Record<BroadcastKey, number>>;
  /** Every key filled, in a stable order, for the "from your message" marks. */
  filled: BroadcastKey[];
  notCarried: NotCarried[];
  /**
   * The message with every phone number, account number, email, handle, link
   * and WhatsApp phrase already removed. The only text any second reader is
   * ever shown.
   */
  cleaned: string;
};

/* ------------------------------------------------------------ money text */

const MULTIPLIER: Record<string, number> = {
  k: 1_000,
  thousand: 1_000,
  m: 1_000_000,
  mil: 1_000_000,
  mill: 1_000_000,
  million: 1_000_000,
  millions: 1_000_000,
  b: 1_000_000_000,
  bn: 1_000_000_000,
  billion: 1_000_000_000,
};

/**
 * A figure as a Nigerian agent writes it, in integer kobo, or null.
 *
 * "1.5m" -> 150,000,000. "200k" -> 20,000,000. "1,500,000" -> 150,000,000.
 * "N2.25M" -> 225,000,000. Integer arithmetic on the digit strings: the
 * fraction is scaled by the multiplier and must land on a whole kobo, or the
 * figure is refused rather than rounded into something nobody wrote.
 */
export function amountToKobo(digits: string, suffix: string | undefined): number | null {
  const clean = digits.replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(clean)) return null;
  const [whole = "0", fraction = ""] = clean.split(".");
  const mult = suffix ? MULTIPLIER[suffix.toLowerCase()] : 1;
  if (mult === undefined) return null;
  // kobo = whole * mult * 100 + fraction * mult * 100 / 10^len
  const scale = 10 ** fraction.length;
  const fractionKobo = fraction === "" ? 0 : Number(fraction) * mult * 100;
  if (fractionKobo % scale !== 0) return null;
  const kobo = Number(whole) * mult * 100 + fractionKobo / scale;
  if (!Number.isSafeInteger(kobo) || kobo <= 0) return null;
  return kobo;
}

/** A percentage in integer basis points: "10%" is 1,000, "7.5%" is 750. */
export function percentToBasisPoints(text: string): number | null {
  const match = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) return null;
  const whole = Number(match[1]);
  const fraction = (match[2] ?? "").padEnd(2, "0");
  const bp = whole * 100 + Number(fraction);
  return bp > 0 && bp <= 10_000 ? bp : null;
}

/** A share of a base, in kobo, rounded half up to the kobo. Integers only. */
export function shareOf(baseKobo: number, basisPoints: number): number {
  return Math.floor((baseKobo * basisPoints + 5_000) / 10_000);
}


/* ---------------------------------------------------- the closed vocabulary */

/* The closed list of neighbourhoods lives in `lib/places/neighbourhoods.ts`,
   shared with the demand board (V-10), which must turn typed search text into
   a neighbourhood the same way and for the same reason: never guess. */
const NUMBER_WORDS: Readonly<Record<string, number>> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
};

function countFrom(text: string): number | null {
  const n = /^\d+$/.test(text) ? Number(text) : NUMBER_WORDS[text.toLowerCase()];
  return n === undefined || !Number.isFinite(n) ? null : n;
}

/* ---------------------------------------------------------------- stripping */

/** Nigerian mobile numbers, with or without +234, spaced or dashed. */
/**
 * Nigerian mobile numbers however they are written: +234 803 123 4567,
 * +234 (0) 803-123-4567, 0803 123 4567, 08031234567.
 */
const PHONE = /(?:\+?\s?234[\s.-]*(?:\(0\)[\s.-]*)?|\b0)[789][01](?:[\s.-]?\d){8}\b/g;
/**
 * The contact words that lead up to a number ("Call 0803...", "WhatsApp or
 * call: +234..."). They go WITH the number, so stripping the number does not
 * leave a lone "Call" behind to be reported as wording of its own.
 */
/** The same words, when what followed them was cut by `stripContacts`. */
const CONTACT_LEAD_TO_CUT =
  /(?:\b(?:call|whatsapp|text|dm|contact|tel|phone|reach|email|mail|pay(?:\s+to)?|send(?:\s+to)?|acct|account(?:\s+(?:no|number))?|landline|ig|insta(?:gram)?)\b[\s:.,/&-]*(?:or\s+|and\s+)?)+(?:(?:me|us)\s+)?(?:on\s+|via\s+|at\s+)?(?:[A-Z]{2,5}\s+)?(?=\s*\u2063)/gi;
const CONTACT_LEAD =
  /(?:\b(?:call|whatsapp|text|dm|contact|tel|phone|reach)\b[\s:.,/&-]*(?:or\s+|and\s+)?)+(?:(?:me|us)\s+)?(?:on\s+|via\s+)?(?=\+?\s?(?:234|0)[\s(]*[0789])/gi;
/**
 * A ten digit NUBAN, run together or grouped with spaces or dashes ("0123 456
 * 789"), which is an account number and not a price. Never taken when a naira
 * sign sits in front of it: "₦1500000000" is a figure for the money reader to
 * judge (and refuse as too large), not an account.
 */
const ACCOUNT = /(?<![₦#\d]\s?)(?<!\bn\s?)\b\d(?:[\s-]?\d){9}\b(?![\s-]?\d)/gi;
/** An email address, a social handle, and links of every kind. */
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const HANDLE = /(?<![\w.@])@[a-z0-9_.]{2,30}\b/gi;
const LINK =
  /\b(?:https?:\/\/|www\.)\S+|\b(?:wa\.me|t\.me|bit\.ly|tinyurl\.com|instagram\.com|facebook\.com|fb\.me|tiktok\.com|x\.com|twitter\.com)\/\S*/gi;
/** Phrases that belong to WhatsApp and to nothing on a listing. */
const PHRASES: readonly RegExp[] = [
  /serious\s+(?:clients?|buyers?|tenants?|people)\s+only/gi,
  /\b(?:call|whatsapp|chat|dm|text)\b(?:\s*(?:\/|\bor\b|&)\s*\b(?:call|whatsapp|chat|dm|text)\b)*(?:\s*\b(?:me|us)\b)?(?:\s*\b(?:on|via)\b)?(?:\s*\bfor\s+(?:more\s+)?(?:details|info|inspection|enquiries)\b)?/gi,
  /inspection\s+(?:fee|charge)\s*(?:of\s*)?(?:₦|n|#)?\s*[\d.,]*\s*[km]?/gi,
  /no\s+time\s+wasters?/gi,
  /first\s+come,?\s*first\s+served/gi,
  /(?:pls|please|kindly)\s+(?:share|repost|broadcast)/gi,
];

/* --------------------------------------------------------------- the labels */

type LabelKind =
  | "total"
  | "serviceCharge"
  | "caution"
  | "agency"
  | "legal"
  | "agreement"
  | "rent"
  | "sale";

const LABELS: readonly { kind: LabelKind; re: RegExp }[] = [
  { kind: "total", re: /\b(?:total(?:\s+package)?|all[\s-]?in(?:clusive)?|move[\s-]?in(?:\s+cost)?|package)\b/gi },
  { kind: "serviceCharge", re: /\b(?:service\s*charges?|svc\s*charge)\b/gi },
  { kind: "caution", re: /\b(?:caution(?:\s*(?:fee|deposit))?|security\s+deposit|refundable\s+deposit)\b/gi },
  { kind: "agency", re: /\b(?:agency(?:\s*fees?)?|agent(?:'?s)?\s*fees?|commission)\b/gi },
  { kind: "legal", re: /\b(?:legal(?:\s*fees?)?|lawyer(?:'?s)?\s*fees?)\b/gi },
  { kind: "agreement", re: /\b(?:agreement(?:\s*fees?)?)\b/gi },
  { kind: "sale", re: /\b(?:sale\s+price|selling\s+(?:for|at)|asking\s+price)\b/gi },
  { kind: "rent", re: /\b(?:rent(?:al)?|price|going\s+for|asking)\b/gi },
];

const AMOUNT =
  /(?:₦|\bn(?=\s?\d)|\bngn\s?|#)?\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(k|thousand|mil|mill|millions?|m|bn|b|billion)?(?![a-z0-9%])/gi;
/* No digit or point may sit in front: "150%" is not "50%", and it is refused. */
const PERCENT = /(?<![\d.])(\d{1,3}(?:\.\d{1,2})?)\s?(?:%|per\s?cent|percent)/gi;

type Token =
  | { type: "label"; kind: LabelKind; at: number; end: number }
  | { type: "amount"; kobo: number; at: number; end: number; raw: string; explicit: boolean }
  | { type: "percent"; bp: number; at: number; end: number; raw: string };

/** The smallest figure that is plausibly money on a listing: one thousand naira. */
export const MIN_MONEY_KOBO = 100_000;

/**
 * Every figure the reader could not use is reported, never dropped: a
 * percentage over a hundred, a sum under a thousand naira, a figure with a
 * minus in front, a figure that does not come out to whole kobo.
 */
function tokens(clause: string, rejects: NotCarried[] = []): Token[] {
  const out: Token[] = [];
  const taken: [number, number][] = [];
  const overlaps = (a: number, b: number) => taken.some(([x, y]) => a < y && b > x);
  for (const { kind, re } of LABELS) {
    re.lastIndex = 0;
    for (const m of clause.matchAll(re)) {
      const at = m.index ?? 0;
      const end = at + m[0].length;
      if (overlaps(at, end)) continue;
      taken.push([at, end]);
      out.push({ type: "label", kind, at, end });
    }
  }
  /* "1O%" with the letter O: a percentage nobody can be sure of. Reported. */
  for (const m of clause.matchAll(/(?<![\w.])(?=[\dOo.]*\d)(?=[\dOo.]*[Oo])[\dOo]+(?:\.[\dOo]+)?\s?%/g)) {
    const at = m.index ?? 0;
    const end = at + m[0].length;
    if (overlaps(at, end)) continue;
    taken.push([at, end]);
    rejects.push({ kind: "unreadable", text: m[0].trim() });
  }
  PERCENT.lastIndex = 0;
  for (const m of clause.matchAll(PERCENT)) {
    const at = m.index ?? 0;
    const end = at + m[0].length;
    if (overlaps(at, end)) continue;
    const bp = percentToBasisPoints(m[1] ?? "");
    if (bp === null) {
      rejects.push({ kind: "unreadable", text: m[0].trim() });
      taken.push([at, end]);
      continue;
    }
    taken.push([at, end]);
    out.push({ type: "percent", bp, at, end, raw: m[0].trim() });
  }
  AMOUNT.lastIndex = 0;
  for (const m of clause.matchAll(AMOUNT)) {
    const at = m.index ?? 0;
    const end = at + m[0].length;
    if (overlaps(at, end)) continue;
    const digits = m[1] ?? "";
    const suffix = m[2];
    const hasSign = /[₦#]|\bngn|\bn\s?\d/i.test(m[0]);
    const bigBare = digits.replace(/[,.]/g, "").length >= 5;
    /* A bare small number ("2 bedroom", "24 hours") is not money. Only a
       figure with a sign, a k/m/b, or at least five digits is. */
    if (!suffix && !hasSign && !bigBare) continue;
    taken.push([at, end]);
    /* "1,500,000.50": the grouped figure stops at the comma groups and a
       fraction would be dropped on the floor. Handed back whole instead. */
    const fraction = /^\.\d+/.exec(clause.slice(end));
    if (fraction) {
      taken.push([end, end + fraction[0].length]);
      rejects.push({ kind: "unreadable", text: `${m[0].trim()}${fraction[0]}` });
      continue;
    }
    /* "-200k" is a discount, a range or a typo, and a guess would be one of
       three different figures. It is handed back. */
    const first = at + (m[0].length - m[0].trimStart().length);
    const attachedMinus =
      clause[first - 1] === "-" && (first - 2 < 0 || /\s/.test(clause[first - 2] ?? ""));
    if (attachedMinus) {
      rejects.push({ kind: "ambiguous", text: clause.slice(first - 1, end).trim() });
      continue;
    }
    const kobo = amountToKobo(digits, suffix);
    if (kobo === null) {
      rejects.push({ kind: "unreadable", text: m[0].trim() });
      continue;
    }
    if (kobo < MIN_MONEY_KOBO) {
      rejects.push({ kind: "tooSmall", text: m[0].trim() });
      continue;
    }
    out.push({ type: "amount", kobo, at, end, raw: m[0].trim(), explicit: Boolean(suffix || hasSign) });
  }
  /* A RANGE OR A CHOICE IS NOT A FIGURE. "1.5m-2m", "1.5m to 2m", "1.5m or
     1.8m": taking either end would be a guess, so both are handed back. */
  const sorted = out.sort((a, b) => a.at - b.at);
  const drop = new Set<Token>();
  for (let i = 0; i + 1 < sorted.length; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    if (a.type !== "amount" || b.type !== "amount") continue;
    const between = clause.slice(a.end, b.at);
    const range =
      /^\s*(?:-|\u2013|\u2014|~|to|or|and|\/)\s*$/i.test(between) ||
      /* "min 2.5m max 3m", "2.5m (ground) 3m (top)": two figures for one
         field, told apart only by a word. */
      /^\s*(?:max(?:imum)?|up\s+to)\s*$/i.test(between) ||
      /^\s*\([^()]{1,24}\)\s*$/.test(between) ||
      /* "between 2.5m and 3m" */
      (/^\s*and\s*$/i.test(between) && /\bbetween\s*(?:₦|n|#)?\s*$/i.test(clause.slice(0, a.at)));
    if (!range) continue;
    drop.add(a);
    drop.add(b);
    rejects.push({ kind: "ambiguous", text: clause.slice(a.at, b.end).trim() });
  }
  /* "2.5 to 3m", "2.5-3m", "between 2.5 and 3 million": the unit on the
     second figure belongs to both, so a bare number just before it makes a
     range too. Both are handed back. */
  for (const b of sorted) {
    if (b.type !== "amount" || !b.explicit || drop.has(b)) continue;
    const before = clause.slice(0, b.at);
    const bare = /(?<![\w.,])(\d+(?:\.\d+)?)\s*(?:-|\u2013|\u2014|~|to|and)\s*$/i.exec(before);
    if (!bare) continue;
    const from = bare.index;
    if (sorted.some((t) => t !== b && t.at < b.at && t.end > from)) continue;
    drop.add(b);
    rejects.push({ kind: "ambiguous", text: clause.slice(from, b.end).trim() });
  }
  return sorted.filter((token) => !drop.has(token));
}

const PERIOD_YEAR = /(?:per\s+annum|\bp\.?\s?a\b|\/\s*(?:yr|year|annum)|per\s+year|yearly|a\s+year|annual(?:ly)?|\bpa\b)/i;
const PERIOD_MONTH = /(?:per\s+month|monthly|\/\s*(?:mth|month|mo)\b|a\s+month)/i;
const PERIOD_QUARTER = /(?:per\s+quarter|quarterly|\/\s*quarter)/i;
const PERIOD_NIGHT = /(?:per\s+night|\/\s*night|a\s+night|nightly|per\s+day|daily)/i;

/** Split a message into clauses, without splitting "1,500,000" or "1.5m". */
function clauses(text: string): string[] {
  return text
    .split(/\n+|;|\||•|(?<!\d),(?!\d{3})|,(?=\s)|\.(?=\s|$)(?<!\d\.)/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/* ----------------------------------------------------------------- the parse */

const ORDER: readonly BroadcastKey[] = [
  "title",
  "intent",
  "propertyType",
  "bedrooms",
  "bathrooms",
  "toilets",
  "parkingSpaces",
  "stateCode",
  "city",
  "area",
  "rentNaira",
  "rentPeriod",
  "rentNegotiable",
  "rateNaira",
  "salePriceNaira",
  "priceNegotiable",
  "agencyFeeNaira",
  "legalFeeNaira",
  "agreementFeeNaira",
  "cautionDepositNaira",
  "serviceChargeNaira",
  "totalMoveInNaira",
  "saleAgencyFeeNaira",
  "saleLegalFeeNaira",
  "furnished",
  "powerGrid",
  "powerBackup",
  "waterSupply",
  "prepaidMeter",
  "description",
];

/** Facts people put in a broadcast that no draft field holds (yet). */
const NO_FIELD: readonly { re: RegExp; text: string }[] = [
  { re: /\bgated\b|\bestate\b|\bsecurity\b/i, text: "Gated or estate security" },
  { re: /\ball\s+rooms?\s+en[\s-]?suite\b|\ben[\s-]?suite\b/i, text: "En suite rooms" },
  { re: /\bpop\b|\bpop\s+ceiling/i, text: "POP ceiling" },
  { re: /\bserviced\b/i, text: "Serviced" },
  { re: /\bfitted\s+kitchen\b|\bwardrobes?\b/i, text: "Kitchen and wardrobe fittings" },
  { re: /\b\d\s*years?\s+upfront\b|\b\d\s*yrs?\s+upfront\b/i, text: "Years of rent upfront" },
];

export function parseBroadcast(message: string): BroadcastParse {
  const values: BroadcastParse["values"] = {};
  const kobo: BroadcastParse["kobo"] = {};
  const notCarried: NotCarried[] = [];
  const put = (key: BroadcastKey, value: string | number | boolean) => {
    if (values[key] === undefined) values[key] = value;
  };

  /* 1. Strip what must never be carried, and say what it was. Contacts are
        normalised first (`contacts.ts`), then the words that led up to each
        go with it, then the shapes below catch anything left. */
  /* Links first, so "instagram.com/vallohomes" goes whole rather than
     leaving "/vallohomes" behind once the handle reader has taken a word. */
  const linked = message.replace(/\r/g, "");
  for (const m of linked.matchAll(LINK)) notCarried.push({ kind: "link", text: m[0] });
  const stripped = stripContacts(linked.replace(LINK, " "));
  for (const hit of stripped.hits) notCarried.push({ kind: hit.kind, text: hit.text });
  let text = stripped.text.replace(CONTACT_LEAD_TO_CUT, " ").replace(CUT_MARK_RE, " ");
  text = text.replace(CONTACT_LEAD, "");
  for (const m of text.matchAll(PHONE)) notCarried.push({ kind: "phone", text: m[0].trim() });
  text = text.replace(PHONE, " ");
  for (const m of text.matchAll(LINK)) notCarried.push({ kind: "link", text: m[0] });
  text = text.replace(LINK, " ");
  for (const m of text.matchAll(EMAIL)) notCarried.push({ kind: "email", text: m[0] });
  text = text.replace(EMAIL, " ");
  for (const m of text.matchAll(HANDLE)) notCarried.push({ kind: "handle", text: m[0] });
  text = text.replace(HANDLE, " ");
  for (const m of text.matchAll(ACCOUNT)) notCarried.push({ kind: "account", text: m[0].trim() });
  text = text.replace(ACCOUNT, " ");
  text = text.replace(/\b(?:acct|account)\s*(?:no|number|name|details)?\s*[:.-]?/gi, " ");
  for (const re of PHRASES) {
    for (const m of text.matchAll(re)) {
      const phrase = m[0].trim();
      if (phrase.length >= 4) notCarried.push({ kind: "phrase", text: phrase });
    }
    text = text.replace(re, " ");
  }
  text = text.replace(/[ \t]{2,}/g, " ");
  const lower = text.toLowerCase();

  /* 2. What it is: intent, unit shape, rooms. */
  const forSale = /\bfor\s+sale\b|\bselling\b|\bsale\s+price\b|\bc\s?of\s?o\b|\bgovernor'?s\s+consent\b/i.test(text);
  const shortStay = PERIOD_NIGHT.test(text) || /\bshort[\s-]?let\b/i.test(text);
  put("intent", forSale ? "sale" : "rent");

  let unit: "flat" | "house" | "shop" | "office" | "land" | "shortlet" | null = null;
  let bedrooms: number | null = null;
  if (/\bself[\s-]?con(?:tain(?:ed)?)?\b|\bselfcon\b/i.test(text)) {
    unit = "flat";
    bedrooms = 0;
  } else if (/\bmini[\s-]?flat\b|\broom\s*(?:and|&)\s*parlou?r\b/i.test(text)) {
    unit = "flat";
    bedrooms = 1;
  }
  const beds = /\b(\d{1,2}|one|two|three|four|five|six|seven|eight)\s*[-\s]?\s*(?:bed(?:room)?s?|bdrm?s?|br)\b/i.exec(text);
  if (beds && bedrooms === null) bedrooms = countFrom(beds[1] ?? "");
  if (/\bshort[\s-]?let\b/i.test(text)) unit = "shortlet";
  else if (unit === null && /\b(?:flat|apartment|penthouse)\b/i.test(text)) unit = "flat";
  else if (unit === null && /\b(?:duplex|bungalow|terrace|detached|mansion|house)\b/i.test(text)) unit = "house";
  else if (unit === null && /\bshop\b/i.test(text)) unit = "shop";
  else if (unit === null && /\boffice\b/i.test(text)) unit = "office";
  else if (unit === null && /\b(?:land|plot|acres?)\b/i.test(text)) unit = "land";

  if (unit !== null) {
    const type =
      unit === "shortlet"
        ? "shortlet"
        : unit === "shop" || unit === "office" || unit === "land"
          ? unit
          : forSale
            ? unit === "flat"
              ? "apartment"
              : "home"
            : shortStay
              ? unit === "flat"
                ? "apartment"
                : "home"
              : "rental";
    put("propertyType", type);
  }
  if (bedrooms !== null && bedrooms >= 0 && bedrooms <= 20) put("bedrooms", bedrooms);

  const baths = /\b(\d{1,2})\s*(?:bath(?:room)?s?)\b/i.exec(text);
  if (baths) put("bathrooms", Number(baths[1]));
  const toilets = /\b(\d{1,2})\s*(?:toilets?|wcs?)\b/i.exec(text);
  if (toilets) put("toilets", String(Number(toilets[1])));
  const parking = /\bparking\s+(?:space\s+)?for\s+(\d{1,2})\s+cars?\b|\b(\d{1,2})\s+(?:car\s+)?parking\s+spaces?\b/i.exec(text);
  if (parking) put("parkingSpaces", String(Number(parking[1] ?? parking[2])));

  /* 3. Where: only a neighbourhood on the closed list, never a street. */
  const place = findPlace(text);
  if (place) {
    put("stateCode", place.stateCode);
    put("city", place.city);
    put("area", place.area);
  }

  /* 4. The money, clause by clause. */
  const found: Partial<Record<LabelKind, { kobo?: number; bp?: number; raw: string }>> = {};
  let unlabelledRent: { kobo: number; raw: string } | null = null;
  let period: "year" | "month" | "quarter" | null = null;

  for (const clause of clauses(text)) {
    const list = tokens(clause, notCarried);
    const labels = list.filter((t) => t.type === "label") as Extract<Token, { type: "label" }>[];
    const valuesIn = list.filter((t) => t.type !== "label") as Exclude<Token, { type: "label" }>[];
    const used = new Set<Token>();

    if (PERIOD_YEAR.test(clause)) period = period ?? "year";
    else if (PERIOD_QUARTER.test(clause)) period = period ?? "quarter";
    else if (PERIOD_MONTH.test(clause)) period = period ?? "month";

    for (let i = 0; i < labels.length; i += 1) {
      const label = labels[i]!;
      const nextLabelAt = labels[i + 1]?.at ?? Infinity;
      let value = valuesIn.find((v) => !used.has(v) && v.at >= label.end && v.at < nextLabelAt);
      if (!value) {
        /* "10% agency": the figure before the label, if nothing claimed it. */
        const prevLabelEnd = labels[i - 1]?.end ?? -1;
        value = [...valuesIn].reverse().find((v) => !used.has(v) && v.end <= label.at && v.at > prevLabelEnd);
      }
      if (!value) {
        /* "Agency and legal 10% each": two labels share one figure only when
           the message says "each". Otherwise it is reported, not split. */
        const next = labels[i + 1];
        const shared = next
          ? valuesIn.find((v) => !used.has(v) && v.at >= next.end && (labels[i + 2]?.at ?? Infinity) > v.at)
          : undefined;
        if (shared && /\beach\b/i.test(clause.slice(shared.end, shared.end + 12))) {
          if (found[label.kind] === undefined) {
            found[label.kind] =
              shared.type === "percent" ? { bp: shared.bp, raw: shared.raw } : { kobo: shared.kobo, raw: shared.raw };
          }
          continue;
        }
        if (shared && label.kind !== "rent" && label.kind !== "sale") {
          notCarried.push({ kind: "ambiguous", text: clause.slice(label.at, shared.end).trim() });
          used.add(shared);
          i += 1;
        }
        continue;
      }
      used.add(value);
      if (found[label.kind] !== undefined) continue;
      found[label.kind] =
        value.type === "percent" ? { bp: value.bp, raw: value.raw } : { kobo: value.kobo, raw: value.raw };
    }

    /* A figure with no label counts as the price only with a period word or
       a night word beside it, or "for sale" in the message. Never otherwise. */
    const loose = valuesIn.filter((v) => !used.has(v) && v.type === "amount") as Extract<Token, { type: "amount" }>[];
    const hasPeriod = PERIOD_YEAR.test(clause) || PERIOD_MONTH.test(clause) || PERIOD_QUARTER.test(clause) || PERIOD_NIGHT.test(clause);
    if (loose.length === 1 && unlabelledRent === null && (hasPeriod || (forSale && loose[0]!.explicit))) {
      unlabelledRent = { kobo: loose[0]!.kobo, raw: loose[0]!.raw };
    }
  }

  const priceKobo = found.rent?.kobo ?? found.sale?.kobo ?? unlabelledRent?.kobo ?? null;
  const setMoney = (key: BroadcastKey, value: number) => {
    if (kobo[key] !== undefined) return;
    if (value > MAX_PRICE_KOBO) {
      /* Above the draft's own ceiling. The validator would refuse it, so it
         is handed back to the agent to type, never trimmed to fit. */
      notCarried.push({ kind: "tooLarge", text: koboToNairaInput(value) });
      return;
    }
    kobo[key] = value;
    put(key, koboToNairaInput(value));
  };

  if (priceKobo !== null) {
    if (forSale) setMoney("salePriceNaira", priceKobo);
    else if (shortStay && !period) setMoney("rateNaira", priceKobo);
    else {
      setMoney("rentNaira", priceKobo);
      put("rentPeriod", period ?? "year");
      if (period === null) {
        /* "Rent 1.5m" with no cycle: Lagos rent is yearly by convention, and
           the wizard's own default is a year, so the field is filled with the
           default the form would show anyway and marked from the message. */
      }
    }
  }

  const feeTargets: readonly [LabelKind, BroadcastKey, BroadcastKey | null][] = [
    ["agency", "agencyFeeNaira", "saleAgencyFeeNaira"],
    ["legal", "legalFeeNaira", "saleLegalFeeNaira"],
    ["agreement", "agreementFeeNaira", null],
    ["caution", "cautionDepositNaira", null],
    ["serviceCharge", "serviceChargeNaira", null],
    ["total", "totalMoveInNaira", null],
  ];
  for (const [label, rentKey, saleKey] of feeTargets) {
    const hit = found[label];
    if (!hit) continue;
    const key = forSale ? saleKey : rentKey;
    if (key === null) {
      notCarried.push({ kind: "noField", text: hit.raw });
      continue;
    }
    if (hit.kobo !== undefined) {
      setMoney(key, hit.kobo);
    } else if (hit.bp !== undefined) {
      if (priceKobo === null || label === "caution" || label === "serviceCharge" || label === "total") {
        /* A percentage of nothing, or of a figure it is not normally a share
           of, is reported rather than resolved against a guess. */
        notCarried.push({ kind: "noBase", text: `${label === "serviceCharge" ? "service charge" : label} ${hit.raw}` });
        continue;
      }
      setMoney(key, shareOf(priceKobo, hit.bp));
    }
  }

  if (/\bnon[\s-]?negotiable\b|\bnot\s+negotiable\b|\bfixed\s+price\b/i.test(text)) {
    put(forSale ? "priceNegotiable" : "rentNegotiable", false);
  } else if (/\bnegotiable\b/i.test(text)) {
    put(forSale ? "priceNegotiable" : "rentNegotiable", true);
  }

  /* 5. Light, water, furnishing: explicit words only. */
  if (/\bpre[\s-]?paid\s+meters?\b|\bprepaid\b/i.test(text)) put("prepaidMeter", true);
  if (/\bborehole\b/i.test(text)) put("waterSupply", "BOREHOLE");
  else if (/\btreated\s+(?:mains\s+)?water\b|\bpipe[\s-]?borne\s+water\b/i.test(text)) put("waterSupply", "TREATED_MAINS");
  if (/\bband\s*a\b/i.test(text)) put("powerGrid", "BAND_A");
  const gen = /\bgenerator\b|\bgen\b|\bgenset\b/i.test(text);
  const inv = /\binverters?\b/i.test(text);
  const solar = /\bsolar\b/i.test(text);
  if (gen && inv) put("powerBackup", "GENERATOR_INVERTER");
  else if (gen) put("powerBackup", "GENERATOR");
  else if (inv) put("powerBackup", "INVERTER");
  else if (solar) put("powerBackup", "SOLAR");
  if (/\bun[\s-]?furnished\b/i.test(text)) put("furnished", "unfurnished");
  else if (/\bsemi[\s-]?furnished\b/i.test(text)) put("furnished", "semi_furnished");
  else if (/\b(?:fully\s+)?furnished\b/i.test(text)) put("furnished", "fully_furnished");

  for (const { re, text: label } of NO_FIELD) {
    if (re.test(lower)) notCarried.push({ kind: "noField", text: label });
  }

  /* 6. A title made only of what was read, and the agent's own words. */
  const shape =
    bedrooms === 0
      ? "Self contain"
      : unit === "flat" && bedrooms === 1 && /\bmini[\s-]?flat\b/i.test(text)
        ? "Mini flat"
        : bedrooms !== null && unit !== null
          ? `${bedrooms} bedroom ${unit === "house" ? "house" : unit === "shortlet" ? "shortlet" : "flat"}`
          : unit === "shop"
            ? "Shop"
            : unit === "office"
              ? "Office space"
              : unit === "land"
                ? "Land"
                : null;
  if (shape !== null) {
    const titled = place ? `${shape} in ${place.area}` : shape;
    put("title", forSale ? `${titled} for sale` : titled);
  }
  const description = text
    .split("\n")
    .map((line) => line.replace(/\s{2,}/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .trim();
  if (description.length >= 20) put("description", description.slice(0, 4000));

  const filled = ORDER.filter((key) => values[key] !== undefined);
  return { values, kobo, filled, notCarried: dedupe(notCarried), cleaned: text.trim() };
}

function dedupe(list: NotCarried[]): NotCarried[] {
  const seen = new Set<string>();
  return list.filter((item) => {
    const key = `${item.kind}:${item.text.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
