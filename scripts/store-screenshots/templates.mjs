/**
 * The store images as HTML, rendered by Chromium at each store's exact pixel
 * size (compose.mjs). HTML rather than an image library because the headline
 * is the thing people read first, and a browser sets Poppins and Inter with
 * real kerning: the same faces the product itself ships.
 *
 * Every layout is drawn on a stage 1320 units wide whose height follows the
 * target's aspect ratio, then scaled to the target. So one design serves the
 * 6.9" App Store size and the shorter 9:16 Play size, where phones sit lower
 * and show less rather than shrink.
 *
 * Layouts (`shot.layout` in shots.mjs), every one showing whole phones:
 *   hero       one phone, straight, as large as the image allows
 *   tilt       one phone turned a little in 3D
 *   photo      a property photograph behind, the phone standing in front
 *   photocard  a photograph on a tilted card behind the phone's shoulder
 *   card       an inset rounded card holding the words and the phone
 *   duo        two phones, the second in front and a step lower
 *   brand      the closing card: icon, wordmark and line, no phone
 */
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { CAPTURE } from "./targets.mjs";

const W = 1320;
export const stageHeight = (target) => (W * target.height) / target.width;
const fileUrl = (p) => pathToFileURL(p).href;

/* ------------------------------------------------------------ palette */

/* From packages/design-tokens/src/tokens.css, so the ground and the product
   agree: canvas #010118, electric 300/600/700, the quiet blue. */
const INK = "#010118";
const ELECTRIC = "#0069FE";
const ELECTRIC_600 = "#0056D0";
const ELECTRIC_700 = "#003F98";
const QUIET = "#5C9FFF";

const GROUNDS = {
  electric: `
    radial-gradient(120% 60% at 50% 0%, rgb(120 176 255 / 0.40) 0%, transparent 60%),
    radial-gradient(90% 50% at 50% 100%, rgb(0 20 90 / 0.55) 0%, transparent 70%),
    linear-gradient(180deg, #0B63FF 0%, ${ELECTRIC_600} 52%, ${ELECTRIC_700} 100%)`,
  navy: `
    radial-gradient(80% 42% at 82% 34%, rgb(0 105 254 / 0.55) 0%, transparent 70%),
    radial-gradient(70% 40% at 8% 88%, rgb(92 159 255 / 0.28) 0%, transparent 70%),
    linear-gradient(180deg, #02063F 0%, ${INK} 100%)`,
  aurora: `
    radial-gradient(70% 38% at 12% 8%, rgb(0 86 208 / 0.85) 0%, transparent 70%),
    radial-gradient(60% 34% at 95% 42%, rgb(92 159 255 / 0.45) 0%, transparent 70%),
    radial-gradient(80% 40% at 40% 100%, rgb(12 106 239 / 0.55) 0%, transparent 72%),
    linear-gradient(180deg, #030437 0%, ${INK} 100%)`,
  midnight: `
    radial-gradient(70% 36% at 50% 30%, rgb(0 86 208 / 0.45) 0%, transparent 72%),
    radial-gradient(60% 30% at 50% 100%, rgb(12 106 239 / 0.30) 0%, transparent 72%),
    ${INK}`,
  light: `
    radial-gradient(110% 55% at 50% 0%, #FFFFFF 0%, transparent 70%),
    radial-gradient(60% 34% at 96% 46%, rgb(0 105 254 / 0.14) 0%, transparent 70%),
    linear-gradient(180deg, #F3F7FF 0%, #DCE8FF 100%)`,
};

/* Line one in full ink, line two carrying the brand: white on the electric
   ground (weight does the work), the welcome screen's own cyan to electric
   sweep on navy, electric itself on paper. */
function ink(ground) {
  if (ground === "electric") {
    return { head: "#FFFFFF", accent: null, sub: "rgb(232 240 255 / 0.92)", pillBg: "rgb(255 255 255 / 0.14)", pillEdge: "rgb(255 255 255 / 0.34)", pillInk: "#FFFFFF" };
  }
  if (ground === "light") {
    return { head: "#06123A", accent: "linear-gradient(90deg, #0069FE 0%, #0042FD 100%)", sub: "rgb(6 18 58 / 0.70)", pillBg: "rgb(0 105 254 / 0.08)", pillEdge: "rgb(0 105 254 / 0.28)", pillInk: ELECTRIC_600 };
  }
  return { head: "#FFFFFF", accent: "linear-gradient(90deg, #8FD3FF 0%, #4C9BFF 50%, #2F7BFF 100%)", sub: "rgb(214 228 255 / 0.86)", pillBg: "rgb(92 159 255 / 0.14)", pillEdge: "rgb(92 159 255 / 0.42)", pillInk: "#CFE2FF" };
}

/* ------------------------------------------------------------ texture */

function grid(ground) {
  const line = ground === "light" ? "rgb(0 86 208 / 0.07)" : "rgb(92 159 255 / 0.10)";
  return `<div class="grid" style="background-image:linear-gradient(${line} 2px, transparent 2px),linear-gradient(90deg, ${line} 2px, transparent 2px)"></div>`;
}

/* The logo's orbit: faint ellipses behind a phone, dashed on the tilt layout
   the way X draws its arcs. */
function orbit({ cx, cy, w, ground, dashed = false, rotate = -14 }) {
  const stroke = ground === "light" ? "rgb(0 86 208 / 0.16)" : "rgb(255 255 255 / 0.15)";
  const dash = dashed ? ' stroke-dasharray="10 16"' : "";
  const rings = [1, 0.78, 0.56]
    .map((k, i) => `<ellipse cx="0" cy="0" rx="${(w / 2) * k}" ry="${(w / 2) * k * 0.36}" fill="none" stroke="${stroke}" stroke-width="${3 - i * 0.5}"${dash}/>`)
    .join("");
  return `<svg class="orbit" style="left:${cx - w / 2}px;top:${cy - w / 2}px" width="${w}" height="${w}" viewBox="${-w / 2} ${-w / 2} ${w} ${w}"><g transform="rotate(${rotate})">${rings}</g></svg>`;
}

/* ------------------------------------------------------------ the phone */

/* Full signal, full Wi-Fi, full battery: the state a screenshot's status bar
   is expected to show. Plain shapes. */
function statusGlyphs(fg) {
  return `
    <svg width="60" height="36" viewBox="0 0 20 12" fill="${fg}" aria-hidden="true">
      <rect x="0" y="8" width="3.4" height="4" rx="1"/><rect x="5.2" y="5.6" width="3.4" height="6.4" rx="1"/>
      <rect x="10.4" y="3" width="3.4" height="9" rx="1"/><rect x="15.6" y="0" width="3.4" height="12" rx="1"/>
    </svg>
    <svg width="54" height="39" viewBox="0 0 18 13" fill="${fg}" aria-hidden="true">
      <path d="M9 12.6 6.2 9.4a4 4 0 0 1 5.6 0L9 12.6Z"/>
      <path d="M3.4 6.6a8 8 0 0 1 11.2 0l-1.5 1.7a5.8 5.8 0 0 0-8.2 0L3.4 6.6Z"/>
      <path d="M.6 3.6a12 12 0 0 1 16.8 0l-1.5 1.7a9.8 9.8 0 0 0-13.8 0L.6 3.6Z"/>
    </svg>
    <svg width="87" height="39" viewBox="0 0 29 13" aria-hidden="true">
      <rect x="0.6" y="0.6" width="24.4" height="11.8" rx="3.6" fill="none" stroke="${fg}" stroke-opacity="0.4" stroke-width="1.2"/>
      <rect x="2.4" y="2.4" width="20.8" height="8.2" rx="2.2" fill="${fg}"/>
      <path d="M26.4 4.4v4.2a2.2 2.2 0 0 0 0-4.2Z" fill="${fg}" fill-opacity="0.45"/>
    </svg>`;
}

/**
 * The screen at the capture's own pixel size: the status bar the native shell
 * draws above the web view (`overlaysWebView: false`, in the theme's colour),
 * then the live capture. Scaled once, never resampled twice.
 */
function screenInner({ capture, mode, statusTime }) {
  const s = CAPTURE.scale;
  const w = CAPTURE.widthPt * s;
  const barH = CAPTURE.statusBarPt * s;
  const webH = CAPTURE.webviewHeightPt * s;
  const dark = mode === "dark";
  return `
    <div class="screen-inner" style="width:${w}px;height:${barH + webH}px;background:${dark ? INK : "#FFFFFF"}">
      <div class="status" style="height:${barH}px;color:${dark ? "#FFFFFF" : "#000000"}">
        <span class="time">${statusTime}</span>
        <span class="glyphs">${statusGlyphs(dark ? "#FFFFFF" : "#000000")}</span>
      </div>
      <img class="webview" src="${fileUrl(capture)}" style="width:${w}px;height:${webH}px" />
    </div>`;
}

const phoneH = (screenW) => (screenW * CAPTURE.screenHeightPt) / CAPTURE.widthPt;
const RIM = 0.03;

/**
 * A phone whose screen is `screenW` wide with its top left corner at (x, y).
 *
 * Drawn here, with no maker's marks: on the App Store images a handset with a
 * pill shaped camera island and rounded corners; on the Play images an
 * Android handset with a punch hole camera, flatter corners and its keys on
 * the right. Each store sees its own kind of phone (App Store Review
 * Guideline 2.3.10 keeps other platforms' imagery out of App Store metadata). Where Apple's own bezel has been placed in
 * frames/ and the layout keeps the phone upright and whole, that artwork is
 * used instead (frames/README.md).
 */
function phone({ capture, mode, statusTime, screenW, x, y, transform = "", cutout = "island", z = 2, bezel = null }) {
  const nativeW = CAPTURE.widthPt * CAPTURE.scale;
  const k = screenW / nativeW;
  const screenH = phoneH(screenW);
  if (bezel) {
    const bk = screenW / bezel.screen.w;
    return `
      <div class="phone apple" style="left:${x - bezel.screen.x * bk}px;top:${y - bezel.screen.y * bk}px;width:${bezel.width * bk}px;height:${bezel.height * bk}px;z-index:${z}">
        <div class="screen" style="position:absolute;left:${bezel.screen.x * bk}px;top:${bezel.screen.y * bk}px;width:${screenW}px;height:${screenH}px;border-radius:${bezel.cornerRadius * bk}px">
          <div style="transform:scale(${k});transform-origin:0 0">${screenInner({ capture, mode, statusTime })}</div>
        </div>
        <img class="bezel" src="${fileUrl(bezel.file)}" style="width:${bezel.width * bk}px;height:${bezel.height * bk}px" />
      </div>`;
  }
  const android = cutout === "punch";
  const rim = screenW * (android ? RIM * 0.8 : RIM);
  const radius = screenW * (android ? 0.095 : 0.13);
  const cut =
    cutout === "island"
      ? `<div class="island" style="top:${screenW * 0.026}px;left:${(screenW - screenW * 0.285) / 2}px;width:${screenW * 0.285}px;height:${screenW * 0.084}px"><i style="width:${screenW * 0.03}px;height:${screenW * 0.03}px;right:${screenW * 0.03}px"></i></div>`
      : `<div class="punch" style="top:${screenW * 0.03}px;left:${(screenW - screenW * 0.052) / 2}px;width:${screenW * 0.052}px;height:${screenW * 0.052}px"></div>`;
  const btn = (side, top, h) =>
    `<span class="btn" style="${side}:${-screenW * 0.011}px;top:${top * screenH}px;width:${screenW * 0.014}px;height:${h * screenH}px"></span>`;
  return `
    <div class="phone${android ? " android" : ""}" style="left:${x - rim}px;top:${y - rim}px;width:${screenW + rim * 2}px;height:${screenH + rim * 2}px;border-radius:${radius + rim}px;padding:${rim}px;z-index:${z};${transform ? `transform:${transform};` : ""}">
      ${android ? `${btn("right", 0.22, 0.12)}${btn("right", 0.37, 0.07)}` : `${btn("left", 0.2, 0.06)}${btn("left", 0.29, 0.1)}${btn("left", 0.41, 0.1)}${btn("right", 0.3, 0.14)}`}
      <div class="screen" style="position:relative;width:${screenW}px;height:${screenH}px;border-radius:${radius}px">
        <div style="transform:scale(${k});transform-origin:0 0">${screenInner({ capture, mode, statusTime })}</div>
        ${cut}
      </div>
    </div>`;
}

/* ------------------------------------------------------------ words */

/* Two lines of headline and, rarely, one line under them. No label above:
   the height goes to the phone. */
const HEAD_LINE = 128;
function headerHeight(shot) {
  return 2 * HEAD_LINE + (shot.sub ? 30 + (shot.sub.length > 48 ? 2 : 1) * 58 : 0);
}

function header({ shot, ground, top, align = "center", left = 0, width = W }) {
  const c = ink(ground);
  const [l1, l2] = shot.headline;
  const accent = c.accent ? ` style="background:${c.accent};-webkit-background-clip:text;background-clip:text;color:transparent"` : "";
  return `
    <header class="head" style="top:${top}px;left:${left}px;width:${width}px;text-align:${align};align-items:${align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start"}">
      <h1 style="color:${c.head}"><span class="l1">${l1}</span><span class="l2"${accent}>${l2}</span></h1>
      ${shot.sub ? `<p class="sub" style="color:${c.sub}">${shot.sub}</p>` : ""}
    </header>`;
}

/* A glass brand object: additive light, so dark grounds only. Positions are
   fractions of the stage so one placement serves every size. */
function glassObjects({ shot, H, brandDir }) {
  if (shot.mode === "light") return "";
  return (shot.glass ?? [])
    .map((g) => {
      const size = W * g.size;
      return `<img class="glass" src="${fileUrl(join(brandDir, "glass", g.file))}" style="left:${W * g.x - size / 2}px;top:${H * g.y - size / 2}px;width:${size}px;height:${size}px;transform:rotate(${g.rotate ?? 0}deg);z-index:${g.z ?? 7}" />`;
    })
    .join("");
}

/* ------------------------------------------------------------ layouts */

/* A whole phone, rim included, is 1.06 screen widths wide and this many tall. */
const FULL_H = (screenW) => phoneH(screenW) + screenW * RIM * 2;
const FULL_W = (screenW) => screenW * (1 + RIM * 2);
/* The narrowest margin a phone keeps from either side of the image. */
const SIDE = 120;

/** The largest screen width whose whole phone fits a box. */
function fit(boxW, boxH) {
  return Math.min(boxW / (1 + RIM * 2), boxH / (FULL_H(1)));
}

export function renderShot({ shot, target, captures, bezels, brandDir, fontsDir }) {
  const H = stageHeight(target);
  const mode = shot.mode;
  const ground = shot.ground ?? (mode === "light" ? "light" : "navy");
  const statusTime = target.statusTime;
  const cutout = target.frames === "apple" ? "island" : "punch";
  const topPad = H * 0.05;
  const below = topPad + headerHeight(shot) + H * 0.032;
  const bottom = H * 0.035;
  const boxH = H - below - bottom;
  /* Apple's bezel only where the phone stays upright and whole. */
  const appleBezel = target.frames === "apple" && shot.appleFrame ? bezels?.dynamicIsland ?? null : null;
  const ph = (i, opts) => phone({ capture: captures[i] ?? captures[0], mode, statusTime, cutout, ...opts });
  /* Place a whole phone of screen width sw centred in the box below the words. */
  const centred = (sw, dx = 0) => ({ x: (W - sw) / 2 + dx, y: below + (boxH - FULL_H(sw)) / 2 + sw * RIM });
  let body = "";
  let stageGround = GROUNDS[ground] ?? GROUNDS.navy;

  switch (shot.layout) {
    case "hero": {
      /* One phone, whole, as large as the image allows. */
      const sw = fit(W - SIDE * 2, boxH);
      const at = centred(sw);
      body += grid(ground);
      body += orbit({ cx: W / 2, cy: below + boxH * 0.5, w: W * 1.3, ground });
      body += header({ shot, ground, top: topPad });
      body += ph(0, { screenW: sw, ...at, bezel: appleBezel });
      break;
    }
    case "tilt": {
      /* The same whole phone turned a little in 3D, sized so its turned
         outline still keeps the margins. */
      const right = shot.side !== "left";
      const sw = fit(W - SIDE * 2, boxH) * 0.86;
      const at = centred(sw, right ? W * 0.02 : -W * 0.02);
      const lean = right ? "rotateY(-14deg) rotateX(4deg) rotate(4deg)" : "rotateY(14deg) rotateX(4deg) rotate(-4deg)";
      body += orbit({ cx: W / 2, cy: below + boxH * 0.45, w: W * 1.45, ground, dashed: true, rotate: right ? -22 : 22 });
      body += header({ shot, ground, top: topPad });
      body += ph(0, { screenW: sw, ...at, transform: `perspective(${W * 3.4}px) ${lean}` });
      break;
    }
    case "photo": {
      /* A product photograph behind the upper half, fading into the ground,
         and the whole phone standing in front of it. */
      const bandH = H * 0.62;
      body += `<div class="photo" style="height:${bandH}px;background-image:url('${fileUrl(join(brandDir, "photos", shot.photo))}');background-position:${shot.photoPosition ?? "center"}"></div>`;
      body += `<div class="photo-veil" style="height:${bandH + 2}px"></div>`;
      const sw = fit(W - SIDE * 2, boxH);
      body += header({ shot, ground: "navy", top: topPad });
      body += ph(0, { screenW: sw, ...centred(sw) });
      stageGround = GROUNDS.midnight;
      break;
    }
    case "photocard": {
      /* A photograph on a tilted card behind the phone's left shoulder. */
      const sw = fit(W - SIDE * 2, boxH) * 0.9;
      const at = centred(sw, W * 0.06);
      const cardW = W * 0.6;
      body += `<div class="photo-card" style="left:${W * 0.04}px;top:${below + boxH * 0.06}px;width:${cardW}px;height:${cardW * 1.3}px;background-image:url('${fileUrl(join(brandDir, "photos", shot.photo))}');background-position:${shot.photoPosition ?? "center"}"></div>`;
      body += header({ shot, ground, top: topPad });
      body += ph(0, { screenW: sw, ...at });
      break;
    }
    case "card": {
      /* TikTok's and Kraken's inset card, with the whole phone inside it. */
      const inset = 44;
      const cardTop = H * 0.022;
      const cardGround = shot.cardGround ?? "electric";
      const sw = fit(W - inset * 2 - SIDE * 1.4, boxH - bottom * 0.6);
      const at = centred(sw);
      body += `<div class="inset-card" style="left:${inset}px;top:${cardTop}px;width:${W - inset * 2}px;height:${H - cardTop - inset}px;background:${GROUNDS[cardGround]}">${grid("navy")}</div>`;
      body += header({ shot, ground: cardGround, top: topPad });
      body += ph(0, { screenW: sw, x: at.x, y: at.y - bottom * 0.3 });
      stageGround = GROUNDS.midnight;
      break;
    }
    case "duo": {
      /* Two whole phones, the second in front and a step lower. */
      const overlap = 0.3;
      const step = 0.1;
      const sw = Math.min((W - SIDE * 2.4) / (FULL_W(1) * (2 - overlap)), boxH / (FULL_H(1) * (1 + step) * 1.04));
      const pairW = FULL_W(sw) * (2 - overlap);
      const x1 = (W - pairW) / 2 + sw * RIM;
      const x2 = x1 + FULL_W(sw) * (1 - overlap);
      const top = below + (boxH - FULL_H(sw) * (1 + step)) / 2 + sw * RIM;
      body += grid(ground);
      body += orbit({ cx: W / 2, cy: below + boxH * 0.5, w: W * 1.3, ground });
      body += header({ shot, ground, top: topPad });
      body += ph(1, { screenW: sw, x: x1, y: top, transform: `perspective(${sw * 5}px) rotateY(14deg) rotate(-6deg)`, z: 1 });
      body += ph(0, { screenW: sw, x: x2, y: top + FULL_H(sw) * step, transform: `perspective(${sw * 5}px) rotateY(-14deg) rotate(4deg)`, z: 2 });
      break;
    }
    default:
      throw new Error(`shot ${shot.n}: unknown layout ${shot.layout}`);
  }

  body += glassObjects({ shot, H, brandDir });
  return page({ target, H, body, fontsDir, ground: stageGround });
}

export function renderBrand({ shot, target, brandDir, fontsDir }) {
  const H = stageHeight(target);
  const wide = target.width / target.height > 1.5;
  const icon = join(brandDir, "vallo-icon.png");
  const wordmark = join(brandDir, "vallo-wordmark.png");
  const g = (name) => join(brandDir, "glass", name);
  const glassAt = (file, x, y, size, rotate) =>
    `<img class="glass" src="${fileUrl(g(file))}" style="left:${x}px;top:${y}px;width:${size}px;height:${size}px;transform:rotate(${rotate}deg);z-index:3" />`;
  let body = `
    <div class="aurora">
      <span style="width:1500px;height:1500px;left:-620px;top:${-H * 0.12}px;background:radial-gradient(circle, ${ELECTRIC_600} 0%, transparent 66%);opacity:.75"></span>
      <span style="width:1300px;height:1300px;right:-640px;top:${H * 0.22}px;background:radial-gradient(circle, ${QUIET} 0%, transparent 66%);opacity:.45"></span>
      <span style="width:1200px;height:1200px;left:${W * 0.18}px;bottom:${-H * 0.16}px;background:radial-gradient(circle, ${ELECTRIC} 0%, transparent 66%);opacity:.5"></span>
    </div>${grid("navy")}`;
  if (wide) {
    /* The 1024 x 500 Play feature graphic: icon left, words right. */
    const iconSize = H * 0.66;
    body += `
      <img class="brand-icon" src="${fileUrl(icon)}" style="left:${W * 0.07}px;top:${(H - iconSize) / 2}px;width:${iconSize}px;height:${iconSize}px" />
      <div class="brand-words" style="left:${W * 0.07 + iconSize + 90}px;top:0;height:${H}px;align-items:flex-start;text-align:left">
        <img class="brand-wordmark" src="${fileUrl(wordmark)}" style="width:${W * 0.36}px" alt="Vallo" />
        <p class="brand-line" style="font-size:66px">${shot.headline[1]}</p>
        <p class="brand-sub" style="font-size:40px">${shot.sub ?? ""}</p>
      </div>`;
  } else {
    const iconSize = Math.min(W * 0.54, H * 0.25);
    const groupH = iconSize + 70 + 106 + 40 + 92 + (shot.sub ? 100 : 0);
    const iconTop = (H - groupH) / 2;
    const cy = iconTop + iconSize / 2;
    body += `<div class="halo" style="left:${W / 2 - iconSize}px;top:${cy - iconSize}px;width:${iconSize * 2}px;height:${iconSize * 2}px"></div>`;
    body += orbit({ cx: W / 2, cy, w: W * 1.3, ground: "navy" });
    body += glassAt("modern-house.png", 70, cy - iconSize * 0.95, 250, -10);
    body += glassAt("hotel.png", W - 70 - 240, cy - iconSize * 0.72, 240, 9);
    body += glassAt("keys-home.png", 110, cy + iconSize * 0.42, 210, 8);
    body += glassAt("concierge-bell.png", W - 110 - 200, cy + iconSize * 0.5, 200, -8);
    body += `
      <img class="brand-icon" src="${fileUrl(icon)}" style="left:${(W - iconSize) / 2}px;top:${iconTop}px;width:${iconSize}px;height:${iconSize}px" />
      <div class="brand-words" style="left:0;top:${iconTop + iconSize + 70}px;width:${W}px;align-items:center;text-align:center">
        <img class="brand-wordmark" src="${fileUrl(wordmark)}" style="width:${W * 0.44}px" alt="Vallo" />
        <p class="brand-line">${shot.headline[1]}</p>
        ${shot.sub ? `<p class="brand-sub">${shot.sub}</p>` : ""}
      </div>`;
  }
  return page({ target, H, body, fontsDir, ground: `linear-gradient(180deg, #030437 0%, ${INK} 70%)` });
}

/* ------------------------------------------------------------ the page */

function page({ target, H, body, fontsDir, ground }) {
  const k = target.width / W;
  const f = (name) => fileUrl(join(fontsDir, name));
  return `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  @font-face { font-family: "Poppins"; font-weight: 600; src: url("${f("poppins-600-latin.woff2")}") format("woff2"); }
  @font-face { font-family: "Poppins"; font-weight: 700; src: url("${f("poppins-700-latin.woff2")}") format("woff2"); }
  @font-face { font-family: "Inter"; font-weight: 100 900; src: url("${f("inter-latin.woff2")}") format("woff2"); }
  @font-face { font-family: "Inter"; font-weight: 100 900; src: url("${f("inter-latin-ext.woff2")}") format("woff2"); unicode-range: U+0100-024F, U+1E00-1EFF; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${target.width}px; height: ${target.height}px; overflow: hidden; background: ${INK}; }
  #stage { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; overflow: hidden;
    transform: scale(${k}); transform-origin: 0 0; background: ${ground}; }
  .grid { position: absolute; inset: 0; background-size: 88px 88px; background-position: -2px -2px;
    -webkit-mask-image: radial-gradient(75% 55% at 50% 45%, #000 20%, transparent 100%);
            mask-image: radial-gradient(75% 55% at 50% 45%, #000 20%, transparent 100%); }
  .orbit { position: absolute; overflow: visible; }
  .head { position: absolute; display: flex; flex-direction: column; padding: 0 90px; z-index: 6; }
  h1 { font-family: "Poppins", sans-serif; font-weight: 700; font-size: 116px; line-height: 128px; letter-spacing: -0.028em; }
  h1 span { display: block; white-space: nowrap; }
  h1 .l1 { font-weight: 600; }
  .sub { margin-top: 30px; font: 500 42px/58px "Inter", sans-serif; letter-spacing: -0.005em; max-width: 1080px; }
  .phone { position: absolute; transform-origin: 50% 40%;
    background: linear-gradient(150deg, #4A505F 0%, #1A1D25 22%, #2B2F3A 52%, #111319 78%, #3A3F4C 100%);
    box-shadow:
      inset 0 0 0 2px rgb(255 255 255 / 0.16),
      inset 0 0 0 6px #07080C,
      0 80px 160px -30px rgb(0 0 30 / 0.65),
      0 30px 60px -24px rgb(0 0 20 / 0.5); }
  .phone.android { background: linear-gradient(150deg, #5A6070 0%, #23262F 20%, #3A3F4B 50%, #1A1C23 80%, #4A505E 100%);
    box-shadow:
      inset 0 0 0 2px rgb(255 255 255 / 0.22),
      inset 0 0 0 5px #06070A,
      0 80px 160px -30px rgb(0 0 30 / 0.65),
      0 30px 60px -24px rgb(0 0 20 / 0.5); }
  .phone .btn { position: absolute; border-radius: 6px; background: linear-gradient(90deg, #22252E, #4A505F, #22252E); }
  .phone .screen { overflow: hidden; background: #000; }
  .phone .screen::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
    background: linear-gradient(125deg, rgb(255 255 255 / 0.07) 0%, rgb(255 255 255 / 0.02) 22%, transparent 40%); }
  .phone .island { position: absolute; border-radius: 999px; background: #000; }
  .phone .island i { position: absolute; top: 50%; transform: translateY(-50%); border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #1B2A4A 0%, #0A0F1C 60%, #000 100%); }
  .phone .punch { position: absolute; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #1B2A4A 0%, #05070C 70%); box-shadow: 0 0 0 3px #000; }
  .phone.apple { background: none; box-shadow: none; filter: drop-shadow(0 60px 90px rgb(0 0 40 / 0.45)); }
  .phone.apple .bezel { position: absolute; left: 0; top: 0; }
  .screen-inner { position: relative; }
  .status { display: flex; align-items: center; justify-content: space-between; padding: 14px 84px 0 150px;
    font: 600 51px/1 "Inter", sans-serif; letter-spacing: -0.01em; }
  .status .glyphs { display: flex; align-items: center; gap: 18px; }
  .webview { display: block; }
  .glass { position: absolute; filter: drop-shadow(0 20px 40px rgb(0 0 40 / 0.35)); }
  .photo { position: absolute; left: 0; top: 0; width: 100%; background-size: cover; }
  .photo-veil { position: absolute; left: 0; top: 0; width: 100%;
    background: linear-gradient(180deg, rgb(1 1 24 / 0.86) 0%, rgb(1 1 24 / 0.55) 26%, rgb(1 1 24 / 0.18) 50%, rgb(1 1 24 / 0.55) 78%, ${INK} 100%); }
  .photo-card { position: absolute; border-radius: 64px; background-size: cover; transform: rotate(-5deg);
    border: 3px solid rgb(92 159 255 / 0.45);
    box-shadow: 0 60px 120px -30px rgb(0 0 30 / 0.7), 0 0 80px -10px rgb(0 105 254 / 0.35); }
  .inset-card { position: absolute; border-radius: 90px; overflow: hidden;
    box-shadow: inset 0 0 0 3px rgb(255 255 255 / 0.12), 0 40px 120px -20px rgb(0 0 30 / 0.7); }
  .aurora { position: absolute; inset: 0; }
  .aurora span { position: absolute; border-radius: 50%; filter: blur(90px); }
  .halo { position: absolute; border-radius: 50%; background: radial-gradient(circle, rgb(0 105 254 / 0.55) 0%, rgb(0 86 208 / 0.18) 38%, transparent 66%); }
  .brand-icon { position: absolute; mix-blend-mode: screen; z-index: 4; }
  .brand-words { position: absolute; display: flex; flex-direction: column; justify-content: center; }
  .brand-wordmark { display: block; mix-blend-mode: screen; }
  .brand-line { margin-top: 40px; font: 700 84px/1.1 "Poppins", sans-serif; letter-spacing: -0.02em;
    background: linear-gradient(90deg, #7FC4FF 0%, #2F8BFF 55%, #0069FE 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .brand-sub { margin-top: 40px; font: 500 44px/1.35 "Inter", sans-serif; color: rgb(214 228 255 / 0.78); }
</style></head>
<body><div id="stage">${body}</div>
<script>
  /* A headline line wider than its box steps down in size until it fits. */
  for (const head of document.querySelectorAll(".head")) {
    const h1 = head.querySelector("h1");
    const room = head.clientWidth - 180;
    let size = 116;
    while (size > 80 && Math.max(...[...h1.children].map((s) => s.scrollWidth)) > room) {
      size -= 2;
      h1.style.fontSize = size + "px";
      h1.style.lineHeight = Math.round(size * 1.1) + "px";
    }
  }
</script></body></html>`;
}
