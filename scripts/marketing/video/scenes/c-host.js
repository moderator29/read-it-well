/**
 * ROW 37: "Have a property, a hotel or a restaurant?" (85.38 to 88.27), both
 * films. STORYBOARD v3.1.
 *
 * `host-start` ("Add a workspace") on night. As each is named, its row lights
 * on the screen and lifts off beside the device as a body, re-drawn from the
 * capture with its own 3D icon inside it; one body at a time (the last sinks
 * back as the next lifts). "I am an agent" is never lit or lifted. A cut on
 * the beat at 88.27 goes to the map.
 */
import { orb, browserWindow } from "../engine/components.js";
import { track, ramp, during, place, dispToStage, measure, SHADOW, mix, opa } from "./c-kit.js";

/* The rows as captured (display px on mobile, content px on desktop). */
const ROWS = [
  { key: "property", icon: "home-verified", title: "I own the property", sub: "List it yourself. No agency fee.", m: [2226, 2490], d: [671, 763] },
  { key: "hotel", icon: "hotel", title: "We are a hotel", sub: "Rooms, rates and a front desk.", m: [1164, 1428], d: [301, 393] },
  { key: "restaurant", icon: "restaurant", title: "We are a restaurant", sub: "Tables, hours and a menu.", m: [1788, 2052], d: [520, 612] },
];

/**
 * A row re-drawn at display scale k (mobile display px: padding 57, icon 130,
 * gap 45, title 46 px Inter 600, subtitle 40 px Inter 400, height 264,
 * radius 56), without the chevron.
 */
function rowBody(ctx, parent, row, k) {
  const tw = measure(row.title, `600 ${46 * k}px Inter`, "-0.01em");
  const sw = measure(row.sub, `400 ${40 * k}px Inter`, "0em");
  const w = (57 + 130 + 45 + 60) * k + Math.max(tw, sw);
  const h = 264 * k;
  const el = ctx.el("div", {
    class: "abs",
    style: {
      left: "0px", top: "0px", width: `${w.toFixed(1)}px`, height: `${h.toFixed(1)}px`, borderRadius: `${(56 * k).toFixed(1)}px`,
      background: "rgb(5 11 32)", border: `${Math.max(1.5, 3 * k).toFixed(1)}px solid rgb(120 170 255 / 0.18)`, boxShadow: SHADOW.dark,
      display: "flex", alignItems: "center", gap: `${(45 * k).toFixed(1)}px`, padding: `0 ${(60 * k).toFixed(1)}px 0 ${(57 * k).toFixed(1)}px`,
    },
  }, parent);
  ctx.img(ctx.src.brand(`3d/${row.icon}@2x.webp`), { style: { width: `${(130 * k).toFixed(1)}px`, height: `${(130 * k).toFixed(1)}px`, flex: "none" } }, el);
  const text = ctx.el("div", { style: { display: "flex", flexDirection: "column", gap: `${(22 * k).toFixed(1)}px`, whiteSpace: "nowrap" } }, el);
  ctx.el("div", { text: row.title, style: { font: `600 ${(46 * k).toFixed(1)}px/1.1 Inter, sans-serif`, letterSpacing: "-0.01em", color: "#ffffff" } }, text);
  ctx.el("div", { text: row.sub, style: { font: `400 ${(40 * k).toFixed(1)}px/1.1 Inter, sans-serif`, color: "rgb(142 156 196)" } }, text);
  return { el, w, h };
}

export async function buildHost(ctx, S) {
  const { K, L } = S;
  const M = ctx.isMobile;
  const named = [K.property, K.hotel, K.restaurant];
  for (const t of named) ctx.sfx("pop", t, { offset: 0 });
  const lift = (i, t) => {
    const up = ramp(ctx, t, named[i] + 0.04, named[i] + 0.46, "land");
    const back = i < 2 ? ramp(ctx, t, named[i + 1] - 0.04, named[i + 1] + 0.28, "power3.inOut") : 0;
    return up * (1 - back);
  };
  const litU = (i, t) => ramp(ctx, t, named[i] - 0.04, named[i] + 0.1) * (i < 2 ? 1 - ramp(ctx, t, named[i + 1] - 0.04, named[i + 1] + 0.14) : 1);

  const bodyScene = ctx.scene("c37-bodies", K.r37, K.r38 + 0.01, { z: 9 });

  if (M) {
    const p = S.dark;
    const P = { ...L.PHONE_HIGH, cx: 640 };
    const host = ctx.img(ctx.src.display("host-start"), { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px", visibility: "hidden" } }, p.screen);
    /* the lit rows: an electric edge on the card, on the screen */
    const lights = ROWS.map((r) => ctx.el("div", { class: "abs", style: { left: "46px", top: `${r.m[0] - 2}px`, width: "1228px", height: `${r.m[1] - r.m[0] + 4}px`, borderRadius: "58px", border: "5px solid #2f7cff", boxShadow: "0 0 40px 2px rgb(0 105 254 / 0.45), inset 0 0 30px rgb(0 105 254 / 0.2)", opacity: 0, visibility: "hidden" } }, p.screen));
    /* the screen turns to "Add a workspace": it slides in over the welcome screen */
    const slide = [K.r37 - 0.02, K.r37 + 0.34];
    ctx.onFrame((t) => {
      /* runs on every frame: the phone outlives this row */
      const u = ramp(ctx, t, slide[0], slide[1], "power3.out");
      host.style.visibility = t >= slide[0] && t < K.r38 ? "" : "hidden";
      host.style.transform = `translateX(${((1 - u) * 1320).toFixed(1)}px)`;
      lights.forEach((n, i) => {
        const o = litU(i, t);
        n.style.visibility = o > 0.001 && t < K.r38 ? "" : "hidden";
        n.style.opacity = opa(o);
      });
    });
    p.poses.push({ t0: K.r37 + 0.02, t1: K.r38, fn: () => ({ cx: P.cx, cy: P.cy, height: P.height, rx: 0, ry: 0, rz: 0, fov: 24, opacity: 1 }) });

    /* the bodies: lifted from their row to the left of the phone, at their row's height */
    const k = 0.47;
    const bodies = ROWS.map((r) => rowBody(ctx, bodyScene, r, k));
    during(ctx, K.r37, K.r38 + 0.01, (t) => {
      bodies.forEach((b, i) => {
        const r = ROWS[i];
        const from = dispToStage(P, 48 + (b.w / k) / 2, (r.m[0] + r.m[1]) / 2);
        const sFrom = from.s / k;
        const to = { x: 424 - b.w / 2, y: from.y };
        const u = lift(i, t);
        const bob = 3 * Math.sin((t - named[i]) * 2.4) * u;
        place(b.el, { x: mix(from.x, to.x, u), y: mix(from.y, to.y, u) - 10 * Math.sin(Math.PI * u) + bob, s: mix(sFrom, 1, u), r: -1.2 * u, o: u > 0.004 ? 1 : 0 });
        b.el.style.boxShadow = u > 0.15 ? SHADOW.dark : "none";
      });
    });
  } else {
    /* Desktop: the window at WINDOW_LEFT with d-host-start; the pointer passes
       over each row as it is named; its body lifts into RIGHT_PANEL. */
    const W = L.WINDOW_LEFT;
    const winScene = ctx.scene("c37-win", K.r37 - 0.02, K.r38 + 0.01, { z: 5 });
    const win = browserWindow(ctx, { parent: winScene, width: 1440, url: "vallospaces.com", theme: "dark" });
    const s0 = W.width / 1440;
    const host = ctx.img(ctx.src.capture("d-host-start"), { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px" } }, win.content);
    const lights = ROWS.map((r) => ctx.el("div", { class: "abs", style: { left: "515px", top: `${r.d[0]}px`, width: "674px", height: `${r.d[1] - r.d[0]}px`, borderRadius: "22px", border: "2.5px solid #2f7cff", boxShadow: "0 0 24px 1px rgb(0 105 254 / 0.45)", opacity: 0 } }, win.content));
    const C = (x, y) => ({ x: W.x + x * s0, y: W.y + (56 + y) * s0 });
    during(ctx, K.r37 - 0.02, K.r38 + 0.01, (t) => {
      const u = ramp(ctx, t, K.r37 - 0.02, K.r37 + 0.3, "power3.out");
      host.style.transform = `translateX(${((1 - u) * 1440).toFixed(1)}px)`;
      win.root.style.transformOrigin = "0 0";
      win.root.style.transform = `translate(${W.x}px, ${W.y}px) scale(${s0.toFixed(5)})`;
      lights.forEach((n, i) => { n.style.opacity = opa(litU(i, t)); });
    });
    /* the pointer passes over each row as it is named */
    const ptr = orb(ctx, winScene, { size: 40 });
    const at = ROWS.map((r) => C(760, (r.d[0] + r.d[1]) / 2));
    /* it rests on each row while it is lit, and glides to the next just before it is named */
    const xs = [[K.r37, at[0].x + 220], [named[0] - 0.06, at[0].x, "glide"], [named[1] - 0.34, at[0].x], [named[1] - 0.04, at[1].x, "glide"], [named[2] - 0.34, at[1].x], [named[2] - 0.04, at[2].x, "glide"]];
    const ys = [[K.r37, at[0].y + 140], [named[0] - 0.06, at[0].y, "glide"], [named[1] - 0.34, at[0].y], [named[1] - 0.04, at[1].y, "glide"], [named[2] - 0.34, at[1].y], [named[2] - 0.04, at[2].y, "glide"]];
    during(ctx, K.r37, K.r38 + 0.01, (t) => {
      const x = track(ctx, t, xs);
      const y = track(ctx, t, ys);
      const o = ramp(ctx, t, K.r37, K.r37 + 0.2);
      ptr.style.left = `${(x - 20).toFixed(2)}px`;
      ptr.style.top = `${(y - 20).toFixed(2)}px`;
      ptr.style.opacity = opa(o);
      ptr.style.visibility = o > 0.001 ? "" : "hidden";
    });
    /* the bodies, re-drawn at 1.6x the page's own size, in RIGHT_PANEL */
    const kd = (1.6 * 92) / 264; // the desktop row is 92 content px tall
    const bodies = ROWS.map((r) => rowBody(ctx, bodyScene, r, kd));
    const R = L.RIGHT_PANEL;
    during(ctx, K.r37, K.r38 + 0.01, (t) => {
      bodies.forEach((b, i) => {
        const r = ROWS[i];
        const from = C(516 + (b.w / kd / 264 * 92) / 2, (r.d[0] + r.d[1]) / 2);
        const sFrom = (s0 * 92) / (264 * kd);
        const to = { x: R.x + 40 + b.w / 2, y: R.y + 320 };
        const u = lift(i, t);
        place(b.el, { x: mix(from.x, to.x, u), y: mix(from.y, to.y, u) - 14 * Math.sin(Math.PI * u), s: mix(sFrom, 1, u), r: -1 * u, o: u > 0.004 ? 1 : 0 });
        b.el.style.boxShadow = u > 0.15 ? SHADOW.dark : "none";
      });
    });
  }
}
