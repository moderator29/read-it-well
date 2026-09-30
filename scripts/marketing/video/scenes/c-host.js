/**
 * ROW 37: "Have a property, a hotel or a restaurant?" (85.38 to 88.27), both
 * films. STORYBOARD v3.2.
 *
 * On the night ground, `host-start` ("Add a workspace") slides in over the
 * last welcome screen. As each is named, its row lights on the screen; on
 * mobile one 1.25x push holds the three rows (round 3), on desktop the
 * window is at hero scale with the pointer on the row. Nothing is lifted or copied beside
 * the device. "I am an agent" is never lit. A cut on the beat at 88.27 goes
 * to the map.
 */
import { orb, browserWindow } from "../engine/components.js";
import { track, ramp, during, dispToStage, night, mix, opa } from "./c-kit.js";
import { seated, DESK_BANDS } from "./c-lang.js";

/* The rows as captured (display px on mobile, content px on desktop). */
const ROWS = [
  { key: "property", m: [2226, 2490], d: [671, 763] },
  { key: "hotel", m: [1164, 1428], d: [301, 393] },
  { key: "restaurant", m: [1788, 2052], d: [520, 612] },
];

export async function buildHost(ctx, S) {
  const { K, L } = S;
  const M = ctx.isMobile;
  const named = [K.property, K.hotel, K.restaurant];
  for (const t of named) ctx.sfx("pop", t, { offset: 0 });
  const litU = (i, t) => ramp(ctx, t, named[i] - 0.04, named[i] + 0.1) * (i < 2 ? 1 - ramp(ctx, t, named[i + 1] - 0.04, named[i + 1] + 0.14) : 1);

  /* the night ground, to the cut to the map */
  const ground = ctx.scene("c37-ground", K.r37 - 0.02, K.r38, { z: 1 });
  night(ctx, ground, { y: 44, glow: 0.22 });

  if (M) {
    const p = S.dark;
    const P = L.PHONE_HERO;
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
    /* One push (1.25x) held across the three rows, the lit row changing under
       it; no pull-out between rows (round 3). The push frames the three rows
       with the lit one at y <= 1150 (property's lower edge at about 1149, the
       hotel's top at about 360), drifting 20 px up over the row so the hold
       is never still. The pill stays away for the row: "Add a workspace"
       rises through its band as the push comes in. */
    const s0 = dispToStage(P, 0, 0).s;
    const PUSH = 1.25;
    const push = [K.r37 + 0.04, K.r37 + 0.5]; // as "Add a workspace" slides in; property lights at 85.55 under it
    const cyHeld = (t) => 517 - 20 * ramp(ctx, t, push[1], K.r38, "none");
    ctx.hidePill(K.r37, K.r38);
    p.poses.push({
      t0: K.r37 - 0.02, t1: K.r38,
      fn: (t) => {
        const u = ramp(ctx, t, push[0], push[1], "power2.inOut");
        return { cx: P.cx, cy: mix(P.cy, cyHeld(t), u), height: P.height * mix(1, PUSH, u), rx: 0, ry: 0, rz: 0, fov: 24, opacity: 1 };
      },
    });
  } else {
    /* Desktop: the window pushes from WINDOW_LEFT to hero scale onto the rows
       as d-host-start slides in over the last welcome page; the pointer
       rests on each row as it is named. */
    const W = L.WINDOW_LEFT;
    const winScene = ctx.scene("c37-win", K.r37 - 0.02, K.r38, { z: 6 });
    const win = browserWindow(ctx, { parent: winScene, width: 1440, url: "vallospaces.com", theme: "dark" });
    const s0 = W.width / 1440;
    const s1 = 1600 / 1440;
    const under = seated(ctx, win.content, ctx.src.capture("d-welcome-ig"), 1440, 900, DESK_BANDS[3]);
    under.style.visibility = "";
    const host = ctx.img(ctx.src.capture("d-host-start"), { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px" } }, win.content);
    const lights = ROWS.map((r) => ctx.el("div", { class: "abs", style: { left: "515px", top: `${r.d[0]}px`, width: "674px", height: `${r.d[1] - r.d[0]}px`, borderRadius: "22px", border: "2.5px solid #2f7cff", boxShadow: "0 0 24px 1px rgb(0 105 254 / 0.45)", opacity: 0 } }, win.content));
    const hero = { x: 960 - 852 * s1, y: 540 - (56 + 532) * s1 };
    const pose = (t) => {
      const u = ramp(ctx, t, K.r37 + 0.1, named[0] - 0.02, "power2.inOut");
      return { x: mix(W.x, hero.x, u), y: mix(W.y, hero.y, u), s: mix(s0, s1, u) };
    };
    const C = (x, y, t) => { const q = pose(t); return { x: q.x + x * q.s, y: q.y + (56 + y) * q.s }; };
    during(ctx, K.r37 - 0.02, K.r38, (t) => {
      const u = ramp(ctx, t, K.r37 - 0.02, K.r37 + 0.3, "power3.out");
      host.style.transform = `translateX(${((1 - u) * 1440).toFixed(1)}px)`;
      under.style.visibility = u < 1 ? "" : "hidden";
      const q = pose(t);
      win.root.style.transformOrigin = "0 0";
      win.root.style.transform = `translate(${q.x.toFixed(2)}px, ${q.y.toFixed(2)}px) scale(${q.s.toFixed(5)})`;
      lights.forEach((n, i) => { n.style.opacity = opa(litU(i, t)); });
    });
    /* the pointer rests on each row while it is lit, and glides to the next just before it is named */
    const ptr = orb(ctx, winScene, { size: 40 });
    ptr.style.visibility = "hidden";
    const rowAt = (i, t) => C(760, (ROWS[i].d[0] + ROWS[i].d[1]) / 2, t);
    during(ctx, K.r37, K.r38, (t) => {
      const seg = t < named[1] - 0.34 ? [0, 0] : t < named[1] - 0.04 ? [0, 1] : t < named[2] - 0.34 ? [1, 1] : t < named[2] - 0.04 ? [1, 2] : [2, 2];
      const g = seg[0] === seg[1] ? 1 : ctx.ease("glide")(ctx.progress(t, named[seg[1]] - 0.34, named[seg[1]] - 0.04));
      const a = rowAt(seg[0], t);
      const b = rowAt(seg[1], t);
      const inU = ramp(ctx, t, K.r37 + 0.4, named[0] - 0.06, "glide");
      const x = mix(a.x + 240 * (1 - inU), b.x, g);
      const y = mix(a.y + 160 * (1 - inU), b.y, g);
      const o = ramp(ctx, t, K.r37 + 0.4, K.r37 + 0.6);
      ptr.style.left = `${(x - 20).toFixed(2)}px`;
      ptr.style.top = `${(y - 20).toFixed(2)}px`;
      ptr.style.opacity = opa(o);
      ptr.style.visibility = o > 0.001 ? "" : "hidden";
    });
  }
}
