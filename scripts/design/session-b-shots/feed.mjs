/**
 * The feed and the plus bloom: every proof and the side-by-sides, from the
 * committed harness `/preview/session-b/feed` (fixture props, ruling R-G).
 *
 *   cd apps/web && npx next build && VALLO_PREVIEW_HARNESS=1 npx next start -p 3185
 *   node scripts/design/session-b-shots/feed.mjs [--base http://127.0.0.1:3185] [--out dir]
 *
 * Run from the repository root. Shoots 390 x 844 at 2x and 1440 x 900, dark
 * only, into docs/design/proofs/session-b/feed/, then sets the founder's
 * `feed-plus-bloom-target.jpg` beside the built 390 screen, scaled so its
 * screen is 390 wide (0.5865 CSS px per image px) and aligned on the top of
 * the location bar, for the closed feed and for the open bloom.
 *
 * It also prints the measured boxes of every control it can find, which is
 * the "measure the controls yourself" step of the sweep: height, corner
 * radius and the radius to short-side ratio.
 */
import { chromium } from "playwright-core";
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const BASE = arg("base", "http://127.0.0.1:3185");
const OUT = arg("out", "docs/design/proofs/session-b/feed");
const RENDER = "docs/design/references/founder/feed-plus-bloom-target.jpg";
/* The render's screen, inner edge to inner edge, and the location bar's top. */
const SCREEN = { left: 178, right: 843, barTop: 218, dockTop: 1372 };
const K = 390 / (SCREEN.right - SCREEN.left);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium",
});

async function open(path, { width = 390, height = 844, scale = 2, reduce = false } = {}) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: scale,
    reducedMotion: reduce ? "reduce" : "no-preference",
  });
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "load" });
  if (!res || res.status() !== 200) throw new Error(`${path} answered ${res?.status()}`);
  await page.waitForTimeout(1800);
  return page;
}

async function shot(page, name, full = false) {
  const path = `${OUT}/${name}.jpg`;
  await page.screenshot({ path, type: "jpeg", quality: 80, fullPage: full });
  console.log("shot", path);
  return path;
}

/* Every control's box and corner, the numbers the shape law is judged on. */
async function measure(page, label) {
  const rows = await page.evaluate(() => {
    const pick = [
      [".nf-feed-chip", "location bar"],
      [".nf-feed-seg", "segment track"],
      [".nf-feed-seg__link", "segment half"],
      [".nf-story-ring__disc", "story ring"],
      [".nf-story-ring__plus", "your-story plus"],
      [".nf-card.nf-post", "post card"],
      [".nf-post__avatar", "post avatar"],
      [".nf-post__media", "post photo"],
      [".nf-post__act", "action control"],
      [".nf-bloom__fab", "bloom plus"],
      [".nf-bloom__item", "bloom plate"],
      [".nf-actions__panel", "action sheet"],
      [".nf-actions__row", "sheet row"],
      [".nf-social-sheet__panel", "composer sheet"],
      [".nf-fab__place", "place row"],
    ];
    const out = [];
    for (const [sel, name] of pick) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const cs = getComputedStyle(el);
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const r = parseFloat(cs.borderTopLeftRadius) || 0;
      const short = Math.min(w, h);
      out.push({
        name,
        w,
        h,
        radius: cs.borderTopLeftRadius,
        ratio: short ? Math.round((Math.min(r, short / 2) / short) * 1000) / 1000 : 0,
        font: `${cs.fontSize} ${cs.fontWeight}`,
      });
    }
    return out;
  });
  console.log(`\n${label}`);
  for (const r of rows)
    console.log(
      `  ${r.name.padEnd(16)} ${String(r.w).padStart(4)} x ${String(r.h).padEnd(4)} radius ${r.radius.padEnd(6)} ratio ${String(r.ratio).padEnd(6)} font ${r.font}`,
    );
  return rows;
}

async function sideBySide(builtPath, barTopCss, name, caption) {
  const top = SCREEN.barTop - 18;
  const h = SCREEN.dockTop - top;
  const renderW = 390 * 2;
  const renderH = Math.round(h * K * 2);
  const render = await sharp(RENDER)
    .extract({ left: SCREEN.left, top, width: SCREEN.right - SCREEN.left, height: h })
    .resize(renderW, renderH)
    .toBuffer();
  const meta = await sharp(builtPath).metadata();
  const builtTop = Math.max(0, Math.round((barTopCss - 18 * K) * 2));
  const builtH = Math.min(renderH, meta.height - builtTop);
  const built = await sharp(builtPath)
    .extract({ left: 0, top: builtTop, width: meta.width, height: builtH })
    .toBuffer();
  const pad = 24;
  const label = (text, x) =>
    `<text x="${x}" y="30" fill="#9cc2ff" font-family="sans-serif" font-size="22">${text}</text>`;
  const svg = Buffer.from(
    `<svg width="${renderW * 2 + pad * 3}" height="48" xmlns="http://www.w3.org/2000/svg">${label("founder: feed-plus-bloom-target.jpg (" + caption + ")", pad)}${label("built, 390 dark, fixture props", renderW + pad * 2)}</svg>`,
  );
  const path = `${OUT}/${name}.jpg`;
  await sharp({
    create: { width: renderW * 2 + pad * 3, height: renderH + 48 + pad, channels: 3, background: "#000612" },
  })
    .composite([
      { input: svg, left: 0, top: 0 },
      { input: render, left: pad, top: 48 },
      { input: built, left: renderW + pad * 2, top: 48 },
    ])
    .jpeg({ quality: 80 })
    .toFile(path);
  console.log("side by side", path);
}

const barTop = async (page) =>
  page.evaluate(() => document.querySelector(".nf-feed-chip")?.getBoundingClientRect().top ?? 0);

/* 1. The feed, closed. */
let page = await open("/preview/session-b/feed");
const feed390 = await shot(page, "feed-390-dark");
await measure(page, "feed, 390");
await sideBySide(feed390, await barTop(page), "side-by-side-feed", "closed");
await shot(page, "feed-390-dark-full", true);
await page.close();

/* 2. The bloom, open at rest. */
page = await open("/preview/session-b/feed?state=bloom");
const bloom390 = await shot(page, "bloom-open-390-dark");
await measure(page, "bloom open, 390");
await sideBySide(bloom390, await barTop(page), "side-by-side-bloom", "bloom open");
await page.close();

/* 3. The bloom opened by a tap, caught mid-throw and settled. */
page = await open("/preview/session-b/feed");
await page.click('[data-testid="bloom-fab"]');
await page.waitForTimeout(90);
await shot(page, "bloom-throw-90ms-390-dark");
await page.waitForTimeout(700);
await shot(page, "bloom-tapped-settled-390-dark");
/* Escape closes it and focus comes home to the plus. */
await page.keyboard.press("Escape");
await page.waitForTimeout(700);
const home = await page.evaluate(() => document.activeElement?.getAttribute("data-testid"));
const left = await page.locator('[data-testid="bloom-post"]').count();
console.log(`\nEscape: focus on ${home}, plates left mounted ${left}`);
await page.close();

/* 4. Reduced motion: no throw, plates simply there. */
page = await open("/preview/session-b/feed", { reduce: true });
await page.click('[data-testid="bloom-fab"]');
await page.waitForTimeout(150);
await shot(page, "bloom-reduced-motion-390-dark");
const order = await page.evaluate(() =>
  [...document.querySelectorAll('[role="menuitem"]')].map((el) => el.textContent?.trim()),
);
console.log(`focus order: ${order.join(" > ")}`);
/* 5. Each action lands on its real thing. */
await page.click('[data-testid="bloom-post"]');
await page.waitForTimeout(300);
await shot(page, "bloom-post-composer-390-dark");
await measure(page, "composer sheet, 390");
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
await page.click('[data-testid="bloom-fab"]');
await page.waitForTimeout(150);
await page.click('[data-testid="bloom-review"]');
await page.waitForTimeout(300);
await shot(page, "bloom-review-picker-390-dark");
await page.close();
page = await open("/preview/session-b/feed?reviewable=0", { reduce: true });
await page.click('[data-testid="bloom-fab"]');
await page.waitForTimeout(150);
await page.click('[data-testid="bloom-review"]');
await page.waitForTimeout(300);
await shot(page, "bloom-review-empty-390-dark");
await page.close();

/* 6. The card's menu, and the share sheet. */
page = await open("/preview/session-b/feed");
await page.locator(".nf-post__kebab").first().click();
await page.waitForTimeout(400);
await shot(page, "post-menu-390-dark");
await measure(page, "post menu, 390");
await page.close();

/* 7. The other states. */
for (const [state, name] of [
  ["following", "following-390-dark"],
  ["empty", "empty-for-you-390-dark"],
  ["following-empty", "empty-following-390-dark"],
]) {
  page = await open(`/preview/session-b/feed?state=${state}`);
  await shot(page, name);
  await page.close();
}

/* 8. The story viewer, its menu and its comments, and the story composer
   (the existing f4 harnesses, read only). */
page = await open("/preview/f4/story");
await shot(page, "story-viewer-390-dark");
const more = page.locator('[aria-label="More actions for this story"]');
if (await more.count()) {
  await more.first().click();
  await page.waitForTimeout(300);
  await shot(page, "story-menu-390-dark");
  await page.keyboard.press("Escape");
}
const comment = page.getByRole("button", { name: /comment/i });
if (await comment.count()) {
  await comment.first().click();
  await page.waitForTimeout(500);
  await shot(page, "story-comments-390-dark");
  await measure(page, "comments sheet, 390");
}
await page.close();
page = await open("/preview/f4/story-new");
await shot(page, "story-composer-390-dark");
await page.close();
page = await open("/preview/f4/post-thread");
await shot(page, "post-thread-390-dark");
await page.close();

/* 9. Desktop. */
page = await open("/preview/session-b/feed", { width: 1440, height: 900, scale: 1 });
await shot(page, "feed-1440-dark");
await page.close();
page = await open("/preview/session-b/feed?state=bloom", { width: 1440, height: 900, scale: 1 });
await shot(page, "bloom-open-1440-dark");
await page.close();

await browser.close();
