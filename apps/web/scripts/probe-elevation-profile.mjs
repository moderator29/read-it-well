/*
 * How high does each elevation rung READ, which is not how much ink it lays.
 *
 * ---------------------------------------------------------------------------
 * WHY `probe-elevation.mjs` REPORTS A CORRECT LADDER AS BROKEN.
 *
 * That probe sums alpha times spread across every casting layer, and calls the
 * result "how much darker the area under this thing gets". It is a reasonable
 * first measure and it has the axis wrong, because of how light actually works:
 * an object further from a surface casts a shadow that is LARGER, SOFTER and
 * FAINTER, not darker. Alpha falls as height rises. So a ladder that is
 * physically right will look non-monotonic under a sum of ink, and a ladder
 * that is monotonic in ink is one where the top rungs are too dark to read as
 * high.
 *
 * `--nf-elev-5` is the case in point. Against rung 4 it has a LOWER peak alpha
 * in both themes, 0.50 against 0.62 in dark and 0.12 against 0.18 in light, and
 * a LARGER offset, 32px against 24px, spread over three layers instead of two.
 * That is the correct shape for a higher surface and the ink sum marks it down
 * for it.
 *
 * WHAT THIS MEASURES INSTEAD. For each layer, the darkness it contributes at a
 * distance d from the element's edge, modelled as a Gaussian centred on the
 * offset plus the spread with sigma = blur / 2, which is the standard
 * approximation of a CSS box-shadow's penumbra. Summed across layers, then
 * reported as three numbers that are each a thing the eye actually uses:
 *
 *   CONTACT  darkness at d = 0. The dark line where an object meets its
 *            surface. High contact reads as RESTING ON, low as FLOATING.
 *   REACH    the distance at which darkness falls below 2 per cent, which is
 *            about where it stops being visible against either ground. This is
 *            the number that reads as HEIGHT.
 *   PEAK     the darkest point and where it is, which distinguishes a
 *            concentrated shadow from a diffuse one.
 *
 * A ladder should be monotonic in REACH. It should be roughly monotonic
 * DOWNWARD in contact once it leaves the surface. It need not be monotonic in
 * peak at all.
 *
 * ---------------------------------------------------------------------------
 * RUNG 3 IS NOT ON THE SAME LADDER AND MUST NOT BE COMPARED TO ITS NEIGHBOURS.
 *
 * Its shadow points UP: dark is `0 2px 4px` plus `0 -1px 0` plus
 * `0 -20px 48px -12px`, and light is `0 -1px 0` plus `0 -18px 44px -12px` with
 * no downward blurred layer at all. That is correct and deliberate. Rung 3 is
 * the bottom sheet's rung, a sheet is anchored to the bottom edge of the
 * screen, and the surface it has to cast onto is the page ABOVE it. A shadow
 * under a sheet would fall off the screen.
 *
 * So the earlier probe's note that "elev-3 in light casts from ONE layer where
 * its neighbours cast from two" is measuring an upward shadow with a downward
 * ruler. This script reports direction per rung and compares like with like.
 */
import { chromium } from "playwright-core";

/** Layers out of a computed `box-shadow`, with sign and inset preserved. */
function layers(shadow) {
  return [...shadow.matchAll(/(inset\s+)?rgba?\(([^)]+)\)((?:\s+-?[\d.]+px){2,4})(\s+inset)?/g)].map((m) => {
    const parts = m[2].split(",").map((n) => parseFloat(n));
    const [, y = 0, blur = 0, spread = 0] = m[3].trim().split(/\s+/).map((n) => parseFloat(n));
    return { alpha: parts.length > 3 ? parts[3] : 1, y, blur, spread, inset: Boolean(m[1] || m[4]) };
  });
}

/* Darkness at distance d beyond the edge the shadow is cast towards. A CSS
   blur of b is a Gaussian of sigma b/2; the shadow's centre sits at |y| + spread. */
function darknessAt(casting, d) {
  /*
   * ALPHAS COMPOSITE, THEY DO NOT ADD, and the first version of this function
   * added them. It reported a contact darkness of 1.200 for `--nf-elev-5` in
   * dark, which is impossible: no amount of stacked translucent black is more
   * than opaque. Three layers at 0.30, 0.50 and 0.40 composite to 0.79, not
   * 1.20, and the difference is not cosmetic because the sum rewards a rung for
   * having more layers while the composite does not. That was the same fault as
   * the ink proxy this script exists to replace, reintroduced one line lower.
   *
   * Found by reading the output rather than by checking the formula: a number
   * above 1 in a column of alphas cannot be right whatever the formula says.
   */
  const clear = casting.reduce((remaining, l) => {
    const centre = Math.abs(l.y) + l.spread;
    const sigma = Math.max(l.blur / 2, 0.5);
    /* Inside the centre the shadow is at full strength rather than falling off:
       a box-shadow is a blurred RECTANGLE, not a point source, so the near side
       of the penumbra is flat. Only the outer edge decays. */
    const t = d <= centre ? 0 : (d - centre) / sigma;
    return remaining * (1 - l.alpha * Math.exp(-0.5 * t * t));
  }, 1);
  return 1 - clear;
}

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
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
  console.log(`\n=== ${theme} ===`);
  console.log("  rung  dir    contact    reach    peak  at");
  const reaches = [];
  for (const { rung, shadow } of rows) {
    const all = layers(shadow).filter((l) => !l.inset && l.blur > 0);
    const down = all.filter((l) => l.y >= 0);
    const up = all.filter((l) => l.y < 0);
    /*
     * DIRECTION BY WEIGHT, NOT BY COUNT, and counting got dark rung 3 wrong.
     * Its layers are `0 2px 4px` at 0.34 downward and `0 -20px 48px -12px` at
     * 0.55 upward: one each, so a count is a tie and the tie broke towards
     * `down`, which then reported an upward sheet shadow as a failed downward
     * rung. The upward layer carries twelve times the alpha-weighted blur. Read
     * the tokens and the classification disagreed with them, which is the tell.
     */
    const weight = (ls) => ls.reduce((a, l) => a + l.alpha * (l.blur + Math.abs(l.spread)), 0);
    const upwards = weight(up) > weight(down);
    const casting = upwards ? up : down;
    const dir = upwards ? "up " : "down";
    let reach = 0;
    let peak = 0;
    let peakAt = 0;
    for (let d = 0; d <= 200; d += 0.5) {
      const v = darknessAt(casting, d);
      if (v > peak) { peak = v; peakAt = d; }
      if (v >= 0.02) reach = d;
    }
    const contact = darknessAt(casting, 0);
    reaches.push({ rung, dir, reach });
    console.log(
      `  elev-${rung} ${dir}  ${contact.toFixed(3).padStart(7)}  ${(reach + "px").padStart(7)}  ${peak.toFixed(3)}  ${peakAt}px`,
    );
  }
  /* Compare like with like: only the rungs casting the same way are a ladder. */
  const ladder = reaches.filter((r) => r.dir === "down");
  const breaks = ladder.filter((r, i) => i > 0 && r.reach <= ladder[i - 1].reach);
  console.log(
    breaks.length
      ? `  BROKEN: ${breaks.map((b) => "elev-" + b.rung).join(", ")} does not reach further than the rung below`
      : `  monotonic in reach across the ${ladder.length} downward rungs: ${ladder.map((r) => r.reach).join(" < ")}`,
  );
  await ctx.close();
}
await browser.close();
