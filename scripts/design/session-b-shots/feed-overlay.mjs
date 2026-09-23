/**
 * THE PIXEL OVERLAY: the built feed laid on the founder's image at the image's
 * own scale, as a 50 per cent blend and as a difference image, plus every
 * element's position and size in image pixels beside the drawn numbers.
 *
 *   cd apps/web && npx next build && VALLO_PREVIEW_HARNESS=1 npx next start -p 3185
 *   node scripts/design/session-b-shots/feed-overlay.mjs --tag pass1 [--base ...] [--out dir]
 *
 * The phone's screen in `feed-plus-bloom-target.jpg` runs x 178 to 843, so a
 * 390 CSS px viewport shot at a device scale of 665 / 390 = 1.7051 is exactly
 * one image pixel per screenshot pixel. Two alignments, because the harness
 * has no app header and no dock (neither is the feed's, and the dock is never
 * copied):
 *   feed    aligned on the top-left of the For You / Following track (206, 431)
 *   bloom   aligned on the centre of the plus (image 791.4, 1298.8)
 * Writes overlay-<tag>-{feed,bloom}-{blend,diff}.jpg and overlay-<tag>-numbers.md,
 * and prints the table.
 */
import { chromium } from "playwright-core";
import sharp from "sharp";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const BASE = arg("base", "http://127.0.0.1:3185");
const OUT = arg("out", "docs/design/proofs/session-b/feed");
const TAG = arg("tag", "check");
/* Iteration aid: a stylesheet injected into the running build, so a CSS-only
   change is checked without a rebuild. Proof passes run without it. */
const CSS = arg("css", null);
const RENDER = "docs/design/references/founder/feed-plus-bloom-target.jpg";
const SCREEN = { left: 178, right: 843, top: 58, bottom: 1478 };
const D = (SCREEN.right - SCREEN.left) / 390;
/* The feed is aligned on the segment, the first full-width row: the bar
   shares its row with the back control the nav law requires (FEED-4). */
const SEG = { x: 206, y: 431 };
const PLUS = { x: 791.4, y: 1298.8 };
mkdirSync(OUT, { recursive: true });

/* The drawn numbers, image px, measured off the render (ledger 13). */
const DRAWN = {
  "location bar": { x: 206, y: 218, w: 612, h: 57 },
  "segment": { x: 206, y: 431, w: 612, h: 60 },
  "segment lit half": { x: 206, y: 431, w: 297, h: 60 },
  "story ring 1": { x: 207, y: 297, w: 86, h: 86 },
  "story ring 2": { x: 319, y: 297, w: 86, h: 86 },
  "card 1": { x: 206, y: 509, w: 612, h: 403 },
  "card 1 avatar": { x: 222, y: 521, w: 65, h: 65 },
  "card 1 name": { x: 301, y: 530, w: 132, h: 21 },
  "card 1 photo": { x: 226, y: 650, w: 573, h: 204 },
  "card 1 name text": { x: 301, y: 529, w: 132, h: 24 },
  "card 1 handle text": { x: 301, y: 555, w: 130, h: 20 },
  "card 1 time text": { x: 715, y: 531, w: 47, h: 20 },
  "card 1 body line 1": { x: 227, y: 589, w: 486, h: 24 },
  "card 1 heart": { x: 223, y: 866, w: 35, h: 35 },
  "card 1 repost": { x: 338, y: 866, w: 35, h: 35 },
  "card 1 reply": { x: 433, y: 866, w: 35, h: 35 },
  "card 1 share": { x: 765, y: 865, w: 35, h: 35 },
  "card 1 count 1": { x: 261, y: 872, w: 27, h: 20 },
  "card 1 kebab": { x: 773, y: 524, w: 35, h: 35 },
  "ring 1 name": { x: 212, y: 390, w: 77, h: 20 },
  "card 2 name text": { x: 300, y: 947, w: 122, h: 24 },
  "card 2 body": { x: 228, y: 1007, w: 421, h: 70 },
  "card 2 heart": { x: 224, y: 1085, w: 35, h: 35 },
  "For You label": { x: 303, y: 449, w: 105, h: 26 },
  "card 2": { x: 206, y: 930, w: 612, h: 203 },
  "plus": { cx: 791.4, cy: 1298.8, w: 98, h: 98 },
  "plate Review": { cx: 790.3, cy: 1213.5, deg: -13 },
  "plate Story": { cx: 739.6, cy: 1155.5, deg: -17 },
  "plate Post": { cx: 683.1, cy: 1103.0, deg: -20 },
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium",
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: D,
  /* Only so an iteration stylesheet can be injected; the page is local. */
  bypassCSP: Boolean(CSS),
});
await page.goto(`${BASE}/preview/session-b/feed?state=bloom`, { waitUntil: "load" });
await page.waitForTimeout(2000);
if (CSS) {
  await page.addStyleTag({ content: readFileSync(CSS, "utf8") });
  await page.waitForTimeout(400);
}
const shot = await page.screenshot({ type: "png" });
/* The raw shot stays out of the repository; the colour sampler reads it. */
writeFileSync(`${tmpdir()}/feed-overlay-${TAG}-built.png`, shot);

/* Built boxes, in screenshot px (= image px at this scale). */
const built = await page.evaluate((d) => {
  const box = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.x * d, y: b.y * d, w: b.width * d, h: b.height * d };
  };
  const q = (s, i = 0) => document.querySelectorAll(s)[i] ?? null;
  /* The words' own extent (the text's advance, not the element's box). */
  const ink = (el) => {
    if (!el) return null;
    const r = document.createRange();
    r.selectNodeContents(el);
    const rects = [...r.getClientRects()];
    if (!rects.length) return null;
    const x = Math.min(...rects.map((b) => b.left)), y = Math.min(...rects.map((b) => b.top));
    const w = Math.max(...rects.map((b) => b.right)) - x, h = Math.max(...rects.map((b) => b.bottom)) - y;
    return { x: x * d, y: y * d, w: w * d, h: h * d };
  };
  const firstLine = (el) => {
    if (!el) return null;
    const r = document.createRange();
    r.selectNodeContents(el);
    const b = r.getClientRects()[0];
    return b ? { x: b.left * d, y: b.top * d, w: b.width * d, h: b.height * d } : null;
  };
  const tilt = (el) => {
    const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    return Math.round((Math.atan2(m.b, m.a) * 180) / Math.PI * 10) / 10;
  };
  const plates = [...document.querySelectorAll(".nf-bloom__item")].map((el) => {
    const b = el.getBoundingClientRect();
    return {
      name: `plate ${el.textContent.trim()}`,
      cx: (b.x + b.width / 2) * d,
      cy: (b.y + b.height / 2) * d,
      w: el.offsetWidth * d,
      h: el.offsetHeight * d,
      deg: tilt(el),
    };
  });
  const fab = q(".nf-bloom__fab").getBoundingClientRect();
  return {
    "location bar": box(q(".nf-feed-chip")),
    "segment": box(q(".nf-feed-seg")),
    "segment lit half": box(q('.nf-feed-seg__link[aria-current="page"]')),
    "story ring 1": box(q(".nf-story-ring__disc", 0)),
    "story ring 2": box(q(".nf-story-ring__disc", 1)),
    "card 1": box(q(".nf-panel.nf-post", 0)),
    "card 1 avatar": box(q(".nf-post__avatar", 0)),
    "card 1 name": box(q(".nf-post__name", 0)),
    "card 1 name text": ink(q(".nf-post__name", 0)),
    "card 1 handle text": ink(q(".nf-post__handle", 0)),
    "card 1 time text": ink(q(".nf-post__when", 0)),
    "card 1 body line 1": firstLine(q(".nf-post__body", 0)),
    "card 1 heart": box(q(".nf-post__actions svg", 0)),
    "card 1 repost": box(q(".nf-post__actions svg", 1)),
    "card 1 reply": box(q(".nf-post__actions svg", 2)),
    "card 1 share": box(q(".nf-post__actions svg", 3)),
    "card 1 count 1": ink(q(".nf-post__actions .nf-numeric", 0)),
    "card 1 kebab": box(q(".nf-post__kebab svg", 0)),
    "ring 1 name": ink(q(".nf-story-ring__name", 0)),
    "card 2 name text": ink(q(".nf-post__name", 1)),
    "card 2 body": ink(q(".nf-post__body", 1)),
    "card 2 heart": box(q(".nf-panel.nf-post:nth-of-type(1) ~ * .nf-post__act--like svg", 0) ?? q(".nf-post__actions svg", 4)),
    "For You label": ink(q(".nf-feed-seg__link", 0)),
    "card 1 photo": box(q(".nf-post__media", 0)),
    "card 2": box(q(".nf-panel.nf-post", 1)),
    plus: { cx: (fab.x + fab.width / 2) * d, cy: (fab.y + fab.height / 2) * d, w: fab.width * d, h: fab.height * d },
    plates,
  };
}, D);

/* Offsets that put the built page onto the image. */
const feedDx = SEG.x - built.segment.x;
const feedDy = SEG.y - built.segment.y;
const bloomDx = PLUS.x - built.plus.cx;
const bloomDy = PLUS.y - built.plus.cy;
console.log(`offsets feed ${feedDx.toFixed(1)} ${feedDy.toFixed(1)} bloom ${bloomDx.toFixed(1)} ${bloomDy.toFixed(1)}`);

const lines = [];
const fmt = (n) => (n == null ? "-" : Math.round(n * 10) / 10);
lines.push(`| element | drawn (image px) | built (image px) | delta |`);
lines.push(`|---|---|---|---|`);
for (const [name, drawn] of Object.entries(DRAWN)) {
  if (name.startsWith("plate")) continue;
  const b = built[name];
  if (!b) continue;
  if (name === "plus") {
    const bx = b.cx + bloomDx, by = b.cy + bloomDy;
    lines.push(`| plus (bloom-aligned) | c ${drawn.cx},${drawn.cy} d ${drawn.w} | c ${fmt(bx)},${fmt(by)} d ${fmt(b.w)} | d ${fmt(b.w - drawn.w)} |`);
    continue;
  }
  const x = b.x + feedDx, y = b.y + feedDy;
  lines.push(
    `| ${name} | ${drawn.x},${drawn.y} ${drawn.w}x${drawn.h} | ${fmt(x)},${fmt(y)} ${fmt(b.w)}x${fmt(b.h)} | ${fmt(x - drawn.x)},${fmt(y - drawn.y)} ${fmt(b.w - drawn.w)}x${fmt(b.h - drawn.h)} |`,
  );
}
for (const p of built.plates) {
  const drawn = DRAWN[p.name];
  if (!drawn) continue;
  const cx = p.cx + bloomDx, cy = p.cy + bloomDy;
  lines.push(
    `| ${p.name} (bloom-aligned) | c ${drawn.cx},${drawn.cy} tilt ${drawn.deg} | c ${fmt(cx)},${fmt(cy)} ${fmt(p.w)}x${fmt(p.h)} tilt ${p.deg} | ${fmt(cx - drawn.cx)},${fmt(cy - drawn.cy)} tilt ${fmt(p.deg - drawn.deg)} |`,
  );
}
const table = lines.join("\n");
console.log(table);
writeFileSync(`${OUT}/overlay-${TAG}-numbers.md`, `${table}\n`);

/* Composite: the render's region, the built shot placed by the offset. */
async function overlay(name, region, dx, dy) {
  const render = await sharp(RENDER).extract(region).png().toBuffer();
  const meta = await sharp(shot).metadata();
  /* The built pixels that fall inside the region. */
  const left = Math.round(region.left - dx);
  const top = Math.round(region.top - dy);
  const cl = Math.max(0, left), ct = Math.max(0, top);
  const cw = Math.min(region.width - (cl - left), meta.width - cl);
  const ch = Math.min(region.height - (ct - top), meta.height - ct);
  const piece = await sharp(shot).extract({ left: cl, top: ct, width: cw, height: ch }).png().toBuffer();
  const canvas = () => sharp({ create: { width: region.width, height: region.height, channels: 4, background: "#000000ff" } });
  const builtFull = await canvas().composite([{ input: piece, left: cl - left, top: ct - top }]).png().toBuffer();
  const half = await sharp(builtFull).ensureAlpha().linear([1, 1, 1, 0.5], [0, 0, 0, 0]).png().toBuffer();
  await sharp(render).composite([{ input: half, blend: "over" }]).jpeg({ quality: 85 }).toFile(`${OUT}/overlay-${TAG}-${name}-blend.jpg`);
  await sharp(render).composite([{ input: builtFull, blend: "difference" }]).jpeg({ quality: 85 }).toFile(`${OUT}/overlay-${TAG}-${name}-diff.jpg`);
  /* Mean absolute difference over the region, 0 to 255, one number per pass. */
  const a = await sharp(render).removeAlpha().raw().toBuffer();
  const b = await sharp(builtFull).removeAlpha().raw().toBuffer();
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += Math.abs(a[i] - b[i]);
  console.log(`${name}: mean abs difference ${(sum / a.length).toFixed(2)} of 255`);
  return sum / a.length;
}

await overlay("feed", { left: SCREEN.left, top: 200, width: SCREEN.right - SCREEN.left, height: 960 }, feedDx, feedDy);
await overlay("bloom", { left: 560, top: 1030, width: 283, height: 330 }, bloomDx, bloomDy);
await browser.close();
