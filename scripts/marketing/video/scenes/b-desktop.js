/**
 * Section b, desktop film (rows 14 to 27, 30.58 to 62.88), storyboard v3.2.
 *
 * One browser window carries the section (its page changes by time, it
 * turns over in row 19 and crops to its date fields in row 22), inside a
 * "world" the camera pushes into. Bodies, cards and type sit over the world
 * in stage px; the glossy pointer does every action.
 * Layers (z): the ground 0, the world 10, cards 20, type 30, the pointer 40.
 */
import { orb, browserWindow } from "../engine/components.js";
import { LAYOUT } from "./layout.js";
import { mist, ramp, track, camera, showDuring, WARM_TOP } from "./b-kit.js";
import { times } from "./b-mobile.js";
import { deskTalk } from "./b-d-talk.js";
import { deskStays } from "./b-d-stays.js";
import { deskOut } from "./b-d-out.js";
import { deskChecked } from "./b-d-checked.js";

export const CW = 1440;
export const CH = 900;
export const BAR = 56;

export async function buildDesktop(ctx) {
  const T = times(ctx);
  const L = LAYOUT.desktop;
  const S = { T, L };

  /* ---------- the ground: mist throughout; rows 19 to 24 add a 14% warm light at the top (v3.2) ---------- */
  const ground = ctx.scene("b-d-ground", T.r14, T.end, { z: 0 });
  mist(ctx, ground);
  S.warm = ctx.el("div", { class: "fill", style: { background: WARM_TOP, opacity: "0", visibility: "hidden" } }, ground);
  ctx.onFrame((t) => {
    const a = ramp(ctx, t, T.planning, T.planning + 0.6, "power2.inOut") * (1 - ramp(ctx, t, T.r25 - 0.34, T.r25 + 0.06, "power2.inOut"));
    S.warm.style.visibility = a > 0.001 ? "inherit" : "hidden";
    S.warm.style.opacity = a.toFixed(3);
  });
  S.bloom = { x: 960, y: 540 };

  /* ---------- the world, the camera, the window ---------- */
  const worldScene = ctx.scene("b-d-world", T.r14, T.end, { z: 10 });
  const world = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${ctx.W}px`, height: `${ctx.H}px` } }, worldScene);
  S.world = world;
  S.cam = camera(ctx, world);
  S.camT = track(ctx, S.cam, { s: 1, fx: 960, fy: 540, tx: 960, ty: 540 });

  const win = browserWindow(ctx, { parent: world, width: CW, url: "vallospaces.com", theme: "light" });
  /* the light window's shadow, as section a hands it over */
  win.root.style.boxShadow = "0 60px 120px -50px rgb(16 32 80 / 0.42), 0 18px 40px -22px rgb(16 32 80 / 0.22), 0 0 0 1px rgb(16 32 80 / 0.07)";
  S.win = win;
  const LEFT = { cx: L.WINDOW_LEFT.x + (CW / 2) * (L.WINDOW_LEFT.width / CW), cy: L.WINDOW_LEFT.y + ((CH + BAR) / 2) * (L.WINDOW_LEFT.width / CW), s: L.WINDOW_LEFT.width / CW };
  const HERO = { cx: L.WINDOW_HERO.x + (CW / 2) * (L.WINDOW_HERO.width / CW), cy: L.WINDOW_HERO.y + ((CH + BAR) / 2) * (L.WINDOW_HERO.width / CW), s: L.WINDOW_HERO.width / CW };
  S.LEFT = LEFT;
  S.HERO = HERO;
  /* round 4: the window at 0.85 of the frame's width (x 60-1240, top y 120), with bare mist at its right for words and cards */
  const s85 = 1180 / CW;
  S.WIN85 = { cx: 60 + (CW / 2) * s85, cy: 120 + ((CH + BAR) / 2) * s85, s: s85 };
  /* the window's state: its centre and scale in world px, its turn, its view (the content crop) */
  /* round 4: section a now ends with the window at WINDOW_HERO, so B starts there (A -> B in handoffs.md) */
  S.wv = { cx: HERO.cx, cy: HERO.cy, s: HERO.s, ry: 0, opacity: 1, viewTop: 0, viewH: CH, viewLeft: 0, viewW: CW };
  S.wvT = track(ctx, S.wv, { ...S.wv });
  const content = win.content;
  const inner = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${CW}px`, height: `${CH}px` } }, content);
  S.inner = inner;
  ctx.onFrame((t) => {
    const w = S.wv;
    const H = BAR + w.viewH;
    win.root.style.width = `${w.viewW.toFixed(2)}px`;
    win.root.style.height = `${H.toFixed(2)}px`;
    content.style.width = `${w.viewW.toFixed(2)}px`;
    content.style.height = `${w.viewH.toFixed(2)}px`;
    inner.style.transform = `translate(${(-w.viewLeft).toFixed(2)}px, ${(-w.viewTop).toFixed(2)}px)`;
    if (Math.abs(w.ry) < 0.005) {
      /* flat: a 2D transform from the corner, rasterised exactly as section a leaves the window */
      win.root.style.transformOrigin = "0px 0px";
      win.root.style.transform = `translate(${(w.cx - (w.viewW / 2) * w.s).toFixed(2)}px, ${(w.cy - (H / 2) * w.s).toFixed(2)}px) scale(${w.s.toFixed(4)}, ${w.s.toFixed(4)})`;
    } else {
      win.root.style.transformOrigin = `${(w.viewW / 2).toFixed(2)}px ${(H / 2).toFixed(2)}px`;
      win.root.style.transform = `translate(${(w.cx - w.viewW / 2).toFixed(2)}px, ${(w.cy - H / 2).toFixed(2)}px) perspective(2600px) rotateY(${w.ry.toFixed(2)}deg) scale(${w.s.toFixed(5)})`;
    }
    win.root.style.opacity = w.opacity.toFixed(3);
    win.root.style.visibility = w.opacity > 0.001 ? "inherit" : "hidden";
  });

  /* v3.3: the window stays at the hero scale; when a card or big words sit in RIGHT_PANEL, a 30% white veil
     softens the window's right third under them (the window's own text never competes with theirs). */
  const veil = ctx.el("div", { class: "abs", style: { left: "1000px", top: "0px", width: "440px", height: `${CH}px`, zIndex: "30", background: "linear-gradient(90deg, rgb(255 255 255 / 0) 0px, rgb(255 255 255 / 0.3) 90px)", opacity: "0", visibility: "hidden" } }, inner);
  S.veilRanges = [];
  S.veilDuring = (t0, t1) => S.veilRanges.push([t0, t1]);
  ctx.onFrame((t) => {
    let a = 0;
    for (const [t0, t1] of S.veilRanges) a = Math.max(a, ramp(ctx, t, t0, t0 + 0.25) * (1 - ramp(ctx, t, t1 - 0.25, t1)));
    veil.style.visibility = a > 0.001 ? "inherit" : "hidden";
    veil.style.opacity = a.toFixed(3);
  });

  /* round 5: a whole-window dim (to 60%) while a card or calendar sits over the page */
  const dim = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${CW}px`, height: `${CH}px`, zIndex: "31", background: "rgb(246 248 252 / 0.4)", opacity: "0", visibility: "hidden" } }, inner);
  S.dimRanges = [];
  S.dimDuring = (t0, t1) => S.dimRanges.push([t0, t1]);
  ctx.onFrame((t) => {
    let a = 0;
    for (const [t0, t1] of S.dimRanges) a = Math.max(a, ramp(ctx, t, t0, t0 + 0.25) * (1 - ramp(ctx, t, t1 - 0.25, t1)));
    dim.style.visibility = a > 0.001 ? "inherit" : "hidden";
    dim.style.opacity = a.toFixed(3);
  });

  /** A page in the window: the capture at 1440 x 900 CSS px, hidden outside its ranges. */
  S.page = (id, ranges) => {
    const el = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${CW}px`, height: `${CH}px`, overflow: "hidden", visibility: "hidden" } }, inner);
    ctx.img(ctx.src.capture(id), { class: "abs", style: { left: "0px", top: "0px", width: `${CW}px`, height: `${CH}px` } }, el);
    if (ranges) showDuring(ctx, el, ranges);
    return el;
  };
  /** A content point (CSS px) to stage px, for the window's state now (unturned). */
  S.toStage = (x, y) => {
    const w = S.wv;
    const H = BAR + w.viewH;
    const wx = w.cx + (x - w.viewLeft - w.viewW / 2) * w.s;
    const wy = w.cy + (BAR + y - w.viewTop - H / 2) * w.s;
    return S.cam.toStage(wx, wy);
  };
  /** The same for a given window state and camera (for build-time targets). */
  S.toStageAt = (wv, cam, x, y) => {
    const H = BAR + wv.viewH;
    const wx = wv.cx + (x - (wv.viewLeft ?? 0) - (wv.viewW ?? CW) / 2) * wv.s;
    const wy = wv.cy + (BAR + y - wv.viewTop - H / 2) * wv.s;
    return { x: cam.tx + cam.s * (wx - cam.fx), y: cam.ty + cam.s * (wy - cam.fy) };
  };
  /** A content rect (CSS px) to a stage quad, now. */
  S.rectQuad = ({ x, y, w, h }) => [S.toStage(x, y), S.toStage(x + w, y), S.toStage(x + w, y + h), S.toStage(x, y + h)];

  /* ---------- cards, type and the pointer ---------- */
  S.cards = ctx.scene("b-d-cards", T.r14, T.end, { z: 20 });
  S.type = ctx.scene("b-d-type", T.r14, T.end, { z: 30 });
  const pointer = ctx.scene("b-d-pointer", T.r14, T.end, { z: 40 });
  S.pointer = pointer;
  S.orb = orb(ctx, pointer);
  S.orbT = track(ctx, S.orb, { x: 2000, y: 700, opacity: 0 });

  /* Captions are off where the same words are big on screen. */
  /* Each gap covers exactly the caption lines (they open 0.12 s before their first word). */
  ctx.hideCaptions(T.r14 - 0.14, T.right - 0.12);       // "Talk straight to the owner, / the landlord or the agent,"
  ctx.hideCaptions(37.0, 37.6);                         // round 5: off the legend under "₦26,100,000" ("plan an inspection" is on the card)
  ctx.hideCaptions(40.4, 41.2);                         // round 5: off the sidebar's foot during the push ("one place." is plain)
  ctx.hideCaptions(T.planning - 0.14, T.browse - 0.12); // row 19 is "off": "Planning a trip?" ("one place." has faded by 41.12)
  ctx.hideCaptions(T.going - 0.14, T.find - 0.12);      // row 23 is "off": "Going out tonight?"
  ctx.hideCaptions(T.owners - 0.14, T.verified - 0.12); // the role chips: "Owners, hosts, hotels and restaurants with the"

  await deskTalk(ctx, S, T);
  await deskStays(ctx, S, T);
  await deskOut(ctx, S, T);
  await deskChecked(ctx, S, T);
}
