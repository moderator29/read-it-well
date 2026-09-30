/* The premium system (DESIGN.md section 6a): three grounds, one grid, the
 * same brand furniture on every post, one headline, one product moment and
 * one 3D identity icon. Nothing else. Posts compose only what is here. */
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { baseCss, icon as lucide } from "./kit.mjs";
import { BRAND, CACHE, SOURCE } from "./paths.mjs";
import { u } from "./render.mjs";

/* ------------------------------------------------------------------ grounds */

export const GROUND = {
  night: { css: "linear-gradient(180deg,#050B3D 0%,#010118 100%)", dark: true },
  electric: { css: "linear-gradient(180deg,#0A6CFF 0%,#0048C8 100%)", dark: true },
  mist: { css: "#F3F7FF", dark: false },
};

/* type colours per ground */
function ink(g) {
  if (g === "mist") return { head: "#0A1030", key: "#0056D0", sub: "rgba(10,16,48,.64)", foot: "rgba(10,16,48,.58)" };
  if (g === "electric") return { head: "#FFFFFF", key: "#FFFFFF", sub: "rgba(255,255,255,.86)", foot: "rgba(255,255,255,.80)" };
  return { head: "#FFFFFF", key: "#8FD3FF", sub: "rgba(255,255,255,.62)", foot: "rgba(255,255,255,.56)" };
}

/* ------------------------------------------------------------------ the grid */

/**
 * Per format: margins, where the wordmark and footer sit, and the headline's
 * top. Stories keep Instagram's safe zones (top 250, bottom 340) clear.
 */
export function grid(W, H) {
  const story = H >= 1900;
  const wide = W > H;
  const M = wide ? 88 : 80;
  return {
    M,
    wm: { x: M, y: story ? 272 : wide ? 64 : 72, h: 28 },
    /* the url sits on the wordmark's line, at the right margin */
    foot: { right: M, y: (story ? 272 : wide ? 64 : 72) + 3 },
    head: { x: M, y: story ? 350 : wide ? 170 : 168, size: 96 },
    story,
    wide,
  };
}

/* ------------------------------------------------------------------ the frame */

/**
 * A whole post: the ground, the wordmark, the footer, and the post's own
 * layers in `body`. `foot` is the footer line (the same on every post).
 */
export function frame({ W, H, ground = "night", body = "", css = "", foot = "vallospaces.com" }) {
  const G = GROUND[ground];
  const c = ink(ground);
  const g = grid(W, H);
  const wm = G.dark ? "vallo-wordmark.png" : "vallo-wordmark-light.png";
  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss(W, H)}
  body{background:${G.css}}
  .hl{position:absolute;font-family:"Poppins","Inter",sans-serif;font-weight:600;letter-spacing:-0.03em;line-height:1.05;color:${c.head};white-space:nowrap;font-feature-settings:"kern" 1}
  .hl .k{color:${c.key}}
  .sub{position:absolute;font:500 30px/1.3 Inter,sans-serif;letter-spacing:-0.005em;color:${c.sub};white-space:nowrap}
  .foot{position:absolute;font:500 22px/1 Inter,sans-serif;letter-spacing:.005em;color:${c.foot};white-space:nowrap}
  ${css}</style></head><body>
  ${body}
  <img src="${u(join(BRAND, wm))}" alt="Vallo" style="position:absolute;left:${g.wm.x}px;top:${g.wm.y}px;height:${g.wm.h}px;width:auto${ground === "electric" ? ";filter:drop-shadow(0 2px 5px rgba(0,16,80,.55))" : ""}">
  <div class="foot" style="right:${g.foot.right}px;top:${g.foot.y}px">${foot}</div>
  </body></html>`;
}

/**
 * The headline: Poppins 600, sentence case, -0.03em, line height 1.05, two
 * lines at most. `lines` is an array of strings; wrap the one key word in
 * <k>...</k>. Returns HTML placed at the grid's headline position unless
 * x / y are given. `align`: "left" (default) or "center".
 */
export function headline(lines, { W, H, x, y, size, align = "left", width } = {}) {
  if (lines.length > 2) throw new Error("headline: two lines at most");
  const g = grid(W, H);
  const s = size ?? g.head.size;
  const left = x ?? g.head.x;
  const top = y ?? g.head.y;
  const html = lines.map((l) => l.replace(/<k>(.*?)<\/k>/g, '<span class="k">$1</span>')).join("<br>");
  const pos = align === "center" ? `left:0;right:0;text-align:center` : `left:${left}px;${width ? `width:${width}px;` : ""}`;
  return `<div class="hl" style="${pos};top:${top}px;font-size:${s}px">${html}</div>`;
}

/** One subline under the headline (one line only). */
export function subline(text, { W, H, x, y, align = "left", lines = 2, size } = {}) {
  const g = grid(W, H);
  const s = size ?? g.head.size;
  const top = y ?? g.head.y + Math.round(s * 1.05 * lines) + 30;
  const pos = align === "center" ? `left:0;right:0;text-align:center` : `left:${(x ?? g.head.x) + 2}px`;
  return `<div class="sub" style="${pos};top:${top}px">${text}</div>`;
}

/* ------------------------------------------------------------------ the 3D identity icon */

const BANNED = new Set(["home-verified", "home-small", "receipt"]);

/**
 * The post's one 3D identity icon, centred at (x, y), with a soft contact
 * shadow on the ground beneath it (the icon floats a little above it).
 */
export function icon3d(name, { x, y, size = 220, ground = "night", rot = 0 } = {}) {
  if (BANNED.has(name)) throw new Error(`3D icon '${name}' is not used`);
  const s = Math.max(200, Math.min(240, size));
  const dark = GROUND[ground].dark;
  const shadowCol = ground === "mist" ? "rgba(20,32,96,.20)" : ground === "electric" ? "rgba(0,14,70,.42)" : "rgba(0,0,6,.62)";
  const sw = s * 0.62;
  const sh = s * 0.11;
  const sy = y + s * 0.5 + s * 0.04;
  return `<div style="position:absolute;left:${x - sw / 2}px;top:${sy - sh / 2}px;width:${sw}px;height:${sh}px;border-radius:50%;
      background:radial-gradient(closest-side,${shadowCol},rgba(0,0,0,0));filter:blur(${Math.round(s * 0.035)}px)"></div>
    <img src="${u(join(BRAND, "3d", `${name}@2x.webp`))}" alt="" style="position:absolute;left:${x - s / 2}px;top:${y - s / 2}px;width:${s}px;height:${s}px;
      transform:rotate(${rot}deg);filter:drop-shadow(0 ${Math.round(s * 0.05)}px ${Math.round(s * 0.06)}px ${dark ? "rgba(0,0,20,.45)" : "rgba(20,32,96,.16)"})">`;
}

/* ------------------------------------------------------------------ a real component, shown flat */

/**
 * A real part of a captured screen, shown flat and upright with rounded
 * corners and a soft shadow, never larger than its source (crop px). `w` is
 * its width in post px.
 */
export async function component(id, crop, { x, y, w, radius = 32, ground = "night" } = {}) {
  if (w > crop.w) throw new Error(`component ${id}: ${w} px wide would upscale a ${crop.w} px crop`);
  const dir = join(CACHE, "comp");
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${id}-${crop.x}-${crop.y}-${crop.w}-${crop.h}.png`);
  if (!existsSync(file)) await sharp(join(SOURCE, `${id}.webp`)).extract({ left: crop.x, top: crop.y, width: crop.w, height: crop.h }).png().toFile(file);
  const h = Math.round((w * crop.h) / crop.w);
  const sh = GROUND[ground].dark
    ? "0 50px 100px -30px rgba(0,0,10,.75), 0 18px 36px -12px rgba(0,0,20,.5), 0 0 0 1.5px rgba(130,178,255,.22)"
    : "0 50px 100px -30px rgba(20,32,96,.30), 0 16px 32px -12px rgba(20,32,96,.16)";
  return `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${radius}px;overflow:hidden;box-shadow:${sh}">
    <img src="${u(file)}" alt="" style="display:block;width:${w}px;height:${h}px"></div>`;
}

/* ------------------------------------------------------------------ the one pop-up */

/**
 * An opaque pop-up card (navy at 0.96 on dark grounds, white at 0.98 on
 * mist) with a 3D icon chip, a title, one line, an optional amount and the
 * Example chip. Only where it is the post's story, one per post, on ground.
 */
export function popcard({ ground = "night", obj, title, line, amount = "", time = "now", width = 600, x, y }) {
  const dark = GROUND[ground].dark;
  const ex = `<span style="display:inline-flex;align-items:center;gap:7px;height:32px;padding:0 13px;border-radius:999px;font:600 18px/1 Inter,sans-serif;white-space:nowrap;
      color:${dark ? "#E8EFFF" : "#34406B"};background:${dark ? "rgba(255,255,255,.10)" : "rgba(8,16,50,.05)"};box-shadow:inset 0 0 0 1.5px ${dark ? "rgba(255,255,255,.26)" : "rgba(8,16,50,.14)"}">
      ${lucide("info", { size: 17, color: dark ? "#E8EFFF" : "#34406B", stroke: 2.2 })}Example</span>`;
  return `<div style="position:absolute;left:${x}px;top:${y}px;width:${width}px;display:flex;align-items:center;gap:22px;padding:24px 28px 24px 24px;border-radius:32px;
      background:${dark ? "rgba(14,22,74,.97)" : "rgba(255,255,255,.98)"};
      box-shadow:${dark ? "inset 0 0 0 1.5px rgba(130,178,255,.34), 0 50px 100px -28px rgba(0,0,10,.85), 0 16px 36px -10px rgba(0,0,20,.5)" : "inset 0 0 0 1px rgba(10,20,70,.06), 0 50px 90px -30px rgba(20,30,90,.35), 0 14px 30px -10px rgba(20,30,90,.16)"}">
    <div style="width:88px;height:88px;flex:none;border-radius:28px;display:grid;place-items:center;
        background:${dark ? "linear-gradient(145deg,rgba(92,159,255,.26),rgba(0,105,254,.12))" : "linear-gradient(145deg,#EEF4FF,#DDE9FF)"};
        box-shadow:inset 0 0 0 1.5px ${dark ? "rgba(140,185,255,.30)" : "rgba(0,86,208,.10)"}">
      <img src="${u(join(BRAND, "3d", `${obj}@2x.webp`))}" alt="" style="width:70px;height:70px;display:block"></div>
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:14px">
        <div style="font:700 30px/1.1 Poppins,Inter,sans-serif;letter-spacing:-0.02em;color:${dark ? "#FFFFFF" : "#0A1030"};white-space:nowrap">${title}</div>
        <div style="font:500 21px/1 Inter,sans-serif;color:${dark ? "rgba(214,226,255,.72)" : "rgba(10,16,48,.58)"};white-space:nowrap">${time}</div>
      </div>
      <div style="margin-top:8px;font:500 23px/1.3 Inter,sans-serif;color:${dark ? "rgba(214,226,255,.86)" : "rgba(10,16,48,.70)"};white-space:nowrap">${line}</div>
      <div style="margin-top:12px;display:flex;align-items:center;gap:14px">
        ${amount ? `<div style="font:700 28px/1 Inter,sans-serif;letter-spacing:-0.01em;color:${dark ? "#8FD3FF" : "#0056D0"}">${amount}</div>` : ""}${ex}</div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ a browser window, flat */

/** A flat browser window around a desktop capture (2880 x 1800). No 3D transforms. */
export function browser({ id, x, y, w, ground = "night" }) {
  const bar = Math.round(w * 0.04);
  const h = Math.round((w * 1800) / 2880);
  const dot = Math.round(bar * 0.24);
  const dark = GROUND[ground].dark;
  return `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;border-radius:20px;overflow:hidden;background:#0B1030;
      box-shadow:0 60px 120px -30px rgba(0,0,10,.8), 0 20px 40px -14px rgba(0,0,20,.5), 0 0 0 1.5px rgba(130,178,255,.22)">
    <div style="height:${bar}px;display:flex;align-items:center;gap:${Math.round(dot * 0.8)}px;padding:0 ${Math.round(bar * 0.5)}px;position:relative;background:#121845;border-bottom:1px solid rgba(140,185,255,.14)">
      ${[0, 1, 2].map(() => `<span style="width:${dot}px;height:${dot}px;border-radius:50%;background:rgba(200,215,255,.26)"></span>`).join("")}
      <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);height:${Math.round(bar * 0.6)}px;width:${Math.round(w * 0.3)}px;border-radius:999px;
          display:flex;align-items:center;justify-content:center;font:500 ${Math.round(bar * 0.34)}px/1 Inter,sans-serif;color:rgba(220,232,255,.78);background:rgba(255,255,255,.06)">vallospaces.com</div>
    </div>
    <img src="${u(join(SOURCE, `${id}.webp`))}" alt="" style="display:block;width:${w}px;height:${h}px">
  </div>`;
  void dark;
}
