/*
 * What the five rungs ACTUALLY do to the pixels under them, measured.
 *
 * `probe-elevation.mjs` sums declared ink and `probe-elevation-profile.mjs`
 * models the penumbra. Both read the token and reason forward. This one renders
 * the rungs on the real canvas, screenshots it, and samples the composited
 * pixels, so it answers the only question that matters: can a person see the
 * difference between rung N and rung N+1.
 *
 * It exists because a shadow's declared alpha says nothing about its visibility.
 * Black at 62 per cent over a near-black canvas is still the canvas. A model can
 * be told that; pixels cannot be wrong about it.
 *
 * The rim is sampled separately, INSIDE the top edge, because it is the other
 * half of the same question and the two themes do not use the same half.
 */
import { chromium } from "playwright-core";

const lum = (r, g, b) => {
  const f = (v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
for (const theme of ["dark", "light"]) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 900 },
    reducedMotion: "reduce",
    deviceScaleFactor: 1,
  });
  await ctx.addInitScript(`try{localStorage.setItem('nf_theme', ${JSON.stringify(theme)})}catch(e){}`);
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/gallery", { waitUntil: "networkidle" });

  /* Five tiles on the bare canvas, well apart so no shadow reaches another. */
  const boxes = await page.evaluate(() => {
    document.body.innerHTML = "";
    document.body.style.cssText = "margin:0;padding:0";
    const host = document.createElement("div");
    host.style.cssText = "padding:80px 40px;display:flex;flex-direction:column;gap:260px";
    for (let i = 1; i <= 5; i += 1) {
      const el = document.createElement("div");
      el.className = `nf-elev-${i}`;
      el.dataset.rung = String(i);
      el.style.cssText = "height:80px;border-radius:16px;background:var(--nf-surface-elevated)";
      host.appendChild(el);
    }
    document.body.appendChild(host);
    return [...host.children].map((el) => {
      const r = el.getBoundingClientRect();
      return { rung: Number(el.dataset.rung), left: r.left, top: r.top, bottom: r.bottom, width: r.width };
    });
  });
  await page.waitForTimeout(250);
  /*
   * THE PNG IS DECODED BY THE BROWSER, NOT BY A DEPENDENCY.
   *
   * Reading composited pixels needs a PNG decoder and this repository has no
   * image library, so rather than add one the screenshot goes back INTO the page
   * as a data URL, is drawn on a canvas, and `getImageData` reads it. Chromium
   * decodes its own screenshot, which is one fewer thing that can be wrong than
   * a third-party decoder would be, and no new package in the tree for a probe.
   */
  const shot = (await page.screenshot({ fullPage: true })).toString("base64");
  const pixels = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height);
    return { w: d.width, h: d.height, data: Array.from(d.data) };
  }, shot);
  const at = (x, y) => {
    const i = (pixels.w * Math.round(y) + Math.round(x)) << 2;
    return lum(pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]);
  };

  /*
   * ONE CANVAS REFERENCE, TAKEN WHERE NOTHING CAN REACH IT, and the first
   * version took it 125px below each tile. The gap was 140px, so that point sat
   * 15px above the NEXT tile and inside its upward reach: in light it read 0.91
   * under one rung and 0.82 under the next, which is the reference moving rather
   * than the shadow. The gap is 260px now and the reference is a single sample
   * from the left margin, beside the tiles, where no shadow of any rung lands.
   *
   * The last two rungs also read NaN, because the capture was viewport-only and
   * the fifth tile sat below 900px. `fullPage: true`. Both faults were visible
   * in the output as NaN and as a reference that would not hold still.
   */
  const canvas = at(12, 400);
  console.log(`\n=== ${theme} === (real pixels, 390px, dpr 1, canvas ${canvas.toFixed(4)})`);
  console.log("  rung   under+2  under+8  under+24   max drop   reach     rim step");
  let prevDrop = null;
  let prevRim = null;
  for (const b of boxes) {
    const cx = b.left + b.width / 2;
    const samples = [2, 8, 24].map((d) => at(cx, b.bottom + d));
    const drop = Math.max(...samples.map((s) => canvas - s));
    /*
     * REACH: how far the shadow is still visible. Measured rather than modelled,
     * and it is the number that reads as HEIGHT, because a higher object casts a
     * wider fainter shadow rather than a darker one. The threshold is one per
     * cent of the canvas's own luminance, which is roughly where a drop stops
     * being distinguishable on either ground.
     */
    const floor = Math.max(canvas * 0.01, 0.0002);
    let reach = 0;
    for (let d = 1; d <= 160; d += 1) if (canvas - at(cx, b.bottom + d) >= floor) reach = d;
    /* The rim, one pixel inside the top edge, against the fill two pixels in. */
    const rim = at(cx, b.top + 1);
    const fill = at(cx, b.top + 6);
    const rimStep = rim - fill;
    const d = prevDrop === null ? "" : (drop > prevDrop ? " up" : " NOT ABOVE");
    const r = prevRim === null ? "" : (rimStep > prevRim ? " up" : " NOT ABOVE");
    console.log(
      `  elev-${b.rung}  ` +
        samples.map((s) => s.toFixed(4).padStart(7)).join("  ") +
        `   ${drop.toFixed(5).padStart(8)}${d.padEnd(11)}${(reach + "px").padStart(6)} ${rimStep.toFixed(5).padStart(8)}${r}`,
    );
    prevDrop = drop;
    prevRim = rimStep;
  }
  await ctx.close();
}
await browser.close();
