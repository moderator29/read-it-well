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
 */

import { chromium } from "playwright-core";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUDGET_FILE = join(HERE, "..", "perf-budget.json");

export function overBudget(measuredKb, budgetKb) {
  return typeof budgetKb === "number" && measuredKb > budgetKb;
}

export function recordedBudget(measuredKb) {
  return Math.round(measuredKb * 0.8);
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

async function measure(browser, base, path, cookies) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  await context.addCookies([{ name: "vallo_first_run", value: "seen", url: base }, ...cookies]);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  let bytes = 0;
  cdp.on("Network.loadingFinished", (event) => {
    bytes += event.encodedDataLength ?? 0;
  });
  await page.goto(base + path, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForTimeout(1_000);
  const landed = new URL(page.url()).pathname;
  await context.close();
  return { kb: Math.round(bytes / 1024), landed };
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
      const { kb, landed } = await measure(browser, base, route.path, route.signedIn ? cookies : []);
      const note = landed !== route.path ? ` (landed on ${landed})` : "";
      const verdict = overBudget(kb, route.budgetKb) ? "OVER" : "ok  ";
      console.log(`  ${verdict}  ${route.path}  ${kb} KB  budget ${route.budgetKb ?? "unset"}${note}`);
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
