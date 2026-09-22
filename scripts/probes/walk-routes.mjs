/*
 * WALK EVERY ROUTE LIKE A PERSON, AND WRITE DOWN WHAT BROKE.
 *
 * Not a test. A walk. It opens each route of the product on a PRODUCTION server
 * in a real browser and records four things that a green light has hidden on
 * this platform before:
 *
 *   1. THE HTTP STATUS, because nothing else asked for it.
 *   2. WHERE THE BROWSER LANDED, because `verify-shots.mjs` once wrote five
 *      PNGs of the sign-in screen under five other routes' names by never
 *      comparing `page.url()` to the path it asked for.
 *   3. THE `[data-nf-not-found]` MARKER, because a Next.js layout `notFound()`
 *      answers HTTP 200 with the not-found body, so a status check alone reads
 *      a missing page as a healthy one.
 *   4. WHETHER ANYTHING WAS DRAWN, counted as visible text characters and
 *      painted pixels, because "it rendered" and "it has content" are two
 *      different claims and only the first has ever been checked here.
 *
 * Console errors, page errors and failed sub-requests are collected per route
 * as well, because a screen that draws and throws is a screen that broke.
 *
 * Usage:
 *   node scripts/probes/walk-routes.mjs --base http://127.0.0.1:3971 --out walk.json
 *   node scripts/probes/walk-routes.mjs --base ... --routes /,/search --theme light
 */
import { chromium } from "playwright-core";
import { readdirSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const arg = (n, d = null) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const BASE = (arg("base", "http://127.0.0.1:3971")).replace(/\/$/, "");
const OUT = arg("out", null);
const THEME = arg("theme", "dark");
const WIDTH = Number(arg("width", "390"));
const REPO = resolve(new URL("../..", import.meta.url).pathname);
const APP = resolve(REPO, "apps/web/src/app");

/* Real ids from the live catalogue, so a dynamic route is opened on a row that
   exists rather than on a uuid that never did. A 404 on an invented id says
   nothing about the screen. */
const SAMPLES = {
  "[id]": "ed000000-0000-4000-8000-000000000003",
  "[listingId]": "ed000000-0000-4000-8000-000000000003",
  "[accommodationId]": "ea000000-0000-4000-8000-000000000001",
  "[businessId]": "eb000000-0000-4000-8000-000000000001",
  "[inspectionId]": "ed000000-0000-4000-8000-000000000003",
  "[handle]": "ada",
  "[slug]": "lekki",
  "[reference]": "VL-FVHYAR",
  "[token]": "probe-token",
  "[...rest]": "x",
};

function productRoutes() {
  const out = [];
  const walk = (dir, url) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      if (e.name === "(dev)" || e.name.startsWith("_") || e.name === "api") continue;
      const seg = e.name.startsWith("(") ? "" : `/${e.name}`;
      const next = resolve(dir, e.name);
      if (existsSync(resolve(next, "page.tsx"))) out.push(`${url}${seg}` || "/");
      walk(next, `${url}${seg}`);
    }
  };
  if (existsSync(resolve(APP, "page.tsx"))) out.push("/");
  walk(APP, "");
  return [...new Set(out)].sort();
}

const fill = (route) =>
  route.replace(/\[[^\]]+\]/g, (m) => SAMPLES[m] ?? encodeURIComponent(m.slice(1, -1)));

const ROUTES = (arg("routes", null) ?? productRoutes().join(","))
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean);

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
});
const context = await browser.newContext({
  viewport: { width: WIDTH, height: 844 },
  deviceScaleFactor: 1,
  colorScheme: THEME,
});
await context.addInitScript((t) => {
  try {
    window.localStorage.setItem("nf_theme", t);
  } catch {
    /* storage-blocked contexts still get the attribute below */
  }
}, THEME);

const rows = [];
for (const route of ROUTES) {
  const asked = fill(route);
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const badRequests = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text().slice(0, 220));
  });
  page.on("pageerror", (e) => pageErrors.push(String(e.message).slice(0, 220)));
  page.on("requestfailed", (r) => badRequests.push(`${r.method()} ${r.url().slice(0, 120)}`));
  page.on("response", (r) => {
    if (r.status() >= 400 && r.request().resourceType() !== "document")
      badRequests.push(`${r.status()} ${r.url().slice(0, 120)}`);
  });
  const row = { route, asked, theme: THEME };
  try {
    const res = await page.goto(BASE + asked, { waitUntil: "networkidle", timeout: 45_000 });
    row.status = res?.status() ?? 0;
    row.landed = new URL(page.url()).pathname + (new URL(page.url()).search || "");
    row.redirected = (row.landed.split("?")[0].replace(/\/$/, "") || "/") !==
      (asked.replace(/\/$/, "") || "/");
    await page.waitForTimeout(700);
    const seen = await page.evaluate(() => ({
      notFound: !!document.querySelector("[data-nf-not-found]"),
      chars: (document.body?.innerText ?? "").replace(/\s+/g, " ").trim().length,
      title: document.title,
      h1: (document.querySelector("h1, [role=heading]")?.textContent ?? "").trim().slice(0, 90),
      firstWords: (document.body?.innerText ?? "").replace(/\s+/g, " ").trim().slice(0, 160),
      scrollH: document.documentElement.scrollHeight,
      /* Banned in UI copy by rule 13, and a lie on a live screen if drawn. */
      banned: ["coming soon", "lorem", "not live", "sample data"].filter((w) =>
        (document.body?.innerText ?? "").toLowerCase().includes(w),
      ),
    }));
    Object.assign(row, seen);
    /* Was anything actually painted, or is this a full-height blank? */
    const shot = await page.screenshot({ type: "png" });
    row.pngBytes = shot.length;
  } catch (e) {
    row.error = String(e.message).split("\n")[0].slice(0, 200);
  }
  row.consoleErrors = consoleErrors.slice(0, 5);
  row.pageErrors = pageErrors.slice(0, 5);
  row.badRequests = [...new Set(badRequests)].slice(0, 5);
  rows.push(row);
  await page.close();
  const flag =
    row.error ? "OPEN-FAILED" :
    row.notFound ? "NOT-FOUND-AT-200" :
    row.redirected ? `-> ${row.landed}` :
    row.status !== 200 ? `HTTP ${row.status}` :
    (row.chars ?? 0) < 40 ? "EMPTY" :
    row.pageErrors.length ? "THREW" : "ok";
  console.log(`${flag.padEnd(22)} ${asked}${row.h1 ? `   [${row.h1}]` : ""}`);
}
await browser.close();
if (OUT) writeFileSync(OUT, JSON.stringify(rows, null, 2));

const bad = rows.filter(
  (r) => r.error || r.notFound || r.status !== 200 || (r.chars ?? 0) < 40 || r.pageErrors.length,
);
console.log(`\n${rows.length} routes walked. ${bad.length} did not come up clean.`);
console.log(`redirected elsewhere: ${rows.filter((r) => r.redirected).length}`);
console.log(`not-found body at HTTP 200: ${rows.filter((r) => r.notFound).length}`);
console.log(`threw in the page: ${rows.filter((r) => r.pageErrors.length).length}`);
console.log(`banned copy on screen: ${rows.filter((r) => (r.banned ?? []).length).length}`);
