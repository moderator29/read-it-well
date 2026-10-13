/**
 * Builds the launch campaign (posts.mjs) for X, Telegram, Instagram feed and
 * Instagram story, plus the copy file.
 *
 *   node scripts/marketing/campaign/build.mjs [--only 1,2,3]
 *
 * Out: docs/marketing/campaign-2026-10/<channel>/<NN>-<slug>.png and COPY.md.
 *   x/ 1600 x 900   telegram/ 1280 x 720   instagram-feed/ 1080 x 1350   instagram-story/ 1080 x 1920
 *
 * The phone is the 3D studio's handset (store/phones.mjs) with the real
 * capture on its display; icons are the app's own 3D set.
 */
import { chromium } from "playwright-core";
import sharp from "sharp";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Phones } from "../store/phones.mjs";
import { POSTS, LINK } from "./posts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..");
const NM = join(HERE, "..", "node_modules");
const OUT = join(REPO, "docs", "marketing", "campaign-2026-10");
const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",").map(Number) : null;

const b64 = (f, mime) => `data:${mime};base64,${readFileSync(f).toString("base64")}`;
const POPPINS = b64(join(NM, "@fontsource/poppins/files/poppins-latin-700-normal.woff2"), "font/woff2");
const POPPINS6 = b64(join(NM, "@fontsource/poppins/files/poppins-latin-600-normal.woff2"), "font/woff2");
const INTER = b64(join(REPO, "apps/web/public/fonts/v2/inter-latin.woff2"), "font/woff2");
const LOGO_MARK = b64(join(REPO, "scripts/marketing/video/assets/logo-mark.png"), "image/png");
const LOGO_WORD = b64(join(REPO, "scripts/marketing/video/assets/logo-wordmark.png"), "image/png");
const icon = (n) => b64(join(REPO, "apps/web/public/brand/3d", `${n}@2x.webp`), "image/webp");
const screen = (id) => join(REPO, "docs", "marketing", "screens", `${id}-ios.png`);

const FORMATS = {
  x: { dir: "x", W: 1600, H: 900 },
  telegram: { dir: "telegram", W: 1600, H: 900, scale: 0.8 },
  "instagram-feed": { dir: "instagram-feed", W: 1080, H: 1350 },
  "instagram-story": { dir: "instagram-story", W: 1080, H: 1920 },
};

const phones = new Phones({ res: 1 });
const cache = new Map();
async function phoneImg(id, height, rotation) {
  const key = `${id}:${height}:${JSON.stringify(rotation)}`;
  if (!cache.has(key)) {
    const p = await phones.render({ screen: screen(id), model: "island", rotation, fov: 24, height });
    cache.set(key, { ...p, src: b64(p.file, "image/png") });
  }
  return cache.get(key);
}
/** CSS for a rendered handset so its box centre sits at (cx, cy). */
function place(p, cx, cy, z = 3) {
  const w = p.width * p.scale, h = p.height * p.scale;
  const bx = (p.bbox.x + p.bbox.width / 2) * p.scale, by = (p.bbox.y + p.bbox.height / 2) * p.scale;
  return `<img src="${p.src}" style="position:absolute;left:${(cx - bx).toFixed(1)}px;top:${(cy - by).toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;z-index:${z}">`;
}

function headlineHtml(lines, accent, size, align = "left") {
  const acc = accent ? new RegExp(`(${accent.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "i") : null;
  return lines.map((l) => `<div style="white-space:nowrap">${acc ? l.replace(acc, '<span class="acc">$1</span>') : l}</div>`).join("");
}

async function layout(fmt, post) {
  const { W, H } = fmt;
  const rot = { x: 3, y: -12, z: 2 };
  let body = "";
  let css = "";
  const two = post.screen2;
  if (fmt.dir === "x" || fmt.dir === "telegram") {
    const ph = await phoneImg(post.screen, 780, rot);
    body += place(ph, two ? 1030 : 1190, 450);
    if (two) body += place(await phoneImg(post.screen2, 700, { x: 3, y: 12, z: -2 }), 1380, 500, 2);
    css += `.copy{position:absolute;left:100px;top:0;height:${H}px;width:900px;display:flex;flex-direction:column;justify-content:center}
            .h{font:700 92px/1.04 Poppins,sans-serif;letter-spacing:-0.03em;color:#fff}
            .s{margin-top:34px;font:500 34px/1.34 Inter,sans-serif;color:rgb(214 230 255 / .86);width:680px;letter-spacing:-0.01em}
            .cta{margin-top:44px;display:inline-flex;align-items:center;gap:14px;align-self:flex-start;padding:22px 40px;border-radius:99px;background:linear-gradient(135deg,#0069fe,#0056d0);font:600 30px/1 Inter,sans-serif;color:#fff;border:1.5px solid rgb(143 211 255 / .5);box-shadow:0 18px 40px -16px rgb(0 20 80 / .8)}
            .brand{position:absolute;left:100px;top:70px;display:flex;align-items:center;gap:16px}.brand img.m{width:66px}.brand img.w{width:190px}
            .ic{position:absolute;left:880px;top:610px;width:210px;transform:rotate(-8deg);z-index:4;filter:drop-shadow(0 24px 30px rgb(0 0 30 / .5))}`;
    const hSize = post.lines.some((l) => l.length > 16) ? 80 : 92;
    css += `.h{font-size:${hSize}px}`;
  } else if (fmt.dir === "instagram-feed") {
    const ph = await phoneImg(post.screen, 740, rot);
    body += place(ph, two ? 380 : 540, 1010);
    if (two) body += place(await phoneImg(post.screen2, 660, { x: 3, y: 12, z: -2 }), 700, 1000, 2);
    css += `.copy{position:absolute;left:80px;top:140px;width:920px}
            .h{font:700 98px/1.04 Poppins,sans-serif;letter-spacing:-0.03em;color:#fff}
            .s{margin-top:24px;font:500 32px/1.34 Inter,sans-serif;color:rgb(214 230 255 / .86);width:820px}
            .cta{position:absolute;left:80px;top:490px;display:inline-flex;padding:22px 40px;border-radius:99px;background:linear-gradient(135deg,#0069fe,#0056d0);font:600 30px/1 Inter,sans-serif;color:#fff;border:1.5px solid rgb(143 211 255 / .5);z-index:5}
            .brand{position:absolute;left:80px;top:60px;display:flex;align-items:center;gap:14px}.brand img.m{width:60px}.brand img.w{width:170px}
            .ic{position:absolute;left:800px;top:560px;width:190px;transform:rotate(8deg);z-index:4;filter:drop-shadow(0 24px 30px rgb(0 0 30 / .5))}`;
  } else {
    const ph = await phoneImg(post.screen, 960, rot);
    body += place(ph, two ? 390 : 540, 1230);
    if (two) body += place(await phoneImg(post.screen2, 860, { x: 3, y: 12, z: -2 }), 730, 1250, 2);
    css += `.copy{position:absolute;left:70px;top:300px;width:940px}
            .h{font:700 104px/1.04 Poppins,sans-serif;letter-spacing:-0.03em;color:#fff}
            .s{margin-top:22px;font:500 33px/1.32 Inter,sans-serif;color:rgb(214 230 255 / .86);width:840px}
            .cta{position:absolute;left:70px;top:680px;display:inline-flex;padding:22px 40px;border-radius:99px;background:linear-gradient(135deg,#0069fe,#0056d0);font:600 30px/1 Inter,sans-serif;color:#fff;border:1.5px solid rgb(143 211 255 / .5);z-index:5}
            .brand{position:absolute;left:70px;top:215px;display:flex;align-items:center;gap:14px}.brand img.m{width:60px}.brand img.w{width:170px}
            .ic{position:absolute;left:780px;top:640px;width:200px;transform:rotate(8deg);z-index:4;filter:drop-shadow(0 24px 30px rgb(0 0 30 / .5))}`;
  }
  const lines = post.lines;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face{font-family:Poppins;font-weight:700;src:url(${POPPINS}) format("woff2")}
    @font-face{font-family:Poppins;font-weight:600;src:url(${POPPINS6}) format("woff2")}
    @font-face{font-family:Inter;font-weight:100 900;src:url(${INTER}) format("woff2")}
    html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#010118}
    .bg{position:absolute;inset:0;background:radial-gradient(90% 55% at 70% 10%,rgb(0 105 254 / .5) 0%,rgb(0 63 152 / .2) 40%,transparent 72%),radial-gradient(70% 50% at 8% 100%,rgb(0 63 152 / .35) 0%,transparent 70%),linear-gradient(180deg,#02063f 0%,#010118 64%)}
    .acc{color:#2f8bff}${css}
  </style></head><body><div class="bg"></div>
  <div class="brand"><img class="m" src="${LOGO_MARK}"><img class="w" src="${LOGO_WORD}"></div>
  <div class="copy"><div class="h">${headlineHtml(lines, post.accent, 0)}</div><div class="s">${post.support}</div>${fmt.dir === "x" || fmt.dir === "telegram" ? `<div class="cta">${post.cta}  ·  vallospaces.com</div>` : ""}</div>
  ${fmt.dir.startsWith("instagram") ? `<div class="cta">${post.cta}  ·  vallospaces.com</div>` : ""}
  ${body}<img class="ic" src="${icon(post.icon)}"></body></html>`;
  return html;
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const post of POSTS) {
  if (only && !only.includes(post.n)) continue;
  for (const fmt of Object.values(FORMATS)) {
    const html = await layout(fmt, post);
    const page = await browser.newPage({ viewport: { width: fmt.W, height: fmt.H }, deviceScaleFactor: fmt.scale ?? 1 });
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => Promise.all([document.fonts.ready, ...Array.from(document.images).map((i) => i.decode().catch(() => {}))]));
    const dir = join(OUT, fmt.dir);
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${String(post.n).padStart(2, "0")}-${post.slug}.png`);
    const shot = await page.screenshot({ type: "png" });
    await sharp(shot).removeAlpha().png().toFile(file);
    await page.close();
  }
  console.log(`post ${post.n} ${post.slug}`);
}
await browser.close();
await phones.close();

/* ---------- the copy file ---------- */
const lines = [
  "# Vallo launch campaign, first month (October 2026)", "",
  `Destination link for every post: ${LINK}`, "",
  "Rules: the listings and stays on screen are the platform's own example listings; no testimonials, counts or totals are claimed; the iPhone and Android apps are in store review, so no post says \"download\". Post 16 (rewards) goes out only once Rewards is switched on for everyone.", "",
  "Folders: `x/` 1600 x 900 (also fine for LinkedIn), `telegram/` 1280 x 720, `instagram-feed/` 1080 x 1350, `instagram-story/` 1080 x 1920. Each file is `NN-slug.jpg` (high-quality JPEG).", "",
];
for (const p of POSTS) {
  lines.push(`## ${String(p.n).padStart(2, "0")}  ${p.topic}  (day ${p.day})`, "", `**Headline:** ${p.lines.join(" ")}`, `**Supporting text:** ${p.support}`, `**Call to action:** ${p.cta}`, `**Link:** ${LINK}`, "", "**X**", "", p.x, "", "**Instagram caption**", "", p.ig, "", "**Telegram**", "", p.tg, "");
}
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "COPY.md"), lines.join("\n"));
console.log("copy written");
