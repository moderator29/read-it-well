/**
 * ROWS 40 to 42: THE CLOSE AND THE ENDING (92.31 to 101.54), both films.
 *
 * 40  The pin's head becomes the Vallo mark on the logo hit (92.31); the
 *     wordmark rises; "Real estate, done right." writes in on the voice with a
 *     squiggle under "done right"; the velvet hills of frame one return behind.
 *     No ring (v3.1). At 95.48 the frame whitens from the centre.
 * 41  The white end card: mobile, the lockup, one pill button and two phones
 *     (island and Android, `home-light`) turning toward each other; desktop,
 *     the window at vallospaces.com with the island phone beside it.
 * 42  Live: the official badges appear by a cut on bar 44 (99.23), App Store
 *     first, both black, the same height, never moved, scaled, tilted or
 *     faded; vallospaces.com below them. Soon: vallospaces.com only.
 */
import { browserWindow, squiggle, sparkles } from "../engine/components.js";
import { track, ramp, spring, during, place, screenImage, measure, night, SHADOW, mix } from "./c-kit.js";

const BADGES = { apple: "/video/assets/badges/app-store-black.svg", google: "/video/assets/badges/google-play-black.svg" };

export async function buildClose(ctx, S) {
  const { K, L } = S;
  const M = ctx.isMobile;
  const hit = K.r40;
  const white = ctx.beat(165.5); // 95.48: the frame whitens from the centre
  const end = K.end + 0.05;
  ctx.hideCaptions(K.r40, K.end + 1);

  /* ================= row 40 ================= */
  const close = ctx.scene("c40-close", hit - 0.02, K.r41 + 0.02, { z: 6 });
  night(ctx, close, { y: 38, glow: 0.3 });
  const groundIn = ctx.el("div", { class: "fill" }, close);
  /* the velvet hills of frame one, anchored low, feathered into the night */
  const art = ctx.img(ctx.src.art("step-1-dark.webp"), {
    class: "abs",
    style: {
      left: "0px", top: "0px", width: "1080px", height: "1440px",
      maskImage: M ? "linear-gradient(180deg, transparent 0%, #000 22%)" : "radial-gradient(ellipse 58% 62% at 50% 62%, #000 58%, transparent 100%)",
      WebkitMaskImage: M ? "linear-gradient(180deg, transparent 0%, #000 22%)" : "radial-gradient(ellipse 58% 62% at 50% 62%, #000 58%, transparent 100%)",
    },
  }, groundIn);
  const artAt = M ? { x: 540, y: 1000 + 720 } : { x: 960, y: 500 + 720 };
  const markSize = M ? 300 : 190;
  const mark = ctx.img(ctx.src.brand("vallo-mark.png"), { class: "abs", style: { left: "0px", top: "0px", width: `${markSize}px`, height: `${Math.round(markSize * 587 / 614)}px` } }, close);
  const wmW = M ? 520 : 470;
  const wordmark = ctx.img(ctx.src.brand("vallo-wordmark.png"), { class: "abs", style: { left: "0px", top: "0px", width: `${wmW}px`, height: `${Math.round(wmW * 167 / 758)}px` } }, close);
  const flash = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(closest-side, rgb(255 255 255 / 0.95), rgb(143 211 255 / 0.4) 40%, rgb(0 105 254 / 0) 100%)", opacity: 0 } }, close);
  ctx.sfx("impact_soft", hit, { offset: 0 });
  ctx.sfx("sparkle", K.done + 0.18, { offset: -2 });

  /* the lockup's places: mobile stacked (mark over wordmark), desktop side by side */
  const pinEnd = M ? { x: 540, y: 900, size: 250 } : { x: 960, y: 520, size: 210 };
  const markTo = M ? { x: 540, y: 600 } : { x: 960 - (wmW + 30) / 2 - 6, y: 400 };
  const wmTo = M ? { x: 540, y: 820 } : { x: 960 + (markSize * 0.96 + 30) / 2 - 6, y: 404 };

  /* the tagline, word by word on the voice */
  const tagSize = M ? 92 : 88;
  const tagFont = `700 ${tagSize}px "C Poppins"`;
  const words = [["Real", K.real, false], ["estate,", K.estate, false], ["done", K.done, true], ["right.", K.right, true]];
  const space = measure("x x", tagFont) - measure("xx", tagFont);
  const ww = words.map(([w]) => measure(w, tagFont));
  /* mobile: "Real estate," / "done right." on two lines; desktop: one line */
  const lines = M ? [[0, 1], [2, 3]] : [[0, 1, 2, 3]];
  const lineY = M ? [990, 1100] : [610];
  const pos = [];
  lines.forEach((ids, li) => {
    const total = ids.reduce((a, i) => a + ww[i], 0) + space * (ids.length - 1);
    let x = ctx.W / 2 - total / 2;
    ids.forEach((i) => { pos[i] = { x: x + ww[i] / 2, y: lineY[li] }; x += ww[i] + space; });
  });
  const tagNodes = words.map(([w, , blue]) => {
    const mask = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", overflow: "hidden", padding: "0.08em 0.06em 0.18em" } }, close);
    const n = ctx.el("div", { class: "c-display", text: w, style: { fontSize: `${tagSize}px`, color: blue ? "var(--sky)" : "#ffffff", whiteSpace: "nowrap" } }, mask);
    return { mask, n };
  });
  /* the squiggle under "done right" */
  const sqX0 = pos[2].x - ww[2] / 2;
  const sqX1 = pos[3].x + ww[3] / 2;
  squiggle(ctx, close, { x: sqX0, y: pos[2].y + tagSize * 0.58, w: sqX1 - sqX0, t: K.done + 0.18, dur: 0.6, color: "var(--sky)", stroke: M ? 8 : 7 });
  sparkles(ctx, close, { area: M ? { x: 250, y: 380, w: 580, h: 420 } : { x: 560, y: 250, w: 800, h: 300 }, count: 4, seed: 4001, t0: hit + 0.2, t1: white + 0.1, color: "var(--sky)", min: 16, max: 30 });

  during(ctx, hit - 0.02, K.r41 + 0.02, (t) => {
    /* the pin's head (from the map) swells into a flash; the mark lands in it */
    const u = ramp(ctx, t, hit, hit + 0.34, "power2.out");
    if (S.pinHead && t >= hit) {
      const { head } = S.pinHead;
      head.style.width = `${pinEnd.size}px`;
      head.style.height = `${pinEnd.size}px`;
      place(head, { x: pinEnd.x, y: pinEnd.y, s: 1 + 0.35 * u, o: 1 - u });
    }
    place(flash, { x: pinEnd.x, y: pinEnd.y, s: 0.4 + 1.2 * u, o: t >= hit ? (1 - u) * 0.9 : 0 });
    const land = ramp(ctx, t, hit, hit + 0.5, "back.out(1.7)");
    const settle = ramp(ctx, t, hit + 0.42, hit + 1.05, "power3.inOut");
    const mS = mix(pinEnd.size / markSize, 1, land);
    place(mark, { x: mix(pinEnd.x, markTo.x, settle), y: mix(pinEnd.y, markTo.y, settle), s: mS * mix(1.08, 1, settle), o: Math.min(1, u * 3) });
    const wm = ramp(ctx, t, hit + 0.55, hit + 1.15, "land");
    place(wordmark, { x: wmTo.x + (M ? 0 : (1 - wm) * -30), y: wmTo.y + (M ? (1 - wm) * 40 : 0), o: wm });
    const a = ramp(ctx, t, hit + 0.1, hit + 1.1, "power2.out");
    place(art, { x: artAt.x, y: artAt.y + (1 - a) * 140, o: a });
    words.forEach(([, tw], i) => {
      const r = ramp(ctx, t, tw - 0.06, tw + 0.34, "land");
      place(tagNodes[i].mask, { x: pos[i].x, y: pos[i].y, o: r > 0 ? 1 : 0 });
      tagNodes[i].n.style.transform = `translateY(${((1 - r) * 110).toFixed(2)}%)`;
    });
  });

  /* the whitening, from the centre */
  const whiteScene = ctx.scene("c40-white", white - 0.02, K.r41 + 0.03, { z: 12 });
  /* a soft white light from the centre that fills the frame by 95.77 */
  const disc = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "200px", height: "200px", borderRadius: "50%", background: "radial-gradient(closest-side, #ffffff 0%, #ffffff 45%, rgb(255 255 255 / 0.6) 70%, rgb(255 255 255 / 0) 100%)" } }, whiteScene);
  const reach = Math.hypot(ctx.W, ctx.H) / 2 / (100 * 0.45);
  during(ctx, white - 0.02, K.r41 + 0.03, (t) => {
    const u = ramp(ctx, t, white, K.r41 - 0.01, "power1.in");
    place(disc, { x: ctx.W / 2, y: ctx.H / 2, s: 0.4 + reach * u, o: t >= white ? Math.min(1, 0.4 + u * 3) : 0 });
  });
  ctx.sfx("whoosh_long", K.r41, { offset: -4 });

  /* ================= rows 41 and 42: the end card ================= */
  const card = ctx.scene("c41-card", K.r41 - 0.02, end, { z: 1 });
  ctx.el("div", { class: "fill", style: { background: "radial-gradient(120% 70% at 50% 100%, #eef3ff 0%, #ffffff 60%)" } }, card);
  const top = ctx.scene("c41-top", K.r41 - 0.02, end, { z: 8 });
  const live = ctx.ending === "live";
  const pillText = live ? "Available on the App Store and Google Play" : "Coming soon on iPhone and Android";
  const pillFs = M ? (live ? 30 : 34) : 26;
  const pill = ctx.el("div", {
    class: "abs",
    text: pillText,
    style: {
      left: "0px", top: "0px", font: `600 ${pillFs}px/1 Inter, sans-serif`, letterSpacing: "-0.01em", color: "#ffffff", whiteSpace: "nowrap",
      padding: `${Math.round(pillFs * 0.72)}px ${Math.round(pillFs * 1.25)}px`, borderRadius: "999px",
      background: "linear-gradient(180deg, #1f7dff 0%, #0069fe 55%, #0058e0 100%)", boxShadow: "0 18px 40px -18px rgb(0 80 220 / 0.6)",
    },
  }, top);
  const url = ctx.el("div", { class: "abs", text: "vallospaces.com", style: { left: "0px", top: "0px", font: `600 ${M ? 38 : 30}px/1 Inter, sans-serif`, letterSpacing: "-0.01em", color: "#0b1230", whiteSpace: "nowrap" } }, top);

  /* the badges: the official files, unmodified; same height; App Store first */
  const hasGoogle = await fetch(BADGES.google, { method: "HEAD", cache: "no-store" }).then((r) => r.ok).catch(() => false);
  const badgeH = M ? 84 : 56;
  let badgeRow = null;
  if (live) {
    if (!hasGoogle) console.error("section c: the live ending needs video/assets/badges/google-play-black.svg (the founder supplies it); the App Store badge shows alone until then");
    badgeRow = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", display: "flex", alignItems: "center", gap: `${M ? 24 : 18}px`, visibility: "hidden" } }, top);
    ctx.img(BADGES.apple, { style: { height: `${badgeH}px`, width: "auto" } }, badgeRow);
    if (hasGoogle) ctx.img(BADGES.google, { style: { height: `${badgeH}px`, width: "auto" } }, badgeRow);
  }

  if (M) {
    /* the lockup above */
    const lk = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", display: "flex", alignItems: "center", gap: "22px" } }, top);
    ctx.img(ctx.src.brand("vallo-mark.png"), { style: { width: "104px", height: `${Math.round(104 * 587 / 614)}px` } }, lk);
    ctx.img(ctx.src.brand("vallo-wordmark-light.png"), { style: { width: "360px", height: `${Math.round(360 * 167 / 758)}px` } }, lk);
    /* the two phones: island (the light phone that carried rows 28-34) and Android */
    const pI = S.light;
    const pA = S.android;
    const iImg = screenImage(ctx, pI, "home-light");
    const aImg = screenImage(ctx, pA, "home-light", { platform: "android" });
    ctx.onFrame((t) => {
      const on = t >= K.r41 - 0.05;
      iImg.style.visibility = on ? "" : "hidden";
      aImg.style.visibility = on ? "" : "hidden";
    });
    const rise = (t, lag) => ramp(ctx, t, K.r41 + lag, K.r41 + 0.85 + lag, "land");
    const drift = (t, ph) => Math.sin((t - K.r41) * 0.9 + ph);
    pI.poses.push({ t0: K.r41 - 0.02, t1: end, fn: (t) => ({ cx: 392 + 4 * drift(t, 0), cy: 1050 + (1 - rise(t, 0.05)) * 1150 + 5 * drift(t, 1.3), height: 800, rx: 2, ry: mix(-4, 13, rise(t, 0.05)) + 1.5 * drift(t, 2), rz: 0, fov: 24, opacity: 1 }) });
    pA.poses.push({ t0: K.r41 - 0.02, t1: end, fn: (t) => ({ cx: 694 - 4 * drift(t, 0.6), cy: 1066 + (1 - rise(t, 0.16)) * 1150 + 5 * drift(t, 2.1), height: 790, rx: 2, ry: mix(4, -13, rise(t, 0.16)) - 1.5 * drift(t, 2.7), rz: 0, fov: 24, opacity: 1 }) });
    const url0 = K.r42;
    during(ctx, K.r41 - 0.02, end, (t) => {
      const a = ramp(ctx, t, K.r41 + 0.25, K.r41 + 0.95, "land");
      place(lk, { x: 540, y: 330 + (1 - a) * 24, o: a });
      const b = ramp(ctx, t, K.r41 + 0.45, K.r41 + 1.1, "land");
      place(pill, { x: 540, y: 470 + (1 - b) * 20, o: b });
      /* bar 44: the badges cut in (live); vallospaces.com arrives */
      if (badgeRow) {
        badgeRow.style.visibility = t >= K.r42 ? "" : "hidden";
        place(badgeRow, { x: 540, y: 1530 });
      }
      const c = ramp(ctx, t, url0, url0 + 0.6, "land");
      place(url, { x: 540, y: (live ? 1612 : 1545) + (1 - c) * 16, o: c });
    });
  } else {
    /* desktop: the window at vallospaces.com (d-home-light) at the left, the island phone at the right */
    const winScene = ctx.scene("c41-win", K.r41 - 0.02, end, { z: 3 });
    const win = browserWindow(ctx, { parent: winScene, width: 1440, url: "vallospaces.com", theme: "light" });
    ctx.img(ctx.src.capture("d-home-light"), { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px" } }, win.content);
    const s = 1060 / 1440;
    const pD = S.deskPhone;
    const dImg = screenImage(ctx, pD, "home-light");
    const rise = (t, lag) => ramp(ctx, t, K.r41 + lag, K.r41 + 0.85 + lag, "land");
    const drift = (t, ph) => Math.sin((t - K.r41) * 0.9 + ph);
    pD.poses.push({ t0: K.r41 - 0.02, t1: end, fn: (t) => ({ cx: 1500 + 3 * drift(t, 0.4), cy: 470 + (1 - rise(t, 0.14)) * 900 + 4 * drift(t, 1.1), height: 820, rx: 2, ry: mix(6, -10, rise(t, 0.14)) - 1.2 * drift(t, 2.2), rz: 0, fov: 24, opacity: 1 }) });
    ctx.onFrame((t) => {
      dImg.style.visibility = t >= K.r41 - 0.05 ? "" : "hidden";
    });
    /* the bottom row: the pill (then the badges, live) and vallospaces.com */
    const pw = pill.offsetWidth;
    const uw = url.offsetWidth;
    const bw = live ? (badgeH * 119.66) / 40 + (hasGoogle ? 18 + badgeH * 3.375 : 0) : 0;
    const gap = 36;
    const total = pw + gap + (live ? bw + gap : 0) + uw;
    const x0 = 960 - total / 2;
    const rowY = 952;
    during(ctx, K.r41 - 0.02, end, (t) => {
      const u = rise(t, 0);
      win.root.style.transformOrigin = "0 0";
      win.root.style.transform = `translate(120px, ${(118 + (1 - u) * 900 + 3 * drift(t, 0.2)).toFixed(2)}px) scale(${s.toFixed(5)})`;
      win.root.style.opacity = Math.min(1, u * 3).toFixed(4);
      const b = ramp(ctx, t, K.r41 + 0.45, K.r41 + 1.1, "land");
      place(pill, { x: x0 + pw / 2, y: rowY + (1 - b) * 16, o: b });
      if (badgeRow) {
        badgeRow.style.visibility = t >= K.r42 ? "" : "hidden";
        place(badgeRow, { x: x0 + pw + gap + bw / 2, y: rowY });
      }
      const c = ramp(ctx, t, K.r42, K.r42 + 0.6, "land");
      place(url, { x: x0 + total - uw / 2, y: rowY + (1 - c) * 12, o: c });
    });
  }
}
