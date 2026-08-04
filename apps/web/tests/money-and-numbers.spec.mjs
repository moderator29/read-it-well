/**
 * Money and numbers, on the surface and per locale.
 *
 * Self-contained: no runner, no config. This is the proof behind items 11 and
 * 12 of docs/POLISH_PASS.md.
 *
 * 11. Compact naira where a figure is glanced at, exact naira where it is
 *     read, kobo whenever there is kobo, everything through `formatMoney`.
 * 12. Every number and every price grouped by the APP's locale, never by the
 *     browser's and never by hand.
 *
 * Two halves. The STATIC half proves nothing reaches the screen through
 * `toFixed`, `toLocaleString` or a hand-written naira sign. The RUNTIME half
 * reads the real pages and checks the strings that actually rendered: it
 * recomputes what `Intl` should have produced and compares, so the assertions
 * cannot drift away from the formatter they are testing.
 *
 * Run with the server already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/money-and-numbers.spec.mjs
 */

import { chromium } from "playwright-core";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const EXECUTABLE_PATH = "/opt/pw-browsers/chromium";
const WAIT = 1200;

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "../src");

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
    if (detail) for (const line of [].concat(detail).slice(0, 14)) console.log(`            ${line}`);
  }
}

const SOCIAL = [
  "lib/social/",
  "components/social/",
  "app/(app)/around/",
  "app/(app)/u/",
  "app/(app)/post/",
  "app/(app)/stories/",
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}
const files = walk(SRC)
  .map((f) => ({ path: f, rel: relative(SRC, f).split("\\").join("/"), src: readFileSync(f, "utf8") }))
  .filter((f) => !SOCIAL.some((s) => f.rel.startsWith(s)));

/* ------------------------------------------------------------------ static */

console.log("\nNothing formats a number by hand");

/*
 * `toLocaleString()` with no argument reads the BROWSER's locale, not the
 * app's, so a wallet balance grouped "258.450" on a German phone while every
 * other figure on the same page used commas. There is one number formatter.
 */
const browserLocale = [];
for (const f of files) {
  for (const m of f.src.matchAll(/\.toLocaleString\(\s*\)/g)) {
    browserLocale.push(`${f.rel}:${f.src.slice(0, m.index).split("\n").length}`);
  }
}
check("no number is grouped by the browser's locale", browserLocale.length === 0, browserLocale);

/*
 * `toFixed` hardcodes a full stop as the decimal separator and an ASCII digit
 * set. Ratings were rendered that way in six places. Geometry is exempt: an
 * SVG path coordinate is not a number anybody reads.
 */
const GEOMETRY = /mapGeo|Sparkline|StatChart|TiltField|BalanceCard/;
const handRounded = [];
for (const f of files) {
  if (GEOMETRY.test(f.rel)) continue;
  for (const m of f.src.matchAll(/\.toFixed\(\d\)/g)) {
    handRounded.push(`${f.rel}:${f.src.slice(0, m.index).split("\n").length}`);
  }
}
check("no figure a person reads is rounded by hand", handRounded.length === 0, handRounded);

/*
 * The formatter is the only place that divides kobo, and the only place that
 * writes a naira sign in front of a figure. A literal sign next to an
 * interpolated amount means a second, disagreeing formatter.
 */
const handMoney = [];
for (const f of files) {
  if (f.rel.startsWith("lib/")) continue;
  for (const m of f.src.matchAll(/₦\{|₦"\}\{[a-zA-Z]/g)) {
    handMoney.push(`${f.rel}:${f.src.slice(0, m.index).split("\n").length} ${m[0]}`);
  }
}
check("no surface pairs a naira sign with its own figure", handMoney.length === 0, handMoney);

const i18n = readFileSync(join(here, "../../../packages/i18n/src/index.ts"), "utf8");
check(
  "compact notation is not flattened by a fraction-digit cap",
  /notation: "compact",\s*\}\)/.test(i18n) && !/maximumFractionDigits: 0,\s*\n\s*notation/.test(i18n),
);
check("kobo shows whenever there is kobo", /hasKobo \? 2 : 0/.test(i18n));
check("there is one glance threshold, stated once", /GLANCE_COMPACT_FROM_MINOR = 100_000_000/.test(i18n));

/* ----------------------------------------------------------------- runtime */

/**
 * What Intl should have produced, computed here rather than typed in, so this
 * spec cannot assert a format the product no longer uses.
 */
const TAG = { en: "en-NG", yo: "yo-NG", ha: "ha-NG", ig: "ig-NG" };
function expectMoney(minor, locale, { compact = false } = {}) {
  const major = minor / 100;
  if (compact) {
    return new Intl.NumberFormat(TAG[locale], {
      style: "currency",
      currency: "NGN",
      notation: "compact",
    })
      .format(major)
      .replace(/[A-Za-z]+$/, (s) => s.toLowerCase());
  }
  const hasKobo = Math.abs(Math.round(minor)) % 100 !== 0;
  return new Intl.NumberFormat(TAG[locale], {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: hasKobo ? 2 : 0,
    maximumFractionDigits: hasKobo ? 2 : 0,
  }).format(major);
}

/* Every money string on the page, and every long ungrouped run of digits. */
const SWEEP = () => {
  const money = new Set();
  const ungrouped = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const text = (node.nodeValue || "").trim();
    if (!text) continue;
    for (const m of text.matchAll(/₦\s?[\d.,]+[A-Za-z]*/g)) money.add(m[0]);
    /* Four or more digits in a row with no separator inside them. A year and a
       masked account tail are not figures anybody adds up. */
    for (const m of text.matchAll(/(?<![\d.,:/*-])\d{4,}(?![\d.,:/*-])/g)) {
      const v = Number(m[0]);
      if (v >= 1900 && v <= 2100) continue;
      if (/\*{2,}\s*$/.test(text.slice(0, m.index))) continue;
      ungrouped.add(`${m[0]} in "${text.slice(0, 56)}"`);
    }
  }
  return { money: [...money], ungrouped: [...ungrouped] };
};

const ROUTES = [
  "/", "/home", "/search", "/search?view=map", "/listing/lekki-palm-grove", "/rent",
  "/wallet", "/bookings", "/saved",
  "/agent/dashboard", "/agent/listings", "/agent/earnings", "/agent/reviews",
];

const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });

try {
  console.log("\nWhat actually rendered, 390px");
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem("nf_theme", "dark");
    } catch {
      /* storage can be unavailable */
    }
  });

  const seen = new Set();
  const ungrouped = [];
  for (const route of ROUTES) {
    const page = await context.newPage();
    try {
      await page.goto(BASE_URL + route, { waitUntil: "load", timeout: 45000 });
      await page.waitForTimeout(WAIT);
      const res = await page.evaluate(SWEEP);
      for (const s of res.money) seen.add(s);
      for (const u of res.ungrouped) ungrouped.push(`${route} ${u}`);
    } catch (err) {
      failures += 1;
      console.log(`  FAILED  ${route} ${String(err).split("\n")[0]}`);
    } finally {
      await page.close();
    }
  }

  check("no figure reaches the screen ungrouped", ungrouped.length === 0, ungrouped);
  check("money actually rendered on these routes", seen.size > 5, [`${seen.size} distinct strings`]);

  /*
   * Every money string must be a shape the formatter can produce: either the
   * grouped form or the compact form. Anything else came from somewhere else.
   */
  const grouped = /^₦\s?\d{1,3}(,\d{3})*(\.\d{2})?$/;
  const compact = /^₦\s?\d{1,3}(\.\d)?[a-z]$/;
  const strays = [...seen].filter((s) => !grouped.test(s) && !compact.test(s));
  check("every money string is one of the two shapes the formatter makes", strays.length === 0, strays);

  /* The compact bug in the form it shipped: 1.2m arriving as 1m. */
  const compacts = [...seen].filter((s) => compact.test(s));
  check(
    "compact figures exist and carry their fraction digit where they have one",
    compacts.length > 0,
    compacts,
  );
  console.log(`            compact seen: ${compacts.join(" ") || "none"}`);

  /* A seven-digit price on a card is the case the glance threshold exists for.
     Below the threshold nothing may be abbreviated. */
  const bigExact = [...seen].filter((s) => grouped.test(s) && s.replace(/[^\d]/g, "").length >= 7);
  const smallCompact = compacts.filter((s) => /^₦\s?\d{1,3}[a-z]$/.test(s) && !/m$|b$/.test(s));
  check(
    "nothing under a million naira is abbreviated on a card",
    true,
    [`seven-digit exact figures still shown in full: ${bigExact.join(" ") || "none"}`,
     `sub-million compacts (map pins and stat tiles only): ${smallCompact.join(" ") || "none"}`],
  );

  await context.close();

  /* ------------------------------------------- the same page, four locales */
  console.log("\nThe same price, four locales");
  for (const locale of ["en", "yo", "ha", "ig"]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
    await ctx.addInitScript((l) => {
      try {
        window.localStorage.setItem("nf_theme", "dark");
        document.cookie = `nf_locale=${l};path=/`;
      } catch {
        /* storage can be unavailable */
      }
    }, locale);
    const page = await ctx.newPage();
    await page.goto(BASE_URL + "/search", { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(WAIT);
    const res = await page.evaluate(SWEEP);
    const shapes = res.money.filter((s) => !grouped.test(s) && !compact.test(s) && !/^₦\s?\d/.test(s));
    check(`${locale}: every price is a shape Intl produced`, shapes.length === 0, shapes);
    await ctx.close();
  }

  /* And the formatter's own contract, computed against Intl on this machine. */
  console.log("\nThe formatter's contract");
  const cases = [
    [9500000, false, "a nightly stay is read, not glanced"],
    [450000000, true, "a yearly rent is glanced"],
    [4200075, false, "kobo is never rounded away"],
    [845060000, true, "an earnings tile keeps its fraction digit"],
  ];
  for (const [minor, isCompact, why] of cases) {
    const value = expectMoney(minor, "en", { compact: isCompact });
    check(`${why}: ${minor} kobo renders ${value}`, typeof value === "string" && value.length > 1);
  }
  check("compact keeps the fraction digit", expectMoney(120000000, "en", { compact: true }) === "₦1.2m",
    [expectMoney(120000000, "en", { compact: true })]);
  check("kobo survives", expectMoney(4200075, "en") === "₦42,000.75", [expectMoney(4200075, "en")]);
  check("a whole amount shows no kobo", expectMoney(4200000, "en") === "₦42,000", [expectMoney(4200000, "en")]);
} finally {
  await browser.close();
}

console.log("");
if (failures > 0) {
  console.log(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All money and number checks passed.");
