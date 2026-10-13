#!/usr/bin/env node
/**
 * TIME TO INTERACTIVE ON THE FRONT DOOR (D60/D61, 6 October 2026).
 *
 * The weight budget (`check-weight.mjs`) counts bytes, which is a proxy. What
 * the bytes stand for is how long a member on a mid-range Android, on a
 * congested mobile link, waits before the page answers a tap. This measures
 * that directly, on a production build:
 *
 *     BASE_URL=http://localhost:3210 node scripts/check-tti.mjs
 *     BASE_URL=... node scripts/check-tti.mjs --runs 5 --routes /,/sign-in --json tti.json
 *
 * THE DEVICE AND THE LINK are Lighthouse's mobile defaults, applied the way
 * Lighthouse applies them when it throttles in DevTools ("devtools"
 * throttling): CPU slowed 4x through the Chrome DevTools Protocol, and "Slow
 * 4G" (150 ms round trip, 1.6 Mbps down, 750 Kbps up) emulated per request
 * as 562.5 ms of latency, 1.47 Mbps down and 675 Kbps up (Lighthouse's own
 * request-level adjustment of those link numbers). Viewport 390x844 at 1.75
 * device pixels per CSS pixel, touch, a mobile user agent, and a cold cache:
 * a fresh browser context per run with the HTTP cache disabled.
 *
 * TIME TO INTERACTIVE follows Lighthouse's observed definition: from first
 * contentful paint, find the first five-second window with no long task (a
 * main-thread task over 50 ms) and no more than two requests in flight; TTI
 * is the end of the last long task before that window, or first contentful
 * paint when there was none. Total blocking time is the sum, over long tasks
 * between first contentful paint and TTI, of each task's time beyond 50 ms.
 * Long tasks come from the page's own `longtask` observer (registered before
 * any script runs), requests from the protocol's network events.
 *
 * Each route is loaded `--runs` times (default 3) and the median of each
 * metric is reported. A route fails only when `perf-budget.json` carries a
 * `tti` map with a number for it and the median TTI is over that number; with
 * no budget the script reports and exits 0, so it can land before budgets are
 * recorded.
 *
 * CI: the front-door job already builds, starts `next start` and installs
 * Chromium, which is everything this needs; add a step running this file with
 * BASE_URL set. A shared runner's CPU differs from a phone's and from run to
 * run, so a budget should sit well above the recorded median (the CPU factor
 * multiplies whatever the runner's own speed is), and the job should report
 * the medians in its log so drift is visible before it fails.
 */

import { chromium } from "playwright-core";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUDGET_FILE = join(HERE, "..", "perf-budget.json");

/* Lighthouse's mobile throttling constants (constants.js, mobileSlow4G). */
export const SLOW_4G = { rttMs: 150, throughputKbps: 1.6 * 1024, uploadKbps: 750 };
export const CPU_SLOWDOWN = 4;
const LATENCY_FACTOR = 3.75;
const THROUGHPUT_FACTOR = 0.9;

export const NETWORK = {
  offline: false,
  latency: SLOW_4G.rttMs * LATENCY_FACTOR,
  downloadThroughput: Math.floor((SLOW_4G.throughputKbps * 1024 * THROUGHPUT_FACTOR) / 8),
  uploadThroughput: Math.floor((SLOW_4G.uploadKbps * 1024 * THROUGHPUT_FACTOR) / 8),
};

const QUIET_MS = 5_000;
const LONG_TASK_MS = 50;
const MAX_INFLIGHT = 2;

/**
 * Lighthouse's observed TTI from long tasks ([start, end] in ms), requests
 * ([start, end], end Infinity while open) and first contentful paint.
 * Returns null when no quiet window has arrived yet.
 */
export function timeToInteractive({ fcp, longTasks, requests, now }) {
  const lt = longTasks.filter(([, end]) => end > fcp).sort((a, b) => a[0] - b[0]);
  const inflightMax = (from, to) => {
    const edges = [];
    for (const [s, e] of requests) {
      if (e <= from || s >= to) continue;
      edges.push([Math.max(s, from), 1], [Math.min(e, to), -1]);
    }
    edges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let n = 0;
    let max = 0;
    for (const [, d] of edges) {
      n += d;
      max = Math.max(max, n);
    }
    return max;
  };
  const starts = [fcp, ...lt.map(([, e]) => e), ...requests.map(([, e]) => e).filter((e) => Number.isFinite(e) && e > fcp)]
    .filter((t) => t >= fcp)
    .sort((a, b) => a - b);
  for (const t of starts) {
    if (t + QUIET_MS > now) return null;
    if (lt.some(([s, e]) => s < t + QUIET_MS && e > t)) continue;
    if (inflightMax(t, t + QUIET_MS) > MAX_INFLIGHT) continue;
    const before = lt.filter(([, e]) => e <= t);
    return before.length ? Math.max(fcp, before[before.length - 1][1]) : fcp;
  }
  return null;
}

export function totalBlockingTime(longTasks, from, to) {
  let tbt = 0;
  for (const [s, e] of longTasks) {
    const start = Math.max(s, from);
    const end = Math.min(e, to);
    if (end - start > LONG_TASK_MS) tbt += end - start - LONG_TASK_MS;
  }
  return tbt;
}

const median = (xs) => {
  const v = xs.filter((x) => typeof x === "number").sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};

const OBSERVE = `(() => {
  const w = window;
  w.__tti = { longTasks: [], lcp: 0 };
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) w.__tti.longTasks.push([e.startTime, e.startTime + e.duration]);
    }).observe({ type: "longtask", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) w.__tti.lcp = Math.max(w.__tti.lcp, e.startTime);
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch (e) {}
})();`;

const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";

export async function once(browser, base, path) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1.75,
    isMobile: true,
    hasTouch: true,
    userAgent: ANDROID_UA,
  });
  await context.addCookies([{ name: "vallo_first_run", value: "seen", url: base }]);
  await context.addInitScript(OBSERVE);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", NETWORK);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_SLOWDOWN });

  /* Request times in protocol seconds; mapped to page time from the document's own request. */
  const open = new Map();
  const done = [];
  const bytes = { total: 0, script: 0, stylesheet: 0 };
  const kind = new Map();
  let docStart = null;
  cdp.on("Network.requestWillBeSent", (e) => {
    if (e.request.url.startsWith("data:")) return;
    if (docStart === null && e.type === "Document") docStart = e.timestamp;
    open.set(e.requestId, e.timestamp);
    kind.set(e.requestId, (e.type ?? "").toLowerCase());
  });
  const close = (e) => {
    const s = open.get(e.requestId);
    if (s === undefined) return;
    open.delete(e.requestId);
    done.push([s, e.timestamp]);
    const n = e.encodedDataLength ?? 0;
    bytes.total += n;
    const k = kind.get(e.requestId);
    if (k === "script" || k === "stylesheet") bytes[k] += n;
  };
  cdp.on("Network.loadingFinished", close);
  cdp.on("Network.loadingFailed", close);

  await page.goto(base + path, { waitUntil: "load", timeout: 180_000 });
  const landed = new URL(page.url()).pathname;

  let result = null;
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(1_000);
    const s = await page.evaluate(() => {
      const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? null;
      return { fcp, now: performance.now(), longTasks: window.__tti.longTasks, lcp: window.__tti.lcp };
    });
    if (s.fcp === null || docStart === null) continue;
    /* Protocol seconds to page ms: the document request is page time ~0. */
    const toPage = (t) => (t - docStart) * 1000;
    const requests = [...done.map(([a, b]) => [toPage(a), toPage(b)]), ...[...open.values()].map((a) => [toPage(a), Infinity])];
    const tti = timeToInteractive({ fcp: s.fcp, longTasks: s.longTasks, requests, now: s.now });
    if (tti !== null) {
      result = {
        fcp: s.fcp,
        lcp: s.lcp || null,
        tti,
        tbt: totalBlockingTime(s.longTasks, s.fcp, tti),
        longTasks: s.longTasks.length,
      };
      break;
    }
  }
  await context.close();
  return { ...(result ?? { fcp: null, lcp: null, tti: null, tbt: null, longTasks: null }), landed, bytes };
}

async function main(argv) {
  const base = process.env.BASE_URL;
  if (!base) {
    console.error("tti: set BASE_URL to the production server under test.");
    process.exit(2);
  }
  const arg = (name, fallback) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : fallback;
  };
  const runs = Number(arg("--runs", "3"));
  const routes = arg("--routes", "/,/sign-in").split(",");
  const jsonOut = arg("--json", null);
  let budgets = {};
  if (existsSync(BUDGET_FILE)) budgets = JSON.parse(readFileSync(BUDGET_FILE, "utf8")).tti ?? {};

  const executablePath = existsSync("/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
    ? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
    : undefined;
  const browser = await chromium.launch({ executablePath });
  const report = [];
  const failures = [];
  try {
    for (const path of routes) {
      const samples = [];
      for (let i = 0; i < runs; i++) samples.push(await once(browser, base, path));
      const row = {
        path,
        landed: samples[0].landed,
        runs: samples,
        median: {
          fcp: median(samples.map((s) => s.fcp)),
          lcp: median(samples.map((s) => s.lcp)),
          tti: median(samples.map((s) => s.tti)),
          tbt: median(samples.map((s) => s.tbt)),
          kb: median(samples.map((s) => Math.round(s.bytes.total / 1024))),
        },
      };
      report.push(row);
      const ms = (x) => (x === null ? "n/a" : `${Math.round(x)} ms`);
      const m = row.median;
      console.log(
        `  ${path.padEnd(12)} TTI ${ms(m.tti).padStart(9)}  TBT ${ms(m.tbt).padStart(8)}  FCP ${ms(m.fcp).padStart(8)}  LCP ${ms(m.lcp).padStart(8)}  ${m.kb} KB  (median of ${runs}; TTI runs ${samples.map((s) => ms(s.tti)).join(", ")})`,
      );
      const budget = budgets[path];
      if (typeof budget === "number" && (m.tti === null || m.tti > budget)) failures.push(`${path}: TTI ${ms(m.tti)} over ${budget} ms`);
    }
  } finally {
    await browser.close();
  }
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ base, network: NETWORK, cpu: CPU_SLOWDOWN, report }, null, 2));
  if (failures.length) {
    console.error(`\nTTI over budget:\n  ${failures.join("\n  ")}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
