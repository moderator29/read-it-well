/*
 * Reads the COMPUTED z-index of every overlay in the social layer against a
 * running dev server, because a `var()` that does not resolve makes the whole
 * declaration invalid and the element silently falls back to `auto`. That is
 * the one failure mode the token scripts cannot see, and it is the family of
 * faults this sprint keeps finding.
 */
import { chromium } from "playwright-core";

const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const CLASSES = [
  "nf-post__menu",
  "nf-social-sheet",
  "nf-social-toast",
  "nf-comments",
  "nf-ring",
  "nf-actions",
  "nf-fab",
  "nf-rows-sheet__scrim",
  "nf-rows-sheet",
  "nf-skip-link",
  "nf-sheet-backdrop",
  "nf-sheet",
  "nf-confirm-dim",
];

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });

const out = await page.evaluate((classes) => {
  const ladder = {};
  const root = getComputedStyle(document.documentElement);
  for (const name of ["canvas", "content", "sticky", "overlay", "modal", "toast", "top"]) {
    ladder[name] = root.getPropertyValue(`--nf-z-${name}`).trim();
  }
  const measured = {};
  for (const cls of classes) {
    const el = document.createElement("div");
    el.className = cls;
    document.body.appendChild(el);
    measured[cls] = getComputedStyle(el).zIndex;
    el.remove();
  }
  /*
   * THE SANITY CASE. Two controls whose answers are known before the page
   * loads, so a broken probe fails loudly instead of printing a confident
   * table about the product.
   *
   * It exists because four instruments in this directory have been wrong in
   * exactly this way: a value read through `getComputedStyle` that turned out to
   * be the probe's mistake rather than the product's. The rule both queues now
   * work to is that a measurement is not believed until something whose answer
   * is already known has passed through the same code path.
   *
   *   a bare div          must compute `z-index: auto`. If this says a number,
   *                       the element is inheriting from a rule that matches
   *                       everything, and every reading below is suspect.
   *   an inline 424242    must come back as "424242". If it does not, the read
   *                       is not reaching the element at all, which is what
   *                       happens when a probe appends to a detached node or
   *                       measures before layout.
   */
  const control = document.createElement("div");
  document.body.appendChild(control);
  const bare = getComputedStyle(control).zIndex;
  control.style.zIndex = "424242";
  const forced = getComputedStyle(control).zIndex;
  control.remove();

  return { ladder, measured, sanity: { bare, forced } };
}, CLASSES);

if (out.sanity.bare !== "auto" || out.sanity.forced !== "424242") {
  console.error(
    "\nTHIS PROBE IS BROKEN, NOT THE PRODUCT. Sanity case failed:\n" +
      `  a bare div computed z-index "${out.sanity.bare}", expected "auto"\n` +
      `  a div set to 424242 computed "${out.sanity.forced}", expected "424242"\n\n` +
      "The first means something is matching every element and every number\n" +
      "below is inherited rather than measured. The second means the read is not\n" +
      "reaching the element: the usual causes are appending to a detached node,\n" +
      "or measuring before the page has laid out. Fix the probe before reading a\n" +
      "single line of what follows.\n",
  );
  process.exit(1);
}

console.log("LADDER");
for (const [k, v] of Object.entries(out.ladder)) console.log(`  --nf-z-${k}: ${v || "(EMPTY)"}`);
console.log("\nCOMPUTED z-index");
for (const [k, v] of Object.entries(out.measured)) console.log(`  .${k}: ${v}`);

await browser.close();
