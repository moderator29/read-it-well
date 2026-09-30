/* The shared look of every social image: brand tokens, the fonts, the only
 * decorative objects (Fluent 3D stickers), line icons, the "just arrived"
 * pop-up cards, chips, the wordmark and a fine grain. Posts compose these. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BRAND, FONTS, NM } from "./paths.mjs";
import { u } from "./render.mjs";

export const C = {
  ink: "#010118",
  navy: "#02063F",
  electric: "#0069FE",
  e600: "#0056D0",
  e700: "#003F98",
  quiet: "#5C9FFF",
  sky: "#8FD3FF",
  paper: "#FFFFFF",
  mist: "#F3F7FF",
  studio: "#F2F3F6",
  orange: "#FF6B1A",
  peach: "#FFB27A",
};

const LATIN = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const LATIN_EXT = "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF";
const VIET = "U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB";

const face = (family, weight, file, range, style = "normal") =>
  `@font-face{font-family:"${family}";font-style:${style};font-weight:${weight};font-display:block;src:url("${u(file)}") format("woff2");unicode-range:${range};}`;

export function fontsCss() {
  const fs = join(NM, "@fontsource", "poppins", "files");
  const out = [];
  for (const w of [600, 700]) {
    out.push(face("Poppins", w, join(FONTS, `poppins-${w}-latin.woff2`), LATIN));
    out.push(face("Poppins", w, join(FONTS, `poppins-${w}-latin-ext.woff2`), LATIN_EXT));
  }
  for (const w of [300, 400, 500, 800]) {
    out.push(face("Poppins", w, join(fs, `poppins-latin-${w}-normal.woff2`), LATIN));
    out.push(face("Poppins", w, join(fs, `poppins-latin-ext-${w}-normal.woff2`), LATIN_EXT));
  }
  out.push(face("Inter", "100 900", join(FONTS, "inter-latin.woff2"), LATIN));
  out.push(face("Inter", "100 900", join(FONTS, "inter-latin-ext.woff2"), LATIN_EXT));
  out.push(face("Inter", "100 900", join(FONTS, "inter-vietnamese.woff2"), VIET));
  const is = join(NM, "@fontsource", "instrument-serif", "files");
  out.push(face("Instrument Serif", 400, join(is, "instrument-serif-latin-400-italic.woff2"), LATIN, "italic"));
  out.push(face("Instrument Serif", 400, join(is, "instrument-serif-latin-ext-400-italic.woff2"), LATIN_EXT, "italic"));
  return out.join("\n");
}

/** The base stylesheet every post starts from. */
export function baseCss(W, H) {
  return `
${fontsCss()}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{position:relative;font-family:"Inter",sans-serif;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision;font-feature-settings:"cv11","ss01";}
.abs{position:absolute}
.layer{position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none}
.h{font-family:"Poppins","Inter",sans-serif;font-weight:700;letter-spacing:-0.03em;line-height:1.04}
.h6{font-family:"Poppins","Inter",sans-serif;font-weight:600;letter-spacing:-0.03em;line-height:1.06}
.serif{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;letter-spacing:-0.01em}
.accent-d{background:linear-gradient(92deg,#5C9FFF 0%,#8FD3FF 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.accent-l{color:#0056D0}
.warm{background:linear-gradient(92deg,#FF6B1A 0%,#FFB27A 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.body-d{color:rgba(255,255,255,.72);font-weight:400}
.body-l{color:#4A5170;font-weight:400}
.nowrap{white-space:nowrap}
`;
}

export function page({ W, H, css = "", body = "", bg = C.ink }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss(W, H)}
body{background:${bg}}
${css}</style></head><body>${body}</body></html>`;
}

/* ------------------------------------------------------------------ assets */

export const art = (n) => u(join(BRAND, "onboarding", `step-${n}-dark.webp`));
export const photo = (name) => u(join(BRAND, "photos", `${name}.jpg`));
export const brand = (f) => u(join(BRAND, f));
export const img = (abs) => u(abs);

/** A Fluent 3D sticker. Never larger than ~260 px on a 1320-wide canvas. */
export function sticker(code, px, style = "", cls = "") {
  return `<img class="stk ${cls}" src="${u(join(NM, "@lobehub", "fluent-emoji-3d", "assets", `${code}.webp`))}" style="width:${px}px;height:${px}px;${style}" alt="">`;
}

/** A lucide line icon, inline. */
export function icon(name, { size = 24, color = "currentColor", stroke = 2, style = "" } = {}) {
  let svg = readFileSync(join(NM, "lucide-static", "icons", `${name}.svg`), "utf8").replace(/<!--.*?-->/s, "");
  svg = svg
    .replace(/width="24"/, `width="${size}"`)
    .replace(/height="24"/, `height="${size}"`)
    .replace(/stroke-width="2"/, `stroke-width="${stroke}"`)
    .replace(/stroke="currentColor"/, `stroke="${color}"`)
    .replace("<svg", `<svg style="display:block;${style}"`);
  return svg;
}

/** The glass wordmark ("VALLO"), in its dark-ground or light-ground cut. */
export function wordmark({ theme = "dark", h = 40, style = "" } = {}) {
  const f = theme === "dark" ? "vallo-wordmark.png" : "vallo-wordmark-light.png";
  return `<img src="${brand(f)}" style="height:${h}px;width:auto;display:block;${style}" alt="Vallo">`;
}
export function mark({ theme = "dark", h = 40, style = "" } = {}) {
  const f = theme === "dark" ? "vallo-mark.png" : "vallo-mark-light.png";
  return `<img src="${brand(f)}" style="height:${h}px;width:auto;display:block;${style}" alt="">`;
}
/** The mark and the wordmark side by side, sized by the wordmark's height. */
export function lockup({ theme = "dark", h = 34, gap = 0.34, style = "" } = {}) {
  return `<div style="display:flex;align-items:center;gap:${Math.round(h * gap)}px;${style}">${mark({ theme, h: Math.round(h * 1.5) })}${wordmark({ theme, h })}</div>`;
}

/** Fine film grain, to keep large gradients from banding and add a little tooth. */
export function grain(opacity = 0.06, blend = "overlay", seed = 3) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='360'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' seed='${seed}' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`;
  return `<div class="layer" style="background-image:url(&quot;data:image/svg+xml;utf8,${svg}&quot;);background-size:360px 360px;opacity:${opacity};mix-blend-mode:${blend}"></div>`;
}

/* ------------------------------------------------------------------ chips and cards */

/** The "Example" chip (every amount shown is the product's own example data). */
export function chip(text = "Example", { theme = "dark", size = 20, style = "" } = {}) {
  const d = theme === "dark";
  return `<span style="display:inline-flex;align-items:center;gap:${Math.round(size * 0.4)}px;height:${Math.round(size * 1.8)}px;padding:0 ${Math.round(size * 0.75)}px;border-radius:999px;
    font:600 ${size}px/1 Inter,sans-serif;letter-spacing:.01em;white-space:nowrap;
    color:${d ? "rgba(255,255,255,.86)" : "#2B3355"};background:${d ? "rgba(255,255,255,.10)" : "rgba(2,6,63,.06)"};
    border:1px solid ${d ? "rgba(255,255,255,.18)" : "rgba(2,6,63,.12)"};${style}">${icon("info", { size: Math.round(size * 0.95), color: d ? "rgba(255,255,255,.8)" : "#2B3355", stroke: 2.2 })}${text}</span>`;
}

/** A small pill label (eyebrows, tags). */
export function pill(html, { theme = "dark", size = 22, style = "" } = {}) {
  const d = theme === "dark";
  return `<span style="display:inline-flex;align-items:center;gap:${Math.round(size * 0.45)}px;height:${Math.round(size * 2)}px;padding:0 ${Math.round(size * 0.9)}px;border-radius:999px;
    font:600 ${size}px/1 Inter,sans-serif;letter-spacing:.005em;white-space:nowrap;
    color:${d ? "#DCE8FF" : "#0B1446"};background:${d ? "rgba(92,159,255,.14)" : "rgba(255,255,255,.78)"};
    border:1px solid ${d ? "rgba(120,170,255,.30)" : "rgba(2,6,63,.08)"};${d ? "" : "box-shadow:0 6px 20px rgba(20,30,90,.08);"}${style}">${html}</span>`;
}

/**
 * The "just arrived" pop-up card (DESIGN.md section 4).
 *   icon: { sticker: "1f6ce-fe0f" } or { lucide: "bed", tint: "#0069FE" }
 */
export function popup({ theme = "dark", icon: ic, title, sub, amount = "", time = "", chipText = "", width = 620, scale = 1, style = "" }) {
  const d = theme === "dark";
  const s = (v) => Math.round(v * scale);
  const chipSize = s(34);
  let iconHtml = "";
  if (ic?.sticker) iconHtml = `<div style="width:${s(84)}px;height:${s(84)}px;border-radius:${s(26)}px;flex:none;display:grid;place-items:center;
      background:${d ? "linear-gradient(145deg,rgba(92,159,255,.26),rgba(0,105,254,.10))" : "linear-gradient(145deg,#EAF2FF,#DCE9FF)"};
      border:1px solid ${d ? "rgba(140,185,255,.28)" : "rgba(0,86,208,.10)"}">${sticker(ic.sticker, s(62))}</div>`;
  else if (ic?.lucide) iconHtml = `<div style="width:${s(84)}px;height:${s(84)}px;border-radius:${s(26)}px;flex:none;display:grid;place-items:center;
      background:${ic.tint || C.electric};box-shadow:0 ${s(8)}px ${s(24)}px ${ic.tint ? ic.tint + "55" : "rgba(0,105,254,.35)"}">${icon(ic.lucide, { size: s(40), color: "#fff", stroke: 2.1 })}</div>`;
  return `<div class="popup" style="width:${s(width)}px;display:flex;align-items:center;gap:${s(22)}px;padding:${s(22)}px ${s(26)}px ${s(22)}px ${s(22)}px;
    border-radius:${s(32)}px;
    background:${d ? "rgba(10,16,60,.82)" : "rgba(255,255,255,.92)"};
    border:${d ? 1.5 : 1}px solid ${d ? "rgba(120,170,255,.35)" : "rgba(255,255,255,.9)"};
    -webkit-backdrop-filter:blur(${s(22)}px) saturate(1.4);backdrop-filter:blur(${s(22)}px) saturate(1.4);
    box-shadow:${d ? `0 ${s(40)}px ${s(90)}px rgba(0,0,12,.55), 0 ${s(8)}px ${s(24)}px rgba(0,0,20,.35), inset 0 1px 0 rgba(255,255,255,.08)` : `0 ${s(40)}px ${s(90)}px rgba(18,28,80,.18), 0 ${s(8)}px ${s(24)}px rgba(18,28,80,.10)`};
    ${style}">
    ${iconHtml}
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:${s(12)}px;justify-content:space-between">
        <div style="font:700 ${s(31)}px/1.15 Poppins,Inter,sans-serif;letter-spacing:-0.02em;color:${d ? "#fff" : "#0A1030"};white-space:nowrap">${title}</div>
        ${time ? `<div style="font:500 ${s(22)}px/1 Inter,sans-serif;color:${d ? "rgba(255,255,255,.62)" : "#5A6079"};white-space:nowrap">${time}</div>` : ""}
      </div>
      <div style="margin-top:${s(7)}px;font:450 ${s(24)}px/1.3 Inter,sans-serif;color:${d ? "rgba(225,234,255,.78)" : "#4A5170"}">${sub}</div>
      ${amount || chipText ? `<div style="margin-top:${s(12)}px;display:flex;align-items:center;gap:${s(14)}px">
        ${amount ? `<div style="font:700 ${s(30)}px/1 Inter,sans-serif;letter-spacing:-0.01em;color:${d ? "#8FD3FF" : "#0056D0"}">${amount}</div>` : ""}
        ${chipText ? chip(chipText, { theme, size: Math.round(chipSize * 0.55) }) : ""}</div>` : ""}
    </div>
  </div>`;
}

/** The quiet corner labels the reference mockups carry, in Vallo's words. */
export function corners({ left = "", right = "vallospaces.com", theme = "light", top = 56, side = 64, size = 21, style = "" } = {}) {
  const col = theme === "light" ? "#5A6079" : "rgba(214,226,255,.62)";
  const st = `position:absolute;top:${top}px;font:500 ${size}px/1 Inter,sans-serif;letter-spacing:.01em;color:${col};white-space:nowrap;${style}`;
  return `${left ? `<div style="${st};left:${side}px">${left}</div>` : ""}${right ? `<div style="${st};right:${side}px">${right}</div>` : ""}`;
}

/**
 * A browser window drawn in CSS around a desktop capture (2880 x 1800, 16:10).
 * Neutral chrome: three grey dots and an address pill, no browser's branding.
 */
export function browser({ src, w, theme = "dark", url = "vallospaces.com", radius = 22, style = "" }) {
  const d = theme === "dark";
  const bar = Math.round(w * 0.042);
  const h = Math.round((w * 1800) / 2880);
  const dot = Math.round(bar * 0.24);
  return `<div class="browser" style="width:${w}px;border-radius:${radius}px;overflow:hidden;
      background:${d ? "#0B1030" : "#FFFFFF"};border:1px solid ${d ? "rgba(140,185,255,.22)" : "rgba(2,6,63,.10)"};${style}">
    <div style="height:${bar}px;display:flex;align-items:center;padding:0 ${Math.round(bar * 0.5)}px;gap:${Math.round(dot * 0.8)}px;position:relative;
        background:${d ? "linear-gradient(180deg,#141A44,#0E1438)" : "linear-gradient(180deg,#F7F8FB,#EEF0F5)"};border-bottom:1px solid ${d ? "rgba(140,185,255,.14)" : "rgba(2,6,63,.08)"}">
      ${[0, 1, 2].map(() => `<span style="width:${dot}px;height:${dot}px;border-radius:50%;background:${d ? "rgba(200,215,255,.28)" : "rgba(2,6,63,.16)"}"></span>`).join("")}
      <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);height:${Math.round(bar * 0.62)}px;width:${Math.round(w * 0.34)}px;border-radius:999px;
          display:flex;align-items:center;justify-content:center;font:500 ${Math.round(bar * 0.34)}px/1 Inter,sans-serif;letter-spacing:.01em;
          color:${d ? "rgba(220,232,255,.82)" : "#3B4262"};background:${d ? "rgba(255,255,255,.07)" : "rgba(2,6,63,.05)"}">${url}</div>
    </div>
    <img src="${src}" style="display:block;width:${w}px;height:${h}px" alt="">
  </div>`;
}

/**
 * A generic laptop drawn in CSS (no maker's marks): a dark lid with a thin
 * bezel and a camera dot, and a brushed-metal base with a thumb notch.
 * `w` is the width of the screen area (16:10). Returns { html, width, height }.
 */
export function laptop({ src, w, metal = "silver", style = "" }) {
  const sh = Math.round((w * 1800) / 2880);
  const bz = Math.round(w * 0.018); // bezel
  const top = Math.round(w * 0.026);
  const bot = Math.round(w * 0.03);
  const lidW = w + bz * 2;
  const lidH = sh + top + bot;
  const baseW = Math.round(lidW * 1.14);
  const baseH = Math.round(w * 0.026);
  const m = metal === "silver"
    ? { a: "#E6E8ED", b: "#C9CDD6", c: "#9EA4B2", edge: "#F7F8FA" }
    : { a: "#4A4E5A", b: "#30333C", c: "#1D1F26", edge: "#6A6F7C" };
  const html = `<div class="laptop" style="position:relative;width:${baseW}px;height:${lidH + baseH}px;${style}">
    <div style="position:absolute;left:${(baseW - lidW) / 2}px;top:0;width:${lidW}px;height:${lidH}px;border-radius:${Math.round(w * 0.028)}px ${Math.round(w * 0.028)}px ${Math.round(w * 0.008)}px ${Math.round(w * 0.008)}px;
        background:#07080C;box-shadow:inset 0 0 0 ${Math.max(1, Math.round(w * 0.0025))}px ${m.c}, inset 0 0 0 ${Math.max(2, Math.round(w * 0.004))}px #1A1C22">
      <span style="position:absolute;left:50%;top:${Math.round(top * 0.42)}px;width:${Math.round(w * 0.006)}px;height:${Math.round(w * 0.006)}px;margin-left:-${Math.round(w * 0.003)}px;border-radius:50%;background:#1E2230;box-shadow:inset 0 0 0 1px #2C3142"></span>
      <img src="${src}" style="position:absolute;left:${bz}px;top:${top}px;width:${w}px;height:${sh}px;display:block;border-radius:2px" alt="">
    </div>
    <div style="position:absolute;left:0;top:${lidH}px;width:${baseW}px;height:${baseH}px;border-radius:2px 2px ${Math.round(baseH * 1.2)}px ${Math.round(baseH * 1.2)}px / 2px 2px ${baseH}px ${baseH}px;
        background:linear-gradient(180deg,${m.edge} 0%,${m.a} 18%,${m.b} 60%,${m.c} 100%);box-shadow:0 ${Math.round(baseH * 0.2)}px ${Math.round(baseH * 0.4)}px rgba(0,0,0,.18)">
      <span style="position:absolute;left:50%;top:0;width:${Math.round(baseW * 0.16)}px;height:${Math.round(baseH * 0.36)}px;margin-left:-${Math.round(baseW * 0.08)}px;border-radius:0 0 ${Math.round(baseH * 0.5)}px ${Math.round(baseH * 0.5)}px;
          background:linear-gradient(180deg,${m.c},${m.b})"></span>
    </div>
  </div>`;
  return { html, width: baseW, height: lidH + baseH, screen: { x: (baseW - lidW) / 2 + bz, y: top, w, h: sh } };
}

/** A phone layer (from phones.mjs) as stacked images: its shadow, then the phone. */
export function phoneHtml(layer, { shadowOpacity = 1, shadowBlend = "multiply", style = "", cls = "" } = {}) {
  const sh = layer.shadow ? `<img class="layer ${cls}" src="${u(layer.shadow)}" style="opacity:${shadowOpacity};mix-blend-mode:${shadowBlend};${style}" alt="">` : "";
  return `${sh}<img class="layer ${cls}" src="${u(layer.src)}" style="${style}" alt="">`;
}
