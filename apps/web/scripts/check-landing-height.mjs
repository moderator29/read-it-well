#!/usr/bin/env node
/**
 * A15. THE LANDING'S HEIGHT, HELD TO A RATCHET.
 *
 * UIUX item 9 set the landing's targets (under 8,000px at 390, under 6,500px
 * at 1440). The page is above both, so `perf-budget.json` "heights" holds a
 * ceiling at today's height (`maxPx`) beside the target (`targetPx`): a pass
 * that makes the page taller fails, and the ceiling is lowered as the page
 * comes down. Measured with motion off and reduced motion emulated, after the
 * network settles, so a reveal half way through cannot change the number.
 *
 *     BASE_URL=http://localhost:3210 node scripts/check-landing-height.mjs
 */
import { chromium } from "playwright-core";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const budget = JSON.parse(readFileSync(join(HERE, "..", "perf-budget.json"), "utf8"));

export function overHeight(measured, maxPx) {
  return typeof maxPx === "number" && measured > maxPx;
}

async function main() {
  const base = process.env.BASE_URL;
  if (!base) {
    console.error("height: set BASE_URL to the server under test.");
    process.exit(2);
  }
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined) });
  const failures = [];
  try {
    for (const row of budget.heights ?? []) {
      const context = await browser.newContext({ viewport: { width: row.width, height: row.width < 600 ? 844 : 900 }, reducedMotion: "reduce" });
      await context.addCookies([
        { name: "nf_motion", value: "off", url: base },
        { name: "vallo_first_run", value: "seen", url: base },
      ]);
      const page = await context.newPage();
      await page.goto(base + row.path, { waitUntil: "networkidle", timeout: 120_000 });
      /* Let hydration finish: with motion off the hands-on deck becomes its
         still row once the page has hydrated, and measuring before that read
         the server's deck on one run and the still row on the next. */
      await page.waitForTimeout(1500);
      const px = await page.evaluate(() => document.documentElement.scrollHeight);
      const verdict = overHeight(px, row.maxPx) ? "OVER" : "ok  ";
      console.log(`  ${verdict}  ${row.path} at ${row.width}: ${px}px (ceiling ${row.maxPx}, target ${row.targetPx})`);
      if (overHeight(px, row.maxPx)) failures.push(`${row.path}@${row.width}`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
  if (failures.length > 0) {
    console.error(`height: over the ceiling: ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log("height: within the ceiling.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exit(2);
  });
}
