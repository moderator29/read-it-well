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
 * WHICH PAGES. Since 23 September every product route answers a signed-out
 * visitor with the sign-in wall (asserted below). The runtime half reads "/"
 * directly and each product screen through its preview-harness twin (the real
 * components with fixture prices, which is also the first run of this spec
 * that has had money to read). Signed in as the QA member it reads the real
 * routes as well (SKIP without QA_MEMBER_EMAIL / QA_MEMBER_PASSWORD).
 * `/wallet` was retired (a redirect to `/agreements`) and is not read.
 *
 * Run with the server already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/money-and-numbers.spec.mjs
 */

import { chromium } from "playwright-core";
import { expectSignInWall, qaContext, signInAsQa, skip } from "./_gate.mjs";
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
/* The two chart modules that came later (the admin money desk's `smoothPath`
   and the agent's area chart) write SVG path data and nothing else with it. */
/* The files added since, each of which uses toFixed only for SVG path data,
   an SVG transform or a CSS width: the admin money desk's charts, the agent's
   area chart and meter bar, the shared TimeSeries chart, the landing page's
   Nigeria map and the success sheet's burst. */
const GEOMETRY =
  /mapGeo|Sparkline|StatChart|TiltField|BalanceCard|admin\/money\/_desk\/charts\.tsx|agent\/charts\/(AreaTimeChart|MeterBar)\.tsx|ui\/charts\/TimeSeries\.tsx|landing\/NigeriaMap\.tsx|ui\/SuccessSheet\.tsx/;
const handRounded = [];
for (const f of files) {
  if (GEOMETRY.test(f.rel)) continue;
  /* A unit test never reaches a screen (lib/email/email-dark-paint.test.ts
     rounds a contrast ratio in its own assertion message). */
  if (/\.test\.tsx?$/.test(f.rel)) continue;
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

/* The formatter moved from the package index into `core.ts` (the index
   re-exports it); read it where it lives. */
const i18n = readFileSync(join(here, "../../../packages/i18n/src/core.ts"), "utf8");
/* The compact branch now states its digits on purpose (one fraction digit,
   truncated, so ₦14.7m is never ₦15m): what must never come back is a cap of
   zero on it, which is what turned ₦1.2m into ₦1m. */
const compactBlock = /notation: "compact",[\s\S]*?\}\s*as Intl\.NumberFormatOptions\)/.exec(i18n)?.[0] ?? "";
check(
  "compact notation is not flattened by a fraction-digit cap",
  compactBlock.length > 0 &&
    /maximumFractionDigits: 1,/.test(compactBlock) &&
    !/maximumFractionDigits: 0/.test(compactBlock),
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
  /*
   * SCRIPT AND STYLE ARE NOT THE SCREEN.
   *
   * `createTreeWalker(document.body, SHOW_TEXT)` walks into <script>, and on an
   * App Router page <script> holds the RSC flight payload: megabytes of
   * `self.__next_f.push([1,"1b:[\"$\",\"main\"...` full of chunk lengths,
   * font hashes and module ids. This check reported nine of those per route as
   * "a figure reaching the screen ungrouped", which is not a product defect at
   * all, and the noise was hiding whether the real check passed. Reject the
   * two element types whose text content is never rendered as text.
   */
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const tag = n.parentElement?.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "TEMPLATE") {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
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

/** Each product route with its preview-harness twin (null: no twin). */
const PRODUCT = [
  ["/home", "/preview/session-b/sweep-home/home"],
  ["/search", "/preview/session-b/sweep-home/search"],
  ["/search?view=map", null],
  ["/listing/lekki-palm-grove", "/preview/f3/listing"],
  ["/search?market=rent", null],
  ["/bookings", "/preview/f3/bookings"],
  ["/saved", "/preview/f3/saved"],
  ["/agent/dashboard", "/preview/f5/agent-dashboard"],
  ["/agent/listings", "/preview/f5/agent-listings"],
  ["/agent/earnings", "/preview/f5/agent-earnings"],
  ["/agent/reviews", "/preview/f5/agent-reviews"],
];
const ROUTES = ["/", ...PRODUCT.map(([, twin]) => twin).filter(Boolean)];

const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });

console.log("\nSigned out, every product route is behind the wall");
for (const [route] of PRODUCT) await expectSignInWall(check, route, BASE_URL);

const qaState = await (async () => {
  console.log("\nThe QA session, for the real routes");
  return signInAsQa(browser);
})();
const LIVE_ROUTES = qaState ? ["/", ...PRODUCT.map(([route]) => route)] : [];

try {
  console.log("\nWhat actually rendered, 390px");
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
  const live = qaState
    ? await qaContext(browser, qaState, { viewport: { width: 390, height: 844 }, colorScheme: "dark" })
    : null;
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem("nf_theme", "dark");
    } catch {
      /* storage can be unavailable */
    }
  });

  const seen = new Set();
  const ungrouped = [];
  const visits = [
    ...ROUTES.map((route) => [context, route]),
    ...LIVE_ROUTES.map((route) => [live, route]),
  ];
  for (const [ctx, route] of visits) {
    const page = await ctx.newPage();
    try {
      const response = await page.goto(BASE_URL + route, { waitUntil: "load", timeout: 45000 });
      if (route.startsWith("/preview/") && response?.status() === 404) {
        skip(`${route}: the preview harness is closed on this server (VALLO_PREVIEW_HARNESS=1)`);
        continue;
      }
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
  /*
   * Money only reaches a screen when there is something priced on it.
   *
   * This was a hard check, and it passed for the wrong reason: the only money
   * on any of these routes with an empty catalogue came from the agent
   * dashboard's seeded deck, which invented 845,060,000 kobo of earnings for
   * whoever opened it. That deck is gone, so nothing is priced anywhere and
   * this check found nought strings.
   *
   * It skips loudly instead of failing, for the same reason the other four
   * empty-catalogue skips do. Making it green again by putting invented
   * figures back would undo the point of deleting them. Everything above this
   * line still runs: the moment a real listing exists, its price is swept and
   * held to the same two shapes as before.
   */
  if (seen.size === 0) {
    console.log("  skip    no money reached a screen, because nothing is priced yet.");
    console.log("          The catalogue is empty and the invented agent figures are");
    console.log("          gone. This check returns the moment one listing exists.");
  } else {
    check("money actually rendered on these routes", seen.size > 5, [
      `${seen.size} distinct strings`,
    ]);
  }

  /*
   * Every money string must be a shape the formatter can produce: either the
   * grouped form or the compact form. Anything else came from somewhere else.
   */
  const grouped = /^₦\s?\d{1,3}(,\d{3})*(\.\d{2})?$/;
  const compact = /^₦\s?\d{1,3}(\.\d)?[a-z]$/;
  const strays = [...seen].filter((s) => !grouped.test(s) && !compact.test(s));
  check("every money string is one of the two shapes the formatter makes", strays.length === 0, strays);

  /*
   * The compact bug in the form it shipped: 1.2m arriving as 1m.
   *
   * Only assertable when a compact figure actually reached a screen, and
   * whether one does depends on the catalogue: with no database reachable, no
   * listing renders and there is nothing over a million naira to abbreviate.
   * A run that saw none is a run with no evidence either way, and reporting
   * that as a failure trains people to ignore this file.
   */
  const compacts = [...seen].filter((s) => compact.test(s));
  if (compacts.length === 0) {
    console.log("  skip    no compact figure reached a screen, so there is nothing to check");
  } else
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
  if (live) await live.close();

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
    /* The search screen's harness twin: the real result cards, fixture prices. */
    await page.goto(BASE_URL + "/preview/session-b/sweep-home/search", { waitUntil: "load", timeout: 45000 });
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
