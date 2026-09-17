/*
 * A card grid at 390 in dark, which is where the edge stride ring is visible.
 *
 * `--nf-stride-angle` is the `from` angle of the conic carrying
 * `--nf-edge-stride-stops`, whose brightest stop sits at 0deg, so that value IS
 * the position of the ring's primary highlight on every glass surface in the
 * product. It moved from 135 to 152 to agree with `--nf-light-angle`. This
 * renders the ring at both, magnified, so the difference can be looked at
 * rather than reasoned about.
 */
import { chromium } from "playwright-core";
const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = process.argv[2] || ".";
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });

for (const angle of ["135deg", "152deg"]) {
  await page.evaluate((a) => {
    /*
     * SET ON EACH CARD, NOT ON THE ROOT, AND THIS IS THE WHOLE PROBE.
     *
     * `--nf-stride-angle` is registered with `inherits: false`, so a value set
     * on `:root` never reaches a card: each element falls back to the
     * `@property` initial value instead. The first version of this script set
     * it on the root and rendered two IDENTICAL frames, which reads as "the
     * seventeen degrees make no difference" and is in fact the probe measuring
     * nothing at all.
     */
    let host = document.getElementById("stride-probe");
    if (!host) {
      host = document.createElement("div");
      host.id = "stride-probe";
      host.style.cssText =
        "position:fixed;inset:0;z-index:9999;display:grid;grid-template-columns:1fr 1fr;" +
        "gap:16px;padding:16px;align-content:start;background:var(--nf-surface-canvas)";
      for (let i = 0; i < 6; i += 1) {
        const c = document.createElement("div");
        c.className = "nf-card";
        c.style.cssText = "height:150px";
        c.style.setProperty("--nf-stride-angle", a);
        host.appendChild(c);
      }
      document.body.appendChild(host);
    } else {
      for (const c of host.children) c.style.setProperty("--nf-stride-angle", a);
    }
  }, angle);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/stride-${angle}.png` });
}
console.log("rendered 135deg and 152deg");
await browser.close();
