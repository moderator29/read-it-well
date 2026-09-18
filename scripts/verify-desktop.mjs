// Desktop verification harness: node scripts/verify-desktop.mjs <base> <route> <out.png> [dark|light] [fullpage]
// The 1440x900 twin of verify-shots.mjs, writing the theme the same way so a light shot is really light.
import { chromium } from "playwright-core";
const [base, route, out, theme = "dark", full = ""] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: theme });
await ctx.addInitScript((choice) => { try { localStorage.setItem("nf_theme", choice); } catch {} }, theme);
const page = await ctx.newPage();
await page.goto(base + route, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({ path: out, fullPage: full === "fullpage" });
await browser.close();
console.log("shot", route, "->", out);
