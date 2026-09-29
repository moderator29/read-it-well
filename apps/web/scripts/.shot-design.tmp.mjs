import { chromium } from "playwright-core";
const OUT = process.argv[2];
const only = process.argv[3];
const routes = [
  ["drawer", "/preview/lead/drawer"],
  ["dock", "/preview/lead/dock"],
  ["icons", "/preview/icons"],
  ["profile", "/preview/f4/public-profile"],
  ["home", "/preview/f1/home"],
  ["agent", "/preview/f5/agent-dashboard"],
  ["rail", "/preview/f1/chrome"],
  ["myprofile", "/preview/f4/profile"],
  ["shelldrawer", "/preview/f1/drawer"],
];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const theme of ["light", "dark"]) {
  for (const w of [390, 1440]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
    await ctx.addCookies([{ name: "nf_theme", value: theme, url: "http://localhost:3210" }]);
    await ctx.addInitScript((t) => { try { localStorage.setItem("nf_theme", t); } catch {} }, theme);
    const page = await ctx.newPage();
    for (const [name, url] of routes) {
      if (only && !only.split(",").includes(name)) continue;
      try {
        await page.goto("http://localhost:3210" + url, { waitUntil: "networkidle", timeout: 120000 });
        await page.waitForTimeout(900);
        await page.screenshot({ path: `${OUT}/${name}-${theme}-${w}.png` });
        console.log("ok", name, theme, w);
      } catch (e) { console.log("fail", name, theme, w, e.message.slice(0, 120)); }
    }
    await ctx.close();
  }
}
await browser.close();
