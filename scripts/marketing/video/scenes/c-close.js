/**
 * ROWS 40 to 42: THE CLOSE AND THE ENDING (92.31 to 101.54), both films.
 *
 * 40  The pin's head becomes the Vallo mark on the logo hit (92.31); the
 *     wordmark rises; "Real estate, done right." writes in on the voice with a
 *     squiggle under "done right"; the velvet hills of frame one return behind.
 *     The mark settles before the wordmark rises. No ring, no sparkles. The
 *     full lockup and tagline hold to beat 167 (96.35), then a cut to white.
 * 41  The white end card (from 96.35), centred optically (round 3): mobile,
 *     the lockup at y 515, one pill button at 638, two phones (island and
 *     Android, `home-light`) turning toward each other across y 740 to 1500,
 *     vallospaces.com at 1560; desktop, a 640 px lockup at y 218, the pill
 *     (1.4x) at 380, the window (0.8x) and the island phone lower (y 440 to
 *     1005), vallospaces.com at 1042. Sparkles only around the lockup.
 * 42  Live: the official badges appear by a cut on bar 44 (99.23), App Store
 *     first, both black, the same height, never moved, scaled, tilted or
 *     faded; vallospaces.com below them. Soon: vallospaces.com only.
 */
import { browserWindow, squiggle, sparkles } from "../engine/components.js";
import { ramp, during, place, screenImage, measure, night, mix, opa, scaledSrc, own } from "./c-kit.js";

const BADGES = { apple: "/video/assets/badges/app-store-black.svg", google: "/video/assets/badges/google-play-black.svg" };

export async function buildClose(ctx, S) {
  const { K, L } = S;
  const M = ctx.isMobile;
  const hit = K.r40;
  const end = K.end + 0.05;
  ctx.hideCaptions(92.188, K.end + 1); // from the caption span's edge: "Vallo." never flashes

  /* ================= row 40 ================= */
  const close = ctx.scene("c40-close", hit - 0.02, K.r41, { z: 6 });
  night(ctx, close, { y: 38, glow: 0.3 });
  const groundIn = ctx.el("div", { class: "fill" }, close);
  /* the velvet hills of frame one, anchored low, feathered into the night */
  const art = ctx.img(own(ctx.src.art("step-1-dark.webp"), "close"), {
    class: "abs",
    style: {
      left: "0px", top: "0px", width: "1080px", height: "1440px",
      maskImage: M ? "linear-gradient(180deg, transparent 0%, #000 22%)" : "radial-gradient(ellipse 58% 62% at 50% 62%, #000 58%, transparent 100%)",
      WebkitMaskImage: M ? "linear-gradient(180deg, transparent 0%, #000 22%)" : "radial-gradient(ellipse 58% 62% at 50% 62%, #000 58%, transparent 100%)",
    },
  }, groundIn);
  const artAt = M ? { x: 540, y: 1000 + 720 } : { x: 960, y: 360 + 720 };
  const markSize = M ? 300 : 190;
  /* the mark lands from the pin's size with an overshoot (0.9 to 1.1 of its size): a copy
     1.5 times its size keeps every frame on the copy's full-size decode (scaledSrc) */
  const mark = ctx.img(await scaledSrc(ctx.src.brand("vallo-mark.png"), markSize * 1.5), { class: "abs", style: { left: "0px", top: "0px", width: `${markSize}px`, height: `${Math.round(markSize * 587 / 614)}px` } }, close);
  const wmW = M ? 520 : 470;
  const wordmark = ctx.img(own(ctx.src.brand("vallo-wordmark.png"), "close"), { class: "abs", style: { left: "0px", top: "0px", width: `${wmW}px`, height: `${Math.round(wmW * 167 / 758)}px` } }, close);
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
  squiggle(ctx, close, { x: sqX0, y: pos[2].y + tagSize * 0.58, w: sqX1 - sqX0, t: K.done + 0.18, dur: 0.35, color: "var(--sky)", stroke: M ? 8 : 7 });

  during(ctx, hit - 0.02, K.r41, (t) => {
    /* the held lockup and tagline drift 1.5% closer to the cut (never fully still) */
    const k = 1 + 0.015 * ramp(ctx, t, hit + 1.4, K.r41, "sine.inOut");
    close.style.transformOrigin = M ? "540px 900px" : "960px 500px";
    close.style.transform = k > 1 ? `scale(${k.toFixed(5)})` : "";
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
    const settle = ramp(ctx, t, hit + 0.2, hit + 0.7, "power3.inOut");
    const mS = mix(pinEnd.size / markSize, 1, land);
    place(mark, { x: mix(pinEnd.x, markTo.x, settle), y: mix(pinEnd.y, markTo.y, settle), s: mS * mix(1.08, 1, settle), o: Math.min(1, u * 3) });
    const wm = ramp(ctx, t, hit + 0.9, hit + 1.4, "land");
    place(wordmark, { x: wmTo.x + (M ? 0 : (1 - wm) * -30), y: wmTo.y + (M ? (1 - wm) * 40 : 0), o: wm });
    const a = ramp(ctx, t, hit + 0.1, hit + 1.1, "power2.out");
    place(art, { x: artAt.x, y: artAt.y + (1 - a) * 140, o: a });
    words.forEach(([, tw], i) => {
      const r = ramp(ctx, t, tw - 0.06, tw + 0.34, "land");
      place(tagNodes[i].mask, { x: pos[i].x, y: pos[i].y, o: r > 0 ? 1 : 0 });
      tagNodes[i].n.style.transform = `translateY(${((1 - r) * 110).toFixed(2)}%)`;
    });
  });

  /* a cut to the white end card on beat 167 */
  ctx.sfx("whoosh_long", K.r41, { offset: -4 }); // lifted +10 dB in signature-cues.json, felt under the bed

  /* ================= rows 41 and 42: the end card ================= */
  const card = ctx.scene("c41-card", K.r41, end, { z: 1 });
  ctx.el("div", { class: "fill", style: { background: "radial-gradient(120% 70% at 50% 100%, #eef3ff 0%, #ffffff 60%)" } }, card);
  const top = ctx.scene("c41-top", K.r41, end, { z: 8 });
  const live = ctx.ending === "live";
  const pillText = live ? "Available on the App Store and Google Play" : "Coming soon on iPhone and Android";
  const pillFs = M ? (live ? 30 : 34) : 36;
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

  /* The badges (live only): the official files, unmodified, the same height,
     App Store first; they cut in on bar 44 and are never moved, scaled or
     faded. Apple's rules want both stores live before any badge shows, so
     the live ending refuses to build without the Google Play file. */
  const badgeH = M ? 84 : 50;
  let badgeRow = null;
  if (live) {
    const hasGoogle = await fetch(BADGES.google, { method: "HEAD", cache: "no-store" }).then((r) => r.ok).catch(() => false);
    if (!hasGoogle) throw new Error("section c: the live ending needs both store badges; video/assets/badges/google-play-black.svg is missing (the founder supplies it)");
    badgeRow = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", display: "flex", alignItems: "center", gap: `${M ? 24 : 18}px`, visibility: "hidden" } }, top);
    ctx.img(BADGES.apple, { style: { height: `${badgeH}px`, width: "auto" } }, badgeRow);
    ctx.img(BADGES.google, { style: { height: `${badgeH}px`, width: "auto" } }, badgeRow);
  }
  /* a cut, not a fade: position and visibility only (no opacity, no scale) */
  const cutBadges = (t, x, y) => {
    if (!badgeRow) return;
    badgeRow.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) translate(-50%, -50%)`;
    badgeRow.style.visibility = t >= K.r42 ? "" : "hidden";
  };

  if (M) {
    /* the lockup above */
    const lk = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", display: "flex", alignItems: "center", gap: "26px" } }, top);
    ctx.img(own(ctx.src.brand("vallo-mark.png"), "lockup"), { style: { width: "128px", height: `${Math.round(128 * 587 / 614)}px` } }, lk);
    ctx.img(own(ctx.src.brand("vallo-wordmark-light.png"), "lockup"), { style: { width: "444px", height: `${Math.round(444 * 167 / 758)}px` } }, lk);
    /* the two phones: island (the light phone that carried rows 28-34) and Android */
    const pI = S.light;
    const pA = S.android;
    const iImg = screenImage(ctx, pI, "home-light");
    const aImg = screenImage(ctx, pA, "home-light", { platform: "android" });
    /* round 4: both phones read 9:41. The Android capture's status bar is the
       screens kit's own drawn bar (10:00); its clock is redrawn on the same
       ground, nothing else in the capture is touched. */
    const clock = ctx.el("div", { class: "abs", style: { left: "60px", top: "60px", width: "200px", height: "76px", background: "rgb(236 236 250)", visibility: "hidden" } }, pA.screen);
    ctx.el("div", { class: "abs", text: "9:41", style: { left: "18px", top: "0px", height: "76px", lineHeight: "76px", font: "500 50px Roboto, Inter, sans-serif", letterSpacing: "0.01em", color: "#000000", whiteSpace: "nowrap" } }, clock);
    ctx.onFrame((t) => {
      const on = t >= K.r41 - 0.05;
      iImg.style.visibility = on ? "" : "hidden";
      aImg.style.visibility = on ? "" : "hidden";
      clock.style.visibility = on ? "" : "hidden";
    });
    const rise = (t, lag) => ramp(ctx, t, K.r41 + lag, K.r41 + 0.85 + lag, "land");
    const drift = (t, ph) => Math.sin((t - K.r41) * 0.9 + ph);
    /* the hold: a slow turn toward the viewer and a slight push, never still */
    const hold = (t) => ramp(ctx, t, K.r41 + 0.9, end, "sine.inOut");
    /* Round 3: the block is centred optically, the phones 1.1x larger across
       about y 740 to 1500; the captions are off on the end card, and
       vallospaces.com (and the badges, live) sit at y 1560 to 1650. */
    /* The rise and the turn toward each other are the 3D pose; once risen the
       pose holds still and the drift is a 2D move of each phone's layer, so
       the two live phones are not re-rendered on every frame of the hold. */
    const PH = { cy: 1120, h: 760 }; // round 5: phones across y 740 to 1500
    pI.poses.push({ t0: K.r41 - 0.02, t1: end, fn: (t) => ({ cx: 336, cy: PH.cy + (1 - rise(t, 0.05)) * 1450, height: PH.h, rx: 2, ry: mix(-4, 13, rise(t, 0.05)), rz: 0, fov: 24, opacity: 1 }) });
    pA.poses.push({ t0: K.r41 - 0.02, t1: end, fn: (t) => ({ cx: 744, cy: PH.cy + 12 + (1 - rise(t, 0.16)) * 1450, height: PH.h - 10, rx: 2, ry: mix(4, -13, rise(t, 0.16)), rz: 0, fov: 24, opacity: 1 }) });
    ctx.onFrame((t) => {
      const on = t >= K.r41 - 0.02 && t < end;
      pI.root.style.transform = on ? `translate(${(4 * drift(t, 0)).toFixed(2)}px, ${(5 * drift(t, 1.3) - 12 * hold(t)).toFixed(2)}px)` : "";
      pA.root.style.transform = on ? `translate(${(-4 * drift(t, 0.6)).toFixed(2)}px, ${(5 * drift(t, 2.1) - 12 * hold(t)).toFixed(2)}px)` : "";
    });
    /* sparkles at fixed points around the lockup only, clear of the type */
    [[196, 452, 24], [892, 474, 20], [872, 568, 14]].forEach(([x, y, d], i) => sparkles(ctx, top, { area: { x: x - d / 2, y: y - d / 2, w: d, h: d }, count: 1, seed: 4101 + i, t0: K.r41 + 0.8 + i * 0.15, t1: end + 1, color: "#5c9fff", min: d, max: d }));
    const url0 = K.r42;
    during(ctx, K.r41 - 0.02, end, (t) => {
      const a = ramp(ctx, t, K.r41 + 0.25, K.r41 + 0.95, "land");
      place(lk, { x: 540, y: 515 + (1 - a) * 24, o: a });
      const b = ramp(ctx, t, K.r41 + 0.45, K.r41 + 1.1, "land");
      place(pill, { x: 540, y: 640 + (1 - b) * 20, o: b });
      /* bar 44: the badges cut in (live); vallospaces.com arrives */
      cutBadges(t, 540, 1560);
      const c = ramp(ctx, t, url0, url0 + 0.6, "land");
      place(url, { x: 540, y: (live ? 1650 : 1560) + (1 - c) * 16, o: c });
    });
  } else {
    /* desktop: the window at vallospaces.com (d-home-light) at the left, the island phone at the right */
    const winScene = ctx.scene("c41-win", K.r41 - 0.02, end, { z: 3 });
    const win = browserWindow(ctx, { parent: winScene, width: 1440, url: "vallospaces.com", theme: "light" });
    ctx.img(ctx.src.capture("d-home-light"), { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px" } }, win.content);
    const s = (0.8 * 1060) / 1440; // round 3: 0.8x the round-2 window
    const pD = S.deskPhone;
    const dImg = screenImage(ctx, pD, "home-light");
    const rise = (t, lag) => ramp(ctx, t, K.r41 + lag, K.r41 + 0.85 + lag, "land");
    const drift = (t, ph) => Math.sin((t - K.r41) * 0.9 + ph);
    const hold = (t) => ramp(ctx, t, K.r41 + 0.9, end, "sine.inOut");
    /* the rise and turn in 3D; the hold's drift as a 2D move of the phone's layer */
    pD.poses.push({ t0: K.r41 - 0.02, t1: end, fn: (t) => ({ cx: 1466, cy: 724 + (1 - rise(t, 0.14)) * 1000, height: 560, rx: 2, ry: mix(6, -10, rise(t, 0.14)), rz: 0, fov: 24, opacity: 1 }) });
    ctx.onFrame((t) => {
      const on = t >= K.r41 - 0.02 && t < end;
      pD.root.style.transform = on ? `translate(${(3 * drift(t, 0.4)).toFixed(2)}px, ${(4 * drift(t, 1.1) - 10 * hold(t)).toFixed(2)}px)` : "";
    });
    [[606, 164, 22], [1318, 180, 20], [1300, 268, 14]].forEach(([x, y, d], i) => sparkles(ctx, top, { area: { x: x - d / 2, y: y - d / 2, w: d, h: d }, count: 1, seed: 4102 + i, t0: K.r41 + 0.8 + i * 0.15, t1: end + 1, color: "#5c9fff", min: d, max: d }));
    /* the Vallo lockup, top centre */
    const lkD = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", display: "flex", alignItems: "center", gap: "30px", visibility: "hidden" } }, top);
    ctx.img(own(ctx.src.brand("vallo-mark.png"), "lockup"), { style: { width: "146px", height: `${Math.round(146 * 587 / 614)}px` } }, lkD);
    ctx.img(own(ctx.src.brand("vallo-wordmark-light.png"), "lockup"), { style: { width: "464px", height: `${Math.round(464 * 167 / 758)}px` } }, lkD);
    ctx.onFrame((t) => {
      dImg.style.visibility = t >= K.r41 - 0.05 ? "" : "hidden";
    });
    /* the pill under the lockup at y 380; at the foot one centred
       row: the badges (live) and vallospaces.com, measured once the fonts and
       badge files have loaded (layout constants) */
    let row = null;
    const measureRow = () => {
      const uw = url.offsetWidth;
      const bw = badgeRow ? badgeRow.offsetWidth : 0;
      const gap = 40;
      const total = (badgeRow ? bw + gap : 0) + uw;
      return { uw, bw, gap, total, x0: 960 - total / 2 };
    };
    during(ctx, K.r41 - 0.02, end, (t) => {
      row ??= measureRow();
      const { uw, bw, gap, total, x0 } = row;
      const u = rise(t, 0);
      win.root.style.transformOrigin = "0 0";
      win.root.style.transform = `translate(318px, ${(440 + (1 - u) * 1000 + 3 * drift(t, 0.2)).toFixed(2)}px) scale(${s.toFixed(5)})`;
      win.root.style.opacity = opa(1);
      const a = ramp(ctx, t, K.r41 + 0.25, K.r41 + 0.95, "land");
      place(lkD, { x: 960, y: 218 + (1 - a) * 14, o: a });
      const b = ramp(ctx, t, K.r41 + 0.45, K.r41 + 1.1, "land");
      place(pill, { x: 960, y: 348 + (1 - b) * 16, o: b }); // round 5: 48 px above the devices
      cutBadges(t, x0 + bw / 2, 1042);
      const c = ramp(ctx, t, K.r42, K.r42 + 0.6, "land");
      place(url, { x: x0 + total - uw / 2, y: 1042 + (1 - c) * 12, o: c });
    });
  }
}
