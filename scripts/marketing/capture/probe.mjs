/* Quick look at a list of routes: `node probe.mjs <outdir> [--desktop] [--light] /route "/route|click-selector" ...` */
import { mkdirSync } from "node:fs";
import { BASE, launch, signIn, contextFor, settle } from "./session.mjs";
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const kind = process.argv.includes("--desktop") ? "desktop" : "mobile";
const theme = process.argv.includes("--light") ? "light" : "dark";
const routes = process.argv.slice(3).filter((a) => a.startsWith("/"));
const browser = await launch();
const state = await signIn(browser);
console.log("signed in:", !!state);
const ctx = await contextFor(browser, { kind, theme, state });
await ctx.setDefaultTimeout(20_000);
const page = await ctx.newPage();
for (const r of routes) {
  const [path, ...clicks] = r.split("|");
  try {
    await page.goto(BASE + path, { waitUntil: "load", timeout: 60_000 });
    await settle(page);
    for (const c of clicks) { await page.locator(c).first().click({ timeout: 8000 }).catch(() => console.log("  click failed:", c)); await page.waitForTimeout(1400); }
    const file = `${out}/${r.replace(/[^a-z0-9]+/gi, "_").slice(0, 80)}.png`;
    await page.screenshot({ path: file, scale: "css" });
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    console.log("ok", r, "->", page.url().replace(BASE, ""), "height", h);
  } catch (e) { console.log("fail", r, e.message.split("\n")[0]); }
}
await browser.close();
