import { chromium } from "playwright-core";
const dir = "/tmp/claude-0/-home-user-read-it-well/9aa8c30d-e76a-54aa-a47f-086f8450029c/scratchpad/";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
const p = await ctx.newPage();
await p.goto("http://localhost:3122/", { waitUntil: "load", timeout: 60000 });
await p.waitForTimeout(400);
// screenshot immediately: nothing may be invisible or mid-flight
await p.screenshot({ path: `${dir}reduced-motion.png` });
const hidden = await p.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll("main *")) {
    const cs = getComputedStyle(el);
    if (parseFloat(cs.opacity) < 0.5 && el.textContent.trim()) out.push([el.className.toString().slice(0,60), cs.opacity]);
  }
  return out.slice(0, 10);
});
console.log("low-opacity text nodes:", JSON.stringify(hidden));
await b.close();
