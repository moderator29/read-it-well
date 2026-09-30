/**
 * Mobile row 19 (40.96 to 42.69), signature 2, storyboard v3.1.
 * The pointer presses the product's real switch, the drawer's FLIP "Switch
 * to Stays", on "Planning". Warm light blooms from the press across the
 * whole frame (the ground's warm wash, b-mobile.js) as the phone falls away,
 * and "Planning a trip?" lands in WORDS inside a ring that circles the words
 * only. The words then shrink into the chapter pill ("Book a room").
 */
import { ringBurst } from "../engine/components.js";
import { LAYOUT } from "./layout.js";
import { NAVY, ELECTRIC, DW, DH, ramp, box, showDuring, pressAt, ripple, measure } from "./b-kit.js";
import { FLIP } from "./b-m-talk.js";

export async function switcher(ctx, S, T) {
  const { tl } = ctx;
  const L = LAYOUT.mobile;
  const layer = ctx.scene("b-m-switch", T.r19 - 0.02, T.r20 + 0.05, { z: 30 });

  /* ---------- the press ---------- */
  const tPress = T.planning;
  S.bloom = S.flipAt;
  pressAt(ctx, S.orb, tPress, { ringParent: S.pointer, x: S.flipAt.x, y: S.flipAt.y, sound: null });
  ripple(ctx, S.drawerPage.el, { x: FLIP.x - 120, y: FLIP.y, t: tPress, size: 320 });
  ctx.sfx("toggle_on", tPress, { offset: 4 });
  ctx.sfx("whoosh_long", T.r19, { offset: -2 });
  S.orbT.to(tPress + 0.12, 0.34, { x: 1140, y: 1180, opacity: 0 }, "power2.in");

  /* The phone washes out and falls away as the warm light blooms; the words own the frame. */
  const wash = box(ctx, S.drawerPage.el, { x: 0, y: 0, w: DW, h: DH, style: { background: "#fffaf5", opacity: "0", zIndex: "40" } });
  tl.fromTo(wash, { opacity: 0 }, { opacity: 0.7, duration: 0.16, ease: "power1.out", immediateRender: false }, tPress + 0.02);
  S.pLpose.to(tPress + 0.04, 0.42, { cy: S.FLIPPOSE.cy + 1500, rx: 12, opacity: 0 }, "power2.in");

  /* ---------- "Planning / a trip?" in WORDS ---------- */
  const W = L.WORDS;
  const CX = W.x + W.w / 2;
  const CY = W.y + W.h / 2 + 4;
  const title = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${ctx.W}px`, textAlign: "center", fontFamily: "Poppins, Inter, sans-serif", fontWeight: "700", letterSpacing: "-0.035em", lineHeight: "1.06", color: NAVY, whiteSpace: "nowrap", transformOrigin: `${CX}px ${CY}px` } }, layer);
  const line1 = ctx.el("div", {}, title);
  const line2 = ctx.el("div", {}, title);
  const word = (parent, text, color, t, gap = false) => {
    const mask = ctx.el("span", { style: { display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.06em 0.04em 0.14em", margin: "-0.06em -0.04em -0.14em", marginLeft: gap ? "0.22em" : "0" } }, parent);
    const w = ctx.el("span", { text, style: { display: "inline-block", color } }, mask);
    ctx.gsap.set(w, { yPercent: 118 });
    tl.fromTo(w, { yPercent: 118 }, { yPercent: 0, duration: 0.52, ease: "land", immediateRender: false }, t);
    return w;
  };
  word(line1, "Planning", NAVY, T.planning + 0.06);
  word(line2, "a", NAVY, T.a9);
  word(line2, "trip?", ELECTRIC, T.trip, true);
  /* one size, fitted so "Planning" is at most 600 px wide */
  let fitted = false;
  ctx.onFrame(() => {
    if (fitted) return;
    const size = Math.min(136, (600 / measure("Planning", "700 100px Poppins")) * 100);
    title.style.fontSize = `${size.toFixed(1)}px`;
    title.style.top = `${(CY - size * 1.06).toFixed(1)}px`;
    fitted = true;
  });
  /* The ring circles the words only, drawn as the first word lands. */
  const ringWrap = ctx.el("div", { class: "fill" }, layer);
  layer.insertBefore(ringWrap, title);
  ringBurst(ctx, ringWrap, { cx: CX, cy: CY, r: 352, t: T.planning + 0.1, dots: 12, seed: 19, stroke: 4 });
  /* then the words shrink into the pill, and the ring goes */
  const tShrink = T.r20 - 0.4;
  const pillY = (L.PILL.top + L.PILL.bottom) / 2;
  tl.fromTo(title, { y: 0, scale: 1, opacity: 1 }, { y: pillY - CY, scale: 0.24, opacity: 1, duration: 0.34, ease: "power3.inOut", immediateRender: false }, tShrink);
  tl.fromTo(title, { opacity: 1 }, { opacity: 0, duration: 0.08, ease: "power1.in", immediateRender: false }, T.r20 - 0.05);
  tl.fromTo(ringWrap, { opacity: 1, scale: 1 }, { opacity: 0, scale: 0.9, duration: 0.3, ease: "power2.in", immediateRender: false }, tShrink - 0.06);
  ringWrap.style.transformOrigin = `${CX}px ${CY}px`;
  showDuring(ctx, title, [[T.planning, T.r20 + 0.04]]);
  showDuring(ctx, ringWrap, [[T.planning, tShrink + 0.3]]);
}
