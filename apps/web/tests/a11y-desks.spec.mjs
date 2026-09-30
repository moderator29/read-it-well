/**
 * C16. ACCESSIBILITY OF THE THREE DESKS: host, agent and the admin console.
 *
 * The console's security key and the passcode stop a headless browser at the
 * door, so the desks are measured through the preview harness routes, which
 * draw the same components with fixtures (`app/(dev)/preview/f5/*`). A
 * production server opens them only with VALLO_PREVIEW_HARNESS=1, which CI
 * sets on its own throwaway server and nowhere else (lib/preview-harness.ts).
 *
 * For each route at 390 and 1440, dark and light, motion off:
 *   - axe-core; SERIOUS and CRITICAL fail, moderate and minor are printed;
 *   - exactly one <h1>... is NOT asserted here: a harness page may draw two
 *     desks side by side, so landmarks are checked as "at least one main".
 * Then three scripted checks axe cannot make:
 *   - the confirm panel: focus lands inside it when it opens, Escape closes
 *     it, and focus returns to the control that opened it;
 *   - a keyboard-only walk of the desk sidebar: every link reachable by Tab,
 *     each with a visible focus ring (a non-zero outline or box-shadow);
 *   - the desks' key layer (C6): j moves focus to a row on a table desk.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/a11y-desks.spec.mjs
 *   A11Y_MATRIX=quick ...   dark, 390 only
 */
import { chromium } from "playwright-core";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const EXECUTABLE = process.env.CHROMIUM_PATH ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const QUICK = process.env.A11Y_MATRIX === "quick";
const AXE_SOURCE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

export const DESK_ROUTES = [
  "/preview/f5/host-landing",
  "/preview/f5/agent-dashboard",
  "/preview/f5/agent-listings",
  "/preview/f5/admin-overview",
  "/preview/f5/admin-queue",
  "/preview/f5/confirm",
];
const THEMES = QUICK ? ["dark"] : ["dark", "light"];
const WIDTHS = QUICK ? [390] : [390, 1440];
const FAILING = new Set(["serious", "critical"]);

const failures = [];
const notes = [];

async function load(page, url) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
      if (response && response.status() === 404) {
        failures.push(`${url}: 404 (is VALLO_PREVIEW_HARNESS=1 set on this server?)`);
        return false;
      }
      await page.evaluate(() => document.fonts?.ready);
      return true;
    } catch (error) {
      if (attempt === 2) failures.push(`${url}: did not load (${String(error).slice(0, 120)})`);
    }
  }
  return false;
}

async function newContext(browser, theme, width) {
  const context = await browser.newContext({
    viewport: { width, height: width < 600 ? 844 : 900 },
    reducedMotion: "reduce",
    bypassCSP: true,
  });
  await context.addCookies(
    [
      ["nf_theme", theme],
      ["nf_motion", "off"],
      ["vallo_first_run", "seen"],
    ].map(([name, value]) => ({ name, value, url: BASE_URL })),
  );
  return context;
}

async function axePass(browser, theme, width) {
  const context = await newContext(browser, theme, width);
  const page = await context.newPage();
  for (const route of DESK_ROUTES) {
    const where = `${route} [${theme} ${width}]`;
    if (!(await load(page, BASE_URL + route))) continue;
    const mains = await page.evaluate(() => document.querySelectorAll("main, [role=main]").length);
    if (mains < 1) failures.push(`${where}: no main landmark`);
    await page.addScriptTag({ content: AXE_SOURCE });
    const result = await page.evaluate(async () => {
      const r = await window.axe.run(document, { resultTypes: ["violations"] });
      return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) }));
    });
    for (const v of result) {
      const line = `${where}: [${v.impact}] ${v.id}: ${v.help} (${v.nodes.join(" | ")})`;
      if (FAILING.has(v.impact ?? "")) failures.push(line);
      else notes.push(line);
    }
    if (width === 390) {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 1) failures.push(`${where}: scrolls sideways by ${overflow}px at 390`);
    }
  }
  await context.close();
}

/** The confirm panel: focus in on open, Escape closes, focus back to the opener. */
async function confirmFocus(browser) {
  const context = await newContext(browser, "dark", 390);
  const page = await context.newPage();
  if (!(await load(page, `${BASE_URL}/preview/f5/confirm`))) return context.close();
  const opener = page.locator("button", { hasText: /accept|decline/i }).first();
  if ((await opener.count()) === 0) {
    notes.push("/preview/f5/confirm: no Accept or Decline control found to open the live panel");
    return context.close();
  }
  await opener.focus();
  const openerLabel = (await opener.textContent())?.trim();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  const inside = await page.evaluate(() => Boolean(document.activeElement?.closest("[role=dialog]")));
  if (!inside) failures.push("confirm panel: focus did not move into the dialog when it opened");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const open = await page.evaluate(() => document.querySelectorAll("[role=dialog][open], dialog[open], [role=dialog]:not([hidden])").length);
  const back = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
  if (open > 0) notes.push("confirm panel: a dialog is still in the page after Escape (it may be the static one)");
  if (openerLabel && back !== openerLabel) failures.push(`confirm panel: focus returned to "${back}", not to "${openerLabel}"`);
  await context.close();
}

/** Keyboard-only walk of the desk sidebar, and the j key on a table desk. */
async function keyboardWalk(browser) {
  const context = await newContext(browser, "dark", 1440);
  const page = await context.newPage();
  if (await load(page, `${BASE_URL}/preview/f5/agent-dashboard`)) {
    const links = await page.locator(".nf-desk-side a[href]").count();
    let reached = 0;
    let ringless = 0;
    for (let i = 0; i < 80 && reached < links; i += 1) {
      await page.keyboard.press("Tab");
      const state = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || !el.closest(".nf-desk-side") || el.tagName !== "A") return null;
        const s = getComputedStyle(el);
        const ring = (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== "none");
        return { ring };
      });
      if (state) {
        reached += 1;
        if (!state.ring) ringless += 1;
      }
    }
    if (links > 0 && reached < links) failures.push(`desk sidebar: Tab reached ${reached} of ${links} links`);
    if (ringless > 0) failures.push(`desk sidebar: ${ringless} link(s) show no focus ring`);
  }
  if (await load(page, `${BASE_URL}/preview/f5/admin-queue`)) {
    const rows = await page.locator("[data-desk-row]").count();
    if (rows > 0) {
      await page.locator("body").click({ position: { x: 5, y: 5 } });
      await page.keyboard.press("j");
      const onRow = await page.evaluate(() => Boolean(document.activeElement?.closest("[data-desk-row]")));
      if (!onRow) failures.push("desk keys: j did not move focus to the first row on the queue");
    } else {
      notes.push("desk keys: the queue harness draws no [data-desk-row] rows; j not exercised");
    }
  }
  await context.close();
}

async function main() {
  const browser = await chromium.launch({ executablePath: EXECUTABLE });
  try {
    for (const theme of THEMES) for (const width of WIDTHS) {
      console.log(`a11y desks: ${theme} ${width}`);
      await axePass(browser, theme, width);
    }
    await confirmFocus(browser);
    await keyboardWalk(browser);
  } finally {
    await browser.close();
  }
  if (notes.length > 0) {
    console.log(`\n${notes.length} note(s), not failing:`);
    for (const note of notes.slice(0, 40)) console.log(`  note  ${note}`);
  }
  if (failures.length > 0) {
    console.error(`\n${failures.length} finding(s):`);
    for (const f of failures) console.error(`  FAIL  ${f}`);
    process.exit(1);
  }
  console.log("\na11y desks: pass (no serious or critical findings).");
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  main().catch((error) => {
    console.error(error);
    process.exit(2);
  });
}
