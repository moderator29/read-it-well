/* Prints the furniture boxes at given times, so a fault can be placed exactly. */
import { chromium } from "playwright-core";
import { startServer } from "/home/user/read-it-well/scripts/marketing/video/engine/server.mjs";

const [proj, film, ...times] = process.argv.slice(2);
const { server, url } = await startServer();
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--enable-webgl", "--font-render-hinting=none", "--hide-scrollbars"],
});
const page = await browser.newPage({ viewport: film === "desktop" ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 } });
await page.goto(`${url}/film.html?proj=${proj}&film=${film}&ending=live`, { timeout: 120_000 });
await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 300_000, polling: 200 });

const SWEEP = () => {
  const seen = (el) => {
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) < 0.35) return false;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const ps = getComputedStyle(p);
      if (ps.visibility === "hidden" || ps.display === "none" || Number(ps.opacity) < 0.35) return false;
    }
    return true;
  };
  const label = (el) => (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60);
  const sceneOf = (el) => { for (let p = el; p; p = p.parentElement) if (p.classList && p.classList.contains("scene")) return p.getAttribute("data-scene"); return "-"; };
  const out = [];
  const push = (el, how) => {
    if (!seen(el)) return;
    if (el.closest(".phone-screen, .wall, [data-wall]")) return;
    const r = el.getBoundingClientRect();
    if (r.width < 30 || r.height < 16) return;
    out.push({ how, scene: sceneOf(el), text: label(el), box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] });
  };
  for (const el of document.querySelectorAll(".popup, .glass-dark, .glass-light, [data-furn]")) push(el, "furn");
  for (const el of document.querySelectorAll("div")) {
    const s = getComputedStyle(el);
    if (!s.borderRadius.startsWith("999") && s.borderRadius !== "9999px") continue;
    if (!el.textContent?.trim()) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 20 || r.height > 220) continue;
    push(el, "pill");
  }
  return out;
};

for (const t of times) {
  await page.evaluate((time) => window.__film.seek(time), Number(t));
  const rows = await page.evaluate(SWEEP);
  console.log(`\n=== t=${t} ===`);
  for (const r of rows) console.log(`  ${r.how} ${JSON.stringify(r.box)} [${r.scene}] ${r.text}`);
}
await browser.close();
server.close();
