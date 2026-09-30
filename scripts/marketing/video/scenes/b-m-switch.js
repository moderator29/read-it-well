/**
 * Mobile row 19 (40.96 to 42.69), signature 2, storyboard v3.2.
 * The pointer presses the product's real switch, the drawer's FLIP "Switch
 * to Stays", on "Planning". The phone fades as it drops (the chapter
 * changes here), the warm top-light comes up (b-mobile.js), and "Planning /
 * a trip?" lands on the frame's axis inside the chapter's ring. It holds,
 * complete, to 42.80, then shrinks into the pill ("Book a room").
 */
import { NAVY, ELECTRIC, showDuring, pressAt, ripple, measure, ringOut } from "./b-kit.js";
import { FLIP } from "./b-m-talk.js";

export async function switcher(ctx, S, T) {
  const { tl } = ctx;
  const layer = ctx.scene("b-m-switch", T.r19 - 0.02, T.r20 + 0.5, { z: 30 });

  /* ---------- the press ---------- */
  const tPress = T.planning;
  pressAt(ctx, S.orb, tPress, { ringParent: S.pointer, x: S.flipAt.x, y: S.flipAt.y, sound: null });
  ripple(ctx, S.drawerPage.el, { x: FLIP.x - 120, y: FLIP.y, t: tPress, size: 320 });
  ctx.sfx("toggle_on", tPress, { offset: 4 });
  ctx.sfx("whoosh_long", T.r19, { offset: -2 });
  S.orbT.to(tPress + 0.02, 0.18, { y: S.flipAt.y + 300, opacity: 0 }, "power1.in"); // goes with the phone

  /* The phone fades as it drops 300 px (41.56 to 41.74), clear before "Planning" rises. */
  S.pLpose.to(tPress + 0.02, 0.18, { cy: S.FLIPPOSE.cy + 300, opacity: 0 }, "power1.in");

  /* ---------- "Planning / a trip?" on the frame's axis ---------- */
  const CX = ctx.W / 2;
  const CY = 780;
  const R = 380;
  const tIn = tPress;              // 41.54: "Planning" rises on its word
  const tHold = ctx.beat(74.55);   // 43.01: held complete from about 41.9 to here
  const tShrink1 = tHold + 0.3;    // 43.10: into the pill
  const title = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${ctx.W}px`, textAlign: "center", fontFamily: "Poppins, Inter, sans-serif", fontWeight: "700", letterSpacing: "-0.035em", lineHeight: "1.06", color: NAVY, whiteSpace: "nowrap", transformOrigin: `${CX}px ${CY}px` } }, layer);
  const line1 = ctx.el("div", {}, title);
  const line2 = ctx.el("div", {}, title);
  const word = (parent, text, color, t, gap = false) => {
    /* the mask runs 0.39 em below the line, so the g's descender is never clipped as it rises */
    const mask = ctx.el("span", { style: { display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.06em 0.04em 0.39em", margin: "-0.06em -0.04em -0.39em", marginLeft: gap ? "0.22em" : "0" } }, parent);
    const w = ctx.el("span", { text, style: { display: "inline-block", color } }, mask);
    ctx.gsap.set(w, { yPercent: 118 });
    tl.fromTo(w, { yPercent: 118 }, { yPercent: 0, duration: 0.34, ease: "land", immediateRender: false }, t);
    return w;
  };
  word(line1, "Planning", NAVY, tIn);
  word(line2, "a", NAVY, T.a9);
  word(line2, "trip?", ELECTRIC, T.trip, true);
  /* one size: "Planning" at most 600 px, and the two lines' box at least 34 px inside the ring */
  let fitted = false;
  ctx.onFrame(() => {
    if (fitted) return;
    const wP = measure("Planning", "700 100px Poppins") / 100;
    let size = Math.min(136, 600 / wP);
    while (Math.hypot((wP * size) / 2, 1.06 * size) > R - 34) size -= 1;
    title.style.fontSize = `${size.toFixed(1)}px`;
    title.style.top = `${(CY - size * 1.06).toFixed(1)}px`;
    fitted = true;
  });
  /* The ring circles the words only; its few particles fly outside it. */
  const ringWrap = ctx.el("div", { class: "fill" }, layer);
  layer.insertBefore(ringWrap, title);
  ringOut(ctx, ringWrap, { cx: CX, cy: CY, r: R, t: tIn + 0.06, dots: 8, seed: 19, stroke: 4 });
  ringWrap.style.transformOrigin = `${CX}px ${CY}px`;
  /* then the words shrink into the pill, and the ring goes */
  const pillY = 325;
  tl.fromTo(title, { y: 0, scale: 1 }, { y: pillY - CY, scale: 0.22, duration: tShrink1 - tHold, ease: "power3.inOut", immediateRender: false }, tHold);
  tl.fromTo(title, { opacity: 1 }, { opacity: 0, duration: 0.08, ease: "power1.in", immediateRender: false }, tShrink1 - 0.06);
  tl.fromTo(ringWrap, { opacity: 1, scale: 1 }, { opacity: 0, scale: 0.9, duration: 0.28, ease: "power2.in", immediateRender: false }, tHold - 0.04);
  showDuring(ctx, title, [[tIn - 0.02, tShrink1 + 0.04]]);
  showDuring(ctx, ringWrap, [[tIn, tHold + 0.26]]);
}
