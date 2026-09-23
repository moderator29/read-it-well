/*
 * LIVE PROOF, SIGNED IN AS THE QA MEMBER: THE HOME GROUP'S ROUTES AGAINST THE
 * REAL PROJECT (the platform sweep, worker "sweep-home"). READ ONLY: it signs
 * in, opens each route and shoots it. It never saves, sends, books, asks the
 * assistant anything or presses a submit control after sign-in.
 *
 * Credentials come from the environment only, never from the repository:
 *   QA_MEMBER_EMAIL, QA_MEMBER_PASSWORD
 *
 *   node scripts/design/session-b-shots/home-group-live.mjs http://127.0.0.1:3186 <out-dir>
 *
 * Against a production build (next build, next start) whose .env.local points
 * at the live project. Each route passes when it renders under the session
 * (no bounce to sign-in) and shows none of the failure copy.
 * `/price/area/[id]` is opened with an id no share holds, because the live
 * table holds no share at all: the proof is the route's honest "missing"
 * state; the filled card is proved from a fixture in the harness.
 */
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const [, , base = "http://127.0.0.1:3186", out = "live-home"] = process.argv;
const { QA_MEMBER_EMAIL, QA_MEMBER_PASSWORD } = process.env;
if (!QA_MEMBER_EMAIL || !QA_MEMBER_PASSWORD) {
  console.error("WAITING ON QA CREDENTIALS: set QA_MEMBER_EMAIL and QA_MEMBER_PASSWORD.");
  process.exit(2);
}
mkdirSync(out, { recursive: true });
const RENTAL = "ed000000-0000-4000-8000-00000000000c";
const ROUTES = [
  ["home", "/home"],
  ["stays", "/stays"],
  ["search", "/search"],
  ["listing-rent", `/listing/${RENTAL}`],
  ["move-in", `/rent/move-in/${RENTAL}`],
  ["price", "/price"],
  ["price-area-missing", `/price/area/${randomUUID()}`],
  ["assistant", "/assistant"],
];
const FAILS = ["This did not load", "Something went wrong", "Application error", "could not load"];
const steps = [];
let failed = 0;
const record = (step, pass, detail, shot) => {
  steps.push({ step, pass, detail, shot, at: new Date().toISOString() });
  if (!pass) failed += 1;
  console.log(`${pass ? "PASS" : "FAIL"} ${step}: ${detail}`);
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
const page = await ctx.newPage();

await page.goto(`${base}/sign-in/email?next=${encodeURIComponent("/home")}`, { waitUntil: "networkidle" });
await page.fill("#email", QA_MEMBER_EMAIL);
await page.fill("#password", QA_MEMBER_PASSWORD);
await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 30_000 }), page.click('button[type="submit"]')]);
await page.waitForLoadState("networkidle");
record("sign in", !new URL(page.url()).pathname.startsWith("/sign-in"), `landed ${new URL(page.url()).pathname}`, null);

for (const [name, path] of ROUTES) {
  await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(800);
  const landed = new URL(page.url()).pathname;
  const text = (await page.locator("main").innerText().catch(() => "")).replace(/\s+/g, " ");
  const fail = FAILS.find((f) => text.includes(f));
  const file = `${out}/${name}-390.jpg`;
  await page.screenshot({ path: file, fullPage: true, type: "jpeg", quality: 78 });
  record(name, !landed.startsWith("/sign-in") && !fail, `landed ${landed}${fail ? `, shows "${fail}"` : ""}`, file);
}

writeFileSync(`${out}/steps.json`, JSON.stringify({ base, steps }, null, 2));
await browser.close();
process.exit(failed ? 1 : 0);
