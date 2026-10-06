/**
 * Contrast audit for the social images: every piece of text we set (not the
 * text inside the captured screens) is measured against the pixels actually
 * behind it.
 *
 *   node scripts/marketing/social/audit.mjs [--only 13,22] [--min 4.5]
 *
 * Each post is rendered twice at 1x: as it ships, and with every glyph made
 * transparent, so the second render is the ground alone. For each element
 * that owns text, its box is sampled in the ground render and the text colour
 * (or, for gradient-filled text, each gradient stop) is compared with the
 * lightest and darkest 5% of those pixels. WCAG 2 contrast ratio.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { closeStudio, phoneLayer } from "./lib/phones.mjs";
import { SOCIAL } from "./lib/paths.mjs";
import { closeRenderer, openPage } from "./lib/render.mjs";

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null;
const MIN = args.includes("--min") ? Number(args[args.indexOf("--min") + 1]) : 4.5;

const lin = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const parse = (str) => {
  const m = str.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 };
};

/* In the page: every element with its own visible text, its box and colours. */
function collect() {
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  for (let el = walker.currentNode; el; el = walker.nextNode()) {
    if (el.closest(".noaudit")) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    /* the glyph boxes of this element's own text nodes, not its children */
    const rects = [];
    for (const n of el.childNodes) {
      if (n.nodeType !== 3 || !n.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const q of range.getClientRects()) if (q.width > 1 && q.height > 1) rects.push(q);
    }
    const box = rects.length
      ? rects.reduce((a, q) => ({ x0: Math.min(a.x0, q.left), y0: Math.min(a.y0, q.top), x1: Math.max(a.x1, q.right), y1: Math.max(a.y1, q.bottom) }), { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 })
      : { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom };
    let stops = [];
    let node = el;
    while (node && node !== document.body) {
      const c = getComputedStyle(node);
      if ((c.webkitBackgroundClip === "text" || c.backgroundClip === "text") && c.backgroundImage.includes("gradient")) {
        stops = c.backgroundImage.match(/rgba?\([^)]+\)/g) || [];
        break;
      }
      node = node.parentElement;
    }
    let op = 1;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) op *= Number(getComputedStyle(n).opacity);
    out.push({
      text: el.textContent.trim().replace(/\s+/g, " ").slice(0, 48),
      color: cs.color,
      fill: cs.webkitTextFillColor,
      stops,
      opacity: op,
      size: parseFloat(cs.fontSize),
      box,
    });
  }
  return out;
}

const HIDE = `<style id="__audit">*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}
*{background-clip:border-box!important;-webkit-background-clip:border-box!important}</style>`;

const files = readdirSync(join(SOCIAL, "posts")).filter((f) => f.endsWith(".mjs")).sort();
const problems = [];
for (const f of files) {
  const mod = (await import(pathToFileURL(join(SOCIAL, "posts", f)).href)).default;
  for (const post of Array.isArray(mod) ? mod : [mod]) {
    if (only && !only.some((o) => post.id === o || post.file.startsWith(o))) continue;
    const { W, H } = post;
    const specs = typeof post.phones === "function" ? await post.phones() : post.phones || [];
    const phones = [];
    for (const s of specs) phones.push(await phoneLayer(s, { W, H, scale: 1, draft: true }));
    const html = await post.html({ W, H, phones, scale: 1, draft: true });
    const { page } = await openPage({ html, width: W, height: H, scale: 1, name: `audit-${post.id}` });
    const items = await page.evaluate(collect);
    await page.evaluate(() => {
      for (const el of document.querySelectorAll("*")) {
        const c = getComputedStyle(el);
        if (c.webkitBackgroundClip === "text" || c.backgroundClip === "text") el.classList.add("__g");
      }
    });
    await page.evaluate((css) => document.head.insertAdjacentHTML("beforeend", css), `${HIDE}<style>.__g{visibility:hidden!important}</style>`);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const shot = await page.screenshot({ type: "png" });
    await page.close();
    const { data, info } = await sharp(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    for (const it of items) {
      const x0 = Math.max(0, Math.floor(it.box.x0));
      const y0 = Math.max(0, Math.floor(it.box.y0));
      const x1 = Math.min(info.width, Math.ceil(it.box.x1));
      const y1 = Math.min(info.height, Math.ceil(it.box.y1));
      if (x1 - x0 < 2 || y1 - y0 < 2) continue;
      const px = [];
      for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) {
        const i = (y * info.width + x) * 3;
        px.push([data[i], data[i + 1], data[i + 2]]);
      }
      px.sort((a, b) => lum(a) - lum(b));
      const dark = px[Math.floor(px.length * 0.05)];
      const light = px[Math.floor(px.length * 0.95)];
      const colours = it.stops.length ? it.stops.map(parse) : [parse(it.fill && !it.fill.includes("0, 0, 0, 0") ? it.fill : it.color)];
      let worst = Infinity;
      for (const c of colours) {
        if (!c) continue;
        const a = c.a * it.opacity;
        for (const bg of [dark, light]) {
          const eff = c.rgb.map((v, k) => v * a + bg[k] * (1 - a));
          worst = Math.min(worst, ratio(eff, bg));
        }
      }
      if (worst < MIN) problems.push({ post: post.file, text: it.text, size: it.size, ratio: worst.toFixed(2) });
    }
    console.log(`${post.file.padEnd(40)} ${items.length} text elements checked`);
  }
}
await closeRenderer();
await closeStudio();
if (problems.length) {
  console.log(`\nbelow ${MIN}:1`);
  for (const p of problems) console.log(`  ${p.ratio.padStart(5)}  ${p.post}  ${Math.round(p.size)}px  "${p.text}"`);
} else console.log(`\nall text at or above ${MIN}:1`);
