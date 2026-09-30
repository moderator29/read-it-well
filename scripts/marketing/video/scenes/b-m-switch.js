/**
 * Mobile row 19 (40.96 to 42.69), signature 2: the switch.
 * The inbox's Property | Stays tabs grow out of the phone to fill the frame
 * (PILL_SWITCH) as the phone falls away. "Planning a trip?" lands in a ring;
 * on "Planning" the knob slides to Stays and the ground wipes to warm light
 * behind it. The switch then shrinks into the chapter pill ("Book a room").
 */
import { ringBurst } from "../engine/components.js";
import { LAYOUT } from "./layout.js";
import { NAVY, ELECTRIC, SHADOW, ramp, mix, displayQuad, quadAtPose, measure, showDuring } from "./b-kit.js";

/* messages-lt: the tabs (display px). */
const TABS = { x: 50, y: 888, w: 1220, h: 134 };

export async function switcher(ctx, S, T) {
  const { tl } = ctx;
  const L = LAYOUT.mobile;
  const BIG = L.PILL_SWITCH;
  const pL = S.pL;
  const layer = ctx.scene("b-m-switch", T.r19 - 0.02, T.r20 + 0.05, { z: 25 });
  ctx.hideCaptions(T.r19, T.r20);

  /* The phone falls away under the growing switch (its pose at 40.96 is where the tabs lift from). */
  const liftPose = { ...S.pLpose.cur };
  S.pLpose.to(T.r19, 0.42, { cy: 2350, rx: 14, opacity: 0 }, "power2.in");

  /* ---------- the switch, re-drawn from the capture ---------- */
  const sw = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", background: "#fff", boxShadow: SHADOW.l, overflow: "hidden", visibility: "hidden" } }, layer);
  const knob = ctx.el("div", { class: "abs", style: { top: "0px", left: "0px", background: "linear-gradient(180deg, #1e74f4 0%, #0c6dff 25%, #0066fe 55%, #005fec 100%)", boxShadow: "0 10px 24px -10px rgb(0 90 240 / 0.55)" } }, sw);
  const lblProp = ctx.el("div", { class: "abs", text: "Property", style: { top: "0px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", fontWeight: "600", letterSpacing: "-0.015em", whiteSpace: "nowrap" } }, sw);
  const lblStays = ctx.el("div", { class: "abs", text: "Stays", style: { top: "0px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", fontWeight: "600", letterSpacing: "-0.015em", whiteSpace: "nowrap" } }, sw);

  const tGrow0 = T.r19;
  const tGrow1 = T.r19 + 0.42;
  const tKnob0 = T.planning;
  const tKnob1 = T.planning + 0.45;
  const tShrink0 = T.r20 - 0.4;
  const tShrink1 = T.r20 - 0.04;
  const PILL = { cx: L.PILL.cx, cy: (L.PILL.top + L.PILL.bottom) / 2, w: 330, h: L.PILL.bottom - L.PILL.top };
  const grey = [97, 102, 109];
  const mixRgb = (a, b, u) => `rgb(${a.map((v, i) => Math.round(mix(v, b[i], u))).join(" ")})`;

  let from = null;
  ctx.onFrame((t) => {
    const on = t >= tGrow0 && t < tShrink1 + 0.05;
    sw.style.visibility = on ? "visible" : "hidden";
    if (!on) return;
    if (!from) {
      /* the tabs on the phone at the moment they lift (the phone's pose at 40.96) */
      const q = displayQuad(pL, TABS, quadAtPose(pL, liftPose));
      from = { x: q[0].x, y: q[0].y, w: q[1].x - q[0].x, h: q[3].y - q[0].y };
    }
    const g = ramp(ctx, t, tGrow0, tGrow1, "whip");
    const s = ramp(ctx, t, tShrink0, tShrink1, "power3.inOut");
    /* box: tabs -> PILL_SWITCH -> the chapter pill */
    let x = mix(from.x, BIG.x, g);
    let y = mix(from.y, BIG.y, g);
    let w = mix(from.w, BIG.w, g);
    let h = mix(from.h, BIG.h, g);
    x = mix(x, PILL.cx - PILL.w / 2, s);
    y = mix(y, PILL.cy - PILL.h / 2, s);
    w = mix(w, PILL.w, s);
    h = mix(h, PILL.h, s);
    const k = from.h / TABS.h; /* stage px per display px at the lift */
    const rad = mix(34 * k, h / 2, Math.max(g, s));
    const inset = mix(12.5 * k, mix(22, 7, s), g);
    const font = mix(46 * k, mix(80, 30, s), g);
    Object.assign(sw.style, { width: `${w.toFixed(2)}px`, height: `${h.toFixed(2)}px`, borderRadius: `${rad.toFixed(2)}px`, transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)` });
    const kw = w / 2 - inset * 1.5;
    const kh = h - inset * 2;
    const slide = ramp(ctx, t, tKnob0, tKnob1, "whip");
    const kx = mix(inset, w - inset - kw, slide);
    Object.assign(knob.style, { width: `${kw.toFixed(2)}px`, height: `${kh.toFixed(2)}px`, borderRadius: `${(Math.max(g, s) > 0.5 ? kh / 2 : mix(24 * k, kh / 2, Math.max(g, s) * 2)).toFixed(2)}px`, transform: `translate(${kx.toFixed(2)}px, ${inset.toFixed(2)}px)` });
    for (const [el, i] of [[lblProp, 0], [lblStays, 1]]) {
      el.style.width = `${(w / 2).toFixed(2)}px`;
      el.style.height = `${h.toFixed(2)}px`;
      el.style.left = `${(i * w) / 2}px`;
      el.style.fontSize = `${font.toFixed(2)}px`;
    }
    lblProp.style.color = mixRgb([255, 255, 255], grey, slide);
    lblStays.style.color = mixRgb(grey, [255, 255, 255], slide);
    sw.style.opacity = String((1 - ramp(ctx, t, tShrink1 - 0.08, tShrink1 + 0.02, "power1.in")).toFixed(3));
    sw.style.boxShadow = s > 0.5 ? SHADOW.s : SHADOW.l;
  });
  ctx.sfx("whoosh_long", T.r19, { offset: -2 });
  ctx.sfx("toggle_on", T.planning, { offset: 4 });

  /* ---------- "Planning a trip?" in the ring ---------- */
  const TITLE_Y = 315;
  const title = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${ctx.W}px`, textAlign: "center", fontFamily: "Poppins, Inter, sans-serif", fontWeight: "700", letterSpacing: "-0.035em", color: NAVY, whiteSpace: "nowrap", lineHeight: "1" } }, layer);
  const parts = [["Planning", false, T.planning], ["a", false, T.a9], ["trip", true, T.trip], ["?", true, T.trip]];
  const spans = parts.map(([text, blue, t], i) => {
    const mask = ctx.el("span", { style: { display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.08em 0.03em 0.16em", margin: "-0.08em -0.03em -0.16em", marginLeft: i === 1 || i === 2 ? "0.26em" : "0" } }, title);
    const word = ctx.el("span", { text, style: { display: "inline-block", color: blue ? ELECTRIC : NAVY } }, mask);
    tl.fromTo(word, { yPercent: 118 }, { yPercent: 0, duration: 0.5, ease: "land", immediateRender: false }, t - 0.06);
    return mask;
  });
  ctx.gsap.set(title.querySelectorAll("span > span"), { yPercent: 118 });
  /* Fit the line inside x 140 to 940 (the safe width), at most 100 px. */
  let fitted = false;
  ctx.onFrame(() => {
    if (fitted) return;
    const w100 = measure("Planning a trip?", "700 100px Poppins");
    const size = Math.min(100, (800 / w100) * 100 * 1.035);
    title.style.fontSize = `${size.toFixed(1)}px`;
    title.style.top = `${(TITLE_Y - size * 0.55).toFixed(1)}px`;
    fitted = true;
  });
  /* The title flies up into the pill with the switch. */
  const titleWrap = title;
  tl.fromTo(titleWrap, { opacity: 1, scale: 1 }, { opacity: 0, scale: 0.4, duration: 0.3, ease: "power2.in", immediateRender: false }, tShrink0 + 0.02);
  titleWrap.style.transformOrigin = `540px ${TITLE_Y}px`;
  showDuring(ctx, titleWrap, [[T.r19, tShrink1]]);

  /* The ring draws around the title with a burst of dots, behind the switch. */
  const ringWrap = ctx.el("div", { class: "fill", style: { zIndex: "-1" } }, layer);
  ringBurst(ctx, ringWrap, { cx: 540, cy: TITLE_Y, r: 226, t: T.planning, dots: 14, seed: 19, stroke: 4 });
  tl.fromTo(ringWrap, { opacity: 1 }, { opacity: 0, duration: 0.26, ease: "power1.in", immediateRender: false }, tShrink0);
  showDuring(ctx, ringWrap, [[T.r19, tShrink0 + 0.3]]);
  layer.style.isolation = "isolate";
  void spans;
}
