import type { PassportFacts } from "./model";

/**
 * THE PASSPORT'S OBJECT DETAILS. Pure, client-safe, no secrets.
 *
 * Three things make the page look and read like a travel document, and each
 * one is derived from what the passport already shows, never from a field it
 * does not:
 *
 *   the number   a passport-style document number made from the account id by
 *                a one-way hash, so the id cannot be read back from it
 *   the MRZ      the two machine-readable lines at the foot, built only from
 *                the number, the name, and the lines the owner has left on
 *   the pattern  the security-pattern background, drawn from the same hash so
 *                every passport has its own rosette
 *
 * The number is decoration with a fixed rule, not an identifier anyone is
 * asked to quote: nothing on Vallo looks a member up by it.
 */

const NUMBER_ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** cyrb53: a small, fast, well-spread 53-bit string hash. Not cryptographic, and not needed to be. */
function hash53(input: string, seed: number): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** "V" and eight characters: nine in all, the width of a passport number. */
export function passportNumber(userId: string): string {
  const id = userId.toLowerCase();
  let out = "V";
  let n = hash53(`vallo-passport:${id}`, 7);
  let m = hash53(`vallo-passport:${id}`, 11);
  for (let i = 0; i < 8; i++) {
    const source = i < 4 ? n : m;
    out += NUMBER_ALPHABET[source % NUMBER_ALPHABET.length];
    if (i < 4) n = Math.floor(n / NUMBER_ALPHABET.length);
    else m = Math.floor(m / NUMBER_ALPHABET.length);
  }
  return out;
}

/* ----------------------------------------------------------------- the MRZ */

const MRZ_WIDTH = 44;

function mrzValue(ch: string): number {
  if (ch >= "0" && ch <= "9") return ch.charCodeAt(0) - 48;
  if (ch >= "A" && ch <= "Z") return ch.charCodeAt(0) - 55;
  return 0;
}

/** The ICAO 9303 check digit: weights 7, 3, 1 over the field. */
export function mrzCheckDigit(field: string): string {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < field.length; i++) sum += mrzValue(field[i]!) * weights[i % 3]!;
  return String(sum % 10);
}

function pad(value: string): string {
  return value.length >= MRZ_WIDTH ? value.slice(0, MRZ_WIDTH) : value + "<".repeat(MRZ_WIDTH - value.length);
}

/** Letters only, upper case, accents folded, words joined by the filler. */
export function mrzName(name: string | null): string {
  if (!name) return "";
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]+/g, " ")
    .trim()
    .replace(/ /g, "<");
}

const ROLE_CODE: Record<string, string> = {
  renter: "R",
  landlord: "L",
  agent: "A",
  agency: "G",
  hotel: "H",
  servicedApartments: "S",
  guestHouse: "U",
  resort: "Z",
  shortletHost: "T",
  restaurant: "D",
};

const TIER_CODE = { none: "M", gold: "V", platinum: "P" } as const;

/** YYMMDD in Lagos time. */
function yymmdd(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}${get("month")}${get("day")}`;
}

/**
 * The two machine-readable lines.
 *
 *   line 1   P<VAL, then the name
 *   line 2   number, check, VAL, joined YYMMDD, check, role, level, filler
 *
 * Built from the facts the reader is allowed to see and from nothing else, so
 * a line the owner switched off is a run of filler here too, and the MRZ can
 * never say what the page above it does not.
 */
export function mrzLines(facts: PassportFacts): [string, string] {
  const number = passportNumber(facts.userId);
  const line1 = pad(`P<VAL${mrzName(facts.name)}`);
  const joined = facts.joinedAt ? yymmdd(facts.joinedAt) : "<<<<<<";
  const joinedCheck = facts.joinedAt ? mrzCheckDigit(joined) : "<";
  const role = facts.roles?.[0] ? (ROLE_CODE[facts.roles[0]] ?? "<") : "<";
  const level = facts.tier ? TIER_CODE[facts.tier] : "<";
  const body = `${number}${mrzCheckDigit(number)}VAL${joined}${joinedCheck}${role}${level}`;
  const line2 = pad(`${body}${mrzCheckDigit(body)}`);
  return [line1, line2];
}

/* ------------------------------------------------------------ the rosette */

/**
 * A guilloche rosette: an epitrochoid traced a few times with different
 * phases, which is how a banknote's lace is made. Parameters come from the
 * number's hash, so the pattern is the passport's own. Returns SVG path data,
 * one string per ring, rounded to one decimal so the whole figure stays small.
 */
export function rosettePaths(seed: string, rings = 5): string[] {
  const h = hash53(`rosette:${seed}`, 3);
  const petals = 5 + (h % 5); // 5 to 9 lobes
  const depth = 0.16 + ((Math.floor(h / 7) % 6) / 100); // lobe depth
  const paths: string[] = [];
  const steps = 240;
  for (let ring = 0; ring < rings; ring++) {
    const base = 22 + ring * 7;
    const phase = (ring * Math.PI) / (petals * 2);
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const r = base * (1 + depth * Math.cos(petals * t + phase) + depth * 0.45 * Math.cos((petals * 2 + 1) * t));
      const x = Math.round(r * Math.cos(t) * 10) / 10;
      const y = Math.round(r * Math.sin(t) * 10) / 10;
      d += `${i === 0 ? "M" : "L"}${x} ${y}`;
    }
    paths.push(`${d}Z`);
  }
  return paths;
}

/**
 * Fine horizontal waves, the lace under the text, as ONE tile that repeats
 * (an SVG pattern): the sine's period divides the tile's width and its rows
 * stay inside the tile's height, so the tiles meet without a seam at any card
 * size. Phase and amplitude come from the number's hash.
 */
export const LACE_TILE = { width: 400, height: 240 } as const;

export function wavePaths(seed: string, rows = 10): string[] {
  const h = hash53(`wave:${seed}`, 5);
  const amp = 4 + (h % 4);
  const cycles = 4 + (Math.floor(h / 5) % 3); // whole cycles across the tile
  const period = LACE_TILE.width / cycles;
  const paths: string[] = [];
  for (let row = 0; row < rows; row++) {
    const y0 = ((row + 0.5) * LACE_TILE.height) / rows;
    let d = "";
    for (let x = 0; x <= LACE_TILE.width; x += 10) {
      const y = Math.round((y0 + amp * Math.sin((x / period) * Math.PI * 2 + row * 0.7)) * 10) / 10;
      d += `${x === 0 ? "M" : "L"}${x} ${y}`;
    }
    paths.push(d);
  }
  return paths;
}
