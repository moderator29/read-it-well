import { chromium } from "playwright-core";
const exe = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const b = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
const shots = [
  ["landing-dark", "/", "dark", 1440, 2400],
  ["landing-light", "/", "light", 1440, 2400],
  ["landing-dark-phone", "/", "dark", 390, 1800],
  ["home-dark", "/home", "dark", 1440, 1600],
  ["home-light", "/home", "light", 1440, 1600],
];
for (const [name, path, theme, w, h] of shots) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript((t) => {
    try { localStorage.setItem("nf-theme", t); } catch {}
    document.addEventListener("DOMContentLoaded", () => {
      document.documentElement.dataset.theme = t;
    });
  }, theme);
  await p.goto("http://localhost:3122" + path, { waitUntil: "load", timeout: 60000 });
  await p.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
  await p.waitForTimeout(1600);
  await p.screenshot({ path: `/tmp/claude-0/-home-user-read-it-well/9aa8c30d-e76a-54aa-a47f-086f8450029c/scratchpad/${name}-v2.png`, fullPage: false });
  console.log(name, "ok", p.url());
  await ctx.close();
}
await b.close();
