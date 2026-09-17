/*
 * Is the elevation ladder actually a ladder?
 *
 * Five rungs are only a scale if each one reads as further off the page than
 * the one below it. That is easy to assert in a token file and hard to see,
 * because a box-shadow is two or three layers and the eye integrates them. So
 * this sums the ink each rung puts on the page: for every layer, the alpha
 * multiplied by how far the shadow spreads, which is a crude but monotonic
 * proxy for "how much darker the area under this thing gets".
 *
 * Both themes, because on the night canvas a shadow has almost nothing to
 * darken and the rim does most of the work, while on paper it is the reverse.
 */
import { chromium } from "playwright-core";

const parse = (shadow) =>
  [...shadow.matchAll(/rgba?\(([^)]+)\)((?:\s+-?[\d.]+px){2,4})/g)].map((m) => {
    const parts = m[1].split(",").map((n) => parseFloat(n));
    const alpha = parts.length > 3 ? parts[3] : 1;
    const lengths = m[2].trim().split(/\s+/).map((n) => parseFloat(n));
    const [, , blur = 0, spread = 0] = lengths;
    return { alpha, blur, spread, inset: false };
  });

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const theme of ["dark", "light"]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(`try{localStorage.setItem('nf_theme', ${JSON.stringify(theme)})}catch(e){}`);
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/gallery", { waitUntil: "networkidle" });
  const rows = await page.evaluate(() => {
    const out = [];
    for (let i = 1; i <= 5; i += 1) {
      const el = document.createElement("div");
      el.className = `nf-elev-${i}`;
      document.body.appendChild(el);
      out.push({ rung: i, shadow: getComputedStyle(el).boxShadow });
      el.remove();
    }
    return out;
  });
  console.log(`\n--- ${theme} ---`);
  let prev = 0;
  for (const { rung, shadow } of rows) {
    /* Only the layers that cast: a rim is `inset 0 1px 0` with no blur, and it
       is a different signal from depth. On the night canvas the rim is doing
       most of the work, which is itself worth seeing in the numbers. */
    const drop = parse(shadow).filter((l) => l.blur > 0);
    const ink = drop.reduce((a, l) => a + l.alpha * (l.blur + Math.abs(l.spread)), 0);
    const flag = rung > 1 && ink <= prev ? "   <-- NOT ABOVE THE RUNG BELOW IT" : "";
    console.log(`  elev-${rung}  ink ${ink.toFixed(2).padStart(7)}  layers ${drop.length}${flag}`);
    prev = ink;
  }
  await ctx.close();
}
await browser.close();
