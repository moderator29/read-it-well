import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LOCALES,
  formatDate,
  formatMoney,
  formatMoneyGlance,
  formatNumber,
  formatRating,
  intlTag,
  type Locale,
} from "@vallo/i18n/core";

/**
 * THE SERVER AND EVERY PHONE WRITE THE SAME THING (Track M performance).
 *
 * Chromium carries no Yoruba, Hausa or Igbo locale data, and formats those
 * locales in the phone's own language: a Yoruba price on a French phone read
 * "4 500 000 ₦" where the server, on Node with all of CLDR, wrote
 * "₦4,500,000". Every such difference is a hydration mismatch, and React
 * answers one by throwing the server's HTML away and drawing the page again.
 * `intlTag` is therefore en-NG for every locale (core.ts says why).
 *
 * These tests hold that line in two ways. Every formatter writes a Yoruba,
 * Hausa or Igbo page exactly as it writes an English one, so nothing on those
 * pages depends on locale data an engine may not carry. And no source file
 * asks Intl for a tag of its own making, or for the runtime's default, and
 * every date formatted directly names its time zone, because the server runs
 * on UTC and a phone on its own clock.
 */

const OTHERS = LOCALES.filter((locale): locale is Exclude<Locale, "en"> => locale !== "en");

describe("every locale writes what English writes", () => {
  it("asks every formatter of a tag every engine carries", () => {
    for (const locale of LOCALES) expect(intlTag[locale]).toBe("en-NG");
  });

  it.each(OTHERS)("%s: money, full, short and at a glance", (locale) => {
    for (const minor of [0, 99, 100, 99_900, 450_000, 4_500_075, 450_000_000, 1_470_000_000, 120_000_000_000, -4_200_075]) {
      expect(formatMoney(minor, locale)).toBe(formatMoney(minor, "en"));
      expect(formatMoney(minor, locale, "NGN", { compact: true })).toBe(formatMoney(minor, "en", "NGN", { compact: true }));
      expect(formatMoneyGlance(minor, locale)).toBe(formatMoneyGlance(minor, "en"));
    }
  });

  it.each(OTHERS)("%s: counts, short counts, percentages and ratings", (locale) => {
    for (const n of [0, 7, 1_234, 12_400, 1_234_567.5, 3_400_000_000]) {
      expect(formatNumber(n, locale)).toBe(formatNumber(n, "en"));
      const compact = { notation: "compact", maximumFractionDigits: 1 } as const;
      expect(formatNumber(n, locale, compact)).toBe(formatNumber(n, "en", compact));
    }
    const percent = { style: "percent", maximumFractionDigits: 1 } as const;
    expect(formatNumber(0.125, locale, percent)).toBe(formatNumber(0.125, "en", percent));
    expect(formatRating(4.5, locale)).toBe(formatRating(4.5, "en"));
  });

  /* The option bags the app formats dates with. */
  const DATES: Intl.DateTimeFormatOptions[] = [
    { day: "numeric", month: "short", year: "numeric" },
    { day: "numeric", month: "short" },
    { day: "numeric", month: "long", year: "numeric" },
    { weekday: "short", day: "numeric", month: "short" },
    { weekday: "long", day: "numeric", month: "short" },
    { weekday: "long" },
    { month: "long", year: "numeric" },
    { month: "short" },
    { hour: "numeric", minute: "2-digit" },
    { hour: "2-digit", minute: "2-digit" },
    { weekday: "long", hour: "2-digit", minute: "2-digit" },
    { year: "numeric", month: "2-digit", day: "2-digit" },
  ];
  const INSTANTS = ["2026-09-25T14:30:00Z", "2026-12-31T23:30:00Z", "2027-01-01T00:30:00Z"].map((iso) => new Date(iso));

  it.each(OTHERS)("%s: dates and times", (locale) => {
    for (const at of INSTANTS) {
      expect(formatDate(at, locale)).toBe(formatDate(at, "en"));
      for (const options of DATES) expect(formatDate(at, locale, options)).toBe(formatDate(at, "en", options));
    }
  });

  it("writes a date on Lagos time unless told otherwise", () => {
    /* Half past eleven on New Year's Eve in UTC is already half past midnight
       in Lagos. The server, on UTC, used to write the old year. */
    const at = new Date("2026-12-31T23:30:00Z");
    expect(formatDate(at, "en")).toBe("1 Jan 2027");
    expect(formatDate(at, "en", { hour: "2-digit", minute: "2-digit" })).toBe("00:30");
    expect(formatDate(at, "en", { day: "numeric", month: "short", timeZone: "UTC" })).toBe("31 Dec");
  });
});

/* ------------------------------------------------------------ the source */

const WEB = join(__dirname, "..", "..");
const I18N = join(WEB, "..", "..", "..", "packages", "i18n", "src");

function sources(root: string): string[] {
  return readdirSync(root, { recursive: true, encoding: "utf8" })
    .filter((path) => /\.(ts|tsx)$/.test(path) && !/\.test\.tsx?$/.test(path))
    .map((path) => join(root, path));
}

type Call = { file: string; line: number; callee: string; args: string[]; text: string };

const CALLEE =
  /new Intl\.(DateTimeFormat|NumberFormat|ListFormat|RelativeTimeFormat|PluralRules)\(|\.(toLocaleDateString|toLocaleTimeString|toLocaleString)\(/g;

/** Every Intl call in a file, with its top-level arguments. */
function calls(file: string): Call[] {
  const source = readFileSync(file, "utf8");
  const out: Call[] = [];
  for (const match of source.matchAll(CALLEE)) {
    const open = match.index! + match[0].length - 1;
    const args: string[] = [];
    let depth = 0;
    let start = open + 1;
    let end = open;
    for (let i = open; i < source.length; i++) {
      const ch = source[i]!;
      if (ch === "(" || ch === "{" || ch === "[") depth++;
      else if (ch === ")" || ch === "}" || ch === "]") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      } else if (ch === "," && depth === 1) {
        args.push(source.slice(start, i).trim());
        start = i + 1;
      }
    }
    const last = source.slice(start, end).trim();
    if (last) args.push(last);
    out.push({
      file: relative(join(WEB, "..", "..", ".."), file),
      line: source.slice(0, match.index).split("\n").length,
      callee: match[1] ?? match[2]!,
      args,
      text: source.slice(match.index, end + 1),
    });
  }
  return out;
}

const ALL = [...sources(WEB), ...sources(I18N)].flatMap(calls);

/** Options passed by name are looked up in the same file. */
function optionsText(call: Call): string {
  const options = call.args[1] ?? "";
  if (!/^[A-Za-z_$][\w$]*$/.test(options)) return options;
  const source = readFileSync(join(WEB, "..", "..", "..", call.file), "utf8");
  const declared = new RegExp(`const ${options}\\b[^=]*=\\s*\\{([\\s\\S]*?)\\};`).exec(source);
  return declared?.[1] ?? options;
}

const DATE_FIELDS = /\b(weekday|year|month|day|hour|minute|dateStyle|timeStyle)\s*:/;

describe("no source file asks Intl for a tag of its own", () => {
  it("finds the calls it checks", () => {
    expect(ALL.length).toBeGreaterThan(40);
  });

  it("never asks for the reader's bare locale, the runtime's default, or a tag built by hand", () => {
    const offenders = ALL.filter((call) => {
      const tag = call.args[0];
      /* A number's `toLocaleString()` with no tag is the runtime's default:
         en-US on the server, whatever the phone is set to in the browser. */
      if (tag === undefined) return true;
      if (tag === "locale" || tag === "undefined") return true;
      /* `locale === "en" ? "en-NG" : locale` and the like. */
      if (/\blocale\s*(===|!==|\?)/.test(tag)) return true;
      /* Plural rules are the one place the reader's own tag belongs. */
      if (/pluralTag\[/.test(tag) && call.callee !== "PluralRules") return true;
      return false;
    });
    expect(offenders.map((call) => `${call.file}:${call.line}  ${call.text.slice(0, 90)}`)).toEqual([]);
  });

  it("names the time zone of every date it formats directly", () => {
    const offenders = ALL.filter((call) => {
      const isDate =
        call.callee === "DateTimeFormat" ||
        call.callee === "toLocaleDateString" ||
        call.callee === "toLocaleTimeString" ||
        (call.callee === "toLocaleString" && DATE_FIELDS.test(optionsText(call)));
      return isDate && !/\btimeZone\b/.test(optionsText(call));
    });
    expect(offenders.map((call) => `${call.file}:${call.line}  ${call.text.slice(0, 90)}`)).toEqual([]);
  });
});
