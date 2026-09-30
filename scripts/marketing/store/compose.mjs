/**
 * Draws the store images.
 *
 *   node scripts/marketing/store/compose.mjs [--store app-store|google-play] [--only 1,2,3]
 *        [--res 2] [--proof DIR] [--feature]
 *
 * For every shot in shots.mjs and each store, the shot's layout is laid out
 * as HTML (templates in components.mjs and grounds.mjs, handsets from the 3D
 * studio through phones.mjs), rendered by Chromium at `res` times the store's
 * pixel size, brought down to the exact size with a Lanczos filter and written
 * as an RGB PNG with no alpha channel:
 *
 *   docs/store/screenshots/app-store/<NN>-<slug>.png     1320 x 2868
 *   docs/store/screenshots/google-play/<NN>-<slug>.png   1440 x 2560 (under 8 MB)
 *
 * Shots that connect across the seam (`pairWith`) are drawn as one page twice
 * as wide and cut in two, so the ribbon, photograph or card that crosses the
 * seam meets itself exactly. --feature also draws Play's 1024 x 500 feature
 * graphic. --proof writes quick JPEGs to DIR instead of the store folders.
 * `STORE_SCREENS=dir` reads the displays from another folder.
 */
import { chromium } from "playwright-core";
import sharp from "sharp";
import { existsSync, mkdirSync, writeFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { OUT, STORES, screenFile } from "./lib.mjs";
import { page } from "./page.mjs";
import { Phones } from "./phones.mjs";
import { placePhone } from "./components.mjs";
import { SHOTS, FEATURE, shotName } from "./shots.mjs";

const args = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const ONLY = arg("--only")?.split(",").map(Number);
const STORE_LIST = arg("--store") ? [arg("--store")] : Object.keys(STORES);
const RES = Number(arg("--res", "2"));
const PROOF = arg("--proof");
const FEATURE_ONLY = args.includes("--feature-only");
const WITH_FEATURE = args.includes("--feature") || FEATURE_ONLY;
const VERBOSE = args.includes("--verbose");

const TMP = join(tmpdir(), `vallo-store-${process.pid}`);
mkdirSync(TMP, { recursive: true });

const phones = new Phones({ res: RES, verbose: VERBOSE });
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--disable-dev-shm-usage", "--force-color-profile=srgb"] });
const context = await browser.newContext({ deviceScaleFactor: RES, viewport: { width: 800, height: 800 } });
const tab = await context.newPage();
const problems = [];

/** The context a layout draws with: one image, its store, its handsets. */
function makeCtx(shot, store, offset) {
  const S = STORES[store];
  const placed = [];
  const ctx = {
    n: shot.n,
    store,
    W: S.W,
    H: S.H,
    model: S.model,
    ios: store === "app-store",
    offset,
    u: S.W / 1320,
    placed,
    screen: (id) => screenFile(id, store),
    /** Render and place a handset showing capture `id`. */
    /**
     * Render and place a handset showing capture `id`, its body centred on
     * (cx, cy) and `h` tall. A handset is never allowed within `margin` of the
     * image's edge: it is slid inwards, and made smaller only if it cannot fit.
     */
    async phone({ id, cx, cy, h, rotation, fov, color, shadow, z = 20, extra = "", reflection, exposure, envIntensity, keyLight, margin }) {
      const file = screenFile(id, store);
      if (!existsSync(file)) throw new Error(`missing display ${file}`);
      const m = margin ?? 60 * ctx.u;
      let height = h;
      let pl;
      for (let pass = 0; pass < 4; pass += 1) {
        const p = await phones.render({ screen: file, model: S.model, color, rotation, fov, height, shadow, reflection, exposure, envIntensity, keyLight });
        let x = cx;
        let y = cy;
        pl = placePhone(p, { cx: x, cy: y, z, extra });
        const b = pl.box;
        const { W: CW, H: CH } = ctx;
        const tooWide = b.w > CW - 2 * m;
        const tooTall = b.h > CH - 2 * m;
        if (tooWide || tooTall) {
          const k = Math.min((CW - 2 * m) / b.w, (CH - 2 * m) / b.h) * 0.995;
          height = Math.floor(height * k);
          continue;
        }
        if (b.x < m) x += m - b.x;
        if (b.r > CW - m) x -= b.r - (CW - m);
        if (b.y < m) y += m - b.y;
        if (b.b > CH - m) y -= b.b - (CH - m);
        if (x !== cx || y !== cy) pl = placePhone(p, { cx: x, cy: y, z, extra });
        break;
      }
      placed.push({ id, ...pl.box });
      return pl;
    },
  };
  return ctx;
}

function checkPlacement(shot, store, ctx) {
  const m = 24;
  for (const b of ctx.placed) {
    if (b.x < m || b.y < m || b.r > ctx.W - m || b.b > ctx.H - m) {
      problems.push(`${store} ${shotName(shot)}: handset ${b.id} is ${Math.round(Math.min(b.x, b.y, ctx.W - b.r, ctx.H - b.b))}px from an edge`);
    }
  }
}

async function renderHtml(html, width, height) {
  const file = join(TMP, "page.html");
  writeFileSync(file, html);
  await tab.setViewportSize({ width, height });
  await tab.goto(`file://${file}`, { waitUntil: "load" });
  await tab.waitForFunction(() => window.__fit === true, null, { timeout: 30000 });
  await tab.evaluate(async () => {
    await Promise.all([...document.images].map((im) => (im.complete ? null : new Promise((r) => { im.onload = im.onerror = r; }))));
  });
  await tab.waitForTimeout(120);
  return tab.screenshot({ type: "png", fullPage: false });
}

/**
 * WCAG contrast of every headline line and subline against what is behind
 * it: the text is hidden, the page shot again, and each text box compared
 * with the worst 3% of the pixels under it. Gradient lines are judged by
 * their weakest colour stop.
 */
async function contrastCheck(min) {
  const items = await tab.evaluate(() => {
    const out = [];
    const halves = [...document.querySelectorAll(".half")];
    for (const el of document.querySelectorAll(".hl .ln, .hl .sub")) {
      const r = el.getBoundingClientRect();
      const colors = el.classList.contains("acc")
        ? (el.style.backgroundImage.match(/rgb\([^)]*\)|#[0-9a-fA-F]{6}/g) || [])
        : [getComputedStyle(el).color];
      const half = halves.findIndex((h) => h.contains(el));
      out.push({ x: r.left, y: r.top, w: r.width, h: r.height, colors, half, text: el.textContent.trim().slice(0, 30) });
    }
    return out;
  });
  await tab.addStyleTag({ content: ".hl { visibility: hidden !important; }" });
  const bg = await tab.screenshot({ type: "png" });
  const { data, info } = await sharp(bg).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const parse = (s) => {
    if (s.startsWith("#")) return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 1];
    const n = s.match(/[\d.]+/g).map(Number);
    return [n[0], n[1], n[2], n.length > 3 ? n[3] : 1];
  };
  const out = [];
  for (const it of items) {
    const x0 = Math.max(0, Math.floor(it.x * RES));
    const y0 = Math.max(0, Math.floor(it.y * RES));
    const x1 = Math.min(info.width, Math.ceil((it.x + it.w) * RES));
    const y1 = Math.min(info.height, Math.ceil((it.y + it.h) * RES));
    let worst = Infinity;
    for (const c of it.colors) {
      const [cr, cg, cb, ca] = parse(c);
      const ratios = [];
      for (let y = y0; y < y1; y += 2) {
        for (let x = x0; x < x1; x += 2) {
          const i = (y * info.width + x) * 3;
          const br = data[i], bgc = data[i + 1], bb = data[i + 2];
          const lt = L(ca * cr + (1 - ca) * br, ca * cg + (1 - ca) * bgc, ca * cb + (1 - ca) * bb);
          const lb = L(br, bgc, bb);
          ratios.push((Math.max(lt, lb) + 0.05) / (Math.min(lt, lb) + 0.05));
        }
      }
      ratios.sort((a, b) => a - b);
      const k = ratios[Math.floor(ratios.length * 0.03)] ?? Infinity;
      worst = Math.min(worst, k);
    }
    out.push({ ...it, ratio: worst });
  }
  return out.filter((o) => o.ratio < min);
}

/**
 * Every word, card, pill and sticker must sit at least `m` px inside its own
 * image (bridges across a seam are drawn outside the halves and exempt).
 */
async function edgeCheck(m) {
  return tab.evaluate((m) => {
    const out = [];
    const halves = [...document.querySelectorAll(".half")];
    halves.forEach((half, k) => {
      const hr = half.getBoundingClientRect();
      const els = [
        ...half.querySelectorAll(".st, .pop, .pill, .card, .abs:not(.g), .hl .ln, .hl .sub, .ebpill, [data-chk]"),
      ];
      for (const el of els) {
        if (el.closest("[data-bleed]") && !el.hasAttribute("data-chk")) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const d = Math.min(r.left - hr.left, hr.right - r.right, r.top - hr.top, hr.bottom - r.bottom);
        if (d < m) {
          const label = (el.className || el.tagName) + " " + (el.textContent || el.getAttribute("src") || "").trim().slice(0, 40);
          out.push({ half: k, d: Math.round(d), label });
        }
      }
    });
    return out;
  }, m);
}

async function write(buf, file, { width, height, left = 0 }) {
  let img = sharp(buf);
  const meta = await img.metadata();
  const pageW = meta.width / RES;
  const pageH = meta.height / RES;
  const scaled = await sharp(buf).resize(Math.round(pageW), Math.round(pageH), { kernel: "lanczos3" }).toBuffer();
  img = sharp(scaled).extract({ left, top: 0, width, height }).flatten({ background: "#010118" }).removeAlpha().toColourspace("srgb");
  mkdirSync(join(file, ".."), { recursive: true });
  if (PROOF) {
    await img.jpeg({ quality: 90, chromaSubsampling: "4:4:4" }).toFile(file);
    return;
  }
  await img.png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 }).toFile(file);
  const out = await sharp(file).metadata();
  if (out.width !== width || out.height !== height || out.hasAlpha || out.channels !== 3) {
    throw new Error(`${file}: ${out.width}x${out.height} channels=${out.channels} alpha=${out.hasAlpha}`);
  }
  const size = statSync(file).size;
  if (size > 8 * 1024 * 1024) {
    /* Play refuses files over 8 MB: the same pixels as a JPEG at q95. */
    const jpg = file.replace(/\.png$/, ".jpg");
    await sharp(file).jpeg({ quality: 95, chromaSubsampling: "4:4:4" }).toFile(jpg);
    rmSync(file);
    problems.push(`${file} was ${(size / 1048576).toFixed(1)} MB as PNG, written as JPEG q95`);
  }
}

const outFile = (store, shot) =>
  PROOF ? join(PROOF, store, `${shotName(shot)}.jpg`) : join(OUT, store, `${shotName(shot)}.png`);

const made = [];
const t0 = performance.now();
for (const store of STORE_LIST) {
  const S = STORES[store];
  if (FEATURE_ONLY) break;
  for (let i = 0; i < SHOTS.length; i += 1) {
    const shot = SHOTS[i];
    if (shot.pairedFrom) continue; /* drawn with its partner */
    const partner = shot.pairWith ? SHOTS.find((s) => s.n === shot.pairWith) : null;
    const wanted = !ONLY || ONLY.includes(shot.n) || (partner && ONLY.includes(partner.n));
    if (!wanted) continue;
    const t = performance.now();
    try {
      const halves = partner ? [shot, partner] : [shot];
      const pageW = S.W * halves.length;
      const parts = [];
      const ctxs = [];
      for (let k = 0; k < halves.length; k += 1) {
        const ctx = makeCtx(halves[k], store, k * S.W);
        ctxs.push(ctx);
        const body = await halves[k].layout(ctx);
        parts.push(`<div class="half" style="left:${k * S.W}px;width:${S.W}px;height:${S.H}px">${body}</div>`);
      }
      if (partner && shot.bridge) {
        parts.push(await shot.bridge({ W: S.W, H: S.H, pageW, store, u: S.W / 1320, ctxs }));
      }
      /* A pair's ground is drawn once across both images, so it runs
         unbroken through the seam. */
      if (partner && shot.ground) {
        parts.unshift(await shot.ground({ W: S.W, H: S.H, pageW, store, u: S.W / 1320, ctxs, ios: store === "app-store" }));
      }
      const html = page({ width: pageW, height: S.H, body: parts.join("\n") });
      const buf = await renderHtml(html, pageW, S.H);
      for (const v of await edgeCheck(40 * (S.W / 1320))) {
        problems.push(`${store} ${shotName(halves[v.half])}: ${v.label.replace(/\s+/g, " ")} is ${v.d}px from the edge`);
      }
      for (const v of await contrastCheck(4.5)) {
        problems.push(`${store} ${shotName(halves[Math.max(0, v.half)])}: "${v.text}" contrast ${v.ratio.toFixed(2)}:1`);
      }
      for (let k = 0; k < halves.length; k += 1) {
        await write(buf, outFile(store, halves[k]), { width: S.W, height: S.H, left: k * S.W });
        checkPlacement(halves[k], store, ctxs[k]);
        made.push(`${store}/${shotName(halves[k])}`);
      }
      console.log(`${store} ${halves.map(shotName).join(" + ")}  ${((performance.now() - t) / 1000).toFixed(1)}s`);
    } catch (e) {
      problems.push(`${store} ${shotName(shot)}: ${e.message}`);
      console.log(`FAIL ${store} ${shotName(shot)}: ${e.stack}`);
    }
  }
}

if (WITH_FEATURE && FEATURE) {
  const W = 1024;
  const H = 500;
  const ctx = makeCtx({ n: 0 }, "google-play", 0);
  ctx.W = W;
  ctx.H = H;
  ctx.u = 0.5;
  const body = await FEATURE(ctx);
  const buf = await renderHtml(page({ width: W, height: H, body }), W, H);
  const file = PROOF ? join(PROOF, "feature-graphic.jpg") : join(OUT, "google-play", "feature-graphic.png");
  await write(buf, file, { width: W, height: H });
  made.push("google-play/feature-graphic");
}

await browser.close();
await phones.close();
rmSync(TMP, { recursive: true, force: true });
console.log(`\nmade ${made.length} in ${((performance.now() - t0) / 1000).toFixed(0)}s`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(`  ${p}`);
  process.exitCode = 1;
}
