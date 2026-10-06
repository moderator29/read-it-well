#!/usr/bin/env node
/**
 * THE WEIGHT BUDGET. V-80.
 *
 * Nobody could say whether the product got heavier this week: weight was
 * measured by hand, once, per session. This loads each route in
 * `perf-budget.json` cold, at 390x844, in the preinstalled Chromium, sums the
 * bytes that crossed the wire (the Chrome DevTools Protocol's
 * `encodedDataLength` for every response), and fails any route over its
 * budget.
 *
 *     BASE_URL=https://<preview> node scripts/check-weight.mjs
 *     BASE_URL=https://<preview> node scripts/check-weight.mjs --record
 *
 * `--record` writes each budget as the measured weight minus 20 percent, the
 * entry's starting rule, and should be run once against a PRODUCTION build
 * (a dev server ships unminified code and would set budgets nobody can miss).
 * A budget of null is reported and never fails, so the file can land before
 * the first measurement. Signed-in routes need a session: pass the cookie
 * line in `WEIGHT_COOKIE` (CI can mint one with `tests/gate-stub-session.mjs`);
 * without it they are skipped and said to be skipped.
 *
 * It measures bytes, not time: bytes are what a bundle is charged for and
 * they do not wobble with the runner's load. Time is measured in the field
 * (`/api/vitals`, the Field speed desk).
 *
 * ---------------------------------------------------------------------------
 * WHY THIS NO LONGER USES `waitUntil: "networkidle"`, AND WHAT THE 79 KB WAS.
 *
 * The same production build, measured repeatedly, used to move by up to 79 KB
 * on one route: /for-agents read 552, 482, 482 and 561 across four CI runs and
 * /welcome read 658, 658, 728 and 735. `perf-budget.json` recorded the guess
 * that this was the instrument settling at different points while lazy assets
 * arrived. The guess was half right about the blame and wrong about the
 * mechanism, and the mechanism is what made the fix possible.
 *
 * It was measured, not reasoned about. Ten loads of /welcome, logging bytes per
 * URL, produced nine readings between 660 and 673 and one of 730. The outlier
 * had fetched two chunks the other nine never fetched at all: a 64 KB chunk
 * holding the Supabase browser client and an 8 KB chunk holding the sign-up
 * terms control. Neither belongs to /welcome. Both belong to /sign-in and
 * /sign-up, and they arrived because NEXT PREFETCHES THE ROUTES THIS PAGE
 * LINKS TO. Tagging requests by header confirmed it on every route: /check
 * issues twelve router fetches for /, /start, /search, /about and /r, /sign-in
 * issues sixteen for /terms, /privacy, /eula, /forgot-password and
 * /sign-in/code. Not one tagged request was the page's own data.
 *
 * So the extra bytes were never late, they were CONDITIONAL. Waiting longer
 * does not make a prefetch happen: a further seven seconds of quiet after
 * `networkidle` added nothing on any of the nine clean runs. Whether the
 * router schedules a link's prefetch before the measurement ends depends on
 * viewport intersection and idle timing, which is a coin toss. That is why
 * widening the budgets could never converge, and why "wait for longer" would
 * not have fixed it either.
 *
 * THE FIX, AND THE JUDGEMENT INSIDE IT. Router prefetches are aborted and
 * therefore not counted (`isRouterPrefetch` below), so each route is charged
 * for its own bytes and nothing else. This is a deliberate accounting choice,
 * not a trick to make a number smaller: a prefetch of /search is /search's
 * weight, it already has its own line in `perf-budget.json`, and counting it
 * against /check as well both double-counted it and made /check's budget
 * sensitive to a page it merely links to. Every tagged request was verified to
 * be a neighbouring route rather than the page's own content before any of
 * them was blocked. What this gate no longer answers is "how many bytes does a
 * visitor on this page pull in total, warming the next tap": that question is
 * worth asking and is not a per-route ratchet.
 *
 * `networkidle` is replaced by `load` plus an explicit settle of our own: zero
 * requests in flight and QUIET_MS of silence, capped at SETTLE_CAP_MS so a
 * page that polls can never hang the gate. Each route is then measured
 * SAMPLES times in fresh contexts and the HIGHEST reading is the one compared
 * against the budget, so a budget is never set under a weight the route has
 * been seen to reach.
 *
 * MEASURED, FIVE PASSES EACH, ON ONE PRODUCTION BUILD. Spread per route
 * BEFORE, in KB: / 9, /welcome 70, /sign-in 21, /sign-up/email 21, /check 12,
 * /move-in-cost 13, /for-agents 22, /guides/avoiding-rental-scams 6. AFTER:
 * 0, 0, 0, 0, 0, 2, 0, 0. The budgets in `perf-budget.json` were re-recorded
 * on the quiet instrument and every one of them came down.
 */

import { chromium } from "playwright-core";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUDGET_FILE = join(HERE, "..", "perf-budget.json");

/** Silence, in ms, with nothing in flight, that ends a measurement. */
const QUIET_MS = 1_500;
/** The longest a single route may be watched, however talkative it is. */
const SETTLE_CAP_MS = 15_000;
/** Readings per route, in fresh contexts. The highest one is the verdict. */
const SAMPLES = 2;

export function overBudget(measuredKb, budgetKb) {
  return typeof budgetKb === "number" && measuredKb > budgetKb;
}

export function recordedBudget(measuredKb) {
  return Math.round(measuredKb * 0.8);
}

/**
 * Is this request the router warming a DIFFERENT route?
 *
 * Next marks a prefetch with `Next-Router-Prefetch: 1` and every router fetch
 * with `RSC: 1` and an `_rsc` query. One of the twelve router fetches seen on
 * /check carried the RSC marks without the prefetch one, so all three are
 * treated the same: they are all fetches of another route's payload, and a
 * page's own document and assets carry none of them.
 */
export function isRouterPrefetch({ url, headers }) {
  if (headers["next-router-prefetch"] !== undefined) return true;
  if (headers.rsc !== undefined) return true;
  return /[?&]_rsc=/.test(url);
}

function cookiesFrom(line, base) {
  if (!line) return [];
  return line
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((pair) => {
      const at = pair.indexOf("=");
      return { name: pair.slice(0, at), value: pair.slice(at + 1), url: base };
    });
}

async function sample(browser, base, path, cookies) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  await context.addCookies([{ name: "vallo_first_run", value: "seen", url: base }, ...cookies]);
  const page = await context.newPage();
  let prefetches = 0;
  await page.route("**/*", (route) => {
    const request = route.request();
    if (isRouterPrefetch({ url: request.url(), headers: request.headers() })) {
      prefetches += 1;
      return route.abort();
    }
    return route.continue();
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  let bytes = 0;
  let inFlight = 0;
  let lastActivity = Date.now();
  const settled = () => {
    inFlight -= 1;
    lastActivity = Date.now();
  };
  cdp.on("Network.requestWillBeSent", () => {
    inFlight += 1;
    lastActivity = Date.now();
  });
  cdp.on("Network.loadingFinished", (event) => {
    bytes += event.encodedDataLength ?? 0;
    settled();
  });
  /* An aborted prefetch fails rather than finishing: it must still clear the
     in-flight count, or the settle below would run to its cap every time. */
  cdp.on("Network.loadingFailed", settled);
  await page.goto(base + path, { waitUntil: "load", timeout: 120_000 });
  const deadline = Date.now() + SETTLE_CAP_MS;
  for (;;) {
    await page.waitForTimeout(100);
    if (inFlight <= 0 && Date.now() - lastActivity >= QUIET_MS) break;
    if (Date.now() >= deadline) break;
  }
  const landed = new URL(page.url()).pathname;
  await context.close();
  return { kb: Math.round(bytes / 1024), landed, prefetches };
}

async function measure(browser, base, path, cookies) {
  const readings = [];
  let landed = path;
  let prefetches = 0;
  for (let i = 0; i < SAMPLES; i += 1) {
    const taken = await sample(browser, base, path, cookies);
    readings.push(taken.kb);
    landed = taken.landed;
    prefetches = Math.max(prefetches, taken.prefetches);
  }
  return { kb: Math.max(...readings), readings, landed, prefetches };
}

async function main(argv) {
  const base = process.env.BASE_URL;
  if (!base) {
    console.error("weight: set BASE_URL to the server under test.");
    process.exit(2);
  }
  const record = argv.includes("--record");
  const budget = JSON.parse(readFileSync(BUDGET_FILE, "utf8"));
  const cookies = cookiesFrom(process.env.WEIGHT_COOKIE, base);
  const executablePath = existsSync("/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
    ? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
    : undefined;
  const browser = await chromium.launch({ executablePath });
  const failures = [];
  try {
    for (const route of budget.routes) {
      if (route.signedIn && cookies.length === 0) {
        console.log(`  skip  ${route.path}  (signed-in route, no WEIGHT_COOKIE)`);
        continue;
      }
      const { kb, readings, landed, prefetches } = await measure(browser, base, route.path, route.signedIn ? cookies : []);
      const note = landed !== route.path ? ` (landed on ${landed})` : "";
      const spread = Math.max(...readings) - Math.min(...readings);
      /* Printed because it is the gate's own self-check: a spread that is not
         zero is the instrument wobbling again, and the budgets below assume it
         does not. The prefetch count is printed for the same reason: it says
         how many of another route's requests were kept out of this number. */
      const detail = ` [${readings.join("/")}, spread ${spread}, ${prefetches} prefetch dropped]`;
      const verdict = overBudget(kb, route.budgetKb) ? "OVER" : "ok  ";
      console.log(`  ${verdict}  ${route.path}  ${kb} KB  budget ${route.budgetKb ?? "unset"}${note}${detail}`);
      if (overBudget(kb, route.budgetKb)) failures.push(route.path);
      if (record) route.budgetKb = recordedBudget(kb);
    }
  } finally {
    await browser.close();
  }
  if (record) {
    writeFileSync(BUDGET_FILE, `${JSON.stringify(budget, null, 2)}\n`);
    console.log("weight: budgets recorded as measured minus 20 percent.");
  }
  if (failures.length > 0) {
    console.error(`weight: ${failures.length} route(s) over budget: ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log("weight: within budget.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error);
    process.exit(2);
  });
}
