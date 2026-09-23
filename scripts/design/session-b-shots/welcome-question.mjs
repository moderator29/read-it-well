/**
 * Get started's fifth beat, the interests question (a signed-in member who has
 * not answered it), from the welcome harness: through the four slides, the
 * member's Continue, then Apartments chosen so both tile states are drawn.
 *
 *   cd apps/web && npx next build && VALLO_PREVIEW_HARNESS=1 npx next start -p 3188
 *   node scripts/design/session-b-shots/welcome-question.mjs --phase before|after [--base http://127.0.0.1:3188]
 *   node scripts/design/session-b-shots/welcome-question.mjs --sides
 *
 * Dark only. 390x844 at 2x and 1440x900 at 1x, full page, JPEG q80, into
 * docs/design/proofs/session-b/welcome/question-<phase>-<width>.jpg.
 * Run from the repository root.
 */
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const BASE = arg("base", "http://127.0.0.1:3188");
const PHASE = arg("phase", "after");
const D = "docs/design/proofs/session-b/welcome";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });

if (process.argv.includes("--sides")) {
  const img = (f) => `data:image/${f.endsWith(".png") ? "png" : "jpeg"};base64,${readFileSync(f).toString("base64")}`;
  const col = (label, src, w = 390) =>
    `<div><div style="margin-bottom:8px;width:${w}px">${label}</div><div style="width:${w}px;height:844px;overflow:hidden;background:#000"><img src="${src}" style="width:${w}px"></div></div>`;
  const page = await browser.newPage({ viewport: { width: 1680, height: 900 } });
  await page.setContent(`<html><body style="margin:0;background:#0b0f1a;font:600 15px sans-serif;color:#fff"><div style="display:flex;gap:16px;padding:16px">
${col("Governing image 2A49E2F7 (slide 1)", img("docs/design/references/2A49E2F7-F99C-47D3-BB79-075DCC1A0F5D.png"))}
${col("Last committed welcome proof (member, last slide)", img(`${D}/welcome-member-final-390-fixture.jpg`))}
${col("Question beat before f3ec1eea", img(`${D}/question-before-390.jpg`))}
${col("Question beat after f3ec1eea", img(`${D}/question-after-390.jpg`))}
</div></body></html>`);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  await page.screenshot({ path: `${D}/side-by-side-question-390.jpg`, type: "jpeg", quality: 78, fullPage: true });
  await browser.close();
  console.log(`side-by-side in ${D}`);
  process.exit(0);
}

for (const width of [390, 1440]) {
  const ctx = await browser.newContext({
    viewport: { width, height: width > 800 ? 900 : 844 },
    deviceScaleFactor: width > 800 ? 1 : 2,
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  const p = await ctx.newPage();
  const res = await p.goto(`${BASE}/preview/session-b/welcome`, { waitUntil: "networkidle" });
  if (!res || res.status() !== 200) throw new Error(`welcome answered ${res?.status()}`);
  await p.getByTestId("welcome-get-started").click();
  while (!(await p.getByTestId("welcome-continue").isVisible())) {
    await p.getByTestId("welcome-next").click();
    await p.waitForTimeout(200);
  }
  await p.getByTestId("welcome-continue").click();
  await p.getByTestId("interest-apartment").waitFor();
  await p.getByTestId("interest-apartment").click();
  await p.mouse.move(0, 0);
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${D}/question-${PHASE}-${width}.jpg`, fullPage: true, type: "jpeg", quality: 80 });
  await ctx.close();
}
await browser.close();
console.log(`question-${PHASE} shot at 390 and 1440 in ${D}`);
