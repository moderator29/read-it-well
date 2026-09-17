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
  return { ladder, measured };
}, CLASSES);

console.log("LADDER");
for (const [k, v] of Object.entries(out.ladder)) console.log(`  --nf-z-${k}: ${v || "(EMPTY)"}`);
console.log("\nCOMPUTED z-index");
for (const [k, v] of Object.entries(out.measured)) console.log(`  .${k}: ${v}`);

await browser.close();
